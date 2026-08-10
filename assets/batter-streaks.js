(async function () {
  const D = window.PlayerLensData;
  const TEAM_ORDER = ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日", "オリックス", "ソフトバンク", "ロッテ", "楽天", "西武", "日本ハム"];
  const PAGE_SIZE = 50;
  const params = new URLSearchParams(location.search);
  const state = { rows: [], positionPlayers: new Set(), view: "summary", page: 1, minDate: "", maxDate: "" };

  const refs = {
    summary: document.getElementById("batterStatusSummary"),
    tabs: document.getElementById("batterStatusTabs"),
    date: document.getElementById("batterStatusDate"),
    league: document.getElementById("batterStatusLeague"),
    team: document.getElementById("batterStatusTeam"),
    search: document.getElementById("batterStatusSearch"),
    sort: document.getElementById("batterStatusSort"),
    reset: document.getElementById("batterStatusReset"),
    eyebrow: document.getElementById("batterStatusResultEyebrow"),
    title: document.getElementById("batterStatusResultTitle"),
    count: document.getElementById("batterStatusResultCount"),
    head: document.getElementById("batterStatusTableHead"),
    body: document.getElementById("batterStatusTableBody"),
    pagination: document.getElementById("batterStatusPagination"),
  };

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").replace(/\u3000/g, " ").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || "—";
    return `${Number(match[2])}/${Number(match[3])}`;
  }

  function formatDateLong(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || "—";
    return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  }

  function playerLink(team, player) {
    const href = D.playerUrl({ チーム: team, 選手名: player }, "batter");
    return `<a href="${D.escapeHtml(href)}">${D.escapeHtml(player)}</a>`;
  }

  function teamLink(team) {
    return `<a href="${D.escapeHtml(D.teamUrl(team))}">${D.escapeHtml(team)}</a>`;
  }

  function streakText(count, startDate) {
    if (!count) return '<span class="streak-zero">—</span>';
    return `<strong>${count}試合</strong><small>${D.escapeHtml(formatDate(startDate))}〜</small>`;
  }

  function longestText(count, startDate, endDate) {
    if (!count) return '<span class="streak-zero">—</span>';
    const period = startDate && endDate ? `${formatDate(startDate)}〜${formatDate(endDate)}` : "";
    return `<strong>${count}試合</strong>${period ? `<small>${D.escapeHtml(period)}</small>` : ""}`;
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
          ["hit-current-desc", "現在の連続安打が多い順"],
          ["onbase-current-desc", "現在の連続出塁が多い順"],
          ["hit-longest-desc", "今季最長の連続安打が多い順"],
          ["onbase-longest-desc", "今季最長の連続出塁が多い順"],
          ["latest-desc", "最終出場が新しい順"],
          ["name-asc", "選手名順"],
        ]
      : [
          ["date-desc", "試合日が新しい順"],
          ["hits-desc", "安打が多い順"],
          ["onbase-desc", "出塁数が多い順"],
          ["date-asc", "試合日が古い順"],
        ];
    const current = refs.sort.value;
    refs.sort.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    refs.sort.value = options.some(([value]) => value === current) ? current : options[0][0];
  }

  function rowsUpToReference() {
    const referenceDate = refs.date.value;
    return state.rows.filter((row) => row["試合日"] <= referenceDate);
  }

  function playerSummaries() {
    const rows = rowsUpToReference().filter((row) => state.positionPlayers.has(normalize(row["選手名"])));
    const grouped = new Map();
    rows.forEach((row) => {
      const key = normalize(row["選手名"]);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    const league = refs.league.value;
    const team = refs.team.value;
    const query = normalize(refs.search.value);
    const referenceDate = refs.date.value;

    return [...grouped.values()].map((items) => {
      const sorted = [...items].sort((a, b) =>
        String(a["試合日"]).localeCompare(String(b["試合日"])) || String(a["試合ID"]).localeCompare(String(b["試合ID"]))
      );
      const qualifying = sorted.filter((row) => D.toNumber(row["打席"]) > 0);
      const latest = qualifying.at(-1) || sorted.at(-1);
      const streak = D.batterStreakSummary(items, referenceDate);
      return {
        player: latest?.["選手名"] || items[0]["選手名"],
        team: latest?.["球団"] || items[0]["球団"],
        league: D.leagueOfTeam(latest?.["球団"] || items[0]["球団"]),
        latestDate: streak.latestDate || latest?.["試合日"] || "",
        ...streak,
      };
    }).filter((item) => {
      if (!item.latestDate) return false;
      if (league !== "all" && item.league !== league) return false;
      if (team !== "all" && item.team !== team) return false;
      if (query && !normalize(item.player).includes(query)) return false;
      return true;
    });
  }

  function historyRows() {
    const league = refs.league.value;
    const team = refs.team.value;
    const query = normalize(refs.search.value);
    return rowsUpToReference().filter((row) => {
      if (!state.positionPlayers.has(normalize(row["選手名"]))) return false;
      if (league !== "all" && row["リーグ"] !== league) return false;
      if (team !== "all" && row["球団"] !== team) return false;
      if (query && !normalize(row["選手名"]).includes(query)) return false;
      return true;
    });
  }

  function sortSummary(rows) {
    const sort = refs.sort.value;
    return [...rows].sort((a, b) => {
      if (sort === "onbase-current-desc") return b.currentOnBaseGames - a.currentOnBaseGames || b.longestOnBaseGames - a.longestOnBaseGames || b.latestDate.localeCompare(a.latestDate);
      if (sort === "hit-longest-desc") return b.longestHitGames - a.longestHitGames || b.currentHitGames - a.currentHitGames || b.latestDate.localeCompare(a.latestDate);
      if (sort === "onbase-longest-desc") return b.longestOnBaseGames - a.longestOnBaseGames || b.currentOnBaseGames - a.currentOnBaseGames || b.latestDate.localeCompare(a.latestDate);
      if (sort === "latest-desc") return b.latestDate.localeCompare(a.latestDate) || a.player.localeCompare(b.player, "ja");
      if (sort === "name-asc") return a.player.localeCompare(b.player, "ja");
      return b.currentHitGames - a.currentHitGames || b.longestHitGames - a.longestHitGames || b.latestDate.localeCompare(a.latestDate);
    });
  }

  function sortHistory(rows) {
    const sort = refs.sort.value;
    return [...rows].sort((a, b) => {
      if (sort === "hits-desc") return D.toNumber(b["安打"]) - D.toNumber(a["安打"]) || b["試合日"].localeCompare(a["試合日"]);
      if (sort === "onbase-desc") return D.toNumber(b["出塁数"]) - D.toNumber(a["出塁数"]) || b["試合日"].localeCompare(a["試合日"]);
      if (sort === "date-asc") return a["試合日"].localeCompare(b["試合日"]) || a["選手名"].localeCompare(b["選手名"], "ja");
      return b["試合日"].localeCompare(a["試合日"]) || String(b["試合ID"]).localeCompare(String(a["試合ID"])) || a["選手名"].localeCompare(b["選手名"], "ja");
    });
  }

  function renderSummaryCards(summaries) {
    const currentHit5 = summaries.filter((row) => row.currentHitGames >= 5).length;
    const currentOb5 = summaries.filter((row) => row.currentOnBaseGames >= 5).length;
    const active = summaries.length;
    const latest = refs.date.value || state.maxDate;
    refs.summary.innerHTML = [
      ["基準日", formatDateLong(latest)],
      ["対象野手", `${active}人`],
      ["5試合以上連続安打", `${currentHit5}人`],
      ["5試合以上連続出塁", `${currentOb5}人`],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value)}</strong></article>`).join("");
  }

  function renderSummaryTable(rows) {
    refs.eyebrow.textContent = "Batter Streaks";
    refs.title.textContent = "野手の連続記録";
    refs.head.innerHTML = `
      <tr>
        <th>選手</th><th>球団</th><th>最終出場</th>
        <th>現在 連続安打</th><th>今季最長 連続安打</th>
        <th>現在 連続出塁</th><th>今季最長 連続出塁</th>
      </tr>`;
    const paged = paginate(rows);
    refs.body.innerHTML = paged.length ? paged.map((row) => `
      <tr>
        <td>${playerLink(row.team, row.player)}</td>
        <td>${teamLink(row.team)}</td>
        <td>${D.escapeHtml(formatDate(row.latestDate))}</td>
        <td class="streak-cell">${streakText(row.currentHitGames, row.currentHitStartDate)}</td>
        <td class="streak-cell">${longestText(row.longestHitGames, row.longestHitStartDate, row.longestHitEndDate)}</td>
        <td class="streak-cell">${streakText(row.currentOnBaseGames, row.currentOnBaseStartDate)}</td>
        <td class="streak-cell">${longestText(row.longestOnBaseGames, row.longestOnBaseStartDate, row.longestOnBaseEndDate)}</td>
      </tr>`).join("") : '<tr><td colspan="7">条件に合う野手がいません。</td></tr>';
  }

  function renderHistoryTable(rows) {
    refs.eyebrow.textContent = "Game Log";
    refs.title.textContent = "野手の1試合成績";
    refs.head.innerHTML = `
      <tr>
        <th>試合日</th><th>選手</th><th>球団</th><th>対戦相手</th><th>打席</th><th>打数</th><th>安打</th><th>本塁打</th><th>打点</th><th>出塁数</th>
      </tr>`;
    const paged = paginate(rows);
    refs.body.innerHTML = paged.length ? paged.map((row) => `
      <tr>
        <td>${D.escapeHtml(formatDate(row["試合日"]))}</td>
        <td>${playerLink(row["球団"], row["選手名"])}</td>
        <td>${teamLink(row["球団"])}</td>
        <td>${D.escapeHtml(row["対戦相手"] || "—")}</td>
        <td>${D.escapeHtml(row["打席"] || "0")}</td>
        <td>${D.escapeHtml(row["打数"] || "0")}</td>
        <td>${D.escapeHtml(row["安打"] || "0")}</td>
        <td>${D.escapeHtml(row["本塁打"] || "0")}</td>
        <td>${D.escapeHtml(row["打点"] || "0")}</td>
        <td>${D.escapeHtml(row["出塁数"] || "0")}</td>
      </tr>`).join("") : '<tr><td colspan="10">条件に合う試合がありません。</td></tr>';
  }

  function paginate(rows) {
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }

  function renderPagination(totalRows) {
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    if (totalPages <= 1) {
      refs.pagination.innerHTML = "";
      return;
    }
    const buttons = [];
    const add = (page, label, disabled = false, current = false) => {
      buttons.push(`<button type="button" data-page="${page}" ${disabled ? "disabled" : ""} ${current ? 'aria-current="page"' : ""}>${label}</button>`);
    };
    add(Math.max(1, state.page - 1), "前へ", state.page === 1);
    const start = Math.max(1, state.page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p += 1) add(p, String(p), false, p === state.page);
    add(Math.min(totalPages, state.page + 1), "次へ", state.page === totalPages);
    refs.pagination.innerHTML = buttons.join("");
  }

  function render() {
    let rows;
    if (state.view === "summary") {
      rows = sortSummary(playerSummaries());
      renderSummaryCards(rows);
      renderSummaryTable(rows);
    } else {
      rows = sortHistory(historyRows());
      renderSummaryCards(playerSummaries());
      renderHistoryTable(rows);
    }
    refs.count.textContent = `${rows.length.toLocaleString("ja-JP")}件`;
    renderPagination(rows.length);
    refs.tabs.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === state.view;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    updateUrl();
    D.enhanceCompactTables(document);
  }

  function updateUrl() {
    const q = new URLSearchParams();
    if (state.view !== "summary") q.set("view", state.view);
    if (refs.date.value && refs.date.value !== state.maxDate) q.set("date", refs.date.value);
    if (refs.league.value !== "all") q.set("league", refs.league.value);
    if (refs.team.value !== "all") q.set("team", refs.team.value);
    if (refs.search.value.trim()) q.set("player", refs.search.value.trim());
    const next = q.toString() ? `?${q}` : location.pathname;
    history.replaceState(null, "", next);
  }

  function reset() {
    refs.date.value = state.maxDate;
    refs.league.value = "all";
    populateTeams(false);
    refs.team.value = "all";
    refs.search.value = "";
    state.view = "summary";
    state.page = 1;
    setSortOptions();
    render();
  }

  function bind() {
    refs.tabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (!button) return;
      state.view = button.dataset.view;
      state.page = 1;
      setSortOptions();
      render();
    });
    refs.league.addEventListener("change", () => {
      populateTeams();
      state.page = 1;
      render();
    });
    [refs.date, refs.team, refs.sort].forEach((node) => node.addEventListener("change", () => {
      state.page = 1;
      render();
    }));
    refs.search.addEventListener("input", () => {
      state.page = 1;
      render();
    });
    refs.reset.addEventListener("click", reset);
    refs.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page) || 1;
      render();
      refs.title.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  try {
    const [gameRows, seasonData] = await Promise.all([D.loadBatterGameData(), D.loadData()]);
    state.rows = gameRows;
    state.positionPlayers = new Set(
      seasonData.batters
        .filter((row) => row["ポジション"] !== "投手")
        .map((row) => normalize(row["選手名"]))
    );
    const dates = state.rows.map((row) => row["試合日"]).filter(Boolean).sort();
    state.minDate = dates[0] || "";
    state.maxDate = dates.at(-1) || "";
    refs.date.min = state.minDate;
    refs.date.max = state.maxDate;
    refs.date.value = params.get("date") || state.maxDate;
    if (refs.date.value < state.minDate || refs.date.value > state.maxDate) refs.date.value = state.maxDate;

    refs.league.value = ["セ", "パ"].includes(params.get("league")) ? params.get("league") : "all";
    populateTeams(false);
    const requestedTeam = D.shortTeam(params.get("team") || "");
    if ([...refs.team.options].some((option) => option.value === requestedTeam)) refs.team.value = requestedTeam;
    refs.search.value = params.get("player") || "";
    state.view = params.get("view") === "history" ? "history" : "summary";
    setSortOptions();
    bind();
    render();
  } catch (error) {
    refs.body.innerHTML = `<tr><td>${D.escapeHtml(error.message)}</td></tr>`;
    refs.summary.innerHTML = `<article class="summary-card"><span>データ</span><strong>読込失敗</strong></article>`;
  }
})();