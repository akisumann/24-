const SAVE_VERSION=1;
const SAVE_KEYS={
  latest:'mikoGameSave_latest',
  backup1:'mikoGameSave_backup1',
  backup2:'mikoGameSave_backup2'
};

function buildSaveData(){
  return{
    saveVersion:SAVE_VERSION,
    savedAt:new Date().toISOString(),
    ruleset:'bottom-five-potential-level-plus-5-v16',
    year,
    nextId,
    selectedId,
    selectedRole,
    history,
    lastKinChange,
    godLevel,
    shinraMikos,
    mikos,
    kin
  };
}

function validateSaveData(data){
  if(!data||typeof data!=='object')throw new Error('セーブデータの形式が正しくありません。');
  if(!Array.isArray(data.mikos)||data.mikos.length===0)throw new Error('巫女名簿がありません。');
  if(!data.kin||typeof data.kin!=='object')throw new Error('親類縁者データがありません。');
  if(typeof data.year!=='number'||typeof data.nextId!=='number'||typeof data.godLevel!=='number')throw new Error('進行情報が不足しています。');
  return data;
}

function restoreSaveData(raw){
  const data=validateSaveData(typeof raw==='string'?JSON.parse(raw):raw);
  year=data.year;
  nextId=data.nextId;
  selectedId=data.selectedId??null;
  selectedRole=data.selectedRole??null;
  history=Array.isArray(data.history)?data.history:[];
  lastKinChange=Number(data.lastKinChange)||0;
  godLevel=data.godLevel;
  shinraMikos=Array.isArray(data.shinraMikos)?data.shinraMikos:[];
  mikos=data.mikos;
  Object.keys(kin).forEach(key=>delete kin[key]);
  Object.entries(data.kin).forEach(([family,value])=>kin[family]=value);
  if(!mikos.some(p=>p.id===selectedId))selectedId=null;
  render();
  setSaveStatus(`${year}年目のセーブを復元しました。`);
}

function setSaveStatus(message){
  const box=document.getElementById('saveStatus');
  if(box)box.textContent=message;
}

function autoSaveGame(){
  try{
    const latest=localStorage.getItem(SAVE_KEYS.latest);
    const backup1=localStorage.getItem(SAVE_KEYS.backup1);
    if(backup1)localStorage.setItem(SAVE_KEYS.backup2,backup1);
    if(latest)localStorage.setItem(SAVE_KEYS.backup1,latest);
    localStorage.setItem(SAVE_KEYS.latest,JSON.stringify(buildSaveData()));
    setSaveStatus(`${year}年目を自動保存しました。`);
  }catch(error){
    console.error(error);
    setSaveStatus(`自動保存に失敗しました：${error.message}`);
  }
}

function loadLatestSave(){
  const raw=localStorage.getItem(SAVE_KEYS.latest);
  if(!raw){
    autoSaveGame();
    setSaveStatus('初期状態を保存しました。');
    return;
  }
  try{
    restoreSaveData(raw);
  }catch(error){
    console.error(error);
    const backup=localStorage.getItem(SAVE_KEYS.backup1)||localStorage.getItem(SAVE_KEYS.backup2);
    if(backup){
      try{
        restoreSaveData(backup);
        setSaveStatus('最新セーブが壊れていたため、バックアップを復元しました。');
        return;
      }catch(backupError){console.error(backupError);}
    }
    setSaveStatus(`セーブの復元に失敗しました：${error.message}`);
  }
}

function exportSaveGame(){
  const data=JSON.stringify(buildSaveData(),null,2);
  const blob=new Blob([data],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`miko-save-year-${year}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setSaveStatus(`${year}年目の完全セーブを書き出しました。`);
}

function importSaveGame(file){
  if(!file)return;
  const reader=new FileReader();
  reader.addEventListener('load',()=>{
    try{
      restoreSaveData(reader.result);
      autoSaveGame();
      setSaveStatus(`${year}年目の完全セーブを読み込みました。`);
    }catch(error){
      console.error(error);
      setSaveStatus(`読み込みに失敗しました：${error.message}`);
    }
  });
  reader.addEventListener('error',()=>setSaveStatus('セーブファイルを読み取れませんでした。'));
  reader.readAsText(file);
}

document.getElementById('saveExport').addEventListener('click',exportSaveGame);
document.getElementById('saveImport').addEventListener('click',()=>document.getElementById('saveFile').click());
document.getElementById('saveFile').addEventListener('change',event=>{
  importSaveGame(event.target.files?.[0]);
  event.target.value='';
});

loadLatestSave();
