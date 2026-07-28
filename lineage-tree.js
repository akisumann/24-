// 母系の系図（表示のみ・非侵襲）：window.__lineage（過去の全巫女の記録）から、
// 一族を選ぶとその一族の系図が初代→現役まで縦に伸びるツリーで見える。各ノードに潜在レベル。
// lineage-record.js が記録した履歴を使う。無ければ現役名簿から簡易生成。
(function(){
  if(typeof render!=='function')return;
  var selectedFam=null;

  function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}

  function getLineage(){
    var L=(window.__lineage&&window.__lineage.length)?window.__lineage:null;
    if(L)return L;
    // フォールバック：記録が無ければ現役から作る。
    if(typeof mikos==='undefined')return [];
    return mikos.map(function(p){return {id:p.id,name:p.given,family:p.family,gen:p.generation||1,mother:(p.motherId!=null?p.motherId:null),pot:Math.round((typeof avg==='function')?avg(p.maxStats):0),born:(typeof year!=='undefined'?year:0)};});
  }

  function build(){
    var box=document.getElementById('lineageTree');
    if(!box)return;
    var L=getLineage();
    if(!L.length){box.innerHTML='<p class="muted">まだ系譜の記録がありません。</p>';return;}

    // 現役idセット
    var live={}; if(typeof mikos!=='undefined')mikos.forEach(function(p){live[p.id]=1;});

    // 一族ごと
    var fams={};
    L.forEach(function(e){(fams[e.family]=fams[e.family]||[]).push(e);});
    var famNames=Object.keys(fams).sort(function(a,b){return fams[b].length-fams[a].length||a.localeCompare(b);});
    if(!selectedFam||!fams[selectedFam])selectedFam=famNames[0];

    // 一族ピッカー
    var picker='<div class="ltree-picker">'+famNames.map(function(f){
      var liveN=fams[f].filter(function(e){return live[e.id];}).length;
      return '<button type="button" class="ltree-fam'+(f===selectedFam?' on':'')+'" data-fam="'+esc(f)+'">'+esc(f)+'<span class="ltree-fam-n">'+fams[f].length+(liveN?'／現'+liveN:'')+'</span></button>';
    }).join('')+'</div>';

    // 選択一族のツリー
    var entries=fams[selectedFam];
    var byId={}; entries.forEach(function(e){byId[e.id]=e;});
    var childrenOf={},roots=[];
    entries.forEach(function(e){
      var m=(e.mother!=null&&byId[e.mother])?byId[e.mother]:null; // 同一族内に母がいれば子
      if(m){(childrenOf[m.id]=childrenOf[m.id]||[]).push(e);}
      else roots.push(e);
    });
    roots.sort(function(a,b){return (a.born||0)-(b.born||0)||(a.gen||1)-(b.gen||1)||a.id-b.id;});

    var gens=entries.map(function(e){return e.gen||1;});
    var gmin=Math.min.apply(null,gens),gmax=Math.max.apply(null,gens);
    var liveN=entries.filter(function(e){return live[e.id];}).length;
    var head='<div class="flex wrap center between gap2 mt2"><span class="medium">'+esc(selectedFam)+'一族の系図</span>'
      +'<span class="badge">総勢'+entries.length+'人・現役'+liveN+'人・'+(gmin===gmax?gmin+'世代':gmin+'〜'+gmax+'世代')+'</span></div>';

    box.innerHTML=picker+head+'<ul class="ltree">'+roots.map(function(r){return node(r,childrenOf,live);}).join('')+'</ul>';

    var cnt=document.getElementById('lineageTreeCount');
    if(cnt)cnt.textContent=famNames.length+'一族';
  }

  function node(e,childrenOf,live){
    var kids=(childrenOf[e.id]||[]).sort(function(a,b){return (a.born||0)-(b.born||0)||a.id-b.id;});
    var isLive=!!live[e.id];
    var cls='ltree-item'+(isLive?' live':'');
    var attr=isLive?' data-person="'+e.id+'" role="button" tabindex="0"':'';
    var status=isLive?'<span class="ltag live">現役</span>':'';
    var s='<li><span class="'+cls+'"'+attr+'>'
      +'<b>'+esc(e.name)+'</b>　'+(e.gen||1)+'世代目・潜在Lv'+(e.pot||0)
      +'<span class="ltree-born">'+(e.born||0)+'年生</span>'+status+'</span>';
    if(kids.length)s+='<ul class="ltree">'+kids.map(function(k){return node(k,childrenOf,live);}).join('')+'</ul>';
    return s+'</li>';
  }

  function injectStyle(){
    if(document.getElementById('ltree-style'))return;
    var st=document.createElement('style');st.id='ltree-style';
    st.textContent=[
      '#lineageTree .ltree-picker{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}',
      '#lineageTree .ltree-fam{font:inherit;color:var(--text);background:var(--chip);border:1px solid var(--border);border-radius:8px;padding:4px 8px;font-size:.82rem;cursor:pointer;display:inline-flex;gap:5px;align-items:center}',
      '#lineageTree .ltree-fam:hover{border-color:var(--accent)}',
      '#lineageTree .ltree-fam.on{background:var(--accent);color:var(--accentText);border-color:var(--accent);font-weight:650}',
      '#lineageTree .ltree-fam-n{opacity:.75;font-size:.72rem}',
      '#lineageTree .ltree{list-style:none;margin:0;padding-left:0}',
      '#lineageTree .ltree .ltree{margin-left:14px;padding-left:12px;border-left:1px solid var(--border)}',
      '#lineageTree .ltree li{position:relative;padding:3px 0}',
      '#lineageTree .ltree .ltree>li::before{content:"";position:absolute;left:-12px;top:15px;width:10px;border-top:1px solid var(--border)}',
      '#lineageTree .ltree-item{display:inline-block;padding:2px 8px;border:1px solid var(--border);border-radius:8px;background:var(--card);font-size:.88rem}',
      '#lineageTree .ltree-item.live{cursor:pointer;background:var(--chip)}',
      '#lineageTree .ltree-item.live:hover{border-color:var(--accent)}',
      '#lineageTree .ltree-born{opacity:.6;font-size:.74rem;margin-left:6px}',
      '#lineageTree .ltag{font-size:.7rem;padding:0 5px;border-radius:6px;margin-left:5px;color:#fff}',
      '#lineageTree .ltag.live{background:#2e7d32}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
  }

  function bindTap(){
    var box=document.getElementById('lineageTree');
    if(!box||box._ltBound)return; box._ltBound=true;
    box.addEventListener('click',function(e){
      var fam=e.target&&e.target.closest&&e.target.closest('.ltree-fam');
      if(fam){selectedFam=fam.getAttribute('data-fam');build();return;}
      var it=e.target&&e.target.closest&&e.target.closest('.ltree-item.live');
      if(it){var id=parseInt(it.getAttribute('data-person'),10);
        if(window.openMikoDetail)window.openMikoDetail(id);
        else{try{selectedId=id;if(typeof renderDetail==='function')renderDetail();}catch(_){}}}
    });
  }

  function run(){try{injectStyle();build();bindTap();}catch(e){}}
  var before=render;
  render=function(){before();run();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
