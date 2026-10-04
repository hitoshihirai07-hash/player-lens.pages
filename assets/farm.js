(function () {
  'use strict';
  const D = window.PlayerLensFarm;
  const $ = id => document.getElementById(id);
  const pageSize = 20;
  const state = { data: null, seasons: [], view: 'batters', district: 'all', team: 'all', search: '', page: 1, request: 0 };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (value, digits) => value === null || value === undefined ? '—' : digits === undefined ? String(value) : Number(value).toFixed(digits);
  const normalizeName = value => value.normalize('NFKC').replace(/\s/g, '').toLowerCase();
  function metrics(p, kind) {
    const r = p.raw;
    return kind === 'batters' ? [
      ['試合', r.試合], ['打席', r.打席], ['打数', r.打数], ['打率', fmt(p.avg, 3)], ['OPS', fmt(p.ops, 3)],
      ['本塁打', r.本塁打], ['打点', r.打点], ['安打', r.安打], ['四球', r.四球], ['三振', r.三振], ['盗塁', r.盗塁],
      ['出塁率', r.出塁率], ['長打率', r.長打率], ['最終出場日', r.最終出場日],
    ] : [
      ['登板', r.登板], ['投球回', r.投球回], ['防御率', fmt(p.era, 2)], ['奪三振', r.奪三振], ['四球', r.四球],
      ['K/9', fmt(p.k9, 2)], ['BB/9', fmt(p.bb9, 2)], ['K/BB', p.walks === 0 ? '—（四球0）' : fmt(p.kbb, 2)],
      ['勝', r.勝], ['敗', r.敗], ['セーブ', r.セーブ], ['最終登板日', r.最終登板日],
    ];
  }
  function metricList(items) {
    return '<dl class="farm-metrics">' + items.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value === '' || value == null ? '—' : value)}</dd></div>`).join('') + '</dl>';
  }
  function fillTeams() {
    const entries = [...state.data.teams].filter(([, district]) => state.district === 'all' || district === state.district);
    if (!entries.some(([team]) => team === state.team)) state.team = 'all';
    $('farmTeam').innerHTML = `<option value="all">全${entries.length}球団</option>` + entries.map(([team]) => `<option value="${escape(team)}">${escape(team)}</option>`).join('');
    $('farmTeam').value = state.team;
  }
  function renderRankings() {
    const kind = state.view;
    const list = state.data[kind].filter(p => (state.district === 'all' || p.district === state.district)
      && (state.team === 'all' || p.team === state.team) && normalizeName(p.name).includes(normalizeName(state.search)));
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    const visible = list.slice(start, start + pageSize);
    const batter = kind === 'batters';
    $('farmRankingTitle').textContent = batter ? '野手ランキング' : '投手ランキング';
    document.querySelector('.farm-table-caption').textContent = `${batter ? '野手' : '投手'}のファーム公式戦成績`;
    $('farmResultCount').textContent = `${list.length}人${list.length ? ` / ${start + 1}〜${start + visible.length}人` : ''}`;
    const heads = ['順位', '選手', '球団', '独自スコア', ...(batter ? ['打席', '打率', 'OPS', '本塁打'] : ['投球回', '防御率', 'K/9', '奪三振'])];
    $('farmRankingHead').innerHTML = '<tr>' + heads.map(h => `<th scope="col">${h}</th>`).join('') + '</tr>';
    $('farmRankingBody').innerHTML = visible.map((p, i) => {
      const id = `farmDetail${i}`;
      const values = batter ? [p.pa, fmt(p.avg, 3), fmt(p.ops, 3), p.hr] : [p.raw.投球回, fmt(p.era, 2), fmt(p.k9, 2), p.k];
      return `<tr data-team="${escape(p.team)}"><td>${fmt(p.rank)}</td><td><button class="farm-name-button" type="button" aria-expanded="false" aria-controls="${id}">${escape(p.name)}</button></td><td>${escape(p.team)}</td><td class="farm-score">${fmt(p.score, 1)}</td>${values.map(v => `<td>${escape(fmt(v))}</td>`).join('')}</tr>`
        + `<tr class="farm-detail-row" id="${id}" hidden><td colspan="8">${metricList(metrics(p, kind))}</td></tr>`;
    }).join('');
    $('farmCards').innerHTML = visible.map(p => {
      const all = metrics(p, kind);
      const primaryLabels = batter ? ['打席', '打率', 'OPS', '本塁打', '打点', '安打'] : ['登板', '投球回', '防御率', '奪三振', 'K/9', 'BB/9'];
      return `<article class="farm-player-card" data-team="${escape(p.team)}"><div class="farm-player-top"><div><h3>${fmt(p.rank)}位 ${escape(p.name)}</h3><p>${escape(p.team)} · ${escape(p.district)}</p></div><div class="farm-player-score"><span>独自スコア</span><strong>${fmt(p.score, 1)}</strong></div></div>${metricList(all.filter(([label]) => primaryLabels.includes(label)))}<details><summary>詳細成績を開く</summary>${metricList(all.filter(([label]) => !primaryLabels.includes(label)))}</details></article>`;
    }).join('');
    $('farmEmpty').hidden = list.length !== 0;
    $('farmPagination').hidden = list.length === 0;
    $('farmPrev').disabled = state.page <= 1;
    $('farmNext').disabled = state.page >= pages;
    $('farmPageCount').textContent = `${state.page} / ${pages}ページ`;
  }
  function renderStandings() {
    const fields = ['順位', '球団', '試合', '勝', '敗', '分', '勝率', '差'];
    const districts = state.data.districts.filter(d => state.district === 'all' || d === state.district);
    $('farmDistrictTables').innerHTML = districts.map(district => {
      const rows = state.data.standings.filter(r => r.district === district).sort((a, b) => a.rank - b.rank);
      return `<article class="content-card" data-district="${escape(district)}"><h3>${escape(district)} <small>(${rows.length}球団)</small></h3><div class="compact-table-wrap"><table class="compact-table farm-standings"><caption>${escape(district)}の公式戦最終順位</caption><thead><tr>${fields.map(f => `<th scope="col">${f}</th>`).join('')}</tr></thead><tbody>${rows.map(r => '<tr>' + fields.map(f => `<td>${escape(f === '球団' ? r.team : r.raw[f] || '—')}</td>`).join('') + '</tr>').join('')}</tbody></table></div></article>`;
    }).join('');
  }
  function render() {
    const standings = state.view === 'standings';
    for (const button of $('farmViewButtons').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    $('farmTeam').closest('label').hidden = standings;
    $('farmSearch').closest('label').hidden = standings;
    $('farmRankings').hidden = !state.data || standings;
    $('farmStandings').hidden = !state.data || !standings;
    if (!state.data) return;
    if (standings) renderStandings();
    else renderRankings();
  }
  async function fetchText(path) {
    const response = await fetch(new URL(path, document.baseURI), { cache: 'no-store' });
    if (!response.ok) throw new Error('ファームのCSVまたは年度設定を読み込めません。');
    return response.text();
  }
  async function loadYear(year) {
    const request = ++state.request;
    state.data = null;
    for (const id of ['farmDistrict', 'farmTeam', 'farmSearch']) $(id).disabled = true;
    $('farmError').hidden = true;
    $('farmStatus').textContent = `${year}年のファーム成績を読み込んでいます。`;
    render();
    try {
      const files = ['batter_stats', 'pitcher_stats', 'standings'];
      const rows = await Promise.all(files.map(async name => D.parseCsv(await fetchText(`./data/farm/farm_${name}_${year}.csv`))));
      if (request !== state.request) return;
      state.data = D.buildDataset(...rows, year);
      state.district = 'all'; state.team = 'all'; state.page = 1;
      $('farmDistrict').innerHTML = '<option value="all">全地区</option>' + state.data.districts.map(d => `<option>${escape(d)}</option>`).join('');
      fillTeams();
      for (const id of ['farmYear', 'farmDistrict', 'farmTeam', 'farmSearch']) $(id).disabled = false;
      const season = state.seasons.find(s => s.year === Number(year));
      const label = season?.label || '公式戦成績';
      $('farmTitle').textContent = `${year}年 ファーム成績`;
      document.title = `${year}年 ファーム成績 | Player Lens`;
      $('farmSeasonDescription').textContent = `${year}年ファーム${label}`;
      $('farmDistrictDescription').textContent = `${year}年は${state.data.districts.map(d => d.replace(/地区$/, '')).join('・')}の${state.data.districts.length}地区制です。`;
      $('farmSourceNote').textContent = `データ：${year}年ファーム${label}CSV（野手成績・投手成績・地区順位）。`;
      $('farmStatus').textContent = `${year}年 · ${state.data.teams.size}球団 · 野手${state.data.batters.length}人 / 投手${state.data.pitchers.length}人 · ${label}`;
      render();
    } catch (error) {
      if (request !== state.request) return;
      state.data = null;
      $('farmError').hidden = false;
      $('farmErrorText').textContent = `${error.message} CSV3ファイル・年度列・球団名を確認してから、再読み込みしてください。`;
      $('farmStatus').textContent = '成績の読み込みに失敗しました。';
      render();
    }
  }
  async function initialize() {
    try {
      const config = JSON.parse(await fetchText('./data/farm/seasons.json'));
      if (!Array.isArray(config.seasons) || !config.seasons.length || config.seasons.some(s => !Number.isInteger(s.year) || s.year < 2000 || s.year > 9999)) throw new Error('年度設定を確認してください。');
      state.seasons = config.seasons.slice().sort((a, b) => b.year - a.year);
      const query = Number(new URLSearchParams(location.search).get('year'));
      const year = state.seasons.some(s => s.year === query) ? query : state.seasons.some(s => s.year === config.defaultYear) ? config.defaultYear : state.seasons[0].year;
      $('farmYear').innerHTML = state.seasons.map(s => `<option value="${s.year}">${s.year}年</option>`).join('');
      $('farmYear').value = String(year);
      $('farmYear').disabled = false;
      await loadYear(year);
    } catch (error) {
      $('farmError').hidden = false;
      $('farmErrorText').textContent = error.message;
      $('farmStatus').textContent = '年度設定を読み込めませんでした。';
    }
  }
  $('farmViewButtons').addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (!button) return;
    state.view = button.dataset.view; state.page = 1; render();
  });
  $('farmDistrict').addEventListener('change', event => { state.district = event.target.value; state.page = 1; fillTeams(); render(); });
  $('farmTeam').addEventListener('change', event => { state.team = event.target.value; state.page = 1; render(); });
  $('farmSearch').addEventListener('input', event => { state.search = event.target.value; state.page = 1; render(); });
  $('farmYear').addEventListener('change', event => {
    const url = new URL(location.href); url.searchParams.set('year', event.target.value); history.replaceState(null, '', url);
    loadYear(Number(event.target.value));
  });
  for (const [id, amount] of [['farmPrev', -1], ['farmNext', 1]]) {
    $(id).addEventListener('click', () => { state.page += amount; render(); $('farmRankings').scrollIntoView({ block: 'start' }); });
  }
  $('farmRankingBody').addEventListener('click', event => {
    const button = event.target.closest('.farm-name-button');
    if (!button) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    $(button.getAttribute('aria-controls')).hidden = !open;
  });
  $('farmRetry').addEventListener('click', initialize);
  initialize();
})();
