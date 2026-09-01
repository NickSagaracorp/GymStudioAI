import { evaluarReto } from '../retos';
import type { RetoEvaluable } from '../retos';
import type { SerieHecha } from '../tipos';

const SESIONES = [
  { terminadaEn: '2026-09-02T19:00:00.000Z' },
  { terminadaEn: '2026-09-05T19:00:00.000Z' },
  { terminadaEn: '2026-10-05T19:00:00.000Z' },
];

const SERIES: SerieHecha[] = [
  {
    sesionId: 1,
    ejercicioId: 'pectorals/dumbbell-bench-press',
    numero: 1,
    bajada: 0,
    pesoLogrado: 20,
    repsLogradas: 10,
    completadaEn: '2026-09-02T19:10:00.000Z',
  },
  {
    sesionId: 2,
    ejercicioId: 'pectorals/dumbbell-bench-press',
    numero: 1,
    bajada: 0,
    pesoLogrado: 24,
    repsLogradas: 8,
    completadaEn: '2026-09-05T19:10:00.000Z',
  },
  {
    sesionId: 3,
    ejercicioId: 'biceps/dumbbell-biceps-curl',
    numero: 1,
    bajada: 0,
    pesoLogrado: 10,
    repsLogradas: 12,
    completadaEn: '2026-09-05T19:20:00.000Z',
  },
];

const datos = { sesionesCompletadas: SESIONES, series: SERIES };

const base: RetoEvaluable = {
  tipo: 'sesiones',
  ejercicioId: null,
  metaValor: 2,
  fechaInicio: '2026-09-01',
  fechaFin: '2026-09-30',
};

describe('evaluación de retos', () => {
  it('cuenta solo las sesiones dentro del rango', () => {
    expect(evaluarReto(base, datos, '2026-09-10')).toEqual({
      valorActual: 2,
      estado: 'logrado',
    });
  });

  it('sigue activo si aún no llega a la meta y no ha vencido', () => {
    expect(evaluarReto({ ...base, metaValor: 5 }, datos, '2026-09-10')).toEqual({
      valorActual: 2,
      estado: 'activo',
    });
  });

  it('falla cuando vence sin alcanzar la meta', () => {
    expect(evaluarReto({ ...base, metaValor: 5 }, datos, '2026-10-01')).toEqual({
      valorActual: 2,
      estado: 'fallido',
    });
  });

  it('mide la carga máxima del ejercicio indicado', () => {
    const reto: RetoEvaluable = {
      tipo: 'carga',
      ejercicioId: 'pectorals/dumbbell-bench-press',
      metaValor: 24,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-30',
    };
    expect(evaluarReto(reto, datos, '2026-09-10')).toEqual({
      valorActual: 24,
      estado: 'logrado',
    });
  });

  it('suma el volumen de todas las series del rango', () => {
    const reto: RetoEvaluable = {
      tipo: 'volumen',
      ejercicioId: null,
      metaValor: 1000,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-30',
    };
    // 20*10 + 24*8 + 10*12 = 512
    expect(evaluarReto(reto, datos, '2026-09-10')).toEqual({
      valorActual: 512,
      estado: 'activo',
    });
  });

  it('incluye el día de inicio y el de fin', () => {
    const reto: RetoEvaluable = { ...base, fechaInicio: '2026-09-02', fechaFin: '2026-09-02' };
    expect(evaluarReto(reto, datos, '2026-09-02').valorActual).toBe(1);
  });

  it('un reto logrado sigue logrado aunque haya vencido', () => {
    expect(evaluarReto(base, datos, '2026-12-31').estado).toBe('logrado');
  });
});
