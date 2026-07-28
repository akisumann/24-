// 縦にずらっと並ぶ各パネルを「ボタンのメニュー→ポップアップ」に畳む（表示のみ・非侵襲）。
// 大淫義タイル・名簿・直近ターン結果はボードに残し、それ以外は隠し置き場(stash)へ退避。
// stash に置いても render() は id で要素を更新するので、中身は毎ターン更新され続ける。
// ボタンを押すと該当カードをモーダルへ移し込んで表示、閉じると stash へ戻す（操作性そのまま）。
// dashboard/collapse/ceremony/各renderモジュールの後に読み込むこと。
(function(){
  if(typeof document==='undefined')return;
  function run(){
    try{
      var board=document.querySelector('.miko-board');
      if(!board)return;
      if(document.getElementById('sectionStash'))return; // 二重実行防止

      var rosterEl=document.getElementById('roster');
      var rosterCard=rosterEl?rosterEl.closest('.card'):null;
      var ceremonyCard=document.getElementById('ceremonyCard');
      var turnResult=document.getElementById('turnResult');
      var keep=[ceremonyCard,rosterCard,turnResult].filter(Boolean);

      var stash=document.createElement('div');
      stash.id='sectionStash';
      stash.style.display='none';
      document.body.appendChild(stash);

      function cardOf(id){var el=document.getElementById(id);return el?el.closest('.card'):null;}

      // ボタン化する項目（順＝並び）
      var SECTIONS=[
        {label:'契約状況',     ids:['candidateCount']},
        {label:'親類縁者',     ids:['kinSummary']},
        {label:'母系一族',     ids:['clans']},
        {label:'神羅巫女',     ids:['shinraMikos']},
        {label:'推移グラフ',   ids:['trendPanels']},
        {label:'年齢構成',     ids:['ageGroups']},
        {label:'模擬戦',       ids:['battleResult']},
        {label:'三点相撲',     ids:['sumoResult']},
        {label:'役務',         ids:['roles','roleMembers']},
        {label:'国家事業記録', ids:['history']},
        {label:'セーブ管理',   ids:['saveStatus']}
      ];
      SECTIONS.forEach(function(s){
        s.cardEls=[];
        s.ids.forEach(function(id){var c=cardOf(id);if(c&&keep.indexOf(c)<0)s.cardEls.push(c);});
      });

      // 制度説明（idが無いのでh2テキストで拾う）
      var infoCards=[];
      board.querySelectorAll(':scope > .card').forEach(function(c){
        var h=c.querySelector('h2'); if(!h)return;
        var t=h.textContent||'';
        if(t.indexOf('人材育成契約')>=0||t.indexOf('神の娘の能力計算')>=0)infoCards.push(c);
      });
      if(infoCards.length)SECTIONS.push({label:'制度・ルール',cardEls:infoCards});

      // 退避対象：各セクションのカード＋冗長な7年の大淫義カード（HUDが代替）＋詳細カード（詳細はタップでモーダル）
      var toStash=[];
      SECTIONS.forEach(function(s){s.cardEls.forEach(function(c){if(toStash.indexOf(c)<0)toStash.push(c);});});
      var taigi=cardOf('advance'); if(taigi&&toStash.indexOf(taigi)<0)toStash.push(taigi);
      var detail=document.getElementById('detail'); if(detail&&toStash.indexOf(detail)<0)toStash.push(detail);
      toStash.forEach(function(c){if(keep.indexOf(c)<0)stash.appendChild(c);});

      // モーダル
      var overlay=document.createElement('div');
      overlay.id='sectionModalOverlay';
      overlay.innerHTML='<div class="sectionModalWrap"><div class="sectionModalHead"><span class="sectionModalTitle"></span><button type="button" class="sectionModalClose" aria-label="閉じる">×</button></div><div class="sectionModalBody"></div></div>';
      document.body.appendChild(overlay);
      var mbody=overlay.querySelector('.sectionModalBody');
      var mtitle=overlay.querySelector('.sectionModalTitle');
      function toStashAll(){while(mbody.firstChild)stash.appendChild(mbody.firstChild);}
      function closeModal(){toStashAll();overlay.classList.remove('show');document.body.style.overflow='';}
      function openSection(s){
        toStashAll();
        s.cardEls.forEach(function(c){if(c)mbody.appendChild(c);});
        mtitle.textContent=s.label;
        overlay.classList.add('show');overlay.scrollTop=0;document.body.style.overflow='hidden';
      }
      overlay.querySelector('.sectionModalClose').addEventListener('click',closeModal);
      overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&overlay.classList.contains('show'))closeModal();});

      // メニュー（ボード内の全幅タイル）
      var menu=document.createElement('div');
      menu.className='card space3 section-menu';
      menu.style.gridColumn='1/-1';
      var html='<h2>各種データ</h2><p class="muted">押すとその項目がポップアップで開きます。巫女は名簿をタップ。</p><div class="section-menu-grid">';
      SECTIONS.forEach(function(s,i){if(s.cardEls.length)html+='<button type="button" class="hud-btn section-menu-btn" data-si="'+i+'">'+s.label+'</button>';});
      html+='</div>';
      menu.innerHTML=html;
      menu.querySelectorAll('.section-menu-btn').forEach(function(btn){
        btn.addEventListener('click',function(){openSection(SECTIONS[+btn.getAttribute('data-si')]);});
      });
      if(ceremonyCard&&ceremonyCard.parentNode===board)board.insertBefore(menu,ceremonyCard.nextSibling);
      else board.insertBefore(menu,board.firstChild);

      // タイルが無くなるので HUD の 全開く/全畳む を隠す
      ['hudExpandAll','hudCollapseAll'].forEach(function(id){var b=document.getElementById(id);if(b)b.style.display='none';});
      var sep=document.querySelector('.hud-controls .sep');if(sep)sep.style.display='none';

      var st=document.createElement('style');
      st.textContent=[
        '.section-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:8px}',
        '.section-menu-btn{width:100%}',
        '#sectionModalOverlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;z-index:9998;overflow:auto;-webkit-overflow-scrolling:touch}',
        '#sectionModalOverlay.show{display:block}',
        '#sectionModalOverlay .sectionModalWrap{max-width:680px;margin:16px auto;padding:0 12px 48px}',
        '#sectionModalOverlay .sectionModalHead{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px}',
        '#sectionModalOverlay .sectionModalTitle{font-weight:700;font-size:1.15rem;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7)}',
        '#sectionModalOverlay .sectionModalClose{width:40px;height:40px;flex:none;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35)}',
        '#sectionModalOverlay .sectionModalBody > .card{margin:0 0 12px}',
        '#sectionModalOverlay .sectionModalBody > .card.hidden{display:block}'
      ].join('');
      document.head.appendChild(st);
    }catch(e){try{console.error('sections-menu',e);}catch(_){}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
