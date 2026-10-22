(() => {
  'use strict';

  const MIN_YEAR = 2025;
  const PAGE_SIZE = 20;
  const TEAM_ORDER = [
    '阪神タイガース', '横浜DeNAベイスターズ', '読売ジャイアンツ',
    '中日ドラゴンズ', '広島東洋カープ', '東京ヤクルトスワローズ',
    '福岡ソフトバンクホークス', '北海道日本ハムファイターズ',
    'オリックス・バファローズ', '東北楽天ゴールデンイーグルス',
    '埼玉西武ライオンズ', '千葉ロッテマリーンズ',
  ];
  const byId = (id) => document.getElementById(id);
  const ui = {
    year: byId('draftYear'), team: byId('draftTeam'), type: byId('draftType'),
    position: byId('draftPosition'), search: byId('draftSearch'), reset: byId('draftReset'),
    total: byId('summaryTotal'), regular: byId('summaryRegular'), development: byId('summaryDevelopment'),
    dataStatus: byId('dataStatus'), count: byId('draftCount'),
    message: byId('draftMessage'), wrapper: byId('draftTableWrapper'),
    body: byId('draftResultsBody'), cards: byId('draftMobileCards'),
    pager: byId('draftPagination'), previous: byId('draftPrev'), next: byId('draftNext'),
    pageLabel: byId('draftPageLabel'),
  };
  const state = { recordsByYear: new Map(), year: null, page: 1 };

  function csvMatrix(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    const source = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (char === '"') {
        if (quoted && source[i + 1] === '"') { field += '"'; i += 1; }
        else { quoted = !quoted; }
      } else if (char === ',' && !quoted) {
        row.push(field); field = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && source[i + 1] === '\n') i += 1;
        row.push(field);
        if (row.some((entry) => entry.trim() !== '')) rows.push(row);
        row = []; field = '';
      } else { field += char; }
    }
    if (quoted) throw new Error('CSVの引用符が閉じられていません');
    row.push(field);
    if (row.some((entry) => entry.trim() !== '')) rows.push(row);
    return rows;
  }

  function parseRecords(text, year) {
    const matrix = csvMatrix(text);
    if (!matrix.length) throw new Error(`${year}年CSVにヘッダーがありません`);
    const header = matrix[0].map((value) => value.trim());
    const required = ['年度', '球団', '区分', '指名', '名前', 'ポジション', '所属', '投', '打', '備考'];
    if (required.some((field) => !header.includes(field))) {
      throw new Error(`${year}年CSVの列が不足しています`);
    }
    return matrix.slice(1).map((cells) => {
      const record = {};
      header.forEach((name, i) => { record[name] = (cells[i] || '').trim(); });
      return record;
    }).filter((record) => record['名前'] && record['球団'] && record['年度'] === String(year));
  }

  async function loadYear(year) {
    if (state.recordsByYear.has(year)) return state.recordsByYear.get(year);
    const response = await fetch(`./data/draft/${year}.csv`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${year}年CSVの読み込みに失敗しました（HTTP ${response.status}）`);
    const records = parseRecords(await response.text(), year);
    state.recordsByYear.set(year, records);
    return records;
  }

  function displayName(team) {
    const aliases = {
      '阪神タイガース': '阪神', '横浜DeNAベイスターズ': 'DeNA',
      '読売ジャイアンツ': '巨人', '中日ドラゴンズ': '中日',
      '広島東洋カープ': '広島', '東京ヤクルトスワローズ': 'ヤクルト',
      '福岡ソフトバンクホークス': 'ソフトバンク',
      '北海道日本ハムファイターズ': '日本ハム',
      'オリックス・バファローズ': 'オリックス',
      '東北楽天ゴールデンイーグルス': '楽天',
      '埼玉西武ライオンズ': '西武', '千葉ロッテマリーンズ': 'ロッテ',
    };
    return aliases[team] || team;
  }

  function rankNumber(record) {
    const match = String(record['指名']).match(/\d+/);
    return match ? Number(match[0]) : 999;
  }
  function compareRecords(a, b) {
    const first = TEAM_ORDER.indexOf(a['球団']);
    const second = TEAM_ORDER.indexOf(b['球団']);
    const teamCompare = (first === -1 ? 999 : first) - (second === -1 ? 999 : second);
    if (teamCompare) return teamCompare;
    const contract = (a['区分'] === '育成') - (b['区分'] === '育成');
    if (contract) return contract;
    return rankNumber(a) - rankNumber(b);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function noteBadge(value) {
    return value ? element('span', 'draft-note', value) : element('span', 'draft-muted', '—');
  }
  function renderRow(record) {
    const row = document.createElement('tr');
    const team = element('td', 'draft-team-cell');
    team.append(element('span', '', displayName(record['球団'])));
    team.title = record['球団'];
    const rank = element('td');
    rank.append(element('span', `draft-rank${record['区分'] === '育成' ? ' draft-development-rank' : ''}`, record['指名']));
    const name = element('td', 'draft-player-name', record['名前']);
    const position = element('td', '', record['ポジション'] || '—');
    const school = element('td', '', record['所属'] || '—');
    const hands = element('td', '', `${record['投'] || '—'}投${record['打'] || '—'}打`);
    const note = element('td'); note.append(noteBadge(record['備考']));
    row.append(team, rank, name, position, school, hands, note);
    return row;
  }
  function renderCard(record) {
    const card = element('article', 'draft-mobile-card');
    const top = element('div', 'draft-card-top');
    top.append(element('span', 'draft-card-team', displayName(record['球団'])));
    top.append(element('span', 'draft-rank', record['指名']));
    const name = element('h4', 'draft-card-name', record['名前']);
    const details = element('p', 'draft-card-detail', `${record['ポジション']} ／ ${record['所属']} ／ ${record['投']}投${record['打']}打`);
    card.append(top, name, details);
    if (record['備考']) {
      const note = element('div', 'draft-card-note');
      note.append(noteBadge(record['備考'])); card.append(note);
    }
    return card;
  }

  function matching(records) {
    const query = ui.search.value.trim().toLocaleLowerCase('ja-JP');
    return records.filter((record) => (
      (ui.team.value === 'all' || record['球団'] === ui.team.value) &&
      (ui.type.value === 'all' || record['区分'] === ui.type.value) &&
      (ui.position.value === 'all' || record['ポジション'] === ui.position.value) &&
      (!query || [record['名前'], record['所属'], record['球団']].some((field) => (field || '').toLocaleLowerCase('ja-JP').includes(query)))
    ));
  }
  function resetPage() { state.page = 1; render(); }
  function showMessage(message) {
    ui.message.textContent = message;
    ui.message.hidden = false;
    ui.wrapper.hidden = true;
    ui.cards.hidden = true;
    ui.pager.hidden = true;
  }
  function updateTeamOptions(records) {
    const oldValue = ui.team.value;
    const present = new Set(records.map((record) => record['球団']));
    const ordered = [...present].sort((a,b) => {
      const ia = TEAM_ORDER.indexOf(a), ib = TEAM_ORDER.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    ui.team.replaceChildren(new Option('12球団すべて', 'all'));
    ordered.forEach((name) => ui.team.add(new Option(displayName(name), name)));
    ui.team.value = present.has(oldValue) ? oldValue : 'all';
  }
  function render() {
    if (!state.year) return;
    const records = state.recordsByYear.get(state.year) || [];
    const total = records.length;
    ui.total.textContent = total;
    ui.regular.textContent = records.filter((record) => record['区分'] === '支配下').length;
    ui.development.textContent = records.filter((record) => record['区分'] === '育成').length;
    ui.dataStatus.textContent = `${state.year}年データ`;
    if (!total) {
      ui.count.textContent = '0人';
      showMessage(`${state.year}年の指名結果は未登録です。${state.year}.csvに選手が追加されると、このページに表示されます。`);
      return;
    }
    const found = matching(records).sort(compareRecords);
    ui.count.textContent = `${found.length}人を表示対象にしています（全${total}人）`;
    if (!found.length) { showMessage('この条件に一致する指名選手はいません。'); return; }
    ui.message.hidden = true;
    const pages = Math.ceil(found.length / PAGE_SIZE);
    state.page = Math.max(1, Math.min(state.page, pages));
    const start = (state.page - 1) * PAGE_SIZE;
    const visible = found.slice(start, start + PAGE_SIZE);
    ui.body.replaceChildren(...visible.map(renderRow));
    ui.cards.replaceChildren(...visible.map(renderCard));
    ui.wrapper.hidden = false;
    ui.cards.hidden = false;
    ui.pager.hidden = pages < 2;
    ui.pageLabel.textContent = `${state.page} / ${pages} ページ`;
    ui.previous.disabled = state.page === 1;
    ui.next.disabled = state.page >= pages;
  }

  async function changeYear(year) {
    state.year = year;
    state.page = 1;
    ui.dataStatus.textContent = 'CSVを読み込み中';
    showMessage('指名結果を読み込み中…');
    try {
      const records = await loadYear(year);
      if (String(state.year) !== String(year)) return;
      updateTeamOptions(records);
      if (typeof history !== 'undefined' && history.replaceState) {
        const url = new URL(location.href);
        url.searchParams.set('year', year);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
      render();
    } catch (error) {
      ui.dataStatus.textContent = '読込エラー';
      ui.count.textContent = 'データを表示できません';
      ui.total.textContent = '--'; ui.regular.textContent = '--'; ui.development.textContent = '--';
      showMessage(`${year}年のCSVを読み込めませんでした。${error.message}`);
    }
  }

  function bind() {
    ui.year.addEventListener('change', () => changeYear(Number(ui.year.value)));
    [ui.team, ui.type, ui.position].forEach((control) => control.addEventListener('change', resetPage));
    ui.search.addEventListener('input', resetPage);
    ui.reset.addEventListener('click', () => {
      ui.team.value = 'all'; ui.type.value = 'all'; ui.position.value = 'all'; ui.search.value = ''; resetPage();
    });
    ui.previous.addEventListener('click', () => { state.page -= 1; render(); });
    ui.next.addEventListener('click', () => { state.page += 1; render(); });
  }

  async function init() {
    bind();
    const maxYear = Math.max(2026, Math.min(2040, new Date().getFullYear() + 1));
    const candidates = Array.from({length: maxYear - MIN_YEAR + 1}, (_, i) => MIN_YEAR + i);
    const found = await Promise.all(candidates.map(async (year) => {
      try { return {year, records: await loadYear(year)}; }
      catch { return null; }
    }));
    const years = found.filter(Boolean);
    if (!years.length) {
      ui.year.replaceChildren(new Option('データなし', ''));
      ui.dataStatus.textContent = '読込エラー';
      showMessage('ドラフトCSVが見つかりません。data/draft/2025.csv の配置を確認してください。');
      return;
    }
    ui.year.replaceChildren(...years.map(({year}) => new Option(`${year}年`, String(year))));
    const requested = Number(new URLSearchParams(location.search).get('year'));
    const selected = years.some((item) => item.year === requested) ? requested :
      [...years].reverse().find((item) => item.records.length)?.year || years[years.length - 1].year;
    ui.year.value = String(selected);
    await changeYear(selected);
  }
  init();
})();
