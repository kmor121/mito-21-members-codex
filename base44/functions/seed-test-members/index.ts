import { createClientFromRequest } from "npm:@base44/sdk";

const TEST_MEMBERS = [
  {
    // 1. 正会員 — 佐藤健一
    last_name: "佐藤", first_name: "健一",
    last_name_kana: "サトウ", first_name_kana: "ケンイチ",
    birthday: "1975-04-15",
    email: "sato.kenichi@example.com",
    mobile_phone: "090-1111-2001",
    show_email_in_directory: true,
    show_mobile_in_directory: true,
    show_company_in_directory: true,
    company_name: "佐藤建設株式会社",
    company_position: "代表取締役",
    industry: "建設業",
    company_postal_code: "310-0011",
    company_address: "茨城県水戸市三の丸1-5-18 三の丸ビル3F",
    company_phone: "029-221-0001",
    company_fax: "029-221-0002",
    company_pr: "水戸市を中心に住宅・商業施設の設計施工を手掛けています。地域密着型の建設会社です。",
    home_postal_code: "310-0852",
    home_address: "茨城県水戸市笠原町1200-5",
    home_phone: "029-301-0001",
    home_fax: "029-301-0002",
    hobbies: "ゴルフ、読書、地元のお祭り参加",
    referrer_1: "田中 裕子",
    referrer_2: "鈴木 美咲",
    member_number: "26001",
    member_type: "正会員",
    join_date: "2020-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "",
  },
  {
    // 2. 正会員 — 鈴木美咲
    last_name: "鈴木", first_name: "美咲",
    last_name_kana: "スズキ", first_name_kana: "ミサキ",
    birthday: "1980-08-22",
    email: "suzuki.misaki@example.com",
    mobile_phone: "090-1111-2002",
    show_email_in_directory: true,
    show_mobile_in_directory: false,
    show_company_in_directory: true,
    company_name: "鈴木法律事務所",
    company_position: "弁護士",
    industry: "法律・士業",
    company_postal_code: "310-0021",
    company_address: "茨城県水戸市南町2-3-10 南町法務センター5F",
    company_phone: "029-222-0003",
    company_fax: "029-222-0004",
    company_pr: "企業法務・民事全般を取り扱う法律事務所。中小企業の顧問弁護士として地域経済を支えています。",
    home_postal_code: "310-0903",
    home_address: "茨城県水戸市堀町560-12",
    home_phone: "029-302-0003",
    home_fax: "029-302-0004",
    hobbies: "テニス、海外旅行、ワインテイスティング",
    referrer_1: "佐藤 健一",
    referrer_2: "高橋 大輔",
    member_number: "26002",
    member_type: "正会員",
    join_date: "2019-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "",
  },
  {
    // 3. 正会員 — 高橋大輔
    last_name: "高橋", first_name: "大輔",
    last_name_kana: "タカハシ", first_name_kana: "ダイスケ",
    birthday: "1978-01-10",
    email: "takahashi.daisuke@example.com",
    mobile_phone: "090-1111-2003",
    show_email_in_directory: true,
    show_mobile_in_directory: true,
    show_company_in_directory: true,
    company_name: "株式会社タカハシ商事",
    company_position: "常務取締役",
    industry: "卸売・商社",
    company_postal_code: "310-0031",
    company_address: "茨城県水戸市大工町1-2-3 大工町センタービル2F",
    company_phone: "029-223-0005",
    company_fax: "029-223-0006",
    company_pr: "食品・日用品の卸売を中心に茨城県内のスーパー・小売店に供給。創業50年の実績があります。",
    home_postal_code: "310-0851",
    home_address: "茨城県水戸市千波町2500-8",
    home_phone: "029-303-0005",
    home_fax: "029-303-0006",
    hobbies: "釣り、マラソン、日本酒収集",
    referrer_1: "佐藤 健一",
    referrer_2: "田中 裕子",
    member_number: "26003",
    member_type: "正会員",
    join_date: "2018-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "",
  },
  {
    // 4. 正会員 — 田中裕子（新入会員）
    last_name: "田中", first_name: "裕子",
    last_name_kana: "タナカ", first_name_kana: "ユウコ",
    birthday: "1982-11-03",
    email: "tanaka.yuko@example.com",
    mobile_phone: "090-1111-2004",
    show_email_in_directory: false,
    show_mobile_in_directory: true,
    show_company_in_directory: true,
    company_name: "田中税理士事務所",
    company_position: "税理士",
    industry: "会計・税務",
    company_postal_code: "310-0041",
    company_address: "茨城県水戸市上水戸4-6-20 水戸駅前プラザ7F",
    company_phone: "029-224-0007",
    company_fax: "029-224-0008",
    company_pr: "個人事業主・中小企業向けの記帳代行、確定申告、経営相談を行っています。",
    home_postal_code: "310-0913",
    home_address: "茨城県水戸市見川町2131-15",
    home_phone: "029-304-0007",
    home_fax: "029-304-0008",
    hobbies: "読書、ヨガ、家庭菜園",
    referrer_1: "高橋 大輔",
    referrer_2: "伊藤 翔太",
    member_number: "26004",
    member_type: "正会員",
    join_date: "2025-04-01",
    is_new: true,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "2025年度新入会員。税務関連のセミナー講師候補。",
  },
  {
    // 5. 正会員 — 伊藤翔太（新入会員）
    last_name: "伊藤", first_name: "翔太",
    last_name_kana: "イトウ", first_name_kana: "ショウタ",
    birthday: "1985-06-28",
    email: "ito.shota@example.com",
    mobile_phone: "090-1111-2005",
    show_email_in_directory: true,
    show_mobile_in_directory: true,
    show_company_in_directory: false,
    company_name: "伊藤不動産株式会社",
    company_position: "取締役営業部長",
    industry: "不動産業",
    company_postal_code: "310-0055",
    company_address: "茨城県水戸市東原3-8-15 東原ビジネスパーク1F",
    company_phone: "029-225-0009",
    company_fax: "029-225-0010",
    company_pr: "水戸市・ひたちなか市エリアの住宅用地・投資用物件の売買仲介を専門としています。",
    home_postal_code: "310-0836",
    home_address: "茨城県水戸市元吉田町330-22",
    home_phone: "029-305-0009",
    home_fax: "029-305-0010",
    hobbies: "サッカー、映画鑑賞、キャンプ",
    referrer_1: "田中 裕子",
    referrer_2: "佐藤 健一",
    member_number: "26005",
    member_type: "正会員",
    join_date: "2025-04-01",
    is_new: true,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "2025年度新入会員。サッカーチーム主催のイベント企画に興味あり。",
  },
  {
    // 6. 正会員 — 小林直樹
    last_name: "小林", first_name: "直樹",
    last_name_kana: "コバヤシ", first_name_kana: "ナオキ",
    birthday: "1977-07-14",
    email: "kobayashi.naoki@example.com",
    mobile_phone: "090-1111-2006",
    show_email_in_directory: true,
    show_mobile_in_directory: true,
    show_company_in_directory: true,
    company_name: "小林精密工業株式会社",
    company_position: "専務取締役",
    industry: "精密機械製造",
    company_postal_code: "310-0843",
    company_address: "茨城県水戸市酒門町4250-3",
    company_phone: "029-226-0011",
    company_fax: "029-226-0012",
    company_pr: "自動車部品・医療機器部品の精密加工を手掛けるBtoB製造業。ISO9001取得済。",
    home_postal_code: "310-0841",
    home_address: "茨城県水戸市酒門町3600-18",
    home_phone: "029-306-0011",
    home_fax: "029-306-0012",
    hobbies: "登山、料理、クラフトビール醸造",
    referrer_1: "佐藤 健一",
    referrer_2: "田中 裕子",
    member_number: "26006",
    member_type: "正会員",
    join_date: "2017-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "",
  },
  {
    // 7. 賛助会員 — 渡辺正明
    last_name: "渡辺", first_name: "正明",
    last_name_kana: "ワタナベ", first_name_kana: "マサアキ",
    birthday: "1968-03-17",
    email: "watanabe.masaaki@example.com",
    mobile_phone: "090-1111-2007",
    show_email_in_directory: true,
    show_mobile_in_directory: false,
    show_company_in_directory: true,
    company_name: "渡辺印刷株式会社",
    company_position: "代表取締役社長",
    industry: "印刷・出版",
    company_postal_code: "310-0063",
    company_address: "茨城県水戸市五軒町1-3-27",
    company_phone: "029-227-0013",
    company_fax: "029-227-0014",
    company_pr: "チラシ・パンフレット・名刺など各種印刷物のデザインから納品まで一貫対応。地域イベントのポスター制作実績多数。",
    home_postal_code: "310-0905",
    home_address: "茨城県水戸市石川1-4080-15",
    home_phone: "029-307-0013",
    home_fax: "029-307-0014",
    hobbies: "盆栽、将棋、地酒めぐり",
    referrer_1: "鈴木 美咲",
    referrer_2: "高橋 大輔",
    member_number: "26007",
    member_type: "賛助会員",
    join_date: "2021-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "会報誌の印刷を毎年担当。",
  },
  {
    // 8. 賛助会員 — 山本真理
    last_name: "山本", first_name: "真理",
    last_name_kana: "ヤマモト", first_name_kana: "マリ",
    birthday: "1990-09-05",
    email: "yamamoto.mari@example.com",
    mobile_phone: "090-1111-2008",
    show_email_in_directory: false,
    show_mobile_in_directory: false,
    show_company_in_directory: true,
    company_name: "山本デザインオフィス",
    company_position: "代表・グラフィックデザイナー",
    industry: "デザイン・クリエイティブ",
    company_postal_code: "310-0803",
    company_address: "茨城県水戸市城南2-7-36 城南テラス201",
    company_phone: "029-228-0015",
    company_fax: "029-228-0016",
    company_pr: "ロゴ・ブランディング・Webデザインを中心に、茨城県内の企業のビジュアルコミュニケーションを支援。",
    home_postal_code: "310-0804",
    home_address: "茨城県水戸市白梅3-1-12",
    home_phone: "029-308-0015",
    home_fax: "",
    hobbies: "絵画、カフェ巡り、写真撮影",
    referrer_1: "田中 裕子",
    referrer_2: "高橋 大輔",
    member_number: "26008",
    member_type: "賛助会員",
    join_date: "2022-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "",
  },
  {
    // 9. OB会員 — 中村孝之（休会・卒業生）
    last_name: "中村", first_name: "孝之",
    last_name_kana: "ナカムラ", first_name_kana: "タカユキ",
    birthday: "1963-12-20",
    email: "nakamura.takayuki@example.com",
    mobile_phone: "090-1111-2009",
    show_email_in_directory: true,
    show_mobile_in_directory: true,
    show_company_in_directory: true,
    company_name: "中村電機株式会社",
    company_position: "相談役",
    industry: "電気設備工事",
    company_postal_code: "310-0852",
    company_address: "茨城県水戸市笠原町600-38",
    company_phone: "029-229-0017",
    company_fax: "029-229-0018",
    company_pr: "公共施設・商業ビルの電気設備工事を中心に50年の実績。省エネ改修にも注力。",
    home_postal_code: "310-0851",
    home_address: "茨城県水戸市千波町1800-33",
    home_phone: "029-309-0017",
    home_fax: "029-309-0018",
    hobbies: "囲碁、庭園散策、温泉旅行",
    referrer_1: "伊藤 翔太",
    referrer_2: "渡辺 正明",
    member_number: "26009",
    member_type: "OB会員",
    join_date: "2010-04-01",
    is_new: false,
    is_graduate: true,
    status: "休会",
    app_role: "member",
    notes: "2023年度に卒業（55歳到達）。OB会員として在籍中。",
  },
  {
    // 10. 名誉顧問 — 加藤恵美
    last_name: "加藤", first_name: "恵美",
    last_name_kana: "カトウ", first_name_kana: "エミ",
    birthday: "1958-02-08",
    email: "kato.emi@example.com",
    mobile_phone: "090-1111-2010",
    show_email_in_directory: false,
    show_mobile_in_directory: false,
    show_company_in_directory: true,
    company_name: "加藤総合研究所",
    company_position: "所長",
    industry: "経営コンサルティング",
    company_postal_code: "310-0015",
    company_address: "茨城県水戸市宮町1-7-44 駅北ビジネスタワー10F",
    company_phone: "029-230-0019",
    company_fax: "029-230-0020",
    company_pr: "地方創生・中小企業の経営改善コンサルティングを専門とするシンクタンク。自治体との共同調査実績多数。",
    home_postal_code: "310-0062",
    home_address: "茨城県水戸市大町2-10-5",
    home_phone: "029-310-0019",
    home_fax: "029-310-0020",
    hobbies: "茶道、書道、俳句",
    referrer_1: "渡辺 正明",
    referrer_2: "鈴木 美咲",
    member_number: "26010",
    member_type: "名誉顧問",
    join_date: "2015-04-01",
    is_new: false,
    is_graduate: false,
    status: "活動中",
    app_role: "member",
    notes: "長年の功績により名誉顧問に就任。年次総会でのご挨拶を毎年お願いしている。",
  },
];

// Organization assignments to create after member seeding
const ORG_ASSIGNMENTS: Record<string, { org_name: string; role: string }> = {
  "sato.kenichi@example.com": { org_name: "幹事会", role: "会長" },
  "suzuki.misaki@example.com": { org_name: "幹事会", role: "副会長" },
  "takahashi.daisuke@example.com": { org_name: "拡大・交流室", role: "室長" },
  "tanaka.yuko@example.com": { org_name: "拡大・交流室", role: "委員" },
  "ito.shota@example.com": { org_name: "まちづくり室", role: "室長" },
  "kobayashi.naoki@example.com": { org_name: "総務室", role: "室長" },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Parse options
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body is fine */ }
    const cleanOrphans = body?.clean_orphans === true;

    const created: string[] = [];
    const skipped: string[] = [];
    const memberIdByEmail: Record<string, string> = {};

    // --- Step 1: Create test members ---
    for (const m of TEST_MEMBERS) {
      const existing = await svc.entities.Member.filter({ email: m.email });
      if (existing.length > 0) {
        skipped.push(`${m.last_name} ${m.first_name} (already exists)`);
        memberIdByEmail[m.email] = existing[0].id;
        continue;
      }

      const member = await svc.entities.Member.create({
        ...m,
        approval_status: "承認済",
        applied_at: new Date().toISOString(),
        role: "member",
      });

      created.push(`${m.last_name} ${m.first_name}`);
      memberIdByEmail[m.email] = member.id;
    }

    // --- Step 2: Create org assignments for current fiscal year ---
    const assignmentsCreated: string[] = [];

    const fiscalYears = await svc.entities.FiscalYear.list();
    const currentFY = fiscalYears.find((fy: any) => fy.is_current === true);

    if (currentFY) {
      const orgs = await svc.entities.Organization.list();
      const orgByName: Record<string, string> = {};
      for (const o of orgs) {
        orgByName[o.org_name] = o.id;
      }

      for (const [email, assignment] of Object.entries(ORG_ASSIGNMENTS)) {
        const memberId = memberIdByEmail[email];
        const orgId = orgByName[assignment.org_name];

        if (!memberId || !orgId) continue;

        // Check if assignment already exists
        const existingAssigns = await svc.entities.OrgAssignment.filter({
          fiscal_year_id: currentFY.id,
          organization_id: orgId,
          member_id: memberId,
        });
        if (existingAssigns.length > 0) continue;

        await svc.entities.OrgAssignment.create({
          fiscal_year_id: currentFY.id,
          organization_id: orgId,
          member_id: memberId,
          role: assignment.role,
          sort_order: 0,
        });

        const memberName = TEST_MEMBERS.find((m) => m.email === email);
        assignmentsCreated.push(
          `${memberName?.last_name} ${memberName?.first_name} → ${assignment.org_name} (${assignment.role})`
        );
      }
    }

    // --- Step 3: Clean orphaned records (optional) ---
    let orphansDeleted = 0;
    if (cleanOrphans) {
      const allAssignments = await svc.entities.OrgAssignment.list();
      const allDues = await svc.entities.Due.list();
      const allLogs = await svc.entities.MemberChangeLog.list();
      const allMembers = await svc.entities.Member.list();
      const memberIds = new Set(allMembers.map((m: any) => m.id));

      for (const a of allAssignments) {
        if (a.member_id && !memberIds.has(a.member_id)) {
          await svc.entities.OrgAssignment.delete(a.id);
          orphansDeleted++;
        }
      }
      for (const d of allDues) {
        if (d.member_id && !memberIds.has(d.member_id)) {
          await svc.entities.Due.delete(d.id);
          orphansDeleted++;
        }
      }
      for (const l of allLogs) {
        if (l.member_id && !memberIds.has(l.member_id)) {
          await svc.entities.MemberChangeLog.delete(l.id);
          orphansDeleted++;
        }
      }
    }

    return Response.json({
      ok: true,
      members: { created_count: created.length, skipped_count: skipped.length, created, skipped },
      assignments: { created_count: assignmentsCreated.length, details: assignmentsCreated },
      orphans_deleted: orphansDeleted,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
});
