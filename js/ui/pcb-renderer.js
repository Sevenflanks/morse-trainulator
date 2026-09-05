/**
 * PCB SVG RENDERER: pcb-renderer.js
 * 繪製二元樹正交導線、字母節點、數字排阻 (Number Bus Bar) 與路徑發光效果
 */

// Element reference caches for O(1) direct access and zero DOM queries
const wireElementsMap = new Map();
const nodeElementsMap = new Map();
const chipElementsMap = new Map();

// Active elements tracking for fast zero-query cleanup
const activeWiresCache = [];
const activeNodesCache = [];
const committedNodesCache = [];
const activeChipsCache = [];

function clearPathHighlights(clearCommitted = true) {
  for (let i = 0; i < activeWiresCache.length; i++) {
    activeWiresCache[i].classList.remove('active-wire');
  }
  activeWiresCache.length = 0;

  for (let i = 0; i < activeNodesCache.length; i++) {
    activeNodesCache[i].classList.remove('active-node');
  }
  activeNodesCache.length = 0;

  if (clearCommitted) {
    for (let i = 0; i < committedNodesCache.length; i++) {
      committedNodesCache[i].classList.remove('committed-node');
    }
    committedNodesCache.length = 0;
  }

  for (let i = 0; i < activeChipsCache.length; i++) {
    activeChipsCache[i].classList.remove('active-dit-chip', 'active-dah-chip');
  }
  activeChipsCache.length = 0;
}

function renderCardSvg(wiresLayer, nodesLayer, engine, onLetterClick) {
  if (!wiresLayer || !nodesLayer || !engine) return;

  clearPathHighlights(true);

  // 1. Wires
  wiresLayer.innerHTML = '';
  wireElementsMap.clear();
  wireLinks.forEach(link => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', link.path);
    path.setAttribute('class', 'wire');
    path.setAttribute('id', `wire-${seqToId(link.seq)}`);
    wiresLayer.appendChild(path);
    wireElementsMap.set(link.seq, path);
  });

  // 2. Nodes
  nodesLayer.innerHTML = '';
  nodeElementsMap.clear();
  for (const [seq, node] of Object.entries(engine.tree)) {
    if (!node.letter) continue;
    const pt = nodeCoords[node.letter];
    if (!pt) continue;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node-group');
    g.setAttribute('id', `node-${seqToId(seq)}`);
    g.setAttribute('data-letter', node.letter);
    g.setAttribute('data-seq', seq);

    if (node.shape === 'square') {
      // Square for Dah (-)
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pt.x - 13);
      rect.setAttribute('y', pt.y - 13);
      rect.setAttribute('width', 26);
      rect.setAttribute('height', 26);
      rect.setAttribute('rx', 4);
      rect.setAttribute('class', 'node-shape');
      g.appendChild(rect);
    } else {
      // Circle for Dit (.)
      const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circ.setAttribute('cx', pt.x);
      circ.setAttribute('cy', pt.y);
      circ.setAttribute('r', 13);
      circ.setAttribute('class', 'node-shape');
      g.appendChild(circ);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pt.x);
    text.setAttribute('y', pt.y + 1);
    text.setAttribute('class', 'node-text');
    text.textContent = node.letter;
    g.appendChild(text);

    // Click on letter to demo
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof onLetterClick === 'function') {
        onLetterClick(node.letter, seq);
      }
    });

    nodesLayer.appendChild(g);
    nodeElementsMap.set(seq, g);
  }

  // 3. Number Bus Bar (Option A: 0-9 DIP Array)
  renderNumberBusBar(document.getElementById('number-chips-group'), onLetterClick);
}

function renderNumberBusBar(container, onDigitClick) {
  if (!container) return;
  container.innerHTML = '';
  chipElementsMap.clear();

  digitsData.forEach(d => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'number-chip');
    g.setAttribute('id', 'num-chip-' + d.digit);
    g.setAttribute('data-digit', d.digit);
    g.setAttribute('data-seq', d.seq);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', d.x);
    rect.setAttribute('y', 506);
    rect.setAttribute('width', 31);
    rect.setAttribute('height', 34);
    rect.setAttribute('rx', 4);
    rect.setAttribute('ry', 4);
    g.appendChild(rect);

    const textDigit = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textDigit.setAttribute('class', 'num-digit');
    textDigit.setAttribute('x', d.x + 15.5);
    textDigit.setAttribute('y', 519);
    textDigit.textContent = d.digit;
    g.appendChild(textDigit);

    const textCode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textCode.setAttribute('class', 'num-code');
    textCode.setAttribute('x', d.x + 15.5);
    textCode.setAttribute('y', 532);
    textCode.textContent = d.seq;
    g.appendChild(textCode);

    // Click to demo replay
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof onDigitClick === 'function') {
        onDigitClick(d.digit, d.seq);
      }
    });

    container.appendChild(g);
    chipElementsMap.set(d.digit, g);
  });
}

function highlightPath(seq, isCommitted = false, engine = window.engine, antennaShape = document.getElementById('antenna-shape')) {
  clearPathHighlights(!isCommitted);

  if (!seq) {
    if (antennaShape) antennaShape.classList.remove('active');
    return;
  }

  if (antennaShape) antennaShape.classList.add('active');

  const pathSteps = engine ? engine.getPathForSequence(seq) : [];
  for (let i = 0; i < pathSteps.length; i++) {
    const stepSeq = pathSteps[i];
    const wire = wireElementsMap.get(stepSeq) || (typeof document !== 'undefined' ? document.getElementById(`wire-${seqToId(stepSeq)}`) : null);
    if (wire) {
      wire.classList.add('active-wire');
      activeWiresCache.push(wire);
    }

    const node = nodeElementsMap.get(stepSeq) || (typeof document !== 'undefined' ? document.getElementById(`node-${seqToId(stepSeq)}`) : null);
    if (node) {
      if (stepSeq === seq && isCommitted) {
        node.classList.add('committed-node');
        committedNodesCache.push(node);
      } else {
        node.classList.add('active-node');
        activeNodesCache.push(node);
      }
    }
  }

  // Highlight corresponding number chip if matched
  const numMatch = digitsData.find(d => d.seq === seq);
  if (numMatch) {
    const chip = chipElementsMap.get(numMatch.digit) || (typeof document !== 'undefined' ? document.getElementById('num-chip-' + numMatch.digit) : null);
    if (chip) {
      chip.classList.add(numMatch.isDit ? 'active-dit-chip' : 'active-dah-chip');
      activeChipsCache.push(chip);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderCardSvg,
    renderNumberBusBar,
    highlightPath,
    clearPathHighlights,
    wireElementsMap,
    nodeElementsMap,
    chipElementsMap,
    activeWiresCache,
    activeNodesCache,
    committedNodesCache,
    activeChipsCache
  };
}
