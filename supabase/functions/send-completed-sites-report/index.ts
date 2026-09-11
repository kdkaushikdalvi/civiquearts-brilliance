import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ] ?? c)
  );
const inr = (v: unknown) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Authentication required");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.email)
      throw new Error("Authenticated email unavailable");
    const reqBody = await req.json().catch(() => ({}));
    const { fromDate, toDate, fromEmail } = reqBody;
    if (
      !fromDate ||
      !toDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate) ||
      fromDate > toDate
    )
      throw new Error("Invalid date range");
    const { data, error } = await supabase
      .from("assignments")
      .select(
        "project_name, site_name, assignee_name, unit_type, quantity, amount, status, updated_at"
      )
      .eq("user_id", user.id)
      .eq("status", "Completed")
      .gte("updated_at", `${fromDate}T00:00:00.000Z`)
      .lte("updated_at", `${toDate}T23:59:59.999Z`)
      .order("updated_at", { ascending: true });
    if (error) throw error;
    if (!data?.length)
      return new Response(
        JSON.stringify({ message: "No completed sites found for the selected date range." }),
        {
          status: 422,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    const rows = data
      .map(
        (r) =>
          `<tr><td>${esc(r.project_name)}</td><td>${esc(
            r.site_name
          )}</td><td>${esc(r.assignee_name)}</td><td>${esc(
            r.unit_type
          )} / ${esc(r.quantity)}</td><td>${inr(r.amount)}</td><td>${esc(
            r.status
          )}</td><td>${new Date(r.updated_at).toLocaleDateString(
            "en-IN"
          )}</td></tr>`
      )
      .join("");
    const html = `<div style="font-family:Arial,sans-serif;color:#172033"><h2>Completed Sites Report</h2><p>${esc(
      fromDate
    )} to ${esc(
      toDate
    )}</p><table style="border-collapse:collapse;width:100%"><thead><tr>${[
      "Project",
      "Site",
      "Assigned To",
      "Unit / Qty",
      "Amount",
      "Status",
      "Completion Date",
    ]
      .map(
        (h) =>
          `<th style="background:#1d4ed8;color:white;padding:8px;text-align:left">${h}</th>`
      )
      .join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;

    // Resend requires a verified domain. Public email providers (gmail.com, yahoo.com, etc.)
    // cannot be added as verified domains on Resend and trigger a 403 error.
    // When no verified custom domain is available, Resend requires using its verified test domain: "onboarding@resend.dev".
    const configuredFrom = (fromEmail || Deno.env.get("REPORT_FROM_EMAIL") || "").trim();
    const isPublicWebmail = (str: string) =>
      /@(gmail\.com|googlemail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|live\.com|aol\.com|mail\.com)/i.test(
        str
      );

    let sender = "Civique Arts <onboarding@resend.dev>";
    let replyTo = user.email;

    if (configuredFrom) {
      if (isPublicWebmail(configuredFrom)) {
        const nameMatch = configuredFrom.match(/^([^<]+)<([^>]+)>$/);
        const displayName = nameMatch ? nameMatch[1].trim() : "Civique Arts";
        sender = `${displayName} <onboarding@resend.dev>`;
        replyTo = nameMatch ? nameMatch[2].trim() : configuredFrom;
      } else {
        sender = configuredFrom;
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured in Supabase Edge Function secrets."
      );
    }

    const emailPayload: Record<string, unknown> = {
      from: sender,
      to: [user.email],
      subject: `Completed Sites Report: ${fromDate} to ${toDate}`,
      html,
    };
    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!mail.ok) {
      const errorText = await mail.text();
      let parsedMessage = errorText;
      try {
        const errJson = JSON.parse(errorText);
        if (errJson.message) parsedMessage = errJson.message;
      } catch {
        // use raw error text
      }
      throw new Error(`Email provider error: ${parsedMessage}`);
    }
    return new Response(JSON.stringify({ sent: true, count: data.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unable to send report",
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
