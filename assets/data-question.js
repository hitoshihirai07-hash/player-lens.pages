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

  if (!D) return;

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
    { id: "losses", label: "敗戦", type: "pitcher", aliases: ["敗戦", "負け", "黒星"], season: true, recent: true, key: "敗戦", direction: "desc" },
    { id: "allowedHits", label: "被安打", type: "pitcher", aliases: ["被安打"], season: true, recent: true, key: "被安打", direction: "asc" },
    { id: "allowedHr", label: "被本塁打", type: "pitcher", aliases: ["被本塁打", "被ホームラン"], season: true, recent: true, key: "被本塁打", direction: "asc" },
    { id: "hits", label: "安打", type: "batter", aliases: ["安打", "ヒット"], season: true, recent: true, key: "安打", direction: "desc" },
  ];

  const UNSUPPORTED_TOPICS = ["明日", "今日の試合", "試合速報", "速報", "スタメン", "先発予想", "予想", "怪我", "けが", "故障", "離脱", "今後", "将来", "おすすめ", "感想"];
  const RECENT_WORDS = ["直近6試合", "6試合", "直近6日", "直近", "最近", "好調", "6日"];
  const STARTER_WORDS = ["先発投手", "先発", "スターター"];
  const RELIEVER_WORDS = ["救援投手", "救援", "中継ぎ", "リリーフ", "抑え", "クローザー"];
  const LOW_WORDS = ["低い", "少ない", "少な", "低く"];
  const HIGH_WORDS = ["高い", "多い", "多く", "上位", "最多"];

  const state = {
    ready: false,
    season: null,
    insight: null,
    seasonBatters: [],
    players: [],
    seasonMaps: { batter: new Map(), pitcher: new Map() },
    recentMaps: { batter: new Map(), pitcher: new Map() },
  };

  function normalizeText(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s\u3000・･?？!！。、，,.…「」『』()（）【】\[\]]/g, "");
  }

  function includesAny(text, words) { return words.some((word) => text.includes(normalizeText(word))); }
  function fullTeamName(team) { return D.TEAM_TO_FULL[team] || team; }

  function normalizedTeam(row) {
    return D.shortTeam(row?.["チーム"] || row?.["球団"] || row?.["球団名"] || "");
  }

  function normalizeRow(row) {
    const team = normalizedTeam(row);
    const wins = row?.["勝利"] ?? row?.["勝"] ?? "";
    const losses = row?.["敗戦"] ?? row?.["敗"] ?? "";
    const holds = row?.["ホールド"] ?? row?.["ＨＰ"] ?? row?.["HLD"] ?? "";
    const outs = row?.["投球アウト数"] ?? row?.["投球回(アウト)"] ?? "";
    return {
      ...row,
      チーム: team,
      リーグ: row?.["リーグ"] || D.leagueOfTeam(team),
      勝利: wins,
      敗戦: losses,
      ホールド: holds,
      ＨＰ: holds,
      投球アウト数: outs,
    };
  }

  function playerMapKey(row) {
    return `${normalizeText(row?.["選手名"])}|${normalizedTeam(row)}`;
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

  function detectPeriod(text) { return includesAny(text, RECENT_WORDS) ? "recent" : "season"; }

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
      return { id: "form", label: "直近評価", type: explicitType, season: false, recent: true, key: "直近スコア", direction: "desc" };
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
      </section>`;
  }

  function resolvePlayerMatches(text) {
    const team = detectTeam(text);
    let exact = state.players.filter((entry) => text.includes(normalizeText(entry.row["選手名"])));
    if (team && exact.some((entry) => entry.row["チーム"] === team)) exact = exact.filter((entry) => entry.row["チーム"] === team);
    if (exact.length) {
      const longest = Math.max(...exact.map((entry) => normalizeText(entry.row["選手名"]).length));
      return exact.filter((entry) => normalizeText(entry.row["選手名"]).length === longest);
    }
    return state.players.filter((entry) => {
      const parts = String(entry.row["選手名"] || "").normalize("NFKC").trim().split(/\s+/).filter(Boolean);
      const surname = normalizeText(parts[0] || "");
      return parts.length >= 2 && surname.length >= 2 && text.includes(surname);
    });
  }

  function candidateHtml(matches) {
    const unique = Array.from(new Map(matches.map((entry) => [`${entry.type}|${playerMapKey(entry.row)}`, entry])).values());
    return `<section class="question-result"><h3>該当する選手が複数います</h3><p>選手を選ぶか、フルネームと球団名を含めて質問してください。</p><ul class="question-candidate-list">${unique.slice(0, 12).map((entry) => `<li><a href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">${D.escapeHtml(entry.row["選手名"])}</a><span>${D.escapeHtml(fullTeamName(entry.row["チーム"]))}・${entry.type === "pitcher" ? "投手" : "打者"}</span></li>`).join("")}</ul></section>`;
  }

  function rowMatchesRole(row, role) {
    if (role === "starter") return D.toInt(row["先発"]) > 0;
    if (role === "reliever") return D.toInt(row["救援"]) > 0;
    return true;
  }

  function rowHasActivity(row, type, period) {
    if (!row) return false;
    if (type === "pitcher") return period === "recent" ? D.toInt(row["投球アウト数"]) > 0 : D.toInt(row["登板"]) > 0;
    return D.toInt(row["打席"]) > 0;
  }

  function meetsMinimum(row, type, period, role = "", metric = null) {
    const minimums = D.DATA_QUESTION_MINIMUMS;
    if (period === "recent" && type === "batter") {
      if (metric?.recentMinKey) return D.toNumber(row[metric.recentMinKey]) >= metric.recentMinValue;
      return D.toInt(row["打席"]) >= minimums.recentBatterPa;
    }
    if (period === "recent" && type === "pitcher") {
      return rowMatchesRole(row, role) && D.toInt(row["登板"]) >= minimums.recentPitcherGames && D.toInt(row["投球アウト数"]) >= minimums.recentPitcherOuts;
    }
    if (type === "batter") return D.toInt(row["打席"]) >= minimums.seasonBatterPa;
    if (role === "starter") return D.isSeasonStarterEligible(row);
    if (role === "reliever") return D.isSeasonRelieverEligible(row);
    return D.isSeasonStarterEligible(row) || D.isSeasonRelieverEligible(row);
  }

  function metricHasValue(row, metric) {
    const value = metric.id === "innings" ? (row["投球回"] ?? row["投球アウト数"]) : row[metric.key];
    return value !== undefined && value !== null && value !== "" && value !== "-" && value !== "－";
  }

  function metricNumber(row, metric, period) {
    if (metric.id === "innings") return period === "recent" ? D.toInt(row["投球アウト数"]) / 3 : D.toNumber(row["投球回_計算用"] || row["投球回"]);
    return D.toNumber(row[metric.key]);
  }

  function formatMetricValue(value, metric) {
    if (value === undefined || value === null || value === "") return "-";
    if (["average", "ops", "obp", "slg", "era", "stealRate"].includes(metric.id)) return D.formatValue(value, metric.key);
    if (["kbb", "kRate", "bbRate"].includes(metric.id)) return D.formatValue(value, metric.key);
    if (["whip", "k9", "bb9", "hr9", "gameScore"].includes(metric.id)) return D.toNumber(value).toFixed(2);
    if (metric.id === "form") return D.toNumber(value).toFixed(1);
    return String(value);
  }

  function metricDisplay(row, metric, period) {
    if (metric.id === "innings") return period === "recent" ? (row["投球回"] || D.inningsFromOuts(row["投球アウト数"])) : (row["投球回"] || "-");
    return formatMetricValue(row[metric.key], metric);
  }

  function minimumText(type, period, role, metric) {
    if (period === "recent") return metric.recentMinimumLabel || (type === "pitcher" ? "12アウト以上かつ3登板以上" : "18打席以上");
    if (type === "batter") return "150打席以上";
    if (role === "starter") return "5先発以上かつ30投球回以上";
    if (role === "reliever") return "20救援以上かつ15投球回以上";
    return "先発：5先発以上かつ30投球回以上／救援：20救援以上かつ15投球回以上";
  }

  function scopeLabel(team, league) {
    if (team) return fullTeamName(team);
    if (league) return `${league}・リーグ`;
    return "12球団";
  }

  function rankingRows(type, period) {
    if (period === "recent") return state.insight[type === "pitcher" ? "recentPitchers" : "recentBatters"];
    return type === "pitcher" ? state.season.pitchers : state.seasonBatters;
  }

  function seasonRowFor(row, type) { return state.seasonMaps[type].get(playerMapKey(row)); }

  function rankingHtml({ team, league, type, period, metric, direction, role = "" }) {
    const source = rankingRows(type, period);
    const scoped = source
      .filter((row) => !team || row["チーム"] === team)
      .filter((row) => !league || row["リーグ"] === league)
      .filter((row) => rowMatchesRole(row, role))
      .filter((row) => rowHasActivity(row, type, period))
      .filter((row) => metricHasValue(row, metric));

    const strict = scoped.filter((row) => meetsMinimum(row, type, period, role, metric));
    const fallbackUsed = strict.length === 0 && scoped.length > 0;
    const rows = [...(strict.length ? strict : scoped)]
      .sort((a, b) => {
        const diff = metricNumber(a, metric, period) - metricNumber(b, metric, period);
        if (diff !== 0) return direction === "asc" ? diff : -diff;
        return String(a["選手名"]).localeCompare(String(b["選手名"]), "ja");
      })
      .slice(0, 5);

    if (!rows.length) {
      return `<section class="question-result is-unavailable"><h3>この条件では記録済みデータがありません</h3><p>${D.escapeHtml(scopeLabel(team, league))}の${metric.label}に該当する記録が現在のデータにありません。</p></section>`;
    }

    const typeLabel = type === "pitcher" ? (role === "starter" ? "先発投手" : role === "reliever" ? "救援投手" : "投手") : "打者";
    const directionLabel = direction === "asc" ? "低い順" : "高い順";
    const heading = `${period === "recent" ? "直近6試合" : "シーズン"}・${scopeLabel(team, league)}・${typeLabel}・${metric.label}${directionLabel}`;
    const updateDate = rows.find((row) => row["更新日"])?.["更新日"] || "";

    return `<section class="question-result">
      <p class="eyebrow">Ranking Result</p>
      <h3>${D.escapeHtml(heading)}</h3>
      <p class="question-result-period">${period === "recent" ? "集計対象：選手ごとの直近6試合 ／ " : ""}通常条件：${D.escapeHtml(minimumText(type, period, role, metric))}${updateDate ? ` ／ データ更新日：${D.escapeHtml(updateDate)}` : ""}</p>
      ${fallbackUsed ? '<p class="notice">通常のランキング掲載条件を満たす選手がいないため、この条件内で成績が記録されている選手を参考表示しています。</p>' : ""}
      <ol class="question-ranking-list">${rows.map((row, index) => {
        const seasonRow = period === "season" ? row : seasonRowFor(row, type);
        const playerLink = seasonRow ? D.playerUrl(seasonRow, type) : "";
        return `<li class="question-ranking-card"><span class="question-rank-number">${index + 1}</span><div class="question-rank-player">${playerLink ? `<a href="${D.escapeHtml(playerLink)}">${D.escapeHtml(row["選手名"])}</a>` : `<strong>${D.escapeHtml(row["選手名"])}</strong>`}<span>${D.escapeHtml(fullTeamName(row["チーム"]))}</span></div><div class="question-rank-value"><span>${D.escapeHtml(metric.label)}</span><strong>${D.escapeHtml(metricDisplay(row, metric, period))}</strong></div></li>`;
      }).join("")}</ol>
      <div class="question-related-links">${team ? `<a href="${D.escapeHtml(D.teamUrl(team))}">${D.escapeHtml(fullTeamName(team))}のページ</a>` : ""}<a href="${period === "recent" ? "./recent-form" : "./"}">${period === "recent" ? "直近6試合一覧" : "ランキング一覧"}</a></div>
    </section>`;
  }

  function recentRowFor(entry) { return state.recentMaps[entry.type].get(playerMapKey(entry.row)); }

  function profileMetricItems(row, type, period) {
    if (period === "recent" && type === "batter") {
      return [
        ...["打率", "OPS", "本塁打", "打点", "安打", "打席"].map((key) => [key, D.formatValue(row[key], key) || "-"]),
        ["盗塁成功", row["盗塁成功"] || "0"], ["盗塁死", row["盗塁死"] || "0"], ["盗塁企図", row["盗塁企図"] || "0"],
        ["盗塁成功率", row["盗塁成功率"] === "" ? "-" : D.formatValue(row["盗塁成功率"], "盗塁成功率")],
      ];
    }
    if (period === "recent" && type === "pitcher") {
      return [["登板", row["登板"] || "0"], ["先発 / 救援", `${row["先発"] || 0} / ${row["救援"] || 0}`], ["投球回", row["投球回"] || D.inningsFromOuts(row["投球アウト数"])], ["防御率", D.formatValue(row["防御率"], "防御率") || "-"], ["WHIP", row["WHIP"] || "-"], ["奪三振", row["奪三振"] || "0"], ["K%", D.formatValue(row["K%"], "K%") || "-"], ["K-BB%", D.formatValue(row["K-BB%"], "K-BB%") || "-"], ["K/9", row["K/9"] || "-"], ["BB/9", row["BB/9"] || "-"]];
    }
    if (type === "batter") return [...["打率", "OPS", "本塁打", "打点", "安打", "打席"].map((key) => [key, D.formatValue(row[key], key) || "-"]), ["盗塁", row["盗塁"] || "0"]];
    return [["登板", row["登板"] || "0"], ["先発 / 救援", `${row["先発"] || 0} / ${row["救援"] || 0}`], ["投球回", row["投球回"] || "0"], ["防御率", D.formatValue(row["防御率"], "防御率") || "-"], ["WHIP", row["WHIP"] || "-"], ["勝敗", `${row["勝利"] || 0}勝${row["敗戦"] || 0}敗`], ["奪三振", row["奪三振"] || "0"], ["セーブ / ホールド", `${row["セーブ"] || 0} / ${row["ホールド"] || 0}`], ["K%", D.formatValue(row["K%"], "K%") || "-"], ["K-BB%", D.formatValue(row["K-BB%"], "K-BB%") || "-"], ["K/9", row["K/9"] || "-"], ["BB/9", row["BB/9"] || "-"], ["HR/9", row["HR/9"] || "-"]];
  }

  function playerProfileHtml(entry, period, metric) {
    if (metric && metric.type !== entry.type) return unsupportedHtml(`${entry.row["選手名"]}は${entry.type === "pitcher" ? "投手" : "打者"}データとして扱っています。`);
    if (metric && !metric[period]) return unsupportedHtml(`${metric.label}は${period === "recent" ? "直近6試合" : "シーズン"}データでは確認できません。`);
    const row = period === "recent" ? recentRowFor(entry) : entry.row;
    if (period === "recent" && !rowHasActivity(row, entry.type, period)) {
      return `<section class="question-result"><h3>直近6試合の出場記録はありません</h3><p>${D.escapeHtml(entry.row["選手名"])}のシーズン成績は確認できます。</p><a class="question-related-link" href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手ページを見る</a></section>`;
    }
    if (!rowHasActivity(row, entry.type, period)) {
      return `<section class="question-result"><h3>今季一軍の記録はありません</h3><p>${D.escapeHtml(entry.row["選手名"])}は選手データに登録されています。</p><a class="question-related-link" href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手ページを見る</a></section>`;
    }
    const typeLabel = entry.type === "pitcher" ? "投手" : "打者";
    const heading = `${period === "recent" ? "直近6試合" : "シーズン"}・${fullTeamName(entry.row["チーム"])}・${entry.row["選手名"]}・${typeLabel}`;
    const metrics = profileMetricItems(row, entry.type, period);
    return `<section class="question-result"><p class="eyebrow">Player Result</p><h3>${D.escapeHtml(heading)}</h3>${row["更新日"] ? `<p class="question-result-period">データ更新日：${D.escapeHtml(row["更新日"])}</p>` : ""}<dl class="question-player-metrics">${metrics.map(([label, value]) => `<div><dt>${D.escapeHtml(label)}</dt><dd>${D.escapeHtml(value)}</dd></div>`).join("")}</dl><div class="question-related-links"><a href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手個人ページ</a><a href="${D.escapeHtml(D.teamUrl(entry.row["チーム"]))}">${D.escapeHtml(fullTeamName(entry.row["チーム"]))}のページ</a></div></section>`;
  }

  function handleQuestion(question) {
    const text = normalizeText(question);
    if (!text) return unsupportedHtml("質問を入力してください。");
    if (includesAny(text, UNSUPPORTED_TOPICS)) return unsupportedHtml();

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
    if (explicitType && metric.type !== explicitType) return unsupportedHtml(`${metric.label}は${metric.type === "pitcher" ? "投手" : "打者"}の指標です。`);
    if (!metric[period]) return unsupportedHtml(`${metric.label}は${period === "recent" ? "直近6試合" : "シーズン"}データでは検索できません。`);

    const type = explicitType || metric.type;
    const role = explicitRole || (metric.roles?.length === 1 ? metric.roles[0] : "");
    if (role && type !== "pitcher") return unsupportedHtml("先発・救援の指定は投手の質問で利用できます。");
    if (explicitRole && metric.roles?.length && !metric.roles.includes(explicitRole)) return unsupportedHtml(`${metric.label}は${metric.roles[0] === "starter" ? "先発投手" : "救援投手"}の指標です。`);

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
    if (kind === "user") body.textContent = content; else body.innerHTML = content;
    article.append(label, body);
    els.log.appendChild(article);
    els.log.scrollTop = els.log.scrollHeight;
  }

  function ask(question) {
    if (!state.ready) return;
    const value = String(question || "").trim();
    if (!value) return els.input.focus();
    if (value.length > 100) return appendMessage("answer", unsupportedHtml("質問は100文字以内で入力してください。"));
    appendMessage("user", value);
    appendMessage("answer", handleQuestion(value));
    els.input.value = "";
    els.input.focus();
  }

  function buildIndexes() {
    state.season.pitchers = (state.season.pitchers || []).map(normalizeRow);
    state.season.batters = (state.season.batters || []).map(normalizeRow);
    state.insight.recentBatters = (state.insight.recentBatters || []).map(normalizeRow);
    state.insight.recentPitchers = (state.insight.recentPitchers || []).map(normalizeRow);

    const pitcherKeys = new Set(state.season.pitchers.map(playerMapKey));
    state.seasonBatters = state.season.batters.filter((row) => row["ポジション"] !== "投手" && !pitcherKeys.has(playerMapKey(row)));
    state.players = [...state.seasonBatters.map((row) => ({ row, type: "batter" })), ...state.season.pitchers.map((row) => ({ row, type: "pitcher" }))];

    state.seasonBatters.forEach((row) => state.seasonMaps.batter.set(playerMapKey(row), row));
    state.season.pitchers.forEach((row) => state.seasonMaps.pitcher.set(playerMapKey(row), row));
    state.insight.recentBatters.forEach((row) => state.recentMaps.batter.set(playerMapKey(row), row));
    state.insight.recentPitchers.forEach((row) => state.recentMaps.pitcher.set(playerMapKey(row), row));
  }

  function enableControls() {
    els.input.disabled = false;
    els.submit.disabled = false;
    let enabledExamples = 0;
    els.examples.forEach((button) => {
      const answer = handleQuestion(button.dataset.questionExample || "");
      const usable = answer && !answer.includes('class="question-result is-unavailable"');
      button.disabled = !usable;
      button.hidden = !usable;
      if (usable) enabledExamples += 1;
    });
    return enabledExamples;
  }

  els.form?.addEventListener("submit", (event) => { event.preventDefault(); ask(els.input.value); });
  els.examples.forEach((button) => button.addEventListener("click", () => ask(button.dataset.questionExample)));
  window.PlayerLensQuestion = { ask: handleQuestion };

  try {
    const [season, insight] = await Promise.all([D.loadData(), D.loadInsightData()]);
    state.season = season;
    state.insight = insight;
    buildIndexes();
    state.ready = true;
    const enabledExamples = enableControls();
    const recentReady = state.insight.recentBatters.length > 0 && state.insight.recentPitchers.length > 0;
    els.status.textContent = recentReady ? `データ読込完了・質問例${enabledExamples}件確認済み` : "シーズンデータ読込完了";
    els.status.classList.add("is-ready");
  } catch (error) {
    console.error("Data question load failed:", error);
    state.ready = false;
    els.status.textContent = "データ読込失敗";
    els.status.classList.add("is-error");
    appendMessage("answer", `<section class="question-result is-unavailable"><h3>データを読み込めませんでした</h3><p>時間をおいてページを再読み込みしてください。</p></section>`);
  }
})();
