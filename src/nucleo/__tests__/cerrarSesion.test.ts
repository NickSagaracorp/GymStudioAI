import { crearAdaptadorMemoria } from '@/data/db/pruebas/adaptadorMemoria';
import { migrar } from '@/data/db/migraciones';
import { repoRetos } from '@/data/db/repos/retos';
import { repoSesion } from '@/data/db/repos/sesion';
import type { Adaptador } from '@/data/db/adaptador';
import { cerrarSesion } from '../cerrarSesion';

async function conDiaDePrograma(adaptador: Adaptador): Promise<number> {
  const programaId = await adaptador.insertar(
    `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
     VALUES ('volumen', 8, 3, 'ppl3', '2026-09-01T00:00:00.000Z', 1)`,
  );
  return adaptador.insertar(
    `INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos)
     VALUES (?, 1, 1, 'Empuje', '["pectorals"]')`,
    [programaId],
  );
}

async function preparar() {
  const adaptador = crearAdaptadorMemoria();
  await migrar(adaptador);
  const diaId = await conDiaDePrograma(adaptador);
  return { adaptador, diaId, sesiones: repoSesion(adaptador), retos: repoRetos(adaptador) };
}

describe('cierre de sesión', () => {
  it('marca la sesión completada y devuelve su resumen', async () => {
    const { sesiones, retos, diaId } = await preparar();
    const sesionId = await sesiones.crear(diaId);

    await sesiones.registrarSerie({
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 1,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 10,
    });
    await sesiones.registrarSerie({
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 2,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 8,
    });

    const resumen = await cerrarSesion({ sesiones, retos }, sesionId);

    expect(resumen.seriesCompletadas).toBe(2);
    expect(resumen.volumenKg).toBe(360);
    expect(await sesiones.borradorDe(diaId)).toBeNull();
  });

  it('actualiza el progreso de los retos activos', async () => {
    const { sesiones, retos, diaId } = await preparar();

    const retoId = await retos.crear({
      titulo: '1 entrenamiento',
      tipo: 'sesiones',
      ejercicioId: null,
      metaValor: 1,
      fechaInicio: '2000-01-01',
      fechaFin: '2100-01-01',
    });

    const sesionId = await sesiones.crear(diaId);
    const resumen = await cerrarSesion({ sesiones, retos }, sesionId);

    expect(resumen.retosLogrados.map((r) => r.id)).toEqual([retoId]);
    expect((await retos.todos())[0]?.estado).toBe('logrado');
    expect((await retos.todos())[0]?.valorActual).toBe(1);
  });

  it('deja activo un reto que aún no llega a la meta', async () => {
    const { sesiones, retos, diaId } = await preparar();

    await retos.crear({
      titulo: '10 entrenamientos',
      tipo: 'sesiones',
      ejercicioId: null,
      metaValor: 10,
      fechaInicio: '2000-01-01',
      fechaFin: '2100-01-01',
    });

    const sesionId = await sesiones.crear(diaId);
    const resumen = await cerrarSesion({ sesiones, retos }, sesionId);

    expect(resumen.retosLogrados).toEqual([]);
    expect((await retos.activos())[0]?.valorActual).toBe(1);
  });

  it('el reto de carga mira el peso levantado, no el número de sesiones', async () => {
    const { sesiones, retos, diaId } = await preparar();

    await retos.crear({
      titulo: 'Press de banca 24 kg',
      tipo: 'carga',
      ejercicioId: 'pectorals/dumbbell-bench-press',
      metaValor: 24,
      fechaInicio: '2000-01-01',
      fechaFin: '2100-01-01',
    });

    const sesionId = await sesiones.crear(diaId);
    await sesiones.registrarSerie({
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 1,
      pesoMeta: 24,
      repsMeta: 8,
      pesoLogrado: 24,
      repsLogradas: 8,
    });

    const resumen = await cerrarSesion({ sesiones, retos }, sesionId);

    expect(resumen.retosLogrados).toHaveLength(1);
  });
});
