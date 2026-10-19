// Basic client-side logic for GT7 Setup Lab (MVP)
const VEHICLES = [
  { id: 'nsx-type-s', name: 'NSX Type S (Sample)' },
  { id: 'mazda-rx7', name: 'Mazda RX-7 (Sample)' },
  { id: 'nissan-gt-r', name: 'Nissan GT-R (Sample)' }
];

const qs = sel => document.querySelector(sel);
const id = i => document.getElementById(i);

function populateVehicles(){
  const sel = id('vehicle-select');
  VEHICLES.forEach(v => {
    const o = document.createElement('option'); o.value = v.id; o.textContent = v.name; sel.appendChild(o);
  });
}

function readForm(){
  return {
    rideHeight: Number(id('rideHeight').value),
    springF: Number(id('springF').value),
    springR: Number(id('springR').value),
    arbF: Number(id('arbF').value),
    arbR: Number(id('arbR').value),
    brakeBias: Number(id('brakeBias').value)
  };
}

function writeForm(s){
  id('rideHeight').value = s.rideHeight ?? 25;
  id('springF').value = s.springF ?? 30;
  id('springR').value = s.springR ?? 30;
  id('arbF').value = s.arbF ?? 10;
  id('arbR').value = s.arbR ?? 10;
  id('brakeBias').value = s.brakeBias ?? 50;
}

function showOutput(obj){
  id('output').textContent = JSON.stringify(obj, null, 2);
}

function currentVehicleKey(){
  return `gt7setup:${id('vehicle-select').value}`;
}

function saveCurrent(){
  const key = currentVehicleKey();
  const data = readForm();
  localStorage.setItem(key, JSON.stringify(data));
  showOutput({saved: true, vehicle: id('vehicle-select').value, data});
}

function loadSaved(){
  const key = currentVehicleKey();
  const raw = localStorage.getItem(key);
  if(!raw){ showOutput({loaded:false, reason:'no saved setup'}); return; }
  const data = JSON.parse(raw);
  writeForm(data);
  showOutput({loaded:true, vehicle: id('vehicle-select').value, data});
}

function resetForm(){
  writeForm({});
  showOutput({reset:true});
}

function generateSetup(){
  // simple deterministic-ish generator based on vehicle id
  const vid = id('vehicle-select').value;
  let seed = 0;
  for(let i=0;i<vid.length;i++) seed += vid.charCodeAt(i);
  const rand = (min,max) => Math.round(((Math.sin(seed++)+1)/2)*(max-min)+min);
  const setup = {
    rideHeight: rand(10,40),
    springF: rand(20,60),
    springR: rand(20,60),
    arbF: rand(6,18),
    arbR: rand(6,18),
    brakeBias: rand(44,58)
  };
  writeForm(setup);
  showOutput({generatedFor: vid, setup});
}

function wire(){
  populateVehicles();
  id('generate-btn').addEventListener('click', generateSetup);
  id('save-btn').addEventListener('click', saveCurrent);
  id('load-btn').addEventListener('click', loadSaved);
  id('reset-btn').addEventListener('click', resetForm);
  // select first by default
  if(VEHICLES.length) id('vehicle-select').value = VEHICLES[0].id;
  resetForm();
}

window.addEventListener('DOMContentLoaded', wire);
