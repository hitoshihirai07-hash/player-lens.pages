(async function () {
  const D = window.PlayerLensData;
  const grid = document.getElementById("teamGrid");

  function metricLine(row, type, scoreKey) {
    if (!row) return "該当なし";
    const score = D.formatValue(row[scoreKey], "スコア");
    return `<a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a><span>${score}</span>`;
  }

  try {
    const data = await D.loadData();
    const batterRanking = D.RANKINGS.find((ranking) => ranking.id === "batter-overall");
    const pitcherRanking = D.RANKINGS.find((ranking) => ranking.id === "pitcher-overall");
    const youngRanking = D.RANKINGS.find((ranking) => ranking.id === "batter-young");

    grid.innerHTML = data.teams.map((team) => {
      const topBatter = D.rankRows(data.batters, batterRanking, team, 1)[0];
      const topPitcher = D.rankRows(data.pitchers, pitcherRanking, team, 1)[0];
      const topYoung = D.rankRows(data.batters, youngRanking, team, 1)[0];
      const batterCount = data.batters.filter((row) => row["チーム"] === team).length;
      const pitcherCount = data.pitchers.filter((row) => row["チーム"] === team).length;

      return `
        <article class="team-card">
          <div class="team-card-head">
            <p class="eyebrow">${D.escapeHtml(D.TEAM_TO_FULL[team] || team)}</p>
            <h2>${D.escapeHtml(team)}</h2>
          </div>
          <dl class="team-picks">
            <div><dt>打者</dt><dd>${metricLine(topBatter, "batter", "打者総合スコア")}</dd></div>
            <div><dt>投手</dt><dd>${metricLine(topPitcher, "pitcher", "投手総合スコア")}</dd></div>
            <div><dt>若手</dt><dd>${metricLine(topYoung, "batter", "若手スコア")}</dd></div>
          </dl>
          <div class="team-counts">
            <span>打者 ${batterCount}</span>
            <span>投手 ${pitcherCount}</span>
          </div>
          <a class="text-link" href="${D.teamUrl(team)}">詳しく見る</a>
        </article>
      `;
    }).join("");
  } catch (error) {
    grid.innerHTML = `<article class="content-card">${D.escapeHtml(error.message)}</article>`;
  }
})();
