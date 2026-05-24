import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const lawAgeOrgId = "198372c7-41d6-490d-9fd9-aa254709268f";
    const lawAgeClientId = "099808f9-07e7-4da5-bb2a-ee5bd3180670";
    const filePath = `${lawAgeOrgId}/${lawAgeClientId}_isolation_test.txt`;

    const testContent = new TextEncoder().encode(
      "SECRET LAWAGE CONTENT - This file belongs to LawAge Advocates. Sarah at Bower & Associates should NOT be able to read this."
    );

    const { data, error } = await supabaseAdmin.storage
      .from("client-documents")
      .upload(filePath, testContent, {
        contentType: "text/plain",
        upsert: true,
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message, detail: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, path: data.path, fullPath: data.fullPath }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
