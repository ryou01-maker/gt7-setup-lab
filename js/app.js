// js/app.js — improved validations, restore, and messages
const state = {
  vehicles: [],
  selectedVehicle: null,
  parts: new Set(),
  concept: 'stability',
  generated: null,
  records: []
}

// UI helpers
function showAlert(msg, type='info', timeout=4000){
  const node = document.getElementById('app-alert');
  if(!node) { alert(msg); return; }
  node.textContent = msg; node.className = 'app-alert ' + (type==='error' ? 'error' : 'info'); node.style.display='inline-block';
  if(timeout>0){ setTimeout(()=>{ node.style.display='none'; }, timeout); }
}

function appendImportLog(msg){
  const node = document.getElementById('import-log'); if(!node) return; const p = document.createElement('div'); p.textContent = msg; node.appendChild(p);
}

async function loadSampleData(){
  try{
    const res = await fetch('data/vehicles.more.sample.json');
    state.vehicles = await res.json();
  } catch(e){
    // fallback
    const res = await fetch('data/vehicles.sample.json');
    state.vehicles = await res.json();
  }
  renderVehicleList();
}

function renderVehicleList(filter=''){
  const ul = document.getElementById('vehicle-list');
  ul.innerHTML = '';
  const drive = document.getElementById('filter-drive').value;
  const q = (document.getElementById('search').value || '').toLowerCase();
  state.vehicles.filter(v=>{
    if(drive && v.drive !== drive) return false;
    if(q && !( (v.maker||'').toLowerCase().includes(q) || (v.model||'').toLowerCase().includes(q))) return false;
    return true;
  }).forEach(v=>{
    const li = document.createElement('li');
    li.textContent = `${v.maker} ${v.model} (${v.year})`;
    li.tabIndex = 0;
    li.onclick = ()=>{selectVehicle(v.id)};
    li.onkeypress = (e)=>{ if(e.key==='Enter') selectVehicle(v.id); };
    ul.appendChild(li);
  })
}

function selectVehicle(id){
  const v = state.vehicles.find(x=>x.id===id);
  state.selectedVehicle = v;
  const d = document.getElementById('vehicle-detail');
  d.innerHTML = '';
  if(!v) return;
  // escape fields to avoid injection if data is untrusted
  const maker = escapeHtml(v.maker);
  const model = escapeHtml(v.model);
  const year = escapeHtml(v.year);
  const drive = escapeHtml(v.drive ?? '不明');
  const power = escapeHtml(v.power_hp ?? '不明');
  const weight = escapeHtml(v.weight_kg ?? '不明');
  const pp = escapeHtml(v.pp ?? '未設定');
  const source = escapeHtml(v.source ?? '未指定');
  const url = escapeHtml(v.url ?? '#');

  const html = `
    <strong>${maker} ${model} (${year})</strong>
    <div>駆動方式: ${drive}</div>
    <div>出力: ${power} HP</div>
    <div>重量: ${weight} kg</div>
    <div>PP: ${pp}</div>
    <div>出典: ${source}</div>
    <div><a href="${url}" target="_blank" rel="noopener noreferrer">公式ページ</a></div>
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
  resultDiv.innerHTML = '';
  if(!state.selectedVehicle){ showAlert('車種を選択してください', 'error'); document.getElementById('search').focus(); const vl = document.getElementById('vehicle-list'); vl.classList.add('input-error'); setTimeout(()=>vl.classList.remove('input-error'),2000); return; }
  const payload = { vehicle: state.selectedVehicle, parts: Array.from(state.parts), concept: state.concept }
  try{
    const generated = generate(payload);
    state.generated = generated;
    renderGenerated(generated);
    renderTests(generated.tests || []);
    showAlert('セッティングを生成しました', 'info', 3000);
  } catch(err){ resultDiv.textContent = '生成中にエラーが発生しました: '+err.message; showAlert('生成中にエラーが発生しました: '+err.message, 'error', 6000); }
}

function renderGenerated(gen){
  const d = document.getElementById('generation-result'); d.innerHTML='';
  const title = document.createElement('div'); title.className='generation-item'; title.innerHTML=`<strong>セッティング（${escapeHtml(gen.summary)})</strong>`;
  d.appendChild(title);
  gen.items.forEach(it=>{
    const el = document.createElement('div'); el.className='generation-item';
    el.innerHTML = `<div><strong>${escapeHtml(it.name)}</strong>: ${escapeHtml(it.value)} <small class="muted">(${escapeHtml(it.confidence)})</small></div>
    <details><summary>狙い・効果・トレードオフ / 適用条件</summary>
    <div>${escapeHtml(it.reason)}<br/><em>適用条件：</em>${escapeHtml(it.apply)}</div>
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
    el.innerHTML = `<strong>${escapeHtml(t.title)}</strong>
      <div><em>目的:</em> ${escapeHtml(t.purpose)}</div>
      <div><em>推奨コース/区間:</em> ${escapeHtml(t.recommendedTrack)}</div>
      <div><em>操作:</em> ${escapeHtml(t.operation)}</div>
      <div><em>観察点:</em> ${escapeHtml(t.observe)}</div>
      <div><em>判定基準:</em> ${escapeHtml(t.successCriteria)}</div>
      <div><em>調整候補:</em> ${escapeHtml((t.adjustments||[]).join(', '))}</div>
      ${t.note?`<div class="muted">注: ${escapeHtml(t.note)}</div>`:''}
    `;
    node.appendChild(el);
  })
}

function saveCurrentSetting(){
  if(!state.generated) { showAlert('先にセッティングを生成してください','error'); return; }
  const id = 's_'+Date.now();
  const rec = { id, vehicle: state.selectedVehicle.id, vehicle_label: `${state.selectedVehicle.maker} ${state.selectedVehicle.model}`, name: state.generated.summary, generated: state.generated, parts: Array.from(state.parts), concept: state.concept, created_at: new Date().toISOString() };
  state.records.push(rec);
  localStorage.setItem('gt7_records', JSON.stringify(state.records));
  renderRecords();
  // highlight newly saved entry
  setTimeout(()=>{
    const el = document.querySelector(`[data-record-id="${rec.id}"]`);
    if(el){ el.classList.add('recently-saved'); setTimeout(()=>el.classList.remove('recently-saved'),2500); }
  },50);
  showAlert('セッティングを保存しました','info',2500);
}

function renderRecords(){
  const node = document.getElementById('records'); node.innerHTML='';
  if(state.records.length===0){ node.textContent='保存済みセッティングはありません'; return; }
  state.records.forEach(r=>{
    const el = document.createElement('div'); el.className='generation-item'; el.setAttribute('data-record-id', r.id);
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><input type="checkbox" class="select-record" data-id="${r.id}"> <strong>${escapeHtml(r.name)}</strong> - ${escapeHtml(r.vehicle_label)} <div><small>${r.created_at}</small></div></div><div><button class="load-btn" data-id="${r.id}">読み込み</button> <button class="restore-btn" data-id="${r.id}">復元</button></div></div>`;
    node.appendChild(el);
  })
  document.querySelectorAll('.load-btn').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; loadRecord(id); }));
  document.querySelectorAll('.restore-btn').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; restoreRecord(id); }));
}

function loadRecord(id){
  const r = state.records.find(x=>x.id===id); if(!r) { showAlert('指定セッティングが見つかりません','error'); return; }
  state.generated = r.generated; state.selectedVehicle = state.vehicles.find(v=>v.id===r.vehicle) || state.selectedVehicle; renderGenerated(state.generated); renderTests(state.generated.tests || []);
  showAlert('セッティングを読み込みました（表示のみ）','info',2000);
}

function restoreRecord(id){
  const r = state.records.find(x=>x.id===id); if(!r) { showAlert('指定セッティングが見つかりません','error'); return; }
  state.generated = r.generated; state.selectedVehicle = state.vehicles.find(v=>v.id===r.vehicle) || state.selectedVehicle; state.parts = new Set(r.parts||[]); state.concept = r.concept; renderGenerated(state.generated); renderTests(state.generated.tests || []);
  showAlert('セッティングを復元しました（現在の状態として反映）','info',2000);
}

function exportRecords(){
  const dataStr = JSON.stringify(state.records, null, 2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='gt7_records.json'; a.click();
  showAlert('走行記録をJSONでエクスポートしました','info',2500);
}

function exportGeneratedJSON(){
  if(!state.generated) { showAlert('先に生成してください','error'); return; }
  const blob = new Blob([JSON.stringify(state.generated, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='gt7_setting.json'; a.click();
  showAlert('生成済みセッティングをJSONで出力しました','info',2000);
}

function exportGeneratedCSV(){
  if(!state.generated) { showAlert('先に生成してください','error'); return; }
  const rows = [['name','value','confidence','reason','apply']];
  state.generated.items.forEach(it=> rows.push([it.name, (it.value+'').replace(/\n/g,' '), it.confidence, (it.reason+'').replace(/\n/g,' '), (it.apply||'').replace(/\n/g,' ')]));
  const csv = rows.map(r=>r.map(c=>`"${(''+c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='gt7_setting.csv'; a.click();
  showAlert('生成済みセッティングをCSVで出力しました','info',2000);
}

function handleFileImport(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ const obj = JSON.parse(reader.result); if(Array.isArray(obj)) { state.records = obj; localStorage.setItem('gt7_records', JSON.stringify(state.records)); renderRecords(); appendImportLog(`Imported ${obj.length} records from ${f.name}`); showAlert('インポート完了','info',2000); } else { appendImportLog('JSONは配列である必要があります'); showAlert('JSONは配列である必要があります','error',4000); } } catch(err){ appendImportLog('JSONの読み込みに失敗しました: '+err.message); showAlert('JSONの読み込みに失敗しました','error',5000); }
  }
  reader.readAsText(f);
}

function handleVehicleImport(e){
  const f = e.target.files[0]; if(!f) return; const reader = new FileReader();
  reader.onload = ()=>{
    const text = reader.result;
    if(f.name.endsWith('.json')){
      try{ const obj = JSON.parse(text); if(Array.isArray(obj)) { state.vehicles = state.vehicles.concat(obj); localStorage.setItem('gt7_vehicles', JSON.stringify(state.vehicles)); renderVehicleList(); appendImportLog(`Imported ${obj.length} vehicles from ${f.name}`); showAlert('車両データ(JSON)をインポートしました','info',2500); } else { appendImportLog('車両JSONは配列である必要があります'); showAlert('車両JSONは配列である必要があります','error',4000); } } catch(err){ appendImportLog('JSON 読み込み失敗: '+err.message); showAlert('JSON 読み込み失敗','error',5000); }
    } else if(f.name.endsWith('.csv')){
      // improved CSV parse (handles quoted fields and reports errors)
      try{
        const rows = parseCSV(text);
        if(rows.length<1){ appendImportLog('CSVにデータがありません'); showAlert('CSVにデータがありません','error',3000); return; }
        const header = rows[0].map(h=>String(h||'').trim());
        const headerLower = header.map(h=>h.toLowerCase());
        // simple validation
        if(!headerLower.includes('maker') || !headerLower.includes('model')){ appendImportLog('CSVヘッダに maker, model カラムが必要です'); showAlert('CSVヘッダが不正です（maker, model が必要）','error',4000); return; }
        const arr = rows.slice(1).map((cols, idx)=>{
          if(cols.length !== header.length){ appendImportLog(`行 ${idx+2} のカラム数がヘッダと一致しません`); }
          const obj={}; headerLower.forEach((h,i)=> obj[h]=cols[i]??'' ); return obj;
        });
        arr.forEach(r=>{
          state.vehicles.push({ id:r.id || `${r.maker}-${r.model}-${r.year}`, maker:r.maker, model:r.model, year:r.year, drive:r.drive, power_hp: r.power_hp?Number(r.power_hp):null, torque_nm:r.torque_nm?Number(r.torque_nm):null, weight_kg:r.weight_kg?Number(r.weight_kg):null, pp:r.pp?Number(r.pp):null, url:r.url, source:r.source||'csv', verified:r.verified==='true', last_checked:r.last_checked||null });
        });
        localStorage.setItem('gt7_vehicles', JSON.stringify(state.vehicles)); renderVehicleList(); appendImportLog(`Imported ${arr.length} vehicles from ${f.name}`); showAlert('車両データ(CSV)をインポートしました','info',2500);
      } catch(err){ appendImportLog('CSV読み込みエラー: '+err.message); showAlert('CSV読み込みエラー','error',5000); }
    } else { appendImportLog('対応していないファイル形式です'); showAlert('対応していないファイル形式です','error',3000); }
  };
  reader.readAsText(f);
}

function exportVehiclesJSON(){
  const blob = new Blob([JSON.stringify(state.vehicles, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='gt7_vehicles.json'; a.click();
  showAlert('車両データをエクスポートしました','info',2000);
}

function compareRecords(){
  const checked = Array.from(document.querySelectorAll('.select-record:checked')).map(c=>c.dataset.id);
  if(checked.length!==2){ showAlert('比較するセッティングを2つ選択してください','error'); return; }
  const r1 = state.records.find(r=>r.id===checked[0]); const r2 = state.records.find(r=>r.id===checked[1]);
  if(!r1 || !r2) return; const out = document.getElementById('compare-result'); out.innerHTML='';
  const h = document.createElement('h3'); h.textContent='セッティング比較'; out.appendChild(h);
  const map1 = {}; r1.generated.items.forEach(i=>map1[i.name]=i);
  const map2 = {}; r2.generated.items.forEach(i=>map2[i.name]=i);
  const allNames = Array.from(new Set(Object.keys(map1).concat(Object.keys(map2))));
  allNames.forEach(name=>{
    const a = map1[name]; const b = map2[name];
    const el = document.createElement('div'); el.className='generation-item';
    if(!a) el.innerHTML = `<strong>${escapeHtml(name)}</strong>: なし vs ${escapeHtml(b.value)}`;
    else if(!b) el.innerHTML = `<strong>${escapeHtml(name)}</strong>: ${escapeHtml(a.value)} vs なし`;
    else if(a.value===b.value) el.innerHTML = `<strong>${escapeHtml(name)}</strong>: ${escapeHtml(a.value)} (同一)`;
    else el.innerHTML = `<strong>${escapeHtml(name)}</strong>: <span style="color:#ffcc66">${escapeHtml(a.value)}</span> ⇄ <span style="color:#9ad">${escapeHtml(b.value)}</span>`;
    out.appendChild(el);
  });
}

function openTroubleshoot(){
  const symptoms = [ '進入時に曲がらない', 'コーナー進入時にフロントが逃げる', '旋回中にアンダーステアが出る', '立ち上がりでリアが滑る', 'ブレーキング時に車体が不安定になる', '高速コーナーでリアが落ち着かない', '縁石や段差を越えた後に姿勢が乱れる', '切り返しの反応が遅い', 'タイヤが滑りやすい', '車両が過度に回り込む', 'ラップタイムが安定しない' ];
  const container = document.createElement('div'); container.style.maxHeight='60vh'; container.style.overflow='auto';
  symptoms.forEach(s=>{
    const b = document.createElement('button'); b.textContent = s; b.style.display='block'; b.style.width='100%'; b.style.margin='6px 0';
    b.addEventListener('click', ()=>{ showTroubleshootDetail(s); });
    container.appendChild(b);
  });
  const modal = document.getElementById('generation-result'); modal.innerHTML=''; const title = document.createElement('h3'); title.textContent='症状別トラブルシューティング'; modal.appendChild(title); modal.appendChild(container);
}

function showTroubleshootDetail(symptom){
  const d = document.getElementById('generation-result'); d.innerHTML=''; const title = document.createElement('h3'); title.textContent=symptom; d.appendChild(title);
  const advice = {
    '進入時に曲がらない': { causes: ['速度が速すぎる','フロントのグリップ不足','タイヤ温度不足','運転操作（ブレーキング）'], checks: ['進入速度を下げて確認','タイヤ空気圧と温度を確認','ブレーキングの仕方をチェック'], adjustments: ['フロントキャンバーを増やす（少し）','フロントの車高を下げる','フロントARBを柔らかくする'] },
    '旋回中にアンダーステアが出る':{ causes:['前後の重量配分','フロントのグリップ低下','デフ設定'], checks:['同じ速度で再現性確認','タイヤ空気圧確認','運転の軌道確認'], adjustments:['フロントキャンバー増加','フロントダウンフォース増加','フロントARBの柔らか化'] },
    '立ち上がりでリアが滑る':{ causes:['LSDが硬い','リアのトラクション不足','タイヤの温度/摩耗'], checks:['加速時の挙動観察','LSDを緩めて試す','タイヤ状態確認'], adjustments:['LSD初期トルクを下げる','リアのダウンフォース増加','トルク管理'] }
  };
  const info = advice[symptom] || {causes:['原因不明'], checks:['運転操作を確認'], adjustments:['1項目ずつ小幅な変更を行う']};
  const el = document.createElement('div'); el.className='generation-item';
  el.innerHTML = `<div><strong>考えられる原因</strong><ul>${info.causes.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
  <div><strong>最初に確認すべき運転操作や条件</strong><ul>${info.checks.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
  <div><strong>優先度付き調整候補</strong><ul>${info.adjustments.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
  <div><em>注意:</em> 変更は1項目ずつ行い、検証手順に従って結果を記録してください。</div>`;
  d.appendChild(el);
}

function loadRecords(){
  const raw = localStorage.getItem('gt7_records'); if(raw) try{ state.records = JSON.parse(raw); } catch(e){ state.records = []; }
  const rawV = localStorage.getItem('gt7_vehicles'); if(rawV) try{ state.vehicles = JSON.parse(rawV); } catch(e){}
  renderRecords();
}

function parseCSV(text){
  const rows=[]; const lines = text.split(/\r?\n/);
  for(let li=0; li<lines.length; li++){
    const line = lines[li]; if(!line) continue;
    const cols=[]; let cur=''; let inQuotes=false;
    for(let j=0;j<line.length;j++){
      const ch=line[j];
      if(ch==='"'){
        if(inQuotes && line[j+1]==='"'){ cur+='"'; j++; }
        else { inQuotes=!inQuotes; }
      } else if(ch===',' && !inQuotes){ cols.push(cur); cur=''; }
      else { cur+=ch; }
    }
    cols.push(cur);
    // trim surrounding quotes and whitespace
    rows.push(cols.map(c=>c.trim().replace(/^"|"$/g,'')));
  }
  return rows;
}

function escapeHtml(s){ if(s==null) return ''; return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('DOMContentLoaded', ()=>{ attachHandlers(); loadSampleData(); loadRecords(); });
