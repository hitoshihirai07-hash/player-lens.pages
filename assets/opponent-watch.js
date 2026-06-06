(async function () {
  const D = window.PlayerLensData;
  const state = {
    league: "all",
    team: "巨人",
  };
  const els = {
    league: document.getElementById("opponentLeague"),
    team: document.getElementById("opponentTeam"),
    summary: document.getElementById("opponentSummary"),
    batters: document.getElementById("opponentBatters"),
    pitchers: document.getElementById("opponentPitchers"),
    interleague: document.getElementById("opponentInterleague"),
    recent: document.getElementById("opponentRecent"),
  };
  let season = { batters: [], pitchers: [] };
  let insights = { recentBatters: [], recentPitchers: [] };
  let interleague = { batters: [], pitchers: [] };

  function teamRows(rows) {
    return rows.filter((row) => row["チーム"] === state.team);
  }

  function playerLink(row, type) {
    return `<a class="ranking-player" href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a>`;
  }

  function metric(label, value) {
    return `<div><dt>${D.escapeHtml(label)}</dt><dd>${D.escapeHtml(value || "-")}</dd></div>`;
  }

  function card(row, type, scoreLabel, scoreValue, stats) {
    return `
      <article class="watch-card">
        <div class="ranking-card-head">
          <span class="mobile-rank">${D.escapeHtml(row.rank)}</span>
          <div>
            ${playerLink(row, type)}
            <div class="ranking-meta">${D.escapeHtml(row["チーム"])} / ${D.escapeHtml(row["ポジション"] || (type === "pitcher" ? "投手" : "野手"))}</div>
          </div>
        </div>
        <div class="mobile-score">
          <span>${D.escapeHtml(scoreLabel)}</span>
          <strong>${D.escapeHtml(scoreValue)}</strong>
        </div>
        <dl class="watch-metrics">${stats.join("")}</dl>
      </article>
    `;
  }

  function renderCards(target, rows, emptyText) {
    target.innerHTML = rows.length ? rows.join("") : `<p class="empty-state">${D.escapeHtml(emptyText)}</p>`;
  }

  function topSeasonBatters() {
    return teamRows(season.batters)
      .filter((row) => D.toInt(row["打席"]) >= 20)
      .sort((a, b) => D.toNumber(b["打者総合スコア"]) - D.toNumber(a["打者総合スコア"]))
      .slice(0, 5);
  }

  function topSeasonPitchers() {
    return teamRows(season.pitchers)
      .filter((row) => D.toNumber(row["投球回_計算用"]) >= 5)
      .sort((a, b) => D.toNumber(b["投手総合スコア"]) - D.toNumber(a["投手総合スコア"]))
      .slice(0, 5);
  }

  function topInterleagueRows() {
    const batters = teamRows(interleague.batters)
      .filter((row) => D.toInt(row["打数"]) >= 8)
      .map((row) => ({ ...row, type: "batter", score: D.toNumber(row["交流戦スコア"]) }));
    const pitchers = teamRows(interleague.pitchers)
      .filter((row) => D.toInt(row["投球アウト数"]) >= 6)
      .map((row) => ({ ...row, type: "pitcher", score: D.toNumber(row["交流戦スコア"]) }));
    return batters.concat(pitchers).sort((a, b) => b.score - a.score).slice(0, 6);
  }

  function topRecentRows() {
    const batters = teamRows(insights.recentBatters)
      .filter((row) => D.toInt(row["打数"]) >= 4)
      .map((row) => ({ ...row, type: "batter", score: D.toNumber(row["直近スコア"]) }));
    const pitchers = teamRows(insights.recentPitchers)
      .filter((row) => D.toInt(row["投球アウト数"]) >= 3)
      .map((row) => ({ ...row, type: "pitcher", score: D.toNumber(row["直近スコア"]) }));
    return batters.concat(pitchers).sort((a, b) => b.score - a.score).slice(0, 6);
  }

  function renderSummary() {
    const batters = teamRows(season.batters);
    const pitchers = teamRows(season.pitchers);
    const topBatter = topSeasonBatters()[0];
    const topPitcher = topSeasonPitchers()[0];
    const items = [
      ["相手球団", state.team],
      ["登録打者", batters.length],
      ["登録投手", pitchers.length],
      ["野手注目", topBatter ? topBatter["選手名"] : "-"],
      ["投手注目", topPitcher ? topPitcher["選手名"] : "-"],
    ];
    els.summary.innerHTML = items.map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value)}</strong></article>`).join("");
  }

  function renderBatters() {
    const rows = topSeasonBatters().map((row, index) => {
      const ranked = { ...row, rank: index + 1 };
      return card(ranked, "batter", "打者総合スコア", D.formatValue(row["打者総合スコア"], "スコア"), [
        metric("OPS", D.formatValue(row["OPS"], "OPS")),
        metric("本塁打", row["本塁打"]),
        metric("打点", row["打点"]),
        metric("打席", row["打席"]),
      ]);
    });
    renderCards(els.batters, rows, "警戒野手の対象がありません。");
  }

  function renderPitchers() {
    const rows = topSeasonPitchers().map((row, index) => {
      const ranked = { ...row, rank: index + 1 };
      return card(ranked, "pitcher", "投手総合スコア", D.formatValue(row["投手総合スコア"], "スコア"), [
        metric("防御率", D.formatValue(row["防御率"], "防御率")),
        metric("奪三振", row["奪三振"]),
        metric("登板", row["登板"]),
        metric("投球回", row["投球回"]),
      ]);
    });
    renderCards(els.pitchers, rows, "警戒投手の対象がありません。");
  }

  function renderInterleague() {
    const rows = topInterleagueRows().map((row, index) => {
      const type = row.type;
      const ranked = { ...row, rank: index + 1 };
      const stats = type === "pitcher"
        ? [
            metric("防御率", D.formatValue(row["防御率"], "防御率")),
            metric("WHIP", row["WHIP"]),
            metric("奪三振", row["奪三振"]),
            metric("投球回", row["投球回_交流戦"]),
          ]
        : [
            metric("OPS", D.formatValue(row["OPS"], "OPS")),
            metric("本塁打", row["本塁打"]),
            metric("打点", row["打点"]),
            metric("打数", row["打数"]),
          ];
      return card(ranked, type, "交流戦スコア", D.formatValue(row["交流戦スコア"], "スコア"), stats);
    });
    renderCards(els.interleague, rows, "交流戦の対象がありません。");
  }

  function renderRecent() {
    const rows = topRecentRows().map((row, index) => {
      const type = row.type;
      const ranked = { ...row, rank: index + 1 };
      const stats = type === "pitcher"
        ? [
            metric("防御率", D.formatValue(row["防御率"], "防御率")),
            metric("WHIP", row["WHIP"]),
            metric("奪三振", row["奪三振"]),
            metric("投球回", D.inningsFromOuts(row["投球アウト数"])),
          ]
        : [
            metric("OPS", D.formatValue(row["OPS"], "OPS")),
            metric("安打", row["安打"]),
            metric("本塁打", row["本塁打"]),
            metric("打数", row["打数"]),
          ];
      return card(ranked, type, "直近スコア", D.formatValue(row["直近スコア"], "スコア"), stats);
    });
    renderCards(els.recent, rows, "直近成績の対象がありません。");
  }

  function renderTeamOptions() {
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => state.league === "all" || D.leagueOfTeam(team) === state.league);
    if (!teams.includes(state.team)) state.team = teams[0] || "巨人";
    els.team.innerHTML = teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`).join("");
    els.team.value = state.team;
  }

  function syncUrl() {
    const url = new URL(location.href);
    url.searchParams.set("team", state.team);
    history.replaceState(null, "", url);
  }

  function render() {
    renderTeamOptions();
    renderSummary();
    renderBatters();
    renderPitchers();
    renderInterleague();
    renderRecent();
    syncUrl();
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
  }

  try {
    const params = new URLSearchParams(location.search);
    const initialTeam = params.get("team");
    if (initialTeam && D.TEAM_TO_FULL[initialTeam]) {
      state.team = initialTeam;
      state.league = D.leagueOfTeam(initialTeam) || "all";
    }
    els.league.value = state.league;
    [season, insights, interleague] = await Promise.all([
      D.loadData(),
      D.loadInsightData(),
      D.loadInterleagueData(),
    ]);
    bind();
    render();
  } catch (error) {
    els.summary.innerHTML = `<article class="content-card">${D.escapeHtml(error.message)}</article>`;
  }
})();
