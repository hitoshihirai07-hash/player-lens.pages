(() => {
  const D = window.PlayerLensData;
  if (!D) return;

  const contentEl = document.getElementById("awardContent");
  const summaryEl = document.getElementById("awardSummary");
  const statusEl = document.getElementById("awardStatus");
  const updatedEl = document.getElementById("awardUpdated");
  const leagueTabsEl = document.getElementById("awardLeagueTabs");
  const typeTabsEl = document.getElementById("awardTypeTabs");

  const state = { league: "セ", award: "best-nine" };
  const POSITION_LABELS = [
    { key: "(投)", label: "投手", type: "pitcher" },
    { key: "(捕)", label: "捕手", type: "batter" },
    { key: "(一)", label: "一塁手", type: "batter" },
    { key: "(二)", label: "二塁手", type: "batter" },
    { key: "(三)", label: "三塁手", type: "batter" },
    { key: "(遊)", label: "遊撃手", type: "batter" },
    { key: "outfield", keys: ["(左)", "(中)", "(右)"], label: "外野手", type: "batter", slots: 3 },
    { key: "(指)", label: "指名打者", type: "batter", pacificOnly: true },
  ];
  const FIELDING_ORDER = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"];

  let data;
  let insight;
  let fielding;
  let standings;
  let batterMap;
  let pitcherMap;
  let standingsMap;

  function escape(value) {
    return D.escapeHtml(value ?? "");
  }

  function score(value) {
    return D.toNumber(value);
  }

  function teamLeague(team) {
    return D.leagueOfTeam(team);
  }

  function playerLink(row, type) {
    return `<a class="award-player-link" href="${D.playerUrl(row, type)}">${escape(row["選手名"])}</a>`;
  }

  function teamLink(team) {
    return `<a class="award-team-link" href="${D.teamUrl(team)}">${escape(team)}</a>`;
  }

  function positionStarts(row, position) {
    const keys = position.keys || [position.key];
    return keys.reduce((sum, key) => sum + D.toInt(row[key]), 0);
  }

  function teamGames(team) {
    return D.toInt(standingsMap.get(team)?.["試合数"] || 0);
  }

  function latestDate() {
    const values = [
      ...data.pitchers.map((row) => row["更新日"]),
      ...insight.starterPositions.map((row) => row["更新日"]),
      ...fielding.map((row) => row["更新日"]),
      ...standings.map((row) => row["更新日"]),
    ].filter(Boolean);
    return values.sort((a, b) => String(b).replace(/\D/g, "").localeCompare(String(a).replace(/\D/g, "")))[0] || "";
  }

  function leagueLabel() {
    return state.league === "セ" ? "セ・リーグ" : "パ・リーグ";
  }

  function awardCardClass(rank) {
    return rank === 1 ? "is-first" : rank === 2 ? "is-second" : rank === 3 ? "is-third" : "";
  }

  function medal(rank) {
    return rank === 1 ? "1" : rank === 2 ? "2" : rank === 3 ? "3" : String(rank);
  }

  function formatRate(value, column) {
    const text = D.formatValue(value, column);
    return text || "-";
  }

  function renderSummary(items) {
    summaryEl.innerHTML = items.map(([label, value, note]) => `
      <article class="award-summary-card">
        <span>${escape(label)}</span>
        <strong>${escape(value)}</strong>
        ${note ? `<small>${escape(note)}</small>` : ""}
      </article>
    `).join("");
  }

  function awardScoreForPosition(season, starts, type) {
    const base = score(season[type === "pitcher" ? "投手総合スコア" : "打者総合スコア"]);
    return base + Math.min(starts, 120) * (type === "pitcher" ? 0.25 : 0.7);
  }

  function bestNinePositionStarts(row, positionKey) {
    if (positionKey === "outfield") {
      return D.toInt(row["(左)"]) + D.toInt(row["(中)"]) + D.toInt(row["(右)"]);
    }
    return D.toInt(row[positionKey]);
  }

  function primaryBestNinePositions(row) {
    const positions = ["(捕)", "(一)", "(二)", "(三)", "(遊)", "outfield", "(指)"];
    const counts = positions.map((key) => [key, bestNinePositionStarts(row, key)]);
    const maxStarts = Math.max(0, ...counts.map(([, starts]) => starts));
    return new Set(counts.filter(([, starts]) => starts > 0 && starts === maxStarts).map(([key]) => key));
  }

  function bestNineMinimumStarts(team) {
    const games = teamGames(team);
    return games > 0 ? Math.ceil(games / 3) : 40;
  }

  function bestNineCandidates(position) {
    if (position.type === "pitcher") {
      return data.pitchers
        .filter((row) => row["リーグ"] === state.league)
        .filter((row) => score(row["投球回_計算用"]) >= 40 || D.toInt(row["セーブ"]) + D.toInt(row["ホールド"]) >= 20)
        .map((season) => ({ season, type: "pitcher", starts: D.toInt(season["先発"]), awardScore: awardScoreForPosition(season, D.toInt(season["先発"]), "pitcher") }))
        .sort((a, b) => b.awardScore - a.awardScore);
    }

    return insight.starterPositions
      .filter((row) => row["リーグ"] === state.league)
      .map((row) => {
        const season = batterMap.get(D.playerKey(row));
        const starts = positionStarts(row, position);
        const positionKey = position.key === "outfield" ? "outfield" : position.key;
        const primaryPositions = primaryBestNinePositions(row);
        return {
          row,
          season,
          type: "batter",
          starts,
          isPrimaryPosition: primaryPositions.has(positionKey),
          awardScore: season ? awardScoreForPosition(season, starts, "batter") : 0,
        };
      })
      .filter((item) => {
        if (!item.season || item.starts <= 0 || !item.isPrimaryPosition) return false;
        return item.starts >= bestNineMinimumStarts(item.season["チーム"]);
      })
      .sort((a, b) => b.awardScore - a.awardScore || b.starts - a.starts);
  }

  function bestNineStats(item, position) {
    const season = item.season;
    if (item.type === "pitcher") {
      return [
        ["防御率", formatRate(season["防御率"], "防御率")],
        ["勝利", season["勝利"] || "0"],
        ["奪三振", season["奪三振"] || "0"],
        ["投球回", season["投球回"] || "0"],
      ];
    }
    return [
      ["打率", formatRate(season["打率"], "打率")],
      ["本塁打", season["本塁打"] || "0"],
      ["打点", season["打点"] || "0"],
      [position.key === "(指)" ? "DH先発" : "先発", item.starts],
    ];
  }

  function candidateCard(item, position, rank) {
    const season = item.season;
    const stats = bestNineStats(item, position);
    return `
      <article class="award-candidate ${awardCardClass(rank)}">
        <div class="award-rank-badge">${medal(rank)}</div>
        <div class="award-candidate-main">
          <div class="award-candidate-name">${playerLink(season, item.type)}</div>
          <div class="award-candidate-team">${teamLink(season["チーム"])}</div>
        </div>
        <dl class="award-mini-stats">
          ${stats.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}
        </dl>
      </article>
    `;
  }

  function renderBestNine() {
    const positions = POSITION_LABELS.filter((position) => !position.pacificOnly || state.league === "パ");
    const blocks = positions.map((position) => {
      const limit = position.slots === 3 ? 5 : 3;
      const candidates = bestNineCandidates(position).slice(0, limit);
      const top = candidates[0];
      return `
        <section class="content-card award-position-card">
          <div class="award-section-heading">
            <div>
              <p class="eyebrow">Best Nine</p>
              <h2>${escape(position.label)}</h2>
            </div>
            ${top ? `<span class="award-leader-chip">現在1位 ${escape(top.season["選手名"])}</span>` : ""}
          </div>
          <div class="award-candidate-list">
            ${candidates.length ? candidates.map((item, index) => candidateCard(item, position, index + 1)).join("") : '<p class="empty-state">候補データがありません。</p>'}
          </div>
          ${position.slots === 3 ? '<p class="small-note">外野手は左翼・中堅・右翼の起用を合算し、上位候補を表示します。</p>' : ""}
        </section>
      `;
    });

    const leaders = positions.map((position) => bestNineCandidates(position)[0]).filter(Boolean);
    renderSummary([
      ["表示中", `${leagueLabel()} ベストナイン`, "成績＋守備位置別の起用"],
      ["ポジション", `${positions.length}区分`, state.league === "パ" ? "DHを含む" : "外野手は3枠"],
      ["1位候補", `${leaders.length}人`, "各ポジションの現在1位"],
      ["選定条件", "主戦ポジション", "最多先発＋チーム試合数の1/3以上"],
    ]);
    contentEl.innerHTML = `<div class="award-position-grid">${blocks.join("")}</div>`;
  }

  function goldGloveEligible(row) {
    const games = teamGames(row["チーム"]);
    if (!games) return true;
    if (row["ポジション"] !== "投手") return D.toInt(row["試合"]) >= Math.ceil(games / 2);
    const pitcher = pitcherMap.get(D.playerKey(row));
    if (!pitcher) return false;
    return score(pitcher["投球回_計算用"]) >= games || D.toInt(pitcher["登板"]) >= Math.ceil(games / 3);
  }

  function fieldingStats(row) {
    const stats = [
      ["試合", row["試合"] || "0"],
      ["守備率", formatRate(row["守備率"], "守備率")],
      ["失策", row["失策"] || "0"],
    ];
    if (row["ポジション"] === "捕手") stats.push(["盗塁阻止率", formatRate(row["盗塁阻止率"], "盗塁阻止率")]);
    else stats.push(["補殺", row["補殺"] || "0"]);
    return stats;
  }

  function goldGloveCard(row, rank) {
    const type = row["ポジション"] === "投手" ? "pitcher" : "batter";
    const season = (type === "pitcher" ? pitcherMap : batterMap).get(D.playerKey(row)) || row;
    return `
      <article class="award-candidate ${awardCardClass(rank)}">
        <div class="award-rank-badge">${medal(rank)}</div>
        <div class="award-candidate-main">
          <div class="award-candidate-name">${playerLink(season, type)}</div>
          <div class="award-candidate-team">${teamLink(row["チーム"])}</div>
        </div>
        <dl class="award-mini-stats">
          ${fieldingStats(row).map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}
        </dl>
      </article>
    `;
  }

  function renderGoldGlove() {
    const positions = FIELDING_ORDER;
    const groups = positions.map((position) => {
      const rows = fielding
        .filter((row) => row["リーグ"] === state.league && row["ポジション"] === position)
        .filter(goldGloveEligible)
        .sort((a, b) => score(b["守備評価"]) - score(a["守備評価"]) || D.toInt(b["試合"]) - D.toInt(a["試合"]))
        .slice(0, position === "外野手" ? 5 : 3);
      return { position, rows };
    });

    const qualifiedCount = new Set(groups.flatMap((group) => group.rows.map((row) => D.playerKey(row)))).size;
    renderSummary([
      ["表示中", `${leagueLabel()} ゴールデングラブ`, "守備データ上の有力候補"],
      ["守備位置", `${positions.length}区分`, "外野手は3枠"],
      ["表示候補", `${qualifiedCount}人`, "資格相当＋守備評価上位"],
      ["注意", "守備データ評価", "UZR等は含みません"],
    ]);

    contentEl.innerHTML = `<div class="award-position-grid">${groups.map(({ position, rows }) => `
      <section class="content-card award-position-card">
        <div class="award-section-heading">
          <div><p class="eyebrow">Gold Glove</p><h2>${escape(position)}</h2></div>
          ${rows[0] ? `<span class="award-leader-chip">データ1位 ${escape(rows[0]["選手名"])}</span>` : ""}
        </div>
        <div class="award-candidate-list">
          ${rows.length ? rows.map((row, index) => goldGloveCard(row, index + 1)).join("") : '<p class="empty-state">現時点で資格相当の候補がいません。</p>'}
        </div>
      </section>
    `).join("")}</div>`;
  }

  function mvpCandidates() {
    const rankMap = new Map(standings.filter((row) => row["リーグ"].startsWith(state.league)).map((row) => [row["球団"], D.toInt(row["順位"])]));
    const batters = data.batters
      .filter((row) => row["リーグ"] === state.league && D.toInt(row["打席"]) >= 100)
      .map((row) => ({ row, type: "batter", raw: score(row["打者総合スコア"]) }));
    const pitchers = data.pitchers
      .filter((row) => row["リーグ"] === state.league && (score(row["投球回_計算用"]) >= 30 || D.toInt(row["登板"]) >= 25))
      .map((row) => ({ row, type: "pitcher", raw: score(row["投手総合スコア"]) }));
    const all = [...batters, ...pitchers];
    const maxRaw = Math.max(...all.map((item) => item.raw), 1);
    return all.map((item) => {
      const rank = rankMap.get(item.row["チーム"]) || 6;
      const teamBonus = ((7 - rank) / 6) * 15;
      const awardScore = (item.raw / maxRaw) * 85 + teamBonus;
      return { ...item, teamRank: rank, awardScore };
    }).sort((a, b) => b.awardScore - a.awardScore || b.raw - a.raw);
  }

  function mvpStats(item) {
    const row = item.row;
    if (item.type === "pitcher") {
      return [
        ["防御率", formatRate(row["防御率"], "防御率")],
        ["勝利", row["勝利"] || "0"],
        ["奪三振", row["奪三振"] || "0"],
        ["チーム", `${item.teamRank}位`],
      ];
    }
    return [
      ["打率", formatRate(row["打率"], "打率")],
      ["本塁打", row["本塁打"] || "0"],
      ["打点", row["打点"] || "0"],
      ["チーム", `${item.teamRank}位`],
    ];
  }

  function renderMvp() {
    const rows = mvpCandidates().slice(0, 8);
    const top = rows[0];
    renderSummary([
      ["現在1位", top?.row["選手名"] || "-", top ? `${top.row["チーム"]}・${top.type === "pitcher" ? "投手" : "野手"}` : ""],
      ["表示中", `${leagueLabel()} MVP`, "個人成績＋チーム順位"],
      ["候補", `${rows.length}人`, "上位8人を表示"],
      ["順位補正", "15%", "個人成績を中心に評価"],
    ]);

    contentEl.innerHTML = `
      <section class="content-card award-wide-card">
        <div class="award-section-heading">
          <div><p class="eyebrow">Most Valuable Player</p><h2>${leagueLabel()} MVP候補</h2></div>
          <span class="award-leader-chip">現在のチーム順位も加味</span>
        </div>
        <div class="award-mvp-list">
          ${rows.map((item, index) => `
            <article class="award-mvp-row ${awardCardClass(index + 1)}">
              <div class="award-rank-badge">${medal(index + 1)}</div>
              <div class="award-candidate-main">
                <div class="award-candidate-name">${playerLink(item.row, item.type)}</div>
                <div class="award-candidate-team">${teamLink(item.row["チーム"])}・${item.type === "pitcher" ? "投手" : "野手"}</div>
              </div>
              <dl class="award-mini-stats">
                ${mvpStats(item).map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}
              </dl>
            </article>
          `).join("")}
        </div>
        <p class="small-note">投手と野手はPlayer Lens内で評価式が異なるため、MVP候補順位は絶対的な受賞確率ではなく現在地の目安です。</p>
      </section>
    `;
  }

  function rookieItems(type) {
    const map = type === "pitcher" ? pitcherMap : batterMap;
    const scoreKey = type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
    return insight.rookies
      .filter((row) => row["リーグ"] === state.league)
      .map((row) => ({ candidate: row, season: map.get(D.playerKey(row)) }))
      .filter((item) => item.season && (type === "pitcher" ? item.season["ポジション"] === "投手" : item.season["ポジション"] !== "投手"))
      .sort((a, b) => score(b.season[scoreKey]) - score(a.season[scoreKey]));
  }

  function rookieCard(item, type, rank) {
    const row = item.season;
    const stats = type === "pitcher" ? [
      ["防御率", formatRate(row["防御率"], "防御率")],
      ["勝利", row["勝利"] || "0"],
      ["奪三振", row["奪三振"] || "0"],
      ["投球回", row["投球回"] || "0"],
    ] : [
      ["打率", formatRate(row["打率"], "打率")],
      ["本塁打", row["本塁打"] || "0"],
      ["打点", row["打点"] || "0"],
      ["盗塁", row["盗塁"] || "0"],
    ];
    return `
      <article class="award-candidate ${awardCardClass(rank)}">
        <div class="award-rank-badge">${medal(rank)}</div>
        <div class="award-candidate-main">
          <div class="award-candidate-name">${playerLink(row, type)}</div>
          <div class="award-candidate-team">${teamLink(row["チーム"])}</div>
        </div>
        <dl class="award-mini-stats">
          ${stats.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}
        </dl>
      </article>
    `;
  }

  function renderRookie() {
    const batters = rookieItems("batter").slice(0, 5);
    const pitchers = rookieItems("pitcher").slice(0, 5);
    renderSummary([
      ["野手1位", batters[0]?.season["選手名"] || "-", batters[0]?.season["チーム"] || ""],
      ["投手1位", pitchers[0]?.season["選手名"] || "-", pitchers[0]?.season["チーム"] || ""],
      ["表示中", `${leagueLabel()} 新人王`, "野手・投手を別評価"],
      ["詳細", "Rookie Watch", "専用ページで直近成績も確認"],
    ]);

    contentEl.innerHTML = `
      <div class="award-two-column">
        <section class="content-card award-position-card">
          <div class="award-section-heading"><div><p class="eyebrow">Rookie Watch</p><h2>野手候補</h2></div></div>
          <div class="award-candidate-list">${batters.map((item, index) => rookieCard(item, "batter", index + 1)).join("") || '<p class="empty-state">候補データがありません。</p>'}</div>
        </section>
        <section class="content-card award-position-card">
          <div class="award-section-heading"><div><p class="eyebrow">Rookie Watch</p><h2>投手候補</h2></div></div>
          <div class="award-candidate-list">${pitchers.map((item, index) => rookieCard(item, "pitcher", index + 1)).join("") || '<p class="empty-state">候補データがありません。</p>'}</div>
        </section>
      </div>
      <section class="content-card award-rookie-link-card">
        <div><h2>新人王候補をもっと詳しく</h2><p>直近6試合の状態やその他の候補は、専用ページで確認できます。</p></div>
        <a class="text-link" href="./rookie-watch">新人王候補ランキングへ</a>
      </section>
    `;
  }

  function qualifiedBatters() {
    return data.batters.filter((row) => row["リーグ"] === state.league && row["規定打席到達"] === "到達");
  }

  function qualifiedPitchers() {
    return data.pitchers.filter((row) => row["リーグ"] === state.league && row["規定投球回到達"] === "到達");
  }

  function titleTop(rows, key, direction = "desc", limit = 3) {
    return [...rows].filter((row) => String(row[key] ?? "").trim() !== "").sort((a, b) => {
      const av = score(a[key]);
      const bv = score(b[key]);
      return direction === "asc" ? av - bv : bv - av;
    }).slice(0, limit);
  }

  function titleValue(row, key) {
    if (["打率", "防御率"].includes(key)) return formatRate(row[key], key);
    return row[key] || "0";
  }

  function titleCard(title, key, rows, type) {
    return `
      <article class="content-card award-title-card">
        <div class="award-title-heading"><span>${escape(title)}</span><small>TOP 3</small></div>
        <ol class="award-title-list">
          ${rows.map((row, index) => `
            <li>
              <span class="award-title-rank">${index + 1}</span>
              <div><strong>${playerLink(row, type)}</strong><small>${teamLink(row["チーム"])}</small></div>
              <b>${escape(titleValue(row, key))}</b>
            </li>
          `).join("")}
        </ol>
      </article>
    `;
  }

  function renderTitles() {
    const leagueBatters = data.batters.filter((row) => row["リーグ"] === state.league);
    const leaguePitchers = data.pitchers.filter((row) => row["リーグ"] === state.league);
    const batterTitles = [
      ["打率", "打率", titleTop(qualifiedBatters(), "打率")],
      ["本塁打", "本塁打", titleTop(leagueBatters, "本塁打")],
      ["打点", "打点", titleTop(leagueBatters, "打点")],
      ["安打", "安打", titleTop(leagueBatters, "安打")],
      ["盗塁", "盗塁", titleTop(leagueBatters, "盗塁")],
    ];
    const pitcherTitles = [
      ["防御率", "防御率", titleTop(qualifiedPitchers(), "防御率", "asc")],
      ["勝利", "勝利", titleTop(leaguePitchers, "勝利")],
      ["奪三振", "奪三振", titleTop(leaguePitchers, "奪三振")],
      ["セーブ", "セーブ", titleTop(leaguePitchers, "セーブ")],
    ];

    renderSummary([
      ["表示中", `${leagueLabel()} タイトル争い`, "主要9部門"],
      ["打撃", `${batterTitles.length}部門`, "打率・本塁打・打点ほか"],
      ["投手", `${pitcherTitles.length}部門`, "防御率・勝利・奪三振ほか"],
      ["集計", "現時点", "CSV更新に合わせて反映"],
    ]);

    contentEl.innerHTML = `
      <section class="award-title-section">
        <div class="award-section-heading award-title-section-heading"><div><p class="eyebrow">Batting Titles</p><h2>打撃タイトル</h2></div></div>
        <div class="award-title-grid">${batterTitles.map(([title, key, rows]) => titleCard(title, key, rows, "batter")).join("")}</div>
      </section>
      <section class="award-title-section">
        <div class="award-section-heading award-title-section-heading"><div><p class="eyebrow">Pitching Titles</p><h2>投手タイトル</h2></div></div>
        <div class="award-title-grid">${pitcherTitles.map(([title, key, rows]) => titleCard(title, key, rows, "pitcher")).join("")}</div>
      </section>
    `;
  }

  function render() {
    leagueTabsEl.querySelectorAll("[data-league]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.league === state.league));
    });
    typeTabsEl.querySelectorAll("[data-award]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.award === state.award));
    });

    if (state.award === "best-nine") renderBestNine();
    if (state.award === "gold-glove") renderGoldGlove();
    if (state.award === "mvp") renderMvp();
    if (state.award === "rookie") renderRookie();
    if (state.award === "titles") renderTitles();

    D.enhanceCompactTables?.(contentEl);
  }

  leagueTabsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-league]");
    if (!button) return;
    state.league = button.dataset.league;
    render();
  });

  typeTabsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-award]");
    if (!button) return;
    state.award = button.dataset.award;
    render();
  });

  async function init() {
    try {
      [data, insight, fielding, standings] = await Promise.all([
        D.loadData(),
        D.loadInsightData(),
        D.loadFieldingData(),
        D.loadStandingsData(),
      ]);
      batterMap = new Map(data.batters.map((row) => [D.playerKey(row), row]));
      pitcherMap = new Map(data.pitchers.map((row) => [D.playerKey(row), row]));
      standingsMap = new Map(standings.map((row) => [row["球団"], row]));

      const update = latestDate();
      updatedEl.textContent = update ? `データ更新：${update}` : "データ更新：--";
      statusEl.textContent = "表示準備完了";
      statusEl.classList.add("is-ready");
      render();
    } catch (error) {
      console.error(error);
      statusEl.textContent = "読込エラー";
      statusEl.classList.add("is-error");
      contentEl.innerHTML = `<section class="content-card"><p class="empty-state">データを読み込めませんでした。時間を置いて再読み込みしてください。</p></section>`;
    }
  }

  init();
})();
