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
    const fiscalYearId = normalize(body?.fiscal_year_id);

    if (!fiscalYearId) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
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

    const [fiscalYear, allDues, allMembers] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.get(fiscalYearId),
      base44.asServiceRole.entities.Due.filter({ fiscal_year_id: fiscalYearId }),
      base44.asServiceRole.entities.Member.list()
    ]);

    if (!fiscalYear) {
      return Response.json({ ok: false, error: "Fiscal year not found" }, { status: 404 });
    }

    const memberMap = new Map<string, Record<string, unknown>>();
    for (const m of allMembers) {
      memberMap.set(m.id, m);
    }

    // Find unpaid dues with valid members
    const unpaidDues = allDues.filter((d) => {
      const status = normalize(d.status);
      return status === "未納" || status === "unpaid";
    });

    const recipients: Array<{ email: string; name: string; amount: number }> = [];
    for (const due of unpaidDues) {
      const member = memberMap.get(String(due.member_id || ""));
      if (member && member.email && member.approval_status === "承認済" && member.status === "活動中") {
        recipients.push({
          email: String(member.email),
          name: String(member.name_kanji || ""),
          amount: Number(due.amount || 0)
        });
      }
    }

    if (recipients.length === 0) {
      return Response.json({ ok: true, message: "未納者がいません", sent_count: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const emailBody = `${recipient.name} 様\n\n${fiscalYear.year}年度の会費（${recipient.amount.toLocaleString()}円）が未納となっております。\nお早めのお振込みをお願いいたします。\n\n水戸２１の会 事務局`;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [recipient.email],
            subject: `【水戸２１の会】${fiscalYear.year}年度 会費納入のお願い`,
            text: emailBody
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to send to ${recipient.email}: ${response.status}`);
        }
      } catch (err) {
        failCount++;
        console.error(`Failed to send to ${recipient.email}:`, err);
      }
    }

    return Response.json({
      ok: true,
      sent_count: successCount,
      fail_count: failCount,
      total_unpaid: recipients.length
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
