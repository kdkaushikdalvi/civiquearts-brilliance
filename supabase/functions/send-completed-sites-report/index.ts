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
    const { fromDate, toDate, recipient, assignmentIds } = await req.json();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate) ||
      fromDate > toDate
    )
      throw new Error("Invalid date range");
    if (
      typeof recipient !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())
    )
      throw new Error("Invalid recipient email");
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0)
      throw new Error("No completed sites found");
    const { data, error } = await supabase
      .from("assignments")
      .select(
        "project_name, site_name, assignee_name, unit_type, quantity, amount, status, updated_at"
      )
      .eq("user_id", user.id)
      .eq("status", "Completed")
      .in("id", assignmentIds);
    if (error) throw error;
    if (!data?.length)
      return new Response(
        JSON.stringify({ message: "No completed sites found" }),
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
    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("REPORT_FROM_EMAIL"),
        to: [recipient.trim()],
        subject: `Completed Sites Report: ${fromDate} to ${toDate}`,
        html,
      }),
    });
    if (!mail.ok) throw new Error(`Email provider error: ${await mail.text()}`);
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
