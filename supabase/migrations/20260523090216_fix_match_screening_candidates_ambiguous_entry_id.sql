/*
  # Fix ambiguous "entry_id" column in match_screening_candidates

  The DISTINCT ON (entry_id) / ORDER BY entry_id in the ranked CTE was
  ambiguous because the function return type also declares entry_id.
  Fix by qualifying with the CTE alias.
*/

CREATE OR REPLACE FUNCTION public.match_screening_candidates(
  p_query_name text,
  p_organization_id uuid,
  p_threshold numeric DEFAULT 0.70,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  entry_id uuid, list_id uuid, list_source text, primary_name text,
  matched_alias text, match_score numeric, match_type text, entry_type text,
  is_pep boolean, program text, date_of_birth date, nationalities text[], raw_data jsonb
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE v_query_normalized TEXT;
BEGIN
  v_query_normalized := normalize_screening_name(p_query_name);
  IF v_query_normalized IS NULL OR length(v_query_normalized) < 2 THEN RETURN; END IF;
  PERFORM set_limit(p_threshold::real);

  RETURN QUERY
  WITH candidates AS (
    SELECT
      e.id AS eid, e.list_id AS lid,
      COALESCE(l.list_source::TEXT, 'INTERNAL') AS lsource,
      e.primary_name AS pname, NULL::TEXT AS malias,
      similarity(e.normalized_name, v_query_normalized)::NUMERIC AS mscore,
      'name_fuzzy'::TEXT AS mtype,
      COALESCE(e.entry_type::TEXT, 'individual') AS etype,
      COALESCE(e.is_pep, FALSE) AS ispep,
      e.program AS prog, e.date_of_birth AS dob,
      e.nationalities AS nats, e.raw_data AS rdata
    FROM screening_list_entries e
    JOIN screening_lists l ON l.id = e.list_id
    WHERE (l.is_global = TRUE OR l.organization_id = p_organization_id OR l.organization_id IS NULL)
      AND e.normalized_name IS NOT NULL
      AND e.normalized_name % v_query_normalized
      AND similarity(e.normalized_name, v_query_normalized) >= p_threshold

    UNION ALL

    SELECT
      e.id AS eid, e.list_id AS lid,
      COALESCE(l.list_source::TEXT, 'INTERNAL') AS lsource,
      e.primary_name AS pname,
      alias->>'name' AS malias,
      similarity(alias->>'normalized_name', v_query_normalized)::NUMERIC AS mscore,
      'alias_fuzzy'::TEXT AS mtype,
      COALESCE(e.entry_type::TEXT, 'individual') AS etype,
      COALESCE(e.is_pep, FALSE) AS ispep,
      e.program AS prog, e.date_of_birth AS dob,
      e.nationalities AS nats, e.raw_data AS rdata
    FROM screening_list_entries e
    JOIN screening_lists l ON l.id = e.list_id
    CROSS JOIN LATERAL jsonb_array_elements(e.aliases_jsonb) AS alias
    WHERE (l.is_global = TRUE OR l.organization_id = p_organization_id OR l.organization_id IS NULL)
      AND alias->>'normalized_name' IS NOT NULL
      AND similarity(alias->>'normalized_name', v_query_normalized) >= p_threshold
  ),
  ranked AS (
    SELECT DISTINCT ON (c.eid)
      c.eid, c.lid, c.lsource, c.pname, c.malias,
      c.mscore, c.mtype, c.etype, c.ispep, c.prog,
      c.dob, c.nats, c.rdata
    FROM candidates c
    ORDER BY c.eid, c.mscore DESC
  )
  SELECT
    r.eid   AS entry_id,
    r.lid   AS list_id,
    r.lsource AS list_source,
    r.pname AS primary_name,
    r.malias AS matched_alias,
    r.mscore AS match_score,
    r.mtype  AS match_type,
    r.etype  AS entry_type,
    r.ispep  AS is_pep,
    r.prog   AS program,
    r.dob    AS date_of_birth,
    r.nats   AS nationalities,
    r.rdata  AS raw_data
  FROM ranked r
  ORDER BY r.mscore DESC
  LIMIT p_limit;
END;
$$;
