(async function () {
  const D = window.PlayerLensData;
  const params = new URLSearchParams(location.search);
  const name = params.get("name") || "";
  const team = params.get("team") || "";
  const type = params.get("type") || "batter";
  let activeTeam = team;
  let activeName = name;
  const title = document.getElementById("playerTitle");
  const lead = document.getElementById("playerLead");
  const content = document.getElementById("playerContent");

  function metricCards(items) {
    return `<div class="metric-grid wide-metrics">${items.map(([label, value]) => `
      <div class="metric"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value ?? "")}</strong></div>
    `).join("")}</div>`;
  }

  function splitCards(columns, rows) {
    return `
      <div class="split-mobile-cards">
        ${rows.map((values) => `
          <article class="split-mobile-card">
            <strong>${D.escapeHtml(values[0])}</strong>
            <dl>
              ${columns.slice(1).map((column, index) => `
                <div>
                  <dt>${D.escapeHtml(column)}</dt>
                  <dd>${D.escapeHtml(values[index + 1] ?? "")}</dd>
                </div>
              `).join("")}
            </dl>
          </article>
        `).join("")}
      </div>
    `;
  }

  function splitTable(row, isBatter) {
    if (isBatter) {
      const columns = ["区分", "打数", "打率", "安打", "本塁打", "三振", "四球", "死球", "犠打", "犠飛"];
      const rows = [
        ["対右", row["対右打数"] || "", D.formatValue(row["対右打率"], "対右打率"), row["対右安打"] || "", row["対右本塁打"] || "", row["対右三振"] || "", row["対右四球"] || "", row["対右死球"] || "", row["対右犠打"] || "", row["対右犠飛"] || ""],
        ["対左", row["対左打数"] || "", D.formatValue(row["対左打率"], "対左打率"), row["対左安打"] || "", row["対左本塁打"] || "", row["対左三振"] || "", row["対左四球"] || "", row["対左死球"] || "", row["対左犠打"] || "", row["対左犠飛"] || ""],
      ];
      return `
        <table class="compact-table">
          <thead><tr><th>区分</th><th>打数</th><th>打率</th><th>安打</th><th>本塁打</th><th>三振</th><th>四球</th><th>死球</th><th>犠打</th><th>犠飛</th></tr></thead>
          <tbody>
            <tr><td>対右</td><td>${D.escapeHtml(row["対右打数"] || "")}</td><td>${D.formatValue(row["対右打率"], "対右打率")}</td><td>${D.escapeHtml(row["対右安打"] || "")}</td><td>${D.escapeHtml(row["対右本塁打"] || "")}</td><td>${D.escapeHtml(row["対右三振"] || "")}</td><td>${D.escapeHtml(row["対右四球"] || "")}</td><td>${D.escapeHtml(row["対右死球"] || "")}</td><td>${D.escapeHtml(row["対右犠打"] || "")}</td><td>${D.escapeHtml(row["対右犠飛"] || "")}</td></tr>
            <tr><td>対左</td><td>${D.escapeHtml(row["対左打数"] || "")}</td><td>${D.formatValue(row["対左打率"], "対左打率")}</td><td>${D.escapeHtml(row["対左安打"] || "")}</td><td>${D.escapeHtml(row["対左本塁打"] || "")}</td><td>${D.escapeHtml(row["対左三振"] || "")}</td><td>${D.escapeHtml(row["対左四球"] || "")}</td><td>${D.escapeHtml(row["対左死球"] || "")}</td><td>${D.escapeHtml(row["対左犠打"] || "")}</td><td>${D.escapeHtml(row["対左犠飛"] || "")}</td></tr>
          </tbody>
        </table>
        ${splitCards(columns, rows)}
      `;
    }
    const columns = ["区分", "被打数", "被打率", "被安打", "被本塁打", "奪三振", "与四球"];
    const rows = [
      ["対右", row["対右被打数"] || "", D.formatValue(row["対右被打率"], "対右被打率"), row["対右被安打"] || "", row["対右被本塁打"] || "", row["対右奪三振"] || "", row["対右与四球"] || ""],
      ["対左", row["対左被打数"] || "", D.formatValue(row["対左被打率"], "対左被打率"), row["対左被安打"] || "", row["対左被本塁打"] || "", row["対左奪三振"] || "", row["対左与四球"] || ""],
    ];
    return `
      <table class="compact-table">
        <thead><tr><th>区分</th><th>被打数</th><th>被打率</th><th>被安打</th><th>被本塁打</th><th>奪三振</th><th>与四球</th></tr></thead>
        <tbody>
          <tr><td>対右</td><td>${D.escapeHtml(row["対右被打数"] || "")}</td><td>${D.formatValue(row["対右被打率"], "対右被打率")}</td><td>${D.escapeHtml(row["対右被安打"] || "")}</td><td>${D.escapeHtml(row["対右被本塁打"] || "")}</td><td>${D.escapeHtml(row["対右奪三振"] || "")}</td><td>${D.escapeHtml(row["対右与四球"] || "")}</td></tr>
          <tr><td>対左</td><td>${D.escapeHtml(row["対左被打数"] || "")}</td><td>${D.formatValue(row["対左被打率"], "対左被打率")}</td><td>${D.escapeHtml(row["対左被安打"] || "")}</td><td>${D.escapeHtml(row["対左被本塁打"] || "")}</td><td>${D.escapeHtml(row["対左奪三振"] || "")}</td><td>${D.escapeHtml(row["対左与四球"] || "")}</td></tr>
        </tbody>
      </table>
      ${splitCards(columns, rows)}
    `;
  }

  function playerNameKey(value) {
    return String(value ?? "").normalize("NFKC").replace(/[\s\u3000]/g, "");
  }

  function opponentValue(value, column = "") {
    if (value === undefined || value === null || String(value).trim() === "") return "—";
    const formatted = D.formatValue(value, column);
    return formatted === "" ? "—" : formatted;
  }

  function hasOpponentResult(row, isBatter) {
    if (isBatter) return D.toNumber(row["試合"]) > 0;
    const appearanceFields = ["先発", "救援"];
    const decisionFields = ["勝利", "敗戦", "HLD", "セーブ"];
    return appearanceFields.some((field) => D.toNumber(row[field]) > 0)
      || decisionFields.some((field) => D.toNumber(row[field]) > 0);
  }

  function opponentStatsTable(rows, isBatter) {
    const columns = isBatter
      ? ["対戦相手", "試合", "打席", "打率", "本塁打", "打点"]
      : ["対戦相手", "先発", "救援", "防御率", "勝利", "敗戦", "HLD", "セーブ"];
    const cells = isBatter
      ? (item) => [
          item["対球団名"],
          opponentValue(item["試合"]),
          opponentValue(item["打席"]),
          opponentValue(item["打率"], "打率"),
          opponentValue(item["本塁打"]),
          opponentValue(item["打点"]),
        ]
      : (item) => [
          item["対球団名"],
          opponentValue(item["先発"]),
          opponentValue(item["救援"]),
          opponentValue(item["防御率"], "防御率"),
          opponentValue(item["勝利"]),
          opponentValue(item["敗戦"]),
          opponentValue(item["HLD"]),
          opponentValue(item["セーブ"]),
        ];

    if (!rows.length) return `<p class="empty-state">対球団別の成績はまだありません。</p>`;
    return `
      <p class="small-note">対戦相手別に、今季の出場がある成績のみを表示しています。</p>
      <div class="compact-table-wrap opponent-stats-wrap">
        <table class="compact-table opponent-stats-table">
          <thead><tr>${columns.map((column) => `<th>${D.escapeHtml(column)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((item) => `
              <tr>${cells(item).map((value) => `<td>${D.escapeHtml(value)}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function fieldingTable(rows) {
    if (!rows.length) return "";
    return `
      <section class="content-card">
        <h2>守備成績</h2>
        <div class="compact-table-wrap">
          <table class="compact-table">
            <thead><tr><th>守備位置</th><th>守備評価</th><th>試合</th><th>守備率</th><th>守備機会</th><th>失策</th><th>補殺</th><th>併殺</th><th>盗塁阻止率</th></tr></thead>
            <tbody>
              ${rows.map((item) => `
                <tr>
                  <td>${D.escapeHtml(item["ポジション"])}</td>
                  <td class="score">${D.formatValue(item["守備評価"], "スコア")}</td>
                  <td>${D.escapeHtml(item["試合"])}</td>
                  <td>${D.formatValue(item["守備率"], "守備率")}</td>
                  <td>${D.escapeHtml(item["守備機会"])}</td>
                  <td>${D.escapeHtml(item["失策"])}</td>
                  <td>${D.escapeHtml(item["補殺"])}</td>
                  <td>${D.escapeHtml(item["併殺"])}</td>
                  <td>${item["盗塁阻止率"] === "" ? "-" : D.formatValue(item["盗塁阻止率"], "盗塁阻止率")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }


  function starterRate(value) {
    return `${(D.toNumber(value) * 100).toFixed(1)}%`;
  }

  function starterEra(value) {
    return D.toNumber(value).toFixed(2);
  }

  function starterAverage(value) {
    return D.toNumber(value).toFixed(2);
  }

  function starterRecord(row) {
    return `${D.toInt(row["チーム勝"])}勝${D.toInt(row["チーム敗"])}敗${D.toInt(row["チーム分"])}分`;
  }

  function starterDetailUrl(teamName, playerName, view = "batteries") {
    const query = new URLSearchParams({ view, team: teamName, search: playerName });
    return `./starter-battery.html?${query.toString()}`;
  }

  function pitcherUsageUrl(teamName, playerName) {
    const query = new URLSearchParams({ team: teamName, player: playerName });
    return `./pitcher-usage.html?${query.toString()}`;
  }

  function starterPlayerLink(teamName, playerName, playerType) {
    const href = D.playerUrl({ チーム: teamName, 選手名: playerName }, playerType);
    return `<a href="${D.escapeHtml(href)}">${D.escapeHtml(playerName)}</a>`;
  }

  function pitcherBatteryMarkup(summaryRow, batteryRows) {
    if (!summaryRow && !batteryRows.length) return "";
    const sortedRows = [...batteryRows].sort((a, b) => D.toInt(b["先発回数"]) - D.toInt(a["先発回数"]) || String(b["最新登板日"] || "").localeCompare(String(a["最新登板日"] || "")));
    const overview = summaryRow ? [
      ["先発数", `${D.toInt(summaryRow["先発数"])}試合`],
      ["組んだ捕手", `${D.toInt(summaryRow["組んだ捕手数"])}人`],
      ["最多先発捕手", summaryRow["最多先発捕手名"] || "—"],
      ["チーム成績", starterRecord(summaryRow)],
      ["防御率", starterEra(summaryRow["防御率"])],
      ["QS率", starterRate(summaryRow["QS率"])],
      ["HQS率", starterRate(summaryRow["HQS率"])],
      ["平均援護点", starterAverage(summaryRow["平均援護点"])],
    ] : [];

    return `
      <section class="content-card player-starter-section">
        <div class="section-heading">
          <div><p class="eyebrow">Starter Battery</p><h2>先発バッテリー成績</h2></div>
          <a href="${D.escapeHtml(starterDetailUrl(activeTeam, activeName))}">全履歴を見る</a>
        </div>
        <p class="small-note">先発登板時に組んだ捕手別の成績です。防御率やQS率は、その組み合わせで先発した試合を集計しています。</p>
        ${overview.length ? metricCards(overview) : ""}
        <div class="compact-table-wrap player-starter-wrap">
          <table class="compact-table player-starter-table">
            <thead><tr><th>捕手</th><th>先発</th><th>チーム成績</th><th>防御率</th><th>QS率</th><th>HQS率</th><th>平均投球回</th><th>平均援護点</th><th>最新登板</th></tr></thead>
            <tbody>
              ${sortedRows.map((item) => `
                <tr>
                  <td>${starterPlayerLink(item["球団"], item["先発捕手名"], "batter")}</td>
                  <td>${D.toInt(item["先発回数"])}</td>
                  <td>${D.escapeHtml(starterRecord(item))}</td>
                  <td>${starterEra(item["防御率"])}</td>
                  <td>${starterRate(item["QS率"])}</td>
                  <td>${starterRate(item["HQS率"])}</td>
                  <td>${starterAverage(item["平均投球回"])}</td>
                  <td>${starterAverage(item["平均援護点"])}</td>
                  <td>${D.escapeHtml(formatDate(item["最新登板日"]))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function catcherStarterMaskMarkup(batteryRows) {
    if (!batteryRows.length) return "";
    const sortedRows = [...batteryRows].sort((a, b) => D.toInt(b["先発回数"]) - D.toInt(a["先発回数"]) || String(b["最新登板日"] || "").localeCompare(String(a["最新登板日"] || "")));
    const totals = batteryRows.reduce((result, item) => {
      result.starts += D.toInt(item["先発回数"]);
      result.wins += D.toInt(item["チーム勝"]);
      result.losses += D.toInt(item["チーム敗"]);
      result.draws += D.toInt(item["チーム分"]);
      result.outs += D.toInt(item["投球アウト数"]);
      result.earnedRuns += D.toInt(item["自責点合計"]);
      result.qs += D.toInt(item["QS"]);
      result.hqs += D.toInt(item["HQS"]);
      result.support += D.toNumber(item["援護点合計"]);
      return result;
    }, { starts: 0, wins: 0, losses: 0, draws: 0, outs: 0, earnedRuns: 0, qs: 0, hqs: 0, support: 0 });
    const decisions = totals.wins + totals.losses;
    const winRate = decisions ? totals.wins / decisions : 0;
    const era = totals.outs ? totals.earnedRuns * 27 / totals.outs : 0;
    const averageInnings = totals.starts ? totals.outs / 3 / totals.starts : 0;
    const averageSupport = totals.starts ? totals.support / totals.starts : 0;
    const overview = [
      ["先発マスク", `${totals.starts}試合`],
      ["組んだ先発投手", `${batteryRows.length}人`],
      ["チーム成績", `${totals.wins}勝${totals.losses}敗${totals.draws}分`],
      ["チーム勝率", `${(winRate * 100).toFixed(1)}%`],
      ["防御率", era.toFixed(2)],
      ["QS率", `${(totals.starts ? totals.qs / totals.starts * 100 : 0).toFixed(1)}%`],
      ["HQS率", `${(totals.starts ? totals.hqs / totals.starts * 100 : 0).toFixed(1)}%`],
      ["平均投球回", averageInnings.toFixed(2)],
      ["平均援護点", averageSupport.toFixed(2)],
    ];

    return `
      <section class="content-card player-starter-section">
        <div class="section-heading">
          <div><p class="eyebrow">Starting Catcher</p><h2>先発マスク成績</h2></div>
          <a href="${D.escapeHtml(starterDetailUrl(activeTeam, activeName))}">全履歴を見る</a>
        </div>
        <p class="small-note">先発捕手として組んだ投手別の成績です。途中出場や途中交代後の投手成績は含みません。</p>
        ${metricCards(overview)}
        <div class="compact-table-wrap player-starter-wrap">
          <table class="compact-table player-starter-table">
            <thead><tr><th>先発投手</th><th>先発</th><th>チーム成績</th><th>防御率</th><th>QS率</th><th>HQS率</th><th>平均投球回</th><th>平均援護点</th><th>最新登板</th></tr></thead>
            <tbody>
              ${sortedRows.map((item) => `
                <tr>
                  <td>${starterPlayerLink(item["球団"], item["先発投手名"], "pitcher")}</td>
                  <td>${D.toInt(item["先発回数"])}</td>
                  <td>${D.escapeHtml(starterRecord(item))}</td>
                  <td>${starterEra(item["防御率"])}</td>
                  <td>${starterRate(item["QS率"])}</td>
                  <td>${starterRate(item["HQS率"])}</td>
                  <td>${starterAverage(item["平均投球回"])}</td>
                  <td>${starterAverage(item["平均援護点"])}</td>
                  <td>${D.escapeHtml(formatDate(item["最新登板日"]))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }


  function formatDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (!match) return text || "—";
    return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
  }

  function formatPeriod(value) {
    const text = String(value || "").trim();
    const parts = text.split("_");
    if (parts.length !== 2) return text || "—";
    const short = (item) => {
      const match = item.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      return match ? `${Number(match[2])}月${Number(match[3])}日` : item;
    };
    return `${short(parts[0])}〜${short(parts[1])}`;
  }

  function recentFormMarkup(recentRow, isBatter) {
    const hasActivity = recentRow && (isBatter ? D.toInt(recentRow["打席"]) > 0 : D.toInt(recentRow["投球アウト数"]) > 0);
    if (!hasActivity) {
      return `
        <section class="content-card recent-player-section">
          <div class="section-heading"><div><p class="eyebrow">Recent Form</p><h2>出場した直近6試合の成績</h2></div></div>
          <p class="empty-state">直近6試合の出場データはありません。</p>
        </section>
      `;
    }
    const items = isBatter
      ? [
          ["集計対象", "出場した直近6試合"],
          ["打数", recentRow["打数"]],
          ["打率", D.formatValue(recentRow["打率"], "打率")],
          ["OPS", D.formatValue(recentRow["OPS"], "OPS")],
          ["安打", recentRow["安打"]],
          ["本塁打", recentRow["本塁打"]],
          ["打点", recentRow["打点"]],
          ["盗塁成功", recentRow["盗塁成功"] || "0"],
          ["盗塁死", recentRow["盗塁死"] || "0"],
          ["盗塁企図", recentRow["盗塁企図"] || "0"],
          ["盗塁成功率", recentRow["盗塁成功率"] === "" ? "—" : D.formatValue(recentRow["盗塁成功率"], "盗塁成功率")],
          ["データ更新日", recentRow["更新日"] || "—"],
        ]
      : [
          ["集計対象", "出場した直近6試合"],
          ["登板", recentRow["登板"] || "0"],
          ["先発 / 救援", `${recentRow["先発"] || 0} / ${recentRow["救援"] || 0}`],
          ["投球回", recentRow["投球回"] || D.inningsFromOuts(recentRow["投球アウト数"])],
          ["防御率", D.formatValue(recentRow["防御率"], "防御率")],
          ["WHIP", recentRow["WHIP"] || "—"],
          ["奪三振", recentRow["奪三振"]],
          ["K%", D.formatValue(recentRow["K%"], "K%") || "—"],
          ["K-BB%", D.formatValue(recentRow["K-BB%"], "K-BB%") || "—"],
          ["K/9", recentRow["K/9"] || "—"],
          ["BB/9", recentRow["BB/9"] || "—"],
          ["HR/9", recentRow["HR/9"] || "—"],
          ...(recentRow["平均Game Score"] ? [["平均Game Score", recentRow["平均Game Score"]]] : []),
          ["データ更新日", recentRow["更新日"] || "—"],
        ];
    return `
      <section class="content-card recent-player-section">
        <div class="section-heading"><div><p class="eyebrow">Recent Form</p><h2>出場した直近6試合の成績</h2></div><a href="./recent-form.html">直近成績一覧</a></div>
        ${metricCards(items)}
      </section>
    `;
  }

  function registrationMarkup(rosterRow) {
    if (!rosterRow) {
      return `
        <section class="content-card registration-card">
          <div class="section-heading"><div><p class="eyebrow">Roster</p><h2>現在の登録状況</h2></div><a href="./roster.html">登録状況一覧</a></div>
          <p class="empty-state">登録履歴データで確認できませんでした。</p>
        </section>
      `;
    }
    const isRegistered = String(rosterRow["現在登録中"] || "").includes("登録中");
    const status = isRegistered ? "一軍登録中" : rosterRow["抹消日"] ? "現在抹消中" : "一軍登録外";
    const statusClass = isRegistered ? "is-registered" : "is-off-roster";
    return `
      <section class="content-card registration-card">
        <div class="section-heading"><div><p class="eyebrow">Roster</p><h2>現在の登録状況</h2></div><a href="./roster.html">登録状況一覧</a></div>
        <div class="registration-summary ${statusClass}">
          <strong>${D.escapeHtml(status)}</strong>
          <dl>
            <div><dt>登録日</dt><dd>${D.escapeHtml(formatDate(rosterRow["登録日"]))}</dd></div>
            <div><dt>抹消日</dt><dd>${D.escapeHtml(formatDate(rosterRow["抹消日"]))}</dd></div>
            <div><dt>区分</dt><dd>${D.escapeHtml(rosterRow["区分"] || "—")}</dd></div>
            <div><dt>更新日</dt><dd>${D.escapeHtml(formatDate(rosterRow["更新日"]))}</dd></div>
          </dl>
        </div>
      </section>
    `;
  }

  function teamRank(row, rows, ranking) {
    const ranked = D.rankRows(rows, ranking, row["チーム"], 999);
    const index = ranked.findIndex((candidate) => D.playerKey(candidate) === D.playerKey(row));
    return index === -1 ? "対象外" : `${index + 1}位`;
  }

  try {
    const [data, fieldingRows, opponentStats, insightData, rosterRows, starterData] = await Promise.all([
      D.loadData(),
      D.loadFieldingData(),
      D.loadOpponentStatsData(),
      D.loadInsightData(),
      D.loadRosterData(),
      D.loadStarterBatteryData(),
    ]);
    const rows = type === "pitcher" ? data.pitchers : data.batters;
    const exactRow = rows.find((candidate) => candidate["チーム"] === team && playerNameKey(candidate["選手名"]) === playerNameKey(name));
    const nameRows = rows.filter((candidate) => playerNameKey(candidate["選手名"]) === playerNameKey(name));
    const row = exactRow || (nameRows.length === 1 ? nameRows[0] : null);
    if (!row) {
      content.innerHTML = `<section class="content-card">選手が見つかりませんでした。</section>`;
      return;
    }
    activeTeam = row["チーム"];
    activeName = row["選手名"];

    const isBatter = type !== "pitcher";
    const ranking = D.RANKINGS.find((item) => item.id === (isBatter ? "batter-overall" : "pitcher-overall"));
    const teamRows = isBatter ? data.batters : data.pitchers;
    const scoreKey = ranking.scoreKey;
    const playerFielding = fieldingRows
      .filter((item) => item["チーム"] === row["チーム"] && item["選手名"] === row["選手名"])
      .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]));
    const playerOpponentStats = (isBatter ? opponentStats.batters : opponentStats.pitchers)
      .filter((item) => item["チーム"] === row["チーム"] && playerNameKey(item["選手名"]) === playerNameKey(row["選手名"]))
      .filter((item) => hasOpponentResult(item, isBatter));
    const recentRows = isBatter ? insightData.recentBatters : insightData.recentPitchers;
    const recentRow = recentRows.find((item) => item["チーム"] === row["チーム"] && playerNameKey(item["選手名"]) === playerNameKey(row["選手名"]));
    const rosterRow = rosterRows
      .filter((item) => item["チーム"] === row["チーム"] && playerNameKey(item["選手名"]) === playerNameKey(row["選手名"]))
      .sort((a, b) => String(b["更新日"] || "").localeCompare(String(a["更新日"] || "")))[0];
    const pitcherStarterSummary = !isBatter
      ? starterData.pitchers.find((item) => item["球団"] === row["チーム"] && playerNameKey(item["先発投手名"]) === playerNameKey(row["選手名"]))
      : null;
    const pitcherBatteryRows = !isBatter
      ? starterData.batteries.filter((item) => item["球団"] === row["チーム"] && playerNameKey(item["先発投手名"]) === playerNameKey(row["選手名"]))
      : [];
    const catcherBatteryRows = isBatter
      ? starterData.batteries.filter((item) => item["球団"] === row["チーム"] && playerNameKey(item["先発捕手名"]) === playerNameKey(row["選手名"]))
      : [];

    document.title = `${row["選手名"]} 2026成績 | Player Lens`;
    title.textContent = `${row["選手名"]} 2026成績`;
    lead.textContent = `${row["チーム"]} / ${row["年齢"] || "-"}歳 / ${row["ポジション"] || "-"} / ${row["投"] || "-"}投${row["打"] || "-"}打`;

    const mainMetrics = isBatter
      ? [
          ["打席", row["打席"]],
          ["打率", D.formatValue(row["打率"], "打率")],
          ["OPS", D.formatValue(row["OPS"], "OPS")],
          ["本塁打", row["本塁打"]],
          ["打点", row["打点"]],
          ["盗塁", row["盗塁"] || "0"],
          ["規定打席", row["規定打席到達"] || "未到達"],
          ["チーム内順位", teamRank(row, teamRows, ranking)],
        ]
      : [
          ["登板", row["登板"] || "0"],
          ["先発 / 救援", `${row["先発"] || 0} / ${row["救援"] || 0}`],
          ["投球回", row["投球回"]],
          ["防御率", D.formatValue(row["防御率"], "防御率")],
          ["WHIP", row["WHIP"] || "—"],
          ["勝敗", `${row["勝利"] || 0}勝${row["敗戦"] || 0}敗`],
          ["奪三振", row["奪三振"]],
          ["セーブ / ホールド", `${row["セーブ"] || 0} / ${row["ホールド"] || 0}`],
          ["K%", D.formatValue(row["K%"], "K%") || "—"],
          ["K-BB%", D.formatValue(row["K-BB%"], "K-BB%") || "—"],
          ["K/9", row["K/9"] || "—"],
          ["BB/9", row["BB/9"] || "—"],
          ["HR/9", row["HR/9"] || "—"],
          ...(row["平均Game Score"] ? [["平均Game Score", row["平均Game Score"]]] : []),
          ["データ更新日", row["更新日"] || "—"],
          ["規定投球回", row["規定投球回到達"] || "未到達"],
          ["チーム内順位", teamRank(row, teamRows, ranking)],
        ];

    content.innerHTML = `
      <section class="content-card player-hero-card">
        <div>
          <p class="eyebrow">${D.escapeHtml(row["チーム"])}</p>
          <h2>${D.escapeHtml(row["選手名"])}</h2>
          <p>${D.escapeHtml(row["ポジション"] || "")} ${D.escapeHtml(row["投"] || "-")}投${D.escapeHtml(row["打"] || "-")}打</p>
        </div>
        <div class="player-score">
          <span>Player Lens Score</span>
          <strong>${D.formatValue(row[scoreKey], "スコア")}</strong>
        </div>
      </section>

      <section class="content-card">
        <h2>主な成績</h2>
        ${!isBatter && row["移籍選手"] === "TRUE" ? '<p class="notice">移籍した選手の成績はシーズン通算です。現在の所属球団で確認してください。</p>' : ""}
        ${!isBatter && D.toInt(row["登板"]) === 0 ? '<p class="notice">今季一軍登板はありません。</p>' : ""}
        ${!isBatter && !D.isSeasonStarterEligible(row) && !D.isSeasonRelieverEligible(row) ? '<p class="small-note">データに質問のランキング掲載条件には未到達です。選手個人の成績は条件にかかわらず表示しています。</p>' : ""}
        ${metricCards(mainMetrics)}
      </section>

      ${registrationMarkup(rosterRow)}

      ${recentFormMarkup(recentRow, isBatter)}

      ${isBatter ? catcherStarterMaskMarkup(catcherBatteryRows) : pitcherBatteryMarkup(pitcherStarterSummary, pitcherBatteryRows)}

      <section class="content-card">
        <h2>左右別成績</h2>
        <div class="compact-table-wrap player-split-wrap">${splitTable(row, isBatter)}</div>
      </section>

      <section class="content-card">
        <h2>対球団別成績</h2>
        ${opponentStatsTable(playerOpponentStats, isBatter)}
      </section>

      ${fieldingTable(playerFielding)}

      <section class="content-card soft-callout">
        <h2>関連して見る</h2>
        <div class="resource-grid">
          <a href="${D.teamUrl(row["チーム"])}">${D.escapeHtml(row["チーム"])}のチーム別ランキング</a>
          ${(!isBatter && pitcherBatteryRows.length) || (isBatter && catcherBatteryRows.length) ? `<a href="${D.escapeHtml(starterDetailUrl(row["チーム"], row["選手名"]))}">先発バッテリー履歴</a>` : ""}
          ${!isBatter ? `<a href="${D.escapeHtml(pitcherUsageUrl(row["チーム"], row["選手名"]))}">投手登板状況・投球数</a>` : ""}
          <a href="./insights.html">注目データ</a>
          <a href="./defense.html">守備データ</a>
          <a href="./guide.html">ランキングの見方</a>
          <a href="./index.html">全体ランキングへ戻る</a>
        </div>
      </section>
    `;
    D.enhanceCompactTables(content);
  } catch (error) {
    content.innerHTML = `<section class="content-card">${D.escapeHtml(error.message)}</section>`;
  }
})();
