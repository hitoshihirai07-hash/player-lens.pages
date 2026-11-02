/* Player Lens career data (NPB official first-team regular season only).
   UMD exports allow the aggregation logic to be tested independently. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlayerLensCareer = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const BASE_PATH = './data/career/';
  const numericFields = {
    batter: ['試合','打席','打数','安打','本塁打','打点','盗塁','四球','死球','塁打','犠飛','得点','二塁打','三塁打','三振'],
    pitcher: ['登板','先発','完投','完封勝','無四球','勝利','敗北','セーブ','ホールド','HP','打者','安打','失点','自責点','被本塁打','奪三振','与四球','故意四','与死球','暴投','ボーク']
  };
  const teams = {
    '読売ジャイアンツ':'巨人','阪神タイガース':'阪神','中日ドラゴンズ':'中日',
    '広島東洋カープ':'広島','東京ヤクルトスワローズ':'ヤクルト','横浜DeNAベイスターズ':'DeNA',
    '福岡ソフトバンクホークス':'ソフトバンク','北海道日本ハムファイターズ':'日本ハム',
    'オリックス・バファローズ':'オリックス','千葉ロッテマリーンズ':'ロッテ',
    '東北楽天ゴールデンイーグルス':'楽天','埼玉西武ライオンズ':'西武'
  };
  const normalizeName = v => String(v ?? '').normalize('NFKC').replace(/[\s\u3000]/g, '').toLowerCase();
  const normalizeId = v => String(v ?? '').trim().replace(/^'/,'').padStart(8,'0');
  const toNumber = v => v === undefined || v === null || String(v).trim() === '' ? null : Number(String(v).replace(/,/g,''));
  const toCount = v => toNumber(v) ?? 0;
  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/,'');
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i=0;i<text.length;i++) {
      const c=text[i];
      if (quoted) { if(c==='"' && text[i+1]==='"') {cell+='"';i++;} else if(c==='"') quoted=false; else cell+=c; }
      else if(c==='"') quoted=true;
      else if(c===',') {row.push(cell);cell='';}
      else if(c==='\n' || c==='\r') {if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted) throw new Error('CSVの引用符が閉じられていません。');
    if(row.length||cell){row.push(cell);if(row.some(Boolean))rows.push(row);}
    if(!rows.length)return [];
    const header=rows[0].map(s=>s.trim());
    if(header.some((h,i)=>header.indexOf(h)!==i))throw new Error('CSVの列名に重複があります。');
    return rows.slice(1).map((r)=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])));
  }
  function outsFromInnings(raw) {
    const v=String(raw??'').trim();
    if(!v) return 0;
    if(v==='+')return 0;
    const m=v.match(/^(\d+)(?:\.([012]))?\+?$/);
    if(!m)throw new Error('投球回が不正です: '+v);
    return Number(m[1])*3+Number(m[2]||0);
  }
  const inningsFromOuts = n => `${Math.floor(n/3)}${n%3 ? '.'+n%3 : ''}`;
  const fixed = (n, digits) => Number.isFinite(n) ? n.toFixed(digits) : '';
  function ensureNumber(v, field, playerName) {
    const n=toNumber(v);
    if(n!==null && (!Number.isFinite(n)||n<0))throw new Error(`${playerName}: ${field} の値が不正です`);
    return n;
  }
  function buildBaseline(rows, kind) {
    const map=new Map();
    for(const r of rows){
      const id=normalizeId(r.選手ID || r.PlayerID);
      if(!/^\d{8}$/.test(id))throw new Error(`選手IDが不正です: ${r.選手名}`);
      if(map.has(id))throw new Error(`選手IDが重複しています: ${id}`);
      const obj={ ...r, 選手ID:id, team:r.球団名||r.所属正式名||'', kind,
        active: Boolean(r[kind==='batter'?'試合':'登板']),
        missingSF:kind==='batter' && r.犠飛===undefined,
        outs:kind==='pitcher'&&r.投球回?outsFromInnings(r.投球回):0,
        years: [], base: {...r}, addedSeason:false };
      for(const field of numericFields[kind]) if(r[field]!==undefined)ensureNumber(r[field],field,r.選手名);
      map.set(id,obj);
    }
    return map;
  }
  function applySeason(map,rows,kind,year) {
    const seen=new Set();
    const required=kind==='batter' ? ['選手ID','試合','打席','打数','安打','塁打','本塁打','打点','盗塁','四球','死球','犠飛'] :
      ['選手ID','登板','投球回','自責点','安打','与四球','奪三振'];
    if(rows.length && required.some(k=>!(k in rows[0])))throw new Error(`${year}年${kind==='batter'?'野手':'投手'}の年度CSVには ${required.filter(k=>!(k in rows[0])).join('、')} 列が必要です。`);
    for(const r of rows){
      const id=normalizeId(r.選手ID);
      if(seen.has(id))throw new Error(`${year}年の選手ID重複: ${id}`);
      seen.add(id);
      let target=map.get(id);
      if(!target){
        target={選手ID:id,選手名:r.選手名||'',team:r.球団名||'',球団名:r.球団名||'',kind,years:[],outs:0,missingSF:false,addedSeason:false,active:false};
        map.set(id,target);
      }
      // A season file represents a single season, not a new cumulative snapshot.
      if(kind==='pitcher') target.outs+=outsFromInnings(r.投球回);
      for(const field of numericFields[kind]) {
        if(!(field in r))continue;
        const n=ensureNumber(r[field],field,r.選手名) ?? 0;
        target[field]=toCount(target[field])+n;
      }
      if(r.球団名){target.team=r.球団名;target.球団名=r.球団名;}
      if(r.選手名)target.選手名=r.選手名;
      target.years.push(year);
      target.addedSeason=true;
      target.active=target.active || Boolean(kind==='pitcher'?toCount(r.登板):toCount(r.試合));
    }
  }
  function finalize(map,kind){
    const result=[];
    for(const p of map.values()){
      const r={...p};
      if(kind==='batter'){
        if(r.addedSeason){
          r.打率=toCount(r.打数)>0 ? fixed(toCount(r.安打)/toCount(r.打数),3) : '';
          r.長打率=toCount(r.打数)>0 ? fixed(toCount(r.塁打)/toCount(r.打数),3) : '';
          // 2026 base CSV lacks sacrifice flies. Do not manufacture a career OBP/OPS.
          if(r.missingSF){r.出塁率='';r.OPS='';}
          else{
            const d=toCount(r.打数)+toCount(r.四球)+toCount(r.死球)+toCount(r.犠飛);
            const obp=d>0 ? (toCount(r.安打)+toCount(r.四球)+toCount(r.死球))/d : 0;
            r.出塁率=fixed(obp,3);
            r.OPS=fixed(obp+(toCount(r.打数)>0?toCount(r.塁打)/toCount(r.打数):0),3);
          }
        }
      }else{
        if(r.addedSeason){
          r.投球回=inningsFromOuts(r.outs);
          const ip=r.outs/3;
          r.防御率=ip>0 ? fixed(9*toCount(r.自責点)/ip,2):'';
          r.WHIP=ip>0 ? fixed((toCount(r.安打)+toCount(r.与四球))/ip,3):'';
          r.勝率=toCount(r.勝利)+toCount(r.敗北)>0 ? fixed(toCount(r.勝利)/(toCount(r.勝利)+toCount(r.敗北)),3):'';
        }
      }
      result.push(r);
    }
    return result;
  }
  const RULES={
    batter:[{field:'安打',threshold:150,targets:[1000,1500,2000,2500,3000]},{field:'本塁打',threshold:20,targets:[100,150,200,250,300,350,400,450,500,600]},{field:'試合',threshold:50,targets:[1000,1500,2000,2500,3000]},{field:'盗塁',threshold:20,targets:[200,300,400,500]}],
    pitcher:[{field:'勝利',threshold:20,targets:[100,150,200,250,300]},{field:'セーブ',threshold:15,targets:[100,150,200,250,300,350,400]},{field:'奪三振',threshold:100,targets:[1000,1500,2000,2500,3000]},{field:'登板',threshold:50,targets:[500,600,700,800,900,1000]}]
  };
  function milestones(r,kind){
    if(!r.active)return [];
    return RULES[kind].flatMap(({field,threshold,targets})=>{
      const v=toNumber(r[field]);if(v===null)return [];
      const target=targets.find(t=>t>v);if(!target||target-v>threshold)return [];
      return [{field,target,current:v,remaining:target-v,ratio:v/target,playerId:r.選手ID,name:r.選手名,team:r.team,kind}];
    }).sort((a,b)=>a.remaining/b.target-b.remaining/a.target);
  }
  function playerUrl(r,kind){return `./player?name=${encodeURIComponent(r.選手名)}&team=${encodeURIComponent(teams[r.team]||r.team||'')}&type=${kind==='pitcher'?'pitcher':'batter'}`;}
  async function loadText(url){const resp=await fetch(url,{cache:'no-cache'});if(!resp.ok)throw new Error(`取得できません: ${url} (${resp.status})`);return resp.text();}
  async function load(){
    const manifest=JSON.parse(await loadText(BASE_PATH+'seasons.json'));
    if(manifest.baseYear!==2026||!Array.isArray(manifest.seasons))throw new Error('通算成績の年度設定が不正です');
    const [b,p]=await Promise.all([loadText(BASE_PATH+manifest.baseBatter),loadText(BASE_PATH+manifest.basePitcher)]);
    const batters=buildBaseline(parseCSV(b),'batter');const pitchers=buildBaseline(parseCSV(p),'pitcher');
    const seasons=[...manifest.seasons].sort((a,b)=>a.year-b.year);
    let previous=manifest.baseYear;
    for(const s of seasons){
      if(!Number.isInteger(s.year)||s.year<=previous||!s.batter||!s.pitcher)throw new Error('年度設定に重複・不足があります');
      previous=s.year;
      const [bt,pt]=await Promise.all([loadText(BASE_PATH+s.batter),loadText(BASE_PATH+s.pitcher)]);
      applySeason(batters,parseCSV(bt),'batter',s.year);
      applySeason(pitchers,parseCSV(pt),'pitcher',s.year);
    }
    return {year:previous,baseYear:manifest.baseYear,batters:finalize(batters,'batter'),pitchers:finalize(pitchers,'pitcher'),baseBatters:finalize(buildBaseline(parseCSV(b),'batter'),'batter'),basePitchers:finalize(buildBaseline(parseCSV(p),'pitcher'),'pitcher')};
  }
  let promise;
  return {load:()=>promise||(promise=load().catch(e=>{promise=null;throw e;})),parseCSV,normalizeName,normalizeId,teams,toNumber,toCount,outsFromInnings,inningsFromOuts,buildBaseline,applySeason,finalize,milestones,playerUrl,escapeHtml};
});