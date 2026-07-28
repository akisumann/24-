// 系譜記録（非侵襲）：過去に生まれた全巫女を出生順に記録し続け、数百年ぶんの
// 母系図を復元できるようにする。ただの追記で乱数(srandom)は一切消費しない＝rngState不変。
// retirement.js（runTurn定義）より後、seed-repro.js（自動進行ループ）より前に読み込むこと。
(function(){
  if(typeof runTurn==='undefined'||typeof mikos==='undefined')return;
  if(!window.__lineage)window.__lineage=[];
  var lineage=window.__lineage, seen={};
  lineage.forEach(function(e){seen[e.id]=1;});

  function potOf(s){try{return Math.round(avg(s));}catch(e){return 0;}}
  function record(){
    for(var i=0;i<mikos.length;i++){
      var p=mikos[i];
      if(seen[p.id])continue;
      seen[p.id]=1;
      lineage.push({
        id:p.id,
        name:p.given,
        family:p.family,
        gen:p.generation||1,
        mother:(p.motherId!=null?p.motherId:null),
        pot:potOf(p.maxStats),
        born:(typeof year!=='undefined'?year:0)
      });
    }
  }

  record(); // 初期50人（year 0）

  // runTurn（ヘッドレスの自動進行が直接呼ぶ）と render（ブラウザのターン後に呼ばれる）の
  // 両方で記録する。record は seen で冪等なので二重でも安全。
  var _turn=runTurn;
  runTurn=function(){ _turn.apply(this,arguments); try{record();}catch(e){} };
  if(typeof render==='function'){ var _render=render; render=function(){ _render.apply(this,arguments); try{record();}catch(e){} }; }

  // セーブへ含める／ロードで復元。
  if(typeof buildSaveData==='function'){
    var _b=buildSaveData;
    buildSaveData=function(){ var s=_b.apply(this,arguments); s.lineage=window.__lineage; return s; };
  }
  if(typeof restoreSaveData==='function'){
    var _r=restoreSaveData;
    restoreSaveData=function(raw){
      var res=_r.apply(this,arguments);
      try{
        if(raw&&Array.isArray(raw.lineage)){
          lineage.length=0; seen={};
          raw.lineage.forEach(function(e){lineage.push(e);seen[e.id]=1;});
        }
      }catch(e){}
      return res;
    };
  }
})();
