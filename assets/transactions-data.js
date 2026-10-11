/* Display-only CSV helpers. Source columns and values remain unchanged. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlayerLensTransactions = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
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
    // Small CSV fixtures may be parsed too; the page validates the full schema.
    return lines.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
  }
  function calendarDate(value) {
    const match = String(value ?? '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!match) return null;
    const [y, m, d] = match.slice(1).map(Number);
    const time = Date.UTC(y, m - 1, d), date = new Date(time);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return { time, label: `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}` };
  }
  function dateLabel(value) { return calendarDate(value)?.label || String(value ?? ''); }
  function sortRows(rows) {
    return rows.map((row, index) => ({ row, index })).sort((a, b) =>
      (calendarDate(b.row.発生日)?.time ?? -Infinity) - (calendarDate(a.row.発生日)?.time ?? -Infinity) || a.index - b.index
    ).map(item => item.row);
  }
  function latestUpdate(rows) {
    const dates = rows.map(r => calendarDate(r.更新日)).filter(Boolean).sort((a, b) => b.time - a.time);
    return dates[0]?.label || '';
  }
  const nameKey = value => String(value ?? '').normalize('NFKC').replace(/\s/g, '').toLowerCase();
  function filterRows(rows, filters = {}) {
    return rows.filter(row => (!filters.team || filters.team === 'all' || row.球団 === filters.team)
      && (!filters.type || filters.type === 'all' || row.区分 === filters.type)
      && (!filters.contract || filters.contract === 'all' || row.契約区分 === filters.contract)
      && nameKey(row.選手名).includes(nameKey(filters.search)));
  }
  function values(rows, column) { return [...new Set(rows.map(r => r[column]).filter(v => String(v ?? '').trim()))]; }
  return { parseCsv, calendarDate, dateLabel, sortRows, latestUpdate, filterRows, values };
});
