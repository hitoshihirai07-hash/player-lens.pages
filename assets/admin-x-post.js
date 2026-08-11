(function () {
  const THEME_BY_LABEL = {
    "打者総合": "batter",
    "投手総合": "pitcher",
    "規定打席": "qualified-batter",
    "規定投球回": "qualified-pitcher",
    "若手打者": "young",
    "直近野手": "recent-batter",
    "直近投手": "recent-pitcher",
    "新人王候補野手": "rookie-batter",
    "新人王候補投手": "rookie-pitcher",
    "交流戦野手": "interleague-batter",
    "交流戦投手": "interleague-pitcher",
    "守備評価": "fielding",
    "連続安打": "batter-hit-streak",
    "連続出塁": "batter-onbase-streak",
    "投手無失点": "pitcher-scoreless-streak"
  };

  let sourceTweet = "";
  let currentDraftStyle = "data";
  let canvas = null;
  let imageMessage = null;
  let lengthLabel = null;
  let draftButtons = null;

  function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function makeStep(number, title, description) {
    const section = el("div", "x-post-step");
    const heading = el("div", "x-post-step-heading");
    const badge = el("span", "x-post-step-number", String(number));
    const copy = el("div");
    copy.append(el("h3", "", title), el("p", "", description));
    heading.append(badge, copy);
    section.append(heading);
    return section;
  }

  function findSectionByHeading(text) {
    return [...document.querySelectorAll("section.content-card")].find((section) => {
      const heading = section.querySelector(":scope > h2, :scope > .section-heading h2");
      return heading && heading.textContent.trim() === text;
    });
  }

  function buildLayout() {
    const composer = findSectionByHeading("X投稿文作成");
    const candidateSection = findSectionByHeading("今日の投稿候補");
    if (!composer || composer.dataset.xPostEnhanced === "1") return;

    composer.dataset.xPostEnhanced = "1";
    composer.classList.add("x-post-workspace");

    const heading = composer.querySelector(":scope > h2");
    if (heading) {
      heading.textContent = "X投稿作成";
      heading.insertAdjacentElement(
        "afterend",
        el("p", "small-note x-post-lead", "投稿候補を選び、投稿案と画像を作って、そのままコピーできます。")
      );
    }

    const controls = composer.querySelector(".admin-controls");
    const textarea = composer.querySelector("#tweetOutput");
    const actions = composer.querySelector(".admin-actions");
    const buildButton = composer.querySelector("#buildTweet");
    const copyButton = composer.querySelector("#copyTweet");
    const copyMessage = composer.querySelector("#copyMessage");
    const candidates = document.getElementById("postCandidates");
    if (!controls || !textarea || !actions || !buildButton || !copyButton || !copyMessage || !candidates) return;

    const candidateStep = makeStep(1, "投稿候補", "Player Lensの最新データから投稿候補を表示します。");
    candidateStep.append(candidates);

    const draftStep = makeStep(2, "投稿案", "候補を選ぶか条件を変えて、3種類の文案から選べます。");
    draftStep.append(controls);

    draftButtons = el("div", "draft-style-buttons");
    [
      ["data", "データ重視"],
      ["short", "短め"],
      ["fan", "ファン目線"]
    ].forEach(([value, label]) => {
      const button = el("button", `draft-style-button${value === "data" ? " is-active" : ""}`, label);
      button.type = "button";
      button.dataset.draftStyle = value;
      draftButtons.append(button);
    });
    draftStep.append(draftButtons, textarea);

    const meta = el("div", "tweet-meta-row");
    lengthLabel = el("span", "", "0文字（目安）");
    meta.append(lengthLabel, el("span", "", "文面は自由に編集できます。"));
    draftStep.append(meta);

    const draftActions = el("div", "admin-actions");
    buildButton.textContent = "投稿案を更新";
    draftActions.append(buildButton);
    draftStep.append(draftActions);

    const imageStep = makeStep(3, "画像", "選択中のデータから1200×675の投稿画像を作成します。");
    const imageShell = el("div", "tweet-image-shell");
    canvas = document.createElement("canvas");
    canvas.id = "tweetImageCanvas";
    canvas.width = 1200;
    canvas.height = 675;
    canvas.setAttribute("aria-label", "X投稿画像プレビュー");
    imageShell.append(canvas);
    imageStep.append(imageShell);

    const imageActions = el("div", "admin-actions");
    const refreshImage = el("button", "text-link", "画像を更新");
    refreshImage.type = "button";
    const downloadImage = el("button", "text-link", "PNGで保存");
    downloadImage.type = "button";
    imageActions.append(refreshImage, downloadImage);
    imageMessage = el("p", "small-note");
    imageStep.append(imageActions, imageMessage);

    const copyStep = makeStep(4, "コピー", "編集した投稿文をクリップボードへコピーします。");
    const copyActions = el("div", "admin-actions");
    copyButton.textContent = "投稿文をコピー";
    copyButton.classList.add("x-post-copy-button");
    copyActions.append(copyButton);
    copyStep.append(copyActions, copyMessage);

    actions.remove();

    composer.append(candidateStep, draftStep, imageStep, copyStep);
    if (candidateSection) candidateSection.remove();

    refreshImage.addEventListener("click", drawImage);
    downloadImage.addEventListener("click", downloadImageFile);
    draftButtons.addEventListener("click", onDraftStyleClick);
    textarea.addEventListener("input", updateLength);
    candidates.addEventListener("click", onCandidateClick);
    candidates.addEventListener("keydown", onCandidateKeydown);

    const observer = new MutationObserver(enhanceCandidateCards);
    observer.observe(candidates, { childList: true, subtree: true });
    enhanceCandidateCards();

    const captureLater = () => window.setTimeout(captureGeneratedTweet, 0);
    buildButton.addEventListener("click", captureLater);
    document.getElementById("tweetLeague")?.addEventListener("change", captureLater);
    document.getElementById("tweetTeam")?.addEventListener("change", captureLater);
    document.getElementById("tweetTheme")?.addEventListener("change", captureLater);

    updateLength();
    window.setTimeout(captureGeneratedTweet, 250);
  }

  function enhanceCandidateCards() {
    document.querySelectorAll("#postCandidates .candidate-card").forEach((card) => {
      const label = card.querySelector("span")?.textContent.trim() || "";
      const theme = card.dataset.candidateTheme || THEME_BY_LABEL[label];
      if (!theme) return;
      card.dataset.candidateTheme = theme;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `${label}で投稿案を作る`);
      if (!card.querySelector(".candidate-action")) {
        card.append(el("em", "candidate-action", "この候補で作る"));
      }
    });
  }

  function onCandidateClick(event) {
    const card = event.target.closest("[data-candidate-theme]");
    if (card) selectCandidate(card.dataset.candidateTheme, card.dataset.candidateLeague, card.dataset.candidateTeam);
  }

  function onCandidateKeydown(event) {
    if (!["Enter", " "].includes(event.key)) return;
    const card = event.target.closest("[data-candidate-theme]");
    if (!card) return;
    event.preventDefault();
    selectCandidate(card.dataset.candidateTheme, card.dataset.candidateLeague, card.dataset.candidateTeam);
  }

  function selectCandidate(theme, selectedLeague = "all", selectedTeam = "all") {
    const league = document.getElementById("tweetLeague");
    const team = document.getElementById("tweetTeam");
    const themeSelect = document.getElementById("tweetTheme");
    if (!league || !team || !themeSelect) return;

    league.value = selectedLeague || "all";
    league.dispatchEvent(new Event("change", { bubbles: true }));
    window.setTimeout(() => {
      team.value = [...team.options].some((option) => option.value === selectedTeam) ? selectedTeam : "all";
      themeSelect.value = theme;
      themeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      currentDraftStyle = "data";
      syncDraftButtons();
      window.setTimeout(() => {
        captureGeneratedTweet();
        document.getElementById("tweetOutput")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }, 0);
  }

  function parseSource(text = sourceTweet) {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trimEnd());
    const nonEmpty = lines.filter((line) => line.trim());
    return {
      header: nonEmpty[0] || "【Player Lens】2026プロ野球データ",
      url: [...nonEmpty].reverse().find((line) => /^https?:\/\//.test(line)) || "https://player-lens-pages.pages.dev/",
      rankingLines: nonEmpty.filter((line) => /^\d+\.\s*/.test(line)).slice(0, 5),
      bodyLines: nonEmpty.slice(1).filter((line) => !/^https?:\/\//.test(line))
    };
  }

  function parseRankingLine(line) {
    const match = String(line || "").match(/^(\d+)\.\s*(.+?)(?:（(.+?)）)(.*)$/);
    if (!match) return { rank: "", name: String(line || ""), team: "", metric: "" };
    return { rank: match[1], name: match[2].trim(), team: match[3].trim(), metric: match[4].trim() };
  }

  function buildDraft(style) {
    const parsed = parseSource();
    const imageData = window.PlayerLensAdminXData?.getImageData?.();
    if (imageData?.kind === "standings" && style !== "data") {
      if (style === "short") {
        return [
          parsed.header,
          `${imageData.headlineLabel}：${imageData.headlineValue}`,
          imageData.headlineDetail || "",
          "",
          "詳しい順位・残り試合はこちら",
          parsed.url
        ].filter((line, index, values) => line || values[index - 1] !== "").join("\n");
      }
      return [
        `注目したいのは「${imageData.headlineLabel}：${imageData.headlineValue}」。`,
        imageData.headlineDetail || "順位の先が気になる状況です。",
        "順位表だけでなく、残りカードや勝利数の目安もPlayer Lensで見られます。",
        "",
        parsed.url
      ].join("\n");
    }
    const first = parseRankingLine(parsed.rankingLines[0] || "");
    if (style === "data" || !parsed.rankingLines.length) return sourceTweet;

    if (style === "short") {
      return [
        parsed.header,
        parsed.rankingLines[0] || "",
        "",
        "詳しいデータはこちら",
        parsed.url
      ].join("\n");
    }

    const heading = parsed.header.replace(/^【Player Lens】\s*/, "");
    return [
      `数字を見ていて気になったのが${first.name || "この選手"}${first.team ? `（${first.team}）` : ""}。`,
      first.metric ? `${first.metric}。` : "データ上位に入っています。",
      `Player Lensの「${heading}」で上位です。`,
      "",
      parsed.url
    ].join("\n");
  }

  function captureGeneratedTweet() {
    const textarea = document.getElementById("tweetOutput");
    if (!textarea) return;
    const value = textarea.value.trim();
    if (!value) return;

    const firstLine = value.split(/\r?\n/, 1)[0] || "";
    if (firstLine.includes("Player Lens") || currentDraftStyle === "data" || !sourceTweet) {
      sourceTweet = value;
    }
    textarea.value = buildDraft(currentDraftStyle);
    updateLength();
    drawImage();
  }

  function onDraftStyleClick(event) {
    const button = event.target.closest("[data-draft-style]");
    if (!button) return;
    currentDraftStyle = button.dataset.draftStyle;
    syncDraftButtons();
    const textarea = document.getElementById("tweetOutput");
    if (!textarea) return;
    textarea.value = buildDraft(currentDraftStyle);
    updateLength();
  }

  function syncDraftButtons() {
    draftButtons?.querySelectorAll("[data-draft-style]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.draftStyle === currentDraftStyle);
    });
  }

  function updateLength() {
    const textarea = document.getElementById("tweetOutput");
    if (!textarea || !lengthLabel) return;
    const count = Array.from(textarea.value).length;
    lengthLabel.textContent = `${count}文字（目安）`;
    lengthLabel.classList.toggle("is-over", count > 280);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fitText(ctx, text, maxWidth) {
    const value = String(text || "");
    if (ctx.measureText(value).width <= maxWidth) return value;
    let shortened = value;
    while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
    return `${shortened}…`;
  }

  function imageTitle(header) {
    return String(header || "")
      .replace(/^【Player Lens】\s*/, "")
      .replace(/^全体\s+/, "")
      .trim() || "2026プロ野球データ";
  }

  function drawStandingsImage(ctx, data) {
    const W = canvas.width;
    const H = canvas.height;
    const cards = (data.cards || []).slice(0, 3);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f5faf9";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(0, 0, 18, H);

    ctx.fillStyle = "#0f766e";
    ctx.font = '800 27px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("PLAYER LENS", 70, 64);
    ctx.fillStyle = "#657385";
    ctx.font = '700 19px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("2026 NPB STANDINGS", 70, 96);
    ctx.textAlign = "right";
    ctx.fillText(fitText(ctx, data.updated || "", 360), W - 70, 64);
    ctx.textAlign = "left";

    ctx.fillStyle = "#16202e";
    ctx.font = '800 48px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(fitText(ctx, data.title || "2026年プロ野球 順位", W - 140), 70, 160);

    roundedRect(ctx, 70, 190, W - 140, 155, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#9ed6ce";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0f766e";
    ctx.font = '800 24px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(fitText(ctx, data.headlineLabel || "現在地", W - 210), 104, 230);
    ctx.fillStyle = "#16202e";
    ctx.font = '900 64px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(fitText(ctx, data.headlineValue || "-", W - 210), 102, 300);
    ctx.fillStyle = "#657385";
    ctx.font = '700 22px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(fitText(ctx, data.headlineDetail || "", 590), W - 104, 300);
    ctx.textAlign = "left";

    if (cards.length) {
      const gap = 16;
      const totalWidth = W - 140;
      const width = (totalWidth - gap * (cards.length - 1)) / cards.length;
      cards.forEach((card, index) => {
        const x = 70 + index * (width + gap);
        roundedRect(ctx, x, 370, width, 178, 16);
        ctx.fillStyle = index === 0 ? "#eaf7f4" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = index === 0 ? "#9ed6ce" : "#d9e0e8";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#657385";
        ctx.font = '800 21px "Yu Gothic", "Meiryo", sans-serif';
        ctx.fillText(fitText(ctx, card.label || "", width - 48), x + 24, 411);
        ctx.fillStyle = "#16202e";
        ctx.font = '900 36px "Yu Gothic", "Meiryo", sans-serif';
        ctx.fillText(fitText(ctx, card.value || "-", width - 48), x + 24, 466);
        ctx.fillStyle = "#657385";
        ctx.font = '700 18px "Yu Gothic", "Meiryo", sans-serif';
        ctx.fillText(fitText(ctx, card.detail || "", width - 48), x + 24, 510);
      });
    }

    ctx.fillStyle = "#657385";
    ctx.font = '700 18px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("player-lens-pages.pages.dev/standings", 70, H - 42);
    ctx.textAlign = "right";
    ctx.fillText("Player Lens", W - 70, H - 42);
    ctx.textAlign = "left";
  }

  function drawImage() {
    if (!canvas) return;
    const parsed = parseSource();
    const rows = parsed.rankingLines.map(parseRankingLine);
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const imageData = window.PlayerLensAdminXData?.getImageData?.();
    if (imageData?.kind === "standings") {
      drawStandingsImage(ctx, imageData);
      if (imageMessage) imageMessage.textContent = "順位専用画像を更新しました。";
      return;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f5faf9";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(0, 0, 18, H);

    ctx.fillStyle = "#0f766e";
    ctx.font = '800 27px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("PLAYER LENS", 70, 64);
    ctx.fillStyle = "#657385";
    ctx.font = '700 19px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("2026 NPB DATA / X POST", 70, 96);

    ctx.fillStyle = "#16202e";
    ctx.font = '800 50px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText(fitText(ctx, imageTitle(parsed.header), W - 140), 70, 160);

    if (!rows.length) {
      ctx.fillStyle = "#657385";
      ctx.font = '700 32px "Yu Gothic", "Meiryo", sans-serif';
      ctx.fillText("投稿案を更新するとデータ画像を作成できます", 70, 300);
    } else {
      rows.slice(0, 5).forEach((row, index) => {
        const y = 210 + index * 78;
        roundedRect(ctx, 70, y, W - 140, 62, 14);
        ctx.fillStyle = index === 0 ? "#ffffff" : "#fbfdfd";
        ctx.fill();
        ctx.strokeStyle = index === 0 ? "#9ed6ce" : "#d9e0e8";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = index === 0 ? "#0f766e" : "#657385";
        ctx.font = '800 28px "Yu Gothic", "Meiryo", sans-serif';
        ctx.fillText(row.rank || String(index + 1), 94, y + 40);

        ctx.fillStyle = "#16202e";
        ctx.font = '800 29px "Yu Gothic", "Meiryo", sans-serif';
        ctx.fillText(fitText(ctx, row.name, 300), 145, y + 40);

        ctx.fillStyle = "#657385";
        ctx.font = '700 19px "Yu Gothic", "Meiryo", sans-serif';
        ctx.fillText(fitText(ctx, row.team, 215), 450, y + 39);

        ctx.fillStyle = "#16202e";
        ctx.font = '700 20px "Yu Gothic", "Meiryo", sans-serif';
        ctx.textAlign = "right";
        ctx.fillText(fitText(ctx, row.metric, 470), W - 95, y + 39);
        ctx.textAlign = "left";
      });
    }

    ctx.fillStyle = "#657385";
    ctx.font = '700 18px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText("player-lens-pages.pages.dev", 70, H - 42);
    ctx.textAlign = "right";
    ctx.fillText("Player Lens", W - 70, H - 42);
    ctx.textAlign = "left";
    if (imageMessage) imageMessage.textContent = "画像を更新しました。";
  }

  function downloadImageFile() {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      link.href = href;
      link.download = `player-lens-x-post-${date}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      if (imageMessage) imageMessage.textContent = "PNGを保存しました。";
    }, "image/png");
  }

  buildLayout();
})();
