(async function () {
  const D = window.PlayerLensData;
  const TOP_LIMIT = 30;
  const state = { team: "巨人", playerTeam: "all" };
  const els = {
    team: document.getElementById("opponentTeam"),
    playerTeam: document.getElementById("playerTeam"),
    summary: document.getElementById("opponentSummary"),
    batters: document.getElementById("opponentBatters"),
    pitchers: document.getElementById("opponentPitchers"),
    battersTitle: document.getElementById("opponentBattersTitle"),
    pitchersTitle: document.getElementById("opponentPitchersTitle"),
    battersNote: document.getElementById("opponentBattersNote"),
    pitchersNote: document.getElementById("opponentPitchersNote"),
  };
  let matchup = { batters: [], pitchers: [] };

  function metric(label, value) {
    return `<div><dt>${D.escapeHtml(label)}</dt><dd>${D.escapeHtml(value ?? "—")}</dd></div>`;
  }

  function playerLink(row, type) {
    return `<a class="ranking-player" href="${D.playerUrl(row, type)}">${D.escapeHtml(row["選手名"])}</a>`;
  }

  function number(value) {
    return D.toNumber(value);
  }

  function nonEmpty(value) {
    return String(value ?? "").trim() !== "";
  }

  function numberDisplay(value, column = "") {
    if (!nonEmpty(value)) return "—";
    const formatted = D.formatValue(value, column);
    return formatted === "" ? "—" : formatted;
  }

  function batterScore(row) {
    const games = D.toInt(row["試合"]);
    const average = number(row["打率"]);
    const homeRuns = D.toInt(row["本塁打"]);
    const rbi = D.toInt(row["打点"]);
    const stolenBases = D.toInt(row["盗塁"]);
    const sampleWeight = Math.min(1, games / 5);
    const raw = (average * 100) + (homeRuns * 12) + (rbi * 3) + (stolenBases * 4);
    return Math.round(raw * sampleWeight * 10) / 10;
  }

  function pitcherUsage(row) {
    return number(row["先発"]) + number(row["救援"]);
  }

  function pitcherScore(row) {
    const usage = pitcherUsage(row);
    const hasEra = nonEmpty(row["防御率"]);
    const era = number(row["防御率"]);
    const wins = D.toInt(row["勝利"]);
    const losses = D.toInt(row["敗戦"]);
    const holds = D.toInt(row["HLD"]);
    const saves = D.toInt(row["セーブ"]);
    const sampleWeight = Math.min(1, usage / 5);
    const eraScore = hasEra ? Math.max(0, (4.5 - era) * 18) : 0;
    const resultScore = (wins * 14) + (holds * 5) + (saves * 7) - (losses * 6);
    return Math.max(0, Math.round((eraScore + resultScore) * sampleWeight * 10) / 10);
  }

  function hasBatterResult(row) {
    return D.toInt(row["試合"]) > 0;
  }

  function hasPitcherResult(row) {
    return pitcherUsage(row) > 0
      || nonEmpty(row["防御率"])
      || ["勝利", "敗戦", "HLD", "セーブ"].some((field) => number(row[field]) > 0);
  }

  function isAllPlayerTeams() {
    return state.playerTeam === "all";
  }

  function playerTeamLabel() {
    return isAllPlayerTeams() ? "すべての球団" : state.playerTeam;
  }

  function matchupSubjectLabel() {
    return isAllPlayerTeams() ? "各球団" : state.playerTeam;
  }

  function emptyForSameTeam(type) {
    if (state.playerTeam !== state.team) return "";
    return `同一球団との対戦成績はないため、${state.team}の${type}は表示されません。`;
  }

  function selectedBatters() {
    return matchup.batters
      .filter((row) => row["対球団名"] === state.team && row["チーム"] !== state.team)
      .filter((row) => isAllPlayerTeams() || row["チーム"] === state.playerTeam)
      .filter(hasBatterResult)
      .map((row) => ({ ...row, score: batterScore(row) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => (
        b.score - a.score
        || D.toInt(b["試合"]) - D.toInt(a["試合"])
        || number(b["打率"]) - number(a["打率"])
        || D.toInt(b["本塁打"]) - D.toInt(a["本塁打"])
      ));
  }

  function selectedPitchers() {
    return matchup.pitchers
      .filter((row) => row["対球団名"] === state.team && row["チーム"] !== state.team)
      .filter((row) => isAllPlayerTeams() || row["チーム"] === state.playerTeam)
      .filter(hasPitcherResult)
      .map((row) => ({ ...row, usage: pitcherUsage(row), score: pitcherScore(row) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => (
        b.score - a.score
        || b.usage - a.usage
        || number(a["防御率"]) - number(b["防御率"])
        || D.toInt(b["勝利"]) - D.toInt(a["勝利"])
      ));
  }

  function batterCard(row, rank) {
    return `
      <article class="watch-card">
        <div class="ranking-card-head">
          <span class="mobile-rank">${rank}</span>
          <div>
            ${playerLink(row, "batter")}
            <div class="ranking-meta">所属：${D.escapeHtml(row["チーム"])} / 対戦相手：${D.escapeHtml(state.team)}</div>
          </div>
        </div>
        <div class="mobile-score">
          <span>相性スコア</span>
          <strong>${D.escapeHtml(row.score.toFixed(1))}</strong>
        </div>
        <dl class="watch-metrics">
          ${metric("試合", numberDisplay(row["試合"]))}
          ${metric("打率", numberDisplay(row["打率"], "打率"))}
          ${metric("本塁打", numberDisplay(row["本塁打"]))}
          ${metric("打点", numberDisplay(row["打点"]))}
          ${metric("盗塁", numberDisplay(row["盗塁"]))}
        </dl>
      </article>
    `;
  }

  function pitcherCard(row, rank) {
    return `
      <article class="watch-card">
        <div class="ranking-card-head">
          <span class="mobile-rank">${rank}</span>
          <div>
            ${playerLink(row, "pitcher")}
            <div class="ranking-meta">所属：${D.escapeHtml(row["チーム"])} / 対戦相手：${D.escapeHtml(state.team)}</div>
          </div>
        </div>
        <div class="mobile-score">
          <span>相性スコア</span>
          <strong>${D.escapeHtml(row.score.toFixed(1))}</strong>
        </div>
        <dl class="watch-metrics">
          ${metric("先発", numberDisplay(row["先発"]))}
          ${metric("救援", numberDisplay(row["救援"]))}
          ${metric("防御率", numberDisplay(row["防御率"], "防御率"))}
          ${metric("勝利", numberDisplay(row["勝利"]))}
          ${metric("敗戦", numberDisplay(row["敗戦"]))}
          ${metric("HLD", numberDisplay(row["HLD"]))}
          ${metric("セーブ", numberDisplay(row["セーブ"]))}
        </dl>
      </article>
    `;
  }

  function renderCards(target, rows, cardBuilder, emptyText) {
    target.innerHTML = rows.length
      ? rows.slice(0, TOP_LIMIT).map((row, index) => cardBuilder(row, index + 1)).join("")
      : `<p class="empty-state">${D.escapeHtml(emptyText)}</p>`;
  }

  function latestUpdateDate() {
    return matchup.batters
      .concat(matchup.pitchers)
      .map((row) => row["更新日"])
      .filter(nonEmpty)
      .sort()
      .at(-1) || "—";
  }

  function renderSummary(batters, pitchers) {
    const topBatter = batters[0];
    const topPitcher = pitchers[0];
    const items = [
      ["対戦相手", state.team],
      ["選手の所属球団", playerTeamLabel()],
      ["警戒野手", topBatter ? `${topBatter["選手名"]}（${topBatter["チーム"]}）` : "対象なし"],
      ["警戒投手", topPitcher ? `${topPitcher["選手名"]}（${topPitcher["チーム"]}）` : "対象なし"],
    ];
    els.summary.innerHTML = items.map(([label, value]) => `
      <article class="summary-card">
        <span>${D.escapeHtml(label)}</span>
        <strong>${D.escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function renderTeamOptions() {
    const teams = Object.keys(D.TEAM_TO_FULL);
    if (!teams.includes(state.team)) state.team = "巨人";
    if (!isAllPlayerTeams() && !teams.includes(state.playerTeam)) state.playerTeam = "all";

    els.team.innerHTML = teams.map((team) => `
      <option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>
    `).join("");
    els.team.value = state.team;

    els.playerTeam.innerHTML = [
      '<option value="all">すべての球団</option>',
      ...teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`),
    ].join("");
    els.playerTeam.value = state.playerTeam;
  }

  function syncUrl() {
    const url = new URL(location.href);
    url.searchParams.set("team", state.team);
    if (isAllPlayerTeams()) {
      url.searchParams.delete("playerTeam");
    } else {
      url.searchParams.set("playerTeam", state.playerTeam);
    }
    history.replaceState(null, "", url);
  }

  function render() {
    renderTeamOptions();
    const batters = selectedBatters();
    const pitchers = selectedPitchers();
    const subject = matchupSubjectLabel();
    const dataDate = latestUpdateDate();
    const sameTeamBatterMessage = emptyForSameTeam("野手");
    const sameTeamPitcherMessage = emptyForSameTeam("投手");
    els.battersTitle.textContent = `${state.team}戦で相性がいい${subject}の野手`;
    els.pitchersTitle.textContent = `${state.team}戦で相性がいい${subject}の投手`;
    els.battersNote.textContent = batters.length
      ? `${state.team}戦における${subject}の対戦成績から、相性スコアが高い上位${Math.min(TOP_LIMIT, batters.length)}人を表示しています。データ更新日：${dataDate}`
      : (sameTeamBatterMessage || `${state.team}戦における${subject}の対球団別野手成績はまだありません。`);
    els.pitchersNote.textContent = pitchers.length
      ? `${state.team}戦における${subject}の対戦成績から、相性スコアが高い上位${Math.min(TOP_LIMIT, pitchers.length)}人を表示しています。データ更新日：${dataDate}`
      : (sameTeamPitcherMessage || `${state.team}戦における${subject}の対球団別投手成績はまだありません。`);
    renderSummary(batters, pitchers);
    renderCards(els.batters, batters, batterCard, sameTeamBatterMessage || `${state.team}戦で相性が出ている${subject}の野手はまだいません。`);
    renderCards(els.pitchers, pitchers, pitcherCard, sameTeamPitcherMessage || `${state.team}戦で相性が出ている${subject}の投手はまだいません。`);
    syncUrl();
  }

  try {
    const params = new URLSearchParams(location.search);
    const requestedTeam = params.get("team");
    const requestedPlayerTeam = params.get("playerTeam");
    if (requestedTeam && D.TEAM_TO_FULL[requestedTeam]) state.team = requestedTeam;
    if (requestedPlayerTeam && D.TEAM_TO_FULL[requestedPlayerTeam]) state.playerTeam = requestedPlayerTeam;
    matchup = await D.loadOpponentStatsData();
    els.team.addEventListener("change", () => {
      state.team = els.team.value;
      render();
    });
    els.playerTeam.addEventListener("change", () => {
      state.playerTeam = els.playerTeam.value;
      render();
    });
    render();
  } catch (error) {
    const message = `<article class="content-card">${D.escapeHtml(error.message || "データを読み込めませんでした。")}</article>`;
    els.summary.innerHTML = message;
    els.batters.innerHTML = message;
    els.pitchers.innerHTML = "";
  }
})();
