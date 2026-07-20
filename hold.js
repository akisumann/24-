const advanceButton=document.getElementById('advance');
let holdStartTimer=null;
let holdRepeatTimer=null;
let suppressNextClick=false;

function stopAdvanceHold(){
  if(holdStartTimer!==null){clearTimeout(holdStartTimer);holdStartTimer=null;}
  if(holdRepeatTimer!==null){clearInterval(holdRepeatTimer);holdRepeatTimer=null;}
}

advanceButton.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  stopAdvanceHold();
  suppressNextClick=false;
  if(advanceButton.setPointerCapture)advanceButton.setPointerCapture(event.pointerId);
  holdStartTimer=setTimeout(()=>{
    suppressNextClick=true;
    runTurn();
    holdRepeatTimer=setInterval(runTurn,300);
  },300);
});

['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
  advanceButton.addEventListener(type,()=>{
    stopAdvanceHold();
    setTimeout(()=>{suppressNextClick=false;},500);
  });
});

advanceButton.addEventListener('click',event=>{
  if(!suppressNextClick)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  suppressNextClick=false;
},true);

advanceButton.addEventListener('contextmenu',event=>event.preventDefault());
