import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_MEMBER_TYPES = ["", "正会員", "賛助会員", "OB会員"];
const ALLOWED_STATUS = ["", "活動中", "休会", "退会"];
const STATUS_ALIASES: Record<string, string> = {
  active: "活動中"
};

const TRACKABLE_FIELDS = [
  "name_kanji", "name_kana", "birthday", "company_name", "company_position",
  "industry", "email", "mobile_phone", "company_phone", "company_fax",
  "company_address", "company_postal_code", "company_pr",
  "home_postal_code", "home_address", "home_phone", "home_fax",
  "hobbies", "profile_image",
  "show_email_in_directory", "show_company_in_directory", "show_mobile_in_directory",
  "member_number", "member_type", "status", "is_new", "notes"
];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeBooleanOrUndefined(value: unknown) {
  if (value === undefined) return undefined;
  return value === true;
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return STATUS_ALIASES[normalized] || normalized;
}

function pickLegacyValue(...values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (normalized) return normalized;
  }
  return "";
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
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
    const changedBy = normalizeOptionalString(body?.changed_by) || "system";
    const changedByRole = normalizeOptionalString(body?.changed_by_role) || "admin";

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
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
      company_postal_code: normalizeOptionalString(body?.company_postal_code),
      company_pr: normalizeOptionalString(body?.company_pr),
      home_postal_code: normalizeOptionalString(body?.home_postal_code),
      home_address: normalizeOptionalString(body?.home_address),
      home_phone: normalizeOptionalString(body?.home_phone),
      home_fax: normalizeOptionalString(body?.home_fax),
      hobbies: normalizeOptionalString(body?.hobbies),
      member_number: normalizeOptionalString(body?.member_number),
      member_type: normalizeOptionalString(body?.member_type),
      status: normalizeStatus(body?.status),
      notes: normalizeOptionalString(body?.notes),
      show_email_in_directory: normalizeBoolean(body?.show_email_in_directory),
      show_company_in_directory: normalizeBoolean(body?.show_company_in_directory),
      show_mobile_in_directory: normalizeBoolean(body?.show_mobile_in_directory)
    };

    if (body?.is_new !== undefined) {
      payload.is_new = normalizeBoolean(body.is_new);
    }
    if (body?.profile_image !== undefined) {
      payload.profile_image = normalizeOptionalString(body.profile_image);
    }

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
          referrer_1: pickLegacyValue(existingMember.referrer_1, "未設定"),
          referrer_2: pickLegacyValue(existingMember.referrer_2, "未設定"),
          email: payload.email as string,
          mobile_phone: payload.mobile_phone as string,
          company_name: payload.company_name as string || pickLegacyValue(existingMember.company_name),
          company_position: payload.company_position as string,
          industry: payload.industry as string,
          company_phone: payload.company_phone as string,
          company_fax: payload.company_fax as string,
          company_address: payload.company_address as string,
          company_postal_code: payload.company_postal_code as string,
          company_pr: payload.company_pr as string,
          home_postal_code: payload.home_postal_code as string,
          home_address: payload.home_address as string,
          home_phone: payload.home_phone as string,
          home_fax: payload.home_fax as string,
          hobbies: payload.hobbies as string,
          show_email_in_directory: payload.show_email_in_directory,
          show_company_in_directory: payload.show_company_in_directory,
          show_mobile_in_directory: payload.show_mobile_in_directory,
          ...(payload.profile_image !== undefined ? { profile_image: payload.profile_image } : {})
        }
      : payload;

    if (!allowPartialProfileUpdate) {
      const requiredFields = [
        [payload.name_kanji, "name_kanji"],
        [payload.name_kana, "name_kana"],
        [payload.birthday, "birthday"],
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

    const emailToCheck = (updatePayload as Record<string, unknown>).email as string;
    if (!emailToCheck.includes("@")) {
      return Response.json(
        { ok: false, error: "email is invalid" },
        { status: 400 }
      );
    }

    if (!allowPartialProfileUpdate && !ALLOWED_MEMBER_TYPES.includes(payload.member_type as string)) {
      return Response.json(
        { ok: false, error: "member_type is invalid" },
        { status: 400 }
      );
    }

    if (!allowPartialProfileUpdate && !ALLOWED_STATUS.includes(payload.status as string)) {
      return Response.json(
        { ok: false, error: "status is invalid" },
        { status: 400 }
      );
    }

    const duplicateMembers = await base44.asServiceRole.entities.Member.filter({
      email: emailToCheck
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
        member_number: payload.member_number as string
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

    // Record changes to MemberChangeLog
    const changeLogs: Array<{
      member_id: string;
      changed_by: string;
      changed_by_role: string;
      changed_at: string;
      field_name: string;
      old_value: string;
      new_value: string;
    }> = [];
    const now = new Date().toISOString();
    const finalPayload = updatePayload as Record<string, unknown>;

    for (const field of TRACKABLE_FIELDS) {
      if (finalPayload[field] === undefined) continue;
      const oldVal = stringify(existingMember[field]);
      const newVal = stringify(finalPayload[field]);
      if (oldVal !== newVal) {
        changeLogs.push({
          member_id: id,
          changed_by: changedBy,
          changed_by_role: changedByRole,
          changed_at: now,
          field_name: field,
          old_value: oldVal,
          new_value: newVal
        });
      }
    }

    const updatedMember = await base44.asServiceRole.entities.Member.update(id, finalPayload);

    // Save change logs in background (don't block response)
    if (changeLogs.length > 0) {
      try {
        await Promise.all(
          changeLogs.map((log) =>
            base44.asServiceRole.entities.MemberChangeLog.create(log)
          )
        );
      } catch (logError) {
        console.error("Failed to write change logs", logError);
      }
    }

    return Response.json({
      ok: true,
      member: updatedMember,
      changes_recorded: changeLogs.length
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
