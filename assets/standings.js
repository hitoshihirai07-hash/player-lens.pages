(async function () {
  const dataApi = window.PlayerLensData;
  const main = document.getElementById("standingsMain");
  const centralBody = document.getElementById("centralStandings");
  const pacificBody = document.getElementById("pacificStandings");
  const overview = document.getElementById("standingsOverview");
  const updated = document.getElementById("standingsUpdated");
  const teamSelect = document.getElementById("standingsTeamSelect");
  const teamButtons = document.getElementById("standingsTeamButtons");
  const teamSummary = document.getElementById("standingsTeamSummary");
  const remainingTitle = document.getElementById("remainingTitle");
  const remainingBody = document.getElementById("remainingOpponents");
  const opponentTableHead = document.getElementById("opponentTableHead");
  const winTargets = document.getElementById("winTargets");
  const paceBody = document.getElementById("paceSimulation");

  const LEAGUE_TEAMS = {
    "セリーグ": ["阪神", "巨人", "DeNA", "ヤクルト", "中日", "広島"],
    "パリーグ": ["ソフトバンク", "西武", "日本ハム", "オリックス", "ロッテ", "楽天"],
  };
  const TARGET_WINS = [65, 70, 75, 80];
  const PACE_RATES = [0.400, 0.500, 0.550, 0.600];
  const ALL_TEAMS = [...LEAGUE_TEAMS["セリーグ"], ...LEAGUE_TEAMS["パリーグ"]];

  let rows = [];
  let byTeam = new Map();
  let selectedTeam = "";
  let isFinal = false;
  let seasonYear = main?.dataset.seasonYear || "2026";

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function int(row, key) {
    const value = Number.parseInt(String(row?.[key] ?? "0").replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(value) ? value : 0;
  }

  function teamLeague(row) {
    return String(row?.["リーグ"] || "").trim();
  }

  function winPct(row) {
    const wins = int(row, "勝利");
    const losses = int(row, "敗戦");
    return wins + losses ? wins / (wins + losses) : 0;
  }

  function pctText(value) {
    return value.toFixed(3).replace(/^0/, "");
  }

  function leagueRows(league) {
    return rows
      .filter((row) => teamLeague(row) === league)
      .slice()
      .sort((a, b) => int(a, "順位") - int(b, "順位") || winPct(b) - winPct(a));
  }

  function gamesBehind(leader, row) {
    if (!leader || !row) return 0;
    return ((int(leader, "勝利") - int(row, "勝利")) + (int(row, "敗戦") - int(leader, "敗戦"))) / 2;
  }

  function gapText(value) {
    if (Math.abs(value) < 0.001) return "0.0";
    return Number.isInteger(value) ? value.toFixed(1) : String(value);
  }

  function recordGames(text) {
    const match = String(text || "").match(/(\d+)勝(\d+)敗(\d+)分/);
    return match ? Number(match[1]) + Number(match[2]) + Number(match[3]) : 0;
  }

  // 「残り=0」だけだと開幕前に誤判定するため、全12球団の143試合消化も確認する。
  // 2027年以降も現行143試合制なら、データの入れ替えだけで同じ処理を利用できる。
  function hasFinishedSeason(data) {
    if (data.length !== ALL_TEAMS.length || new Set(data.map((row) => row["球団"])).size !== ALL_TEAMS.length) return false;
    return ALL_TEAMS.every((team) => {
      const row = data.find((item) => item["球団"] === team);
      return row && int(row, "試合数") >= 143 && int(row, "残り試合") === 0;
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setMetaContent(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute("content", value);
  }

  function updatePageForSeason() {
    const heading = `${seasonYear}年プロ野球 ${isFinal ? "最終順位・対戦成績" : "順位・残り試合"}`;
    const description = isFinal
      ? `${seasonYear}年の公式戦最終順位と、同一リーグ・交流戦の対戦成績を球団ごとに確認できます。`
      : "順位表を基準に、残り何試合あるか、対戦相手との今季成績をあわせて確認できます。";
    const metaDescription = isFinal
      ? `${seasonYear}年プロ野球（NPB）12球団の最終順位・勝敗・勝率・ゲーム差・対球団別最終対戦成績を確認できます。`
      : `${seasonYear}年プロ野球（NPB）12球団の順位・残り試合・対戦成績・勝利数シミュレーションを確認できます。`;
    document.title = `${heading} | Player Lens`;
    setMetaContent('meta[name="description"]', metaDescription);
    setMetaContent('meta[property="og:title"]', document.title);
    setMetaContent('meta[property="og:description"]', metaDescription);
    setMetaContent('meta[name="twitter:title"]', document.title);
    setMetaContent('meta[name="twitter:description"]', metaDescription);
    const datasetScript = document.querySelector('script[type="application/ld+json"]');
    if (datasetScript) {
      try {
        const schema = JSON.parse(datasetScript.textContent);
        schema.name = heading;
        schema.description = metaDescription;
        datasetScript.textContent = JSON.stringify(schema);
      } catch (error) {
        console.warn("順位ページの構造化データを更新できませんでした", error);
      }
    }

    setText("standingsPageHeading", heading);
    setText("standingsPageDescription", description);
    setText("standingsIntroEyebrow", isFinal ? "Final Standings & Matchups" : "Standings & Remaining Games");
    setText("standingsIntroHeading", isFinal ? `${seasonYear}年の公式戦最終成績を振り返る` : "順位だけでなく「ここから誰と戦うか」を見る");
    setText("standingsIntroText", isFinal
      ? "セ・パ12球団の最終順位・勝敗・ゲーム差と、同一リーグ・交流戦の最終対戦成績を確認できます。"
      : "順位・勝敗・勝率・ゲーム差に加え、球団ごとの残り試合と今季対戦成績をまとめています。");
    setText("standingsIntroNote", isFinal
      ? `対象は${seasonYear}年の公式戦（交流戦を含む）です。勝率とゲーム差は勝敗から算出しています。`
      : "勝率・ゲーム差・勝利数シミュレーションは現在の勝敗と残り試合から計算しています。");
    setText("team-detail-title", isFinal ? "球団ごとの最終成績を見る" : "球団ごとの残り試合を見る");
    setText("opponentEyebrow", isFinal ? "Final Matchups" : "Remaining Matchups");
    setText("opponentNote", isFinal
      ? "同一リーグの公式戦と交流戦の最終対戦成績を表示しています。"
      : "残り試合数と、ここまでの同一リーグの対戦成績を同時に確認できます。");
    setText("standingsExploreText", isFinal
      ? "最終順位や対戦成績とあわせて、月別成績や投手登板状況を確認すると、シーズン全体を振り返れます。"
      : "順位や残りカードとあわせて、月別成績や直近6試合などから現在のチーム状態を確認できます。");

    main.classList.toggle("is-final", isFinal);
    document.querySelectorAll("[data-remaining-heading]").forEach((th) => { th.hidden = isFinal; });
    document.getElementById("winTargetsSection").hidden = isFinal;
    document.getElementById("paceSimulationSection").hidden = isFinal;
    opponentTableHead.innerHTML = isFinal
      ? "<th>相手</th><th>区分</th><th>最終対戦成績</th><th>試合</th>"
      : "<th>相手</th><th>残り</th><th>今季対戦成績</th><th>消化</th>";
  }

  function updateUrl(team) {
    const url = new URL(location.href);
    url.searchParams.set("team", team);
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function renderLeagueTable(league, target) {
    const leagueData = leagueRows(league);
    const leader = leagueData[0];
    target.innerHTML = leagueData.map((row) => {
      const team = row["球団"];
      const gb = gamesBehind(leader, row);
      return `
        <tr class="standings-row${team === selectedTeam ? " is-selected" : ""}" data-team="${esc(team)}">
          <td data-label="順位"><strong>${esc(row["順位"])}</strong></td>
          <td data-label="球団"><button class="standings-team-link" type="button" data-team="${esc(team)}">${esc(team)}</button></td>
          <td data-label="試合">${int(row, "試合数")}</td>
          <td data-label="勝">${int(row, "勝利")}</td>
          <td data-label="敗">${int(row, "敗戦")}</td>
          <td data-label="分">${int(row, "分け")}</td>
          <td data-label="勝率"><strong>${pctText(winPct(row))}</strong></td>
          <td data-label="差">${row === leader ? "-" : gapText(gb)}</td>
          ${isFinal ? "" : `<td data-label="残り"><strong>${int(row, "残り試合")}</strong></td>`}
        </tr>`;
    }).join("");
  }

  function renderOverview() {
    const central = leagueRows("セリーグ");
    const pacific = leagueRows("パリーグ");
    const latestDate = rows.map((row) => String(row["更新日"] || "")).filter(Boolean).sort().at(-1) || "-";
    let cards;
    if (isFinal) {
      cards = [
        ["セ・リーグ優勝", central[0]?.["球団"] || "-"],
        ["パ・リーグ優勝", pacific[0]?.["球団"] || "-"],
        ["公式戦", "全日程終了"],
        ["データ更新", latestDate],
      ];
    } else {
      const mostRemaining = rows.slice().sort((a, b) => int(b, "残り試合") - int(a, "残り試合"))[0];
      cards = [
        ["セ・リーグ首位", central[0]?.["球団"] || "-"],
        ["パ・リーグ首位", pacific[0]?.["球団"] || "-"],
        ["残り試合最多", mostRemaining ? `${mostRemaining["球団"]} ${int(mostRemaining, "残り試合")}試合` : "-"],
        ["データ更新", latestDate],
      ];
    }
    overview.innerHTML = cards.map(([label, value]) => `<article class="summary-card"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
    updated.textContent = `${isFinal ? "最終成績" : "データ更新"}：${latestDate}`;
  }

  function renderTeamControls() {
    const ordered = ["セリーグ", "パリーグ"].flatMap((league) => leagueRows(league).map((row) => row["球団"]));
    teamSelect.innerHTML = ordered.map((team) => `<option value="${esc(team)}"${team === selectedTeam ? " selected" : ""}>${esc(team)}</option>`).join("");
    teamButtons.innerHTML = ordered.map((team) => `<button type="button" class="secondary-button${team === selectedTeam ? " is-active" : ""}" data-team="${esc(team)}">${esc(team)}</button>`).join("");
  }

  function csGapInfo(row) {
    const leagueData = leagueRows(teamLeague(row));
    const leader = leagueData[0];
    const rank = int(row, "順位");
    const selectedGb = gamesBehind(leader, row);
    if (rank <= 3) {
      const fourth = leagueData.find((item) => int(item, "順位") === 4);
      if (!fourth) return ["4位との差", "-"];
      return ["4位との差", `${gapText(Math.abs(gamesBehind(leader, fourth) - selectedGb))}G`];
    }
    const third = leagueData.find((item) => int(item, "順位") === 3);
    if (!third) return [isFinal ? "3位との差" : "3位まで", "-"];
    return [isFinal ? "3位との差" : "3位まで", `${gapText(Math.abs(selectedGb - gamesBehind(leader, third)))}G`];
  }

  function renderTeamSummary(row) {
    const leagueData = leagueRows(teamLeague(row));
    const leader = leagueData[0];
    const leaderGap = gamesBehind(leader, row);
    const [csLabel, csValue] = csGapInfo(row);
    const cards = [
      [isFinal ? "最終順位" : "現在順位", `${int(row, "順位")}位`],
      ["勝敗", `${int(row, "勝利")}勝${int(row, "敗戦")}敗${int(row, "分け")}分`],
      ["勝率", pctText(winPct(row))],
      ["首位との差", int(row, "順位") === 1 ? "首位" : `${gapText(leaderGap)}G`],
      [csLabel, csValue],
    ];
    if (!isFinal) cards.push(["残り試合", `${int(row, "残り試合")}試合`]);
    teamSummary.innerHTML = cards.map(([label, value]) => `<article class="summary-card"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
  }

  function renderOpponents(row) {
    const team = row["球団"];
    const leagueTeams = LEAGUE_TEAMS[teamLeague(row)] || [];
    const opponents = (isFinal ? ALL_TEAMS : leagueTeams)
      .filter((opponent) => opponent !== team)
      .map((opponent) => ({
        opponent,
        isInterleague: !leagueTeams.includes(opponent),
        remaining: int(row, `残り${opponent}`),
        record: String(row[`試合実績${opponent}`] || "-").trim() || "-",
      }));

    if (isFinal) {
      // 同一リーグ5球団・交流戦6球団の計11球団を表示する。
      remainingTitle.textContent = `${team}の対球団別最終対戦成績`;
      remainingBody.innerHTML = opponents.map((item) => `
        <tr>
          <td data-label="相手"><strong>${esc(item.opponent)}</strong></td>
          <td data-label="区分">${item.isInterleague ? "交流戦" : "同一リーグ"}</td>
          <td data-label="最終対戦成績">${esc(item.record)}</td>
          <td data-label="試合">${recordGames(item.record)}試合</td>
        </tr>`).join("");
    } else {
      opponents.sort((a, b) => b.remaining - a.remaining || a.opponent.localeCompare(b.opponent, "ja"));
      const maxRemaining = Math.max(...opponents.map((item) => item.remaining), 0);
      remainingTitle.textContent = `${team}の対球団別残り試合`;
      remainingBody.innerHTML = opponents.map((item) => `
        <tr>
          <td data-label="相手"><strong>${esc(item.opponent)}</strong>${item.remaining === maxRemaining && maxRemaining > 0 ? '<span class="standings-max-pill">最多</span>' : ""}</td>
          <td data-label="残り"><strong>${item.remaining}</strong>試合</td>
          <td data-label="今季対戦成績">${esc(item.record)}</td>
          <td data-label="消化">${recordGames(item.record)}試合</td>
        </tr>`).join("");
    }
  }

  function renderTargets(row) {
    const wins = int(row, "勝利");
    const remaining = int(row, "残り試合");
    winTargets.innerHTML = TARGET_WINS.map((target) => {
      const needed = target - wins;
      if (needed <= 0) {
        return `<article class="standings-goal-card is-reached"><span>${target}勝</span><strong>到達済み</strong><small>現在 ${wins}勝</small></article>`;
      }
      if (needed > remaining) {
        return `<article class="standings-goal-card is-impossible"><span>${target}勝</span><strong>残り全勝でも未到達</strong><small>あと${needed}勝 / 残り${remaining}試合</small></article>`;
      }
      const requiredPct = remaining ? needed / remaining : 0;
      return `<article class="standings-goal-card"><span>${target}勝</span><strong>あと${needed}勝</strong><small>必要勝率 ${pctText(requiredPct)}</small></article>`;
    }).join("");
  }

  function renderPace(row) {
    const wins = int(row, "勝利");
    const remaining = int(row, "残り試合");
    paceBody.innerHTML = PACE_RATES.map((rate) => {
      const projectedWins = Math.round(remaining * rate);
      const projectedLosses = remaining - projectedWins;
      return `<tr><td data-label="残り勝率"><strong>${pctText(rate)}</strong></td><td data-label="残りの勝敗目安">${projectedWins}勝${projectedLosses}敗</td><td data-label="最終勝利数"><strong>${wins + projectedWins}勝</strong></td></tr>`;
    }).join("");
  }

  function renderSelectedTeam(team, updateHistory = true) {
    const row = byTeam.get(team);
    if (!row) return;
    selectedTeam = team;
    renderLeagueTable("セリーグ", centralBody);
    renderLeagueTable("パリーグ", pacificBody);
    renderTeamControls();
    renderTeamSummary(row);
    renderOpponents(row);
    if (!isFinal) {
      renderTargets(row);
      renderPace(row);
    }
    if (updateHistory) updateUrl(team);
    dataApi.enhanceCompactTables?.();
  }

  function bindEvents() {
    teamSelect.addEventListener("change", () => renderSelectedTeam(teamSelect.value));
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-team]");
      if (!button) return;
      const team = button.dataset.team;
      if (byTeam.has(team)) renderSelectedTeam(team);
    });
  }

  try {
    if (!dataApi?.loadStandingsData) throw new Error("順位データ読込機能がありません");
    rows = await dataApi.loadStandingsData();
    if (!Array.isArray(rows) || !rows.length) throw new Error("順位データが空です");
    // CSVの行位置で球団を判断しない。必ず球団名で紐付ける。
    byTeam = new Map(rows.map((row) => [row["球団"], row]));
    // 新年度のCSVに「年度」列がなくても、更新日が当該シーズンなら表示年を追従させる。
    const yearFromData = rows.map((row) => String(row["年度"] || row["年"] || "").trim())
      .find((value) => /^20\d{2}$/.test(value));
    const yearFromUpdate = rows.map((row) => String(row["更新日"] || "").trim())
      .map((value) => value.match(/^(20\d{2})[\/-]/)?.[1] || "")
      .find(Boolean);
    seasonYear = yearFromData || yearFromUpdate || seasonYear;
    isFinal = hasFinishedSeason(rows);
    updatePageForSeason();
    renderOverview();
    bindEvents();

    const requestedTeam = new URLSearchParams(location.search).get("team") || "";
    const firstCentral = leagueRows("セリーグ")[0]?.["球団"] || rows[0]?.["球団"] || "";
    renderSelectedTeam(byTeam.has(requestedTeam) ? requestedTeam : firstCentral, Boolean(requestedTeam));
  } catch (error) {
    const message = "順位データを読み込めませんでした。";
    centralBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`;
    pacificBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`;
    remainingBody.innerHTML = `<tr><td colspan="4">${message}</td></tr>`;
    overview.innerHTML = `<article class="summary-card"><span>読込状況</span><strong>確認必要</strong></article>`;
    teamSummary.innerHTML = "";
    winTargets.innerHTML = "";
    paceBody.innerHTML = `<tr><td colspan="3">${message}</td></tr>`;
    updated.textContent = message;
    console.error(error);
  }
})();
