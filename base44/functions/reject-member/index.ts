import { createClientFromRequest } from "npm:@base44/sdk";

const DEFAULTS: Record<string, string> = {
  template_rejection_subject: "【水戸２１の会】入会申込の審査結果について",
  template_rejection_body: "{{member_name}} 様\n\nこの度は水戸２１の会への入会申込をいただき、誠にありがとうございました。\n\n審査の結果、誠に残念ながら今回はご入会をお見送りとさせていただきました。\n\n■ 理由\n{{rejection_reason}}\n\nご不明な点がございましたら、事務局までお問い合わせください。\n\n水戸２１の会 事務局",
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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const rejectionReason = typeof body?.rejection_reason === "string" ? body.rejection_reason.trim() : "";

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    if (!rejectionReason) {
      return Response.json({ ok: false, error: "rejection_reason is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (!member) {
      return Response.json({ ok: false, error: "Member not found" }, { status: 404 });
    }

    if (member.approval_status !== "申請中") {
      return Response.json({ ok: false, error: "Only pending members can be rejected" }, { status: 409 });
    }

    const updatedMember = await base44.asServiceRole.entities.Member.update(id, {
      approval_status: "却下",
      rejection_reason: rejectionReason
    });

    const displayName = `${member.last_name || ""} ${member.first_name || ""}`.trim();

    const apiKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "";
    let emailResult: any = { skipped: true };

    if (apiKey && fromEmail && member.email) {
      const settings = await getTemplates(base44);
      const vars = {
        member_name: displayName,
        rejection_reason: rejectionReason,
      };

      const subject = renderTemplate(tpl(settings, "template_rejection_subject"), vars);
      const emailBody = renderTemplate(tpl(settings, "template_rejection_body"), vars);

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
        console.error("Failed to send rejection email:", error);
        emailResult = { sent: false, error: String(error) };
      }
    }

    return Response.json({ ok: true, member: updatedMember, email: emailResult });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
