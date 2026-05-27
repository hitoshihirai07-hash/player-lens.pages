(function () {
  const PASSWORD_HASH = "749b3012961dc742bb980a216671611ebccdae2f0da7ffa63b806b3713dff941";
  const SITE_URL = "https://player-lens-pages.pages.dev/";
  const FILES = [
    { label: "打者成績", path: "./data/2026stats_batter.csv" },
    { label: "投手成績", path: "./data/2026stats_pitcher.csv" },
    { label: "選手マスター", path: "./data/current_player_master.csv" },
    { label: "打者左右成績", path: "./data/2026_batter_left_and_right_stats.csv" },
    { label: "投手左右成績", path: "./data/2026_pitcher_left_and_right_stats.csv" },
  ];

  const D = window.PlayerLensData;
  const els = {
    loginPanel: document.getElementById("loginPanel"),
    adminPanel: document.getElementById("adminPanel"),
    password: document.getElementById("adminPassword"),
    loginButton: document.getElementById("loginButton"),
    loginMessage: document.getElementById("loginMessage"),
    summary: document.getElementById("adminSummary"),
    updateRows: document.getElementById("updateRows"),
    reload: document.getElementById("reloadAdmin"),
    tweetLeague: document.getElementById("tweetLeague"),
    tweetTheme: document.getElementById("tweetTheme"),
    tweetOutput: document.getElementById("tweetOutput"),
    buildTweet: document.getElementById("buildTweet"),
    copyTweet: document.getElementById("copyTweet"),
    copyMessage: document.getElementById("copyMessage"),
    checkList: document.getElementById("checkList"),
    postCandidates: document.getElementById("postCandidates"),
  };

  let loadedData = null;
  let fileReports = [];

  async function sha256(text) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

  async function fetchReport(file) {
    const response = await fetch(file.path, { cache: "no-store" });
    const text = response.ok ? await response.text() : "";
    const rows = text ? parseCsv(text) : [];
    const dates = rows.map((row) => row["更新日"]).filter(Boolean).sort();
    return {
      ...file,
      ok: response.ok,
      rows,
      rowCount: rows.length,
      dataDate: dates.at(-1) || "",
      servedAt: response.headers.get("last-modified") || "",
    };
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ja-JP");
  }

  function rowsForRanking(type, rankingId, league, limit = 3) {
    const ranking = D.RANKINGS.find((item) => item.id === rankingId);
    const rows = type === "pitcher" ? loadedData.pitchers : loadedData.batters;
    return rows
      .filter((row) => league === "all" || row["リーグ"] === league)
      .filter((row) => D.toNumber(row[ranking.minKey]) >= ranking.minValue)
      .filter((row) => !ranking.filter || ranking.filter(row))
      .sort((a, b) => D.toNumber(b[ranking.scoreKey]) - D.toNumber(a[ranking.scoreKey]))
      .slice(0, limit);
  }

  function renderSummary() {
    const qualifiedBatters = loadedData.batters.filter((row) => row["規定打席到達"] === "到達").length;
    const qualifiedPitchers = loadedData.pitchers.filter((row) => row["規定投球回到達"] === "到達").length;
    const latest = fileReports.map((report) => report.dataDate).filter(Boolean).sort().at(-1) || "-";
    const items = [
      ["打者", loadedData.batters.length],
      ["投手", loadedData.pitchers.length],
      ["規定到達", qualifiedBatters + qualifiedPitchers],
      ["最新更新日", latest],
    ];
    els.summary.innerHTML = items.map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value)}</strong></article>`).join("");
  }

  function renderUpdateRows() {
    els.updateRows.innerHTML = fileReports.map((report) => `
      <tr>
        <td>${D.escapeHtml(report.label)}</td>
        <td>${report.ok ? report.rowCount.toLocaleString("ja-JP") : "読込失敗"}</td>
        <td>${D.escapeHtml(report.dataDate || "-")}</td>
        <td>${D.escapeHtml(formatDate(report.servedAt))}</td>
      </tr>
    `).join("");
  }

  function buildTweet() {
    const league = els.tweetLeague.value;
    const leagueText = league === "all" ? "全体" : `${league}・リーグ`;
    const theme = els.tweetTheme.value;
    const map = {
      batter: ["batter", "batter-overall", "打者総合トップ3", "打者総合スコア"],
      pitcher: ["pitcher", "pitcher-overall", "投手総合トップ3", "投手総合スコア"],
      "qualified-batter": ["batter", "batter-qualified", "規定打席到達トップ3", "打者総合スコア"],
      "qualified-pitcher": ["pitcher", "pitcher-qualified", "規定投球回到達トップ3", "投手総合スコア"],
      young: ["batter", "batter-young", "若手打者トップ3", "若手スコア"],
    };
    const [type, rankingId, title, scoreKey] = map[theme];
    const rows = rowsForRanking(type, rankingId, league, 3);
    const lines = rows.map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${D.formatValue(row[scoreKey], "スコア")}`);
    els.tweetOutput.value = [
      `【Player Lens】${leagueText} ${title}`,
      ...lines,
      "",
      "プロ野球2026データランキング",
      SITE_URL,
    ].join("\n");
  }

  async function copyTweet() {
    await navigator.clipboard.writeText(els.tweetOutput.value);
    els.copyMessage.textContent = "コピーしました。";
  }

  function renderChecks() {
    const checks = [];
    const teams = new Set([...loadedData.batters, ...loadedData.pitchers].map((row) => row["チーム"]));
    const noLeague = [...loadedData.batters, ...loadedData.pitchers].filter((row) => !row["リーグ"]).length;
    const missingAge = [...loadedData.batters, ...loadedData.pitchers].filter((row) => row["年齢"] === "").length;
    const failedFiles = fileReports.filter((report) => !report.ok).length;
    const batterQualified = rowsForRanking("batter", "batter-qualified", "all", 999).length;
    const pitcherQualified = rowsForRanking("pitcher", "pitcher-qualified", "all", 999).length;
    const splitRows = loadedData.batters.filter((row) => row["対右打率"] || row["対左打率"]).length + loadedData.pitchers.filter((row) => row["対右被打率"] || row["対左被打率"]).length;

    checks.push(["ファイル読込", failedFiles === 0, failedFiles === 0 ? "全ファイルを読み込めています。" : `${failedFiles}件の読込に失敗しています。`]);
    checks.push(["球団数", teams.size === 12, `${teams.size}球団を認識しています。`]);
    checks.push(["リーグ判定", noLeague === 0, noLeague === 0 ? "全選手にリーグが付いています。" : `${noLeague}件のリーグ未判定があります。`]);
    checks.push(["年齢結合", missingAge === 0, missingAge === 0 ? "選手マスターとの結合に問題はありません。" : `${missingAge}件の年齢未取得があります。`]);
    checks.push(["規定到達", batterQualified > 0 && pitcherQualified > 0, `規定打席 ${batterQualified}人 / 規定投球回 ${pitcherQualified}人`]);
    checks.push(["左右成績", splitRows > 0, `${splitRows}件に左右別データがあります。`]);

    els.checkList.innerHTML = checks.map(([title, ok, message]) => `
      <div class="check-item ${ok ? "is-ok" : "is-warn"}">
        <strong>${D.escapeHtml(title)}</strong>
        <span>${D.escapeHtml(message)}</span>
      </div>
    `).join("");
  }

  function renderCandidates() {
    const candidates = [
      ["打者総合", "batter", "batter-overall", "打者総合スコア"],
      ["投手総合", "pitcher", "pitcher-overall", "投手総合スコア"],
      ["規定打席", "batter", "batter-qualified", "打者総合スコア"],
      ["規定投球回", "pitcher", "pitcher-qualified", "投手総合スコア"],
      ["若手打者", "batter", "batter-young", "若手スコア"],
    ].map(([label, type, rankingId, scoreKey]) => {
      const row = rowsForRanking(type, rankingId, "all", 1)[0];
      if (!row) return "";
      return `<article class="candidate-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(row["選手名"])}</strong><small>${D.escapeHtml(row["チーム"])} / ${D.formatValue(row[scoreKey], "スコア")}</small></article>`;
    }).filter(Boolean);
    els.postCandidates.innerHTML = candidates.join("");
  }

  async function loadAdmin() {
    els.updateRows.innerHTML = `<tr><td colspan="4">読込中</td></tr>`;
    [loadedData, fileReports] = await Promise.all([
      D.loadData(),
      Promise.all(FILES.map(fetchReport)),
    ]);
    renderSummary();
    renderUpdateRows();
    renderChecks();
    renderCandidates();
    buildTweet();
  }

  async function login() {
    const hash = await sha256(els.password.value);
    if (hash !== PASSWORD_HASH) {
      els.loginMessage.textContent = "パスワードが違います。";
      return;
    }
    sessionStorage.setItem("playerLensAdmin", "1");
    els.loginPanel.hidden = true;
    els.adminPanel.hidden = false;
    await loadAdmin();
  }

  els.loginButton.addEventListener("click", login);
  els.password.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  els.reload.addEventListener("click", loadAdmin);
  els.buildTweet.addEventListener("click", buildTweet);
  els.copyTweet.addEventListener("click", copyTweet);
  els.tweetLeague.addEventListener("change", buildTweet);
  els.tweetTheme.addEventListener("change", buildTweet);

  if (sessionStorage.getItem("playerLensAdmin") === "1") {
    els.loginPanel.hidden = true;
    els.adminPanel.hidden = false;
    loadAdmin();
  }
})();
