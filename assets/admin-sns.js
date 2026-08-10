(function () {
  const PASSWORD_HASH = "749b3012961dc742bb980a216671611ebccdae2f0da7ffa63b806b3713dff941";
  const PAGE_SIZE = 20;
  const REQUIRED_FIELDS = ["日付", "ポスト本文", "インプレッション数", "エンゲージメント"];

  const els = {
    loginPanel: document.getElementById("snsLoginPanel"),
    adminPanel: document.getElementById("snsAdminPanel"),
    password: document.getElementById("snsAdminPassword"),
    loginButton: document.getElementById("snsLoginButton"),
    loginMessage: document.getElementById("snsLoginMessage"),
    file: document.getElementById("snsCsvFile"),
    dropZone: document.getElementById("snsDropZone"),
    fileStatus: document.getElementById("snsFileStatus"),
    clear: document.getElementById("snsClear"),
    analysis: document.getElementById("snsAnalysis"),
    summary: document.getElementById("snsSummary"),
    categoryFilter: document.getElementById("snsCategoryFilter"),
    impressionFilter: document.getElementById("snsImpressionFilter"),
    textFilter: document.getElementById("snsTextFilter"),
    filterReset: document.getElementById("snsFilterReset"),
    filteredCount: document.getElementById("snsFilteredCount"),
    recommendations: document.getElementById("snsRecommendations"),
    rankingTabs: document.getElementById("snsRankingTabs"),
    rankingNote: document.getElementById("snsRankingNote"),
    postRanking: document.getElementById("snsPostRanking"),
    categoryRows: document.getElementById("snsCategoryRows"),
    weekdayGrid: document.getElementById("snsWeekdayGrid"),
    postList: document.getElementById("snsPostList"),
    pagination: document.getElementById("snsPagination"),
  };

  let rows = [];
  let rankingMode = "reach";
  let currentPage = 1;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function sha256(text) {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function login() {
    const hash = await sha256(els.password.value);
    if (hash !== PASSWORD_HASH) {
      els.loginMessage.textContent = "パスワードが違います。";
      return;
    }
    els.loginMessage.textContent = "";
    els.loginPanel.hidden = true;
    els.adminPanel.hidden = false;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    const input = String(text || "").replace(/^\uFEFF/, "");

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
      if (row.some((value) => value !== "")) rows.push(row);
    }

    const headers = (rows.shift() || []).map((header) => header.trim());
    return {
      headers,
      data: rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
    };
  }

  function numberValue(row, key) {
    const value = String(row[key] ?? "").replace(/,/g, "").trim();
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function playerDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateLabel(date) {
    if (!date) return "—";
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
  }

  function classifyPost(text) {
    const value = String(text || "");
    if (/おはよう|こんにちは|こんばんは/.test(value)) return "朝・挨拶";
    if (/Player Lens|プロ野球観戦メモ|サイト|ブログ|記事|プロフのリンク/i.test(value)) return "サイト紹介";
    if (/予想|見込み|先発予想|スタメン予想|明日|次の.{0,8}戦|カード/.test(value)) return "予想・展望";
    if (/試合終了|うさほー|勝ち越し|連勝|連敗|振り返り|総括|勝利|敗戦/.test(value)) return "試合結果・振り返り";
    if (/退場|登録抹消|昇格|降格|公示|速報|途中経過|同点|逆転/.test(value)) return "試合中・速報";
    if (/打率|防御率|OPS|得点圏|QS|HQS|連続|打席|投球|本塁打|HR|盗塁|順位|首位|勝率|データ/i.test(value)) return "データ・記録";
    return "その他";
  }

  function enrichRow(row, index) {
    const impressions = numberValue(row, "インプレッション数");
    const engagement = numberValue(row, "エンゲージメント");
    const likes = numberValue(row, "いいね");
    const urlClicks = numberValue(row, "URLのクリック数");
    const profile = numberValue(row, "プロフィールへのアクセス数");
    const follows = numberValue(row, "新しいフォロー");
    const date = playerDate(row["日付"]);
    return {
      raw: row,
      index,
      date,
      body: String(row["ポスト本文"] || "").trim(),
      link: String(row["ポストのリンク"] || "").trim(),
      category: classifyPost(row["ポスト本文"]),
      impressions,
      engagement,
      likes,
      urlClicks,
      profile,
      follows,
      engagementRate: impressions > 0 ? engagement / impressions * 100 : 0,
      likeRate: impressions > 0 ? likes / impressions * 100 : 0,
      urlRate: impressions > 0 ? urlClicks / impressions * 100 : 0,
      profileRate: impressions > 0 ? profile / impressions * 100 : 0,
    };
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function sum(items, key) {
    return items.reduce((total, item) => total + (typeof key === "function" ? key(item) : item[key] || 0), 0);
  }

  function compactNumber(value) {
    return Math.round(value).toLocaleString("ja-JP");
  }

  function percent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  function weightedRate(items, numeratorKey) {
    const impressions = sum(items, "impressions");
    return impressions > 0 ? sum(items, numeratorKey) / impressions * 100 : 0;
  }

  function groupBy(items, keyFn) {
    return items.reduce((map, item) => {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
      return map;
    }, new Map());
  }

  function summaryFor(items) {
    const impressions = sum(items, "impressions");
    const engagement = sum(items, "engagement");
    return {
      count: items.length,
      impressions,
      medianImpressions: median(items.map((item) => item.impressions)),
      engagement,
      engagementRate: impressions > 0 ? engagement / impressions * 100 : 0,
      urlClicks: sum(items, "urlClicks"),
      profile: sum(items, "profile"),
      follows: sum(items, "follows"),
    };
  }

  function currentRows() {
    const category = els.categoryFilter.value;
    const minImpressions = Number(els.impressionFilter.value || 0);
    const query = els.textFilter.value.trim().toLocaleLowerCase("ja-JP");
    return rows.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (item.impressions < minImpressions) return false;
      if (query && !item.body.toLocaleLowerCase("ja-JP").includes(query)) return false;
      return true;
    });
  }

  function renderSummary() {
    const stats = summaryFor(rows);
    const dates = rows.map((item) => item.date).filter(Boolean).sort((a, b) => a - b);
    const period = dates.length ? `${dateLabel(dates[0])}〜${dateLabel(dates.at(-1))}` : "—";
    const cards = [
      ["投稿数", compactNumber(stats.count)],
      ["総imp", compactNumber(stats.impressions)],
      ["中央値imp", compactNumber(stats.medianImpressions)],
      ["全体反応率", percent(stats.engagementRate)],
      ["URLクリック", compactNumber(stats.urlClicks)],
      ["プロフィール", compactNumber(stats.profile)],
      ["新規フォロー", compactNumber(stats.follows)],
      ["分析期間", period],
    ];
    els.summary.innerHTML = cards.map(([label, value]) => `
      <article class="summary-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join("");
  }

  function categoryStats(items = rows) {
    return [...groupBy(items, (item) => item.category).entries()]
      .map(([category, group]) => {
        const stats = summaryFor(group);
        return {
          category,
          ...stats,
          averageImpressions: stats.count ? stats.impressions / stats.count : 0,
        };
      })
      .sort((a, b) => b.count - a.count || b.medianImpressions - a.medianImpressions);
  }

  function renderCategoryRows(items) {
    const stats = categoryStats(items);
    els.categoryRows.innerHTML = stats.length ? stats.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.category)}</strong></td>
        <td>${compactNumber(item.count)}</td>
        <td>${compactNumber(item.averageImpressions)}</td>
        <td>${compactNumber(item.medianImpressions)}</td>
        <td>${percent(item.engagementRate)}</td>
        <td>${compactNumber(item.urlClicks)}</td>
        <td>${compactNumber(item.profile)}</td>
      </tr>
    `).join("") : `<tr><td colspan="7">条件に合う投稿がありません。</td></tr>`;
  }

  function recommendationCard(title, body, tone = "") {
    return `<article class="sns-recommendation ${tone}"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>`;
  }

  function renderRecommendations() {
    const groups = categoryStats(rows).filter((item) => item.count >= 3);
    if (!groups.length) {
      els.recommendations.innerHTML = recommendationCard("データ不足", "3投稿以上ある投稿タイプが増えると、傾向を比較できます。");
      return;
    }

    const reach = [...groups].sort((a, b) => b.medianImpressions - a.medianImpressions)[0];
    const reaction = [...groups].sort((a, b) => b.engagementRate - a.engagementRate)[0];
    const trafficCandidates = groups.filter((item) => item.urlClicks > 0);
    const traffic = trafficCandidates.sort((a, b) => b.urlClicks - a.urlClicks || b.engagementRate - a.engagementRate)[0];

    const recommendations = [
      recommendationCard(
        "リーチを狙うなら",
        `${reach.category}が安定。${reach.count}投稿でインプレッション中央値${compactNumber(reach.medianImpressions)}。同じ切り口を継続候補にできます。`,
        "is-reach"
      ),
      recommendationCard(
        "反応を狙うなら",
        `${reaction.category}の反応率が${percent(reaction.engagementRate)}で投稿タイプ別トップ。返信・詳細クリックを含む反応を取りやすい傾向です。`,
        "is-reaction"
      ),
    ];

    if (traffic) {
      recommendations.push(recommendationCard(
        "サイトへ誘導するなら",
        `${traffic.category}からURLクリックが合計${compactNumber(traffic.urlClicks)}件。Player Lensへの導線を置く投稿では、この型を優先候補にできます。`,
        "is-url"
      ));
    } else {
      recommendations.push(recommendationCard(
        "サイト誘導",
        "URLクリック実績がまだ少ないため、Player Lensへのリンクを置く投稿を増やして比較すると判断しやすくなります。",
        "is-url"
      ));
    }

    els.recommendations.innerHTML = recommendations.join("");
  }

  function rankingItems(items, mode) {
    const result = [...items];
    if (mode === "reaction") {
      return result
        .filter((item) => item.impressions >= 20)
        .sort((a, b) => b.engagementRate - a.engagementRate || b.engagement - a.engagement)
        .slice(0, 10);
    }
    if (mode === "url") {
      return result
        .filter((item) => item.urlClicks > 0)
        .sort((a, b) => b.urlClicks - a.urlClicks || b.urlRate - a.urlRate)
        .slice(0, 10);
    }
    if (mode === "profile") {
      return result
        .filter((item) => item.profile > 0 || item.follows > 0)
        .sort((a, b) => (b.profile + b.follows * 2) - (a.profile + a.follows * 2) || b.profileRate - a.profileRate)
        .slice(0, 10);
    }
    return result.sort((a, b) => b.impressions - a.impressions).slice(0, 10);
  }

  function rankingMetric(item, mode) {
    if (mode === "reaction") return `反応率 ${percent(item.engagementRate)} / ${compactNumber(item.engagement)}件`;
    if (mode === "url") return `URLクリック ${compactNumber(item.urlClicks)}件 / ${percent(item.urlRate)}`;
    if (mode === "profile") return `プロフィール ${compactNumber(item.profile)} / フォロー ${compactNumber(item.follows)}`;
    return `${compactNumber(item.impressions)} imp`;
  }

  function renderRanking(items) {
    const ranked = rankingItems(items, rankingMode);
    const notes = {
      reach: "インプレッション数の多い順です。",
      reaction: "20インプレッション以上の投稿を、エンゲージメント率の高い順で表示します。",
      url: "URLクリックが発生した投稿を、クリック数の多い順で表示します。",
      profile: "プロフィールアクセスまたは新規フォローが発生した投稿を表示します。",
    };
    els.rankingNote.textContent = notes[rankingMode];

    els.postRanking.innerHTML = ranked.length ? ranked.map((item, index) => `
      <article class="sns-post-card">
        <div class="sns-post-rank">${index + 1}</div>
        <div class="sns-post-card-main">
          <div class="sns-post-card-meta">
            <span>${escapeHtml(dateLabel(item.date))}</span>
            <span>${escapeHtml(item.category)}</span>
            <strong>${escapeHtml(rankingMetric(item, rankingMode))}</strong>
          </div>
          <p>${escapeHtml(item.body)}</p>
          <div class="sns-post-card-stats">
            <span>imp ${compactNumber(item.impressions)}</span>
            <span>反応 ${compactNumber(item.engagement)}</span>
            <span>いいね ${compactNumber(item.likes)}</span>
            <span>URL ${compactNumber(item.urlClicks)}</span>
            <span>プロフィール ${compactNumber(item.profile)}</span>
          </div>
          ${item.link ? `<a class="text-link sns-open-x" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">Xで開く</a>` : ""}
        </div>
      </article>
    `).join("") : `<p class="empty-state">この条件では対象投稿がありません。</p>`;
  }

  function weekdayName(date) {
    return date ? ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] : "不明";
  }

  function renderWeekdays(items) {
    const order = ["月", "火", "水", "木", "金", "土", "日"];
    const groups = groupBy(items.filter((item) => item.date), (item) => weekdayName(item.date));
    els.weekdayGrid.innerHTML = order.map((day) => {
      const group = groups.get(day) || [];
      const stats = summaryFor(group);
      const avg = stats.count ? stats.impressions / stats.count : 0;
      return `
        <article class="sns-weekday-card">
          <strong>${day}曜日</strong>
          <span>${stats.count}投稿</span>
          <b>平均 ${compactNumber(avg)} imp</b>
          <small>反応率 ${percent(stats.engagementRate)}</small>
        </article>
      `;
    }).join("");
  }

  function renderPostList(items) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = [...items]
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0) || b.index - a.index)
      .slice(start, start + PAGE_SIZE);

    els.postList.innerHTML = pageItems.length ? pageItems.map((item) => `
      <article class="sns-list-row">
        <div class="sns-list-date">${escapeHtml(dateLabel(item.date))}</div>
        <div class="sns-list-main">
          <div class="sns-list-head">
            <span class="sns-category-pill">${escapeHtml(item.category)}</span>
            <strong>${compactNumber(item.impressions)} imp</strong>
            <span>反応率 ${percent(item.engagementRate)}</span>
          </div>
          <p>${escapeHtml(item.body)}</p>
          <div class="sns-post-card-stats">
            <span>反応 ${compactNumber(item.engagement)}</span>
            <span>いいね ${compactNumber(item.likes)}</span>
            <span>URL ${compactNumber(item.urlClicks)}</span>
            <span>プロフィール ${compactNumber(item.profile)}</span>
          </div>
        </div>
      </article>
    `).join("") : `<p class="empty-state">条件に合う投稿がありません。</p>`;

    const buttons = [];
    for (let page = 1; page <= totalPages; page += 1) {
      if (totalPages > 9 && page > 2 && page < currentPage - 1) continue;
      if (totalPages > 9 && page > currentPage + 1 && page < totalPages - 1) continue;
      buttons.push(`<button type="button" data-page="${page}" ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`);
    }
    els.pagination.innerHTML = items.length > PAGE_SIZE ? buttons.join("") : "";
  }

  function renderAll() {
    const filtered = currentRows();
    els.filteredCount.textContent = `${filtered.length.toLocaleString("ja-JP")} / ${rows.length.toLocaleString("ja-JP")}投稿を表示`;
    renderCategoryRows(filtered);
    renderRanking(filtered);
    renderWeekdays(filtered);
    renderPostList(filtered);
  }

  function setCategoryOptions() {
    const categories = [...new Set(rows.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ja"));
    els.categoryFilter.innerHTML = `<option value="all">すべて</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  }

  function validateHeaders(headers) {
    return REQUIRED_FIELDS.filter((field) => !headers.includes(field));
  }

  async function loadFile(file) {
    if (!file) return;
    els.fileStatus.textContent = "CSVを読み込んでいます…";
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const missing = validateHeaders(parsed.headers);
      if (missing.length) {
        throw new Error(`必要な列がありません：${missing.join("、")}`);
      }
      rows = parsed.data
        .filter((row) => String(row["ポスト本文"] || "").trim() || numberValue(row, "インプレッション数") > 0)
        .map(enrichRow);

      if (!rows.length) throw new Error("分析できる投稿がありません。");

      const dates = rows.map((item) => item.date).filter(Boolean).sort((a, b) => a - b);
      els.fileStatus.innerHTML = `<strong>${escapeHtml(file.name)}</strong>：${rows.length.toLocaleString("ja-JP")}投稿を読み込みました${dates.length ? `（${escapeHtml(dateLabel(dates[0]))}〜${escapeHtml(dateLabel(dates.at(-1))) }）` : ""}。`;
      els.clear.hidden = false;
      els.analysis.hidden = false;
      currentPage = 1;
      rankingMode = "reach";
      els.rankingTabs.querySelectorAll("[data-ranking]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.ranking === rankingMode));
      });
      setCategoryOptions();
      renderSummary();
      renderRecommendations();
      renderAll();
    } catch (error) {
      rows = [];
      els.analysis.hidden = true;
      els.clear.hidden = true;
      els.fileStatus.textContent = `読み込みに失敗しました。${error.message || error}`;
    }
  }

  function clearAnalysis() {
    rows = [];
    els.file.value = "";
    els.analysis.hidden = true;
    els.clear.hidden = true;
    els.fileStatus.textContent = "CSVはまだ読み込まれていません。";
  }

  function resetFilters() {
    els.categoryFilter.value = "all";
    els.impressionFilter.value = "0";
    els.textFilter.value = "";
    currentPage = 1;
    renderAll();
  }

  els.loginButton.addEventListener("click", login);
  els.password.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });

  els.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-dragging");
  });
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("is-dragging"));
  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-dragging");
    loadFile(event.dataTransfer.files?.[0]);
  });
  els.file.addEventListener("change", () => loadFile(els.file.files?.[0]));
  els.clear.addEventListener("click", clearAnalysis);

  [els.categoryFilter, els.impressionFilter].forEach((control) => control.addEventListener("change", () => {
    currentPage = 1;
    renderAll();
  }));
  els.textFilter.addEventListener("input", () => {
    currentPage = 1;
    renderAll();
  });
  els.filterReset.addEventListener("click", resetFilters);

  els.rankingTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ranking]");
    if (!button) return;
    rankingMode = button.dataset.ranking;
    els.rankingTabs.querySelectorAll("[data-ranking]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    renderRanking(currentRows());
  });

  els.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) return;
    currentPage = Number(button.dataset.page) || 1;
    renderPostList(currentRows());
    els.postList.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();