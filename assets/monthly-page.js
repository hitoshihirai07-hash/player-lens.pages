(async function () {
  const D = window.PlayerLensData;
  const M = window.PlayerLensMonthly;
  if (!D || !M) return;

  const typeButtons = document.getElementById("monthlyTypeTabs");
  const monthTabs = document.getElementById("monthlyMonthTabs");
  const leagueSelect = document.getElementById("monthlyLeague");
  const teamSelect = document.getElementById("monthlyTeam");
  const searchInput = document.getElementById("monthlySearch");
  const resetButton = document.getElementById("monthlyReset");
  const summary = document.getElementById("monthlySummary");
  const title = document.getElementById("monthlyResultTitle");
  const count = document.getElementById("monthlyResultCount");
  const head = document.getElementById("monthlyTableHead");
  const body = document.getElementById("monthlyTableBody");
  const status = document.getElementById("monthlyStatus");

  const params = new URLSearchParams(location.search);
  const state = {
    type: params.get("type") === "pitcher" ? "pitcher" : "batter",
    month: params.get("month") || "",
    league: "all",
    team: "all",
    search: "",
    rows: [],
  };

  const esc = (value) => D.escapeHtml(value === undefined || value === null ? "" : String(value));
  const nameKey = (value) => M.playerNameKey(value).toLowerCase();
  const avg = (value) => Number(value).toFixed(3).replace(/^0/, "");
  const dec3 = (value) => Number(value).toFixed(3).replace(/^0/, "");
  const dec2 = (value) => Number(value).toFixed(2);

  function rankingRule() {
    return M.ranking(state.type);
  }

  function typeLabel() {
    return state.type === "pitcher" ? "投手" : "野手";
  }

  function allMonths() {
    return [...new Set(state.rows.map((row) => row.month).filter(Boolean))].sort();
  }

  function syncUrl() {
    const query = new URLSearchParams({ type: state.type });
    if (state.month) query.set("month", state.month);
    history.replaceState(null, "", `./monthly-stats?${query.toString()}`);
  }

  function populateTeams() {
    const monthRows = state.rows.filter((row) => row.month === state.month && (state.league === "all" || row.リーグ === state.league));
    const teams = [...new Set(monthRows.map((row) => row.チーム).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
    const current = state.team;
    teamSelect.innerHTML = `<option value="all">全12球団</option>${teams.map((team) => `<option value="${esc(team)}">${esc(team)}</option>`).join("")}`;
    if (teams.includes(current)) teamSelect.value = current;
    else {
      state.team = "all";
      teamSelect.value = "all";
    }
  }

  function renderMonthTabs() {
    const months = allMonths();
    if (!months.length) {
      monthTabs.innerHTML = "";
      return;
    }
    if (!months.includes(state.month)) state.month = months[months.length - 1];
    const showYear = new Set(months.map((key) => key.slice(0, 4))).size > 1;
    monthTabs.innerHTML = months.map((key) => `<button type="button" class="monthly-month-tab${key === state.month ? " is-active" : ""}" data-month="${esc(key)}" role="tab" aria-selected="${key === state.month ? "true" : "false"}">${esc(M.monthLabel(key, showYear))}</button>`).join("");
    monthTabs.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.month = button.dataset.month;
        populateTeams();
        syncUrl();
        render();
      });
    });
  }

  function scopedRankedRows() {
    const eligible = M.eligibleRows(state.rows.filter((row) => row.month === state.month), state.type);
    const rule = rankingRule();
    return eligible
      .filter((row) => state.league === "all" || row.リーグ === state.league)
      .filter((row) => state.team === "all" || row.チーム === state.team)
      .sort((a, b) => D.toNumber(b[rule.scoreKey]) - D.toNumber(a[rule.scoreKey]));
  }

  function scopeLabel() {
    if (state.team !== "all") return `${state.team}内`;
    if (state.league === "セ") return "セ・リーグ";
    if (state.league === "パ") return "パ・リーグ";
    return "12球団";
  }

  function playerUrl(row) {
    return `./player?${new URLSearchParams({ name: row.選手名, team: row.チーム, type: state.type }).toString()}`;
  }

  function renderSummary(ranked) {
    const top = ranked[0];
    const rule = rankingRule();
    summary.innerHTML = `
      <article class="summary-card"><span>対象月</span><strong>${esc(M.monthLabel(state.month, true))}</strong></article>
      <article class="summary-card"><span>区分</span><strong>${esc(typeLabel())}</strong></article>
      <article class="summary-card"><span>ランキング対象</span><strong>${esc(ranked.length)}人</strong></article>
      <article class="summary-card"><span>1位</span><strong>${top ? esc(top.選手名) : "—"}</strong><small>${top ? `${esc(top.チーム)} / Score ${esc(top[rule.scoreKey].toFixed(1))}` : "対象者なし"}</small></article>`;
  }

  function renderTable(ranked) {
    const rule = rankingRule();
    const search = nameKey(state.search);
    const visible = search ? ranked.filter((row) => nameKey(row.選手名).includes(search)) : ranked;
    title.textContent = `${M.monthLabel(state.month, true)} ${scopeLabel()} ${typeLabel()}月間ランキング`;
    count.textContent = search ? `${visible.length}人 / ランキング対象 ${ranked.length}人` : `${ranked.length}人`;

    if (state.type === "pitcher") {
      head.innerHTML = "<tr><th>順位</th><th>投手</th><th>球団</th><th>Score</th><th>登板</th><th>先発</th><th>投球回</th><th>防御率</th><th>WHIP</th><th>勝敗</th><th>奪三振</th><th>セーブ / HP</th></tr>";
      body.innerHTML = visible.length ? visible.map((row) => {
        const rank = ranked.indexOf(row) + 1;
        return `<tr><td>${rank}</td><td><a href="${esc(playerUrl(row))}">${esc(row.選手名)}</a></td><td>${esc(row.チーム)}</td><td class="score">${esc(row[rule.scoreKey].toFixed(1))}</td><td>${esc(row.登板)}</td><td>${esc(row.先発)}</td><td>${esc(row.投球回)}</td><td>${esc(dec2(row.防御率))}</td><td>${esc(Number(row.WHIP).toFixed(3))}</td><td>${esc(`${row.勝利}勝${row.敗戦}敗`)}</td><td>${esc(row.奪三振)}</td><td>${esc(`${row.セーブ} / ${row.ＨＰ}`)}</td></tr>`;
      }).join("") : '<tr><td colspan="12" class="empty-state">条件に合う投手はいません。</td></tr>';
    } else {
      head.innerHTML = "<tr><th>順位</th><th>選手</th><th>球団</th><th>Score</th><th>試合</th><th>打席</th><th>打率</th><th>OPS</th><th>安打</th><th>本塁打</th><th>打点</th><th>盗塁</th></tr>";
      body.innerHTML = visible.length ? visible.map((row) => {
        const rank = ranked.indexOf(row) + 1;
        return `<tr><td>${rank}</td><td><a href="${esc(playerUrl(row))}">${esc(row.選手名)}</a></td><td>${esc(row.チーム)}</td><td class="score">${esc(row[rule.scoreKey].toFixed(1))}</td><td>${esc(row.試合)}</td><td>${esc(row.打席)}</td><td>${esc(avg(row.打率))}</td><td>${esc(dec3(row.OPS))}</td><td>${esc(row.安打)}</td><td>${esc(row.本塁打)}</td><td>${esc(row.打点)}</td><td>${esc(row.盗塁)}</td></tr>`;
      }).join("") : '<tr><td colspan="12" class="empty-state">条件に合う野手はいません。</td></tr>';
    }
    if (typeof D.enhanceCompactTables === "function") D.enhanceCompactTables(document.getElementById("monthlyRankingCard"));
  }

  function render() {
    typeButtons.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.type === state.type;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    leagueSelect.value = state.league;
    teamSelect.value = state.team;
    searchInput.value = state.search;
    const ranked = scopedRankedRows();
    renderSummary(ranked);
    renderTable(ranked);
    status.textContent = `${M.monthLabel(state.month, true)} / ${typeLabel()} / ${scopeLabel()}`;
  }

  async function loadType(type) {
    state.type = type;
    status.textContent = "データ読込中";
    state.rows = await M.load(type);
    renderMonthTabs();
    populateTeams();
    syncUrl();
    render();
  }

  typeButtons.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.type === state.type) return;
      state.month = "";
      state.league = "all";
      state.team = "all";
      state.search = "";
      await loadType(button.dataset.type);
    });
  });

  leagueSelect.addEventListener("change", () => {
    state.league = leagueSelect.value;
    populateTeams();
    render();
  });
  teamSelect.addEventListener("change", () => {
    state.team = teamSelect.value;
    render();
  });
  searchInput.addEventListener("input", () => {
    state.search = searchInput.value;
    render();
  });
  resetButton.addEventListener("click", () => {
    state.league = "all";
    state.team = "all";
    state.search = "";
    populateTeams();
    render();
  });

  try {
    await loadType(state.type);
  } catch (error) {
    status.textContent = "読込エラー";
    body.innerHTML = `<tr><td class="empty-state">${esc(error.message || "月別成績を読み込めませんでした。")}</td></tr>`;
  }
})();
