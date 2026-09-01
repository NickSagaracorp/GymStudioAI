import { duracionEstimadaMin, siguienteDia } from '../agenda';
import type { DiaPlan } from '../tipos';

const dia = (semana: number, numero: number): DiaPlan & { id: number } => ({
  id: semana * 10 + numero,
  semana,
  dia: numero,
  nombre: 'Empuje',
  musculos: ['pectorals'],
  ejercicios: [
    {
      orden: 1,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      musculoObjetivo: 'pectorals',
      equipamiento: 'dumbbell',
      esAncla: true,
      series: 4,
      repMin: 8,
      repMax: 12,
      descansoSeg: 90,
    },
  ],
});

const DIAS = [dia(1, 1), dia(1, 2), dia(2, 1)];

describe('agenda', () => {
  it('propone el primer día cuando no hay nada completado', () => {
    expect(siguienteDia(DIAS, [])?.id).toBe(11);
  });

  it('salta a la siguiente sesión pendiente', () => {
    expect(siguienteDia(DIAS, [11])?.id).toBe(12);
    expect(siguienteDia(DIAS, [11, 12])?.id).toBe(21);
  });

  it('devuelve null cuando el programa está terminado', () => {
    expect(siguienteDia(DIAS, [11, 12, 21])).toBeNull();
  });

  it('no depende del orden en que lleguen los días', () => {
    expect(siguienteDia([dia(2, 1), dia(1, 2), dia(1, 1)], [])?.id).toBe(11);
  });

  it('estima la duración a partir de series y descanso', () => {
    // 4 series × (45 s + 90 s) = 540 s = 9 min
    expect(duracionEstimadaMin(dia(1, 1))).toBe(9);
  });
});
