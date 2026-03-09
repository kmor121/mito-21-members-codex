import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_MEMBER_TYPES = ["", "正会員", "賛助会員", "OB会員"];
const ALLOWED_STATUS = ["", "活動中", "休会", "退会"];
const STATUS_ALIASES: Record<string, string> = {
  active: "活動中"
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return STATUS_ALIASES[normalized] || normalized;
}

function pickLegacyValue(...values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
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
    const id = normalizeString(body?.id);
    const allowPartialProfileUpdate = normalizeBoolean(body?.allow_partial_profile_update);

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const payload = {
      name_kanji: normalizeOptionalString(body?.name_kanji),
      name_kana: normalizeOptionalString(body?.name_kana),
      birthday: normalizeOptionalString(body?.birthday),
      company_name: normalizeOptionalString(body?.company_name),
      company_position: normalizeOptionalString(body?.company_position),
      industry: normalizeOptionalString(body?.industry),
      email: normalizeOptionalString(body?.email),
      mobile_phone: normalizeOptionalString(body?.mobile_phone),
      company_phone: normalizeOptionalString(body?.company_phone),
      company_fax: normalizeOptionalString(body?.company_fax),
      company_address: normalizeOptionalString(body?.company_address),
      member_number: normalizeOptionalString(body?.member_number),
      member_type: normalizeOptionalString(body?.member_type),
      status: normalizeStatus(body?.status),
      show_email_in_directory: normalizeBoolean(body?.show_email_in_directory),
      show_company_in_directory: normalizeBoolean(body?.show_company_in_directory),
      show_mobile_in_directory: normalizeBoolean(body?.show_mobile_in_directory)
    };

    const base44 = createClientFromRequest(req);
    const existingMember = await base44.asServiceRole.entities.Member.get(id);

    if (!existingMember) {
      return Response.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    const updatePayload = allowPartialProfileUpdate
      ? {
          name_kanji: pickLegacyValue(existingMember.name_kanji, existingMember.name, "未設定"),
          name_kana: pickLegacyValue(existingMember.name_kana, existingMember.name, "未設定"),
          birthday: pickLegacyValue(existingMember.birthday, "1900-01-01"),
          company_name: pickLegacyValue(existingMember.company_name, "未設定"),
          referrer_1: pickLegacyValue(existingMember.referrer_1, "未設定"),
          referrer_2: pickLegacyValue(existingMember.referrer_2, "未設定"),
          email: payload.email,
          mobile_phone: payload.mobile_phone,
          company_phone: payload.company_phone,
          company_fax: payload.company_fax,
          company_address: payload.company_address,
          show_email_in_directory: payload.show_email_in_directory,
          show_company_in_directory: payload.show_company_in_directory,
          show_mobile_in_directory: payload.show_mobile_in_directory
        }
      : payload;

    if (!allowPartialProfileUpdate) {
      const requiredFields = [
        [payload.name_kanji, "name_kanji"],
        [payload.name_kana, "name_kana"],
        [payload.birthday, "birthday"],
        [payload.company_name, "company_name"],
        [payload.email, "email"],
        [payload.mobile_phone, "mobile_phone"]
      ];

      const missingField = requiredFields.find(([value]) => !value);
      if (missingField) {
        return Response.json(
          { ok: false, error: `${missingField[1]} is required` },
          { status: 400 }
        );
      }
    }

    if (!updatePayload.email.includes("@")) {
      return Response.json(
        { ok: false, error: "email is invalid" },
        { status: 400 }
      );
    }

    if (!allowPartialProfileUpdate && !ALLOWED_MEMBER_TYPES.includes(payload.member_type)) {
      return Response.json(
        { ok: false, error: "member_type is invalid" },
        { status: 400 }
      );
    }

    if (!allowPartialProfileUpdate && !ALLOWED_STATUS.includes(payload.status)) {
      return Response.json(
        { ok: false, error: "status is invalid" },
        { status: 400 }
      );
    }

    const duplicateMembers = await base44.asServiceRole.entities.Member.filter({
      email: updatePayload.email
    });
    const hasDuplicateEmail = duplicateMembers.some(
      (member) => member.id !== id && ["申請中", "承認済"].includes(String(member.approval_status || ""))
    );

    if (hasDuplicateEmail) {
      return Response.json(
        { ok: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    if (!allowPartialProfileUpdate && payload.member_number) {
      const duplicateNumberMembers = await base44.asServiceRole.entities.Member.filter({
        member_number: payload.member_number
      });
      const hasDuplicateNumber = duplicateNumberMembers.some(
        (member) => member.id !== id
      );

      if (hasDuplicateNumber) {
        return Response.json(
          { ok: false, error: "member_number already exists" },
          { status: 409 }
        );
      }
    }

    const updatedMember = await base44.asServiceRole.entities.Member.update(id, updatePayload);

    return Response.json({
      ok: true,
      member: updatedMember
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
