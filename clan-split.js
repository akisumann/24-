// 一族の分派（v17）。
// 現役巫女が30人を超えた一族は、母系の枝ごとに分家する。分家は本家の一字を継いだ新しい姓を名乗る（白鷺→白藤・鷺宮 など）。
//
// - 乱数（srandom）を一切使わない。誰が母になるか・退任するか・能力・体格などゲームの流れは、分派の有無で変わらない。
// - 親類縁者の人口計算は元の一族（本家筋＝clanRoot）単位のまま core.js が行う。画面では、本家筋の人口を
//   現役人数の比で本家・分家へ割り振って表示する（kinOf）。
// - 母系の系譜は、神の娘が生まれるたびに「母の id」を記録して辿る（clanLineage）。
// - 分派の記録（clanSplits）と分家の一覧（clanHouses）はセーブへ保存する。
// ceremony.js（makeChild のラップ）の後、seed-repro.js（自動進行）の前に読む。
(function(){
  if(typeof makeChild!=='function'||typeof render!=='function')return;

  const SPLIT_OVER=30;  // 現役がこの人数を超えたら分派する
  const MIN_BRANCH=5;   // 分家として独立させる最小人数（本家側に残る人数にも同じ下限）
  const MAX_LOG=200;
  // 本家の一字に添えて新しい姓をつくる字。同じ seed なら必ず同じ名になるよう、分家の祖の id から開始位置を決める。
  const SUFFIX=['藤','萩','宮','沢','森','崎','原','野','瀬','谷','川','井','園','浦','城','岡','江','倉','杜','津','坂','嶺','路','芝'];

  let lineage={};     // 巫女の id → {m: 母の id（不明なら null）, n: 最後に分かっている氏名}
  let houses={};      // 分家名 → {parent: 分かれ元の家, root: 本家筋, founderId, founderName, year}
  let clanSplits=[];  // 分派の記録（古い順）

  // 起動時の自動復元は save.js の読み込み時点で済んでいるので、分派の記録は保存データから直接読む。
  function loadFrom(p){
    lineage=(p&&p.clanLineage&&typeof p.clanLineage==='object')?p.clanLineage:{};
    houses=(p&&p.clanHouses&&typeof p.clanHouses==='object')?p.clanHouses:{};
    clanSplits=(p&&Array.isArray(p.clanSplits))?p.clanSplits.slice(-MAX_LOG):[];
  }
  try{
    if(!(typeof __seedForced!=='undefined'&&__seedForced)){
      const raw=localStorage.getItem('mikoGameSave_latest');
      if(raw)loadFrom(JSON.parse(raw));
    }
  }catch(e){}

  // --- 系譜の記録 ---
  const makeChildBeforeSplit=makeChild;
  makeChild=function(m){
    const child=makeChildBeforeSplit(m);
    if(!lineage[m.id])lineage[m.id]={m:null,n:full(m)};
    else lineage[m.id].n=full(m);
    lineage[child.id]={m:m.id,n:null};
    if(m.clanRoot)child.clanRoot=m.clanRoot;
    return child;
  };

  // 系譜が未記録の現役（初期名簿・公募・旧セーブ）を登録する。母は「母の氏名」が現役の誰かと一致すれば結ぶ。
  function syncLineage(){
    const byName={};
    mikos.forEach(p=>{byName[full(p)]=p.id;});
    mikos.forEach(p=>{
      if(!lineage[p.id])lineage[p.id]={m:(byName[p.mother]!==undefined&&byName[p.mother]!==p.id)?byName[p.mother]:null,n:full(p)};
      else lineage[p.id].n=full(p);
    });
  }

  // 現役の誰の祖先でもない記録は捨てる（セーブを肥大させない）。
  function pruneLineage(){
    const keep={};
    mikos.forEach(p=>{
      let id=p.id,guard=0;
      while(id!==null&&id!==undefined&&lineage[id]&&!keep[id]&&guard++<10000){keep[id]=lineage[id];id=lineage[id].m;}
    });
    lineage=keep;
  }

  function ancestry(id){
    const chain=[];let cur=id,guard=0;
    while(cur!==null&&cur!==undefined&&guard++<10000){chain.push(cur);cur=lineage[cur]?lineage[cur].m:null;}
    return chain;
  }

  function nameTaken(name){
    return FAMILY.includes(name)||!!houses[name]||!!kin[name]||mikos.some(p=>p.family===name);
  }

  function newHouseName(parent,founderId){
    const chars=[...parent];
    // 元の一族からは頭の字を、分家がさらに分かれるときは分家側の字（末尾）を優先して継ぐ（白鷺→白藤→藤崎）。
    const first=chars[0],last=chars[chars.length-1];
    const heads=[...new Set(houses[parent]?[last,first]:[first,last])];
    const start=Math.abs(founderId)%SUFFIX.length;
    for(let i=0;i<SUFFIX.length;i++){
      const s=SUFFIX[(start+i)%SUFFIX.length];
      for(const h of heads){
        if(h===s)continue;
        const name=h+s;
        if(name!==parent&&!nameTaken(name))return name;
      }
    }
    let n=2;while(nameTaken(parent+'分家'+n))n++;
    return parent+'分家'+n;
  }

  // 一族 fam を母系の枝で2つに分ける。分けられなければ false。
  function split(fam){
    const members=mikos.filter(p=>p.family===fam);
    const total=members.length;
    const chains=new Map();
    const count=new Map();
    members.forEach(p=>{
      const c=ancestry(p.id);
      chains.set(p.id,c);
      c.forEach(a=>count.set(a,(count.get(a)||0)+1));
    });
    // 本家と分家がなるべく半々になる枝の祖を選ぶ（同じなら古い＝id の小さい系統）。
    let best=null,bestScore=-1;
    for(const [id,n] of count){
      if(n>=total)continue;
      const score=Math.min(n,total-n);
      if(score<MIN_BRANCH)continue;
      if(score>bestScore||(score===bestScore&&id<best)){best=id;bestScore=score;}
    }
    if(best===null)return false;

    const founderName=(lineage[best]&&lineage[best].n)||'—';
    const name=newHouseName(fam,best);
    const moved=members.filter(p=>chains.get(p.id).includes(best));
    const renamed={};
    moved.forEach(p=>{
      const before=full(p);
      if(!p.clanRoot)p.clanRoot=fam;      // 親類縁者の集計は元の一族のまま
      p.family=name;
      renamed[before]=full(p);
      if(lineage[p.id])lineage[p.id].n=full(p);
    });
    mikos.forEach(p=>{if(renamed[p.mother])p.mother=renamed[p.mother];});
    houses[name]={parent:fam,root:moved[0].clanRoot,founderId:best,founderName,year};
    clanSplits.push({year,from:fam,to:name,founderId:best,founderName,moved:moved.length,before:total});
    if(clanSplits.length>MAX_LOG)clanSplits=clanSplits.slice(-MAX_LOG);
    return true;
  }

  function check(){
    syncLineage();
    for(let guard=0;guard<10;guard++){
      const counts={};
      mikos.forEach(p=>{counts[p.family]=(counts[p.family]||0)+1;});
      const big=Object.entries(counts).filter(([,n])=>n>SPLIT_OVER).sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1))[0];
      if(!big||!split(big[0]))break;
    }
    pruneLineage();
  }

  // --- 表示用：本家筋の親類縁者を現役人数の比で本家・分家へ割り振る ---
  function scaled(k,share){
    const out={};
    Object.keys(k).forEach(key=>{
      const v=k[key];
      out[key]=Array.isArray(v)?v.map(x=>Math.round(x*share)):(typeof v==='number'?Math.round(v*share):v);
    });
    return out;
  }
  kinOf=function(family){
    const root=houses[family]?houses[family].root:family;
    const k=kin[root];
    if(!k)return undefined;
    const hasBranch=Object.values(houses).some(h=>h.root===root);
    if(!hasBranch)return k;
    const line=mikos.filter(p=>kinKeyOf(p)===root);
    const mine=line.filter(p=>p.family===family).length;
    if(!line.length)return family===root?k:scaled(k,0);
    return scaled(k,mine/line.length);
  };
  houseNote=function(family){
    const h=houses[family];
    return h?`（${h.parent}の分家）`:'';
  };

  // --- 画面：一族の勢力カードの下に分派の記録 ---
  function renderSplits(){
    const clans=document.getElementById('clans');
    if(!clans)return;
    let el=document.getElementById('clanSplits');
    if(!el){
      el=document.createElement('div');
      el.id='clanSplits';
      el.className='mt3';
      if(clans.after)clans.after(el);
    }
    if(!clanSplits.length){el.innerHTML='<p class="muted">一族の分派はまだない（現役が'+SPLIT_OVER+'人を超えた一族は、母系の枝ごとに分家する）。</p>';return;}
    el.innerHTML='<h3>一族の分派</h3>'+clanSplits.slice(-8).reverse().map(s=>
      `<div class="muted mt1">${s.year}年目：${s.from}一族（現役${s.before}人）から、${s.founderName}を祖とする枝の${s.moved}人が分かれ、${s.to}一族を興した。</div>`
    ).join('');
  }

  const renderBeforeSplit=render;
  render=function(){
    check();
    renderBeforeSplit();
    renderSplits();
  };

  // --- セーブ ---
  if(typeof buildSaveData==='function'){
    const before=buildSaveData;
    buildSaveData=function(){const d=before();d.clanLineage=lineage;d.clanHouses=houses;d.clanSplits=clanSplits;return d;};
  }
  if(typeof restoreSaveData==='function'){
    const before=restoreSaveData;
    restoreSaveData=function(raw){
      let p=null;try{p=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){}
      loadFrom(p);
      return before(raw);
    };
  }

  window.MikoClans=Object.freeze({
    splitOver:SPLIT_OVER,
    houses:()=>houses,
    splits:()=>clanSplits,
    lineage:()=>lineage,
  });
})();
