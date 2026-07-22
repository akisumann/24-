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
    {key:'まもり',     roles:['ATK','DEF'], desc:'魔物や戦乱から人々を守る力が求められている', theme:'まもりの時代'},
    {key:'いのり',     roles:['MP'],        desc:'祈りと癒やしで人々の心と体を支えることが大切にされている', theme:'いのりの時代'},
    {key:'大地',       roles:['HP'],        desc:'土地と実りを守り、暮らしの土台を整えることが重んじられている', theme:'大地の時代'},
    {key:'知恵',       roles:['INT'],       desc:'学びと知恵で、決まりごとや神事を整えることが求められている', theme:'知恵の時代'},
    {key:'つなぎ',     roles:['SPD'],       desc:'各地を行き来して、人と知らせをつなぐことが国を支えている', theme:'つなぎの時代'},
    {key:'ものづくり', roles:['DEX'],       desc:'神具や道具をつくる技が栄えている', theme:'ものづくりの時代'}
  ];
  // 旧セーブに残る硬い呼び名を、やわらかい表記へ読み替える。
  const LEGACY={'武':'まもり','祈り':'いのり','地鎮':'大地','学識':'知恵','巡行':'つなぎ','制作':'ものづくり'};
  const normKey=k=>LEGACY[k]||k;
  const ROLE_TENDENCY={HP:'大地とみのり',MP:'いのりと癒やし',ATK:'たたかい',DEF:'まもり',INT:'学びと知恵',SPD:'行き来と連絡',DEX:'ものづくり'};
  const MAXLOG=400;

  let eraLog=[],lastEraYear=null;

  function domainOf(g){
    const scored=DOMAINS.map(d=>({d,n:d.roles.reduce((s,r)=>s+g[r].length,0)}));
    scored.sort((a,b)=>b.n-a.n||DOMAINS.indexOf(a.d)-DOMAINS.indexOf(b.d));
    return scored[0];
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

    const balance=ensureEl('roleBalance','callout mt2',rolesEl);
    if(balance){
      if(!total){balance.textContent='役務に就く巫女がまだいない。';}
      else{
        const {d}=domainOf(g);
        const domRoles=d.roles.map(r=>ROLES[r]).join('・');
        const top=counts[0],low=counts[counts.length-1],avg=total/STATS.length;
        let s=`この時代が必要とするもの：<b>${d.key}</b> — ${domRoles}が多く、${d.desc}。`;
        if(top.n>=avg*1.6)s+=`役務は<b>${ROLES[top.role]}</b>（${ROLE_TENDENCY[top.role]}）へかなり偏っている。`;
        if(low.n===0)s+=` 一方、<b>${ROLES[low.role]}</b>は不在で、その分野は手薄だ。`;
        else if(low.n<=Math.max(1,Math.round(avg*0.5)))s+=` 一方、<b>${ROLES[low.role]}</b>は手薄（${low.n}人）。`;
        balance.innerHTML=s;
      }
    }

    if(total)recordEra(domainOf(g).d.key);
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
    const themeOf=k=>{k=normKey(k);return (DOMAINS.find(d=>d.key===k)||{}).theme||k;};
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
