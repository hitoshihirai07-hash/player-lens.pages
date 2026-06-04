(async function () {
  const D = window.PlayerLensData;
  const params = new URLSearchParams(location.search);
  const initialTeam = params.get("team") || "all";
  const initialPosition = params.get("position") || "all";
  const state = {
    league: initialTeam !== "all" && D.TEAM_TO_FULL[initialTeam] ? D.leagueOfTeam(initialTeam) : "all",
    team: D.TEAM_TO_FULL[initialTeam] ? initialTeam : "all",
    position: D.FIELDING_POSITIONS.includes(initialPosition) ? initialPosition : "all",
    sort: "score",
  };
  const els = {
    league: document.getElementById("defenseLeague"),
    team: document.getElementById("defenseTeam"),
    position: document.getElementById("defensePosition"),
    sort: document.getElementById("defenseSort"),
    summary: document.getElementById("defenseSummary"),
    title: document.getElementById("defenseTitle"),
    count: document.getElementById("defenseCount"),
    ranking: document.getElementById("defenseRanking"),
    positionLeaders: document.getElementById("positionLeaders"),
    catcherRanking: document.getElementById("catcherRanking"),
    teamFielding: document.getElementById("teamFielding"),
  };
  let rows = [];

  function playerType(row) {
    return row["ポジション"] === "投手" ? "pitcher" : "batter";
  }

  function playerCell(row) {
    return `<a href="${D.playerUrl(row, playerType(row))}">${D.escapeHtml(row["選手名"])}</a>`;
  }

  function teamCell(row) {
    return `<a href="${D.teamUrl(row["チーム"])}">${D.escapeHtml(row["チーム"])}</a>`;
  }

  function emptyDash(value) {
    return value === undefined || value === null || value === "" ? "-" : D.escapeHtml(value);
  }

  function formatRate(value, column) {
    return value === undefined || value === null || value === "" ? "-" : D.formatValue(value, column);
  }

  function table(headers, bodyRows, emptyText = "該当データなし") {
    if (!bodyRows.length) return `<p class="empty-state">${D.escapeHtml(emptyText)}</p>`;
    return `
      <div class="compact-table-wrap">
        <table class="compact-table">
          <thead><tr>${headers.map((header) => `<th>${D.escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${bodyRows.join("")}</tbody>
        </table>
      </div>
    `;
  }

  function scoped(row) {
    return (state.league === "all" || row["リーグ"] === state.league)
      && (state.team === "all" || row["チーム"] === state.team)
      && (state.position === "all" || row["ポジション"] === state.position);
  }

  function sortValue(row) {
    const map = {
      score: "守備評価",
      games: "試合",
      fieldingRate: "守備率",
      chances: "守備機会",
      assists: "補殺",
      doublePlays: "併殺",
      caughtStealing: "盗塁阻止率",
    };
    return D.toNumber(row[map[state.sort]]);
  }

  function ranked(source, limit = 80) {
    return source
      .filter(scoped)
      .sort((a, b) => sortValue(b) - sortValue(a) || D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))
      .slice(0, limit);
  }

  function rankingRows(source) {
    return source.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerCell(row)}</td>
        <td>${teamCell(row)}</td>
        <td>${D.escapeHtml(row["ポジション"])}</td>
        <td class="score">${D.formatValue(row["守備評価"], "スコア")}</td>
        <td>${emptyDash(row["試合"])}</td>
        <td>${emptyDash(row["守備機会"])}</td>
        <td>${formatRate(row["守備率"], "守備率")}</td>
        <td>${emptyDash(row["失策"])}</td>
        <td>${emptyDash(row["補殺"])}</td>
        <td>${emptyDash(row["併殺"])}</td>
        <td>${formatRate(row["盗塁阻止率"], "盗塁阻止率")}</td>
      </tr>
    `);
  }

  function renderSummary() {
    const scopedRows = rows.filter(scoped);
    const uniquePlayers = new Set(scopedRows.map((row) => `${row["選手名"]}|${row["チーム"]}`));
    const top = ranked(rows, 1)[0];
    const latest = scopedRows.map((row) => row["更新日"]).filter(Boolean).sort().at(-1) || "-";
    els.summary.innerHTML = [
      ["守備記録", scopedRows.length],
      ["対象選手", uniquePlayers.size],
      ["最新更新日", latest],
      ["守備評価1位", top ? top["選手名"] : "-"],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value)}</strong></article>`).join("");
  }

  function renderRanking() {
    const scopedRows = rows.filter(scoped);
    const current = ranked(rows);
    const positionLabel = state.position === "all" ? "全ポジション" : state.position;
    els.title.textContent = `${positionLabel} 守備ランキング`;
    els.count.textContent = `${scopedRows.length.toLocaleString("ja-JP")}件中 上位${current.length.toLocaleString("ja-JP")}件`;
    els.ranking.innerHTML = table(
      ["順位", "選手", "球団", "位置", "守備評価", "試合", "守備機会", "守備率", "失策", "補殺", "併殺", "盗塁阻止率"],
      rankingRows(current)
    );
  }

  function renderPositionLeaders() {
    const leaders = D.FIELDING_POSITIONS.map((position) => {
      const row = rows
        .filter((item) => item["ポジション"] === position)
        .filter((item) => state.league === "all" || item["リーグ"] === state.league)
        .filter((item) => state.team === "all" || item["チーム"] === state.team)
        .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))[0];
      return { position, row };
    }).filter((item) => item.row);

    const bodyRows = leaders.map(({ position, row }) => `
      <tr>
        <td>${D.escapeHtml(position)}</td>
        <td>${playerCell(row)}</td>
        <td>${teamCell(row)}</td>
        <td class="score">${D.formatValue(row["守備評価"], "スコア")}</td>
        <td>${emptyDash(row["試合"])}</td>
        <td>${formatRate(row["守備率"], "守備率")}</td>
      </tr>
    `);
    els.positionLeaders.innerHTML = table(["位置", "選手", "球団", "守備評価", "試合", "守備率"], bodyRows);
  }

  function renderCatcherRanking() {
    const catchers = rows
      .filter((row) => row["ポジション"] === "捕手" && row["盗塁阻止率"] !== "")
      .filter((row) => state.league === "all" || row["リーグ"] === state.league)
      .filter((row) => state.team === "all" || row["チーム"] === state.team)
      .sort((a, b) => D.toNumber(b["盗塁阻止率"]) - D.toNumber(a["盗塁阻止率"]) || D.toNumber(b["試合"]) - D.toNumber(a["試合"]))
      .slice(0, 15);
    const bodyRows = catchers.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${playerCell(row)}</td>
        <td>${teamCell(row)}</td>
        <td>${formatRate(row["盗塁阻止率"], "盗塁阻止率")}</td>
        <td>${emptyDash(row["試合"])}</td>
        <td>${emptyDash(row["捕逸"])}</td>
        <td class="score">${D.formatValue(row["守備評価"], "スコア")}</td>
      </tr>
    `);
    els.catcherRanking.innerHTML = table(["順位", "選手", "球団", "盗塁阻止率", "試合", "捕逸", "守備評価"], bodyRows);
  }

  function renderTeamFielding() {
    const grouped = new Map();
    rows
      .filter((row) => state.league === "all" || row["リーグ"] === state.league)
      .filter((row) => state.team === "all" || row["チーム"] === state.team)
      .forEach((row) => {
        const record = grouped.get(row["チーム"]) || { チーム: row["チーム"], リーグ: row["リーグ"], 守備機会: 0, 失策: 0, 捕逸: 0, scoreTotal: 0, gameTotal: 0 };
        const games = D.toNumber(row["試合"]);
        record.守備機会 += D.toNumber(row["守備機会"]);
        record.失策 += D.toNumber(row["失策"]);
        record.捕逸 += D.toNumber(row["捕逸"]);
        record.scoreTotal += D.toNumber(row["守備評価"]) * Math.max(1, games);
        record.gameTotal += Math.max(1, games);
        grouped.set(row["チーム"], record);
      });

    const teams = Array.from(grouped.values())
      .map((row) => ({
        ...row,
        守備率: row.守備機会 > 0 ? (row.守備機会 - row.失策) / row.守備機会 : "",
        守備評価: row.gameTotal > 0 ? row.scoreTotal / row.gameTotal : 0,
      }))
      .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]));

    const bodyRows = teams.map((row, index) => `
      <tr>
        <td class="rank">${index + 1}</td>
        <td>${teamCell(row)}</td>
        <td>${D.escapeHtml(row["リーグ"])}</td>
        <td class="score">${D.formatValue(row["守備評価"], "スコア")}</td>
        <td>${row["守備機会"].toLocaleString("ja-JP")}</td>
        <td>${row["失策"].toLocaleString("ja-JP")}</td>
        <td>${formatRate(row["守備率"], "守備率")}</td>
        <td>${row["捕逸"].toLocaleString("ja-JP")}</td>
      </tr>
    `);
    els.teamFielding.innerHTML = table(["順位", "球団", "リーグ", "守備評価", "守備機会", "失策", "守備率", "捕逸"], bodyRows);
  }

  function renderTeamOptions() {
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => state.league === "all" || D.leagueOfTeam(team) === state.league);
    if (state.team !== "all" && !teams.includes(state.team)) state.team = "all";
    const allLabel = state.league === "all" ? "全12球団" : `${state.league}・リーグ全体`;
    els.team.innerHTML = [
      `<option value="all">${D.escapeHtml(allLabel)}</option>`,
      ...teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`),
    ].join("");
    els.team.value = state.team;
    els.league.value = state.league;
  }

  function renderPositionOptions() {
    els.position.innerHTML = [
      `<option value="all">全ポジション</option>`,
      ...D.FIELDING_POSITIONS.map((position) => `<option value="${D.escapeHtml(position)}">${D.escapeHtml(position)}</option>`),
    ].join("");
    els.position.value = state.position;
  }

  function render() {
    renderTeamOptions();
    renderPositionOptions();
    renderSummary();
    renderRanking();
    renderPositionLeaders();
    renderCatcherRanking();
    renderTeamFielding();
    D.enhanceCompactTables(document.querySelector("main"));
  }

  try {
    rows = await D.loadFieldingData();
    els.league.addEventListener("change", () => {
      state.league = els.league.value;
      render();
    });
    els.team.addEventListener("change", () => {
      state.team = els.team.value;
      render();
    });
    els.position.addEventListener("change", () => {
      state.position = els.position.value;
      render();
    });
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      render();
    });
    render();
  } catch (error) {
    document.querySelector("main").innerHTML = `<section class="content-card">${D.escapeHtml(error.message)}</section>`;
  }
})();
