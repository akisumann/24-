// 設定由来の特徴（表示のみ）：巫女の体型・一族・favored などの既存データから、
// 世界設定（豊満さ＝神の血の濃さ、砲弾型の胸、雌の匂い、名器、屈服欲、御種衣の役務色、大寵愛）を
// 導出して詳細画面へ表示する。乱数もゲームロジックも一切触れない非侵襲モジュール。
// 未成年（＜20歳＝国家育成対象）は境界を守り、性的な特徴を出さず育成対象の注記にとどめる。
(function(){
  if(typeof renderDetail!=='function')return;

  // 御種衣の差し色（役務色）
  const ROLE_COLOR={HP:'深緑・土色',MP:'淡青・白銀',ATK:'赤・黒',DEF:'紺・金',INT:'紫・金',SPD:'青緑・薄青',DEX:'橙・銅色'};

  // 豊満度：バスト＋ヒップ−ウエスト×0.5（大寵愛の判定と同じ指標）。閾値は現行データ分布に合わせる。
  function volOf(b){
    const score=b.bust+b.hip-b.waist*0.5;
    if(score>=215)return{lv:4,label:'絶豊満'};
    if(score>=195)return{lv:3,label:'豊満'};
    if(score>=170)return{lv:2,label:'ふくよか'};
    return{lv:1,label:'並'};
  }
  // 神の血の濃さ（目安）：豊満さ＝血筋の濃さの印、という設定に沿い、豊満度そのものを指標にする。
  function bloodOf(vol){
    const label=['','薄い（外部の血か新しい血筋）','中','濃い','極めて濃い'][vol.lv];
    return{lv:vol.lv,label};
  }
  const SCENT=['','ほのかに甘い','甘く匂い立つ','濃厚に甘く漂う','むせ返るほど甘い'];
  const MEIKI=['','並','上物','絶品','比類なき名器'];
  // 陰核も世代（血の濃さ）で育ち鋭くなる。大きさ／感度を同じ lv に連動。
  const CLIT_SIZE=['','控えめ（3〜4mm・平均的）','やや大ぶり（6〜8mm）','大きい（1cm超、勃起でさらに膨らむ）','肥大（常に包皮から覗き、勃起時は小指の先ほど）'];
  const CLIT_SENS=['','並','敏感','鋭敏','掠めるだけで達するほど過敏'];

  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

  function traitsHtml(p){
    const b=p.body;
    const clanCount=mikos.filter(x=>x.family===p.family).length;
    const role=roleOf(p)||rank(p.maxStats)[0];
    const color=ROLE_COLOR[role]||'';
    const roleName=(ROLES&&ROLES[role])||'役務未定';

    // 育成対象（未成年）：非性的な表示にとどめる。
    if(p.age<20){
      let h='<h3>設定由来の特徴</h3>';
      h+='<p class="mt1 muted">国家育成対象。年齢に応じた教育を受けて育つ段階であり、性的な特徴は成人後に現れる。</p>';
      h+=`<div class="mt1">御種衣：役務色 <b>${esc(color)}</b>（${esc(roleName)}）</div>`;
      if(clanCount>=3)h+=`<div class="mt1">${esc(p.family)}一族の血を引く（現役${clanCount}人）。豊満さや資質は将来の素質として見込まれる。</div>`;
      return h;
    }

    const vol=volOf(b);
    const blood=bloodOf(vol);
    const rocket=(b.bust>=100&&vol.lv>=3);
    const topStat=rank(p.maxStats)[0];
    const strongWilled=(topStat==='ATK'||topStat==='DEF');

    let h='<h3>設定由来の特徴</h3>';
    h+='<div class="trait-badges">';
    h+=`<span class="badge">豊満度：${vol.label}</span>`;
    if(rocket)h+='<span class="badge">垂れぬ砲弾型の胸</span>';
    h+=`<span class="badge">神の血の濃さ：${blood.label}</span>`;
    if(p.favored)h+='<span class="badge">大寵愛の娘</span>';
    h+='</div>';
    h+=`<div class="mt2">雌の匂い：<b>${SCENT[blood.lv]}</b>　／　名器度：<b>${MEIKI[blood.lv]}</b></div>`;
    h+=`<div class="mt1">陰核：大きさ <b>${CLIT_SIZE[blood.lv]}</b>　／　感度 <b>${CLIT_SENS[blood.lv]}</b></div>`;
    h+='<div class="mt1">性への構え：積極的に仕掛けるが、根は負けたがりで屈服欲が高い。'
      +(strongWilled?'気位は高く強気だが、いざ抱かれれば結局は攻め落とされ、悦んで屈する。'
                    :'責められると脆く、翻弄されて果てる側になりがち。')+'</div>';
    h+=`<div class="mt1">御種衣：役務色 <b>${esc(color)}</b>（${esc(roleName)}）。一枚布の生殖用装束で、身体を隠さず示す。</div>`;
    if(clanCount>=4)h+=`<div class="mt1 muted">${esc(p.family)}一族は現役${clanCount}人の大氏族——神に長く愛され、豊満で濃い血を代々受け継いできた家門である。</div>`;
    return h;
  }

  try{
    const st=document.createElement('style');
    st.textContent='#detail .trait-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}';
    (document.head||document.documentElement).appendChild(st);
  }catch(e){}

  const before=renderDetail;
  renderDetail=function(){
    before();
    try{
      const p=mikos.find(x=>x.id===selectedId);
      const box=document.getElementById('detail');
      if(!p||!box)return;
      const sec=document.createElement('div');
      sec.className='space3';
      sec.innerHTML=traitsHtml(p);
      box.appendChild(sec);
    }catch(e){}
  };
})();
