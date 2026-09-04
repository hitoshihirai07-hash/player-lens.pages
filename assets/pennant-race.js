(async function () {
  const dataApi = window.PlayerLensData;
  const updated = document.getElementById("pennantUpdated");
  const magicCard = document.getElementById("pennantMagicCard");
  const csList = document.getElementById("pennantCsList");
  const csTitle = document.getElementById("pennantCsTitle");
  const warning = document.getElementById("pennantScheduleWarning");
  const tabs = Array.from(document.querySelectorAll("[data-league]"));

  let rows = [];
  let selectedLeague = "セリーグ";

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function int(row, key) {
    const value = Number.parseInt(String(row?.[key] ?? "").replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(value) ? value : null;
  }

  function formatBasisDate(value) {
    const match = String(value || "").match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    return match ? `${Number(match[2])}月${Number(match[3])}日終了時点` : String(value || "更新日不明");
  }

  function formatShortDate(value) {
    const match = String(value || "").match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    return match ? `${Number(match[2])}/${Number(match[3])}` : "";
  }

  function pctText(row) {
    const raw = Number.parseFloat(String(row?.["勝率"] || ""));
    if (Number.isFinite(raw)) return raw.toFixed(3).replace(/^0/, "");
    const wins = int(row, "勝利") || 0;
    const losses = int(row, "敗戦") || 0;
    return wins + losses ? (wins / (wins + losses)).toFixed(3).replace(/^0/, "") : "-";
  }

  function leagueRows(league) {
    return rows
      .filter((row) => String(row["リーグ"] || "").trim() === league)
      .slice()
      .sort((a, b) => (int(a, "順位") || 99) - (int(b, "順位") || 99));
  }

  function magicState(leader) {
    const status = String(leader?.["優勝状況"] || "").trim();
    const magic = int(leader, "優勝マジック");
    if (/優勝確定/.test(status) || magic === 0) return { type: "clinched", label: "優勝決定" };
    if (Number.isFinite(magic) && magic > 0) return { type: "magic", label: `M${magic}`, magic };
    return { type: "off", label: status || "マジック未点灯" };
  }

  function renderMagic(leagueData) {
    const leader = leagueData[0];
    if (!leader) {
      magicCard.innerHTML = '<p class="pennant-loading">データがありません。</p>';
      return;
    }

    const state = magicState(leader);
    const target = String(leader["マジック対象"] || "").trim();
    const earliest = formatShortDate(leader["理論上最短優勝日"]);
    const nextCondition = String(leader["次回マジック条件"] || "").trim();

    if (state.type === "clinched") {
      magicCard.className = "pennant-magic-card is-clinched";
      magicCard.innerHTML = `
        <div class="pennant-magic-topline"><span>${esc(leader["順位"])}位</span><strong>${esc(leader["球団"])}</strong></div>
        <div class="pennant-champion-mark" aria-hidden="true">🏆</div>
        <div class="pennant-magic-value is-clinched">優勝決定</div>
        <p class="pennant-magic-note">${esc(selectedLeague.replace("リーグ", "・リーグ"))}の優勝が決まりました。</p>`;
      return;
    }

    magicCard.className = `pennant-magic-card${state.type === "off" ? " is-off" : ""}`;
    magicCard.innerHTML = `
      <div class="pennant-magic-topline"><span>${esc(leader["順位"])}位</span><strong>${esc(leader["球団"])}</strong></div>
      <div class="pennant-magic-label">優勝マジック</div>
      <div class="pennant-magic-value">${esc(state.label)}</div>
      <div class="pennant-magic-meta">
        <div><span>最短優勝</span><strong>${esc(earliest || "-")}</strong></div>
        <div><span>マジック対象</span><strong>${esc(target || "-")}</strong></div>
      </div>
      ${nextCondition ? `<div class="pennant-today"><span>次にマジックが動く条件</span><strong>${esc(nextCondition)}</strong></div>` : ""}`;
  }

  function csStatusMarkup(row) {
    const unscheduled = int(row, "日程未定試合数") || 0;
    const status = String(row["CS状況"] || "").trim();
    const needed = int(row, "CS自力最短まであと勝");
    const earliest = formatShortDate(row["自力最短CS確定日"]);

    if (unscheduled > 0) {
      return `<div class="pennant-cs-status is-warning"><strong>判定保留</strong><span>振替日未発表 ${unscheduled}試合</span></div>`;
    }
    if (/CS進出確定/.test(status) || needed === 0) {
      return '<div class="pennant-cs-status is-clinched"><strong>CS進出決定</strong><span>3位以内が確定</span></div>';
    }
    if (Number.isFinite(needed) && needed > 0) {
      return `<div class="pennant-cs-status"><strong>自力確定まで最短あと${needed}勝</strong>${earliest ? `<span>最短 ${esc(earliest)}</span>` : ""}</div>`;
    }
    return '<div class="pennant-cs-status is-muted"><strong>自力での確定は不可</strong><span>他球団の結果が必要</span></div>';
  }

  function renderCs(leagueData) {
    csTitle.textContent = `${selectedLeague === "セリーグ" ? "セ" : "パ"}・リーグ CS進出争い`;
    csList.innerHTML = leagueData.map((row, index) => {
      const rank = int(row, "順位") || index + 1;
      const remaining = int(row, "残り試合");
      const zoneClass = rank <= 3 ? " is-cs-zone" : "";
      const lineClass = rank === 4 ? " is-below-cs-line" : "";
      return `
        <article class="pennant-cs-row${zoneClass}${lineClass}">
          <div class="pennant-rank" aria-label="${rank}位">${rank}</div>
          <div class="pennant-team">
            <strong>${esc(row["球団"])}</strong>
            <span>勝率 ${esc(pctText(row))} ・ 残${remaining ?? "-"}</span>
          </div>
          ${csStatusMarkup(row)}
        </article>`;
    }).join("");
  }

  function renderWarning(leagueData) {
    const pending = leagueData.filter((row) => (int(row, "日程未定試合数") || 0) > 0);
    if (!pending.length) {
      warning.hidden = true;
      warning.innerHTML = "";
      return;
    }

    const cards = new Map();
    pending.forEach((row) => {
      const team = String(row["球団"] || "");
      const text = String(row["日程未定カード"] || "").trim();
      if (text) cards.set(team, text);
    });
    const detail = Array.from(cards, ([team, text]) => `${team}：${text}`).join(" / ");

    warning.hidden = false;
    warning.innerHTML = `
      <strong>⚠ 振替日未発表の試合があります</strong>
      <p>${esc(detail)}。該当球団のCS自力最短確定日は、振替日程がデータに反映された後に再計算されます。</p>`;
  }

  function render(league) {
    selectedLeague = league;
    tabs.forEach((tab) => {
      const active = tab.dataset.league === league;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    const data = leagueRows(league);
    renderMagic(data);
    renderCs(data);
    renderWarning(data);
  }

  function bindTabs() {
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => render(tab.dataset.league));
      tab.addEventListener("keydown", (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + delta + tabs.length) % tabs.length];
        next.focus();
        render(next.dataset.league);
      });
    });
  }

  try {
    if (!dataApi?.loadPennantRaceData) throw new Error("ペナントレースデータ読込機能がありません");
    rows = await dataApi.loadPennantRaceData();
    if (!rows.length) throw new Error("ペナントレースデータが空です");

    const latest = rows.map((row) => String(row["更新基準日"] || "")).filter(Boolean).sort().at(-1) || "";
    updated.innerHTML = `<strong>${esc(formatBasisDate(latest))}</strong>`;

    bindTabs();
    render(selectedLeague);
  } catch (error) {
    updated.textContent = "データ読込エラー";
    magicCard.innerHTML = '<p class="pennant-loading">ペナントレースデータを読み込めませんでした。</p>';
    csList.innerHTML = '<p class="pennant-loading">時間をおいて再度確認してください。</p>';
    console.error(error);
  }
})();
