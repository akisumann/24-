#!/usr/bin/env node
// 七年巫女神：ヘッドレス実行版（Node.js、外部依存なし）。
//
// index.html が読み込む全モジュールを「無改変のまま・同じ順番で」1つの JavaScript 実行環境へ流し込み、
// DOM だけを最小限のスタブに差し替えて、?seed=&year= 指定でブラウザを開いたときと同じ自動進行を走らせる。
// 実行後、exportAuthoritativeGameState() の結果（＝完全セーブ）を JSON で標準出力へ書き出す。
//
// 使い方：
//   node miko-headless.js <seed> <year> > save.json
//   例）node miko-headless.js 27 350 > save.json
//
// 注意：
// - ゲームロジックの再実装ではない。読み込むのは index.html に並んだ本物の .js ファイルそのもの。
// - 同じ seed+year なら実ブラウザと同一の状態になる（rngState が一致することで検証できる）。
//   違うのは実行時刻の savedAt / generatedAt だけ。
// - モジュールの追加・順序変更は index.html 側だけ直せばよい（このスクリプトは index.html の <script src> を順に読む）。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const args = process.argv.slice(2);
if (args.length < 1 || !/^\d+$/.test(args[0]) || (args[1] !== undefined && !/^\d+$/.test(args[1]))) {
  process.stderr.write('使い方: node miko-headless.js <seed> <year>\n例: node miko-headless.js 27 350 > save.json\n');
  process.exit(2);
}
const SEED = args[0];
const YEAR = args[1] !== undefined ? args[1] : '0';

// ---------------------------------------------------------------------------
// 最小限の DOM スタブ。描画は捨て、ゲーム状態の計算だけを通す。
// ---------------------------------------------------------------------------
function makeStyle() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k === 'setProperty') return (n, v) => { t[n] = v; };
      if (k === 'removeProperty') return n => { delete t[n]; };
      if (k === 'getPropertyValue') return n => t[n] || '';
      return k in t ? t[k] : '';
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// canvas の 2D コンテキスト：描画命令はすべて無視する。
function makeCtx2d() {
  const noop = () => {};
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop: noop });
      if (k === 'getImageData' || k === 'createImageData') return () => ({ data: [] });
      if (k === 'getLineDash') return () => [];
      if (k === 'canvas') return makeEl('canvas');
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

const byId = new Map();

function makeEl(tag, id) {
  const el = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    nodeName: String(tag || 'div').toUpperCase(),
    id: id || '',
    className: '',
    innerHTML: '',
    textContent: '',
    innerText: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    open: false,
    children: [],
    childNodes: [],
    parentNode: null,
    parentElement: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    dataset: {},
    attributes: [],
    style: makeStyle(),
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); },
      replace(a, b) { this._s.delete(a); this._s.add(b); },
    },
    _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); if (k === 'id') this.id = String(v); },
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    hasAttribute(k) { return k in this._attrs; },
    removeAttribute(k) { delete this._attrs[k]; },
    appendChild(c) { if (c && typeof c === 'object') { this.children.push(c); c.parentNode = this; c.parentElement = this; } return c; },
    append(...cs) { cs.forEach(c => this.appendChild(c)); },
    prepend(...cs) { cs.forEach(c => this.appendChild(c)); },
    insertBefore(c) { return this.appendChild(c); },
    replaceChildren(...cs) { this.children = []; cs.forEach(c => this.appendChild(c)); },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    replaceWith() {}, after() {}, before() {}, remove() {},
    insertAdjacentHTML() {}, insertAdjacentElement(_, e) { return e; }, insertAdjacentText() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    getElementsByTagName() { return []; },
    getElementsByClassName() { return []; },
    closest() { return null; },
    matches() { return false; },
    contains() { return false; },
    cloneNode() { return makeEl(tag); },
    focus() {}, blur() {}, click() {}, select() {}, scrollIntoView() {}, scrollTo() {},
    showModal() {}, show() {}, close() {},
    getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    getContext() { return makeCtx2d(); },
    offsetWidth: 0, offsetHeight: 0, clientWidth: 0, clientHeight: 0, scrollWidth: 0, scrollHeight: 0, scrollTop: 0, scrollLeft: 0,
  };
  return el;
}

function getById(id) {
  if (!byId.has(id)) byId.set(id, makeEl('div', id));
  return byId.get(id);
}

const body = makeEl('body');
const head = makeEl('head');
const documentElement = makeEl('html');
const document = {
  nodeType: 9,
  body, head, documentElement,
  readyState: 'complete',
  title: '',
  cookie: '',
  getElementById: getById,
  querySelector: () => makeEl('div'),
  querySelectorAll: () => [],
  getElementsByTagName: () => [],
  getElementsByClassName: () => [],
  createElement: tag => makeEl(tag),
  createElementNS: (_, tag) => makeEl(tag),
  createTextNode: t => ({ nodeType: 3, textContent: String(t) }),
  createDocumentFragment: () => makeEl('fragment'),
  addEventListener() {}, removeEventListener() {},
  execCommand() { return false; },
};

const storage = () => {
  const m = new Map();
  return {
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
};

const href = `file://${ROOT}/index.html?seed=${SEED}&year=${YEAR}`;
const sandbox = {
  console: { log() {}, info() {}, debug() {}, warn: (...a) => console.error(...a), error: (...a) => console.error(...a) },
  document,
  localStorage: storage(),
  sessionStorage: storage(),
  location: { href, search: `?seed=${SEED}&year=${YEAR}`, hash: '', pathname: `${ROOT}/index.html`, origin: 'null', protocol: 'file:', reload() {}, assign() {}, replace() {} },
  history: { replaceState() {}, pushState() {}, back() {} },
  navigator: { userAgent: 'miko-headless', language: 'ja', clipboard: { writeText: () => Promise.resolve() } },
  screen: { width: 1024, height: 768 },
  innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1,
  alert() {}, confirm() { return false; }, prompt() { return null; },
  // 描画後の遅延処理（タイマー）は状態計算に関わらないので実行しない。
  setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
  requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
  queueMicrotask() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  getComputedStyle: () => makeStyle(),
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  scrollTo() {}, open() { return null; },
  Blob: class { constructor(p) { this.parts = p; } },
  URL: Object.assign(function () {}, { createObjectURL: () => 'blob:', revokeObjectURL() {} }),
  FileReader: class { readAsText() {} },
  HTMLElement: class {}, Element: class {}, Node: class {}, Event: class { constructor(t) { this.type = t; } },
  CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
  MutationObserver: class { observe() {} disconnect() {} },
  ResizeObserver: class { observe() {} disconnect() {} },
  IntersectionObserver: class { observe() {} disconnect() {} },
  structuredClone,
  TextEncoder, TextDecoder,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// index.html の <script src="..."> を記載順に読む（?v= などのクエリは除去）。
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m => m[1].split('?')[0]);
if (!scripts.length) { process.stderr.write('index.html に <script src> が見つかりません。\n'); process.exit(1); }
if (/<script\b(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html)) {
  process.stderr.write('警告: index.html にインラインスクリプトがあります。このランナーは src 付きのスクリプトしか実行しません。\n');
}

for (const s of scripts) {
  const file = path.join(ROOT, s);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInContext(code, sandbox, { filename: s });
}

const ready = sandbox.MIKO_GAME_RUNTIME_READY;
if (!(ready && ready.ready)) {
  process.stderr.write('実行が完了しませんでした（MIKO_GAME_RUNTIME_READY が未設定）。正確な状態は取得できません。\n');
  process.exit(1);
}
const state = sandbox.exportAuthoritativeGameState();
process.stdout.write(JSON.stringify(state, null, 2) + '\n');
process.stderr.write(`完了: seed=${ready.seed} year=${ready.year} rngState=${state.rngState} 現役${(state.mikos || []).length}人\n`);
