import { createClientFromRequest } from "npm:@base44/sdk";

async function sendRejectionEmail(
  memberEmail: string,
  memberName: string,
  rejectionReason: string
) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "";
  if (!apiKey || !fromEmail) return { skipped: true };

  const body = `${memberName} 様

この度は水戸２１の会への入会申込をいただき、誠にありがとうございました。

審査の結果、誠に残念ながら今回はご入会をお見送りとさせていただきました。

■ 理由
${rejectionReason}

ご不明な点がございましたら、事務局までお問い合わせください。

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
        subject: "【水戸２１の会】入会申込の審査結果について",
        text: body
      })
    });
    const result = await res.json();
    return { sent: true, result };
  } catch (error) {
    console.error("Failed to send rejection email:", error);
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
    const rejectionReason =
      typeof body?.rejection_reason === "string"
        ? body.rejection_reason.trim()
        : "";

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (!rejectionReason) {
      return Response.json(
        { ok: false, error: "rejection_reason is required" },
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
        { ok: false, error: "Only pending members can be rejected" },
        { status: 409 }
      );
    }

    const updatedMember = await base44.asServiceRole.entities.Member.update(id, {
      approval_status: "却下",
      rejection_reason: rejectionReason
    });

    const emailResult = await sendRejectionEmail(
      String(member.email || ""),
      String(member.name_kanji || ""),
      rejectionReason
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
