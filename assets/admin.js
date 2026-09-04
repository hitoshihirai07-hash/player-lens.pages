(function () {
  const PASSWORD_HASH = "749b3012961dc742bb980a216671611ebccdae2f0da7ffa63b806b3713dff941";
  const SITE_URL = "https://player-lens-pages.pages.dev/";
  const FILES = [
    { label: "打者成績", path: "./data/2026stats_batter.csv" },
    { label: "投手成績", path: "./data/2026stats_pitcher.csv" },
    { label: "選手マスター", path: "./data/current_player_master.csv" },
    { label: "打者左右成績", path: "./data/2026_batter_left_and_right_stats.csv" },
    { label: "投手左右成績", path: "./data/2026_pitcher_left_and_right_stats.csv" },
    { label: "新人王候補", path: "./data/rookie_candidates.csv" },
    { label: "守備位置別出場数", path: "./data/starter_positions.csv" },
    { label: "直近6試合野手", path: "./data/recent_batter_6days.csv" },
    { label: "野手1試合成績", path: "./data/batter_game_result.csv", dateField: "試合日" },
    { label: "投手1試合成績", path: "./data/pitcher_daily_results.csv", dateField: "試合日" },
    { label: "直近6試合盗塁", path: "./data/recent_steal_6days.csv" },
    { label: "直近6試合投手", path: "./data/recent_pitcher_6days.csv" },
    { label: "守備成績", path: "./data/fielding_summary.csv" },
    { label: "交流戦野手", path: "./data/interleague_batters.csv" },
    { label: "交流戦投手", path: "./data/interleague_pitchers.csv" },
    { label: "対球団別野手成績", path: "./data/team_stats_batter.csv" },
    { label: "対球団別投手成績", path: "./data/team_stats_pitcher.csv" },
    { label: "順位・残り試合", path: "./data/npb_standings.csv" },
    { label: "ペナントレース", path: "./data/pennant_race_status.csv", dateField: "更新基準日" },
  ];
  const SITE_CHECK_PAGES = [
    ["トップ", "./index.html", "https://player-lens-pages.pages.dev/"],
    ["チーム別", "./teams.html", "https://player-lens-pages.pages.dev/teams"],
    ["注目データ", "./insights.html", "https://player-lens-pages.pages.dev/insights"],
    ["守備", "./defense.html", "https://player-lens-pages.pages.dev/defense"],
    ["野手試合状況", "./batter-streaks.html", "https://player-lens-pages.pages.dev/batter-streaks"],
    ["交流戦", "./interleague.html", "https://player-lens-pages.pages.dev/interleague"],
    ["対球団別相性", "./opponent-watch.html", "https://player-lens-pages.pages.dev/opponent-watch"],
    ["順位・残り試合", "./standings.html", "https://player-lens-pages.pages.dev/standings"],
    ["ペナントレース", "./pennant-race.html", "https://player-lens-pages.pages.dev/pennant-race"],
    ["読み物", "./articles.html", "https://player-lens-pages.pages.dev/articles"],
    ["見方", "./guide.html", "https://player-lens-pages.pages.dev/guide"],
    ["基礎知識", "./stats-basics.html", "https://player-lens-pages.pages.dev/stats-basics"],
    ["更新履歴", "./updates.html", "https://player-lens-pages.pages.dev/updates"],
    ["楽しみ方", "./resources.html", "https://player-lens-pages.pages.dev/resources"],
    ["このサイトについて", "./about.html", "https://player-lens-pages.pages.dev/about"],
    ["プライバシー", "./privacy.html", "https://player-lens-pages.pages.dev/privacy"],
    ["免責事項", "./disclaimer.html", "https://player-lens-pages.pages.dev/disclaimer"],
    ["お問い合わせ", "./contact.html", "https://player-lens-pages.pages.dev/contact"],
  ];

  const D = window.PlayerLensData;
  const els = {
    loginPanel: document.getElementById("loginPanel"),
    adminPanel: document.getElementById("adminPanel"),
    password: document.getElementById("adminPassword"),
    loginButton: document.getElementById("loginButton"),
    loginMessage: document.getElementById("loginMessage"),
    summary: document.getElementById("adminSummary"),
    updateRows: document.getElementById("updateRows"),
    reload: document.getElementById("reloadAdmin"),
    tweetLeague: document.getElementById("tweetLeague"),
    tweetTeam: document.getElementById("tweetTeam"),
    tweetTheme: document.getElementById("tweetTheme"),
    tweetOutput: document.getElementById("tweetOutput"),
    buildTweet: document.getElementById("buildTweet"),
    copyTweet: document.getElementById("copyTweet"),
    copyMessage: document.getElementById("copyMessage"),
    checkList: document.getElementById("checkList"),
    monetizationChecks: document.getElementById("monetizationChecks"),
    postCandidates: document.getElementById("postCandidates"),
  };

  let loadedData = null;
  let loadedInsight = null;
  let loadedFielding = [];
  let loadedInterleague = { batters: [], pitchers: [] };
  let loadedBatterGames = [];
  let loadedPitcherDaily = [];
  let loadedStandings = [];
  let fileReports = [];
  let batterMap = new Map();
  let pitcherMap = new Map();
  let positionPlayerNames = new Set();
  let batterReferenceDate = "";
  let pitcherReferenceDate = "";
  let currentXImageData = null;

  const STANDINGS_THEMES = new Set([
    "standings-today",
    "standings-race",
    "standings-remaining",
    "standings-goal",
    "standings-pace",
  ]);
  const STANDINGS_LEAGUE_LABELS = { "セ": "セ・リーグ", "パ": "パ・リーグ" };
  const STANDINGS_CSV_LEAGUES = { "セ": "セリーグ", "パ": "パリーグ" };

  async function sha256(text) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

  async function fetchReport(file) {
    const response = await fetch(file.path, { cache: "no-store" });
    const text = response.ok ? await response.text() : "";
    const rows = text ? parseCsv(text) : [];
    const dates = rows.map((row) => row[file.dateField || "更新日"]).filter(Boolean).sort();
    return {
      ...file,
      ok: response.ok,
      rows,
      rowCount: rows.length,
      dataDate: dates.at(-1) || "",
      servedAt: response.headers.get("last-modified") || "",
    };
  }

  async function fetchText(path) {
    const response = await fetch(path, { cache: "no-store" });
    return { ok: response.ok, text: response.ok ? await response.text() : "" };
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ja-JP");
  }

  function inTweetScope(row, league, team = "all") {
    return (league === "all" || row["リーグ"] === league) && (team === "all" || row["チーム"] === team);
  }

  function teamPageUrl(team) {
    const slug = D.TEAM_SLUGS[team];
    return slug ? `${SITE_URL}teams/${slug}` : `${SITE_URL}team.html?team=${encodeURIComponent(team)}`;
  }

  function scopedPageUrl(page, team = "all") {
    if (team === "all") return `${SITE_URL}${page}`;
    return `${SITE_URL}${page}?team=${encodeURIComponent(team)}`;
  }

  function trackedPostUrl(url, theme) {
    const tracked = new URL(url);
    tracked.searchParams.set("utm_source", "x");
    tracked.searchParams.set("utm_medium", "social");
    tracked.searchParams.set("utm_campaign", STANDINGS_THEMES.has(theme) ? "standings" : "x-post");
    tracked.searchParams.set("utm_content", theme);
    return tracked.toString();
  }

  function standingsInt(row, key) {
    const value = Number.parseInt(String(row?.[key] ?? "0").replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(value) ? value : 0;
  }

  function standingsRows(league = "all") {
    const csvLeague = STANDINGS_CSV_LEAGUES[league] || "";
    const order = { "セリーグ": 0, "パリーグ": 1 };
    return loadedStandings
      .filter((row) => !csvLeague || row["リーグ"] === csvLeague)
      .slice()
      .sort((a, b) => (order[a["リーグ"]] ?? 9) - (order[b["リーグ"]] ?? 9) || standingsInt(a, "順位") - standingsInt(b, "順位"));
  }

  function standingsWinPct(row) {
    const wins = standingsInt(row, "勝利");
    const losses = standingsInt(row, "敗戦");
    return wins + losses ? wins / (wins + losses) : 0;
  }

  function standingsPctText(value) {
    return Number(value || 0).toFixed(3).replace(/^0/, "");
  }

  function standingsGamesBehind(leader, row) {
    if (!leader || !row) return 0;
    return ((standingsInt(leader, "勝利") - standingsInt(row, "勝利")) + (standingsInt(row, "敗戦") - standingsInt(leader, "敗戦"))) / 2;
  }

  function standingsGapText(value) {
    if (Math.abs(value) < 0.001) return "0.0";
    return Number(value).toFixed(1);
  }

  function standingsDateLabel() {
    const value = loadedStandings.map((row) => String(row["更新日"] || "")).filter(Boolean).sort().at(-1) || "";
    const match = value.match(/^(?:\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    return match ? `${Number(match[1])}/${Number(match[2])}` : value;
  }

  function standingsLeagueLabel(row) {
    return row?.["リーグ"] === "パリーグ" ? "パ・リーグ" : "セ・リーグ";
  }

  function selectedStandingsRow(league, team) {
    if (team !== "all") {
      const selected = loadedStandings.find((row) => row["球団"] === team);
      if (selected) return selected;
    }
    return standingsRows(league)[0] || loadedStandings[0] || null;
  }

  function standingsOpponents(row) {
    if (!row) return [];
    return loadedStandings
      .filter((item) => item["リーグ"] === row["リーグ"] && item["球団"] !== row["球団"])
      .map((item) => ({
        team: item["球団"],
        remaining: standingsInt(row, `残り${item["球団"]}`),
        record: String(row[`試合実績${item["球団"]}`] || "-").trim() || "-",
      }))
      .sort((a, b) => b.remaining - a.remaining || a.team.localeCompare(b.team, "ja"));
  }

  function standingsPageUrl(team = "all") {
    return scopedPageUrl("standings", team);
  }

  function standingsRaceOptions(league = "all") {
    const leagues = league === "all" ? ["セ", "パ"] : [league];
    return leagues.flatMap((leagueKey) => {
      const rows = standingsRows(leagueKey);
      const leader = rows[0];
      const option = (label, first, second, priority) => first && second ? {
        label,
        league: leagueKey,
        first,
        second,
        priority,
        gap: Math.abs(standingsGamesBehind(leader, second) - standingsGamesBehind(leader, first)),
      } : null;
      return [
        option("首位争い", rows[0], rows[1], 1),
        option("CS争い", rows[2], rows[3], 2),
      ].filter(Boolean);
    });
  }

  function standingsRaceForSelection(league, team) {
    const selected = team === "all" ? null : loadedStandings.find((row) => row["球団"] === team);
    if (selected) {
      const selectedLeague = D.leagueOfTeam(selected["球団"]);
      const rank = standingsInt(selected, "順位");
      const priority = rank <= 2 ? 1 : 2;
      return standingsRaceOptions(selectedLeague).find((item) => item.priority === priority) || null;
    }
    return standingsRaceOptions(league).sort((a, b) => a.gap - b.gap || a.priority - b.priority)[0] || null;
  }

  function buildStandingsTweet(theme, league, team) {
    const date = standingsDateLabel();
    const datePrefix = date ? `${date}時点` : "最新";
    const row = selectedStandingsRow(league, team);
    if (!row) {
      return {
        title: "順位データを確認できません",
        lines: ["順位CSVの読込状況を確認してください。"],
        footerText: "2026年プロ野球 順位・残り試合",
        url: standingsPageUrl(),
        imageData: null,
      };
    }

    if (theme === "standings-today") {
      if (team !== "all") {
        const leagueRows = standingsRows(D.leagueOfTeam(row["球団"]));
        const leader = leagueRows[0];
        const gap = standingsGapText(standingsGamesBehind(leader, row));
        return {
          title: `${datePrefix} ${row["球団"]}の順位`,
          lines: [
            `${standingsInt(row, "順位")}位 ${standingsInt(row, "勝利")}勝${standingsInt(row, "敗戦")}敗${standingsInt(row, "分け")}分 / 勝率${standingsPctText(standingsWinPct(row))}`,
            `${leader["球団"]}と${gap}G差 / 残り${standingsInt(row, "残り試合")}試合`,
          ],
          footerText: "順位と残りカードの詳細はこちら",
          url: standingsPageUrl(row["球団"]),
          imageData: {
            kind: "standings",
            theme,
            title: `${row["球団"]}の現在地`,
            updated: `${datePrefix} / ${standingsLeagueLabel(row)}`,
            headlineLabel: `${standingsInt(row, "順位")}位・${standingsInt(row, "勝利")}勝${standingsInt(row, "敗戦")}敗`,
            headlineValue: `${gap}G差`,
            headlineDetail: `首位 ${leader["球団"]} / 残り${standingsInt(row, "残り試合")}試合`,
            cards: [
              { label: "勝率", value: standingsPctText(standingsWinPct(row)), detail: `${standingsInt(row, "分け")}分` },
              { label: "首位", value: leader["球団"], detail: `${standingsInt(leader, "勝利")}勝${standingsInt(leader, "敗戦")}敗` },
              { label: "残り", value: `${standingsInt(row, "残り試合")}試合`, detail: "対戦別も確認" },
            ],
          },
        };
      }

      if (league === "all") {
        const central = standingsRows("セ");
        const pacific = standingsRows("パ");
        const centralGap = standingsGapText(standingsGamesBehind(central[0], central[1]));
        const pacificGap = standingsGapText(standingsGamesBehind(pacific[0], pacific[1]));
        return {
          title: `${datePrefix} セ・パ首位`,
          lines: [
            `セ首位 ${central[0]["球団"]} ${standingsInt(central[0], "勝利")}勝${standingsInt(central[0], "敗戦")}敗 / 2位と${centralGap}G差`,
            `パ首位 ${pacific[0]["球団"]} ${standingsInt(pacific[0], "勝利")}勝${standingsInt(pacific[0], "敗戦")}敗 / 2位と${pacificGap}G差`,
          ],
          footerText: "12球団の順位と残り試合はこちら",
          url: standingsPageUrl(),
          imageData: {
            kind: "standings",
            theme,
            title: "セ・パ 今日の首位",
            updated: datePrefix,
            headlineLabel: "セ・リーグ首位",
            headlineValue: central[0]["球団"],
            headlineDetail: `2位 ${central[1]["球団"]}と${centralGap}G差`,
            cards: [
              { label: "セ 2位", value: central[1]["球団"], detail: `${standingsInt(central[1], "勝利")}勝${standingsInt(central[1], "敗戦")}敗` },
              { label: "パ 首位", value: pacific[0]["球団"], detail: `${standingsInt(pacific[0], "勝利")}勝${standingsInt(pacific[0], "敗戦")}敗` },
              { label: "パ 2位との差", value: `${pacificGap}G`, detail: pacific[1]["球団"] },
            ],
          },
        };
      }

      const rows = standingsRows(league);
      const leader = rows[0];
      const lines = rows.slice(0, 3).map((item, index) => `${index + 1}. ${item["球団"]} ${standingsInt(item, "勝利")}勝${standingsInt(item, "敗戦")}敗${standingsInt(item, "分け")}分 / ${index ? `${standingsGapText(standingsGamesBehind(leader, item))}G差` : "首位"}`);
      return {
        title: `${datePrefix} ${STANDINGS_LEAGUE_LABELS[league]}順位`,
        lines,
        footerText: "6球団の順位と残り試合はこちら",
        url: standingsPageUrl(leader["球団"]),
        imageData: {
          kind: "standings",
          theme,
          title: `${STANDINGS_LEAGUE_LABELS[league]}順位`,
          updated: datePrefix,
          headlineLabel: "首位",
          headlineValue: leader["球団"],
          headlineDetail: `${standingsInt(leader, "勝利")}勝${standingsInt(leader, "敗戦")}敗 / 勝率${standingsPctText(standingsWinPct(leader))}`,
          cards: rows.slice(0, 3).map((item) => ({
            label: `${standingsInt(item, "順位")}位`,
            value: item["球団"],
            detail: `${standingsInt(item, "勝利")}勝${standingsInt(item, "敗戦")}敗`,
          })),
        },
      };
    }

    if (theme === "standings-race") {
      const race = standingsRaceForSelection(league, team);
      if (!race) return buildStandingsTweet("standings-today", league, team);
      const direct = standingsInt(race.first, `残り${race.second["球団"]}`);
      const gap = standingsGapText(race.gap);
      return {
        title: `${datePrefix} ${STANDINGS_LEAGUE_LABELS[race.league]}${race.label}`,
        lines: [
          `${race.first["球団"]} ${standingsInt(race.first, "勝利")}勝${standingsInt(race.first, "敗戦")}敗${standingsInt(race.first, "分け")}分`,
          `${race.second["球団"]} ${standingsInt(race.second, "勝利")}勝${standingsInt(race.second, "敗戦")}敗${standingsInt(race.second, "分け")}分`,
          `${gap}G差 / 直接対決は残り${direct}試合`,
        ],
        footerText: "順位の続きと残りカードはこちら",
        url: standingsPageUrl(team !== "all" ? team : race.first["球団"]),
        imageData: {
          kind: "standings",
          theme,
          title: `${STANDINGS_LEAGUE_LABELS[race.league]} ${race.label}`,
          updated: datePrefix,
          headlineLabel: `${race.first["球団"]} vs ${race.second["球団"]}`,
          headlineValue: `${gap}G差`,
          headlineDetail: `直接対決 残り${direct}試合`,
          cards: [race.first, race.second].map((item) => ({
            label: `${standingsInt(item, "順位")}位`,
            value: item["球団"],
            detail: `${standingsInt(item, "勝利")}勝${standingsInt(item, "敗戦")}敗${standingsInt(item, "分け")}分`,
          })),
        },
      };
    }

    if (theme === "standings-remaining") {
      const opponents = standingsOpponents(row).slice(0, 3);
      return {
        title: `${datePrefix} ${row["球団"]}の残り対戦`,
        lines: opponents.map((item) => `${item.team} 残り${item.remaining}試合（今季${item.record}）`).concat(`全体では残り${standingsInt(row, "残り試合")}試合`),
        footerText: "対球団別の残りカードはこちら",
        url: standingsPageUrl(row["球団"]),
        imageData: {
          kind: "standings",
          theme,
          title: `${row["球団"]}の残り対戦`,
          updated: `${datePrefix} / ${standingsLeagueLabel(row)}`,
          headlineLabel: "シーズン残り",
          headlineValue: `${standingsInt(row, "残り試合")}試合`,
          headlineDetail: `最多は${opponents[0]?.team || "-"}戦`,
          cards: opponents.map((item) => ({ label: item.team, value: `残り${item.remaining}`, detail: `今季 ${item.record}` })),
        },
      };
    }

    if (theme === "standings-goal") {
      const wins = standingsInt(row, "勝利");
      const remaining = standingsInt(row, "残り試合");
      const goals = [70, 75].map((target) => {
        const needed = Math.max(0, target - wins);
        return {
          target,
          needed,
          required: needed && remaining ? needed / remaining : 0,
          reached: needed === 0,
        };
      });
      return {
        title: `${datePrefix} ${row["球団"]}の目標勝利数`,
        lines: goals.map((goal) => goal.reached ? `${goal.target}勝：到達済み` : `${goal.target}勝まであと${goal.needed}勝 / 必要勝率${standingsPctText(goal.required)}`),
        footerText: "目標勝利数と残り試合はこちら",
        url: standingsPageUrl(row["球団"]),
        imageData: {
          kind: "standings",
          theme,
          title: `${row["球団"]}の目標勝利数`,
          updated: datePrefix,
          headlineLabel: "現在",
          headlineValue: `${wins}勝`,
          headlineDetail: `残り${remaining}試合 / ${standingsInt(row, "順位")}位`,
          cards: goals.map((goal) => ({
            label: `${goal.target}勝まで`,
            value: goal.reached ? "到達済み" : `あと${goal.needed}勝`,
            detail: goal.reached ? `現在${wins}勝` : `必要勝率 ${standingsPctText(goal.required)}`,
          })),
        },
      };
    }

    const wins = standingsInt(row, "勝利");
    const remaining = standingsInt(row, "残り試合");
    const paces = [0.500, 0.550, 0.600].map((rate) => ({ rate, projected: wins + Math.round(remaining * rate) }));
    return {
      title: `${datePrefix} ${row["球団"]}の最終勝利数目安`,
      lines: paces.map((pace) => `残り勝率${standingsPctText(pace.rate)} → 最終${pace.projected}勝ペース`),
      footerText: "残り勝率別のシミュレーションはこちら",
      url: standingsPageUrl(row["球団"]),
      imageData: {
        kind: "standings",
        theme,
        title: `${row["球団"]} 最終勝利数目安`,
        updated: datePrefix,
        headlineLabel: `現在 ${wins}勝`,
        headlineValue: `残り${remaining}試合`,
        headlineDetail: "残り勝率ごとの最終勝利数",
        cards: paces.map((pace) => ({ label: `残り勝率 ${standingsPctText(pace.rate)}`, value: `${pace.projected}勝`, detail: "最終勝利数の目安" })),
      },
    };
  }

  function rowsForRanking(type, rankingId, league, limit = 5, team = "all") {
    const ranking = D.RANKINGS.find((item) => item.id === rankingId);
    const rows = type === "pitcher" ? loadedData.pitchers : loadedData.batters;
    return rows
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => D.toNumber(row[ranking.minKey]) >= ranking.minValue)
      .filter((row) => !ranking.filter || ranking.filter(row))
      .sort((a, b) => D.toNumber(b[ranking.scoreKey]) - D.toNumber(a[ranking.scoreKey]))
      .slice(0, limit);
  }

  function rowType(row) {
    return row["ポジション"] === "投手" ? "pitcher" : "batter";
  }

  function seasonRow(row, type = rowType(row)) {
    return type === "pitcher" ? pitcherMap.get(D.playerKey(row)) : batterMap.get(D.playerKey(row));
  }

  function scoreKey(type) {
    return type === "pitcher" ? "投手総合スコア" : "打者総合スコア";
  }

  function rowsForRecent(type, league, limit = 5, team = "all") {
    const rows = type === "pitcher" ? loadedInsight.recentPitchers : loadedInsight.recentBatters;
    return rows
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => type === "pitcher" ? D.isRecentPitcherEligible(row) : D.toInt(row["打席"]) >= D.DATA_QUESTION_MINIMUMS.recentBatterPa)
      .sort((a, b) => D.toNumber(b["直近スコア"]) - D.toNumber(a["直近スコア"]))
      .slice(0, limit);
  }

  function rowsForRookies(type, league, limit = 5, team = "all") {
    return loadedInsight.rookies
      .filter((row) => rowType(row) === type)
      .filter((row) => inTweetScope(row, league, team))
      .map((row) => ({ row, season: seasonRow(row, type) }))
      .filter((item) => item.season)
      .sort((a, b) => D.toNumber(b.season[scoreKey(type)]) - D.toNumber(a.season[scoreKey(type)]))
      .slice(0, limit);
  }

  function rowsForFielding(league, limit = 5, team = "all") {
    return loadedFielding
      .filter((row) => inTweetScope(row, league, team))
      .sort((a, b) => D.toNumber(b["守備評価"]) - D.toNumber(a["守備評価"]) || D.toNumber(b["守備機会"]) - D.toNumber(a["守備機会"]))
      .slice(0, limit);
  }

  function rowsForInterleague(type, league, limit = 5, team = "all") {
    const rows = type === "pitcher" ? loadedInterleague.pitchers : loadedInterleague.batters;
    return rows
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => type === "pitcher" ? D.toNumber(row["投球アウト数"]) >= 6 : D.toNumber(row["打数"]) >= 8)
      .sort((a, b) => D.toNumber(b["交流戦スコア"]) - D.toNumber(a["交流戦スコア"]))
      .slice(0, limit);
  }

  function rowsForCaughtStealing(league, limit = 5, team = "all") {
    return loadedFielding
      .filter((row) => row["ポジション"] === "捕手" && row["盗塁阻止率"] !== "")
      .filter((row) => inTweetScope(row, league, team))
      .sort((a, b) => D.toNumber(b["盗塁阻止率"]) - D.toNumber(a["盗塁阻止率"]) || D.toNumber(b["試合"]) - D.toNumber(a["試合"]))
      .slice(0, limit);
  }

  function playerNameKey(value) {
    return String(value ?? "").normalize("NFKC").replace(/[\s\u3000]/g, "");
  }

  function shortDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || "-";
    return `${Number(match[2])}/${Number(match[3])}`;
  }

  function rowsForBatterStreak(kind, league, limit = 5, team = "all") {
    const grouped = new Map();
    loadedBatterGames.forEach((row) => {
      if (!positionPlayerNames.has(playerNameKey(row["選手名"]))) return;
      const key = playerNameKey(row["選手名"]);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    const currentKey = kind === "onbase" ? "currentOnBaseGames" : "currentHitGames";
    const longestKey = kind === "onbase" ? "longestOnBaseGames" : "longestHitGames";

    return [...grouped.values()]
      .map((items) => {
        const sorted = [...items].sort((a, b) =>
          String(a["試合日"]).localeCompare(String(b["試合日"])) || String(a["試合ID"]).localeCompare(String(b["試合ID"]))
        );
        const latest = [...sorted].reverse().find((row) => D.toNumber(row["打席"]) > 0) || sorted.at(-1);
        const summary = D.batterStreakSummary(items, batterReferenceDate);
        return {
          選手名: latest?.["選手名"] || items[0]["選手名"],
          チーム: latest?.["球団"] || items[0]["球団"],
          リーグ: D.leagueOfTeam(latest?.["球団"] || items[0]["球団"]),
          ...summary,
        };
      })
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => D.toInt(row[currentKey]) > 0)
      .sort((a, b) =>
        D.toInt(b[currentKey]) - D.toInt(a[currentKey])
        || D.toInt(b[longestKey]) - D.toInt(a[longestKey])
        || String(b.latestDate || "").localeCompare(String(a.latestDate || ""))
      )
      .slice(0, limit);
  }

  function rowsForPitcherScoreless(league, limit = 5, team = "all") {
    const grouped = new Map();
    loadedPitcherDaily.forEach((row) => {
      const key = playerNameKey(row["選手名"] || row["投手フルネーム"]);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    return [...grouped.values()]
      .map((items) => {
        const sorted = [...items].sort((a, b) =>
          String(a["試合日"]).localeCompare(String(b["試合日"])) || String(a["試合ID"]).localeCompare(String(b["試合ID"]))
        );
        const latest = sorted.at(-1);
        const streak = D.currentScorelessStreak(items, pitcherReferenceDate);
        return {
          選手名: latest?.["選手名"] || latest?.["投手フルネーム"] || items[0]["選手名"] || items[0]["投手フルネーム"],
          チーム: latest?.["球団"] || items[0]["球団"],
          リーグ: D.leagueOfTeam(latest?.["球団"] || items[0]["球団"]),
          scorelessGames: streak.games,
          scorelessStartDate: streak.startDate,
          latestDate: streak.latestDate,
        };
      })
      .filter((row) => inTweetScope(row, league, team))
      .filter((row) => D.toInt(row.scorelessGames) > 0)
      .sort((a, b) =>
        D.toInt(b.scorelessGames) - D.toInt(a.scorelessGames)
        || String(b.latestDate || "").localeCompare(String(a.latestDate || ""))
      )
      .slice(0, limit);
  }

  function renderSummary() {
    const qualifiedBatters = loadedData.batters.filter((row) => row["規定打席到達"] === "到達").length;
    const qualifiedPitchers = loadedData.pitchers.filter((row) => row["規定投球回到達"] === "到達").length;
    const latest = fileReports.map((report) => report.dataDate).filter(Boolean).sort().at(-1) || "-";
    const items = [
      ["打者", loadedData.batters.length],
      ["投手", loadedData.pitchers.length],
      ["規定到達", qualifiedBatters + qualifiedPitchers],
      ["守備記録", loadedFielding.length],
      ["順位データ", loadedStandings.length],
      ["交流戦対象", rowsForInterleague("batter", "all", 999).length + rowsForInterleague("pitcher", "all", 999).length],
      ["最新更新日", latest],
    ];
    els.summary.innerHTML = items.map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(value)}</strong></article>`).join("");
  }

  function renderUpdateRows() {
    els.updateRows.innerHTML = fileReports.map((report) => `
      <tr>
        <td>${D.escapeHtml(report.label)}</td>
        <td>${report.ok ? report.rowCount.toLocaleString("ja-JP") : "読込失敗"}</td>
        <td>${D.escapeHtml(report.dataDate || "-")}</td>
        <td>${D.escapeHtml(formatDate(report.servedAt))}</td>
      </tr>
    `).join("");
  }

  function renderTweetTeams() {
    const league = els.tweetLeague.value;
    const current = els.tweetTeam.value;
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => league === "all" || D.leagueOfTeam(team) === league);
    els.tweetTeam.innerHTML = `<option value="all">全チーム</option>${teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`).join("")}`;
    els.tweetTeam.value = teams.includes(current) ? current : "all";
  }

  function buildTweet() {
    const league = els.tweetLeague.value;
    const team = els.tweetTeam.value;
    const scopeText = team !== "all" ? team : league === "all" ? "全体" : `${league}・リーグ`;
    const theme = els.tweetTheme.value;
    const map = {
      batter: ["batter", "batter-overall", "打者総合トップ5", "打者総合スコア"],
      pitcher: ["pitcher", "pitcher-overall", "投手総合トップ5", "投手総合スコア"],
      "qualified-batter": ["batter", "batter-qualified", "規定打席到達トップ5", "打者総合スコア"],
      "qualified-pitcher": ["pitcher", "pitcher-qualified", "規定投球回到達トップ5", "投手総合スコア"],
      young: ["batter", "batter-young", "若手打者トップ5", "若手スコア"],
    };

    let title;
    let lines;
    let url = SITE_URL;
    let footerText = "プロ野球2026データランキング";
    let header = `【Player Lens】${scopeText}`;
    currentXImageData = null;

    if (STANDINGS_THEMES.has(theme)) {
      const standingsPost = buildStandingsTweet(theme, league, team);
      title = standingsPost.title;
      lines = standingsPost.lines;
      url = standingsPost.url;
      footerText = standingsPost.footerText;
      currentXImageData = standingsPost.imageData;
      header = "【Player Lens】";
    } else if (theme === "batter-hit-streak" || theme === "batter-onbase-streak") {
      const kind = theme === "batter-onbase-streak" ? "onbase" : "hit";
      const currentKey = kind === "onbase" ? "currentOnBaseGames" : "currentHitGames";
      const startKey = kind === "onbase" ? "currentOnBaseStartDate" : "currentHitStartDate";
      const longestKey = kind === "onbase" ? "longestOnBaseGames" : "longestHitGames";
      title = kind === "onbase" ? "現在の連続出塁トップ5" : "現在の連続安打トップ5";
      lines = rowsForBatterStreak(kind, league, 5, team).map((row, index) =>
        `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${row[currentKey]}試合連続 / ${shortDate(row[startKey])}〜 / 今季最長${row[longestKey]}試合`
      );
      url = scopedPageUrl("batter-streaks.html", team);
      footerText = "2026年プロ野球 野手の連続記録";
    } else if (theme === "pitcher-scoreless-streak") {
      title = "投手 無失点継続トップ5";
      lines = rowsForPitcherScoreless(league, 5, team).map((row, index) =>
        `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${row.scorelessGames}試合連続無失点 / ${shortDate(row.scorelessStartDate)}〜`
      );
      url = scopedPageUrl("pitcher-usage.html", team);
      footerText = "2026年プロ野球 投手の無失点継続";
    } else if (theme === "recent-batter" || theme === "recent-pitcher") {
      const type = theme === "recent-pitcher" ? "pitcher" : "batter";
      title = type === "pitcher" ? "直近6試合 投手トップ5" : "直近6試合 野手トップ5";
      lines = rowsForRecent(type, league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(row["直近スコア"], "スコア")}`);
      url = scopedPageUrl("insights.html", team);
    } else if (theme === "interleague-batter" || theme === "interleague-pitcher") {
      const type = theme === "interleague-pitcher" ? "pitcher" : "batter";
      title = type === "pitcher" ? "交流戦 投手トップ5" : "交流戦 野手トップ5";
      lines = rowsForInterleague(type, league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(row["交流戦スコア"], "スコア")}`);
      url = scopedPageUrl("interleague.html", team);
    } else if (theme === "rookie-batter" || theme === "rookie-pitcher") {
      const type = theme === "rookie-pitcher" ? "pitcher" : "batter";
      title = type === "pitcher" ? "新人王候補 投手トップ5" : "新人王候補 野手トップ5";
      lines = rowsForRookies(type, league, 5, team).map(({ row, season }, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(season[scoreKey(type)], "スコア")}`);
      url = scopedPageUrl("insights.html", team);
    } else if (theme === "fielding") {
      title = "守備評価トップ5";
      lines = rowsForFielding(league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}/${row["ポジション"]}）${D.formatValue(row["守備評価"], "スコア")}`);
      url = scopedPageUrl("defense.html", team);
    } else if (theme === "catcher-caught") {
      title = "捕手盗塁阻止トップ5";
      lines = rowsForCaughtStealing(league, 5, team).map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${D.formatValue(row["盗塁阻止率"], "盗塁阻止率")} / ${row["試合"]}試合`);
      url = scopedPageUrl("defense.html", team);
    } else {
      const [type, rankingId, rankingTitle, rankingScoreKey] = map[theme];
      title = rankingTitle;
      const rows = rowsForRanking(type, rankingId, league, 5, team);
      lines = rows.map((row, index) => `${index + 1}. ${row["選手名"]}（${row["チーム"]}）${D.formatValue(row[rankingScoreKey], "スコア")}`);
      if (team !== "all") url = teamPageUrl(team);
    }

    url = trackedPostUrl(url, theme);

    els.tweetOutput.value = [
      `${header} ${title}`,
      ...lines,
      "",
      footerText,
      url,
    ].join("\n");
  }

  async function copyTweet() {
    await navigator.clipboard.writeText(els.tweetOutput.value);
    els.copyMessage.textContent = "コピーしました。";
  }

  function renderChecks() {
    const checks = [];
    const teams = new Set([...loadedData.batters, ...loadedData.pitchers].map((row) => row["チーム"]));
    const noLeague = [...loadedData.batters, ...loadedData.pitchers].filter((row) => !row["リーグ"]).length;
    const missingAge = [...loadedData.batters, ...loadedData.pitchers].filter((row) => row["年齢"] === "").length;
    const failedFiles = fileReports.filter((report) => !report.ok).length;
    const batterQualified = rowsForRanking("batter", "batter-qualified", "all", 999).length;
    const pitcherQualified = rowsForRanking("pitcher", "pitcher-qualified", "all", 999).length;
    const splitRows = loadedData.batters.filter((row) => row["対右打率"] || row["対左打率"]).length + loadedData.pitchers.filter((row) => row["対右被打率"] || row["対左被打率"]).length;
    const fieldingRows = loadedFielding.length;
    const interleagueRows = loadedInterleague.batters.length + loadedInterleague.pitchers.length;
    const standingsReady = loadedStandings.length === 12 && new Set(loadedStandings.map((row) => row["球団"])).size === 12;

    checks.push(["ファイル読込", failedFiles === 0, failedFiles === 0 ? "全ファイルを読み込めています。" : `${failedFiles}件の読込に失敗しています。`]);
    checks.push(["球団数", teams.size === 12, `${teams.size}球団を認識しています。`]);
    checks.push(["リーグ判定", noLeague === 0, noLeague === 0 ? "全選手にリーグが付いています。" : `${noLeague}件のリーグ未判定があります。`]);
    checks.push(["年齢結合", missingAge === 0, missingAge === 0 ? "選手マスターとの結合に問題はありません。" : `${missingAge}件の年齢未取得があります。`]);
    checks.push(["規定到達", batterQualified > 0 && pitcherQualified > 0, `規定打席 ${batterQualified}人 / 規定投球回 ${pitcherQualified}人`]);
    checks.push(["左右成績", splitRows > 0, `${splitRows}件に左右別データがあります。`]);
    checks.push(["守備成績", fieldingRows > 0, `${fieldingRows}件の守備記録があります。`]);
    checks.push(["交流戦成績", interleagueRows > 0, `${interleagueRows}件の交流戦記録があります。`]);
    checks.push(["順位データ", standingsReady, standingsReady ? "12球団の順位・残り試合を読み込めています。" : `${loadedStandings.length}球団の順位データを認識しています。`]);

    els.checkList.innerHTML = checks.map(([title, ok, message]) => `
      <div class="check-item ${ok ? "is-ok" : "is-warn"}">
        <strong>${D.escapeHtml(title)}</strong>
        <span>${D.escapeHtml(message)}</span>
      </div>
    `).join("");
  }

  async function renderMonetizationChecks() {
    els.monetizationChecks.innerHTML = `<div class="check-item"><strong>確認中</strong><span>主要ページを確認しています。</span></div>`;
    const pageResults = await Promise.all(SITE_CHECK_PAGES.map(async ([label, path, canonical]) => {
      const result = await fetchText(path);
      return {
        label,
        path,
        canonical,
        ...result,
        hasCanonical: result.text.includes(`<link rel="canonical" href="${canonical}">`),
        hasStructuredData: result.text.includes('application/ld+json'),
      };
    }));
    const privacy = pageResults.find((page) => page.path === "./privacy.html");
    const sitemap = await fetchText("./sitemap.xml");
    const adminPage = await fetchText("./admin.html");
    const sitemapLocs = [...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    const sitemapSet = new Set(sitemapLocs);
    const duplicatedLocs = sitemapLocs.filter((loc, index) => sitemapLocs.indexOf(loc) !== index);
    const missingCanonical = pageResults.filter((page) => !page.hasCanonical);
    const missingStructured = pageResults.filter((page) => !page.hasStructuredData);
    const missingSitemap = pageResults
      .map((page) => page.canonical)
      .filter((canonical) => !sitemapSet.has(canonical));
    const privacyReady = privacy?.text.includes("Google") && privacy.text.includes("Cookie") && privacy.text.includes("広告設定");
    const checks = [
      ["プライバシーポリシー", privacyReady, privacyReady ? "Google広告Cookieと広告設定への案内があります。" : "Google広告Cookieと広告設定の記載を確認してください。"],
      ["canonical", missingCanonical.length === 0, missingCanonical.length === 0 ? "主要ページにcanonicalがあります。" : `${missingCanonical.map((page) => page.label).join("、")}を確認してください。`],
      ["構造化データ", missingStructured.length === 0, missingStructured.length === 0 ? "主要ページに構造化データがあります。" : `${missingStructured.map((page) => page.label).join("、")}を確認してください。`],
      ["sitemap", sitemap.ok && missingSitemap.length === 0 && duplicatedLocs.length === 0, sitemap.ok && missingSitemap.length === 0 && duplicatedLocs.length === 0 ? "主要ページがsitemapに入り、重複はありません。" : "sitemapのURLまたは重複を確認してください。"],
      ["管理者ページ", adminPage.text.includes('name="robots" content="noindex,nofollow"'), adminPage.text.includes('name="robots" content="noindex,nofollow"') ? "管理者ページはnoindexです。" : "管理者ページのnoindexを確認してください。"],
    ];

    els.monetizationChecks.innerHTML = checks.map(([title, ok, message]) => `
      <div class="check-item ${ok ? "is-ok" : "is-warn"}">
        <strong>${D.escapeHtml(title)}</strong>
        <span>${D.escapeHtml(message)}</span>
      </div>
    `).join("");
  }

  function renderCandidates() {
    const standingsCandidates = [];
    const raceOptions = standingsRaceOptions("all");
    raceOptions
      .filter((item) => item.priority === 1 && item.gap <= 1)
      .forEach((item) => {
        const direct = standingsInt(item.first, `残り${item.second["球団"]}`);
        standingsCandidates.push(`<article class="candidate-card" data-candidate-theme="standings-race" data-candidate-league="${item.league}" data-candidate-team="${D.escapeHtml(item.first["球団"])}"><span>首位争い（${item.league}）</span><strong>${D.escapeHtml(item.first["球団"])}と${D.escapeHtml(item.second["球団"])} ${standingsGapText(item.gap)}G差</strong><small>直接対決 残り${direct}試合</small></article>`);
      });
    raceOptions
      .filter((item) => item.priority === 2 && item.gap <= 2)
      .forEach((item) => {
        standingsCandidates.push(`<article class="candidate-card" data-candidate-theme="standings-race" data-candidate-league="${item.league}" data-candidate-team="${D.escapeHtml(item.first["球団"])}"><span>CS争い（${item.league}）</span><strong>${D.escapeHtml(item.first["球団"])}と${D.escapeHtml(item.second["球団"])} ${standingsGapText(item.gap)}G差</strong><small>3位と4位の差を投稿</small></article>`);
      });

    const remainingCandidate = loadedStandings
      .flatMap((standingRow) => standingsOpponents(standingRow).map((opponent) => ({ standingRow, opponent })))
      .sort((a, b) => b.opponent.remaining - a.opponent.remaining)[0];
    if (remainingCandidate?.opponent.remaining >= 10) {
      const candidateTeam = remainingCandidate.standingRow["球団"];
      const candidateLeague = D.leagueOfTeam(candidateTeam);
      standingsCandidates.push(`<article class="candidate-card" data-candidate-theme="standings-remaining" data-candidate-league="${candidateLeague}" data-candidate-team="${D.escapeHtml(candidateTeam)}"><span>残り対戦</span><strong>${D.escapeHtml(candidateTeam)}－${D.escapeHtml(remainingCandidate.opponent.team)} 残り${remainingCandidate.opponent.remaining}試合</strong><small>今季 ${D.escapeHtml(remainingCandidate.opponent.record)}</small></article>`);
    }

    const goalCandidate = standingsRows("セ")[0] || loadedStandings[0];
    if (goalCandidate) {
      const wins = standingsInt(goalCandidate, "勝利");
      const remaining = standingsInt(goalCandidate, "残り試合");
      const needed = Math.max(0, 70 - wins);
      standingsCandidates.push(`<article class="candidate-card" data-candidate-theme="standings-goal" data-candidate-league="${D.leagueOfTeam(goalCandidate["球団"])}" data-candidate-team="${D.escapeHtml(goalCandidate["球団"])}"><span>目標勝利数</span><strong>${D.escapeHtml(goalCandidate["球団"])} 70勝まであと${needed}勝</strong><small>残り${remaining}試合 / 必要勝率${standingsPctText(remaining ? needed / remaining : 0)}</small></article>`);
    }

    const candidates = [
      ["打者総合", "batter", "batter-overall", "打者総合スコア"],
      ["投手総合", "pitcher", "pitcher-overall", "投手総合スコア"],
      ["規定打席", "batter", "batter-qualified", "打者総合スコア"],
      ["規定投球回", "pitcher", "pitcher-qualified", "投手総合スコア"],
      ["若手打者", "batter", "batter-young", "若手スコア"],
    ].map(([label, type, rankingId, scoreKey]) => {
      const row = rowsForRanking(type, rankingId, "all", 1)[0];
      if (!row) return "";
      return `<article class="candidate-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(row["選手名"])}</strong><small>${D.escapeHtml(row["チーム"])} / ${D.formatValue(row[scoreKey], "スコア")}</small></article>`;
    }).filter(Boolean);
    const extraCandidates = [
      ["直近野手", rowsForRecent("batter", "all", 1)[0], "直近スコア"],
      ["直近投手", rowsForRecent("pitcher", "all", 1)[0], "直近スコア"],
      ["新人王候補野手", rowsForRookies("batter", "all", 1)[0], "打者総合スコア"],
      ["新人王候補投手", rowsForRookies("pitcher", "all", 1)[0], "投手総合スコア"],
      ["交流戦野手", rowsForInterleague("batter", "all", 1)[0], "交流戦スコア"],
      ["交流戦投手", rowsForInterleague("pitcher", "all", 1)[0], "交流戦スコア"],
      ["守備評価", rowsForFielding("all", 1)[0], "守備評価"],
    ].map(([label, item, key]) => {
      if (!item) return "";
      const row = item.row || item;
      const scoreSource = item.season || item;
      return `<article class="candidate-card"><span>${D.escapeHtml(label)}</span><strong>${D.escapeHtml(row["選手名"])}</strong><small>${D.escapeHtml(row["チーム"])} / ${D.formatValue(scoreSource[key], "スコア")}</small></article>`;
    }).filter(Boolean);
    const hit = rowsForBatterStreak("hit", "all", 1)[0];
    const onBase = rowsForBatterStreak("onbase", "all", 1)[0];
    const scoreless = rowsForPitcherScoreless("all", 1)[0];
    const streakCandidates = [
      hit ? `<article class="candidate-card"><span>連続安打</span><strong>${D.escapeHtml(hit["選手名"])}</strong><small>${D.escapeHtml(hit["チーム"])} / ${hit.currentHitGames}試合連続 / ${D.escapeHtml(shortDate(hit.currentHitStartDate))}〜</small></article>` : "",
      onBase ? `<article class="candidate-card"><span>連続出塁</span><strong>${D.escapeHtml(onBase["選手名"])}</strong><small>${D.escapeHtml(onBase["チーム"])} / ${onBase.currentOnBaseGames}試合連続 / ${D.escapeHtml(shortDate(onBase.currentOnBaseStartDate))}〜</small></article>` : "",
      scoreless ? `<article class="candidate-card"><span>投手無失点</span><strong>${D.escapeHtml(scoreless["選手名"])}</strong><small>${D.escapeHtml(scoreless["チーム"])} / ${scoreless.scorelessGames}試合連続無失点 / ${D.escapeHtml(shortDate(scoreless.scorelessStartDate))}〜</small></article>` : "",
    ].filter(Boolean);
    els.postCandidates.innerHTML = standingsCandidates.concat(streakCandidates, candidates, extraCandidates).join("");
  }

  async function loadAdmin() {
    els.updateRows.innerHTML = `<tr><td colspan="4">読込中</td></tr>`;
    [loadedData, loadedInsight, loadedFielding, loadedInterleague, loadedBatterGames, loadedPitcherDaily, loadedStandings, fileReports] = await Promise.all([
      D.loadData(),
      D.loadInsightData(),
      D.loadFieldingData(),
      D.loadInterleagueData(),
      D.loadBatterGameData(),
      D.loadPitcherDailyData(),
      D.loadStandingsData(),
      Promise.all(FILES.map(fetchReport)),
    ]);
    batterMap = new Map(loadedData.batters.map((row) => [D.playerKey(row), row]));
    pitcherMap = new Map(loadedData.pitchers.map((row) => [D.playerKey(row), row]));
    positionPlayerNames = new Set(
      loadedData.batters
        .filter((row) => row["ポジション"] !== "投手")
        .map((row) => playerNameKey(row["選手名"]))
    );
    batterReferenceDate = loadedBatterGames.map((row) => row["試合日"]).filter(Boolean).sort().at(-1) || "";
    pitcherReferenceDate = loadedPitcherDaily.map((row) => row["試合日"]).filter(Boolean).sort().at(-1) || "";
    renderTweetTeams();
    renderSummary();
    renderUpdateRows();
    renderChecks();
    await renderMonetizationChecks();
    renderCandidates();
    buildTweet();
  }

  async function login() {
    const hash = await sha256(els.password.value);
    if (hash !== PASSWORD_HASH) {
      els.loginMessage.textContent = "パスワードが違います。";
      return;
    }
    sessionStorage.setItem("playerLensAdmin", "1");
    els.loginPanel.hidden = true;
    els.adminPanel.hidden = false;
    await loadAdmin();
  }

  window.PlayerLensAdminXData = {
    getImageData: () => currentXImageData,
  };

  els.loginButton.addEventListener("click", login);
  els.password.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  els.reload.addEventListener("click", loadAdmin);
  els.buildTweet.addEventListener("click", buildTweet);
  els.copyTweet.addEventListener("click", copyTweet);
  els.tweetLeague.addEventListener("change", () => {
    renderTweetTeams();
    buildTweet();
  });
  els.tweetTeam.addEventListener("change", buildTweet);
  els.tweetTheme.addEventListener("change", buildTweet);

  if (sessionStorage.getItem("playerLensAdmin") === "1") {
    els.loginPanel.hidden = true;
    els.adminPanel.hidden = false;
    loadAdmin();
  }
})();
