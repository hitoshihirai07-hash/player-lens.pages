(() => {
  'use strict';

  const CANDIDATE_DATA_URL = './data/draft_candidates_2026.csv';
  const ROSTER_DATA_URL = './data/current_player_master.csv';
  const DECLARATIONS_DATA_URL = './data/draft_declarations_2026.csv';
  const WATCH_STORAGE_KEY = 'playerLensDraftWatch2026';
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
  const ratingFitScore = new Map([['S', 100], ['A', 90], ['B', 78], ['C', 64], ['D', 50], ['未評価', 55]]);

  const state = {
    players: [],
    roster: [],
    teamAnalyses: [],
    declarations: [],
    watchPicks: [],
    mode: 'board',
    selectedId: null,
    selectedTeam: '読売ジャイアンツ',
    selectedFitTeam: '読売ジャイアンツ',
    selectedFitId: null,
    watchMode: 'all',
    watchTeam: '読売ジャイアンツ',
    watchPickType: '本指名',
    watchRound: '1',
    watchSort: 'rating',
    rosterReady: false,
    declarationsReady: false,
    storageReady: true,
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
    fitPanel: document.getElementById('fitPanel'),
    fitCandidateSelect: document.getElementById('fitCandidateSelect'),
    fitTeamSelect: document.getElementById('fitTeamSelect'),
    fitCandidateSummary: document.getElementById('fitCandidateSummary'),
    fitFocus: document.getElementById('fitFocus'),
    fitTeamRankingBody: document.getElementById('fitTeamRankingBody'),
    fitCandidateRankingBody: document.getElementById('fitCandidateRankingBody'),
    fitTeamCandidateTitle: document.getElementById('fitTeamCandidateTitle'),
    declarationPanel: document.getElementById('declarationPanel'),
    declarationUpdated: document.getElementById('declarationUpdated'),
    declarationOfficialCount: document.getElementById('declarationOfficialCount'),
    declarationLikelyCount: document.getElementById('declarationLikelyCount'),
    declarationUnannouncedCount: document.getElementById('declarationUnannouncedCount'),
    declarationBody: document.getElementById('declarationBody'),
    watchPanel: document.getElementById('watchPanel'),
    watchSaveStatus: document.getElementById('watchSaveStatus'),
    watchModeButtons: [...document.querySelectorAll('.watch-mode-button')],
    watchTeamLabel: document.getElementById('watchTeamLabel'),
    watchTeamSelect: document.getElementById('watchTeamSelect'),
    watchPickType: document.getElementById('watchPickType'),
    watchRound: document.getElementById('watchRound'),
    watchSort: document.getElementById('watchSort'),
    watchUndo: document.getElementById('watchUndo'),
    watchReset: document.getElementById('watchReset'),
    watchAnnouncement: document.getElementById('watchAnnouncement'),
    watchPickedCount: document.getElementById('watchPickedCount'),
    watchPickedNote: document.getElementById('watchPickedNote'),
    watchCandidateSummaryLabel: document.getElementById('watchCandidateSummaryLabel'),
    watchRemainingCount: document.getElementById('watchRemainingCount'),
    watchRemainingNote: document.getElementById('watchRemainingNote'),
    watchTopCount: document.getElementById('watchTopCount'),
    watchFitCount: document.getElementById('watchFitCount'),
    watchSearch: document.getElementById('watchSearch'),
    watchPosition: document.getElementById('watchPosition'),
    watchRating: document.getElementById('watchRating'),
    watchCandidateTitle: document.getElementById('watchCandidateTitle'),
    watchCandidateNote: document.getElementById('watchCandidateNote'),
    watchCandidateCount: document.getElementById('watchCandidateCount'),
    watchCandidateBody: document.getElementById('watchCandidateBody'),
    watchBoardTitle: document.getElementById('watchBoardTitle'),
    watchBoardNote: document.getElementById('watchBoardNote'),
    watchAllTeamsBoard: document.getElementById('watchAllTeamsBoard'),
    watchSingleTeamBoard: document.getElementById('watchSingleTeamBoard'),
    watchNote: document.getElementById('watchNote'),
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

  function broadPosition(value) {
    const text = String(value || '');
    if (!text || text === '不明' || text === '未確認') return null;
    if (text.includes('投手')) return '投手';
    if (text.includes('捕手')) return '捕手';
    if (/一塁|二塁|三塁|遊撃|内野/.test(text)) return '内野手';
    if (text.includes('外野')) return '外野手';
    return null;
  }

  function expectedRoundScore(value) {
    const text = String(value || '');
    if (text === '1位') return 100;
    if (/1.*2|1～2|1〜2/.test(text)) return 92;
    if (/2.*3|2～3|2〜3/.test(text)) return 84;
    if (/3.*4|3～4|3〜4/.test(text)) return 75;
    if (text.includes('下位')) return 58;
    if (text.includes('ボーダー')) return 45;
    return 55;
  }

  function fitLevel(score) {
    if (!Number.isFinite(score)) return '算出保留';
    if (score >= 80) return '非常に高い';
    if (score >= 68) return '高い';
    if (score >= 55) return '中';
    return '低め';
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

    const fitAction = document.createElement('button');
    fitAction.type = 'button';
    fitAction.className = 'draft-fit-action';
    fitAction.textContent = '12球団Fitを見る';
    fitAction.addEventListener('click', () => {
      state.selectedFitId = player.player_id;
      if (els.dialog.open) els.dialog.close();
      setMode('fit');
    });
    wrapper.append(fitAction);

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
    state.selectedFitId = playerId;
    if (els.fitCandidateSelect) els.fitCandidateSelect.value = playerId;
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
    const handField = position === '投手' ? 'throws' : 'bats';
    const weightedHands = { 右: 0, 左: 0 };
    rows.forEach((player) => {
      const hand = player[handField];
      if (hand !== '右' && hand !== '左') return;
      weightedHands[hand] += player.registration === '支配下' ? 1 : 0.5;
    });
    const handTotal = weightedHands.右 + weightedHands.左;
    const handShare = {
      右: handTotal ? weightedHands.右 / handTotal : 0.5,
      左: handTotal ? weightedHands.左 / handTotal : 0.5,
    };
    return {
      position,
      active: activeRows.length,
      development: developmentRows.length,
      weightedDepth,
      young: youngRows.length,
      weightedYoung,
      avgAge: mean(activeAges),
      handShare,
      leagueHandShare: { 右: 0.5, 左: 0.5 },
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
      const avgRightShare = mean(metrics.map((item) => item.handShare.右));
      const avgLeftShare = mean(metrics.map((item) => item.handShare.左));
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
        item.leagueHandShare = { 右: avgRightShare, 左: avgLeftShare };

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

  function initFitCandidateSelector() {
    els.fitCandidateSelect.replaceChildren();
    const sorted = sortPlayers([...state.players]);
    sorted.forEach((player) => {
      const option = document.createElement('option');
      option.value = player.player_id;
      option.textContent = `[${player.rating || '未評価'}] ${player.name} / ${player.affiliation}`;
      els.fitCandidateSelect.append(option);
    });
    if (!state.selectedFitId || !state.players.some((player) => player.player_id === state.selectedFitId)) {
      state.selectedFitId = sorted.find((player) => broadPosition(player.position))?.player_id || sorted[0]?.player_id || null;
    }
    if (state.selectedFitId) els.fitCandidateSelect.value = state.selectedFitId;
  }

  function initFitTeamSelector() {
    els.fitTeamSelect.replaceChildren();
    state.teamAnalyses.forEach((team) => {
      const option = document.createElement('option');
      option.value = team.team;
      option.textContent = team.displayName;
      els.fitTeamSelect.append(option);
    });
    if (!state.teamAnalyses.some((team) => team.team === state.selectedFitTeam)) state.selectedFitTeam = state.teamAnalyses[0]?.team || '';
    els.fitTeamSelect.value = state.selectedFitTeam;
  }

  function candidateHand(player, position) {
    const value = position === '投手' ? player.throws : player.bats;
    return value === '右' || value === '左' ? value : null;
  }

  function calculateFit(player, team) {
    const primary = broadPosition(player.position);
    if (!primary || !team?.positions?.[primary]) {
      return { calculable: false, score: null, level: '算出保留', primary, reason: 'メインポジション未確認のため算出していません。' };
    }
    const secondary = broadPosition(player.sub_position);
    const primaryNeed = team.positions[primary].score;
    const secondaryNeed = secondary && secondary !== primary && team.positions[secondary] ? team.positions[secondary].score : null;
    const needScore = secondaryNeed == null ? primaryNeed : primaryNeed * 0.85 + secondaryNeed * 0.15;
    const ratingScore = ratingFitScore.get(player.rating) ?? 55;
    const roundScore = expectedRoundScore(player.expected_round);
    const hand = candidateHand(player, primary);
    const metric = team.positions[primary];
    let handScore = 50;
    if (hand) {
      const teamShare = metric.handShare?.[hand] ?? 0.5;
      const leagueShare = metric.leagueHandShare?.[hand] ?? 0.5;
      handScore = clamp(50 + (leagueShare - teamShare) * 120, 35, 75);
    }
    const versatilityScore = secondaryNeed == null ? 50 : 75;
    const score = Math.round(clamp(
      needScore * 0.55 + ratingScore * 0.20 + roundScore * 0.10 + handScore * 0.10 + versatilityScore * 0.05,
      15,
      98,
    ));
    const reasonParts = [`${primary}補強Lens ${Math.round(primaryNeed)}`];
    if (secondaryNeed != null) reasonParts.push(`${secondary}にも対応`);
    if (hand && handScore >= 58) reasonParts.push(`${hand}${primary === '投手' ? '投げ' : '打ち'}が現有構成で相対的に少なめ`);
    if (player.rating === 'S' || player.rating === 'A') reasonParts.push(`${player.rating}評価`);
    if (player.rating === '未評価') reasonParts.push('候補評価は未補完のため中立値');
    return {
      calculable: true,
      score,
      level: fitLevel(score),
      primary,
      secondary: secondaryNeed == null ? null : secondary,
      needScore: Math.round(needScore),
      ratingScore,
      roundScore,
      handScore: Math.round(handScore),
      versatilityScore,
      hand,
      reason: reasonParts.slice(0, 3).join(' / '),
    };
  }

  function fitBar(label, value, note) {
    const row = document.createElement('div');
    row.className = 'fit-factor-row';
    const head = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = Number.isFinite(value) ? String(Math.round(value)) : '—';
    head.append(span, strong);
    const bar = document.createElement('div');
    bar.className = 'fit-factor-bar';
    const fill = document.createElement('i');
    fill.style.width = `${clamp(Number(value) || 0, 0, 100)}%`;
    bar.append(fill);
    const small = document.createElement('small');
    small.textContent = note;
    row.append(head, bar, small);
    return row;
  }

  function renderFitCandidateSummary(player) {
    els.fitCandidateSummary.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'fit-candidate-head';
    const titleWrap = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = player.name;
    const meta = document.createElement('p');
    meta.textContent = `${player.category}｜${player.affiliation}`;
    titleWrap.append(h3, meta);
    const rating = document.createElement('span');
    rating.className = 'draft-rating';
    rating.dataset.rating = player.rating || '未評価';
    rating.textContent = player.rating || '未評価';
    heading.append(titleWrap, rating);

    const stats = document.createElement('div');
    stats.className = 'fit-candidate-stats';
    [
      ['位置', player.position || '—'],
      ['投打', formatThrowsBats(player) || '—'],
      ['想定', player.expected_round || '—'],
      ['志望届', player.declaration_status || '—'],
    ].forEach(([label, value]) => {
      const item = document.createElement('div');
      const span = document.createElement('span'); span.textContent = label;
      const strong = document.createElement('strong'); strong.textContent = value;
      item.append(span, strong); stats.append(item);
    });
    const note = document.createElement('p');
    note.className = 'fit-candidate-note';
    note.textContent = broadPosition(player.position) ? (player.traits || '特徴情報は継続補完中です。') : 'メインポジション未確認のため、球団Fitは算出保留です。候補から除外はしません。';
    els.fitCandidateSummary.append(heading, stats, note);
  }

  function renderFitFocus(player, team) {
    els.fitFocus.replaceChildren();
    const result = calculateFit(player, team);
    const head = document.createElement('div');
    head.className = 'fit-focus-head';
    const titleWrap = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = team.displayName;
    const h3 = document.createElement('h3');
    h3.textContent = `${player.name} × ${team.displayName}`;
    titleWrap.append(span, h3);
    const score = document.createElement('strong');
    score.className = 'fit-focus-score';
    score.dataset.level = result.calculable ? (result.score >= 80 ? 'very-high' : result.score >= 68 ? 'high' : result.score >= 55 ? 'mid' : 'low') : 'pending';
    score.textContent = result.calculable ? String(result.score) : '—';
    head.append(titleWrap, score);
    const level = document.createElement('p');
    level.className = 'fit-focus-level';
    level.textContent = result.calculable ? `構成適合度：${result.level}` : result.reason;
    els.fitFocus.append(head, level);
    if (!result.calculable) return;
    const factors = document.createElement('div');
    factors.className = 'fit-factor-list';
    factors.append(
      fitBar('構成需要', result.needScore, 'ポジション需要・サブポジションを反映'),
      fitBar('候補評価', result.ratingScore, player.rating === '未評価' ? '未評価は中立値55' : `${player.rating}評価`),
      fitBar('指名ゾーン', result.roundScore, player.expected_round || '不明'),
      fitBar('左右バランス', result.handScore, result.hand ? `${result.hand}${result.primary === '投手' ? '投げ' : '打ち'}の構成比` : '投打未確認のため中立値'),
      fitBar('複数位置', result.versatilityScore, result.secondary ? `${result.secondary}の需要も一部反映` : 'メイン位置のみで算出'),
    );
    const reason = document.createElement('p');
    reason.className = 'fit-focus-reason';
    reason.textContent = result.reason;
    els.fitFocus.append(factors, reason);
  }

  function makeFitScoreChip(result) {
    const strong = document.createElement('strong');
    strong.className = 'fit-score-chip';
    if (!result.calculable) {
      strong.dataset.level = 'pending';
      strong.textContent = '—';
      strong.title = result.reason;
      return strong;
    }
    strong.dataset.level = result.score >= 80 ? 'very-high' : result.score >= 68 ? 'high' : result.score >= 55 ? 'mid' : 'low';
    strong.textContent = String(result.score);
    strong.title = `構成適合度 ${result.score}（${result.level}）`;
    return strong;
  }

  function renderFitTeamRanking(player) {
    els.fitTeamRankingBody.replaceChildren();
    const rows = state.teamAnalyses.map((team) => ({ team, result: calculateFit(player, team) }));
    rows.sort((a, b) => {
      if (a.result.calculable !== b.result.calculable) return a.result.calculable ? -1 : 1;
      return (b.result.score || 0) - (a.result.score || 0);
    });
    rows.forEach(({ team, result }, index) => {
      const tr = document.createElement('tr');
      if (team.team === state.selectedFitTeam) tr.classList.add('is-selected');
      const rank = makeCell(result.calculable ? index + 1 : '—');
      const teamTd = document.createElement('td');
      const teamButton = document.createElement('button');
      teamButton.type = 'button';
      teamButton.className = 'team-name-button';
      teamButton.textContent = team.displayName;
      teamButton.addEventListener('click', () => {
        state.selectedFitTeam = team.team;
        els.fitTeamSelect.value = team.team;
        renderFit();
      });
      teamTd.append(teamButton);
      const scoreTd = document.createElement('td'); scoreTd.append(makeFitScoreChip(result));
      const needTd = makeCell(result.calculable ? result.needScore : '—');
      const ratingTd = makeCell(player.rating || '未評価');
      const handTd = makeCell(result.calculable ? (result.hand ? result.handScore : '50') : '—');
      tr.append(rank, teamTd, scoreTd, needTd, ratingTd, handTd);
      els.fitTeamRankingBody.append(tr);
    });
  }

  function renderTeamCandidateRanking(team) {
    els.fitCandidateRankingBody.replaceChildren();
    els.fitTeamCandidateTitle.textContent = `${team.displayName} フィット上位候補`;
    const ranked = state.players
      .map((player) => ({ player, result: calculateFit(player, team) }))
      .filter((item) => item.result.calculable)
      .sort((a, b) => b.result.score - a.result.score || (ratingOrder.get(a.player.rating) ?? 99) - (ratingOrder.get(b.player.rating) ?? 99))
      .slice(0, 12);
    ranked.forEach(({ player, result }, index) => {
      const tr = document.createElement('tr');
      if (player.player_id === state.selectedFitId) tr.classList.add('is-selected');
      const rank = makeCell(index + 1);
      const playerTd = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'draft-player-button';
      button.textContent = player.name;
      button.addEventListener('click', () => {
        state.selectedFitId = player.player_id;
        els.fitCandidateSelect.value = player.player_id;
        renderFit();
      });
      playerTd.append(button);
      const position = makeCell(player.position || '—');
      const rating = makeCell(player.rating || '未評価');
      const round = makeCell(player.expected_round || '—');
      const fit = document.createElement('td'); fit.append(makeFitScoreChip(result));
      tr.append(rank, playerTd, position, rating, round, fit);
      els.fitCandidateRankingBody.append(tr);
    });
  }

  function renderFit() {
    if (!state.players.length) return;
    const player = state.players.find((item) => item.player_id === state.selectedFitId) || state.players[0];
    if (!player) return;
    state.selectedFitId = player.player_id;
    els.fitCandidateSelect.value = player.player_id;
    renderFitCandidateSummary(player);
    if (!state.rosterReady || !state.teamAnalyses.length) {
      els.fitFocus.innerHTML = '<p class="draft-empty">球団データを読み込めないためFitを算出できません。</p>';
      return;
    }
    const team = state.teamAnalyses.find((item) => item.team === state.selectedFitTeam) || state.teamAnalyses[0];
    state.selectedFitTeam = team.team;
    els.fitTeamSelect.value = team.team;
    renderFitFocus(player, team);
    renderFitTeamRanking(player);
    renderTeamCandidateRanking(team);
  }


  function declarationForTeam(team) {
    return state.declarations.find((item) => item.team === team) || { team, status: '未公表' };
  }

  function declarationsForPlayer(player) {
    const id = player.player_id;
    const name = normalize(player.name);
    return state.declarations.filter((item) => {
      if (!['公言', '有力報道'].includes(item.status)) return false;
      if (id && item.player_id && item.player_id === id) return true;
      return item.name && normalize(item.name) === name;
    });
  }

  function renderDeclarations() {
    const rows = teamOrder.map((team) => declarationForTeam(team));
    const official = rows.filter((item) => item.status === '公言').length;
    const likely = rows.filter((item) => item.status === '有力報道').length;
    const unannounced = rows.filter((item) => !item.status || item.status === '未公表').length;
    const checked = rows.map((item) => item.last_checked || '').filter(Boolean).sort().at(-1) || '—';
    setText(els.declarationOfficialCount, official);
    setText(els.declarationLikelyCount, likely);
    setText(els.declarationUnannouncedCount, unannounced);
    els.declarationUpdated.textContent = `最終確認 ${checked}`;
    els.declarationBody.replaceChildren();
    rows.forEach((item) => {
      const tr = document.createElement('tr');
      const statusTd = document.createElement('td');
      const status = document.createElement('span');
      status.className = 'declaration-status';
      status.dataset.status = item.status || '未公表';
      status.textContent = item.status || '未公表';
      statusTd.append(status);

      const playerTd = document.createElement('td');
      if (item.name) {
        const player = state.players.find((p) => p.player_id === item.player_id) || state.players.find((p) => normalize(p.name) === normalize(item.name));
        if (player) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'draft-player-button';
          button.textContent = item.name;
          button.addEventListener('click', () => openDialog(player));
          playerTd.append(button);
        } else playerTd.textContent = item.name;
      } else playerTd.textContent = '—';

      const sourceTd = document.createElement('td');
      if (item.source_url) {
        const link = document.createElement('a');
        link.href = item.source_url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'declaration-source';
        link.textContent = '確認';
        sourceTd.append(link);
      } else sourceTd.textContent = '—';

      tr.append(
        makeCell(teamDisplayName(item.team)),
        statusTd,
        playerTd,
        makeCell(item.affiliation || '—'),
        makeCell(item.announcement_date || '—'),
        makeCell(item.speaker || '—'),
        sourceTd,
      );
      els.declarationBody.append(tr);
    });
  }

  function initWatchControls() {
    els.watchTeamSelect.replaceChildren();
    teamOrder.forEach((team) => {
      const option = document.createElement('option');
      option.value = team;
      option.textContent = teamDisplayName(team);
      els.watchTeamSelect.append(option);
    });
    if (!teamOrder.includes(state.watchTeam)) state.watchTeam = teamOrder[0];
    els.watchTeamSelect.value = state.watchTeam;

    els.watchRound.replaceChildren();
    for (let round = 1; round <= 10; round += 1) {
      const option = document.createElement('option');
      option.value = String(round);
      option.textContent = state.watchPickType === '育成' ? `育成${round}位` : `${round}位`;
      els.watchRound.append(option);
    }
    if (!els.watchRound.querySelector(`option[value="${state.watchRound}"]`)) state.watchRound = '1';
    els.watchRound.value = state.watchRound;

    const watchPositions = [...new Set(state.players.map((player) => player.position).filter(Boolean))]
      .sort((a, b) => positionOrder.indexOf(a) - positionOrder.indexOf(b));
    els.watchPosition.querySelectorAll('option:not(:first-child)').forEach((node) => node.remove());
    addOptions(els.watchPosition, watchPositions);
    els.watchSort.value = state.watchSort;
    els.watchPickType.value = state.watchPickType;
  }

  function loadWatchState() {
    try {
      const raw = localStorage.getItem(WATCH_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.picks)) state.watchPicks = saved.picks.filter((pick) => pick && pick.player_id && pick.team);
      if (saved.mode === 'all' || saved.mode === 'team') state.watchMode = saved.mode;
      if (teamOrder.includes(saved.team)) state.watchTeam = saved.team;
      if (saved.pickType === '本指名' || saved.pickType === '育成') state.watchPickType = saved.pickType;
      if (/^\d+$/.test(String(saved.round || ''))) state.watchRound = String(saved.round);
      if (saved.sort === 'rating' || saved.sort === 'fit') state.watchSort = saved.sort;
    } catch (error) {
      console.warn('観戦ボードの保存データを読み込めませんでした', error);
      state.storageReady = false;
    }
  }

  function saveWatchState() {
    try {
      localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify({
        picks: state.watchPicks,
        mode: state.watchMode,
        team: state.watchTeam,
        pickType: state.watchPickType,
        round: state.watchRound,
        sort: state.watchSort,
      }));
      state.storageReady = true;
      els.watchSaveStatus.textContent = 'このブラウザに保存済み';
      els.watchSaveStatus.dataset.state = 'saved';
    } catch (error) {
      console.warn('観戦ボードを保存できませんでした', error);
      state.storageReady = false;
      els.watchSaveStatus.textContent = '保存できません';
      els.watchSaveStatus.dataset.state = 'error';
    }
  }

  function pickedPlayerIds() {
    return new Set(state.watchPicks.map((pick) => pick.player_id));
  }

  function watchAvailablePlayers() {
    const picked = pickedPlayerIds();
    return state.players.filter((player) => !picked.has(player.player_id));
  }

  function watchFilteredPlayers() {
    const query = normalize(els.watchSearch.value);
    const base = watchAvailablePlayers().filter((player) => {
      if (query && ![player.name, player.affiliation, player.league].some((value) => normalize(value).includes(query))) return false;
      if (els.watchPosition.value !== 'all' && player.position !== els.watchPosition.value) return false;
      if (els.watchRating.value !== 'all' && player.rating !== els.watchRating.value) return false;
      return true;
    });
    const team = state.teamAnalyses.find((item) => item.team === state.watchTeam) || null;
    return [...base].sort((a, b) => {
      if (state.watchSort === 'fit' && team) {
        const fitA = calculateFit(a, team);
        const fitB = calculateFit(b, team);
        const scoreA = fitA.calculable ? fitA.score : -1;
        const scoreB = fitB.calculable ? fitB.score : -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      const ratingDiff = (ratingOrder.get(a.rating) ?? 99) - (ratingOrder.get(b.rating) ?? 99);
      if (ratingDiff !== 0) return ratingDiff;
      const roundDiff = expectedRoundScore(b.expected_round) - expectedRoundScore(a.expected_round);
      if (roundDiff !== 0) return roundDiff;
      return a.name.localeCompare(b.name, 'ja');
    });
  }

  function pickLabel(pick) {
    return pick.pick_type === '育成' ? `育成${pick.round}位` : `${pick.round}位`;
  }

  function declarationCompact(team) {
    const item = declarationForTeam(team);
    if (item.status === '公言' && item.name) return `1位公言：${item.name}`;
    if (item.status === '有力報道' && item.name) return `1位有力：${item.name}`;
    if (item.status === '変更・撤回' && item.name) return `公言変更：${item.name}`;
    return '1位公言：未公表';
  }

  function renderWatchAnnouncement() {
    const item = declarationForTeam(state.watchTeam);
    els.watchAnnouncement.replaceChildren();
    const label = document.createElement('span');
    label.className = 'declaration-status';
    label.dataset.status = item.status || '未公表';
    label.textContent = item.status || '未公表';
    const text = document.createElement('strong');
    text.textContent = item.name
      ? `${teamDisplayName(state.watchTeam)}：${item.name}${item.affiliation ? `（${item.affiliation}）` : ''}`
      : `${teamDisplayName(state.watchTeam)}：1位公言なし`;
    const small = document.createElement('small');
    small.textContent = item.announcement_date
      ? `${item.announcement_date}${item.speaker ? `・${item.speaker}` : ''}`
      : '正式な1位公言を確認した場合にここへ反映します。';
    els.watchAnnouncement.append(label, text, small);
  }

  function makePickButton(player) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'watch-pick-button';
    button.textContent = `${teamDisplayName(state.watchTeam)}が指名`;
    button.addEventListener('click', () => registerWatchPick(player));
    return button;
  }

  function registerWatchPick(player) {
    const duplicate = state.watchPicks.find((pick) => (
      pick.team === state.watchTeam &&
      pick.pick_type === state.watchPickType &&
      String(pick.round) === String(state.watchRound)
    ));
    if (duplicate) {
      const replace = window.confirm(`${teamDisplayName(state.watchTeam)}の${pickLabel(duplicate)}は「${duplicate.name}」で登録済みです。「${player.name}」に置き換えますか？`);
      if (!replace) return;
      state.watchPicks = state.watchPicks.filter((pick) => pick.id !== duplicate.id);
    }
    const alreadyPicked = state.watchPicks.find((pick) => pick.player_id === player.player_id);
    if (alreadyPicked) {
      window.alert(`${player.name}は${teamDisplayName(alreadyPicked.team)}の${pickLabel(alreadyPicked)}として登録済みです。`);
      return;
    }
    state.watchPicks.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      player_id: player.player_id,
      name: player.name,
      team: state.watchTeam,
      round: String(state.watchRound),
      pick_type: state.watchPickType,
      created_at: new Date().toISOString(),
    });
    saveWatchState();
    renderWatch();
  }

  function removeWatchPick(id) {
    state.watchPicks = state.watchPicks.filter((pick) => pick.id !== id);
    saveWatchState();
    renderWatch();
  }

  function watchPicksForTeam(team) {
    return state.watchPicks
      .filter((pick) => pick.team === team)
      .sort((a, b) => {
        if (a.pick_type !== b.pick_type) return a.pick_type === '本指名' ? -1 : 1;
        return Number(a.round) - Number(b.round) || String(a.created_at).localeCompare(String(b.created_at));
      });
  }

  function renderWatchCandidateTable(players) {
    els.watchCandidateBody.replaceChildren();
    const team = state.teamAnalyses.find((item) => item.team === state.watchTeam) || null;
    players.slice(0, 80).forEach((player) => {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      const nameButton = document.createElement('button');
      nameButton.type = 'button';
      nameButton.className = 'draft-player-button';
      nameButton.textContent = player.name;
      nameButton.addEventListener('click', () => openDialog(player));
      nameTd.append(nameButton);

      const ratingTd = document.createElement('td');
      const rating = document.createElement('span');
      rating.className = 'draft-rating';
      rating.dataset.rating = player.rating || '未評価';
      rating.textContent = player.rating || '未評価';
      ratingTd.append(rating);

      const fitTd = document.createElement('td');
      if (team) {
        const fit = calculateFit(player, team);
        if (fit.calculable) fitTd.append(makeFitScoreChip(fit));
        else fitTd.textContent = '—';
      } else fitTd.textContent = '—';

      const declarationTd = document.createElement('td');
      const declarations = declarationsForPlayer(player);
      if (declarations.length) {
        const wrap = document.createElement('div');
        wrap.className = 'watch-declaration-list';
        declarations.forEach((item) => {
          const badge = document.createElement('span');
          badge.className = 'watch-declaration-badge';
          badge.dataset.status = item.status;
          badge.textContent = `${teamDisplayName(item.team)} ${item.status === '公言' ? '1位公言' : '有力'}`;
          wrap.append(badge);
        });
        declarationTd.append(wrap);
      } else declarationTd.textContent = '—';

      const actionTd = document.createElement('td');
      actionTd.append(makePickButton(player));
      tr.append(
        nameTd,
        makeCell(player.affiliation || '—'),
        makeCell(player.position || '—'),
        ratingTd,
        makeCell(player.expected_round || '—'),
        fitTd,
        declarationTd,
        actionTd,
      );
      els.watchCandidateBody.append(tr);
    });
    if (!players.length) {
      els.watchCandidateBody.innerHTML = '<tr><td colspan="8" class="draft-empty">条件に合う候補はいません。</td></tr>';
    }
  }

  function renderAllTeamsBoard() {
    els.watchAllTeamsBoard.replaceChildren();
    teamOrder.forEach((team) => {
      const card = document.createElement('article');
      card.className = 'watch-team-card';
      if (team === state.watchTeam) card.classList.add('is-selected');

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'watch-team-card-head';
      head.addEventListener('click', () => {
        state.watchTeam = team;
        els.watchTeamSelect.value = team;
        saveWatchState();
        renderWatch();
      });
      const teamName = document.createElement('strong');
      teamName.textContent = teamDisplayName(team);
      const declaration = document.createElement('small');
      declaration.textContent = declarationCompact(team);
      head.append(teamName, declaration);

      const list = document.createElement('div');
      list.className = 'watch-team-picks';
      const picks = watchPicksForTeam(team);
      if (!picks.length) {
        const empty = document.createElement('span');
        empty.className = 'watch-team-empty';
        empty.textContent = 'まだ登録なし';
        list.append(empty);
      } else {
        picks.forEach((pick) => {
          const row = document.createElement('div');
          const text = document.createElement('span');
          text.textContent = `${pickLabel(pick)}　${pick.name}`;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'watch-remove-button';
          remove.textContent = '取消';
          remove.addEventListener('click', (event) => {
            event.stopPropagation();
            removeWatchPick(pick.id);
          });
          row.append(text, remove);
          list.append(row);
        });
      }
      card.append(head, list);
      els.watchAllTeamsBoard.append(card);
    });
  }

  function renderSingleTeamBoard() {
    els.watchSingleTeamBoard.replaceChildren();
    const team = state.watchTeam;
    const picks = watchPicksForTeam(team);

    const head = document.createElement('div');
    head.className = 'watch-single-head';
    const title = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = `${teamDisplayName(team)} 指名記録`;
    const p = document.createElement('p');
    p.textContent = declarationCompact(team);
    title.append(h3, p);
    const count = document.createElement('strong');
    count.textContent = `${picks.length}人`;
    head.append(title, count);

    const list = document.createElement('div');
    list.className = 'watch-single-list';
    if (!picks.length) {
      const empty = document.createElement('p');
      empty.className = 'watch-team-empty';
      empty.textContent = 'まだこの球団の指名は登録されていません。';
      list.append(empty);
    } else {
      picks.forEach((pick) => {
        const player = state.players.find((item) => item.player_id === pick.player_id);
        const row = document.createElement('div');
        row.className = 'watch-single-pick';
        const label = document.createElement('strong');
        label.textContent = pickLabel(pick);
        const info = document.createElement('div');
        const name = document.createElement('span');
        name.textContent = pick.name;
        const meta = document.createElement('small');
        meta.textContent = player ? `${player.affiliation}・${player.position}・${player.rating}評価` : '';
        info.append(name, meta);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'watch-remove-button';
        remove.textContent = '取消';
        remove.addEventListener('click', () => removeWatchPick(pick.id));
        row.append(label, info, remove);
        list.append(row);
      });
    }
    els.watchSingleTeamBoard.append(head, list);
  }

  function renderWatch() {
    if (!state.players.length) return;
    els.watchModeButtons.forEach((button) => {
      const active = button.dataset.watchMode === state.watchMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    els.watchTeamSelect.value = state.watchTeam;
    els.watchPickType.value = state.watchPickType;
    els.watchRound.value = state.watchRound;
    els.watchSort.value = state.watchSort;
    els.watchTeamLabel.textContent = state.watchMode === 'all' ? '今回の指名球団' : '追いかける球団';

    const available = watchFilteredPlayers();
    const allAvailable = watchAvailablePlayers();
    const team = state.teamAnalyses.find((item) => item.team === state.watchTeam) || null;
    const highFit = team
      ? allAvailable.filter((player) => {
          const fit = calculateFit(player, team);
          return fit.calculable && fit.score >= 68;
        }).length
      : null;
    const top = allAvailable.filter((player) => player.rating === 'S' || player.rating === 'A').length;

    setText(els.watchPickedCount, state.watchMode === 'all' ? state.watchPicks.length : watchPicksForTeam(state.watchTeam).length);
    setText(els.watchRemainingCount, allAvailable.length);
    setText(els.watchTopCount, top);
    setText(els.watchFitCount, highFit == null ? '—' : highFit);
    els.watchCandidateCount.textContent = `${available.length}人`;
    els.watchSaveStatus.textContent = state.storageReady ? 'このブラウザに保存' : '保存できません';
    els.watchSaveStatus.dataset.state = state.storageReady ? 'saved' : 'error';

    if (state.watchMode === 'all') {
      els.watchPickedNote.textContent = '全12球団の登録数';
      els.watchCandidateSummaryLabel.textContent = '残り候補';
      els.watchRemainingNote.textContent = '登録済みを除外';
      els.watchCandidateTitle.textContent = '残り候補';
      els.watchCandidateNote.textContent = '12球団の指名を登録すると、指名済み選手が一覧から消えます。';
      els.watchBoardTitle.textContent = '12球団 指名記録';
      els.watchBoardNote.textContent = '球団カードを押すと、その球団を次の指名球団に切り替えます。';
      els.watchAllTeamsBoard.hidden = false;
      els.watchSingleTeamBoard.hidden = true;
      els.watchNote.textContent = '12球団モードでは全球団の指名を入力した場合のみ「残り候補」が実際の残り候補と一致します。1位は抽選で交渉権が確定してから登録してください。';
      renderAllTeamsBoard();
    } else {
      els.watchPickedNote.textContent = `${teamDisplayName(state.watchTeam)}の登録数`;
      els.watchCandidateSummaryLabel.textContent = '候補データ';
      els.watchRemainingNote.textContent = '登録済み選手を除外';
      els.watchCandidateTitle.textContent = `${teamDisplayName(state.watchTeam)}から候補を選ぶ`;
      els.watchCandidateNote.textContent = '他球団の指名を入力しなくても、この球団の指名だけ記録できます。表示候補はリーグ全体の「残り」を保証しません。';
      els.watchBoardTitle.textContent = `${teamDisplayName(state.watchTeam)}のみ`;
      els.watchBoardNote.textContent = '好きな球団だけ追いかけるための記録ページです。';
      els.watchAllTeamsBoard.hidden = true;
      els.watchSingleTeamBoard.hidden = false;
      els.watchNote.textContent = '特定球団モードでは他球団の指名入力は不要です。そのため候補一覧には、実際には他球団から指名済みの選手が残る場合があります。';
      renderSingleTeamBoard();
    }

    renderWatchAnnouncement();
    renderWatchCandidateTable(available);
  }

  function setMode(mode) {
    state.mode = mode;
    els.tabs.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (window.matchMedia('(max-width: 560px)').matches) {
      const activeTab = els.tabs.find((button) => button.dataset.mode === mode);
      activeTab?.parentElement?.scrollTo({ left: Math.max(0, activeTab.offsetLeft - 10), behavior: 'smooth' });
    }

    const isTeamLens = mode === 'team-lens';
    const isFit = mode === 'fit';
    const isDeclarations = mode === 'declarations';
    const isWatch = mode === 'watch';
    const isSpecial = isTeamLens || isFit || isDeclarations || isWatch;
    els.filters.hidden = isSpecial;
    els.workspace.hidden = isSpecial;
    els.teamLensPanel.hidden = !isTeamLens;
    els.fitPanel.hidden = !isFit;
    els.declarationPanel.hidden = !isDeclarations;
    els.watchPanel.hidden = !isWatch;
    els.disclaimer.hidden = isSpecial;

    if (isTeamLens) { renderTeamLens(); return; }
    if (isFit) { renderFit(); return; }
    if (isDeclarations) { renderDeclarations(); return; }
    if (isWatch) { renderWatch(); return; }

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
    els.fitCandidateSelect.addEventListener('change', () => {
      state.selectedFitId = els.fitCandidateSelect.value;
      renderFit();
    });
    els.fitTeamSelect.addEventListener('change', () => {
      state.selectedFitTeam = els.fitTeamSelect.value;
      renderFit();
    });

    els.watchModeButtons.forEach((button) => button.addEventListener('click', () => {
      state.watchMode = button.dataset.watchMode;
      saveWatchState();
      renderWatch();
    }));
    els.watchTeamSelect.addEventListener('change', () => {
      state.watchTeam = els.watchTeamSelect.value;
      saveWatchState();
      renderWatch();
    });
    els.watchPickType.addEventListener('change', () => {
      state.watchPickType = els.watchPickType.value;
      state.watchRound = '1';
      initWatchControls();
      saveWatchState();
      renderWatch();
    });
    els.watchRound.addEventListener('change', () => {
      state.watchRound = els.watchRound.value;
      saveWatchState();
    });
    els.watchSort.addEventListener('change', () => {
      state.watchSort = els.watchSort.value;
      saveWatchState();
      renderWatch();
    });
    [els.watchSearch, els.watchPosition, els.watchRating].forEach((control) => {
      control.addEventListener(control === els.watchSearch ? 'input' : 'change', renderWatch);
    });
    els.watchUndo.addEventListener('click', () => {
      if (!state.watchPicks.length) return;
      state.watchPicks.pop();
      saveWatchState();
      renderWatch();
    });
    els.watchReset.addEventListener('click', () => {
      if (!state.watchPicks.length) return;
      if (!window.confirm('このブラウザに保存した2026年ドラフトの指名記録をすべて消去しますか？')) return;
      state.watchPicks = [];
      saveWatchState();
      renderWatch();
    });
  }

  async function loadCandidates() {
    const response = await fetch(CANDIDATE_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`候補データ HTTP ${response.status}`);
    const text = await response.text();
    state.players = parseCsv(text.replace(/^\uFEFF/, '')).filter((player) => player.player_id);
    if (!state.players.length) throw new Error('候補データが空です');
  }


  async function loadDeclarations() {
    try {
      const response = await fetch(DECLARATIONS_DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`1位公言データ HTTP ${response.status}`);
      const text = await response.text();
      state.declarations = parseCsv(text.replace(/^\uFEFF/, '')).filter((item) => item.team);
      state.declarationsReady = true;
    } catch (error) {
      console.warn(error);
      state.declarations = teamOrder.map((team) => ({ team, status: '未公表' }));
      state.declarationsReady = false;
    }
  }


  async function loadRoster() {
    const response = await fetch(ROSTER_DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`球団データ HTTP ${response.status}`);
    const text = await response.text();
    state.roster = prepareRoster(parseCsv(text.replace(/^\uFEFF/, '')));
    if (!state.roster.length) throw new Error('球団データが空です');
    calculateTeamAnalyses();
    initTeamSelector();
    initFitTeamSelector();
    state.rosterReady = true;
  }

  async function init() {
    bindEvents();
    loadWatchState();
    try {
      await loadCandidates();
      initFilters();
      initFitCandidateSelector();
      initWatchControls();
      await loadDeclarations();
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
      if (state.mode === 'team-lens') renderTeamLens();
      if (state.mode === 'fit') renderFit();
      if (state.mode === 'watch') renderWatch();
    } catch (error) {
      console.error(error);
      els.status.textContent = `${state.players.length}人公開中`;
      document.getElementById('teamLensTab').disabled = true;
      document.getElementById('teamLensTab').title = '球団データを読み込めないため現在利用できません';
      document.getElementById('fitTab').disabled = true;
      document.getElementById('fitTab').title = '球団データを読み込めないため現在利用できません';
      if (state.mode === 'watch') renderWatch();
    }
  }

  init();
})();
