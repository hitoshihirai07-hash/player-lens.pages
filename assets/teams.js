(async function () {
  const D = window.PlayerLensData;
  const grid = document.getElementById("teamGrid");

  function metricLine(row, type, scoreKey) {
    if (!row) return "該当なし";
    const score = D.formatValue(row[scoreKey], "スコア");
    return `<a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a><span>${score}</span>`;
  }

  try {
    const [data, fieldingRows, interleague] = await Promise.all([D.loadData(), D.loadFieldingData(), D.loadInterleagueData()]);
    const batterRanking = D.RANKINGS.find((ranking) => ranking.id === "batter-overall");
    const pitcherRanking = D.RANKINGS.find((ranking) => ranking.id === "pitcher-overall");
    const youngRanking = D.RANKINGS.find((ranking) => ranking.id === "batter-young");

    function teamCard(team) {
      const topBatter = D.rankRows(data.batters, batterRanking, team, 1)[0];
      const topPitcher = D.rankRows(data.pitchers, pitcherRanking, team, 1)[0];
      const topYoung = D.rankRows(data.batters, youngRanking, team, 1)[0];
      const topFielding = fieldingRows
        .filter((row) => row["チーム"] === team)
        .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))[0];
      const topInterleagueBatter = interleague.batters
        .filter((row) => row["チーム"] === team && D.toNumber(row["打数"]) >= 8)
        .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))[0];
      const topInterleaguePitcher = interleague.pitchers
        .filter((row) => row["チーム"] === team && D.toNumber(row["投球アウト数"]) >= 6)
        .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))[0];
      const batterCount = data.batters.filter((row) => row["チーム"] === team).length;
      const pitcherCount = data.pitchers.filter((row) => row["チーム"] === team).length;
      const fieldingCount = fieldingRows.filter((row) => row["チーム"] === team).length;
      const interleagueCount = interleague.batters.filter((row) => row["チーム"] === team && D.toNumber(row["打数"]) >= 8).length + interleague.pitchers.filter((row) => row["チーム"] === team && D.toNumber(row["投球アウト数"]) >= 6).length;
      const fieldingType = topFielding?.["ポジション"] === "投手" ? "pitcher" : "batter";

      return `
        <article class="team-card">
          <div class="team-card-head">
            <p class="eyebrow">${D.escapeHtml(D.TEAM_TO_FULL[team] || team)}</p>
            <h2>${D.escapeHtml(team)}</h2>
          </div>
          <dl class="team-picks">
            <div><dt>打者</dt><dd>${metricLine(topBatter, "batter", "打者総合スコア")}</dd></div>
            <div><dt>投手</dt><dd>${metricLine(topPitcher, "pitcher", "投手総合スコア")}</dd></div>
            <div><dt>守備</dt><dd>${metricLine(topFielding, fieldingType, "守備評価")}</dd></div>
            <div><dt>若手</dt><dd>${metricLine(topYoung, "batter", "若手スコア")}</dd></div>
            <div><dt>交流戦野手</dt><dd>${metricLine(topInterleagueBatter, "batter", "交流戦スコア")}</dd></div>
            <div><dt>交流戦投手</dt><dd>${metricLine(topInterleaguePitcher, "pitcher", "交流戦スコア")}</dd></div>
          </dl>
          <div class="team-counts">
            <span>打者 ${batterCount}</span>
            <span>投手 ${pitcherCount}</span>
            <span>守備 ${fieldingCount}</span>
            <span>交流戦 ${interleagueCount}</span>
          </div>
          <a class="text-link" href="${D.teamUrl(team)}">詳しく見る</a>
        </article>
      `;
    }

    const centralTeams = data.teams.filter((team) => D.leagueOfTeam(team) === "セ");
    const pacificTeams = data.teams.filter((team) => D.leagueOfTeam(team) === "パ");

    grid.innerHTML = `
      <section class="league-section">
        <div class="section-heading"><h2>セ・リーグ</h2><span>${centralTeams.length}球団</span></div>
        <div class="team-grid">${centralTeams.map(teamCard).join("")}</div>
      </section>
      <section class="league-section">
        <div class="section-heading"><h2>パ・リーグ</h2><span>${pacificTeams.length}球団</span></div>
        <div class="team-grid">${pacificTeams.map(teamCard).join("")}</div>
      </section>
    `;
  } catch (error) {
    grid.innerHTML = `<article class="content-card">${D.escapeHtml(error.message)}</article>`;
  }
})();
