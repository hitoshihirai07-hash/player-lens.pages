(function () {
  const PASSWORD_HASH = "749b3012961dc742bb980a216671611ebccdae2f0da7ffa63b806b3713dff941";
  const SITE_URL = "https://player-lens-pages.pages.dev/";
  const FILES = [
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
  ];
  const SITE_CHECK_PAGES = [
    ["トップ", "./index.html", "https://player-lens-pages.pages.dev/"],
    ["チーム別", "./teams.html", "https://player-lens-pages.pages.dev/teams"],
    ["注目データ", "./insights.html", "https://player-lens-pages.pages.dev/insights"],
    ["守備", "./defense.html", "https://player-lens-pages.pages.dev/defense"],
    ["交流戦", "./interleague.html", "https://player-lens-pages.pages.dev/interleague"],
    ["対球団別相性", "./opponent-watch.html", "https://player-lens-pages.pages.dev/opponent-watch"],
    ["読み物", "./articles.html", "https://player-lens-pages.pages.dev/articles"],
    ["見方", "./guide.html", "https://player-lens-pages.pages.dev/guide"],
    ["基礎知識", "./stats-basics.html", "https://player-lens-pages.pages.dev/stats-basics"],
    ["更新履歴", "./updates.html", "https://player-lens-pages.pages.dev/updates"],
    ["楽しみ方", "./resources.html", "https://player-lens-pages.pages.dev/resources"],
    ["このサイトについて", "./about.html", "https://player-lens-pages.pages.dev/about"],
    ["プライバシー", "./privacy.html", "https://player-lens-pages.pages.dev/privacy"],
    ["免責事項", "./disclaimer.html", "https://player-lens-pages.pages.dev/disclaimer"],
    ["お問い合わせ", "./contact.html", "https://player-lens-pages.pages.dev/contact"],
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
    tweetTeam: document.getElementById("tweetTeam"),
    tweetTheme: document.getElementById("tweetTheme"),
    tweetOutput: document.getElementById("tweetOutput"),
    buildTweet: document.getElementById("buildTweet"),
    copyTweet: document.getElementById("copyTweet"),
    copyMessage: document.getElementById("copyMessage"),
    checkList: document.getElementById("checkList"),
    monetizationChecks: document.getElementById("monetizationChecks"),
    postCandidates: document.getElementById("postCandidates"),
  };

  let loadedData = null;
  let loadedInsight = null;
  let loadedFielding = [];
  let loadedInterleague = { batters: [], pitchers: [] };
  let fileReports = [];
  let batterMap = new Map();
  let pitcherMap = new Map();

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

  async function fetchText(path) {
    const response = await fetch(path, { cache: "no-store" });
    return { ok: response.ok, text: response.ok ? await response.text() : "" };
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ja-JP");
  }

  function inTweetScope(row, league, team = "all") {
    return (league === "all" || row["リーグ"] === league) && (team === "all" || row["チーム"] === team);
  }

  function teamPageUrl(team) {
    const slug = D.TEAM_SLUGS[team];
    return slug ? `${SITE_URL}teams/${slug}` : `${SITE_URL}team.html?team=${encodeURIComponent(team)}`;
  }

  function scopedPageUrl(page, team = "all") {
    if (team === "all") return `${SITE_URL}${page}`;
    return `${SITE_URL}${page}?team=${encodeURIComponent(team)}`;
  }

  function rowsForRanking(type, rankingId, league, limit = 5, team = "all") {
    const ranking = D.RANKINGS.find((item) => item.id === rankingId);
    const rows = type === "pitcher" ? loadedData.pitchers : loadedData.batters;
    return rows
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => D.toNumber(row[ranking.minKey]) >= ranking.minValue)
      .filter((row) => !ranking.filter || ranking.filter(row))
      .sort((a, b) => D.toNumber(b[ranking.scoreKey]) - D.toNumber(a[ranking.scoreKey]))
      .slice(0, limit);
  }

  function rowType(row) {
    return row["ポジション"] === "投手" ? "pitcher" : "batter";
  }

  function seasonRow(row, type = rowType(row)) {
    return type === "pitcher" ? pitcherMap.get(D.playerKey(row)) : batterMap.get(D.playerKey(row));
  }

  function scoreKey(type) {
    return type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
  }

  function rowsForRecent(type, league, limit = 5, team = "all") {
    const rows = type === "pitcher" ? loadedInsight.recentPitchers : loadedInsight.recentBatters;
    return rows
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => type === "pitcher" ? D.toNumber(row["投球アウト数"]) >= 3 : D.toNumber(row["打数"]) >= 4)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))
      .slice(0, limit);
  }

  function rowsForRookies(type, league, limit = 5, team = "all") {
    return loadedInsight.rookies
      .filter((row) => rowType(row) === type)
      .filter((row) => inTweetScope(row, league, team))
      .map((row) => ({ row, season: seasonRow(row, type) }))
      .filter((item) => item.season)
      .sort((a, b) => D.toNumber(b.season[scoreKey(type)]) - D.toNumber(a.season[scoreKey(type)]))
      .slice(0, limit);
  }

  function rowsForFielding(league, limit = 5, team = "all") {
    return loadedFielding
      .filter((row) => inTweetScope(row, league, team))
      .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))
      .slice(0, limit);
  }

  function rowsForInterleague(type, league, limit = 5, team = "all") {
    const rows = type === "pitcher" ? loadedInterleague.pitchers : loadedInterleague.batters;
    return rows
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => type === "pitcher" ? D.toNumber(row["投球アウト数"]) >= 6 : D.toNumber(row["打数"]) >= 8)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))
      .slice(0, limit);
  }

  function rowsForCaughtStealing(league, limit = 5, team = "all") {
    return loadedFielding
      .filter((row) => row["ポジション"] === "捕手" && row["盗塁阻止率"] !== "")
      .filter((row) => inTweetScope(row, league, team))
      .sort((a, b) => D.toNumber(b["盗塁阻止率"]) - D.toNumber(a["盗塁阻止率"]) || D.toNumber(b["試合"]) - D.toNumber(a["試合"]))
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
      ["守備記録", loadedFielding.length],
      ["交流戦対象", rowsForInterleague("batter", "all", 999).length + rowsForInterleague("pitcher", "all", 999).length],
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

  function renderTweetTeams() {
    const league = els.tweetLeague.value;
    const current = els.tweetTeam.value;
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => league === "all" || D.leagueOfTeam(team) === league);
    els.tweetTeam.innerHTML = `<option value="all">全チーム</option>${teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`).join("")}`;
    els.tweetTeam.value = teams.includes(current) ? current : "all";
  }

  function buildTweet() {
    const league = els.tweetLeague.value;
    const team = els.tweetTeam.value;
    const scopeText = team !== "all" ? team : league === "all" ? "全体" : `${league}・リーグ`;
    const theme = els.tweetTheme.value;
    const map = {
      batter: ["batter", "batter-overall", "打者総合トップ5", "打者総合スコア"],
      pitcher: ["pitcher", "pitcher-overall", "投手総合トップ5", "投手総合スコア"],
      "qualified-batter": ["batter", "batter-qualified", "規定打席到達トップ5", "打者総合スコア"],
      "qualified-pitcher": ["pitcher", "pitcher-qualified", "規定投球回到達トップ5", "投手総合スコア"],
      young: ["batter", "batter-young", "若手打者トップ5", "若手スコア"],
    };

    let title;
    let lines;
    let url = SITE_URL;

    if (theme === "recent-batter" || theme === "recent-pitcher") {
      const type = theme === "recent-pitcher" ? "pitcher" : "batter";
      title = type === "pitcher" ? "直近6日 投手トップ5" : "直近6日 野手トップ5";
      lines = rowsForRecent(type, league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(row["直近スコア"], "スコア")}`);
      url = scopedPageUrl("insights.html", team);
    } else if (theme === "interleague-batter" || theme === "interleague-pitcher") {
      const type = theme === "interleague-pitcher" ? "pitcher" : "batter";
      title = type === "pitcher" ? "交流戦 投手トップ5" : "交流戦 野手トップ5";
      lines = rowsForInterleague(type, league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(row["交流戦スコア"], "スコア")}`);
      url = scopedPageUrl("interleague.html", team);
    } else if (theme === "rookie-batter" || theme === "rookie-pitcher") {
      const type = theme === "rookie-pitcher" ? "pitcher" : "batter";
      title = type === "pitcher" ? "新人王候補 投手トップ5" : "新人王候補 野手トップ5";
      lines = rowsForRookies(type, league, 5, team).map(({ row, season }, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(season[scoreKey(type)], "スコア")}`);
      url = scopedPageUrl("insights.html", team);
    } else if (theme === "fielding") {
      title = "守備評価トップ5";
      lines = rowsForFielding(league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(row["守備評価"], "スコア")}`);
      url = scopedPageUrl("defense.html", team);
    } else if (theme === "catcher-caught") {
      title = "捕手盗塁阻止トップ5";
      lines = rowsForCaughtStealing(league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${D.formatValue(row["盗塁阻止率"], "盗塁阻止率")} / ${row["試合"]}試合`);
      url = scopedPageUrl("defense.html", team);
    } else {
      const [type, rankingId, rankingTitle, rankingScoreKey] = map[theme];
      title = rankingTitle;
      const rows = rowsForRanking(type, rankingId, league, 5, team);
      lines = rows.map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${D.formatValue(row[rankingScoreKey], "スコア")}`);
      if (team !== "all") url = teamPageUrl(team);
    }

    els.tweetOutput.value = [
      `【Player Lens】${scopeText} ${title}`,
      ...lines,
      "",
      "プロ野球2026データランキング",
      url,
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
    const fieldingRows = loadedFielding.length;
    const interleagueRows = loadedInterleague.batters.length + loadedInterleague.pitchers.length;

    checks.push(["ファイル読込", failedFiles === 0, failedFiles === 0 ? "全ファイルを読み込めています。" : `${failedFiles}件の読込に失敗しています。`]);
    checks.push(["球団数", teams.size === 12, `${teams.size}球団を認識しています。`]);
    checks.push(["リーグ判定", noLeague === 0, noLeague === 0 ? "全選手にリーグが付いています。" : `${noLeague}件のリーグ未判定があります。`]);
    checks.push(["年齢結合", missingAge === 0, missingAge === 0 ? "選手マスターとの結合に問題はありません。" : `${missingAge}件の年齢未取得があります。`]);
    checks.push(["規定到達", batterQualified > 0 && pitcherQualified > 0, `規定打席 ${batterQualified}人 / 規定投球回 ${pitcherQualified}人`]);
    checks.push(["左右成績", splitRows > 0, `${splitRows}件に左右別データがあります。`]);
    checks.push(["守備成績", fieldingRows > 0, `${fieldingRows}件の守備記録があります。`]);
    checks.push(["交流戦成績", interleagueRows > 0, `${interleagueRows}件の交流戦記録があります。`]);

    els.checkList.innerHTML = checks.map(([title, ok, message]) => `
      <div class="check-item ${ok ? "is-ok" : "is-warn"}">
        <strong>${D.escapeHtml(title)}</strong>
        <span>${D.escapeHtml(message)}</span>
      </div>
    `).join("");
  }

  async function renderMonetizationChecks() {
    els.monetizationChecks.innerHTML = `<div class="check-item"><strong>確認中</strong><span>主要ページを確認しています。</span></div>`;
    const pageResults = await Promise.all(SITE_CHECK_PAGES.map(async ([label, path, canonical]) => {
      const result = await fetchText(path);
      return {
        label,
        path,
        canonical,
        ...result,
        hasCanonical: result.text.includes(`<link rel="canonical" href="${canonical}">`),
        hasStructuredData: result.text.includes('application/ld+json'),
      };
    }));
    const privacy = pageResults.find((page) => page.path === "./privacy.html");
    const sitemap = await fetchText("./sitemap.xml");
    const adminPage = await fetchText("./admin.html");
    const sitemapLocs = [...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    const sitemapSet = new Set(sitemapLocs);
    const duplicatedLocs = sitemapLocs.filter((loc, index) => sitemapLocs.indexOf(loc) !== index);
    const missingCanonical = pageResults.filter((page) => !page.hasCanonical);
    const missingStructured = pageResults.filter((page) => !page.hasStructuredData);
    const missingSitemap = pageResults
      .map((page) => page.canonical)
      .filter((canonical) => !sitemapSet.has(canonical));
    const privacyReady = privacy?.text.includes("Google") && privacy.text.includes("Cookie") && privacy.text.includes("広告設定");
    const checks = [
      ["プライバシーポリシー", privacyReady, privacyReady ? "Google広告Cookieと広告設定への案内があります。" : "Google広告Cookieと広告設定の記載を確認してください。"],
      ["canonical", missingCanonical.length === 0, missingCanonical.length === 0 ? "主要ページにcanonicalがあります。" : `${missingCanonical.map((page) => page.label).join("、")}を確認してください。`],
      ["構造化データ", missingStructured.length === 0, missingStructured.length === 0 ? "主要ページに構造化データがあります。" : `${missingStructured.map((page) => page.label).join("、")}を確認してください。`],
      ["sitemap", sitemap.ok && missingSitemap.length === 0 && duplicatedLocs.length === 0, sitemap.ok && missingSitemap.length === 0 && duplicatedLocs.length === 0 ? "主要ページがsitemapに入り、重複はありません。" : "sitemapのURLまたは重複を確認してください。"],
      ["管理者ページ", adminPage.text.includes('name="robots" content="noindex,nofollow"'), adminPage.text.includes('name="robots" content="noindex,nofollow"') ? "管理者ページはnoindexです。" : "管理者ページのnoindexを確認してください。"],
    ];

    els.monetizationChecks.innerHTML = checks.map(([title, ok, message]) => `
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
    const extraCandidates = [
      ["直近野手", rowsForRecent("batter", "all", 1)[0], "直近スコア"],
      ["直近投手", rowsForRecent("pitcher", "all", 1)[0], "直近スコア"],
      ["新人王候補野手", rowsForRookies("batter", "all", 1)[0], "打者総合スコア"],
      ["新人王候補投手", rowsForRookies("pitcher", "all", 1)[0], "投手総合スコア"],
      ["交流戦野手", rowsForInterleague("batter", "all", 1)[0], "交流戦スコア"],
      ["交流戦投手", rowsForInterleague("pitcher", "all", 1)[0], "交流戦スコア"],
      ["守備評価", rowsForFielding("all", 1)[0], "守備評価"],
    ].map(([label, item, key]) => {
      if (!item) return "";
      const row = item.row || item;
      const scoreSource = item.season || item;
      return `<article class="candidate-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(row["選手名"])}</strong><small>${D.escapeHtml(row["チーム"])} / ${D.formatValue(scoreSource[key], "スコア")}</small></article>`;
    }).filter(Boolean);
    els.postCandidates.innerHTML = candidates.concat(extraCandidates).join("");
  }

  async function loadAdmin() {
    els.updateRows.innerHTML = `<tr><td colspan="4">読込中</td></tr>`;
    [loadedData, loadedInsight, loadedFielding, loadedInterleague, fileReports] = await Promise.all([
      D.loadData(),
      D.loadInsightData(),
      D.loadFieldingData(),
      D.loadInterleagueData(),
      Promise.all(FILES.map(fetchReport)),
    ]);
    batterMap = new Map(loadedData.batters.map((row) => [D.playerKey(row), row]));
    pitcherMap = new Map(loadedData.pitchers.map((row) => [D.playerKey(row), row]));
    renderTweetTeams();
    renderSummary();
    renderUpdateRows();
    renderChecks();
    await renderMonetizationChecks();
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
  els.tweetLeague.addEventListener("change", () => {
    renderTweetTeams();
    buildTweet();
  });
  els.tweetTeam.addEventListener("change", buildTweet);
  els.tweetTheme.addEventListener("change", buildTweet);

  if (sessionStorage.getItem("playerLensAdmin") === "1") {
    els.loginPanel.hidden = true;
    els.adminPanel.hidden = false;
    loadAdmin();
  }
})();
