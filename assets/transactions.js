(function () {
  'use strict';
  const D = window.PlayerLensTransactions;
  const $ = id => document.getElementById(id);
  const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teamOrder = ['巨人', '阪神', 'DeNA', '広島', 'ヤクルト', '中日', 'ソフトバンク', '日本ハム', 'オリックス', '楽天', '西武', 'ロッテ'];
  const pageSize = 20;
  const state = { config: null, rows: [], page: 1, request: 0, loaded: false };
  function options(id, values, requested = 'all') {
    $(id).innerHTML = '<option value="all">すべて</option>' + values.map(value => `<option value="${e(value)}">${e(value)}</option>`).join('');
    $(id).value = values.includes(requested) ? requested : 'all';
  }
  function filters() {
    return { team: $('transactionsTeam').value, type: $('transactionsType').value,
      contract: $('transactionsContract').value, search: $('transactionsSearch').value };
  }
  function syncUrl() {
    const url = new URL(location.href), f = filters();
    url.searchParams.set('year', $('transactionsYear').value);
    for (const key of ['team', 'type', 'contract']) {
      if (f[key] === 'all') url.searchParams.delete(key); else url.searchParams.set(key, f[key]);
    }
    if (f.search) url.searchParams.set('q', f.search); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }
  function badge(value) {
    const tone = value === '戦力外' ? ' is-release' : value === '引退' ? ' is-retired' : '';
    return value ? `<span class="transaction-badge${tone}">${e(value)}</span>` : '';
  }
  function render() {
    if (!state.loaded) return;
    const rows = D.filterRows(state.rows, filters());
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, pages);
    const visible = rows.slice((state.page - 1) * pageSize, state.page * pageSize);
    $('transactionsCount').textContent = `表示：${rows.length}件`;
    $('transactionsBody').innerHTML = visible.map(row => `<tr>
      <td>${e(D.dateLabel(row.発生日))}</td><td>${e(row.球団)}</td><td class="transaction-name">${e(row.選手名)}</td>
      <td>${badge(row.区分)}</td><td>${e(row.契約区分)}</td><td>${e(row['元の移籍元・移籍先'])}</td>
      <td>${e(row.内容)}</td><td>${e(row.備考)}</td></tr>`).join('');
    $('transactionsCards').innerHTML = visible.map(row => `<article class="transaction-card">
      <div class="transaction-top"><time>${e(D.dateLabel(row.発生日))}</time><strong>${e(row.球団)}</strong></div>
      <h3>${e(row.選手名)}</h3><div class="transaction-labels">${badge(row.区分)}${row.契約区分 ? `<span class="transaction-contract">${e(row.契約区分)}</span>` : ''}</div>
      ${row['元の移籍元・移籍先'] ? `<p class="transaction-move">${e(row['元の移籍元・移籍先'])}</p>` : ''}
      ${row.内容 ? `<p>${e(row.内容)}</p>` : ''}${row.備考.trim() ? `<p class="transaction-note">${e(row.備考)}</p>` : ''}</article>`).join('');
    $('transactionsEmpty').hidden = rows.length > 0;
    $('transactionsTable').hidden = rows.length === 0;
    $('transactionsPagination').hidden = rows.length <= pageSize;
    $('transactionsPage').textContent = `${state.page} / ${pages}ページ`;
    $('transactionsPrev').disabled = state.page === 1;
    $('transactionsNext').disabled = state.page === pages;
    syncUrl();
  }
  async function fetchText(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('入退団データを読み込めませんでした。');
    return response.text();
  }
  function setBusy(busy) {
    for (const id of ['transactionsYear', 'transactionsTeam', 'transactionsType', 'transactionsContract', 'transactionsSearch', 'transactionsReset']) $(id).disabled = busy;
    $('transactionsResults').setAttribute('aria-busy', String(busy));
  }
  async function loadYear(year, requested = filters()) {
    const request = ++state.request;
    state.loaded = false;
    setBusy(true);
    $('transactionsStatus').hidden = false;
    $('transactionsStatus').textContent = '入退団データを読み込んでいます。';
    $('transactionsError').hidden = true;
    $('transactionsResults').hidden = true;
    $('transactionsUpdated').textContent = '最終更新：読み込み中';
    try {
      const rows = D.parseCsv(await fetchText(`./data/transactions/npb_transactions_${year}.csv`));
      if (request !== state.request) return;
      const columns = ['年度', '発生日', '球団', '選手名', '区分', '契約区分', '内容', '元の移籍元・移籍先', '備考', '更新日'];
      if (rows.some(row => columns.some(column => !Object.hasOwn(row, column)))) throw new Error('CSVの列構成を確認してください。');
      if (rows.some(row => String(row.年度).trim() !== String(year))) throw new Error('CSVの年度とファイル名が一致していません。');
      state.rows = D.sortRows(rows);
      state.page = 1;
      const teams = D.values(rows, '球団');
      options('transactionsTeam', [...teamOrder, ...teams.filter(team => !teamOrder.includes(team))], requested.team);
      options('transactionsType', D.values(rows, '区分'), requested.type);
      options('transactionsContract', D.values(rows, '契約区分'), requested.contract);
      $('transactionsSearch').value = requested.search || '';
      $('transactionsYear').value = String(year);
      const updated = D.latestUpdate(rows);
      $('transactionsUpdated').textContent = updated ? `最終更新：${updated}` : '最終更新：未記載';
      state.loaded = true;
      $('transactionsResults').hidden = false;
      $('transactionsStatus').hidden = true;
      setBusy(false);
      render();
    } catch (error) {
      if (request !== state.request) return;
      $('transactionsStatus').hidden = true;
      $('transactionsUpdated').textContent = '最終更新：未取得';
      $('transactionsErrorText').textContent = error.message;
      $('transactionsError').hidden = false;
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    try {
      state.config = JSON.parse(await fetchText('./data/transactions/seasons.json'));
      const years = [...new Set(state.config.seasons.map(season => Number(season.year)))].sort((a, b) => b - a);
      if (!years.length || years.some(year => !Number.isInteger(year) || year < 1900 || year > 9999)) throw new Error('年度設定を確認してください。');
      $('transactionsYear').innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
      const params = new URLSearchParams(location.search);
      const requestedYear = Number(params.get('year') || state.config.defaultYear);
      const year = years.includes(requestedYear) ? requestedYear : years[0];
      await loadYear(year, { team: params.get('team') || 'all', type: params.get('type') || 'all',
        contract: params.get('contract') || 'all', search: params.get('q') || '' });
    } catch (error) {
      state.config = null;
      $('transactionsStatus').hidden = true;
      $('transactionsUpdated').textContent = '最終更新：未取得';
      $('transactionsErrorText').textContent = error.message;
      $('transactionsError').hidden = false;
      setBusy(false);
    }
  }
  $('transactionsYear').addEventListener('change', () => loadYear($('transactionsYear').value));
  for (const id of ['transactionsTeam', 'transactionsType', 'transactionsContract']) $(id).addEventListener('change', () => { state.page = 1; render(); });
  $('transactionsSearch').addEventListener('input', () => { state.page = 1; render(); });
  $('transactionsReset').addEventListener('click', () => {
    for (const id of ['transactionsTeam', 'transactionsType', 'transactionsContract']) $(id).value = 'all';
    $('transactionsSearch').value = ''; state.page = 1; render();
  });
  for (const [id, step] of [['transactionsPrev', -1], ['transactionsNext', 1]]) $(id).addEventListener('click', () => {
    state.page += step; render(); $('transactionsResults').scrollIntoView({ block: 'start' });
  });
  $('transactionsRetry').addEventListener('click', () => state.config ? loadYear($('transactionsYear').value) : start());
  window.addEventListener('popstate', start);
  start();
})();
