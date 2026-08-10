import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mobile, password } = await req.json();
    const digits = String(mobile ?? "").replace(/\D/g, "");
    if (!digits || !password) {
      return new Response(JSON.stringify({ error: "Mobile and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("mobile", digits)
      .maybeSingle();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "Invalid mobile number or password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await anon.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error || !data.session) {
      return new Response(JSON.stringify({ error: "Invalid mobile number or password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Login failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
