const MAX_LEVEL=100;
let year=0,nextId=1,selectedId=null,selectedRole=null,history=[],lastKinChange=0,godLevel=50,shinraMikos=[];
let fame=0,fameYear=null,fameShinra=0;
function rate(age){if(age===6)return.2;if(age===13)return.4;if(age===20)return.6;if(age===27)return.8;return 1}
function current(p){const r=rate(p.age);return Object.fromEntries(STATS.map(s=>[s,Math.round(p.maxStats[s]*r)]))}
function level(p){return Math.min(MAX_LEVEL,Math.round(avg(current(p))))}
function personality(p){const r=rank(p.maxStats);return`${HIGH[r[0]]}。${HIGH[r[1]]}。一方で、${LOW[r[5]]}うえ、${LOW[r[6]]}。`}
function makeStats(base){return Object.fromEntries(STATS.map(s=>[s,Math.max(1,Math.round(base*(.5+Math.random()))) ]))}
function makeSkills(stats,id){const r=rank(stats),src=[r[0],r[0],r[1],r[2],r[3]],used=new Set();return src.map((s,i)=>{const list=SKILLS[s];let n=(id*13+i*7)%list.length;while(used.has(list[n][0]))n=(n+1)%list.length;used.add(list[n][0]);return{name:list[n][0],effect:list[n][1],stat:s}})}
const BODY_BASE_START=90,BODY_BASE_RATE=0.1;              // 胸・尻の基準値。7年（1ターン）ごとに0.1ずつ上がる。
function bodyBase(){return BODY_BASE_START+BODY_BASE_RATE*(year/7);}
// 初期採用・国家公募など外部出身者は、神の基準ではなく現実の女性の平均からランダムに与える。
function body(){return{height:rand(150,172),bust:rand(80,100),waist:rand(66,84),hip:rand(88,106),hair:pick(HAIR)}}
function makePerson(age,base,origin,mother='—'){const id=nextId++,maxStats=makeStats(base);return{id,family:pick(FAMILY),given:pick(GIVEN),age,maxStats,body:body(),origin,mother,skills:makeSkills(maxStats,id)}}
function makeChild(m){
  const usedGodLevel=godLevel,id=nextId++,maxStats={},inheritance={};
  STATS.forEach(s=>{
    const multiplier=.5+Math.random();
    inheritance[s]=multiplier;
    maxStats[s]=Math.max(1,Math.round(((m.maxStats[s]+usedGodLevel)/2)*multiplier));
  });
  const child={id,family:m.family,given:pick(GIVEN),age:0,maxStats,inheritance,body:{height:Math.round(m.body.height*.7+162*.3+rand(-6,6)),bust:Math.round(m.body.bust*.8+bodyBase()*.2+rand(-7,7)),waist:Math.round(m.body.waist*.8+62*.2+rand(-4,4)),hip:Math.round(m.body.hip*.8+bodyBase()*.2+rand(-7,7)),hair:Math.random()<.7?m.body.hair:pick(HAIR)},origin:'神の娘・国家育成対象',mother:full(m),skills:makeSkills(maxStats,id)};
  const motherLevel=level(m);
  const raisedFromChildhood=m.origin==='神の娘・国家育成対象';
  if(raisedFromChildhood&&usedGodLevel<MAX_LEVEL&&motherLevel>=usedGodLevel+30){
    godLevel=Math.min(MAX_LEVEL,usedGodLevel+1);
    shinraMikos.unshift({id:m.id,name:full(m),family:m.family,age:m.age,level:motherLevel,year:year+7,fromGodLevel:usedGodLevel,toGodLevel:godLevel});
  }
  return child;
}
function initial(){const out=[];AGES.forEach(age=>{for(let i=0;i<10;i++)out.push(makePerson(age,rand(18,38),age<20?'初期採用・仮巫女':'初期採用・正式巫女'))});return out}
let mikos=initial();

const KIN_AGE_LABELS=['0〜6歳','7〜13歳','14〜20歳','21〜27歳','28〜34歳','35〜41歳','42〜48歳','49〜55歳','56〜62歳'];
const kin={};

function emptyBands(){return Array(KIN_AGE_LABELS.length).fill(0)}
function ensureKin(family){
  if(!kin[family])kin[family]={
    bands:emptyBands(),
    formerBands:emptyBands(),
    marriedBands:emptyBands(),
    partnerBands:emptyBands(),
    births:0,
    deaths:0,
    marriages:0,
    migrations:0
  };
}
function kinBandForAge(age){return Math.max(0,Math.min(KIN_AGE_LABELS.length-1,Math.floor(age/7)))}
function sumBands(bands){return bands.reduce((n,x)=>n+x,0)}
function kinRelatives(k){return sumBands(k.bands)}
function kinPartners(k){return sumBands(k.partnerBands)}
function kinFormer(k){return sumBands(k.formerBands)}
function kinMarried(k){return sumBands(k.marriedBands)}
function kinPopulation(k){return kinRelatives(k)+kinPartners(k)}
function totalKin(){return Object.values(kin).reduce((n,k)=>n+kinPopulation(k),0)}
function advanceKinBands(bands){
  const removed=bands[bands.length-1];
  for(let i=bands.length-1;i>0;i--)bands[i]=bands[i-1];
  bands[0]=0;
  return removed;
}

mikos.forEach(p=>ensureKin(p.family));
Object.keys(kin).forEach(f=>{
  const n=mikos.filter(p=>p.family===f).length;
  const k=kin[f];
  const seed=[rand(1,2),rand(0,1),rand(0,1),rand(1,2),rand(1,2),rand(0,1),rand(0,1),rand(0,1),0];
  k.bands=seed.map(x=>x*n);
  for(let i=3;i<=7;i++){
    const married=binomial(k.bands[i],.25);
    k.marriedBands[i]=married;
    k.partnerBands[i]=married;
  }
});

function updateKin(retirees,departures){
  const before=totalKin();

  Object.values(kin).forEach(k=>{
    k.births=0;
    k.deaths=0;
    k.marriages=0;
    k.migrations=0;

    const relativesLeaving=advanceKinBands(k.bands);
    advanceKinBands(k.formerBands);
    advanceKinBands(k.marriedBands);
    const partnersLeaving=advanceKinBands(k.partnerBands);
    k.deaths=relativesLeaving+partnersLeaving;
  });

  [...retirees,...departures].forEach(p=>{
    ensureKin(p.family);
    const k=kin[p.family];
    const band=kinBandForAge(p.age);
    k.bands[band]++;
    k.formerBands[band]++;

    if(band>=3&&band<=7&&Math.random()<.35){
      k.marriedBands[band]++;
      k.partnerBands[band]++;
    }
  });

  const activeByFamily={};
  mikos.forEach(p=>activeByFamily[p.family]=(activeByFamily[p.family]||0)+1);

  Object.entries(kin).forEach(([family,k])=>{
    let marriages=0;
    for(let band=3;band<=7;band++){
      const unmarried=Math.max(0,k.bands[band]-k.marriedBands[band]);
      const newMarriages=binomial(unmarried,.15);
      k.marriedBands[band]+=newMarriages;
      k.partnerBands[band]+=newMarriages;
      marriages+=newMarriages;
    }
    k.marriages=marriages;

    const childbearingCouples=k.marriedBands.slice(3,6).reduce((n,x)=>n+x,0);
    const active=activeByFamily[family]||0;
    const births=binomial(childbearingCouples,.35)+binomial(active,.20);
    k.bands[0]+=births;
    k.births=births;

    for(let i=0;i<KIN_AGE_LABELS.length;i++){
      k.formerBands[i]=Math.min(k.formerBands[i],k.bands[i]);
      k.marriedBands[i]=Math.min(k.marriedBands[i],k.bands[i]);
    }
  });

  lastKinChange=totalKin()-before;
}

function assignments(){const workers=mikos.filter(p=>p.age>=13).map(p=>{const stats=current(p);return{person:p,stats,prefs:rank(stats),role:null}}),groups=Object.fromEntries(STATS.map(s=>[s,[]]));workers.forEach(w=>{w.role=w.prefs[0];groups[w.role].push(w)});let changed=true,safe=0;while(changed&&safe++<100){changed=false;for(const role of STATS){if(groups[role].length<=ROLE_LIMIT)continue;groups[role].sort((a,b)=>a.stats[role]-b.stats[role]);const overflow=groups[role].slice(0,groups[role].length-ROLE_LIMIT);for(const w of overflow){const dest=w.prefs.find(s=>s!==role&&groups[s].length<ROLE_LIMIT);if(!dest)continue;groups[role]=groups[role].filter(x=>x.person.id!==w.person.id);w.role=dest;groups[dest].push(w);changed=true}}}return{workers,groups}}
function roleOf(p){return assignments().workers.find(w=>w.person.id===p.id)?.role||null}
// 国家評判は「現在の実力に基づく均衡値」へ毎ターン緩やかに減衰しつつ、
// 神羅巫女の実績でスパイク加点する動的な値。経過年による無制限の増加はしない。
function reputationTarget(){
  const adults=mikos.filter(p=>p.age>=20);
  const avgLv=adults.length?adults.reduce((n,p)=>n+level(p),0)/adults.length:0;
  return avgLv*1.4+(godLevel-50)*1.2;
}
function syncFame(){
  if(fameYear===year)return;
  if(fameYear===null){fame=reputationTarget();fameYear=year;fameShinra=shinraMikos.length;return;}
  const steps=Math.max(1,Math.round((year-fameYear)/7));
  const gained=Math.max(0,shinraMikos.length-fameShinra);
  const target=reputationTarget();
  for(let i=0;i<steps;i++)fame+=(target-fame)*0.34; // 時間経過で均衡へ減衰／接近
  fame+=gained*6;                                    // 神羅巫女という実績で一時的に加点
  if(fame<0)fame=0;
  fameYear=year;
  fameShinra=shinraMikos.length;
}
function reputation(){syncFame();return Math.round(fame)}
function fameText(){const f=reputation();if(f<40)return'契約事業はまだ広く知られていない。';if(f<90)return'高待遇の国家特別職として近隣で評判になっている。';if(f<170)return'地方各地から優秀な志願者が集まる。';if(f<280)return'国内有数の人材育成事業として知られている。';return'国外の有力者からも志願希望が届いている。'}
function recruitLevel(){return Math.max(8,Math.min(80,Math.round(14+reputation()/8+rand(-14,14))))}