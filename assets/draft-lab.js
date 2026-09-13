(() => {
  'use strict';

  const DATA_URL = './data/draft_candidates_2026.csv';
  const ratingOrder = new Map([['S', 1], ['A', 2], ['B', 3], ['C', 4], ['D', 5], ['未評価', 9]]);
  const categoryOrder = new Map([['高校', 1], ['大学', 2], ['社会人', 3], ['独立', 4], ['その他', 5]]);
  const positionOrder = ['投手', '捕手', '内野手', '外野手', '不明'];

  const state = {
    players: [],
    mode: 'board',
    selectedId: null,
  };

  const els = {
    status: document.getElementById('draftStatus'),
    summaryAll: document.getElementById('summaryAll'),
    summarySubmitted: document.getElementById('summarySubmitted'),
    summaryTop: document.getElementById('summaryTop'),
    summaryUnrated: document.getElementById('summaryUnrated'),
    tabs: [...document.querySelectorAll('.draft-tab')],
    search: document.getElementById('draftSearch'),
    category: document.getElementById('categoryFilter'),
    position: document.getElementById('positionFilter'),
    rating: document.getElementById('ratingFilter'),
    declaration: document.getElementById('declarationFilter'),
    declarationWrap: document.getElementById('declarationFilterWrap'),
    reset: document.getElementById('resetFilters'),
    body: document.getElementById('draftTableBody'),
    resultCount: document.getElementById('draftResultCount'),
    listTitle: document.getElementById('draftListTitle'),
    listNote: document.getElementById('draftListNote'),
    detail: document.getElementById('draftDetailPanel'),
    dialog: document.getElementById('draftDialog'),
    dialogContent: document.getElementById('draftDialogContent'),
    dialogClose: document.getElementById('draftDialogClose'),
  };

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(field);
        field = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(field);
        field = '';
        if (row.some((cell) => cell !== '')) rows.push(row);
        row = [];
      } else {
        field += char;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    const [headers, ...records] = rows;
    return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }

  function normalize(value) {
    return String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  }

  function setText(element, value) {
    element.textContent = value == null || value === '' ? '—' : String(value);
  }

  function addOptions(select, values) {
    values.filter(Boolean).forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function initFilters() {
    const categories = [...new Set(state.players.map((p) => p.category))]
      .sort((a, b) => (categoryOrder.get(a) ?? 99) - (categoryOrder.get(b) ?? 99));
    const positions = [...new Set(state.players.map((p) => p.position))]
      .sort((a, b) => positionOrder.indexOf(a) - positionOrder.indexOf(b));
    addOptions(els.category, categories);
    addOptions(els.position, positions);
  }

  function renderSummary() {
    const submitted = state.players.filter((p) => p.is_submitted === '1').length;
    const top = state.players.filter((p) => p.rating === 'S' || p.rating === 'A').length;
    const unrated = state.players.filter((p) => p.rating === '未評価').length;
    setText(els.summaryAll, state.players.length);
    setText(els.summarySubmitted, submitted);
    setText(els.summaryTop, top);
    setText(els.summaryUnrated, unrated);
  }

  function matchesFilters(player) {
    const query = normalize(els.search.value);
    if (query && ![player.name, player.affiliation, player.league, player.traits].some((v) => normalize(v).includes(query))) return false;
    if (els.category.value !== 'all' && player.category !== els.category.value) return false;
    if (els.position.value !== 'all' && player.position !== els.position.value) return false;
    if (els.rating.value !== 'all' && player.rating !== els.rating.value) return false;
    if (state.mode === 'submitted' && player.is_submitted !== '1') return false;
    if (state.mode === 'board' && els.declaration.value !== 'all' && player.declaration_status !== els.declaration.value) return false;
    return true;
  }

  function sortPlayers(players) {
    return [...players].sort((a, b) => {
      if (state.mode === 'submitted') {
        const dateDiff = String(b.declaration_date || '').localeCompare(String(a.declaration_date || ''));
        if (dateDiff !== 0) return dateDiff;
      }
      const ratingDiff = (ratingOrder.get(a.rating) ?? 99) - (ratingOrder.get(b.rating) ?? 99);
      if (ratingDiff !== 0) return ratingDiff;
      const categoryDiff = (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99);
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name, 'ja');
    });
  }

  function makeCell(value) {
    const td = document.createElement('td');
    td.textContent = value || '—';
    return td;
  }

  function renderTable() {
    const visible = sortPlayers(state.players.filter(matchesFilters));
    els.body.replaceChildren();
    setText(els.resultCount, `${visible.length}人`);

    if (!visible.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.className = 'draft-empty';
      td.textContent = '条件に一致する候補がありません。';
      tr.append(td);
      els.body.append(tr);
      return;
    }

    visible.forEach((player) => {
      const tr = document.createElement('tr');
      tr.dataset.playerId = player.player_id;
      if (player.player_id === state.selectedId) tr.classList.add('is-selected');

      const ratingTd = document.createElement('td');
      const rating = document.createElement('span');
      rating.className = 'draft-rating';
      rating.dataset.rating = player.rating || '未評価';
      rating.textContent = player.rating || '—';
      ratingTd.append(rating);
      tr.append(ratingTd);

      const nameTd = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'draft-player-button';
      button.textContent = player.name;
      button.addEventListener('click', () => selectPlayer(player.player_id));
      nameTd.append(button);
      tr.append(nameTd);

      tr.append(makeCell(player.affiliation));
      tr.append(makeCell(player.category));
      tr.append(makeCell(player.position));
      tr.append(makeCell(`${player.throws || '—'}投${player.bats || '—'}打`));
      tr.append(makeCell(player.expected_round));

      const statusTd = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = `draft-status-chip${player.is_submitted === '1' ? ' is-submitted' : ''}`;
      chip.textContent = player.declaration_status || '—';
      statusTd.append(chip);
      tr.append(statusTd);
      els.body.append(tr);
    });
  }

  function appendStat(container, label, value) {
    const item = document.createElement('div');
    item.className = 'draft-detail-stat';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value || '—';
    item.append(span, strong);
    container.append(item);
  }

  function appendBlock(container, title, text) {
    if (!text) return;
    const block = document.createElement('section');
    block.className = 'draft-detail-block';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    block.append(h3, p);
    container.append(block);
  }

  function buildDetail(player, forDialog = false) {
    const wrapper = document.createElement('article');
    wrapper.className = 'draft-player-detail';

    const head = document.createElement('div');
    head.className = 'draft-detail-title';
    const titleWrap = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.id = forDialog ? 'draftDialogTitle' : '';
    h2.textContent = player.name;
    const meta = document.createElement('p');
    meta.className = 'draft-detail-meta';
    meta.textContent = `${player.category}｜${player.affiliation}${player.league ? `｜${player.league}` : ''}`;
    titleWrap.append(h2, meta);
    const rating = document.createElement('span');
    rating.className = 'draft-rating';
    rating.dataset.rating = player.rating || '未評価';
    rating.textContent = player.rating || '—';
    head.append(titleWrap, rating);
    wrapper.append(head);

    const grid = document.createElement('div');
    grid.className = 'draft-detail-grid';
    appendStat(grid, 'メインポジション', player.position);
    appendStat(grid, '投打', `${player.throws || '—'}投${player.bats || '—'}打`);
    appendStat(grid, '想定指名ゾーン', player.expected_round);
    appendStat(grid, '志望届', player.declaration_status || '—');
    appendStat(grid, '公示日', player.declaration_date || '—');
    appendStat(grid, 'スカウト視察', player.scout_teams || '—');
    wrapper.append(grid);

    appendBlock(wrapper, '選手特徴', player.traits);
    appendBlock(wrapper, '主な実績', player.achievements);
    appendBlock(wrapper, 'スカウト評価概要', player.scout_summary);
    if (player.condition && player.condition !== '未確認') appendBlock(wrapper, 'コンディション', player.condition);

    if (player.source_url) {
      const sourceBlock = document.createElement('section');
      sourceBlock.className = 'draft-detail-block';
      const h3 = document.createElement('h3');
      h3.textContent = '情報源';
      const link = document.createElement('a');
      link.className = 'draft-source-link';
      link.href = player.source_url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = '参照元を開く';
      sourceBlock.append(h3, link);
      wrapper.append(sourceBlock);
    }

    return wrapper;
  }

  function selectPlayer(playerId) {
    const player = state.players.find((p) => p.player_id === playerId);
    if (!player) return;
    state.selectedId = playerId;
    renderTable();
    els.detail.replaceChildren(buildDetail(player));

    if (window.matchMedia('(max-width: 820px)').matches && typeof els.dialog.showModal === 'function') {
      els.dialogContent.replaceChildren(buildDetail(player, true));
      els.dialog.showModal();
    }
  }

  function setMode(mode) {
    state.mode = mode;
    els.tabs.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const submitted = mode === 'submitted';
    els.declarationWrap.hidden = submitted;
    els.listTitle.textContent = submitted ? '志望届提出者' : 'ドラフトボード';
    els.listNote.textContent = submitted ? '公示日が新しい順に表示します。' : '評価順に候補を表示します。';
    renderTable();
  }

  function resetFilters() {
    els.search.value = '';
    els.category.value = 'all';
    els.position.value = 'all';
    els.rating.value = 'all';
    els.declaration.value = 'all';
    renderTable();
  }

  function bindEvents() {
    els.tabs.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
    [els.search, els.category, els.position, els.rating, els.declaration].forEach((control) => {
      control.addEventListener(control === els.search ? 'input' : 'change', renderTable);
    });
    els.reset.addEventListener('click', resetFilters);
    els.dialogClose.addEventListener('click', () => els.dialog.close());
    els.dialog.addEventListener('click', (event) => {
      if (event.target === els.dialog) els.dialog.close();
    });
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      state.players = parseCsv(text.replace(/^\uFEFF/, '')).filter((player) => player.player_id);
      if (!state.players.length) throw new Error('候補データが空です');
      initFilters();
      renderSummary();
      bindEvents();
      setMode('board');
      els.status.textContent = `${state.players.length}人 公開中`;
      els.status.classList.add('is-ready');
    } catch (error) {
      console.error(error);
      els.status.textContent = 'データ読込エラー';
      els.status.classList.remove('is-ready');
      els.status.classList.add('is-error');
      els.body.innerHTML = '<tr><td colspan="8" class="draft-empty">候補データを読み込めませんでした。</td></tr>';
    }
  }

  init();
})();
