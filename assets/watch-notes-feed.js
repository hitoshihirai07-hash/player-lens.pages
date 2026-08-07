(() => {
  const ARTICLES_URL = "https://pro-baseball-watch-guide.pages.dev/data/articles.json";
  const WATCH_NOTES_URL = "https://pro-baseball-watch-guide.pages.dev/watch-notes/";
  const GIANTS_DATA_URL = "./teams/giants";
  const PLAYER_LENS_HOME = "./";

  const container = document.getElementById("watchNotesFeed");
  const status = document.getElementById("watchNotesFeedStatus");
  if (!container) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || "";
    return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
  }

  function absoluteArticleUrl(baseUrl, path) {
    const base = String(baseUrl || "https://pro-baseball-watch-guide.pages.dev").replace(/\/+$/, "");
    const suffix = String(path || "").startsWith("/") ? path : `/${path || ""}`;
    return `${base}${suffix}`;
  }

  function isGiantsNote(item) {
    return Array.isArray(item.tags) && item.tags.includes("giants");
  }

  function cardHtml(item, baseUrl) {
    const articleUrl = absoluteArticleUrl(baseUrl, item.path);
    const dataUrl = isGiantsNote(item) ? GIANTS_DATA_URL : PLAYER_LENS_HOME;
    const dataLabel = isGiantsNote(item) ? "巨人のデータを見る" : "Player Lensでデータを見る";

    return `<article class="watch-note-data-card">
      <p class="card-date">${escapeHtml(formatDate(item.published))}公開</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="watch-note-summary">${escapeHtml(item.description || "")}</p>
      <div class="watch-note-actions">
        <a class="primary-link" href="${escapeHtml(articleUrl)}" target="_blank" rel="noopener">観戦メモを読む</a>
        <a href="${escapeHtml(dataUrl)}">${escapeHtml(dataLabel)}</a>
      </div>
    </article>`;
  }

  async function loadFeed() {
    try {
      const response = await fetch(ARTICLES_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data.articles)
        ? data.articles
            .filter(item => item.type === "watch-note")
            .sort((a, b) => String(b.published || "").localeCompare(String(a.published || "")))
            .slice(0, 3)
            .map(item => ({
              title: item.listTitle || item.title,
              description: item.listDescription || item.description,
              path: item.path,
              published: item.published,
              tags: item.tags || []
            }))
        : [];
      if (!items.length) throw new Error("観戦メモが見つかりません");

      container.innerHTML = items.map(item => cardHtml(item, data.baseUrl)).join("");
      if (status) {
        status.textContent = `プロ野球観戦メモの最新${items.length}件を自動表示しています。`;
        status.classList.remove("is-error");
      }
    } catch (error) {
      container.innerHTML = `<article class="watch-note-data-card watch-note-feed-error">
        <p class="card-date">読み込みできませんでした</p>
        <h3>最新の観戦メモは一覧から確認できます</h3>
        <p>一時的に記事情報を取得できないため、観戦メモ一覧を開いて確認してください。</p>
        <div class="watch-note-actions">
          <a class="primary-link" href="${WATCH_NOTES_URL}" target="_blank" rel="noopener">観戦メモ一覧を開く</a>
        </div>
      </article>`;
      if (status) {
        status.textContent = "観戦メモの自動取得に失敗しました。Player Lens本体のデータ表示には影響しません。";
        status.classList.add("is-error");
      }
      console.warn("Watch notes feed could not be loaded:", error);
    }
  }

  loadFeed();
})();
