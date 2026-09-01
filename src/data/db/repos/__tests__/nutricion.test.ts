import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar, MIGRACIONES } from '../../migraciones';
import { repoPerfil } from '../perfil';
import { repoNutricion } from '../nutricion';
import type { Alimento, ObjetivoNutricional } from '@/domain/nutricion/tipos';

function alimento(parcial: Partial<Alimento> = {}): Alimento {
  return {
    nombre: 'Pechuga de pollo',
    cantidadG: 180,
    kcal: 297,
    proteinaG: 55.8,
    carbosG: 0,
    azucaresG: 0,
    grasaG: 6.5,
    grasaSaturadaG: 1.9,
    grasaTransG: 0,
    fibraG: 0,
    confianza: 'alta',
    ...parcial,
  };
}

const OBJETIVO: ObjetivoNutricional = {
  kcal: 2800,
  proteinaG: 156,
  carbosG: 350,
  grasaG: 78,
  fibraG: 39,
  topeAzucaresG: 70,
  topeSaturadaG: 31,
  ajusteManual: false,
};

async function conBase() {
  const adaptador = crearAdaptadorMemoria();
  await migrar(adaptador);
  return { adaptador, repo: repoNutricion(adaptador) };
}

describe('migración de nutrición', () => {
  it('deja la base en la versión 2', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);

    const filas = await adaptador.consultar<{ user_version: number }>('PRAGMA user_version');
    expect(filas[0]?.user_version).toBe(MIGRACIONES.length);
    expect(MIGRACIONES.length).toBe(2);
  });

  it('conserva el perfil de la fase 1 y le añade el nivel de actividad', async () => {
    const adaptador = crearAdaptadorMemoria();

    // Solo la migración 001, como una instalación de la fase 1.
    for (const sentencia of MIGRACIONES[0] ?? []) await adaptador.ejecutar(sentencia);
    await adaptador.ejecutar('PRAGMA user_version = 1');

    const perfil = repoPerfil(adaptador);
    await perfil.guardar({
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
    });

    await migrar(adaptador);

    expect((await perfil.obtener())?.nombre).toBe('Nick');
    const filas = await adaptador.consultar<{ nivel_actividad: string }>(
      'SELECT nivel_actividad FROM perfil WHERE id = 1',
    );
    expect(filas[0]?.nivel_actividad).toBe('moderado');
  });
});

describe('repositorio de nutrición', () => {
  it('guarda una comida con sus alimentos y la recupera', async () => {
    const { repo } = await conBase();

    await repo.guardarComida({
      fecha: '2026-09-01',
      momento: 'almuerzo',
      descripcion: 'pollo con arroz',
      fotoUri: 'file:///foto.jpg',
      origen: 'ia',
      alimentos: [alimento(), alimento({ nombre: 'Arroz', kcal: 200, carbosG: 44 })],
    });

    const comidas = await repo.comidasDe('2026-09-01');
    expect(comidas).toHaveLength(1);
    expect(comidas[0]?.descripcion).toBe('pollo con arroz');
    expect(comidas[0]?.origen).toBe('ia');
    expect(comidas[0]?.alimentos).toHaveLength(2);
    expect(comidas[0]?.alimentos[0]?.confianza).toBe('alta');
    expect(comidas[0]?.alimentos[1]?.carbosG).toBe(44);
  });

  it('no mezcla comidas de días distintos', async () => {
    const { repo } = await conBase();

    await repo.guardarComida({
      fecha: '2026-09-01',
      momento: 'cena',
      descripcion: null,
      fotoUri: null,
      origen: 'manual',
      alimentos: [alimento()],
    });
    await repo.guardarComida({
      fecha: '2026-09-02',
      momento: 'cena',
      descripcion: null,
      fotoUri: null,
      origen: 'manual',
      alimentos: [alimento()],
    });

    expect(await repo.comidasDe('2026-09-01')).toHaveLength(1);
    expect(await repo.comidasDe('2026-09-03')).toHaveLength(0);
  });

  it('borrar la comida borra sus alimentos en cascada', async () => {
    const { adaptador, repo } = await conBase();

    const comidaId = await repo.guardarComida({
      fecha: '2026-09-01',
      momento: 'desayuno',
      descripcion: null,
      fotoUri: null,
      origen: 'manual',
      alimentos: [alimento(), alimento()],
    });

    await repo.borrarComida(comidaId);

    const filas = await adaptador.consultar<{ total: number }>(
      'SELECT COUNT(*) AS total FROM alimento',
    );
    expect(filas[0]?.total).toBe(0);
  });

  it('reemplaza los alimentos de una comida', async () => {
    const { repo } = await conBase();

    const comidaId = await repo.guardarComida({
      fecha: '2026-09-01',
      momento: 'almuerzo',
      descripcion: null,
      fotoUri: null,
      origen: 'ia',
      alimentos: [alimento(), alimento({ nombre: 'Arroz' })],
    });

    await repo.reemplazarAlimentos(comidaId, [alimento({ nombre: 'Solo pollo', kcal: 150 })]);

    const comidas = await repo.comidasDe('2026-09-01');
    expect(comidas[0]?.alimentos).toHaveLength(1);
    expect(comidas[0]?.alimentos[0]?.nombre).toBe('Solo pollo');
  });

  it('guarda y recupera el objetivo, y lo sobrescribe sin duplicar', async () => {
    const { adaptador, repo } = await conBase();

    expect(await repo.objetivo()).toBeNull();

    await repo.guardarObjetivo(OBJETIVO);
    await repo.guardarObjetivo({ ...OBJETIVO, kcal: 2400, ajusteManual: true });

    const filas = await adaptador.consultar<{ total: number }>(
      'SELECT COUNT(*) AS total FROM objetivo_nutricional',
    );
    expect(filas[0]?.total).toBe(1);

    const guardado = await repo.objetivo();
    expect(guardado?.kcal).toBe(2400);
    expect(guardado?.ajusteManual).toBe(true);
  });

  it('encuentra y olvida las fotos anteriores a una fecha', async () => {
    const { repo } = await conBase();

    await repo.guardarComida({
      fecha: '2026-07-01',
      momento: 'cena',
      descripcion: null,
      fotoUri: 'file:///vieja.jpg',
      origen: 'ia',
      alimentos: [],
    });
    await repo.guardarComida({
      fecha: '2026-09-01',
      momento: 'cena',
      descripcion: null,
      fotoUri: 'file:///reciente.jpg',
      origen: 'ia',
      alimentos: [],
    });

    expect(await repo.fotosAnterioresA('2026-08-01')).toEqual(['file:///vieja.jpg']);

    await repo.olvidarFotosAnterioresA('2026-08-01');

    expect(await repo.fotosAnterioresA('2026-08-01')).toEqual([]);
    expect((await repo.comidasDe('2026-09-01'))[0]?.fotoUri).toBe('file:///reciente.jpg');
  });
});
