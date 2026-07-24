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
  // 陰核は「実際の世代数」で決まる正確な指標。1世代目（初期採用・一般公募）＝6mm固定、
  // 以降は1世代ごとに+1mm。大きさを見れば何世代目かが一意にわかる。感度も世代で鋭くなる。
  // 節目：5世代=10mmで生涯わずかに突出／10世代=15mmで明確に突出（並の下着不可）／
  //       15世代=20mmでかなり肥大（つままれるだけで腰砕け）。
  const CLIT_SENS=['','敏感','鋭敏','過敏','掠めるだけで達するほど過敏'];
  function clitMm(gen){return 6+(Math.max(1,gen)-1);}
  function clitSens(gen){return CLIT_SENS[Math.min(Math.max(1,gen),CLIT_SENS.length-1)];}
  // 婚姻と夫との実子（決定論的・id基準、乱数は一切消費しない）。
  // 早ければ20歳・遅くとも27歳で全員結婚。夫との子：20歳0〜1／〜27で+1〜3／〜34で+1〜3。
  function hp(id,salt,mod){return (id*31+salt*17)%mod;}
  function earlyMarried(p){return hp(p.id,1,5)<3;}                 // 約6割が20歳で既婚
  function isMarried(p){return p.age>=27||earlyMarried(p);}         // 27歳以降は例外なく夫あり
  function kidsByHusband(p){
    let n=0;
    if(p.age>=20&&earlyMarried(p))n+=hp(p.id,2,2);                 // 20歳までに0〜1（早婚のみ）
    if(p.age>=27)n+=1+hp(p.id,3,3);                                // 〜27で+1〜3
    if(p.age>=34)n+=1+hp(p.id,4,3);                                // 〜34で+1〜3
    return n;
  }
  function clitStage(gen){
    if(gen>=35)return'・小陰茎化（自ら擦り続けねば疼きに耐えられぬ）';
    if(gen>=30)return'・歩くだけで揺れて絶頂';
    if(gen>=25)return'・吹く風にも反応して疼く';
    if(gen>=20)return'・常にひくつき、触れられるだけで喘ぐ';
    if(gen>=15)return'・かなり肥大（つままれるだけで腰砕け）';
    if(gen>=10)return'・明確に突出（並の下着は刺激で穿けない）';
    if(gen>=5)return'・生涯わずかに突き出たまま';
    return'';
  }

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
    const gen=p.generation||1,cmm=clitMm(gen);
    h+=`<div class="mt1">陰核：<b>${cmm}mm</b>（${gen}世代目）${clitStage(gen)}　／　感度 <b>${clitSens(gen)}</b></div>`;
    h+='<div class="mt1">性への構え：積極的に仕掛けるが、根は負けたがりで屈服欲が高い。'
      +(strongWilled?'気位は高く強気だが、いざ抱かれれば結局は攻め落とされ、悦んで屈する。'
                    :'責められると脆く、翻弄されて果てる側になりがち。')+'</div>';
    h+=`<div class="mt1">御種衣：役務色 <b>${esc(color)}</b>（${esc(roleName)}）。一枚布の生殖用装束で、身体を隠さず示す。</div>`;
    if(isMarried(p))h+=`<div class="mt1">婚姻：<b>夫あり</b>　／　夫との実子 <b>${kidsByHusband(p)}人</b>（神の娘とは別）</div>`;
    else h+=`<div class="mt1">婚姻：まだ独り身（遅くとも二十七までには嫁ぐ）　／　夫との実子 0人</div>`;
    if(clanCount>=4)h+=`<div class="mt1 muted">${esc(p.family)}一族は現役${clanCount}人の大氏族——神に長く愛され、豊満で濃い血を代々受け継いできた家門である。</div>`;
    return h;
  }

  // 他モジュール（大淫義の対話ポップアップ等）からも同じ特徴ブロックを使えるよう公開。
  try{if(typeof window!=='undefined')window.MikoTraits={traitsHtml,volOf,clitMm,clitSens,clitStage};}catch(e){}

  try{
    const st=document.createElement('style');
    st.textContent='.trait-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}';
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
