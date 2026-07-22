// 推移グラフ（v11）：大儀ごとの長期推移を別ログへ記録し、小型スパークラインで表示する。
// 既存の七年進行・一族計算・セーブ処理は変更せず、render とセーブ入出力を包んで拡張する。
(function(){
  if(typeof render!=='function')return;

  const MAXPTS=600;
  const SERIES=[
    {key:'godLevel',   label:'神レベル',   fmt:v=>'Lv'+v,  light:'#8b5e3c', dark:'#c59067'},
    {key:'reputation', label:'国家評判',   fmt:v=>String(v), light:'#3f7d6e', dark:'#63b9a5'},
    {key:'kinTotal',   label:'親類縁者',   fmt:v=>v+'人',  light:'#5a6fb0', dark:'#8aa0e0'},
    {key:'avgLevel',   label:'成人平均Lv', fmt:v=>'Lv'+v,  light:'#a5628a', dark:'#d38fb5'}
  ];

  let log=[];
  let lastYear=null;
  let panels=null;
  let trendView='all';          // 'all'＝全時代 / 'recent'＝直近100年（14回）
  const RECENT_POINTS=14;

  function adultAvgLevel(){
    const adults=mikos.filter(p=>p.age>=20);
    if(!adults.length)return 0;
    return Math.round(adults.reduce((n,p)=>n+level(p),0)/adults.length);
  }
  function snapshot(){
    const top=(typeof clanData==='function'&&clanData()[0])||null;
    return{
      year,
      godLevel,
      reputation:reputation(),
      kinTotal:totalKin(),
      mikoCount:mikos.length,
      avgLevel:adultAvgLevel(),
      topClanCount:top?top.count:0,
      shinra:shinraMikos.length
    };
  }
  function record(){
    if(lastYear===year)return false;
    log.push(snapshot());
    if(log.length>MAXPTS)log=log.slice(log.length-MAXPTS);
    lastYear=year;
    return true;
  }

  // 既存セーブからの復元（trend.js は save.js の loadLatestSave() より後に読み込まれるため直接参照する）
  try{
    const raw=localStorage.getItem('mikoGameSave_latest');
    if(raw){
      const data=JSON.parse(raw);
      if(Array.isArray(data.trendLog)&&data.trendLog.length){
        log=data.trendLog.slice(-MAXPTS);
        lastYear=log[log.length-1].year;
      }
    }
  }catch(e){/* 破損時は無視して現状から記録を始める */}

  // セーブへ推移ログを追記して永続化する
  if(typeof buildSaveData==='function'){
    const buildBefore=buildSaveData;
    buildSaveData=function(){
      const data=buildBefore();
      data.trendLog=log;
      return data;
    };
  }
  if(typeof restoreSaveData==='function'){
    const restoreBefore=restoreSaveData;
    restoreSaveData=function(raw){
      let parsed=null;
      try{parsed=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){parsed=null;}
      if(parsed&&Array.isArray(parsed.trendLog)){
        log=parsed.trendLog.slice(-MAXPTS);
        lastYear=log.length?log[log.length-1].year:null;
      }
      restoreBefore(raw); // 内部で render() を呼ぶため、下の描画も走る
    };
  }

  const renderBeforeTrend=render;
  render=function(){
    renderBeforeTrend();
    record();
    drawTrends();
  };

  // 表示 -------------------------------------------------------------
  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function isDark(){
    const t=document.documentElement.getAttribute('data-theme');
    if(t==='dark')return true;
    if(t==='light')return false;
    return !!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function color(s){return isDark()?s.dark:s.light;}
  function hexA(hex,a){
    const m=hex.replace('#','');
    const r=parseInt(m.slice(0,2),16),g=parseInt(m.slice(2,4),16),b=parseInt(m.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function initPanels(){
    const host=document.getElementById('trendPanels');
    if(!host)return;
    host.innerHTML=SERIES.map(s=>`<div class="metric">
      <div class="flex center between gap2"><span class="muted">${s.label}</span><span class="stats" style="font-size:1.15rem" data-cur="${s.key}">—</span></div>
      <canvas data-canvas="${s.key}" class="full" style="display:block;height:96px;margin-top:8px"></canvas>
      <div class="muted" data-meta="${s.key}">記録なし</div>
    </div>`).join('');
    panels=SERIES.map(s=>({
      s,
      canvas:host.querySelector(`[data-canvas="${s.key}"]`),
      cur:host.querySelector(`[data-cur="${s.key}"]`),
      meta:host.querySelector(`[data-meta="${s.key}"]`)
    }));
  }

  function drawSparkline(canvas,vals,col){
    if(!canvas)return;
    const dpr=window.devicePixelRatio||1;
    const cssW=canvas.clientWidth||(canvas.parentElement&&canvas.parentElement.clientWidth)||280;
    const cssH=canvas.clientHeight||96;
    canvas.width=Math.round(cssW*dpr);
    canvas.height=Math.round(cssH*dpr);
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);

    const padX=6,padTop=8,padBot=10;
    const w=cssW-padX*2,h=cssH-padTop-padBot;

    ctx.strokeStyle=cssVar('--border')||'#ccc';
    ctx.lineWidth=1;ctx.globalAlpha=.6;
    ctx.beginPath();ctx.moveTo(padX,cssH-padBot+0.5);ctx.lineTo(cssW-padX,cssH-padBot+0.5);ctx.stroke();
    ctx.globalAlpha=1;

    if(!vals.length)return;
    if(vals.length===1){
      const x=padX+w/2,y=padTop+h/2;
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();
      return;
    }

    let mn=Math.min(...vals),mx=Math.max(...vals);
    if(mn===mx){mn-=1;mx+=1;}
    const X=i=>padX+w*i/(vals.length-1);
    const Y=v=>padTop+h*(1-(v-mn)/(mx-mn));

    const grad=ctx.createLinearGradient(0,padTop,0,padTop+h);
    grad.addColorStop(0,hexA(col,.28));
    grad.addColorStop(1,hexA(col,0));
    ctx.beginPath();ctx.moveTo(X(0),cssH-padBot);
    vals.forEach((v,i)=>ctx.lineTo(X(i),Y(v)));
    ctx.lineTo(X(vals.length-1),cssH-padBot);ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();

    ctx.beginPath();
    vals.forEach((v,i)=>{const x=X(i),y=Y(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

    const ex=X(vals.length-1),ey=Y(vals[vals.length-1]);
    ctx.fillStyle=cssVar('--card')||'#fff';ctx.beginPath();ctx.arc(ex,ey,4.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();
  }

  function initViewToggle(){
    const host=document.getElementById('trendPanels');
    if(!host||document.getElementById('trendViewToggle'))return;
    const bar=document.createElement('div');
    bar.id='trendViewToggle';
    bar.className='flex gap2';
    bar.style.marginBottom='8px';
    bar.innerHTML='<button type="button" data-view="all" class="btn">全時代</button>'
      +'<button type="button" data-view="recent" class="btn">100年（14回）</button>';
    host.insertAdjacentElement('beforebegin',bar);
    bar.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
      trendView=b.dataset.view;
      drawTrends();
    }));
  }

  function drawTrends(){
    if(!panels)return;
    const view=trendView==='recent'?log.slice(-RECENT_POINTS):log;

    const toggle=document.getElementById('trendViewToggle');
    if(toggle)toggle.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('primary',b.dataset.view===trendView));

    const range=document.getElementById('trendRange');
    if(range)range.textContent=view.length
      ?`${trendView==='recent'?'直近':'全'} ${view[0].year}〜${view[view.length-1].year}年・${view.length}点`
      :'記録なし';

    panels.forEach(({s,canvas,cur,meta})=>{
      const vals=view.map(p=>p[s.key]);
      if(cur)cur.textContent=vals.length?s.fmt(vals[vals.length-1]):'—';
      if(meta)meta.textContent=vals.length?`最小 ${s.fmt(Math.min(...vals))}／最大 ${s.fmt(Math.max(...vals))}`:'記録なし';
      drawSparkline(canvas,vals,color(s));
    });
  }

  initPanels();
  initViewToggle();
  record();
  drawTrends();

  window.addEventListener('resize',drawTrends);
  if(window.matchMedia){
    const mq=matchMedia('(prefers-color-scheme: dark)');
    if(mq.addEventListener)mq.addEventListener('change',drawTrends);
  }
  if(window.MutationObserver){
    new MutationObserver(drawTrends).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
})();
