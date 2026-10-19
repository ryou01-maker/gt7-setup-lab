// js/ui/collapsible.js
// Simple helper to create a collapsible block programmatically
function createCollapsible(title, innerHTML){
  const container = document.createElement('div'); container.className='details-block';
  const summary = document.createElement('button'); summary.textContent = title; summary.style.width='100%'; summary.style.textAlign='left'; summary.style.padding='8px'; summary.style.border='none'; summary.style.background='transparent'; summary.style.color='inherit';
  const content = document.createElement('div'); content.style.display='none'; content.innerHTML = innerHTML; content.style.marginTop='8px';
  summary.addEventListener('click', ()=>{ content.style.display = content.style.display==='none' ? 'block' : 'none'; });
  container.appendChild(summary); container.appendChild(content);
  return container;
}
