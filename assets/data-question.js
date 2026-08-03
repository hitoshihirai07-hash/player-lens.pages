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

  const TEAM_ALIASES = {
    "巨人": ["読売ジャイアンツ", "読売", "ジャイアンツ", "巨人"],
    "阪神": ["阪神タイガース", "タイガース", "阪神"],
    "DeNA": ["横浜DeNAベイスターズ", "横浜DeNA", "ベイスターズ", "DeNA", "横浜"],
    "広島": ["広島東洋カープ", "広島カープ", "カープ", "広島"],
    "ヤクルト": ["東京ヤクルトスワローズ", "東京ヤクルト", "スワローズ", "ヤクルト"],
    "中日": ["中日ドラゴンズ", "ドラゴンズ", "中日"],
    "オリックス": ["オリックス・バファローズ", "オリックスバファローズ", "バファローズ", "オリックス"],
    "ソフトバンク": ["福岡ソフトバンクホークス", "福岡ソフトバンク", "ソフトバンク", "ホークス"],
    "ロッテ": ["千葉ロッテマリーンズ", "千葉ロッテ", "マリーンズ", "ロッテ"],
    "楽天": ["東北楽天ゴールデンイーグルス", "楽天イーグルス", "東北楽天", "イーグルス", "楽天"],
    "西武": ["埼玉西武ライオンズ", "埼玉西武", "ライオンズ", "西武"],
    "日本ハム": ["北海道日本ハムファイターズ", "北海道日本ハム", "日本ハム", "ファイターズ", "日ハム"],
  };

  const METRICS = [
    { id: "whip", label: "WHIP", type: "pitcher", aliases: ["whip"], season: false, recent: true, key: "WHIP", direction: "asc" },
    { id: "ops", label: "OPS", type: "batter", aliases: ["ops"], season: true, recent: true, key: "OPS", direction: "desc" },
    { id: "obp", label: "出塁率", type: "batter", aliases: ["出塁率"], season: true, recent: true, key: "出塁率", direction: "desc" },
    { id: "slg", label: "長打率", type: "batter", aliases: ["長打率"], season: true, recent: true, key: "長打率", direction: "desc" },
    { id: "era", label: "防御率", type: "pitcher", aliases: ["防御率", "era"], season: true, recent: true, key: "防御率", direction: "asc" },
    { id: "strikeouts", label: "奪三振", type: "pitcher", aliases: ["奪三振", "三振数", "三振"], season: true, recent: true, key: "奪三振", direction: "desc" },
    { id: "saves", label: "セーブ", type: "pitcher", aliases: ["セーブ", "save"], season: true, recent: false, key: "セーブ", direction: "desc" },
    { id: "homeRuns", label: "本塁打", type: "batter", aliases: ["本塁打", "ホームラン", "hr"], season: true, recent: true, key: "本塁打", direction: "desc" },
    { id: "rbi", label: "打点", type: "batter", aliases: ["打点", "rbi"], season: true, recent: true, key: "打点", direction: "desc" },
    { id: "average", label: "打率", type: "batter", aliases: ["打率"], season: true, recent: true, key: "打率", direction: "desc" },
    { id: "innings", label: "投球回", type: "pitcher", aliases: ["投球回", "イニング"], season: true, recent: true, key: "投球回", direction: "desc" },
    { id: "wins", label: "勝利", type: "pitcher", aliases: ["勝利", "勝ち星", "最多勝"], season: true, recent: false, key: "勝利", direction: "desc" },
    { id: "hits", label: "安打", type: "batter", aliases: ["安打", "ヒット"], season: true, recent: true, key: "安打", direction: "desc" },
  ];

  const UNSUPPORTED_TOPICS = [
    "明日", "今日の試合", "試合速報", "速報", "スタメン", "先発予想", "予想", "怪我", "けが", "故障", "離脱", "今後", "将来", "おすすめ", "感想",
  ];
  const RECENT_WORDS = ["直近6日", "直近", "最近", "好調", "6日"];
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
        <p>球団名、選手名、打率、OPS、本塁打、防御率、奪三振などを含めて質問してください。</p>
      </section>
    `;
  }

  function resolvePlayerMatches(text) {
    const exact = state.players.filter((entry) => text.includes(normalizeText(entry.row["選手名"])));
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
    if (["average", "ops", "obp", "slg", "era"].includes(metric.id)) return D.formatValue(value, metric.key);
    if (metric.id === "whip") return D.toNumber(value).toFixed(3).replace(/^0(?=\.)/, "");
    if (metric.id === "form") return D.toNumber(value).toFixed(1);
    return String(value);
  }

  function profileMetricItems(row, type, period) {
    if (period === "recent" && type === "batter") {
      return ["打率", "OPS", "本塁打", "打点", "安打", "打席"].map((key) => [key, D.formatValue(row[key], key) || "-"]);
    }
    if (period === "recent" && type === "pitcher") {
      return [
        ["防御率", D.formatValue(row["防御率"], "防御率") || "-"],
        ["奪三振", row["奪三振"] || "0"],
        ["WHIP", row["WHIP"] === "" ? "-" : formatMetricValue(row["WHIP"], { id: "whip" })],
        ["投球回", row["投球回"] || D.inningsFromOuts(row["投球アウト数"])],
      ];
    }
    if (type === "batter") {
      return ["打率", "OPS", "本塁打", "打点", "安打", "打席"].map((key) => [key, D.formatValue(row[key], key) || "-"]);
    }
    return [
      ["防御率", D.formatValue(row["防御率"], "防御率") || "-"],
      ["勝利", row["勝利"] || "0"],
      ["奪三振", row["奪三振"] || "0"],
      ["投球回", row["投球回"] || "0"],
      ["登板", row["登板"] || "0"],
      ["セーブ", row["セーブ"] || "0"],
    ];
  }

  function playerProfileHtml(entry, period, metric) {
    if (metric && metric.type !== entry.type) {
      return unsupportedHtml(`${entry.row["選手名"]}は${entry.type === "pitcher" ? "投手" : "打者"}データに登録されているため、${metric.label}では検索できません。`);
    }
    if (metric && !metric[period]) {
      return unsupportedHtml(`${metric.label}は${period === "recent" ? "直近6日" : "シーズン"}データでは確認できません。`);
    }

    const row = period === "recent" ? recentRowFor(entry) : entry.row;
    if (period === "recent" && !rowHasRecentActivity(row, entry.type)) {
      return `
        <section class="question-result is-unavailable">
          <h3>直近6日間の出場データはありません</h3>
          <p>${D.escapeHtml(entry.row["選手名"])}のシーズン成績は選手ページで確認できます。</p>
          <a class="question-related-link" href="${D.escapeHtml(D.playerUrl(entry.row, entry.type))}">選手ページを見る</a>
        </section>
      `;
    }

    const typeLabel = entry.type === "pitcher" ? "投手" : "打者";
    const heading = `${period === "recent" ? "直近6日" : "シーズン"}・${fullTeamName(entry.row["チーム"])}・${entry.row["選手名"]}・${typeLabel}`;
    const metrics = profileMetricItems(row, entry.type, period);
    const periodText = period === "recent" ? periodLabel(row) : "";
    return `
      <section class="question-result">
        <p class="eyebrow">Player Result</p>
        <h3>${D.escapeHtml(heading)}</h3>
        ${periodText ? `<p class="question-result-period">集計期間：${D.escapeHtml(periodText)}</p>` : ""}
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

  function meetsMinimum(row, type, period) {
    if (period === "recent" && type === "batter") return D.toInt(row["打席"]) >= 10;
    if (period === "recent" && type === "pitcher") return D.toInt(row["投球アウト数"]) >= 3;
    if (type === "batter") {
      const minimum = D.RANKINGS.find((ranking) => ranking.id === "batter-overall")?.minValue ?? 20;
      return D.toInt(row["打席"]) >= minimum;
    }
    const minimum = D.RANKINGS.find((ranking) => ranking.id === "pitcher-overall")?.minValue ?? 5;
    return D.toNumber(row["投球回_計算用"]) >= minimum;
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

  function rankingHtml({ team, league, type, period, metric, direction }) {
    const source = rankingRows(type, period);
    const rows = source
      .filter((row) => !team || row["チーム"] === team)
      .filter((row) => !league || row["リーグ"] === league)
      .filter((row) => meetsMinimum(row, type, period))
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

    const typeLabel = type === "pitcher" ? "投手" : "打者";
    const directionLabel = direction === "asc" ? "低い順" : "高い順";
    const heading = `${period === "recent" ? "直近6日" : "シーズン"}・${scopeLabel(team, league)}・${typeLabel}・${metric.label}${directionLabel}`;
    const periodText = period === "recent" ? periodLabel(rows[0]) : "";
    const minimumText = period === "recent"
      ? (type === "pitcher" ? "3アウト以上" : "10打席以上")
      : (type === "pitcher" ? "5投球回以上" : "20打席以上");

    return `
      <section class="question-result">
        <p class="eyebrow">Ranking Result</p>
        <h3>${D.escapeHtml(heading)}</h3>
        <p class="question-result-period">${periodText ? `集計期間：${D.escapeHtml(periodText)} ／ ` : ""}最低条件：${D.escapeHtml(minimumText)}</p>
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
          <a href="${period === "recent" ? "./recent-form.html" : "./index.html"}">${period === "recent" ? "直近6日一覧" : "ランキング一覧"}</a>
        </div>
      </section>
    `;
  }

  function handleQuestion(question) {
    const text = normalizeText(question);
    if (!text) return unsupportedHtml("質問を入力してください。");
    if (includesAny(text, UNSUPPORTED_TOPICS)) return unsupportedHtml();
    if (includesAny(text, ["被安打", "被本塁打", "与四球", "ホールド", "敗戦"])) {
      return unsupportedHtml("その指標は初版の検索対象に含まれていません。");
    }

    const period = detectPeriod(text);
    const explicitType = detectExplicitType(text);
    const metric = detectMetric(text, period, explicitType);
    const playerMatches = resolvePlayerMatches(text);

    if (playerMatches.length > 1) return candidateHtml(playerMatches);
    if (playerMatches.length === 1) return playerProfileHtml(playerMatches[0], period, metric);

    const team = detectTeam(text);
    const league = detectLeague(text);
    if (explicitType === "both") return unsupportedHtml("打者か投手のどちらかを指定してください。");
    if (!metric) return unsupportedHtml("検索する指標を判定できませんでした。");
    if (explicitType && metric.type !== explicitType) {
      return unsupportedHtml(`${metric.label}は${metric.type === "pitcher" ? "投手" : "打者"}の指標です。`);
    }
    if (!metric[period]) {
      const detail = metric.id === "whip" && period === "season"
        ? "WHIPは直近6日の投手データでのみ検索できます。「直近」を含めて質問してください。"
        : `${metric.label}は${period === "recent" ? "直近6日" : "シーズン"}データでは検索できません。`;
      return unsupportedHtml(detail);
    }

    const type = explicitType || metric.type;
    const recentRows = period === "recent" ? rankingRows(type, period) : [];
    if (period === "recent" && !recentRows.length) {
      return unsupportedHtml("直近データを読み込めなかったため、この質問には回答できません。");
    }
    return rankingHtml({ team, league, type, period, metric, direction: sortDirection(metric, text) });
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
