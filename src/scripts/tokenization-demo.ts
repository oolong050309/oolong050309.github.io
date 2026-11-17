import { makeTokenizationFrames, tokenizationTrace as trace, visibleSpaces, pieceKey, type DemoPhase, type DemoPiece } from '../lib/tokenization-demo';

export function setupTokenizationDemo(root: HTMLElement) {
  const english = root.dataset.language === 'en';
  const phases: DemoPhase[] = ['text', 'segments', 'bytes', 'merges', 'ids', 'decode'];
  const frames = makeTokenizationFrames();
  const title = root.querySelector<HTMLElement>('[data-demo-title]')!;
  const description = root.querySelector<HTMLElement>('[data-demo-description]')!;
  const pieces = root.querySelector<HTMLElement>('[data-demo-pieces]')!;
  const workbench = root.querySelector<HTMLElement>('.demo-workbench')!;
  const play = root.querySelector<HTMLButtonElement>('[data-demo-play]')!;
  const prev = root.querySelector<HTMLButtonElement>('[data-demo-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-demo-next]')!;
  const status = root.querySelector<HTMLElement>('[data-demo-status]')!;
  const result = root.querySelector<HTMLElement>('[data-demo-result]')!;
  const decoded = root.querySelector<HTMLElement>('[data-demo-decoded]')!;
  const lookup = root.querySelector<HTMLElement>('[data-demo-lookup]')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set<Animation>();
  let index = 0;
  let selectedId: number | undefined;
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const titles: Record<DemoPhase, string> = english ? {
    text: 'Start with the original sentence',
    segments: 'Split into segments using fixed rules',
    bytes: 'Represent each segment as UTF-8 bytes',
    merges: 'Merge within each segment using learned priorities',
    ids: 'Look up the final token IDs',
    decode: 'From IDs back to the original text',
  } : {
    text: '从原句开始',
    segments: '按固定规则进行预切分',
    bytes: '把每个分段表示为 UTF-8 字节',
    merges: '在分段内部，按已有优先级合并',
    ids: '查出最终 token 的编号',
    decode: '从编号还原原文',
  };
  const descriptions: Record<DemoPhase, string> = english ? {
    text: 'Capitalization, spaces, the comma, and the period are all part of the input.',
    segments: 'Six segments. In this example, the spaces stay with the following words; punctuation forms separate segments.',
    bytes: 'This ASCII sentence has 18 UTF-8 bytes. The small numbers here are byte values, not token IDs.',
    merges: 'Each segment is processed independently. We show segments from left to right, using the vocabulary’s existing merge priorities.',
    ids: 'Each token has an ID in the fixed vocabulary. Select a token, ID, or vocabulary row to see the correspondence.',
    decode: 'Look up the bytes for each ID, concatenate them, and decode as UTF-8. The original text is recovered, including spaces and punctuation.',
  } : {
    text: '大小写、空格、逗号和句号都是输入的一部分。',
    segments: '得到 6 个分段。本例中的空格与后面的单词放在一起，标点单独成段。',
    bytes: '这句 ASCII 文本共有 18 个 UTF-8 字节。下面的小数字是字节值，不是 token 编号。',
    merges: '各分段独立处理。这里按从左到右的顺序演示，合并优先级来自已有词表。',
    ids: '每个最终 token 都有固定的词表编号。点击 token、编号或词表条目，可以查看对应关系。',
    decode: '按编号查出对应字节，拼接后进行 UTF-8 解码，还原原文，包括空格与标点。',
  };

  function updateControls() {
    play.textContent = playing ? (english ? 'Pause' : '暂停') : index === frames.length - 1 ? (english ? 'Replay' : '重播') : (english ? 'Play' : '播放');
    play.setAttribute('aria-pressed', String(playing));
    prev.disabled = index === 0;
    next.disabled = index === frames.length - 1;
    status.setAttribute('aria-live', playing ? 'off' : 'polite');
  }

  function stop() {
    playing = false;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    updateControls();
  }

  function setSelection(piece?: DemoPiece, announce = false) {
    selectedId = piece?.id;
    lookup.hidden = selectedId === undefined;
    root.querySelector<HTMLElement>('[data-demo-lookup-text]')!.textContent = piece ? visibleSpaces(piece.text) : '';
    root.querySelector<HTMLElement>('[data-demo-lookup-id]')!.textContent = selectedId === undefined ? '' : String(selectedId);
    root.querySelectorAll<HTMLElement>('[data-demo-vocab-row]').forEach(row => row.classList.toggle('is-selected', row.dataset.demoVocabRow === String(selectedId)));
    root.querySelectorAll<HTMLButtonElement>('[data-demo-token], [data-demo-id], [data-demo-vocab]').forEach(button => {
      const id = button.dataset.demoToken ?? button.dataset.demoId ?? button.dataset.demoVocab;
      button.setAttribute('aria-pressed', String(id === String(selectedId)));
    });
    if (announce && piece) status.textContent = visibleSpaces(piece.text) + ' ↔ ID ' + piece.id;
  }

  function runAnimation(element: HTMLElement, keyframes: Keyframe[], cleanup?: () => void) {
    const animation = element.animate(keyframes, { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => {
      animations.delete(animation);
      cleanup?.();
    });
  }

  function showFrame(value: number, animate = true) {
    animations.forEach(animation => animation.cancel());
    animations.clear();
    root.querySelectorAll('.demo-piece-ghost').forEach(ghost => ghost.remove());
    const old = new Map([...pieces.querySelectorAll<HTMLElement>('[data-piece-key]')].map(element => [
      element.dataset.pieceKey!, { rect: element.getBoundingClientRect(), element },
    ]));
    index = Math.max(0, Math.min(frames.length - 1, value));
    root.dataset.demoFrame = String(index);
    const frame = frames[index];
    root.dataset.demoPhase = frame.phase;
    const canSelect = frame.phase === 'ids' || frame.phase === 'decode';
    title.textContent = titles[frame.phase];
    description.textContent = descriptions[frame.phase];
    if (frame.merge) {
      description.textContent = visibleSpaces(frame.merge.left.text) + ' + ' + visibleSpaces(frame.merge.right.text) + ' → ' + visibleSpaces(frame.merge.result.text) + (english ? '. ' : '。 ') + descriptions.merges;
    }
    root.querySelector<HTMLElement>('[data-demo-counter]')!.textContent = (index + 1) + ' / ' + frames.length;
    root.querySelectorAll<HTMLButtonElement>('[data-demo-phase]').forEach(button => {
      if (phases[Number(button.dataset.demoPhase)] === frame.phase) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const labels: Record<DemoPhase, string> = english
      ? { text: 'Original text', segments: 'Pre-tokenized segments', bytes: 'UTF-8 byte values', merges: 'Current pieces', ids: 'Final tokens', decode: 'Final tokens' }
      : { text: '原文', segments: '预切分结果', bytes: 'UTF-8 字节值', merges: '当前片段', ids: '最终 token', decode: '最终 token' };
    root.querySelector<HTMLElement>('[data-demo-representation]')!.textContent = labels[frame.phase];
    const count = frame.pieces.flat().length;
    root.querySelector<HTMLElement>('[data-demo-piece-count]')!.textContent = frame.phase === 'text' ? trace.bytes.length + ' bytes'
      : frame.phase === 'segments' ? count + (english ? ' segments' : ' 个分段')
      : frame.phase === 'bytes' ? count + ' bytes'
      : frame.phase === 'merges' ? ((frame.mergeIndex ?? 0) + 1) + ' / ' + trace.merges.length + (english ? ' merges' : ' 次合并')
      : count + ' tokens';

    pieces.replaceChildren();
    frame.pieces.forEach(group => {
      const container = document.createElement('div');
      container.className = 'demo-piece-group';
      group.forEach(piece => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'demo-piece';
        button.dataset.pieceKey = pieceKey(piece);
        button.disabled = !canSelect;
        const text = document.createElement('span');
        text.textContent = frame.phase === 'text' ? piece.text : visibleSpaces(piece.text);
        button.append(text);
        if (frame.phase === 'text') button.classList.add('demo-piece-raw');
        if (frame.phase === 'bytes') {
          const byte = document.createElement('small');
          byte.textContent = String(piece.byte);
          button.append(byte);
        }
        if (frame.merge && pieceKey(piece) === pieceKey(frame.merge.result)) button.classList.add('is-current');
        if (canSelect && piece.id !== undefined) {
          button.dataset.demoToken = String(piece.id);
          button.addEventListener('click', () => { stop(); setSelection(piece, true); });
        }
        container.append(button);
      });
      pieces.append(container);
    });
    result.hidden = !canSelect;
    decoded.hidden = frame.phase !== 'decode';
    root.querySelectorAll<HTMLButtonElement>('[data-demo-id], [data-demo-vocab]').forEach(button => button.disabled = !canSelect);
    setSelection(frame.merge?.result ?? (canSelect ? trace.tokens.find(token => token.id === selectedId) ?? trace.tokens[0] : undefined));
    status.textContent = titles[frame.phase] + '. ' + descriptions[frame.phase];
    updateControls();

    if (!animate || reducedMotion.matches || document.hidden) return;
    const newElements = [...pieces.querySelectorAll<HTMLElement>('[data-piece-key]')];
    newElements.forEach(element => {
      const previous = old.get(element.dataset.pieceKey!);
      const rect = element.getBoundingClientRect();
      if (previous) {
        const x = previous.rect.left - rect.left;
        const y = previous.rect.top - rect.top;
        if (x || y) runAnimation(element, [{ transform: 'translate(' + x + 'px,' + y + 'px)' }, { transform: 'translate(0,0)' }]);
      } else {
        runAnimation(element, [{ opacity: .25, transform: 'scale(.88)' }, { opacity: 1, transform: 'scale(1)' }]);
      }
    });
    // The old pair converges on the new piece; other pieces slide into place.
    if (frame.merge) {
      const merge = frame.merge;
      const target = newElements.find(element => element.dataset.pieceKey === pieceKey(merge.result));
      if (target) {
        const targetRect = target.getBoundingClientRect();
        const origin = workbench.getBoundingClientRect();
        [merge.left, merge.right].forEach(piece => {
          const previous = old.get(pieceKey(piece));
          if (!previous) return;
          const ghost = previous.element.cloneNode(true) as HTMLElement;
          ghost.classList.add('demo-piece-ghost');
          ghost.removeAttribute('data-piece-key');
          ghost.setAttribute('aria-hidden', 'true');
          ghost.style.left = previous.rect.left - origin.left + 'px';
          ghost.style.top = previous.rect.top - origin.top + 'px';
          workbench.append(ghost);
          runAnimation(ghost, [
            { opacity: 1, transform: 'translate(0,0)' },
            { opacity: 0, transform: 'translate(' + (targetRect.left - previous.rect.left) + 'px,' + (targetRect.top - previous.rect.top) + 'px) scale(.75)' },
          ], () => ghost.remove());
        });
      }
    }
  }

  function schedule(delay = 1700) {
    timer = setTimeout(() => {
      if (!playing) return;
      showFrame(index + 1);
      if (index === frames.length - 1) stop();
      else schedule(frames[index].phase === 'merges' ? 1500 : 2200);
    }, delay);
  }
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (index === frames.length - 1) showFrame(0, false);
    playing = true;
    updateControls();
    schedule(500);
  });
  prev.addEventListener('click', () => { stop(); showFrame(index - 1); });
  next.addEventListener('click', () => { stop(); showFrame(index + 1); });
  root.querySelector('[data-demo-reset]')!.addEventListener('click', () => { stop(); showFrame(0, false); });
  root.querySelectorAll<HTMLButtonElement>('[data-demo-phase]').forEach(button => button.addEventListener('click', () => {
    stop();
    showFrame(frames.findIndex(frame => frame.phase === phases[Number(button.dataset.demoPhase)]));
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-demo-id], [data-demo-vocab]').forEach(button => button.addEventListener('click', () => {
    stop();
    const token = trace.tokens.find(token => String(token.id) === (button.dataset.demoId ?? button.dataset.demoVocab));
    setSelection(token, true);
  }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  reducedMotion.addEventListener('change', () => {
    stop();
    showFrame(index, false);
  });
  showFrame(0, false);
  root.querySelector<HTMLElement>('[data-demo-controls]')!.hidden = false;
  root.querySelector<HTMLElement>('[data-demo-phases]')!.hidden = false;
}

document.querySelectorAll<HTMLElement>('[data-tokenization-demo]').forEach(setupTokenizationDemo);
