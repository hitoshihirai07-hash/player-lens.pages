(async function () {
  // The page reports source dates rather than HTTP Last-Modified timestamps,
  // which can change without any change in the underlying data.
  const files = [
    { label: "入退団情報", path: "./data/npb_transactions_2026.csv", status: "オフシーズン更新中", active: true },
    { label: "最終順位・対戦成績", path: "./data/npb_standings.csv", status: "シーズン終了" },
    { label: "ペナントレース", path: "./data/pennant_race_status.csv", dateField: "更新基準日", status: "シーズン終了" },
    { label: "ファーム野手成績", path: "./data/farm/farm_batter_stats_2026.csv", dateField: "最終出場日", status: "最終成績" },
    { label: "ファーム投手成績", path: "./data/farm/farm_pitcher_stats_2026.csv", dateField: "最終登板日", status: "最終成績" },
    { label: "ファーム地区別順位", path: "./data/farm/farm_standings_2026.csv", dateField: null, status: "最終順位" },
    { label: "日本代表・国際大会", path: "./data/national-team/japan_national_team.csv", dateField: null, status: "掲載中" },
    { label: "ドラフト指名結果（2026年）", path: "./data/draft/2026.csv", dateField: null, status: "掲載中" },
    { label: "ドラフト候補情報", path: "./data/draft_candidates_2026.csv", dateField: "latest_info_date", status: "掲載中" },
    { label: "打者成績", path: "./data/2026stats_batter.csv", status: "シーズン終了" },
    { label: "投手成績", path: "./data/2026stats_pitcher.csv", status: "シーズン終了" },
    { label: "選手マスター", path: "./data/current_player_master.csv", status: "2026年データ" },
    { label: "打者左右成績", path: "./data/2026_batter_left_and_right_stats.csv", status: "シーズン終了" },
    { label: "投手左右成績", path: "./data/2026_pitcher_left_and_right_stats.csv", status: "シーズン終了" },
    { label: "新人王候補", path: "./data/rookie_candidates.csv", status: "2026年データ" },
    { label: "守備位置別出場数", path: "./data/starter_positions.csv", status: "シーズン終了" },
    { label: "直近6試合野手", path: "./data/recent_batter_6days.csv", status: "シーズン終了" },
    { label: "野手1試合成績", path: "./data/batter_game_result.csv", dateField: "試合日", status: "シーズン終了" },
    { label: "直近6試合盗塁", path: "./data/recent_steal_6days.csv", status: "シーズン終了" },
    { label: "直近6試合投手", path: "./data/recent_pitcher_6days.csv", status: "シーズン終了" },
    { label: "守備成績", path: "./data/fielding_summary.csv", status: "シーズン終了" },
    { label: "交流戦野手", path: "./data/interleague_batters.csv", status: "シーズン終了" },
    { label: "交流戦投手", path: "./data/interleague_pitchers.csv", status: "シーズン終了" },
    { label: "対球団別野手成績", path: "./data/team_stats_batter.csv", status: "シーズン終了" },
    { label: "対球団別投手成績", path: "./data/team_stats_pitcher.csv", status: "シーズン終了" },
    { label: "選手登録状況", path: "./data/registration_history.csv", status: "2026年データ" },
    { label: "先発投手別成績", path: "./data/starter_pitcher_summary.csv", status: "シーズン終了" },
    { label: "先発バッテリー別成績", path: "./data/starter_battery_summary.csv", status: "シーズン終了" },
    { label: "先発バッテリー試合履歴", path: "./data/starter_game_results.csv", status: "シーズン終了" },
    { label: "投手登板履歴", path: "./data/pitcher_daily_results.csv", dateField: "試合日", status: "シーズン終了" },
  ];

  const rowsEl = document.getElementById("updateRows");
  const summaryEl = document.getElementById("updateSummary");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    const input = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    const headers = rows.shift() || [];
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  // Match only complete, valid date values. A game's date is not a publication timestamp.
  function sortableDate(value) {
    const found = String(value ?? "").trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (!found) return "";
    const [, year, month, day] = found;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return "";
    return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
  }

  async function report(file) {
    try {
      const response = await fetch(file.path, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = parseCsv(await response.text());
      const dateField = file.dateField === undefined ? "更新日" : file.dateField;
      const dataDate = dateField ? rows.map((row) => sortableDate(row[dateField])).filter(Boolean).sort().at(-1) || "" : "";
      return { ...file, ok: true, rowCount: rows.length, dataDate };
    } catch (error) {
      console.warn(`データ更新状況を確認できませんでした: ${file.label}`, error);
      return { ...file, ok: false, rowCount: 0, dataDate: "" };
    }
  }

  try {
    const reports = await Promise.all(files.map(report));
    const totalRows = reports.reduce((sum, item) => sum + item.rowCount, 0);
    const failed = reports.filter((item) => !item.ok).length;
    const active = reports.find((item) => item.active);
    summaryEl.innerHTML = [
      ["掲載件数（延べ）", totalRows.toLocaleString("ja-JP")],
      ["データ項目", reports.length],
      ["入退団情報の更新日", active?.ok ? active.dataDate || "―" : "確認必要"],
      ["読込状況", failed === 0 ? "正常" : `${failed}件確認必要`],
    ].map(([label, value]) => `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

    rowsEl.innerHTML = reports.map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${item.ok ? item.rowCount.toLocaleString("ja-JP") : "読込失敗"}</td>
        <td>${escapeHtml(item.ok ? item.dataDate || "―" : "―")}</td>
        <td>${escapeHtml(item.ok ? item.status : "確認必要")}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error("データ更新状況の表示に失敗しました", error);
    rowsEl.innerHTML = `<tr><td colspan="4">データを読み込めませんでした。</td></tr>`;
    summaryEl.innerHTML = "";
  }
})();
