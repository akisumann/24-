const BATTLE_STAT_LABELS={HP:'体力',MP:'魔力',ATK:'攻撃',DEF:'防御',INT:'知識',SPD:'素早さ',DEX:'器用さ'};
const BATTLE_SKILL_NAMES=new Set([
  '強健体質','疲労耐性',
  '治癒祈祷','結界維持','精神安定',
  '急所看破','強撃','武威','先制攻撃',
  '堅牢守護','危機耐性','不動の構え',
  '問題分析',
  '即時対応','退路確保',
  '手際上手'
]);

let battleAId=null,battleBId=null,lastBattleResult=null;

function battleEligible(){
  return [...mikos].sort((a,b)=>level(b)-level(a)||b.age-a.age||a.id-b.id);
}

function battleSampleTwo(list){
  const copy=[...list];
  const first=copy.splice(rand(0,copy.length-1),1)[0];
  const second=copy.splice(rand(0,copy.length-1),1)[0];
  return [first,second];
}

function battleOption(p){
  return `<option value="${p.id}">${full(p)}・${p.age}歳・Lv${level(p)}</option>`;
}

function battleSkillFor(p,pair){
  return p.skills.find(s=>pair.includes(s.stat)&&BATTLE_SKILL_NAMES.has(s.name))||null;
}

function battlePairKey(pair){
  return [...pair].sort((a,b)=>STATS.indexOf(a)-STATS.indexOf(b)).join('|');
}

function battlePairLabel(pair){
  return pair.map(s=>BATTLE_STAT_LABELS[s]).join('と');
}

function battleAction(pair){
  const actions={
    'HP|MP':'体力と魔力を惜しまず使い、長い攻防を制した',
    'HP|ATK':'打撃を受けても踏みとどまり、力強く押し返した',
    'HP|DEF':'堅く耐えて勢いを受け止め、そのまま押し戻した',
    'HP|INT':'粘りながら相手の癖を読み、長期戦へ引き込んだ',
    'HP|SPD':'動き続ける体力を生かし、間合いを支配した',
    'HP|DEX':'崩れずに耐え、確実な動作を積み重ねた',
    'MP|ATK':'魔力を攻撃へ乗せ、重い一撃を通した',
    'MP|DEF':'魔力を守りへ巡らせ、攻勢を封じた',
    'MP|INT':'術式を組み立て、相手の動きを先回りした',
    'MP|SPD':'魔力の流れを瞬時に切り替え、速攻を仕掛けた',
    'MP|DEX':'魔力を精密に操り、狙った地点へ術を通した',
    'ATK|DEF':'攻防を正面から競り合い、力で主導権を奪った',
    'ATK|INT':'攻撃の機を読み、狙い澄ました一撃を通した',
    'ATK|SPD':'素早く翻弄し、追いつけない角度から斬り込んだ',
    'ATK|DEX':'隙を正確に捉え、鋭い一撃を通した',
    'DEF|INT':'攻撃の筋を読み、崩れない守りから反撃した',
    'DEF|SPD':'素早く守りの位置を変え、攻撃を受け流した',
    'DEF|DEX':'防御の角度を細かく調整し、相手の攻撃を逸らした',
    'INT|SPD':'相手の次手を読み、先回りしてテンポを奪った',
    'INT|DEX':'戦況を分析し、わずかな隙を正確に突いた',
    'SPD|DEX':'細かな足運びで翻弄し、精密な一撃を先に届かせた'
  };
  return actions[battlePairKey(pair)]||`${battlePairLabel(pair)}を生かして競り勝った`;
}

function battleRollSide(p,pair){
  const stats=current(p);
  const rolls=pair.map(s=>rand(1,stats[s]));
  const raw=rolls.reduce((n,x)=>n+x,0);
  const skill=battleSkillFor(p,pair);
  const total=skill?Math.round(raw*1.1):raw;
  return {pair,rolls,raw,total,skill,stats};
}

function battleRound(number,label,a,b,pairA,pairB){
  let sideA,sideB,rerolls=0;
  do{
    sideA=battleRollSide(a,pairA);
    sideB=battleRollSide(b,pairB);
    rerolls++;
  }while(sideA.total===sideB.total&&rerolls<100);
  if(sideA.total===sideB.total)sideA.total++;
  const winner=sideA.total>sideB.total?a:b;
  return {number,label,a:sideA,b:sideB,winner,rerolls:rerolls-1};
}

function battleStory(round,previousWinner,a,b){
  const winner=round.winner;
  const loser=winner.id===a.id?b:a;
  const winSide=winner.id===a.id?round.a:round.b;
  const loseSide=winner.id===a.id?round.b:round.a;
  const margin=Math.abs(round.a.total-round.b.total);
  const skillText=winSide.skill?`《${winSide.skill.name}》もかみ合い、`:'';
  const close=margin<=5?'紙一重で':margin<=15?'接戦の末に':'大きく上回って';

  if(round.number===1){
    return `開始直後、${full(winner)}は${skillText}${battleAction(winSide.pair)}。${full(loser)}も${battlePairLabel(loseSide.pair)}で対抗したが、${close}最初の主導権を奪われた。`;
  }
  if(round.number===2&&previousWinner&&previousWinner.id!==winner.id){
    return `最初は${full(previousWinner)}にテンポを取られたが、${full(winner)}は${skillText}${battleAction(winSide.pair)}。${full(loser)}も${battlePairLabel(loseSide.pair)}で立て直そうとしたものの、攻勢に押されて崩された。`;
  }
  if(round.number===2){
    return `${full(winner)}は先ほどの流れを保ち、${skillText}${battleAction(winSide.pair)}。${full(loser)}の${battlePairLabel(loseSide.pair)}による応戦を${close}退けた。`;
  }
  return `最後は${full(winner)}が最も得意な力を軸に、${skillText}${battleAction(winSide.pair)}。${full(loser)}も${battlePairLabel(loseSide.pair)}で食い下がったが、${close}決着を取った。`;
}

function battleLine(p,side){
  const parts=side.pair.map((s,i)=>`${s} 1d${side.stats[s]}＝${side.rolls[i]}`);
  const bonus=side.skill?` ／ 《${side.skill.name}》で ${side.raw}×1.1＝${side.total}`:` ／ 合計${side.total}`;
  return `<div><span class="medium">${full(p)}</span>：${parts.join(' ＋ ')}${bonus}</div>`;
}

function battleFighterCard(p){
  const stats=current(p);
  const role=roleOf(p);
  return `<div class="metric space3">
    <div class="flex between gap2"><div><div class="medium">${full(p)}</div><div class="muted">${p.age}歳・${role?ROLES[role]:'役務修練前'}</div></div><span class="badge">Lv${level(p)}</span></div>
    <div class="grid g7 gap2">${STATS.map(s=>`<div class="text-center"><div class="muted">${s}</div><div>${stats[s]}</div></div>`).join('')}</div>
    <div class="flex wrap gap2">${p.skills.map(s=>`<span class="badge">${s.name}${BATTLE_SKILL_NAMES.has(s.name)?'・模擬戦可':''}</span>`).join('')}</div>
  </div>`;
}

function renderBattlePreview(){
  const box=document.getElementById('battlePreview');
  if(!box)return;
  const a=mikos.find(p=>p.id===battleAId);
  const b=mikos.find(p=>p.id===battleBId);
  box.innerHTML=a&&b?battleFighterCard(a)+battleFighterCard(b):'';
}

function renderBattleResult(){
  const box=document.getElementById('battleResult');
  if(!box)return;
  if(!lastBattleResult){
    box.innerHTML='二人を選び、「対戦開始」を押してください。';
    return;
  }
  const {a,b,rounds,wins,winner}=lastBattleResult;
  let previousWinner=null;
  box.innerHTML=`<div class="space3">
    <div class="flex between gap2"><div><h3>${full(a)} 対 ${full(b)}</h3><p class="muted">三本勝負・二本先取</p></div><span class="badge">${full(winner)} 勝利</span></div>
    ${rounds.map(r=>{
      const story=battleStory(r,previousWinner,a,b);
      previousWinner=r.winner;
      return `<div class="node space3">
        <div class="flex between gap2"><span class="medium">第${r.number}ターン・${r.label}</span><span class="badge">${full(r.winner)}</span></div>
        ${battleLine(a,r.a)}
        ${battleLine(b,r.b)}
        ${r.rerolls?`<div class="muted">同点のため${r.rerolls}回振り直し</div>`:''}
        <p>${story}</p>
      </div>`;
    }).join('')}
    <div class="callout"><span class="medium">最終結果：</span>${full(winner)}が${wins[winner.id]}勝${3-wins[winner.id]}敗で勝利。</div>
  </div>`;
}

function runBattle(){
  const a=mikos.find(p=>p.id===battleAId);
  const b=mikos.find(p=>p.id===battleBId);
  if(!a||!b||a.id===b.id)return;

  const statsA=current(a),statsB=current(b);
  const topA=rank(statsA),topB=rank(statsB);
  const round1=battleRound(1,'得意分野',a,b,topA.slice(0,2),topB.slice(0,2));
  const round2=battleRound(2,'対応力',a,b,battleSampleTwo(STATS.filter(s=>!topA.slice(0,2).includes(s))),battleSampleTwo(STATS.filter(s=>!topB.slice(0,2).includes(s))));
  const round3=battleRound(3,'切り札',a,b,[topA[0],pick(STATS.filter(s=>s!==topA[0]))],[topB[0],pick(STATS.filter(s=>s!==topB[0]))]);
  const rounds=[round1,round2,round3];
  const wins={[a.id]:0,[b.id]:0};
  rounds.forEach(r=>wins[r.winner.id]++);
  const winner=wins[a.id]>wins[b.id]?a:b;
  lastBattleResult={a,b,rounds,wins,winner};
  renderBattleResult();
}

function renderBattle(){
  const selectA=document.getElementById('battleA');
  const selectB=document.getElementById('battleB');
  if(!selectA||!selectB)return;
  const list=battleEligible();
  if(!list.length)return;
  if(!list.some(p=>p.id===battleAId))battleAId=list[0].id;
  if(!list.some(p=>p.id===battleBId)||battleBId===battleAId)battleBId=(list[1]||list[0]).id;
  selectA.innerHTML=list.map(battleOption).join('');
  selectB.innerHTML=list.map(battleOption).join('');
  selectA.value=String(battleAId);
  selectB.value=String(battleBId);
  renderBattlePreview();
  renderBattleResult();
}

function initBattle(){
  const selectA=document.getElementById('battleA');
  const selectB=document.getElementById('battleB');
  const randomButton=document.getElementById('battleRandom');
  const startButton=document.getElementById('battleStart');
  if(!selectA||!selectB||!randomButton||!startButton)return;

  selectA.addEventListener('change',()=>{
    battleAId=Number(selectA.value);
    if(battleAId===battleBId){
      const other=battleEligible().find(p=>p.id!==battleAId);
      battleBId=other?.id||battleBId;
    }
    renderBattle();
  });
  selectB.addEventListener('change',()=>{
    battleBId=Number(selectB.value);
    if(battleAId===battleBId){
      const other=battleEligible().find(p=>p.id!==battleBId);
      battleAId=other?.id||battleAId;
    }
    renderBattle();
  });
  randomButton.addEventListener('click',()=>{
    const [a,b]=battleSampleTwo(battleEligible());
    battleAId=a.id;
    battleBId=b.id;
    renderBattle();
  });
  startButton.addEventListener('click',runBattle);

  const originalRender=render;
  render=function(){
    originalRender();
    renderBattle();
  };
  renderBattle();
}

initBattle();
