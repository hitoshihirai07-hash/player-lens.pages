(async function () {
  const D = window.PlayerLensData;
  const params = new URLSearchParams(location.search);
  const initialTeam = params.get("team") || "all";
  const state = {
    league: initialTeam !== "all" && D.TEAM_TO_FULL[initialTeam] ? D.leagueOfTeam(initialTeam) : "all",
    team: D.TEAM_TO_FULL[initialTeam] ? initialTeam : "all",
    position: "(捕)",
  };
  const els = {
    league: document.getElementById("insightLeague"),
    team: document.getElementById("insightTeam"),
    summary: document.getElementById("insightSummary"),
    rookieRankings: document.getElementById("rookieRankings"),
    recentRankings: document.getElementById("recentRankings"),
    recentPeriod: document.getElementById("recentPeriod"),
    positionButtons: document.getElementById("positionButtons"),
    positionRanking: document.getElementById("positionRanking"),
    rookieList: document.getElementById("rookieList"),
    multiPositionList: document.getElementById("multiPositionList"),
  };
  let data;
  let insight;
  let batterMap;
  let pitcherMap;
  let recentBatterMap;
  let recentPitcherMap;

  function scoped(row) {
    return (state.league === "all" || row["リーグ"] === state.league) && (state.team === "all" || row["チーム"] === state.team);
  }

  function rowType(row) {
    return row["ポジション"] === "投手" ? "pitcher" : "batter";
  }

  function seasonRow(row, type = rowType(row)) {
    const key = D.playerKey(row);
    return type === "pitcher" ? pitcherMap.get(key) : batterMap.get(key);
  }

  function recentRow(row, type = rowType(row)) {
    const key = D.playerKey(row);
    return type === "pitcher" ? recentPitcherMap.get(key) : recentBatterMap.get(key);
  }

  function scoreKey(type) {
    return type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
  }

  function playerCell(row, type = rowType(row), season = seasonRow(row, type)) {
    const name = D.escapeHtml(row["選手名"]);
    return season ? `<a href="${D.playerUrl(season, type)}">${name}</a>` : name;
  }

  function teamCell(row) {
    return `<a href="${D.teamUrl(row["チーム"])}">${D.escapeHtml(row["チーム"])}</a>`;
  }

  function periodLabel(rows) {
    const period = rows.find((row) => row["期間"])?.["期間"] || "";
    return period ? period.replace("_", " - ") : "";
  }

  function table(headers, bodyRows, emptyText = "該当データなし") {
    if (!bodyRows.length) return `<p class="empty-state">${D.escapeHtml(emptyText)}</p>`;
    return `
      <div class="compact-table-wrap">
        <table class="compact-table">
          <thead><tr>${headers.map((header) => `<th>${D.escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${bodyRows.join("")}</tbody>
        </table>
      </div>
    `;
  }

  function rankedRookies(type) {
    return insight.rookies
      .filter((row) => rowType(row) === type)
      .filter(scoped)
      .map((row) => {
        const season = seasonRow(row, type);
        const recent = recentRow(row, type);
        return { row, season, recent };
      })
      .filter((item) => item.season)
      .sort((a, b) => D.toNumber(b.season[scoreKey(type)]) - D.toNumber(a.season[scoreKey(type)]))
      .slice(0, 10);
  }

  function renderRookieRankings() {
    function block(title, type) {
      const rows = rankedRookies(type).map(({ row, season, recent }, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerCell(row, type, season)}</td>
          <td>${teamCell(row)}</td>
          <td class="score">${D.formatValue(season[scoreKey(type)], "スコア")}</td>
          <td>${recent ? D.formatValue(recent["直近スコア"], "スコア") : "-"}</td>
        </tr>
      `);
      return `
        <section class="mini-ranking">
          <h3>${D.escapeHtml(title)}</h3>
          ${table(["順位", "選手", "球団", "今季評価", "直近評価"], rows)}
        </section>
      `;
    }
    els.rookieRankings.innerHTML = block("候補打者", "batter") + block("候補投手", "pitcher");
  }

  function renderRecentRankings() {
    const batters = insight.recentBatters
      .filter(scoped)
      .filter((row) => D.toNumber(row["打数"]) >= 4)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))
      .slice(0, 10);
    const pitchers = insight.recentPitchers
      .filter(scoped)
      .filter((row) => D.toNumber(row["投球アウト数"]) >= 3)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))
      .slice(0, 10);

    els.recentPeriod.textContent = periodLabel(insight.recentBatters) || periodLabel(insight.recentPitchers);
    els.recentRankings.innerHTML = `
      <section class="mini-ranking">
        <h3>野手</h3>
        ${table(["順位", "選手", "球団", "評価", "打率", "OPS", "本塁打", "打点"], batters.map((row, index) => {
          const season = seasonRow(row, "batter");
          return `
            <tr>
              <td class="rank">${index + 1}</td>
              <td>${playerCell(row, "batter", season)}</td>
              <td>${teamCell(row)}</td>
              <td class="score">${D.formatValue(row["直近スコア"], "スコア")}</td>
              <td>${D.formatValue(row["打率"], "打率")}</td>
              <td>${D.formatValue(row["OPS"], "OPS")}</td>
              <td>${D.escapeHtml(row["本塁打"])}</td>
              <td>${D.escapeHtml(row["打点"])}</td>
            </tr>
          `;
        }))}
      </section>
      <section class="mini-ranking">
        <h3>投手</h3>
        ${table(["順位", "選手", "球団", "評価", "投球回", "防御率", "奪三振", "WHIP"], pitchers.map((row, index) => {
          const season = seasonRow(row, "pitcher");
          return `
            <tr>
              <td class="rank">${index + 1}</td>
              <td>${playerCell(row, "pitcher", season)}</td>
              <td>${teamCell(row)}</td>
              <td class="score">${D.formatValue(row["直近スコア"], "スコア")}</td>
              <td>${D.escapeHtml(row["投球回"])}</td>
              <td>${D.formatValue(row["防御率"], "防御率")}</td>
              <td>${D.escapeHtml(row["奪三振"])}</td>
              <td>${D.escapeHtml(row["WHIP"])}</td>
            </tr>
          `;
        }))}
      </section>
    `;
  }

  function positionScoreType(positionKey) {
    return D.START_POSITIONS.find((item) => item.key === positionKey)?.type || "batter";
  }

  function startsForPosition(row, position) {
    const keys = position.keys || [position.key];
    return keys.reduce((sum, key) => sum + D.toInt(row[key]), 0);
  }

  function renderPositionButtons() {
    els.positionButtons.innerHTML = D.START_POSITIONS.map((position) => `
      <button type="button" data-position="${D.escapeHtml(position.key)}" aria-pressed="${position.key === state.position ? "true" : "false"}">${D.escapeHtml(position.label)}</button>
    `).join("");
    els.positionButtons.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.position = button.dataset.position;
        render();
      });
    });
  }

  function renderPositionRanking() {
    const position = D.START_POSITIONS.find((item) => item.key === state.position) || D.START_POSITIONS[1];
    const type = positionScoreType(position.key);
    const rows = insight.starterPositions
      .filter(scoped)
      .map((row) => {
        const starts = startsForPosition(row, position);
        const season = seasonRow(row, type);
        return { row, starts, season };
      })
      .filter((item) => item.starts > 0 && item.season)
      .sort((a, b) => D.toNumber(b.season[scoreKey(type)]) - D.toNumber(a.season[scoreKey(type)]) || b.starts - a.starts)
      .slice(0, 30)
      .map(({ row, starts, season }, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerCell(row, type, season)}</td>
          <td>${teamCell(row)}</td>
          <td>${D.escapeHtml(row["ポジション"])}</td>
          <td>${starts}</td>
          <td class="score">${D.formatValue(season[scoreKey(type)], "スコア")}</td>
          <td>${type === "pitcher" ? D.escapeHtml(season["投球回"]) : D.escapeHtml(season["打席"])}</td>
        </tr>
      `);
    els.positionRanking.innerHTML = table(["順位", "選手", "球団", "登録", `${position.label}先発`, "今季評価", type === "pitcher" ? "投球回" : "打席"], rows);
  }

  function positionCount(row) {
    return D.START_POSITIONS.filter((position) => startsForPosition(row, position) > 0).length;
  }

  function totalStarts(row) {
    return D.START_POSITIONS.reduce((sum, position) => sum + startsForPosition(row, position), 0);
  }

  function renderRookieList() {
    const rows = insight.rookies
      .filter(scoped)
      .sort((a, b) => a["チーム"].localeCompare(b["チーム"], "ja") || a["ポジション"].localeCompare(b["ポジション"], "ja") || a["選手名"].localeCompare(b["選手名"], "ja"))
      .map((row) => {
        const type = rowType(row);
        const season = seasonRow(row, type);
        const recent = recentRow(row, type);
        return `
          <tr>
            <td>${teamCell(row)}</td>
            <td>${playerCell(row, type, season)}</td>
            <td>${D.escapeHtml(row["ポジション"])}</td>
            <td>${season ? D.formatValue(season[scoreKey(type)], "スコア") : "-"}</td>
            <td>${recent ? D.formatValue(recent["直近スコア"], "スコア") : "-"}</td>
          </tr>
        `;
      });
    els.rookieList.innerHTML = table(["球団", "選手", "ポジション", "今季評価", "直近評価"], rows, "候補選手が見つかりませんでした");
  }

  function renderMultiPositionList() {
    const rows = insight.starterPositions
      .filter(scoped)
      .map((row) => {
        const count = positionCount(row);
        const type = row["ポジション"] === "投手" ? "pitcher" : "batter";
        const season = seasonRow(row, type);
        const positions = D.START_POSITIONS.filter((position) => startsForPosition(row, position) > 0).map((position) => position.label).join("・");
        return { row, count, type, season, positions, starts: totalStarts(row) };
      })
      .filter((item) => item.count >= 2 && item.season)
      .sort((a, b) => b.count - a.count || D.toNumber(b.season[scoreKey(b.type)]) - D.toNumber(a.season[scoreKey(a.type)]))
      .slice(0, 20)
      .map(({ row, count, type, season, positions, starts }, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerCell(row, type, season)}</td>
          <td>${teamCell(row)}</td>
          <td>${count}</td>
          <td>${starts}</td>
          <td>${D.escapeHtml(positions)}</td>
          <td class="score">${D.formatValue(season[scoreKey(type)], "スコア")}</td>
        </tr>
      `);
    els.multiPositionList.innerHTML = table(["順位", "選手", "球団", "位置数", "先発数", "守備位置", "今季評価"], rows);
  }

  function renderSummary() {
    const scopedRookies = insight.rookies.filter(scoped);
    const scopedRecentBatters = insight.recentBatters.filter(scoped).filter((row) => D.toNumber(row["打数"]) >= 4);
    const scopedRecentPitchers = insight.recentPitchers.filter(scoped).filter((row) => D.toNumber(row["投球アウト数"]) >= 3);
    const multi = insight.starterPositions.filter(scoped).filter((row) => positionCount(row) >= 2).length;
    els.summary.innerHTML = [
      ["新人王候補", scopedRookies.length],
      ["直近野手", scopedRecentBatters.length],
      ["直近投手", scopedRecentPitchers.length],
      ["複数位置", multi],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${Number(value).toLocaleString("ja-JP")}</strong></article>`).join("");
  }

  function renderTeamOptions() {
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => state.league === "all" || D.leagueOfTeam(team) === state.league);
    if (state.team !== "all" && !teams.includes(state.team)) state.team = "all";
    const allLabel = state.league === "all" ? "全12球団" : `${state.league}・リーグ全体`;
    els.team.innerHTML = [
      `<option value="all">${D.escapeHtml(allLabel)}</option>`,
      ...teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`),
    ].join("");
    els.team.value = state.team;
    els.league.value = state.league;
  }

  function render() {
    renderTeamOptions();
    renderSummary();
    renderRookieRankings();
    renderRecentRankings();
    renderPositionButtons();
    renderPositionRanking();
    renderRookieList();
    renderMultiPositionList();
    D.enhanceCompactTables(document.querySelector("main"));
  }

  try {
    data = await D.loadData();
    insight = await D.loadInsightData();
    batterMap = new Map(data.batters.map((row) => [D.playerKey(row), row]));
    pitcherMap = new Map(data.pitchers.map((row) => [D.playerKey(row), row]));
    recentBatterMap = new Map(insight.recentBatters.map((row) => [D.playerKey(row), row]));
    recentPitcherMap = new Map(insight.recentPitchers.map((row) => [D.playerKey(row), row]));

    els.league.addEventListener("change", () => {
      state.league = els.league.value;
      render();
    });
    els.team.addEventListener("change", () => {
      state.team = els.team.value;
      render();
    });
    render();
  } catch (error) {
    document.querySelector("main").innerHTML = `<section class="content-card">${D.escapeHtml(error.message)}</section>`;
  }
})();
