// 設定由来の特徴（表示のみ）：巫女の体型・一族・favored などの既存データから、
// 世界設定（豊満さ＝神の血の濃さ、砲弾型の胸、雌の匂い、名器、屈服欲、御種衣の役務色、大寵愛）を
// 導出して詳細画面へ表示する。乱数もゲームロジックも一切触れない非侵襲モジュール。
// 未成年（＜20歳＝国家育成対象）は境界を守り、性的な特徴を出さず育成対象の注記にとどめる。
(function(){
  if(typeof renderDetail!=='function')return;

  // 御種衣の差し色（役務色）
  const ROLE_COLOR={HP:'深緑・土色',MP:'淡青・白銀',ATK:'赤・黒',DEF:'紺・金',INT:'紫・金',SPD:'青緑・薄青',DEX:'橙・銅色'};

  // 豊満度：バスト＋ヒップ−ウエスト×0.5（大寵愛の判定と同じ指標）。閾値は現行データ分布に合わせる。
  function volOf(b){
    const score=b.bust+b.hip-b.waist*0.5;
    if(score>=215)return{lv:4,label:'絶豊満'};
    if(score>=195)return{lv:3,label:'豊満'};
    if(score>=170)return{lv:2,label:'ふくよか'};
    return{lv:1,label:'並'};
  }
  // 神の血の濃さ（目安）：豊満さ＝血筋の濃さの印、という設定に沿い、豊満度そのものを指標にする。
  function bloodOf(vol){
    const label=['','薄い（外部の血か新しい血筋）','中','濃い','極めて濃い'][vol.lv];
    return{lv:vol.lv,label};
  }
  const SCENT=['','ほのかに甘い','甘く匂い立つ','濃厚に甘く漂う','むせ返るほど甘い'];
  const MEIKI=['','並','上物','絶品','比類なき名器'];
  // 母乳：世代（血の濃さ）で味と濃さが増す。量は豊満さ（乳の大きさ）で決まる。
  const MILK=['','さらりと甘い','甘く濃い','とろりと濃厚','蜜のごとく濃厚甘美'];
  function milkFlow(b){return b.bust>=100?'あふれるほど豊富':(b.bust>=88?'よく出る':'並の量');}
  // 発情の強さ：巫女は総じて強い。最下でも「強め」で、世代で底上げしつつid基準の個体差で
  // 同世代でも±1ブレる（1〜6）。上位ほど理性より欲が勝つ。
  const AROUSAL=['','強め','かなり強い','底なし','淫乱','淫獣','発情狂い'];
  const AROUSAL_NOTE=['',
    '濡れやすく、夜ごと夫を欲しがる。御種衣をまとえば自然と発情する。',
    '少し気を抜けばすぐ発情し、我慢が利きにくい。日中も太腿をすり合わせる。',
    '四六時中疼き、濡らし乳を漏らす。相手なしでは平静を保ちがたく、夫を毎晩貪る。',
    '常に濡れそぼり、隙あらば誰かを求める。一晩では到底鎮まらない。',
    '理性より欲が勝り、盛りのついた獣のように相手へ絡みつく。抱かれぬ時間が苦しい。',
    '種を求めて我を失うほど。四六時中よがり、いくら注がれても足りない。'];
  function arousalLv(p){
    const g=p.generation||1;
    const gTier=g>=25?5:(g>=15?4:(g>=8?3:(g>=3?2:1)));   // 世代で底上げ（1〜5）
    return Math.max(1,Math.min(6,gTier+(hp(p.id,6,3)-1)));  // 個体差 ±1（1〜6）
  }
  // 声：地声の個性（id個体差・8種）と、乱れたときの濃さ（発情レベル連動・6段階）。
  const VOICE_TONE=['','甘く高い鼻にかかった声','鈴を転がすような澄んだ声','舌足らずでたどたどしい声','低くかすれた色っぽい声','けたたましく響く大声','必死に押し殺す忍び声','すぐ泣きじゃくる涙声','とめどなく淫語を垂れ流す声'];
  function voiceTone(p){return VOICE_TONE[1+hp(p.id,7,VOICE_TONE.length-1)];}
  const VOICE_DISORDER=['','声を抑えめに漏らす','素直に喘ぎを漏らす','甘く啼いて乱れる','あられもなく喘ぎ通す','淫語混じりに啼き狂う','淫語を垂れ流して絶叫する'];
  // 陰核は「実際の世代数」で決まる正確な指標。1世代目（初期採用・一般公募）＝6mm固定、
  // 以降は1世代ごとに+1mm。大きさを見れば何世代目かが一意にわかる。感度も世代で鋭くなる。
  // 節目：5世代=10mmで生涯わずかに突出／10世代=15mmで明確に突出（並の下着不可）／
  //       15世代=20mmでかなり肥大（つままれるだけで腰砕け）。
  const CLIT_SENS=['','敏感','鋭敏','過敏','掠めるだけで達するほど過敏'];
  function clitMm(gen){return 6+(Math.max(1,gen)-1);}
  function clitSens(gen){return CLIT_SENS[Math.min(Math.max(1,gen),CLIT_SENS.length-1)];}
  // 婚姻と夫との実子（決定論的・id基準、乱数は一切消費しない）。
  // 早ければ20歳・遅くとも27歳で全員結婚。夫との子：20歳0〜1／〜27で+1〜3／〜34で+1〜3。
  function hp(id,salt,mod){return (id*31+salt*17)%mod;}
  function earlyMarried(p){return hp(p.id,1,5)<3;}                 // 約6割が20歳で既婚
  function isMarried(p){return p.age>=27||earlyMarried(p);}         // 27歳以降は例外なく夫あり
  function kidsByHusband(p){
    let n=0;
    if(p.age>=20&&earlyMarried(p))n+=hp(p.id,2,2);                 // 20歳までに0〜1（早婚のみ）
    if(p.age>=27)n+=1+hp(p.id,3,3);                                // 〜27で+1〜3
    if(p.age>=34)n+=1+hp(p.id,4,3);                                // 〜34で+1〜3
    return n;
  }
  function clitStage(gen){
    if(gen>=35)return'・小陰茎化（自ら擦り続けねば疼きに耐えられぬ）';
    if(gen>=30)return'・歩くだけで揺れて絶頂';
    if(gen>=25)return'・吹く風にも反応して疼く';
    if(gen>=20)return'・常にひくつき、触れられるだけで喘ぐ';
    if(gen>=15)return'・かなり肥大（つままれるだけで腰砕け）';
    if(gen>=10)return'・明確に突出（並の下着は刺激で穿けない）';
    if(gen>=5)return'・生涯わずかに突き出たまま';
    return'';
  }

  // 性への構え：最高能力を「挑み方・得意」、最低能力を「崩れ方・弱み」として組み合わせ、
  // どちらも最終的に高い屈服欲へつなげる。乱数を使わず能力値だけで個体差を作る。
  const SEX_STRENGTH={
    HP:'尽きにくい体力で何度でも相手を求め、長く続くほど自ら深く絡みついていく。',
    MP:'言葉や雰囲気で互いの気持ちを高め、甘く酔わせるように相手を誘い込む。',
    ATK:'自ら激しく仕掛け、相手を押し切って主導権を奪おうとする。',
    DEF:'どれほど激しく求められても受け止め、長く耐えながらじっくり乱されることを好む。',
    INT:'相手の好みや反応を読み取り、言葉と触れ方を選んで巧みに悦ばせる。',
    SPD:'火がつけば迷わず飛び込み、勢いのまま何度も昂ぶりを重ねていく。',
    DEX:'細かな奉仕や触れ方に長け、相手を悦ばせることそのものに強い満足を覚える。'
  };
  const SEX_WEAKNESS={
    HP:'ただし長く続けば体力が先に尽き、余裕を失うほど相手へ縋りついてしまう。',
    MP:'ただし甘い言葉や熱い空気には抗えず、囁かれるだけで強がりより先に身体が蕩ける。',
    ATK:'ただし自分から強く出るのは不得手で、相手に導かれるほど素直に身体を預けていく。',
    DEF:'ただし本気で押し返されることには弱く、優位を奪われればたちまち身体から崩される。',
    INT:'ただし駆け引きは不得手で、感じたことも欲しいことも声と身体にそのまま表れてしまう。',
    SPD:'ただし火がつくまではゆっくりで、一度昂ぶれば長い余韻の中でいつまでも離れたがらない。',
    DEX:'ただし技巧は不器用で、夢中になるほど必死で大胆な動きになり、その拙さまで相手を煽る。'
  };
  const SEX_SUBMISSION={
    HP:'力が尽きるまで求め続けた末、抱き留められて何もできなくなるほど従わされることを望んでいる。',
    MP:'心まで甘く支配され、自分からもっと深く屈したいと願う瞬間に最も満たされる。',
    ATK:'強く抗うのも、最後にはその勢いごと完全に組み伏せられ、逆らえなくなるほど屈服させてもらうためである。',
    DEF:'耐え抜いた末に限界を越えさせられ、意地も強張りもすべて解かれて屈する瞬間を何より待ち望んでいる。',
    INT:'自分の読みも策も上回られ、考える余裕さえ奪われてただ従う側へ落とされることに深い悦びを覚える。',
    SPD:'勢いも呼吸も相手に奪われ、追いつけないまま何度も翻弄されて完全に従うことを求めている。',
    DEX:'相手を悦ばせ尽くしたあと、今度は自分の技も余裕も封じられ、隅々まで支配されることを願っている。'
  };
  function sexualAttitude(p){
    const ordered=rank(p.maxStats);
    const strongest=ordered[0],weakest=ordered[ordered.length-1];
    return SEX_STRENGTH[strongest]+SEX_WEAKNESS[weakest]+SEX_SUBMISSION[strongest];
  }

  // 淫技（エロスキル）：id 基準の決定論で選ぶ（乱数非消費）。成人のみ。
  // 巫女は負けたがりで屈服欲が高いため、一人あたり攻め1つ＋屈服2つを持つ。
  const ERO_ATTACK=[
    ['名器締め','挿れた相手を思うままに締め上げ、追い込む。'],
    ['吸茎','膣の蠕動で陰茎に吸いつき、離さず搾り取る。'],
    ['腰づかい','自ら腰を振り、相手の精を残らず引き出す。'],
    ['潮噴き','ひときわ勢いよく潮を高く吹き上げる。'],
    ['乳しぼり','胸を押し付け、滋養の乳をたっぷり飲ませる。'],
    ['口淫上手','舌と唇で念入りに奉仕し、相手を骨抜きにする。'],
    ['誘い腰','尻を振って相手の欲を的確に煽り立てる。'],
    ['おねだり','可愛くねだって相手の理性を溶かす。'],
    ['底なし','幾度果てても鎮まらず、求め続ける。'],
    ['屈服よがり','責められるほど深く感じ、あられもなく乱れる。'],
    ['淫語責め','淫らな言葉で相手をいっそう昂ぶらせる。'],
    ['締めどころ','相手が果てる寸前を見極めて追い込む。'],
    ['全身性感','どこを触られても濃く感じ取る。'],
    ['多重奉仕','複数の相手を同時に悦ばせる。'],
    ['神迎え上手','潮吹きの儀で、神を招く潮が濃く速い。'],
    ['クリ責め返し','育った陰核で相手を擦り立て、翻弄する。']
  ];
  const ERO_SUBMIT=[
    ['即堕ち','少し責められただけで、たやすく陥落する。'],
    ['泣き乱れ','感じすぎて涙をこぼしながら乱れきる。'],
    ['連続絶頂','一度達すると止まらず、続けざまに昇りつめる。'],
    ['従順よがり','命じられるまま従い、悦んで身を投げ出す。'],
    ['アヘ堕ち','理性を飛ばし、だらしなく蕩けきる。'],
    ['失神イキ','強すぎる絶頂に、気を失うほど追い上げられる。'],
    ['命乞い','もう許してと乞いながら、なお奥を欲しがる。'],
    ['種欲しがり','注がれることを強く求め、腰を押しつける。'],
    ['全開放','気位も強がりもかなぐり捨て、あられもなく晒す。'],
    ['マゾ悦び','責め苦や辱めを、かえって深い悦びに変える。'],
    ['腰砕け','崩れ落ちて、支えなしでは立てなくなる。'],
    ['甘え縋り','相手にしがみつき、離れられなくなる。'],
    ['屈服濡れ','組み伏せられるほど、激しく濡れそぼる。'],
    ['二穴堕ち','前も後ろも同時に責められ、なすすべなく落ちる。'],
    ['拘束悦','縛られ動けぬまま責められることに強く感じる。'],
    ['心まで明け渡し','身体だけでなく心まで支配されて満たされる。']
  ];
  function eroSkills(p){
    const atk=ERO_ATTACK[(p.id*17)%ERO_ATTACK.length];
    const sub=[],used=new Set();
    for(let i=0;i<2;i++){
      let n=(p.id*13+i*7)%ERO_SUBMIT.length;
      while(used.has(n))n=(n+1)%ERO_SUBMIT.length;
      used.add(n); sub.push(ERO_SUBMIT[n]);
    }
    return {atk,sub};
  }

  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

  function traitsHtml(p){
    const b=p.body;
    const clanCount=mikos.filter(x=>x.family===p.family).length;
    const role=roleOf(p)||rank(p.maxStats)[0];
    const color=ROLE_COLOR[role]||'';
    const roleName=(ROLES&&ROLES[role])||'役務未定';

    // 育成対象（未成年）：非性的な表示にとどめる。
    if(p.age<20){
      let h='<h3>設定由来の特徴</h3>';
      h+='<p class="mt1 muted">国家育成対象。年齢に応じた教育を受けて育つ段階であり、性的な特徴は成人後に現れる。</p>';
      h+=`<div class="mt1">御種衣：役務色 <b>${esc(color)}</b>（${esc(roleName)}）</div>`;
      if(clanCount>=3)h+=`<div class="mt1">${esc(p.family)}一族の血を引く（現役${clanCount}人）。豊満さや資質は将来の素質として見込まれる。</div>`;
      return h;
    }

    const vol=volOf(b);
    const blood=bloodOf(vol);
    const rocket=(b.bust>=100&&vol.lv>=3);

    const arLv=arousalLv(p);
    const gen=p.generation||1,cmm=clitMm(gen);

    let h='<h3>設定由来の特徴</h3>';
    h+='<div class="trait-badges">';
    h+=`<span class="badge">豊満度：${vol.label}</span>`;
    if(rocket)h+='<span class="badge">垂れぬ砲弾型の胸</span>';
    h+=`<span class="badge">神の血の濃さ：${blood.label}</span>`;
    if(p.favored)h+='<span class="badge">大寵愛の娘</span>';
    h+='</div>';

    h+='<div class="trait-grp"><div class="trait-grp-h">体つき</div>';
    h+=`<div>雌の匂い：<b>${SCENT[blood.lv]}</b>　／　名器度：<b>${MEIKI[blood.lv]}</b></div>`;
    h+=`<div>母乳：<b>${MILK[blood.lv]}</b>・${milkFlow(b)}（飲めば男を癒す滋養強壮の加護つき）</div>`;
    h+=`<div>陰核：<b>${cmm}mm</b>（${gen}世代目）${clitStage(gen)}　／　感度 <b>${clitSens(gen)}</b></div>`;
    h+='</div>';

    h+='<div class="trait-grp"><div class="trait-grp-h">淫らさ・反応</div>';
    h+=`<div>発情の強さ：<b>${AROUSAL[arLv]}</b>　<span class="muted">${AROUSAL_NOTE[arLv]}</span></div>`;
    h+=`<div>声：<b>${voiceTone(p)}</b>　／　乱れると<b>${VOICE_DISORDER[arLv]}</b></div>`;
    h+=`<div>性への構え：${sexualAttitude(p)}</div>`;
    h+='</div>';

    const es=eroSkills(p);
    h+='<div class="trait-grp"><div class="trait-grp-h">淫技（攻め1・屈服2）</div>';
    h+=`<div><span class="badge">攻</span>《${esc(es.atk[0])}》<span class="muted">${esc(es.atk[1])}</span></div>`;
    es.sub.forEach(s=>{h+=`<div><span class="badge">屈</span>《${esc(s[0])}》<span class="muted">${esc(s[1])}</span></div>`;});
    h+='</div>';

    h+='<div class="trait-grp"><div class="trait-grp-h">装い・立場</div>';
    h+=`<div>御種衣：役務色 <b>${esc(color)}</b>（${esc(roleName)}）。一枚布の生殖用装束で、身体を隠さず示す。</div>`;
    if((p.generation||1)===1&&hp(p.id,5,3)===0)h+=`<div class="muted">外部から入った身で御種衣にまだ慣れず、時折恥じらうことがある。</div>`;
    if(isMarried(p))h+=`<div>婚姻：<b>夫あり</b>　／　夫との実子 <b>${kidsByHusband(p)}人</b>（神の娘とは別）</div>`;
    else h+=`<div>婚姻：まだ独り身（遅くとも二十七までには嫁ぐ）　／　夫との実子 0人</div>`;
    if(clanCount>=4)h+=`<div class="muted">${esc(p.family)}一族は現役${clanCount}人の大氏族——神に長く愛され、豊満で濃い血を代々受け継いできた家門である。</div>`;
    h+='</div>';
    return h;
  }

  // 他モジュール（大淫義の対話ポップアップ等）からも同じ特徴ブロックを使えるよう公開。
  try{if(typeof window!=='undefined')window.MikoTraits={traitsHtml,volOf,clitMm,clitSens,clitStage};}catch(e){}

  try{
    const st=document.createElement('style');
    st.textContent=[
      '.trait-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
      '.trait-grp{margin-top:10px;padding-left:10px;border-left:2px solid var(--border)}',
      '.trait-grp-h{font-size:.75rem;color:var(--muted);letter-spacing:.06em;margin-bottom:3px}',
      '.trait-grp>div:not(.trait-grp-h){margin-top:3px;line-height:1.5}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
  }catch(e){}

  const before=renderDetail;
  renderDetail=function(){
    before();
    try{
      const p=mikos.find(x=>x.id===selectedId);
      const box=document.getElementById('detail');
      if(!p||!box)return;
      const sec=document.createElement('div');
      sec.className='space3';
      sec.innerHTML=traitsHtml(p);
      box.appendChild(sec);
    }catch(e){}
  };
})();
