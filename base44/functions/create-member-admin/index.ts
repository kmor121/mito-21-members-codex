import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();

    const name_kanji = normalizeString(body.name_kanji);
    const name_kana = normalizeString(body.name_kana);
    const email = normalizeString(body.email);

    if (!name_kanji) {
      return Response.json({ ok: false, error: "氏名は必須です。" }, { status: 400 });
    }
    if (!name_kana) {
      return Response.json({ ok: false, error: "フリガナは必須です。" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return Response.json({ ok: false, error: "有効なメールアドレスを入力してください。" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Check for duplicate email
    const existing = await base44.asServiceRole.entities.Member.filter({
      email,
      approval_status: { "$in": ["申請中", "承認済"] },
    });
    if (existing.length > 0) {
      return Response.json({ ok: false, error: "このメールアドレスは既に登録されています。" }, { status: 409 });
    }

    const memberData: Record<string, unknown> = {
      name_kanji,
      name_kana,
      birthday: normalizeString(body.birthday),
      email,
      mobile_phone: normalizeString(body.mobile_phone),
      member_type: normalizeString(body.member_type) || "正会員",
      status: normalizeString(body.status) || "活動中",
      member_number: normalizeString(body.member_number),
      join_date: normalizeString(body.join_date),
      role: normalizeString(body.role) || "member",
      notes: normalizeString(body.notes),
      approval_status: "承認済",
      applied_at: new Date().toISOString(),

      // Company
      company_name: normalizeString(body.company_name),
      company_position: normalizeString(body.company_position),
      company_postal_code: normalizeString(body.company_postal_code),
      company_address: normalizeString(body.company_address),
      company_phone: normalizeString(body.company_phone),
      company_fax: normalizeString(body.company_fax),
      company_pr: normalizeString(body.company_pr),
      industry: normalizeString(body.industry),

      // Home
      home_postal_code: normalizeString(body.home_postal_code),
      home_address: normalizeString(body.home_address),
      home_phone: normalizeString(body.home_phone),
      home_fax: normalizeString(body.home_fax),

      // Other
      hobbies: normalizeString(body.hobbies),
      referrer_1: normalizeString(body.referrer_1),
      referrer_2: normalizeString(body.referrer_2),

      // Flags
      is_new: normalizeBoolean(body.is_new),
      is_graduate: normalizeBoolean(body.is_graduate),
      show_email_in_directory: normalizeBoolean(body.show_email_in_directory),
      show_mobile_in_directory: normalizeBoolean(body.show_mobile_in_directory),
      show_company_in_directory: normalizeBoolean(body.show_company_in_directory),
    };

    const member = await base44.asServiceRole.entities.Member.create(memberData);

    // If is_new, generate dues for current fiscal year
    if (normalizeBoolean(body.is_new)) {
      try {
        const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
        const currentFy = fiscalYears.find((fy: any) => fy.is_current === true);

        if (currentFy) {
          // Get due settings for fee amounts
          const dueSettings = await base44.asServiceRole.entities.DueSetting.filter({
            fiscal_year_id: currentFy.id,
          });
          const settings = dueSettings.length > 0 ? dueSettings[0] : null;

          const memberType = normalizeString(body.member_type) || "正会員";
          const annualFee = memberType === "賛助会員"
            ? (settings?.associate_annual_fee ?? 10000)
            : (settings?.first_half_fee ?? 30000);
          const admissionFee = settings?.admission_fee ?? 10000;

          // Create annual fee due
          await base44.asServiceRole.entities.Due.create({
            fiscal_year_id: currentFy.id,
            member_id: member.id,
            member_name: name_kanji,
            member_type: memberType,
            amount: annualFee,
            status: "未納",
            due_type: "年会費",
            is_new: true,
          });

          // Create admission fee due
          await base44.asServiceRole.entities.Due.create({
            fiscal_year_id: currentFy.id,
            member_id: member.id,
            member_name: name_kanji,
            member_type: memberType,
            amount: admissionFee,
            status: "未納",
            due_type: "入会金",
            is_new: true,
          });
        }
      } catch (dueError) {
        console.error("Failed to create dues for new member:", dueError);
        // Don't fail the member creation if dues fail
      }
    }

    return Response.json({ ok: true, member });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
});
