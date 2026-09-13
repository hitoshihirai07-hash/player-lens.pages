(() => {
  'use strict';

  const CANDIDATE_DATA_URL = './data/draft_candidates_2026.csv';
  const ROSTER_DATA_URL = './data/current_player_master.csv';
  const DRAFT_YEAR = 2026;
  const DRAFT_MONTH = 10;
  const DRAFT_DAY = 22;
  const POSITIONS = ['投手', '捕手', '内野手', '外野手'];
  const ratingOrder = new Map([['S', 1], ['A', 2], ['B', 3], ['C', 4], ['D', 5], ['未評価', 9]]);
  const categoryOrder = new Map([['高校', 1], ['大学', 2], ['社会人', 3], ['独立', 4], ['その他', 5]]);
  const positionOrder = ['投手', '捕手', '内野手', '外野手', '不明'];
  const teamAliases = {
    '読売ジャイアンツ': '巨人',
    '阪神タイガース': '阪神',
    '横浜DeNAベイスターズ': 'DeNA',
    '広島東洋カープ': '広島',
    '東京ヤクルトスワローズ': 'ヤクルト',
    '中日ドラゴンズ': '中日',
    '福岡ソフトバンクホークス': 'ソフトバンク',
    '北海道日本ハムファイターズ': '日本ハム',
    '千葉ロッテマリーンズ': 'ロッテ',
    '東北楽天ゴールデンイーグルス': '楽天',
    'オリックス・バファローズ': 'オリックス',
    '埼玉西武ライオンズ': '西武',
  };
  const teamOrder = [
    '読売ジャイアンツ', '阪神タイガース', '横浜DeNAベイスターズ', '広島東洋カープ', '東京ヤクルトスワローズ', '中日ドラゴンズ',
    '福岡ソフトバンクホークス', '北海道日本ハムファイターズ', '千葉ロッテマリーンズ', '東北楽天ゴールデンイーグルス', 'オリックス・バファローズ', '埼玉西武ライオンズ',
  ];

  const state = {
    players: [],
    roster: [],
    teamAnalyses: [],
    mode: 'board',
    selectedId: null,
    selectedTeam: '読売ジャイアンツ',
    rosterReady: false,
  };

  const els = {
    status: document.getElementById('draftStatus'),
    summaryAll: document.getElementById('summaryAll'),
    summarySubmitted: document.getElementById('summarySubmitted'),
    summaryTop: document.getElementById('summaryTop'),
    summaryUnrated: document.getElementById('summaryUnrated'),
    tabs: [...document.querySelectorAll('.draft-tab')],
    filters: document.getElementById('draftFilters'),
    workspace: document.getElementById('draftWorkspace'),
    disclaimer: document.getElementById('draftDisclaimer'),
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
    teamLensPanel: document.getElementById('teamLensPanel'),
    teamLensSelect: document.getElementById('teamLensSelect'),
    teamRosterSummary: document.getElementById('teamRosterSummary'),
    teamNeedGrid: document.getElementById('teamNeedGrid'),
    teamCompareBody: document.getElementById('teamCompareBody'),
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
    return records.map((values) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ''), values[index] ?? ''])));
  }

  function normalize(value) {
    return String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  }

  function setText(element, value) {
    element.textContent = value == null || value === '' ? '—' : String(value);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mean(values) {
    const usable = values.filter(Number.isFinite);
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
  }

  function standardDeviation(values) {
    const avg = mean(values);
    const usable = values.filter(Number.isFinite);
    if (usable.length < 2) return 0;
    return Math.sqrt(usable.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / usable.length);
  }

  function calculateAge(value) {
    const match = String(value || '').match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    let age = DRAFT_YEAR - year;
    if (DRAFT_MONTH < month || (DRAFT_MONTH === month && DRAFT_DAY < day)) age -= 1;
    return age;
  }

  function teamDisplayName(team) {
    return teamAliases[team] || team;
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

  function formatThrowsBats(player) {
    if ((!player.throws || player.throws === '未確認') && (!player.bats || player.bats === '未確認')) return '—';
    const throws = player.throws && player.throws !== '未確認' ? `${player.throws}投` : '';
    const bats = player.bats && player.bats !== '未確認' ? `${player.bats}打` : '';
    return `${throws}${bats}` || '—';
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
      tr.append(makeCell(formatThrowsBats(player)));
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
    appendStat(grid, '投打', formatThrowsBats(player));
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

  function rosterRowIsActive(row) {
    const note = row['備考'] || '';
    if (/へ移籍|退団|自由契約|契約解除/.test(note)) return false;
    return POSITIONS.includes(row['ポジション']) && (row['区分'] === '支配下' || row['区分'] === '育成');
  }

  function prepareRoster(records) {
    return records.filter(rosterRowIsActive).map((row) => ({
      team: row['球団名'],
      name: row['投手'],
      birthDate: row['生年月日'],
      age: calculateAge(row['生年月日']),
      throws: row['投'],
      bats: row['打'],
      position: row['ポジション'],
      registration: row['区分'],
      note: row['備考'],
    })).filter((row) => row.team && row.name);
  }

  function buildTeamBase(team) {
    const rows = state.roster.filter((player) => player.team === team);
    const controlled = rows.length;
    const active = rows.filter((player) => player.registration === '支配下').length;
    const development = rows.filter((player) => player.registration === '育成').length;
    const young = rows.filter((player) => Number.isFinite(player.age) && player.age <= 24).length;
    const ages = rows.filter((player) => player.registration === '支配下').map((player) => player.age).filter(Number.isFinite);
    return {
      team,
      displayName: teamDisplayName(team),
      rows,
      controlled,
      active,
      development,
      young,
      avgAge: mean(ages),
      positions: {},
    };
  }

  function buildPositionMetrics(teamBase, position) {
    const rows = teamBase.rows.filter((player) => player.position === position);
    const activeRows = rows.filter((player) => player.registration === '支配下');
    const developmentRows = rows.filter((player) => player.registration === '育成');
    const youngRows = rows.filter((player) => Number.isFinite(player.age) && player.age <= 24);
    const activeAges = activeRows.map((player) => player.age).filter(Number.isFinite);
    const weightedDepth = activeRows.length + developmentRows.length * 0.5;
    const weightedYoung = youngRows.reduce((sum, player) => sum + (player.registration === '支配下' ? 1 : 0.5), 0);
    return {
      position,
      active: activeRows.length,
      development: developmentRows.length,
      weightedDepth,
      young: youngRows.length,
      weightedYoung,
      avgAge: mean(activeAges),
      score: 50,
      priority: '中',
      reasons: [],
    };
  }

  function calculateTeamAnalyses() {
    const presentTeams = [...new Set(state.roster.map((player) => player.team))];
    const orderedTeams = [...teamOrder.filter((team) => presentTeams.includes(team)), ...presentTeams.filter((team) => !teamOrder.includes(team)).sort((a, b) => a.localeCompare(b, 'ja'))];
    const teams = orderedTeams.map(buildTeamBase);
    teams.forEach((team) => POSITIONS.forEach((position) => { team.positions[position] = buildPositionMetrics(team, position); }));

    POSITIONS.forEach((position) => {
      const metrics = teams.map((team) => team.positions[position]);
      const depthValues = metrics.map((item) => item.weightedDepth);
      const youngValues = metrics.map((item) => item.weightedYoung);
      const ageValues = metrics.map((item) => item.avgAge).filter((value) => value > 0);
      const avgDepth = mean(depthValues);
      const avgYoung = mean(youngValues);
      const avgAge = mean(ageValues);
      const sdDepth = standardDeviation(depthValues);
      const sdYoung = standardDeviation(youngValues);
      const sdAge = standardDeviation(ageValues);

      teams.forEach((team) => {
        const item = team.positions[position];
        const depthZ = sdDepth ? (avgDepth - item.weightedDepth) / sdDepth : 0;
        const youngZ = sdYoung ? (avgYoung - item.weightedYoung) / sdYoung : 0;
        const ageZ = sdAge && item.avgAge ? (item.avgAge - avgAge) / sdAge : 0;
        item.score = Math.round(clamp(50 + depthZ * 12 + youngZ * 14 + ageZ * 8, 15, 95));
        item.priority = item.score >= 68 ? '高' : item.score >= 50 ? '中' : '低';
        item.leagueAverage = { depth: avgDepth, young: avgYoung, age: avgAge };

        const reasonParts = [];
        if (item.weightedDepth < avgDepth - 0.35) reasonParts.push(`選手層 ${item.weightedDepth.toFixed(1)}人相当（平均${avgDepth.toFixed(1)}）`);
        if (item.weightedYoung < avgYoung - 0.25) reasonParts.push(`24歳以下 ${item.weightedYoung.toFixed(1)}人相当（平均${avgYoung.toFixed(1)}）`);
        if (item.avgAge && item.avgAge > avgAge + 0.5) reasonParts.push(`平均年齢 ${item.avgAge.toFixed(1)}歳（平均${avgAge.toFixed(1)}）`);
        if (!reasonParts.length) reasonParts.push('人数・若手層・年齢構成は12球団平均圏');
        item.reasons = reasonParts.slice(0, 2);
      });
    });

    state.teamAnalyses = teams;
  }

  function initTeamSelector() {
    els.teamLensSelect.replaceChildren();
    state.teamAnalyses.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.team;
      option.textContent = team.displayName;
      els.teamLensSelect.append(option);
    });
    if (!state.teamAnalyses.some((team) => team.team === state.selectedTeam)) state.selectedTeam = state.teamAnalyses[0]?.team || '';
    els.teamLensSelect.value = state.selectedTeam;
  }

  function summaryItem(label, value, note) {
    const item = document.createElement('article');
    item.className = 'team-summary-item';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value;
    const small = document.createElement('small');
    small.textContent = note;
    item.append(span, strong, small);
    return item;
  }

  function switchToPositionCandidates(position) {
    setMode('board');
    els.position.value = position;
    els.search.value = '';
    els.category.value = 'all';
    els.rating.value = 'all';
    els.declaration.value = 'all';
    renderTable();
    els.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildNeedCard(metric) {
    const card = document.createElement('article');
    card.className = 'team-need-card';
    card.dataset.priority = metric.priority;

    const head = document.createElement('div');
    head.className = 'team-need-card-head';
    const title = document.createElement('h3');
    title.textContent = metric.position;
    const score = document.createElement('strong');
    score.className = 'team-need-score';
    score.textContent = String(metric.score);
    score.setAttribute('aria-label', `補強優先度指数 ${metric.score}`);
    head.append(title, score);

    const bar = document.createElement('div');
    bar.className = 'team-need-bar';
    const fill = document.createElement('i');
    fill.style.width = `${metric.score}%`;
    bar.append(fill);

    const stats = document.createElement('dl');
    stats.className = 'team-need-stats';
    const statRows = [
      ['支配下', `${metric.active}人`],
      ['育成', `${metric.development}人`],
      ['24歳以下', `${metric.young}人`],
      ['平均年齢', metric.avgAge ? `${metric.avgAge.toFixed(1)}歳` : '—'],
    ];
    statRows.forEach(([label, value]) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      div.append(dt, dd);
      stats.append(div);
    });

    const reasons = document.createElement('p');
    reasons.className = 'team-need-reason';
    reasons.textContent = metric.reasons.join('。');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'team-candidate-link';
    button.textContent = `${metric.position}候補を見る`;
    button.addEventListener('click', () => switchToPositionCandidates(metric.position));

    card.append(head, bar, stats, reasons, button);
    return card;
  }

  function scoreCell(score, team, position) {
    const td = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lens-score-cell';
    button.dataset.level = score >= 68 ? 'high' : score >= 50 ? 'mid' : 'low';
    button.textContent = String(score);
    button.title = `${teamDisplayName(team)} ${position} 補強優先度指数 ${score}`;
    button.addEventListener('click', () => {
      state.selectedTeam = team;
      els.teamLensSelect.value = team;
      renderTeamLens();
    });
    td.append(button);
    return td;
  }

  function renderTeamComparison() {
    els.teamCompareBody.replaceChildren();
    state.teamAnalyses.forEach((team) => {
      const tr = document.createElement('tr');
      if (team.team === state.selectedTeam) tr.classList.add('is-selected');
      const teamTd = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'team-name-button';
      button.textContent = team.displayName;
      button.addEventListener('click', () => {
        state.selectedTeam = team.team;
        els.teamLensSelect.value = team.team;
        renderTeamLens();
      });
      teamTd.append(button);
      tr.append(teamTd);
      POSITIONS.forEach((position) => tr.append(scoreCell(team.positions[position].score, team.team, position)));
      const highest = [...POSITIONS].sort((a, b) => team.positions[b].score - team.positions[a].score)[0];
      const highestTd = document.createElement('td');
      highestTd.textContent = `${highest} ${team.positions[highest].score}`;
      tr.append(highestTd);
      els.teamCompareBody.append(tr);
    });
  }

  function renderTeamLens() {
    if (!state.rosterReady || !state.teamAnalyses.length) {
      els.teamRosterSummary.innerHTML = '<p class="draft-empty team-lens-error">球団データを読み込めませんでした。</p>';
      return;
    }
    const team = state.teamAnalyses.find((item) => item.team === state.selectedTeam) || state.teamAnalyses[0];
    if (!team) return;
    state.selectedTeam = team.team;
    els.teamLensSelect.value = team.team;

    els.teamRosterSummary.replaceChildren(
      summaryItem('支配下', `${team.active}人`, '現在の支配下登録'),
      summaryItem('育成', `${team.development}人`, '育成登録'),
      summaryItem('24歳以下', `${team.young}人`, '支配下・育成の合計'),
      summaryItem('支配下平均年齢', team.avgAge ? `${team.avgAge.toFixed(1)}歳` : '—', '2026年ドラフト日時点'),
    );

    els.teamNeedGrid.replaceChildren();
    [...POSITIONS]
      .sort((a, b) => team.positions[b].score - team.positions[a].score)
      .forEach((position) => els.teamNeedGrid.append(buildNeedCard(team.positions[position])));
    renderTeamComparison();
  }

  function setMode(mode) {
    state.mode = mode;
    els.tabs.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const isTeamLens = mode === 'team-lens';
    els.filters.hidden = isTeamLens;
    els.workspace.hidden = isTeamLens;
    els.teamLensPanel.hidden = !isTeamLens;
    els.disclaimer.hidden = isTeamLens;

    if (isTeamLens) {
      renderTeamLens();
      return;
    }

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
    els.teamLensSelect.addEventListener('change', () => {
      state.selectedTeam = els.teamLensSelect.value;
      renderTeamLens();
    });
  }

  async function loadCandidates() {
    const response = await fetch(CANDIDATE_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`候補データ HTTP ${response.status}`);
    const text = await response.text();
    state.players = parseCsv(text.replace(/^\uFEFF/, '')).filter((player) => player.player_id);
    if (!state.players.length) throw new Error('候補データが空です');
  }

  async function loadRoster() {
    const response = await fetch(ROSTER_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`球団データ HTTP ${response.status}`);
    const text = await response.text();
    state.roster = prepareRoster(parseCsv(text.replace(/^\uFEFF/, '')));
    if (!state.roster.length) throw new Error('球団データが空です');
    calculateTeamAnalyses();
    initTeamSelector();
    state.rosterReady = true;
  }

  async function init() {
    bindEvents();
    try {
      await loadCandidates();
      initFilters();
      renderSummary();
      setMode('board');
    } catch (error) {
      console.error(error);
      els.status.textContent = '候補データ読込エラー';
      els.status.classList.remove('is-ready');
      els.status.classList.add('is-error');
      els.body.innerHTML = '<tr><td colspan="8" class="draft-empty">候補データを読み込めませんでした。</td></tr>';
      return;
    }

    try {
      await loadRoster();
      els.status.textContent = `${state.players.length}人・12球団分析`;
      els.status.classList.add('is-ready');
    } catch (error) {
      console.error(error);
      els.status.textContent = `${state.players.length}人公開中`;
      document.getElementById('teamLensTab').disabled = true;
      document.getElementById('teamLensTab').title = '球団データを読み込めないため現在利用できません';
    }
  }

  init();
})();
