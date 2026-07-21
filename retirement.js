function makeRecruitFromDeparture(source){
  const id=nextId++;
  const maxStats={};
  const inheritance={};

  STATS.forEach(stat=>{
    const multiplier=.8+Math.random()*.4;
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

function runTurnWithBottomFiveRetirement(){
  // 第1段階：大儀開始時点の名簿を固定する。
  // この後に生まれる娘や公募採用者は、同じ周期の母候補には絶対に入らない。
  const ritualRoster=[...mikos];
  const mothers=ritualRoster
    .filter(p=>p.age>=20&&p.age<=34)
    .sort((a,b)=>avg(b.maxStats)-avg(a.maxStats)||a.id-b.id)
    .slice(0,10);

  // 第2段階：子作りと神羅判定を全員分完了する。
  const newborns=mothers.map(m=>makeChild(m,ritualRoster.length));

  // 第3段階：大儀完了後に、任期終了・年齢進行を行う。
  const retirees=ritualRoster.filter(p=>p.age===34);
  let survivors=ritualRoster.filter(p=>p.age!==34);

  survivors.forEach(p=>{
    if(p.age===6)p.age=13;
    else if(p.age===13)p.age=20;
    else if(p.age===20)p.age=27;
    else if(p.age===27)p.age=34;
  });

  newborns.forEach(child=>child.age=6);
  mikos=[...survivors,...newborns];

  // 第4段階：任期終了後に残った20歳以上を潜在能力順に並べ、下位5人だけを入れ替える。
  const formalRanking=mikos
    .filter(p=>p.age>=20)
    .sort((a,b)=>avg(a.maxStats)-avg(b.maxStats)||a.id-b.id);
  const performanceDepartures=formalRanking.slice(0,Math.min(5,formalRanking.length));
  const performanceDepartureIds=new Set(performanceDepartures.map(p=>p.id));
  mikos=mikos.filter(p=>!performanceDepartureIds.has(p.id));

  const overlapDepartures=shuffle(mikos.filter(p=>p.age>=20)).slice(0,Math.random()<.38?1:0);
  const overlapIds=new Set(overlapDepartures.map(p=>p.id));
  mikos=mikos.filter(p=>!overlapIds.has(p.id));

  // 第5段階：全退任・脱会処理が終わって空席数が確定してから、公募候補を生成・採用する。
  const departures=[...retirees,...performanceDepartures,...overlapDepartures];
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

  updateKin(retirees,[...performanceDepartures,...overlapDepartures]);
  year+=7;

  history.unshift({
    year,
    births:newborns.length,
    retirees:retirees.length,
    voluntary:performanceDepartures.length,
    performanceDepartures:performanceDepartures.length,
    overlap:overlapDepartures.length,
    recruits:recruits.length,
    rejectedApplicants:rejectedApplicants.length,
    processOrder:'ritual-departures-recruitment',
    kinChange:lastKinChange,
    kinTotal:totalKin()
  });
  history=history.slice(0,8);

  document.getElementById('turnResult').textContent=
    `${year}年目：大儀と子作りを完了。神の娘${newborns.length}人、任期終了${retirees.length}人、成人潜在能力下位5人の入れ替え${performanceDepartures.length}人、妊娠時期重複による脱会${overlapDepartures.length}人。その後、退任者能力基準の新規採用${recruits.length}人、公募落選${rejectedApplicants.length}人。`;

  if(!mikos.some(p=>p.id===selectedId))selectedId=null;
  render();
}

runTurn=runTurnWithBottomFiveRetirement;

renderHistory=function(){
  document.getElementById('history').innerHTML=history.length
    ?history.map(h=>`<div class="node">
      <div class="medium">${h.year}年目</div>
      <div class="muted">大儀・子作り完了 → 任期終了${h.retirees}人／成人潜在能力下位5人入替${h.performanceDepartures??h.talentDepartures??h.voluntary}人／妊娠重複脱会${h.overlap}人 → 新規採用${h.recruits}人／公募落選${h.rejectedApplicants??0}人</div>
      <div class="mt1">神の娘${h.births}人／親類縁者 ${h.kinTotal}人（${h.kinChange>=0?'+':''}${h.kinChange}人）</div>
    </div>`).join('')
    :'<p class="muted">まだ記録はない。</p>';
};

const oldAdvanceButton=document.getElementById('advance');
const newAdvanceButton=oldAdvanceButton.cloneNode(true);
oldAdvanceButton.replaceWith(newAdvanceButton);
newAdvanceButton.addEventListener('click',runTurn);

let bottomFiveHoldStartTimer=null;
let bottomFiveHoldRepeatTimer=null;
function stopBottomFiveAdvanceHold(){
  if(bottomFiveHoldStartTimer!==null){clearTimeout(bottomFiveHoldStartTimer);bottomFiveHoldStartTimer=null;}
  if(bottomFiveHoldRepeatTimer!==null){clearInterval(bottomFiveHoldRepeatTimer);bottomFiveHoldRepeatTimer=null;}
}
newAdvanceButton.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  stopBottomFiveAdvanceHold();
  bottomFiveHoldStartTimer=setTimeout(()=>{
    runTurn();
    bottomFiveHoldRepeatTimer=setInterval(runTurn,300);
  },300);
});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
  newAdvanceButton.addEventListener(type,stopBottomFiveAdvanceHold);
});
newAdvanceButton.addEventListener('contextmenu',event=>event.preventDefault());