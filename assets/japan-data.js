/* National-team joins are deliberately strict: exact normalized name AND team,
   with no fuzzy-name fallback. Existing first-team parsing/formatting is reused. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PlayerLensJapan = factory(root.PlayerLensData);
})(typeof window === 'undefined' ? globalThis : window, function (D) {
  'use strict';
  const text = value => String(value ?? '').trim();
  const nameKey = value => text(value).normalize('NFKC').replace(/\s/g, '');
  const eventKey = (year, tournament) => JSON.stringify([text(year), text(tournament)]);
  function calendarDate(value) {
    const match = text(value).match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? [year, month, day] : null;
  }
  function ageAt(birthdate, referenceDate) {
    const birth = calendarDate(birthdate), reference = calendarDate(referenceDate);
    if (!birth || !reference) return null;
    const age = reference[0] - birth[0] - (reference[1] < birth[1] || (reference[1] === birth[1] && reference[2] < birth[2]) ? 1 : 0);
    return age >= 0 ? age : null;
  }
  function buildIndex(rows, nameColumn, teamColumn) {
    const index = new Map();
    for (const row of rows) {
      const name = nameKey(row[nameColumn]), team = D.shortTeam(row[teamColumn]);
      if (!name || !team) continue;
      const key = JSON.stringify([name, team]);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(row);
    }
    return index;
  }
  function match(index, name, team) {
    const matches = index.get(JSON.stringify([nameKey(name), D.shortTeam(team)])) || [];
    return matches.length === 1 ? matches[0] : null;
  }
  function eventsFromRoster(rows, settings) {
    const configured = new Map();
    for (const event of settings) {
      const key = eventKey(event.year, event.tournament);
      if (configured.has(key)) throw new Error('大会設定の「年＋大会」が重複しています。');
      configured.set(key, event);
    }
    const events = new Map();
    for (const row of rows) {
      if (!text(row.年) || !text(row.大会)) continue;
      const key = eventKey(row.年, row.大会);
      if (!events.has(key)) events.set(key, { year: text(row.年), tournament: text(row.大会), name: text(row.大会), configured: configured.has(key), ...(configured.get(key) || {}), players: 0, staff: 0 });
      if (text(row.区分) === '選手') events.get(key).players += 1;
      if (text(row.区分) === '首脳陣') events.get(key).staff += 1;
    }
    return [...events.values()].sort((a, b) => Number(b.year) - Number(a.year) || text(b.startDate).localeCompare(text(a.startDate)) || a.name.localeCompare(b.name, 'ja'));
  }
  function buildTournament(rows, event, season, masterRows, batterRows, pitcherRows) {
    const masterIndex = buildIndex(masterRows, '投手', '球団名');
    const batterIndex = buildIndex(batterRows, '選手名', 'チーム');
    const pitcherIndex = buildIndex(pitcherRows, '選手名', 'チーム');
    const players = [], staff = [];
    for (const row of rows.filter(row => eventKey(row.年, row.大会) === eventKey(event.year, event.tournament))) {
      if (text(row.区分) === '首脳陣') {
        staff.push({ number: row.背番号, name: row.氏名, role: row['役職・ポジション'] });
        continue;
      }
      if (text(row.区分) !== '選手') continue;
      const position = text(row['役職・ポジション']);
      const master = match(masterIndex, row.氏名, row.所属球団);
      const index = position === '投手' ? pitcherIndex : ['捕手', '内野手', '外野手'].includes(position) ? batterIndex : null;
      const proYearsValue = text(row[season?.proYearsColumn]);
      players.push({ number: row.背番号, name: row.氏名, team: row.所属球団, position,
        oa: text(row.備考).includes('OA枠'), master,
        age: master ? ageAt(master.生年月日, event.startDate) : null,
        proYears: /^\d+$/.test(proYearsValue) ? Number(proYearsValue) : null,
        stats: index ? match(index, row.氏名, row.所属球団) : null });
    }
    return { event, season, players, staff };
  }
  function statItems(player) {
    const row = player.stats;
    if (!row) return [];
    const columns = player.position === '投手'
      ? ['登板', '勝', '敗', '防御率', '投球回', '奪三振', 'ホールド', 'セーブ']
      : ['試合', '打率', '安打', '本塁打', '打点', '盗塁', 'OPS'];
    return columns.filter(column => Object.hasOwn(row, column) || (column === '投球回' && Object.hasOwn(row, '投球回(アウト)'))).map(column => {
      let value = row[column];
      if (column === '投球回' && !text(value) && /^\d+$/.test(text(row['投球回(アウト)']))) value = D.inningsFromOuts(row['投球回(アウト)']);
      const missing = !text(value) || ['-', '－', '—'].includes(text(value));
      return [column, missing ? '—' : D.formatValue(value, column)];
    });
  }
  return { nameKey, eventKey, ageAt, buildIndex, match, eventsFromRoster, buildTournament, statItems };
});
