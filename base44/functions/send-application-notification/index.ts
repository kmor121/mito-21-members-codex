function parseRecipients(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAdminMailText(applicant: {
  name_kanji: string;
  name_kana: string;
  birthday: string;
  company_name: string;
  email: string;
  mobile_phone: string;
  referrer_1: string;
  referrer_2: string;
}) {
  return [
    "新規の入会申込を受け付けました。",
    "",
    `氏名（漢字）: ${applicant.name_kanji}`,
    `氏名（ふりがな）: ${applicant.name_kana}`,
    `生年月日: ${applicant.birthday}`,
    `会社名: ${applicant.company_name}`,
    `メールアドレス: ${applicant.email}`,
    `携帯番号: ${applicant.mobile_phone}`,
    `紹介者名1: ${applicant.referrer_1}`,
    `紹介者名2: ${applicant.referrer_2}`
  ].join("\n");
}

function buildApplicantMailText(name: string) {
  return [
    `${name} 様`,
    "",
    "入会申込ありがとうございました。",
    "申込は受け付け済みです。",
    "審査後にご連絡します。"
  ].join("\n");
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
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    const adminRecipients = parseRecipients(
      Deno.env.get("ADMIN_NOTIFICATION_EMAIL")
    );

    if (!apiKey || !from || adminRecipients.length === 0) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: "Missing email configuration"
      });
    }

    const body = await req.json();
    const applicant = {
      name_kanji: typeof body?.name_kanji === "string" ? body.name_kanji.trim() : "",
      name_kana: typeof body?.name_kana === "string" ? body.name_kana.trim() : "",
      birthday: typeof body?.birthday === "string" ? body.birthday.trim() : "",
      company_name:
        typeof body?.company_name === "string" ? body.company_name.trim() : "",
      email: typeof body?.email === "string" ? body.email.trim() : "",
      mobile_phone:
        typeof body?.mobile_phone === "string" ? body.mobile_phone.trim() : "",
      referrer_1:
        typeof body?.referrer_1 === "string" ? body.referrer_1.trim() : "",
      referrer_2:
        typeof body?.referrer_2 === "string" ? body.referrer_2.trim() : ""
    };

    if (!applicant.name_kanji || !applicant.email) {
      return Response.json(
        { ok: false, error: "Applicant name and email are required" },
        { status: 400 }
      );
    }

    const adminResult = await sendEmail(apiKey, {
      from,
      to: adminRecipients,
      subject: "新規入会申込あり",
      text: buildAdminMailText(applicant)
    });

    const applicantResult = await sendEmail(apiKey, {
      from,
      to: [applicant.email],
      subject: "受付完了",
      text: buildApplicantMailText(applicant.name_kanji)
    });

    return Response.json({
      ok: true,
      admin: adminResult,
      applicant: applicantResult
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
