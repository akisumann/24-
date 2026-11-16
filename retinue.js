// 巫女ごとの膣穴衆・補佐人員（v17）。
// 成人（20歳以上）の孕巫女一人ひとりに、嫁入りに同行した膣穴衆13人と、直属の補佐人員10〜20人を決める。
//
// - ゲーム本体の乱数（srandom）は一切使わない。「シード＋巫女の id」から作る専用の乱数で決めるので、
//   同じ巫女なら何度開いても、誰が開いても、必ず同じ顔ぶれになる。ゲームの流れ（母の選抜・退任・能力など）は変わらない。
// - 顔ぶれはセーブに保存せず、毎回同じ計算で出す。AI 向けの完全セーブ（exportAuthoritativeGameState）には含める。
// - 6歳・13歳の育成対象には付けない（膣穴衆は嫁入りの同行者のため）。巫女が退任すれば、その顔ぶれも名簿から消える。
// - 生成の決まり（名前の一覧・人数・体型の幅）を変えると、全員の顔ぶれが入れ替わる。変えるときは GENERATOR_VERSION を上げる。
// clan-split.js の後、seed-repro.js の前に読む。
(function(){
  const GENERATOR_VERSION=3;   // 2: 体つきを主の値を中心にばらけさせる／3: 陰核も主にある程度沿わせる

  // --- 専用の乱数（ゲーム本体とは独立） ---
  function hashSeed(...parts){
    let h=2166136261>>>0;
    for(const x of parts){
      const s=String(x);
      for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
      h^=0x9e;h=Math.imul(h,16777619)>>>0;
    }
    return h>>>0;
  }
  function rng(seed){
    let a=seed>>>0;
    const next=()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
    return{
      next,
      int:(lo,hi)=>lo+Math.floor(next()*(hi-lo+1)),
      pick:arr=>arr[Math.floor(next()*arr.length)],
      shuffle:arr=>{const a2=[...arr];for(let i=a2.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[a2[i],a2[j]]=[a2[j],a2[i]];}return a2;},
    };
  }
  function gameSeed(){return (typeof __seed!=='undefined')?(__seed>>>0):0;}

  // --- 膣穴衆 ---
  // 役職（肩書き）。どの家でも同じ13の役職を置く。
  const ROLES13=[
    {key:'head',  title:'付き人頭', duty:'膣穴衆のまとめ役。家のことは何でも把握している'},
    {key:'guard', title:'護衛頭',   duty:'主と家の護衛、夜番'},
    {key:'ledger',title:'帳簿方',   duty:'家計・物資・記録'},
    {key:'med',   title:'薬方',     duty:'薬草、産婆、主の体調管理'},
    {key:'cook',  title:'料理方',   duty:'食事と淫膳の膳立て'},
    {key:'bath',  title:'湯殿方',   duty:'湯殿と肌洗い'},
    {key:'dress', title:'衣装方',   duty:'御種衣・小種衣の手入れと身支度'},
    {key:'bed',   title:'寝所方',   duty:'寝所の支度、肉布団とオチンポ様の番の割り振り'},
    {key:'run',   title:'伝令方',   duty:'外との連絡と使い走り'},
    {key:'nurse', title:'乳母方',   duty:'夫との子の世話'},
    {key:'scribe',title:'書記方',   duty:'主の務めの記録と文のやり取り'},
    {key:'dance', title:'舞方',     duty:'淫膳の舞や芝居の取り仕切り'},
    {key:'last',  title:'末席',     duty:'いちばん若い見習い。何でも手伝う'},
  ];
  // 苗字：膣穴衆の家ごとに代々受け継ぐ、卑しい家名。
  const SURNAMES=[
    ['雌穴','めあな'],['肉壺','にくつぼ'],['媚肉','こびにく'],['種壺','たねつぼ'],['孕袋','はらみぶくろ'],
    ['淫汁','いんじる'],['恥丘','ちきゅう'],['便器','べんき'],['牝豚','めすぶた'],['尻穴','しりあな'],
    ['雑魚穴','ざこあな'],['負犬','まけいぬ'],['精壺','せいつぼ'],['卑肉','ひにく'],
  ];
  // 名前：卑猥な言葉のカタカナ。一つの家の中では重ならない。
  const GIVEN_NAMES=[
    'シキュウ','チツニク','インカク','ニクメ','チクビ','ハナビラ','ヒガイ',
    'ハクダク','アイエキ','ミツ','シオ',
    'ハツジョウ','ゼッチョウ','チタイ','タネツケ','ナカダシ','ジュセイ','カイニン',
  ];
  // 口調（一人称・語尾・名乗り）。
  const TONES=[
    {name:'丁寧',     first:'わたくし', ex:'「〜でございます」「〜いたします」', intro:(m,r,n)=>`「${m}さまの${r}、${n}でございます♡」`},
    {name:'甘えた',   first:'わたし',   ex:'「〜ですぅ」「〜してくださぁい」',   intro:(m,r,n)=>`「${m}さまの${r}の、${n}ですぅ♡」`},
    {name:'小生意気', first:'あたし',   ex:'「〜ですけど？」「別に〜じゃないです」', intro:(m,r,n)=>`「……${m}さまの${r}、${n}。……文句あります？♡💢」`},
    {name:'寡黙',     first:'私',       ex:'「……はい」「……承知」',               intro:(m,r,n)=>`「……${m}さまの${r}。……${n}、です♡」`},
    {name:'元気',     first:'あたし',   ex:'「〜ですっ！」「任せてくださいっ！」', intro:(m,r,n)=>`「${m}さまの${r}、${n}ですっ♡」`},
    {name:'古風',     first:'わたくし', ex:'「〜にございます」「〜しとうございます」', intro:(m,r,n)=>`「${m}さまの${r}、${n}にございます♡」`},
    {name:'おっとり', first:'わたし',   ex:'「〜ですねぇ」「〜しましょうかぁ」',   intro:(m,r,n)=>`「${m}さまの${r}の、${n}ですぅ……♡」`},
    {name:'快活な訛り',first:'うち',    ex:'「〜ですやん」「〜しますわ」',         intro:(m,r,n)=>`「${m}さまの${r}、${n}ですわ♡」`},
  ];
  const TRAITS=['気が利く','世話好き','負けず嫌い','恥ずかしがり','甘えたがり','生真面目','お調子者','寡黙','やきもち焼き','好奇心旺盛','おおらか','几帳面','涙もろい','意地っ張り','面倒見がよい','褒められると弱い'];

  // --- 補佐人員 ---
  const STAFF_ROLES={
    HP:['測量士','水利担当','土木技師','農政官','記録係','現場監督','護衛','連絡員'],
    MP:['神官','儀式補助','供物管理','薬草係','治療助手','受付','書記','護衛'],
    ATK:['斥候','兵士','封印具管理','地図係','治療員','回収班','情報分析役','連絡員'],
    DEF:['護衛兵','交代警備員','警備計画担当','輸送担当','装備係','連絡員','治療員'],
    INT:['典礼官','進行係','神具係','衣装係','書記','侍女','楽士','会場管理'],
    SPD:['案内人','護衛','馬車担当','書記','地方連絡役','宿泊手配','荷物係','治療員'],
    DEX:['職人','工房助手','材料管理','品質検査','会計','運搬員','警備','発注担当'],
  };
  const KIN_ROLES=['側近','書記','侍女','会計','連絡役','護衛','装備係'];
  const KIN_RELATIONS=['姉','妹','兄','弟','従姉','従妹','従兄','従弟','叔母','叔父','姪','甥','一族の家人'];
  const STAFF_ORIGINS=['神殿','王家','地方官庁','軍','工房','施療院'];
  const STAFF_SURNAMES=['佐伯','三輪','久保','宮下','小野寺','新田','望月','杉浦','堀内','千葉','大槻','野々村','宇野','川端','秋山','真田','広瀬','藤枝','古賀','畑中','白石','長谷','石動','早川','国見','柳田','有馬','菅原','竹内','笹本'];
  const STAFF_GIVEN_M=['弥平','宗助','健吾','慎之介','与一','孝蔵','直人','源太','清十郎','亮','恭平','朔','耕作','誠一','伊織'];
  const STAFF_GIVEN_F=['千代','いと','ふみ','さよ','はる','結','楓','初音','志乃','葵','みのり','咲','雪','澪','節'];

  // --- 体つき：主（巫女）の値を中心に、一人ひとりばらける ---
  // 物差しは miko-traits.js と同じ（豊満度＝バスト＋ヒップ−ウエスト×0.5）。
  function volLv(b){const sc=b.bust+b.hip-b.waist*0.5;return sc>=215?4:sc>=195?3:sc>=170?2:1;}
  const VOL_LABEL=['','並','ふくよか','豊満','絶豊満'];
  const SCENT=['','ほのかに甘い','甘く匂い立つ','濃厚に甘く漂う','むせ返るほど甘い'];
  const MEIKI=['','並','上物','絶品','比類なき名器'];
  const MILK=['','さらりと甘い','甘く濃い','とろりと濃厚','蜜のごとく濃厚甘美'];
  const AROUSAL=['','強め','かなり強い','底なし','淫乱','淫獣','発情狂い'];
  const VOICES=['甘く高い鼻にかかった声','鈴を転がすような澄んだ声','とろりと甘く絡みつく声','低くかすれた色っぽい声','けたたましく響く大声','必死に押し殺す忍び声','すぐ泣きじゃくる涙声','とめどなく淫語を垂れ流す声'];
  const BREAST_SHAPES=['お椀型','釣鐘型','砲弾型','ロケット型','たわわに垂れかけた釣鐘型'];
  function masterArousal(p){   // miko-traits.js の arousalLv と同じ式
    const g=p.generation||1;
    const gTier=g>=25?5:(g>=15?4:(g>=8?3:(g>=3?2:1)));
    return Math.max(1,Math.min(6,gTier+((p.id*31+6*17)%3-1)));
  }
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

  function isAdultMiko(p){return p&&p.age>=20;}
  function isOutsider(p){return !!(p.origin&&p.origin.indexOf('公募')>=0);}

  // --- 生成 ---
  const cache=new Map();
  function retinueOf(p){
    if(!isAdultMiko(p))return null;
    const key=gameSeed()+':'+p.id+':'+GENERATOR_VERSION+':'+p.family;   // 分派で家名が変わったら作り直す（顔ぶれ自体は同じ）
    if(cache.has(key))return cache.get(key);
    const r=rng(hashSeed('retinue',GENERATOR_VERSION,gameSeed(),p.id));
    const outsider=isOutsider(p);
    const master=p.given;

    // 膣穴衆13人
    const givenPool=r.shuffle(GIVEN_NAMES);
    const attendants=ROLES13.map((role,i)=>{
      const sur=r.pick(SURNAMES);
      const given=givenPool[i];
      let age;
      if(outsider)age=r.int(18,40);                               // 御子宮殿からの配属
      else age=Math.max(18,p.age+r.int(-2,4));                    // 寮でともに育った幼馴染
      const mb=p.body||{height:160,bust:100,waist:60,hip:100};
      let height=clamp(mb.height+r.int(-8,8),142,180),bust=clamp(mb.bust+r.int(-10,10),70,140),waist=clamp(mb.waist+r.int(-5,5),50,80),hip=clamp(mb.hip+r.int(-10,10),80,140);
      if(role.key==='guard')height+=r.int(3,7);
      if(role.key==='nurse')bust+=r.int(3,6);
      if(role.key==='dance')hip+=r.int(3,6);
      const bodyNow={height,bust,waist,hip};
      const vl=volLv(bodyNow);
      const mLv=volLv(mb);
      const meikiLv=clamp(mLv+r.int(-1,1),2,4);              // 膣穴衆はどれも名器（最低でも上物）
      const arLv=clamp(masterArousal(p)+r.int(-1,1),1,6);
      const tone=r.pick(TONES);
      const traits=r.shuffle(TRAITS).slice(0,2);
      const name=sur[0]+given;
      return{
        role:role.title,duty:role.duty,
        surname:sur[0],surnameReading:sur[1],given,name,
        age,hair:r.pick(HAIR),
        body:bodyNow,
        clitorisMm:Math.max(6,Math.round(8+((6+((p.generation||1)-1))-8)*0.6)+r.int(-2,2)),   // 主の陰核（6+(世代−1)mm）との差を6割に縮め±2mm
        voluptuousness:VOL_LABEL[vl],
        breastShape:vl>=3?(r.next()<.7?'垂れぬ砲弾型':'ロケット型'):r.pick(BREAST_SHAPES),
        scent:SCENT[clamp(mLv+r.int(-1,1),1,4)],
        meiki:MEIKI[meikiLv],
        milk:MILK[clamp(mLv+r.int(-1,1),1,4)]+'・'+(bust>=100?'あふれるほど豊富':(bust>=88?'よく出る':'並の量')),
        arousal:AROUSAL[arLv],
        voice:r.pick(VOICES),
        tone:tone.name,firstPerson:tone.first,speech:tone.ex,
        traits,
        childhoodFriend:!outsider,
        concubine:false,
        introduction:tone.intro(master,role.title,name),
      };
    });
    // 末席は膣穴衆のなかでいちばん若い。
    const lastIdx=ROLES13.findIndex(x=>x.key==='last');
    const youngestOther=Math.min(...attendants.filter((_,i)=>i!==lastIdx).map(a=>a.age));
    attendants[lastIdx].age=Math.max(18,Math.min(attendants[lastIdx].age,youngestOther-1));
    // 膣選びの儀で選ばれた膣妾（2〜5人）
    const nConc=r.int(2,5);
    r.shuffle(attendants.map((_,i)=>i)).slice(0,nConc).forEach(i=>{attendants[i].concubine=true;});

    // 補佐人員10〜20人（うち一族の家人3〜8人。公募出身は0〜2人）
    const total=r.int(10,20);
    const nKin=outsider?r.int(0,2):Math.min(total,r.int(3,8));
    const roleKey=(typeof rank==='function'&&p.maxStats)?rank(p.maxStats)[0]:'MP';
    const pool=STAFF_ROLES[roleKey]||STAFF_ROLES.MP;
    const staff=[];
    const usedNames=new Set();
    for(let i=0;i<total;i++){
      const kinMember=i<nKin;
      const relation=kinMember?r.pick(KIN_RELATIONS):null;
      const male=relation?/兄|弟|叔父|甥/.test(relation)||(relation==='一族の家人'&&r.next()<.5):r.next()<.55;
      const surname=kinMember&&relation!=='一族の家人'?p.family:r.pick(STAFF_SURNAMES);
      const givens=male?STAFF_GIVEN_M:STAFF_GIVEN_F;
      let gi=Math.floor(r.next()*givens.length),name=surname+' '+givens[gi];
      for(let k=1;k<givens.length&&usedNames.has(name);k++)name=surname+' '+givens[(gi+k)%givens.length];   // 同じ氏名は避ける
      usedNames.add(name);
      let role=kinMember?r.pick(KIN_ROLES):r.pick(pool);
      if(male&&role==='侍女')role=kinMember?'側近':'書記';                                                   // 侍女は女性だけ
      staff.push({
        name,gender:male?'男':'女',
        age:kinMember&&/姪|甥|妹|弟/.test(relation)?r.int(18,Math.max(18,p.age+2)):r.int(20,58),
        role,
        origin:kinMember?`親類縁者（${relation}）`:r.pick(STAFF_ORIGINS),
      });
    }
    const result={generatorVersion:GENERATOR_VERSION,mikoId:p.id,attendants,staff};
    cache.set(key,result);
    return result;
  }
  function allRetinues(){
    return mikos.filter(isAdultMiko).map(p=>Object.assign({mikoName:full(p)},retinueOf(p)));
  }

  // --- 画面：巫女の詳細に表示 ---
  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function attendantLine(a){
    return `<div class="mt1"><b>${esc(a.name)}</b>（${esc(a.surnameReading)}）　${esc(a.role)}${a.concubine?'・<b>膣妾</b>':''}　<span class="muted">${a.age}歳・髪${esc(a.hair)}・身長${a.body.height}・B${a.body.bust}/W${a.body.waist}/H${a.body.hip}（${esc(a.voluptuousness)}・${esc(a.breastShape)}の胸）・名器度${esc(a.meiki)}・母乳${esc(a.milk)}・発情${esc(a.arousal)}・${esc(a.voice)}・雌の匂い${esc(a.scent)}・陰核${a.clitorisMm}mm・${esc(a.tone)}（一人称「${esc(a.firstPerson)}」）・${esc(a.traits.join('、'))}${a.childhoodFriend?'・幼馴染':'・御子宮殿より配属'}</span><div class="muted">${esc(a.introduction)}</div></div>`;
  }
  function retinueHtml(p){
    const rt=retinueOf(p);
    if(!rt)return '';
    const lead=rt.attendants.filter(a=>a.role==='付き人頭'||a.concubine);
    const rest=rt.attendants.filter(a=>!(a.role==='付き人頭'||a.concubine));
    let h='<h3>膣穴衆</h3>';
    h+=`<p class="muted">嫁入りに同行した膣穴衆13人。うち膣妾${rt.attendants.filter(a=>a.concubine).length}人。苗字は膣穴衆の家が代々受け継ぐ家名。</p>`;
    h+=lead.map(attendantLine).join('');
    h+=`<details class="mt2"><summary>ほかの膣穴衆（${rest.length}人）</summary>${rest.map(attendantLine).join('')}</details>`;
    h+=`<details class="mt2"><summary>直属の補佐人員（${rt.staff.length}人）</summary>`+
      rt.staff.map(s=>`<div class="mt1">${esc(s.name)}（${s.gender}・${s.age}歳）　${esc(s.role)}　<span class="muted">${esc(s.origin)}</span></div>`).join('')+'</details>';
    return h;
  }
  if(typeof renderDetail==='function'){
    const before=renderDetail;
    renderDetail=function(){
      before();
      try{
        const p=mikos.find(x=>x.id===selectedId);
        const box=document.getElementById('detail');
        if(!p||!box||!isAdultMiko(p))return;
        const sec=document.createElement('div');
        sec.className='space3';
        sec.innerHTML=retinueHtml(p);
        box.appendChild(sec);
      }catch(e){}
    };
  }

  window.MikoRetinue=Object.freeze({
    version:GENERATOR_VERSION,
    of:id=>{const p=mikos.find(x=>x.id===id);return p?retinueOf(p):null;},
    all:allRetinues,
  });
})();
