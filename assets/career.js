(function () {
  'use strict';
  const C=window.PlayerLensCareer;
  const $=id=>document.getElementById(id);
  const state={data:null,type:'batter',search:'',team:'all',sort:'安打',year:'latest',page:1,perPage:30};
  const cols={
    batter:['試合','打席','打数','打率','安打','本塁打','打点','盗塁','出塁率','長打率','OPS'],
    pitcher:['登板','先発','投球回','防御率','勝利','敗北','セーブ','ホールド','奪三振','WHIP']
  };
  const sorts={batter:['安打','本塁打','打点','試合','打率','OPS','盗塁','四球'],pitcher:['勝利','セーブ','奪三振','登板','投球回','ホールド','防御率','WHIP']};
  const smallBetter=new Set(['防御率','WHIP']);
  const intVal=v=>Number(v)||0;
  const esc=C.escapeHtml;
  const teamName=s=>C.teams[s]||s;
  const format=(p,key)=>{
    const value=p[key];
    if(value===undefined||value===null||value==='')return '—';
    if(['打率','出塁率','長打率','OPS','防御率','WHIP','勝率'].includes(key))return String(value);
    if(key==='投球回')return String(value);
    const n=Number(value);return Number.isFinite(n)?n.toLocaleString('ja-JP'):esc(value);
  };
  const numeric=v=>Number(v)||0;
  function getRows(){const base=state.data;const historical=state.year==='2026';return state.type==='pitcher'?(historical?base.basePitchers:base.pitchers):(historical?base.baseBatters:base.batters);}
  function changeType(type){state.type=type;state.sort=sorts[type][0];state.page=1;$('careerBatter').setAttribute('aria-pressed',String(type==='batter'));$('careerPitcher').setAttribute('aria-pressed',String(type==='pitcher'));$('milestoneType').value=type;syncSort();render();}
  function syncSort(){const s=$('careerSort');s.innerHTML=sorts[state.type].map(x=>`<option value="${x}">${x}順</option>`).join('');s.value=state.sort;}
  function sortValue(p,key){if(key==='投球回')return p.outs||0;const v=C.toNumber(p[key]);return v===null?(smallBetter.has(key)?Infinity:-Infinity):v;}
  function filtered(){const n=C.normalizeName(state.search);return getRows().filter(p=>(p.active||Boolean(n))&&(!n||C.normalizeName(p.選手名).includes(n))&&(state.team==='all'||teamName(p.team)===state.team)).sort((a,b)=>{
      const av=sortValue(a,state.sort),bv=sortValue(b,state.sort);const d=smallBetter.has(state.sort)?av-bv:bv-av;
      return d||String(a.選手名).localeCompare(String(b.選手名),'ja');
    });}
  function renderRanking(){
    const records=filtered(),maxPage=Math.max(1,Math.ceil(records.length/state.perPage));state.page=Math.min(state.page,maxPage);
    const keys=cols[state.type];
    $('careerHead').innerHTML='<tr><th scope="col">順位</th><th scope="col">選手</th>'+keys.map(k=>`<th scope="col" data-key="${k}" title="${k}で並べ替え">${k}${k===state.sort?' ▼':''}</th>`).join('')+'</tr>';
    const begin=(state.page-1)*state.perPage;
    const body=records.slice(begin,begin+state.perPage).map((p,i)=>{
      const link=C.playerUrl(p,state.type);
      return `<tr><td>${begin+i+1}</td><td><a class="career-name" href="${esc(link)}">${esc(p.選手名)}</a><span class="career-team">${esc(teamName(p.team))}</span></td>${keys.map(k=>`<td>${esc(format(p,k))}</td>`).join('')}</tr>`;
    }).join('');
    $('careerBody').innerHTML=body||`<tr><td class="career-empty" colspan="${keys.length+2}">条件に合う選手がいません。</td></tr>`;
    $('careerCount').textContent=`${records.length.toLocaleString()}選手`;
    $('careerPageLabel').textContent=`${state.page} / ${maxPage}ページ`;
    $('careerPrev').disabled=state.page===1;$('careerNext').disabled=state.page===maxPage;
  }
  function renderMilestones(){
    const kind=$('milestoneType').value,team=$('milestoneTeam').value;
    const historical=state.year==='2026';
    const data=kind==='batter'?(historical?state.data.baseBatters:state.data.batters):(historical?state.data.basePitchers:state.data.pitchers);
    const achievements=data.filter(p=>team==='all'||teamName(p.team)===team).flatMap(p=>C.milestones(p,kind));
    achievements.sort((a,b)=>(a.remaining/a.target)-(b.remaining/b.target)||a.remaining-b.remaining);
    const top=achievements.slice(0,12);
    $('milestoneCards').innerHTML=top.map(m=>{
      const label=`${m.target.toLocaleString('ja-JP')}${m.field}`;
      const url=C.playerUrl({選手名:m.name,team:m.team},kind);
      return `<article class="career-milestone-card"><a href="${esc(url)}">${esc(m.name)}</a><small>${esc(teamName(m.team))}</small>
        <span class="record">${esc(label)}まで</span><strong>あと${m.remaining.toLocaleString('ja-JP')}</strong>
        <div class="career-progress"><span style="width:${Math.min(100,m.ratio*100).toFixed(1)}%"></span></div>
        <p class="career-progress-text">${m.current.toLocaleString('ja-JP')} / ${m.target.toLocaleString('ja-JP')}</p></article>`;
    }).join('')||'<p class="small-note">現在、表示条件に入る記録はありません。</p>';
  }
  function render(){if(!state.data)return;const y=state.year==='2026'?2026:state.data.year;$('careerAsOf').textContent=y===2026?'2026年終了時点':`${y}年成績反映時点`;renderMilestones();renderRanking();}
  function fillTeams(){const items=Object.entries(C.teams).map(([full,short])=>short).sort((a,b)=>a.localeCompare(b,'ja'));for(const id of ['careerTeam','milestoneTeam'])$(id).insertAdjacentHTML('beforeend',items.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join(''));}
  function hook(){
    $('careerBatter').addEventListener('click',()=>changeType('batter'));
    $('careerPitcher').addEventListener('click',()=>changeType('pitcher'));
    $('careerSort').addEventListener('change',e=>{state.sort=e.target.value;state.page=1;render();});
    $('careerSearch').addEventListener('input',e=>{state.search=e.target.value;state.page=1;render();});
    $('careerTeam').addEventListener('change',e=>{state.team=e.target.value;state.page=1;render();});
    $('careerYear').addEventListener('change',e=>{state.year=e.target.value;state.page=1;render();});
    $('milestoneType').addEventListener('change',renderMilestones);
    $('milestoneTeam').addEventListener('change',renderMilestones);
    $('careerPrev').addEventListener('click',()=>{state.page--;renderRanking();});
    $('careerNext').addEventListener('click',()=>{state.page++;renderRanking();});
    $('careerHead').addEventListener('click',e=>{const k=e.target.closest('th[data-key]')?.dataset.key;if(k&&sorts[state.type].includes(k)){state.sort=k;$('careerSort').value=k;state.page=1;renderRanking();}});
  }
  async function init(){hook();fillTeams();syncSort();try{
      state.data=await C.load();
      if(state.data.year===2026){$('careerYear').innerHTML='<option value="2026">2026年終了時点</option>';state.year='2026';}
      else $('careerYear').querySelector('[value="latest"]').textContent=`${state.data.year}年成績反映（最新）`;
      render();
    }catch(err){$('milestoneCards').innerHTML=`<p class="small-note">データの取得に失敗しました：${esc(err.message)}</p>`;$('careerBody').innerHTML='<tr><td>成績を読み込めませんでした。</td></tr>';console.error(err);}
  }
  init();
})();