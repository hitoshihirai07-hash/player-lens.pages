/* Farm-only metrics. The first-team data and scoring modules are not used. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlayerLensFarm = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const aliases = {
    巨人: ['読売', '読売ジャイアンツ', 'ジャイアンツ'],
    阪神: ['阪神タイガース'],
    DeNA: ['横浜DeNAベイスターズ', '横浜DeNA', '横浜', 'ベイスターズ'],
    広島: ['広島東洋カープ', '広島カープ'],
    ヤクルト: ['東京ヤクルトスワローズ', '東京ヤクルト'],
    中日: ['中日ドラゴンズ'],
    オリックス: ['オリックス・バファローズ', 'オリックスバファローズ'],
    ソフトバンク: ['福岡ソフトバンクホークス', '福岡ソフトバンク'],
    ロッテ: ['千葉ロッテマリーンズ', '千葉ロッテ'],
    楽天: ['東北楽天ゴールデンイーグルス', '東北楽天', '楽天イーグルス'],
    西武: ['埼玉西武ライオンズ', '埼玉西武'],
    日本ハム: ['北海道日本ハムファイターズ', '北海道日本ハム', '日ハム'],
    オイシックス: ['オイシックス新潟アルビレックス・ベースボール・クラブ', 'オイシックス新潟アルビレックスBC', 'オイシックス新潟'],
    ハヤテ: ['くふうハヤテベンチャーズ静岡', 'ハヤテベンチャーズ静岡', 'くふうハヤテ', 'はやて'],
  };
  const key = value => String(value ?? '').normalize('NFKC').replace(/[\s・]/g, '').toLowerCase();
  const teamsByAlias = new Map();
  for (const [team, names] of Object.entries(aliases)) {
    for (const name of [team, ...names]) teamsByAlias.set(key(name), team);
  }
  function normalizeTeam(value) { return teamsByAlias.get(key(value)) || String(value ?? '').trim(); }
  function number(value) {
    if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) return null;
    return Number(value);
  }
  function parseCsv(text) {
    const lines = [];
    let values = [], value = '', quoted = false;
    const input = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i += 1) {
      const c = input[i];
      if (c === '"' && quoted && input[i + 1] === '"') { value += '"'; i += 1; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { values.push(value); value = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && input[i + 1] === '\n') i += 1;
        values.push(value);
        if (values.some(v => v.trim())) lines.push(values);
        values = []; value = '';
      } else value += c;
    }
    if (quoted) throw new Error('CSVの引用符が閉じていません。');
    if (value || values.length) { values.push(value); lines.push(values); }
    const headers = (lines.shift() || []).map(h => h.trim());
    return lines.map(row => Object.fromEntries(headers.map((h, i) => [h, (row[i] ?? '').trim()])));
  }
  function inningsToOuts(value) {
    const match = String(value ?? '').trim().match(/^(\d+)(?:\.([012]))?$/);
    return match ? Number(match[1]) * 3 + Number(match[2] || 0) : null;
  }
  function base(row) { return { raw: row, name: String(row.選手 ?? '').trim(), team: normalizeTeam(row.球団) }; }
  function batterMetrics(row) {
    const obp = number(row.出塁率), slg = number(row.長打率);
    return { ...base(row), pa: number(row.打席), avg: number(row.打率),
      ops: obp === null || slg === null ? null : Number((obp + slg).toFixed(6)),
      hr: number(row.本塁打), rbi: number(row.打点), hits: number(row.安打),
      walks: number(row.四球), strikeouts: number(row.三振), steals: number(row.盗塁) };
  }
  function pitcherMetrics(row) {
    const outs = inningsToOuts(row.投球回), k = number(row.奪三振), walks = number(row.四球);
    const ip = outs === null ? null : outs / 3;
    return { ...base(row), outs, ip, era: number(row.防御率), k, walks, games: number(row.登板),
      k9: ip > 0 && k !== null ? k * 9 / ip : null,
      bb9: ip > 0 && walks !== null ? walks * 9 / ip : null,
      kbb: walks > 0 && k !== null ? k / walks : null };
  }
  const clip = n => Math.max(0, Math.min(1, n));
  const scaled = (n, low, high) => clip((n - low) / (high - low));
  const confidence = (amount, prior) => amount / (amount + prior);
  function batterScore(p) {
    if (!(p.pa > 0) || [p.ops, p.avg, p.hr, p.rbi, p.hits, p.walks, p.strikeouts, p.steals].some(v => v === null)) return null;
    const quality = 35 * scaled(p.ops, .45, 1.05) + 10 * scaled(p.avg, .15, .35)
      + 12 * scaled(p.hr, 0, 25) + 8 * scaled(p.rbi, 0, 80) + 8 * scaled(p.hits, 0, 130)
      + 10 * scaled(p.walks / p.pa, 0, .15) + 10 * (1 - scaled(p.strikeouts / p.pa, 0, .35))
      + 7 * scaled(p.steals, 0, 30);
    return quality * (.35 + .65 * confidence(p.pa, 100));
  }
  function pitcherScore(p) {
    if (!(p.ip > 0) || [p.era, p.k9, p.bb9, p.k, p.walks, p.games].some(v => v === null)) return null;
    // K/(BB+1) stabilizes the score at zero walks; the displayed K/BB is unchanged.
    const quality = 35 * (1 - scaled(p.era, 0, 7)) + 20 * scaled(p.k9, 0, 12)
      + 15 * (1 - scaled(p.bb9, 0, 6)) + 10 * scaled(p.k / (p.walks + 1), 0, 6)
      + 10 * scaled(p.ip, 0, 140) + 7 * scaled(p.k, 0, 140) + 3 * scaled(p.games, 0, 50);
    return quality * (.35 + .65 * confidence(p.ip, 25));
  }
  function rank(players, score) {
    players.forEach(p => { p.score = score(p); });
    players.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, 'ja') || a.team.localeCompare(b.team, 'ja'));
    let previous = null;
    players.forEach((p, i) => {
      p.rank = p.score === null ? null : previous?.score === p.score ? previous.rank : i + 1;
      previous = p;
    });
    return players;
  }
  function buildDataset(batterRows, pitcherRows, standingRows, year) {
    const forYear = (rows, field) => {
      const populated = rows.filter(r => String(r[field] ?? '').trim());
      if (populated.some(r => !String(r.年度 ?? '').trim())) throw new Error('CSVの年度列を確認してください。');
      return populated.filter(r => number(r.年度) === Number(year));
    };
    const standings = forYear(standingRows, '球団').map(row => ({ raw: row, team: normalizeTeam(row.球団), district: row.地区, rank: number(row.順位) }));
    if (!standings.length) throw new Error('選択した年度の順位CSVがありません。');
    const teams = new Map();
    for (const row of standings) {
      if (!row.district || !row.rank || teams.has(row.team)) throw new Error('順位CSVの地区・順位・球団の重複を確認してください。');
      teams.set(row.team, row.district);
    }
    const districtOrder = ['東地区', '中地区', '西地区'];
    const districts = [...new Set(standings.map(row => row.district))].sort((a, b) => {
      const ia = districtOrder.indexOf(a), ib = districtOrder.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'ja');
    });
    const makePlayers = (rows, metrics, score) => {
      const players = forYear(rows, '選手').map(metrics);
      if (!players.length) throw new Error('選択した年度の選手成績CSVがありません。');
      for (const p of players) {
        if (!teams.has(p.team)) throw new Error(`順位CSVに球団「${p.team}」がありません。`);
        p.district = teams.get(p.team);
      }
      return rank(players, score);
    };
    return { year: Number(year), standings, teams, districts,
      batters: makePlayers(batterRows, batterMetrics, batterScore),
      pitchers: makePlayers(pitcherRows, pitcherMetrics, pitcherScore) };
  }
  return { parseCsv, normalizeTeam, number, inningsToOuts, batterMetrics, pitcherMetrics, batterScore, pitcherScore, buildDataset };
});
