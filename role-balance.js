// 役務の上限撤廃＋時代の需要（試作）。
// 固定版のコードは書き換えず、assignments と役務表示を上書き／ラップする。
// 巫女の役務構成から「その時代が必要とするもの」を割り出し、歴代の移り変わりを記録する。
// このファイルを外せば定員6人の再分配（固定版の挙動）に戻る。
(function(){
  if(typeof assignments!=='function'||typeof render!=='function')return;

  // 1) 役職の上限を撤廃：各巫女を第一適性へそのまま配属する（再分配なし）。
  assignments=function(){
    const workers=mikos.filter(p=>p.age>=13).map(p=>{
      const stats=current(p);
      return{person:p,stats,prefs:rank(stats),role:null};
    });
    const groups=Object.fromEntries(STATS.map(s=>[s,[]]));
    workers.forEach(w=>{w.role=w.prefs[0];groups[w.role].push(w);});
    return{workers,groups};
  };

  // 役務を「国の需要」ドメインへまとめる。戦闘系（討魔＋守護）は〈武〉。
  const DOMAINS=[
    {key:'討魔', roles:['ATK'], desc:'魔物や邪霊の跳梁に備え、これを討ち祓う力が求められている', theme:'討魔の時代'},
    {key:'護国', roles:['DEF'], desc:'他国との争いに備え、国と要所を守り抜くことが求められている', theme:'護国の時代'},
    {key:'神事', roles:['MP'],  desc:'祈祷・治癒・結界といった神事で人々を支えることが重んじられている', theme:'神事の時代'},
    {key:'国土', roles:['HP'],  desc:'土地を鎮め実りを守り、国土の安定を固めることが急務となっている', theme:'国土の時代'},
    {key:'学識', roles:['INT'], desc:'儀礼と学識で、制度と記録を整えることが重んじられている', theme:'学識の時代'},
    {key:'巡行', roles:['SPD'], desc:'巡行・伝令・探索で各地を結び、人と情報の往来を支えている', theme:'巡行の時代'},
    {key:'工芸', roles:['DEX'], desc:'神具や祭具づくりなど、工芸の技が栄えている', theme:'工芸の時代'}
  ];
  // 旧セーブに残る呼び名（統合していた戦闘域・硬い語・かな語）を現在の表記へ読み替える。
  const LEGACY={
    '武':'討魔','まもり':'護国',
    '祈り':'神事','地鎮':'国土','制作':'工芸','往来':'巡行',
    'いのり':'神事','大地':'国土','知恵':'学識','つなぎ':'巡行','ものづくり':'工芸'
  };
  const normKey=k=>LEGACY[k]||k;
  const ROLE_TENDENCY={HP:'国土と実り',MP:'神事と加護',ATK:'魔物の討伐',DEF:'国の守り',INT:'学識と儀礼',SPD:'巡行と伝令',DEX:'工芸と技術'};
  const MAXLOG=400;

  let eraLog=[],lastEraYear=null;

  function rankedDomains(g){
    return DOMAINS.map(d=>({d,n:d.roles.reduce((s,r)=>s+g[r].length,0)}))
      .sort((a,b)=>b.n-a.n||DOMAINS.indexOf(a.d)-DOMAINS.indexOf(b.d));
  }
  // 数が上位2つのドメインを合わせて、その時代とする。
  function eraOf(g){
    const ranked=rankedDomains(g).filter(x=>x.n>0);
    if(!ranked.length)return null;
    const picks=ranked.slice(0,Math.min(2,ranked.length)).map(x=>x.d)
      .sort((a,b)=>DOMAINS.indexOf(a)-DOMAINS.indexOf(b)); // 表記が毎ターンぶれないよう定義順へ整える
    return{picks,key:picks.map(d=>d.key).join('と')};
  }
  function recordEra(key){
    if(lastEraYear===year)return;
    eraLog.push({year,key});
    if(eraLog.length>MAXLOG)eraLog=eraLog.slice(-MAXLOG);
    lastEraYear=year;
  }

  // 既存セーブから時代年表を復元し、以後のセーブへ追記する。
  try{
    const raw=localStorage.getItem('mikoGameSave_latest');
    if(raw){const d=JSON.parse(raw);if(Array.isArray(d.eraLog)){eraLog=d.eraLog.slice(-MAXLOG).map(e=>({year:e.year,key:normKey(e.key)}));lastEraYear=eraLog.length?eraLog[eraLog.length-1].year:null;}}
  }catch(e){}
  if(typeof buildSaveData==='function'){
    const before=buildSaveData;
    buildSaveData=function(){const data=before();data.eraLog=eraLog;return data;};
  }
  if(typeof restoreSaveData==='function'){
    const before=restoreSaveData;
    restoreSaveData=function(raw){
      let p=null;try{p=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){}
      if(p&&Array.isArray(p.eraLog)){eraLog=p.eraLog.slice(-MAXLOG).map(e=>({year:e.year,key:normKey(e.key)}));lastEraYear=eraLog.length?eraLog[eraLog.length-1].year:null;}
      before(raw);
    };
  }

  // 2) 表示の「/6」「定員6人」を上限なし表記へ、説明文も更新する。
  const renderRolesBefore=renderRoles;
  renderRoles=function(){
    renderRolesBefore();
    const box=document.getElementById('roles');
    if(box)box.querySelectorAll('.badge').forEach(b=>{b.textContent=b.textContent.replace(/^(\d+)\/6$/,'$1人');});
    renderRoleBalance();
  };

  const renderRoleMembersBefore=renderRoleMembers;
  renderRoleMembers=function(){
    renderRoleMembersBefore();
    const box=document.getElementById('roleMembers');
    if(!box||box.classList.contains('hidden'))return;
    const p=box.querySelector('p.muted');
    if(p)p.textContent=p.textContent.replace('定員6人','上限なし');
  };

  // 3) 「この時代が必要とするもの」の寸評＋役務の偏り
  function ensureEl(id,cls,afterEl){
    let el=document.getElementById(id);
    if(el)return el;
    if(!afterEl)return null;
    el=document.createElement('div');
    el.id=id;el.className=cls;
    afterEl.insertAdjacentElement('afterend',el);
    return el;
  }
  function renderRoleBalance(){
    const rolesEl=document.getElementById('roles');
    if(!rolesEl)return;
    const g=assignments().groups;
    const counts=STATS.map(s=>({role:s,n:g[s].length})).sort((a,b)=>b.n-a.n||STATS.indexOf(a.role)-STATS.indexOf(b.role));
    const total=counts.reduce((n,c)=>n+c.n,0);

    const era=total?eraOf(g):null;
    const balance=ensureEl('roleBalance','callout mt2',rolesEl);
    if(balance){
      if(!era){balance.textContent='役務に就く巫女がまだいない。';}
      else{
        const low=counts[counts.length-1],avg=total/STATS.length;
        const heads=era.picks.map(d=>`<b>${d.key}</b>`).join('と');
        const bodies=era.picks.map(d=>`${d.roles.map(r=>ROLES[r]).join('・')}が多く、${d.desc}`).join('。また、');
        let s=`この時代が必要とするもの：${heads}。${bodies}。`;
        if(low.n===0)s+=` 一方、<b>${ROLES[low.role]}</b>は不在で、その分野は手薄だ。`;
        else if(low.n<=Math.max(1,Math.round(avg*0.5)))s+=` 一方、<b>${ROLES[low.role]}</b>は手薄（${low.n}人）。`;
        balance.innerHTML=s;
      }
    }
    if(era)recordEra(era.key);
    renderEraTimeline(ensureEl('eraTimeline','space3 mt2',balance));
  }

  function renderEraTimeline(box){
    if(!box)return;
    if(!eraLog.length){box.innerHTML='';return;}
    // 連続する同一テーマの期間へ圧縮
    const runs=[];
    eraLog.forEach(e=>{
      const last=runs[runs.length-1];
      if(last&&last.key===e.key)last.to=e.year;
      else runs.push({key:e.key,from:e.year,to:e.year});
    });
    const recent=runs.slice(-6);
    const themeOf=k=>{const s=DOMAINS.find(d=>d.key===normKey(k));return s?s.theme:k+'の時代';};
    const rows=recent.map((r,i)=>{
      const isNow=i===recent.length-1;
      const span=r.from===r.to?`${r.from}年`:`${r.from}〜${r.to}年`;
      return `<div class="flex center between gap2">
        <span class="muted">${span}</span>
        <span class="medium">${themeOf(r.key)}${isNow?'（現在）':''}</span>
      </div>`;
    }).join('');
    box.innerHTML=`<div class="muted medium">時代の移り変わり</div>${rows}`;
  }

  // 説明文を上限撤廃に合わせて更新
  const rolesEl=document.getElementById('roles');
  const card=rolesEl&&rolesEl.closest('.card');
  const desc=card&&card.querySelector('p.muted');
  if(desc)desc.textContent='各巫女を得意な役務へ配属（上限なし）。役務の顔ぶれが、その時代に求められたものを映す。';

  render();
})();
