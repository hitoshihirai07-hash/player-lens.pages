(function () {
  'use strict';
  const D=window.PlayerLensFAData;
  const $=id=>document.getElementById(id);
  const esc=D.esc,norm=D.norm;
  const MAX=28;
  const state={all:[],team:'',position:'all',search:'',view:'all',selected:new Set(),excluded:new Set(),stamp:''};
  const storeKey=t=>'player-lens-fa-protect-2026-v1-'+t;
  function save(){
    try{localStorage.setItem(storeKey(state.team),JSON.stringify({selected:[...state.selected],excluded:[...state.excluded]}));}
    catch(e){$('protectNotice').textContent='このブラウザーでは選択内容を保存できません。';}
  }
  function restore(){
    state.selected=new Set();state.excluded=new Set();
    try{
      const saved=JSON.parse(localStorage.getItem(storeKey(state.team))||'{}');
      if(Array.isArray(saved.selected))state.selected=new Set(saved.selected);
      if(Array.isArray(saved.excluded))state.excluded=new Set(saved.excluded);
    }catch(e){/* No usable stored state. */}
    const rows=state.all.filter(x=>x.球団名===state.team);
    const ids=new Set(rows.map(x=>x.選手ID));
    state.excluded=new Set([...state.excluded].filter(id=>ids.has(id)&&!isBaseExcluded(rows.find(x=>x.選手ID===id))));
    state.selected=new Set([...state.selected].filter(id=>ids.has(id)&&!state.excluded.has(id)&&!isBaseExcluded(rows.find(x=>x.選手ID===id))).slice(0,MAX));
  }
  function isBaseExcluded(p){return p.契約区分!=='支配下'||p.プロテクト候補判定==='対象外';}
  function isExcluded(p){return isBaseExcluded(p)||state.excluded.has(p.選手ID);}
  function status(p){return isExcluded(p)?'対象外':state.selected.has(p.選手ID)?'プロテクト':'プロテクト外';}
  function sortedRows(){
    const rows=state.all.filter(p=>p.球団名===state.team);
    return rows.sort((a,b)=>['投手','捕手','内野手','外野手'].indexOf(a.ポジション)-['投手','捕手','内野手','外野手'].indexOf(b.ポジション)
      ||Number(a.背番号)-Number(b.背番号)||a.選手名.localeCompare(b.選手名,'ja'));
  }
  function render(){
    const teamRows=sortedRows();
    state.stamp=teamRows[0]?.基準日||'';
    const usable=teamRows.filter(p=>!isExcluded(p));
    const remaining=MAX-state.selected.size;
    $('protectCounter').textContent=state.selected.size+' / '+MAX+'人';
    $('protectCounter').classList.toggle('is-complete',remaining===0);
    $('protectSummary').innerHTML=[
      ['選択済み',state.selected.size],['残り枠',remaining],['プロテクト外',usable.length-state.selected.size],['対象外',teamRows.length-usable.length]
    ].map(x=>'<div><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>人</small></div>').join('');
    $('protectStatus').textContent=state.team+' · 名簿基準日：'+(state.stamp||'未登録')+' · '+teamRows.length+'人';
    const rows=teamRows.filter(p=>(state.position==='all'||p.ポジション===state.position)
      &&(state.view==='all'||status(p)===state.view)
      &&(norm(p.選手名)+norm(p.背番号)).includes(norm(state.search)));
    $('protectResultCount').textContent='表示 '+rows.length+'人 / '+teamRows.length+'人';
    $('protectCards').innerHTML=rows.map(p=>{
      const locked=isBaseExcluded(p),manual=state.excluded.has(p.選手ID),chosen=state.selected.has(p.選手ID),disabled=isExcluded(p)||(!chosen&&remaining===0);
      const id=esc(p.選手ID),name=esc(p.選手名),position=esc(p.ポジション||'—');
      return '<article class="fa-person protect-person"><div class="fa-person-top"><div><p class="fa-muted">背番号 '+esc(p.背番号||'未定')+' · '+position+' · '+esc(p.契約区分)+'</p><h3>'+name+'</h3></div>'
        +'<span class="fa-pill'+(chosen?' is-chosen':'')+'">'+esc(status(p))+'</span></div>'
        +'<div class="protect-actions"><label class="protect-check"><input type="checkbox" data-action="select" data-id="'+id+'" '+(chosen?'checked ':'')+(disabled?'disabled ':'')+'/> 28人に選ぶ</label>'
        +'<label class="protect-check"><input type="checkbox" data-action="exclude" data-id="'+id+'" '+(locked||manual?'checked ':'')+(locked?'disabled ':'')+'/> 対象外として扱う</label></div>'
        +(locked?'<p class="fa-muted">育成・契約区分などにより名簿上の対象外です。</p>'
          :p.外国人区分==='未判定'?'<p class="fa-muted">外国人区分は未確認。必要に応じて手動で対象外にしてください。</p>':'')
        +'</article>';
    }).join('');
    $('protectEmpty').hidden=rows.length!==0;
    const picks=teamRows.filter(p=>state.selected.has(p.選手ID));
    $('protectPicks').innerHTML=picks.length?'<ol>'+picks.map(p=>'<li>'+esc(p.選手名)+' <small>'+esc(p.ポジション)+'</small></li>').join('')+'</ol>':'<p class="fa-muted">まだ選択されていません。</p>';
    $('protectCopy').disabled=picks.length===0;
    $('protectCsv').disabled=picks.length===0;
  }
  function exportText(){
    const picked=sortedRows().filter(p=>state.selected.has(p.選手ID));
    return state.team+'｜28人プロテクト案（'+picked.length+'/'+MAX+'人）\n'+picked.map((p,i)=>(i+1)+'. '+p.選手名+'（'+p.ポジション+'）').join('\n')+
      '\n※個人の選択案です。球団公式のリストではありません。';
  }
  function csvEsc(v){v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
  function downloadCsv(){
    const rows=[['球団','選手名','背番号','ポジション','選択状況'],...sortedRows().filter(p=>state.selected.has(p.選手ID)).map(p=>[state.team,p.選手名,p.背番号,p.ポジション,'プロテクト'])];
    const csv='\uFEFF'+rows.map(r=>r.map(csvEsc).join(',')).join('\r\n')+'\r\n';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='fa_protect_2026_'+String(Date.now())+'.csv';
    document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  function switchTeam(value){state.team=value;state.position='all';state.view='all';state.search='';$('protectPosition').value='all';$('protectView').value='all';$('protectSearch').value='';restore();render();}
  async function init(){
    $('protectError').hidden=true;
    $('protectStatus').textContent='選手名簿を読み込んでいます。';
    try{
      const rows=await D.loadCsv('./data/fa/fa_protect_roster_2026.csv',['選手ID','球団名','選手名','背番号','ポジション','契約区分','プロテクト候補判定','外国人区分','基準日']);
      state.all=rows.filter(p=>p.選手ID&&p.球団名&&p.選手名);
      if(!state.all.length)throw new Error('選手名簿に登録選手がいません。');
      const teams=[...new Set(state.all.map(p=>p.球団名))];
      $('protectTeam').innerHTML=teams.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
      const requested=new URLSearchParams(location.search).get('team');
      const initial=teams.includes(requested)?requested:teams.includes('読売ジャイアンツ')?'読売ジャイアンツ':teams[0];
      $('protectTeam').value=initial;
      $('protectControls').hidden=false;$('protectWorkspace').hidden=false;
      switchTeam(initial);
    }catch(e){
      $('protectError').hidden=false;$('protectErrorText').textContent=e.message;$('protectStatus').textContent='読み込みに失敗しました。';
    }
  }
  $('protectTeam').addEventListener('change',e=>switchTeam(e.target.value));
  $('protectPosition').addEventListener('change',e=>{state.position=e.target.value;render();});
  $('protectView').addEventListener('change',e=>{state.view=e.target.value;render();});
  $('protectSearch').addEventListener('input',e=>{state.search=e.target.value;render();});
  $('protectCards').addEventListener('change',e=>{
    const input=e.target.closest('input[data-id]');if(!input)return;
    const p=state.all.find(x=>x.球団名===state.team&&x.選手ID===input.dataset.id);if(!p||isBaseExcluded(p))return;
    if(input.dataset.action==='select'){
      if(input.checked&&!isExcluded(p)&&state.selected.size<MAX)state.selected.add(p.選手ID);
      if(!input.checked)state.selected.delete(p.選手ID);
    }else{
      if(input.checked){state.excluded.add(p.選手ID);state.selected.delete(p.選手ID);}
      else state.excluded.delete(p.選手ID);
    }
    save();render();
  });
  $('protectReset').addEventListener('click',()=>{
    if(!window.confirm(state.team+'の選択と手動対象外設定をすべて解除しますか？'))return;
    state.selected.clear();state.excluded.clear();save();render();
  });
  $('protectCopy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(exportText());$('protectNotice').textContent='選択した選手の一覧をコピーしました。';}
    catch(e){$('protectNotice').textContent='コピーできませんでした。ブラウザーの設定をご確認ください。';}
  });
  $('protectCsv').addEventListener('click',downloadCsv);
  $('protectRetry').addEventListener('click',init);
  init();
})();