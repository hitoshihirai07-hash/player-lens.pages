(function () {
  "use strict";

  var D = window.PlayerLensData;
  if (!D) return;

  var FILES = {
    preview: "./data/preview_starter.csv",
    registration: "./data/registration_history.csv"
  };
  var POSITIONS = ["投", "捕", "一", "二", "三", "遊", "左", "中", "右", "指"];
  var POSITION_LABELS = {
    "投": "投手", "捕": "捕手", "一": "一塁", "二": "二塁", "三": "三塁",
    "遊": "遊撃", "左": "左翼", "中": "中堅", "右": "右翼", "指": "指名打者"
  };
  var START_KEYS = {
    "投": "(投)", "捕": "(捕)", "一": "(一)", "二": "(二)", "三": "(三)",
    "遊": "(遊)", "左": "(左)", "中": "(中)", "右": "(右)", "指": "(指)"
  };
  var DEFAULT_POSITIONS = ["中", "二", "右", "一", "捕", "三", "左", "遊"];

  var els = {
    dataStatus: document.getElementById("lineupDataStatus"),
    date: document.getElementById("lineupDate"),
    team: document.getElementById("lineupTeam"),
    opponent: document.getElementById("lineupOpponent"),
    dhButtons: document.getElementById("lineupDhButtons"),
    dhNote: document.getElementById("lineupDhNote"),
    ownPitcher: document.getElementById("lineupOwnPitcher"),
    opponentPitcher: document.getElementById("lineupOpponentPitcher"),
    matchupTeams: document.getElementById("lineupMatchupTeams"),
    venue: document.getElementById("lineupVenue"),
    list: document.getElementById("lineupList"),
    starterSlot: document.getElementById("lineupStarterSlot"),
    dhPitcher: document.getElementById("lineupDhPitcher"),
    validation: document.getElementById("lineupValidation"),
    reset: document.getElementById("lineupReset"),
    save: document.getElementById("lineupSaveImage"),
    scope: document.getElementById("lineupScope"),
    sort: document.getElementById("lineupSort"),
    search: document.getElementById("lineupSearch"),
    candidateCount: document.getElementById("lineupCandidateCount"),
    candidateList: document.getElementById("lineupCandidateList")
  };

  var state = {
    preview: [],
    season: [],
    recent: [],
    starterPositions: [],
    activeKeys: new Set(),
    date: "",
    team: "",
    dh: false,
    lineup: [],
    scope: "active",
    sort: "recent",
    query: ""
  };

  function normalizeName(value) {
    return String(value || "").normalize("NFKC").replace(/\u3000/g, " ").trim().replace(/\s+/g, " ");
  }

  function playerKey(name, team) {
    return normalizeName(name).replace(/\s/g, "") + "|" + team;
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = "";
    var quoted = false;
    var input = String(text || "").replace(/^\uFEFF/, "");
    var i;
    for (i = 0; i < input.length; i += 1) {
      var char = input[i];
      var next = input[i + 1];
      if (char === "\"" && quoted && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some(function (value) { return value !== ""; })) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    var headers = rows.shift() || [];
    return rows.map(function (values) {
      var record = {};
      headers.forEach(function (header, index) {
        record[header] = values[index] || "";
      });
      return record;
    });
  }

  async function loadCsv(path) {
    var response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("データを読み込めませんでした");
    return parseCsv(await response.text());
  }

  function normalizeDate(value) {
    var match = String(value || "").trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (!match) return "";
    return match[1] + "-" + String(match[2]).padStart(2, "0") + "-" + String(match[3]).padStart(2, "0");
  }

  function formatDate(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    var date = new Date(value + "T00:00:00");
    var weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return Number(match[2]) + "月" + Number(match[3]) + "日（" + weekday + "）";
  }

  function currentGame() {
    return state.preview.find(function (row) {
      return row.date === state.date && row.team === state.team;
    }) || null;
  }

  function opponentGame() {
    var game = currentGame();
    if (!game) return null;
    return state.preview.find(function (row) {
      return row.date === game.date && row.team === game.opponent;
    }) || null;
  }

  function predictedPitcher() {
    var game = currentGame();
    return game ? game.pitcher : "";
  }

  function recentMap() {
    return new Map(state.recent.map(function (row) {
      return [playerKey(row["選手名"], row["チーム"]), row];
    }));
  }

  function starterPositionMap() {
    return new Map(state.starterPositions.map(function (row) {
      return [playerKey(row["選手名"], row["チーム"]), row];
    }));
  }

  function teamPlayers() {
    var players = state.season.filter(function (row) {
      return row["チーム"] === state.team && row["選手名"];
    }).slice();
    var pitcher = predictedPitcher();
    var hasPitcher = players.some(function (row) {
      return playerKey(row["選手名"], row["チーム"]) === playerKey(pitcher, state.team);
    });
    if (pitcher && !hasPitcher) {
      players.push({
        "選手名": pitcher,
        "チーム": state.team,
        "ポジション": "投手",
        "打率": "",
        "OPS": "",
        "本塁打": "",
        "打席": ""
      });
    }
    return players;
  }

  function isActive(player) {
    return state.activeKeys.has(playerKey(player["選手名"], state.team));
  }

  function statNumber(value) {
    var parsed = Number(String(value || "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : -1;
  }

  function average(value) {
    if (value === "" || value == null || !Number.isFinite(Number(value))) return "---";
    return Number(value).toFixed(3).replace(/^0/, "");
  }

  function integer(value) {
    if (value === "" || value == null || !Number.isFinite(Number(value))) return "－";
    return String(Math.trunc(Number(value)));
  }

  function recentFor(player) {
    if (!player) return null;
    return recentMap().get(playerKey(player["選手名"], player["チーム"])) || null;
  }

  function selectedNames() {
    return state.lineup.map(function (slot) { return slot.player; }).filter(Boolean);
  }

  function defaultDhForGame() {
    var game = currentGame();
    if (!game) return false;
    return D.leagueOfTeam(game.team) === "パ" && D.leagueOfTeam(game.opponent) === "パ";
  }

  function resetLineup(useGameDefault) {
    if (useGameDefault) state.dh = defaultDhForGame();
    state.lineup = DEFAULT_POSITIONS.map(function (position) {
      return { player: "", position: position };
    });
    state.lineup.push({
      player: state.dh ? "" : predictedPitcher(),
      position: state.dh ? "指" : "投"
    });
    renderAll();
  }

  function switchDh(nextDh) {
    if (state.dh === nextDh) return;
    state.dh = nextDh;
    var previousSpecial = nextDh ? "投" : "指";
    var index = state.lineup.findIndex(function (slot) {
      return slot.position === previousSpecial;
    });
    if (index < 0) index = 8;
    state.lineup[index] = {
      player: nextDh ? "" : predictedPitcher(),
      position: nextDh ? "指" : "投"
    };
    renderAll();
  }

  function suggestedPosition(player) {
    if (player["ポジション"] === "投手") return "投";
    var row = starterPositionMap().get(playerKey(player["選手名"], player["チーム"]));
    if (!row) return "";
    var allowed = state.dh
      ? POSITIONS.filter(function (position) { return position !== "投"; })
      : POSITIONS.filter(function (position) { return position !== "指"; });
    var ranked = allowed.map(function (position) {
      return { position: position, count: statNumber(row[START_KEYS[position]]) };
    }).sort(function (a, b) { return b.count - a.count; });
    return ranked.length && ranked[0].count > 0 ? ranked[0].position : "";
  }

  function nextOpenSlotIndex(player) {
    var suggested = suggestedPosition(player);
    if (suggested) {
      var matching = state.lineup.findIndex(function (slot) {
        return !slot.player && slot.position === suggested;
      });
      if (matching >= 0) return matching;
    }
    return state.lineup.findIndex(function (slot) { return !slot.player; });
  }

  function addPlayer(name) {
    if (!name || selectedNames().includes(name)) return;
    var player = teamPlayers().find(function (row) { return row["選手名"] === name; });
    if (!player) return;
    var index = nextOpenSlotIndex(player);
    if (index < 0) return;
    state.lineup[index].player = name;
    renderAll();
    var row = els.list.querySelector("[data-lineup-index=\"" + index + "\"]");
    if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function playerOptions(current, position) {
    var chosen = new Set(selectedNames().filter(function (name) { return name !== current; }));
    var pitcherSlot = position === "投";
    var players = teamPlayers().filter(function (player) {
      return pitcherSlot ? player["ポジション"] === "投手" : player["ポジション"] !== "投手";
    }).sort(function (a, b) {
      return Number(isActive(b)) - Number(isActive(a)) || a["選手名"].localeCompare(b["選手名"], "ja");
    });
    return "<option value=\"\">選手を選択</option>" + players.map(function (player) {
      var name = player["選手名"];
      return "<option value=\"" + D.escapeHtml(name) + "\"" +
        (name === current ? " selected" : "") +
        (chosen.has(name) ? " disabled" : "") + ">" +
        D.escapeHtml(name) + (isActive(player) ? "" : "（登録外）") + "</option>";
    }).join("");
  }

  function positionOptions(current) {
    var available = state.dh
      ? POSITIONS.filter(function (position) { return position !== "投"; })
      : POSITIONS.filter(function (position) { return position !== "指"; });
    return available.map(function (position) {
      return "<option value=\"" + position + "\"" + (position === current ? " selected" : "") + ">" +
        position + "・" + POSITION_LABELS[position] + "</option>";
    }).join("");
  }

  function slotMetrics(name) {
    if (!name) return "<span class=\"lineup-row-placeholder\">選手を選ぶと成績を表示</span>";
    var player = teamPlayers().find(function (row) { return row["選手名"] === name; }) || {};
    var recent = recentFor(player);
    return "<span><b>今季</b> 打率 " + average(player["打率"]) +
      "　OPS " + average(player["OPS"]) + "　" + integer(player["本塁打"]) + "本</span>" +
      "<span><b>直近6試合</b> 打率 " + average(recent && recent["打率"]) +
      "　" + integer(recent && recent["安打"]) + "安打　" +
      integer(recent && recent["本塁打"]) + "本</span>";
  }

  function validateLineup() {
    var errors = [];
    var players = selectedNames();
    var positions = state.lineup.map(function (slot) { return slot.position; }).filter(Boolean);
    var expected = state.dh
      ? ["捕", "一", "二", "三", "遊", "左", "中", "右", "指"]
      : ["投", "捕", "一", "二", "三", "遊", "左", "中", "右"];
    if (players.length !== 9) errors.push("選手をあと" + (9 - players.length) + "人選んでください");
    if (new Set(players).size !== players.length) errors.push("同じ選手が重複しています");
    var duplicatePositions = positions.filter(function (position, index) {
      return positions.indexOf(position) !== index;
    });
    if (duplicatePositions.length) errors.push("守備位置が重複しています");
    var missingPositions = expected.filter(function (position) {
      return !positions.includes(position);
    });
    if (missingPositions.length) errors.push("未設定の守備位置：" + missingPositions.join("・"));
    return errors;
  }

  function renderLineup() {
    var positionCounts = state.lineup.reduce(function (map, slot) {
      map.set(slot.position, (map.get(slot.position) || 0) + 1);
      return map;
    }, new Map());
    els.list.innerHTML = state.lineup.map(function (slot, index) {
      var errorClass = positionCounts.get(slot.position) > 1 ? " has-position-error" : "";
      return "<article class=\"lineup-row" + errorClass + "\" data-lineup-index=\"" + index + "\">" +
        "<div class=\"lineup-order\"><strong>" + (index + 1) + "</strong><span>番</span></div>" +
        "<label class=\"lineup-player-select\"><span>選手</span><select data-lineup-player=\"" + index + "\">" +
        playerOptions(slot.player, slot.position) + "</select></label>" +
        "<label class=\"lineup-position-select\"><span>守備</span><select data-lineup-position=\"" + index + "\">" +
        positionOptions(slot.position) + "</select></label>" +
        "<div class=\"lineup-row-metrics\">" + slotMetrics(slot.player) + "</div></article>";
    }).join("");

    els.list.querySelectorAll("[data-lineup-player]").forEach(function (select) {
      select.addEventListener("change", function () {
        var index = Number(select.dataset.lineupPlayer);
        state.lineup[index].player = select.value;
        renderAll();
      });
    });
    els.list.querySelectorAll("[data-lineup-position]").forEach(function (select) {
      select.addEventListener("change", function () {
        var index = Number(select.dataset.lineupPosition);
        state.lineup[index].position = select.value;
        var selectedPlayer = teamPlayers().find(function (player) {
          return player["選手名"] === state.lineup[index].player;
        });
        if (selectedPlayer) {
          var pitcherSelected = selectedPlayer["ポジション"] === "投手";
          if ((select.value === "投") !== pitcherSelected) state.lineup[index].player = "";
        }
        renderAll();
      });
    });

    var errors = validateLineup();
    els.validation.textContent = errors.length ? errors.join("。") : "スタメンが完成しました。画像を保存できます。";
    els.validation.classList.toggle("is-ready", errors.length === 0);
    els.save.disabled = errors.length > 0;
    els.starterSlot.hidden = !state.dh;
    els.dhPitcher.textContent = predictedPitcher() || "未定";
  }

  function candidateRows() {
    var selected = new Set(selectedNames());
    var players = teamPlayers().filter(function (player) {
      return player["ポジション"] !== "投手";
    });
    if (state.scope === "active") players = players.filter(isActive);
    if (state.query) {
      var query = normalizeName(state.query).replace(/\s/g, "").toLowerCase();
      players = players.filter(function (player) {
        return normalizeName(player["選手名"]).replace(/\s/g, "").toLowerCase().includes(query);
      });
    }
    var recent = recentMap();
    players.sort(function (a, b) {
      if (state.sort === "name") return a["選手名"].localeCompare(b["選手名"], "ja");
      if (state.sort === "season") return statNumber(b["打率"]) - statNumber(a["打率"]);
      if (state.sort === "ops") return statNumber(b["OPS"]) - statNumber(a["OPS"]);
      var bRecent = recent.get(playerKey(b["選手名"], b["チーム"]));
      var aRecent = recent.get(playerKey(a["選手名"], a["チーム"]));
      return statNumber(bRecent && bRecent["打率"]) - statNumber(aRecent && aRecent["打率"]);
    });
    return players.map(function (player) {
      player.isSelected = selected.has(player["選手名"]);
      return player;
    });
  }

  function renderCandidates() {
    var rows = candidateRows();
    els.candidateCount.textContent = rows.length + "人";
    if (!rows.length) {
      els.candidateList.innerHTML = "<p class=\"lineup-empty\">条件に合う選手がいません。表示条件を「球団の全選手」に切り替えてください。</p>";
      return;
    }
    els.candidateList.innerHTML = rows.map(function (player) {
      var recent = recentFor(player);
      var position = player["ポジション"] || "野手";
      var batting = player["打"] ? "・" + D.escapeHtml(player["打"]) + "打" : "";
      return "<article class=\"lineup-candidate" + (player.isSelected ? " is-selected" : "") + "\">" +
        "<div class=\"lineup-candidate-main\"><div><strong>" + D.escapeHtml(player["選手名"]) +
        "</strong><span>" + D.escapeHtml(position) + batting + "</span></div>" +
        "<button type=\"button\" data-add-player=\"" + D.escapeHtml(player["選手名"]) + "\"" +
        (player.isSelected ? " disabled" : "") + ">" +
        (player.isSelected ? "選択済み" : "次の空き枠へ") + "</button></div>" +
        "<dl class=\"lineup-stat-grid\">" +
        "<div><dt>今季打率</dt><dd>" + average(player["打率"]) + "</dd></div>" +
        "<div><dt>今季OPS</dt><dd>" + average(player["OPS"]) + "</dd></div>" +
        "<div><dt>本塁打</dt><dd>" + integer(player["本塁打"]) + "本</dd></div>" +
        "<div><dt>直近打率</dt><dd>" + average(recent && recent["打率"]) + "</dd></div>" +
        "<div><dt>直近安打</dt><dd>" + integer(recent && recent["安打"]) + "安打</dd></div>" +
        "<div><dt>直近本塁打</dt><dd>" + integer(recent && recent["本塁打"]) + "本</dd></div>" +
        "</dl></article>";
    }).join("");
    els.candidateList.querySelectorAll("[data-add-player]").forEach(function (button) {
      button.addEventListener("click", function () { addPlayer(button.dataset.addPlayer); });
    });
  }

  function renderGame() {
    var game = currentGame();
    var other = opponentGame();
    if (!game) return;
    els.opponent.value = game.opponent;
    els.ownPitcher.textContent = game.pitcher || "未定";
    els.opponentPitcher.textContent = other && other.pitcher ? other.pitcher : "未定";
    els.matchupTeams.textContent = game.team + " vs " + game.opponent;
    els.venue.textContent = formatDate(game.date) + "　" + (game.venue || "球場未定");
    els.dhButtons.querySelectorAll("button").forEach(function (button) {
      button.setAttribute("aria-pressed", String((button.dataset.dh === "true") === state.dh));
    });
    els.dhNote.textContent = D.leagueOfTeam(game.team) !== D.leagueOfTeam(game.opponent)
      ? "交流戦などリーグをまたぐカードは、開催球場のルールに合わせてDHを切り替えてください。"
      : "DHは試合に合わせて切り替えられます。";
  }

  function renderAll() {
    renderGame();
    renderLineup();
    renderCandidates();
  }

  function renderDateOptions() {
    var dates = Array.from(new Set(state.preview.map(function (row) { return row.date; }))).filter(Boolean).sort();
    els.date.innerHTML = dates.map(function (date) {
      return "<option value=\"" + date + "\">" + formatDate(date) + "</option>";
    }).join("");
    var today = new Date();
    var todayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") +
      "-" + String(today.getDate()).padStart(2, "0");
    state.date = dates.includes(todayKey) ? todayKey : dates[dates.length - 1] || "";
    els.date.value = state.date;
  }

  function renderTeamOptions(preferred) {
    var teams = state.preview.filter(function (row) {
      return row.date === state.date;
    }).map(function (row) { return row.team; }).filter(Boolean);
    els.team.innerHTML = teams.map(function (team) {
      return "<option value=\"" + D.escapeHtml(team) + "\">" + D.escapeHtml(team) + "</option>";
    }).join("");
    state.team = teams.includes(preferred) ? preferred : (teams.includes("巨人") ? "巨人" : (teams[0] || ""));
    els.team.value = state.team;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function fitText(ctx, text, maxWidth, startSize, minSize) {
    var size = startSize;
    while (size > minSize) {
      ctx.font = "700 " + size + "px \"Yu Gothic\", \"Meiryo\", sans-serif";
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return size;
  }

  function drawLineupCard(ctx, slot, index, x, y, player, recent) {
    var width = 550;
    var height = 128;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = "#d9e0e8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0f766e";
    ctx.beginPath();
    ctx.arc(x + 52, y + height / 2, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 31px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), x + 52, y + height / 2 + 1);

    ctx.fillStyle = "#e4f4f1";
    roundedRect(ctx, x + 96, y + 20, 58, 42, 10);
    ctx.fill();
    ctx.fillStyle = "#0b5f59";
    ctx.font = "800 24px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(slot.position, x + 125, y + 42);

    ctx.textAlign = "left";
    ctx.fillStyle = "#16202e";
    var nameSize = fitText(ctx, slot.player, width - 186, 30, 22);
    ctx.font = "800 " + nameSize + "px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(slot.player, x + 172, y + 48);

    ctx.fillStyle = "#657385";
    ctx.font = "600 17px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("今季 " + average(player && player["打率"]) + " / OPS " +
      average(player && player["OPS"]), x + 96, y + 87);
    ctx.fillStyle = "#0b5f59";
    ctx.fillText("直近6試合 " + average(recent && recent["打率"]) + " / " +
      integer(recent && recent["本塁打"]) + "本", x + 96, y + 111);
  }

  async function saveImage() {
    if (validateLineup().length) return;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    var game = currentGame();
    var other = opponentGame();
    var players = teamPlayers();
    var canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1200;
    var ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f4f6f8";
    ctx.fillRect(0, 0, 1200, 1200);
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(0, 0, 1200, 204);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.font = "700 23px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("PLAYER LENS", 60, 54);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 52px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("今日のスタメン", 60, 122);
    ctx.font = "700 30px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(game.team + " vs " + game.opponent, 60, 172);
    ctx.textAlign = "right";
    ctx.font = "700 25px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(formatDate(game.date), 1140, 118);
    ctx.font = "600 20px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(game.venue || "", 1140, 159);

    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 40, 226, 1120, 94, 18);
    ctx.fill();
    ctx.strokeStyle = "#d9e0e8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#657385";
    ctx.font = "700 17px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("予告先発", 70, 258);
    ctx.fillStyle = "#16202e";
    ctx.font = "800 26px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(game.team + "　" + (game.pitcher || "未定"), 70, 295);
    ctx.textAlign = "right";
    ctx.fillText(game.opponent + "　" + (other && other.pitcher ? other.pitcher : "未定"), 1130, 295);

    state.lineup.forEach(function (slot, index) {
      var column = index < 5 ? 0 : 1;
      var row = index < 5 ? index : index - 5;
      var x = column === 0 ? 40 : 610;
      var y = 342 + row * 142;
      var player = players.find(function (item) { return item["選手名"] === slot.player; });
      drawLineupCard(ctx, slot, index, x, y, player, recentFor(player));
    });

    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 610, 910, 550, 142, 18);
    ctx.fill();
    ctx.strokeStyle = "#acd7d0";
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#0b5f59";
    ctx.font = "800 19px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(state.dh ? "DH使用・先発投手" : "予告先発", 642, 950);
    ctx.fillStyle = "#16202e";
    ctx.font = "800 31px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText(predictedPitcher() || "未定", 642, 996);
    ctx.fillStyle = "#657385";
    ctx.font = "600 17px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("今季成績・出場した直近6試合を表示", 642, 1028);

    ctx.textAlign = "left";
    ctx.fillStyle = "#344256";
    ctx.font = "700 19px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("Player Lens", 48, 1154);
    ctx.textAlign = "right";
    ctx.fillStyle = "#657385";
    ctx.font = "600 16px \"Yu Gothic\", \"Meiryo\", sans-serif";
    ctx.fillText("※相手投手との直接対戦成績は使用していません", 1152, 1154);

    var link = document.createElement("a");
    link.download = "スタメン_" + game.team + "_" + game.date.replace(/-/g, "") + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function bindEvents() {
    els.date.addEventListener("change", function () {
      var previous = state.team;
      state.date = els.date.value;
      renderTeamOptions(previous);
      resetLineup(true);
    });
    els.team.addEventListener("change", function () {
      state.team = els.team.value;
      resetLineup(true);
    });
    els.dhButtons.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-dh]");
      if (button) switchDh(button.dataset.dh === "true");
    });
    els.reset.addEventListener("click", function () { resetLineup(false); });
    els.save.addEventListener("click", saveImage);
    els.scope.addEventListener("change", function () {
      state.scope = els.scope.value;
      renderCandidates();
    });
    els.sort.addEventListener("change", function () {
      state.sort = els.sort.value;
      renderCandidates();
    });
    els.search.addEventListener("input", function () {
      state.query = els.search.value;
      renderCandidates();
    });
  }

  async function boot() {
    bindEvents();
    try {
      var loaded = await Promise.all([
        loadCsv(FILES.preview),
        loadCsv(FILES.registration),
        D.loadData(),
        D.loadInsightData()
      ]);
      var previewRows = loaded[0];
      var registrationRows = loaded[1];
      var seasonData = loaded[2];
      var insightData = loaded[3];
      state.preview = previewRows.map(function (row) {
        return {
          team: D.shortTeam(row["球団"]),
          pitcher: normalizeName(row["予告先発"]),
          opponent: D.shortTeam(row["相手球団"]),
          venue: String(row["球場"] || "").trim(),
          date: normalizeDate(row["試合日"])
        };
      }).filter(function (row) {
        return row.team && row.opponent && row.date;
      });
      state.season = seasonData.batters.map(function (row) {
        return Object.assign({}, row, {
          "チーム": D.shortTeam(row["チーム"] || row["球団"] || row["球団名"])
        });
      });
      state.recent = insightData.recentBatters.map(function (row) {
        return Object.assign({}, row, {
          "チーム": D.shortTeam(row["チーム"] || row["球団"] || row["球団名"])
        });
      });
      state.starterPositions = insightData.starterPositions.map(function (row) {
        return Object.assign({}, row, {
          "チーム": D.shortTeam(row["チーム"] || row["球団"] || row["球団名"])
        });
      });
      registrationRows.forEach(function (row) {
        var team = D.shortTeam(row["球団名"]);
        var name = normalizeName(row["選手名"] || row["投手"]);
        if (team && name && row["現在登録中"] === "登録中") {
          state.activeKeys.add(playerKey(name, team));
        }
      });
      if (!state.preview.length) throw new Error("表示できる予告先発がありません");
      renderDateOptions();
      renderTeamOptions("巨人");
      resetLineup(true);
      els.dataStatus.textContent = formatDate(state.date) + "の予告先発を表示";
      els.dataStatus.classList.add("is-ready");
    } catch (error) {
      els.dataStatus.textContent = "データ表示エラー";
      els.dataStatus.classList.add("is-error");
      els.validation.textContent = error.message;
      console.error(error);
    }
  }

  void boot();
})();
