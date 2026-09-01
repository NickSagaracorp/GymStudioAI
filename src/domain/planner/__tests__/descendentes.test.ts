import type { Perfil } from '@/data/db/repos/perfil';
import { calcularMetaDescendente, pesoSugeridoBajada } from '../descendentes';
import type { SerieHecha } from '../tipos';

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

const EJERCICIO = 'pectorals/dumbbell-bench-press';

/** Una sesión de serie descendente: [peso, reps] por bajada, la primera el tope. */
function sesion(sesionId: number, fecha: string, bajadas: [number, number][]): SerieHecha[] {
  return bajadas.map(([peso, reps], indice) => ({
    sesionId,
    ejercicioId: EJERCICIO,
    numero: 1,
    bajada: indice,
    pesoLogrado: peso,
    repsLogradas: reps,
    completadaEn: fecha,
  }));
}

describe('peso sugerido de cada bajada', () => {
  it('quita un 20 % redondeado al incremento del usuario', () => {
    // 24 × 0,8 = 19,2 → 20 con incrementos de 2 kg
    expect(pesoSugeridoBajada(24, PERFIL)).toBe(20);
    expect(pesoSugeridoBajada(20, PERFIL)).toBe(16);
  });

  it('respeta un incremento de 5 kg', () => {
    const de5 = { ...PERFIL, incrementoKg: 5, mancuernaMinKg: 5 };
    // 30 × 0,8 = 24 → 25
    expect(pesoSugeridoBajada(30, de5)).toBe(25);
  });

  it('nunca propone un peso igual o mayor que el anterior', () => {
    // 4 × 0,8 = 3,2 → redondea a 4, que sería el mismo peso
    expect(pesoSugeridoBajada(4, PERFIL)).toBe(2);
  });

  it('no baja del peso mínimo que tiene el usuario', () => {
    expect(pesoSugeridoBajada(3, PERFIL)).toBe(2);
    expect(pesoSugeridoBajada(2, PERFIL)).toBe(2);
    expect(pesoSugeridoBajada(1, PERFIL)).toBe(2);
  });
});

describe('progresión de la serie descendente', () => {
  it('pide el peso de arranque la primera vez', () => {
    expect(calcularMetaDescendente([], EJERCICIO, PERFIL)).toEqual({
      pesoTope: null,
      pesoInicialRequerido: true,
      repsTotalesAnteriores: null,
      bajadasAnteriores: null,
      avisoInflado: null,
    });
  });

  it('con una sola sesión muestra qué superar pero no sube el peso', () => {
    const meta = calcularMetaDescendente(
      sesion(1, '2026-09-01', [
        [24, 8],
        [20, 6],
        [16, 5],
      ]),
      EJERCICIO,
      PERFIL,
    );

    expect(meta.pesoTope).toBe(24);
    expect(meta.repsTotalesAnteriores).toBe(19);
    expect(meta.bajadasAnteriores).toBe(2);
    expect(meta.avisoInflado).toBeNull();
  });

  it('sube el peso cuando mejoran las repeticiones totales', () => {
    const historial = [
      ...sesion(2, '2026-09-08', [
        [24, 9],
        [20, 7],
        [16, 5],
      ]),
      ...sesion(1, '2026-09-01', [
        [24, 8],
        [20, 6],
        [16, 5],
      ]),
    ];

    const meta = calcularMetaDescendente(historial, EJERCICIO, PERFIL);
    expect(meta.pesoTope).toBe(26);
    expect(meta.avisoInflado).toBeNull();
  });

  it('mantiene el peso cuando el total empeora', () => {
    const historial = [
      ...sesion(2, '2026-09-08', [
        [24, 6],
        [20, 5],
      ]),
      ...sesion(1, '2026-09-01', [
        [24, 8],
        [20, 6],
        [16, 5],
      ]),
    ];

    expect(calcularMetaDescendente(historial, EJERCICIO, PERFIL).pesoTope).toBe(24);
  });

  it('no sube el peso si el total mejoró solo por hacer una bajada más', () => {
    const historial = [
      // 21 repeticiones, pero con tres bajadas en vez de dos
      ...sesion(2, '2026-09-08', [
        [24, 8],
        [20, 5],
        [16, 4],
        [12, 4],
      ]),
      ...sesion(1, '2026-09-01', [
        [24, 8],
        [20, 6],
        [16, 5],
      ]),
    ];

    const meta = calcularMetaDescendente(historial, EJERCICIO, PERFIL);
    expect(meta.pesoTope).toBe(24);
    expect(meta.avisoInflado).toContain('21 repeticiones frente a 19');
    expect(meta.avisoInflado).toContain('1 bajada más');
  });

  it('sí sube el peso si mejora el total haciendo menos bajadas', () => {
    const historial = [
      ...sesion(2, '2026-09-08', [
        [24, 12],
        [20, 8],
      ]),
      ...sesion(1, '2026-09-01', [
        [24, 8],
        [20, 6],
        [16, 5],
      ]),
    ];

    expect(calcularMetaDescendente(historial, EJERCICIO, PERFIL).pesoTope).toBe(26);
  });

  it('ignora el historial de otros ejercicios', () => {
    const ajeno = sesion(9, '2026-09-20', [[30, 10]]).map((s) => ({
      ...s,
      ejercicioId: 'biceps/dumbbell-biceps-curl',
    }));

    expect(calcularMetaDescendente(ajeno, EJERCICIO, PERFIL).pesoInicialRequerido).toBe(true);
  });

  it('una descendente de una sola fila no cuenta bajadas', () => {
    const meta = calcularMetaDescendente(sesion(1, '2026-09-01', [[24, 10]]), EJERCICIO, PERFIL);
    expect(meta.bajadasAnteriores).toBe(0);
    expect(meta.repsTotalesAnteriores).toBe(10);
  });
});
