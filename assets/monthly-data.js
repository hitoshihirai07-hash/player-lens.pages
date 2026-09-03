(function () {
  const D = window.PlayerLensData;
  if (!D) return;

  ["loadBatterGameData", "loadPitcherDailyData"].forEach((key) => {
    if (typeof D[key] !== "function" || D[key].__monthlyMemoized) return;
    const original = D[key].bind(D);
    let promise = null;
    const memoized = function () {
      if (!promise) promise = original();
      return promise;
    };
    memoized.__monthlyMemoized = true;
    D[key] = memoized;
  });

  const playerNameKey = (value) => String(value || "").normalize("NFKC").replace(/[\s\u3000]/g, "");
  const round1 = (value) => Math.round(value * 10) / 10;
  const round3 = (value) => Math.round(value * 1000) / 1000;

  function monthKey(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const normalized = text.replace(/年/g, "-").replace(/月/g, "-").replace(/日/g, "").replace(/[./]/g, "-");
    const match = normalized.match(/^(\d{4})-(\d{1,2})/);
    if (!match) return "";
    return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}`;
  }

  function monthLabel(key, showYear = false) {
    const [year, month] = String(key || "").split("-");
    if (!year || !month) return key || "";
    return showYear ? `${year}年${Number(month)}月` : `${Number(month)}月`;
  }

  function value(row, keys) {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return D.toNumber(row[key]);
    }
    return 0;
  }

  function hasValue(row, keys) {
    return keys.some((key) => row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "");
  }

  function inningsFromOuts(outsValue) {
    const outs = Math.max(0, Math.trunc(Number(outsValue) || 0));
    const whole = Math.floor(outs / 3);
    const rest = outs % 3;
    return rest ? `${whole}.${rest}` : String(whole);
  }

  function inningsToOuts(valueToParse) {
    const text = String(valueToParse ?? "").trim();
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
      item.打席 += value(row, ["打席"]);
      item.打数 += value(row, ["打数"]);
      item.安打 += value(row, ["安打"]);
      item.単打 += value(row, ["単打"]);
      item.二塁打 += value(row, ["二塁打"]);
      item.三塁打 += value(row, ["三塁打"]);
      item.本塁打 += value(row, ["本塁打"]);
      item.打点 += value(row, ["打点"]);
      item.四球 += value(row, ["四球"]);
      item.死球 += value(row, ["死球"]);
      item.犠打 += value(row, ["犠打"]);
      item.犠飛 += value(row, ["犠飛"]);
      item.三振 += value(row, ["三振"]);
      item.盗塁 += value(row, ["盗塁", "盗塁成功"]);
      item.出塁数 += value(row, ["出塁数"]);
      item.塁打 += value(row, ["塁打", "総塁打"]);
      item.hasSingles ||= hasValue(row, ["単打"]);
      item.hasTotalBases ||= hasValue(row, ["塁打", "総塁打"]);
      item.hasWalks ||= hasValue(row, ["四球"]);
      item.hasHbp ||= hasValue(row, ["死球"]);
      item.hasSf ||= hasValue(row, ["犠飛"]);
      item.hasSac ||= hasValue(row, ["犠打"]);
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
      if (role.includes("先発") || value(row, ["先発"]) > 0) item.starts.add(gameId);
      const rowOuts = hasValue(row, ["投球アウト数", "投球回(アウト)"])
        ? value(row, ["投球アウト数", "投球回(アウト)"])
        : inningsToOuts(row["投球回"]);
      item.outs += rowOuts;
      item.被安打 += value(row, ["被安打"]);
      item.与四球 += value(row, ["与四球", "四球"]);
      item.与死球 += value(row, ["与死球", "死球"]);
      item.被本塁打 += value(row, ["被本塁打"]);
      item.奪三振 += value(row, ["奪三振"]);
      item.自責点 += hasValue(row, ["自責点", "責失"])
        ? value(row, ["自責点", "責失"])
        : hasValue(row, ["防御率"]) && rowOuts > 0 ? Math.round(value(row, ["防御率"]) * rowOuts / 27) : 0;
      const flags = resultFlags(row);
      item.勝利 += hasValue(row, ["勝利", "勝"]) ? value(row, ["勝利", "勝"]) : flags.win;
      item.敗戦 += hasValue(row, ["敗戦", "敗"]) ? value(row, ["敗戦", "敗"]) : flags.loss;
      item.セーブ += hasValue(row, ["セーブ", "S"]) ? value(row, ["セーブ", "S"]) : flags.save;
      item.ＨＰ += hasValue(row, ["ＨＰ", "ホールド", "HLD", "H"]) ? value(row, ["ＨＰ", "ホールド", "HLD", "H"]) : flags.hold;
      map.set(key, item);
    });

    return [...map.values()].map((item) => {
      const ip = item.outs / 3;
      const era = item.outs > 0 ? item.自責点 * 27 / item.outs : 9.99;
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
        投球回: inningsFromOuts(item.outs),
        投球回_計算用: round3(ip),
        防御率: round3(era),
        WHIP: "",
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

  let batterPromise = null;
  let pitcherPromise = null;

  function load(type) {
    if (type === "pitcher") {
      if (!pitcherPromise) pitcherPromise = D.loadPitcherDailyData().then(aggregatePitchers);
      return pitcherPromise;
    }
    if (!batterPromise) batterPromise = D.loadBatterGameData().then(aggregateBatters);
    return batterPromise;
  }

  function ranking(type) {
    return D.RANKINGS.find((item) => item.id === (type === "pitcher" ? "pitcher-overall" : "batter-overall"));
  }

  function eligibleRows(rows, type) {
    const rule = ranking(type);
    if (!rule) return [];
    return rows
      .filter((row) => D.toNumber(row[rule.minKey]) >= rule.minValue)
      .filter((row) => !rule.filter || rule.filter(row));
  }

  window.PlayerLensMonthly = {
    aggregateBatters,
    aggregatePitchers,
    eligibleRows,
    load,
    monthKey,
    monthLabel,
    playerNameKey,
    ranking,
  };
})();
