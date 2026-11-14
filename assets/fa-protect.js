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
    const protectedPlayers = picks();
    if (!protectedPlayers.length) return;
    const unprotectedPlayers = ordered(eligible().filter(p => !state.selected.has(p.選手ID)));
    const groupPlayers = players => POSITIONS.concat(['その他']).map(position => ({
      position,
      players: players.filter(p => POSITIONS.includes(p.ポジション)
        ? p.ポジション === position : position === 'その他')
    })).filter(group => group.players.length);

    const leftGroups = groupPlayers(protectedPlayers), rightGroups = groupPlayers(unprotectedPlayers);
    const width = 1600, margin = 44, gap = 24;
    const columnWidth = (width - margin * 2 - gap) / 2;
    const rowHeight = 44, positionHeight = 42, groupGap = 12;
    const groupHeight = groups => groups.reduce((sum, group) =>
      sum + positionHeight + group.players.length * rowHeight + groupGap, 0);
    const cardsTop = 308;
    const cardsHeight = 118 + Math.max(groupHeight(leftGroups), groupHeight(rightGroups)) + 28;
    const footerTop = cardsTop + cardsHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = footerTop + (protectedPlayers.length < MAX ? 148 : 114);
    const ctx = canvas.getContext('2d');
    if (!ctx) { $('protectNotice').textContent = 'このブラウザーでは画像を作成できません。'; return; }

    const font = (weight, size) => weight + ' ' + size + 'px "Yu Gothic", Meiryo, sans-serif';
    ctx.fillStyle = '#f5f8f8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f766e'; ctx.fillRect(0, 0, width, 15);
    ctx.fillStyle = '#183b40'; ctx.font = font('bold', 31);
    ctx.fillText('Player Lens  |  PROTECT ROSTER', 56, 79);
    ctx.font = font('bold', 48);
    ctx.fillText(state.team, 56, 157, width - 112);
    ctx.fillStyle = '#0f766e'; ctx.font = font('bold', 31);
    ctx.fillText('2026年オフ  28人プロテクト予想', 56, 221);
    ctx.fillStyle = '#52636d'; ctx.font = font('normal', 23);
    ctx.fillText('選択 ' + protectedPlayers.length + ' / 28人  ・  プロテクト漏れ ' + unprotectedPlayers.length
      + '人  ・  基準日 ' + (teamRows()[0]?.基準日 || '未登録'), 56, 270, width - 112);

    function drawColumn(x, title, countLabel, groups, selected) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, cardsTop, columnWidth, cardsHeight);
      ctx.strokeStyle = '#d7e4e3'; ctx.lineWidth = 2; ctx.strokeRect(x, cardsTop, columnWidth, cardsHeight);
      ctx.fillStyle = selected ? '#0f766e' : '#687b85';
      ctx.fillRect(x, cardsTop, columnWidth, 9);
      ctx.font = font('bold', 31);
      ctx.fillText(title, x + 24, cardsTop + 56, columnWidth - 48);
      ctx.fillStyle = '#52636d'; ctx.font = font('normal', 21);
      ctx.fillText(countLabel, x + 24, cardsTop + 92, columnWidth - 48);

      let y = cardsTop + 118;
      if (!groups.length) {
        ctx.font = font('normal', 24);
        ctx.fillText('該当する選手はいません', x + 26, y + 38, columnWidth - 52);
        return;
      }
      for (const group of groups) {
        ctx.fillStyle = selected ? '#e3f3ee' : '#eaf0f2';
        ctx.fillRect(x + 18, y, columnWidth - 36, 35);
        ctx.fillStyle = '#244f51'; ctx.font = font('bold', 22);
        ctx.fillText(group.position + '  ' + group.players.length + '人', x + 28, y + 26, columnWidth - 56);
        y += positionHeight;
        group.players.forEach((player, index) => {
          if (index % 2 === 0) {
            ctx.fillStyle = '#f7fafb';
            ctx.fillRect(x + 18, y, columnWidth - 36, rowHeight - 2);
          }
          ctx.fillStyle = '#687981'; ctx.font = font('normal', 21);
          ctx.fillText(player.背番号 || '—', x + 30, y + 31, 68);
          ctx.fillStyle = '#1b2d35'; ctx.font = font('bold', 25);
          ctx.fillText(player.選手名, x + 116, y + 31, columnWidth - 156);
          y += rowHeight;
        });
        y += groupGap;
      }
    }

    drawColumn(margin, 'プロテクト', protectedPlayers.length + '人 / 最大28人', leftGroups, true);
    drawColumn(margin + columnWidth + gap, 'プロテクト漏れ', unprotectedPlayers.length + '人', rightGroups, false);
    ctx.fillStyle = '#52636d'; ctx.font = font('normal', 20);
    ctx.fillText('個人の予想です。球団が提出した正式なプロテクト名簿ではありません。', 56, footerTop + 38, width - 112);
    ctx.fillText('対象は選択可能な支配下選手です（育成・外国人・個別除外は含みません）。', 56, footerTop + 73, width - 112);
    if (protectedPlayers.length < MAX) {
      ctx.fillStyle = '#9a5b00'; ctx.font = font('normal', 20);
      ctx.fillText('※ 28人未満のため、右側には今後プロテクトする可能性がある未選択選手も含まれます。', 56, footerTop + 108, width - 112);
    }

    canvas.toBlob(blob => {
      if (!blob) { $('protectNotice').textContent = '画像を作成できませんでした。'; return; }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = objectUrl;
      a.download = '28人プロテクト_' + state.team + '_2026.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      $('protectNotice').textContent = 'プロテクトとプロテクト漏れを左右に並べたPNG画像を保存しました。';
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