function makeRecruitFromDeparture(source){
  const id=nextId++;
  const maxStats={};
  const inheritance={};

  STATS.forEach(stat=>{
    const multiplier=1+Math.random()*.2;
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
    recruitmentSource:`成人潜在能力下位退任者基準・${full(source)}`,
    body:body(),
    origin:'国家公募採用・下位退任者能力基準',
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

  // 神の娘だけが0歳から6歳になる際、祝福によって潜在能力7項目すべてを+1する。
  newborns.forEach(child=>{
    if(child.age===0&&child.origin==='神の娘・国家育成対象'){
      STATS.forEach(stat=>child.maxStats[stat]+=1);
    }
    child.age=6;
  });
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

  // 第5段階：潜在能力下位5人それぞれを能力元として、一対一で一般公募者へ入れ替える。
  // 任期終了者と妊娠時期重複脱会者は、この能力振り直しの元には使用しない。
  const rerolledRecruits=performanceDepartures.map(source=>makeRecruitFromDeparture(source));
  rerolledRecruits.forEach(p=>{
    ensureKin(p.family);
    mikos.push(p);
  });

  // 下位5人入れ替え以外の理由で50人を下回った場合だけ、通常の一般公募で補充する。
  const fallbackRecruits=[];
  while(mikos.length<50){
    const age=pick(AGES);
    const p=makePerson(age,recruitLevel(),'国家公募採用・通常補充');
    ensureKin(p.family);
    fallbackRecruits.push(p);
    mikos.push(p);
  }
  const recruits=[...rerolledRecruits,...fallbackRecruits];

  updateKin(retirees,[...performanceDepartures,...overlapDepartures]);
  year+=7;

  history.unshift({
    year,
    births:newborns.length,
    retirees:retirees.length,
    voluntary:performanceDepartures.length,
    performanceDepartures:performanceDepartures.length,
    overlap:overlapDepartures.length,
    rerolledRecruits:rerolledRecruits.length,
    fallbackRecruits:fallbackRecruits.length,
    recruits:recruits.length,
    rejectedApplicants:0,
    processOrder:'ritual-departures-recruitment',
    kinChange:lastKinChange,
    kinTotal:totalKin()
  });
  history=history.slice(0,8);

  document.getElementById('turnResult').textContent=
    `${year}年目：大儀と子作りを完了。神の娘${newborns.length}人、任期終了${retirees.length}人、成人潜在能力下位5人の入れ替え${performanceDepartures.length}人、妊娠時期重複による脱会${overlapDepartures.length}人。その後、下位5人を能力元とする一般公募${rerolledRecruits.length}人、通常補充${fallbackRecruits.length}人。`;

  if(!mikos.some(p=>p.id===selectedId))selectedId=null;
  render();
}

runTurn=runTurnWithBottomFiveRetirement;

renderHistory=function(){
  document.getElementById('history').innerHTML=history.length
    ?history.map(h=>`<div class="node">
      <div class="medium">${h.year}年目</div>
      <div class="muted">大儀・子作り完了 → 任期終了${h.retirees}人／成人潜在能力下位5人入替${h.performanceDepartures??h.talentDepartures??h.voluntary}人／妊娠重複脱会${h.overlap}人 → 下位退任者基準公募${h.rerolledRecruits??h.recruits}人／通常補充${h.fallbackRecruits??0}人</div>
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