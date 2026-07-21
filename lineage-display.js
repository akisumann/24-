const makeChildBeforeLineageDisplay=makeChild;
makeChild=function(mother){
  const motherLevelAtBirth=level(mother);
  const child=makeChildBeforeLineageDisplay(mother);
  child.motherLevel=motherLevelAtBirth;
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
    const motherLevel=Number.isFinite(person.motherLevel)
      ?`・当時Lv${person.motherLevel}`
      :'';
    originLine.textContent=`母親：${person.mother}${motherLevel}`;
  }else{
    originLine.textContent='出自：一般公募';
  }
};
