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
});
