import assert from 'node:assert/strict';
import { filterRows, sortRows, summarizeCoverage } from './filter.mjs';

const rows = [
  { Provincia: 'Santa Cruz', Institucion: 'IPES A', Carrera: 'Profesorado de Inglés', Tipo: 'Profesorado', Resolucion: 'RM 1', Documentos_detectados: 'Plan PDF' },
  { Provincia: 'Tierra del Fuego', Institucion: 'CENT B', Carrera: 'Tecnicatura en Datos', Tipo: 'Tecnicatura superior', Resolucion: '', Documentos_detectados: '' },
  { Provincia: 'Santa Cruz', Institucion: 'InSET', Carrera: 'Hidrocarburos', Tipo: 'Tecnicatura superior', Resolucion: '0277/CPE/17', Documentos_detectados: 'Resolución/plan PDF' }
];

assert.deepEqual(filterRows(rows, { provincia: 'Santa Cruz' }).map(r => r.Carrera), ['Profesorado de Inglés', 'Hidrocarburos']);
assert.deepEqual(filterRows(rows, { q: 'datos' }).map(r => r.Institucion), ['CENT B']);
assert.deepEqual(filterRows(rows, { tipo: 'Tecnicatura superior', q: 'santa' }).map(r => r.Carrera), ['Hidrocarburos']);
assert.deepEqual(sortRows(rows, 'Carrera', 'asc').map(r => r.Carrera), ['Hidrocarburos', 'Profesorado de Inglés', 'Tecnicatura en Datos']);
assert.deepEqual(summarizeCoverage(rows), { total: 3, conResolucion: 2, conDocs: 2, conAmbos: 2 });
console.log('filter tests passed');
