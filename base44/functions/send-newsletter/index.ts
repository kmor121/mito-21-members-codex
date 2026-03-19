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

    // Parse attachments (supports base64 file attachments + URL links)
    // Priority: request body > entity field (body is more reliable for large base64 data)
    let attachments: Array<Record<string, unknown>> = [];
    let urlLinks: Array<Record<string, unknown>> = [];
    const attachmentsSources = [
      normalize(body?.attachments_json),
      normalize(newsletter.attachments_json),
    ];
    for (const src of attachmentsSources) {
      if (!src) continue;
      try {
        const parsed = JSON.parse(src);
        if (Array.isArray(parsed)) {
          // Extract URL link entries
          const linkItems = parsed.filter((a: Record<string, unknown>) => a.url);
          if (linkItems.length > 0 && urlLinks.length === 0) {
            urlLinks = linkItems.map((a: Record<string, unknown>) => ({
              name: String(a.name || ""),
              url: String(a.url || ""),
            }));
          }
          // Extract file attachments
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
          if (filtered.length > 0 && attachments.length === 0) {
            attachments = filtered;
          }
          if (attachments.length > 0 || urlLinks.length > 0) break;
        }
      } catch { /* ignore */ }
    }

    // Build URL links HTML section to append to email body
    function buildUrlLinksHtml(links: Array<Record<string, unknown>>): string {
      if (links.length === 0) return "";
      const items = links
        .map((l) => {
          const url = String(l.url || "");
          const name = String(l.name || "") || url;
          return `<p style="margin:4px 0;"><a href="${url}" style="color:#534AB7;text-decoration:underline;">${name}</a></p>`;
        })
        .join("");
      return `<div style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:8px;"><p style="margin:0 0 8px;font-weight:600;font-size:14px;">\u{1F4CE} 添付リンク</p>${items}</div>`;
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
        emailPayloadTest.html = convertedHtml + buildUrlLinksHtml(urlLinks);
        const allAtt = [...attachments, ...inlineAttachments];
        if (allAtt.length > 0) emailPayloadTest.attachments = allAtt;
      } else {
        if (urlLinks.length > 0) emailPayloadTest.html = buildUrlLinksHtml(urlLinks);
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

    // ── Event linking: reminder filter (exclude responded members) ──
    const linkedEventId = normalize(newsletter.linked_event_id);
    let filteredOutCount = 0;
    if (linkedEventId && newsletter.is_reminder) {
      const attendances = await base44.asServiceRole.entities.Attendance.filter({ event_id: linkedEventId });
      const respondedIds = new Set(attendances.map((a: Record<string, unknown>) => normalize(a.member_id)));
      const before = recipients.length;
      recipients = recipients.filter((m: Record<string, unknown>) => !respondedIds.has(String(m.id)));
      filteredOutCount = before - recipients.length;
      console.log(`[send-newsletter] Reminder mode: filtered out ${filteredOutCount} responded members`);
    }

    if (recipients.length === 0) {
      await base44.asServiceRole.entities.Newsletter.update(newsletterId, {
        status: "sent", sent_count: 0, last_sent_at: new Date().toISOString(),
      });
      return Response.json({
        ok: true, status: "sent", success_count: 0, fail_count: 0,
        total_recipients: 0, filtered_out: filteredOutCount,
        message: filteredOutCount > 0
          ? `未回答者がいないため送信をスキップしました（回答済み${filteredOutCount}名）`
          : "No recipients found",
      });
    }

    // ── Event linking: build RSVP HTML block ──
    let eventRsvpHtml = "";
    if (linkedEventId) {
      try {
        const evt = await base44.asServiceRole.entities.Event.get(linkedEventId);
        if (evt) {
          const siteUrl = "https://mito21-members.base44.app";
          const evtTitle = normalize(evt.title) || "イベント";
          const evtDate = normalize(evt.event_date);
          const evtStart = normalize(evt.start_time);
          const evtEnd = normalize(evt.end_time);
          const evtLocation = normalize(evt.location);
          const evtDeadline = normalize(evt.rsvp_deadline);
          const timeStr = evtStart ? (evtEnd ? `${evtStart}〜${evtEnd}` : evtStart) : "";
          eventRsvpHtml = `<div style="margin:24px 0;padding:20px;background:#f8f7ff;border:1px solid #e8e7fe;border-radius:12px;text-align:center;"><p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#333;">📅 出欠回答のお願い</p><p style="margin:0 0 4px;font-size:14px;color:#666;">${evtTitle}${evtDate ? ` — ${evtDate}` : ""}${timeStr ? ` ${timeStr}` : ""}</p>${evtLocation ? `<p style="margin:0 0 4px;font-size:14px;color:#666;">📍 ${evtLocation}</p>` : ""}${evtDeadline ? `<p style="margin:0 0 16px;font-size:13px;color:#d97706;">回答期限: ${evtDeadline}</p>` : `<div style="height:16px"></div>`}<a href="${siteUrl}/events" style="display:inline-block;padding:12px 32px;background:#534AB7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">出欠を回答する</a><p style="margin:12px 0 0;font-size:12px;color:#999;">ログイン後、イベントページから回答できます</p></div>`;
        }
      } catch (e) {
        console.warn("[send-newsletter] Failed to load linked event:", e);
      }
    }

    // Convert inline Base64 images to CID attachments (once, shared across all recipients)
    let sendHtml = bodyHtml;
    let allAttachments = [...attachments];
    if (bodyHtml) {
      const { html: convertedHtml, inlineAttachments } = convertInlineImages(bodyHtml);
      sendHtml = convertedHtml + buildUrlLinksHtml(urlLinks) + eventRsvpHtml;
      allAttachments = [...attachments, ...inlineAttachments];
    } else if (urlLinks.length > 0 || eventRsvpHtml) {
      sendHtml = buildUrlLinksHtml(urlLinks) + eventRsvpHtml;
    }

    // Send emails via Resend API in batches — track per-recipient results
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const failedRecipients: Array<Record<string, unknown>> = [];
    const batchSize = 10;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (member: Record<string, unknown>) => {
          const memberEmail = String(member.email);
          const memberId = String(member.id || "");
          const memberName = [normalize(member.last_name), normalize(member.first_name)].filter(Boolean).join(" ") || memberEmail;
          const emailPayload: Record<string, unknown> = {
            from: resendFromEmail,
            to: [memberEmail],
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
            const errMsg = `HTTP ${response.status}: ${errorBody.substring(0, 200)}`;
            failedRecipients.push({ member_id: memberId, member_name: memberName, email: memberEmail, error: errMsg });
            throw new Error(errMsg);
          }
          return { memberId, memberName, memberEmail };
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

    // Update newsletter status with failure tracking
    const newStatus = scheduledAt ? "scheduled" : "sent";
    const updateData: Record<string, unknown> = {
      status: newStatus,
      sent_count: successCount,
      total_recipients: recipients.length,
      failed_count: failCount,
      failed_recipients_json: failedRecipients.length > 0 ? JSON.stringify(failedRecipients) : "",
    };
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
      filtered_out: filteredOutCount,
      failed_details: failedRecipients.slice(0, 10),
      errors: errors.slice(0, 5),
      message: failCount > 0
        ? `${recipients.length}件中${failCount}件の送信に失敗しました`
        : filteredOutCount > 0
          ? `${successCount}名に送信しました（回答済み${filteredOutCount}名を除外）`
          : `${successCount}名に送信しました`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
