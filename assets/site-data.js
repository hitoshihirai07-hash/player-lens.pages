(function () {
  const DATA_FILES = {
    batters: "./data/2026stats_batter.csv",
    pitchers: "./data/2026stats_pitcher.csv",
    master: "./data/current_player_master.csv",
    batterSplits: "./data/2026_batter_left_and_right_stats.csv",
    pitcherSplits: "./data/2026_pitcher_left_and_right_stats.csv",
    rookieCandidates: "./data/rookie_candidates.csv",
    starterPositions: "./data/starter_positions.csv",
    recentBatters: "./data/recent_batter_6days.csv",
    recentPitchers: "./data/recent_pitcher_6days.csv",
    fielding: "./data/fielding_summary.csv",
    interleagueBatters: "./data/interleague_batters.csv",
    interleaguePitchers: "./data/interleague_pitchers.csv",
    teamStatsBatters: "./data/team_stats_batter.csv",
    teamStatsPitchers: "./data/team_stats_pitcher.csv",
    registrationHistory: "./data/registration_history.csv",
  };

  const TEAM_TO_FULL = {
    "巨人": "読売ジャイアンツ",
    "阪神": "阪神タイガース",
    "DeNA": "横浜DeNAベイスターズ",
    "広島": "広島東洋カープ",
    "ヤクルト": "東京ヤクルトスワローズ",
    "中日": "中日ドラゴンズ",
    "オリックス": "オリックス・バファローズ",
    "ソフトバンク": "福岡ソフトバンクホークス",
    "ロッテ": "千葉ロッテマリーンズ",
    "楽天": "東北楽天ゴールデンイーグルス",
    "西武": "埼玉西武ライオンズ",
    "日本ハム": "北海道日本ハムファイターズ",
  };

  const FULL_TO_TEAM = Object.fromEntries(Object.entries(TEAM_TO_FULL).map(([short, full]) => [full, short]));
  const CENTRAL_TEAMS = ["巨人", "阪神", "DeNA", "広島", "ヤクルト", "中日"];
  const PACIFIC_TEAMS = ["オリックス", "ソフトバンク", "ロッテ", "楽天", "西武", "日本ハム"];
  const TEAM_SLUGS = {
    "巨人": "giants",
    "阪神": "tigers",
    "DeNA": "baystars",
    "広島": "carp",
    "ヤクルト": "swallows",
    "中日": "dragons",
    "オリックス": "buffaloes",
    "ソフトバンク": "hawks",
    "ロッテ": "marines",
    "楽天": "eagles",
    "西武": "lions",
    "日本ハム": "fighters",
  };
  const TEAM_PROFILES = {
    "巨人": "読売ジャイアンツの打者、投手、守備、若手、交流戦をまとめて確認できます。伝統あるチームの主力と新しい注目選手を、成績ランキングから探せます。",
    "阪神": "阪神タイガースの打者、投手、守備、若手、交流戦をまとめて確認できます。投手力や守備面の強みと、打線の注目選手をあわせて見られます。",
    "DeNA": "横浜DeNAベイスターズの打者、投手、守備、若手、交流戦をまとめて確認できます。長打力、出塁、投手成績、守備評価を並べて注目選手を探せます。",
    "広島": "広島東洋カープの打者、投手、守備、若手、交流戦をまとめて確認できます。機動力、守備、投手成績、若手の伸びしろをデータから追えます。",
    "ヤクルト": "東京ヤクルトスワローズの打者、投手、守備、若手、交流戦をまとめて確認できます。打撃の強みと投手・守備の注目ポイントを一緒に見られます。",
    "中日": "中日ドラゴンズの打者、投手、守備、若手、交流戦をまとめて確認できます。投手力、守備評価、若手野手の現在地をデータで整理しています。",
    "オリックス": "オリックス・バファローズの打者、投手、守備、若手、交流戦をまとめて確認できます。投手成績、守備、若手の注目度をチーム内で比べられます。",
    "ソフトバンク": "福岡ソフトバンクホークスの打者、投手、守備、若手、交流戦をまとめて確認できます。選手層の厚さを、打撃・投球・守備の各ランキングから見られます。",
    "ロッテ": "千葉ロッテマリーンズの打者、投手、守備、若手、交流戦をまとめて確認できます。投手成績、走攻守のバランス、直近で状態の良い選手を探せます。",
    "楽天": "東北楽天ゴールデンイーグルスの打者、投手、守備、若手、交流戦をまとめて確認できます。打線のつながり、投手成績、守備評価をチーム内で比べられます。",
    "西武": "埼玉西武ライオンズの打者、投手、守備、若手、交流戦をまとめて確認できます。若手の台頭、打撃成績、守備面の注目選手を探しやすくしています。",
    "日本ハム": "北海道日本ハムファイターズの打者、投手、守備、若手、交流戦をまとめて確認できます。若手、機動力、投手成績、守備評価の注目ポイントを追えます。",
  };
  const START_POSITIONS = [
    { key: "(投)", label: "投手", type: "pitcher" },
    { key: "(捕)", label: "捕手", type: "batter" },
    { key: "(一)", label: "一塁手", type: "batter" },
    { key: "(二)", label: "二塁手", type: "batter" },
    { key: "(三)", label: "三塁手", type: "batter" },
    { key: "(遊)", label: "遊撃手", type: "batter" },
    { key: "outfield", keys: ["(左)", "(中)", "(右)"], label: "外野手", type: "batter" },
    { key: "(指)", label: "指名打者", type: "batter" },
  ];
  const FIELDING_POSITIONS = ["捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手", "投手"];

  const RANKINGS = [
    { id: "batter-overall", label: "打者総合", type: "batter", scoreKey: "打者総合スコア", minKey: "打席", minValue: 20 },
    { id: "batter-power", label: "長打", type: "batter", scoreKey: "長打スコア", minKey: "打席", minValue: 20 },
    { id: "batter-qualified", label: "規定打席", type: "batter", scoreKey: "打者総合スコア", minKey: "打席", minValue: 0, filter: (row) => row["規定打席到達"] === "到達" },
    { id: "batter-young", label: "25歳以下打者", type: "batter", scoreKey: "若手スコア", minKey: "打席", minValue: 10, filter: (row) => toNumber(row["年齢"]) <= 25 },
    { id: "batter-hidden", label: "穴場打者", type: "batter", scoreKey: "穴場スコア", minKey: "打席", minValue: 10, filter: (row) => toNumber(row["打席"]) <= 90 },
    { id: "batter-vs-right", label: "対右打者", type: "batter", scoreKey: "対右スコア", minKey: "対右打数", minValue: 10 },
    { id: "batter-vs-left", label: "対左打者", type: "batter", scoreKey: "対左スコア", minKey: "対左打数", minValue: 8 },
    { id: "pitcher-overall", label: "投手総合", type: "pitcher", scoreKey: "投手総合スコア", minKey: "投球回_計算用", minValue: 5 },
    { id: "starter", label: "先発", type: "pitcher", scoreKey: "先発スコア", minKey: "投球回_計算用", minValue: 20, filter: (row) => isLikelyStarter(row) },
    { id: "pitcher-qualified", label: "規定投球回", type: "pitcher", scoreKey: "投手総合スコア", minKey: "投球回_計算用", minValue: 0, filter: (row) => row["規定投球回到達"] === "到達" },
    { id: "reliever", label: "救援", type: "pitcher", scoreKey: "救援スコア", minKey: "登板", minValue: 5, filter: (row) => isLikelyReliever(row) },
    { id: "pitcher-young", label: "若手投手", type: "pitcher", scoreKey: "若手投手スコア", minKey: "投球回_計算用", minValue: 3, filter: (row) => toNumber(row["年齢"]) <= 25 },
    { id: "pitcher-vs-right", label: "対右投手", type: "pitcher", scoreKey: "対右投球スコア", minKey: "対右被打数", minValue: 10 },
    { id: "pitcher-vs-left", label: "対左投手", type: "pitcher", scoreKey: "対左投球スコア", minKey: "対左被打数", minValue: 10 },
  ];

  function normalizeName(value) {
    return String(value ?? "").normalize("NFKC").replace(/\u3000/g, " ").trim().replace(/\s+/g, " ");
  }

  function toNumber(value, fallback = 0) {
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (!text || text === "-" || text === "－") return fallback;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toInt(value, fallback = 0) {
    return Math.trunc(toNumber(value, fallback));
  }

  function parseInnings(value) {
    const text = String(value ?? "").trim();
    if (!text) return 0;
    if (!text.includes(".")) return toNumber(text);
    const [whole, fraction] = text.split(".");
    const outs = { "0": 0, "1": 1, "2": 2 }[fraction.slice(0, 1)];
    if (outs === undefined) return toNumber(text);
    return toInt(whole) + outs / 3;
  }

  function inningsPerGame(row) {
    const games = toInt(row["登板"]);
    if (games <= 0) return 0;
    return parseInnings(row["投球回"]) / games;
  }

  function isLikelyReliever(row) {
    const games = toInt(row["登板"]);
    const saves = toInt(row["セーブ"]);
    const holds = toInt(row["ＨＰ"]);
    if (games < 5) return false;
    return saves + holds > 0 || inningsPerGame(row) <= 2.2;
  }

  function isLikelyStarter(row) {
    return !isLikelyReliever(row) && inningsPerGame(row) >= 3;
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

  function shortTeam(team) {
    return FULL_TO_TEAM[team] || team;
  }

  function leagueOfTeam(team) {
    if (CENTRAL_TEAMS.includes(team)) return "セ";
    if (PACIFIC_TEAMS.includes(team)) return "パ";
    return "";
  }

  function playerKey(row) {
    return `${normalizeName(row["選手名"])}|${row["チーム"]}`;
  }

  function normalizedTeam(row) {
    return shortTeam(row["チーム"] || row["球団"] || row["球団名"] || "");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    const input = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  function dataPath(path) {
    return `${rootPath()}${String(path).replace(/^\.\//, "")}`;
  }

  async function loadCsv(path, optional = false) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      if (optional) return [];
      throw new Error("データを読み込めませんでした");
    }
    return parseCsv(await response.text());
  }

  function buildMasterIndexes(masterRows) {
    const byKey = new Map();
    const byName = new Map();

    for (const row of masterRows) {
      const name = normalizeName(row["投手"]);
      const team = shortTeam(row["球団名"]);
      const normalized = { ...row, 選手名: name, チーム: team, 年齢: ageFromBirthdate(row["生年月日"]) };
      byKey.set(`${name}|${team}`, normalized);
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(normalized);
    }
    return { byKey, byName };
  }

  function enrichRows(rows, indexes) {
    return rows.map((row) => {
      const name = normalizeName(row["選手名"]);
      const team = row["チーム"];
      const exact = indexes.byKey.get(`${name}|${team}`);
      const nameMatches = indexes.byName.get(name) || [];
      const master = exact || (nameMatches.length === 1 ? nameMatches[0] : null);
      return {
        ...row,
        選手名: name,
        チーム: team,
        リーグ: leagueOfTeam(team),
        年齢: master?.["年齢"] ?? "",
        投: master?.["投"] ?? "",
        打: master?.["打"] ?? "",
        ポジション: master?.["ポジション"] ?? "",
        区分: master?.["区分"] ?? "",
        一軍: master?.["1軍"] ?? "",
      };
    });
  }

  function mergeBatterSplits(rows, splitRows) {
    const grouped = new Map();
    for (const split of splitRows) {
      const key = `${normalizeName(split["選手名"])}|${shortTeam(split["球団"])}`;
      const side = split["区分"] === "対左" ? "対左" : "対右";
      const record = grouped.get(key) || {};
      record[`${side}打率`] = split["打率"] || "";
      record[`${side}打数`] = split["打数"] || "";
      record[`${side}安打`] = split["安打"] || "";
      record[`${side}本塁打`] = split["本塁打"] || "";
      record[`${side}打点`] = split["打点"] || "";
      grouped.set(key, record);
    }
    return rows.map((row) => ({ ...row, ...(grouped.get(playerKey(row)) || {}) }));
  }

  function mergePitcherSplits(rows, splitRows) {
    const grouped = new Map();
    for (const split of splitRows) {
      const key = `${normalizeName(split["選手名"])}|${shortTeam(split["チーム"])}`;
      const side = split["区分"] === "対左打者" ? "対左" : "対右";
      const record = grouped.get(key) || {};
      record[`${side}被打率`] = split["被打率"] || "";
      record[`${side}被打数`] = split["被打数"] || "";
      record[`${side}被安打`] = split["被安打"] || "";
      record[`${side}被本塁打`] = split["被本塁打"] || "";
      record[`${side}奪三振`] = split["奪三振"] || "";
      record[`${side}与四球`] = split["与四球"] || "";
      record[`${side}与死球`] = split["与死球"] || "";
      grouped.set(key, record);
    }
    return rows.map((row) => ({ ...row, ...(grouped.get(playerKey(row)) || {}) }));
  }

  function ageBonus(age, cap = 32) {
    if (age === "" || age === undefined) return 0;
    return Math.max(0, cap - Number(age));
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  function inningsFromOuts(value) {
    const outs = toInt(value);
    const whole = Math.floor(outs / 3);
    const rest = outs % 3;
    return rest ? `${whole}.${rest}` : String(whole);
  }

  function splitBatterScore(row, side) {
    const avg = toNumber(row[`${side}打率`]);
    const ab = toInt(row[`${side}打数`]);
    const hits = toInt(row[`${side}安打`]);
    const hr = toInt(row[`${side}本塁打`]);
    const rbi = toInt(row[`${side}打点`]);
    const reliability = ab > 0 ? Math.min(1, ab / 40) : 0;
    return avg * 760 * reliability + hits * 1.5 + hr * 12 + rbi * 1.8 + Math.min(ab, 90) * 0.45;
  }

  function addBatterScores(row) {
    const ops = toNumber(row["OPS"]);
    const slg = toNumber(row["長打率"]);
    const obp = toNumber(row["出塁率"]);
    const avg = toNumber(row["打率"]);
    const hr = toInt(row["本塁打"]);
    const rbi = toInt(row["打点"]);
    const hits = toInt(row["安打"]);
    const sb = toInt(row["盗塁"]);
    const pa = toInt(row["打席"]);
    const reliability = pa > 0 ? Math.min(1, pa / 80) : 0;
    const hiddenReliability = pa > 0 ? Math.min(1, pa / 35) : 0;
    const overall = ops * 520 * reliability + hr * 9 + rbi * 1.7 + hits * 0.65 + sb * 2.3 + Math.min(pa, 260) * 0.12;
    const power = slg * 650 * reliability + hr * 16 + rbi * 1.4;
    const onbase = obp * 850 * reliability + sb * 9 + hits * 0.5 + avg * 130 * reliability;
    const hidden = ops * 680 * hiddenReliability + ageBonus(row["年齢"], 30) * 6 - Math.max(0, pa - 90) * 1.1;

    return {
      ...row,
      打者総合スコア: round1(overall),
      長打スコア: round1(power),
      出塁走塁スコア: round1(onbase),
      若手スコア: round1(overall + ageBonus(row["年齢"], 29) * 9),
      穴場スコア: round1(hidden),
      対右スコア: round1(splitBatterScore(row, "対右")),
      対左スコア: round1(splitBatterScore(row, "対左")),
    };
  }

  function splitPitcherScore(row, side) {
    const avg = toNumber(row[`${side}被打率`], 0.4);
    const ab = toInt(row[`${side}被打数`]);
    const hits = toInt(row[`${side}被安打`]);
    const hr = toInt(row[`${side}被本塁打`]);
    const strikeouts = toInt(row[`${side}奪三振`]);
    const walks = toInt(row[`${side}与四球`]);
    const reliability = ab > 0 ? Math.min(1, ab / 45) : 0;
    return Math.max(0, 0.38 - avg) * 900 * reliability + strikeouts * 2.2 + Math.min(ab, 110) * 0.6 - hits * 0.8 - hr * 7 - walks * 1.2;
  }

  function addPitcherScores(row) {
    const era = toNumber(row["防御率"], 9.99);
    const strikeouts = toInt(row["奪三振"]);
    const wins = toInt(row["勝利"]);
    const losses = toInt(row["敗戦"]);
    const saves = toInt(row["セーブ"]);
    const holds = toInt(row["ＨＰ"]);
    const games = toInt(row["登板"]);
    const ip = parseInnings(row["投球回"]);
    const winPct = toNumber(row["勝率"]);
    const ipReliability = ip > 0 ? Math.min(1, ip / 25) : 0;
    const starterReliability = ip > 0 ? Math.min(1, ip / 35) : 0;
    const reliefReliability = Math.max(ip, games) > 0 ? Math.min(1, Math.max(ip, games) / 12) : 0;
    const overall = Math.max(0, 7 - era) * 25 * ipReliability + strikeouts * 2.2 + ip * 2.7 + wins * 7 + saves * 5 + holds * 3.5 + winPct * 12 - losses * 4;
    const starter = Math.max(0, 6 - era) * 30 * starterReliability + strikeouts * 2.4 + ip * 4 + wins * 9 - losses * 5;
    const relief = Math.max(0, 5.5 - era) * 34 * reliefReliability + strikeouts * 2 + games * 2 + saves * 7 + holds * 5 + ip * 1.5;

    return {
      ...row,
      投球回_計算用: round3(ip),
      投手総合スコア: round1(overall),
      先発スコア: round1(starter),
      救援スコア: round1(relief),
      若手投手スコア: round1(overall + ageBonus(row["年齢"], 29) * 9),
      対右投球スコア: round1(splitPitcherScore(row, "対右")),
      対左投球スコア: round1(splitPitcherScore(row, "対左")),
    };
  }

  function recentBatterScore(row) {
    const ab = toInt(row["打数"]);
    const ops = toNumber(row["OPS"]);
    const hits = toInt(row["安打"]);
    const doubles = toInt(row["二塁打"]);
    const triples = toInt(row["三塁打"]);
    const hr = toInt(row["本塁打"]);
    const rbi = toInt(row["打点"]);
    const runs = toInt(row["得点"]);
    const walks = toInt(row["四球"]);
    const strikeouts = toInt(row["三振"]);
    const steals = toInt(row["盗塁"]);
    const reliability = ab > 0 ? Math.min(1, ab / 16) : 0;
    return round1(ops * 520 * reliability + hits * 4 + doubles * 3 + triples * 5 + hr * 14 + rbi * 2.2 + runs * 1.6 + walks * 1.2 + steals * 3 - strikeouts * 0.5);
  }

  function recentPitcherScore(row) {
    const outs = toInt(row["投球アウト数"]);
    const ip = outs / 3;
    const era = toNumber(row["防御率"], 9.99);
    const whip = toNumber(row["WHIP"], 3);
    const strikeouts = toInt(row["奪三振"]);
    const walks = toInt(row["与四球"]);
    const hitByPitch = toInt(row["与死球"]);
    const hits = toInt(row["被安打"]);
    const hr = toInt(row["被本塁打"]);
    const earnedRuns = toInt(row["自責点"]);
    const reliability = outs > 0 ? Math.min(1, outs / 12) : 0;
    return round1(Math.max(0, 5 - era) * 18 * reliability + Math.max(0, 2 - whip) * 16 * reliability + ip * 7 + strikeouts * 3.5 - walks * 2 - hitByPitch - hits * 0.6 - hr * 5 - earnedRuns * 3.5);
  }

  function normalizeInsightRows(rows) {
    return rows.map((row) => ({
      ...row,
      選手名: normalizeName(row["選手名"]),
      チーム: normalizedTeam(row),
      リーグ: leagueOfTeam(normalizedTeam(row)),
    }));
  }

  function addRecentBatterScores(rows) {
    return normalizeInsightRows(rows).map((row) => ({ ...row, 直近スコア: recentBatterScore(row) }));
  }

  function addRecentPitcherScores(rows) {
    return normalizeInsightRows(rows).map((row) => ({ ...row, 直近スコア: recentPitcherScore(row), 投球回_直近: round3(toInt(row["投球アウト数"]) / 3) }));
  }

  function interleagueBatterScore(row) {
    const ab = toInt(row["打数"]);
    const ops = toNumber(row["OPS"]);
    const iso = toNumber(row["ISO"]);
    const hits = toInt(row["安打"]);
    const doubles = toInt(row["二塁打"]);
    const triples = toInt(row["三塁打"]);
    const hr = toInt(row["本塁打"]);
    const rbi = toInt(row["打点"]);
    const runs = toInt(row["得点"]);
    const walks = toInt(row["四球"]);
    const strikeouts = toInt(row["三振"]);
    const steals = toInt(row["盗塁"]);
    const errors = toInt(row["失策"]);
    const reliability = ab > 0 ? Math.min(1, ab / 22) : 0;
    return round1(ops * 460 * reliability + iso * 180 * reliability + hits * 3 + doubles * 2.4 + triples * 4 + hr * 15 + rbi * 2.2 + runs * 1.5 + walks * 1.2 + steals * 2.5 - strikeouts * 0.4 - errors * 0.8 + Math.min(ab, 50) * 0.35);
  }

  function interleaguePitcherScore(row) {
    const outs = toInt(row["投球アウト数"]);
    const ip = outs / 3;
    const era = toNumber(row["防御率"], 9.99);
    const whip = toNumber(row["WHIP"], 3);
    const strikeouts = toInt(row["奪三振"]);
    const walks = toInt(row["与四球"]);
    const hitByPitch = toInt(row["与死球"]);
    const hits = toInt(row["被安打"]);
    const hr = toInt(row["被本塁打"]);
    const earnedRuns = toInt(row["自責点"]);
    const reliability = outs > 0 ? Math.min(1, outs / 18) : 0;
    return round1(Math.max(0, 5 - era) * 18 * reliability + Math.max(0, 1.8 - whip) * 18 * reliability + ip * 6 + strikeouts * 3.2 - walks * 1.8 - hitByPitch - hits * 0.6 - hr * 5 - earnedRuns * 3.5);
  }

  function addInterleagueBatterScores(rows) {
    return normalizeInsightRows(rows)
      .map((row) => ({ ...row, 交流戦スコア: interleagueBatterScore(row) }))
      .filter((row) => row["選手名"] && row["チーム"]);
  }

  function addInterleaguePitcherScores(rows) {
    return normalizeInsightRows(rows)
      .map((row) => ({ ...row, 交流戦スコア: interleaguePitcherScore(row), 投球回_交流戦: inningsFromOuts(row["投球アウト数"]) }))
      .filter((row) => row["選手名"] && row["チーム"]);
  }

  function fieldingScore(row) {
    const position = row["ポジション"];
    const games = toInt(row["試合"]);
    const putouts = toInt(row["刺殺"]);
    const assists = toInt(row["補殺"]);
    const errors = toInt(row["失策"]);
    const doublePlays = toInt(row["併殺"]);
    const passedBalls = toInt(row["捕逸"]);
    const chances = putouts + assists + errors;
    const fieldingRate = row["守備率"] !== "" ? toNumber(row["守備率"]) : chances > 0 ? (chances - errors) / chances : 0;
    const reliability = Math.min(1, games / 30) * 0.6 + Math.min(1, chances / 100) * 0.4;
    const cleanScore = Math.max(0, fieldingRate - 0.94) * 900;
    const activityScore = Math.log1p(chances) * 7;
    const assistScore = games > 0 ? Math.min(assists / games, 6) * 3 : 0;
    const doublePlayScore = games > 0 ? Math.min(doublePlays / games, 1.5) * 5 : 0;
    const catcherScore = position === "捕手" && row["盗塁阻止率"] !== "" ? toNumber(row["盗塁阻止率"]) * 28 - passedBalls * 1.6 : 0;
    return round1(Math.max(0, (cleanScore + activityScore + assistScore + doublePlayScore + catcherScore) * reliability - errors * 0.8));
  }

  function addFieldingMetrics(rows) {
    return rows.map((row) => {
      const team = normalizedTeam(row);
      const putouts = toInt(row["刺殺"]);
      const assists = toInt(row["補殺"]);
      const errors = toInt(row["失策"]);
      const chances = putouts + assists + errors;
      const games = toInt(row["試合"]);
      const fieldingRate = row["守備率"] !== "" ? toNumber(row["守備率"]) : chances > 0 ? (chances - errors) / chances : "";
      const normalized = {
        ...row,
        選手名: normalizeName(row["選手"] || row["選手名"]),
        チーム: team,
        リーグ: row["リーグ"] || leagueOfTeam(team),
        守備率: fieldingRate === "" ? "" : round3(fieldingRate),
        守備機会: chances,
        アウト関与: putouts + assists,
        失策割合: chances > 0 ? round3((errors / chances) * 100) : "",
        補殺_試合: games > 0 ? round3(assists / games) : "",
        併殺_試合: games > 0 ? round3(toInt(row["併殺"]) / games) : "",
      };
      return { ...normalized, 守備評価: fieldingScore(normalized) };
    }).filter((row) => row["選手名"] && row["チーム"]);
  }

  function addQualificationFlags(batters, pitchers) {
    const teamGames = new Map();

    for (const row of batters) {
      const team = row["チーム"];
      const games = toInt(row["試合"]);
      teamGames.set(team, Math.max(teamGames.get(team) || 0, games));
    }

    for (const row of batters) {
      const games = teamGames.get(row["チーム"]) || 0;
      const threshold = Math.floor(games * 3.1);
      row["チーム試合数目安"] = games;
      row["規定打席目安"] = threshold;
      row["規定打席到達"] = toInt(row["打席"]) >= threshold && threshold > 0 ? "到達" : "未到達";
    }

    for (const row of pitchers) {
      const games = teamGames.get(row["チーム"]) || 0;
      row["チーム試合数目安"] = games;
      row["規定投球回目安"] = games;
      row["規定投球回到達"] = toNumber(row["投球回_計算用"]) >= games && games > 0 ? "到達" : "未到達";
    }
  }

  function rankRows(rows, ranking, team = "all", limit = 10) {
    return rows
      .filter((row) => team === "all" || row["チーム"] === team)
      .filter((row) => toNumber(row[ranking.minKey]) >= ranking.minValue)
      .filter((row) => !ranking.filter || ranking.filter(row))
      .sort((a, b) => toNumber(b[ranking.scoreKey]) - toNumber(a[ranking.scoreKey]))
      .slice(0, limit);
  }

  function formatValue(value, column = "") {
    if (value === undefined || value === null || value === "") return "";
    const rateColumns = new Set(["打率", "出塁率", "長打率", "OPS", "防御率", "防御率目安", "勝率", "対右打率", "対左打率", "対右被打率", "対左被打率"]);
    rateColumns.add("守備率");
    rateColumns.add("盗塁阻止率");
    if (rateColumns.has(column)) {
      const number = toNumber(value);
      return number.toFixed(3).replace(/^0(?=\.)/, "");
    }
    if (column === "スコア" || column.endsWith("スコア")) return toNumber(value).toFixed(1);
    return value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function playerUrl(row, type) {
    const params = new URLSearchParams({ type, team: row["チーム"], name: row["選手名"] });
    return `${rootPath()}player.html?${params.toString()}`;
  }

  function teamUrl(team) {
    const slug = TEAM_SLUGS[team];
    if (slug) return `${rootPath()}teams/${slug}.html`;
    const params = new URLSearchParams({ team });
    return `${rootPath()}team.html?${params.toString()}`;
  }

  function teamProfile(team) {
    const full = TEAM_TO_FULL[team] || team;
    return {
      team,
      full,
      league: leagueOfTeam(team),
      slug: TEAM_SLUGS[team] || "",
      description: TEAM_PROFILES[team] || `${full}の打者、投手、守備、若手、交流戦をまとめて確認できます。`,
    };
  }

  function buildTeamTotals(data, fieldingRows = []) {
    return data.teams.map((team) => {
      const batters = data.batters.filter((row) => row["チーム"] === team);
      const pitchers = data.pitchers.filter((row) => row["チーム"] === team);
      const fielding = fieldingRows.filter((row) => row["チーム"] === team);
      const atBats = batters.reduce((sum, row) => sum + toInt(row["対右打数"]) + toInt(row["対左打数"]), 0);
      const hits = batters.reduce((sum, row) => sum + toInt(row["対右安打"]) + toInt(row["対左安打"]), 0);
      const innings = pitchers.reduce((sum, row) => sum + toNumber(row["投球回_計算用"]), 0);
      const earnedRunsEstimate = pitchers.reduce((sum, row) => sum + (toNumber(row["防御率"]) * toNumber(row["投球回_計算用"]) / 9), 0);
      const battingScore = batters.reduce((sum, row) => sum + toNumber(row["打者総合スコア"]), 0);
      const pitchingScore = pitchers.reduce((sum, row) => sum + toNumber(row["投手総合スコア"]), 0);
      const fieldingScoreTotal = fielding.reduce((sum, row) => sum + toNumber(row["守備評価"]), 0);
      return {
        チーム: team,
        リーグ: leagueOfTeam(team),
        打数: atBats,
        安打: hits,
        打率: atBats > 0 ? round3(hits / atBats) : 0,
        本塁打: batters.reduce((sum, row) => sum + toInt(row["本塁打"]), 0),
        打点: batters.reduce((sum, row) => sum + toInt(row["打点"]), 0),
        投球回: round3(innings),
        防御率目安: innings > 0 ? round3((earnedRunsEstimate / innings) * 9) : 0,
        打撃評価: round1(battingScore),
        投手評価: round1(pitchingScore),
        守備評価: round1(fieldingScoreTotal),
        総合評価: round1(battingScore + pitchingScore + fieldingScoreTotal),
      };
    });
  }

  function enhanceCompactTables(root = document) {
    root.querySelectorAll(".compact-table").forEach((table) => {
      const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent.trim());
      if (!headers.length) return;
      table.classList.add("is-card-table");
      table.closest(".compact-table-wrap")?.classList.add("has-card-table");
      table.querySelectorAll("tbody tr").forEach((row) => {
        Array.from(row.children).forEach((cell, index) => {
          cell.dataset.label = headers[index] || "";
        });
      });
    });
  }

  function rootPath() {
    return location.pathname.includes("/teams/") ? "../" : "./";
  }

  async function loadData() {
    const [battersRaw, pitchersRaw, masterRaw, batterSplitsRaw, pitcherSplitsRaw] = await Promise.all([
      loadCsv(dataPath(DATA_FILES.batters)),
      loadCsv(dataPath(DATA_FILES.pitchers)),
      loadCsv(dataPath(DATA_FILES.master)),
      loadCsv(dataPath(DATA_FILES.batterSplits), true),
      loadCsv(dataPath(DATA_FILES.pitcherSplits), true),
    ]);
    const indexes = buildMasterIndexes(masterRaw);
    const batters = mergeBatterSplits(enrichRows(battersRaw, indexes), batterSplitsRaw).map(addBatterScores);
    const pitchers = mergePitcherSplits(enrichRows(pitchersRaw, indexes), pitcherSplitsRaw).map(addPitcherScores);
    addQualificationFlags(batters, pitchers);
    return { batters, pitchers, teams: Object.keys(TEAM_TO_FULL) };
  }

  async function loadInsightData() {
    const [rookieRows, positionRows, recentBatterRows, recentPitcherRows] = await Promise.all([
      loadCsv(dataPath(DATA_FILES.rookieCandidates), true),
      loadCsv(dataPath(DATA_FILES.starterPositions), true),
      loadCsv(dataPath(DATA_FILES.recentBatters), true),
      loadCsv(dataPath(DATA_FILES.recentPitchers), true),
    ]);
    return {
      rookies: normalizeInsightRows(rookieRows),
      starterPositions: normalizeInsightRows(positionRows),
      recentBatters: addRecentBatterScores(recentBatterRows),
      recentPitchers: addRecentPitcherScores(recentPitcherRows),
    };
  }

  async function loadFieldingData() {
    const rows = await loadCsv(dataPath(DATA_FILES.fielding), true);
    return addFieldingMetrics(rows);
  }

  async function loadInterleagueData() {
    const [batterRows, pitcherRows] = await Promise.all([
      loadCsv(dataPath(DATA_FILES.interleagueBatters), true),
      loadCsv(dataPath(DATA_FILES.interleaguePitchers), true),
    ]);
    return {
      batters: addInterleagueBatterScores(batterRows),
      pitchers: addInterleaguePitcherScores(pitcherRows),
    };
  }

  function normalizeOpponentStatsRows(rows) {
    return rows
      .map((row) => ({
        ...row,
        選手名: normalizeName(row["選手名"]),
        チーム: normalizedTeam(row),
        対球団名: shortTeam(row["対球団名"] || ""),
      }))
      .filter((row) => row["選手名"] && row["選手名"] !== "#N/A" && row["チーム"] && row["対球団名"]);
  }

  async function loadOpponentStatsData() {
    const [batterRows, pitcherRows] = await Promise.all([
      loadCsv(dataPath(DATA_FILES.teamStatsBatters), true),
      loadCsv(dataPath(DATA_FILES.teamStatsPitchers), true),
    ]);
    return {
      batters: normalizeOpponentStatsRows(batterRows),
      pitchers: normalizeOpponentStatsRows(pitcherRows),
    };
  }

  async function loadRosterData() {
    const rows = await loadCsv(dataPath(DATA_FILES.registrationHistory));
    return rows
      .map((row) => {
        const team = shortTeam(row["球団名"] || "");
        return {
          ...row,
          選手名: normalizeName(row["投手"] || ""),
          チーム: team,
          リーグ: leagueOfTeam(team),
        };
      })
      .filter((row) => row["選手名"] && row["チーム"]);
  }

  window.PlayerLensData = {
    RANKINGS,
    START_POSITIONS,
    FIELDING_POSITIONS,
    TEAM_TO_FULL,
    TEAM_SLUGS,
    buildTeamTotals,
    escapeHtml,
    formatValue,
    inningsFromOuts,
    enhanceCompactTables,
    loadData,
    loadFieldingData,
    loadInsightData,
    loadInterleagueData,
    loadOpponentStatsData,
    loadRosterData,
    playerKey,
    playerUrl,
    rankRows,
    leagueOfTeam,
    shortTeam,
    teamUrl,
    teamProfile,
    toInt,
    toNumber,
  };
})();
