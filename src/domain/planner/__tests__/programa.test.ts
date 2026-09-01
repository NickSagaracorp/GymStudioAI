import { crearCatalogo } from '@/data/catalog/catalogo';
import type { Ejercicio, Musculo } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import ejerciciosReales from '../../../../assets/catalog/ejercicios.json';
import { generarPrograma } from '../programa';
import { anclaPara } from '../seleccion';

const catalogo = crearCatalogo(ejerciciosReales as Ejercicio[]);

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
};

describe('generación del programa', () => {
  it('produce 8 semanas con los días pedidos', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    expect(plan.semanas).toBe(8);
    expect(plan.dias).toHaveLength(8 * 4);
    expect(plan.split).toBe('torso_pierna4');
  });

  it('es determinista: la misma semilla produce el mismo plan', () => {
    expect(generarPrograma(PERFIL, catalogo, 'x')).toEqual(generarPrograma(PERFIL, catalogo, 'x'));
  });

  it('solo usa ejercicios que existen en el catálogo', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    for (const dia of plan.dias) {
      for (const ejercicio of dia.ejercicios) {
        expect(catalogo.porId(ejercicio.ejercicioId)).toBeDefined();
      }
    }
  });

  it('mantiene el ancla de cada músculo durante todo el mesociclo', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const anclasPorMusculo = new Map<Musculo, Set<string>>();

    for (const dia of plan.dias.filter((d) => d.semana <= 4)) {
      for (const ejercicio of dia.ejercicios.filter((e) => e.esAncla)) {
        const conjunto = anclasPorMusculo.get(ejercicio.musculoObjetivo) ?? new Set<string>();
        conjunto.add(ejercicio.ejercicioId);
        anclasPorMusculo.set(ejercicio.musculoObjetivo, conjunto);
      }
    }

    for (const [musculo, conjunto] of anclasPorMusculo) {
      expect([...conjunto]).toEqual([anclaPara(musculo, PERFIL)]);
    }
  });

  it('sube series del ancla en las semanas 2 y 3 y descarga en la 4', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const anclaDe = (semana: number) =>
      plan.dias
        .find((d) => d.semana === semana && d.dia === 1)
        ?.ejercicios.find((e) => e.esAncla);

    const base = anclaDe(1);
    expect(base).toBeDefined();
    expect(anclaDe(2)?.series).toBe((base?.series ?? 0) + 1);
    expect(anclaDe(3)?.series).toBe((base?.series ?? 0) + 2);
    expect(anclaDe(4)?.series).toBeLessThan(base?.series ?? 0);
  });

  it('no repite un accesorio en dos semanas consecutivas', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    // Se comprueba solo en músculos con catálogo amplio: trapecio (6) e
    // isquiotibiales (11) obligan a reutilizar y eso es correcto.
    const amplios: Musculo[] = ['pectorals', 'biceps', 'triceps', 'delts', 'abs'];

    const accesoriosDe = (semana: number) =>
      plan.dias
        .filter((d) => d.semana === semana)
        .flatMap((d) =>
          d.ejercicios
            .filter((e) => !e.esAncla && amplios.includes(e.musculoObjetivo))
            .map((e) => e.ejercicioId),
        );

    for (let semana = 2; semana <= 3; semana += 1) {
      const anteriores = new Set(accesoriosDe(semana - 1));
      for (const id of accesoriosDe(semana)) {
        expect(anteriores.has(id)).toBe(false);
      }
    }
  });

  it('usa peso corporal cuando el músculo no tiene mancuernas', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const dorsales = plan.dias.flatMap((d) =>
      d.ejercicios.filter((e) => e.musculoObjetivo === 'lats'),
    );
    expect(dorsales.length).toBeGreaterThan(0);
    expect(dorsales.every((e) => e.equipamiento === 'bodyweight')).toBe(true);
  });

  it('funciona para todos los números de días soportados', () => {
    for (let dias = 2; dias <= 6; dias += 1) {
      const plan = generarPrograma({ ...PERFIL, diasPorSemana: dias }, catalogo, 's');
      expect(plan.dias).toHaveLength(8 * dias);
      expect(plan.dias.every((d) => d.ejercicios.length > 0)).toBe(true);
    }
  });

  it('respeta el equipamiento declarado en el perfil', () => {
    const sinNada = { ...PERFIL, tieneBanco: false, tieneBarraDominadas: false };
    const plan = generarPrograma(sinNada, catalogo, 'semilla');
    const anclas = plan.dias.flatMap((d) => d.ejercicios.filter((e) => e.esAncla));

    expect(anclas.some((e) => e.ejercicioId === 'pectorals/dumbbell-bench-press')).toBe(false);
    expect(anclas.some((e) => e.ejercicioId === 'pectorals/push-up')).toBe(true);
    expect(anclas.some((e) => e.ejercicioId === 'lats/chin-up')).toBe(false);
  });
});

describe('tope de series por sesión', () => {
  it('ninguna sesión pasa de 26 series, para cualquier objetivo y días', () => {
    for (const objetivo of ['volumen', 'definicion', 'fuerza'] as const) {
      for (let dias = 2; dias <= 6; dias += 1) {
        const plan = generarPrograma(
          { ...PERFIL, objetivo, diasPorSemana: dias, nivel: 'avanzado' },
          catalogo,
          'tope',
        );
        for (const dia of plan.dias) {
          const total = dia.ejercicios.reduce((suma, e) => suma + e.series, 0);
          expect(total).toBeLessThanOrEqual(26);
        }
      }
    }
  });

  it('el recorte nunca elimina un ejercicio ancla', () => {
    const plan = generarPrograma({ ...PERFIL, nivel: 'avanzado' }, catalogo, 'tope');
    for (const dia of plan.dias) {
      for (const musculo of dia.musculos) {
        expect(dia.ejercicios.some((e) => e.esAncla && e.musculoObjetivo === musculo)).toBe(true);
      }
    }
  });

  it('deja el orden consecutivo desde 1 tras recortar', () => {
    const plan = generarPrograma({ ...PERFIL, nivel: 'avanzado' }, catalogo, 'tope');
    for (const dia of plan.dias) {
      expect(dia.ejercicios.map((e) => e.orden)).toEqual(
        dia.ejercicios.map((_, indice) => indice + 1),
      );
    }
  });
});
