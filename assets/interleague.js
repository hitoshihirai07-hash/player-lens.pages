(async function () {
  const D = window.PlayerLensData;
  const state = {
    league: "all",
    team: "all",
    type: "batter",
    sort: "score",
  };
  const els = {
    league: document.getElementById("interleagueLeague"),
    team: document.getElementById("interleagueTeam"),
    type: document.getElementById("interleagueType"),
    sort: document.getElementById("interleagueSort"),
    summary: document.getElementById("interleagueSummary"),
    title: document.getElementById("interleagueRankingTitle"),
    lead: document.getElementById("interleagueRankingLead"),
    ranking: document.getElementById("interleagueRanking"),
    teamTops: document.getElementById("interleagueTeamTops"),
  };
  const sortOptions = {
    batter: [
      ["score", "野手総合"],
      ["ops", "OPS"],
      ["power", "長打"],
      ["hr", "本塁打"],
      ["rbi", "打点"],
    ],
    pitcher: [
      ["score", "投手総合"],
      ["era", "防御率"],
      ["whip", "WHIP"],
      ["strikeouts", "奪三振"],
    ],
  };
  let data = { batters: [], pitchers: [] };

  function scoped(row) {
    return (state.league === "all" || row["リーグ"] === state.league) && (state.team === "all" || row["チーム"] === state.team);
  }

  function teamLink(team) {
    return `<a href="${D.teamUrl(team)}">${D.escapeHtml(team)}</a>`;
  }

  function playerLink(row, type) {
    return `<a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a>`;
  }

  function table(headers, rows, emptyText = "該当データなし") {
    if (!rows.length) return `<p class="empty-state">${D.escapeHtml(emptyText)}</p>`;
    return `
      <div class="compact-table-wrap">
        <table class="compact-table">
          <thead><tr>${headers.map((header) => `<th>${D.escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    `;
  }

  function batterRows() {
    return data.batters.filter(scoped).filter((row) => D.toInt(row["打数"]) >= 8);
  }

  function pitcherRows() {
    return data.pitchers.filter(scoped).filter((row) => D.toInt(row["投球アウト数"]) >= 6);
  }

  function sortRows(rows, type) {
    const sort = state.sort;
    const value = (row, key) => D.toNumber(row[key]);
    const sorted = [...rows];
    if (type === "batter") {
      if (sort === "ops") return sorted.sort((a, b) => value(b, "OPS") - value(a, "OPS") || value(b, "打数") - value(a, "打数"));
      if (sort === "power") return sorted.sort((a, b) => value(b, "長打率") - value(a, "長打率") || value(b, "ISO") - value(a, "ISO"));
      if (sort === "hr") return sorted.sort((a, b) => value(b, "本塁打") - value(a, "本塁打") || value(b, "OPS") - value(a, "OPS"));
      if (sort === "rbi") return sorted.sort((a, b) => value(b, "打点") - value(a, "打点") || value(b, "OPS") - value(a, "OPS"));
      return sorted.sort((a, b) => value(b, "交流戦スコア") - value(a, "交流戦スコア"));
    }
    if (sort === "era") return sorted.sort((a, b) => value(a, "防御率") - value(b, "防御率") || value(b, "投球アウト数") - value(a, "投球アウト数"));
    if (sort === "whip") return sorted.sort((a, b) => value(a, "WHIP") - value(b, "WHIP") || value(b, "投球アウト数") - value(a, "投球アウト数"));
    if (sort === "strikeouts") return sorted.sort((a, b) => value(b, "奪三振") - value(a, "奪三振") || value(b, "投球アウト数") - value(a, "投球アウト数"));
    return sorted.sort((a, b) => value(b, "交流戦スコア") - value(a, "交流戦スコア"));
  }

  function renderSortOptions() {
    const current = sortOptions[state.type].some(([value]) => value === state.sort) ? state.sort : "score";
    state.sort = current;
    els.sort.innerHTML = sortOptions[state.type].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    els.sort.value = current;
  }

  function renderTeamOptions() {
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => state.league === "all" || D.leagueOfTeam(team) === state.league);
    if (state.team !== "all" && !teams.includes(state.team)) state.team = "all";
    els.team.innerHTML = `<option value="all">全チーム</option>${teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`).join("")}`;
    els.team.value = state.team;
  }

  function renderSummary() {
    const batters = batterRows();
    const pitchers = pitcherRows();
    const topBatter = sortRows(batters, "batter")[0];
    const topPitcher = sortRows(pitchers, "pitcher")[0];
    const items = [
      ["野手対象", batters.length],
      ["投手対象", pitchers.length],
      ["対象球団", Object.keys(D.TEAM_TO_FULL).length],
      ["野手1位", topBatter ? topBatter["選手名"] : "-"],
      ["投手1位", topPitcher ? topPitcher["選手名"] : "-"],
    ];
    els.summary.innerHTML = items.map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(String(value))}</strong></article>`).join("");
  }

  function renderRanking() {
    const type = state.type;
    const rows = sortRows(type === "batter" ? batterRows() : pitcherRows(), type).slice(0, 30);
    const sortLabel = sortOptions[type].find(([value]) => value === state.sort)?.[1] || "総合";
    els.title.textContent = type === "batter" ? `交流戦 野手ランキング（${sortLabel}）` : `交流戦 投手ランキング（${sortLabel}）`;
    els.lead.textContent = type === "batter"
      ? "一定以上の打数がある野手を対象に、交流戦内の打撃内容を比べます。"
      : "一定以上の投球アウトがある投手を対象に、交流戦内の投球内容を比べます。";

    if (type === "batter") {
      const body = rows.map((row, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "batter")}</td>
          <td>${teamLink(row["チーム"])}</td>
          <td class="score">${D.formatValue(row["交流戦スコア"], "スコア")}</td>
          <td>${D.escapeHtml(row["打数"])}</td>
          <td>${D.formatValue(row["打率"], "打率")}</td>
          <td>${D.formatValue(row["OPS"], "OPS")}</td>
          <td>${D.escapeHtml(row["本塁打"])}</td>
          <td>${D.escapeHtml(row["打点"])}</td>
        </tr>
      `);
      els.ranking.innerHTML = table(["順位", "選手", "球団", "交流戦スコア", "打数", "打率", "OPS", "本塁打", "打点"], body);
    } else {
      const body = rows.map((row, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "pitcher")}</td>
          <td>${teamLink(row["チーム"])}</td>
          <td class="score">${D.formatValue(row["交流戦スコア"], "スコア")}</td>
          <td>${D.escapeHtml(row["投球回_交流戦"])}</td>
          <td>${D.formatValue(row["防御率"], "防御率")}</td>
          <td>${D.escapeHtml(row["奪三振"])}</td>
          <td>${D.escapeHtml(row["WHIP"])}</td>
        </tr>
      `);
      els.ranking.innerHTML = table(["順位", "選手", "球団", "交流戦スコア", "投球回", "防御率", "奪三振", "WHIP"], body);
    }
  }

  function renderTeamTops() {
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => (state.league === "all" || D.leagueOfTeam(team) === state.league) && (state.team === "all" || state.team === team));
    const body = teams.map((team) => {
      const topBatter = data.batters
        .filter((row) => row["チーム"] === team && D.toInt(row["打数"]) >= 8)
        .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))[0];
      const topPitcher = data.pitchers
        .filter((row) => row["チーム"] === team && D.toInt(row["投球アウト数"]) >= 6)
        .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))[0];
      return `
        <tr>
          <td>${teamLink(team)}</td>
          <td>${topBatter ? playerLink(topBatter, "batter") : "-"}</td>
          <td>${topBatter ? D.formatValue(topBatter["交流戦スコア"], "スコア") : "-"}</td>
          <td>${topPitcher ? playerLink(topPitcher, "pitcher") : "-"}</td>
          <td>${topPitcher ? D.formatValue(topPitcher["交流戦スコア"], "スコア") : "-"}</td>
        </tr>
      `;
    });
    els.teamTops.innerHTML = table(["球団", "野手1位", "野手評価", "投手1位", "投手評価"], body);
  }

  function render() {
    renderTeamOptions();
    renderSortOptions();
    renderSummary();
    renderRanking();
    renderTeamTops();
    D.enhanceCompactTables(document);
  }

  function bind() {
    els.league.addEventListener("change", () => {
      state.league = els.league.value;
      render();
    });
    els.team.addEventListener("change", () => {
      state.team = els.team.value;
      render();
    });
    els.type.addEventListener("change", () => {
      state.type = els.type.value;
      render();
    });
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      render();
    });
  }

  try {
    const params = new URLSearchParams(location.search);
    const initialTeam = params.get("team");
    data = await D.loadInterleagueData();
    if (initialTeam && D.TEAM_TO_FULL[initialTeam]) {
      state.team = initialTeam;
      state.league = D.leagueOfTeam(initialTeam) || "all";
    }
    bind();
    render();
  } catch (error) {
    els.ranking.innerHTML = `<p class="empty-state">${D.escapeHtml(error.message)}</p>`;
  }
})();
