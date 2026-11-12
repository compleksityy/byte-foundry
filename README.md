# byte.foundry

A browser-based educational game that teaches eight computing topics through
short lessons, interactive practice and a tycoon you grow by learning.

## What it teaches

- **Binary fundamentals** — bits, bytes, denary↔binary conversion
- **Binary addition** — 4-bit and 8-bit addition, carries and overflow
- **Binary subtraction** — borrowing, ones' complement, two's complement
- **Hexadecimal** — hex↔denary, hex↔binary
- **Octal** — base-8 numbers and the three-bit groups behind them
- **Python programming** — tracing, variables, strings, conditionals, loops,
  lists, functions, data types and debugging
- **Logic gates** — AND, OR, NOT, NAND, NOR, XOR and multi-gate chains
- **Data storage** — bits, bytes and the 1024-based K/M/G/T units

Each department has 100+ questions (908 in total) and a mastery challenge.
The Python bank uses genuinely varied formats: predict the output, find the bug,
complete missing code, choose the right keyword, and follow multi-step logic.
Question values are rolled fresh on every visit, and within each difficulty level
the questions are served in a shuffled, random order.

## How it works

- **Home** — a ten-second orientation: your level, progress at a glance, and a
  clear next action. Set the difficulty here.
- **Learn** — read a structured briefing for any department: what you'll learn,
  a plain-English explanation, a worked example, an interactive demonstration
  (binary, addition and subtraction), and a graded knowledge check that pays a
  briefing bonus.
- **Practice** — the terminal for a chosen department. Answer questions to earn
  credits and XP. A hint is always available.
- **Land** — the plot game: spend cycles to buy plots that earn more cycles over
  time. Every plot wears out and needs a paid repair before it keeps earning.
- **Departments** — the tycoon hub: unlock the next department by clearing 15
  questions in the previous one, buy nodes for passive income, and take each
  department's mastery test. **Binary and Hexadecimal are always online** — you
  can practise them right away regardless of cycles or progress.
- **Upgrades** — permanent R&D modules that double or triple rewards, node
  output, or everything. Each explains exactly what it does.
- **Progress** — all your stats: XP and level, questions answered, accuracy,
  streak, per-department progress, mastery status, achievements, and a reduce-motion
  switch.
- **Theme picker** — in the top bar, switch instantly between five colour themes
  (Acid, Ember, Ocean, Mono, and a Light mode). Your choice is saved.

## Four difficulty levels

Difficulty is a strict ladder: each level draws only its own tier of questions,
so the jump between levels is real, not just cosmetic:

- **Beginner** — 4-bit numbers and the simplest facts. Taught from zero.
- **Intermediate** — 8-bit numbers up to 127. Multi-step but still gentle.
- **Advanced** — values that fill the whole byte, overflow and carry counting.
- **Expert** — 16-bit and multi-step conversions, two's complement across widths,
  hex arithmetic that carries past FF, wide-sum binary addition, and nested or
  recursive Python. This is a serious challenge.

Each level pays more credits too. You can change difficulty at any time without
losing progress. If you clear every question in your level's tier, the game
falls back to the hardest remaining questions so you can still finish all 100.

## Tycoon economy

Learning is the engine. Every correct answer pays credits and XP. Departments
generate passive income through nodes, and the more questions you clear, the
higher each department's mastery multiplier climbs. Achievements reward streaks,
milestones and masteries. Progression is tuned so finishing 100 questions in a
department feels achievable and lets you unlock the next one.

## Run it

Open `index.html` in a modern browser. No build step, account, backend, database,
package manager or local server is required. The project uses plain HTML, CSS and
JavaScript. The Google Fonts link is optional — offline, it falls back to system
fonts.

## Progress and privacy

Progress is saved in `localStorage` in the browser you use. It is not uploaded
anywhere. Clearing the browser's site data will erase the save. The game also
reads the previous `bytefoundry.v1` save format and migrates it when possible.

### Taking your save with you (shared PCs)

On a shared or school computer, a save in a browser profile can be wiped or shared
between users. The download button in the top bar (the file icon) exports your
whole progress as a compact ~150–250 character file, and the **Backup & Restore**
section on the Progress page can copy that code or paste one back in to restore
progress on another computer. The code never touches a server. It includes a
short per-install device id, so restoring a code made on a different device shows
a clear warning first. Codes are portable by design, which also means a code is
something you should keep to yourself — anyone you give yours to can clone your
progress.

## Accessibility

Visible focus outlines, a skip-to-content link, strong colour contrast, no
colour-only indicators, clear feedback after every answer, and both a
`prefers-reduced-motion` media query and an in-app "reduce motion" switch.

## Files

- `index.html` — page shell and script loading
- `style.css` — visual design and responsive layout
- `game.js` — routing, state, progression, economy, the land plot game, and interface
- `banks.js` — the eight department definitions, lessons and the 908-question banks