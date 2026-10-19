// js/app.js — minimal SPA behavior
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

function saveCurrentSetting(){
  if(!state.generated) { alert('先にセッティングを生成してください'); return; }
  const id = 's_'+Date.now();
  const rec = { id, vehicle: state.selectedVehicle.id, name: state.generated.summary, generated: state.generated, created_at: new Date().toISOString() };
  state.records.push(rec);
  localStorage.setItem('gt7_records', JSON.stringify(state.records));
  renderRecords();
  alert('保存しました');
}

function renderRecords(){
  const node = document.getElementById('records');
  node.innerHTML='';
  state.records.forEach(r=>{
    const el = document.createElement('div'); el.className='generation-item';
    el.innerHTML = `<div><strong>${r.name}</strong> - ${r.vehicle} <div><small>${r.created_at}</small></div></div>`;
    node.appendChild(el);
  })
}

function exportRecords(){
  const dataStr = JSON.stringify(state.records, null, 2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='gt7_records.json'; a.click();
}

function handleFileImport(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ const obj = JSON.parse(reader.result); if(Array.isArray(obj)) { state.records = obj; localStorage.setItem('gt7_records', JSON.stringify(state.records)); renderRecords(); alert('インポート完了'); } else { alert('JSON は配列を指定してください'); } } catch(err){ alert('JSON の読み込みに失敗しました: '+err.message); }
  }
  reader.readAsText(f);
}

function loadRecords(){
  const raw = localStorage.getItem('gt7_records'); if(!raw) return; try{ state.records = JSON.parse(raw); } catch(e){ state.records = []; }
  renderRecords();
}

// load generator function from engine/generator.js (global generate)

window.addEventListener('DOMContentLoaded', ()=>{
  attachHandlers();
  loadSampleData();
  loadRecords();
});
