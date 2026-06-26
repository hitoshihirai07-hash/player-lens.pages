(async function () {
  const D = window.PlayerLensData;
  const POSITIONS = ["投手", "捕手", "内野手", "外野手"];
  const STATUS = {
    active: "登録中",
    deregistered: "抹消中",
  };

  const leagueSelect = document.getElementById("rosterLeague");
  const teamSelect = document.getElementById("rosterTeam");
  const deregisteredFilter = document.getElementById("deregisteredFilter");
  const summaryEl = document.getElementById("rosterSummary");
  const teamTableEl = document.getElementById("rosterTeamTable");
  const teamCountEl = document.getElementById("rosterTeamCount");
  const breakdownTitleEl = document.getElementById("rosterBreakdownTitle");
  const breakdownEl = document.getElementById("rosterBreakdown");
  const deregisteredCountEl = document.getElementById("deregisteredCount");
  const deregisteredTableEl = document.getElementById("deregisteredTable");
  const updatedAtEl = document.getElementById("rosterUpdatedAt");
  const activeRosterViewerEl = document.getElementById("activeRosterViewer");
  let sourceRows = [];

  function isControlled(row) {
    return row["区分"] === "支配下";
  }

  function isDevelopment(row) {
    return row["区分"] === "育成";
  }

  function parseDate(value) {
    const match = String(value || "").trim().match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function todayAtMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function addDays(date, days) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function differenceInDays(from, to) {
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  function formatDate(value) {
    const date = value instanceof Date ? value : parseDate(value);
    if (!date) return "-";
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function reentryInfo(row) {
    const deregisteredDate = parseDate(row["抹消日"]);
    if (!deregisteredDate) {
      return { deregisteredDate: null, eligibleDate: null, daysUntil: null, label: "-", state: "unknown" };
    }
    const eligibleDate = addDays(deregisteredDate, 10);
    const daysUntil = differenceInDays(todayAtMidnight(), eligibleDate);
    if (daysUntil > 0) {
      return { deregisteredDate, eligibleDate, daysUntil, label: `あと${daysUntil}日`, state: "waiting" };
    }
    if (daysUntil === 0) {
      return { deregisteredDate, eligibleDate, daysUntil, label: "本日から可能", state: "eligible" };
    }
    return { deregisteredDate, eligibleDate, daysUntil, label: "再登録可能", state: "eligible" };
  }

  function scopeRows(rows) {
    const league = leagueSelect.value;
    const team = teamSelect.value;
    return rows.filter((row) => (league === "all" || row["リーグ"] === league) && (team === "all" || row["チーム"] === team));
  }

  function selectedTeams(rows) {
    return [...new Set(rows.map((row) => row["チーム"]))];
  }

  function countRows(rows, predicate) {
    return rows.reduce((sum, row) => sum + (predicate(row) ? 1 : 0), 0);
  }

  function teamSummary(rows, team) {
    const teamRows = rows.filter((row) => row["チーム"] === team);
    const controlled = teamRows.filter(isControlled);
    const development = teamRows.filter(isDevelopment);
    const active = controlled.filter((row) => row["現在登録中"] === STATUS.active);
    const deregistered = controlled.filter((row) => row["現在登録中"] === STATUS.deregistered);
    const unregistered = controlled.filter((row) => !row["現在登録中"]);
    const byPosition = Object.fromEntries(POSITIONS.map((position) => [position, {
      controlled: countRows(controlled, (row) => row["ポジション"] === position),
      development: countRows(development, (row) => row["ポジション"] === position),
      active: countRows(active, (row) => row["ポジション"] === position),
      deregistered: countRows(deregistered, (row) => row["ポジション"] === position),
      unregistered: countRows(unregistered, (row) => row["ポジション"] === position),
    }]));
    return {
      team,
      league: D.leagueOfTeam(team),
      controlled: controlled.length,
      development: development.length,
      active: active.length,
      deregistered: deregistered.length,
      unregistered: unregistered.length,
      byPosition,
    };
  }

  function positionCell(summary, position) {
    const item = summary.byPosition[position];
    return `<span class="roster-position-cell">支 ${item.controlled} / 育 ${item.development}</span>`;
  }

  function teamUrl(team) {
    const slug = D.TEAM_SLUGS[team];
    return slug ? `./teams/${slug}` : "./teams.html";
  }

  function renderSummary(rows) {
    const controlled = rows.filter(isControlled);
    const active = controlled.filter((row) => row["現在登録中"] === STATUS.active);
    const deregistered = controlled.filter((row) => row["現在登録中"] === STATUS.deregistered);
    const development = rows.filter(isDevelopment);

    summaryEl.innerHTML = [
      ["一軍登録中", active.length],
      ["支配下", controlled.length],
      ["育成", development.length],
      ["抹消中", deregistered.length],
    ].map(([label, value]) => `<article class="summary-card"><span>${D.escapeHtml(label)}</span><strong>${Number(value).toLocaleString("ja-JP")}</strong></article>`).join("");
  }

  function renderTeamTable(rows) {
    const teams = selectedTeams(rows).sort((a, b) => {
      const leagueDiff = D.leagueOfTeam(a).localeCompare(D.leagueOfTeam(b), "ja");
      return leagueDiff || a.localeCompare(b, "ja");
    });
    const summaries = teams.map((team) => teamSummary(rows, team));
    teamCountEl.textContent = `${summaries.length}球団`;

    teamTableEl.innerHTML = summaries.length ? `
      <div class="compact-table-wrap">
        <table class="compact-table roster-summary-table">
          <thead>
            <tr>
              <th>リーグ</th>
              <th>球団</th>
              <th>一軍登録中</th>
              <th>支配下</th>
              <th>育成</th>
              <th>抹消中</th>
              <th>今季一軍未登録</th>
              <th>投手（支 / 育）</th>
              <th>捕手（支 / 育）</th>
              <th>内野手（支 / 育）</th>
              <th>外野手（支 / 育）</th>
              <th>登録中一覧</th>
            </tr>
          </thead>
          <tbody>
            ${summaries.map((summary) => `
              <tr>
                <td>${D.escapeHtml(summary.league)}</td>
                <td><a href="${teamUrl(summary.team)}">${D.escapeHtml(summary.team)}</a></td>
                <td>${summary.active}</td>
                <td>${summary.controlled}</td>
                <td>${summary.development}</td>
                <td>${summary.deregistered}</td>
                <td>${summary.unregistered}</td>
                <td>${positionCell(summary, "投手")}</td>
                <td>${positionCell(summary, "捕手")}</td>
                <td>${positionCell(summary, "内野手")}</td>
                <td>${positionCell(summary, "外野手")}</td>
                <td><button class="roster-view-button" type="button" data-active-team="${D.escapeHtml(summary.team)}" aria-controls="activeRosterViewer" aria-expanded="false">一軍登録中を表示</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="empty-state">該当する球団がありません。</p>`;
    D.enhanceCompactTables(teamTableEl);
  }

  function activeRosterRows(rows, team) {
    return rows.filter((row) => (
      row["チーム"] === team
      && isControlled(row)
      && row["現在登録中"] === STATUS.active
    ));
  }

  function updateActiveRosterButtons(activeTeam = "") {
    teamTableEl.querySelectorAll("[data-active-team]").forEach((button) => {
      const isOpen = !activeRosterViewerEl.hidden && button.dataset.activeTeam === activeTeam;
      button.setAttribute("aria-expanded", String(isOpen));
      button.textContent = isOpen ? "一覧を閉じる" : "一軍登録中を表示";
    });
  }

  function closeActiveRoster() {
    activeRosterViewerEl.hidden = true;
    activeRosterViewerEl.dataset.team = "";
    activeRosterViewerEl.innerHTML = "";
    updateActiveRosterButtons();
  }

  function activeRosterGroup(position, rows) {
    const players = rows.filter((row) => row["ポジション"] === position);
    return `
      <section class="active-roster-group">
        <div class="active-roster-group-heading">
          <h3>${D.escapeHtml(position)}</h3>
          <span>${players.length}人</span>
        </div>
        ${players.length ? `
          <ul class="active-roster-player-list">
            ${players.map((row) => `
              <li>
                <span class="active-roster-player-name">${D.escapeHtml(row["選手名"])}</span>
                <span class="active-roster-player-date">最新登録日：${formatDate(row["登録日"])}</span>
              </li>
            `).join("")}
          </ul>
        ` : `<p class="active-roster-empty">現在登録中の選手はいません。</p>`}
      </section>
    `;
  }

  function renderActiveRoster(rows, team, scrollIntoView = false) {
    const activeRows = activeRosterRows(rows, team);
    const teamName = D.TEAM_TO_FULL[team] || team;
    activeRosterViewerEl.dataset.team = team;
    activeRosterViewerEl.hidden = false;
    activeRosterViewerEl.innerHTML = `
      <div class="active-roster-viewer-heading">
        <div>
          <p class="eyebrow">Active Roster</p>
          <h2>${D.escapeHtml(teamName)}の一軍登録中メンバー</h2>
          <p class="small-note">支配下選手のうち、CSVの「現在登録中」が登録中の選手を表示しています。</p>
        </div>
        <button class="active-roster-close-button" type="button" data-close-active-roster>閉じる</button>
      </div>
      <div class="active-roster-total"><strong>${activeRows.length}人</strong>が一軍登録中</div>
      <div class="active-roster-grid">
        ${POSITIONS.map((position) => activeRosterGroup(position, activeRows)).join("")}
      </div>
    `;
    updateActiveRosterButtons(team);
    if (scrollIntoView) {
      activeRosterViewerEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function headingForScope(rows) {
    const teams = selectedTeams(rows);
    if (teams.length === 1) return `${D.TEAM_TO_FULL[teams[0]] || teams[0]}のポジション別内訳`;
    if (leagueSelect.value === "セ") return "セ・リーグ6球団のポジション別内訳";
    if (leagueSelect.value === "パ") return "パ・リーグ6球団のポジション別内訳";
    return "12球団合計のポジション別内訳";
  }

  function renderBreakdown(rows) {
    // Build the selected scope aggregate directly.
    const controlled = rows.filter(isControlled);
    const development = rows.filter(isDevelopment);
    const active = controlled.filter((row) => row["現在登録中"] === STATUS.active);
    const deregistered = controlled.filter((row) => row["現在登録中"] === STATUS.deregistered);
    const unregistered = controlled.filter((row) => !row["現在登録中"]);
    const items = POSITIONS.map((position) => ({
      position,
      controlled: countRows(controlled, (row) => row["ポジション"] === position),
      development: countRows(development, (row) => row["ポジション"] === position),
      active: countRows(active, (row) => row["ポジション"] === position),
      deregistered: countRows(deregistered, (row) => row["ポジション"] === position),
      unregistered: countRows(unregistered, (row) => row["ポジション"] === position),
    }));
    const total = {
      position: "合計",
      controlled: controlled.length,
      development: development.length,
      active: active.length,
      deregistered: deregistered.length,
      unregistered: unregistered.length,
    };

    breakdownTitleEl.textContent = headingForScope(rows);
    breakdownEl.innerHTML = `
      <div class="compact-table-wrap">
        <table class="compact-table roster-breakdown-table">
          <thead>
            <tr>
              <th>ポジション</th>
              <th>支配下</th>
              <th>育成</th>
              <th>一軍登録中</th>
              <th>抹消中</th>
              <th>今季一軍未登録</th>
            </tr>
          </thead>
          <tbody>
            ${[...items, total].map((item) => `
              <tr>
                <td>${D.escapeHtml(item.position)}</td>
                <td>${item.controlled}</td>
                <td>${item.development}</td>
                <td>${item.active}</td>
                <td>${item.deregistered}</td>
                <td>${item.unregistered}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDeregistered(rows) {
    const records = rows
      .filter((row) => isControlled(row) && row["現在登録中"] === STATUS.deregistered)
      .map((row) => ({ ...row, reentry: reentryInfo(row) }))
      .filter((row) => {
        const mode = deregisteredFilter.value;
        if (mode === "waiting") return row.reentry.state === "waiting";
        if (mode === "eligible") return row.reentry.state === "eligible";
        return true;
      })
      .sort((a, b) => {
        const aWaiting = a.reentry.state === "waiting" ? 0 : 1;
        const bWaiting = b.reentry.state === "waiting" ? 0 : 1;
        if (aWaiting !== bWaiting) return aWaiting - bWaiting;
        if (aWaiting === 0) return (a.reentry.daysUntil ?? Infinity) - (b.reentry.daysUntil ?? Infinity);
        const aDate = a.reentry.deregisteredDate?.getTime() || 0;
        const bDate = b.reentry.deregisteredDate?.getTime() || 0;
        return bDate - aDate;
      });

    deregisteredCountEl.textContent = `${records.length}人`;
    deregisteredTableEl.innerHTML = records.length ? `
      <div class="compact-table-wrap">
        <table class="compact-table roster-deregistered-table">
          <thead>
            <tr>
              <th>リーグ</th>
              <th>選手</th>
              <th>球団</th>
              <th>ポジション</th>
              <th>最新登録日</th>
              <th>抹消日</th>
              <th>再登録可能日</th>
              <th>今日から</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((row) => `
              <tr>
                <td>${D.escapeHtml(row["リーグ"])}</td>
                <td>${D.escapeHtml(row["選手名"])}</td>
                <td><a href="${teamUrl(row["チーム"])}">${D.escapeHtml(row["チーム"])}</a></td>
                <td>${D.escapeHtml(row["ポジション"])}</td>
                <td>${formatDate(row["登録日"])}</td>
                <td>${formatDate(row.reentry.deregisteredDate)}</td>
                <td>${formatDate(row.reentry.eligibleDate)}</td>
                <td>${D.escapeHtml(row.reentry.label)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="empty-state">この条件に該当する抹消中の選手はいません。</p>`;
    D.enhanceCompactTables(deregisteredTableEl);
  }

  function fillTeamOptions(rows) {
    const selected = new URLSearchParams(location.search).get("team") || "all";
    const allTeams = Object.keys(D.TEAM_TO_FULL);
    teamSelect.innerHTML = ["<option value=\"all\">全12球団</option>", ...allTeams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`)].join("");
    teamSelect.value = allTeams.includes(selected) ? selected : "all";
  }

  function syncTeamOptions() {
    const league = leagueSelect.value;
    const selected = teamSelect.value;
    const teams = Object.keys(D.TEAM_TO_FULL).filter((team) => league === "all" || D.leagueOfTeam(team) === league);
    const allLabel = league === "all" ? "全12球団" : `${league}・リーグ全6球団`;
    teamSelect.innerHTML = [`<option value="all">${allLabel}</option>`, ...teams.map((team) => `<option value="${D.escapeHtml(team)}">${D.escapeHtml(team)}</option>`)].join("");
    teamSelect.value = teams.includes(selected) ? selected : "all";
  }

  function render(rows) {
    const scoped = scopeRows(rows);
    renderSummary(scoped);
    renderTeamTable(scoped);
    renderBreakdown(scoped);
    renderDeregistered(scoped);

    const activeTeam = activeRosterViewerEl.dataset.team || "";
    if (activeTeam && scoped.some((row) => row["チーム"] === activeTeam)) {
      renderActiveRoster(scoped, activeTeam);
    } else {
      closeActiveRoster();
    }
  }

  try {
    const rows = await D.loadRosterData();
    fillTeamOptions(rows);
    const updated = rows.map((row) => row["更新日"]).filter(Boolean).sort().at(-1);
    updatedAtEl.textContent = updated ? `最終更新：${formatDate(updated)}` : "最終更新日：確認中";

    sourceRows = rows;

    teamTableEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-active-team]");
      if (!button) return;
      const team = button.dataset.activeTeam || "";
      if (!team) return;

      if (!activeRosterViewerEl.hidden && activeRosterViewerEl.dataset.team === team) {
        closeActiveRoster();
        return;
      }
      renderActiveRoster(scopeRows(sourceRows), team, true);
    });

    activeRosterViewerEl.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-active-roster]")) {
        closeActiveRoster();
      }
    });

    leagueSelect.addEventListener("change", () => {
      syncTeamOptions();
      render(rows);
    });
    teamSelect.addEventListener("change", () => render(rows));
    deregisteredFilter.addEventListener("change", () => render(rows));
    render(rows);
  } catch (error) {
    const message = D.escapeHtml(error?.message || "データを読み込めませんでした。");
    summaryEl.innerHTML = `<article class="summary-card"><span>読込状況</span><strong>確認必要</strong></article>`;
    teamTableEl.innerHTML = `<p class="empty-state">${message}</p>`;
    breakdownEl.innerHTML = "";
    deregisteredTableEl.innerHTML = "";
  }
})();
