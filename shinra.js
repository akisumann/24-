function renderShinraMikos(){
  const god=document.getElementById('godLevel');
  const count=document.getElementById('shinraCount');
  const box=document.getElementById('shinraMikos');
  if(god)god.textContent=`Lv${godLevel}`;
  if(count)count.textContent=`${shinraMikos.length}件`;
  if(!box)return;
  box.innerHTML=shinraMikos.length
    ?shinraMikos.map((s,i)=>`<div class="node">
      <div class="flex wrap center between gap2">
        <div class="medium">第${shinraMikos.length-i}代記録・${s.name}</div>
        <span class="badge">神羅巫女</span>
      </div>
      <div class="muted">${s.year}年目・${s.age}歳・当時Lv${s.level}</div>
      <div class="mt1">神レベル Lv${s.fromGodLevel} → Lv${s.toGodLevel}</div>
      <div class="muted">${s.family}一族の功績として記録され、国家・神殿・巫女院から讃えられた。</div>
    </div>`).join('')
    :'<p class="muted">神羅巫女はまだ現れていない。</p>';
}

const renderBeforeShinra=render;
render=function(){
  renderBeforeShinra();
  renderShinraMikos();
};

renderShinraMikos();