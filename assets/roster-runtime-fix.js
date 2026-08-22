(function () {
  if (window.__playerLensRosterRuntimeFixLoaded) return;
  window.__playerLensRosterRuntimeFixLoaded = true;

  const D = window.PlayerLensData;
  if (!D || typeof D.loadRosterData !== "function") return;

  const originalLoadRosterData = D.loadRosterData.bind(D);
  const scriptUrl = document.currentScript?.src || new URL("./assets/roster-runtime-fix.js", location.href).href;
  const rosterUrl = new URL("../data/registration_history.csv", scriptUrl);
  let cachedPromise = null;

  function normalizeName(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .replace(/\u3000/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      const next = input[i + 1];
      if (ch === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }

    if (cell || row.length) {
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  async function loadFixedRosterData() {
    const response = await fetch(rosterUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`registration_history.csv: HTTP ${response.status}`);

    const rows = parseCsv(await response.text());
    return rows
      .map((row) => {
        const team = D.shortTeam(row["球団名"] || row["球団"] || row["チーム"] || "");
        return {
          ...row,
          選手名: normalizeName(row["選手名"] || row["投手"] || ""),
          チーム: team,
          リーグ: D.leagueOfTeam(team),
          更新日: row["更新日"] || row["更新日時"] || "",
        };
      })
      .filter((row) => row["選手名"] && row["チーム"]);
  }

  D.loadRosterData = function fixedLoadRosterData() {
    if (cachedPromise) return cachedPromise;
    cachedPromise = loadFixedRosterData().catch(async (error) => {
      console.warn("Player Lens roster normalization fallback:", error);
      cachedPromise = null;
      return originalLoadRosterData();
    });
    return cachedPromise;
  };
})();
