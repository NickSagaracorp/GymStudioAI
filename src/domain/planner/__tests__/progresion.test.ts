import type { Perfil } from '@/data/db/repos/perfil';
import { calcularMeta } from '../progresion';
import type { EjercicioDia, SerieHecha } from '../tipos';

const PERFIL: Perfil = {
  nombre: 'Nick',
  sexo: 'hombre',
  fechaNac: '1988-04-12',
  alturaCm: 178,
  nivel: 'intermedio',
  objetivo: 'volumen',
  diasPorSemana: 4,
  mancuernaMinKg: 2,
  mancuernaMaxKg: 30,
  incrementoKg: 2,
  tieneBanco: true,
  tieneBarraDominadas: true,
  diaMedicion: 0,
  nivelActividad: 'moderado',
};

const CON_CARGA: EjercicioDia = {
  orden: 1,
  ejercicioId: 'pectorals/dumbbell-bench-press',
  musculoObjetivo: 'pectorals',
  equipamiento: 'dumbbell',
  esAncla: true,
  series: 3,
  repMin: 8,
  repMax: 12,
  descansoSeg: 90,
};

const CORPORAL: EjercicioDia = {
  ...CON_CARGA,
  ejercicioId: 'lats/chin-up',
  musculoObjetivo: 'lats',
  equipamiento: 'bodyweight',
  repMin: 12,
  repMax: 18,
};

function seriesDe(
  ejercicioId: string,
  sesionId: number,
  fecha: string,
  reps: number[],
  peso: number | null,
): SerieHecha[] {
  return reps.map((repsLogradas, indice) => ({
    sesionId,
    ejercicioId,
    numero: indice + 1,
    pesoLogrado: peso,
    repsLogradas,
    completadaEn: fecha,
  }));
}

const sesion = (sesionId: number, fecha: string, reps: number[], peso: number | null) =>
  seriesDe(CON_CARGA.ejercicioId, sesionId, fecha, reps, peso);

const sesionCorporal = (sesionId: number, fecha: string, reps: number[]) =>
  seriesDe(CORPORAL.ejercicioId, sesionId, fecha, reps, null);

describe('doble progresión con carga', () => {
  it('pide peso inicial la primera vez', () => {
    expect(calcularMeta([], CON_CARGA, PERFIL)).toEqual({
      pesoMeta: null,
      repsMeta: 8,
      series: 3,
      pesoInicialRequerido: true,
    });
  });

  it('sube el peso cuando se completan todas las series en el tope', () => {
    const meta = calcularMeta(sesion(1, '2026-09-01', [12, 12, 12], 20), CON_CARGA, PERFIL);
    expect(meta.pesoMeta).toBe(22);
    expect(meta.repsMeta).toBe(8);
  });

  it('mantiene el peso y pide una repetición más si no se llegó al tope', () => {
    const meta = calcularMeta(sesion(1, '2026-09-01', [10, 9, 9], 20), CON_CARGA, PERFIL);
    expect(meta.pesoMeta).toBe(20);
    expect(meta.repsMeta).toBe(11);
  });

  it('no propone más repeticiones que el tope del rango', () => {
    const meta = calcularMeta(sesion(1, '2026-09-01', [12, 12, 10], 20), CON_CARGA, PERFIL);
    expect(meta.repsMeta).toBe(12);
  });

  it('baja el peso tras dos sesiones por debajo del mínimo', () => {
    const historial = [
      ...sesion(2, '2026-09-08', [6, 6, 5], 20),
      ...sesion(1, '2026-09-01', [7, 6, 6], 20),
    ];
    const meta = calcularMeta(historial, CON_CARGA, PERFIL);
    expect(meta.pesoMeta).toBe(18);
    expect(meta.repsMeta).toBe(8);
  });

  it('no baja el peso si solo ha fallado una sesión', () => {
    const historial = [
      ...sesion(2, '2026-09-08', [6, 6, 5], 20),
      ...sesion(1, '2026-09-01', [10, 10, 9], 20),
    ];
    expect(calcularMeta(historial, CON_CARGA, PERFIL).pesoMeta).toBe(20);
  });

  it('redondea el peso al incremento declarado', () => {
    const perfilDe5 = { ...PERFIL, incrementoKg: 5 };
    const historial = [
      ...sesion(2, '2026-09-08', [6, 6, 5], 22),
      ...sesion(1, '2026-09-01', [7, 6, 6], 22),
    ];
    expect(calcularMeta(historial, CON_CARGA, perfilDe5).pesoMeta).toBe(20);
  });

  it('ignora el historial de otros ejercicios', () => {
    const ajeno = seriesDe('biceps/dumbbell-biceps-curl', 9, '2026-09-20', [12, 12, 12], 14);
    expect(calcularMeta(ajeno, CON_CARGA, PERFIL).pesoInicialRequerido).toBe(true);
  });
});

describe('progresión sin carga', () => {
  it('empieza en el mínimo del rango sin pedir peso', () => {
    expect(calcularMeta([], CORPORAL, PERFIL)).toEqual({
      pesoMeta: null,
      repsMeta: 12,
      series: 3,
      pesoInicialRequerido: false,
    });
  });

  it('añade una serie cuando se completa el tope en todas', () => {
    const meta = calcularMeta(sesionCorporal(1, '2026-09-01', [18, 18, 18]), CORPORAL, PERFIL);
    expect(meta.series).toBe(4);
    expect(meta.repsMeta).toBe(12);
    expect(meta.pesoMeta).toBeNull();
  });

  it('no pasa de cinco series', () => {
    const meta = calcularMeta(
      sesionCorporal(1, '2026-09-01', [18, 18, 18, 18, 18]),
      { ...CORPORAL, series: 5 },
      PERFIL,
    );
    expect(meta.series).toBe(5);
  });

  it('pide una repetición más si no se llegó al tope', () => {
    const meta = calcularMeta(sesionCorporal(1, '2026-09-01', [15, 14, 13]), CORPORAL, PERFIL);
    expect(meta.repsMeta).toBe(16);
    expect(meta.series).toBe(3);
  });
});
