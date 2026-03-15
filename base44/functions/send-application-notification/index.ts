import { createClientFromRequest } from "npm:@base44/sdk";

const DEFAULTS: Record<string, string> = {
  template_application_receipt_subject: "受付完了",
  template_application_receipt_body: "{{member_name}} 様\n\n入会申込ありがとうございました。\n申込は受け付け済みです。\n審査後にご連絡します。",
  template_admin_notification_subject: "新規入会申込あり",
  template_admin_notification_body: "新規の入会申込を受け付けました。\n\n氏名（漢字）: {{member_name}}\n氏名（ふりがな）: {{member_name_kana}}\n生年月日: {{birthday}}\n会社名: {{company_name}}\nメールアドレス: {{email}}\n携帯番号: {{phone}}\n紹介者名1: {{referrer_1}}\n紹介者名2: {{referrer_2}}",
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

function parseRecipients(value: string | undefined) {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function getTemplates(base44: any) {
  try {
    const list = await base44.asServiceRole.entities.AppSettings.list();
    if (list.length > 0) return list[0];
  } catch { /* ignore */ }
  return null;
}

async function sendEmail(apiKey: string, payload: object) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Resend request failed");
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    const adminRecipients = parseRecipients(Deno.env.get("ADMIN_NOTIFICATION_EMAIL"));

    if (!apiKey || !from || adminRecipients.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: "Missing email configuration" });
    }

    const body = await req.json();
    const rawLastName = typeof body?.last_name === "string" ? body.last_name.trim() : "";
    const rawFirstName = typeof body?.first_name === "string" ? body.first_name.trim() : "";
    const rawLastNameKana = typeof body?.last_name_kana === "string" ? body.last_name_kana.trim() : "";
    const rawFirstNameKana = typeof body?.first_name_kana === "string" ? body.first_name_kana.trim() : "";

    const applicant = {
      full_name: `${rawLastName} ${rawFirstName}`.trim(),
      full_name_kana: `${rawLastNameKana} ${rawFirstNameKana}`.trim(),
      birthday: typeof body?.birthday === "string" ? body.birthday.trim() : "",
      company_name: typeof body?.company_name === "string" ? body.company_name.trim() : "",
      email: typeof body?.email === "string" ? body.email.trim() : "",
      mobile_phone: typeof body?.mobile_phone === "string" ? body.mobile_phone.trim() : "",
      referrer_1: typeof body?.referrer_1 === "string" ? body.referrer_1.trim() : "",
      referrer_2: typeof body?.referrer_2 === "string" ? body.referrer_2.trim() : ""
    };

    if (!applicant.full_name || !applicant.email) {
      return Response.json({ ok: false, error: "Applicant name and email are required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const settings = await getTemplates(base44);

    const vars = {
      member_name: applicant.full_name,
      member_name_kana: applicant.full_name_kana,
      birthday: applicant.birthday,
      company_name: applicant.company_name,
      email: applicant.email,
      phone: applicant.mobile_phone,
      referrer_1: applicant.referrer_1,
      referrer_2: applicant.referrer_2,
    };

    const adminSubject = renderTemplate(tpl(settings, "template_admin_notification_subject"), vars);
    const adminBody = renderTemplate(tpl(settings, "template_admin_notification_body"), vars);
    const applicantSubject = renderTemplate(tpl(settings, "template_application_receipt_subject"), vars);
    const applicantBody = renderTemplate(tpl(settings, "template_application_receipt_body"), vars);

    const adminResult = await sendEmail(apiKey, {
      from,
      to: adminRecipients,
      subject: adminSubject,
      text: adminBody
    });

    const applicantResult = await sendEmail(apiKey, {
      from,
      to: [applicant.email],
      subject: applicantSubject,
      text: applicantBody
    });

    return Response.json({ ok: true, admin: adminResult, applicant: applicantResult });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
