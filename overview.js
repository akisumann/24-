// 目次・操作バー（試作）：長い1画面を見やすくするため、上部に固定バーを足す。
// 既存カードには触れず、折りたたみ（collapse.js）とジャンプ移動を橋渡しするだけ。
(function(){
  if(typeof render!=='function')return;
  const SKIP=new Set(['detail','roleMembers']); // 動的パネルは目次に載せない

  const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);

  const style=document.createElement('style');
  style.textContent=`
.miko-nav{position:sticky;top:0;z-index:30;margin:0 0 4px;padding:8px 10px;border:1px solid var(--border);border-radius:14px;background:var(--card)}
@supports (backdrop-filter:blur(6px)){.miko-nav{background:color-mix(in srgb,var(--card) 86%,transparent);backdrop-filter:saturate(1.2) blur(8px)}}
.miko-nav .row1{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.miko-status{font-size:.9rem;font-variant-numeric:tabular-nums}
.miko-status b{font-weight:700}
.miko-actions{display:flex;gap:6px}
.miko-actions button{font:inherit;color:inherit;background:var(--chip);border:1px solid var(--border);border-radius:999px;padding:5px 12px;font-size:.82rem;cursor:pointer}
.miko-actions button:hover{border-color:var(--accent)}
.miko-chips{display:flex;gap:6px;overflow-x:auto;margin-top:8px;padding-bottom:2px;-webkit-overflow-scrolling:touch}
.miko-chips button{font:inherit;color:var(--muted);background:transparent;border:1px solid var(--border);border-radius:999px;padding:4px 11px;font-size:.82rem;white-space:nowrap;cursor:pointer}
.miko-chips button:hover{color:var(--text);border-color:var(--accent);background:var(--chip)}
.card{scroll-margin-top:110px}
`;
  document.head.appendChild(style);

  const main=document.querySelector('main');
  if(!main)return;

  const bar=document.createElement('div');
  bar.className='miko-nav';
  bar.innerHTML=`
    <div class="row1">
      <div class="miko-status" id="mikoStatus">—</div>
      <div class="miko-actions">
        <button type="button" id="mikoExpandAll">すべて開く</button>
        <button type="button" id="mikoCollapseAll">すべて畳む</button>
      </div>
    </div>
    <div class="miko-chips" id="mikoChips"></div>`;
  main.insertBefore(bar,main.firstChild);

  const cards=[...document.querySelectorAll('.card')].filter(c=>!SKIP.has(c.id));

  // 見出しチップ：押した枠へ移動し、畳んでいれば開く
  const chipHost=document.getElementById('mikoChips');
  cards.forEach(card=>{
    const title=((card.querySelector('h2,h3')||{}).textContent||'').trim();
    if(!title)return;
    const chip=document.createElement('button');
    chip.type='button';
    chip.textContent=title;
    chip.addEventListener('click',()=>{
      expand(card);
      card.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
    });
    chipHost.appendChild(chip);
  });

  function foldBtn(card){return card.querySelector(':scope > .fold-btn');}
  function expand(card){
    if(card.classList.contains('folded')){const b=foldBtn(card);if(b)b.click();}
  }
  function collapse(card){
    if(!card.classList.contains('folded')){const b=foldBtn(card);if(b)b.click();}
  }

  document.getElementById('mikoExpandAll').addEventListener('click',()=>cards.forEach(expand));
  document.getElementById('mikoCollapseAll').addEventListener('click',()=>cards.forEach(collapse));

  // 現在ステータスを固定バーへ反映（render のたびに更新）
  const statusBox=document.getElementById('mikoStatus');
  function updateStatus(){
    const g=id=>{const el=document.getElementById(id);return el?el.textContent.trim():'';};
    statusBox.innerHTML=`<b>${g('year')}</b>・神${g('godLevel')}・現役${g('count')}・評判<b>${g('fame')}</b>`;
  }
  const renderBeforeOverview=render;
  render=function(){renderBeforeOverview();updateStatus();};
  updateStatus();
})();
