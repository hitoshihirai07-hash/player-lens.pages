(async function () {
  const D = window.PlayerLensData;
  const els = {
    status: document.getElementById("questionStatus"),
    log: document.getElementById("questionLog"),
    form: document.getElementById("questionForm"),
    input: document.getElementById("questionInput"),
    submit: document.getElementById("questionSubmit"),
    examples: Array.from(document.querySelectorAll("[data-question-example]")),
  };

  const TEAM_ALIASES = D.TEAM_ALIASES;

  const METRICS = [
    { id: "kbb", label: "K-BB%", type: "pitcher", aliases: ["k-bb%", "kbb%", "奪三振率と与四球率の差"], season: true, recent: true, key: "K-BB%", direction: "desc" },
    { id: "kRate", label: "K%", type: "pitcher", aliases: ["k%", "奪三振割合", "奪三振率"], season: true, recent: true, key: "K%", direction: "desc" },
    { id: "bbRate", label: "BB%", type: "pitcher", aliases: ["bb%", "与四球割合", "与四球率"], season: true, recent: true, key: "BB%", direction: "asc" },
    { id: "k9", label: "K/9", type: "pitcher", aliases: ["k/9", "9回あたり奪三振"], season: true, recent: true, key: "K/9", direction: "desc" },
    { id: "bb9", label: "BB/9", type: "pitcher", aliases: ["bb/9", "9回あたり与四球"], season: true, recent: true, key: "BB/9", direction: "asc" },
    { id: "hr9", label: "HR/9", type: "pitcher", aliases: ["hr/9", "9回あたり被本塁打"], season: true, recent: true, key: "HR/9", direction: "asc" },
    { id: "gameScore", label: "平均Game Score", type: "pitcher", aliases: ["平均game score", "平均ゲームスコア", "game score", "ゲームスコア"], season: true, recent: true, key: "平均Game Score", direction: "desc", roles: ["starter"] },
    { id: "whip", label: "WHIP", type: "pitcher", aliases: ["whip"], season: true, recent: true, key: "WHIP", direction: "asc" },
    { id: "stealRate", label: "盗塁成功率", type: "batter", aliases: ["盗塁成功率", "盗塁率"], season: false, recent: true, key: "盗塁成功率", direction: "desc", recentMinKey: "盗塁企図", recentMinValue: 1, recentMinimumLabel: "盗塁企図1回以上" },
    { id: "caughtStealing", label: "盗塁死", type: "batter", aliases: ["盗塁死", "盗塁失敗"], season: false, recent: true, key: "盗塁死", direction: "desc", recentMinKey: "盗塁企図", recentMinValue: 1, recentMinimumLabel: "盗塁企図1回以上" },
    { id: "stealAttempts", label: "盗塁企図", type: "batter", aliases: ["盗塁企図", "盗塁を試みた", "盗塁試行"], season: false, recent: true, key: "盗塁企図", direction: "desc", recentMinKey: "盗塁企図", recentMinValue: 1, recentMinimumLabel: "盗塁企図1回以上" },
    { id: "steals", label: "盗塁", type: "batter", aliases: ["盗塁成功", "盗塁数", "盗塁", "スチール"], season: true, recent: true, key: "盗塁", direction: "desc", recentMinKey: "盗塁企図", recentMinValue: 1, recentMinimumLabel: "盗塁企図1回以上" },
    { id: "ops", label: "OPS", type: "batter", aliases: ["ops"], season: true, recent: true, key: "OPS", direction: "desc" },
    { id: "obp", label: "出塁率", type: "batter", aliases: ["出塁率"], season: true, recent: true, key: "出塁率", direction: "desc" },
    { id: "slg", label: "長打率", type: "batter", aliases: ["長打率"], season: true, recent: true, key: "長打率", direction: "desc" },
    { id: "era", label: "防御率", type: "pitcher", aliases: ["防御率", "era"], season: true, recent: true, key: "防御率", direction: "asc" },
    { id: "strikeouts", label: "奪三振", type: "pitcher", aliases: ["奪三振", "三振数", "三振"], season: true, recent: true, key: "奪三振", direction: "desc" },
    { id: "holds", label: "ホールド", type: "pitcher", aliases: ["ホールド", "hold", "hld"], season: true, recent: true, key: "ホールド", direction: "desc", roles: ["reliever"] },
    { id: "saves", label: "セーブ", type: "pitcher", aliases: ["セーブ", "save"], season: true, recent: true, key: "セーブ", direction: "desc", roles: ["reliever"] },
    { id: "homeRuns", label: "本塁打", type: "batter", aliases: ["本塁打", "ホームラン", "hr"], season: true, recent: true, key: "本塁打", direction: "desc" },
    { id: "rbi", label: "打点", type: "batter", aliases: ["打点", "rbi"], season: true, recent: true, key: "打点", direction: "desc" },
    { id: "average", label: "打率", type: "batter", aliases: ["打率"], season: true, recent: true, key: "打率", direction: "desc" },
    { id: "innings", label: "投球回", type: "pitcher", aliases: ["投球回", "イニング"], season: true, recent: true, key: "投球回", direction: "desc" },
    { id: "wins", label: "勝利", type: "pitcher", aliases: ["勝利", "勝ち星", "最多勝"], season: true, recent: true, key: "勝利", direction: "desc" },
    { id: "hits", label: "安打", type: "batter", aliases: ["安打", "ヒット"], season: true, recent: true, key: "安打", direction: "desc" },
  ];

  const UNSUPPORTED_TOPICS = [
    "明日", "今日の試合", "試合速報", "速報", "スタメン", "先発予想", "予想", "怪我", "けが", "故障", "離脱", "今後", "将来", "おすすめ", "感想",
  ];
  const RECENT_WORDS = ["直近6試合", "6試合", "直近6日", "直近", "最近", "好調", "6日"];
  const STARTER_WORDS = ["先発投手", "先発", "スターター"];
  const RELIEVER_WORDS = ["救援投手", "救援", "中継ぎ", "リリーフ", "抑え", "クローザー"];
  const LOW_WORDS = ["低い", "少ない", "少な", "低く"];
  const HIGH_WORDS = ["高い", "多い", "多く", "上位", "最多"];
  const state = {
    ready: false,
    season: null,
    insight: null,
    players: [],
    seasonBatters: [],
    seasonMaps: { batter: new Map(), pitcher: new Map() },
    recentMaps: { batter: new Map(), pitcher: new Map() },
  };

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\u3000・･?？!！。、，,.…「」『』()（）【】\[\]「」]/g, "");
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(normalizeText(word)));
  }

  function playerMapKey(row) {
    return `${normalizeText(row["選手名"])}|${row["チーム"]}`;
  }

  function fullTeamName(team) {
    return D.TEAM_TO_FULL[team] || team;
  }

  function detectTeam(text) {
    const matches = Object.entries(TEAM_ALIASES)
      .flatMap(([team, aliases]) => aliases.map((alias) => ({ team, alias: normalizeText(alias) })))
      .filter((item) => item.alias && text.includes(item.alias))
      .sort((a, b) => b.alias.length - a.alias.length);
    return matches[0]?.team || "";
  }

  function detectLeague(text) {
    if (includesAny(text, ["セ・リーグ", "セリーグ", "central league"])) return "セ";
    if (includesAny(text, ["パ・リーグ", "パリーグ", "pacific league"])) return "パ";
    return "";
  }

  function detectPeriod(text) {
    return includesAny(text, RECENT_WORDS) ? "recent" : "season";
  }

  function detectExplicitType(text) {
    const batter = includesAny(text, ["打者", "野手", "バッター"]);
    const pitcher = includesAny(text, ["投手", "ピッチャー"]);
    if (batter && pitcher) return "both";
    if (batter) return "batter";
    if (pitcher) return "pitcher";
    return "";
  }

  function detectRole(text) {
    const starter = includesAny(text, STARTER_WORDS);
    const reliever = includesAny(text, RELIEVER_WORDS);
    if (starter && reliever) return "both";
    if (starter) return "starter";
    if (reliever) return "reliever";
    return "";
  }

  function detectMetric(text, period, explicitType) {
    const matched = METRICS.find((metric) => includesAny(text, metric.aliases));
    if (matched) return matched;
    if (period === "recent" && text.includes(normalizeText("好調")) && ["batter", "pitcher"].includes(explicitType)) {
      return {
        id: "form",
        label: "直近評価",
        type: explicitType,
        season: false,
        recent: true,
        key: "直近スコア",
        direction: "desc",
      };
    }
    return null;
  }

  function sortDirection(metric, text) {
    if (includesAny(text, LOW_WORDS)) return "asc";
    if (includesAny(text, HIGH_WORDS)) return "desc";
    return metric.direction;
  }

  function unsupportedHtml(detail = "") {
    return `
      <section class="question-result is-unavailable">
        <h3>この質問には現在対応していません</h3>
        ${detail ? `<p>${D.escapeHtml(detail)}</p>` : ""}
        <p>球団名、選手名、打率、OPS、本塁打、盗塁、防御率、奪三振などを含めて質問してください。</p>
      </section>
    `;
  }

  function resolvePlayerMatches(text) {
    const detectedTeam = detectTeam(text);
    const exactAll = state.players.filter((entry) => text.includes(normalizeText(entry.row["選手名"])));
    const exact = detectedTeam && exactAll.some((entry) => entry.row["チーム"] === detectedTeam)
      ? exactAll.filter((entry) => entry.row["チーム"] === detectedTeam)
      : exactAll;
    if (exact.length) {
      const longest = Math.max(...exact.map((entry) => normalizeText(entry.row["選手名"]).length));
      return exact.filter((entry) => normalizeText(entry.row["選手名"]).length === longest);
    }

    const surnameMatches = state.players.filter((entry) => {
      const name = String(entry.row["選手名"] || "").normalize("NFKC").trim();
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length < 2) return false;
      const surname = normalizeText(parts[0]);
      return surname.length >= 2 && text.includes(surname);
    });
    return surnameMatches;
  }

  function candidateHtml(matches) {
    const unique = Array.from(new Map(matches.map((entry) => [`${entry.type}|${playerMapKey(entry.row)}`, entry])).values());
    return `
      <section class="question-result">
        <h3>該当する選手が複数います</h3>
        <p>選手を選ぶか、フルネームと球団名を含めて質問してください。</p>
        <ul class="question-candidate-list">
          ${unique.slice(0, 12).map((entry) => `
            <li>
              <a href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">${D.escapeHtml(entry.row["選手名"])}</a>
              <span>${D.escapeHtml(fullTeamName(entry.row["チーム"]))}・${entry.type === "pitcher" ? "投手" : "打者"}</span>
            </li>
          `).join("")}
        </ul>
      </section>
    `;
  }

  function recentRowFor(entry) {
    return state.recentMaps[entry.type].get(playerMapKey(entry.row));
  }

  function rowHasRecentActivity(row, type) {
    if (!row) return false;
    return type === "pitcher" ? D.toInt(row["投球アウト数"]) > 0 : D.toInt(row["打席"]) > 0;
  }

  function periodLabel(row) {
    const period = String(row?.["期間"] || "");
    return period ? period.replace("_", " 〜 ") : "";
  }

  function formatMetricValue(value, metric) {
    if (value === undefined || value === null || value === "") return "-";
    if (["average", "ops", "obp", "slg", "era", "stealRate"].includes(metric.id)) return D.formatValue(value, metric.key);
    if (["kbb", "kRate", "bbRate"].includes(metric.id)) return D.formatValue(value, metric.key);
    if (["whip", "k9", "bb9", "hr9", "gameScore"].includes(metric.id)) return D.toNumber(value).toFixed(2);
    if (metric.id === "form") return D.toNumber(value).toFixed(1);
    return String(value);
  }

  function profileMetricItems(row, type, period) {
    if (period === "recent" && type === "batter") {
      return [
        ...["打率", "OPS", "本塁打", "打点", "安打", "打席"].map((key) => [key, D.formatValue(row[key], key) || "-"]),
        ["盗塁成功", row["盗塁成功"] || "0"],
        ["盗塁死", row["盗塁死"] || "0"],
        ["盗塁企図", row["盗塁企図"] || "0"],
        ["盗塁成功率", row["盗塁成功率"] === "" ? "-" : D.formatValue(row["盗塁成功率"], "盗塁成功率")],
      ];
    }
    if (period === "recent" && type === "pitcher") {
      return [
        ["登板", row["登板"] || "0"],
        ["先発 / 救援", `${row["先発"] || 0} / ${row["救援"] || 0}`],
        ["投球回", row["投球回"] || D.inningsFromOuts(row["投球アウト数"])],
        ["防御率", D.formatValue(row["防御率"], "防御率") || "-"],
        ["WHIP", row["WHIP"] === "" ? "-" : formatMetricValue(row["WHIP"], { id: "whip" })],
        ["奪三振", row["奪三振"] || "0"],
        ["K%", D.formatValue(row["K%"], "K%") || "-"],
        ["K-BB%", D.formatValue(row["K-BB%"], "K-BB%") || "-"],
        ["K/9", row["K/9"] || "-"],
        ["BB/9", row["BB/9"] || "-"],
      ];
    }
    if (type === "batter") {
      return [...["打率", "OPS", "本塁打", "打点", "安打", "打席"].map((key) => [key, D.formatValue(row[key], key) || "-"]), ["盗塁", row["盗塁"] || "0"]];
    }
    return [
      ["登板", row["登板"] || "0"],
      ["先発 / 救援", `${row["先発"] || 0} / ${row["救援"] || 0}`],
      ["投球回", row["投球回"] || "0"],
      ["防御率", D.formatValue(row["防御率"], "防御率") || "-"],
      ["WHIP", row["WHIP"] === "" ? "-" : formatMetricValue(row["WHIP"], { id: "whip" })],
      ["勝敗", `${row["勝利"] || 0}勝${row["敗戦"] || 0}敗`],
      ["奪三振", row["奪三振"] || "0"],
      ["セーブ / ホールド", `${row["セーブ"] || 0} / ${row["ホールド"] || 0}`],
      ["K%", D.formatValue(row["K%"], "K%") || "-"],
      ["K-BB%", D.formatValue(row["K-BB%"], "K-BB%") || "-"],
      ["K/9", row["K/9"] || "-"],
      ["BB/9", row["BB/9"] || "-"],
      ["HR/9", row["HR/9"] || "-"],
    ];
  }

  function playerProfileHtml(entry, period, metric) {
    if (metric && metric.type !== entry.type) {
      return unsupportedHtml(`${entry.row["選手名"]}は${entry.type === "pitcher" ? "投手" : "打者"}データに登録されているため、${metric.label}では検索できません。`);
    }
    if (metric && !metric[period]) {
      return unsupportedHtml(`${metric.label}は${period === "recent" ? "直近6試合" : "シーズン"}データでは確認できません。`);
    }

    const row = period === "recent" ? recentRowFor(entry) : entry.row;
    if (period === "recent" && !rowHasRecentActivity(row, entry.type)) {
      return `
        <section class="question-result is-unavailable">
          <h3>直近6試合の出場データはありません</h3>
          <p>${D.escapeHtml(entry.row["選手名"])}のシーズン成績は選手ページで確認できます。</p>
          <a class="question-related-link" href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手ページを見る</a>
        </section>
      `;
    }
    if (period === "season" && entry.type === "pitcher" && D.toInt(row["登板"]) === 0) {
      return `
        <section class="question-result is-unavailable">
          <h3>今季一軍登板はありません</h3>
          <p>${D.escapeHtml(entry.row["選手名"])}は投手データに登録されていますが、今季の一軍登板成績はありません。</p>
          <a class="question-related-link" href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手ページを見る</a>
        </section>
      `;
    }

    const typeLabel = entry.type === "pitcher" ? "投手" : "打者";
    const heading = `${period === "recent" ? "直近6試合" : "シーズン"}・${fullTeamName(entry.row["チーム"])}・${entry.row["選手名"]}・${typeLabel}`;
    const metrics = profileMetricItems(row, entry.type, period);
    const minimumReached = meetsMinimum(row, entry.type, period, metric?.roles?.[0] || "", metric);
    const updateDate = row["更新日"] ? `データ更新日：${row["更新日"]}` : "";
    return `
      <section class="question-result">
        <p class="eyebrow">Player Result</p>
        <h3>${D.escapeHtml(heading)}</h3>
        ${period === "recent" ? '<p class="question-result-period">集計対象：選手が出場した直近6試合</p>' : ""}
        ${updateDate ? `<p class="question-result-period">${D.escapeHtml(updateDate)}</p>` : ""}
        ${entry.row["移籍選手"] === "TRUE" ? '<p class="notice">移籍した選手の成績はシーズン通算です。現在の所属球団で確認してください。</p>' : ""}
        ${!minimumReached ? '<p class="notice">この選手は成績を表示していますが、ランキング掲載条件には到達していません。</p>' : ""}
        <dl class="question-player-metrics">
          ${metrics.map(([label, value]) => `<div><dt>${D.escapeHtml(label)}</dt><dd>${D.escapeHtml(value)}</dd></div>`).join("")}
        </dl>
        <div class="question-related-links">
          <a href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手個人ページ</a>
          <a href="${D.escapeHtml(D.teamUrl(entry.row["チーム"]))}">${D.escapeHtml(fullTeamName(entry.row["チーム"]))}のページ</a>
        </div>
      </section>
    `;
  }

  function rankingRows(type, period) {
    if (period === "recent") return state.insight[type === "pitcher" ? "recentPitchers" : "recentBatters"];
    return type === "pitcher" ? state.season.pitchers : state.seasonBatters;
  }

  function rowMatchesRole(row, role) {
    if (role === "starter") return D.toInt(row["先発"]) > 0;
    if (role === "reliever") return D.toInt(row["救援"]) > 0;
    return true;
  }

  function meetsMinimum(row, type, period, role = "", metric = null) {
    const minimums = D.DATA_QUESTION_MINIMUMS;
    if (period === "recent" && type === "batter") {
      if (metric?.recentMinKey) return D.toNumber(row[metric.recentMinKey]) >= metric.recentMinValue;
      return D.toInt(row["打席"]) >= minimums.recentBatterPa;
    }
    if (period === "recent" && type === "pitcher") {
      return rowMatchesRole(row, role)
        && D.toInt(row["登板"]) >= minimums.recentPitcherGames
        && D.toInt(row["投球アウト数"]) >= minimums.recentPitcherOuts;
    }
    if (type === "batter") return D.toInt(row["打席"]) >= minimums.seasonBatterPa;
    if (role === "starter") return D.isSeasonStarterEligible(row);
    if (role === "reliever") return D.isSeasonRelieverEligible(row);
    return D.isSeasonStarterEligible(row) || D.isSeasonRelieverEligible(row);
  }

  function metricNumber(row, metric, period) {
    if (metric.id === "innings") {
      return period === "recent" ? D.toInt(row["投球アウト数"]) / 3 : D.toNumber(row["投球回_計算用"]);
    }
    return D.toNumber(row[metric.key]);
  }

  function metricDisplay(row, metric, period) {
    if (metric.id === "innings") {
      return period === "recent" ? (row["投球回"] || D.inningsFromOuts(row["投球アウト数"])) : row["投球回"];
    }
    return formatMetricValue(row[metric.key], metric);
  }

  function metricHasValue(row, metric) {
    const value = row[metric.key];
    return value !== undefined && value !== null && value !== "" && value !== "-" && value !== "－";
  }

  function seasonRowFor(row, type) {
    return state.seasonMaps[type].get(playerMapKey(row));
  }

  function scopeLabel(team, league) {
    if (team) return fullTeamName(team);
    if (league) return `${league}・リーグ`;
    return "12球団";
  }

  function rankingHtml({ team, league, type, period, metric, direction, role = "" }) {
    const source = rankingRows(type, period);
    const rows = source
      .filter((row) => !team || row["チーム"] === team)
      .filter((row) => !league || row["リーグ"] === league)
      .filter((row) => meetsMinimum(row, type, period, role, metric))
      .filter((row) => metricHasValue(row, metric))
      .sort((a, b) => {
        const difference = metricNumber(a, metric, period) - metricNumber(b, metric, period);
        if (difference !== 0) return direction === "asc" ? difference : -difference;
        return String(a["選手名"]).localeCompare(String(b["選手名"]), "ja");
      })
      .slice(0, 5);

    if (!rows.length) {
      return `
        <section class="question-result is-unavailable">
          <h3>条件に合うデータが見つかりませんでした</h3>
          <p>対象や指標を変えて質問してください。最低条件を満たす選手だけを表示しています。</p>
        </section>
      `;
    }

    const typeLabel = type === "pitcher"
      ? (role === "starter" ? "先発投手" : role === "reliever" ? "救援投手" : "投手")
      : "打者";
    const directionLabel = direction === "asc" ? "低い順" : "高い順";
    const heading = `${period === "recent" ? "直近6試合" : "シーズン"}・${scopeLabel(team, league)}・${typeLabel}・${metric.label}${directionLabel}`;
    const minimumText = period === "recent"
      ? (metric.recentMinimumLabel || (type === "pitcher" ? "12アウト以上かつ3登板以上" : "18打席以上"))
      : (type === "pitcher"
        ? (role === "starter"
          ? "5先発以上かつ30投球回以上"
          : role === "reliever"
            ? "20救援以上かつ15投球回以上"
            : "先発：5先発以上かつ30投球回以上／救援：20救援以上かつ15投球回以上")
        : "150打席以上");
    const updateDate = rows.find((row) => row["更新日"])?.["更新日"] || "";

    return `
      <section class="question-result">
        <p class="eyebrow">Ranking Result</p>
        <h3>${D.escapeHtml(heading)}</h3>
        <p class="question-result-period">${period === "recent" ? "集計対象：選手ごとの直近6試合 ／ " : ""}最低条件：${D.escapeHtml(minimumText)}${updateDate ? ` ／ データ更新日：${D.escapeHtml(updateDate)}` : ""}</p>
        ${rows.some((row) => row["移籍選手"] === "TRUE") ? '<p class="notice">移籍した選手の成績はシーズン通算です。現在の所属球団で確認してください。</p>' : ""}
        <ol class="question-ranking-list">
          ${rows.map((row, index) => {
            const seasonRow = period === "season" ? row : seasonRowFor(row, type);
            const playerLink = seasonRow ? D.playerUrl(seasonRow, type) : "";
            return `
              <li class="question-ranking-card">
                <span class="question-rank-number">${index + 1}</span>
                <div class="question-rank-player">
                  ${playerLink
                    ? `<a href="${D.escapeHtml(playerLink)}">${D.escapeHtml(row["選手名"])}</a>`
                    : `<strong>${D.escapeHtml(row["選手名"])}</strong>`}
                  <span>${D.escapeHtml(fullTeamName(row["チーム"]))}</span>
                </div>
                <div class="question-rank-value"><span>${D.escapeHtml(metric.label)}</span><strong>${D.escapeHtml(metricDisplay(row, metric, period))}</strong></div>
              </li>
            `;
          }).join("")}
        </ol>
        <div class="question-related-links">
          ${team ? `<a href="${D.escapeHtml(D.teamUrl(team))}">${D.escapeHtml(fullTeamName(team))}のページ</a>` : ""}
          <a href="${period === "recent" ? "./recent-form" : "./"}">${period === "recent" ? "直近6試合一覧" : "ランキング一覧"}</a>
        </div>
      </section>
    `;
  }

  function handleQuestion(question) {
    const text = normalizeText(question);
    if (!text) return unsupportedHtml("質問を入力してください。");
    if (includesAny(text, UNSUPPORTED_TOPICS)) return unsupportedHtml();
    if (includesAny(text, ["被安打", "被本塁打", "敗戦"])) {
      return unsupportedHtml("その指標は初版の検索対象に含まれていません。");
    }

    let period = detectPeriod(text);
    const explicitType = detectExplicitType(text);
    const metric = detectMetric(text, period, explicitType);
    if (metric && !metric.season && metric.recent) period = "recent";
    const explicitRole = detectRole(text);
    const playerMatches = resolvePlayerMatches(text);

    if (playerMatches.length > 1) return candidateHtml(playerMatches);
    if (playerMatches.length === 1) return playerProfileHtml(playerMatches[0], period, metric);

    const team = detectTeam(text);
    const league = detectLeague(text);
    if (explicitType === "both") return unsupportedHtml("打者か投手のどちらかを指定してください。");
    if (explicitRole === "both") return unsupportedHtml("先発投手か救援投手のどちらかを指定してください。");
    if (!metric) return unsupportedHtml("検索する指標を判定できませんでした。");
    if (explicitType && metric.type !== explicitType) {
      return unsupportedHtml(`${metric.label}は${metric.type === "pitcher" ? "投手" : "打者"}の指標です。`);
    }
    if (!metric[period]) return unsupportedHtml(`${metric.label}は${period === "recent" ? "直近6試合" : "シーズン"}データでは検索できません。`);

    const type = explicitType || metric.type;
    const role = explicitRole || (metric.roles?.length === 1 ? metric.roles[0] : "");
    if (role && type !== "pitcher") return unsupportedHtml("先発・救援の指定は投手の質問で利用できます。");
    if (explicitRole && metric.roles?.length && !metric.roles.includes(explicitRole)) {
      return unsupportedHtml(`${metric.label}は${metric.roles[0] === "starter" ? "先発投手" : "救援投手"}の指標です。`);
    }
    const recentRows = period === "recent" ? rankingRows(type, period) : [];
    if (period === "recent" && !recentRows.length) {
      return unsupportedHtml("直近データを読み込めなかったため、この質問には回答できません。");
    }
    return rankingHtml({ team, league, type, period, metric, direction: sortDirection(metric, text), role });
  }

  function appendMessage(kind, content) {
    const article = document.createElement("article");
    article.className = `question-message ${kind === "user" ? "is-user" : "is-answer"}`;
    const label = document.createElement("div");
    label.className = "question-message-label";
    label.textContent = kind === "user" ? "あなた" : "Player Lens";
    const body = document.createElement("div");
    body.className = "question-message-body";
    if (kind === "user") body.textContent = content;
    else body.innerHTML = content;
    article.append(label, body);
    els.log.appendChild(article);
    els.log.scrollTop = els.log.scrollHeight;
  }

  function ask(question) {
    if (!state.ready) return;
    const value = String(question || "").trim();
    if (!value) {
      els.input.focus();
      return;
    }
    if (value.length > 100) {
      appendMessage("answer", unsupportedHtml("質問は100文字以内で入力してください。"));
      return;
    }
    appendMessage("user", value);
    appendMessage("answer", handleQuestion(value));
    els.input.value = "";
    els.input.focus();
  }

  function enableControls() {
    els.input.disabled = false;
    els.submit.disabled = false;
    els.examples.forEach((button) => { button.disabled = false; });
  }

  function buildIndexes() {
    const pitcherKeys = new Set(state.season.pitchers.map(playerMapKey));
    const batters = state.season.batters.filter((row) => row["ポジション"] !== "投手" && !pitcherKeys.has(playerMapKey(row)));
    const pitchers = state.season.pitchers;
    state.seasonBatters = batters;
    state.players = [
      ...batters.map((row) => ({ row, type: "batter" })),
      ...pitchers.map((row) => ({ row, type: "pitcher" })),
    ];
    batters.forEach((row) => state.seasonMaps.batter.set(playerMapKey(row), row));
    pitchers.forEach((row) => state.seasonMaps.pitcher.set(playerMapKey(row), row));
    state.insight.recentBatters.forEach((row) => state.recentMaps.batter.set(playerMapKey(row), row));
    state.insight.recentPitchers.forEach((row) => state.recentMaps.pitcher.set(playerMapKey(row), row));
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(els.input.value);
  });
  els.examples.forEach((button) => {
    button.addEventListener("click", () => ask(button.dataset.questionExample));
  });

  window.PlayerLensQuestion = { ask: handleQuestion };

  try {
    if (!D) throw new Error("共通データ処理を読み込めませんでした");
    const [season, insight] = await Promise.all([D.loadData(), D.loadInsightData()]);
    state.season = season;
    state.insight = insight;
    buildIndexes();
    state.ready = true;
    enableControls();

    const recentReady = insight.recentBatters.length > 0 && insight.recentPitchers.length > 0;
    els.status.textContent = recentReady ? "データ読込完了" : "一部データ確認必要";
    els.status.classList.add(recentReady ? "is-ready" : "is-error");
    if (!recentReady) {
      appendMessage("answer", unsupportedHtml("直近データの一部を読み込めませんでした。シーズン成績の検索は利用できます。"));
    }
  } catch (error) {
    state.ready = false;
    els.status.textContent = "データ読込失敗";
    els.status.classList.add("is-error");
    appendMessage("answer", `
      <section class="question-result is-unavailable">
        <h3>データを読み込めませんでした</h3>
        <p>時間をおいてページを再読み込みしてください。</p>
      </section>
    `);
  }
})();
