// 巫女タップ→詳細をモーダル（ポップアップ）で即表示（表示のみ・非侵襲）。
// 既存の #detail 要素をそのままモーダルへ移し込むため、中のスキルボタン等の操作もそのまま効く。
// renderDetail を（最外で）ラップし、名簿タップ由来のときだけモーダルを開く。ターン進行時の再描画では開かない。
// このモジュールは index.html で chronicle/miko-traits より後に読み込むこと（詳細が全部組み上がった後に開くため）。
(function(){
  if(typeof document==='undefined'||typeof renderDetail!=='function')return;
  try{
    var pendingOpen=false;   // 名簿タップで立てるフラグ
    var open=false;
    var overlay,wrap,placeholder,detailReady=false;

    function build(){
      var detail=document.getElementById('detail');
      if(!detail)return false;
      overlay=document.createElement('div');
      overlay.id='mikoModalOverlay';
      wrap=document.createElement('div');
      wrap.className='mikoModalWrap';
      var close=document.createElement('button');
      close.type='button'; close.className='mikoModalClose'; close.setAttribute('aria-label','閉じる'); close.textContent='×';
      wrap.appendChild(close);
      overlay.appendChild(wrap);
      document.body.appendChild(overlay);
      placeholder=document.createComment('miko-detail-home');

      close.addEventListener('click',hide);
      overlay.addEventListener('click',function(e){ if(e.target===overlay)hide(); });
      document.addEventListener('keydown',function(e){ if(e.key==='Escape')hide(); });

      // 名簿タップを捕捉フェーズで検知（ボタン側ハンドラより先にフラグを立てる）。
      var roster=document.getElementById('roster');
      if(roster)roster.addEventListener('click',function(e){
        if(e.target&&e.target.closest&&e.target.closest('[data-person]'))pendingOpen=true;
      },true);

      var st=document.createElement('style');
      st.textContent=[
        '#mikoModalOverlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;z-index:9999;overflow:auto;-webkit-overflow-scrolling:touch;}',
        '#mikoModalOverlay.show{display:block;}',
        '#mikoModalOverlay .mikoModalWrap{position:relative;max-width:600px;margin:20px auto;padding:0 12px 48px;}',
        '#mikoModalOverlay .mikoModalWrap > #detail{margin:0;box-shadow:0 16px 48px rgba(0,0,0,.4);}',
        '#mikoModalOverlay .mikoModalClose{position:absolute;top:4px;right:18px;z-index:2;width:40px;height:40px;border-radius:50%;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:22px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35);}',
        '#mikoModalClose:hover,.mikoModalClose:hover{opacity:.85;}'
      ].join('');
      (document.head||document.documentElement).appendChild(st);
      detailReady=true;
      return true;
    }

    function show(){
      if(!detailReady&&!build())return;
      var detail=document.getElementById('detail');
      if(!detail)return;
      if(!open){
        detail.parentNode.insertBefore(placeholder,detail); // 元位置を覚える
        wrap.appendChild(detail);                            // 実体を移し込む（操作性維持）
        document.body.style.overflow='hidden';
        open=true;
      }
      overlay.classList.add('show');
      overlay.scrollTop=0;
    }
    function hide(){
      if(!open)return;
      var detail=document.getElementById('detail');
      if(detail&&placeholder&&placeholder.parentNode)placeholder.parentNode.insertBefore(detail,placeholder);
      if(placeholder&&placeholder.parentNode)placeholder.parentNode.removeChild(placeholder);
      overlay.classList.remove('show');
      document.body.style.overflow='';
      open=false;
    }

    var before=renderDetail;
    renderDetail=function(){
      before();
      try{
        if(pendingOpen){ pendingOpen=false; show(); }
      }catch(e){}
    };

    // 初期化（#detail が存在する状態で overlay を用意）。
    function init(){ try{ build(); }catch(e){} }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
    else init();
  }catch(e){}
})();
