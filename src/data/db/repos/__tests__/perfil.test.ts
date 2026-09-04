import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { agendaPorDefecto, repoPerfil } from '../perfil';
import type { Perfil } from '../perfil';

const PERFIL: Perfil = {
  nombre: 'Nick',
  sexo: 'hombre',
  fechaNac: '1988-04-12',
  alturaCm: 178,
  nivel: 'intermedio',
  objetivo: 'volumen',
  diasPorSemana: 4,
  diasSemana: [1, 2, 4, 5],
  mancuernaMinKg: 2,
  mancuernaMaxKg: 30,
  incrementoKg: 2,
  tieneBanco: true,
  tieneBarraDominadas: false,
  diaMedicion: 0,
  nivelActividad: 'moderado',
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

  it('guarda y recupera la agenda semanal', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar(PERFIL);
    expect((await repo.obtener())?.diasSemana).toEqual([1, 2, 4, 5]);
  });

  it('deriva la agenda de dias_por_semana cuando dias_semana está vacío', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar({ ...PERFIL, diasPorSemana: 3 });
    await adaptador.ejecutar("UPDATE perfil SET dias_semana = '' WHERE id = 1");

    expect((await repo.obtener())?.diasSemana).toEqual([1, 3, 5]);
  });

  it('deriva la agenda cuando dias_semana solo tiene separadores y basura', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar({ ...PERFIL, diasPorSemana: 3 });
    await adaptador.ejecutar("UPDATE perfil SET dias_semana = ',,x,' WHERE id = 1");

    expect((await repo.obtener())?.diasSemana).toEqual([1, 3, 5]);
  });

  it('agendaPorDefecto reparte según los días por semana', () => {
    expect(agendaPorDefecto(4)).toEqual([1, 2, 4, 5]);
    expect(agendaPorDefecto(9)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
