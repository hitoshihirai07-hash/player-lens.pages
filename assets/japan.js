(function () {
  'use strict';
  const D = window.PlayerLensData, J = window.PlayerLensJapan;
  const $ = id => document.getElementById(id), e = D.escapeHtml;
  const state = { config: null, events: [], data: null, position: 'all', search: '', page: 1, warnings: [] };
  const pageSize = 6;
  const detailPage = document.body.dataset.japanPage === 'detail';
  const safeUrl = value => /^https:\/\//.test(String(value || '')) ? value : null;
  const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`) : '未設定';
  const period = event => event.startDate ? `${dateLabel(event.startDate)}〜${event.endDate ? dateLabel(event.endDate) : '終了日未設定'}` : '開催期間未設定';
  const detailUrl = event => `./japan-tournament?${new URLSearchParams({ year: event.year, tournament: event.tournament })}`;
  async function fetchText(path) {
    if (!path) throw new Error('データファイルが設定されていません。');
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('データファイルを読み込めませんでした。');
    return response.text();
  }
  async function seasonRows(path, label) {
    try { return D.parseCsv(await fetchText(path)); }
    catch (_) { state.warnings.push(`${label}を読み込めませんでした。該当情報は「—」または未取得と表示します。`); return []; }
  }
  function renderEvents() {
    $('japanEvents').innerHTML = state.events.map(event => `
      <article class="content-card japan-event-card">
        <p class="eyebrow">${e(event.year)}年・日本代表</p>
        <h2><a href="${e(detailUrl(event))}">${e(event.name)}</a></h2>
        <p>${e(period(event))}</p>
        <p class="small-note">${e([event.location, event.venue].filter(Boolean).join(' / ') || '開催地・会場未設定')}</p>
        <div class="japan-event-counts"><span>選手 ${event.players}名</span><span>監督・コーチ ${event.staff}名</span></div>
        <p>${e(event.description || '大会情報は準備中です。登録メンバーを確認できます。')}</p>
        <p class="small-note">${e(event.rosterNote || '')}</p>
        <a class="text-link" href="${e(detailUrl(event))}">大会詳細・代表メンバーを見る →</a>
      </article>`).join('');
    $('japanStatus').textContent = `${state.events.length}大会を掲載しています。`;
  }
  function renderOverview() {
    const { event, season, players, staff } = state.data;
    document.title = `${event.name} | 日本代表 | Player Lens`;
    const canonical = new URL(detailUrl(event), location.href).href;
    document.querySelector('link[rel="canonical"]').href = canonical;
    document.querySelector('meta[property="og:url"]').content = canonical;
    document.querySelector('meta[property="og:title"]').content = document.title;
    $('japanTitle').textContent = event.name;
    $('japanLead').textContent = `${event.year}年の大会概要と日本代表メンバー${season ? `、${season.year}年シーズン成績` : ''}を確認できます。`;
    $('japanOverview').innerHTML = `
      <p class="eyebrow">${e(event.year)}年・日本代表</p><h2>大会詳細</h2>
      <dl class="japan-overview-list"><div><dt>大会名</dt><dd>${e(event.name)}</dd></div>
        <div><dt>開催年</dt><dd>${e(event.year)}年</dd></div>
        <div><dt>開催期間</dt><dd>${e(period(event))}</dd></div>
        <div><dt>開催地・会場</dt><dd>${e([event.location, event.venue].filter(Boolean).join(' / ') || '未設定')}</dd></div>
        <div><dt>代表メンバー</dt><dd>選手 ${players.length}名 / 監督・コーチ ${staff.length}名</dd></div></dl>
      <p>${e(event.description || '大会概要は未設定です。')}</p>
      ${event.rosterNote ? `<p class="small-note">${e(event.rosterNote)}</p>` : ''}
      <div class="japan-source-links">${(event.sources || []).filter(source => safeUrl(source.url)).map(source => `<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.label)}</a>`).join('')}</div>
      ${event.sourceCheckedAt ? `<p class="small-note">大会情報の公式確認日：${e(dateLabel(event.sourceCheckedAt))}</p>` : ''}`;
    $('japanAgeNote').textContent = event.startDate ? `年齢は大会開始日（${dateLabel(event.startDate)}）時点の満年齢です。${season ? `プロ年数・成績は${season.year}年シーズン時点。` : ''}成績はNPBシーズンの記録です。` : '大会開始日が未設定のため年齢は表示できません。';
    $('japanStaffCount').textContent = `${staff.length}名`;
    $('japanStaff').innerHTML = staff.map(member => `<article class="japan-staff-card"><span class="japan-number" aria-label="背番号${e(member.number)}">${e(member.number)}</span><div><h3>${e(member.name)}</h3><p>${e(member.role)}</p></div></article>`).join('');
    $('japanDetail').hidden = false;
  }
  function metrics(items) {
    return `<dl class="japan-metrics">${items.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`;
  }
  function playerCard(player) {
    const { season } = state.data;
    const canLink = player.stats && Number(season?.year) === Number(state.config.currentPlayerPageSeason);
    const name = canLink ? `<a href="${e(D.playerUrl({ ...player.stats, チーム: D.shortTeam(player.stats.チーム) }, player.position === '投手' ? 'pitcher' : 'batter'))}">${e(player.name)}</a>` : e(player.name);
    const items = J.statItems(player);
    const primaryKeys = player.position === '投手' ? ['登板', '防御率', '投球回'] : ['試合', '打率', '本塁打'];
    return `<article class="japan-player-card content-card">
      <div class="japan-card-heading"><span class="japan-number" aria-label="背番号${e(player.number)}">${e(player.number)}</span>
        <div><h3 class="japan-player-name">${name}</h3><p class="japan-team">${e(player.team)}</p></div></div>
      <div class="japan-labels"><span class="japan-position">${e(player.position)}</span>${player.oa ? '<span class="japan-oa">OA枠</span>' : ''}</div>
      <dl class="japan-profile"><div><dt>年齢</dt><dd>${player.age === null ? '—' : `${player.age}歳`}</dd></div>
        <div><dt>プロ年数${season ? `（${e(season.year)}年）` : ''}</dt><dd>${player.proYears === null ? '—' : `${player.proYears}年目`}</dd></div></dl>
      ${!player.master ? '<p class="small-note">選手マスターとの一致を確認できません。</p>' : ''}
      ${items.length ? `<p class="japan-season-label">${e(season.year)}年 NPBシーズン成績</p>${metrics(items.filter(([key]) => primaryKeys.includes(key)))}
        <details class="japan-stats"><summary>シーズン成績をすべて見る</summary>${metrics(items)}</details>`
        : '<p class="japan-no-stats">シーズン成績は未取得です。</p>'}
      </article>`;
  }
  function renderPlayers() {
    const players = state.data.players.filter(player => state.position === 'all' || player.position === state.position).filter(player => !state.search || J.nameKey(player.name).includes(state.search));
    const pages = Math.max(1, Math.ceil(players.length / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    $('japanPlayers').innerHTML = players.slice(start, start + pageSize).map(playerCard).join('');
    $('japanPlayerCount').textContent = `${players.length}名`;
    $('japanEmpty').hidden = players.length !== 0;
    $('japanPagination').hidden = players.length <= pageSize;
    $('japanPageCount').textContent = `${state.page} / ${pages}ページ（${start + 1}〜${Math.min(start + pageSize, players.length)}名）`;
    $('japanPrev').disabled = state.page <= 1;
    $('japanNext').disabled = state.page >= pages;
    for (const button of $('japanPositions').querySelectorAll('button')) {
      const count = state.data.players.filter(player => button.dataset.position === 'all' || player.position === button.dataset.position).length;
      button.setAttribute('aria-pressed', String(button.dataset.position === state.position));
      button.querySelector('span').textContent = ` ${count}`;
    }
  }
  function showWarnings() {
    if (!state.warnings.length) return;
    $('japanWarning').textContent = state.warnings.join(' ');
    $('japanWarning').hidden = false;
  }
  async function start() {
    $('japanError').hidden = true;
    $('japanWarning').hidden = true;
    state.warnings = [];
    try {
      state.config = JSON.parse(await fetchText('./data/national-team/tournaments.json'));
      const roster = D.parseCsv(await fetchText(state.config.rosterFile));
      if (!roster.length || !['年', '大会', '区分', '役職・ポジション', '背番号', '氏名', '所属球団', '備考'].every(column => Object.hasOwn(roster[0], column))) throw new Error('代表CSVの必須列を確認してください。');
      state.events = J.eventsFromRoster(roster, state.config.tournaments || []);
      if (!detailPage) { renderEvents(); return; }
      const params = new URLSearchParams(location.search);
      const event = state.events.find(event => J.eventKey(event.year, event.tournament) === J.eventKey(params.get('year'), params.get('tournament')));
      if (!event) throw new Error('指定された大会がありません。大会一覧から選択してください。');
      const season = state.config.seasons?.[event.dataSeason] || null;
      if (!event.configured) state.warnings.push('大会情報が未設定です。登録メンバーのみ表示しています。');
      if (!season) state.warnings.push('成績年度が未設定です。シーズン成績・プロ年数は未取得と表示します。');
      const [masters, batters, pitchers] = season ? await Promise.all([
        seasonRows(season.master, '選手マスター'), seasonRows(season.batters, '野手成績'), seasonRows(season.pitchers, '投手成績')
      ]) : [[], [], []];
      state.data = J.buildTournament(roster, event, season, masters, batters, pitchers);
      renderOverview(); renderPlayers(); showWarnings();
      $('japanStatus').textContent = '代表メンバーを読み込みました。';
    } catch (error) {
      $('japanStatus').textContent = '';
      $('japanErrorText').textContent = error.message;
      $('japanError').hidden = false;
    }
  }
  $('japanRetry').addEventListener('click', start);
  if (detailPage) {
    $('japanPositions').addEventListener('click', event => {
      const button = event.target.closest('button[data-position]');
      if (!button || !state.data) return;
      state.position = button.dataset.position; state.page = 1; renderPlayers();
    });
    $('japanSearch').addEventListener('input', () => {
      if (!state.data) return;
      state.search = J.nameKey($('japanSearch').value); state.page = 1; renderPlayers();
    });
    for (const [id, step] of [['japanPrev', -1], ['japanNext', 1]]) $(id).addEventListener('click', () => {
      state.page += step; renderPlayers();
      $('japanRosterHeading').scrollIntoView({ block: 'start' });
    });
  }
  start();
})();
