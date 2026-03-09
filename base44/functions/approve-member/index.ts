import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_MEMBER_TYPES = ["正会員", "賛助会員"];

function generateMemberNumber(currentFiscalYear: number, existingNumbers: string[]): string {
  const prefix = String(currentFiscalYear).slice(-2);
  const pattern = new RegExp(`^${prefix}(\\d{3})$`);
  let maxSeq = 0;
  for (const num of existingNumbers) {
    const match = String(num || "").match(pattern);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}${nextSeq}`;
}

async function sendApprovalEmail(
  memberEmail: string,
  memberName: string,
  memberNumber: string,
  memberType: string
) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "";
  if (!apiKey || !fromEmail) return { skipped: true };

  const body = `${memberName} 様

水戸２１の会への入会が承認されました。

■ 会員情報
  会員番号: ${memberNumber}
  会員種別: ${memberType}

■ ご案内
  会員専用ページから名簿の閲覧やマイページの編集が行えます。
  ログイン方法については別途ご案内いたします。

今後ともよろしくお願いいたします。

水戸２１の会 事務局`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [memberEmail],
        subject: `【水戸２１の会】入会承認のお知らせ（会員番号: ${memberNumber}）`,
        text: body
      })
    });
    const result = await res.json();
    return { sent: true, result };
  } catch (error) {
    console.error("Failed to send approval email:", error);
    return { sent: false, error: String(error) };
  }
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
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const memberType =
      typeof body?.member_type === "string" ? body.member_type.trim() : "";
    const memberNumber =
      typeof body?.member_number === "string" ? body.member_number.trim() : "";

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MEMBER_TYPES.includes(memberType)) {
      return Response.json(
        { ok: false, error: "member_type is invalid" },
        { status: 400 }
      );
    }

    if (!memberNumber) {
      return Response.json(
        { ok: false, error: "member_number is required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (!member) {
      return Response.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.approval_status !== "申請中") {
      return Response.json(
        { ok: false, error: "Only pending members can be approved" },
        { status: 409 }
      );
    }

    const duplicateMembers = await base44.asServiceRole.entities.Member.filter({
      member_number: memberNumber
    });
    const hasDuplicateNumber = duplicateMembers.some(
      (duplicateMember) => duplicateMember.id !== id
    );

    if (hasDuplicateNumber) {
      return Response.json(
        { ok: false, error: "member_number already exists" },
        { status: 409 }
      );
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

    // Send approval email
    const emailResult = await sendApprovalEmail(
      String(member.email || ""),
      String(member.name_kanji || ""),
      memberNumber,
      memberType
    );

    return Response.json({
      ok: true,
      member: updatedMember,
      email: emailResult
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
