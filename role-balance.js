// 役務の上限撤廃＋役務バランス寸評（試作）。
// 固定版のコードは書き換えず、assignments と役務表示を上書き／ラップする。
// このファイルを外せば定員6人の再分配（固定版の挙動）に戻る。
(function(){
  if(typeof assignments!=='function'||typeof render!=='function')return;

  // 1) 役職の上限を撤廃：各巫女を第一適性へそのまま配属する（再分配なし）。
  assignments=function(){
    const workers=mikos.filter(p=>p.age>=13).map(p=>{
      const stats=current(p);
      return{person:p,stats,prefs:rank(stats),role:null};
    });
    const groups=Object.fromEntries(STATS.map(s=>[s,[]]));
    workers.forEach(w=>{w.role=w.prefs[0];groups[w.role].push(w);});
    return{workers,groups};
  };

  // 役務ごとの、国全体としての傾き
  const ROLE_TENDENCY={
    HP:'国土と土地の安定に厚い',
    MP:'神事と祈りに厚い',
    ATK:'武と討伐に厚い',
    DEF:'守りに厚い',
    INT:'学識と儀礼に厚い',
    SPD:'機動と連絡に厚い',
    DEX:'制作と技術に厚い'
  };

  // 2) 表示の「/6」「定員6人」を上限なし表記へ、説明文も更新する。
  const renderRolesBefore=renderRoles;
  renderRoles=function(){
    renderRolesBefore();
    const box=document.getElementById('roles');
    if(box)box.querySelectorAll('.badge').forEach(b=>{
      b.textContent=b.textContent.replace(/^(\d+)\/6$/,'$1人');
    });
    renderRoleBalance();
  };

  const renderRoleMembersBefore=renderRoleMembers;
  renderRoleMembers=function(){
    renderRoleMembersBefore();
    const box=document.getElementById('roleMembers');
    if(!box||box.classList.contains('hidden'))return;
    const p=box.querySelector('p.muted');
    if(p)p.textContent=p.textContent.replace('定員6人','上限なし');
  };

  // 3) 「〇〇の役職が多い」寸評
  function ensureBalanceEl(){
    let el=document.getElementById('roleBalance');
    if(el)return el;
    const rolesEl=document.getElementById('roles');
    if(!rolesEl)return null;
    el=document.createElement('div');
    el.id='roleBalance';
    el.className='callout mt2';
    rolesEl.insertAdjacentElement('afterend',el);
    return el;
  }
  function renderRoleBalance(){
    const el=ensureBalanceEl();
    if(!el)return;
    const g=assignments().groups;
    const counts=STATS.map(s=>({role:s,n:g[s].length})).sort((a,b)=>b.n-a.n||STATS.indexOf(a.role)-STATS.indexOf(b.role));
    const total=counts.reduce((n,c)=>n+c.n,0);
    if(!total){el.textContent='役務に就く巫女がまだいない。';return;}
    const top=counts[0],low=counts[counts.length-1];
    const avg=total/STATS.length;

    let s=`巫女団は<b>${ROLES[top.role]}</b>が最も多く（${top.n}人）、いまの国は${ROLE_TENDENCY[top.role]}。`;
    if(top.n>=avg*1.6)s+=`役務がかなり偏っている。`;
    if(low.n===0)s+=` 一方、<b>${ROLES[low.role]}</b>を担う者は不在で、その分野は手薄だ。`;
    else if(low.n<=Math.max(1,Math.round(avg*0.5)))s+=` 一方、<b>${ROLES[low.role]}</b>は手薄（${low.n}人）。`;
    el.innerHTML=s;
  }

  // 説明文を上限撤廃に合わせて更新
  const rolesEl=document.getElementById('roles');
  const card=rolesEl&&rolesEl.closest('.card');
  const desc=card&&card.querySelector('p.muted');
  if(desc)desc.textContent='各巫女を第一適性へそのまま配属する（役務の上限は撤廃中）。';

  render();
})();
