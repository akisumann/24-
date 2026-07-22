// テキスト方式のセーブ入出力（v16拡張）。
// iPhone(iOS Safari)ではボタンによるファイルのダウンロード(書き出し)が実質効かず、
// 完全セーブを保存できない。そこでファイルを介さず、セーブ内容をテキストとして
// コピー／貼り付けできる経路を「セーブ管理」カードに追加する（既存のファイル方式は残す）。
(function(){
  const status=document.getElementById('saveStatus');
  if(!status)return;
  if(typeof buildSaveData!=='function'||typeof restoreSaveData!=='function')return;

  const box=document.createElement('div');
  box.className='space2 mt2';
  box.innerHTML=
    '<div class="muted mb1">iPhoneなどファイル書き出しが使えない端末向け。テキストをコピーして安全な場所（メモ等）へ保存し、読み込む時はここへ貼り付ける。</div>'
    +'<div class="flex wrap gap2">'
    +'<button id="saveCopy" class="btn" type="button">テキストで書き出す（コピー）</button>'
    +'<button id="savePaste" class="btn" type="button">貼り付けたテキストを読み込む</button>'
    +'</div>'
    +'<textarea id="saveText" rows="4" spellcheck="false" autocomplete="off" autocapitalize="off" '
    +'placeholder="ここにセーブ用テキストが出ます。読み込む時は、保存しておいたテキストをここへ貼り付けてから「貼り付けたテキストを読み込む」を押してください。" '
    +'style="width:100%;margin-top:8px;box-sizing:border-box;font-family:monospace;font-size:12px;line-height:1.4;'
    +'color:inherit;background:transparent;border:1px solid #8886;border-radius:8px;padding:8px;"></textarea>';
  status.after(box);

  const ta=box.querySelector('#saveText');

  box.querySelector('#saveCopy').addEventListener('click',function(){
    const json=JSON.stringify(buildSaveData());
    ta.value=json;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0,json.length);
    let copied=false;
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(json).then(function(){
          setSaveStatus(year+'年目のセーブをテキストで書き出し、クリップボードにコピーしました。');
        }).catch(function(){
          setSaveStatus(year+'年目のセーブをテキストで書き出しました。下の枠を長押しして「すべてを選択→コピー」で保存してください。');
        });
        copied=true;
      }
    }catch(e){}
    if(!copied){
      try{copied=document.execCommand('copy');}catch(e){}
      setSaveStatus(year+'年目のセーブをテキストで書き出しました。'
        +(copied?'クリップボードにコピーしました。':'下の枠を長押しして「すべてを選択→コピー」で保存してください。'));
    }
  });

  box.querySelector('#savePaste').addEventListener('click',function(){
    const raw=(ta.value||'').trim();
    if(!raw){setSaveStatus('読み込むテキストを、上の枠に貼り付けてから押してください。');return;}
    try{
      restoreSaveData(raw);
      if(typeof autoSaveGame==='function')autoSaveGame();
      setSaveStatus(year+'年目のセーブをテキストから読み込みました。');
    }catch(e){
      setSaveStatus('テキストの読み込みに失敗しました：'+e.message+'（コピーしたテキスト全体が貼り付けられているか確認してください）');
    }
  });
})();
