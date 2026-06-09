(async function () {
  const D = window.PlayerLensData;
  const grid = document.getElementById("teamGrid");
  const totalsLeague = document.getElementById("teamTotalsLeague");
  const totalsRanking = document.getElementById("teamTotalsRanking");

  function metricLine(row, type, scoreKey) {
    if (!row) return "該当なし";
    const score = D.formatValue(row[scoreKey], "スコア");
    return `<a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a><span>${score}</span>`;
  }

  function renderTeamTotals(teamTotals) {
    if (!totalsRanking) return;
    const league = totalsLeague?.value || "all";
    const rows = teamTotals
      .filter((row) => league === "all" || row["リーグ"] === league)
      .sort((a, b) => D.toNumber(b["総合評価"]) - D.toNumber(a["総合評価"]));
    totalsRanking.innerHTML = rows.length ? `
      <div class="compact-table-wrap">
        <table class="compact-table">
          <thead>
            <tr>
              <th>順位</th>
              <th>チーム</th>
              <th>打率</th>
              <th>本塁打</th>
              <th>打点</th>
              <th>チーム防御率目安</th>
              <th>打撃評価</th>
              <th>投手評価</th>
              <th>守備評価</th>
              <th>総合評価</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <td class="rank">${index + 1}</td>
                <td><a href="${D.teamUrl(row["チーム"])}">${D.escapeHtml(row["チーム"])}</a></td>
                <td>${D.formatValue(row["打率"], "打率")}</td>
                <td>${D.escapeHtml(row["本塁打"])}</td>
                <td>${D.escapeHtml(row["打点"])}</td>
                <td>${D.formatValue(row["防御率目安"], "防御率目安")}</td>
                <td class="score">${D.formatValue(row["打撃評価"], "スコア")}</td>
                <td class="score">${D.formatValue(row["投手評価"], "スコア")}</td>
                <td class="score">${D.formatValue(row["守備評価"], "スコア")}</td>
                <td class="score">${D.formatValue(row["総合評価"], "スコア")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="empty-state">該当データなし</p>`;
    D.enhanceCompactTables(totalsRanking);
  }

  try {
    const [data, fieldingRows, interleague] = await Promise.all([D.loadData(), D.loadFieldingData(), D.loadInterleagueData()]);
    const teamTotals = D.buildTeamTotals(data, fieldingRows);
    const batterRanking = D.RANKINGS.find((ranking) => ranking.id === "batter-overall");
    const pitcherRanking = D.RANKINGS.find((ranking) => ranking.id === "pitcher-overall");
    const youngRanking = D.RANKINGS.find((ranking) => ranking.id === "batter-young");

    function teamCard(team) {
      const teamTotal = teamTotals.find((row) => row["チーム"] === team);
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
            <span>総合評価 ${teamTotal ? D.formatValue(teamTotal["総合評価"], "スコア") : "-"}</span>
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
    renderTeamTotals(teamTotals);
    totalsLeague?.addEventListener("change", () => renderTeamTotals(teamTotals));
  } catch (error) {
    grid.innerHTML = `<article class="content-card">${D.escapeHtml(error.message)}</article>`;
  }
})();
