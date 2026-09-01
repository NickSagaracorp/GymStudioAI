import { crearCatalogo } from '@/data/catalog/catalogo';
import { MUSCULOS } from '@/data/catalog/tipos';
import type { Ejercicio } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import ejerciciosReales from '../../../../assets/catalog/ejercicios.json';
import { ANCLAS, accesoriosPara, anclaPara, barajarDeterminista } from '../seleccion';

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
  tieneBarraDominadas: true,
  diaMedicion: 0,
  nivelActividad: 'moderado',
};

const catalogo = crearCatalogo(ejerciciosReales as Ejercicio[]);

describe('anclas', () => {
  it('define una ancla para cada uno de los trece músculos', () => {
    for (const musculo of MUSCULOS) {
      expect(ANCLAS[musculo]).toBeDefined();
    }
  });

  it('todas las anclas existen en el catálogo real', () => {
    for (const musculo of MUSCULOS) {
      const ancla = ANCLAS[musculo];
      expect(catalogo.porId(ancla.principal)).toBeDefined();
      if (ancla.alternativa) expect(catalogo.porId(ancla.alternativa)).toBeDefined();
    }
  });

  it('usa flexiones si no hay banco y remo invertido si no hay barra', () => {
    const sinNada = { ...PERFIL, tieneBanco: false, tieneBarraDominadas: false };
    expect(anclaPara('pectorals', sinNada)).toBe('pectorals/push-up');
    expect(anclaPara('lats', sinNada)).toBe('upper-back/inverted-row-bent-knees');
    expect(anclaPara('pectorals', PERFIL)).toBe('pectorals/dumbbell-bench-press');
    expect(anclaPara('lats', PERFIL)).toBe('lats/chin-up');
  });
});

describe('barajado determinista', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  it('produce el mismo orden con la misma semilla', () => {
    expect(barajarDeterminista(items, 'a')).toEqual(barajarDeterminista(items, 'a'));
  });

  it('produce un orden distinto con semilla distinta', () => {
    expect(barajarDeterminista(items, 'a')).not.toEqual(barajarDeterminista(items, 'b'));
  });

  it('no pierde ni duplica elementos', () => {
    expect([...barajarDeterminista(items, 'x')].sort((a, b) => a - b)).toEqual(items);
  });
});

describe('selección de accesorios', () => {
  it('devuelve la cantidad pedida sin incluir los excluidos', () => {
    const candidatos = catalogo.porMusculo('biceps');
    const elegidos = accesoriosPara({
      candidatos,
      semilla: 's1',
      excluir: [ANCLAS.biceps.principal],
      cantidad: 3,
    });

    expect(elegidos).toHaveLength(3);
    expect(elegidos.map((e) => e.id)).not.toContain(ANCLAS.biceps.principal);
    expect(new Set(elegidos.map((e) => e.id)).size).toBe(3);
  });

  it('reutiliza excluidos solo cuando no quedan candidatos libres', () => {
    const candidatos = catalogo.porMusculo('traps');
    const elegidos = accesoriosPara({
      candidatos,
      semilla: 's1',
      excluir: candidatos.map((e) => e.id),
      cantidad: 2,
    });

    expect(elegidos).toHaveLength(2);
  });

  it('devuelve lista vacía si no hay candidatos', () => {
    expect(accesoriosPara({ candidatos: [], semilla: 's', excluir: [], cantidad: 3 })).toEqual([]);
  });
});
