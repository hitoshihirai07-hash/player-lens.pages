(function () {
  'use strict';
  const D = window.PlayerLensFAData;
  const $ = id => document.getElementById(id);
  const esc = D.esc, norm = D.norm, MAX = 28;
  const POSITIONS = ['投手', '捕手', '内野手', '外野手'];
  const state = { all: [], team: '', position: 'all', view: 'all', search: '', selected: new Set(), excluded: new Set() };
  const key = team => 'player-lens-fa-protect-2026-v1-' + team;
  // The source roster determines eligibility. Names and spellings are not used to guess nationality.
  const isForeignPlayer = p => ['外国人', '外国人選手', '外国人扱い', '外国籍', '外国籍選手']
    .includes(String(p.外国人区分 ?? '').normalize('NFKC').trim());
  const isSelectablePlayer = p => String(p.契約区分 ?? '').trim() === '支配下'
    && String(p.プロテクト候補判定 ?? '').trim() !== '対象外'
    && !isForeignPlayer(p);
  const teamRows = () => state.all.filter(p => p.球団名 === state.team);
  const eligible = () => teamRows().filter(p => !state.excluded.has(p.選手ID));
  const order = (a, b) => (POSITIONS.indexOf(a.ポジション) + 1 || 99) - (POSITIONS.indexOf(b.ポジション) + 1 || 99)
    || (Number(a.背番号) || 999) - (Number(b.背番号) || 999)
    || a.選手名.localeCompare(b.選手名, 'ja');
  const ordered = rows => rows.slice().sort(order);
  const picks = () => ordered(eligible()).filter(p => state.selected.has(p.選手ID));
  function save() {
    try {
      localStorage.setItem(key(state.team), JSON.stringify({selected: [...state.selected], excluded: [...state.excluded]}));
    } catch (error) { $('protectNotice').textContent = 'このブラウザーでは選択内容を保存できません。'; }
  }
  function validSet(rows, values) {
    const ids = new Set(rows.map(p => p.選手ID));
    return new Set((Array.isArray(values) ? values : []).filter(id => ids.has(id)));
  }
  function restore() {
    const candidates = teamRows(); let data = {};
    try { data = JSON.parse(localStorage.getItem(key(state.team)) || '{}') || {}; }
    catch (error) { data = {}; }
    state.excluded = validSet(candidates, data.excluded);
    state.selected = validSet(candidates.filter(p => !state.excluded.has(p.選手ID)), data.selected);
    if (state.selected.size > MAX) state.selected = new Set([...state.selected].slice(0, MAX));
  }
  function loadShare(url) {
    if (!url.searchParams.has('pick')) return false;
    const candidates = teamRows(), exclude = (url.searchParams.get('exclude') || '').split(',').filter(Boolean);
    state.excluded = validSet(candidates, exclude);
    const available = candidates.filter(p => !state.excluded.has(p.選手ID));
    state.selected = validSet(available, (url.searchParams.get('pick') || '').split(',').filter(Boolean));
    state.selected = new Set([...state.selected].slice(0, MAX));
    save(); return true;
  }
  function clearShareQuery() {
    const url = new URL(location.href);
    if (!url.searchParams.has('pick') && !url.searchParams.has('exclude')) return;
    url.searchParams.delete('pick'); url.searchParams.delete('exclude');
    history.replaceState(null, '', url.toString());
  }
  function renderSummary() {
    const all = eligible(), chosen = picks(), remaining = MAX - chosen.length;
    $('protectCounter').textContent = chosen.length + ' / ' + MAX + '人';
    $('protectCounter').classList.toggle('is-complete', remaining === 0);
    $('protectSummary').innerHTML = [
      ['プロテクト', chosen.length], ['残り枠', remaining], ['プロテクト外', all.length - chosen.length], ['選択対象', all.length]
    ].map(([name, count]) => '<div><span>' + name + '</span><strong>' + count + '</strong><small>人</small></div>').join('');
    $('protectStatus').textContent = state.team + ' · 基準日：' + (teamRows()[0]?.基準日 || '未登録');
    $('protectPicks').innerHTML = chosen.length
      ? '<ol>' + chosen.map(p => '<li>' + esc(p.選手名) + ' <small>' + esc(p.ポジション) + '</small></li>').join('') + '</ol>'
      : '<p class="fa-muted">選手をクリックして選んでください。</p>';
    $('protectImage').disabled = $('protectShare').disabled = chosen.length === 0;
    $('protectRestoreBox').hidden = state.excluded.size === 0;
    const removed = ordered(teamRows().filter(p => state.excluded.has(p.選手ID)));
    $('protectExcludedList').innerHTML = removed.map(p => '<li><span>' + esc(p.選手名)
      + '</span><button type="button" data-restore="' + esc(p.選手ID) + '">戻す</button></li>').join('');
  }
  function visibleRows() {
    return ordered(eligible()).filter(p => (state.position === 'all' || p.ポジション === state.position)
      && (state.view === 'all' || (state.view === 'selected') === state.selected.has(p.選手ID))
      && (norm(p.選手名) + norm(p.背番号)).includes(norm(state.search)));
  }
  function renderTable() {
    const rows = visibleRows(), remaining = MAX - state.selected.size;
    $('protectResultCount').textContent = '表示 ' + rows.length + '人 / 選択対象 ' + eligible().length + '人';
    let content = '';
    for (const position of POSITIONS.concat(['その他'])) {
      const group = rows.filter(p => POSITIONS.includes(p.ポジション) ? p.ポジション === position : position === 'その他');
      if (!group.length) continue;
      content += '<section class="protect-position-block" aria-label="' + esc(position) + '">'
        + '<h3>' + esc(position) + ' <small>' + group.length + '人</small></h3>'
        + '<div class="protect-player-grid">';
      content += group.map(p => {
        const chosen = state.selected.has(p.選手ID), id = esc(p.選手ID);
        return '<div class="protect-player-row' + (chosen ? ' is-picked' : '') + '" data-id="' + id + '">'
          + '<label class="protect-player-label">'
          + '<input class="protect-row-check" type="checkbox" data-id="' + id + '" aria-label="'
          + esc(p.選手名) + 'をプロテクトする"' + (chosen ? ' checked' : '') + (!chosen && remaining === 0 ? ' disabled' : '') + '>'
          + '<span class="protect-number">' + esc(p.背番号 || '—') + '</span>'
          + '<span class="protect-name">' + esc(p.選手名) + '</span></label>'
          + '<button type="button" class="protect-exclude-btn" data-exclude="' + id + '" aria-label="' + esc(p.選手名) + 'を一覧から除外する" title="一覧から除外">×</button>'
          + '</div>';
      }).join('');
      content += '</div></section>';
    }
    $('protectRows').innerHTML = content;
    $('protectEmpty').hidden = rows.length !== 0;
  }
  function updateTableChecks() {
    const remaining = MAX - state.selected.size;
    $('protectRows').querySelectorAll('.protect-player-row').forEach(row => {
      const chosen = state.selected.has(row.dataset.id);
      row.classList.toggle('is-picked', chosen);
      const input = row.querySelector('input.protect-row-check');
      input.checked = chosen;
      input.disabled = !chosen && remaining === 0;
    });
  }
  function render() { renderSummary(); renderTable(); }
  function changeSelection(id, wanted) {
    const p = eligible().find(x => x.選手ID === id);
    if (!p) return;
    if (wanted && state.selected.size < MAX) state.selected.add(id);
    else if (!wanted) state.selected.delete(id);
    clearShareQuery(); save();
    renderSummary();
    if (state.view === 'all') updateTableChecks();
    else renderTable();
  }
  function excludePlayer(id) {
    if (!eligible().some(p => p.選手ID === id)) return;
    state.selected.delete(id); state.excluded.add(id);
    clearShareQuery(); save(); render();
    $('protectNotice').textContent = '一覧から除外しました。「除外した選手」から戻せます。';
  }
  function switchTeam(team, share) {
    state.team = team; state.position = state.view = 'all'; state.search = '';
    $('protectTeam').value = team; $('protectPosition').value = 'all';
    $('protectView').value = 'all'; $('protectSearch').value = '';
    restore();
    if (share) loadShare(share);
    $('protectNotice').textContent = '';
    render();
  }
  function shareLink() {
    const url = new URL(location.href);
    url.searchParams.set('team', state.team);
    url.searchParams.set('pick', picks().map(p => p.選手ID).join(','));
    if (state.excluded.size) url.searchParams.set('exclude', [...state.excluded].join(','));
    else url.searchParams.delete('exclude');
    return url.toString();
  }
  async function copyLink() {
    const link = shareLink();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(link);
      $('protectNotice').textContent = '共有リンクをコピーしました。開いた人にも選択した28人案が表示されます。';
      $('protectShareUrl').hidden = true;
    } catch (error) {
      const input = $('protectShareUrl'); input.hidden = false; input.value = link; input.focus(); input.select();
      $('protectNotice').textContent = 'リンクを選択しました。コピーして共有してください。';
    }
  }
  function drawImage() {
    const players = picks();
    if (!players.length) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1370;
    const ctx = canvas.getContext('2d');
    if (!ctx) { $('protectNotice').textContent = 'このブラウザーでは画像を作成できません。'; return; }
    ctx.fillStyle = '#f5f8f8'; ctx.fillRect(0, 0, 1200, 1370);
    ctx.fillStyle = '#0f766e'; ctx.fillRect(0, 0, 1200, 16);
    ctx.fillStyle = '#183b40'; ctx.font = 'bold 30px "Yu Gothic", Meiryo, sans-serif';
    ctx.fillText('Player Lens  |  MY PROTECTED 28', 64, 82);
    ctx.font = 'bold 47px "Yu Gothic", Meiryo, sans-serif'; ctx.fillText(state.team, 64, 167, 1080);
    ctx.fillStyle = '#0f766e'; ctx.font = 'bold 30px "Yu Gothic", Meiryo, sans-serif';
    ctx.fillText('2026年オフ  28人プロテクト案', 64, 226);
    ctx.fillStyle = '#5b6b74'; ctx.font = '24px "Yu Gothic", Meiryo, sans-serif';
    ctx.fillText(players.length + ' / 28人  |  基準日 ' + (teamRows()[0]?.基準日 || '未登録'), 64, 270);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 306, 1120, 944);
    ctx.strokeStyle = '#d9e5e3'; ctx.lineWidth = 2; ctx.strokeRect(40, 306, 1120, 944);
    const colWidth = 540, startY = 366, rowHeight = 60;
    for (let i = 0; i < players.length; i++) {
      const col = Math.floor(i / 14), row = i % 14;
      const x = 66 + col * colWidth, y = startY + row * rowHeight;
      if (row % 2 === 0) { ctx.fillStyle = '#f5faf9'; ctx.fillRect(x - 9, y - 34, 516, 52); }
      ctx.fillStyle = '#0f766e'; ctx.font = 'bold 23px "Yu Gothic", Meiryo, sans-serif';
      ctx.fillText(String(i + 1).padStart(2, '0'), x, y);
      ctx.fillStyle = '#1b2d35'; ctx.font = 'bold 26px "Yu Gothic", Meiryo, sans-serif';
      ctx.fillText(players[i].選手名, x + 56, y, 286);
      ctx.fillStyle = '#61717c'; ctx.font = '20px "Yu Gothic", Meiryo, sans-serif';
      ctx.fillText(players[i].ポジション, x + 352, y, 140);
    }
    ctx.fillStyle = '#647380'; ctx.font = '21px "Yu Gothic", Meiryo, sans-serif';
    ctx.fillText('個人の予想です。球団が提出した正式なプロテクト名簿ではありません。', 60, 1300, 1080);
    ctx.fillText('Player Lens  /  pro-baseball-watch-guide.com', 60, 1337);
    canvas.toBlob(blob => {
      if (!blob) { $('protectNotice').textContent = '画像を作成できませんでした。'; return; }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = objectUrl;
      a.download = '28人プロテクト_' + state.team + '_2026.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      $('protectNotice').textContent = '選択した選手の一覧をPNG画像として保存しました。';
    }, 'image/png');
  }
  async function init() {
    $('protectError').hidden = true;
    $('protectStatus').textContent = '選手名簿を読み込んでいます。';
    try {
      const rows = await D.loadCsv('./data/fa/fa_protect_roster_2026.csv',
        ['選手ID', '球団名', '選手名', '背番号', 'ポジション', '契約区分', 'プロテクト候補判定', '外国人区分', '基準日']);
      // Filter once on load: list, 28 selections, saved picks, shared picks, and exports
      // all use the same eligible roster. Foreign and developmental players never enter it.
      state.all = rows.filter(p => p.選手ID && p.球団名 && p.選手名 && isSelectablePlayer(p));
      if (!state.all.length) throw new Error('選手名簿に登録選手がいません。');
      const teams = [...new Set(state.all.map(p => p.球団名))];
      $('protectTeam').innerHTML = teams.map(t => '<option value="' + esc(t) + '">' + esc(t) + '</option>').join('');
      const url = new URL(location.href), requested = url.searchParams.get('team');
      const first = teams.includes(requested) ? requested
        : teams.includes('読売ジャイアンツ') ? '読売ジャイアンツ' : teams[0];
      $('protectControls').hidden = $('protectWorkspace').hidden = false;
      switchTeam(first, url);
    } catch (error) {
      $('protectError').hidden = false; $('protectErrorText').textContent = error.message;
      $('protectStatus').textContent = '読み込みに失敗しました。';
    }
  }
  $('protectTeam').addEventListener('change', e => { clearShareQuery(); switchTeam(e.target.value); });
  $('protectPosition').addEventListener('change', e => { state.position = e.target.value; renderTable(); });
  $('protectView').addEventListener('change', e => { state.view = e.target.value; renderTable(); });
  $('protectSearch').addEventListener('input', e => { state.search = e.target.value; renderTable(); });
  $('protectRows').addEventListener('click', e => {
    const restore = e.target.closest('button[data-exclude]');
    if (restore) { excludePlayer(restore.dataset.exclude); return; }
    if (e.target.closest('label.protect-player-label')) return;
    const row = e.target.closest('.protect-player-row');
    if (row) changeSelection(row.dataset.id, !state.selected.has(row.dataset.id));
  });
  $('protectRows').addEventListener('change', e => {
    const input = e.target.closest('input.protect-row-check');
    if (input) changeSelection(input.dataset.id, input.checked);
  });
  $('protectExcludedList').addEventListener('click', e => {
    const button = e.target.closest('button[data-restore]'); if (!button) return;
    state.excluded.delete(button.dataset.restore); clearShareQuery(); save(); render();
    $('protectNotice').textContent = '選手を一覧に戻しました。';
  });
  $('protectReset').addEventListener('click', () => {
    if (!window.confirm(state.team + 'の選択と個別除外をすべて解除しますか？')) return;
    state.selected.clear(); state.excluded.clear(); clearShareQuery(); save(); render();
    $('protectNotice').textContent = '選択をリセットしました。';
  });
  $('protectImage').addEventListener('click', drawImage);
  $('protectShare').addEventListener('click', copyLink);
  $('protectRetry').addEventListener('click', init);
  init();
})();