function runTurn(){
  const mothers=mikos
    .filter(p=>p.age>=20&&p.age<=34)
    .sort((a,b)=>avg(b.maxStats)-avg(a.maxStats))
    .slice(0,10);
  const newborns=mothers.map(m=>makeChild(m,mikos.length));
  const retirees=mikos.filter(p=>p.age===34);

  let survivors=mikos.filter(p=>p.age!==34);
  survivors.forEach(p=>{
    if(p.age===6)p.age=13;
    else if(p.age===13)p.age=20;
    else if(p.age===20)p.age=27;
    else if(p.age===27)p.age=34;
  });

  newborns.forEach(child=>child.age=6);
  mikos=[...survivors,...newborns];

  const overlapDepartures=shuffle(mikos.filter(p=>p.age>=20)).slice(0,srandom()<.38?1:0);
  const overlapIds=new Set(overlapDepartures.map(p=>p.id));
  mikos=mikos.filter(p=>!overlapIds.has(p.id));

  const voluntary=shuffle(mikos).slice(0,rand(0,2));
  const voluntaryIds=new Set(voluntary.map(p=>p.id));
  mikos=mikos.filter(p=>!voluntaryIds.has(p.id));

  const recruits=[];
  while(mikos.length<50){
    const age=pick(AGES);
    const p=makePerson(age,recruitLevel(),age<20?'国家公募採用・仮巫女':'国家公募採用・正式巫女');
    ensureKin(p.family);
    recruits.push(p);
    mikos.push(p);
  }

  updateKin(retirees,[...voluntary,...overlapDepartures]);
  year+=7;

  history.unshift({
    year,
    births:newborns.length,
    retirees:retirees.length,
    voluntary:voluntary.length,
    overlap:overlapDepartures.length,
    recruits:recruits.length,
    kinChange:lastKinChange,
    kinTotal:totalKin()
  });
  history=history.slice(0,8);

  document.getElementById('turnResult').textContent=
    `${year}年目：神の娘${newborns.length}人、任期終了${retirees.length}人、任意脱会${voluntary.length}人、妊娠時期重複による脱会${overlapDepartures.length}人、新規採用${recruits.length}人。`;

  if(!mikos.some(p=>p.id===selectedId))selectedId=null;
  render();
}

function clanData(){
  const map={};
  mikos.forEach(p=>{
    if(!map[p.family])map[p.family]={family:p.family,count:0,total:0};
    map[p.family].count++;
    map[p.family].total+=avg(p.maxStats);
  });
  Object.keys(kin).forEach(f=>{
    if(!map[f])map[f]={family:f,count:0,total:0};
  });
  return Object.values(map)
    .map(c=>({
      ...c,
      power:c.count?Math.round(c.total/c.count):0,
      kin:kinPopulation(kin[c.family]),
      totalSociety:c.count+kinPopulation(kin[c.family])
    }))
    .sort((a,b)=>b.count-a.count||b.kin-a.kin);
}

function renderKin(){
  const relatives=emptyBands();
  const partners=emptyBands();
  const married=emptyBands();
  const former=emptyBands();

  Object.values(kin).forEach(k=>{
    for(let i=0;i<KIN_AGE_LABELS.length;i++){
      relatives[i]+=k.bands[i];
      partners[i]+=k.partnerBands[i];
      married[i]+=k.marriedBands[i];
      former[i]+=k.formerBands[i];
    }
  });

  document.getElementById('kinSummary').innerHTML=KIN_AGE_LABELS.map((label,i)=>{
    const total=relatives[i]+partners[i];
    return `<div class="metric">
      <div class="muted">${label}</div>
      <div class="stats">${total}人</div>
      <div class="muted">親族 ${relatives[i]}・配偶者 ${partners[i]}</div>
      <div class="muted">既婚親族 ${married[i]}・元巫女 ${former[i]}</div>
    </div>`;
  }).join('');

  document.getElementById('kinChange').textContent=
    year===0?'初期人口':`${lastKinChange>=0?'+':''}${lastKinChange}人`;
}

function renderClans(){
  const cs=clanData().slice(0,8);
  document.getElementById('clans').innerHTML=cs.map((c,i)=>{
    const k=kin[c.family];
    const age0to20=k.bands.slice(0,3).reduce((n,x)=>n+x,0);
    const spouses=kinPartners(k);
    const former=kinFormer(k);
    const married=kinMarried(k);

    return `<div class="metric">
      <div class="flex center between gap2">
        <span class="medium">${c.family}一族</span>
        ${i===0&&c.count>=4?'<span class="badge">巫女最大氏族</span>':''}
      </div>
      <div class="grid g3 gap2 mt2">
        <div><div class="muted">現役巫女</div><div class="stats">${c.count}</div></div>
        <div><div class="muted">親類縁者</div><div class="stats">${c.kin}</div></div>
        <div><div class="muted">一族総数</div><div class="stats">${c.totalSociety}</div></div>
      </div>
      <div class="mt2 muted">平均素質 ${c.power}／0〜20歳 ${age0to20}／配偶者 ${spouses}</div>
      <div class="muted">既婚親族 ${married}／元巫女 ${former}</div>
      <div class="muted">直近7年：出生 ${k.births}・63歳到達 ${k.deaths}・婚姻 ${k.marriages}</div>
    </div>`;
  }).join('');

  const top=cs[0];
  document.getElementById('dominantClan').textContent=
    top&&top.count>=5?`${top.family}一族が台頭`:
    top&&top.count>=3?`${top.family}一族が最大`:
    '群雄状態';
}

function renderAges(){
  const counts=AGES.map(a=>mikos.filter(p=>p.age===a).length);
  document.getElementById('ageGroups').innerHTML=AGES.map((a,i)=>
    `<div class="metric"><div class="muted">${a}歳・${a<20?'仮巫女':'正式巫女'}</div><div class="stats">${counts[i]}人</div></div>`
  ).join('');
  document.getElementById('generationStatus').textContent=
    Math.max(...counts)-Math.min(...counts)<=3?'概ね均等':'世代に偏り';
}

function renderRoster(){
  const f=document.getElementById('ageFilter').value;
  const list=mikos
    .filter(p=>f==='all'||p.age===Number(f))
    .sort((a,b)=>b.age-a.age||level(b)-level(a));

  document.getElementById('roster').innerHTML=list.map(p=>{
    const role=roleOf(p);
    const clanCount=mikos.filter(x=>x.family===p.family).length;
    return `<button type="button" data-person="${p.id}" class="btn person ${selectedId===p.id?'selected':''}">
      <div class="flex between gap2">
        <div><div class="medium">${full(p)}</div><div class="muted">${p.age}歳・${p.age<20?'仮巫女':'正式巫女'}</div></div>
        <span class="badge">Lv${level(p)}</span>
      </div>
      <div class="mt2">${p.age<13?'役務修練前':role?ROLES[role]:'役務待機'}</div>
      ${p.favored?'<div class="mt2 medium">最寵の子</div>':''}
      ${clanCount>=3?`<div class="mt2">${p.family}一族・現役${clanCount}人</div>`:''}
      ${p.age===34?'<div class="mt2 medium">次の大儀後に任期終了</div>':''}
    </button>`;
  }).join('');

  document.querySelectorAll('[data-person]').forEach(b=>b.addEventListener('click',()=>{
    selectedId=Number(b.dataset.person);
    renderRoster();
    renderDetail();
  }));
}

function renderDetail(){
  const p=mikos.find(x=>x.id===selectedId);
  const box=document.getElementById('detail');
  if(!p){
    box.innerHTML='<p class="muted">巫女を選択してください。</p>';
    return;
  }

  const stats=current(p);
  const role=roleOf(p);
  const clan=mikos.filter(x=>x.family===p.family);
  const k=kin[p.family];

  box.innerHTML=`<div class="flex between gap3">
    <div><h2>${full(p)}</h2><p class="muted">${p.age}歳・${p.origin}</p></div>
    <span class="badge">Lv${level(p)}</span>
  </div>
  <div class="flex wrap gap2">
    <span class="badge">${p.age<20?'仮巫女':'正式巫女'}</span>
    ${p.age>=20?'<span class="badge">大儀選抜対象</span>':''}
    ${role?`<span class="badge">${ROLES[role]}</span>`:''}
    ${p.favored?'<span class="badge">最寵の子</span>':''}
    ${clan.length>=3?`<span class="badge">${p.family}一族 ${clan.length}人</span>`:''}
  </div>
  <div class="grid g4 gap2">
    <div class="metric"><div class="muted">成人身長</div><div class="stats">${p.body.height}cm</div></div>
    <div class="metric"><div class="muted">髪色</div><div>${p.body.hair}</div></div>
    <div class="metric col2"><div class="muted">成人体格</div><div>B${p.body.bust}・W${p.body.waist}・H${p.body.hip}</div></div>
  </div>
  <div><h3>性格</h3><p>${personality(p)}</p></div>
  <div><h3>現在能力</h3><div class="mt2 grid g7 gap2">
    ${STATS.map(s=>`<div class="text-center"><div class="muted">${s}</div><div>${stats[s]}</div></div>`).join('')}
  </div></div>
  ${p.inheritance?`<div><h3>出生時の独立倍率</h3><div class="mt2 grid g7 gap2">
    ${STATS.map(s=>`<div class="text-center"><div class="muted">${s}</div><div>×${p.inheritance[s].toFixed(2)}</div></div>`).join('')}
  </div></div>`:''}
  <div><h3>固有スキル</h3><div class="mt2 flex wrap gap2">
    ${p.skills.map((s,i)=>`<button type="button" data-skill="${i}" class="btn">${s.name}</button>`).join('')}
  </div><p id="skillEffect" class="mt2 muted">スキルを押すと、その人に働くプラス効果を表示する。</p></div>
  <div class="muted">母：${p.mother}</div>
  <div class="muted">${p.family}一族：現役巫女${clan.length}人・親類縁者${kinPopulation(k)}人</div>`;

  document.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>{
    const s=p.skills[Number(b.dataset.skill)];
    document.getElementById('skillEffect').textContent=`${s.name}：${s.effect}`;
  }));
}

function renderRoles(){
  const a=assignments();
  document.getElementById('roles').innerHTML=STATS.map(role=>{
    const m=[...a.groups[role]].sort((x,y)=>y.stats[role]-x.stats[role]);
    return `<button type="button" data-role="${role}" class="metric ${selectedRole===role?'selected':''}" style="text-align:left">
      <div class="flex between gap2"><span class="medium">${ROLES[role]}</span><span class="badge">${m.length}/6</span></div>
      <div class="mt2 muted">${m[0]?`巫女長：${full(m[0].person)}`:'巫女長：不在'}</div>
    </button>`;
  }).join('');

  document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{
    selectedRole=b.dataset.role;
    renderRoles();
    renderRoleMembers();
  }));
}

function renderRoleMembers(){
  const box=document.getElementById('roleMembers');
  if(!selectedRole){
    box.classList.add('hidden');
    return;
  }

  const m=[...assignments().groups[selectedRole]].sort((a,b)=>b.stats[selectedRole]-a.stats[selectedRole]);
  box.classList.remove('hidden');
  box.innerHTML=`<div class="flex between">
    <div><h2>${ROLES[selectedRole]}</h2><p class="muted">所属${m.length}人・定員6人</p></div>
    <button id="closeRole" type="button" class="btn">閉じる</button>
  </div>
  <div class="scroll">
    ${m.map((w,i)=>`<button type="button" data-member="${w.person.id}" class="btn member">
      <div class="flex between"><span class="medium">${full(w.person)}</span>${i===0?'<span class="badge">巫女長</span>':''}</div>
      <div class="muted">${w.person.age}歳・Lv${level(w.person)}</div>
      <div>${selectedRole} ${w.stats[selectedRole]}</div>
    </button>`).join('')}
  </div>`;

  document.getElementById('closeRole').addEventListener('click',()=>{
    selectedRole=null;
    box.classList.add('hidden');
    renderRoles();
  });

  document.querySelectorAll('[data-member]').forEach(b=>b.addEventListener('click',()=>{
    selectedId=Number(b.dataset.member);
    renderRoster();
    renderDetail();
  }));
}

function renderHistory(){
  document.getElementById('history').innerHTML=history.length
    ?history.map(h=>`<div class="node">
      <div class="medium">${h.year}年目</div>
      <div class="muted">神の娘${h.births}人／任期終了${h.retirees}人／任意脱会${h.voluntary}人／妊娠重複脱会${h.overlap}人／新規採用${h.recruits}人</div>
      <div class="mt1">親類縁者 ${h.kinTotal}人（${h.kinChange>=0?'+':''}${h.kinChange}人）</div>
    </div>`).join('')
    :'<p class="muted">まだ記録はない。</p>';
}

function render(){
  document.getElementById('year').textContent=`${year}年`;
  document.getElementById('count').textContent=`${mikos.length}人`;
  document.getElementById('kinTotal').textContent=`${totalKin()}人`;
  document.getElementById('fame').textContent=reputation();
  document.getElementById('fameText').textContent=fameText();
  document.getElementById('candidateCount').textContent=`${mikos.filter(p=>p.age>=20).length}人`;
  document.getElementById('age34Count').textContent=`${mikos.filter(p=>p.age===34).length}人`;
  renderKin();
  renderClans();
  renderAges();
  renderRoster();
  renderDetail();
  renderRoles();
  renderRoleMembers();
  renderHistory();
}

document.getElementById('advance').addEventListener('click',runTurn);
document.getElementById('ageFilter').addEventListener('change',renderRoster);
render();
