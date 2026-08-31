(function () {
  const D = window.PlayerLensData;
  if (!D) return;

  // The player page and this feature use the same large per-game files.
  // Memoize the loaders so each file is fetched/parses only once per page view.
  ["loadBatterGameData", "loadPitcherDailyData"].forEach((key) => {
    if (typeof D[key] !== "function") return;
    const original = D[key].bind(D);
    let promise = null;
    D[key] = function memoizedMonthlyLoader() {
      if (!promise) promise = original();
      return promise;
    };
  });

  const params = new URLSearchParams(location.search);
  const type = params.get("type") === "pitcher" ? "pitcher" : "batter";
  const ranking = D.RANKINGS.find((item) => item.id === (type === "pitcher" ? "pitcher-overall" : "batter-overall"));
  if (!ranking) return;

  const esc = (value) => D.escapeHtml(value === undefined || value === null ? "" : String(value));
  const n = (row, keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return D.toNumber(row[key]);
    }
    return 0;
  };
  const has = (row, keys) => keys.some((key) => row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "");
  const round1 = (value) => Math.round(value * 10) / 10;
  const round3 = (value) => Math.round(value * 1000) / 1000;
  const playerNameKey = (value) => String(value || "").normalize("NFKC").replace(/[\s\u3000]/g, "");

  function monthKey(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const normalized = text.replace(/年/g, "-").replace(/月/g, "-").replace(/日/g, "").replace(/[./]/g, "-");
    const match = normalized.match(/^(\d{4})-(\d{1,2})/);
    if (!match) return "";
    return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;
  }

  function monthLabel(key, showYear) {
    const [year, month] = key.split("-");
    return showYear ? `${year}年${Number(month)}月` : `${Number(month)}月`;
  }

  function battingAverage(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(3).replace(/^0/, "");
  }

  function decimal3(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(3).replace(/^0/, "");
  }

  function decimal2(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(2);
  }

  function inningsFromOuts(outs) {
    const whole = Math.floor(outs / 3);
    const rest = outs % 3;
    return rest ? `${whole}.${rest}` : String(whole);
  }

  function inningsToOuts(value) {
    const text = String(value ?? "").trim();
    if (!text) return 0;
    if (/^\d+$/.test(text)) return Number(text) * 3;
    const match = text.match(/^(\d+)\.(\d)$/);
    if (match && ["0", "1", "2"].includes(match[2])) return Number(match[1]) * 3 + Number(match[2]);
    const parsed = Number(text);
    return Number.isFinite(parsed) ? Math.round(parsed * 3) : 0;
  }

  function batterScore(row) {
    const ops = D.toNumber(row["OPS"]);
    const hr = D.toInt(row["本塁打"]);
    const rbi = D.toInt(row["打点"]);
    const hits = D.toInt(row["安打"]);
    const sb = D.toInt(row["盗塁"]);
    const pa = D.toInt(row["打席"]);
    const reliability = pa > 0 ? Math.min(1, pa / 80) : 0;
    return round1(ops * 520 * reliability + hr * 9 + rbi * 1.7 + hits * 0.65 + sb * 2.3 + Math.min(pa, 260) * 0.12);
  }

  function pitcherScore(row) {
    const era = D.toNumber(row["防御率"], 9.99);
    const strikeouts = D.toInt(row["奪三振"]);
    const wins = D.toInt(row["勝利"]);
    const losses = D.toInt(row["敗戦"]);
    const saves = D.toInt(row["セーブ"]);
    const holds = D.toInt(row["ＨＰ"]);
    const ip = D.toNumber(row["投球回_計算用"]);
    const winPct = D.toNumber(row["勝率"]);
    const ipReliability = ip > 0 ? Math.min(1, ip / 25) : 0;
    return round1(Math.max(0, 7 - era) * 25 * ipReliability + strikeouts * 2.2 + ip * 2.7 + wins * 7 + saves * 5 + holds * 3.5 + winPct * 12 - losses * 4);
  }

  function aggregateBatters(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const month = monthKey(row["試合日"]);
      const team = D.shortTeam(row["球団"] || row["チーム"] || "");
      const name = String(row["選手名"] || "").trim();
      if (!month || !team || !name) return;
      const key = `${month}|${team}|${playerNameKey(name)}`;
      const item = map.get(key) || {
        month, チーム: team, 選手名: name, リーグ: D.leagueOfTeam(team), games: new Set(),
        打席: 0, 打数: 0, 安打: 0, 単打: 0, 二塁打: 0, 三塁打: 0, 本塁打: 0, 打点: 0,
        四球: 0, 死球: 0, 犠打: 0, 犠飛: 0, 三振: 0, 盗塁: 0, 出塁数: 0, 塁打: 0,
        hasSingles: false, hasTotalBases: false, hasWalks: false, hasHbp: false, hasSf: false, hasSac: false,
      };
      const gameId = String(row["試合ID"] || "").trim() || `${row["試合日"]}|${row["対戦相手"] || row["対戦球団"] || ""}|${team}`;
      item.games.add(gameId);
      item.打席 += n(row, ["打席"]);
      item.打数 += n(row, ["打数"]);
      item.安打 += n(row, ["安打"]);
      item.単打 += n(row, ["単打"]);
      item.二塁打 += n(row, ["二塁打"]);
      item.三塁打 += n(row, ["三塁打"]);
      item.本塁打 += n(row, ["本塁打"]);
      item.打点 += n(row, ["打点"]);
      item.四球 += n(row, ["四球"]);
      item.死球 += n(row, ["死球"]);
      item.犠打 += n(row, ["犠打"]);
      item.犠飛 += n(row, ["犠飛"]);
      item.三振 += n(row, ["三振"]);
      item.盗塁 += n(row, ["盗塁", "盗塁成功"]);
      item.出塁数 += n(row, ["出塁数"]);
      item.塁打 += n(row, ["塁打", "総塁打"]);
      item.hasSingles ||= has(row, ["単打"]);
      item.hasTotalBases ||= has(row, ["塁打", "総塁打"]);
      item.hasWalks ||= has(row, ["四球"]);
      item.hasHbp ||= has(row, ["死球"]);
      item.hasSf ||= has(row, ["犠飛"]);
      item.hasSac ||= has(row, ["犠打"]);
      map.set(key, item);
    });

    return [...map.values()].map((item) => {
      const average = item.打数 > 0 ? item.安打 / item.打数 : 0;
      let totalBases = item.塁打;
      if (!item.hasTotalBases) {
        const singles = item.hasSingles ? item.単打 : Math.max(0, item.安打 - item.二塁打 - item.三塁打 - item.本塁打);
        totalBases = singles + item.二塁打 * 2 + item.三塁打 * 3 + item.本塁打 * 4;
      }
      const slugging = item.打数 > 0 ? totalBases / item.打数 : 0;
      const detailedObp = item.hasWalks || item.hasHbp || item.hasSf;
      const obpDen = item.打数 + item.四球 + item.死球 + item.犠飛;
      const fallbackObpDen = Math.max(0, item.打席 - (item.hasSac ? item.犠打 : 0));
      const onBase = detailedObp && obpDen > 0
        ? (item.安打 + item.四球 + item.死球) / obpDen
        : fallbackObpDen > 0 ? item.出塁数 / fallbackObpDen : 0;
      const normalized = {
        month: item.month,
        チーム: item.チーム,
        選手名: item.選手名,
        リーグ: item.リーグ,
        試合: item.games.size,
        打席: Math.trunc(item.打席),
        打数: Math.trunc(item.打数),
        安打: Math.trunc(item.安打),
        二塁打: Math.trunc(item.二塁打),
        三塁打: Math.trunc(item.三塁打),
        本塁打: Math.trunc(item.本塁打),
        打点: Math.trunc(item.打点),
        三振: Math.trunc(item.三振),
        四球: Math.trunc(item.四球),
        盗塁: Math.trunc(item.盗塁),
        打率: round3(average),
        出塁率: round3(onBase),
        長打率: round3(slugging),
        OPS: round3(onBase + slugging),
      };
      normalized["打者総合スコア"] = batterScore(normalized);
      return normalized;
    });
  }

  function resultFlags(row) {
    const text = String(row["結果"] || row["勝敗"] || row["投手結果"] || "").trim();
    return {
      win: /(^|[^敗])勝/.test(text) ? 1 : 0,
      loss: /敗/.test(text) ? 1 : 0,
      save: /セーブ|(^|[^A-Za-z])S([^A-Za-z]|$)|Ｓ/.test(text) ? 1 : 0,
      hold: /ホールド|(^|[^A-Za-z])H([^A-Za-z]|$)|Ｈ/.test(text) ? 1 : 0,
    };
  }

  function aggregatePitchers(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const month = monthKey(row["試合日"]);
      const team = D.shortTeam(row["球団"] || row["チーム"] || "");
      const name = String(row["選手名"] || row["投手フルネーム"] || "").trim();
      if (!month || !team || !name) return;
      const key = `${month}|${team}|${playerNameKey(name)}`;
      const item = map.get(key) || {
        month, チーム: team, 選手名: name, リーグ: D.leagueOfTeam(team), games: new Set(), starts: new Set(),
        outs: 0, 被安打: 0, 与四球: 0, 与死球: 0, 被本塁打: 0, 奪三振: 0, 自責点: 0,
        勝利: 0, 敗戦: 0, セーブ: 0, ＨＰ: 0,
      };
      const gameId = String(row["試合ID"] || "").trim() || `${row["試合日"]}|${row["対戦球団"] || ""}|${row["ホーム/ビジター"] || ""}`;
      item.games.add(gameId);
      const role = String(row["登板区分"] || row["役割"] || "");
      if (role.includes("先発") || n(row, ["先発"]) > 0) item.starts.add(gameId);
      const rowOuts = has(row, ["投球アウト数", "投球回(アウト)"])
        ? n(row, ["投球アウト数", "投球回(アウト)"])
        : inningsToOuts(row["投球回"]);
      item.outs += rowOuts;
      item.被安打 += n(row, ["被安打"]);
      item.与四球 += n(row, ["与四球", "四球"]);
      item.与死球 += n(row, ["与死球", "死球"]);
      item.被本塁打 += n(row, ["被本塁打"]);
      item.奪三振 += n(row, ["奪三振"]);
      item.自責点 += has(row, ["自責点", "責失"])
        ? n(row, ["自責点", "責失"])
        : has(row, ["防御率"]) && rowOuts > 0 ? Math.round(n(row, ["防御率"]) * rowOuts / 27) : 0;
      const flags = resultFlags(row);
      item.勝利 += has(row, ["勝利", "勝"]) ? n(row, ["勝利", "勝"]) : flags.win;
      item.敗戦 += has(row, ["敗戦", "敗"]) ? n(row, ["敗戦", "敗"]) : flags.loss;
      item.セーブ += has(row, ["セーブ", "S"]) ? n(row, ["セーブ", "S"]) : flags.save;
      item.ＨＰ += has(row, ["ＨＰ", "ホールド", "HLD", "H"]) ? n(row, ["ＨＰ", "ホールド", "HLD", "H"]) : flags.hold;
      map.set(key, item);
    });

    return [...map.values()].map((item) => {
      const ip = item.outs / 3;
      const era = item.outs > 0 ? item.自責点 * 27 / item.outs : 9.99;
      const whip = item.outs > 0 ? (item.被安打 + item.与四球) / ip : 0;
      const winPct = item.勝利 + item.敗戦 > 0 ? item.勝利 / (item.勝利 + item.敗戦) : 0;
      const normalized = {
        month: item.month,
        チーム: item.チーム,
        選手名: item.選手名,
        リーグ: item.リーグ,
        登板: item.games.size,
        先発: item.starts.size,
        救援: Math.max(0, item.games.size - item.starts.size),
        投球アウト数: Math.trunc(item.outs),
        投球回: inningsFromOuts(Math.trunc(item.outs)),
        投球回_計算用: round3(ip),
        防御率: round3(era),
        WHIP: round3(whip),
        被安打: Math.trunc(item.被安打),
        与四球: Math.trunc(item.与四球),
        与死球: Math.trunc(item.与死球),
        被本塁打: Math.trunc(item.被本塁打),
        奪三振: Math.trunc(item.奪三振),
        自責点: Math.trunc(item.自責点),
        勝利: Math.trunc(item.勝利),
        敗戦: Math.trunc(item.敗戦),
        セーブ: Math.trunc(item.セーブ),
        ＨＰ: Math.trunc(item.ＨＰ),
        勝率: round3(winPct),
      };
      normalized["投手総合スコア"] = pitcherScore(normalized);
      return normalized;
    });
  }

  function rankPosition(rows, target, team = "all") {
    if (!target) return "—";
    const ranked = D.rankRows(rows, ranking, team, 9999);
    const index = ranked.findIndex((item) => item.チーム === target.チーム && playerNameKey(item.選手名) === playerNameKey(target.選手名));
    return index >= 0 ? `${index + 1}位` : "対象外";
  }

  function playerUrl(row) {
    const query = new URLSearchParams({ name: row.選手名, team: row.チーム, type });
    return `./player?${query.toString()}`;
  }

  function topRankingMarkup(rows, target) {
    const ranked = D.rankRows(rows, ranking, "all", 10);
    if (!ranked.length) return '<p class="empty-state">この月はランキング対象の選手がいません。</p>';
    const metricHeaders = type === "pitcher" ? ["防御率", "投球回", "奪三振"] : ["打率", "OPS", "本塁打"];
    return `
      <div class="monthly-ranking-wrap compact-table-wrap">
        <table class="compact-table monthly-ranking-table">
          <thead><tr><th>順位</th><th>選手</th><th>球団</th><th>Score</th>${metricHeaders.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead>
          <tbody>${ranked.map((item, index) => {
            const selected = target && item.チーム === target.チーム && playerNameKey(item.選手名) === playerNameKey(target.選手名);
            const metrics = type === "pitcher"
              ? [decimal2(item.防御率), item.投球回, item.奪三振]
              : [battingAverage(item.打率), decimal3(item.OPS), item.本塁打];
            return `<tr${selected ? ' class="is-current-player"' : ""}><td>${index + 1}</td><td><a href="${esc(playerUrl(item))}">${esc(item.選手名)}</a></td><td>${esc(item.チーム)}</td><td class="score">${esc(item[ranking.scoreKey].toFixed(1))}</td>${metrics.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
  }

  function selectedStatsMarkup(target) {
    if (!target) return '<p class="empty-state monthly-player-empty">この月の一軍出場記録はありません。</p>';
    const items = type === "pitcher"
      ? [
          ["登板", target.登板], ["先発 / 救援", `${target.先発} / ${target.救援}`], ["投球回", target.投球回],
          ["防御率", decimal2(target.防御率)], ["WHIP", target.WHIP.toFixed(3)], ["勝敗", `${target.勝利}勝${target.敗戦}敗`],
          ["奪三振", target.奪三振], ["セーブ / HP", `${target.セーブ} / ${target.ＨＰ}`], ["Player Lens Score", target[ranking.scoreKey].toFixed(1)],
        ]
      : [
          ["試合", target.試合], ["打席", target.打席], ["打率", battingAverage(target.打率)],
          ["OPS", decimal3(target.OPS)], ["本塁打", target.本塁打], ["打点", target.打点],
          ["安打", target.安打], ["盗塁", target.盗塁], ["Player Lens Score", target[ranking.scoreKey].toFixed(1)],
        ];
    return `<div class="metric-grid wide-metrics monthly-metrics">${items.map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>`;
  }

  function renderMonth(section, allRows, month, activeTeam, activeName) {
    const monthRows = allRows.filter((row) => row.month === month);
    const target = monthRows.find((row) => row.チーム === activeTeam && playerNameKey(row.選手名) === playerNameKey(activeName))
      || monthRows.find((row) => playerNameKey(row.選手名) === playerNameKey(activeName))
      || null;
    const league = target?.リーグ || D.leagueOfTeam(activeTeam);
    const teamForRank = target?.チーム || activeTeam;
    const leagueRows = league ? monthRows.filter((row) => row.リーグ === league) : [];
    const leagueLabel = league === "セ" ? "セ・リーグ" : league === "パ" ? "パ・リーグ" : "リーグ";
    const currentMonthLabel = section.querySelector(`[data-month="${month}"]`)?.textContent || month;
    section.querySelector(".monthly-current-label").textContent = currentMonthLabel;
    section.querySelector(".monthly-selected-stats").innerHTML = selectedStatsMarkup(target);
    section.querySelector(".monthly-ranks").innerHTML = `
      <div><span>12球団</span><strong>${esc(rankPosition(monthRows, target))}</strong></div>
      <div><span>${esc(leagueLabel)}</span><strong>${esc(rankPosition(leagueRows, target))}</strong></div>
      <div><span>${esc(teamForRank)}内</span><strong>${esc(rankPosition(monthRows, target, teamForRank))}</strong></div>`;
    section.querySelector(".monthly-top10").innerHTML = topRankingMarkup(monthRows, target);
    section.querySelectorAll(".monthly-month-tab").forEach((button) => {
      const active = button.dataset.month === month;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (typeof D.enhanceCompactTables === "function") D.enhanceCompactTables(section);
  }

  function createSection(allRows, activeTeam, activeName) {
    const months = [...new Set(allRows.map((row) => row.month).filter(Boolean))].sort();
    if (!months.length) return null;
    const years = new Set(months.map((key) => key.slice(0, 4)));
    const showYear = years.size > 1;
    const section = document.createElement("section");
    section.className = "content-card monthly-player-section";
    section.id = "monthlyPlayerStats";
    section.innerHTML = `
      <div class="section-heading monthly-heading">
        <div><p class="eyebrow">Monthly</p><h2>月別成績・月間ランキング</h2></div>
        <p class="small-note">月を選ぶと成績と順位が切り替わります。</p>
      </div>
      <div class="monthly-month-tabs" role="tablist" aria-label="月を選択">
        ${months.map((key) => `<button type="button" class="monthly-month-tab" role="tab" data-month="${key}" aria-selected="false">${esc(monthLabel(key, showYear))}</button>`).join("")}
      </div>
      <div class="monthly-block">
        <div class="monthly-subheading"><h3><span class="monthly-current-label"></span>の成績</h3><span class="monthly-rule">年間の「${esc(ranking.label)}」と同じ計算式</span></div>
        <div class="monthly-selected-stats"></div>
        <div class="monthly-ranks"></div>
      </div>
      <div class="monthly-block monthly-ranking-block">
        <div class="monthly-subheading"><h3>月間ランキング TOP10</h3><span class="monthly-rule">掲載条件：${type === "pitcher" ? "5投球回以上" : "20打席以上"}</span></div>
        <div class="monthly-top10"></div>
      </div>`;
    section.querySelectorAll(".monthly-month-tab").forEach((button) => {
      button.addEventListener("click", () => renderMonth(section, allRows, button.dataset.month, activeTeam, activeName));
    });
    renderMonth(section, allRows, months[months.length - 1], activeTeam, activeName);
    return section;
  }

  let aggregatedPromise = null;
  function loadMonthlyRows() {
    if (!aggregatedPromise) {
      aggregatedPromise = (type === "pitcher" ? D.loadPitcherDailyData() : D.loadBatterGameData())
        .then((rows) => type === "pitcher" ? aggregatePitchers(rows) : aggregateBatters(rows))
        .catch(() => []);
    }
    return aggregatedPromise;
  }

  let mounting = false;
  async function tryMount() {
    if (mounting || document.getElementById("monthlyPlayerStats")) return;
    const content = document.getElementById("playerContent");
    if (!content) return;
    const cards = [...content.children].filter((node) => node.classList?.contains("content-card"));
    if (cards.length < 2 || cards[0].textContent.trim() === "データ読込中") return;
    const hero = content.querySelector(".player-hero-card");
    const mainStats = cards[1];
    if (!hero || !mainStats || mainStats.querySelector("h2")?.textContent.trim() !== "主な成績") return;
    mounting = true;
    try {
      const allRows = await loadMonthlyRows();
      if (!allRows.length || document.getElementById("monthlyPlayerStats")) return;
      const activeTeam = D.shortTeam(hero.querySelector(".eyebrow")?.textContent || params.get("team") || "");
      const activeName = hero.querySelector("h2")?.textContent.trim() || params.get("name") || "";
      const section = createSection(allRows, activeTeam, activeName);
      if (section) mainStats.insertAdjacentElement("afterend", section);
    } finally {
      mounting = false;
    }
  }

  const observer = new MutationObserver(() => { tryMount(); });
  const content = document.getElementById("playerContent");
  if (content) observer.observe(content, { childList: true, subtree: false });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryMount, { once: true });
  else tryMount();
})();
