const makeChildBeforeLineageDisplay=makeChild;
makeChild=function(mother){
  const motherPotentialLevel=Math.min(MAX_LEVEL,Math.round(avg(mother.maxStats)));
  const child=makeChildBeforeLineageDisplay(mother);
  child.motherPotentialLevel=motherPotentialLevel;
  return child;
};

const renderDetailBeforeLineageDisplay=renderDetail;
renderDetail=function(){
  renderDetailBeforeLineageDisplay();

  const person=mikos.find(p=>p.id===selectedId);
  const detail=document.getElementById('detail');
  if(!person||!detail)return;

  const originLine=[...detail.querySelectorAll('.muted')]
    .find(node=>node.textContent.trim().startsWith('母：'));
  if(!originLine)return;

  if(person.origin&&person.origin.startsWith('神の娘')){
    const motherPotentialLevel=Number.isFinite(person.motherPotentialLevel)
      ?`・潜在Lv${person.motherPotentialLevel}`
      :'';
    originLine.textContent=`母親：${person.mother}${motherPotentialLevel}`;
  }else{
    originLine.textContent='出自：一般公募';
  }
};
