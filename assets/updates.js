(async function () {
  const files = [
    { label: "打者成績", path: "./data/2026stats_batter.csv" },
    { label: "投手成績", path: "./data/2026stats_pitcher.csv" },
    { label: "選手マスター", path: "./data/current_player_master.csv" },
    { label: "打者左右成績", path: "./data/2026_batter_left_and_right_stats.csv" },
    { label: "投手左右成績", path: "./data/2026_pitcher_left_and_right_stats.csv" },
    { label: "新人王候補", path: "./data/rookie_candidates.csv" },
    { label: "スタメン守備位置", path: "./data/starter_positions.csv" },
    { label: "直近6日野手", path: "./data/recent_batter_6days.csv" },
    { label: "直近6日投手", path: "./data/recent_pitcher_6days.csv" },
    { label: "守備成績", path: "./data/fielding_summary.csv" },
    { label: "交流戦野手", path: "./data/interleague_batters.csv" },
    { label: "交流戦投手", path: "./data/interleague_pitchers.csv" },
    { label: "対球団別野手成績", path: "./data/team_stats_batter.csv" },
    { label: "対球団別投手成績", path: "./data/team_stats_pitcher.csv" },
    { label: "選手登録状況", path: "./data/registration_history.csv" },
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

  function formatServedAt(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ja-JP");
  }

  async function report(file) {
    const response = await fetch(file.path, { cache: "no-store" });
    if (!response.ok) return { ...file, ok: false, rowCount: 0, dataDate: "", servedAt: "" };
    const rows = parseCsv(await response.text());
    const dates = rows.map((row) => row["更新日"]).filter(Boolean).sort();
    return {
      ...file,
      ok: true,
      rowCount: rows.length,
      dataDate: dates.at(-1) || "",
      servedAt: response.headers.get("last-modified") || "",
    };
  }

  try {
    const reports = await Promise.all(files.map(report));
    const latestDataDate = reports.map((item) => item.dataDate).filter(Boolean).sort().at(-1) || "-";
    const totalRows = reports.reduce((sum, item) => sum + item.rowCount, 0);
    const failed = reports.filter((item) => !item.ok).length;

    summaryEl.innerHTML = [
      ["総件数", totalRows.toLocaleString("ja-JP")],
      ["データ項目", reports.length],
      ["最新更新日", latestDataDate],
      ["読込状況", failed === 0 ? "正常" : `${failed}件確認必要`],
    ].map(([label, value]) => `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

    rowsEl.innerHTML = reports.map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${item.ok ? item.rowCount.toLocaleString("ja-JP") : "読込失敗"}</td>
        <td>${escapeHtml(item.dataDate || "-")}</td>
        <td>${escapeHtml(formatServedAt(item.servedAt))}</td>
      </tr>
    `).join("");
  } catch (error) {
    rowsEl.innerHTML = `<tr><td colspan="4">データを読み込めませんでした。</td></tr>`;
  }
})();
