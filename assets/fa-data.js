/* FA / protected-list CSV helpers. No server or cookie dependency. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlayerLensFAData = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').normalize('NFKC').replace(/\s/g, '').toLowerCase();
  function parseCsv(text) {
    const rows=[]; let line=[],cell='',quote=false;
    const input=String(text).replace(/^\uFEFF/,'');
    for(let i=0;i<input.length;i++){
      const c=input[i];
      if(c==='"'){
        if(quote&&input[i+1]==='"'){cell+='"';i++;}
        else if(quote){quote=false;}
        else if(cell===''){quote=true;}
        else throw new Error('CSVの引用符の位置が不正です。');
      } else if(c===','&&!quote){line.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quote){
        if(c==='\r'&&input[i+1]==='\n')i++;
        line.push(cell);if(line.some(v=>v.trim()))rows.push(line);
        line=[];cell='';
      }else{cell+=c;}
    }
    if(quote)throw new Error('CSVの引用符が閉じていません。');
    line.push(cell);if(line.some(v=>v.trim()))rows.push(line);
    const headers=(rows.shift()||[]).map(v=>v.trim());
    return {headers,rows:rows.map(line=>Object.fromEntries(headers.map((h,i)=>[h,line[i]??''])))};
  }
  function requireColumns(parsed,names) {
    const missing=names.filter(name=>!parsed.headers.includes(name));
    if(missing.length)throw new Error('必要な項目がありません：'+missing.join('、'));
    return parsed.rows;
  }
  async function loadCsv(path,required) {
    const response=await fetch(new URL(path,document.baseURI),{cache:'no-store'});
    if(!response.ok)throw new Error('データを取得できません（'+response.status+'）');
    return requireColumns(parseCsv(await response.text()),required);
  }
  return {parseCsv,requireColumns,loadCsv,esc,norm};
});