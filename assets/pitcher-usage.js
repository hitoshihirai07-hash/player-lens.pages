(async function () {
  const D = window.PlayerLensData;
  const TEAM_ORDER = ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日", "オリックス", "ソフトバンク", "ロッテ", "楽天", "西武", "日本ハム"];
  const DAY = 24 * 60 * 60 * 1000;
  const PAGE_SIZE = 50;
  const params = new URLSearchParams(location.search);
  const state = { rows: [], view: "summary", page: 1, minDate: "", maxDate: "" };

  const refs = {
    summary: document.getElementById("usageSummary"),
    tabs: document.getElementById("usageTabs"),
    date: document.getElementById("usageDate"),
    league: document.getElementById("usageLeague"),
    team: document.getElementById("usageTeam"),
    role: document.getElementById("usageRole"),
    search: document.getElementById("usageSearch"),
    sort: document.getElementById("usageSort"),
    reset: document.getElementById("usageReset"),
    eyebrow: document.getElementById("usageResultEyebrow"),
    title: document.getElementById("usageResultTitle"),
    count: document.getElementById("usageResultCount"),
    legend: document.getElementById("usageLegend"),
    table: document.getElementById("usageTable"),
    head: document.getElementById("usageTableHead"),
    body: document.getElementById("usageTableBody"),
    pagination: document.getElementById("usagePagination"),
  };

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").replace(/\u3000/g, " ").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function dateStamp(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return NaN;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function dateFromStamp(stamp) {
    if (!Number.isFinite(stamp)) return "";
    return new Date(stamp).toISOString().slice(0, 10);
  }

  function daysBetween(older, newer) {
    const a = dateStamp(older);
    const b = dateStamp(newer);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / DAY) : 0;
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || "-";
    return `${Number(match[2])}/${Number(match[3])}`;
  }

  function formatDateLong(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || "-";
    return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  }

  function teamLink(team) {
    return `<a href="${D.escapeHtml(D.teamUrl(team))}">${D.escapeHtml(team)}</a>`;
  }

  function playerLink(team, player) {
    const href = D.playerUrl({ チーム: team, 選手名: player }, "pitcher");
    return `<a href="${D.escapeHtml(href)}">${D.escapeHtml(player)}</a>`;
  }

  function roleBadge(role) {
    const cls = role === "先発" ? "is-starter" : "is-relief";
    return `<span class="usage-role-badge ${cls}">${D.escapeHtml(role || "-")}</span>`;
  }

  function resultText(value) {
    return value && value !== "nan" ? value : "-";
  }

  function streakBadge(streak) {
    if (streak >= 3) return `<span class="usage-badge is-three">${streak}連投</span>`;
    if (streak === 2) return '<span class="usage-badge is-two">2連投</span>';
    if (streak === 1) return '<span class="usage-badge">1登板</span>';
    return '<span class="usage-badge is-rest">-</span>';
  }

  function restLabel(latestDate, referenceDate) {
    const diff = daysBetween(latestDate, referenceDate);
    if (diff <= 0) return "当日登板";
    if (diff === 1) return "前日登板";
    return `中${diff - 1}日`;
  }

  function clampDate(value) {
    if (!value) return state.maxDate;
    if (value < state.minDate) return state.minDate;
    if (value > state.maxDate) return state.maxDate;
    return value;
  }

  function leagueTeams() {
    const league = refs.league.value;
    return TEAM_ORDER.filter((team) => league === "all" || D.leagueOfTeam(team) === league);
  }

  function populateTeams(keepValue = true) {
    const current = keepValue ? refs.team.value : "all";
    const teams = leagueTeams();
    refs.team.innerHTML = ['<option value="all">全12球団</option>']
      .concat(teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`))
      .join("");
    refs.team.value = teams.includes(current) ? current : "all";
  }

  function setSortOptions() {
    const options = state.view === "summary"
      ? [
          ["pitches3-desc", "直近3日 投球数が多い順"],
          ["pitches7-desc", "直近7日 投球数が多い順"],
          ["streak-desc", "連投が多い順"],
          ["latest-desc", "最新登板が新しい順"],
          ["name-asc", "投手名順"],
        ]
      : [
          ["date-desc", "試合日が新しい順"],
          ["pitches-desc", "投球数が多い順"],
          ["date-asc", "試合日が古い順"],
        ];
    const current = refs.sort.value;
    refs.sort.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    refs.sort.value = options.some(([value]) => value === current) ? current : options[0][0];
  }

  function baseRows() {
    const referenceDate = refs.date.value;
    const league = refs.league.value;
    const team = refs.team.value;
    const role = refs.role.value;
    const query = normalize(refs.search.value);
    return state.rows.filter((row) => {
      if (row["試合日"] > referenceDate) return false;
      if (league !== "all" && row["リーグ"] !== league) return false;
      if (team !== "all" && row["球団"] !== team) return false;
      if (role !== "all" && row["登板区分"] !== role) return false;
      if (query && !normalize(row["選手名"]).includes(query)) return false;
      return true;
    });
  }

  function playerSummaries(rows) {
    const referenceDate = refs.date.value;
    const start3 = dateFromStamp(dateStamp(referenceDate) - 2 * DAY);
    const start7 = dateFromStamp(dateStamp(referenceDate) - 6 * DAY);
    const grouped = new Map();
    rows.forEach((row) => {
      const key = `${row["球団"]}|${row["選手名"]}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    return [...grouped.values()].map((items) => {
      const sorted = [...items].sort((a, b) => String(b["試合日"]).localeCompare(String(a["試合日"])) || String(b["試合ID"]).localeCompare(String(a["試合ID"])));
      const latestDate = sorted[0]["試合日"];
      const latestRows = sorted.filter((row) => row["試合日"] === latestDate);
      const latestPitches = latestRows.reduce((sum, row) => sum + D.toInt(row["投球数"]), 0);
      const latestRoles = [...new Set(latestRows.map((row) => row["登板区分"]).filter(Boolean))].join("/");
      const rows3 = sorted.filter((row) => row["試合日"] >= start3);
      const rows7 = sorted.filter((row) => row["試合日"] >= start7);
      const dateSet = new Set(sorted.map((row) => row["試合日"]));
      let streak = 0;
      if (dateSet.has(referenceDate)) {
        let cursor = dateStamp(referenceDate);
        while (dateSet.has(dateFromStamp(cursor))) {
          streak += 1;
          cursor -= DAY;
        }
      }
      const recent = sorted.slice(0, 5).map((row) => `${formatDate(row["試合日"])} ${D.toInt(row["投球数"])}球`).join(" / ");
      return {
        team: sorted[0]["球団"],
        player: sorted[0]["選手名"],
        latestDate,
        latestPitches,
        latestRole: latestRoles,
        rest: restLabel(latestDate, referenceDate),
        streak,
        games3: rows3.length,
        pitches3: rows3.reduce((sum, row) => sum + D.toInt(row["投球数"]), 0),
        games7: rows7.length,
        pitches7: rows7.reduce((sum, row) => sum + D.toInt(row["投球数"]), 0),
        seasonGames: sorted.length,
        recent,
      };
    });
  }

  function sortSummaries(rows) {
    const sort = refs.sort.value;
    return [...rows].sort((a, b) => {
      if (sort === "pitches7-desc") return b.pitches7 - a.pitches7 || b.pitches3 - a.pitches3 || b.latestDate.localeCompare(a.latestDate);
      if (sort === "streak-desc") return b.streak - a.streak || b.pitches3 - a.pitches3 || b.latestDate.localeCompare(a.latestDate);
      if (sort === "latest-desc") return b.latestDate.localeCompare(a.latestDate) || b.latestPitches - a.latestPitches;
      if (sort === "name-asc") return a.player.localeCompare(b.player, "ja") || a.team.localeCompare(b.team, "ja");
      return b.pitches3 - a.pitches3 || b.games3 - a.games3 || b.latestDate.localeCompare(a.latestDate);
    });
  }

  function sortHistory(rows) {
    const sort = refs.sort.value;
    return [...rows].sort((a, b) => {
      if (sort === "pitches-desc") return D.toInt(b["投球数"]) - D.toInt(a["投球数"]) || String(b["試合日"]).localeCompare(String(a["試合日"]));
      if (sort === "date-asc") return String(a["試合日"]).localeCompare(String(b["試合日"])) || String(a["試合ID"]).localeCompare(String(b["試合ID"]));
      return String(b["試合日"]).localeCompare(String(a["試合日"])) || String(b["試合ID"]).localeCompare(String(a["試合ID"]));
    });
  }

  function renderSummaryCards(summaries, rows) {
    const referenceDate = refs.date.value;
    const todayRows = rows.filter((row) => row["試合日"] === referenceDate);
    const todayPlayers = new Set(todayRows.map((row) => `${row["球団"]}|${row["選手名"]}`)).size;
    const consecutive = summaries.filter((row) => row.streak >= 2).length;
    refs.summary.innerHTML = [
      ["基準日", formatDateLong(referenceDate)],
      ["対象投手", `${summaries.length.toLocaleString("ja-JP")}人`],
      ["基準日の登板", `${todayPlayers.toLocaleString("ja-JP")}人`],
      ["2連投以上", `${consecutive.toLocaleString("ja-JP")}人`],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value)}</strong></article>`).join("");
  }

  function summaryTable(rows) {
    refs.table.classList.remove("usage-history-table");
    refs.head.innerHTML = '<tr><th>球団</th><th>投手</th><th>最新登板</th><th>区分</th><th>連投</th><th>最新日投球数</th><th>直近3日</th><th>直近7日</th><th>今季登板</th><th>直近5登板</th></tr>';
    refs.body.innerHTML = rows.map((row) => `<tr>
      <td>${teamLink(row.team)}</td>
      <td>${playerLink(row.team, row.player)}</td>
      <td><strong>${D.escapeHtml(formatDate(row.latestDate))}</strong><small class="usage-subtext">${D.escapeHtml(row.rest)}</small></td>
      <td>${roleBadge(row.latestRole)}</td>
      <td>${streakBadge(row.streak)}</td>
      <td><strong>${row.latestPitches.toLocaleString("ja-JP")}球</strong></td>
      <td><strong>${row.pitches3.toLocaleString("ja-JP")}球</strong><small class="usage-subtext">${row.games3}登板</small></td>
      <td><strong>${row.pitches7.toLocaleString("ja-JP")}球</strong><small class="usage-subtext">${row.games7}登板</small></td>
      <td>${row.seasonGames.toLocaleString("ja-JP")}</td>
      <td class="usage-recent-cell">${D.escapeHtml(row.recent || "-")}</td>
    </tr>`).join("");
  }

  function historyTable(rows) {
    refs.table.classList.add("usage-history-table");
    refs.head.innerHTML = '<tr><th>試合日</th><th>球団</th><th>投手</th><th>相手</th><th>H/V</th><th>区分</th><th>結果</th><th>投球数</th><th>投球回</th><th>打者</th><th>奪三振</th><th>失点</th><th>自責</th><th>試合ID</th></tr>';
    refs.body.innerHTML = rows.map((row) => `<tr>
      <td>${D.escapeHtml(formatDate(row["試合日"]))}</td>
      <td>${teamLink(row["球団"])}</td>
      <td>${playerLink(row["球団"], row["選手名"])}</td>
      <td>${D.escapeHtml(row["対戦球団"] || "-")}</td>
      <td>${row["ホーム/ビジター"] === "ホーム" ? "H" : row["ホーム/ビジター"] === "ビジター" ? "V" : D.escapeHtml(row["ホーム/ビジター"] || "-")}</td>
      <td>${roleBadge(row["登板区分"])}</td>
      <td>${D.escapeHtml(resultText(row["結果"]))}</td>
      <td><strong>${D.toInt(row["投球数"]).toLocaleString("ja-JP")}球</strong></td>
      <td>${D.escapeHtml(row["投球回"] || "-")}</td>
      <td>${D.toInt(row["打者"])}</td>
      <td>${D.toInt(row["奪三振"])}</td>
      <td>${D.toInt(row["失点"])}</td>
      <td>${D.toInt(row["自責点"])}</td>
      <td class="usage-game-id">${D.escapeHtml(row["試合ID"] || "-")}</td>
    </tr>`).join("");
  }

  function renderPagination(totalRows, totalPages) {
    if (totalPages <= 1) {
      refs.pagination.innerHTML = "";
      return;
    }
    refs.pagination.innerHTML = `
      <button type="button" data-page="prev" ${state.page <= 1 ? "disabled" : ""}>前へ</button>
      <span>${state.page.toLocaleString("ja-JP")} / ${totalPages.toLocaleString("ja-JP")}ページ</span>
      <button type="button" data-page="next" ${state.page >= totalPages ? "disabled" : ""}>次へ</button>
      <small>${totalRows.toLocaleString("ja-JP")}件を${PAGE_SIZE}件ずつ表示</small>`;
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (state.view !== "summary") next.set("view", state.view);
    if (refs.date.value && refs.date.value !== state.maxDate) next.set("date", refs.date.value);
    if (refs.league.value !== "all") next.set("league", refs.league.value);
    if (refs.team.value !== "all") next.set("team", refs.team.value);
    if (refs.role.value !== "all") next.set("role", refs.role.value);
    if (refs.search.value.trim()) next.set("player", refs.search.value.trim());
    const query = next.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }

  function render() {
    const rows = baseRows();
    const summaries = playerSummaries(rows);
    renderSummaryCards(summaries, rows);
    refs.legend.hidden = state.view !== "summary";

    const source = state.view === "summary" ? sortSummaries(summaries) : sortHistory(rows);
    const totalPages = Math.max(1, Math.ceil(source.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const pageRows = source.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    if (state.view === "summary") {
      refs.eyebrow.textContent = "Current Usage";
      refs.title.textContent = "投手別の登板状況";
      summaryTable(pageRows);
    } else {
      refs.eyebrow.textContent = "Appearance History";
      refs.title.textContent = "1試合ごとの登板履歴";
      historyTable(pageRows);
    }
    refs.count.textContent = `${source.length.toLocaleString("ja-JP")}件 / 基準日 ${formatDateLong(refs.date.value)}`;
    if (!source.length) {
      refs.head.innerHTML = "";
      refs.body.innerHTML = '<tr><td class="starter-empty-cell">条件に合うデータがありません。</td></tr>';
    }
    renderPagination(source.length, totalPages);
    D.enhanceCompactTables(document);
    syncUrl();
  }

  function setView(view, shouldRender = true) {
    state.view = view === "history" ? "history" : "summary";
    state.page = 1;
    refs.tabs.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    });
    setSortOptions();
    if (shouldRender) render();
  }

  function initializeFromUrl() {
    refs.date.value = clampDate(params.get("date") || state.maxDate);
    const league = params.get("league");
    if (["セ", "パ"].includes(league)) refs.league.value = league;
    populateTeams(false);
    const team = D.shortTeam(params.get("team") || "");
    if (TEAM_ORDER.includes(team) && leagueTeams().includes(team)) refs.team.value = team;
    const role = params.get("role");
    if (["先発", "救援"].includes(role)) refs.role.value = role;
    refs.search.value = params.get("player") || params.get("search") || "";
    setView(params.get("view") || "summary", false);
  }

  function bindEvents() {
    refs.tabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (button) setView(button.dataset.view);
    });
    refs.date.addEventListener("change", () => {
      refs.date.value = clampDate(refs.date.value);
      state.page = 1;
      render();
    });
    refs.league.addEventListener("change", () => {
      populateTeams();
      state.page = 1;
      render();
    });
    [refs.team, refs.role].forEach((ref) => ref.addEventListener("change", () => {
      state.page = 1;
      render();
    }));
    refs.sort.addEventListener("change", () => {
      state.page = 1;
      render();
    });
    refs.search.addEventListener("input", () => {
      state.page = 1;
      render();
    });
    refs.reset.addEventListener("click", () => {
      refs.date.value = state.maxDate;
      refs.league.value = "all";
      populateTeams(false);
      refs.role.value = "all";
      refs.search.value = "";
      setView("summary", false);
      state.page = 1;
      render();
    });
    refs.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      state.page += button.dataset.page === "next" ? 1 : -1;
      render();
      refs.table.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  try {
    state.rows = await D.loadPitcherDailyData();
    const dates = state.rows.map((row) => row["試合日"]).filter(Boolean).sort();
    state.minDate = dates[0] || "";
    state.maxDate = dates.at(-1) || "";
    refs.date.min = state.minDate;
    refs.date.max = state.maxDate;
    initializeFromUrl();
    bindEvents();
    render();
  } catch (error) {
    refs.summary.innerHTML = '<article class="summary-card"><span>読込状況</span><strong>確認必要</strong></article>';
    refs.head.innerHTML = "";
    refs.body.innerHTML = `<tr><td class="starter-empty-cell">${D.escapeHtml(error.message || "データを読み込めませんでした。")}</td></tr>`;
    refs.count.textContent = "データ読込エラー";
  }
})();
