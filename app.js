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

function sha256Hex(value) {
  // Avoid WebCrypto here: some mobile in-app browsers can leave crypto.subtle.digest()
  // pending, which keeps the UI stuck on “Verificando…”. This synchronous SHA-256
  // implementation is small and works anywhere ES modules run.
  const source = unescape(encodeURIComponent(value));
  const msg = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) msg[i] = source.charCodeAt(i);

  const bitLen = msg.length * 8;
  let paddedLen = msg.length + 1;
  while (paddedLen % 64 !== 56) paddedLen += 1;

  const bytes = new Uint8Array(paddedLen + 8);
  bytes.set(msg);
  bytes[msg.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLen, Math.floor(bitLen / 0x100000000));
  view.setUint32(paddedLen + 4, bitLen >>> 0);

  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + k[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0,h1,h2,h3,h4,h5,h6,h7].map(n => n.toString(16).padStart(8, '0')).join('');
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
    payload = await fetch('data.json').then(r => r.json());
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
