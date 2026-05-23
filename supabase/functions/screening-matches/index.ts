// Screen a client against all available lists.
// - Default: runs DB fuzzy match against ingested free lists (OFAC, UN, EU, UK)
// - Premium tier: ALSO calls OpenSanctions /match API for PEP + adverse media coverage
//
// Called from the React frontend via supabase.functions.invoke('screen-client').
// Authenticated as the calling user (RLS still applies for non-service calls).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENSANCTIONS_URL = "https://api.opensanctions.org/match/sanctions";

interface ScreenRequest {
  client_id?: string;          // existing kyc_clients row, optional
  full_name: string;           // required
  date_of_birth?: string;      // ISO yyyy-mm-dd
  nationality?: string;
  id_number?: string;
  entity_type?: "individual" | "entity";
  use_premium?: boolean;       // whether to call OpenSanctions
  threshold?: number;          // similarity threshold (default 0.70)
}

interface ScoreBreakdown {
  name_score: number;
  dob_bonus: number;
  nationality_bonus: number;
  id_match_bonus: number;
  final_score: number;
}

function computeFinalScore(
  candidate: any,
  request: ScreenRequest,
): ScoreBreakdown {
  let score = Number(candidate.match_score) || 0;
  const breakdown: ScoreBreakdown = {
    name_score: score,
    dob_bonus: 0,
    nationality_bonus: 0,
    id_match_bonus: 0,
    final_score: score,
  };

  // DOB match: same date adds significant confidence
  if (request.date_of_birth && candidate.date_of_birth) {
    if (request.date_of_birth === candidate.date_of_birth) {
      breakdown.dob_bonus = 0.15;
    } else {
      // DOB explicitly mismatches — penalize
      breakdown.dob_bonus = -0.20;
    }
  }

  // Nationality match
  if (request.nationality && candidate.nationalities?.length) {
    if (candidate.nationalities.some((n: string) =>
      n.toLowerCase() === request.nationality!.toLowerCase()
    )) {
      breakdown.nationality_bonus = 0.05;
    }
  }

  // ID number match — strong signal
  if (request.id_number && candidate.raw_data) {
    const ids = JSON.stringify(candidate.raw_data).toLowerCase();
    if (ids.includes(request.id_number.toLowerCase())) {
      breakdown.id_match_bonus = 0.20;
    }
  }

  breakdown.final_score = Math.max(0, Math.min(1,
    score + breakdown.dob_bonus + breakdown.nationality_bonus + breakdown.id_match_bonus
  ));
  return breakdown;
}

function riskLevel(highest: number, hasPep: boolean, hasSanction: boolean): string {
  if (hasSanction && highest >= 0.85) return "critical";
  if (highest >= 0.85) return "high";
  if (hasPep || highest >= 0.75) return "medium";
  return "low";
}

async function callOpenSanctions(request: ScreenRequest): Promise<any> {
  const apiKey = Deno.env.get("OPENSANCTIONS_API_KEY");
  if (!apiKey) {
    console.warn("OPENSANCTIONS_API_KEY not configured");
    return null;
  }

  const schema = request.entity_type === "entity" ? "Organization" : "Person";
  const properties: Record<string, string[]> = {
    name: [request.full_name],
  };
  if (request.date_of_birth) properties.birthDate = [request.date_of_birth];
  if (request.nationality) properties.nationality = [request.nationality];
  if (request.id_number) properties.idNumber = [request.id_number];

  const payload = {
    queries: {
      q1: {
        schema,
        properties,
      },
    },
  };

  try {
    const res = await fetch(OPENSANCTIONS_URL, {
      method: "POST",
      headers: {
        "Authorization": `ApiKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("OpenSanctions error:", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("OpenSanctions call failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Authenticate the calling user — Edge Functions get the JWT via header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve organization
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const request: ScreenRequest = await req.json();
    if (!request.full_name) {
      return new Response(JSON.stringify({ error: "full_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threshold = request.threshold ?? 0.70;

    // ----- 1. DB fuzzy match across all visible lists -----
    const { data: candidates, error: matchError } = await supabase
      .rpc("match_screening_candidates", {
        p_query_name: request.full_name,
        p_organization_id: profile.organization_id,
        p_threshold: threshold,
        p_limit: 50,
      });

    if (matchError) throw matchError;

    // Snapshot list versions for audit
    const { data: listSnapshot } = await supabase
      .from("screening_lists")
      .select("id, list_source, last_synced_at, entry_count")
      .or(`is_global.eq.true,organization_id.eq.${profile.organization_id}`);

    // ----- 2. Optional OpenSanctions premium screening -----
    let opensanctionsResult: any = null;
    if (request.use_premium) {
      opensanctionsResult = await callOpenSanctions(request);
    }

    // ----- 3. Combine and score candidates -----
    const allMatches: any[] = [];

    for (const c of (candidates ?? [])) {
      const breakdown = computeFinalScore(c, request);
      if (breakdown.final_score >= threshold) {
        allMatches.push({
          source: "internal_db",
          list_entry_id: c.entry_id,
          list_source: c.list_source,
          list_entry_name: c.primary_name,
          matched_value: c.matched_alias ?? c.primary_name,
          match_type: c.match_type,
          match_score: breakdown.final_score,
          score_breakdown: breakdown,
          is_pep: c.is_pep,
          program: c.program,
          raw_match: c,
        });
      }
    }

    // Add OpenSanctions matches if present
    if (opensanctionsResult?.responses?.q1?.results) {
      for (const r of opensanctionsResult.responses.q1.results) {
        allMatches.push({
          source: "opensanctions",
          list_entry_id: null,
          list_source: "OPENSANCTIONS",
          list_entry_name: r.caption ?? r.properties?.name?.[0],
          matched_value: r.caption ?? r.properties?.name?.[0],
          match_type: "opensanctions_match",
          match_score: r.score ?? 0,
          score_breakdown: { name_score: r.score, dob_bonus: 0, nationality_bonus: 0, id_match_bonus: 0, final_score: r.score },
          is_pep: (r.schema === "Person") && (r.properties?.topics?.includes("role.pep") ?? false),
          program: r.properties?.program?.[0] ?? null,
          raw_match: r,
        });
      }
    }

    // sort descending
    allMatches.sort((a, b) => b.match_score - a.match_score);

    const highestScore = allMatches[0]?.match_score ?? 0;
    const hasPep = allMatches.some((m) => m.is_pep);
    const hasSanction = allMatches.some((m) => m.list_source !== "OPENSANCTIONS" || (m.raw_match?.properties?.topics?.includes("sanction")));
    const risk = riskLevel(highestScore, hasPep, hasSanction);

    // ----- 4. Persist screening_result + matches -----
    const { data: screening, error: screeningError } = await supabase
      .from("screening_results")
      .insert({
        client_id: request.client_id ?? null,
        organization_id: profile.organization_id,
        screened_name: request.full_name,
        screened_dob: request.date_of_birth ?? null,
        screened_nationality: request.nationality ?? null,
        screened_id_number: request.id_number ?? null,
        screened_entity_type: request.entity_type ?? "individual",
        lists_checked: listSnapshot ?? [],
        match_count: allMatches.length,
        highest_score: highestScore,
        overall_risk: risk,
        opensanctions_used: !!opensanctionsResult,
        opensanctions_response: opensanctionsResult,
        status: allMatches.length > 0 ? "pending_review" : "cleared",
        screened_by: user.id,
        screened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (screeningError) throw screeningError;

    // Insert match rows
    if (allMatches.length > 0) {
      const matchRows = allMatches.map((m) => ({
        screening_result_id: screening.id,
        list_entry_id: m.list_entry_id,
        organization_id: profile.organization_id,
        match_score: m.match_score,
        match_type: m.match_type,
        matched_field: "name",
        matched_value: m.matched_value,
        score_breakdown: m.score_breakdown,
        status: "pending_review",
        list_source: m.list_source,
        list_entry_name: m.list_entry_name,
        list_entry_program: m.program,
        is_pep: m.is_pep,
      }));
      const { error: matchInsertError } = await supabase
        .from("screening_matches")
        .insert(matchRows);
      if (matchInsertError) console.error("Match insert error:", matchInsertError);
    }

    // ----- 5. Audit log -----
    await supabase.from("screening_audit_log").insert({
      organization_id: profile.organization_id,
      screening_result_id: screening.id,
      action: "screening_run",
      actor_id: user.id,
      actor_email: user.email,
      details: {
        match_count: allMatches.length,
        highest_score: highestScore,
        risk,
        premium_used: !!opensanctionsResult,
        threshold,
      },
    });

    return new Response(
      JSON.stringify({
        screening_id: screening.id,
        status: screening.status,
        match_count: allMatches.length,
        highest_score: highestScore,
        overall_risk: risk,
        matches: allMatches,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("screen-client error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
