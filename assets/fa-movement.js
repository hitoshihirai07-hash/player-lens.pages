(function () {
  'use strict';
  const D=window.PlayerLensFAData;
  const $=id=>document.getElementById(id);
  const state={players:[],history:[],team:'all',status:'all',search:''};
  const esc=D.esc,norm=D.norm;
  function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)?v.replace(/-/g,'/'):v||'—';}
  const eligibleStatus=new Set(['FA宣言','交渉中','FA移籍']);
  function fillFilters() {
    const teams=[...new Set(state.players.map(r=>r.公示時球団))].sort((a,b)=>a.localeCompare(b,'ja'));
    $('faTeam').innerHTML='<option value="all">全12球団</option>'+teams.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
  }
  function historyFor(player){
    return state.history.filter(h=>h.FAケースID===player.FAケースID&&h.イベント!=='宣言せず残留')
      .sort((a,b)=>(a.発生日||'').localeCompare(b.発生日||''));
  }
  function renderHistory(row) {
    const records=historyFor(row);
    if(!records.length)return '<p class="fa-muted">進展の記録はまだありません。</p>';
    return '<ol class="fa-timeline">'+records.map(h=>
      '<li><span class="fa-date">'+esc(date(h.発生日))+'</span><strong>'+esc(h.イベント||'進展')+'</strong>'
      +'<p>'+esc(h.詳細||'')+'</p>'
      +(h.出典URL&&/^https:\/\//.test(h.出典URL)?'<a href="'+esc(h.出典URL)+'" target="_blank" rel="noopener noreferrer">情報源を見る</a>':'')+'</li>'
    ).join('')+'</ol>';
  }
  function render(){
    const rows=state.players.filter(r=>(state.team==='all'||r.公示時球団===state.team)
      &&(state.status==='all'||r.動向ステータス===state.status)
      &&(norm(r.選手名)+norm(r.公示時球団)).includes(norm(state.search)));
    $('faCount').textContent=rows.length+'人 / 登録'+state.players.length+'人';
    $('faSummary').innerHTML=[
      ['掲載選手',state.players.length],['FA宣言',state.players.filter(x=>x.動向ステータス==='FA宣言').length],
      ['交渉中',state.players.filter(x=>x.動向ステータス==='交渉中').length],['FA移籍',state.players.filter(x=>x.動向ステータス==='FA移籍').length]
    ].map(x=>'<div><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>人</small></div>').join('');
    $('faCards').innerHTML=rows.map(row=>{
      const id='fa-h-'+esc(row.FAケースID);
      const dest=row.移籍先?' / 移籍先：'+row.移籍先:'';
      const link=row.出典URL&&/^https:\/\//.test(row.出典URL)?'<a href="'+esc(row.出典URL)+'" target="_blank" rel="noopener noreferrer">出典を見る</a>':'';
      return '<article class="fa-person" data-case="'+esc(row.FAケースID)+'">'
        +'<div class="fa-person-top"><div><p class="fa-muted">'+esc(row.公示時球団)+' · '+esc(row.FA権区分)+'</p><h3>'+esc(row.選手名)+'</h3></div>'
        +'<span class="fa-pill">'+esc(row.動向ステータス)+'</span></div>'
        +'<dl class="fa-dl"><div><dt>最新動向</dt><dd>'+esc(date(row.最新動向日))+'</dd></div><div><dt>確認状況</dt><dd>'+esc(row.確認状況)+'</dd></div></dl>'
        +'<p class="fa-description">'+esc(row.最新の内容||'進展情報は未登録です。')+esc(dest)+'</p>'
        +'<div class="fa-card-actions">'+link+'<button type="button" class="fa-history-button" aria-expanded="false" aria-controls="'+id+'">進展履歴を表示（'+historyFor(row).length+'件）</button></div>'
        +'<div class="fa-history" id="'+id+'" hidden><h4>これまでの進展</h4>'+renderHistory(row)+'</div></article>';
    }).join('');
    $('faEmpty').hidden=rows.length!==0;
  }
  async function init(){
    $('faError').hidden=true;$('faStatus').textContent='FA動向を読み込んでいます。';
    try{
      const [players,history]=await Promise.all([
        D.loadCsv('./data/fa/fa_players_2026.csv',['FAケースID','公示時球団','選手名','動向ステータス','最新動向日','出典URL']),
        D.loadCsv('./data/fa/fa_history_2026.csv',['FAケースID','発生日','イベント','詳細','出典URL'])
      ]);
      state.players=players.filter(r=>eligibleStatus.has(r.動向ステータス)&&r.選手名&&r.FAケースID);
      state.history=history;
      fillFilters();
      $('faStatus').textContent='最終動向日：'+(state.players.map(r=>r.最新動向日).filter(Boolean).sort().pop()||'未登録');
      $('faControls').hidden=false;$('faResults').hidden=false;render();
    }catch(e){
      $('faError').hidden=false;$('faErrorText').textContent=e.message;
      $('faStatus').textContent='読み込みに失敗しました。';
    }
  }
  $('faTeam').addEventListener('change',e=>{state.team=e.target.value;render();});
  $('faStatusFilter').addEventListener('change',e=>{state.status=e.target.value;render();});
  $('faSearch').addEventListener('input',e=>{state.search=e.target.value;render();});
  $('faReset').addEventListener('click',()=>{state.team='all';state.status='all';state.search='';$('faTeam').value='all';$('faStatusFilter').value='all';$('faSearch').value='';render();});
  $('faCards').addEventListener('click',e=>{
    const b=e.target.closest('.fa-history-button');if(!b)return;
    const panel=$(b.getAttribute('aria-controls'));const open=b.getAttribute('aria-expanded')!=='true';
    panel.hidden=!open;b.setAttribute('aria-expanded',String(open));
  });
  $('faRetry').addEventListener('click',init);
  init();
})();