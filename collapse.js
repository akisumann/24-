// 折りたたみ（試作）：各カードの右上ボタンで、ヘッダーを残して本文を開閉する。
// カードのDOMは移動せず class の付け外しだけを行うため、既存の描画やセーブに干渉しない。
(function(){
  const SKIP=new Set(['detail','roleMembers']); // 選択で内容が入れ替わる動的パネルは対象外
  const STORAGE='mikoFoldState_v1';

  const style=document.createElement('style');
  style.textContent=`
.card{position:relative}
.card>:first-child{padding-right:40px}
.fold-btn{position:absolute;top:12px;right:12px;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--border);border-radius:9px;background:var(--chip);color:var(--muted);cursor:pointer}
.fold-btn:hover{color:var(--text)}
.fold-btn svg{width:14px;height:14px;transition:transform .18s ease}
.card.folded .fold-btn svg{transform:rotate(-90deg)}
.card.folded>:not(.fold-btn):not(:first-child){display:none}
@media(prefers-reduced-motion:reduce){.fold-btn svg{transition:none}}
`;
  document.head.appendChild(style);

  const CHEVRON='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let folded=new Set();
  try{
    const raw=localStorage.getItem(STORAGE);
    if(raw)folded=new Set(JSON.parse(raw));
  }catch(e){/* 破損時は全展開から始める */}
  function persist(){
    try{localStorage.setItem(STORAGE,JSON.stringify([...folded]));}catch(e){}
  }

  function keyOf(card,i){
    if(card.id)return card.id;
    const h=card.querySelector('h2,h3');
    return (h&&h.textContent.trim())||('card-'+i);
  }

  [...document.querySelectorAll('.card')].filter(c=>!SKIP.has(c.id)).forEach((card,i)=>{
    const key=keyOf(card,i);
    const title=((card.querySelector('h2,h3')||{}).textContent||'').trim();
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='fold-btn';
    btn.innerHTML=CHEVRON;

    function apply(){
      const isFolded=folded.has(key);
      card.classList.toggle('folded',isFolded);
      btn.setAttribute('aria-expanded',String(!isFolded));
      btn.setAttribute('aria-label',(isFolded?'展開':'折りたたむ')+(title?'：'+title:''));
    }

    btn.addEventListener('click',()=>{
      if(folded.has(key))folded.delete(key);else folded.add(key);
      persist();
      apply();
    });

    card.appendChild(btn); // 最後に追加し :first-child のヘッダーは常に残す
    apply();
  });
})();
