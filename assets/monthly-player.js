(function () {
  const D = window.PlayerLensData;
  const M = window.PlayerLensMonthly;
  if (!D || !M) return;

  const params = new URLSearchParams(location.search);
  const type = params.get("type") === "pitcher" ? "pitcher" : "batter";
  const esc = (value) => D.escapeHtml(value === undefined || value === null ? "" : String(value));

  function avg(value) {
    return Number(value).toFixed(3).replace(/^0/, "");
  }

  function dec3(value) {
    return Number(value).toFixed(3).replace(/^0/, "");
  }

  function dec2(value) {
    return Number(value).toFixed(2);
  }

  function statsMarkup(row) {
    if (!row) return '<p class="empty-state">この月の一軍出場記録はありません。</p>';
    const items = type === "pitcher"
      ? [
          ["登板", row.登板], ["先発 / 救援", `${row.先発} / ${row.救援}`], ["投球回", row.投球回],
          ["防御率", dec2(row.防御率)], ["WHIP", Number(row.WHIP).toFixed(3)], ["勝敗", `${row.勝利}勝${row.敗戦}敗`],
          ["奪三振", row.奪三振], ["セーブ / HP", `${row.セーブ} / ${row.ＨＰ}`],
        ]
      : [
          ["試合", row.試合], ["打席", row.打席], ["打数", row.打数], ["打率", avg(row.打率)],
          ["OPS", dec3(row.OPS)], ["安打", row.安打], ["本塁打", row.本塁打], ["打点", row.打点], ["盗塁", row.盗塁],
        ];
    return `<div class="metric-grid wide-metrics monthly-metrics">${items.map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>`;
  }

  function render(section, rows, month, activeTeam, activeName) {
    const target = rows.find((row) => row.month === month && row.チーム === activeTeam && M.playerNameKey(row.選手名) === M.playerNameKey(activeName))
      || rows.find((row) => row.month === month && M.playerNameKey(row.選手名) === M.playerNameKey(activeName))
      || null;
    section.querySelector(".monthly-current-label").textContent = M.monthLabel(month, section.dataset.showYear === "true");
    section.querySelector(".monthly-selected-stats").innerHTML = statsMarkup(target);
    section.querySelector(".monthly-list-link").href = `./monthly-stats?${new URLSearchParams({ type, month }).toString()}`;
    section.querySelectorAll(".monthly-month-tab").forEach((button) => {
      const active = button.dataset.month === month;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function createSection(rows, activeTeam, activeName) {
    const playerRows = rows.filter((row) => row.チーム === activeTeam && M.playerNameKey(row.選手名) === M.playerNameKey(activeName));
    const months = [...new Set(playerRows.map((row) => row.month).filter(Boolean))].sort();
    if (!months.length) return null;
    const showYear = new Set(months.map((key) => key.slice(0, 4))).size > 1;
    const section = document.createElement("section");
    section.className = "content-card monthly-player-section";
    section.id = "monthlyPlayerStats";
    section.dataset.showYear = showYear ? "true" : "false";
    section.innerHTML = `
      <div class="section-heading monthly-heading">
        <div><p class="eyebrow">Monthly</p><h2>月別成績</h2></div>
        <a class="text-link monthly-list-link" href="./monthly-stats?type=${esc(type)}">月別成績・ランキング一覧</a>
      </div>
      <p class="small-note monthly-player-note">月を選ぶと、この選手の月間成績だけが切り替わります。</p>
      <div class="monthly-month-tabs" role="tablist" aria-label="月を選択">
        ${months.map((key) => `<button type="button" class="monthly-month-tab" role="tab" data-month="${esc(key)}" aria-selected="false">${esc(M.monthLabel(key, showYear))}</button>`).join("")}
      </div>
      <div class="monthly-block monthly-player-block">
        <div class="monthly-subheading"><h3><span class="monthly-current-label"></span>の成績</h3></div>
        <div class="monthly-selected-stats"></div>
      </div>`;
    section.querySelectorAll(".monthly-month-tab").forEach((button) => {
      button.addEventListener("click", () => render(section, rows, button.dataset.month, activeTeam, activeName));
    });
    render(section, rows, months[months.length - 1], activeTeam, activeName);
    return section;
  }

  let mounting = false;
  async function tryMount() {
    if (mounting || document.getElementById("monthlyPlayerStats")) return;
    const content = document.getElementById("playerContent");
    if (!content) return;
    const cards = [...content.children].filter((node) => node.classList?.contains("content-card"));
    if (cards.length < 2 || cards[0].textContent.trim() === "データ読込中") return;
    const hero = content.querySelector(".player-hero-card");
    const mainStats = cards[1];
    if (!hero || !mainStats || mainStats.querySelector("h2")?.textContent.trim() !== "主な成績") return;
    mounting = true;
    try {
      const rows = await M.load(type);
      const activeTeam = D.shortTeam(hero.querySelector(".eyebrow")?.textContent || params.get("team") || "");
      const activeName = hero.querySelector("h2")?.textContent.trim() || params.get("name") || "";
      const section = createSection(rows, activeTeam, activeName);
      if (section && !document.getElementById("monthlyPlayerStats")) mainStats.insertAdjacentElement("afterend", section);
    } catch (_) {
      // Player page should keep working even when monthly data cannot be read.
    } finally {
      mounting = false;
    }
  }

  const content = document.getElementById("playerContent");
  if (content) new MutationObserver(tryMount).observe(content, { childList: true, subtree: false });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryMount, { once: true });
  else tryMount();
})();
