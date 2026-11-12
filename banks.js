// ============================================================================
// byte.foundry — question banks, lessons and department definitions
// Five subjects x 100 questions = 500 questions, generated from fixed seeds so
// the banks never change between visits. Each question carries a difficulty
// tag (1 = beginner, 2 = intermediate, 3 = advanced, 4 = expert) so the chosen
// difficulty genuinely changes which questions a student sees and how much the
// answer is worth.
// ============================================================================

(function () {
  "use strict";

  // --- Random helpers ---------------------------------------------------------
  // Every visit re-rolls the numbers inside each question: rng returns a fresh
  // uniform random source on every page load, so the question banks are no
  // longer fixed — the values change each time you practise. (The order in which
  // questions appear is shuffled separately in game.js per difficulty level.)
  function rng(/* seed ignored — randomness is the point */) {
    return () => Math.random();
  }
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const bin = (n, w) => n.toString(2).padStart(w || 8, "0");
  const hx = (n) => n.toString(16).toUpperCase();
  const p = (r, a) => a[ri(r, 0, a.length - 1)];

  // bank builds `count` unique questions from a spec entry `[count, difficulty, generator]`.
  function bank(seed, spec) {
    const r = rng(seed), out = [], seen = new Set();
    for (const [n, difficulty, g] of spec) {
      let k = 0, guard = 0;
      while (k < n) {
        if (guard++ > 9999) throw new Error("bank");
        const x = g(r, k);
        const key = (x.c || "") + x.q;
        if (!seen.has(key)) { seen.add(key); out.push({ ...x, d: difficulty }); k++; }
      }
    }
    return out;
  }

  // --- Binary fundamentals (BIN) --------------------------------------------
  const BIN = bank(1, [
    // Beginner — tiny 4-bit numbers and the simplest facts
    [15, 1, (r, i) => ({ q: `Convert ${bin(i + 1, 4)} to denary`, a: "" + (i + 1) })],
    [15, 1, (r, i) => ({ q: `Write ${i + 1} as a 4-bit binary number`, a: bin(i + 1, 4) })],
    [10, 1, (r, i) => ({ q: `How many different values can ${i + 1} bit${i ? "s" : ""} store?`, a: "" + 2 ** (i + 1) })],
    [10, 1, (r, i) => ({ q: `How many bits are in ${i + 1} byte${i ? "s" : ""}?`, a: "" + 8 * (i + 1) })],
    // Intermediate — 8-bit numbers up to 127
    [10, 2, r => { const n = ri(r, 16, 127); return { q: `Convert ${bin(n)} to denary`, a: "" + n }; }],
    [10, 2, r => { const n = ri(r, 16, 127); return { q: `Write ${n} as an 8-bit binary number`, a: bin(n) }; }],
    // Advanced — numbers 128-255 fill the whole byte; largest value in a width
    [10, 3, r => { const n = ri(r, 128, 255); return { q: `Convert ${bin(n)} to denary`, a: "" + n }; }],
    [10, 3, r => { const n = ri(r, 128, 255); return { q: `Write ${n} as an 8-bit binary number`, a: bin(n) }; }],
    [10, 3, r => { const n = ri(r, 9, 20); return { q: `What is the largest denary number that fits in ${n} bits?`, a: "" + (2 ** n - 1) }; }],
    // Expert — 16-bit conversions and the bits needed to store a large value
    [12, 4, r => { const n = ri(r, 256, 65535); return { q: `Convert ${bin(n, 16)} to denary`, a: "" + n }; }],
    [12, 4, r => { const n = ri(r, 256, 65535); return { q: `Write ${n} as a 16-bit binary number`, a: bin(n, 16) }; }],
    [10, 4, r => { const n = ri(r, 256, 1000000); return { q: `What is the minimum number of bits needed to store the value ${n}?`, a: "" + (Math.floor(Math.log2(n)) + 1) }; }]
  ]);

  // --- Binary addition (ADD) -------------------------------------------------
  const carries = (x, y) => { let c = 0, n = 0; for (let b = 0; b < 4; b++) { c = ((x >> b & 1) + (y >> b & 1) + c) > 1 ? 1 : 0; n += c; } return n; };
  // Count carry columns while adding two 8-bit values (including the final carry out).
  const carries8 = (x, y) => { let c = 0, n = 0; for (let b = 0; b < 8; b++) { c = ((x >> b & 1) + (y >> b & 1) + c) > 1 ? 1 : 0; n += c; } return n; };
  // Pad a denary value out to a fixed-width hex string (used for 3-digit hex).
  const hx3 = (n) => n.toString(16).toUpperCase().padStart(3, "0");
  const ADD = bank(2, [
    // Beginner — 4-bit sums you can do column by column
    [25, 1, r => { const x = ri(r, 1, 14), y = ri(r, 1, 15 - x); return { q: `Add ${bin(x, 4)} + ${bin(y, 4)}. Answer in binary.`, a: bin(x + y, 4) }; }],
    [15, 1, r => { const x = ri(r, 1, 14), y = ri(r, 1, 15 - x); return { q: `Add ${bin(x, 4)} + ${bin(y, 4)}. Give the answer in denary.`, a: "" + (x + y) }; }],
    // Intermediate — 8-bit sums that stay under 127
    [15, 2, r => { const x = ri(r, 10, 100), y = ri(r, 10, 126 - x); return { q: `Add ${bin(x)} + ${bin(y)}. Answer in binary.`, a: bin(x + y) }; }],
    [10, 2, r => { const x = ri(r, 60, 200), y = ri(r, 60, 200); return { q: `Do ${x} and ${y} overflow one byte when added? (yes/no)`, a: x + y > 255 ? "yes" : "no" }; }],
    // Advanced — overflowing sums and carry counting
    [15, 3, r => { const x = ri(r, 150, 255), y = ri(r, 256 - x, 255); return { q: `An 8-bit register holds ${bin(x)}. Add ${bin(y)}. What does it hold now? (the overflow bit is lost)`, a: bin(x + y - 256) }; }],
    [10, 3, r => { const x = ri(r, 1, 15), y = ri(r, 1, 15); return { q: `How many carries happen adding ${bin(x, 4)} + ${bin(y, 4)}? (count the carry out of the last column too)`, a: "" + carries(x, y) }; }],
    // Expert — 16-bit sums, wide results, and 8-bit carry storms
    [8, 4, r => { const x = ri(r, 2000, 30000), y = ri(r, 2000, 30000); return { q: `Add ${bin(x)} + ${bin(y)}. Answer in binary.`, a: bin(x + y) }; }],
    [8, 4, r => { const x = ri(r, 100, 250), y = ri(r, 100, 250); return { q: `Add ${bin(x)} + ${bin(y)} as 8-bit numbers. If the result needs more than 8 bits, give the FULL binary answer including the extra bit.`, a: bin(x + y, 9) }; }],
    [6, 4, r => { const x = ri(r, 128, 255), y = ri(r, 128, 255); return { q: `Add ${bin(x)} + ${bin(y)} in an 8-bit register where the final carry bit is LOST (result wraps around). Give the stored denary value.`, a: "" + ((x + y) % 256) }; }],
    [6, 4, r => { const x = ri(r, 120, 250), y = ri(r, 120, 250); return { q: `How many carry columns happen when adding ${bin(x)} + ${bin(y)} in 8 bits? (count the final carry out too)`, a: "" + carries8(x, y) }; }]
  ]);

  // --- Binary subtraction (SUB) ----------------------------------------------
  const SUB = bank(3, [
    // Beginner — 4-bit differences
    [25, 1, r => { const x = ri(r, 2, 15), y = ri(r, 1, x - 1); return { q: `Subtract ${bin(x, 4)} - ${bin(y, 4)}. Answer in binary.`, a: bin(x - y, 4) }; }],
    [15, 1, r => { const x = ri(r, 2, 15), y = ri(r, 1, x - 1); return { q: `Subtract ${bin(x, 4)} - ${bin(y, 4)}. Give the answer in denary.`, a: "" + (x - y) }; }],
    // Intermediate — 8-bit differences and ones' complement
    [15, 2, r => { const x = ri(r, 40, 160), y = ri(r, 10, x - 1); return { q: `Subtract ${bin(x)} - ${bin(y)}. Answer in binary.`, a: bin(x - y) }; }],
    [15, 2, r => { const n = ri(r, 1, 254); return { q: `Flip every bit of ${bin(n)} (the ones' complement).`, a: bin(255 - n) }; }],
    // Advanced — large differences
    [10, 3, r => { const x = ri(r, 160, 255), y = ri(r, 120, x - 1); return { q: `Subtract ${bin(x)} - ${bin(y)}. Answer in binary.`, a: bin(x - y) }; }],
    // Expert — negative numbers: two's complement across widths, and ones'-plus-one
    [10, 4, r => { const n = ri(r, 1, 127); return { q: `Write -${n} as an 8-bit two's complement number.`, a: bin(256 - n) }; }],
    [10, 4, r => { const n = ri(r, 128, 255); return { q: `Write -${n} as a 16-bit two's complement number.`, a: bin(65536 - n, 16) }; }],
    [10, 4, r => { const n = ri(r, 1, 200); return { q: `Take the ones' complement of ${bin(n)} (8-bit), then ADD 1 to make it two's complement. What 8-bit number do you get?`, a: bin(256 - n) }; }]
  ]);

  // --- Hexadecimal (HEX) ------------------------------------------------------
  const HEX = bank(4, [
    // Beginner — one hex digit is exactly a nibble
    [16, 1, (r, i) => ({ q: `Write hex digit ${hx(i)} as 4 bits`, a: bin(i, 4) })],
    [16, 1, (r, i) => ({ q: `Convert ${bin(i, 4)} to one hex digit`, a: hx(i) })],
    // Intermediate — two-digit hex to/from denary under 128
    [15, 2, r => { const n = ri(r, 16, 127); return { q: `Convert hex ${hx(n)} to denary`, a: "" + n }; }],
    [15, 2, r => { const n = ri(r, 16, 127); return { q: `Convert ${n} to hexadecimal`, a: hx(n) }; }],
    // Advanced — values across the whole byte, and byte → two hex digits
    [10, 3, r => { const n = ri(r, 128, 255); return { q: `Convert hex ${hx(n)} to denary`, a: "" + n }; }],
    [10, 3, r => { const n = ri(r, 128, 255); return { q: `Convert ${bin(n)} to hex (two digits)`, a: hx(n) }; }],
    // Expert — three-digit hex and hex addition that carries past hex FF
    [8, 4, r => { const n = ri(r, 256, 4095); return { q: `Convert hex ${hx3(n)} to denary`, a: "" + n }; }],
    [8, 4, r => { const n = ri(r, 256, 4095); return { q: `Convert ${n} to a three-digit hex number`, a: hx3(n) }; }],
    [6, 4, r => { const n = ri(r, 256, 4095); return { q: `Convert ${bin(n, 12)} (a 12-bit binary number) to hex`, a: hx3(n) }; }],
    [6, 4, r => { const a = ri(r, 10, 90), b = ri(r, 10, 100 - a); return { q: `Add the hex numbers ${hx(a)} + ${hx(b)} (a and b each fit one byte). Give the hex answer.`, a: hx(a + b) }; }],
    [6, 4, r => { const n = ri(r, 255, 1020); return { q: `What is ${hx(n)} + 1 in hex? (carry past the rightmost digit)`, a: hx(n + 1) }; }]
  ]);

  // --- Python (PY) ------------------------------------------------------------
  const PY = [];
  const prng = rng(505);
  const pk = (a) => a[ri(prng, 0, a.length - 1)];
  const add = (q, c, a, difficulty) => {
    if (PY.some(item => item.q === q)) { const detail = c.split("\n")[0].replace(/\s+/g, " "); q += ` For this code: ${detail}`; }
    PY.push({ q, c, a: String(a), d: difficulty });
  };
  const outputPrompts = ["What appears in the terminal?", "Work out the exact output.", "Trace the program. What does it display?", "Enter the value printed by this code.", "Run the snippet mentally. What is the result?", "What would Python show?", "Follow each line and give the final output.", "Predict the terminal output.", "What is the program's output?", "Read the code and calculate what gets printed?"];
  const valuePrompts = ["What is the final value of x?", "After these statements run, what does x contain?", "Find the value stored in result.", "What number is assigned to total?", "Track the variable changes. What is its final value?", "What value would you get from answer?", "Calculate the value of score.", "What is stored in the variable at the end?", "Give the final value of n.", "Work out the value assigned to output."];
  const wordList = ["compiler", "terminal", "variable", "function", "integer", "boolean", "iteration", "sequence", "keyboard", "monitor", "network", "program", "algorithm", "hardware", "software", "debugger", "operator", "condition", "database", "processor"];
  const operators = ["+", "-", "*", "//", "%", "**"];

  // 1-10: arithmetic / predict the output (beginner).
  for (let i = 0; i < 10; i++) {
    const op = pk(operators), a = ri(prng, 2, 12), b = ri(prng, 2, 6);
    const val = { "+": a + b, "-": a - b, "*": a * b, "//": Math.floor(a / b), "%": a % b, "**": a ** b }[op];
    add(i % 2 ? pk(outputPrompts) : `Evaluate ${a} ${op} ${b}. Give the answer as a number.`, `print(${a} ${op} ${b})`, val, 1);
  }
  // 11-20: variables and reassignment (beginner/intermediate).
  for (let i = 0; i < 10; i++) {
    const a = ri(prng, 3, 20), b = ri(prng, 2, 9), c = ri(prng, 1, 8), mode = i % 5;
    let code, ans;
    if (mode === 0) { code = `x = ${a}\nx += ${b}\nx -= ${c}\nprint(x)`; ans = a + b - c; }
    else if (mode === 1) { code = `score = ${a}\nbonus = ${b}\nscore = score * 2 + bonus\nprint(score)`; ans = a * 2 + b; }
    else if (mode === 2) { code = `first = ${a}\nsecond = first + ${b}\nfirst = second * ${c}\nprint(first)`; ans = (a + b) * c; }
    else if (mode === 3) { code = `n = ${a}\nn = n // ${b}\nn = n + ${c}\nprint(n)`; ans = Math.floor(a / b) + c; }
    else { code = `x = ${a}\ny = ${b}\nx, y = y, x\nprint(x * ${c} + y)`; ans = b * c + a; }
    add(pk(valuePrompts), code, ans, mode < 3 ? 1 : 2);
  }
  // 21-30: strings, indexing, slicing, methods (beginner/intermediate).
  for (let i = 0; i < 10; i++) {
    const w = pk(wordList), n = ri(prng, 1, w.length - 1), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { code = `word = "${w}"\nprint(word[${n}])`; ans = w[n]; q = `In the string "${w}", what character is at index ${n}?`; }
    else if (mode === 1) { code = `word = "${w}"\nprint(word[${n}:])`; ans = w.slice(n); q = `What substring does [${n}:] return from "${w}"?`; }
    else if (mode === 2) { code = `word = "${w}"\nprint(word.upper())`; ans = w.toUpperCase(); q = `Convert "${w}" using Python's upper() method. What is returned?`; }
    else if (mode === 3) { code = `word = "${w}"\nprint(len(word))`; ans = w.length; q = `How many characters are in the string "${w}"? Use len().`; }
    else { const k = ri(prng, 2, 3); code = `word = "${w}"\nprint(word * ${k})`; ans = w.repeat(k); q = `A string is repeated ${k} times. What does "${w}" * ${k} produce?`; }
    add(q, code, ans, mode === 1 ? 2 : 1);
  }
  // 31-40: conditionals (beginner/intermediate).
  for (let i = 0; i < 10; i++) {
    const x = ri(prng, 2, 40), t = ri(prng, 5, 35), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { code = `temperature = ${x}\nif temperature >= ${t}:\n    print("warm")\nelse:\n    print("cold")`; ans = x >= t ? "warm" : "cold"; q = `Does ${x} meet the threshold of ${t}? Enter the message printed.`; }
    else if (mode === 1) { code = `value = ${x}\nif value % 3 == 0:\n    print("multiple")\nelse:\n    print("other")`; ans = x % 3 === 0 ? "multiple" : "other"; q = `Is ${x} divisible by 3? What word is printed?`; }
    else if (mode === 2) { code = `mark = ${x}\nif mark >= 30:\n    print("pass")\nelif mark >= 20:\n    print("resit")\nelse:\n    print("fail")`; ans = x >= 30 ? "pass" : x >= 20 ? "resit" : "fail"; q = `A mark of ${x} is checked against two boundaries. What is the result?`; }
    else if (mode === 3) { code = `level = ${x}\nif level < ${t}:\n    print("below")\nelse:\n    print("at least")`; ans = x < t ? "below" : "at least"; q = `Compare ${x} with ${t}. Which branch runs?`; }
    else { code = `a = ${x}\nb = ${t}\nif a > b and a % 2 == 0:\n    print("A")\nelse:\n    print("B")`; ans = x > t && x % 2 === 0 ? "A" : "B"; q = `Check both conditions for a=${x} and b=${t}. Which letter is printed?`; }
    add(q, code, ans, mode === 4 ? 2 : 1);
  }
  // 41-50: for loops and range (intermediate).
  for (let i = 0; i < 10; i++) {
    const a = ri(prng, 1, 5), b = ri(prng, 7, 13), step = ri(prng, 2, 3), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { const vals = Array.from({ length: Math.max(0, b - a) }, (_, j) => a + j); code = `total = 0\nfor number in range(${a}, ${b}):\n    total += number\nprint(total)`; ans = vals.reduce((x, y) => x + y, 0); q = `A loop adds every integer from ${a} up to ${b - 1}. What is total?`; }
    else if (mode === 1) { const vals = []; for (let n = a; n < b; n += step) vals.push(n); code = `for number in range(${a}, ${b}, ${step}):\n    print(number, end=" ")`; ans = vals.join(" "); q = `List the numbers printed by range(${a}, ${b}, ${step}), separated by spaces.`; }
    else if (mode === 2) { code = `count = 0\nfor number in range(${b}):\n    if number % 2 == 1:\n        count += 1\nprint(count)`; ans = Math.floor(b / 2); q = `How many odd values are checked in range(${b})?`; }
    else if (mode === 3) { code = `product = 1\nfor number in range(1, ${a + 4}):\n    product *= number\nprint(product)`; ans = Array.from({ length: a + 3 }, (_, j) => j + 1).reduce((x, y) => x * y, 1); q = `The loop multiplies the integers from 1 to ${a + 3}. What does it print?`; }
    else { code = `for number in range(${a}, ${b}, ${step}):\n    print(number * 2, end=" ")`; ans = Array.from({ length: Math.ceil((b - a) / step) }, (_, j) => (a + j * step) * 2).filter(x => x / 2 < b).join(" "); q = `Double each value in range(${a}, ${b}, ${step}). Enter the printed sequence.`; }
    add(q, code, ans, 2);
  }
  // 51-60: while loops (advanced).
  for (let i = 0; i < 10; i++) {
    const start = ri(prng, 1, 6), limit = ri(prng, 15, 35), step = ri(prng, 2, 5), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { let n = start; while (n < limit) n += step; code = `n = ${start}\nwhile n < ${limit}:\n    n += ${step}\nprint(n)`; ans = n; q = `A counter starts at ${start} and increases by ${step} until it reaches ${limit}. What is its final value?`; }
    else if (mode === 1) { let n = start, count = 0; while (n < limit) { n *= 2; count++; } code = `n = ${start}\nsteps = 0\nwhile n < ${limit}:\n    n *= 2\n    steps += 1\nprint(steps)`; ans = count; q = `How many times does this while loop repeat before n reaches ${limit}?`; }
    else if (mode === 2) { let n = start, sum = 0; while (n <= limit) { sum += n; n += step; } code = `n = ${start}\ntotal = 0\nwhile n <= ${limit}:\n    total += n\n    n += ${step}\nprint(total)`; ans = sum; q = `Add the values visited by this while loop. What is total?`; }
    else if (mode === 3) { let n = limit; while (n > start) n -= step; code = `n = ${limit}\nwhile n > ${start}:\n    n -= ${step}\nprint(n)`; ans = n; q = `The loop counts down from ${limit} in steps of ${step}. What value remains when it stops?`; }
    else { let n = start, out = []; while (n < limit) { out.push(n); n += step; } code = `n = ${start}\nwhile n < ${limit}:\n    print(n, end=" ")\n    n += ${step}`; ans = out.join(" "); q = `Write the sequence printed by this while loop, with spaces between values.`; }
    add(q, code, ans, 3);
  }
  // 61-70: lists and indexing (advanced).
  for (let i = 0; i < 10; i++) {
    const a = ri(prng, 2, 9), b = ri(prng, 10, 19), c = ri(prng, 20, 29), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { const L = [a, b, c]; code = `values = [${L.join(", ")}]\nprint(values[1])`; ans = b; q = `What is at index 1 in the list [${a}, ${b}, ${c}]?`; }
    else if (mode === 1) { const L = [a, b, c]; code = `values = [${L.join(", ")}]\nprint(values[-1])`; ans = c; q = `What does index -1 return from [${a}, ${b}, ${c}]?`; }
    else if (mode === 2) { const L = [a, b]; code = `values = [${a}, ${b}]\nvalues.append(${c})\nprint(len(values))`; ans = 3; q = `A list starts with two items and append() adds one more. What does len() return?`; }
    else if (mode === 3) { const L = [a, b, c]; code = `values = [${L.join(", ")}]\nvalues[0] = ${c}\nprint(values[0] + values[2])`; ans = c + c; q = `After replacing the first item with ${c}, add the first and last list items. What is the result?`; }
    else { const L = [a, b, c]; code = `values = [${L.join(", ")}]\nprint(values[0:2])`; ans = `[${a}, ${b}]`; q = `What list is returned by the slice values[0:2] for [${a}, ${b}, ${c}]? Include the square brackets.`; }
    add(q, code, ans, 3);
  }
  // 71-80: types, casting, operators (expert) — multi-step operator and type work.
  for (let i = 0; i < 10; i++) {
    const n = ri(prng, 20, 90), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { const qq = Math.floor(n / 3), rr = n % 3; code = `value = ${n}\nq = value // 3\nr = value % 3\nprint(q, r)`; ans = `${qq} ${rr}`; q = `Divide ${n} by 3 using // and % . What does print(q, r) output? (two numbers, space-separated)`; }
    else if (mode === 1) { code = `value = ${n}\nprint(value / 2, value // 2)`; ans = `${n / 2} ${Math.floor(n / 2)}`; q = `Run ${n} / 2 and ${n} // 2. What does print() show? (two values, space-separated)`; }
    else if (mode === 2) { const both = n % 2 === 0 && n % 5 === 0; code = `value = ${n}\nprint(value % 2 == 0 and value % 5 == 0)`; ans = both ? "True" : "False"; q = `Does ${n} pass BOTH "is even" and "is divisible by 5"? Enter the boolean Python prints.`; }
    else if (mode === 3) { const s = n % 10; code = `value = ${n}\nprint(value % 10 * 2)`; ans = "" + (s * 2); q = `Take the last digit of ${n} and multiply it by 2. What is printed?`; }
    else { const m = (n * 3) % 4; code = `a = ${n}\nb = a * 3\nprint(b % 4 + 1)`; ans = "" + (m + 1); q = `On ${n}, compute (value*3) % 4 + 1. What is printed?`; }
    add(q, code, ans, 4);
  }
  // 81-90: functions, nested calls, recursion (expert).
  for (let i = 0; i < 10; i++) {
    const a = ri(prng, 2, 7), b = ri(prng, 2, 5), mode = i % 5;
    let code, ans, q;
    if (mode === 0) { const inner = a * 2 + b, outer = inner * 2 + b; code = `def f(x):\n    return x * 2 + ${b}\n\nprint(f(f(${a})))`; ans = "" + outer; q = `Trace f(f(${a})) where f(x) returns x*2+${b}. What is printed?`; }
    else if (mode === 1) { let f = 1; for (let k = 2; k <= a + 3; k++) f *= k; code = `def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\n\nprint(fact(${a + 3}))`; ans = "" + f; q = `This recursive function returns ${a + 3}!. What is printed?`; }
    else if (mode === 2) { const v = (a + b) * 2 + 3; code = `def compute(x, y):\n    total = (x + y) * 2\n    return total + 3\n\nprint(compute(${a}, ${b}))`; ans = "" + v; q = `Call compute(${a}, ${b}). What does it return?`; }
    else if (mode === 3) { const v = a * b + b; code = `def product(x, y):\n    return x * y + y\n\nprint(product(${a}, ${b}))`; ans = "" + v; q = `What does product(${a}, ${b}) return?`; }
    else { const v = (a * b + 1) * b + 1; code = `def step(x):\n    return x * ${b} + 1\n\nprint(step(step(${a})))`; ans = "" + v; q = `Trace step(step(${a})) with step(x)=x*${b}+1. What is printed?`; }
    add(q, code, ans, 4);
  }
  // 91-100: debugging and completing expressions (expert).
  const debug = [
    ["Which operator belongs in the blank to test whether n is equal to 5?", "n = 5\nif n ___ 5:\n    print(\"match\")", "=="],
    ["Which keyword sends a value back from a function?", "def get_total():\n    total = 12\n    ___ total", "return"],
    ["Which function converts the text \"42\" into an integer?", "value = \"42\"\nnumber = ___(value)\nprint(number + 1)", "int"],
    ["Which list method adds an item to the end of a list?", "colours = [\"red\", \"blue\"]\ncolours.___(\"green\")", "append"],
    ["Which keyword starts a loop that runs while a condition is true?", "n = 0\n___ n < 3:\n    n += 1", "while"],
    ["Which keyword begins a function definition?", "___ greet(name):\n    print(\"Hello\", name)", "def"],
    ["Which operator gives the remainder after division?", "remainder = 17 ___ 5\nprint(remainder)", "%"],
    ["Which keyword handles the alternative branch of an if statement?", "if score >= 50:\n    print(\"pass\")\n___:\n    print(\"retry\")", "else"],
    ["Which built-in function counts the items in a list?", "items = [4, 8, 12, 16]\nprint( ___ (items))", "len"],
    ["Which keyword skips to the next loop iteration?", "for n in range(5):\n    if n == 2:\n        ___\n    print(n)", "continue"]
  ];
  for (const [q, c, a] of debug) add(q, c, a, 4);

  // --- Octal (OCT) helper -----------------------------------------------------
  const oct = (n) => n.toString(8);

  // --- Logic gates (LOG) helpers ----------------------------------------------
  const GEV = (gate, a, b) => ({ AND: a & b, OR: a | b, NAND: 1 - (a & b), NOR: 1 - (a | b), XOR: a ^ b }[gate]);
  const GATE_ID = [
    ["Which logic gate outputs 1 only when both of its inputs are 1?", "and"],
    ["Which logic gate outputs 1 when at least one of its inputs is 1?", "or"],
    ["Which logic gate outputs 1 when its two inputs are different?", "xor"],
    ["Which single-input logic gate flips its input (1 becomes 0, 0 becomes 1)?", "not"],
    ["Which gate behaves like an AND gate with the output inverted?", "nand"],
    ["Which gate behaves like an OR gate with the output inverted?", "nor"],
    ["Which gate outputs 0 only when both of its inputs are 1?", "nand"],
    ["Which gate outputs 0 when at least one of its inputs is 1?", "nor"],
    ["Which gate outputs 0 when its two inputs are the same?", "xor"],
    ["Which logic gate is also called an inverter?", "not"],
    ["An AND gate with a small circle on its output symbol represents which gate?", "nand"],
    ["An OR gate with a small circle on its output symbol represents which gate?", "nor"],
    ["This gate's symbol is a triangle with a small circle on the tip. Which gate is it?", "not"],
    ["A D-shaped (AND) gate symbol with a circle at the output is which gate?", "nand"],
    ["Which gate keeps its output at 1 unless at least one of its inputs is 1?", "nor"],
    ["Which gate keeps its output at 1 unless both of its inputs are 1?", "nand"]
  ];
  const LOG = bank(5, [
    // Beginner — single gate outputs on given bits (including NOT)
    [18, 1, r => {
      const gate = p(r, ["AND", "OR", "NAND", "NOR", "XOR", "NOT"]);
      const a = ri(r, 0, 1);
      const b = gate === "NOT" ? a : ri(r, 0, 1);
      const out = gate === "NOT" ? 1 - a : GEV(gate, a, b);
      const q = gate === "NOT"
        ? `Given input A=${a}, what is the output of the NOT gate? (answer 0 or 1)`
        : `Given A=${a} and B=${b}, what is the output of the ${gate} gate? (answer 0 or 1)`;
      return { q, a: "" + out };
    }],
    // Beginner — truth table row counts
    [5, 1, r => { const ins = p(r, [1, 2, 3, 4, 5]); return { q: `How many rows are there in the truth table of a logic gate with ${ins} input${ins > 1 ? "s" : ""}?`, a: "" + 2 ** ins }; }],
    // Beginner — identify a gate from a description or symbol
    [14, 1, r => { const x = p(r, GATE_ID); return { q: x[0], a: x[1] }; }],
    // Beginner — fixed-value simplification facts (answer is a definite 0 or 1)
    [6, 1, r => { const x = p(r, [
      ["A AND 0 always equals what?", "0"],
      ["A OR 1 always equals what?", "1"],
      ["If B = 1, A OR B equals what? (A may be 0 or 1)", "1"],
      ["If B = 0, A AND B equals what?", "0"],
      ["A NAND 0 always equals what?", "1"],
      ["A NOR 1 always equals what?", "0"]
    ]); return { q: x[0], a: x[1] }; }],
    // Intermediate — 2/3-input gate chains
    [28, 2, r => {
      const a = ri(r, 0, 1), b = ri(r, 0, 1), c = ri(r, 0, 1);
      const t = p(r, [
        { expr: "(A OR B) AND C", out: (a | b) & c },
        { expr: "(A AND B) OR C", out: (a & b) | c },
        { expr: "(A XOR B) AND C", out: (a ^ b) & c },
        { expr: "(A NAND B) OR C", out: (1 - (a & b)) | c },
        { expr: "(A NOR B) AND C", out: (1 - (a | b)) & c },
        { expr: "NOT (A AND B) XOR C", out: (1 - (a & b)) ^ c },
        { expr: "(A AND C) OR (B AND C)", out: (a & c) | (b & c) },
        { expr: "(A OR B) AND (A OR C)", out: (a | b) & (a | c) },
        { expr: "(A NAND B) NOR C", out: 1 - ((1 - (a & b)) | c) },
        { expr: "(A NOR B) XOR C", out: (1 - (a | b)) ^ c }
      ]);
      return { q: `Trace the gate chain below. What is the final output? (answer 0 or 1)`, c: `A = ${a}\nB = ${b}\nC = ${c}\nout = ${t.expr}`, a: "" + t.out };
    }],
    // Advanced — two-level chains over three inputs
    [22, 3, r => {
      const a = ri(r, 0, 1), b = ri(r, 0, 1), c = ri(r, 0, 1);
      const t = p(r, [
        { expr: "(A AND B) NAND (B OR C)", out: 1 - ((a & b) & (b | c)) },
        { expr: "(A XOR B) NOR (B AND C)", out: 1 - ((a ^ b) | (b & c)) },
        { expr: "(A NAND B) XOR (B NAND C)", out: (1 - (a & b)) ^ (1 - (b & c)) },
        { expr: "(A OR B) AND (C XOR A)", out: (a | b) & (c ^ a) },
        { expr: "(A NOR B) OR (A XOR C)", out: (1 - (a | b)) | (a ^ c) },
        { expr: "NOT ((A AND B) OR (B AND C))", out: 1 - ((a & b) | (b & c)) },
        { expr: "(A AND B) XOR (A XOR C)", out: (a & b) ^ (a ^ c) },
        { expr: "NOT (A OR B) NOR C", out: 1 - ((1 - (a | b)) | c) }
      ]);
      return { q: `Trace the gate chain below. What is the final output? (answer 0 or 1)`, c: `A = ${a}\nB = ${b}\nC = ${c}\nout = ${t.expr}`, a: "" + t.out };
    }],
    // Expert — four-input chains
    [16, 4, r => {
      const a = ri(r, 0, 1), b = ri(r, 0, 1), c = ri(r, 0, 1), d = ri(r, 0, 1);
      const t = p(r, [
        { expr: "(A AND B) NAND (C AND D)", out: 1 - ((a & b) & (c & d)) },
        { expr: "(A OR B) NOR (C OR D)", out: 1 - ((a | b) | (c | d)) },
        { expr: "(A XOR B) XOR (C XOR D)", out: (a ^ b) ^ (c ^ d) },
        { expr: "((A AND B) OR C) AND D", out: ((a & b) | c) & d },
        { expr: "(A NAND B) XOR (C NOR D)", out: (1 - (a & b)) ^ (1 - (c | d)) },
        { expr: "(A AND not B) OR (C AND not D)", out: (a & (1 - b)) | (c & (1 - d)) }
      ]);
      return { q: `Trace the gate chain below. What is the final output? (answer 0 or 1)`, c: `A = ${a}\nB = ${b}\nC = ${c}\nD = ${d}\nout = ${t.expr}`, a: "" + t.out };
    }]
  ]);

  // --- Data storage (STO) helpers ----------------------------------------------
  const unitNames = ["bit", "byte", "KB", "MB", "GB", "TB"];
  const unitAnswer = ["bit", "byte", "kb", "mb", "gb", "tb"];
  const orderQuestion = (r, n, reverse) => {
    const idx = [0, 1, 2, 3, 4, 5];
    for (let i = idx.length - 1; i > 0; i--) { const j = ri(r, 0, i); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    const shown = idx.slice(0, n);
    const shownNames = shown.map(i => unitNames[i]).join(", ");
    const sorted = shown.slice().sort((x, y) => x - y);
    const ordered = reverse ? sorted.slice().reverse() : sorted;
    const ans = ordered.map(i => unitAnswer[i]).join(",");
    const q = reverse
      ? `Arrange these from largest to smallest: ${shownNames} (comma-separated answer).`
      : `Arrange these from smallest to largest: ${shownNames} (comma-separated answer).`;
    return { q, a: ans };
  };
  const FIT = [
    ["a single character of text", "byte"],
    ["a short text message", "KB"],
    ["a small PNG icon", "KB"],
    ["a one-page document", "KB"],
    ["a holiday photo", "MB"],
    ["a three-minute music track", "MB"],
    ["a mobile app", "MB"],
    ["a full-length film", "GB"],
    ["a PC video game", "GB"],
    ["a whole season of a TV show", "GB"]
  ];
  const OCT = bank(6, [
    // Beginner — one octal digit
    [8, 1, r => { const o = ri(r, 0, 7); return { q: `Convert octal ${o} to a three-bit binary number`, a: bin(o, 3) }; }],
    [8, 1, r => { const o = ri(r, 0, 7); return { q: `Give the denary value of the octal digit ${o}`, a: "" + o }; }],
    // Beginner — 2-digit octal to/from denary
    [16, 1, r => { const v = ri(r, 8, 63); return { q: `Convert octal ${oct(v)} to denary`, a: "" + v }; }],
    [12, 1, r => { const v = ri(r, 8, 63); return { q: `Convert ${v} to octal`, a: oct(v) }; }],
    // Intermediate — 3-digit octal and 6-bit binary
    [10, 2, r => { const v = ri(r, 64, 255); return { q: `Convert octal ${oct(v)} to denary`, a: "" + v }; }],
    [10, 2, r => { const v = ri(r, 64, 255); return { q: `Convert ${v} to octal`, a: oct(v) }; }],
    [8, 2, r => { const v = ri(r, 8, 63); return { q: `Convert octal ${oct(v)} to a six-bit binary number`, a: bin(v, 6) }; }],
    // Advanced — the high end of the byte and 9-bit groups
    [8, 3, r => { const v = ri(r, 256, 511); return { q: `Convert octal ${oct(v)} to denary`, a: "" + v }; }],
    [6, 3, r => { const v = ri(r, 64, 511); return { q: `Convert octal ${oct(v)} to a nine-bit binary number`, a: bin(v, 9) }; }],
    [8, 3, r => { const v = ri(r, 512, 4095); return { q: `Convert ${v} to octal`, a: oct(v) }; }],
    // Expert — binary to octal
    [8, 4, r => { const v = ri(r, 0, 63); return { q: `Convert binary ${bin(v, 6)} to octal`, a: oct(v) }; }],
    [8, 4, r => { const v = ri(r, 64, 511); return { q: `Convert binary ${bin(v, 9)} to octal`, a: oct(v) }; }]
  ]);
  const STO = bank(7, [
    // Beginner — bits in bytes, bytes in KB, ordering, bits in KB
    [12, 1, r => { const n = ri(r, 1, 16); return { q: `At 8 bits per byte, how many bits are in ${n} byte${n > 1 ? "s" : ""} (total)?`, a: "" + (8 * n) }; }],
    [14, 1, r => { const n = ri(r, 1, 20); return { q: `How many bytes are in ${n} kilobyte${n > 1 ? "s" : ""} (KB)? (powers of 1024)`, a: "" + (1024 * n) }; }],
    [14, 1, r => orderQuestion(r, 3, false)],
    [4, 1, r => { const n = ri(r, 1, 8); return { q: `How many bits are in ${n} kilobyte${n > 1 ? "s" : ""} (KB)?`, a: "" + (8192 * n) }; }],
    // Intermediate — MB conversions and matching a described size
    [12, 2, r => { const n = ri(r, 16, 128); return { q: `How many bytes are in ${n} megabytes (MB)? (powers of 1024)`, a: "" + (1048576 * n) }; }],
    [8, 2, r => { const n = ri(r, 1, 12); return { q: `How many kilobytes (KB) are in ${n} megabyte${n > 1 ? "s" : ""} (MB)?`, a: "" + (1024 * n) }; }],
    [8, 2, r => { const x = p(r, FIT); return { q: `Which storage unit best describes the size of ${x[0]}? (byte / KB / MB / GB / TB)`, a: x[1].toLowerCase() }; }],
    // Advanced — GB conversions and full ordering
    [8, 3, r => { const n = ri(r, 1, 12); return { q: `How many megabytes (MB) are in ${n} gigabyte${n > 1 ? "s" : ""} (GB)?`, a: "" + (1024 * n) }; }],
    [9, 3, r => { const n = ri(r, 1, 12); return { q: `How many bytes are in ${n} gigabyte${n > 1 ? "s" : ""} (GB)? (powers of 1024)`, a: "" + (1073741824 * n) }; }],
    [6, 3, r => orderQuestion(r, 4, false)],
    // Expert — fitting files onto a drive and largest-to-smallest order
    [8, 4, r => { const n = ri(r, 32, 256); const m = ri(r, 16, 128); return { q: `A file is ${n} MB. How many whole files fit on a ${m} GB drive? (round down)`, a: "" + Math.floor((m * 1024) / n) }; }],
    [8, 4, r => orderQuestion(r, 4, true)]
  ]);

  // --- Departments -------------------------------------------------------------
  // lesson is structured into sections a student reads before practising:
  // [objectives, explanation, worked example, interactive demo, knowledge check]
  window.DEPTS = [
    {
      id: "bin", code: "BIN", name: "Bit Foundry", cost: 0, node: 15, rate: 0.5, reward: 5, bank: BIN,
      tagline: "How computers count with 1s and 0s.",
      tip: "Columns from the right: 1 2 4 8 16 32 64 128. Add the columns that hold a 1.",
      demo: true,
      lesson: {
        objectives: [
          "Read a binary number and convert it to denary (ordinary numbers).",
          "Write a denary number as binary.",
          "Explain what a bit and a byte are, and how many values they store."
        ],
        sections: [
          {
            title: "Computers only understand two states",
            body: "Inside a computer, every piece of information is stored as tiny switches that are either <b>on</b> or <b>off</b>. We write on as <b>1</b> and off as <b>0</b>. A single 0 or 1 is called a <b>bit</b> - the smallest piece of data a computer can hold. A group of 8 bits is a <b>byte</b>."
          },
          {
            title: "Columns, not counting",
            body: "Binary is <b>base 2</b>: each column from the right is worth double the one before it. So 8 bits have the column values 128, 64, 32, 16, 8, 4, 2, 1. To read a binary number, add up the columns that contain a 1. To write one, go left to right: if the column fits inside your number, write a 1 and subtract it; otherwise write a 0."
          },
          {
            title: "Worked example",
            body: "<pre>128 64 32 16  8  4  2  1\n  0  1  0  0  1  0  1  1</pre>Read right to left: a 1 in the 64s, 8s, 2s and 1s columns. <b>64 + 8 + 2 + 1 = 75</b>, so <code>01001011</code> is 75 in denary. To write 75 as binary, the 64 column fits (75 - 64 = 11), the 32 and 16 do not (write 0), the 8 fits (11 - 8 = 3), the 4 does not, the 2 fits (3 - 2 = 1), and the 1 fits. That gives <b>01001011</b>."
          },
          {
            title: "How many values fit?",
            body: "<i>n</i> bits can store <b>2<sup>n</sup></b> different values, starting at 0. So 8 bits store 256 values (0 to 255), and the biggest number that fits in <i>n</i> bits is <b>2<sup>n</sup> - 1</b>."
          }
        ],
        demoNote: "Use the boxes below to convert a number between denary and binary and watch how the columns fill in."
      },
      mastery: {
        name: "Bit Forge",
        body: "Final test for Bit Foundry: convert between denary and binary across different bit widths, including how many values each width can hold.",
        extra: []
      },
      lessonCheck: { q: "Combine the column values for the binary number 0011. What denary number is it?", a: "3" }
    },
    {
      id: "add", code: "ADD", name: "Adder Works", cost: 200, node: 100, rate: 4, reward: 25, bank: ADD,
      tagline: "Adding binary numbers, including when they overflow.",
      tip: "1+1 = 10: write 0, carry 1. 1+1+1 = 11: write 1, carry 1. Work right to left.",
      demo: true,
      lesson: {
        objectives: [
          "Add two binary numbers using the four column rules.",
          "Add an 8-bit pair and give the answer in binary or denary.",
          "Explain what happens when the answer overflows a register."
        ],
        sections: [
          {
            title: "Four rules that do the work",
            body: "Binary addition is like column addition in denary - just four rules, worked <b>right to left</b>:<pre>0 + 0 = 0\n0 + 1 = 1\n1 + 1 = 10   (write 0, carry 1)\n1 + 1 + 1 = 11  (write 1, carry 1)</pre>"
          },
          {
            title: "Worked example",
            body: "Add <code>0101</code> (5) and <code>0110</code> (6):<pre>  0101  (5)\n+ 0110  (6)\n  1011  (11)</pre>Right to left: 1+0=1, then 0+1=1, then 1+1=10 (write 0, carry 1), then carry 1 + 0 + 0 = 1. The result <code>1011</code> is 11."
          },
          {
            title: "Overflow",
            body: "When the answer needs more bits than the register holds, the extra bit is lost. That is <b>overflow</b>. For example, in one byte, <b>200 + 100 = 300</b>, but a byte can only hold up to 255, so the result stores as 44. If an exam question says the overflow bit is lost, wrap the answer back around at 256."
          }
        ],
        demoNote: "Click a 4-bit add pair, then set the bits of the two numbers to see each column and its carry."
      },
      mastery: {
        name: "Adder Master",
        body: "Final test for Adder Works: add 4-bit and 8-bit pairs, spot overflow and count carry operations.",
        extra: []
      },
      lessonCheck: { q: "Use the four rules to add 1 + 1 in binary. What two symbols do you write?", a: "10" }
    },
    {
      id: "sub", code: "SUB", name: "Borrow Bank", cost: 1500, node: 800, rate: 30, reward: 120, bank: SUB,
      tagline: "Binary subtraction and negative numbers.",
      tip: "Negative number: flip all the bits, then add 1 (two's complement).",
      demo: true,
      lesson: {
        objectives: [
          "Subtract one binary number from another using borrowing.",
          "Flip the bits of a number (ones' complement).",
          "Write a negative number as 8-bit two's complement."
        ],
        sections: [
          {
            title: "Subtraction and borrowing",
            body: "Subtract column by column from the right. When you need <b>0 - 1</b>, you <b>borrow</b> 1 from the next column to the left, turning the current column into 10 (denary 2)."
          },
          {
            title: "Worked example",
            body: "Subtract <code>0101</code> (5) from <code>1011</code> (11):<pre>  1011  (11)\n- 0101  (5)\n  0110  (6)</pre>Right to left: 1-1=0, then 1-0=1, then 0-1 needs a borrow (the 1 in the fourth column becomes 0), making 10-1=1, then 0-0=0. Result <code>0110</code> is 6."
          },
          {
            title: "Negative numbers in binary",
            body: "Computers avoid borrowing for negative numbers. To make <b>-n</b>: flip every bit (<b>ones' complement</b>), then add 1 (<b>two's complement</b>). In 8 bits, <b>-5 = 11111011</b>. Adding that to a number has the same effect as subtracting 5."
          }
        ],
        demoNote: "Set two 4-bit numbers and watch the column borrows happen one at a time."
      },
      mastery: {
        name: "Borrow Ace",
        body: "Final test for Borrow Bank: subtract binary pairs and write negative numbers in two's complement.",
        extra: []
      },
      lessonCheck: { q: "To make negative 2 as 8-bit two's complement you flip all bits then add 1. Type the final 8-bit result for -2.", a: "11111110" }
    },
    {
      id: "hex", code: "HEX", name: "Hex Exchange", cost: 8000, node: 6000, rate: 250, reward: 600, bank: HEX,
      tagline: "Hexadecimal - the compact way to write bytes.",
      tip: "One hex digit = 4 bits. A=10 B=11 C=12 D=13 E=14 F=15. Left digit x 16.",
      demo: false,
      lesson: {
        objectives: [
          "Explain why hexadecimal is used to write bytes compactly.",
          "Convert a hex number to denary and back.",
          "Convert between hex digits and 4-bit binary groups."
        ],
        sections: [
          {
            title: "Base 16",
            body: "Hexadecimal is <b>base 16</b>, so it needs 16 symbols: the digits <b>0-9</b> and then letters for the values above 9: A = 10, B = 11, C = 12, D = 13, E = 14, F = 15. To make denary from hex, take the left digit times 16 and add the right digit."
          },
          {
            title: "Worked example",
            body: "<pre>AF = A x 16 + F = (10 x 16) + 15 = 175\n1010 1111 -> A  F</pre>To go from binary to hex, split the binary number into groups of 4 bits from the right, then write one hex digit for each group. Because one hex digit is exactly 4 bits, a byte (8 bits) is exactly two hex digits."
          },
          {
            title: "Why programmers use it",
            body: "Hexadecimal keeps long binary strings short and easy to read. It is used for colours like <code>#FF8800</code> and for memory addresses. One byte <code>10100101</code> becomes just <code>A5</code>."
          }
        ],
        demoNote: ""
      },
      mastery: {
        name: "Hex Expert",
        body: "Final test for Hex Exchange: convert hex to denary and between bytes and hex digits.",
        extra: []
      },
      lessonCheck: { q: "A single hex digit is made from how many bits?", a: "4" }
    },
    {
      id: "oct", code: "OCT", name: "Octal Foundry", cost: 20000, node: 30000, rate: 1200, reward: 1800, bank: OCT,
      tagline: "Base-8 numbers and the three-bit groups behind them.",
      tip: "One octal digit = 3 bits. Convert to denary with columns 1, 8, 64, 512 from the right.",
      demo: false,
      lesson: {
        objectives: [
          "Convert octal digits and two- or three-digit octal numbers to denary.",
          "Convert denary numbers to octal.",
          "Group binary bits in threes to convert between octal and binary."
        ],
        sections: [
          {
            title: "Base 8",
            body: "Octal is <b>base 8</b>: it uses the digits <b>0-7</b>, then the columns increase by a factor of 8. The rightmost column is the 1s, the next is the 8s, then 64s, then 512s, and so on. To make denary from octal, add each column value that holds a non-zero digit."
          },
          {
            title: "Octal and binary, three bits at a time",
            body: "Because 8 equals 2<sup>3</sup>, one octal digit is exactly <b>three binary bits</b>:<pre>0 000   1 001   2 010   3 011\n4 100   5 101   6 110   7 111</pre>To turn binary into octal, split the bits into groups of three from the right and write one octal digit per group. To turn octal into binary, write each digit as its 3-bit group."
          },
          {
            title: "Worked example",
            body: "<pre>octal:  2  5  =  2x8 + 5 = 21 denary\nbinary: 101 100 = 101|100 = octal 54</pre><code>101100</code> splits right-to-left as <code>101</code> then <code>100</code>, giving octal <b>54</b>."
          }
        ],
        demoNote: ""
      },
      mastery: {
        name: "Octal Master",
        body: "Final test for Octal Foundry: convert between denary, octal and binary across 2-, 3- and 4-digit octal numbers.",
        extra: []
      },
      lessonCheck: { q: "What is the octal value of the binary number 101 (three bits)?", a: "5" }
    },
    {
      id: "py", code: "PY", name: "Python Lab", cost: 40000, node: 50000, rate: 2000, reward: 3000, bank: PY,
      tagline: "Read, trace and fix real Python code.",
      tip: "range(a, b) stops before b. // drops the remainder, % gives it. Indexes start at 0.",
      demo: false,
      lesson: {
        objectives: [
          "Trace a short program line by line and predict its output.",
          "Work with variables, strings, conditionals, loops and lists.",
          "Use functions, understand data types and complete small programs."
        ],
        sections: [
          {
            title: "Trace code line by line",
            body: "The questions here ask you to <b>run the program in your head</b>. Keep a running note of each variable's value and apply each line in order. Values change over time, so do not assume a variable keeps its first value."
          },
          {
            title: "Worked example",
            body: "<pre>x = 4\ny = x * 3\nprint(y + 1)          # 13\nprint(7 // 2, 7 % 2)  # 3 1\nprint(\"ab\" * 3)       # ababab\nprint(len(\"code\"), \"code\"[0])  # 4 c\n\nfor i in range(2, 8, 3):   # 2, 5\n    print(i)</pre>Notice: <code>//</code> drops the remainder of a division and <code>%</code> gives it. A string times a number repeats it. <code>range(a, b)</code> stops <b>before</b> b. String indexes start at <b>0</b>."
          },
          {
            title: "Indentation and structure",
            body: "Python uses <b>indentation</b> to show what is inside an <code>if</code>, <code>for</code> or <code>while</code>. The indented block under a loop runs each time the loop repeats; code back at the left edge runs only after the loop finishes."
          }
        ],
        demoNote: ""
      },
      mastery: {
        name: "Python Engineer",
        body: "Final test for Python Lab: trace multi-step programs, predict outputs and identify the right keyword or function.",
        extra: []
      },
      lessonCheck: { q: "What does range(2, 6) print when each value is shown? Enter the values with a space between them.", a: "2 3 4 5" }
    },
    {
      id: "log", code: "LOG", name: "Logic Gates", cost: 60000, node: 90000, rate: 3500, reward: 3500, bank: LOG,
      tagline: "The AND, OR, NOT, NAND, NOR and XOR building blocks of circuits.",
      tip: "AND needs both 1s, OR needs at least one 1. NAND/NOR are those with the answer flipped.",
      demo: false,
      lesson: {
        objectives: [
          "Work out the output of AND, OR, NOT, NAND, NOR and XOR gates from their inputs.",
          "Read truth tables and know how many rows they need.",
          "Trace multi-gate chains to find a final output."
        ],
        sections: [
          {
            title: "The six basic gates",
            body: "A logic gate takes one or two input bits and produces one output bit.<pre>AND  1 only when both inputs are 1\nOR   1 when at least one input is 1\nNOT  flips its single input\nNAND AND, then flip the result\nNOR  OR, then flip the result\nXOR  1 when the two inputs differ</pre>"
          },
          {
            title: "Truth tables",
            body: "A truth table lists the output for every possible combination of inputs. Two inputs give <b>4 rows</b> (00, 01, 10, 11); three inputs give <b>8 rows</b>; <i>n</i> inputs give <b>2<sup>n</sup></b> rows."
          },
          {
            title: "Chains of gates",
            body: "A chain feeds the output of one gate into another, left to right. Work one gate at a time and keep the running value. For example, <code>(A AND B) OR C</code> means: work out the AND of A and B first, then OR that with C. Write each intermediate result down."
          }
        ],
        demoNote: ""
      },
      mastery: {
        name: "Logic Arch",
        body: "Final test for Logic Gates: gate outputs, truth-table structure, and tracing 2- to 4-input gate chains.",
        extra: []
      },
      lessonCheck: { q: "A two-input truth table needs how many rows?", a: "4" }
    },
    {
      id: "sto", code: "STO", name: "Data Storage", cost: 120000, node: 210000, rate: 8000, reward: 4000, bank: STO,
      tagline: "Bits, bytes and the 1024-based units that measure files.",
      tip: "1024 bytes = 1 KB, 1024 KB = 1 MB, 1024 MB = 1 GB, 1024 GB = 1 TB. Multiply going up.",
      demo: false,
      lesson: {
        objectives: [
          "Order the storage units bit, byte, KB, MB, GB and TB by size.",
          "Convert between those units using powers of 1024 (and 8 bits per byte).",
          "Choose the sensible unit for a real file size and do simple totals."
        ],
        sections: [
          {
            title: "The units and their sizes",
            body: "The smallest unit is the <b>bit</b>; 8 bits are a <b>byte</b>. From there each step is 1024 times larger:<pre>1 KB = 1024 bytes\n1 MB = 1024 KB\n1 GB = 1024 MB\n1 TB = 1024 GB</pre>So storage grows: bit, byte, KB, MB, GB, TB."
          },
          {
            title: "Convert with powers of 1024",
            body: "To move to a smaller unit, <b>multiply</b> by 1024 for each step you move down; to move to a larger unit, <b>divide</b>. Because there are 8 bits in a byte, a byte is 8 bits, so converting a byte count into bits makes it 8 times larger."
          },
          {
            title: "Picking a real unit",
            body: "Real files use the unit that keeps the number small and sensible: a page is a few <b>KB</b>, a photo a few <b>MB</b>, a film a few <b>GB</b>. To fit files on a drive, divide the drive size by one file size after putting both in the same unit."
          }
        ],
        demoNote: ""
      },
      mastery: {
        name: "Capacity Expert",
        body: "Final test for Data Storage: order all six units, convert between units, pick the right unit for an object, and count files onto a drive.",
        extra: []
      },
      lessonCheck: { q: "How many kilobytes (KB) make up one megabyte (MB)?", a: "1024" }
    }
  ];
})();