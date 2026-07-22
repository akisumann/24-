// タイル型ダッシュボード（試作・SimCity風）：縦長の書類レイアウトを、
// 上部固定HUD＋タイル状のパネル群へ組み替える表示レイヤー。
// ロジック（七年進行・一族計算・セーブ）には触れず、既存カードを移設するだけ。
(function(){
  const main=document.querySelector('main');
  const section=main&&main.querySelector('.section');
  if(!main||!section)return;

  const SKIP=new Set(['detail','roleMembers']);
  const WIDE_IDS=['roster','clans','trendPanels','battleResult']; // 内容が横に広いパネル

  const style=document.createElement('style');
  style.textContent=`
main.miko-dash{max-width:1280px}
.miko-hud{position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;margin:0 0 12px;padding:8px 14px;border:1px solid var(--border);border-radius:14px;background:var(--card)}
@supports (backdrop-filter:blur(6px)){.miko-hud{background:color-mix(in srgb,var(--card) 86%,transparent);backdrop-filter:saturate(1.25) blur(8px)}}
.miko-hud .grid.g5{display:flex;flex-wrap:wrap;gap:0}
.miko-hud .metric{background:transparent;border:0;border-left:1px solid var(--border);border-radius:0;padding:2px 14px}
.miko-hud .metric:first-child{padding-left:0;border-left:0}
.miko-hud .metric .muted{font-size:.7rem;letter-spacing:.04em}
.miko-hud .metric .stats{font-size:1.05rem;margin-top:0;font-variant-numeric:tabular-nums}
.hud-controls{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.hud-controls .sep{width:1px;align-self:stretch;background:var(--border);margin:2px 2px}
.hud-btn{font:inherit;color:inherit;background:var(--chip);border:1px solid var(--border);border-radius:10px;padding:7px 12px;font-size:.85rem;cursor:pointer;white-space:nowrap}
.hud-btn:hover{border-color:var(--accent)}
.hud-btn.primary{background:var(--accent);color:var(--accentText);border-color:var(--accent);font-weight:650}
.hud-btn.ghost{background:transparent;color:var(--muted);padding:7px 10px}
.hud-btn.ghost:hover{color:var(--text)}
.miko-board{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));grid-auto-flow:row dense;gap:12px;align-items:start}
.miko-board>.card{margin:0}
.miko-board>.wide{grid-column:span 2}
.miko-board>#turnResult{grid-column:1/-1;margin:0}
@media(max-width:680px){.miko-board{grid-template-columns:1fr}.miko-board>.wide{grid-column:auto}}
`;
  document.head.appendChild(style);
  main.classList.add('miko-dash');

  // 移設対象を先に確保
  const metricGrid=section.querySelector('.grid.g5');
  const turnResult=section.querySelector('#turnResult');
  const cards=[...section.querySelectorAll('.card')];

  // HUD
  const hud=document.createElement('div');
  hud.className='miko-hud';
  const controls=document.createElement('div');
  controls.className='hud-controls';
  controls.innerHTML=`
    <button type="button" class="hud-btn primary" id="hudAdvance">▶ 七年進める</button>
    <button type="button" class="hud-btn" id="hudAdvance70">×10（七十年）</button>
    <span class="sep"></span>
    <button type="button" class="hud-btn ghost" id="hudExpandAll">全開く</button>
    <button type="button" class="hud-btn ghost" id="hudCollapseAll">全畳む</button>`;
  if(metricGrid)hud.appendChild(metricGrid);
  hud.appendChild(controls);

  // ボード（タイル置き場）
  const board=document.createElement('div');
  board.className='miko-board';
  if(turnResult)board.appendChild(turnResult); // 直近ターンの結果を最上段の帯に
  cards.forEach(card=>{
    if(WIDE_IDS.some(id=>card.querySelector('#'+id)))card.classList.add('wide');
    board.appendChild(card);
  });

  // 差し替え
  main.insertBefore(hud,section);
  main.insertBefore(board,section);
  section.remove();

  // 進行ボタンは本物のボタンへ委譲（既存の runTurn・自動保存をそのまま発火）
  const clickReal=id=>{const el=document.getElementById(id);if(el)el.click();};
  document.getElementById('hudAdvance').addEventListener('click',()=>clickReal('advance'));
  document.getElementById('hudAdvance70').addEventListener('click',()=>clickReal('advance70'));

  // 一括開閉（collapse.js の各枠フォールドボタンを介する）
  const foldables=cards.filter(c=>!SKIP.has(c.id));
  const foldBtn=card=>card.querySelector(':scope > .fold-btn');
  document.getElementById('hudExpandAll').addEventListener('click',()=>{
    foldables.forEach(c=>{if(c.classList.contains('folded')){const b=foldBtn(c);if(b)b.click();}});
  });
  document.getElementById('hudCollapseAll').addEventListener('click',()=>{
    foldables.forEach(c=>{if(!c.classList.contains('folded')){const b=foldBtn(c);if(b)b.click();}});
  });
})();
