// 再現コード（v16拡張）：乱数はシード化済み（data.js）。現在のシードと経過年を
// 「再現コード（シード:年）」として表示し、コードを入力すれば同じ数百年を丸ごと再現できる。
// 完全セーブの長い文字列を扱わずに、短いコードだけで状態を共有・復元するための仕組み。
// 全モジュールの後（最後）に読む。
(function(){
  function curSeed(){return (typeof __seed!=='undefined')?(__seed>>>0):null;}
  function reproCode(){const s=curSeed();return (s===null?'—':s)+':'+year;}
  function refresh(){const el=document.getElementById('reproCode');if(el)el.textContent=reproCode();}

  // --- UI（セーブ管理カードへ）---
  const status=document.getElementById('saveStatus');
  if(status){
    const box=document.createElement('div');
    box.className='space2 mt2';
    box.innerHTML=
      '<div class="muted mb1">再現コード（シード：経過年）。これを控えておけば、同じ数百年をいつでも再現できる。長い完全セーブは不要。</div>'
      +'<div class="flex wrap center gap2"><code id="reproCode" style="font-size:15px;padding:4px 8px;border:1px solid #8886;border-radius:6px;">—</code>'
      +'<button id="reproCopy" class="btn" type="button">コピー</button></div>'
      +'<div class="flex wrap center gap2 mt2"><input id="reproIn" placeholder="例: 27:301" autocomplete="off" spellcheck="false" '
      +'style="flex:1;min-width:8em;box-sizing:border-box;padding:6px 8px;font-family:monospace;color:inherit;background:transparent;border:1px solid #8886;border-radius:6px;">'
      +'<button id="reproGo" class="btn" type="button">このコードで再現</button></div>';
    status.after(box);
    refresh();

    box.querySelector('#reproCopy').addEventListener('click',function(){
      const code=reproCode();
      try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code);}catch(e){}
      if(typeof setSaveStatus==='function')setSaveStatus('再現コード '+code+' をコピーしました。');
    });

    box.querySelector('#reproGo').addEventListener('click',function(){
      const raw=(document.getElementById('reproIn').value||'').trim();
      const m=raw.match(/^(\d+)\s*[:：\/\s]\s*(\d+)$/);
      if(!m){if(typeof setSaveStatus==='function')setSaveStatus('コードは「シード:年」で入れてください（例 27:301）。');return;}
      const s=parseInt(m[1],10)>>>0,y=Math.max(0,parseInt(m[2],10));
      if(!confirm('再現コード '+s+':'+y+' で再現します。\n（いまのゲームは再現コード '+reproCode()+' でいつでも戻せます）\nよろしいですか？'))return;
      try{['mikoGameSave_latest','mikoGameSave_backup1','mikoGameSave_backup2'].forEach(k=>localStorage.removeItem(k));}catch(e){}
      location.href=location.href.split('?')[0]+'?seed='+s+'&year='+y;
    });

    if(typeof render==='function'){const before=render;render=function(){before();refresh();};}
  }

  // --- 自動再現：?seed=（＆?year=）指定で読み込まれた場合、シードから作り直してその年まで一気に進める ---
  if(typeof __seedForced!=='undefined'&&__seedForced){
    if(typeof __startYear!=='undefined'&&__startYear>0&&typeof runTurn==='function'){
      const turns=Math.floor(__startYear/7);
      for(let i=0;i<turns;i++)runTurn();
    }
    if(typeof autoSaveGame==='function')autoSaveGame();          // 再現結果を保存
    try{history.replaceState(null,'',location.href.split('?')[0]);}catch(e){} // 以後のF5は通常復元へ
    if(typeof setSaveStatus==='function')setSaveStatus('再現コード '+reproCode()+' を再現しました。');
    refresh();
  }
})();
