// 三点相撲（お遊び）：御種衣の布を地に敷いて体が触れ合うほど間近に相対し、二つの
// 乳首とクリトリスの三点だけを擦りつけ合い、布から足が出るか尻餅をついた方が負け。
// 成人（20歳以上）の巫女のみ。
// 模擬戦と同じく「今この場の余興」なので、タイムラインのシード乱数（srandom）は
// 一切消費しない。独立した Math.random を使い、シード＋年数の再現性を壊さない。
// 深い世代ほどクリトリスが巨大で攻めは強いが、その分過敏で脆く、耐えは下がる。
(function(){
  if(typeof current!=='function'||typeof render!=='function')return;

  const srand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const spick=a=>a[srand(0,a.length-1)];

  let sumoAId=null,sumoBId=null,lastSumo=null;

  function clitOf(p){
    const g=p.generation||1;
    return (window.MikoTraits&&MikoTraits.clitMm)?MikoTraits.clitMm(g):(6+g-1);
  }
  // 攻め：クリトリス（主武器）＋乳（乳首の押し）＋押し出す力（ATK）＋擦る器用さ（DEX）。
  function attackOf(p){
    const s=current(p);
    return clitOf(p)*1.6 + (p.body.bust||80)*0.35 + s.ATK*0.4 + s.DEX*0.3;
  }
  // 耐え：粘り（HP）＋踏ん張り（DEF）＋体幹の速さ（SPD）− 過敏さ（クリが大きいほど脆い）。
  function enduranceOf(p){
    const s=current(p);
    return s.HP*0.5 + s.DEF*0.5 + s.SPD*0.3 - clitOf(p)*0.9 + 20;
  }

  function sumoEligible(){
    return mikos.filter(p=>p.age>=20).sort((a,b)=>level(b)-level(a)||b.age-a.age||a.id-b.id);
  }
  function sampleTwo(list){
    const c=[...list];
    const a=c.splice(srand(0,c.length-1),1)[0];
    const b=c.splice(srand(0,c.length-1),1)[0];
    return [a,b];
  }
  function opt(p){return `<option value="${p.id}">${full(p)}・${p.age}歳・Lv${level(p)}</option>`;}

  const MOVES=[
    '乳首を相手の乳首へ押し当て、ぐりぐりと擦り立てた',
    '硬く尖ったクリトリスを相手の秘玉へ突き当て、腰を使って捏ね回した',
    '胸を押し付けて二つの乳首を同時に擦り上げた',
    '三点すべてを押し付けたまま、腰をうねらせて捏ねくり回した',
    'クリトリス同士を弾き合わせ、相手の膝を笑わせた'
  ];
  // 押し込まれた側の喘ぎ声。
  const MOANS=[
    'あっ、あっ、そこ、擦っちゃ……らめぇっ',
    'ひぁっ、乳首っ、乳首だめっ、んんーっ',
    'やっ、クリ、当たって……っ、あっ、あっ',
    'んぁっ、で、出ちゃう、お乳出ちゃうっ',
    'ああっ、潮っ、吹いちゃ……ひぅっ',
    'ま、負けな……っ、ぁ、あ、こんなの……っ'
  ];
  // 最中に噴きこぼれる乳・潮。
  const FLUIDS=[
    '擦られた乳首からお乳がビュルビュルと噴きこぼれた',
    '堪えきれず潮をぴゅっと吹きこぼした',
    '両の乳首から白い乳が飛び散り、内腿を潮が伝った',
    '押し当てられるたびに乳がビュッと噴き、股から潮が滴った',
    'ぷっくり尖った乳首から乳を漏らし、潮でしとどに濡れた'
  ];
  // 負けの決まり（絶頂を伴う）。尻餅をつくか、耐えかねて布から足が出る。
  const FALLS=[
    '「い、イっ……くぅっ!!」とこらえきれず達し、潮を高く吹き上げながらぺたんと尻餅をついた',
    '乳をビュクビュク噴きこぼしながら「んぁあああっ——!!」と絶頂し、腰砕けに尻餅をついた',
    'クリトリスを擦り潰されて「イくっ、イっちゃうっ!!」と達し、潮を撒き散らして布に尻餅をついた',
    '「あっ、あっ、で、出るっ——!!」と達しながらよろけ、たまらず布から足を踏み出してしまった',
    '膝を震わせて後ずさり、こらえた拍子に潮を吹きながら片足が布の外へこぼれ落ちた'
  ];

  function roll(max){return srand(1,Math.max(1,Math.round(max)));}

  function runRound(n,a,b){
    const atkA=attackOf(a),atkB=attackOf(b),endA=enduranceOf(a),endB=enduranceOf(b);
    let pushOnB,pushOnA,tries=0;
    do{ pushOnB=roll(atkA)-roll(endB); pushOnA=roll(atkB)-roll(endA); tries++; }
    while(pushOnB===pushOnA&&tries<50);
    const winner=pushOnB>pushOnA?a:b;
    return {n,winner,move:spick(MOVES),moan:spick(MOANS),fluid:spick(FLUIDS),margin:Math.abs(pushOnB-pushOnA)};
  }

  function fighterCard(p){
    const g=p.generation||1;
    return `<div class="metric space3">
      <div class="flex between gap2"><div><div class="medium">${full(p)}</div><div class="muted">${p.age}歳・${g}世代目</div></div><span class="badge">Lv${level(p)}</span></div>
      <div class="grid g2 gap2">
        <div class="text-center"><div class="muted">攻め</div><div>${Math.round(attackOf(p))}</div></div>
        <div class="text-center"><div class="muted">耐え</div><div>${Math.round(enduranceOf(p))}</div></div>
      </div>
      <div class="muted">クリトリス ${clitOf(p)}mm（乳${p.body.bust}）</div>
    </div>`;
  }

  function renderPreview(){
    const box=document.getElementById('sumoPreview');
    if(!box)return;
    const a=mikos.find(p=>p.id===sumoAId),b=mikos.find(p=>p.id===sumoBId);
    box.innerHTML=a&&b?fighterCard(a)+fighterCard(b):'';
  }

  function renderResult(){
    const box=document.getElementById('sumoResult');
    if(!box)return;
    if(!lastSumo){box.innerHTML='二人を選び、「立合い開始」を押してください。';return;}
    const {a,b,rounds,wins,winner,loser}=lastSumo;
    const clitNote=clitOf(winner)>clitOf(loser)
      ?`より大きなクリトリスを持つ${full(winner)}が三点で押し勝った。`
      :(clitOf(winner)<clitOf(loser)
        ?`${full(loser)}は巨大なクリトリスゆえに過敏で、かえって先に音を上げた。`
        :`際どい擦り合いを${full(winner)}が制した。`);
    box.innerHTML=`<div class="space3">
      <div class="flex between gap2"><div><h3>${full(a)} 対 ${full(b)}</h3><p class="muted">三点相撲・二本先取（御種衣の布の上）</p></div><span class="badge">${full(winner)} 勝利</span></div>
      ${rounds.map(r=>{const rl=r.winner.id===a.id?b:a;return `<div class="node space3">
        <div class="flex between gap2"><span class="medium">第${r.n}番</span><span class="badge">${full(r.winner)}</span></div>
        <p>${full(r.winner)}は${r.move}。${full(rl)}は「${r.moan}」と嬌声をあげてのけぞり、${r.fluid}。そのまま布の端まで押し込まれた。</p>
      </div>`;}).join('')}
      <div class="callout"><span class="medium">決着：</span>${full(loser)}は${lastSumo.fall}。${full(winner)}が${wins[winner.id]}勝${3-wins[winner.id]}敗で勝利した。${clitNote}</div>
    </div>`;
  }

  function run(){
    const a=mikos.find(p=>p.id===sumoAId),b=mikos.find(p=>p.id===sumoBId);
    if(!a||!b||a.id===b.id)return;
    if(a.age<20||b.age<20)return; // 成人のみ（念のため二重ガード）
    const rounds=[runRound(1,a,b),runRound(2,a,b),runRound(3,a,b)];
    const wins={[a.id]:0,[b.id]:0};
    rounds.forEach(r=>wins[r.winner.id]++);
    const winner=wins[a.id]>wins[b.id]?a:b;
    const loser=winner.id===a.id?b:a;
    lastSumo={a,b,rounds,wins,winner,loser,fall:spick(FALLS)};
    renderResult();
  }

  function renderSumo(){
    const selA=document.getElementById('sumoA'),selB=document.getElementById('sumoB');
    if(!selA||!selB)return;
    const list=sumoEligible();
    if(list.length<2)return;
    if(!list.some(p=>p.id===sumoAId))sumoAId=list[0].id;
    if(!list.some(p=>p.id===sumoBId)||sumoBId===sumoAId)sumoBId=(list[1]||list[0]).id;
    selA.innerHTML=list.map(opt).join('');
    selB.innerHTML=list.map(opt).join('');
    selA.value=String(sumoAId);
    selB.value=String(sumoBId);
    renderPreview();
    renderResult();
  }

  function init(){
    const selA=document.getElementById('sumoA'),selB=document.getElementById('sumoB');
    const rnd=document.getElementById('sumoRandom'),start=document.getElementById('sumoStart');
    if(!selA||!selB||!rnd||!start)return;
    selA.addEventListener('change',()=>{sumoAId=Number(selA.value);if(sumoAId===sumoBId){const o=sumoEligible().find(p=>p.id!==sumoAId);sumoBId=o?o.id:sumoBId;}renderSumo();});
    selB.addEventListener('change',()=>{sumoBId=Number(selB.value);if(sumoAId===sumoBId){const o=sumoEligible().find(p=>p.id!==sumoBId);sumoAId=o?o.id:sumoAId;}renderSumo();});
    rnd.addEventListener('click',()=>{const[x,y]=sampleTwo(sumoEligible());if(x&&y){sumoAId=x.id;sumoBId=y.id;renderSumo();}});
    start.addEventListener('click',run);
    const before=render;
    render=function(){before();renderSumo();};
    renderSumo();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
