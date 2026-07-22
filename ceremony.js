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

  // 「この七年の報告」ログの表示状態。
  let logEntries=[];        // 現在の大儀の報告ログ（真面目版と嬌声版を各件持つ）
  let logIndex=0;           // いま表示中の報告
  let teasedSet=new Set();  // 神のイタズラで嬌声に変換済みの報告インデックス
  let typeTimer=null;       // タイプライター表示のタイマー

  // 真面目な報告文（この七年の暮らしと、授かった娘）。
  function seriousBody(m,year){
    const life=LIFE[(m.id*7+year)%LIFE.length];
    let body=`「この七年、${life}`;
    if(m.becameShinra)body+=` そして大儀のさなか、私を通じて神の力が一段と増したとのこと、身に余る誉れにございます。`;
    body+=` こたびの大儀にて、あなたの娘・${m.child}を授かりました。」`;
    return body;
  }
  // 神のイタズラで、真面目な報告が嬌声・絶頂混じりに乱れた版。
  const MOANS=['……っ','ぁ……っ、','んっ、','はぁっ、','ひ……ぁっ、','あっ、あっ、'];
  // 性格（＝最も高い能力）ごとの「イキ方」。締めの絶頂セリフをその気質に合わせる。
  const CLIMAX_BY_STAT={
    HP:[ // 粘り強い：耐えて耐えて、なお粘って達する
      'ま、まだ……耐えられ、ます……っ、く……ぅっ、ま、負けませ……ぁ、あ、あーーーっ、イ……くっ!!」',
      'こ、この程度……っ、まだ、まだ……へっちゃ、ら……ぁ、あ、ひぁあああっ——!!」'
    ],
    MP:[ // 落ち着き：気丈に取り繕うが、声が抑えられず
      'お、落ち着い……て、くださ……っ、わ、わたくしは、平気……ぁ、あっ、へ、平気で……ひぅっ、イ……っ!!」',
      'だ、大丈夫、です……から……っ、あ、あっ、こ、声が……抑え、られ……ぁあああっ!!」'
    ],
    ATK:[ // 押し通す：強気に抗うが、呑まれて
      'そ、そこは、だめ、と……申して、おり……っ、あ、あっ、き、効きすぎ……ぁあああイくっ!!」',
      'ま、待て、と……言った、はず……っ、ひぁっ、あ、あっ、も、もぉっ——!!」'
    ],
    DEF:[ // 流されない：自分を保とうと踏ん張り、崩れて
      'わ、わたくしは、流され……ませ……っ、ぁ、あ、こんな……ので、は……ひっ、ぅっ、だ、だめっ、イっ……!!」',
      'こ、こんなことでは、乱れ……ま、せ……っ、あっ、あっ、ぅ、うそ……ぁあああっ!!」'
    ],
    INT:[ // 筋道立て：理路整然と話そうとして、頭が白く
      'こ、これは、つまり……せつ、めい……っ、あ、あっ、あたま、が……し、白く……ひぅっ、イ……くっ!!」',
      'せ、正確に、申し上げ……ま、す、と……っ、ぁ、あ、ろ、論理、が……とんで……ぁあああっ!!」'
    ],
    SPD:[ // 切り替えが早い：一気に平静から陥落
      'へ、平気……って、あ、あっ、む、無理っ、はやい……ぁあああっ、も、もうイくっ!!」',
      'だ、だいじょ……っ、ぁ、だめ、だめっ、はやい、はやいっ——!!」'
    ],
    DEX:[ // 器用に取り繕う：ごまかしきれず
      'こ、この、くらい……うま、く……っ、あ、あっ、ご、ごまかせ……ない……ひぅっ、イっ!!」',
      'う、うまく……やり、過ご……っ、ぁ、あ、む、むりぃっ——!!」'
    ]
  };
  const CLIMAX_FALLBACK=[
    'も、もう申し上げられませ……っ、ぁ、あ、イ……くぅっ——!!」',
    'あっ、あっ、報告は……っ、ま、まだ途中な、のに……ぁあああっ——!!」'
  ];
  // openText（言いかけのセリフ・「開き含む）を嬌声で乱し、topStat（＝性格）に応じたイキ方で締める。
  function teaseFrom(openText,seed,topStat){
    const s=((seed%1000)+1000)%1000;
    const a=MOANS[s%MOANS.length];
    const b=MOANS[(s+3)%MOANS.length];
    const pool=(topStat&&CLIMAX_BY_STAT[topStat])||CLIMAX_FALLBACK;
    const cl=pool[s%pool.length];
    return `${openText}${a}——ひぁっ!? か、神さま、そこは……${b}${cl}`;
  }
  // 真面目な報告本文の冒頭を途中で切り出す（イタズラ変換の土台）。
  function cutFrag(coreFrag){
    const frag=String(coreFrag).replace(/。$/,'');
    return frag.slice(0,Math.max(4,Math.floor(frag.length*0.45)));
  }

  // makeChild を包み、母（＝選ばれた十人）の情報を捕捉する。
  const makeChildBeforeCeremony=makeChild;
  makeChild=function(m){
    const shinraBefore=shinraMikos.length;
    const child=makeChildBeforeCeremony(m);
    currentBatch.push({
      id:m.id,
      name:full(m),
      apt:ROLES[rank(m.maxStats)[0]],
      topStat:rank(m.maxStats)[0],
      age:m.age,
      level:level(m),
      potentialLevel:Math.round(avg(m.maxStats)),
      height:m.body.height,
      bust:m.body.bust,
      waist:m.body.waist,
      hip:m.body.hip,
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
    if(typeTimer){clearInterval(typeTimer);typeTimer=null;}
    if(!lastCeremony){
      el.innerHTML='<h2>大儀の対話</h2><p class="muted">神はいま眠っている。七年を進めると顕現し、選ばれた十人の報告を聞く。</p>';
      return;
    }
    const c=lastCeremony;
    const theme=(window.MikoEra&&MikoEra.theme&&MikoEra.theme())||null;
    const ev=(window.MikoEvents&&MikoEvents.latest&&MikoEvents.latest())||null;

    // 神床殿・入殿の自己紹介（選抜順位一位から十位）。
    // 順に 名前・年齢・役職・潜在レベルを報告 → 中央布を捲り身を晒す → 身長・スリーサイズを報告。
    const introductions=c.mothers.map((m,i)=>{
      return `<div class="node"><div class="flex wrap center between gap2"><span class="medium">第${i+1}位　${m.name}</span><span class="badge">${m.apt}・${m.age}歳・潜在Lv${m.potentialLevel}</span></div>`
        +`<div class="muted mt1">「${m.name}、${m.age}歳、${m.apt}、潜在レベル${m.potentialLevel}にございます。」<br>——中央布を捲り上げ、身を神の御前へ晒す——<br>「身長${m.height}、バスト${m.bust}、ウエスト${m.waist}、ヒップ${m.hip}にございます。」</div></div>`;
    }).join('');

    // 「この七年の報告」ログを組み立てる（各件に真面目版と嬌声版を持たせる）。
    // 先頭は首位の巫女が語る「時代」と「この七年の出来事」。以降は十人の個々の報告。イタズラは各件に効く。
    const rank1=c.mothers[0];
    const leadEntries=[];
    if(rank1){
      leadEntries.push({
        head:`時代について（首位　${rank1.name}）`,
        serious:`「恐れながら、まず時代のことを。いまは${theme||'色の定まらぬ時代'}にございます。その求めに応じ、巫女らは務めを果たしてまいりました。」`,
        teased:teaseFrom(`「い、いまは${theme||'……'}`,rank1.id+c.year,rank1.topStat)
      });
      leadEntries.push({
        head:`この七年の出来事（首位　${rank1.name}）`,
        serious:ev
          ?`「この七年の出来事にございます。${ev.threat}が起こり、${ev.success?'巫女たちの働きでこれを切り抜けました':'担い手が足らず、民に痛手が及びました'}。」`
          :`「この七年、大きな波乱はなく、国は穏やかに過ぎました。」`,
        teased:teaseFrom(ev?`「こ、この七年は${ev.threat}が`:`「こ、この七年は穏やかに`,rank1.id+c.year+7,rank1.topStat)
      });
    }
    logEntries=leadEntries.concat(c.mothers.map(m=>({
      head:`${m.name}（${m.apt}・${m.age}歳・Lv${m.level}）`,
      serious:seriousBody(m,c.year),
      teased:teaseFrom(`「こ、この七年は${cutFrag(LIFE[(m.id*7+c.year)%LIFE.length])}`,m.id+c.year,m.topStat)
    })));
    if(logIndex>=logEntries.length)logIndex=Math.max(0,logEntries.length-1);

    const q=GODQ[c.year%GODQ.length];
    const hopeM=c.mothers.length?c.mothers[c.year%c.mothers.length]:null;
    const hope=HOPES[c.year%HOPES.length];

    el.innerHTML=`
      <div class="flex wrap center between gap3"><div><h2>大儀の対話</h2><p class="muted">第${c.n}回・${c.year}年 — 神、七年ぶりに顕現する</p></div><span class="badge">神床殿</span></div>
      <div class="muted medium">神床殿・入殿の自己紹介（選抜順位一位から十位）</div>
      <div class="space3">${introductions}</div>
      <div class="flex wrap center between gap2"><span class="muted medium">神床殿・この七年の報告</span><button id="cereTease" class="btn" type="button">神のイタズラ</button></div>
      <div class="node"><div id="cereLogHead" class="medium"></div><div id="cereLogBody" class="muted mt1" style="white-space:pre-wrap;min-height:3.4em;"></div></div>
      <div class="flex wrap center gap2"><button id="cerePrev" class="btn" type="button">◀ 前</button><span id="cereCount" class="muted"></span><button id="cereNext" class="btn" type="button">次 ▶</button></div>
      <div class="callout">${q}${hopeM?`<br><span class="medium">${hopeM.name}</span>は答えた——「${hope}」`:''}</div>
      <div class="muted">神は十人の報告に耳を傾け、問いを交わし、その悩みと望みを聞いた。満足した神は再び眠りにつく——次に目覚めるとき、また七年が過ぎている。</div>`;

    bindLog();
    showLogEntry(logIndex);
  }

  function bindLog(){
    const prev=document.getElementById('cerePrev');
    const next=document.getElementById('cereNext');
    const tease=document.getElementById('cereTease');
    if(prev)prev.onclick=function(){if(logIndex>0){logIndex--;showLogEntry(logIndex);}};
    if(next)next.onclick=function(){if(logIndex<logEntries.length-1){logIndex++;showLogEntry(logIndex);}};
    if(tease)tease.onclick=function(){
      if(!logEntries.length)return;
      if(teasedSet.has(logIndex))teasedSet.delete(logIndex);else teasedSet.add(logIndex);
      showLogEntry(logIndex);
    };
  }

  function showLogEntry(i){
    const headEl=document.getElementById('cereLogHead');
    const bodyEl=document.getElementById('cereLogBody');
    const countEl=document.getElementById('cereCount');
    const teaseEl=document.getElementById('cereTease');
    if(!headEl||!bodyEl)return;
    const e=logEntries[i];
    if(!e){bodyEl.textContent='';return;}
    const teased=teasedSet.has(i);
    headEl.textContent=e.head+(teased?'　（神のイタズラ中）':'');
    if(countEl)countEl.textContent=(i+1)+' / '+logEntries.length;
    if(teaseEl)teaseEl.textContent=teased?'イタズラをやめる':'神のイタズラ';
    typeOut(bodyEl,teased?e.teased:e.serious);
  }

  function typeOut(el,text){
    if(typeTimer){clearInterval(typeTimer);typeTimer=null;}
    el.textContent='';
    let idx=0;
    typeTimer=setInterval(function(){
      idx++;
      el.textContent=text.slice(0,idx);
      if(idx>=text.length){clearInterval(typeTimer);typeTimer=null;}
    },30);
  }

  const renderBeforeCeremony=render;
  render=function(){
    renderBeforeCeremony();
    if(ceremonyYear!==year){
      if(currentBatch.length)lastCeremony={year,n:Math.round(year/7),mothers:currentBatch.slice()};
      currentBatch=[];
      ceremonyYear=year;
      logIndex=0;
      teasedSet.clear();
    }
    renderCeremonyUI();
  };

  ceremonyYear=(typeof year!=='undefined')?year:null;
  renderCeremonyUI();
})();
