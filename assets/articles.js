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

  const rookieState = { league: "セ" };

  function rookieItems(type, league = rookieState.league) {
    const score = type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
    return insight.rookies
      .filter((row) => row["リーグ"] === league && rowType(row) === type)
      .map((row) => ({ row, season: seasonRow(row, type), recent: recentRow(row, type) }))
      .filter((item) => item.season)
      .sort((a, b) => D.toNumber(b.season[score]) - D.toNumber(a.season[score]));
  }

  function latestRookieUpdate() {
    const values = [
      ...data.pitchers.map((row) => row["更新日"]),
      ...insight.recentBatters.map((row) => row["更新日"] || row["盗塁データ更新日"]),
      ...insight.recentPitchers.map((row) => row["更新日"]),
    ].filter(Boolean);
    if (!values.length) return "";
    return values.sort((a, b) => String(b).replace(/\D/g, "").localeCompare(String(a).replace(/\D/g, "")))[0];
  }

  function rookiePitcherRole(season) {
    const starts = D.toInt(season["先発"]);
    const relief = D.toInt(season["救援"]);
    if (starts > 0 && relief > 0) return starts >= relief ? "先発中心" : "救援中心";
    if (starts > 0) return "先発";
    if (relief > 0) return "救援";
    return "-";
  }

  function rookieFormValue(recent) {
    if (!recent) return "-";
    return D.formatValue(recent["直近スコア"], "スコア");
  }

  function rookieTopName(type, league) {
    const item = rookieItems(type, league)[0];
    return item ? item.row["選手名"] : "-";
  }

  function rookieBatterTable(items, limit = 5) {
    const rows = items.slice(0, limit).map(({ row, season, recent }, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "batter", season)}</td>
        <td>${teamLink(row)}</td>
        <td>${D.escapeHtml(season["打席"] || "0")}</td>
        <td>${D.formatValue(season["打率"], "打率") || "-"}</td>
        <td>${D.formatValue(season["OPS"], "OPS") || "-"}</td>
        <td>${D.escapeHtml(season["本塁打"] || "0")}</td>
        <td>${D.escapeHtml(season["打点"] || "0")}</td>
        <td>${D.escapeHtml(season["盗塁"] || "0")}</td>
        <td class="score">${D.formatValue(season["打者総合スコア"], "スコア")}</td>
        <td>${rookieFormValue(recent)}</td>
      </tr>
    `);
    return table(["順位", "選手", "球団", "打席", "打率", "OPS", "本塁打", "打点", "盗塁", "Player Lens評価", "直近6試合"], rows);
  }

  function rookiePitcherTable(items, limit = 5) {
    const rows = items.slice(0, limit).map(({ row, season, recent }, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerLink(row, "pitcher", season)}</td>
        <td>${teamLink(row)}</td>
        <td>${D.escapeHtml(rookiePitcherRole(season))}</td>
        <td>${D.escapeHtml(season["登板"] || "0")}</td>
        <td>${D.escapeHtml(season["勝利"] || "0")}</td>
        <td>${D.escapeHtml(season["投球回"] || "0")}</td>
        <td>${D.formatValue(season["防御率"], "防御率") || "-"}</td>
        <td>${D.escapeHtml(season["奪三振"] || "0")}</td>
        <td>${D.escapeHtml(season["セーブ"] || "0")} / ${D.escapeHtml(season["ホールド"] || season["ＨＰ"] || "0")}</td>
        <td class="score">${D.formatValue(season["投手総合スコア"], "スコア")}</td>
        <td>${rookieFormValue(recent)}</td>
      </tr>
    `);
    return table(["順位", "選手", "球団", "役割", "登板", "勝利", "投球回", "防御率", "奪三振", "S / H", "Player Lens評価", "直近6試合"], rows);
  }

  function rookieRecentPanel(items, type) {
    const scoreKey = type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
    const recentItems = items
      .filter((item) => item.recent)
      .sort((a, b) => D.toNumber(b.recent["直近スコア"]) - D.toNumber(a.recent["直近スコア"]))
      .slice(0, 3);
    if (!recentItems.length) return '<p class="empty-state">直近データなし</p>';
    return `<ol class="rookie-form-list">${recentItems.map(({ row, season, recent }) => `
      <li>
        <span>${playerLink(row, type, season)} <small>${teamLink(row)}</small></span>
        <strong>${D.formatValue(recent["直近スコア"], "スコア")}</strong>
        <small>今季評価 ${D.formatValue(season[scoreKey], "スコア")}</small>
      </li>
    `).join("")}</ol>`;
  }

  function rookieOtherCandidates(league, topBatters, topPitchers) {
    const topKeys = new Set([
      ...topBatters.slice(0, 5).map((item) => D.playerKey(item.row)),
      ...topPitchers.slice(0, 5).map((item) => D.playerKey(item.row)),
    ]);
    const rows = insight.rookies
      .filter((row) => row["リーグ"] === league && !topKeys.has(D.playerKey(row)))
      .sort((a, b) => a["チーム"].localeCompare(b["チーム"], "ja") || a["選手名"].localeCompare(b["選手名"], "ja"))
      .map((row) => `
        <tr>
          <td>${teamLink(row)}</td>
          <td>${playerLink(row, rowType(row))}</td>
          <td>${rowType(row) === "pitcher" ? "投手" : "野手"}</td>
          <td>${D.escapeHtml(row["ポジション"])}</td>
        </tr>
      `);
    return `
      <details class="rookie-candidate-details">
        <summary>その他の新人王候補をすべて見る（${rows.length}人）</summary>
        ${table(["球団", "選手", "区分", "登録"], rows, "その他の候補はいません")}
      </details>
    `;
  }

  function renderRookieLeague() {
    const league = rookieState.league;
    const leagueLabel = league === "セ" ? "セ・リーグ" : "パ・リーグ";
    const batters = rookieItems("batter", league);
    const pitchers = rookieItems("pitcher", league);
    const update = latestRookieUpdate();

    mainEl.innerHTML = [
      `<section class="content-card rookie-control-card">
        <div>
          <p class="eyebrow">League Select</p>
          <h2>${leagueLabel} 新人王候補</h2>
          ${update ? `<p class="rookie-update">データ更新：${D.escapeHtml(update)}</p>` : ""}
        </div>
        <div class="rookie-league-tabs" role="group" aria-label="リーグ切り替え">
          <button type="button" data-rookie-league="セ" aria-pressed="${league === "セ"}">セ・リーグ</button>
          <button type="button" data-rookie-league="パ" aria-pressed="${league === "パ"}">パ・リーグ</button>
        </div>
      </section>`,
      `<section class="content-card rookie-ranking-card">
        <h2>${leagueLabel} 野手ランキング</h2>
        <p class="small-note">今季成績を中心に、Player Lens独自評価の上位5人を表示します。</p>
        ${rookieBatterTable(batters)}
      </section>`,
      `<section class="content-card rookie-ranking-card">
        <h2>${leagueLabel} 投手ランキング</h2>
        <p class="small-note">先発・救援を同じ新人王候補として扱い、今季成績を並べて比較します。</p>
        ${rookiePitcherTable(pitchers)}
      </section>`,
      `<section class="content-card rookie-form-card">
        <h2>直近6試合で好調な新人</h2>
        <p class="small-note">野手と投手は評価式が異なるため、それぞれの中で直近評価の高い3人を表示します。</p>
        <div class="rookie-form-grid">
          <div><h3>野手</h3>${rookieRecentPanel(batters, "batter")}</div>
          <div><h3>投手</h3>${rookieRecentPanel(pitchers, "pitcher")}</div>
        </div>
      </section>`,
      `<section class="content-card">
        <h2>その他の新人王候補</h2>
        <p class="small-note">上位5人以外の候補は折りたたんでいます。必要なときだけ一覧を開けます。</p>
        ${rookieOtherCandidates(league, batters, pitchers)}
      </section>`,
      `<section class="content-card rookie-guide-card">
        <h2>新人王候補ランキングの見方</h2>
        <ul class="plain-list">
          <li>新人王は各リーグ1名で、野手・投手別の表彰ではありません。</li>
          <li>このページでは比較しやすいように野手と投手を分けています。</li>
          <li>順位は公式投票の予想ではなく、Player Lensの今季成績をもとにした独自評価です。</li>
          <li>「直近6試合」は各選手が出場した直近の試合データから状態を確認するための補助指標です。</li>
        </ul>
      </section>`,
    ].join("");

    mainEl.querySelectorAll("[data-rookie-league]").forEach((button) => {
      button.addEventListener("click", () => {
        rookieState.league = button.dataset.rookieLeague;
        renderRookieLeague();
      });
    });
    D.enhanceCompactTables(mainEl);
  }

  function renderRookie() {
    summary([
      ["セ・野手1位", rookieTopName("batter", "セ")],
      ["セ・投手1位", rookieTopName("pitcher", "セ")],
      ["パ・野手1位", rookieTopName("batter", "パ")],
      ["パ・投手1位", rookieTopName("pitcher", "パ")],
    ]);
    summaryEl.classList.add("rookie-summary-grid");
    renderRookieLeague();
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
      .filter((row) => D.toInt(row["打席"]) >= D.DATA_QUESTION_MINIMUMS.recentBatterPa)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]));
    const pitchers = filterRecentRows(insight.recentPitchers)
      .filter(D.isRecentPitcherEligible)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]));
    const stealers = filterRecentRows(insight.recentBatters)
      .filter((row) => D.toInt(row["盗塁企図"]) > 0)
      .sort((a, b) => D.toInt(b["盗塁成功"]) - D.toInt(a["盗塁成功"])
        || D.toNumber(b["盗塁成功率"]) - D.toNumber(a["盗塁成功率"])
        || D.toInt(b["盗塁企図"]) - D.toInt(a["盗塁企図"]));
    const topBatter = batters[0];
    const topPitcher = pitchers[0];
    const scope = recentScopeLabel();

    summary([
      ["表示範囲", scope],
      ["集計単位", "選手ごとの直近6試合"],
      ["対象野手", batters.length],
      ["盗塁企図あり", stealers.length],
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
          <td>${D.escapeHtml(row["盗塁成功"] || "0")}</td>
        </tr>
      `;
    });
    const stealRows = stealers.slice(0, 20).map((row, index) => {
      const season = seasonRow(row, "batter");
      return `
        <tr>
          <td class="rank">${index + 1}</td>
          <td>${playerLink(row, "batter", season)}</td>
          <td>${teamLink(row)}</td>
          <td>${D.escapeHtml(row["ポジション"])}</td>
          <td>${D.escapeHtml(row["盗塁成功"] || "0")}</td>
          <td>${D.escapeHtml(row["盗塁死"] || "0")}</td>
          <td>${D.escapeHtml(row["盗塁企図"] || "0")}</td>
          <td>${row["盗塁成功率"] === "" ? "-" : D.formatValue(row["盗塁成功率"], "盗塁成功率")}</td>
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
      card(`${D.escapeHtml(scope)} 直近6試合 野手ランキング`, table(["順位", "選手", "球団", "登録", "評価", "打率", "OPS", "本塁打", "打点", "盗塁成功"], batterRows)),
      card(`${D.escapeHtml(scope)} 直近6試合 盗塁ランキング`, table(["順位", "選手", "球団", "登録", "盗塁成功", "盗塁死", "盗塁企図", "盗塁成功率"], stealRows, "直近6試合で盗塁を企図した選手はいません。")),
      card(`${D.escapeHtml(scope)} 直近6試合 投手ランキング`, table(["順位", "選手", "球団", "登録", "評価", "投球回", "防御率", "奪三振", "WHIP"], pitcherRows)),
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
      ["最多出場", rows.length ? Math.max(...rows.map((item) => item.starts)) : 0],
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
      ? `<p>現在の外野手ランキング上位は${D.escapeHtml(top.row["選手名"])}です。外野の各守備位置で出場した試合数と今季評価を並べることで、外野3枠をまとめて見られます。</p>`
      : "<p>外野の守備位置に就いた選手を対象にしています。試合途中から守った場合や途中で守備位置が変わった場合も含みます。</p>";
    mainEl.innerHTML = [
      card("この記事の見どころ", `${topText}<p>外野手は左右中で役割が違いますが、表彰や比較では外野手としてまとめて見る場面があります。このランキングでは3ポジションを合算しています。</p>`),
      card("外野手ランキング", table(["順位", "選手", "球団", "登録", "外野出場", "今季評価", "打席", "OPS", "本塁打"], tableRows)),
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
      return card(`${position.label}ランキング`, table(["順位", "選手", "球団", "出場", "今季評価", position.type === "pitcher" ? "投球回" : "打席"], bodyRows));
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
      card("複数ポジションで出場している選手", table(["順位", "選手", "球団", "位置数", "各位置の出場数計", "守備位置"], multiRows)),
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
      .filter((row) => type === "pitcher" ? D.isRecentPitcherEligible(row) : D.toInt(row["打席"]) >= D.DATA_QUESTION_MINIMUMS.recentBatterPa)
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
      ["直近集計", "選手ごとの直近6試合"],
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
      card("この記事の見どころ", `${lead}<p>今季通算と選手が出場した直近6試合を分けて見ると、安定して成績を残している選手と、最近状態を上げている選手を比べられます。球団をまたいで注目選手を探したい時に使えるまとめです。</p>`),
      card(`${leagueLabel} 打者ランキング`, table(["順位", "選手", "球団", "評価", "打席", "打率", "OPS", "本塁打", "打点"], batterRows)),
      card(`${leagueLabel} 投手ランキング`, table(["順位", "選手", "球団", "評価", "投球回", "防御率", "奪三振", "勝利", "セーブ"], pitcherRows)),
      card(`${leagueLabel} 直近6試合 野手ランキング`, table(["順位", "選手", "球団", "評価", "打率", "OPS", "本塁打", "打点"], recentBatterRows)),
      card(`${leagueLabel} 直近6試合 投手ランキング`, table(["順位", "選手", "球団", "評価", "投球回", "防御率", "奪三振", "WHIP"], recentPitcherRows)),
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
