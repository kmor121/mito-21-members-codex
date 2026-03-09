import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const newsletterId = normalize(body?.newsletter_id);

    if (!newsletterId) {
      return Response.json({ ok: false, error: "newsletter_id is required" }, { status: 400 });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "";

    if (!resendApiKey || !resendFromEmail) {
      return Response.json({
        ok: false,
        error: "Email configuration not set. Set RESEND_API_KEY and RESEND_FROM_EMAIL secrets."
      }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const newsletter = await base44.asServiceRole.entities.Newsletter.get(newsletterId);

    if (!newsletter) {
      return Response.json({ ok: false, error: "Newsletter not found" }, { status: 404 });
    }

    if (newsletter.status === "sent") {
      return Response.json({ ok: false, error: "Newsletter already sent" }, { status: 400 });
    }

    // Build recipient list
    const allMembers = await base44.asServiceRole.entities.Member.list();
    let recipients = allMembers.filter(
      (m) => m.approval_status === "承認済" && m.status === "活動中" && m.email
    );

    const audienceType = normalize(newsletter.audience_type) || "all";
    let filterJson: Record<string, unknown> = {};
    try {
      const raw = normalize(newsletter.audience_filter_json);
      if (raw) filterJson = JSON.parse(raw);
    } catch { /* ignore */ }

    if (audienceType === "member_type" && filterJson.member_type) {
      recipients = recipients.filter((m) => m.member_type === filterJson.member_type);
    } else if (audienceType === "status" && filterJson.status) {
      recipients = recipients.filter((m) => m.status === filterJson.status);
    }

    if (recipients.length === 0) {
      return Response.json({ ok: false, error: "No recipients found" }, { status: 400 });
    }

    const title = normalize(newsletter.title) || "お知らせ";
    const bodyText = normalize(newsletter.body) || "";
    const scheduledAt = normalize(newsletter.scheduled_at);
    const channel = normalize(newsletter.channel) || "email";

    if (channel !== "email" && channel !== "email+line") {
      return Response.json({
        ok: false,
        error: "Only email channel is currently supported"
      }, { status: 400 });
    }

    // Send emails via Resend API
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send in batches of 10
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (member) => {
          const emailPayload: Record<string, unknown> = {
            from: resendFromEmail,
            to: [String(member.email)],
            subject: title,
            text: bodyText
          };

          if (scheduledAt) {
            emailPayload.send_at = scheduledAt;
          }

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(emailPayload)
          });

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Resend API error for ${member.email}: ${response.status} ${errorBody}`);
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          successCount++;
        } else {
          failCount++;
          errors.push(String(result.reason));
        }
      }
    }

    // Update newsletter status
    const newStatus = scheduledAt ? "scheduled" : "sent";
    const updateData: Record<string, unknown> = {
      status: newStatus
    };
    if (!scheduledAt) {
      updateData.last_sent_at = new Date().toISOString();
    }
    if (failCount > 0) {
      updateData.error_message = errors.slice(0, 3).join("; ");
      if (successCount === 0) {
        updateData.status = "failed";
      }
    }

    await base44.asServiceRole.entities.Newsletter.update(newsletterId, updateData);

    return Response.json({
      ok: true,
      status: newStatus,
      success_count: successCount,
      fail_count: failCount,
      total_recipients: recipients.length,
      errors: errors.slice(0, 5)
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
