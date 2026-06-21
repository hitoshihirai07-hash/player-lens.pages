(async function () {
  const D = window.PlayerLensData;
  const params = new URLSearchParams(location.search);
  const name = params.get("name") || "";
  const team = params.get("team") || "";
  const type = params.get("type") || "batter";
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
      const columns = ["区分", "打数", "打率", "安打", "本塁打", "打点"];
      const rows = [
        ["対右", row["対右打数"] || "", D.formatValue(row["対右打率"], "対右打率"), row["対右安打"] || "", row["対右本塁打"] || "", row["対右打点"] || ""],
        ["対左", row["対左打数"] || "", D.formatValue(row["対左打率"], "対左打率"), row["対左安打"] || "", row["対左本塁打"] || "", row["対左打点"] || ""],
      ];
      return `
        <table class="compact-table">
          <thead><tr><th>区分</th><th>打数</th><th>打率</th><th>安打</th><th>本塁打</th><th>打点</th></tr></thead>
          <tbody>
            <tr><td>対右</td><td>${D.escapeHtml(row["対右打数"] || "")}</td><td>${D.formatValue(row["対右打率"], "対右打率")}</td><td>${D.escapeHtml(row["対右安打"] || "")}</td><td>${D.escapeHtml(row["対右本塁打"] || "")}</td><td>${D.escapeHtml(row["対右打点"] || "")}</td></tr>
            <tr><td>対左</td><td>${D.escapeHtml(row["対左打数"] || "")}</td><td>${D.formatValue(row["対左打率"], "対左打率")}</td><td>${D.escapeHtml(row["対左安打"] || "")}</td><td>${D.escapeHtml(row["対左本塁打"] || "")}</td><td>${D.escapeHtml(row["対左打点"] || "")}</td></tr>
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
    if (isBatter) return String(row["試合"] ?? "").trim() !== "";
    const appearanceFields = ["先発", "救援", "防御率"];
    const decisionFields = ["勝利", "敗戦", "HLD", "セーブ"];
    return appearanceFields.some((field) => String(row[field] ?? "").trim() !== "")
      || decisionFields.some((field) => D.toNumber(row[field]) > 0);
  }

  function opponentStatsTable(rows, isBatter) {
    const columns = isBatter
      ? ["対戦相手", "試合", "打率", "本塁打", "打点", "盗塁"]
      : ["対戦相手", "先発", "救援", "防御率", "勝利", "敗戦", "HLD", "セーブ"];
    const cells = isBatter
      ? (item) => [
          item["対球団名"],
          opponentValue(item["試合"]),
          opponentValue(item["打率"], "打率"),
          opponentValue(item["本塁打"]),
          opponentValue(item["打点"]),
          opponentValue(item["盗塁"]),
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

  function teamRank(row, rows, ranking) {
    const ranked = D.rankRows(rows, ranking, row["チーム"], 999);
    const index = ranked.findIndex((candidate) => D.playerKey(candidate) === D.playerKey(row));
    return index === -1 ? "対象外" : `${index + 1}位`;
  }

  try {
    const [data, fieldingRows, opponentStats] = await Promise.all([
      D.loadData(),
      D.loadFieldingData(),
      D.loadOpponentStatsData(),
    ]);
    const rows = type === "pitcher" ? data.pitchers : data.batters;
    const row = rows.find((candidate) => candidate["チーム"] === team && candidate["選手名"] === name);
    if (!row) {
      content.innerHTML = `<section class="content-card">選手が見つかりませんでした。</section>`;
      return;
    }

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
          ["規定打席", row["規定打席到達"] || "未到達"],
          ["チーム内順位", teamRank(row, teamRows, ranking)],
        ]
      : [
          ["投球回", row["投球回"]],
          ["防御率", D.formatValue(row["防御率"], "防御率")],
          ["奪三振", row["奪三振"]],
          ["勝利", row["勝利"]],
          ["セーブ/HP", `${row["セーブ"] || 0} / ${row["ＨＰ"] || 0}`],
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
        ${metricCards(mainMetrics)}
      </section>

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
