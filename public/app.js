import { filterRows, sortRows, summarizeCoverage } from './filter.mjs';

const AUTH_EMAIL = 'santiago.pauli@cau.ues21.edu.ar';
const AUTH_PASSWORD_SHA256 = '78412bfbb4b638cb24906c9c20bd11ca3c541ecd69f2e5a96561bfc373a205da';
const AUTH_SESSION_KEY = 'institutos_sc_tdf_auth_v1';
let payload = null;
let view = 'oferta';
let sortField = 'Provincia';
let sortDirection = 'asc';

const el = (id) => document.getElementById(id);
const state = {
  q: '', provincia: '', tipo: '', institucion: ''
};

async function initAuth() {
  el('email').value = AUTH_EMAIL;
  const msg = el('authMessage');
  msg.textContent = '';
  if (sessionStorage.getItem(AUTH_SESSION_KEY) === 'ok') await showApp();
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

el('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = el('authMessage');
  msg.textContent = 'Verificando…';
  const emailOk = el('email').value.trim().toLowerCase() === AUTH_EMAIL.toLowerCase();
  const passOk = await sha256Hex(el('password').value) === AUTH_PASSWORD_SHA256;
  if (!emailOk || !passOk) {
    msg.textContent = 'Email o contraseña incorrectos.';
    return;
  }
  sessionStorage.setItem(AUTH_SESSION_KEY, 'ok');
  el('password').value = '';
  await showApp();
});

el('logoutBtn').addEventListener('click', async () => {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  el('app').hidden = true;
  el('auth').hidden = false;
});

async function showApp() {
  el('auth').hidden = true;
  el('app').hidden = false;
  if (!payload) {
    payload = await fetch('/data.json').then(r => r.json());
    hydrateControls();
    bindControls();
  }
  render();
}

function hydrateControls() {
  fillSelect('provincia', unique(payload.oferta, 'Provincia'));
  fillSelect('tipo', unique(payload.oferta, 'Tipo'));
  fillSelect('institucion', unique(payload.oferta, 'Institucion'));
}

function fillSelect(id, values) {
  const select = el(id);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function unique(rows, field) {
  return [...new Set(rows.map(r => r[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
}

function bindControls() {
  el('search').addEventListener('input', e => { state.q = e.target.value; render(); });
  for (const id of ['provincia','tipo','institucion']) {
    el(id).addEventListener('change', e => { state[id] = e.target.value; render(); });
  }
  el('sortField').addEventListener('change', e => { sortField = e.target.value; render(); });
  el('resetBtn').addEventListener('click', () => {
    Object.assign(state, { q:'', provincia:'', tipo:'', institucion:'' });
    for (const id of ['search','provincia','tipo','institucion']) el(id).value = '';
    render();
  });
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    view = btn.dataset.view;
    render();
  }));
  el('closeDialog').addEventListener('click', () => el('detailDialog').close());
}

function render() {
  renderStats();
  const rows = getVisibleRows();
  el('rowCount').textContent = `${rows.length} registros visibles`;
  const coverage = summarizeCoverage(filterRows(payload.oferta, state));
  el('coverage').textContent = `Resolución: ${coverage.conResolucion} · Docs: ${coverage.conDocs} · Ambos: ${coverage.conAmbos}`;
  renderTable(rows);
}

function renderStats() {
  const oferta = payload.oferta || [];
  const docs = payload.documentos || [];
  const coverage = summarizeCoverage(oferta);
  const cards = [
    ['Carreras/ofertas', oferta.length],
    ['Instituciones agrupadas', payload.instituciones.length],
    ['Documentos relevados', docs.length],
    ['Docs descargados OK', docs.filter(d => d.descarga_estado === 'ok').length],
    ['Con resolución', coverage.conResolucion],
  ];
  el('stats').innerHTML = cards.map(([label, value]) => `<article class="stat"><b>${value}</b><span>${label}</span></article>`).join('');
}

function getVisibleRows() {
  if (view === 'oferta') return sortRows(filterRows(payload.oferta, state), sortField, sortDirection);
  if (view === 'instituciones') return payload.instituciones.filter(rowMatchesSearch);
  if (view === 'documentos') return payload.documentos.filter(rowMatchesSearch);
  return payload.notas;
}

function rowMatchesSearch(row) {
  if (!state.q) return true;
  return Object.values(row).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(state.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

function renderTable(rows) {
  const headers = headerForView();
  const thead = `<thead><tr>${headers.map(h => `<th data-field="${h}">${label(h)}</th>`).join('')}<th>Acción</th></tr></thead>`;
  const tbody = `<tbody>${rows.map((row, index) => `<tr>${headers.map(h => `<td>${formatCell(h, row[h])}</td>`).join('')}<td><button class="secondary" data-detail="${index}">Ver</button></td></tr>`).join('')}</tbody>`;
  el('table').innerHTML = thead + tbody;
  document.querySelectorAll('th[data-field]').forEach(th => th.addEventListener('click', () => {
    sortField = th.dataset.field;
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    render();
  }));
  document.querySelectorAll('[data-detail]').forEach(btn => btn.addEventListener('click', () => openDetail(rows[Number(btn.dataset.detail)])));
}

function headerForView() {
  if (view === 'oferta') return ['Provincia','Institucion','Localidad','Carrera','Tipo','Duracion','Resolucion','Documentos_detectados'];
  if (view === 'instituciones') return ['Provincia','Institucion','Localidad_sede','CUEs_anexos','Gestion_tipo','URL_fuente'];
  if (view === 'documentos') return ['institucion','carrera_doc','tipo','descarga_estado','archivo_local','url'];
  return ['Tema','Nota'];
}

function label(value) {
  return String(value).replaceAll('_',' ').replace('Institucion','Institución').replace('Resolucion','Resolución');
}

function formatCell(field, value) {
  const text = String(value ?? '');
  if (!text) return '<span class="muted">—</span>';
  if (field.toLowerCase().includes('url')) return `<a href="${escapeAttr(text)}" target="_blank" rel="noopener">Abrir fuente</a>`;
  if (field === 'descarga_estado') {
    const cls = text === 'ok' ? 'ok' : text === 'omitido' ? 'warn' : 'bad';
    return `<span class="pill ${cls}">${escapeHtml(text)}</span>`;
  }
  if (field === 'Tipo') return `<span class="pill">${escapeHtml(text)}</span>`;
  return escapeHtml(text.length > 140 ? `${text.slice(0, 140)}…` : text);
}

function openDetail(row) {
  el('detailContent').innerHTML = `<h2>${escapeHtml(row.Carrera || row.Institucion || row.institucion || row.Tema || 'Detalle')}</h2><dl class="detail-grid">${Object.entries(row).map(([k,v]) => `<dt>${label(k)}</dt><dd>${formatDetail(k,v)}</dd>`).join('')}</dl>`;
  el('detailDialog').showModal();
}

function formatDetail(field, value) {
  const text = String(value ?? '');
  if (!text) return '<span class="muted">—</span>';
  if (field.toLowerCase().includes('url')) return `<a href="${escapeAttr(text)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
  return escapeHtml(text);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }

initAuth();
