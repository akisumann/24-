#!/usr/bin/env node
// ゲームの自動チェック（GitHub Actions からも手元からも使う）。
//
//   node tests/game-check.js            … チェックする
//   node tests/game-check.js --update   … 基準値（tests/golden.json）を今の結果で作り直す
//
// やること：
// 1. 本物のゲームコードを miko-headless.js で走らせ、エラーなく最後まで進むか（長期進行も含む）。
// 2. 結果がゲームの決まりから外れていないか（現役50人・神レベル100以下・年齢5段階など）。
// 3. 決まった seed+year の完全セーブが、前回の基準値と一字一句同じか。
//    → 設定資料だけを直したつもりが、ゲームの結果まで変わってしまう事故を防ぐ。
//    ゲームの仕組みを「わざと」変えたときは、--update で基準値を作り直してコミットする。
'use strict';
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GOLDEN = path.join(__dirname, 'golden.json');
const UPDATE = process.argv.includes('--update');

// 基準値を取る組み合わせ（seed, 経過年）。
const CASES = [
  [1, 0], [1, 7], [27, 301], [12345, 700], [500000, 350], [3, 1400],
];
// 基準値は取らず、最後まで動くことと決まりだけ確かめる長期進行。
const LONG_RUNS = [[42, 2100], [777, 3500]];

const AGES = [6, 13, 20, 27, 34];
const STATS = ['HP', 'MP', 'ATK', 'DEF', 'INT', 'SPD', 'DEX'];

function run(seed, year) {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'miko-headless.js'), String(seed), String(year)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = JSON.parse(out);
  delete state.savedAt; // 実行時刻だけは毎回変わる
  return state;
}

function hash(state) {
  return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

function rules(state, seed, year) {
  const errs = [];
  const where = `seed=${seed} year=${year}`;
  if (state.year !== year - (year % 7)) errs.push(`${where}: 経過年が ${state.year}（期待 ${year - (year % 7)}）`);
  if (state.seed !== seed) errs.push(`${where}: seed が ${state.seed}`);
  if (!Array.isArray(state.mikos) || state.mikos.length !== 50) errs.push(`${where}: 現役が ${state.mikos && state.mikos.length} 人（50人のはず）`);
  if (!(state.godLevel >= 1 && state.godLevel <= 100)) errs.push(`${where}: 神レベル ${state.godLevel}（1〜100のはず）`);
  if (!(typeof state.fame === 'number' && state.fame >= 0 && isFinite(state.fame))) errs.push(`${where}: 国家評判 ${state.fame}`);
  const ids = new Set();
  for (const p of state.mikos || []) {
    if (!AGES.includes(p.age)) errs.push(`${where}: ${p.family} ${p.given} の年齢 ${p.age}`);
    if (ids.has(p.id)) errs.push(`${where}: id ${p.id} が重複`);
    ids.add(p.id);
    for (const k of STATS) {
      const v = p.maxStats && p.maxStats[k];
      if (!(typeof v === 'number' && isFinite(v) && v >= 1)) errs.push(`${where}: ${p.family} ${p.given} の ${k}=${v}`);
    }
  }
  if (/"(?:HP|MP|ATK|DEF|INT|SPD|DEX)":null/.test(JSON.stringify(state))) {
    errs.push(`${where}: 能力値に null（NaN）が混入`);
  }
  return errs;
}

const golden = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : {};
const next = {};
const errors = [];
let changed = 0;

for (const [seed, year] of CASES) {
  let state;
  try { state = run(seed, year); } catch (e) { errors.push(`seed=${seed} year=${year}: 実行に失敗\n${e.stderr || e.message}`); continue; }
  errors.push(...rules(state, seed, year));
  const key = `${seed}:${year}`;
  const h = hash(state);
  next[key] = { rngState: state.rngState, sha256: h };
  if (!UPDATE) {
    if (!golden[key]) errors.push(`${key}: 基準値がありません（node tests/game-check.js --update で作成）`);
    else if (golden[key].sha256 !== h) {
      changed++;
      errors.push(`${key}: ゲーム結果が基準値と違います（rngState ${golden[key].rngState} → ${state.rngState}）`);
    }
  }
  console.log(`ok  ${key}  rngState=${state.rngState}`);
}

for (const [seed, year] of LONG_RUNS) {
  try {
    const state = run(seed, year);
    errors.push(...rules(state, seed, year));
    console.log(`ok  ${seed}:${year}（長期進行）`);
  } catch (e) { errors.push(`seed=${seed} year=${year}: 長期進行で失敗\n${e.stderr || e.message}`); }
}

if (UPDATE) {
  fs.writeFileSync(GOLDEN, JSON.stringify(next, null, 2) + '\n');
  console.log(`基準値を更新しました: ${path.relative(ROOT, GOLDEN)}`);
}

if (errors.length) {
  console.error('\nNG:\n- ' + errors.join('\n- '));
  if (changed) {
    console.error('\nゲームの仕組みをわざと変えたのなら、node tests/game-check.js --update で基準値を作り直してコミットしてください。');
    console.error('設定資料や表示だけを直したつもりなら、どこかでゲームの計算（乱数の使い方を含む）が変わっています。');
  }
  process.exit(1);
}
console.log('\nすべて OK');
