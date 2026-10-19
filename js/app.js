// js/app.js — expanded behaviors: tests rendering, troubleshooting, compare
const state = {
  vehicles: [],
  selectedVehicle: null,
  parts: new Set(),
  concept: 'stability',
  generated: null,
  records: []
}

async function loadSampleData(){
  const res = await fetch('data/vehicles.sample.json');
  state.vehicles = await res.json();
  renderVehicleList();
}

function renderVehicleList(filter=''){
  const ul = document.getElementById('vehicle-list');
  ul.innerHTML = '';
  const drive = document.getElementById('filter-drive').value;
  const q = document.getElementById('search').value.toLowerCase();
  state.vehicles.filter(v=>{
    if(drive && v.drive !== drive) return false;
    if(q && !(v.maker.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))) return false;
    return true;
  }).forEach(v=>{
    const li = document.createElement('li');
    li.textContent = `${v.maker} ${v.model} (${v.year})`;
    li.onclick = ()=>{selectVehicle(v.id)};
    ul.appendChild(li);
  })
}

function selectVehicle(id){
  const v = state.vehicles.find(x=>x.id===id);
  state.selectedVehicle = v;
  const d = document.getElementById('vehicle-detail');
  d.innerHTML = '';
  if(!v) return;
  const html = `
    <strong>${v.maker} ${v.model} (${v.year})</strong>
    <div>駆動方式: ${v.drive}</div>
    <div>出力: ${v.power_hp ?? '不明'} HP</div>
    <div>重量: ${v.weight_kg ?? '不明'} kg</div>
    <div>PP: ${v.pp ?? '未設定'}</div>
    <div>出典: ${v.source ?? '未指定'}</div>
    <div><a href="${v.url}" target="_blank">公式ページ</a></div>
  `
  d.innerHTML = html;
}

function attachHandlers(){
  document.getElementById('search').addEventListener('input', renderVehicleList);
  document.getElementById('filter-drive').addEventListener('change', renderVehicleList);
  document.querySelectorAll('input[name=parts]').forEach(el=>{
    el.addEventListener('change', (e)=>{
      if(e.target.checked) state.parts.add(e.target.value); else state.parts.delete(e.target.value);
    })
  });
  document.getElementById('concept').addEventListener('change', e=>state.concept=e.target.value);
  document.getElementById('generate').addEventListener('click', async (e)=>{
    e.preventDefault();
    await generateSetting();
  });
  document.getElementById('save').addEventListener('click', saveCurrentSetting);
  document.getElementById('export-json').addEventListener('click', exportRecords);
  document.getElementById('import-json').addEventListener('click', ()=>document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', handleFileImport);
  document.getElementById('export-setting').addEventListener('click', exportGeneratedJSON);
  document.getElementById('export-setting-csv').addEventListener('click', exportGeneratedCSV);
  document.getElementById('compare-btn').addEventListener('click', compareRecords);
  document.getElementById('troubleshoot-btn').addEventListener('click', openTroubleshoot);
  document.getElementById('import-vehicles').addEventListener('click', ()=>document.getElementById('vehicle-file-input').click());
  document.getElementById('vehicle-file-input').addEventListener('change', handleVehicleImport);
  document.getElementById('export-vehicles').addEventListener('click', exportVehiclesJSON);
}

async function generateSetting(){
  const resultDiv = document.getElementById('generation-result');
  if(!state.selectedVehicle){ resultDiv.textContent='車種を選択してください'; return; }
  const payload = {
    vehicle: state.selectedVehicle,
    parts: Array.from(state.parts),
    concept: state.concept
  }
  const generated = generate(payload);
  state.generated = generated;
  renderGenerated(generated);
  renderTests(generated.tests || []);
}

function renderGenerated(gen){
  const d = document.getElementById('generation-result');
  d.innerHTML='';
  const title = document.createElement('div'); title.className='generation-item'; title.innerHTML=`<strong>セッティング（${gen.summary}）</strong>`;
  d.appendChild(title);
  gen.items.forEach(it=>{
    const el = document.createElement('div'); el.className='generation-item';
    el.innerHTML = `<div><strong>${it.name}</strong>: ${it.value} <small style="color:#9aa4b2">(${it.confidence})</small></div>
    <details><summary>狙い・効果・トレードオフ</summary>
    <div>${it.reason}</div>
    </details>`;
    d.appendChild(el);
  })
}

function renderTests(tests){
  const node = document.getElementById('test-procedures'); node.innerHTML='';
  if(!tests || !tests.length) return;
  const h = document.createElement('h3'); h.textContent='検証手順（GT7内でのテスト）'; node.appendChild(h);
  tests.forEach(t=>{
    const el = document.createElement('div'); el.className='generation-item';
    el.innerHTML = `<strong>${t.title}</strong>
      <div><em>目的:</em> ${t.purpose}</div>
      <div><em>推奨コース/区間:</em> ${t.recommendedTrack}</div>
      <div><em>操作:</em> ${t.operation}</div>
      <div><em>観察点:</em> ${t.observe}</div>
      <div><em>判定基準:</em> ${t.successCriteria}</div>
      <div><em>調整候補:</em> ${t.adjustments.join(', ')}</div>
      ${t.note?`<div class="muted">注: ${t.note}</div>`:''}
    `;
    node.appendChild(el);
  })
}

function saveCurrentSetting(){
  if(!state.generated) { alert('先にセッティングを生成してください'); return; }
  const id = 's_'+Date.now();
  const rec = { id, vehicle: state.selectedVehicle.id, vehicle_label: `${state.selectedVehicle.maker} ${state.selectedVehicle.model}`, name: state.generated.summary, generated: state.generated, parts: Array.from(state.parts), concept: state.concept, created_at: new Date().toISOString() };
  state.records.push(rec);
  localStorage.setItem('gt7_records', JSON.stringify(state.records));
  renderRecords();
  alert('保存しました');
}

function renderRecords(){
  const node = document.getElementById('records');
  node.innerHTML='';
  if(state.records.length===0){ node.textContent='保存済みセッティングはありません'; return; }
  state.records.forEach(r=>{
    const el = document.createElement('div'); el.className='generation-item';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><input type="checkbox" class="select-record" data-id="${r.id}"> <strong>${r.name}</strong> - ${r.vehicle_label} <div><small>${r.created_at}</small></div></div><div><button class="load-btn" data-id="${r.id}">読み込み</button></div></div>`;
    node.appendChild(el);
  })
  document.querySelectorAll('.load-btn').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; loadRecord(id); }));
}

function loadRecord(id){
  const r = state.records.find(x=>x.id===id); if(!r) return; state.generated = r.generated; state.selectedVehicle = state.vehicles.find(v=>v.id===r.vehicle) || state.selectedVehicle; renderGenerated(state.generated); renderTests(state.generated.tests || []);
  alert('セッティングを読み込みました（画面表示のみ）');
}

function exportRecords(){
  const dataStr = JSON.stringify(state.records, null, 2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='gt7_records.json'; a.click();
}

function exportGeneratedJSON(){
  if(!state.generated) { alert('先に生成してください'); return; }
  const blob = new Blob([JSON.stringify(state.generated, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='gt7_setting.json'; a.click();
}

function exportGeneratedCSV(){
  if(!state.generated) { alert('先に生成してください'); return; }
  // export items as CSV rows: name,value,confidence,reason
  const rows = [['name','value','confidence','reason']];
  state.generated.items.forEach(it=> rows.push([it.name, (it.value+'').replace(/\n/g,' '), it.confidence, (it.reason+'').replace(/\n/g,' ')]));
  const csv = rows.map(r=>r.map(c=>`"${(''+c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='gt7_setting.csv'; a.click();
}

function handleFileImport(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ const obj = JSON.parse(reader.result); if(Array.isArray(obj)) { state.records = obj; localStorage.setItem('gt7_records', JSON.stringify(state.records)); renderRecords(); alert('インポート完了'); } else { alert('JSON は配列を指定してください'); } } catch(err){ alert('JSON の読み込みに失敗しました: '+err.message); }
  }
  reader.readAsText(f);
}

function handleVehicleImport(e){
  const f = e.target.files[0]; if(!f) return; const reader = new FileReader();
  reader.onload = ()=>{
    const text = reader.result;
    if(f.name.endsWith('.json')){
      try{ const obj = JSON.parse(text); if(Array.isArray(obj)) { state.vehicles = state.vehicles.concat(obj); localStorage.setItem('gt7_vehicles', JSON.stringify(state.vehicles)); renderVehicleList(); alert('車両データ(JSON)をインポートしました'); } else { alert('車両JSONは配列である必要があります'); } } catch(err){ alert('JSON 読み込み失敗: '+err.message); }
    } else if(f.name.endsWith('.csv')){
      // simple CSV parse
      const lines = text.split(/\r?\n/).filter(l=>l.trim());
      const header = lines.shift().split(',').map(h=>h.trim());
      const arr = lines.map(l=>{
        const cols = l.split(','); const obj={}; header.forEach((h,i)=> obj[h]=cols[i]??'' ); return obj;
      });
      // convert fields
      arr.forEach(r=>{
        state.vehicles.push({ id:r.id || `${r.maker}-${r.model}-${r.year}`, maker:r.maker, model:r.model, year:r.year, drive:r.drive, power_hp: r.power_hp?Number(r.power_hp):null, torque_nm:r.torque_nm?Number(r.torque_nm):null, weight_kg:r.weight_kg?Number(r.weight_kg):null, pp:r.pp?Number(r.pp):null, url:r.url, source:r.source||'csv', verified:r.verified==='true', last_checked:r.last_checked||null });
      });
      localStorage.setItem('gt7_vehicles', JSON.stringify(state.vehicles)); renderVehicleList(); alert('車両データ(CSV)をインポートしました');
    } else { alert('対応していないファイル形式です'); }
  };
  reader.readAsText(f);
}

function exportVehiclesJSON(){
  const blob = new Blob([JSON.stringify(state.vehicles, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='gt7_vehicles.json'; a.click();
}

function compareRecords(){
  const checked = Array.from(document.querySelectorAll('.select-record:checked')).map(c=>c.dataset.id);
  if(checked.length!==2){ alert('比較するセッティングを2つ選択してください'); return; }
  const r1 = state.records.find(r=>r.id===checked[0]); const r2 = state.records.find(r=>r.id===checked[1]);
  if(!r1 || !r2) return; const out = document.getElementById('compare-result'); out.innerHTML='';
  const h = document.createElement('h3'); h.textContent='セッティング比較'; out.appendChild(h);
  // compare generated.items by name
  const map1 = {}; r1.generated.items.forEach(i=>map1[i.name]=i);
  const map2 = {}; r2.generated.items.forEach(i=>map2[i.name]=i);
  const allNames = Array.from(new Set(Object.keys(map1).concat(Object.keys(map2))));
  allNames.forEach(name=>{
    const a = map1[name]; const b = map2[name];
    const el = document.createElement('div'); el.className='generation-item';
    if(!a) el.innerHTML = `<strong>${name}</strong>: なし vs ${b.value}`;
    else if(!b) el.innerHTML = `<strong>${name}</strong>: ${a.value} vs なし`;
    else if(a.value===b.value) el.innerHTML = `<strong>${name}</strong>: ${a.value} (同一)`;
    else el.innerHTML = `<strong>${name}</strong>: <span style="color:#ffcc66">${a.value}</span> ⇄ <span style="color:#9ad">${b.value}</span>`;
    out.appendChild(el);
  });
}

function openTroubleshoot(){
  const symptoms = [
    '進入時に曲がらない', 'コーナー進入時にフロントが逃げる', '旋回中にアンダーステアが出る', '立ち上がりでリアが滑る', 'ブレーキング時に車体が不安定になる', '高速コーナーでリアが落ち着かない', '縁石や段差を越えた後に姿勢が乱れる', '切り返しの反応が遅い', 'タイヤが滑りやすい', '車両が過度に回り込む', 'ラップタイムが安定しない'
  ];
  const container = document.createElement('div'); container.style.maxHeight='60vh'; container.style.overflow='auto';
  symptoms.forEach(s=>{
    const b = document.createElement('button'); b.textContent = s; b.style.display='block'; b.style.width='100%'; b.style.margin='6px 0';
    b.addEventListener('click', ()=>{ showTroubleshootDetail(s); });
    container.appendChild(b);
  });
  // show as a simple modal-like area in generation-result
  const modal = document.getElementById('generation-result'); modal.innerHTML=''; const title = document.createElement('h3'); title.textContent='症状別トラブルシューティング'; modal.appendChild(title); modal.appendChild(container);
}

function showTroubleshootDetail(symptom){
  const d = document.getElementById('generation-result'); d.innerHTML=''; const title = document.createElement('h3'); title.textContent=symptom; d.appendChild(title);
  // simple rule-set
  const advice = {
    '進入時に曲がらない': {
      causes: ['速度が速すぎる','フロントのグリップ不足','タイヤ温度不足','フロントのキャンバー不足'],
      checks: ['進入速度を下げて確認','タイヤの温度とコンパウンドを確認','ブレーキの入力を見直す'],
      adjustments: ['フロントキャンバーの増加（少し）','フロントの車高を下げる','フロントのアンチロールバーを柔らかくする']
    },
    '旋回中にアンダーステアが出る':{
      causes:['前荷重不足','フロントのグリップ低下','タイヤの過熱または冷却不足'],
      checks:['同じ速度での再現性を確認','タイヤ空気圧を確認','デファレンシャルの硬さ確認'],
      adjustments:['フロントキャンバー増加','フロントのダウンフォース増加','フロントARBの柔らか化']
    },
    '立ち上がりでリアが滑る':{
      causes:['LSDが強すぎる','リアのトラクション不足','タイヤの損耗'],
      checks:['加速時の車両挙動を観察','LSD設定を緩めて試す'],
      adjustments:['LSD初期トルクを下げる','リアのダウンフォースを増やす（グリップ系）']
    }
  };
  const info = advice[symptom] || {causes:['原因が特定できません'], checks:['運転操作を確認'], adjustments:['小幅な変更を逐次実施']};
  const el = document.createElement('div'); el.className='generation-item';
  el.innerHTML = `<div><strong>考えられる原因</strong><ul>${info.causes.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div><strong>最初に確認すべき運転操作や条件</strong><ul>${info.checks.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div><strong>優先度付き調整候補</strong><ul>${info.adjustments.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div><em>注意:</em> 変更は1項目ずつ行い、再現性のあるテストを行ってください。</div>`;
  d.appendChild(el);
}

function loadRecords(){
  const raw = localStorage.getItem('gt7_records'); if(raw) try{ state.records = JSON.parse(raw); } catch(e){ state.records = []; }
  const rawV = localStorage.getItem('gt7_vehicles'); if(rawV) try{ state.vehicles = JSON.parse(rawV); } catch(e){}
  renderRecords();
}

window.addEventListener('DOMContentLoaded', ()=>{
  attachHandlers();
  loadSampleData();
  loadRecords();
});
