import { progresoContra, sumarAlimentos, totalesDelDia } from '../totales';
import type { Alimento, Comida, ObjetivoNutricional } from '../tipos';

function alimento(parcial: Partial<Alimento>): Alimento {
  return {
    nombre: 'Alimento',
    cantidadG: 100,
    kcal: 0,
    proteinaG: 0,
    carbosG: 0,
    azucaresG: 0,
    grasaG: 0,
    grasaSaturadaG: 0,
    grasaTransG: 0,
    fibraG: 0,
    confianza: null,
    ...parcial,
  };
}

function comida(parcial: Partial<Comida>): Comida {
  return {
    id: 1,
    fecha: '2026-09-01',
    momento: 'almuerzo',
    descripcion: null,
    fotoUri: null,
    origen: 'manual',
    alimentos: [],
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

describe('suma de alimentos', () => {
  it('sin alimentos devuelve todo a cero', () => {
    expect(sumarAlimentos([]).kcal).toBe(0);
  });

  it('suma campo a campo', () => {
    const total = sumarAlimentos([
      alimento({ kcal: 300, proteinaG: 30, carbosG: 10, grasaG: 12, fibraG: 2 }),
      alimento({ kcal: 200, proteinaG: 5, carbosG: 40, grasaG: 1, fibraG: 3 }),
    ]);
    expect(total.kcal).toBe(500);
    expect(total.proteinaG).toBe(35);
    expect(total.carbosG).toBe(50);
    expect(total.grasaG).toBe(13);
    expect(total.fibraG).toBe(5);
  });
});

describe('totales del día', () => {
  it('un día sin comidas queda a cero en todos los momentos', () => {
    const { total, porMomento } = totalesDelDia([]);
    expect(total.kcal).toBe(0);
    expect(porMomento.desayuno.kcal).toBe(0);
    expect(porMomento.cena.kcal).toBe(0);
  });

  it('una comida sin alimentos no rompe el cálculo', () => {
    expect(totalesDelDia([comida({})]).total.kcal).toBe(0);
  });

  it('reparte por momento y suma el total', () => {
    const { total, porMomento } = totalesDelDia([
      comida({ id: 1, momento: 'desayuno', alimentos: [alimento({ kcal: 400 })] }),
      comida({ id: 2, momento: 'almuerzo', alimentos: [alimento({ kcal: 700 })] }),
      comida({ id: 3, momento: 'almuerzo', alimentos: [alimento({ kcal: 150 })] }),
    ]);

    expect(porMomento.desayuno.kcal).toBe(400);
    expect(porMomento.almuerzo.kcal).toBe(850);
    expect(porMomento.cena.kcal).toBe(0);
    expect(total.kcal).toBe(1250);
  });
});

describe('progreso contra el objetivo', () => {
  it('calcula el porcentaje de cada macro', () => {
    const total = sumarAlimentos([alimento({ kcal: 1400, proteinaG: 78 })]);
    const progreso = progresoContra(OBJETIVO, total);
    expect(progreso.kcal.porcentaje).toBe(50);
    expect(progreso.proteina.porcentaje).toBe(50);
  });

  it('deja pasar del 100 % cuando se supera el objetivo', () => {
    const total = sumarAlimentos([alimento({ kcal: 3360 })]);
    expect(progresoContra(OBJETIVO, total).kcal.porcentaje).toBe(120);
  });

  it('marca los azúcares y la grasa saturada por encima del tope', () => {
    const total = sumarAlimentos([alimento({ azucaresG: 71, grasaSaturadaG: 32 })]);
    const progreso = progresoContra(OBJETIVO, total);
    expect(progreso.azucaresExcedidos).toBe(true);
    expect(progreso.saturadaExcedida).toBe(true);
  });

  it('no marca exceso justo en el tope', () => {
    const total = sumarAlimentos([alimento({ azucaresG: 70, grasaSaturadaG: 31 })]);
    const progreso = progresoContra(OBJETIVO, total);
    expect(progreso.azucaresExcedidos).toBe(false);
    expect(progreso.saturadaExcedida).toBe(false);
  });

  it('cualquier gramo de grasa trans cuenta como exceso', () => {
    expect(progresoContra(OBJETIVO, sumarAlimentos([alimento({ grasaTransG: 0 })])).transExcedida).toBe(
      false,
    );
    expect(
      progresoContra(OBJETIVO, sumarAlimentos([alimento({ grasaTransG: 0.1 })])).transExcedida,
    ).toBe(true);
  });

  it('no divide por cero si el objetivo es cero', () => {
    const vacio = { ...OBJETIVO, fibraG: 0 };
    expect(progresoContra(vacio, sumarAlimentos([alimento({ fibraG: 5 })])).fibra.porcentaje).toBe(0);
  });
});
