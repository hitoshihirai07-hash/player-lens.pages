(async function () {
  const D = window.PlayerLensData;
  const params = new URLSearchParams(location.search);
  const root = location.pathname.includes("/teams/") ? "../" : "./";
  const team = document.body.dataset.team || params.get("team") || "阪神";
  const teamTitle = document.getElementById("teamTitle");
  const teamLead = document.getElementById("teamLead");
  const summary = document.getElementById("teamSummary");
  const sections = document.getElementById("teamSections");

  function table(rows, type, scoreKey, columns) {
    if (!rows.length) return `<p class="empty-state">該当データなし</p>`;
    return `
      <div class="compact-table-wrap">
        <table class="compact-table">
          <thead><tr><th>順位</th><th>選手</th><th>スコア</th>${columns.map((column) => `<th>${D.escapeHtml(column)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <td class="rank">${index + 1}</td>
                <td><a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a></td>
                <td class="score">${D.formatValue(row[scoreKey], "スコア")}</td>
                ${columns.map((column) => `<td>${D.escapeHtml(D.formatValue(row[column], column))}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function rankingSection(title, rows, type, scoreKey, columns) {
    return `
      <article class="content-card">
        <div class="section-heading">
          <h2>${D.escapeHtml(title)}</h2>
          <a href="${root}guide.html">見方</a>
        </div>
        ${table(rows, type, scoreKey, columns)}
      </article>
    `;
  }

  try {
    const data = await D.loadData();
    const batters = data.batters.filter((row) => row["チーム"] === team);
    const pitchers = data.pitchers.filter((row) => row["チーム"] === team);
    const fullTeam = D.TEAM_TO_FULL[team] || team;
    document.title = `${team} チーム別ランキング | Player Lens`;
    teamTitle.textContent = `${team} チーム別ランキング`;
    teamLead.textContent = `${fullTeam}の打者、投手、若手、左右別の注目選手をまとめています。`;

    summary.innerHTML = [
      ["打者", batters.length],
      ["投手", pitchers.length],
      ["25歳以下", batters.concat(pitchers).filter((row) => D.toNumber(row["年齢"]) <= 25).length],
      ["一軍", batters.concat(pitchers).filter((row) => row["一軍"] === "TRUE").length],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${value}</strong></article>`).join("");

    const byId = Object.fromEntries(D.RANKINGS.map((ranking) => [ranking.id, ranking]));
    sections.innerHTML = [
      rankingSection("打者総合", D.rankRows(data.batters, byId["batter-overall"], team, 10), "batter", "打者総合スコア", ["打席", "OPS", "本塁打", "打点"]),
      rankingSection("規定打席到達", D.rankRows(data.batters, byId["batter-qualified"], team, 10), "batter", "打者総合スコア", ["打席", "規定打席目安", "OPS", "本塁打"]),
      rankingSection("投手総合", D.rankRows(data.pitchers, byId["pitcher-overall"], team, 10), "pitcher", "投手総合スコア", ["投球回", "防御率", "奪三振", "勝利"]),
      rankingSection("規定投球回到達", D.rankRows(data.pitchers, byId["pitcher-qualified"], team, 10), "pitcher", "投手総合スコア", ["投球回", "規定投球回目安", "防御率", "奪三振"]),
      rankingSection("25歳以下打者", D.rankRows(data.batters, byId["batter-young"], team, 10), "batter", "若手スコア", ["年齢", "打席", "OPS", "本塁打"]),
      rankingSection("若手投手", D.rankRows(data.pitchers, byId["pitcher-young"], team, 10), "pitcher", "若手投手スコア", ["年齢", "投球回", "防御率", "奪三振"]),
      rankingSection("対右に強い打者", D.rankRows(data.batters, byId["batter-vs-right"], team, 8), "batter", "対右スコア", ["対右打数", "対右打率", "対右本塁打"]),
      rankingSection("対左に強い打者", D.rankRows(data.batters, byId["batter-vs-left"], team, 8), "batter", "対左スコア", ["対左打数", "対左打率", "対左本塁打"]),
    ].join("");
    D.enhanceCompactTables(sections);
  } catch (error) {
    sections.innerHTML = `<article class="content-card">${D.escapeHtml(error.message)}</article>`;
  }
})();
