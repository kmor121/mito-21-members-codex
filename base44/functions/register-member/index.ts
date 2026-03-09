import { createClientFromRequest } from "npm:@base44/sdk";

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);
const PROFILE_IMAGE_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function getStringEntry(source: FormData | Record<string, unknown>, key: string) {
  if (source instanceof FormData) {
    const value = source.get(key);
    return typeof value === "string" ? value.trim() : "";
  }

  return normalizeString(source?.[key]);
}

function getBooleanEntry(source: FormData | Record<string, unknown>, key: string) {
  if (source instanceof FormData) {
    return source.get(key) === "true";
  }

  return normalizeBoolean(source?.[key]);
}

function profileImageHasAllowedType(file: File) {
  const lowerName = file.name.toLowerCase();
  return (
    PROFILE_IMAGE_ALLOWED_TYPES.has(file.type) ||
    PROFILE_IMAGE_ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const body = contentType.includes("multipart/form-data")
      ? await req.formData()
      : await req.json();
    const payload = {
      name_kanji: getStringEntry(body, "name_kanji"),
      name_kana: getStringEntry(body, "name_kana"),
      birthday: getStringEntry(body, "birthday"),
      company_name: getStringEntry(body, "company_name"),
      company_postal_code: getStringEntry(body, "company_postal_code"),
      company_position: getStringEntry(body, "company_position"),
      industry: getStringEntry(body, "industry"),
      company_address: getStringEntry(body, "company_address"),
      company_phone: getStringEntry(body, "company_phone"),
      company_fax: getStringEntry(body, "company_fax"),
      company_pr: getStringEntry(body, "company_pr"),
      email: getStringEntry(body, "email"),
      show_email_in_directory: getBooleanEntry(body, "show_email_in_directory"),
      mobile_phone: getStringEntry(body, "mobile_phone"),
      show_mobile_in_directory: getBooleanEntry(body, "show_mobile_in_directory"),
      show_company_in_directory: getBooleanEntry(body, "show_company_in_directory"),
      home_postal_code: getStringEntry(body, "home_postal_code"),
      home_address: getStringEntry(body, "home_address"),
      home_phone: getStringEntry(body, "home_phone"),
      home_fax: getStringEntry(body, "home_fax"),
      hobbies: getStringEntry(body, "hobbies"),
      referrer_1: getStringEntry(body, "referrer_1"),
      referrer_2: getStringEntry(body, "referrer_2")
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
    const profileImageFile = body instanceof FormData ? body.get("profile_image") : null;
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

    let profileImageUrl = "";

    if (profileImageFile instanceof File && profileImageFile.size > 0) {
      if (!profileImageHasAllowedType(profileImageFile)) {
        return Response.json(
          { ok: false, error: "Profile image must be JPG or PNG" },
          { status: 400 }
        );
      }

      if (profileImageFile.size > PROFILE_IMAGE_MAX_BYTES) {
        return Response.json(
          { ok: false, error: "Profile image must be 5MB or smaller" },
          { status: 400 }
        );
      }

      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
        file: profileImageFile,
        fileName: profileImageFile.name
      });

      profileImageUrl = normalizeString(uploadResult?.file_url || uploadResult?.url);
    }

    const member = await base44.asServiceRole.entities.Member.create({
      ...payload,
      ...(profileImageUrl ? { profile_image: profileImageUrl } : {}),
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
