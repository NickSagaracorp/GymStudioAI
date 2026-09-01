import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoPerfil } from '../perfil';
import type { Perfil } from '../perfil';

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
  tieneBarraDominadas: false,
  diaMedicion: 0,
};

describe('repositorio de perfil', () => {
  it('devuelve null cuando no hay perfil', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    expect(await repoPerfil(adaptador).obtener()).toBeNull();
  });

  it('guarda y recupera el perfil con sus booleanos intactos', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar(PERFIL);
    expect(await repo.obtener()).toEqual(PERFIL);
  });

  it('sobrescribe el perfil en vez de crear una segunda fila', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar(PERFIL);
    await repo.guardar({ ...PERFIL, objetivo: 'fuerza', diasPorSemana: 3 });

    const filas = await adaptador.consultar<{ total: number }>(
      'SELECT COUNT(*) AS total FROM perfil',
    );
    expect(filas[0]?.total).toBe(1);
    expect((await repo.obtener())?.objetivo).toBe('fuerza');
  });
});
