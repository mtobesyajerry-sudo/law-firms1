// sanctions-screening — screen a client against all available lists.
// - Default: DB fuzzy match against ingested OFAC, UN, EU, UK lists
// - Premium tier: also calls OpenSanctions /match API

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENSANCTIONS_URL = "https://api.opensanctions.org/match/sanctions";

interface ScreenRequest {
  client_id?: string;
  full_name: string;
  date_of_birth?: string;
  nationality?: string;
  id_number?: string;
  entity_type?: "individual" | "entity";
  use_premium?: boolean;
  threshold?: number;
}

function computeFinalScore(candidate: any, request: ScreenRequest) {
  let score = Number(candidate.match_score) || 0;
  const breakdown = {
    name_score: score,
    dob_bonus: 0,
    nationality_bonus: 0,
    id_match_bonus: 0,
    final_score: score,
  };

  if (request.date_of_birth && candidate.date_of_birth) {
    if (request.date_of_birth === candidate.date_of_birth) {
      breakdown.dob_bonus = 0.15;
    } else {
      breakdown.dob_bonus = -0.20;
    }
  }

  if (request.nationality && candidate.nationalities?.length) {
    if (candidate.nationalities.some((n: string) =>
      n.toLowerCase() === request.nationality!.toLowerCase()
    )) {
      breakdown.nationality_bonus = 0.05;
    }
  }

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
  if (!apiKey) return null;

  const schema = request.entity_type === "entity" ? "Organization" : "Person";
  const properties: Record<string, string[]> = { name: [request.full_name] };
  if (request.date_of_birth) properties.birthDate = [request.date_of_birth];
  if (request.nationality) properties.nationality = [request.nationality];
  if (request.id_number) properties.idNumber = [request.id_number];

  try {
    const res = await fetch(OPENSANCTIONS_URL, {
      method: "POST",
      headers: { "Authorization": `ApiKey ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ queries: { q1: { schema, properties } } }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await serviceClient
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organizationId = profile.organization_id;
    const userId = user.id;
    const supabase = serviceClient;

    const request: ScreenRequest = await req.json();
    if (!request.full_name) {
      return new Response(JSON.stringify({ error: "full_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate client_id is a valid UUID if supplied
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (request.client_id !== undefined && request.client_id !== null) {
      if (typeof request.client_id !== "string" || !uuidRegex.test(request.client_id)) {
        return new Response(JSON.stringify({ error: "client_id must be a valid UUID" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate threshold is a number in [0, 1]
    const rawThreshold = request.threshold ?? 0.70;
    if (typeof rawThreshold !== "number" || isNaN(rawThreshold) || rawThreshold < 0 || rawThreshold > 1) {
      return new Response(JSON.stringify({ error: "threshold must be a number between 0 and 1" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const threshold = rawThreshold;

    // DB fuzzy match
    const { data: candidates, error: matchError } = await supabase
      .rpc("match_screening_candidates", {
        p_query_name: request.full_name,
        p_organization_id: organizationId,
        p_threshold: threshold,
        p_limit: 50,
      });

    if (matchError) throw new Error(matchError.message ?? JSON.stringify(matchError));

    // List snapshot for audit
    const { data: listSnapshot } = await supabase
      .from("screening_lists")
      .select("id, list_source, last_synced_at, entry_count")
      .or(`is_global.eq.true,organization_id.eq.${organizationId}`);

    // Optional premium screening
    let opensanctionsResult: any = null;
    if (request.use_premium) {
      opensanctionsResult = await callOpenSanctions(request);
    }

    // Combine and score
    const allMatches: any[] = [];

    for (const c of (candidates ?? [])) {
      const breakdown = computeFinalScore(c, request);
      if (breakdown.final_score >= threshold) {
        allMatches.push({
          list_entry_id: c.entry_id,
          list_source: c.list_source,
          list_entry_name: c.primary_name,
          matched_value: c.matched_alias ?? c.primary_name,
          match_type: c.match_type,
          match_score: breakdown.final_score,
          score_breakdown: breakdown,
          is_pep: c.is_pep,
          program: c.program,
        });
      }
    }

    if (opensanctionsResult?.responses?.q1?.results) {
      for (const r of opensanctionsResult.responses.q1.results) {
        allMatches.push({
          list_entry_id: null,
          list_source: "OPENSANCTIONS",
          list_entry_name: r.caption ?? r.properties?.name?.[0],
          matched_value: r.caption ?? r.properties?.name?.[0],
          match_type: "opensanctions_match",
          match_score: r.score ?? 0,
          score_breakdown: { name_score: r.score, dob_bonus: 0, nationality_bonus: 0, id_match_bonus: 0, final_score: r.score },
          is_pep: r.schema === "Person" && (r.properties?.topics?.includes("role.pep") ?? false),
          program: r.properties?.program?.[0] ?? null,
        });
      }
    }

    allMatches.sort((a, b) => b.match_score - a.match_score);

    const highestScore = allMatches[0]?.match_score ?? 0;
    const hasPep = allMatches.some((m) => m.is_pep);
    const hasSanction = allMatches.some((m) => m.list_source !== "OPENSANCTIONS");
    const risk = riskLevel(highestScore, hasPep, hasSanction);

    // Persist screening result
    const { data: screening, error: screeningError } = await supabase
      .from("screening_results")
      .insert({
        client_id: request.client_id ?? null,
        organization_id: organizationId,
        screening_type: "sanctions",
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
        screened_by: userId,
        screened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (screeningError) throw new Error(screeningError.message ?? JSON.stringify(screeningError));

    if (allMatches.length > 0) {
      const matchRows = allMatches.map((m) => ({
        screening_result_id: screening.id,
        list_entry_id: m.list_entry_id,
        organization_id: organizationId,
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
      await supabase.from("screening_matches").insert(matchRows);
    }

    // Audit log
    await supabase.from("screening_audit_log").insert({
      organization_id: organizationId,
      screening_result_id: screening.id,
      action: "screening_run",
      actor_id: userId,
      actor_email: null,
      details: { match_count: allMatches.length, highest_score: highestScore, risk, premium_used: !!opensanctionsResult },
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
    const msg = err instanceof Error ? err.message
      : (err as any)?.message ?? JSON.stringify(err);
    console.error("sanctions-screening error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
