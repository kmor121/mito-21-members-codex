import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const body = await req.json();
    const payload = {
      name_kanji: normalizeString(body?.name_kanji),
      name_kana: normalizeString(body?.name_kana),
      birthday: normalizeString(body?.birthday),
      company_name: normalizeString(body?.company_name),
      company_postal_code: normalizeString(body?.company_postal_code),
      company_position: normalizeString(body?.company_position),
      industry: normalizeString(body?.industry),
      company_address: normalizeString(body?.company_address),
      company_phone: normalizeString(body?.company_phone),
      company_fax: normalizeString(body?.company_fax),
      company_pr: normalizeString(body?.company_pr),
      email: normalizeString(body?.email),
      show_email_in_directory: normalizeBoolean(body?.show_email_in_directory),
      mobile_phone: normalizeString(body?.mobile_phone),
      show_mobile_in_directory: normalizeBoolean(body?.show_mobile_in_directory),
      show_company_in_directory: normalizeBoolean(body?.show_company_in_directory),
      home_postal_code: normalizeString(body?.home_postal_code),
      home_address: normalizeString(body?.home_address),
      home_phone: normalizeString(body?.home_phone),
      home_fax: normalizeString(body?.home_fax),
      hobbies: normalizeString(body?.hobbies),
      referrer_1: normalizeString(body?.referrer_1),
      referrer_2: normalizeString(body?.referrer_2)
    };

    const requiredFields = [
      ["name_kanji", "name_kanji"],
      ["name_kana", "name_kana"],
      ["birthday", "birthday"],
      ["company_name", "company_name"],
      ["email", "email"],
      ["mobile_phone", "mobile_phone"],
      ["referrer_1", "referrer_1"],
      ["referrer_2", "referrer_2"]
    ] as const;

    for (const [fieldName, label] of requiredFields) {
      if (!payload[fieldName]) {
        return Response.json(
          { ok: false, error: `${label} is required` },
          { status: 400 }
        );
      }
    }

    if (!payload.email.includes("@")) {
      return Response.json(
        { ok: false, error: "Email is invalid" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const existingMembers = await base44.asServiceRole.entities.Member.filter({
      email: payload.email,
      approval_status: {
        "$in": ["申請中", "承認済"]
      }
    });

    if (existingMembers.length > 0) {
      return Response.json(
        { ok: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    const member = await base44.asServiceRole.entities.Member.create({
      ...payload,
      approval_status: "申請中",
      applied_at: new Date().toISOString()
    });

    try {
      const notificationResult = await base44.asServiceRole.functions.invoke(
        "send-application-notification",
        {
          name_kanji: payload.name_kanji,
          name_kana: payload.name_kana,
          birthday: payload.birthday,
          company_name: payload.company_name,
          email: payload.email,
          mobile_phone: payload.mobile_phone,
          referrer_1: payload.referrer_1,
          referrer_2: payload.referrer_2
        }
      );

      if (!notificationResult?.ok && !notificationResult?.skipped) {
        console.error("send-application-notification failed", notificationResult);
      }
    } catch (notificationError) {
      console.error("send-application-notification failed", notificationError);
    }

    return Response.json({
      ok: true,
      member
    });
  } catch (_error) {
    console.error(_error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
