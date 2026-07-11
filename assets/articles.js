(async function () {
  const D = window.PlayerLensData;
  const article = document.body.dataset.article || "";
  const summaryEl = document.getElementById("articleSummary");
  const mainEl = document.getElementById("articleMain");
  let data;
  let insight;
  let interleague;
  let batterMap;
  let pitcherMap;
  let recentBatterMap;
  let recentPitcherMap;

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

  function summary(items) {
    summaryEl.innerHTML = items.map(([label, value]) => `
      <article class="summary-card">
        <span>${D.escapeHtml(label)}</span>
        <strong>${D.escapeHtml(String(value))}</strong>
      </article>
    `).join("");
  }

  function scoreKey(type) {
    return type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
  }

  function playerLink(row, type, season = seasonRow(row, type)) {
    const name = D.escapeHtml(row["選手名"]);
    return season ? `<a href="${D.playerUrl(season, type)}">${name}</a>` : name;
  }

  function teamLink(row) {
    return `<a href="${D.teamUrl(row["チーム"])}">${D.escapeHtml(row["チーム"])}</a>`;
  }

  function rowType(row) {
    return row["ポジション"] === "投手" ? "pitcher" : "batter";
  }

  function seasonRow(row, type = rowType(row)) {
    return type === "pitcher" ? pitcherMap.get(D.playerKey(row)) : batterMap.get(D.playerKey(row));
  }

  function recentRow(row, type = rowType(row)) {
    return type === "pitcher" ? recentPitcherMap.get(D.playerKey(row)) : recentBatterMap.get(D.playerKey(row));
  }

  function startsForPosition(row, position) {
    const keys = position.keys || [position.key];
    return keys.reduce((sum, key) => sum + D.toInt(row[key]), 0);
  }

  function positionRows(positionKey, limit = 20) {
    const position = D.START_POSITIONS.find((item) => item.key === positionKey);
    if (!position) return [];
    return insight.starterPositions
      .map((row) => {
        const type = position.type;
        const season = seasonRow(row, type);
        return { row, starts: startsForPosition(row, position), season, type };
      })
      .filter((item) => item.starts > 0 && item.season)
      .sort((a, b) => D.toNumber(b.season[scoreKey(b.type)]) - D.toNumber(a.season[scoreKey(a.type)]) || b.starts - a.starts)
      .slice(0, limit);
  }

  function periodLabel(rows) {
    const period = rows.find((row) => row["期間"])?.["期間"] || "";
    return period ? period.replace("_", " - ") : "-";
  }

  function card(title, body) {
    return `<article class="content-card"><h2>${D.escapeHtml(title)}</h2>${body}</article>`;
  }

  function renderRookie() {
    const rookieBatters = insight.rookies
      .filter((row) => rowType(row) === "batter")
      .map((row) => ({ row, season: seasonRow(row, "batter"), recent: recentRow(row, "batter") }))
      .filter((item) => item.season)
      .sort((a, b) => D.toNumber(b.season["打者総合スコア"]) - D.toNumber(a.season["打者総合スコア"]));
    const rookiePitchers = insight.rookies
      .filter((row) => rowType(row) === "pitcher")
      .map((row) => ({ row, season: seasonRow(row, "pitcher"), recent: recentRow(row, "pitcher") }))
      .filter((item) => item.season)
      .sort((a, b) => D.toNumber(b.season["投手総合スコア"]) - D.toNumber(a.season["投手総合スコア"]));
    const topBatter = rookieBatters[0];
    const topPitcher = rookiePitchers[0];

    summary([
      ["候補野手", rookieBatters.length],
      ["候補投手", rookiePitchers.length],
      ["野手1位", topBatter ? topBatter.row["選手名"] : "-"],
      ["投手1位", topPitcher ? topPitcher.row["選手名"] : "-"],
    ]);

    const batterRows = rookieBatters.slice(0, 15).map(({ row, season, recent }, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "batter", season)}</td>
        <td>${teamLink(row)}</td>
        <td>${D.escapeHtml(row["ポジション"])}</td>
        <td class="score">${D.formatValue(season["打者総合スコア"], "スコア")}</td>
        <td>${recent ? D.formatValue(recent["直近スコア"], "スコア") : "-"}</td>
        <td>${D.escapeHtml(season["打席"] || "-")}</td>
      </tr>
    `);
    const pitcherRows = rookiePitchers.slice(0, 15).map(({ row, season, recent }, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "pitcher", season)}</td>
        <td>${teamLink(row)}</td>
        <td>${D.escapeHtml(row["ポジション"])}</td>
        <td class="score">${D.formatValue(season["投手総合スコア"], "スコア")}</td>
        <td>${recent ? D.formatValue(recent["直近スコア"], "スコア") : "-"}</td>
        <td>${D.escapeHtml(season["投球回"] || "-")}</td>
      </tr>
    `);
    const listRows = insight.rookies.map((row) => `
      <tr>
        <td>${teamLink(row)}</td>
        <td>${playerLink(row, rowType(row))}</td>
        <td>${D.escapeHtml(row["ポジション"])}</td>
      </tr>
    `);

    const lead = topBatter && topPitcher
      ? `<p>${D.escapeHtml(topBatter.row["選手名"])}、${D.escapeHtml(topPitcher.row["選手名"])}など、候補者の中でも今季評価が高い選手を上位に表示しています。</p>`
      : "<p>候補者の今季評価を野手・投手に分けて表示しています。</p>";

    mainEl.innerHTML = [
      card("この記事の見どころ", `${lead}<p>新人王候補は出場機会の差が大きいため、今季評価と直近評価を並べて見ると、すでに成績を残している選手と最近上がってきた選手を分けて確認できます。</p>`),
      card("候補野手ランキング", table(["順位", "選手", "球団", "登録", "今季評価", "直近評価", "打席"], batterRows)),
      card("候補投手ランキング", table(["順位", "選手", "球団", "登録", "今季評価", "直近評価", "投球回"], pitcherRows)),
      card("候補者一覧", table(["球団", "選手", "ポジション"], listRows)),
    ].join("");
  }

  const recentFilter = { league: "all", team: "all" };

  function recentScopeLabel() {
    if (recentFilter.team !== "all") return recentFilter.team;
    if (recentFilter.league === "セ") return "セ・リーグ全体";
    if (recentFilter.league === "パ") return "パ・リーグ全体";
    return "全体";
  }

  function renderRecentTeamFilter() {
    const teamSelect = document.getElementById("recentTeamFilter");
    if (!teamSelect) return;
    const teams = Object.keys(D.TEAM_TO_FULL)
      .filter((team) => recentFilter.league === "all" || D.leagueOfTeam(team) === recentFilter.league);
    if (recentFilter.team !== "all" && !teams.includes(recentFilter.team)) recentFilter.team = "all";
    const allLabel = recentFilter.league === "all" ? "全12球団" : `${recentFilter.league}・リーグ全体`;
    teamSelect.innerHTML = [
      `<option value="all">${D.escapeHtml(allLabel)}</option>`,
      ...teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`),
    ].join("");
    teamSelect.value = recentFilter.team;
  }

  function initRecentFilters() {
    const leagueSelect = document.getElementById("recentLeagueFilter");
    const teamSelect = document.getElementById("recentTeamFilter");
    if (!leagueSelect || !teamSelect) return;
    renderRecentTeamFilter();
    leagueSelect.addEventListener("change", (event) => {
      recentFilter.league = event.target.value;
      recentFilter.team = "all";
      renderRecentTeamFilter();
      renderRecent();
    });
    teamSelect.addEventListener("change", (event) => {
      recentFilter.team = event.target.value;
      renderRecent();
    });
  }

  function filterRecentRows(rows) {
    return rows
      .filter((row) => recentFilter.league === "all" || row["リーグ"] === recentFilter.league)
      .filter((row) => recentFilter.team === "all" || row["チーム"] === recentFilter.team);
  }

  function renderRecent() {
    const batters = filterRecentRows(insight.recentBatters)
      .filter((row) => D.toNumber(row["打数"]) >= 4)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]));
    const pitchers = filterRecentRows(insight.recentPitchers)
      .filter((row) => D.toNumber(row["投球アウト数"]) >= 3)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]));
    const topBatter = batters[0];
    const topPitcher = pitchers[0];
    const scope = recentScopeLabel();

    summary([
      ["表示範囲", scope],
      ["対象期間", periodLabel(filterRecentRows(insight.recentBatters))],
      ["対象野手", batters.length],
      ["対象投手", pitchers.length],
    ]);

    const batterRows = batters.slice(0, 20).map((row, index) => {
      const season = seasonRow(row, "batter");
      return `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "batter", season)}</td>
          <td>${teamLink(row)}</td>
          <td>${D.escapeHtml(row["ポジション"])}</td>
          <td class="score">${D.formatValue(row["直近スコア"], "スコア")}</td>
          <td>${D.formatValue(row["打率"], "打率")}</td>
          <td>${D.formatValue(row["OPS"], "OPS")}</td>
          <td>${D.escapeHtml(row["本塁打"])}</td>
          <td>${D.escapeHtml(row["打点"])}</td>
        </tr>
      `;
    });
    const pitcherRows = pitchers.slice(0, 20).map((row, index) => {
      const season = seasonRow(row, "pitcher");
      return `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "pitcher", season)}</td>
          <td>${teamLink(row)}</td>
          <td>${D.escapeHtml(row["ポジション"])}</td>
          <td class="score">${D.formatValue(row["直近スコア"], "スコア")}</td>
          <td>${D.escapeHtml(row["投球回"])}</td>
          <td>${D.formatValue(row["防御率"], "防御率")}</td>
          <td>${D.escapeHtml(row["奪三振"])}</td>
          <td>${D.escapeHtml(row["WHIP"])}</td>
        </tr>
      `;
    });

    const lead = topBatter && topPitcher
      ? `<p>${D.escapeHtml(scope)}では、野手の上位に${D.escapeHtml(topBatter["選手名"])}、投手の上位に${D.escapeHtml(topPitcher["選手名"])}が入っています。</p>`
      : `<p>${D.escapeHtml(scope)}では、出場量の条件を満たした野手・投手がいません。</p>`;

    mainEl.innerHTML = [
      card("この記事の見どころ", `${lead}<p>リーグと球団を切り替えると、その範囲の中で順位を付け直します。短期成績は好不調の波を見つけるための入口として、通算成績とあわせて見るのがおすすめです。</p>`),
      card(`${D.escapeHtml(scope)} 直近6日 野手ランキング`, table(["順位", "選手", "球団", "登録", "評価", "打率", "OPS", "本塁打", "打点"], batterRows)),
      card(`${D.escapeHtml(scope)} 直近6日 投手ランキング`, table(["順位", "選手", "球団", "登録", "評価", "投球回", "防御率", "奪三振", "WHIP"], pitcherRows)),
    ].join("");
    D.enhanceCompactTables(mainEl);
  }

  function renderInterleague() {
    const batters = interleague.batters
      .filter((row) => D.toInt(row["打数"]) >= 8)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]));
    const pitchers = interleague.pitchers
      .filter((row) => D.toInt(row["投球アウト数"]) >= 6)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]));
    const topBatter = batters[0];
    const topPitcher = pitchers[0];

    summary([
      ["対象野手", batters.length],
      ["対象投手", pitchers.length],
      ["対象球団", Object.keys(D.TEAM_TO_FULL).length],
      ["野手1位", topBatter ? topBatter["選手名"] : "-"],
    ]);

    const batterRows = batters.slice(0, 20).map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "batter")}</td>
        <td>${teamLink(row)}</td>
        <td class="score">${D.formatValue(row["交流戦スコア"], "スコア")}</td>
        <td>${D.escapeHtml(row["打数"])}</td>
        <td>${D.formatValue(row["打率"], "打率")}</td>
        <td>${D.formatValue(row["OPS"], "OPS")}</td>
        <td>${D.escapeHtml(row["本塁打"])}</td>
        <td>${D.escapeHtml(row["打点"])}</td>
      </tr>
    `);
    const pitcherRows = pitchers.slice(0, 20).map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "pitcher")}</td>
        <td>${teamLink(row)}</td>
        <td class="score">${D.formatValue(row["交流戦スコア"], "スコア")}</td>
        <td>${D.escapeHtml(row["投球回_交流戦"])}</td>
        <td>${D.formatValue(row["防御率"], "防御率")}</td>
        <td>${D.escapeHtml(row["奪三振"])}</td>
        <td>${D.escapeHtml(row["WHIP"])}</td>
      </tr>
    `);
    const teamRows = Object.keys(D.TEAM_TO_FULL).map((team) => {
      const teamBatter = batters.find((row) => row["チーム"] === team);
      const teamPitcher = pitchers.find((row) => row["チーム"] === team);
      return `
        <tr>
          <td><a href="${D.teamUrl(team)}">${D.escapeHtml(team)}</a></td>
          <td>${teamBatter ? playerLink(teamBatter, "batter") : "-"}</td>
          <td>${teamBatter ? D.formatValue(teamBatter["交流戦スコア"], "スコア") : "-"}</td>
          <td>${teamPitcher ? playerLink(teamPitcher, "pitcher") : "-"}</td>
          <td>${teamPitcher ? D.formatValue(teamPitcher["交流戦スコア"], "スコア") : "-"}</td>
        </tr>
      `;
    });

    const lead = topBatter && topPitcher
      ? `<p>交流戦内では、野手の上位に${D.escapeHtml(topBatter["選手名"])}、投手の上位に${D.escapeHtml(topPitcher["選手名"])}が入っています。</p>`
      : "<p>交流戦内で一定以上出場した選手を対象にしています。</p>";

    mainEl.innerHTML = [
      card("この記事の見どころ", `${lead}<p>交流戦は対戦相手が普段と変わるため、通算ランキングとは違う名前が上位に出ることがあります。打撃はOPSや長打、投球は防御率、WHIP、奪三振を合わせて見ると、短期で目立つ選手を探しやすくなります。</p>`),
      card("交流戦 野手ランキング", table(["順位", "選手", "球団", "評価", "打数", "打率", "OPS", "本塁打", "打点"], batterRows)),
      card("交流戦 投手ランキング", table(["順位", "選手", "球団", "評価", "投球回", "防御率", "奪三振", "WHIP"], pitcherRows)),
      card("球団別交流戦トップ", table(["球団", "野手1位", "野手評価", "投手1位", "投手評価"], teamRows)),
    ].join("");
  }

  function renderOutfield() {
    const rows = positionRows("outfield", 30);
    const top = rows[0];
    summary([
      ["外野対象", rows.length],
      ["1位", top ? top.row["選手名"] : "-"],
      ["最多先発", rows.length ? Math.max(...rows.map((item) => item.starts)) : 0],
      ["表示形式", "外野統合"],
    ]);

    const tableRows = rows.map(({ row, season, starts }, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "batter", season)}</td>
        <td>${teamLink(row)}</td>
        <td>${D.escapeHtml(row["ポジション"])}</td>
        <td>${starts}</td>
        <td class="score">${D.formatValue(season["打者総合スコア"], "スコア")}</td>
        <td>${D.escapeHtml(season["打席"])}</td>
        <td>${D.formatValue(season["OPS"], "OPS")}</td>
        <td>${D.escapeHtml(season["本塁打"])}</td>
      </tr>
    `);
    const topText = top
      ? `<p>現在の外野手ランキング上位は${D.escapeHtml(top.row["選手名"])}です。外野でのスタメン出場数と今季評価を並べることで、外野3枠をまとめて見られます。</p>`
      : "<p>外野でスタメン出場した選手を対象にしています。</p>";
    mainEl.innerHTML = [
      card("この記事の見どころ", `${topText}<p>外野手は左右中で役割が違いますが、表彰や比較では外野手としてまとめて見る場面があります。このランキングでは3ポジションを合算しています。</p>`),
      card("外野手ランキング", table(["順位", "選手", "球団", "登録", "外野先発", "今季評価", "打席", "OPS", "本塁打"], tableRows)),
    ].join("");
  }

  function renderPosition() {
    const positions = D.START_POSITIONS.filter((position) => position.key !== "(投)");
    const blocks = positions.map((position) => {
      const rows = positionRows(position.key, 8);
      const bodyRows = rows.map(({ row, season, starts }, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, position.type, season)}</td>
          <td>${teamLink(row)}</td>
          <td>${starts}</td>
          <td class="score">${D.formatValue(season[scoreKey(position.type)], "スコア")}</td>
          <td>${position.type === "pitcher" ? D.escapeHtml(season["投球回"]) : D.escapeHtml(season["打席"])}</td>
        </tr>
      `);
      return card(`${position.label}ランキング`, table(["順位", "選手", "球団", "先発", "今季評価", position.type === "pitcher" ? "投球回" : "打席"], bodyRows));
    });
    const multiRows = insight.starterPositions
      .map((row) => {
        const activePositions = D.START_POSITIONS.filter((position) => startsForPosition(row, position) > 0);
        const type = row["ポジション"] === "投手" ? "pitcher" : "batter";
        const season = seasonRow(row, type);
        return { row, activePositions, season, type, starts: activePositions.reduce((sum, position) => sum + startsForPosition(row, position), 0) };
      })
      .filter((item) => item.activePositions.length >= 2 && item.season)
      .sort((a, b) => b.activePositions.length - a.activePositions.length || b.starts - a.starts)
      .slice(0, 15)
      .map(({ row, activePositions, season, type, starts }, index) => `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, type, season)}</td>
          <td>${teamLink(row)}</td>
          <td>${activePositions.length}</td>
          <td>${starts}</td>
          <td>${D.escapeHtml(activePositions.map((position) => position.label).join("・"))}</td>
        </tr>
      `);

    summary([
      ["対象位置", positions.length],
      ["外野", "統合"],
      ["複数位置", multiRows.length],
      ["表示", "上位8人"],
    ]);

    mainEl.innerHTML = [
      card("この記事の見どころ", "<p>守備位置別に見ると、同じチーム内の起用やポジション争いが見えやすくなります。外野手はレフト、センター、ライトを統合し、外野3枠の比較として見られるようにしています。</p>"),
      ...blocks,
      card("複数ポジションでスタメン出場している選手", table(["順位", "選手", "球団", "位置数", "先発数", "守備位置"], multiRows)),
    ].join("");
  }

  function seasonRanking(type, league, rankingId, limit = 15) {
    const ranking = D.RANKINGS.find((item) => item.id === rankingId);
    const rows = type === "pitcher" ? data.pitchers : data.batters;
    return rows
      .filter((row) => row["リーグ"] === league)
      .filter((row) => D.toNumber(row[ranking.minKey]) >= ranking.minValue)
      .filter((row) => !ranking.filter || ranking.filter(row))
      .sort((a, b) => D.toNumber(b[ranking.scoreKey]) - D.toNumber(a[ranking.scoreKey]))
      .slice(0, limit);
  }

  function recentRanking(type, league, limit = 10) {
    const rows = type === "pitcher" ? insight.recentPitchers : insight.recentBatters;
    return rows
      .filter((row) => row["リーグ"] === league)
      .filter((row) => type === "pitcher" ? D.toNumber(row["投球アウト数"]) >= 3 : D.toNumber(row["打数"]) >= 4)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))
      .slice(0, limit);
  }

  function renderLeague(league, leagueLabel) {
    const batters = seasonRanking("batter", league, "batter-overall");
    const pitchers = seasonRanking("pitcher", league, "pitcher-overall");
    const recentBatters = recentRanking("batter", league);
    const recentPitchers = recentRanking("pitcher", league);
    const qualifiedBatters = data.batters.filter((row) => row["リーグ"] === league && row["規定打席到達"] === "到達").length;
    const qualifiedPitchers = data.pitchers.filter((row) => row["リーグ"] === league && row["規定投球回到達"] === "到達").length;
    const topBatter = batters[0];
    const topPitcher = pitchers[0];

    summary([
      ["対象球団", 6],
      ["規定打席到達", qualifiedBatters],
      ["規定投球回到達", qualifiedPitchers],
      ["直近対象期間", periodLabel(insight.recentBatters)],
    ]);

    const batterRows = batters.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "batter", row)}</td>
        <td>${teamLink(row)}</td>
        <td class="score">${D.formatValue(row["打者総合スコア"], "スコア")}</td>
        <td>${D.escapeHtml(row["打席"])}</td>
        <td>${D.formatValue(row["打率"], "打率")}</td>
        <td>${D.formatValue(row["OPS"], "OPS")}</td>
        <td>${D.escapeHtml(row["本塁打"])}</td>
        <td>${D.escapeHtml(row["打点"])}</td>
      </tr>
    `);
    const pitcherRows = pitchers.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "pitcher", row)}</td>
        <td>${teamLink(row)}</td>
        <td class="score">${D.formatValue(row["投手総合スコア"], "スコア")}</td>
        <td>${D.escapeHtml(row["投球回"])}</td>
        <td>${D.formatValue(row["防御率"], "防御率")}</td>
        <td>${D.escapeHtml(row["奪三振"])}</td>
        <td>${D.escapeHtml(row["勝利"])}</td>
        <td>${D.escapeHtml(row["セーブ"])}</td>
      </tr>
    `);
    const recentBatterRows = recentBatters.map((row, index) => {
      const season = seasonRow(row, "batter");
      return `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "batter", season)}</td>
          <td>${teamLink(row)}</td>
          <td class="score">${D.formatValue(row["直近スコア"], "スコア")}</td>
          <td>${D.formatValue(row["打率"], "打率")}</td>
          <td>${D.formatValue(row["OPS"], "OPS")}</td>
          <td>${D.escapeHtml(row["本塁打"])}</td>
          <td>${D.escapeHtml(row["打点"])}</td>
        </tr>
      `;
    });
    const recentPitcherRows = recentPitchers.map((row, index) => {
      const season = seasonRow(row, "pitcher");
      return `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "pitcher", season)}</td>
          <td>${teamLink(row)}</td>
          <td class="score">${D.formatValue(row["直近スコア"], "スコア")}</td>
          <td>${D.escapeHtml(row["投球回"])}</td>
          <td>${D.formatValue(row["防御率"], "防御率")}</td>
          <td>${D.escapeHtml(row["奪三振"])}</td>
          <td>${D.escapeHtml(row["WHIP"])}</td>
        </tr>
      `;
    });

    const lead = topBatter && topPitcher
      ? `<p>${leagueLabel}では、野手の上位に${D.escapeHtml(topBatter["選手名"])}、投手の上位に${D.escapeHtml(topPitcher["選手名"])}が入っています。</p>`
      : `<p>${leagueLabel}の野手・投手ランキングをまとめています。</p>`;

    mainEl.innerHTML = [
      card("この記事の見どころ", `${lead}<p>今季通算と直近6日間を分けて見ると、安定して成績を残している選手と、最近状態を上げている選手を比べられます。球団をまたいで注目選手を探したい時に使えるまとめです。</p>`),
      card(`${leagueLabel} 打者ランキング`, table(["順位", "選手", "球団", "評価", "打席", "打率", "OPS", "本塁打", "打点"], batterRows)),
      card(`${leagueLabel} 投手ランキング`, table(["順位", "選手", "球団", "評価", "投球回", "防御率", "奪三振", "勝利", "セーブ"], pitcherRows)),
      card(`${leagueLabel} 直近6日 野手ランキング`, table(["順位", "選手", "球団", "評価", "打率", "OPS", "本塁打", "打点"], recentBatterRows)),
      card(`${leagueLabel} 直近6日 投手ランキング`, table(["順位", "選手", "球団", "評価", "投球回", "防御率", "奪三振", "WHIP"], recentPitcherRows)),
    ].join("");
  }

  function renderQualified() {
    const batters = data.batters
      .filter((row) => row["規定打席到達"] === "到達")
      .sort((a, b) => D.toNumber(b["打者総合スコア"]) - D.toNumber(a["打者総合スコア"]));
    const pitchers = data.pitchers
      .filter((row) => row["規定投球回到達"] === "到達")
      .sort((a, b) => D.toNumber(b["投手総合スコア"]) - D.toNumber(a["投手総合スコア"]));
    const topBatter = batters[0];
    const topPitcher = pitchers[0];

    summary([
      ["規定打席到達", batters.length],
      ["規定投球回到達", pitchers.length],
      ["打者1位", topBatter ? topBatter["選手名"] : "-"],
      ["投手1位", topPitcher ? topPitcher["選手名"] : "-"],
    ]);

    const batterRows = batters.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "batter", row)}</td>
        <td>${teamLink(row)}</td>
        <td class="score">${D.formatValue(row["打者総合スコア"], "スコア")}</td>
        <td>${D.escapeHtml(row["打席"])}</td>
        <td>${D.escapeHtml(row["規定打席目安"])}</td>
        <td>${D.formatValue(row["打率"], "打率")}</td>
        <td>${D.formatValue(row["OPS"], "OPS")}</td>
        <td>${D.escapeHtml(row["本塁打"])}</td>
      </tr>
    `);
    const pitcherRows = pitchers.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "pitcher", row)}</td>
        <td>${teamLink(row)}</td>
        <td class="score">${D.formatValue(row["投手総合スコア"], "スコア")}</td>
        <td>${D.escapeHtml(row["投球回"])}</td>
        <td>${D.escapeHtml(row["規定投球回目安"])}</td>
        <td>${D.formatValue(row["防御率"], "防御率")}</td>
        <td>${D.escapeHtml(row["奪三振"])}</td>
        <td>${D.escapeHtml(row["勝利"])}</td>
      </tr>
    `);

    const lead = topBatter && topPitcher
      ? `<p>規定到達者の中では、打者の上位に${D.escapeHtml(topBatter["選手名"])}、投手の上位に${D.escapeHtml(topPitcher["選手名"])}が入っています。</p>`
      : "<p>十分な出場量に達している選手をまとめています。</p>";

    mainEl.innerHTML = [
      card("この記事の見どころ", `${lead}<p>規定打席は球団の試合数目安×3.1、規定投球回は球団の試合数目安を基準にしています。出場量を満たした選手に絞ることで、継続して成績を残している選手を比較しやすくなります。</p>`),
      card("規定打席到達者ランキング", table(["順位", "選手", "球団", "評価", "打席", "目安", "打率", "OPS", "本塁打"], batterRows)),
      card("規定投球回到達者ランキング", table(["順位", "選手", "球団", "評価", "投球回", "目安", "防御率", "奪三振", "勝利"], pitcherRows)),
    ].join("");
  }

  try {
    [data, insight, interleague] = await Promise.all([D.loadData(), D.loadInsightData(), D.loadInterleagueData()]);
    batterMap = new Map(data.batters.map((row) => [D.playerKey(row), row]));
    pitcherMap = new Map(data.pitchers.map((row) => [D.playerKey(row), row]));
    recentBatterMap = new Map(insight.recentBatters.map((row) => [D.playerKey(row), row]));
    recentPitcherMap = new Map(insight.recentPitchers.map((row) => [D.playerKey(row), row]));

    if (article === "rookie") renderRookie();
    if (article === "recent") {
      initRecentFilters();
      renderRecent();
    }
    if (article === "outfield") renderOutfield();
    if (article === "position") renderPosition();
    if (article === "central") renderLeague("セ", "セ・リーグ");
    if (article === "pacific") renderLeague("パ", "パ・リーグ");
    if (article === "qualified") renderQualified();
    if (article === "interleague") renderInterleague();
    D.enhanceCompactTables(mainEl);
  } catch (error) {
    mainEl.innerHTML = `<article class="content-card">${D.escapeHtml(error.message)}</article>`;
  }
})();
