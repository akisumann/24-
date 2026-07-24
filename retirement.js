function makeRecruitFromDeparture(source){
  const id=nextId++;
  const sourcePotentialLevel=Math.round(avg(source.maxStats));
  // 退任者の潜在レベル+5 を下限、神レベルを上限として、その範囲で目標潜在レベルを定める。
  // 神レベルは緩やかにしか上がらない上限付きの値なので、評判との暴走ループを避けられる。
  // 上限が下限を下回る場合（強い退任者×低い神レベル）は下限をそのまま用いる。
  const floorLevel=sourcePotentialLevel+5;
  const targetPotentialLevel=godLevel>floorLevel?rand(floorLevel,godLevel):floorLevel;
  const targetTotal=targetPotentialLevel*STATS.length;

  // 能力の偏りはランダムにしつつ、7項目の平均は目標潜在レベルへ正確に合わせる。
  const weights=STATS.map(()=>0.7+srandom()*0.6);
  const weightTotal=weights.reduce((sum,value)=>sum+value,0);
  const rawValues=weights.map(weight=>targetTotal*weight/weightTotal);
  const values=rawValues.map(value=>Math.max(1,Math.floor(value)));
  let remainder=targetTotal-values.reduce((sum,value)=>sum+value,0);

  rawValues
    .map((value,index)=>({index,fraction:value-Math.floor(value)}))
    .sort((a,b)=>b.fraction-a.fraction||a.index-b.index)
    .forEach(entry=>{
      if(remainder<=0)return;
      values[entry.index]+=1;
      remainder-=1;
    });

  const maxStats={};
  STATS.forEach((stat,index)=>maxStats[stat]=values[index]);

  return{
    id,
    family:pick(FAMILY),
    given:pick(GIVEN),
    age:pick(AGES),
    maxStats,
    recruitmentSourceLevel:sourcePotentialLevel,
    recruitmentTargetLevel:targetPotentialLevel,
    recruitmentSource:`成人潜在能力下位退任者基準・${full(source)}`,
    body:body(),
    origin:'国家公募採用・下位退任者潜在レベル+5基準',
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
  // 大寵愛：十人の母のうち「胸＋尻−腰×0.5」が最大（腰が細いほど有利。同点は潜在レベル→id小）の一人を神が最も激しく求める。
  // その母の娘だけ、makeChild 内で能力乱数の下限が 0.6 に上がる。
  const favScore=p=>p.body.bust+p.body.hip-p.body.waist*0.5;
  const favoredMother=mothers.slice().sort((a,b)=>
    favScore(b)-favScore(a)||
    avg(b.maxStats)-avg(a.maxStats)||
    a.id-b.id
  )[0];
  favoredMotherId=favoredMother?favoredMother.id:null;
  const newborns=mothers.map(m=>makeChild(m,ritualRoster.length));
  favoredMotherId=null;

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

  const overlapDepartures=shuffle(mikos.filter(p=>p.age>=20)).slice(0,srandom()<.38?1:0);
  const overlapIds=new Set(overlapDepartures.map(p=>p.id));
  mikos=mikos.filter(p=>!overlapIds.has(p.id));

  // 第5段階：定員50の空き枠の分だけ公募で補充する。
  // 既存の巫女は、設計どおりの退任（34歳の任期終了・下位5人・妊娠時期重複脱会）以外では一切弾かない。
  // 新生児が必ず10人入る一方で退任が10人とは限らないため、超過は「弾く」のではなく「補充を減らす」で吸収する。
  const openSlots=50-mikos.length;

  const rerolledRecruits=[];
  const fallbackRecruits=[];
  const droppedNewborns=[];
  if(openSlots>=0){
    // 空き枠の範囲で、下位5人退任者を基準にした潜在レベル+5公募を一対一補充する。
    // 34歳の任期終了者、妊娠時期重複脱会者、通常補充者にはこの+5基準を使用しない。
    const rerollN=Math.min(openSlots,performanceDepartures.length);
    for(let i=0;i<rerollN;i++){
      const p=makeRecruitFromDeparture(performanceDepartures[i]);
      ensureKin(p.family);
      rerolledRecruits.push(p);
      mikos.push(p);
    }
    // まだ50人に満たなければ、通常の一般公募で残り枠を補充する。
    while(mikos.length<50){
      const p=makePerson(pick(AGES),recruitLevel(),'国家公募採用・通常補充');
      ensureKin(p.family);
      fallbackRecruits.push(p);
      mikos.push(p);
    }
  }else{
    // 退任がごく少なく、補充を0人にしても50人を超える稀なターン。
    // 既存の巫女は弾かず、今回生まれた神の娘のうち潜在能力が下位の子だけを、超過分だけ入団見送りにする（強い娘を優先して残す）。
    const surplus=-openSlots;
    const newbornPool=mikos
      .filter(p=>p.age===6&&p.origin==='神の娘・国家育成対象')
      .sort((a,b)=>avg(a.maxStats)-avg(b.maxStats)||a.id-b.id);
    const dropIds=new Set(newbornPool.slice(0,surplus).map(p=>p.id));
    droppedNewborns.push(...mikos.filter(p=>dropIds.has(p.id)));
    mikos=mikos.filter(p=>!dropIds.has(p.id));
  }
  const recruits=[...rerolledRecruits,...fallbackRecruits];
  const admittedBirths=newborns.length-droppedNewborns.length;

  updateKin(retirees,[...performanceDepartures,...overlapDepartures]);
  year+=7;

  history.unshift({
    year,
    births:admittedBirths,
    retirees:retirees.length,
    voluntary:performanceDepartures.length,
    performanceDepartures:performanceDepartures.length,
    overlap:overlapDepartures.length,
    droppedNewborns:droppedNewborns.length,
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
    `${year}年目：大儀と子作りを完了。神の娘${admittedBirths}人、任期終了${retirees.length}人、成人潜在能力下位5人の入れ替え${performanceDepartures.length}人、妊娠時期重複による脱会${overlapDepartures.length}人。その後、下位5人の潜在レベル+5基準による一般公募${rerolledRecruits.length}人、通常補充${fallbackRecruits.length}人。${droppedNewborns.length?`定員により神の娘${droppedNewborns.length}人が入団見送り。`:''}`;

  if(!mikos.some(p=>p.id===selectedId))selectedId=null;
  render();
}

runTurn=runTurnWithBottomFiveRetirement;

renderHistory=function(){
  document.getElementById('history').innerHTML=history.length
    ?history.map(h=>`<div class="node">
      <div class="medium">${h.year}年目</div>
      <div class="muted">大儀・子作り完了 → 任期終了${h.retirees}人／成人潜在能力下位5人入替${h.performanceDepartures??h.talentDepartures??h.voluntary}人／妊娠重複脱会${h.overlap}人 → 下位5人潜在Lv+5公募${h.rerolledRecruits??h.recruits}人／通常補充${h.fallbackRecruits??0}人${h.droppedNewborns?`／定員で娘${h.droppedNewborns}人入団見送り`:''}</div>
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