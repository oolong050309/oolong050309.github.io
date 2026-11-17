import { tokenizationTrace as trace, makeTokenizationAnimation } from '../lib/tokenization-demo';

/** @param {HTMLElement} root */
export function setupTokenizationAnimation(root) {
  const english = root.dataset.language === 'en';
  const $ = (selector) => root.querySelector(selector);
  const svg = $("#stage-svg");
  const NS = "http://www.w3.org/2000/svg";
  const ink = "#292929";
  const visible = text => text.replaceAll(" ", "␣");
  const key = piece => piece.start + ":" + piece.end;
  let mode = "word";
  let {frames, tokens, vocabulary, lookupStart} = makeTokenizationAnimation(mode);
  const titles = english
    ? ['Text', 'Pre-tokenization', 'UTF-8 bytes', 'BPE merges', 'Token IDs', 'Decode']
    : ['原文', '预切分', 'UTF-8 字节', 'BPE 合并', '编号', '还原'];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set();
  const positions = new Map();
  let current = 0;
  let selectedId;
  let playing = false;
  let timer;
  let lastWidth = 0;

  function el(tag, attributes, text) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes || {}).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function animate(node, keyframes, cleanup, duration = 560) {
    if (reducedMotion.matches || !node.animate || document.hidden) { cleanup?.(); return; }
    const animation = node.animate(keyframes, {
      duration, easing: "cubic-bezier(.22,1,.36,1)",
    });
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => {
      animations.delete(animation);
      cleanup?.();
    });
  }
  function clearAnimations() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
    root.querySelectorAll(".piece-ghost").forEach(node => node.remove());
    document.querySelectorAll(".token-animation-flight").forEach(node => node.remove());
  }

  function layout(frame) {
    const width = Math.max(280, $(".workbench").getBoundingClientRect().width || 720);
    const rows = [[]];
    let used = 0;
    frame.groups.forEach(group => {
      const pieces = group.map(piece => ({
        piece,
        width: frame.phase === 0 ? Math.min(width - 24, 440)
          : Math.max(width < 340 ? 36 : 42,
            visible(piece.text).length * (width < 340 ? 12 : 13.7) + (width < 340 ? 24 : 28)),
      }));
      const groupWidth = pieces.reduce((sum, item) => sum + item.width, 0) + (pieces.length - 1) * 8;
      if (used && used + 20 + groupWidth > width - 12) { rows.push([]); used = 0; }
      rows[rows.length - 1].push({pieces, width: groupWidth});
      used += groupWidth + (used ? 20 : 0);
    });
    const rowHeight = frame.phase === 2 ? 96 : 82;
    const height = Math.max(220, rows.length * rowHeight + 26);
    const points = [];
    rows.forEach((row, rowIndex) => {
      const rowWidth = row.reduce((sum, group) => sum + group.width, 0) + (row.length - 1) * 20;
      let x = (width - rowWidth) / 2;
      const y = (height - rows.length * rowHeight) / 2 + rowIndex * rowHeight + 8;
      row.forEach(group => {
        group.pieces.forEach(item => {
          points.push({...item, x, y});
          x += item.width + 8;
        });
        x += 12;
      });
    });
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("height", String(height));
    return points;
  }

  function drawPieces(frame, withMotion, previousIndex) {
    const old = new Map(positions);
    positions.clear();
    svg.replaceChildren();
    const points = layout(frame);
    points.forEach(({piece, width, x, y}) => {
      const node = el("g", {
        class: "piece", transform: "translate(" + x + "," + y + ")",
        "data-piece-key": key(piece), "data-start": piece.start, "data-end": piece.end,
      });
      const height = frame.phase === 0 ? 66 : 54;
      const rect = el("rect", {
        x: 0, y: 0, width, height, rx: 8,
        fill: frame.phase === 0 ? "#fafafa" : "#ffffff",
        stroke: "#bdbdbd", "stroke-width": 1.1,
      });
      const text = el("text", {
        x: width / 2, y: height / 2, fill: ink,
        class: "piece-label",
      }, frame.phase === 0 ? piece.text : visible(piece.text));
      if (frame.phase === 0) text.style.fontSize = Math.min(30, (width - 24) / (trace.text.length * 0.62)) + "px";
      node.append(rect, text);
      if (frame.phase === 2) node.append(el("text", {
        x: width / 2, y: 74, class: "piece-byte",
      }, piece.byte));
      if (frame.merge && key(piece) === key(frame.merge.result)) node.classList.add("current");
      if (frame.phase >= 4) {
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        node.setAttribute("aria-label", visible(piece.text) + (english ? ", ID " : "，编号 ") + piece.id);
        node.setAttribute("aria-pressed", String(piece.id === selectedId));
        node.classList.toggle("selected", piece.id === selectedId);
        node.dataset.tokenId = String(piece.id);
        const tokenIndex = tokens.findIndex(token => key(token) === key(piece));
        node.dataset.tokenIndex = String(tokenIndex);
        const select = () => {
          selectToken(piece.id, tokenIndex);
          root.querySelector('[data-vocab-id="' + piece.id + '"]').focus({preventScroll: true});
        };
        node.addEventListener("click", select);
        node.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); select(); }
        });
      }
      svg.append(node);
      positions.set(key(piece), {x, y, width, node, piece});
      if (!withMotion) return;
      const previous = old.get(key(piece));
      if (previous) {
        animate(node, [
          {transform: "translate(" + previous.x + "px," + previous.y + "px)"},
          {transform: "translate(" + x + "px," + y + "px)"},
        ]);
      } else {
        animate(node, [{opacity: 0}, {opacity: 1}]);
      }
    });
    if (!withMotion || !frame.merge || previousIndex !== current - 1) return;
    const result = positions.get(key(frame.merge.result));
    [frame.merge.left, frame.merge.right].forEach(piece => {
      const previous = old.get(key(piece));
      if (!previous || !result) return;
      const ghost = previous.node.cloneNode(true);
      ghost.classList.add("piece-ghost");
      ghost.removeAttribute("data-piece-key");
      ghost.removeAttribute("tabindex");
      ghost.removeAttribute("role");
      ghost.setAttribute("aria-hidden", "true");
      svg.append(ghost);
      animate(ghost, [
        {transform: "translate(" + previous.x + "px," + previous.y + "px)", opacity: 0.9},
        {transform: "translate(" + (result.x + result.width / 2 - previous.width / 2) + "px," + result.y + "px)", opacity: 0},
      ], () => ghost.remove());
    });
  }

  function setupVocabulary() {
    $("#vocab-rows").replaceChildren();
    [...vocabulary].sort((a, b) => a.id - b.id).forEach(token => {
      const tr = document.createElement("tr");
      tr.dataset.rowId = String(token.id);
      const tokenCell = document.createElement("td");
      const idCell = document.createElement("td");
      [tokenCell, idCell].forEach((cell, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.vocabId = String(token.id);
        if (i) button.dataset.vocabNumber = String(token.id);
        button.textContent = i ? token.id : visible(token.text);
        button.setAttribute("aria-label", visible(token.text) + (english ? ", ID " : " 对应编号 ") + token.id);
        button.addEventListener("click", () => selectToken(token.id));
        cell.append(button);
      });
      tr.append(tokenCell, idCell);
      $("#vocab-rows").append(tr);
    });
  }
  function showIds(frame, withMotion) {
    const canSelect = frame.phase >= 4;
    $("#sequence").hidden = !canSelect;
    $("#decoded").hidden = frame.phase !== 5;
    $("#lookup").hidden = !canSelect;
    $("#id-sequence").replaceChildren();
    if (!canSelect) return;
    const appendMark = value => {
      const span = document.createElement("span");
      span.textContent = value;
      $("#id-sequence").append(span);
    };
    appendMark("[");
    tokens.forEach((token, i) => {
      const revealed = frame.phase === 5 || i <= frame.lookupIndex;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "id-chip";
      button.dataset.id = String(token.id);
      button.dataset.tokenIndex = String(i);
      button.disabled = !revealed;
      button.textContent = revealed ? token.id : "—";
      button.setAttribute("aria-pressed", String(token.id === selectedId));
      button.setAttribute("aria-label", revealed ? (english ? "ID " : "编号 ") + token.id + " ↔ " + visible(token.text) : (english ? "Pending ID" : "尚未查找的编号"));
      button.addEventListener("click", () => selectToken(token.id, i));
      $("#id-sequence").append(button);
      if (i < tokens.length - 1) appendMark(",");
    });
    appendMark("]");
    const selected = vocabulary.find(token => token.id === selectedId);
    $("#lookup-token").textContent = visible(selected.text);
    $("#lookup-id").textContent = selected.id;
    if (!withMotion || frame.phase !== 4 || reducedMotion.matches) return;
    const source = root.querySelector('[data-vocab-number="' + selected.id + '"]').getBoundingClientRect();
    const target = root.querySelector('.id-chip[data-token-index="' + frame.lookupIndex + '"]').getBoundingClientRect();
    const ghost = document.createElement("span");
    ghost.className = "token-animation-flight";
    ghost.textContent = selected.id;
    ghost.style.left = source.left + "px";
    ghost.style.top = source.top + "px";
    document.body.append(ghost);
    animate(ghost, [
      {transform: "translate(0,0)", opacity: 1},
      {transform: "translate(" + (target.left - source.left) + "px," + (target.top - source.top) + "px)", opacity: 0},
    ], () => ghost.remove(), 700);
  }

  function controls() {
    $("#play").textContent = playing ? (english ? "Pause" : "暂停") : current === frames.length - 1 ? (english ? "Replay" : "重播") : (english ? "Play" : "播放");
    $("#play").setAttribute("aria-pressed", String(playing));
    $("#previous").disabled = current === 0;
    $("#next").disabled = current === frames.length - 1;
    $("#progress").value = String(current);
    $("#progress").setAttribute("aria-valuetext", (current + 1) + " / " + frames.length + "，" + titles[frames[current].phase]);
    $("#status").setAttribute("aria-live", playing ? "off" : "polite");
  }
  function render(value, withMotion = true) {
    clearAnimations();
    const previousIndex = current;
    current = Math.max(0, Math.min(frames.length - 1, value));
    const frame = frames[current];
    root.dataset.frame = String(current);
    root.dataset.phase = String(frame.phase);
    selectedId = frame.phase === 4 ? tokens[frame.lookupIndex].id
      : frame.phase === 5 ? selectedId ?? tokens[0].id : undefined;
    $("#byte-note").hidden = frame.phase !== 2;
    $("#merge-equation").hidden = !frame.merge;
    $("#merge-equation").textContent = frame.merge
      ? visible(frame.merge.left.text) + " + " + visible(frame.merge.right.text) + " → " + visible(frame.merge.result.text)
      : "";
    root.querySelectorAll("[data-phase]").forEach(button => {
      if (Number(button.dataset.phase) === frame.phase) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    root.querySelectorAll("[data-row-id]").forEach(row => {
      row.classList.toggle("is-selected", Number(row.dataset.rowId) === selectedId);
    });
    root.querySelectorAll("[data-vocab-id]").forEach(button => {
      button.disabled = frame.phase < 4;
      button.setAttribute("aria-pressed", String(Number(button.dataset.vocabId) === selectedId));
    });
    drawPieces(frame, withMotion, previousIndex);
    showIds(frame, withMotion);
    $("#status").textContent = titles[frame.phase]
      + (frame.merge ? $("#merge-equation").textContent : "");
    controls();
  }
  function stop() { playing = false; clearTimeout(timer); timer = undefined; controls(); }
  function delay() { return [2400, 2800, 3200, 1800, 2100, 3000][frames[current].phase]; }
  function schedule() {
    timer = setTimeout(() => {
      if (!playing) return;
      render(current + 1);
      if (current === frames.length - 1) stop();
      else schedule();
    }, delay());
  }
  function togglePlay() {
    if (playing) { stop(); return; }
    if (current === frames.length - 1) render(0, false);
    playing = true;
    controls();
    schedule();
  }
  function seek(value) { stop(); render(value); }
  function selectToken(id, occurrence) {
    stop();
    selectedId = id;
    const tokenIndex = occurrence ?? tokens.findIndex(token => token.id === id);
    render(frames[current].phase === 5 ? current : lookupStart + tokenIndex, false);
  }
  function setMode(nextMode) {
    stop();
    mode = nextMode;
    ({frames, tokens, vocabulary, lookupStart} = makeTokenizationAnimation(mode));
    current = 0;
    selectedId = undefined;
    positions.clear();
    root.dataset.mode = mode;
    titles[1] = mode === "word"
      ? (english ? "Split into words" : "按词切分")
      : (english ? "Pre-tokenization" : "预切分");
    $("#encoding-note").hidden = mode === "bpe";
    $("#space-note").textContent = mode === "word"
      ? (english
        ? "␣ marks a space in the original text. Spaces and punctuation are kept as separate tokens here."
        : "␣ 表示原文中的一个空格，这里将空格和标点单独保留。")
      : (english
        ? "␣ marks a space in the original text. For example, ␣miss includes a leading space."
        : "␣ 表示原文中的一个空格，例如 ␣miss 包含前导空格。");
    root.querySelectorAll("[data-tokenizer-mode]").forEach(button =>
      button.setAttribute("aria-pressed", String(button.dataset.tokenizerMode === mode)));
    const phases = mode === "word" ? [0, 1, 4, 5] : [0, 1, 2, 3, 4, 5];
    $(".phases").replaceChildren();
    phases.forEach(phase => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.phase = String(phase);
      button.textContent = titles[phase];
      button.addEventListener("click", () => seek(frames.findIndex(frame => frame.phase === phase)));
      $(".phases").append(button);
    });
    setupVocabulary();
    $("#progress").max = String(frames.length - 1);
    render(0, false);
  }
  $("#play").addEventListener("click", togglePlay);
  $("#previous").addEventListener("click", () => seek(current - 1));
  $("#next").addEventListener("click", () => seek(current + 1));
  $("#restart").addEventListener("click", () => { stop(); render(0, false); });
  $("#progress").addEventListener("input", event => seek(Number(event.target.value)));
  root.querySelectorAll("[data-tokenizer-mode]").forEach(button => button.addEventListener("click", () =>
    setMode(button.dataset.tokenizerMode)));
  root.addEventListener("keydown", event => {
    if (event.target.matches("input, select, button, [role=button]")) return;
    if (event.key === "ArrowRight") { event.preventDefault(); seek(current + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); seek(current - 1); }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  window.addEventListener("pagehide", stop);
  reducedMotion.addEventListener("change", () => { stop(); render(current, false); });
  if (window.ResizeObserver) new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - lastWidth) > 1) { lastWidth = width; render(current, false); }
  }).observe($(".workbench"));
  else window.addEventListener("resize", () => render(current, false));
  setMode("word");
  $("#fallback").hidden = true;
  svg.removeAttribute("data-pending");
  $(".phases").hidden = false;
  $(".modes").hidden = false;
  $(".controls").hidden = false;
}
