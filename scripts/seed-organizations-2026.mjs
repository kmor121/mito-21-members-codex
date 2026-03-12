/**
 * Seed 2026 fiscal year organization structure.
 * Uses the save-organization backend function endpoint.
 */

const BASE = "https://mito21-members.base44.app/functions/save-organization";
const FISCAL_YEAR_ID = "69ad9fe5b0935cc7d41a8337"; // 2026年度

async function createOrg({ org_name, org_type, parent_id, sort_order }) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fiscal_year_id: FISCAL_YEAR_ID,
      org_name,
      org_type,
      parent_id: parent_id || "",
      sort_order: sort_order ?? 0,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Failed to create "${org_name}": ${data.error}`);
  console.log(`  Created: ${org_name} (${org_type}) → id=${data.organization.id}`);
  return data.organization.id;
}

async function main() {
  console.log("=== 2026年度 組織構造の作成 ===\n");

  // Layer 1: Root
  console.log("[Layer 1] ルート");
  const soukai = await createOrg({ org_name: "総会", org_type: "その他", sort_order: 1 });

  // Layer 2: Under 総会
  console.log("\n[Layer 2] 総会の下");
  const meiyoKomon = await createOrg({ org_name: "名誉顧問", org_type: "その他", parent_id: soukai, sort_order: 1 });
  const kanji = await createOrg({ org_name: "監事", org_type: "その他", parent_id: soukai, sort_order: 2 });
  const kanjikai = await createOrg({ org_name: "幹事会", org_type: "幹事会", parent_id: soukai, sort_order: 3 });

  // Layer 3: Under 幹事会
  console.log("\n[Layer 3] 幹事会の下");
  const jimukyoku = await createOrg({ org_name: "事務局", org_type: "その他", parent_id: kanjikai, sort_order: 1 });
  const kakudaiKouryu = await createOrg({ org_name: "拡大・交流室", org_type: "部会", parent_id: kanjikai, sort_order: 2 });
  const machizukuri = await createOrg({ org_name: "まちづくり室", org_type: "部会", parent_id: kanjikai, sort_order: 3 });
  const soumu = await createOrg({ org_name: "総務室", org_type: "部会", parent_id: kanjikai, sort_order: 4 });

  // Layer 4: Committees under rooms
  console.log("\n[Layer 4] 各室の下の委員会");
  await createOrg({ org_name: "会員拡大・年末委員会", org_type: "委員会", parent_id: kakudaiKouryu, sort_order: 1 });
  await createOrg({ org_name: "会員交流委員会", org_type: "委員会", parent_id: kakudaiKouryu, sort_order: 2 });
  await createOrg({ org_name: "スポーツ交流推進委員会", org_type: "委員会", parent_id: machizukuri, sort_order: 3 });
  await createOrg({ org_name: "タウンプロジェクト委員会", org_type: "委員会", parent_id: machizukuri, sort_order: 4 });
  await createOrg({ org_name: "総務DX委員会", org_type: "委員会", parent_id: soumu, sort_order: 5 });

  console.log("\n=== 完了: 全13組織を作成しました ===");
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
