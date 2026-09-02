import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoLogros } from '../logros';

describe('repositorio de logros', () => {
  it('marca un hito y lo devuelve al leer por prefijo', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoLogros(adaptador);

    await repo.marcar('racha:7');

    expect(await repo.claves('racha:')).toEqual(new Set(['racha:7']));
  });

  it('marcar dos veces la misma clave no duplica ni lanza', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoLogros(adaptador);

    await repo.marcar('racha:7');
    await expect(repo.marcar('racha:7')).resolves.not.toThrow();

    const filas = await adaptador.consultar<{ total: number }>(
      'SELECT COUNT(*) AS total FROM logro',
    );
    expect(filas[0]?.total).toBe(1);
  });

  it('claves con un prefijo no trae las de un prefijo más largo que lo contiene', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoLogros(adaptador);

    await repo.marcar('sesion:7:completada');
    await repo.marcar('sesion:70:completada');

    expect(await repo.claves('sesion:7:')).toEqual(new Set(['sesion:7:completada']));
  });

  it('un prefijo sin resultados devuelve un conjunto vacío', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoLogros(adaptador);

    expect(await repo.claves('inexistente:')).toEqual(new Set());
  });
});
