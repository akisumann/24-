// 大儀の対話（v16拡張）：七年ごとに神が顕現し、選ばれた十人の巫女が
// この七年の出来事と自らの暮らしを過去形で報告する、一回分の物語サイクルを表示する。
// makeChild で母を捕捉し、render をラップして描く非侵襲モジュール。ceremony は最後に読む。
(function(){
  if(typeof makeChild!=='function'||typeof render!=='function')return;

  // この七年、巫女の身に起きたこと（暮らしの細部）。母のidと年で決定論的に選ぶ。
  const LIFE=[
    '務めの傍ら、里の子らに読み書きを教えておりました。',
    '伴侶を得て、新たな家庭を築きました。',
    '子を授かり、育てながら務めを続けてまいりました。',
    '老いた親を看取り、家を継ぐ者を定めました。',
    '一族の諍いの仲裁に、幾度も骨を折りました。',
    '近ごろ都で流行りの装いや歌に、心を躍らせておりました。',
    '不作の年を、蓄えと祈りで里とともに耐えました。',
    '若い巫女の指南役を任され、後進を育てました。',
    '遠国への巡行に幾度も出て、見聞を広めました。',
    '神具や祭具の新しい意匠に、工夫を凝らしておりました。'
  ];
  const GODQ=[
    '神は「この七年、民は笑っていたか」と問うた。',
    '神は「そなた自身は、幸せであったか」と問うた。',
    '神は「次代に、何を遺したいか」と問うた。'
  ];
  const HOPES=[
    '願わくは、次の七年が民にとって穏やかでありますように。',
    '一族の若い娘が、無事に巫女として立てるように見守ってほしいのです。',
    'この身が衰える前に、もう一度あなたの娘を授かりとうございます。',
    '手薄な役務にも、新たな担い手が集まりますように。',
    '長く争う二つの氏族が、和解できる日を望んでおります。'
  ];

  let currentBatch=[];      // 進行中のターンで神と交わった母
  let lastCeremony=null;    // 直近の大儀の記録
  let ceremonyYear=null;

  // makeChild を包み、母（＝選ばれた十人）の情報を捕捉する。
  const makeChildBeforeCeremony=makeChild;
  makeChild=function(m){
    const shinraBefore=shinraMikos.length;
    const child=makeChildBeforeCeremony(m);
    currentBatch.push({
      id:m.id,
      name:full(m),
      apt:ROLES[rank(m.maxStats)[0]],
      age:m.age,
      level:level(m),
      becameShinra:shinraMikos.length>shinraBefore,
      child:child.given
    });
    return child;
  };

  function ensureTile(){
    let el=document.getElementById('ceremonyCard');
    if(el)return el;
    el=document.createElement('div');
    el.id='ceremonyCard';
    el.className='card space3 wide';
    const board=document.querySelector('.miko-board');
    if(board)board.insertBefore(el,board.firstChild); // 大儀は主役なので先頭へ
    else (document.querySelector('main')||document.body).appendChild(el);
    return el;
  }

  function renderCeremonyUI(){
    const el=ensureTile();
    if(!el)return;
    if(!lastCeremony){
      el.innerHTML='<h2>大儀の対話</h2><p class="muted">神はいま眠っている。七年を進めると顕現し、選ばれた十人の報告を聞く。</p>';
      return;
    }
    const c=lastCeremony;
    const theme=(window.MikoEra&&MikoEra.theme&&MikoEra.theme())||null;
    const ev=(window.MikoEvents&&MikoEvents.latest&&MikoEvents.latest())||null;
    const backdrop=`${theme?`いまは<b>${theme}</b>。`:''}`
      +(ev
        ?`この七年、${ev.threat}が起こり、${ev.success?'巫女たちの働きでこれを切り抜けたとのこと':'担い手が足らず民に痛手が及んだとのこと'}。`
        :'大きな波乱はなく、七年は穏やかに過ぎたとのこと。');

    const reports=c.mothers.map(m=>{
      const life=LIFE[(m.id*7+c.year)%LIFE.length];
      let s=`<div class="node"><div class="flex wrap center between gap2"><span class="medium">${m.name}</span><span class="badge">${m.apt}・${m.age}歳・Lv${m.level}</span></div>`;
      let body=`「この七年、${life}`;
      if(m.becameShinra)body+=` そして大儀のさなか、私を通じて神の力が一段と増したとのこと、身に余る誉れにございます。`;
      body+=` こたびの大儀にて、あなたの娘・${m.child}を授かりました。」`;
      return s+`<div class="muted mt1">${body}</div></div>`;
    }).join('');

    const q=GODQ[c.year%GODQ.length];
    const hopeM=c.mothers.length?c.mothers[c.year%c.mothers.length]:null;
    const hope=HOPES[c.year%HOPES.length];

    el.innerHTML=`
      <div class="flex wrap center between gap3"><div><h2>大儀の対話</h2><p class="muted">第${c.n}回・${c.year}年 — 神、七年ぶりに顕現する</p></div><span class="badge">十人の報告</span></div>
      <div class="callout">${backdrop}</div>
      <div class="space3">${reports}</div>
      <div class="callout">${q}${hopeM?`<br><span class="medium">${hopeM.name}</span>は答えた——「${hope}」`:''}</div>
      <div class="muted">神は十人の報告に耳を傾け、問いを交わし、その悩みと望みを聞いた。満足した神は再び眠りにつく——次に目覚めるとき、また七年が過ぎている。</div>`;
  }

  const renderBeforeCeremony=render;
  render=function(){
    renderBeforeCeremony();
    if(ceremonyYear!==year){
      if(currentBatch.length)lastCeremony={year,n:Math.round(year/7),mothers:currentBatch.slice()};
      currentBatch=[];
      ceremonyYear=year;
    }
    renderCeremonyUI();
  };

  ceremonyYear=(typeof year!=='undefined')?year:null;
  renderCeremonyUI();
})();
