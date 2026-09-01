import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoPrograma } from '../programa';
import type { ProgramaPlan } from '@/domain/planner/tipos';

const PLAN: ProgramaPlan = {
  objetivo: 'volumen',
  split: 'ppl3',
  semanas: 8,
  diasPorSemana: 3,
  dias: [
    {
      semana: 1,
      dia: 1,
      nombre: 'Empuje',
      musculos: ['pectorals', 'delts'],
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
    },
    {
      semana: 1,
      dia: 2,
      nombre: 'Tirón',
      musculos: ['lats'],
      ejercicios: [
        {
          orden: 1,
          ejercicioId: 'lats/chin-up',
          musculoObjetivo: 'lats',
          equipamiento: 'bodyweight',
          esAncla: true,
          series: 4,
          repMin: 12,
          repMax: 18,
          descansoSeg: 90,
        },
      ],
    },
  ],
};

describe('repositorio de programa', () => {
  it('guarda el plan y lo devuelve entero', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPrograma(adaptador);

    const programaId = await repo.guardar(PLAN);
    const activo = await repo.activo();

    expect(activo?.id).toBe(programaId);
    expect(activo?.plan.dias).toHaveLength(2);
    expect(activo?.plan.dias[0]?.musculos).toEqual(['pectorals', 'delts']);
    expect(activo?.plan.dias[0]?.ejercicios[0]?.esAncla).toBe(true);
  });

  it('desactiva el programa anterior al guardar uno nuevo', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPrograma(adaptador);

    const primero = await repo.guardar(PLAN);
    const segundo = await repo.guardar({ ...PLAN, objetivo: 'fuerza' });

    expect(segundo).not.toBe(primero);
    expect((await repo.activo())?.plan.objetivo).toBe('fuerza');
  });

  it('localiza el identificador de un día concreto', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPrograma(adaptador);
    const programaId = await repo.guardar(PLAN);

    const dia = await repo.diaDe(programaId, 1, 2);
    expect(dia?.nombre).toBe('Tirón');
    expect(dia?.ejercicios[0]?.ejercicioId).toBe('lats/chin-up');
  });
});
