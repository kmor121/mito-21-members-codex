import { createClientFromRequest } from "npm:@base44/sdk";

const EMAIL_DEFAULTS: Record<string, string> = {
  sender_name: "水戸21の会 事務局",
  template_application_receipt_subject: "【水戸21の会】入会申込を受け付けました",
  template_application_receipt_body: "{{applicant_name}} 様\n\nこの度は水戸21の会への入会をお申込みいただき、誠にありがとうございます。\n\n以下の内容で入会申込を受け付けましたのでお知らせいたします。\n\nお名前: {{applicant_name}}\n会員種別: {{membership_type}}\n申込日: {{application_date}}\n\n今後、幹事会にて審査を行い、結果をメールにてご連絡いたします。\n通常1ヶ月程度お時間をいただいておりますので、しばらくお待ちくださいますようお願いいたします。\n\nご不明な点がございましたら、本メールへの返信にてお問い合わせください。\n\n──────────────────\n水戸21の会 事務局\n──────────────────",
  template_admin_notification_subject: "【水戸21の会】新しい入会申込がありました（{{applicant_name}} 様）",
  template_admin_notification_body: "新しい入会申込を受け付けました。\n\n■ 申込内容\nお名前: {{applicant_name}}\n会員種別: {{membership_type}}\n申込日: {{application_date}}\n\n以下のリンクから詳細を確認し、承認・却下の手続きを行ってください。\nhttps://mito21-members-codex-da487265.base44.app/admin/applications\n\n──────────────────\n※ このメールはシステムから自動送信されています。\n──────────────────",
  template_approval_subject: "【水戸21の会】入会承認のお知らせ",
  template_approval_body: "{{member_name}} 様\n\nこの度は水戸21の会への入会をお申込みいただき、誠にありがとうございます。\n幹事会にて審査を行った結果、入会を承認いたしましたのでお知らせいたします。\n\n今後の活動やご案内については、メールおよびLINEにてお知らせいたします。\n一緒に活動できることを会員一同楽しみにしております。\n\nご不明な点がございましたら、お気軽に事務局までお問い合わせください。\n\n──────────────────\n水戸21の会 事務局\n──────────────────",
  template_rejection_subject: "【水戸21の会】入会申込の結果について",
  template_rejection_body: "{{applicant_name}} 様\n\nこの度は水戸21の会への入会をお申込みいただき、誠にありがとうございます。\n\n幹事会にて慎重に審査を行いましたが、誠に恐縮ながら、今回はご期待に添えない結果となりました。\n\nご理解いただけますと幸いです。\nご質問やご不明な点がございましたら、事務局までお問い合わせください。\n\n──────────────────\n水戸21の会 事務局\n──────────────────",
  template_due_reminder_subject: "【水戸21の会】{{fiscal_year}}年度 会費納入のお願い",
  template_due_reminder_body: "{{member_name}} 様\n\n平素より水戸21の会の活動にご協力いただき、誠にありがとうございます。\n\n{{fiscal_year}}年度の{{due_type}}について、まだご入金の確認が取れておりません。\nお手数ではございますが、下記の内容をご確認の上、お早めにお手続きくださいますようお願いいたします。\n\n■ お支払い内容\n会費種別: {{due_type}}\n金額: {{amount}}円\n\nお振込みがお済みの場合は、行き違いとなりますことをお詫び申し上げます。\nご不明な点がございましたら、事務局までお気軽にお問い合わせください。\n\n──────────────────\n水戸21の会 事務局\n──────────────────",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const list = await base44.asServiceRole.entities.AppSettings.list();

    if (list.length > 0) {
      const record = list[0];
      const merged: Record<string, unknown> = { ...record };
      for (const [key, defaultValue] of Object.entries(EMAIL_DEFAULTS)) {
        if (!merged[key]) {
          merged[key] = defaultValue;
        }
      }
      return Response.json({ ok: true, settings: merged });
    }

    const created = await base44.asServiceRole.entities.AppSettings.create({
      ...EMAIL_DEFAULTS,
    });

    return Response.json({ ok: true, settings: created });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
