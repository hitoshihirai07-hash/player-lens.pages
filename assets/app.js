const DATA_FILES = {
  batters: "./data/2026stats_batter.csv",
  pitchers: "./data/2026stats_pitcher.csv",
  master: "./data/current_player_master.csv",
  batterSplits: "./data/2026_batter_left_and_right_stats.csv",
  pitcherSplits: "./data/2026_pitcher_left_and_right_stats.csv",
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

const RANKINGS = [
  {
    id: "batter-overall",
    label: "打者総合",
    group: "打者",
    type: "batter",
    scoreKey: "打者総合スコア",
    minKey: "打席",
    minValue: 20,
    columns: ["打席", "打率", "OPS", "本塁打", "打点", "安打", "盗塁"],
  },
  {
    id: "batter-power",
    label: "長打",
    group: "打者",
    type: "batter",
    scoreKey: "長打スコア",
    minKey: "打席",
    minValue: 20,
    columns: ["打席", "長打率", "OPS", "本塁打", "打点"],
  },
  {
    id: "batter-qualified",
    label: "規定打席",
    group: "打者",
    type: "batter",
    scoreKey: "打者総合スコア",
    minKey: "打席",
    minValue: 0,
    columns: ["打席", "規定打席目安", "打率", "OPS", "本塁打", "打点", "安打"],
    filter: (row) => row["規定打席到達"] === "到達",
  },
  {
    id: "batter-young",
    label: "25歳以下",
    group: "打者",
    type: "batter",
    scoreKey: "若手スコア",
    minKey: "打席",
    minValue: 10,
    columns: ["年齢", "打席", "打率", "OPS", "本塁打", "打点"],
    filter: (row) => toNumber(row["年齢"]) <= 25,
  },
  {
    id: "batter-hidden",
    label: "穴場打者",
    group: "打者",
    type: "batter",
    scoreKey: "穴場スコア",
    minKey: "打席",
    minValue: 10,
    columns: ["打席", "打率", "OPS", "本塁打", "打点"],
    filter: (row) => toNumber(row["打席"]) <= 90,
  },
  {
    id: "batter-vs-right",
    label: "対右打者",
    group: "左右",
    type: "batter",
    scoreKey: "対右スコア",
    minKey: "対右打数",
    minValue: 10,
    columns: ["対右打数", "対右打率", "対右安打", "対右本塁打", "対右打点", "OPS"],
  },
  {
    id: "batter-vs-left",
    label: "対左打者",
    group: "左右",
    type: "batter",
    scoreKey: "対左スコア",
    minKey: "対左打数",
    minValue: 8,
    columns: ["対左打数", "対左打率", "対左安打", "対左本塁打", "対左打点", "OPS"],
  },
  {
    id: "pitcher-overall",
    label: "投手総合",
    group: "投手",
    type: "pitcher",
    scoreKey: "投手総合スコア",
    minKey: "投球回_計算用",
    minValue: 5,
    columns: ["投球回", "防御率", "奪三振", "勝利", "セーブ", "ＨＰ"],
  },
  {
    id: "starter",
    label: "先発",
    group: "投手",
    type: "pitcher",
    scoreKey: "先発スコア",
    minKey: "投球回_計算用",
    minValue: 20,
    columns: ["投球回", "防御率", "奪三振", "勝利", "敗戦"],
  },
  {
    id: "pitcher-qualified",
    label: "規定投球回",
    group: "投手",
    type: "pitcher",
    scoreKey: "投手総合スコア",
    minKey: "投球回_計算用",
    minValue: 0,
    columns: ["投球回", "規定投球回目安", "防御率", "奪三振", "勝利", "敗戦"],
    filter: (row) => row["規定投球回到達"] === "到達",
  },
  {
    id: "reliever",
    label: "救援",
    group: "投手",
    type: "pitcher",
    scoreKey: "救援スコア",
    minKey: "登板",
    minValue: 5,
    columns: ["登板", "防御率", "奪三振", "セーブ", "ＨＰ", "投球回"],
  },
  {
    id: "pitcher-young",
    label: "若手投手",
    group: "投手",
    type: "pitcher",
    scoreKey: "若手投手スコア",
    minKey: "投球回_計算用",
    minValue: 3,
    columns: ["年齢", "投球回", "防御率", "奪三振", "勝利"],
    filter: (row) => toNumber(row["年齢"]) <= 25,
  },
  {
    id: "pitcher-vs-right",
    label: "対右投手",
    group: "左右",
    type: "pitcher",
    scoreKey: "対右投球スコア",
    minKey: "対右被打数",
    minValue: 10,
    columns: ["対右被打数", "対右被打率", "対右被安打", "対右被本塁打", "対右奪三振", "対右与四球"],
  },
  {
    id: "pitcher-vs-left",
    label: "対左投手",
    group: "左右",
    type: "pitcher",
    scoreKey: "対左投球スコア",
    minKey: "対左被打数",
    minValue: 10,
    columns: ["対左被打数", "対左被打率", "対左被安打", "対左被本塁打", "対左奪三振", "対左与四球"],
  },
];

const state = {
  rankingId: "batter-overall",
  team: "all",
  query: "",
  selectedKey: "",
  batters: [],
  pitchers: [],
};

const els = {
  status: document.getElementById("status"),
  rankingButtons: document.getElementById("rankingButtons"),
  teamFilter: document.getElementById("teamFilter"),
  searchInput: document.getElementById("searchInput"),
  summaryCards: document.getElementById("summaryCards"),
  rankingGroup: document.getElementById("rankingGroup"),
  rankingTitle: document.getElementById("rankingTitle"),
  resultCount: document.getElementById("resultCount"),
  rankingHead: document.getElementById("rankingHead"),
  rankingBody: document.getElementById("rankingBody"),
  detailPanel: document.getElementById("detailPanel"),
};

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\u3000/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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

function ageFromBirthdate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!match) return "";
  const [, y, m, d] = match.map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const passed = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!passed) age -= 1;
  return age;
}

function shortTeam(team) {
  return FULL_TO_TEAM[team] || team;
}

function playerKey(row) {
  return `${normalizeName(row["選手名"])}|${row["チーム"]}`;
}

function playerDetailUrl(row, type) {
  const params = new URLSearchParams({ type, team: row["チーム"], name: row["選手名"] });
  return `./player.html?${params.toString()}`;
}

function teamDetailUrl(team) {
  const params = new URLSearchParams({ team });
  return `./team.html?${params.toString()}`;
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
    const normalized = {
      ...row,
      選手名: name,
      チーム: team,
      年齢: ageFromBirthdate(row["生年月日"]),
    };
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

  const rightScore = splitBatterScore(row, "対右");
  const leftScore = splitBatterScore(row, "対左");

  return {
    ...row,
    打者総合スコア: round1(overall),
    長打スコア: round1(power),
    出塁走塁スコア: round1(onbase),
    若手スコア: round1(overall + ageBonus(row["年齢"], 29) * 9),
    穴場スコア: round1(hidden),
    対右スコア: round1(rightScore),
    対左スコア: round1(leftScore),
  };
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

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function currentRanking() {
  return RANKINGS.find((ranking) => ranking.id === state.rankingId) || RANKINGS[0];
}

function rowsForRanking(ranking) {
  const rows = ranking.type === "batter" ? state.batters : state.pitchers;
  const query = normalizeName(state.query).toLowerCase();
  return rows
    .filter((row) => state.team === "all" || row["チーム"] === state.team)
    .filter((row) => !query || normalizeName(row["選手名"]).toLowerCase().includes(query))
    .filter((row) => toNumber(row[ranking.minKey]) >= ranking.minValue)
    .filter((row) => !ranking.filter || ranking.filter(row))
    .sort((a, b) => toNumber(b[ranking.scoreKey]) - toNumber(a[ranking.scoreKey]));
}

function renderRankingButtons() {
  els.rankingButtons.innerHTML = "";
  for (const ranking of RANKINGS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = ranking.label;
    button.setAttribute("aria-pressed", String(ranking.id === state.rankingId));
    button.addEventListener("click", () => {
      state.rankingId = ranking.id;
      state.selectedKey = "";
      render();
    });
    els.rankingButtons.append(button);
  }
}

function renderTeamFilter() {
  const teams = Object.keys(TEAM_TO_FULL);
  els.teamFilter.innerHTML = [
    `<option value="all">全12球団</option>`,
    ...teams.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`),
  ].join("");
  els.teamFilter.value = state.team;
}

function renderSummary() {
  const batterTeams = new Set(state.batters.map((row) => row["チーム"]));
  const pitcherTeams = new Set(state.pitchers.map((row) => row["チーム"]));
  const oneGun = [...state.batters, ...state.pitchers].filter((row) => row["一軍"] === "TRUE").length;
  const splitRows = state.batters.filter((row) => row["対右打率"] || row["対左打率"]).length + state.pitchers.filter((row) => row["対右被打率"] || row["対左被打率"]).length;
  const qualifiedRows = state.batters.filter((row) => row["規定打席到達"] === "到達").length + state.pitchers.filter((row) => row["規定投球回到達"] === "到達").length;
  const items = [
    ["打者", state.batters.length],
    ["投手", state.pitchers.length],
    ["球団", new Set([...batterTeams, ...pitcherTeams]).size],
    ["規定到達", qualifiedRows],
    ["左右成績", splitRows],
  ];
  els.summaryCards.innerHTML = items
    .map(([label, value]) => `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${value.toLocaleString("ja-JP")}</strong></article>`)
    .join("");
  if (oneGun === 0) return;
}

function renderTable(rows, ranking) {
  const columns = ["順位", "選手名", "チーム", "年齢", "ポジション", "スコア", ...ranking.columns.filter((column) => !["年齢"].includes(column))];
  els.rankingHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>`;
  const maxScore = Math.max(...rows.slice(0, 50).map((row) => toNumber(row[ranking.scoreKey])), 1);
  const visibleRows = rows.slice(0, 100);

  if (!visibleRows.length) {
    els.rankingBody.innerHTML = `<tr><td colspan="${columns.length}" class="empty-state">該当データなし</td></tr>`;
    return;
  }

  els.rankingBody.innerHTML = visibleRows
    .map((row, index) => {
      const key = playerKey(row);
      const cells = columns.map((column) => {
        if (column === "順位") return `<td class="rank">${index + 1}</td>`;
        if (column === "スコア") return `<td class="bar-cell">${scoreBar(row[ranking.scoreKey], maxScore)}</td>`;
        if (column === "選手名") return `<td><a href="${playerDetailUrl(row, ranking.type)}">${escapeHtml(row[column])}</a></td>`;
        if (column === "チーム") return `<td><a href="${teamDetailUrl(row[column])}">${escapeHtml(row[column])}</a></td>`;
        return `<td>${escapeHtml(formatValue(row[column], column))}</td>`;
      });
      return `<tr data-key="${escapeHtml(key)}" class="${key === state.selectedKey ? "is-selected" : ""}">${cells.join("")}</tr>`;
    })
    .join("");

  els.rankingBody.querySelectorAll("tr[data-key]").forEach((rowEl) => {
    rowEl.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      state.selectedKey = rowEl.dataset.key;
      render();
    });
  });
}

function scoreBar(score, maxScore) {
  const numeric = toNumber(score);
  const width = Math.max(4, Math.min(100, (numeric / maxScore) * 100));
  return `
    <div class="bar">
      <div class="bar-track"><div class="bar-fill" style="--value:${width}%"></div></div>
      <span class="score">${formatValue(numeric, "スコア")}</span>
    </div>
  `;
}

function formatValue(value, column) {
  if (value === undefined || value === null || value === "") return "";
  const numericColumns = new Set(["打率", "出塁率", "長打率", "OPS", "防御率", "勝率", "対右打率", "対左打率", "対右被打率", "対左被打率"]);
  if (numericColumns.has(column)) {
    const number = toNumber(value);
    return number === 0 && String(value).trim() === "" ? "" : number.toFixed(3).replace(/^0(?=\.)/, "");
  }
  if (column === "スコア" || column.endsWith("スコア")) return toNumber(value).toFixed(1);
  return value;
}

function renderDetail(rows, ranking) {
  const selected = rows.find((row) => playerKey(row) === state.selectedKey) || rows[0];
  if (!selected) {
    els.detailPanel.innerHTML = `<div class="empty-detail">選手を選択</div>`;
    return;
  }
  state.selectedKey = playerKey(selected);

  const isBatter = ranking.type === "batter";
  const metrics = isBatter
    ? [
        ["打席", selected["打席"]],
        ["OPS", formatValue(selected["OPS"], "OPS")],
        ["本塁打", selected["本塁打"]],
        ["打点", selected["打点"]],
      ]
    : [
        ["投球回", selected["投球回"]],
        ["防御率", formatValue(selected["防御率"], "防御率")],
        ["奪三振", selected["奪三振"]],
        ["登板", selected["登板"]],
      ];

  els.detailPanel.innerHTML = `
    <div class="detail-head">
      <p class="eyebrow"><a href="${teamDetailUrl(selected["チーム"])}">${escapeHtml(selected["チーム"])}</a></p>
      <h3>${escapeHtml(selected["選手名"])}</h3>
      <div class="detail-meta">${escapeHtml([selected["年齢"] ? `${selected["年齢"]}歳` : "", selected["ポジション"], selected["投"] && selected["打"] ? `${selected["投"]}投${selected["打"]}打` : ""].filter(Boolean).join(" / "))}</div>
      <a class="detail-link" href="${playerDetailUrl(selected, ranking.type)}">選手詳細を見る</a>
    </div>
    <div class="metric-grid">
      ${metrics.map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "")}</strong></div>`).join("")}
    </div>
    ${splitMarkup(selected, isBatter)}
  `;
}

function splitMarkup(row, isBatter) {
  if (isBatter) {
    const columns = ["区分", "打数", "打率", "安打", "本塁打", "打点"];
    const right = ["対右", row["対右打数"], formatValue(row["対右打率"], "対右打率"), row["対右安打"], row["対右本塁打"], row["対右打点"]];
    const left = ["対左", row["対左打数"], formatValue(row["対左打率"], "対左打率"), row["対左安打"], row["対左本塁打"], row["対左打点"]];
    return splitTable(columns, [right, left]);
  }
  const columns = ["区分", "被打数", "被打率", "被安打", "被本塁打", "奪三振", "与四球"];
  const right = ["対右", row["対右被打数"], formatValue(row["対右被打率"], "対右被打率"), row["対右被安打"], row["対右被本塁打"], row["対右奪三振"], row["対右与四球"]];
  const left = ["対左", row["対左被打数"], formatValue(row["対左被打率"], "対左被打率"), row["対左被安打"], row["対左被本塁打"], row["対左奪三振"], row["対左与四球"]];
  return splitTable(columns, [right, left]);
}

function splitTable(columns, rows) {
  const hasAny = rows.some((row) => row.slice(1).some((value) => value !== undefined && value !== ""));
  if (!hasAny) return `<div class="notice">左右成績なし</div>`;
  return `
    <div class="split-block">
      <h3>左右成績</h3>
      <table class="split-table">
        <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value ?? "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function render() {
  const ranking = currentRanking();
  const rows = rowsForRanking(ranking);

  renderRankingButtons();
  els.rankingGroup.textContent = ranking.group;
  els.rankingTitle.textContent = ranking.label;
  els.resultCount.textContent = `${rows.length.toLocaleString("ja-JP")}件`;
  renderTable(rows, ranking);
  renderDetail(rows, ranking);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function boot() {
  try {
    const [battersRaw, pitchersRaw, masterRaw, batterSplitsRaw, pitcherSplitsRaw] = await Promise.all([
      loadCsv(DATA_FILES.batters),
      loadCsv(DATA_FILES.pitchers),
      loadCsv(DATA_FILES.master),
      loadCsv(DATA_FILES.batterSplits, true),
      loadCsv(DATA_FILES.pitcherSplits, true),
    ]);

    const indexes = buildMasterIndexes(masterRaw);
    state.batters = mergeBatterSplits(enrichRows(battersRaw, indexes), batterSplitsRaw).map(addBatterScores);
    state.pitchers = mergePitcherSplits(enrichRows(pitchersRaw, indexes), pitcherSplitsRaw).map(addPitcherScores);
    addQualificationFlags(state.batters, state.pitchers);

    renderTeamFilter();
    renderSummary();
    render();

    els.status.textContent = "データ読込完了";
    els.status.classList.add("is-ready");
  } catch (error) {
    els.status.textContent = "データ読込エラー";
    els.status.classList.add("is-error");
    els.rankingBody.innerHTML = `<tr><td class="empty-state">${escapeHtml(error.message)}</td></tr>`;
  }
}

els.teamFilter.addEventListener("change", (event) => {
  state.team = event.target.value;
  state.selectedKey = "";
  render();
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.selectedKey = "";
  render();
});

boot();
