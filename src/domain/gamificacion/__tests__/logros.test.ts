import {
  claveDia,
  claveEjercicio,
  claveMusculo,
  ejercicioCompleto,
  hitosNuevos,
  prefijoSesion,
  type EstadoEjercicio,
} from '../logros';

describe('ejercicioCompleto', () => {
  it('normal: 3 de 3 series es completo', () => {
    expect(
      ejercicioCompleto({
        esDescendente: false,
        seriesRegistradas: 3,
        seriesMeta: 3,
        bajadasRegistradas: 0,
      }),
    ).toBe(true);
  });

  it('normal: 2 de 3 series no es completo', () => {
    expect(
      ejercicioCompleto({
        esDescendente: false,
        seriesRegistradas: 2,
        seriesMeta: 3,
        bajadasRegistradas: 0,
      }),
    ).toBe(false);
  });

  it('descendente: 2 bajadas registradas es completo', () => {
    expect(
      ejercicioCompleto({
        esDescendente: true,
        seriesRegistradas: 0,
        seriesMeta: 0,
        bajadasRegistradas: 2,
      }),
    ).toBe(true);
  });

  it('descendente: 1 bajada (solo el tope) no es completo', () => {
    expect(
      ejercicioCompleto({
        esDescendente: true,
        seriesRegistradas: 0,
        seriesMeta: 0,
        bajadasRegistradas: 1,
      }),
    ).toBe(false);
  });

  it('descendente: las series normales registradas no cuentan', () => {
    expect(
      ejercicioCompleto({
        esDescendente: true,
        seriesRegistradas: 3,
        seriesMeta: 3,
        bajadasRegistradas: 1,
      }),
    ).toBe(false);
  });
});

describe('claves', () => {
  it('tienen la forma exacta esperada', () => {
    expect(claveEjercicio(7, 'pectorals/press')).toBe('sesion:7:ejercicio:pectorals/press');
    expect(claveMusculo(7, 'pectorals')).toBe('sesion:7:musculo:pectorals');
    expect(claveDia(7)).toBe('sesion:7:dia');
  });

  it('prefijoSesion es prefijo de las tres claves', () => {
    const prefijo = prefijoSesion(7);
    expect(claveEjercicio(7, 'pectorals/press').startsWith(prefijo)).toBe(true);
    expect(claveMusculo(7, 'pectorals').startsWith(prefijo)).toBe(true);
    expect(claveDia(7).startsWith(prefijo)).toBe(true);
  });
});

describe('hitosNuevos', () => {
  const sesionId = 7;

  // Tres ejercicios: dos de pectorals (para el hito de músculo) y uno de
  // biceps que queda incompleto, para no disparar de paso el hito de día.
  function estados(overrides: Partial<EstadoEjercicio>[]): EstadoEjercicio[] {
    const base: EstadoEjercicio[] = [
      { ejercicioId: 'pectorals/press', musculoObjetivo: 'pectorals', completo: false },
      { ejercicioId: 'pectorals/aperturas', musculoObjetivo: 'pectorals', completo: false },
      { ejercicioId: 'biceps/curl', musculoObjetivo: 'biceps', completo: false },
    ];
    return base.map((estado, i) => ({ ...estado, ...overrides[i] }));
  }

  it('completar un ejercicio de dos que comparten musculo devuelve solo el hito de ejercicio', () => {
    const lista = estados([{ completo: true }, { completo: false }]);
    const hitos = hitosNuevos(sesionId, lista, new Set());
    expect(hitos).toEqual([
      { tipo: 'ejercicio', clave: 'sesion:7:ejercicio:pectorals/press', ejercicioId: 'pectorals/press' },
    ]);
  });

  it('completar el segundo devuelve el hito de musculo', () => {
    const yaCelebrados = new Set(['sesion:7:ejercicio:pectorals/press']);
    const lista = estados([{ completo: true }, { completo: true }]);
    const hitos = hitosNuevos(sesionId, lista, yaCelebrados);
    expect(hitos).toEqual([
      {
        tipo: 'ejercicio',
        clave: 'sesion:7:ejercicio:pectorals/aperturas',
        ejercicioId: 'pectorals/aperturas',
      },
      { tipo: 'musculo', clave: 'sesion:7:musculo:pectorals', musculo: 'pectorals' },
    ]);
  });

  it('completar todos los musculos del dia devuelve ademas el hito de dia', () => {
    const lista: EstadoEjercicio[] = [
      { ejercicioId: 'pectorals/press', musculoObjetivo: 'pectorals', completo: true },
      { ejercicioId: 'biceps/curl', musculoObjetivo: 'biceps', completo: true },
    ];
    const yaCelebrados = new Set([
      'sesion:7:ejercicio:pectorals/press',
      'sesion:7:ejercicio:biceps/curl',
      'sesion:7:musculo:pectorals',
      'sesion:7:musculo:biceps',
    ]);
    const hitos = hitosNuevos(sesionId, lista, yaCelebrados);
    expect(hitos).toEqual([{ tipo: 'dia', clave: 'sesion:7:dia' }]);
  });

  it('una clave ya presente en yaCelebrados no se devuelve', () => {
    const lista = estados([{ completo: true }, { completo: false }]);
    const yaCelebrados = new Set(['sesion:7:ejercicio:pectorals/press']);
    const hitos = hitosNuevos(sesionId, lista, yaCelebrados);
    expect(hitos).toEqual([]);
  });

  it('con la lista de estados vacia no hay hito de dia', () => {
    const hitos = hitosNuevos(sesionId, [], new Set());
    expect(hitos).toEqual([]);
  });
});
