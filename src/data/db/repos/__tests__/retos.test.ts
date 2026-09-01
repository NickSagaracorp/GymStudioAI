import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoRetos } from '../retos';

describe('repositorio de retos', () => {
  it('crea un reto con progreso a cero', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoRetos(adaptador);

    await repo.crear({
      titulo: '12 entrenamientos en 30 días',
      tipo: 'sesiones',
      ejercicioId: null,
      metaValor: 12,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-30',
    });

    const activos = await repo.activos();
    expect(activos).toHaveLength(1);
    expect(activos[0]?.valorActual).toBe(0);
    expect(activos[0]?.estado).toBe('activo');
  });

  it('actualiza progreso y estado', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoRetos(adaptador);

    const retoId = await repo.crear({
      titulo: 'Press de banca 24 kg',
      tipo: 'carga',
      ejercicioId: 'pectorals/dumbbell-bench-press',
      metaValor: 24,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-10-31',
    });

    await repo.actualizar(retoId, 24, 'logrado');

    expect(await repo.activos()).toHaveLength(0);
    const todos = await repo.todos();
    expect(todos[0]?.estado).toBe('logrado');
    expect(todos[0]?.valorActual).toBe(24);
  });
});
