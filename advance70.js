const advance70Button=document.getElementById('advance70');

advance70Button.addEventListener('click',()=>{
  if(advance70Button.disabled)return;
  advance70Button.disabled=true;
  for(let i=0;i<10;i++)runTurn();
  advance70Button.disabled=false;
});
