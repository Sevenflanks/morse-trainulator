# Morse Code Training Card

A pure web interactive Morse code training card reproducing the binary tree PCB card layout, providing tactile keying practice and audio-visual feedback.

## Language

**Morse Tree**:
The binary decision tree rooted at the Antenna, branching left for Dah (long) and right for Dit (short), mapping to letters A–Z.
_Avoid_: Letter graph, Morse diagram

**Dit**:
The short tone in Morse code, lasting 1 time unit ($T$), represented by a circular node on the card.
_Avoid_: Dot, short signal

**Dah**:
The long tone in Morse code, lasting 3 time units ($3T$), represented by a square or rectangular node on the card.
_Avoid_: Dash, long signal

**Unit Time ($T$)**:
The fundamental time duration in milliseconds defining standard Morse timing ratios, derived from WPM or set directly.
_Avoid_: Base delay, clock tick

**Keying Threshold**:
The boundary duration between a Dit and a Dah (default $2T$), used to classify a release event.
_Avoid_: Cutoff, split time

**Letter Gap**:
The silence duration after releasing the key (default $\ge 3T$) indicating the end of a character input, triggering letter evaluation.
_Avoid_: Timeout, letter pause

**Word Gap**:
The silence duration after a completed letter (default $7T$) indicating the end of a word, triggering a word break/space in output.
_Avoid_: Space pause, word timeout

**Preset Profile**:
Standardized, one-click timing presets based on standard WPM and timing ratios ($1T : 3T : 3T : 7T$):
- **入門 (Novice, 5 WPM)**: Dit 240ms, Dah 720ms, Letter 720ms, Word 1680ms
- **基礎 (Beginner, 10 WPM)**: Dit 120ms, Dah 360ms, Letter 360ms, Word 840ms
- **熟練 (Intermediate, 15 WPM)**: Dit 80ms, Dah 240ms, Letter 240ms, Word 560ms
- **精通 (Proficient, 20 WPM)**: Dit 60ms, Dah 180ms, Letter 180ms, Word 420ms
- **神速 (Advanced, 35 WPM)**: Dit 35ms, Dah 105ms, Letter 105ms, Word 245ms
- **極限 (Competition, 50+ WPM)**: Dit 24ms, Dah 72ms, Letter 72ms, Word 168ms
_Avoid_: Mode config, speed theme

**Keying Meter**:
A real-time visual progress gauge tracking current press duration against Dit/Dah threshold boundaries.
_Avoid_: Press gauge, time bar

**Settlement Gap Timeline**:
A continuous, dual-threshold visual timeline gauge ($0 \to 3T \to 7T$) tracking silence duration upon key release. Explicitly renders both the Letter Settlement threshold ($3T$, Gold marker) and Word Settlement threshold ($7T$, Cyan marker), guiding the operator's keying rhythm across three functional zones:
- $0 \sim 3T$: Intra-character continuation zone (可接續同字母).
- $3T \sim 7T$: Same-word next-letter zone (字母已結算，按鍵為同單字下一字母).
- $\ge 7T$: Word break zone (單字已結算，自動插入空格).
_Avoid_: Gap bar, timeout gauge

**Free Input Mode**:
Operating mode where arbitrary Morse keying produces live decoding on the card with no target text.
_Avoid_: Sandbox mode, manual mode

**Text Mode**:
Operating mode featuring target passage entry, automated replay performance, and live keying comparison with green/red verification.
_Avoid_: Exam mode, quiz mode

**Passage Comparison**:
The sequential letter-by-letter matching of keyed characters against the target text, highlighting matches in green and mismatches in red.
_Avoid_: String diff, typing check

**Auto Performance**:
Automated audio-visual playback of a text passage, sequentially lighting the Morse tree PCB and playing tones according to the active speed profile.
_Avoid_: Auto play, robot keying

**Straight Key Mode**:
Traditional single-switch manual keying where the operator directly controls tone duration and spacing by holding down a single key.
_Avoid_: Manual key, single button

**Dual-Paddle Key Mode**:
An electronic keyer mode utilizing two separate paddle contacts (left and right) to automatically generate timed Dits ($1T$) and Dahs ($3T$) with standard $1T$ element spacing.
_Avoid_: Double key, twin button

**Iambic Keying**:
A squeeze-keying technique where squeezing both paddles simultaneously causes the electronic keyer to automatically alternate between Dits and Dahs (`· − · −` or `− · − ·`).
_Avoid_: Alternating mode, squeeze play

**Iambic Mode A vs. Mode B**:
- **Mode A (Curtis 8043)**: Completes the current element and stops immediately when both paddles are released.
- **Mode B (Curtis 8044)**: Appends one additional opposite element if both paddles were squeezed during the current element, even if released before the element ends.
_Avoid_: Type A/B, keyer profile

**Element Memory**:
A hardware/firmware latch mechanism that detects and records a momentary tap on the opposite paddle while the current Dit or Dah is sounding, automatically scheduling the next element without requiring the operator to wait for element completion.
_Avoid_: Key buffer, input cache

**Paddle Reverse**:
A configuration toggle swapping the assignments of the left and right paddles (Dit $\leftrightarrow$ Dah) to accommodate left-handed operators or personal ergonomics.
_Avoid_: Invert paddles, switch hands

**Number Bus Bar (數字匯流排陣列)**:
A dedicated 10-pin metallic IC array situated at the base of the PCB card, organizing standard 5-element Morse digits (`1`–`5` Dit-dominant, `6`–`0` Dah-dominant). It provides instant visual highlighting upon resolution and direct interactive demo playback without cluttering the 4-level binary letter tree.
_Avoid_: Number line, digit footer

**CW Oscilloscope Ribbon (即時心電圖示波帶)**:
A continuous 60FPS scrolling time-domain waveform display resembling an oscilloscope or telegraph paper tape, visualizing high/low square wave pulses, pulse durations, and spacing consistency between elements.
_Avoid_: Audio visualizer, frequency spectrum

**Farnsworth Timing (法恩斯沃斯節奏)**:
A Morse training standard where individual characters and intra-element spaces sound at a brisk speed (e.g. 18–20 WPM) to develop holistic acoustic pattern recognition, while the intervals between letters and words are lengthened according to a slower overall speed (e.g. 5–10 WPM).
_Avoid_: Spacing hack, variable speed

**Atmospheric RF Noise (QRN / 電台微底噪)**:
A simulated analog vacuum-tube radio receiver background hiss synthesized via Web Audio bandpass-filtered noise, evoking authentic shortwave radio environment without interfering with the CW sidetone intelligibility.
_Avoid_: White noise generator, radio static track

**Koch Method Progression (國際科赫法漸進闖關)**:
An authoritative training method proposed by Ludwig Koch that begins with full character speed (18–20 WPM) and only 2 distinct characters (`K` and `M`). A new character from the 36-character standard sequence is unlocked only after reaching a $\ge 90\%$ accuracy threshold in drill sessions, progressively illuminating the PCB card from shrouded darkness to full mastery.
_Avoid_: Level system, campaign mode

**Koch Locked / Unlocked Node (科赫沉睡節點 / 點亮節點)**:
Visual states on the PCB card where characters yet to be mastered remain dimmed in atmospheric shroud (`koch-locked`), while mastered characters radiate gold/neon power (`koch-unlocked`), with the active stage's newest target character pulsing with an azure beacon.
_Avoid_: Disabled node, hidden node

**Bug Key (半自動機械震報鍵 / Vibroplex Bug)**:
A classic mechanical telegraph keying device invented in 1904. Pressing the left lever engages a vibrating mechanical pendulum to generate automatic, periodic Dits (`······`), while pressing the right lever functions as a pure manual straight key for Dahs, preserving operator wrist rhythm and vintage acoustic phrasing without electronic iambic alternation.
_Avoid_: Semi-paddle, hybrid keyer

**Home Row Keybindings (基準鍵盲打鍵位)**:
An ergonomic keyboard mapping layout aligning Morse telegraph input with touch-typing home positions (e.g. `F` for Dit, `J` for Dah, `K` for Straight key), avoiding browser hotkey conflicts like `/` (search) or `Space` (page scroll), eliminating keyboard hunting and physical strain.
_Avoid_: Custom hotkeys, macro shortcuts

**Settings Persistence (全設定持久化)**:
The automatic local storage synchronization mechanism that persists all timing configurations, keyer modes, audio parameters, keybindings, and training preferences across browser reloads.
_Avoid_: Cookie save, session cache

---

## Architecture & Modules (模組化架構)

The codebase is organized into clean, deep modules with zero build-step overhead, providing 100% `file:///` offline double-click compatibility and standalone Node.js unit testability:

- **`index.html`**: Semantic HTML structure linking decoupled stylesheets and scripts (< 500 lines).
- **`css/`**:
  - `base.css`: CSS custom properties, resets, typography, and responsive grid layout.
  - `pcb-card.css`: PCB board styling, SVG binary tree traces, nodes, number bus bar, and Koch glow animations.
  - `controls.css`: Telegraph straight key, dual paddles, timing meters, and settings rows.
  - `modes.css`: Free mode scenarios, text practice cards, and Koch drill components.
- **`js/core/`** (Pure Domain Models, zero DOM dependencies, 100% unit-testable):
  - `morse-data.js`: Binary tree graph constants, coordinates, 10-pin DIP array, Koch 36-char sequence, speed presets.
  - `morse-engine.js`: Pure logic `MorseEngine` finite state machine and sequence evaluator.
  - `morse-audio.js`: Web Audio API oscillator, envelope shaping, and QRN atmospheric static generator.
  - `iambic-keyer.js`: Curtis 8044 Iambic Mode A/B and Vibroplex Bug Key timing state machine.
  - `cw-ribbon.js`: 60 FPS HTML5 canvas oscilloscope paper-tape visualizer.
  - `koch-manager.js`: Koch 35-stage progressive unlock logic and drill sequence generator.
  - `keybinding-manager.js`: Home Row (F/J), Standard, Left-Hand, and Custom keybinding mapper.
  - `settings-manager.js`: `localStorage` persistence, legacy hotkey auto-migration, and factory reset.
- **`js/ui/`** (UI View Controllers):
  - `pcb-renderer.js`: Dynamic SVG rendering and real-time wire path illumination.
  - `meter-controller.js`: Hold duration meter and anti-jitter settlement gap timeline animation.
  - `free-mode.js`: Free practice walkthrough scenarios and letter replay.
  - `text-mode.js`: Text mode passage evaluation, auto performance playback, and scoring.
  - `koch-mode.js`: Koch drill session runner, live feedback, and stage unlock ceremonies.
- **`js/app.js`**:
  - Application orchestrator, cross-module event bus, global keyboard routing, and startup bootstrap.

---

## Backlog (未排期規劃清單)

1. **盲聽抄收挑戰 (Listening & Copying Mode / RX Mode)**:
   - 隨機播放字母或單字音效（卡片進入遮蔽/盲聽模式）。
   - 考驗玩家純聽覺反射輸入鍵盤對應字母，評測抄收速度與正確率。
2. **暗號彩蛋 (Secret Easter Eggs)**:
   - 當發報命中特定通訊代碼（如 `SOS`、`73`、`SK`）時，觸發特殊電路板全局燈效或音效彩蛋。



