import {
  AJUSTE_OBJETIVO,
  calcularObjetivo,
  caloriasObjetivo,
  edadEn,
  FACTOR_ACTIVIDAD,
  gastoTotal,
  metabolismoBasal,
  objetivoConCalorias,
  repartirMacros,
} from '../objetivos';
import type { DatosCalculo } from '../tipos';

const HOY = new Date('2026-09-01T12:00:00.000Z');

const BASE: DatosCalculo = {
  sexo: 'hombre',
  fechaNac: '1990-01-01',
  alturaCm: 178,
  pesoKg: 78,
  nivelActividad: 'moderado',
  objetivo: 'volumen',
};

describe('edad', () => {
  it('cuenta los años cumplidos', () => {
    expect(edadEn('1990-01-01', HOY)).toBe(36);
  });

  it('no cuenta el año si el cumpleaños aún no ha pasado', () => {
    expect(edadEn('1990-12-31', HOY)).toBe(35);
  });

  it('cuenta el año el mismo día del cumpleaños', () => {
    expect(edadEn('1990-09-01', HOY)).toBe(36);
  });
});

describe('metabolismo basal', () => {
  // 10*78 + 6,25*178 - 5*36 = 780 + 1112,5 - 180 = 1712,5
  it('aplica Mifflin-St Jeor para hombre', () => {
    expect(metabolismoBasal(BASE, HOY)).toBeCloseTo(1717.5, 1);
  });

  it('resta 161 para mujer', () => {
    expect(metabolismoBasal({ ...BASE, sexo: 'mujer' }, HOY)).toBeCloseTo(1551.5, 1);
  });

  it('para otro toma la media de las dos fórmulas', () => {
    const hombre = metabolismoBasal({ ...BASE, sexo: 'hombre' }, HOY);
    const mujer = metabolismoBasal({ ...BASE, sexo: 'mujer' }, HOY);
    expect(metabolismoBasal({ ...BASE, sexo: 'otro' }, HOY)).toBeCloseTo(
      (hombre + mujer) / 2,
      5,
    );
  });
});

describe('gasto total', () => {
  it('multiplica el basal por el factor de actividad', () => {
    const basal = metabolismoBasal(BASE, HOY);
    for (const [nivel, factor] of Object.entries(FACTOR_ACTIVIDAD)) {
      const datos = { ...BASE, nivelActividad: nivel as DatosCalculo['nivelActividad'] };
      expect(gastoTotal(datos, HOY)).toBeCloseTo(basal * factor, 5);
    }
  });

  it('gasta más quien tiene más actividad', () => {
    expect(gastoTotal({ ...BASE, nivelActividad: 'muy_alto' }, HOY)).toBeGreaterThan(
      gastoTotal({ ...BASE, nivelActividad: 'sedentario' }, HOY),
    );
  });
});

describe('calorías objetivo', () => {
  it('suma un 10 % en volumen y resta un 20 % en definición', () => {
    const gasto = gastoTotal(BASE, HOY);
    expect(caloriasObjetivo({ ...BASE, objetivo: 'volumen' }, HOY)).toBe(
      Math.round(gasto * AJUSTE_OBJETIVO.volumen),
    );
    expect(caloriasObjetivo({ ...BASE, objetivo: 'definicion' }, HOY)).toBe(
      Math.round(gasto * 0.8),
    );
  });

  it('mantiene el gasto en fuerza', () => {
    expect(caloriasObjetivo({ ...BASE, objetivo: 'fuerza' }, HOY)).toBe(
      Math.round(gastoTotal(BASE, HOY)),
    );
  });
});

describe('reparto de macros', () => {
  it('la suma de macros cuadra con las calorías', () => {
    const macros = repartirMacros(2800, 78, 'volumen');
    const suma = macros.proteinaG * 4 + macros.carbosG * 4 + macros.grasaG * 9;
    expect(Math.abs(suma - 2800)).toBeLessThanOrEqual(4);
  });

  it('fija la proteína a 2 g por kilo, y a 2,2 en definición', () => {
    expect(repartirMacros(2800, 80, 'volumen').proteinaG).toBe(160);
    expect(repartirMacros(2800, 80, 'fuerza').proteinaG).toBe(160);
    expect(repartirMacros(2000, 80, 'definicion').proteinaG).toBe(176);
  });

  it('reparte el 25 % de las calorías a la grasa', () => {
    // 2800 * 0,25 / 9 = 77,8
    expect(repartirMacros(2800, 78, 'volumen').grasaG).toBe(78);
  });

  it('el suelo de 0,8 g por kilo manda cuando el porcentaje se queda corto', () => {
    // 1200 * 0,25 / 9 = 33,3 g, pero 90 kg × 0,8 = 72 g
    expect(repartirMacros(1200, 90, 'definicion').grasaG).toBe(72);
  });

  it('nunca deja los carbohidratos en negativo', () => {
    expect(repartirMacros(900, 100, 'definicion').carbosG).toBe(0);
  });

  it('calcula la fibra a 14 g por cada 1000 kcal', () => {
    expect(repartirMacros(2000, 78, 'volumen').fibraG).toBe(28);
    expect(repartirMacros(2500, 78, 'volumen').fibraG).toBe(35);
  });
});

describe('objetivo completo', () => {
  it('incluye los topes al 10 % de las calorías', () => {
    const objetivo = calcularObjetivo({ ...BASE, objetivo: 'fuerza' }, HOY);
    expect(objetivo.topeAzucaresG).toBe(Math.round((objetivo.kcal * 0.1) / 4));
    expect(objetivo.topeSaturadaG).toBe(Math.round((objetivo.kcal * 0.1) / 9));
  });

  it('no viene marcado como ajuste manual', () => {
    expect(calcularObjetivo(BASE, HOY).ajusteManual).toBe(false);
  });

  it('un objetivo escrito a mano queda marcado y respeta la cifra', () => {
    const manual = objetivoConCalorias(2400, 78, 'volumen');
    expect(manual.kcal).toBe(2400);
    expect(manual.ajusteManual).toBe(true);
    expect(manual.proteinaG).toBe(156);
  });
});
