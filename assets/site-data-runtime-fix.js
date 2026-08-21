(function () {
  if (window.__playerLensDataRuntimeFixLoaded) return;
  window.__playerLensDataRuntimeFixLoaded = true;

  const D = window.PlayerLensData;
  if (!D || typeof D.loadData !== "function") return;

  const originalLoadData = D.loadData.bind(D);
  const scriptUrl = document.currentScript?.src || new URL("./assets/site-data-runtime-fix.js", location.href).href;
  const dataBase = new URL("../data/", scriptUrl);

  function normalizeName(value) {
    return String(value ?? "").normalize("NFKC").replace(/\u3000/g, " ").trim().replace(/\s+/g, " ");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      const next = input[i + 1];
      if (ch === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    const headers = rows.shift() || [];
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  async function fetchCsv(name) {
    const response = await fetch(new URL(name, dataBase), { cache: "no-store" });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return parseCsv(await response.text());
  }

  function ageFromBirthdate(value) {
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (!match) return "";
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const today = new Date();
    let age = today.getFullYear() - y;
    const passed = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
    if (!passed) age -= 1;
    return age;
  }

  function buildMasterIndexes(rows) {
    const byKey = new Map();
    const byName = new Map();
    for (const row of rows) {
      const name = normalizeName(row["投手"] || row["選手名"]);
      const team = D.shortTeam(row["球団名"] || row["チーム"] || "");
      if (!name || !team) continue;
      const normalized = { ...row, 選手名: name, チーム: team, 年齢: ageFromBirthdate(row["生年月日"]) };
      byKey.set(`${name}|${team}`, normalized);
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(normalized);
    }
    return { byKey, byName };
  }

  function enrichMaster(rows, indexes) {
    return rows.map((row) => {
      const name = normalizeName(row["選手名"] || row["投手"] || "");
      const team = D.shortTeam(row["チーム"] || row["球団"] || row["球団名"] || "");
      const exact = indexes.byKey.get(`${name}|${team}`);
      const matches = indexes.byName.get(name) || [];
      const master = exact || (matches.length === 1 ? matches[0] : null);
      return {
        ...row,
        選手名: name,
        チーム: team,
        リーグ: D.leagueOfTeam(team),
        年齢: master?.["年齢"] ?? row["年齢"] ?? "",
        投: master?.["投"] ?? row["投"] ?? "",
        打: master?.["打"] ?? row["打"] ?? "",
        ポジション: master?.["ポジション"] ?? row["ポジション"] ?? "",
        区分: master?.["区分"] ?? row["区分"] ?? "",
      };
    });
  }

  function playerKey(row) {
    return `${normalizeName(row["選手名"]).replace(/[\s\u3000]/g, "")}|${D.shortTeam(row["チーム"] || "")}`;
  }

  function mergeBatterSplits(rows, splitRows) {
    const grouped = new Map();
    for (const split of splitRows) {
      const team = D.shortTeam(split["チーム"] || split["球団"] || split["球団名"] || "");
      const sideValue = String(split["区分"] || split["左右"] || "").trim();
      const side = ["対左", "対左投手", "左"].includes(sideValue) ? "対左"
        : ["対右", "対右投手", "右"].includes(sideValue) ? "対右" : "";
      if (!split["選手名"] || !team || !side) continue;
      const key = playerKey({ 選手名: split["選手名"], チーム: team });
      const record = grouped.get(key) || {};
      for (const field of ["打率", "打席", "打数", "安打", "本塁打", "三振", "四球", "死球", "犠打", "犠飛"]) {
        record[`${side}${field}`] = split[field] || "";
      }
      grouped.set(key, record);
    }
    return rows.map((row) => ({ ...row, ...(grouped.get(playerKey(row)) || {}) }));
  }

  function mergePitcherSplits(rows, splitRows) {
    const grouped = new Map();
    for (const split of splitRows) {
      const team = D.shortTeam(split["チーム"] || split["球団"] || split["球団名"] || "");
      const sideValue = String(split["区分"] || split["左右"] || "").trim();
      const side = ["対左打者", "対左", "左"].includes(sideValue) ? "対左"
        : ["対右打者", "対右", "右"].includes(sideValue) ? "対右" : "";
      if (!split["選手名"] || !team || !side) continue;
      const key = playerKey({ 選手名: split["選手名"], チーム: team });
      const record = grouped.get(key) || {};
      const map = {
        被打率: "被打率", 被打数: "被打数", 被安打: "被安打", 被本塁打: "被本塁打",
        奪三振: "奪三振", 与四球: "与四球", 与死球: "与死球",
      };
      for (const [source, suffix] of Object.entries(map)) record[`${side}${suffix}`] = split[source] || "";
      grouped.set(key, record);
    }
    return rows.map((row) => ({ ...row, ...(grouped.get(playerKey(row)) || {}) }));
  }

  function ageBonus(age, cap = 32) {
    if (age === "" || age === undefined) return 0;
    return Math.max(0, cap - Number(age));
  }

  function round1(value) { return Math.round(value * 10) / 10; }
  function round3(value) { return Math.round(value * 1000) / 1000; }

  function splitBatterScore(row, side) {
    const avg = D.toNumber(row[`${side}打率`]);
    const ab = D.toInt(row[`${side}打数`]);
    const hits = D.toInt(row[`${side}安打`]);
    const hr = D.toInt(row[`${side}本塁打`]);
    const strikeouts = D.toInt(row[`${side}三振`]);
    const walks = D.toInt(row[`${side}四球`]);
    const reliability = ab > 0 ? Math.min(1, ab / 40) : 0;
    return avg * 760 * reliability + hits * 1.5 + hr * 12 + walks * 1.2 - strikeouts * 0.4 + Math.min(ab, 90) * 0.45;
  }

  function addBatterScores(row) {
    const ops = D.toNumber(row["OPS"]);
    const slg = D.toNumber(row["長打率"]);
    const obp = D.toNumber(row["出塁率"]);
    const avg = D.toNumber(row["打率"]);
    const hr = D.toInt(row["本塁打"]);
    const rbi = D.toInt(row["打点"]);
    const hits = D.toInt(row["安打"]);
    const sb = D.toInt(row["盗塁"]);
    const pa = D.toInt(row["打席"]);
    const reliability = pa > 0 ? Math.min(1, pa / 80) : 0;
    const hiddenReliability = pa > 0 ? Math.min(1, pa / 35) : 0;
    const overall = ops * 520 * reliability + hr * 9 + rbi * 1.7 + hits * 0.65 + sb * 2.3 + Math.min(pa, 260) * 0.12;
    const power = slg * 650 * reliability + hr * 16 + rbi * 1.4;
    const onbase = obp * 850 * reliability + sb * 9 + hits * 0.5 + avg * 130 * reliability;
    const hidden = ops * 680 * hiddenReliability + ageBonus(row["年齢"], 30) * 6 - Math.max(0, pa - 90) * 1.1;
    return {
      ...row,
      打者総合スコア: round1(overall), 長打スコア: round1(power), 出塁走塁スコア: round1(onbase),
      若手スコア: round1(overall + ageBonus(row["年齢"], 29) * 9), 穴場スコア: round1(hidden),
      対右スコア: round1(splitBatterScore(row, "対右")), 対左スコア: round1(splitBatterScore(row, "対左")),
    };
  }

  function splitPitcherScore(row, side) {
    const avg = D.toNumber(row[`${side}被打率`], 0.4);
    const ab = D.toInt(row[`${side}被打数`]);
    const hits = D.toInt(row[`${side}被安打`]);
    const hr = D.toInt(row[`${side}被本塁打`]);
    const strikeouts = D.toInt(row[`${side}奪三振`]);
    const walks = D.toInt(row[`${side}与四球`]);
    const reliability = ab > 0 ? Math.min(1, ab / 45) : 0;
    return Math.max(0, 0.38 - avg) * 900 * reliability + strikeouts * 2.2 + Math.min(ab, 110) * 0.6 - hits * 0.8 - hr * 7 - walks * 1.2;
  }

  function parseInnings(value) {
    const text = String(value ?? "").trim();
    if (!text) return 0;
    if (!text.includes(".")) return D.toNumber(text);
    const [whole, fraction] = text.split(".");
    const outs = { "0": 0, "1": 1, "2": 2 }[fraction.slice(0, 1)];
    if (outs === undefined) return D.toNumber(text);
    return D.toInt(whole) + outs / 3;
  }

  function addPitcherScores(row) {
    const era = D.toNumber(row["防御率"], 9.99);
    const strikeouts = D.toInt(row["奪三振"]);
    const wins = D.toInt(row["勝利"] ?? row["勝"]);
    const losses = D.toInt(row["敗戦"] ?? row["敗"]);
    const saves = D.toInt(row["セーブ"]);
    const holds = D.toInt(row["ホールド"] ?? row["ＨＰ"]);
    const games = D.toInt(row["登板"]);
    const ip = parseInnings(row["投球回"]);
    const winPct = D.toNumber(row["勝率"]);
    const ipReliability = ip > 0 ? Math.min(1, ip / 25) : 0;
    const starterReliability = ip > 0 ? Math.min(1, ip / 35) : 0;
    const reliefReliability = Math.max(ip, games) > 0 ? Math.min(1, Math.max(ip, games) / 12) : 0;
    const overall = Math.max(0, 7 - era) * 25 * ipReliability + strikeouts * 2.2 + ip * 2.7 + wins * 7 + saves * 5 + holds * 3.5 + winPct * 12 - losses * 4;
    const starter = Math.max(0, 6 - era) * 30 * starterReliability + strikeouts * 2.4 + ip * 4 + wins * 9 - losses * 5;
    const relief = Math.max(0, 5.5 - era) * 34 * reliefReliability + strikeouts * 2 + games * 2 + saves * 7 + holds * 5 + ip * 1.5;
    return {
      ...row,
      投球回_計算用: round3(ip), 投手総合スコア: round1(overall), 先発スコア: round1(starter),
      救援スコア: round1(relief), 若手投手スコア: round1(overall + ageBonus(row["年齢"], 29) * 9),
      対右投球スコア: round1(splitPitcherScore(row, "対右")), 対左投球スコア: round1(splitPitcherScore(row, "対左")),
    };
  }

  function addQualificationFlags(batters, pitchers) {
    const teamGames = new Map();
    for (const row of batters) {
      const games = D.toInt(row["試合"]);
      teamGames.set(row["チーム"], Math.max(teamGames.get(row["チーム"]) || 0, games));
    }
    for (const row of batters) {
      const games = teamGames.get(row["チーム"]) || 0;
      const threshold = Math.floor(games * 3.1);
      row["チーム試合数目安"] = games;
      row["規定打席目安"] = threshold;
      row["規定打席到達"] = D.toInt(row["打席"]) >= threshold && threshold > 0 ? "到達" : "未到達";
    }
    for (const row of pitchers) {
      const games = teamGames.get(row["チーム"]) || 0;
      row["チーム試合数目安"] = games;
      row["規定投球回目安"] = games;
      row["規定投球回到達"] = D.toNumber(row["投球回_計算用"]) >= games && games > 0 ? "到達" : "未到達";
    }
  }

  let cachedPromise = null;
  D.loadData = function fixedLoadData() {
    if (cachedPromise) return cachedPromise;
    cachedPromise = (async () => {
      const data = await originalLoadData();
      let masterRows = [];
      let batterSplits = [];
      let pitcherSplits = [];
      try {
        [masterRows, batterSplits, pitcherSplits] = await Promise.all([
          fetchCsv("current_player_master.csv"),
          fetchCsv("2026_batter_left_and_right_stats.csv"),
          fetchCsv("2026_pitcher_left_and_right_stats.csv"),
        ]);
      } catch (error) {
        console.warn("Player Lens data normalization fallback:", error);
      }

      const indexes = buildMasterIndexes(masterRows);
      let batters = enrichMaster(data.batters || [], indexes);
      let pitchers = enrichMaster(data.pitchers || [], indexes);
      if (batterSplits.length) batters = mergeBatterSplits(batters, batterSplits);
      if (pitcherSplits.length) pitchers = mergePitcherSplits(pitchers, pitcherSplits);
      batters = batters.map(addBatterScores);
      pitchers = pitchers.map(addPitcherScores);
      addQualificationFlags(batters, pitchers);
      return { ...data, batters, pitchers };
    })().catch((error) => {
      cachedPromise = null;
      throw error;
    });
    return cachedPromise;
  };
})();
