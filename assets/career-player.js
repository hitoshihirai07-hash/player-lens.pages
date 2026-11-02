/* Add a career summary directly below the existing season metrics without changing player.js. */
(function () {
  'use strict';
  const C=window.PlayerLensCareer;
  if(!C) return;
  const content=document.getElementById('playerContent');
  if(!content) return;
  const params=new URLSearchParams(location.search);
  const kind=params.get('type')==='pitcher'?'pitcher':'batter';
  const name=C.normalizeName(params.get('name')||'');
  const team=params.get('team')||'';
  const targetTeam=C.teams[team]||team;
  function match(rows){
    let matches=rows.filter(p=>C.normalizeName(p.選手名)===name);
    if(!matches.length)return null;
    const byTeam=matches.filter(p=>(C.teams[p.team]||p.team)===targetTeam);
    return byTeam.length===1?byTeam[0]:(matches.length===1?matches[0]:null);
  }
  const count=v=>v===''||v===undefined||v===null?'—':String(v);
  const metrics={batter:[['試合','試合'],['安打','安打'],['本塁打','本塁打'],['打率','打率'],['打点','打点'],['盗塁','盗塁'],['出塁率','出塁率'],['OPS','OPS']],
    pitcher:[['登板','登板'],['勝利','勝利'],['セーブ','セーブ'],['投球回','投球回'],['防御率','防御率'],['奪三振','奪三振'],['ホールド','ホールド'],['WHIP','WHIP']]};
  function html(p,year){
    const c=metrics[kind].map(([label,key])=>`<div class="metric"><span>${C.escapeHtml(label)}</span><strong>${C.escapeHtml(count(p[key]))}</strong></div>`).join('');
    const milestones=C.milestones(p,kind);
    const m=milestones.length?`<div class="career-personal-milestones"><h3>節目の記録まで</h3><ul>${milestones.map(s=>`<li><span>${C.escapeHtml(s.target.toLocaleString('ja-JP')+s.field)}</span><strong>あと${s.remaining.toLocaleString('ja-JP')}</strong></li>`).join('')}</ul></div>`:'';
    return `<section class="content-card career-player-section" id="careerPlayerStats"><div class="section-heading"><div><p class="eyebrow">Career Records</p><h2>通算成績</h2></div><span class="career-asof">${year}年時点</span></div>
      <p class="small-note">NPB一軍公式戦のみの通算。海外・ポストシーズン・ファーム成績は含みません。</p>
      <div class="metric-grid wide-metrics">${c}</div>${m}
      <div class="career-player-links"><a class="text-link" href="./career">通算ランキングと節目の記録を見る</a></div></section>`;
  }
  function afterSeasonData(p,year){
    let observer=null, attempts=0;
    const insert=()=>{
      if(document.getElementById('careerPlayerStats')){observer?.disconnect();return;}
      const cards=content.querySelectorAll(':scope > section.content-card');
      const main=Array.from(cards).find(node=>node.querySelector('h2')?.textContent?.trim()==='主な成績');
      if(!main)return;
      main.insertAdjacentHTML('afterend',html(p,year));
      observer?.disconnect();
    };
    insert();
    if(!document.getElementById('careerPlayerStats')){
      observer=new MutationObserver(()=>{insert();attempts++;if(attempts>80)observer.disconnect();});
      observer.observe(content,{childList:true});
    }
  }
  C.load().then(data=>{
    const rows=kind==='pitcher'?data.pitchers:data.batters;
    const p=match(rows);
    if(p?.active)afterSeasonData(p,data.year);
  }).catch(err=>console.warn('通算成績を読み込めませんでした',err));
})();