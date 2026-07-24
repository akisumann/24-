// 活躍の物語生成（v16）：各巫女の役務・スキル・能力・立場・一族から、
// 国の中でどう働いてきたかを物語文で組み立て、詳細画面に表示する。
// renderDetail を包むだけの非侵襲モジュール。乱数は使わず巫女データから決める。
(function(){
  if(typeof renderDetail!=='function')return;

  const STAT_JP={HP:'体力',MP:'魔力',ATK:'攻撃力',DEF:'守り',INT:'知識',SPD:'速さ',DEX:'器用さ'};

  // 役務ごとの、国の中での活躍の場と具体的な働き
  const ROLE_ACT={
    HP:{field:'地鎮と国土',deeds:['荒れた土地を鎮めて田畑を蘇らせ','地脈の乱れをいち早く察して災いを未然に防ぎ','開墾や普請の現場で人並み外れた力を振るい']},
    MP:{field:'祈祷と神事',deeds:['神託を受けて大小の神事を執り行い','病める者へ癒やしの祈りを捧げ','里を囲う結界を長く保ち']},
    ATK:{field:'討魔と辺境',deeds:['辺境に現れた魔物を討ち','街道を脅かす邪霊を祓い','魔獣の群れを追って国境を守り']},
    DEF:{field:'守護',deeds:['要人の身辺を固く守り','神殿と結界を破られぬよう支え','危急の場で身を挺して仲間を庇い']},
    INT:{field:'典儀と学識',deeds:['複雑な儀式を滞りなく差配し','神力の流れを読んで神殿を設計し','散逸した記録を整えて後進を導き']},
    SPD:{field:'巡行と伝令',deeds:['遠国まで巡行して各地を結び','急を告げる伝令を誰より速く届け','危地を先んじて探り味方の道を拓き']},
    DEX:{field:'奉工と制作',deeds:['神具を精緻に仕上げ','祭服や供物を美しく整え','封魔具を作って各地の守りに供し']}
  };

  function stageWord(age){
    if(age===13)return'見習いの仮巫女として';
    if(age===20)return'若き正式巫女として';
    if(age===27)return'中堅として';
    if(age===34)return'古参として';
    return'正式巫女として';
  }

  function isLeaderOf(p,role){
    const grp=(assignments().groups[role])||[];
    if(!grp.length)return false;
    const top=[...grp].sort((a,b)=>b.stats[role]-a.stats[role])[0];
    return !!top&&top.person.id===p.id;
  }
  function isRitualMother(p){
    if(p.age<20||p.age>34)return false;
    const mothers=mikos.filter(x=>x.age>=20&&x.age<=34)
      .sort((a,b)=>avg(b.maxStats)-avg(a.maxStats)).slice(0,10);
    return mothers.some(m=>m.id===p.id);
  }
  function isShinra(p){return shinraMikos.some(s=>s.id===p.id);}

  function activityStory(p){
    const clanCount=mikos.filter(x=>x.family===p.family).length;

    if(p.age<13){
      const topStat=rank(p.maxStats)[0];
      let s=`${p.given}はまだ幼く、${p.family}一族のもとで巫女としての修練を始めたばかりだ。`
        +`国への務めはこれからだが、${STAT_JP[topStat]}に秀でた素質を早くも覗かせている。`;
      const theme=window.MikoEra&&MikoEra.theme();
      if(theme)s+=`${theme}のただ中に生を受けた世代である。`;
      return s;
    }

    const role=roleOf(p)||rank(current(p))[0];
    const a=ROLE_ACT[role];
    const deed=a.deeds[p.id%a.deeds.length];
    const skill=p.skills.find(s=>s.stat===role)||p.skills[0];

    let s=`${full(p)}は${a.field}を担う${ROLES[role]}として、${stageWord(p.age)}${deed}、国に尽くしてきた。`;
    if(skill)s+=`とりわけ《${skill.name}》に長け、${skill.effect}`;

    if(isShinra(p)){
      s+=`かつて神を一段と成長させた神羅巫女であり、その功績は国史に刻まれている。`;
    }else if(isRitualMother(p)){
      s+=`いまや大淫義で神の娘を産む母に選ばれるほどの実力者と目されている。`;
    }

    if(isLeaderOf(p,role)){
      s+=`現在は${ROLES[role]}の巫女長として同輩を率いる。`;
    }

    if(clanCount>=3){
      s+=`${p.family}一族は現役${clanCount}人を擁し、その一門の中心にある。`;
    }

    // その時代の需要（上位2役務）と、本人の役割の噛み合いを織り込む
    const theme=window.MikoEra&&MikoEra.theme();
    if(theme){
      if(MikoEra.isInDemand(role)){
        s+=`折しも${theme}にあって、その働きはいま国が最も求めるものと重なっている。`;
      }else{
        s+=`いまは${theme}。時流の中心ではないが、${ROLES[role]}の務めは欠かせぬものとして国を下支えしている。`;
      }
    }
    return s;
  }

  const renderDetailBeforeChronicle=renderDetail;
  renderDetail=function(){
    renderDetailBeforeChronicle();
    const p=mikos.find(x=>x.id===selectedId);
    const box=document.getElementById('detail');
    if(!p||!box)return;
    const sec=document.createElement('div');
    sec.innerHTML=`<h3>国での活躍</h3><p class="mt1">${activityStory(p)}</p>`;
    box.appendChild(sec);
  };
})();
