function makeRecruitFromDeparture(source){
  const id=nextId++;
  const maxStats={};
  const inheritance={};

  STATS.forEach(stat=>{
    const multiplier=.6+Math.random()*.8;
    inheritance[stat]=multiplier;
    maxStats[stat]=Math.max(1,Math.round(source.maxStats[stat]*multiplier));
  });

  return{
    id,
    family:pick(FAMILY),
    given:pick(GIVEN),
    age:pick(AGES),
    maxStats,
    recruitmentInheritance:inheritance,
    recruitmentSource:`退任者能力基準・${full(source)}`,
    body:body(),
    origin:'国家公募採用・退任者能力基準',
    mother:'—',
    skills:makeSkills(maxStats,id)
  };
}

function runTurnWithTop15Retirement(){
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

  const formalRanking=mikos
    .filter(p=>p.age>=20)
    .sort((a,b)=>avg(b.maxStats)-avg(a.maxStats)||a.id-b.id);
  const retainedFormalIds=new Set(formalRanking.slice(0,15).map(p=>p.id));
  const talentDepartures=formalRanking.filter(p=>!retainedFormalIds.has(p.id));
  const talentDepartureIds=new Set(talentDepartures.map(p=>p.id));
  mikos=mikos.filter(p=>!talentDepartureIds.has(p.id));

  const overlapDepartures=shuffle(mikos.filter(p=>p.age>=20)).slice(0,Math.random()<.38?1:0);
  const overlapIds=new Set(overlapDepartures.map(p=>p.id));
  mikos=mikos.filter(p=>!overlapIds.has(p.id));

  const departures=[...retirees,...talentDepartures,...overlapDepartures];
  const vacancies=Math.max(0,50-mikos.length);
  const applicantPool=departures.map(source=>makeRecruitFromDeparture(source));

  while(applicantPool.length<vacancies){
    const age=pick(AGES);
    applicantPool.push(makePerson(age,recruitLevel(),'国家公募採用・初期補充'));
  }

  applicantPool.sort((a,b)=>avg(b.maxStats)-avg(a.maxStats)||a.id-b.id);
  const recruits=applicantPool.slice(0,vacancies);
  const rejectedApplicants=applicantPool.slice(vacancies);

  recruits.forEach(p=>{
    ensureKin(p.family);
    mikos.push(p);
  });

  updateKin(retirees,[...talentDepartures,...overlapDepartures]);
  year+=7;

  history.unshift({
    year,
    births:newborns.length,
    retirees:retirees.length,
    voluntary:talentDepartures.length,
    talentDepartures:talentDepartures.length,
    overlap:overlapDepartures.length,
    recruits:recruits.length,
    rejectedApplicants:rejectedApplicants.length,
    kinChange:lastKinChange,
    kinTotal:totalKin()
  });
  history=history.slice(0,8);

  document.getElementById('turnResult').textContent=
    `${year}年目：神の娘${newborns.length}人、任期終了${retirees.length}人、成人上位15位外による退任${talentDepartures.length}人、妊娠時期重複による脱会${overlapDepartures.length}人、退任者能力基準の新規採用${recruits.length}人、公募落選${rejectedApplicants.length}人。`;

  if(!mikos.some(p=>p.id===selectedId))selectedId=null;
  render();
}

runTurn=runTurnWithTop15Retirement;

renderHistory=function(){
  document.getElementById('history').innerHTML=history.length
    ?history.map(h=>`<div class="node">
      <div class="medium">${h.year}年目</div>
      <div class="muted">神の娘${h.births}人／任期終了${h.retirees}人／成人上位15位外退任${h.talentDepartures??h.voluntary}人／妊娠重複脱会${h.overlap}人／新規採用${h.recruits}人／公募落選${h.rejectedApplicants??0}人</div>
      <div class="mt1">親類縁者 ${h.kinTotal}人（${h.kinChange>=0?'+':''}${h.kinChange}人）</div>
    </div>`).join('')
    :'<p class="muted">まだ記録はない。</p>';
};

const oldAdvanceButton=document.getElementById('advance');
const newAdvanceButton=oldAdvanceButton.cloneNode(true);
oldAdvanceButton.replaceWith(newAdvanceButton);
newAdvanceButton.addEventListener('click',runTurn);

let top15HoldStartTimer=null;
let top15HoldRepeatTimer=null;
function stopTop15AdvanceHold(){
  if(top15HoldStartTimer!==null){clearTimeout(top15HoldStartTimer);top15HoldStartTimer=null;}
  if(top15HoldRepeatTimer!==null){clearInterval(top15HoldRepeatTimer);top15HoldRepeatTimer=null;}
}
newAdvanceButton.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  stopTop15AdvanceHold();
  top15HoldStartTimer=setTimeout(()=>{
    runTurn();
    top15HoldRepeatTimer=setInterval(runTurn,300);
  },300);
});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
  newAdvanceButton.addEventListener(type,stopTop15AdvanceHold);
});
newAdvanceButton.addEventListener('contextmenu',event=>event.preventDefault());