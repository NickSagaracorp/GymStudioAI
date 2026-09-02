import { crearAdaptadorMemoria } from '../pruebas/adaptadorMemoria';
import { MIGRACIONES, migrar, versionActual } from '../migraciones';

describe('migraciones', () => {
  it('crea todas las tablas y deja la versión al día', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);

    expect(await versionActual(adaptador)).toBe(MIGRACIONES.length);

    const tablas = await adaptador.consultar<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const nombres = tablas.map((t) => t.name);
    for (const tabla of [
      'perfil',
      'programa',
      'dia_programa',
      'ejercicio_dia',
      'sesion',
      'serie',
      'reto',
      'progreso_reto',
      'medicion',
      'medida',
      'logro',
    ]) {
      expect(nombres).toContain(tabla);
    }
  });

  it('es idempotente: migrar dos veces no falla', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    await migrar(adaptador);
    expect(await versionActual(adaptador)).toBe(MIGRACIONES.length);
  });

  it('aplica claves foráneas: una serie exige su sesión', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    await expect(
      adaptador.insertar(
        'INSERT INTO serie (sesion_id, ejercicio_id, numero, reps_meta) VALUES (?, ?, ?, ?)',
        [999, 'biceps/dumbbell-biceps-curl', 1, 10],
      ),
    ).rejects.toThrow();
  });

  it('migra desde la versión 3 conservando los datos existentes', async () => {
    const adaptador = crearAdaptadorMemoria();
    for (const sentencias of MIGRACIONES.slice(0, 3)) {
      for (const sentencia of sentencias) {
        await adaptador.ejecutar(sentencia);
      }
    }
    await adaptador.ejecutar('PRAGMA user_version = 3');

    await adaptador.ejecutar(
      `INSERT INTO perfil (
         id, nombre, sexo, fecha_nac, altura_cm, nivel, objetivo, dias_por_semana,
         mancuerna_min_kg, mancuerna_max_kg, incremento_kg, tiene_banco,
         tiene_barra_dominadas, dia_medicion, creado_en
       ) VALUES (1, 'Nick', 'hombre', '1988-04-12', 178, 'intermedio', 'volumen', 4, 2, 30, 2, 1, 0, 0, '2026-01-01T00:00:00.000Z')`,
    );
    const programaId = await adaptador.insertar(
      `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
       VALUES ('volumen', 8, 4, 'ppl4', '2026-01-01T00:00:00.000Z', 1)`,
    );
    const diaProgramaId = await adaptador.insertar(
      `INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos)
       VALUES (?, 1, 1, 'Empuje', '["pectorals"]')`,
      [programaId],
    );
    await adaptador.insertar(
      'INSERT INTO sesion (dia_programa_id, iniciada_en, estado) VALUES (?, ?, ?)',
      [diaProgramaId, '2026-01-01T00:00:00.000Z', 'borrador'],
    );

    await migrar(adaptador);

    expect(await versionActual(adaptador)).toBe(MIGRACIONES.length);

    const perfiles = await adaptador.consultar<{ dias_semana: string }>(
      'SELECT dias_semana FROM perfil WHERE id = 1',
    );
    expect(perfiles[0]?.dias_semana).toBe('');

    const sesiones = await adaptador.consultar<{ total: number }>(
      'SELECT COUNT(*) AS total FROM sesion',
    );
    expect(sesiones[0]?.total).toBe(1);
  });
});
