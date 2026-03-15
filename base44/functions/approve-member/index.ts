import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_MEMBER_TYPES = ["正会員", "賛助会員"];

const DEFAULTS: Record<string, string> = {
  template_approval_subject: "【水戸２１の会】入会承認のお知らせ（会員番号: {{member_number}}）",
  template_approval_body: "{{member_name}} 様\n\n水戸２１の会への入会が承認されました。\n\n■ 会員情報\n  会員番号: {{member_number}}\n  会員種別: {{member_type}}\n\n■ ご案内\n  会員専用ページから名簿の閲覧やマイページの編集が行えます。\n  ログイン方法については別途ご案内いたします。\n\n今後ともよろしくお願いいたします。\n\n水戸２１の会 事務局",
};

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function tpl(settings: any, key: string): string {
  return settings?.[key] || DEFAULTS[key] || "";
}

async function getTemplates(base44: any) {
  try {
    const list = await base44.asServiceRole.entities.AppSettings.list();
    if (list.length > 0) return list[0];
  } catch { /* ignore */ }
  return null;
}

function getMidpointDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const memberType = typeof body?.member_type === "string" ? body.member_type.trim() : "";
    const memberNumber = typeof body?.member_number === "string" ? body.member_number.trim() : "";

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    if (!ALLOWED_MEMBER_TYPES.includes(memberType)) {
      return Response.json({ ok: false, error: "member_type is invalid" }, { status: 400 });
    }

    if (!memberNumber) {
      return Response.json({ ok: false, error: "member_number is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (!member) {
      return Response.json({ ok: false, error: "Member not found" }, { status: 404 });
    }

    if (member.approval_status !== "申請中") {
      return Response.json({ ok: false, error: "Only pending members can be approved" }, { status: 409 });
    }

    const duplicateMembers = await base44.asServiceRole.entities.Member.filter({
      member_number: memberNumber
    });
    const hasDuplicateNumber = duplicateMembers.some(
      (duplicateMember) => duplicateMember.id !== id
    );

    if (hasDuplicateNumber) {
      return Response.json({ ok: false, error: "member_number already exists" }, { status: 409 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatedMember = await base44.asServiceRole.entities.Member.update(id, {
      member_type: memberType,
      member_number: memberNumber,
      approval_status: "承認済",
      status: "活動中",
      is_new: true,
      join_date: today,
      rejection_reason: ""
    });

    // Generate Dues records for new member
    let duesGenerated: any[] = [];
    try {
      const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
      const currentFY = fiscalYears.find((fy) => fy.is_current === true);

      if (currentFY) {
        const fyId = currentFY.id;
        const dueSettings = await base44.asServiceRole.entities.DueSetting.filter({
          fiscal_year_id: fyId
        });

        if (dueSettings.length > 0) {
          const setting = dueSettings[0];
          const admissionFee = Number(setting.admission_fee || 0);

          const startDate = String(currentFY.start_date || "");
          const endDate = String(currentFY.end_date || "");
          const midpoint = getMidpointDate(startDate, endDate);
          const isSecondHalf = midpoint && today > midpoint;

          let annualFeeAmount: number;
          let annualFeeDueType: string;

          if (isSecondHalf) {
            annualFeeAmount = Number(setting.second_half_fee || 15000);
            annualFeeDueType = "後期入会会費";
          } else {
            annualFeeAmount = Number(setting.first_half_fee || 30000);
            annualFeeDueType = "年会費";
          }

          if (admissionFee > 0) {
            const admissionDue = await base44.asServiceRole.entities.Due.create({
              fiscal_year_id: fyId,
              member_id: id,
              amount: admissionFee,
              due_type: "入会金",
              status: "未納",
              paid_date: "",
              notes: ""
            });
            duesGenerated.push(admissionDue);
          }

          if (annualFeeAmount > 0) {
            const annualDue = await base44.asServiceRole.entities.Due.create({
              fiscal_year_id: fyId,
              member_id: id,
              amount: annualFeeAmount,
              due_type: annualFeeDueType,
              status: "未納",
              paid_date: "",
              notes: ""
            });
            duesGenerated.push(annualDue);
          }
        }
      }
    } catch (dueError) {
      console.error("Failed to generate dues for new member:", dueError);
    }

    // Send approval email using template
    const displayName = `${member.last_name || ""} ${member.first_name || ""}`.trim();
    let emailResult: any = { skipped: true };

    const apiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "";

    if (apiKey && fromEmail && member.email) {
      const settings = await getTemplates(base44);
      const vars = {
        member_name: displayName,
        member_number: memberNumber,
        member_type: memberType,
      };

      const subject = renderTemplate(tpl(settings, "template_approval_subject"), vars);
      const emailBody = renderTemplate(tpl(settings, "template_approval_body"), vars);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [String(member.email)],
            subject,
            text: emailBody
          })
        });
        const result = await res.json();
        emailResult = { sent: true, result };
      } catch (error) {
        console.error("Failed to send approval email:", error);
        emailResult = { sent: false, error: String(error) };
      }
    }

    return Response.json({
      ok: true,
      member: updatedMember,
      email: emailResult,
      dues_generated: duesGenerated.length
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
