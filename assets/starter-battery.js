(async function () {
  const Data = window.PlayerLensData;
  const TEAM_ORDER = ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日", "オリックス", "ソフトバンク", "ロッテ", "楽天", "西武", "日本ハム"];
  const PAGE_SIZE = 50;

  const refs = {
    summary: document.getElementById("starterSummary"),
    tabs: document.getElementById("starterTabs"),
    league: document.getElementById("starterLeague"),
    team: document.getElementById("starterTeam"),
    search: document.getElementById("starterSearch"),
    sort: document.getElementById("starterSort"),
    minimumStartsField: document.getElementById("minimumStartsField"),
    minimumStarts: document.getElementById("minimumStarts"),
    opponentField: document.getElementById("opponentField"),
    opponent: document.getElementById("starterOpponent"),
    venueField: document.getElementById("venueField"),
    venue: document.getElementById("starterVenue"),
    resultField: document.getElementById("resultField"),
    result: document.getElementById("starterResult"),
    reset: document.getElementById("resetFilters"),
    eyebrow: document.getElementById("starterResultEyebrow"),
    title: document.getElementById("starterResultTitle"),
    count: document.getElementById("starterResultCount"),
    table: document.getElementById("starterTable"),
    head: document.getElementById("starterTableHead"),
    body: document.getElementById("starterTableBody"),
    pagination: document.getElementById("starterPagination"),
  };

  const state = {
    view: "pitchers",
    page: 1,
    data: { pitchers: [], batteries: [], games: [] },
  };

  const viewConfig = {
    pitchers: {
      eyebrow: "Pitcher Summary",
      title: "先発投手別成績",
      sortOptions: [
        ["starts-desc", "先発数が多い順"],
        ["era-asc", "防御率が良い順"],
        ["qs-desc", "QS率が高い順"],
        ["hqs-desc", "HQS率が高い順"],
        ["win-desc", "チーム勝率が高い順"],
        ["support-desc", "平均援護点が多い順"],
        ["date-desc", "最新登板日が新しい順"],
      ],
    },
    batteries: {
      eyebrow: "Battery Summary",
      title: "先発バッテリー別成績",
      sortOptions: [
        ["starts-desc", "先発回数が多い順"],
        ["era-asc", "防御率が良い順"],
        ["qs-desc", "QS率が高い順"],
        ["hqs-desc", "HQS率が高い順"],
        ["win-desc", "チーム勝率が高い順"],
        ["support-desc", "平均援護点が多い順"],
        ["date-desc", "最新登板日が新しい順"],
      ],
    },
    games: {
      eyebrow: "Game History",
      title: "試合ごとの先発バッテリー履歴",
      sortOptions: [
        ["date-desc", "試合日が新しい順"],
        ["date-asc", "試合日が古い順"],
        ["pitches-desc", "投球数が多い順"],
        ["strikeouts-desc", "奪三振が多い順"],
      ],
    },
  };

  function escapeHtml(value) {
    return Data.escapeHtml(value);
  }

  function number(value) {
    return Data.toNumber(value);
  }

  function int(value) {
    return Data.toInt(value);
  }

  function normalize(value) {
    return String(value ?? "").normalize("NFKC").replace(/[\s\u3000]/g, "").toLowerCase();
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${Number(match[2])}月${Number(match[3])}日` : (value || "-");
  }

  function formatRate(value) {
    return `${(number(value) * 100).toFixed(1)}%`;
  }

  function formatEra(value) {
    return number(value).toFixed(2);
  }

  function formatAverage(value) {
    return number(value).toFixed(2);
  }

  function teamRecord(row) {
    return `${int(row["チーム勝"])}勝${int(row["チーム敗"])}敗${int(row["チーム分"])}分`;
  }

  function teamLink(team) {
    return `<a href="${escapeHtml(Data.teamUrl(team))}">${escapeHtml(team)}</a>`;
  }

  function playerLink(team, name, type) {
    const href = Data.playerUrl({ チーム: team, 選手名: name }, type);
    return `<a href="${escapeHtml(href)}">${escapeHtml(name)}</a>`;
  }

  function batteryNames(row) {
    const pitcher = playerLink(row["球団"], row["先発投手名"], "pitcher");
    const catcher = playerLink(row["球団"], row["先発捕手名"], "batter");
    return `<span class="starter-name-pair"><strong>${pitcher}</strong><small>× ${catcher}</small></span>`;
  }

  function resultBadge(value) {
    const className = value === "勝" ? "is-win" : value === "敗" ? "is-loss" : "is-draw";
    return `<span class="starter-result-badge ${className}">${escapeHtml(value || "-")}</span>`;
  }

  function qualityBadge(row) {
    if (String(row["HQS"]) === "1") return '<span class="starter-quality-badge is-hqs">HQS</span>';
    if (String(row["QS"]) === "1") return '<span class="starter-quality-badge is-qs">QS</span>';
    return '<span class="starter-quality-badge">－</span>';
  }

  function uniqueGameCount(rows) {
    return new Set(rows.map((row) => row["公式試合ID"]).filter(Boolean)).size;
  }

  function latestDate(rows, key) {
    return rows.map((row) => row[key]).filter(Boolean).sort().at(-1) || "-";
  }

  function renderSummary() {
    const cards = [
      ["終了済み試合", `${uniqueGameCount(state.data.games).toLocaleString("ja-JP")}試合`],
      ["先発投手", `${state.data.pitchers.length.toLocaleString("ja-JP")}人`],
      ["先発バッテリー", `${state.data.batteries.length.toLocaleString("ja-JP")}組`],
      ["最新試合日", formatDate(latestDate(state.data.games, "試合日"))],
    ];
    refs.summary.innerHTML = cards.map(([label, value]) => `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
  }

  function leagueTeams() {
    const league = refs.league.value;
    return TEAM_ORDER.filter((team) => league === "all" || Data.leagueOfTeam(team) === league);
  }

  function populateTeamOptions(keepValue = true) {
    const current = keepValue ? refs.team.value : "all";
    const options = ['<option value="all">全12球団</option>'].concat(
      leagueTeams().map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`)
    );
    refs.team.innerHTML = options.join("");
    refs.team.value = leagueTeams().includes(current) ? current : "all";
  }

  function populateOpponentOptions() {
    refs.opponent.innerHTML = ['<option value="all">全対戦相手</option>'].concat(
      TEAM_ORDER.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`)
    ).join("");
  }

  function setSortOptions() {
    const options = viewConfig[state.view].sortOptions;
    refs.sort.innerHTML = options.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("");
  }

  function setView(view) {
    state.view = viewConfig[view] ? view : "pitchers";
    state.page = 1;
    refs.tabs.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    });
    refs.minimumStartsField.hidden = state.view !== "batteries";
    refs.opponentField.hidden = state.view !== "games";
    refs.venueField.hidden = state.view !== "games";
    refs.resultField.hidden = state.view !== "games";
    refs.eyebrow.textContent = viewConfig[state.view].eyebrow;
    refs.title.textContent = viewConfig[state.view].title;
    setSortOptions();
    render();
  }

  function commonFilter(row) {
    const league = refs.league.value;
    const team = refs.team.value;
    const query = normalize(refs.search.value);
    if (league !== "all" && row["リーグ"] !== league) return false;
    if (team !== "all" && row["球団"] !== team) return false;
    if (query) {
      const haystack = normalize(`${row["先発投手名"] || ""}${row["先発捕手名"] || ""}${row["最多先発捕手名"] || ""}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  }

  function filteredRows() {
    let rows = state.data[state.view].filter(commonFilter);
    if (state.view === "batteries") {
      const minimum = int(refs.minimumStarts.value);
      rows = rows.filter((row) => int(row["先発回数"]) >= minimum);
    }
    if (state.view === "games") {
      const opponent = refs.opponent.value;
      const venue = refs.venue.value;
      const result = refs.result.value;
      rows = rows.filter((row) => opponent === "all" || row["相手球団"] === opponent);
      rows = rows.filter((row) => venue === "all" || row["ホーム／ビジター"] === venue);
      rows = rows.filter((row) => result === "all" || row["チーム結果"] === result);
    }
    return sortRows(rows);
  }

  function compareText(a, b, key, direction = -1) {
    return String(a[key] || "").localeCompare(String(b[key] || ""), "ja") * direction;
  }

  function sortRows(rows) {
    const sort = refs.sort.value || viewConfig[state.view].sortOptions[0][0];
    return [...rows].sort((a, b) => {
      if (sort === "date-desc") return compareText(a, b, state.view === "games" ? "試合日" : "最新登板日", -1) || compareText(a, b, "先発投手名", 1);
      if (sort === "date-asc") return compareText(a, b, "試合日", 1) || compareText(a, b, "先発投手名", 1);
      if (sort === "era-asc") return number(a["防御率"]) - number(b["防御率"]) || int(b[state.view === "pitchers" ? "先発数" : "先発回数"]) - int(a[state.view === "pitchers" ? "先発数" : "先発回数"]);
      if (sort === "qs-desc") return number(b["QS率"]) - number(a["QS率"]) || int(b[state.view === "pitchers" ? "先発数" : "先発回数"]) - int(a[state.view === "pitchers" ? "先発数" : "先発回数"]);
      if (sort === "hqs-desc") return number(b["HQS率"]) - number(a["HQS率"]) || int(b[state.view === "pitchers" ? "先発数" : "先発回数"]) - int(a[state.view === "pitchers" ? "先発数" : "先発回数"]);
      if (sort === "win-desc") return number(b["チーム勝率"]) - number(a["チーム勝率"]) || int(b[state.view === "pitchers" ? "先発数" : "先発回数"]) - int(a[state.view === "pitchers" ? "先発数" : "先発回数"]);
      if (sort === "support-desc") return number(b["平均援護点"]) - number(a["平均援護点"]);
      if (sort === "pitches-desc") return int(b["投球数"]) - int(a["投球数"]) || compareText(a, b, "試合日", -1);
      if (sort === "strikeouts-desc") return int(b["奪三振"]) - int(a["奪三振"]) || compareText(a, b, "試合日", -1);
      const key = state.view === "pitchers" ? "先発数" : "先発回数";
      return int(b[key]) - int(a[key]) || number(a["防御率"]) - number(b["防御率"]);
    });
  }

  function pitcherTable(rows) {
    refs.head.innerHTML = `<tr><th>球団</th><th>先発投手</th><th>先発数</th><th>最多先発捕手</th><th>チーム成績</th><th>防御率</th><th>QS率</th><th>HQS率</th><th>平均投球回</th><th>平均援護点</th><th>最新登板日</th></tr>`;
    refs.body.innerHTML = rows.map((row) => `<tr>
      <td>${teamLink(row["球団"])}</td>
      <td>${playerLink(row["球団"], row["先発投手名"], "pitcher")}</td>
      <td>${int(row["先発数"])}</td>
      <td>${playerLink(row["球団"], row["最多先発捕手名"], "batter")} <small>(${int(row["最多捕手との先発数"])})</small></td>
      <td>${escapeHtml(teamRecord(row))}</td>
      <td>${formatEra(row["防御率"])}</td>
      <td>${formatRate(row["QS率"])}</td>
      <td>${formatRate(row["HQS率"])}</td>
      <td>${formatAverage(row["平均投球回"])}</td>
      <td>${formatAverage(row["平均援護点"])}</td>
      <td>${escapeHtml(formatDate(row["最新登板日"]))}</td>
    </tr>`).join("");
  }

  function batteryTable(rows) {
    refs.head.innerHTML = `<tr><th>球団</th><th>先発バッテリー</th><th>先発回数</th><th>チーム成績</th><th>防御率</th><th>QS率</th><th>HQS率</th><th>平均投球回</th><th>平均援護点</th><th>対戦球団数</th><th>最新登板日</th></tr>`;
    refs.body.innerHTML = rows.map((row) => `<tr>
      <td>${teamLink(row["球団"])}</td>
      <td>${batteryNames(row)}</td>
      <td>${int(row["先発回数"])}</td>
      <td>${escapeHtml(teamRecord(row))}</td>
      <td>${formatEra(row["防御率"])}</td>
      <td>${formatRate(row["QS率"])}</td>
      <td>${formatRate(row["HQS率"])}</td>
      <td>${formatAverage(row["平均投球回"])}</td>
      <td>${formatAverage(row["平均援護点"])}</td>
      <td title="${escapeHtml(row["対戦球団一覧"])}">${int(row["対戦球団数"])}</td>
      <td>${escapeHtml(formatDate(row["最新登板日"]))}</td>
    </tr>`).join("");
  }

  function gameTable(rows) {
    refs.head.innerHTML = `<tr><th>試合日</th><th>先発バッテリー</th><th>球団</th><th>相手</th><th>球場</th><th>H/V</th><th>スコア</th><th>結果</th><th>先発結果</th><th>投球回</th><th>失点</th><th>自責</th><th>投球数</th><th>被安打</th><th>与四球</th><th>奪三振</th><th>QS</th></tr>`;
    refs.body.innerHTML = rows.map((row) => `<tr>
      <td>${escapeHtml(formatDate(row["試合日"]))}</td>
      <td>${batteryNames(row)}</td>
      <td>${teamLink(row["球団"])}</td>
      <td>${escapeHtml(row["相手球団"])}</td>
      <td>${escapeHtml(row["球場"])}</td>
      <td>${row["ホーム／ビジター"] === "ホーム" ? "H" : "V"}</td>
      <td>${int(row["自チーム得点"])}－${int(row["相手得点"])}</td>
      <td>${resultBadge(row["チーム結果"])}</td>
      <td>${escapeHtml(row["先発投手結果"] || "-")}</td>
      <td>${escapeHtml(row["投球回表示"] || "-")}</td>
      <td>${int(row["失点"])}</td>
      <td>${int(row["自責点"])}</td>
      <td>${int(row["投球数"])}</td>
      <td>${int(row["被安打"])}</td>
      <td>${int(row["与四球"])}</td>
      <td>${int(row["奪三振"])}</td>
      <td>${qualityBadge(row)}</td>
    </tr>`).join("");
  }

  function emptyTable() {
    refs.head.innerHTML = "";
    refs.body.innerHTML = '<tr><td class="starter-empty-cell">条件に合うデータがありません。</td></tr>';
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
      <small>${totalRows.toLocaleString("ja-JP")}件を50件ずつ表示</small>
    `;
  }

  function render() {
    const rows = filteredRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    refs.count.textContent = rows.length ? `${rows.length.toLocaleString("ja-JP")}件中 ${start + 1}～${Math.min(start + PAGE_SIZE, rows.length)}件` : "0件";
    refs.table.className = `compact-table starter-data-table starter-${state.view}-table`;

    if (!pageRows.length) {
      emptyTable();
    } else if (state.view === "pitchers") {
      pitcherTable(pageRows);
    } else if (state.view === "batteries") {
      batteryTable(pageRows);
    } else {
      gameTable(pageRows);
    }

    Data.enhanceCompactTables(document.querySelector(".starter-results-card"));
    renderPagination(rows.length, totalPages);
  }

  function resetFilters() {
    refs.league.value = "all";
    populateTeamOptions(false);
    refs.search.value = "";
    refs.minimumStarts.value = "1";
    refs.opponent.value = "all";
    refs.venue.value = "all";
    refs.result.value = "all";
    state.page = 1;
    setSortOptions();
    render();
  }

  function applyUrlFilters() {
    const params = new URLSearchParams(location.search);
    const view = params.get("view");
    const league = params.get("league");
    const team = params.get("team");
    const search = params.get("search");
    if (["pitchers", "batteries", "games"].includes(view)) state.view = view;
    if (["セ", "パ"].includes(league)) refs.league.value = league;
    populateTeamOptions();
    if (TEAM_ORDER.includes(team)) refs.team.value = team;
    if (search) refs.search.value = search;
  }

  refs.tabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (button) setView(button.dataset.view);
  });

  refs.league.addEventListener("change", () => {
    populateTeamOptions();
    state.page = 1;
    render();
  });

  [refs.team, refs.sort, refs.minimumStarts, refs.opponent, refs.venue, refs.result].forEach((element) => {
    element.addEventListener("change", () => {
      state.page = 1;
      render();
    });
  });

  refs.search.addEventListener("input", () => {
    state.page = 1;
    render();
  });

  refs.reset.addEventListener("click", resetFilters);

  refs.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    state.page += button.dataset.page === "next" ? 1 : -1;
    render();
    document.querySelector(".starter-results-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  try {
    populateOpponentOptions();
    state.data = await Data.loadStarterBatteryData();
    applyUrlFilters();
    renderSummary();
    setView(state.view);
  } catch (error) {
    refs.summary.innerHTML = '<article class="summary-card"><span>読込状況</span><strong>エラー</strong></article>';
    refs.body.innerHTML = '<tr><td class="starter-empty-cell">先発バッテリーデータを読み込めませんでした。</td></tr>';
    refs.count.textContent = "読込失敗";
  }
})();
