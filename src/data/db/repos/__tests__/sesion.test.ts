import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoSesion } from '../sesion';
import type { Adaptador } from '../../adaptador';

async function conDiaDePrograma(adaptador: Adaptador): Promise<number> {
  const programaId = await adaptador.insertar(
    `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
     VALUES ('volumen', 8, 3, 'ppl3', '2026-01-01T00:00:00.000Z', 1)`,
  );
  return adaptador.insertar(
    `INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos)
     VALUES (?, 1, 1, 'Empuje', '["pectorals"]')`,
    [programaId],
  );
}

const SERIE_BASE = {
  ejercicioId: 'pectorals/dumbbell-bench-press',
  numero: 1,
  pesoMeta: 20,
  repsMeta: 10,
  pesoLogrado: 20,
  repsLogradas: 10,
};

describe('repositorio de sesiones', () => {
  it('crea una sesión en borrador y la encuentra por su día', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);

    const sesionId = await repo.crear(diaId);
    const borrador = await repo.borradorDe(diaId);

    expect(borrador?.id).toBe(sesionId);
    expect(borrador?.estado).toBe('borrador');
  });

  it('registra series y las devuelve como historial del ejercicio', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);
    const sesionId = await repo.crear(diaId);

    await repo.registrarSerie({ ...SERIE_BASE, sesionId, numero: 1, repsLogradas: 10 });
    await repo.registrarSerie({ ...SERIE_BASE, sesionId, numero: 2, repsLogradas: 8 });

    const historial = await repo.historialDe(SERIE_BASE.ejercicioId);
    expect(historial).toHaveLength(2);
    expect(historial.map((s) => s.repsLogradas).sort((a, b) => a - b)).toEqual([8, 10]);
    expect(historial[0]?.sesionId).toBe(sesionId);
  });

  it('reescribe una serie si se corrige el mismo número', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);
    const sesionId = await repo.crear(diaId);

    await repo.registrarSerie({ ...SERIE_BASE, sesionId });
    await repo.registrarSerie({ ...SERIE_BASE, sesionId, repsLogradas: 12 });

    const historial = await repo.historialDe(SERIE_BASE.ejercicioId);
    expect(historial).toHaveLength(1);
    expect(historial[0]?.repsLogradas).toBe(12);
  });

  it('completa la sesión y deja de considerarla borrador', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);
    const sesionId = await repo.crear(diaId);

    await repo.completar(sesionId);

    expect(await repo.borradorDe(diaId)).toBeNull();
    expect(await repo.completadasEntre('2000-01-01', '2100-01-01')).toHaveLength(1);
    expect(await repo.diasCompletados()).toEqual([diaId]);
  });
});
