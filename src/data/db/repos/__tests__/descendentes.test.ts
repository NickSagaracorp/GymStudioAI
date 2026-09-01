import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar, MIGRACIONES } from '../../migraciones';
import { repoEjercicios } from '../ejercicios';
import { repoSesion } from '../sesion';
import type { Adaptador } from '../../adaptador';

const EJERCICIO = 'pectorals/dumbbell-bench-press';

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

async function conSesion() {
  const adaptador = crearAdaptadorMemoria();
  await migrar(adaptador);
  const diaId = await conDiaDePrograma(adaptador);
  const sesiones = repoSesion(adaptador);
  return { adaptador, sesiones, sesionId: await sesiones.crear(diaId) };
}

const bajada = (sesionId: number, indice: number, peso: number, reps: number) => ({
  sesionId,
  ejercicioId: EJERCICIO,
  numero: 1,
  bajada: indice,
  pesoMeta: null,
  repsMeta: 0,
  pesoLogrado: peso,
  repsLogradas: reps,
});

describe('migración de series descendentes', () => {
  it('deja la base en la última versión y crea lo suyo', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);

    const version = await adaptador.consultar<{ user_version: number }>('PRAGMA user_version');
    expect(version[0]?.user_version).toBe(MIGRACIONES.length);

    const columnas = await adaptador.consultar<{ name: string }>("PRAGMA table_info('serie')");
    expect(columnas.map((c) => c.name)).toContain('bajada');

    const tablas = await adaptador.consultar<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    expect(tablas.map((t) => t.name)).toContain('ejercicio_descendente');
  });

  it('conserva las series ya registradas y les pone bajada 0', async () => {
    const adaptador = crearAdaptadorMemoria();

    // Instalación anterior: solo las migraciones 001 y 002.
    for (const bloque of MIGRACIONES.slice(0, 2)) {
      for (const sentencia of bloque) await adaptador.ejecutar(sentencia);
    }
    await adaptador.ejecutar('PRAGMA user_version = 2');

    const diaId = await conDiaDePrograma(adaptador);
    const sesionId = await adaptador.insertar(
      "INSERT INTO sesion (dia_programa_id, iniciada_en, estado) VALUES (?, ?, 'completada')",
      [diaId, '2026-08-01T10:00:00.000Z'],
    );
    await adaptador.ejecutar(
      `INSERT INTO serie (sesion_id, ejercicio_id, numero, peso_meta, reps_meta,
         peso_logrado, reps_logradas, completada_en)
       VALUES (?, ?, 1, 20, 10, 20, 10, '2026-08-01T10:05:00.000Z')`,
      [sesionId, EJERCICIO],
    );

    await migrar(adaptador);

    const historial = await repoSesion(adaptador).historialDe(EJERCICIO);
    expect(historial).toHaveLength(1);
    expect(historial[0]?.bajada).toBe(0);
    expect(historial[0]?.repsLogradas).toBe(10);
  });
});

describe('registro de bajadas', () => {
  it('guarda varias bajadas dentro de la misma serie', async () => {
    const { sesiones, sesionId } = await conSesion();

    await sesiones.registrarSerie(bajada(sesionId, 0, 24, 8));
    await sesiones.registrarSerie(bajada(sesionId, 1, 20, 6));
    await sesiones.registrarSerie(bajada(sesionId, 2, 16, 5));

    const historial = await sesiones.historialDe(EJERCICIO);
    expect(historial).toHaveLength(3);
    expect(historial.map((s) => s.bajada).sort()).toEqual([0, 1, 2]);
    expect(historial.reduce((suma, s) => suma + s.repsLogradas, 0)).toBe(19);
  });

  it('corregir una bajada no borra las demás', async () => {
    const { sesiones, sesionId } = await conSesion();

    await sesiones.registrarSerie(bajada(sesionId, 0, 24, 8));
    await sesiones.registrarSerie(bajada(sesionId, 1, 20, 6));
    await sesiones.registrarSerie(bajada(sesionId, 1, 20, 7));

    const historial = await sesiones.historialDe(EJERCICIO);
    expect(historial).toHaveLength(2);
    expect(historial.find((s) => s.bajada === 1)?.repsLogradas).toBe(7);
    expect(historial.find((s) => s.bajada === 0)?.repsLogradas).toBe(8);
  });

  it('quitar una bajada la borra sin tocar el resto', async () => {
    const { sesiones, sesionId } = await conSesion();

    await sesiones.registrarSerie(bajada(sesionId, 0, 24, 8));
    await sesiones.registrarSerie(bajada(sesionId, 1, 20, 6));
    await sesiones.borrarBajada(sesionId, EJERCICIO, 1);

    const historial = await sesiones.historialDe(EJERCICIO);
    expect(historial).toHaveLength(1);
    expect(historial[0]?.bajada).toBe(0);
  });

  it('una serie normal se sigue guardando con bajada 0', async () => {
    const { sesiones, sesionId } = await conSesion();

    await sesiones.registrarSerie({
      sesionId,
      ejercicioId: EJERCICIO,
      numero: 1,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 10,
    });

    expect((await sesiones.historialDe(EJERCICIO))[0]?.bajada).toBe(0);
  });
});

describe('marca de ejercicio descendente', () => {
  it('recuerda el ejercicio marcado', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoEjercicios(adaptador);

    expect(await repo.esDescendente(EJERCICIO)).toBe(false);

    await repo.marcarDescendente(EJERCICIO, true);

    expect(await repo.esDescendente(EJERCICIO)).toBe(true);
    expect(await repo.descendentes()).toEqual([EJERCICIO]);
  });

  it('marcar dos veces no duplica', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoEjercicios(adaptador);

    await repo.marcarDescendente(EJERCICIO, true);
    await repo.marcarDescendente(EJERCICIO, true);

    expect(await repo.descendentes()).toHaveLength(1);
  });

  it('desmarcar lo quita', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoEjercicios(adaptador);

    await repo.marcarDescendente(EJERCICIO, true);
    await repo.marcarDescendente(EJERCICIO, false);

    expect(await repo.esDescendente(EJERCICIO)).toBe(false);
    expect(await repo.descendentes()).toEqual([]);
  });
});
