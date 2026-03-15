/** Default email templates used when AppSettings has no custom value. */

export const EMAIL_DEFAULTS = {
  sender_name: "水戸２１の会 事務局",

  // 入会申込受付 (applicant)
  template_application_receipt_subject: "受付完了",
  template_application_receipt_body:
`{{member_name}} 様

入会申込ありがとうございました。
申込は受け付け済みです。
審査後にご連絡します。`,

  // 管理者通知
  template_admin_notification_subject: "新規入会申込あり",
  template_admin_notification_body:
`新規の入会申込を受け付けました。

氏名（漢字）: {{member_name}}
氏名（ふりがな）: {{member_name_kana}}
生年月日: {{birthday}}
会社名: {{company_name}}
メールアドレス: {{email}}
携帯番号: {{phone}}
紹介者名1: {{referrer_1}}
紹介者名2: {{referrer_2}}`,

  // 承認
  template_approval_subject: "【水戸２１の会】入会承認のお知らせ（会員番号: {{member_number}}）",
  template_approval_body:
`{{member_name}} 様

水戸２１の会への入会が承認されました。

■ 会員情報
  会員番号: {{member_number}}
  会員種別: {{member_type}}

■ ご案内
  会員専用ページから名簿の閲覧やマイページの編集が行えます。
  ログイン方法については別途ご案内いたします。

今後ともよろしくお願いいたします。

水戸２１の会 事務局`,

  // 却下
  template_rejection_subject: "【水戸２１の会】入会申込の審査結果について",
  template_rejection_body:
`{{member_name}} 様

この度は水戸２１の会への入会申込をいただき、誠にありがとうございました。

審査の結果、誠に残念ながら今回はご入会をお見送りとさせていただきました。

■ 理由
{{rejection_reason}}

ご不明な点がございましたら、事務局までお問い合わせください。

水戸２１の会 事務局`,

  // 会費リマインダー
  template_due_reminder_subject: "【水戸２１の会】{{fiscal_year}}年度 会費納入のお願い",
  template_due_reminder_body:
`{{member_name}} 様

{{fiscal_year}}年度の会費（{{amount}}円）が未納となっております。
お早めのお振込みをお願いいたします。

水戸２１の会 事務局`,
};

/** Replace {{var}} placeholders with values from vars object. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
