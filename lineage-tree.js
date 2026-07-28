// 母系の系図（表示のみ・非侵襲）：現役巫女を母系一族ごとに「木の枝」で描く。
// 母(p.mother=フルネーム文字列)が現役名簿にいれば娘をその下へ枝分かれさせ、
// いなければ generation（世代数）を根の深さの目安として並べる。乱数・ロジックは触らない。
(function(){
  if(typeof render!=='function'||typeof full!=='function')return;

  function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}

  function build(){
    var box=document.getElementById('lineageTree');
    if(!box||typeof mikos==='undefined')return;

    // フルネーム→人物（同名の曖昧さは最初の一人）。
    var byName={};
    mikos.forEach(function(p){var k=full(p); if(!byName[k])byName[k]=p;});
    function motherOf(p){
      if(!p.mother||p.mother==='—')return null;
      var m=byName[p.mother];
      return (m&&m.id!==p.id)?m:null;
    }
    // 一族ごとに集める。
    var fams={};
    mikos.forEach(function(p){(fams[p.family]=fams[p.family]||[]).push(p);});
    var famList=Object.keys(fams).map(function(f){return[f,fams[f]];})
      .sort(function(a,b){return b[1].length-a[1].length||a[0].localeCompare(b[0]);});

    var html='';
    famList.forEach(function(pair){
      var fam=pair[0],members=pair[1];
      var childrenOf={},roots=[];
      members.forEach(function(p){
        var m=motherOf(p);
        if(m&&m.family===fam){(childrenOf[m.id]=childrenOf[m.id]||[]).push(p);}
        else roots.push(p);
      });
      roots.sort(function(a,b){return (a.generation||1)-(b.generation||1)||b.age-a.age||a.id-b.id;});
      var gens=members.map(function(p){return p.generation||1;});
      var gmin=Math.min.apply(null,gens),gmax=Math.max.apply(null,gens);
      html+='<div class="node space2"><div class="flex wrap center between gap2">'
        +'<span class="medium">'+esc(fam)+'一族</span>'
        +'<span class="badge">現役'+members.length+'人・'+(gmin===gmax?gmin+'世代目':gmin+'〜'+gmax+'世代目')+'</span></div>'
        +'<ul class="ltree">'+roots.map(function(r){return node(r,childrenOf);}).join('')+'</ul></div>';
    });
    box.innerHTML=html||'<p class="muted">表示できる系図がありません。</p>';

    var cnt=document.getElementById('lineageTreeCount');
    if(cnt)cnt.textContent=famList.length+'一族';
  }

  function node(p,childrenOf){
    var kids=(childrenOf[p.id]||[]).sort(function(a,b){return b.age-a.age||a.id-b.id;});
    var tags=(p.favored?' <span class="ltag fav">大寵愛</span>':'')
      +(p.age<20?' <span class="ltag ikusei">育成</span>':'');
    var s='<li><span class="ltree-item" data-person="'+p.id+'" role="button" tabindex="0">'
      +'<b>'+esc(p.given)+'</b>　'+p.age+'歳・'+(p.generation||1)+'世代目'+tags+'</span>';
    if(kids.length)s+='<ul class="ltree">'+kids.map(function(k){return node(k,childrenOf);}).join('')+'</ul>';
    return s+'</li>';
  }

  function injectStyle(){
    if(document.getElementById('ltree-style'))return;
    var st=document.createElement('style');st.id='ltree-style';
    st.textContent=[
      '#lineageTree .ltree{list-style:none;margin:0;padding-left:0}',
      '#lineageTree .ltree .ltree{margin-left:14px;padding-left:12px;border-left:1px solid var(--border)}',
      '#lineageTree .ltree li{position:relative;padding:3px 0}',
      '#lineageTree .ltree .ltree>li::before{content:"";position:absolute;left:-12px;top:14px;width:10px;border-top:1px solid var(--border)}',
      '#lineageTree .ltree-item{display:inline-block;padding:2px 8px;border:1px solid var(--border);border-radius:8px;background:var(--chip);cursor:pointer;font-size:.9rem}',
      '#lineageTree .ltree-item:hover{border-color:var(--accent)}',
      '#lineageTree .ltag{font-size:.72rem;padding:0 5px;border-radius:6px;margin-left:2px;color:#fff}',
      '#lineageTree .ltag.fav{background:#c2185b}',
      '#lineageTree .ltag.ikusei{background:#607d8b}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
  }

  function bindTap(){
    var box=document.getElementById('lineageTree');
    if(!box||box._ltBound)return; box._ltBound=true;
    function open(t){
      var el=t&&t.closest&&t.closest('.ltree-item'); if(!el)return;
      var id=parseInt(el.getAttribute('data-person'),10);
      if(window.openMikoDetail)window.openMikoDetail(id);
      else{try{selectedId=id;if(typeof renderDetail==='function')renderDetail();}catch(e){}}
    }
    box.addEventListener('click',function(e){open(e.target);});
    box.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e.target);}});
  }

  function run(){ try{ injectStyle(); build(); bindTap(); }catch(e){} }

  var before=render;
  render=function(){ before(); run(); };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
