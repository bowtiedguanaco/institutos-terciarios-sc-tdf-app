export function filterRows(rows, filters = {}) {
  const q = normalize(filters.q || '');
  const provincia = normalize(filters.provincia || '');
  const tipo = normalize(filters.tipo || '');
  const institucion = normalize(filters.institucion || '');

  return rows.filter((row) => {
    if (provincia && normalize(row.Provincia) !== provincia) return false;
    if (tipo && normalize(row.Tipo) !== tipo) return false;
    if (institucion && normalize(row.Institucion) !== institucion) return false;
    if (!q) return true;
    const haystack = normalize([
      row.Provincia,
      row.Institucion,
      row.Localidad,
      row.Carrera,
      row.Tipo,
      row.Resolucion,
      row.Documentos_detectados,
      row.Notas,
    ].join(' '));
    return haystack.includes(q);
  });
}

export function sortRows(rows, field, direction = 'asc') {
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = normalize(a[field]);
    const bv = normalize(b[field]);
    return av.localeCompare(bv, 'es') * sign;
  });
}

export function summarizeCoverage(rows) {
  const hasDocs = (row) => Boolean(String(row.Documentos_detectados || '').trim());
  const hasResolution = (row) => Boolean(String(row.Resolucion || '').trim());
  return {
    total: rows.length,
    conResolucion: rows.filter(hasResolution).length,
    conDocs: rows.filter(hasDocs).length,
    conAmbos: rows.filter((row) => hasResolution(row) && hasDocs(row)).length,
  };
}

export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
