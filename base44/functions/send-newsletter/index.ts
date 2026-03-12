import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Extract Base64 inline images from HTML and convert to CID inline attachments for Resend API. */
function convertInlineImages(html: string): {
  html: string;
  inlineAttachments: Array<Record<string, unknown>>;
} {
  const inlineAttachments: Array<Record<string, unknown>> = [];
  let index = 0;

  const convertedHtml = html.replace(
    /src="data:image\/(png|jpeg|jpg|gif|webp);base64,([^"]+)"/gi,
    (_match, type, base64Data) => {
      const contentId = `inline-image-${index++}`;
      const ext = type.toLowerCase() === "jpeg" ? "jpg" : type.toLowerCase();
      inlineAttachments.push({
        filename: `image${index}.${ext}`,
        content: base64Data,
        content_id: contentId,
      });
      return `src="cid:${contentId}"`;
    }
  );

  return { html: convertedHtml, inlineAttachments };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const newsletterId = normalize(body?.newsletter_id);
    const testEmail = normalize(body?.test_email);

    if (!newsletterId) {
      return Response.json({ ok: false, error: "newsletter_id is required" }, { status: 400 });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "";

    if (!resendApiKey || !resendFromEmail) {
      return Response.json({
        ok: false,
        error: "メール送信の設定がされていません。RESEND_API_KEY と RESEND_FROM_EMAIL を設定してください。",
        skipped: true,
      }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);
    const newsletter = await base44.asServiceRole.entities.Newsletter.get(newsletterId);

    if (!newsletter) {
      return Response.json({ ok: false, error: "Newsletter not found" }, { status: 404 });
    }

    const title = normalize(newsletter.title) || "お知らせ";
    const bodyText = normalize(newsletter.body) || "";
    const bodyHtml = normalize(newsletter.body_html) || "";
    const scheduledAt = normalize(newsletter.scheduled_at);
    const channel = normalize(newsletter.channel) || "email";

    // Parse attachments (supports base64 file attachments)
    // Priority: request body > entity field (body is more reliable for large base64 data)
    let attachments: Array<Record<string, unknown>> = [];
    const attachmentsSources = [
      normalize(body?.attachments_json),
      normalize(newsletter.attachments_json),
    ];
    for (const src of attachmentsSources) {
      if (!src) continue;
      try {
        const parsed = JSON.parse(src);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .filter((a: Record<string, unknown>) => a.filename && a.content)
            .map((a: Record<string, unknown>) => {
              let content = String(a.content);
              // Strip data URI prefix if present (e.g. "data:application/pdf;base64,...")
              const commaIdx = content.indexOf(",");
              if (commaIdx !== -1 && content.substring(0, commaIdx).includes("base64")) {
                content = content.substring(commaIdx + 1);
              }
              return {
                filename: String(a.filename),
                content,
              };
            });
          if (filtered.length > 0) {
            attachments = filtered;
            break; // use first valid source
          }
        }
      } catch { /* ignore */ }
    }

    // Log attachment info for debugging
    console.log(`[send-newsletter] Attachments count: ${attachments.length}`);
    for (const att of attachments) {
      const c = String(att.content);
      console.log(`[send-newsletter] File: "${att.filename}", content length: ${c.length}, first 50 chars: ${c.substring(0, 50)}`);
    }

    // ── Test mode ──
    if (testEmail) {
      const emailPayloadTest: Record<string, unknown> = {
        from: resendFromEmail,
        to: [testEmail],
        subject: `【テスト】${title}`,
        text: bodyText,
      };
      if (bodyHtml) {
        const { html: convertedHtml, inlineAttachments } = convertInlineImages(bodyHtml);
        emailPayloadTest.html = convertedHtml;
        const allAtt = [...attachments, ...inlineAttachments];
        if (allAtt.length > 0) emailPayloadTest.attachments = allAtt;
      } else {
        if (attachments.length > 0) emailPayloadTest.attachments = attachments;
      }

      console.log(`[send-newsletter] Test email payload attachments:`, JSON.stringify(
        (emailPayloadTest.attachments as Array<Record<string, unknown>> || []).map((a) => ({
          filename: a.filename,
          contentLength: String(a.content).length,
        }))
      ));

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayloadTest),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return Response.json({
          ok: false,
          error: `送信に失敗しました: ${response.status} ${errorBody}`,
        }, { status: 500 });
      }

      return Response.json({
        ok: true,
        test: true,
        message: `テストメールを ${testEmail} に送信しました`,
      });
    }

    // ── Normal send mode ──
    if (newsletter.status === "sent") {
      return Response.json({ ok: false, error: "Newsletter already sent" }, { status: 400 });
    }

    if (channel !== "email" && channel !== "email+line") {
      return Response.json({ ok: false, error: "Only email channel is currently supported" }, { status: 400 });
    }

    // Build recipient list
    const allMembers = await base44.asServiceRole.entities.Member.list();
    let recipients = allMembers.filter(
      (m: Record<string, unknown>) =>
        m.approval_status === "承認済" && m.status === "活動中" && m.email
    );

    const audienceType = normalize(newsletter.audience_type) || "all";
    let filterJson: Record<string, unknown> = {};
    try {
      const raw = normalize(newsletter.audience_filter_json);
      if (raw) filterJson = JSON.parse(raw);
    } catch { /* ignore */ }

    // Individual mode: send to specific member_ids
    if (audienceType === "individual" && Array.isArray(filterJson.member_ids)) {
      const idSet = new Set(filterJson.member_ids.map(String));
      recipients = recipients.filter((m: Record<string, unknown>) => idSet.has(String(m.id)));
    } else if (audienceType !== "individual") {
      // Segment filter (new format)
      const segment = normalize(filterJson.segment);
      if (segment === "正会員" || segment === "賛助会員" || segment === "OB会員" || segment === "名誉顧問") {
        recipients = recipients.filter((m: Record<string, unknown>) => normalize(m.member_type) === segment);
      } else if (segment === "新入会員") {
        recipients = recipients.filter((m: Record<string, unknown>) => m.is_new === true);
      }

      // Legacy member_type filter (backward compat)
      if (!segment && filterJson.member_type) {
        const mt = normalize(filterJson.member_type);
        if (mt) recipients = recipients.filter((m: Record<string, unknown>) => normalize(m.member_type) === mt);
      }

      // Compound: is_graduate
      if (filterJson.is_graduate === true) {
        recipients = recipients.filter((m: Record<string, unknown>) => m.is_graduate === true);
      }

      // Compound: unpaid_only
      if (filterJson.unpaid_only === true) {
        const dues = await base44.asServiceRole.entities.Due.list();
        const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
        const currentFY = fiscalYears.find((fy: Record<string, unknown>) => fy.is_current === true);
        if (currentFY) {
          const paidMemberIds = new Set<string>();
          for (const d of dues) {
            const dr = d as Record<string, unknown>;
            if (normalize(dr.fiscal_year_id) !== String(currentFY.id)) continue;
            if (normalize(dr.status) === "納入済") paidMemberIds.add(normalize(dr.member_id));
          }
          recipients = recipients.filter((m: Record<string, unknown>) => !paidMemberIds.has(String(m.id)));
        }
      }

      // Compound: organization_id
      const orgId = normalize(filterJson.organization_id);
      if (orgId) {
        const assignments = await base44.asServiceRole.entities.OrgAssignment.list();
        const orgMemberIds = new Set<string>();
        for (const a of assignments) {
          const ar = a as Record<string, unknown>;
          if (normalize(ar.organization_id) === orgId) orgMemberIds.add(normalize(ar.member_id));
        }
        recipients = recipients.filter((m: Record<string, unknown>) => orgMemberIds.has(String(m.id)));
      }
    }

    if (recipients.length === 0) {
      return Response.json({ ok: false, error: "No recipients found" }, { status: 400 });
    }

    // Convert inline Base64 images to CID attachments (once, shared across all recipients)
    let sendHtml = bodyHtml;
    let allAttachments = [...attachments];
    if (bodyHtml) {
      const { html: convertedHtml, inlineAttachments } = convertInlineImages(bodyHtml);
      sendHtml = convertedHtml;
      allAttachments = [...attachments, ...inlineAttachments];
    }

    // Send emails via Resend API in batches
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const batchSize = 10;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (member: Record<string, unknown>) => {
          const emailPayload: Record<string, unknown> = {
            from: resendFromEmail,
            to: [String(member.email)],
            subject: title,
            text: bodyText,
          };
          if (sendHtml) emailPayload.html = sendHtml;
          if (allAttachments.length > 0) emailPayload.attachments = allAttachments;
          if (scheduledAt) emailPayload.send_at = scheduledAt;

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailPayload),
          });

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Resend API error for ${member.email}: ${response.status} ${errorBody}`);
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") successCount++;
        else {
          failCount++;
          errors.push(String(result.reason));
        }
      }
    }

    // Update newsletter status
    const newStatus = scheduledAt ? "scheduled" : "sent";
    const updateData: Record<string, unknown> = { status: newStatus, sent_count: successCount };
    if (!scheduledAt) updateData.last_sent_at = new Date().toISOString();
    if (failCount > 0) {
      updateData.error_message = errors.slice(0, 3).join("; ");
      if (successCount === 0) updateData.status = "failed";
    }

    await base44.asServiceRole.entities.Newsletter.update(newsletterId, updateData);

    return Response.json({
      ok: true,
      status: newStatus,
      success_count: successCount,
      fail_count: failCount,
      total_recipients: recipients.length,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
