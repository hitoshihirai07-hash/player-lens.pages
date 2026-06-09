(async function () {
  const D = window.PlayerLensData;
  const params = new URLSearchParams(location.search);
  const root = location.pathname.includes("/teams/") ? "../" : "./";
  const team = document.body.dataset.team || params.get("team") || "阪神";
  const teamTitle = document.getElementById("teamTitle");
  const teamLead = document.getElementById("teamLead");
  const overviewTitle = document.getElementById("teamOverviewTitle");
  const overviewText = document.getElementById("teamOverviewText");
  const highlights = document.getElementById("teamHighlights");
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

  function teamScopedUrl(page) {
    const params = new URLSearchParams({ team });
    return `${root}${page}?${params.toString()}`;
  }

  function scoreCard(label, row, type, scoreKey, meta = "") {
    if (!row) {
      return `<article class="team-highlight"><span>${D.escapeHtml(label)}</span><strong>該当なし</strong></article>`;
    }
    return `
      <article class="team-highlight">
        <span>${D.escapeHtml(label)}</span>
        <strong><a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a></strong>
        <small>${D.escapeHtml(meta || row["ポジション"] || row["チーム"] || "")} / ${D.formatValue(row[scoreKey], "スコア")}</small>
      </article>
    `;
  }

  function renderHighlights(data, insight, fieldingRows, interleague, byId) {
    if (!highlights) return;
    const topBatter = D.rankRows(data.batters, byId["batter-overall"], team, 1)[0];
    const topPitcher = D.rankRows(data.pitchers, byId["pitcher-overall"], team, 1)[0];
    const topYoungBatter = D.rankRows(data.batters, byId["batter-young"], team, 1)[0];
    const topYoungPitcher = D.rankRows(data.pitchers, byId["pitcher-young"], team, 1)[0];
    const topYoung = [topYoungBatter, topYoungPitcher]
      .filter(Boolean)
      .sort((a, b) => D.toNumber(b["若手スコア"] || b["若手投手スコア"]) - D.toNumber(a["若手スコア"] || a["若手投手スコア"]))[0];
    const topYoungType = topYoung?.["投手総合スコア"] !== undefined ? "pitcher" : "batter";
    const topYoungScore = topYoungType === "pitcher" ? "若手投手スコア" : "若手スコア";
    const topFielding = fieldingRows
      .filter((row) => row["チーム"] === team)
      .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))[0];
    const topFieldingType = topFielding?.["ポジション"] === "投手" ? "pitcher" : "batter";
    const recentBatter = insight.recentBatters
      .filter((row) => row["チーム"] === team && D.toNumber(row["打数"]) >= 4)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))[0];
    const recentPitcher = insight.recentPitchers
      .filter((row) => row["チーム"] === team && D.toNumber(row["投球アウト数"]) >= 3)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))[0];
    const interleagueBatter = interleague.batters
      .filter((row) => row["チーム"] === team && D.toNumber(row["打数"]) >= 8)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))[0];
    const interleaguePitcher = interleague.pitchers
      .filter((row) => row["チーム"] === team && D.toNumber(row["投球アウト数"]) >= 6)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))[0];

    highlights.innerHTML = `
      <section class="content-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Team Focus</p>
            <h2>このチームの注目ポイント</h2>
          </div>
        </div>
        <p class="small-note">打者、投手、守備、若手、直近成績、交流戦から、チーム内で見ておきたい選手をまとめています。</p>
        <div class="team-highlight-grid">
          ${scoreCard("打者", topBatter, "batter", "打者総合スコア", "打者総合")}
          ${scoreCard("投手", topPitcher, "pitcher", "投手総合スコア", "投手総合")}
          ${scoreCard("守備", topFielding, topFieldingType, "守備評価", topFielding?.["ポジション"])}
          ${scoreCard("若手", topYoung, topYoungType, topYoungScore, `${topYoung?.["年齢"] || "-"}歳`)}
          ${scoreCard("直近野手", recentBatter, "batter", "直近スコア", "直近6日")}
          ${scoreCard("直近投手", recentPitcher, "pitcher", "直近スコア", "直近6日")}
          ${scoreCard("交流戦野手", interleagueBatter, "batter", "交流戦スコア", "交流戦")}
          ${scoreCard("交流戦投手", interleaguePitcher, "pitcher", "交流戦スコア", "交流戦")}
        </div>
        <div class="resource-grid compact-links">
          <a href="${teamScopedUrl("insights.html")}">直近・新人王候補を見る</a>
          <a href="${teamScopedUrl("interleague.html")}">交流戦ランキングを見る</a>
          <a href="${teamScopedUrl("defense.html")}">守備データを見る</a>
          <a href="${root}guide.html">スコアの見方を見る</a>
        </div>
      </section>
    `;
  }

  function interleagueSection(title, rows, type, columns) {
    return rankingSection(title, rows, type, "交流戦スコア", columns);
  }

  function fieldingSection(rows) {
    const bodyRows = rows
      .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))
      .slice(0, 10);
    const tableHtml = bodyRows.length ? `
      <div class="compact-table-wrap">
        <table class="compact-table">
          <thead><tr><th>順位</th><th>選手</th><th>位置</th><th>守備評価</th><th>試合</th><th>守備率</th><th>失策</th></tr></thead>
          <tbody>
            ${bodyRows.map((row, index) => {
              const type = row["ポジション"] === "投手" ? "pitcher" : "batter";
              return `
                <tr>
                  <td class="rank">${index + 1}</td>
                  <td><a href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a></td>
                  <td>${D.escapeHtml(row["ポジション"])}</td>
                  <td class="score">${D.formatValue(row["守備評価"], "スコア")}</td>
                  <td>${D.escapeHtml(row["試合"])}</td>
                  <td>${D.formatValue(row["守備率"], "守備率")}</td>
                  <td>${D.escapeHtml(row["失策"])}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="empty-state">該当データなし</p>`;
    return `
      <article class="content-card">
        <div class="section-heading">
          <h2>守備評価</h2>
          <a href="${root}defense.html">守備データ</a>
        </div>
        ${tableHtml}
      </article>
    `;
  }

  try {
    const [data, insight, fieldingRows, interleague] = await Promise.all([D.loadData(), D.loadInsightData(), D.loadFieldingData(), D.loadInterleagueData()]);
    const batters = data.batters.filter((row) => row["チーム"] === team);
    const pitchers = data.pitchers.filter((row) => row["チーム"] === team);
    const fielding = fieldingRows.filter((row) => row["チーム"] === team);
    const teamTotal = D.buildTeamTotals(data, fieldingRows).find((row) => row["チーム"] === team);
    const interleagueBatters = interleague.batters
      .filter((row) => row["チーム"] === team && D.toNumber(row["打数"]) >= 8)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))
      .slice(0, 10);
    const interleaguePitchers = interleague.pitchers
      .filter((row) => row["チーム"] === team && D.toNumber(row["投球アウト数"]) >= 6)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))
      .slice(0, 10);
    const profile = D.teamProfile(team);
    const fullTeam = profile.full;
    document.title = `${team} チーム別ランキング | Player Lens`;
    teamTitle.textContent = `${team} チーム別ランキング`;
    teamLead.textContent = `${fullTeam}の打者、投手、守備、若手、左右別、交流戦の注目選手をまとめています。`;
    if (overviewTitle) overviewTitle.textContent = `${fullTeam}をデータで見る`;
    if (overviewText) overviewText.textContent = profile.description;

    summary.innerHTML = [
      ["チーム打率", D.formatValue(teamTotal?.["打率"], "打率")],
      ["本塁打", teamTotal?.["本塁打"] ?? "-"],
      ["打点", teamTotal?.["打点"] ?? "-"],
      ["チーム防御率目安", D.formatValue(teamTotal?.["防御率目安"], "防御率目安")],
      ["打撃評価", D.formatValue(teamTotal?.["打撃評価"], "スコア")],
      ["投手評価", D.formatValue(teamTotal?.["投手評価"], "スコア")],
      ["守備評価", D.formatValue(teamTotal?.["守備評価"], "スコア")],
      ["総合評価", D.formatValue(teamTotal?.["総合評価"], "スコア")],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${value}</strong></article>`).join("");

    const byId = Object.fromEntries(D.RANKINGS.map((ranking) => [ranking.id, ranking]));
    renderHighlights(data, insight, fieldingRows, interleague, byId);
    sections.innerHTML = [
      rankingSection("打者総合", D.rankRows(data.batters, byId["batter-overall"], team, 10), "batter", "打者総合スコア", ["打席", "OPS", "本塁打", "打点"]),
      rankingSection("規定打席到達", D.rankRows(data.batters, byId["batter-qualified"], team, 10), "batter", "打者総合スコア", ["打席", "規定打席目安", "OPS", "本塁打"]),
      rankingSection("投手総合", D.rankRows(data.pitchers, byId["pitcher-overall"], team, 10), "pitcher", "投手総合スコア", ["投球回", "防御率", "奪三振", "勝利"]),
      rankingSection("規定投球回到達", D.rankRows(data.pitchers, byId["pitcher-qualified"], team, 10), "pitcher", "投手総合スコア", ["投球回", "規定投球回目安", "防御率", "奪三振"]),
      interleagueSection("交流戦 野手", interleagueBatters, "batter", ["打数", "OPS", "本塁打", "打点"]),
      interleagueSection("交流戦 投手", interleaguePitchers, "pitcher", ["投球回_交流戦", "防御率", "奪三振", "WHIP"]),
      fieldingSection(fielding),
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
