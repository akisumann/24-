// 時代の出来事（v16拡張）：毎ターン、その時代（または手薄な分野）に危機が起き、
// 担い手（役務の人数）が足りれば切り抜けて評判が上がり、足りねば被害で評判が下がる。
// 既存の render / セーブ / fame の仕組みへ乗せる非侵襲モジュール。role-balance.js の後に読む。
(function(){
  if(typeof render!=='function'||!window.MikoEra)return;

  const EVENT_CHANCE=0.66;   // このターンに出来事が起きる確率
  const ERA_BIAS=0.55;       // 出来事が「その時代の分野」から起きる確率（残りは全分野から）
  const MAXLOG=200;

  const DOMAIN_STAT={'討魔':'ATK','護国':'DEF','神事':'MP','国土':'HP','学識':'INT','巡行':'SPD','工芸':'DEX'};
  const DOMAIN_EVENT={
    '討魔':{threat:'魔物の大発生', win:'討魔の巫女が群れを討ち払い、辺境の村々を救った', lose:'討ち手が足らず、魔物の被害が辺境へ広がった'},
    '護国':{threat:'隣国との緊張', win:'守りの備えが功を奏し、国境の衝突を未然に防いだ', lose:'守りが薄く、国境の小競り合いで領民が割を食った'},
    '神事':{threat:'疫病の流行', win:'祈祷と結界が病を鎮め、人々の不安を和らげた', lose:'祈りが行き届かず、疫病が里々へ広がった'},
    '国土':{threat:'凶作の兆し', win:'地鎮の巫女が土地を鎮め、実りを取り戻した', lose:'地を鎮める手が足らず、飢饉が民を苦しめた'},
    '学識':{threat:'制度の綻び', win:'典儀の巫女が儀礼と記録を立て直し、混乱を収めた', lose:'調える者が足らず、制度の乱れが尾を引いた'},
    '巡行':{threat:'遠国との連絡途絶', win:'巡行の巫女が道を繋ぎ直し、交易と伝令を回復させた', lose:'繋ぐ者が足らず、遠国との往来が細った'},
    '工芸':{threat:'神具の不足', win:'奉工の巫女が名品を仕立て、神事の備えを満たした', lose:'作り手が足らず、神具の不足が神事に響いた'}
  };
  const ALL_KEYS=Object.keys(DOMAIN_EVENT);

  let eventLog=[],lastEventYear=null,restoring=false;

  try{
    const raw=localStorage.getItem('mikoGameSave_latest');
    if(raw){const d=JSON.parse(raw);if(Array.isArray(d.eventLog))eventLog=d.eventLog.slice(-MAXLOG);}
  }catch(e){}

  if(typeof buildSaveData==='function'){
    const before=buildSaveData;
    buildSaveData=function(){const d=before();d.eventLog=eventLog;return d;};
  }
  if(typeof restoreSaveData==='function'){
    const before=restoreSaveData;
    restoreSaveData=function(raw){
      let p=null;try{p=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){}
      if(p&&Array.isArray(p.eventLog))eventLog=p.eventLog.slice(-MAXLOG);
      restoring=true;
      before(raw);           // 内部の render で出来事が誤発火しないよう抑止
      restoring=false;
      lastEventYear=year;    // 復元後の年に合わせ、次の進行から発火
      renderEventUI();
    };
  }

  function domainCount(key){return (assignments().groups[DOMAIN_STAT[key]]||[]).length;}
  function trim(){if(eventLog.length>MAXLOG)eventLog=eventLog.slice(-MAXLOG);}

  function maybeRunEvent(){
    if(restoring)return;
    if(lastEventYear===year)return;
    const prevYear=lastEventYear;
    lastEventYear=year;
    if(prevYear===null||year===0)return; // 開始・読込直後は起こさない

    if(Math.random()>EVENT_CHANCE){eventLog.push({year,calm:true});trim();return;}

    const era=window.MikoEra.current();
    let key;
    if(era&&era.picks&&era.picks.length&&Math.random()<ERA_BIAS){
      key=era.picks[rand(0,era.picks.length-1)].key;      // その時代の分野の危機
    }else{
      key=ALL_KEYS[rand(0,ALL_KEYS.length-1)];             // 手薄な分野への不意打ちもありうる
    }
    const info=DOMAIN_EVENT[key];
    const count=domainCount(key);
    const p=Math.min(0.9,Math.max(0.12,0.14+count*0.11));  // 担い手が多いほど切り抜けやすい
    const success=Math.random()<p;

    reputation();  // この年の評判減衰を先に確定させてから、出来事の増減を上乗せする
    const delta=success?rand(6,13):-rand(6,14);
    fame=Math.max(0,fame+delta);

    eventLog.push({year,key,threat:info.threat,success,delta,count,text:success?info.win:info.lose});
    trim();
  }

  function ensureTile(){
    let el=document.getElementById('eventCard');
    if(el)return el;
    el=document.createElement('div');
    el.id='eventCard';
    el.className='card space3';
    (document.querySelector('.miko-board')||document.querySelector('main')||document.body).appendChild(el);
    return el;
  }

  function renderEventUI(){
    const el=ensureTile();
    if(!el)return;
    const real=eventLog.filter(e=>!e.calm);
    const latest=eventLog[eventLog.length-1];
    const recent=real.slice(-6).reverse();

    const head=`<div class="flex center between gap3"><div><h2>時代の出来事</h2><p class="muted">その時代の危機に、役務の顔ぶれが噛み合うか。</p></div><span class="badge">${real.length}件</span></div>`;
    let now='';
    if(latest){
      if(latest.calm){
        now=`<div class="callout">${latest.year}年：目立った波乱はなく、静かな七年が過ぎた。</div>`;
      }else{
        now=`<div class="callout"><div class="flex wrap center between gap2"><span class="medium">${latest.year}年・${latest.threat}</span><span class="badge">${latest.success?'切り抜けた':'被害'}</span></div>`
          +`<div class="mt1">${latest.text}。</div>`
          +`<div class="muted mt1">国家評判 ${latest.delta>=0?'+':''}${latest.delta}（担い手 ${latest.count}人）</div></div>`;
      }
    }
    const list=recent.length
      ?recent.map(e=>`<div class="node"><div class="flex center between gap2"><span class="medium">${e.year}年・${e.threat}</span><span class="badge">${e.success?'○':'×'} ${e.delta>=0?'+':''}${e.delta}</span></div><div class="muted mt1">${e.text}。</div></div>`).join('')
      :'<p class="muted">まだ大きな出来事はない。</p>';
    el.innerHTML=`${head}${now}<div class="space3">${list}</div>`;
  }

  const renderBeforeEvents=render;
  render=function(){
    maybeRunEvent();
    renderBeforeEvents();
    renderEventUI();
  };

  // 他モジュール（ceremony.js など）から直近の出来事を参照するための小さなAPI。
  window.MikoEvents={
    latest(){for(let i=eventLog.length-1;i>=0;i--)if(!eventLog[i].calm)return eventLog[i];return null;},
    recent(n){return eventLog.filter(e=>!e.calm).slice(-(n||3));}
  };

  lastEventYear=(typeof year!=='undefined')?year:null;
  render();
})();
