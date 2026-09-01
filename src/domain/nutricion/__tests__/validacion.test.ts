import { escalarAlimento, validarAnalisis } from '../validacion';
import type { Alimento } from '../tipos';

const POLLO = {
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
};

const respuesta = (alimentos: unknown[]) => ({ alimentos });

describe('validación de la respuesta de la IA', () => {
  it('acepta un alimento correcto', () => {
    const { alimentos, descartados, avisos } = validarAnalisis(respuesta([POLLO]));
    expect(descartados).toBe(0);
    expect(avisos).toEqual([]);
    expect(alimentos[0]?.nombre).toBe('Pechuga de pollo');
    expect(alimentos[0]?.confianza).toBe('alta');
  });

  it('rellena con cero los campos opcionales que falten', () => {
    const minimo = {
      nombre: 'Arroz',
      cantidadG: 150,
      kcal: 195,
      proteinaG: 4,
      carbosG: 42,
      grasaG: 0.5,
    };
    const { alimentos } = validarAnalisis(respuesta([minimo]));
    expect(alimentos[0]?.azucaresG).toBe(0);
    expect(alimentos[0]?.fibraG).toBe(0);
    expect(alimentos[0]?.confianza).toBeNull();
  });

  it('descarta alimentos sin nombre o con campos no numéricos', () => {
    const { alimentos, descartados } = validarAnalisis(
      respuesta([
        { ...POLLO, nombre: '   ' },
        { ...POLLO, kcal: 'mucho' },
        { ...POLLO, proteinaG: null },
      ]),
    );
    expect(alimentos).toEqual([]);
    expect(descartados).toBe(3);
  });

  it('descarta valores negativos', () => {
    const { descartados } = validarAnalisis(respuesta([{ ...POLLO, grasaG: -2 }]));
    expect(descartados).toBe(1);
  });

  it('descarta cantidades fuera de rango', () => {
    const { descartados } = validarAnalisis(
      respuesta([
        { ...POLLO, cantidadG: 0 },
        { ...POLLO, cantidadG: 2500 },
      ]),
    );
    expect(descartados).toBe(2);
  });

  it('descarta azúcares por encima de los carbohidratos', () => {
    const { descartados } = validarAnalisis(
      respuesta([{ ...POLLO, carbosG: 10, azucaresG: 15 }]),
    );
    expect(descartados).toBe(1);
  });

  it('descarta saturada más trans por encima de la grasa total', () => {
    const { descartados } = validarAnalisis(
      respuesta([{ ...POLLO, grasaG: 5, grasaSaturadaG: 4, grasaTransG: 2 }]),
    );
    expect(descartados).toBe(1);
  });

  it('recalcula las calorías cuando se desvían más de un 25 %', () => {
    // 4*20 + 4*30 + 9*10 = 290 kcal, pero declara 900
    const { alimentos, avisos } = validarAnalisis(
      respuesta([
        { ...POLLO, kcal: 900, proteinaG: 20, carbosG: 30, azucaresG: 0, grasaG: 10 },
      ]),
    );
    expect(alimentos[0]?.kcal).toBe(290);
    expect(avisos[0]).toContain('recalcularon');
  });

  it('respeta las calorías declaradas si están dentro del margen', () => {
    const { alimentos, avisos } = validarAnalisis(
      respuesta([
        { ...POLLO, kcal: 300, proteinaG: 20, carbosG: 30, azucaresG: 0, grasaG: 10 },
      ]),
    );
    expect(alimentos[0]?.kcal).toBe(300);
    expect(avisos).toEqual([]);
  });

  it('avisa en singular y en plural de lo descartado', () => {
    expect(validarAnalisis(respuesta([{ ...POLLO, cantidadG: 0 }])).avisos[0]).toContain(
      'Se descartó 1 alimento',
    );
    expect(
      validarAnalisis(respuesta([{ ...POLLO, cantidadG: 0 }, { ...POLLO, kcal: 'x' }])).avisos[0],
    ).toContain('Se descartaron 2');
  });

  it('sobrevive a respuestas que no son lo esperado', () => {
    expect(validarAnalisis(null).alimentos).toEqual([]);
    expect(validarAnalisis('vaya').alimentos).toEqual([]);
    expect(validarAnalisis({}).avisos[0]).toContain('lista de alimentos');
    expect(validarAnalisis({ alimentos: 'no es un array' }).alimentos).toEqual([]);
    expect(validarAnalisis(respuesta([])).alimentos).toEqual([]);
    expect(validarAnalisis(respuesta([null, 3])).descartados).toBe(2);
  });
});

describe('escalado por cantidad', () => {
  const alimento: Alimento = {
    nombre: 'Arroz',
    cantidadG: 100,
    kcal: 130,
    proteinaG: 2.7,
    carbosG: 28,
    azucaresG: 0.1,
    grasaG: 0.3,
    grasaSaturadaG: 0.1,
    grasaTransG: 0,
    fibraG: 0.4,
    confianza: 'media',
  };

  it('duplica las macros al duplicar la cantidad', () => {
    const doble = escalarAlimento(alimento, 200);
    expect(doble.cantidadG).toBe(200);
    expect(doble.kcal).toBe(260);
    expect(doble.proteinaG).toBe(5.4);
    expect(doble.carbosG).toBe(56);
  });

  it('reduce proporcionalmente al bajar la cantidad', () => {
    expect(escalarAlimento(alimento, 50).kcal).toBe(65);
  });

  it('conserva nombre y confianza', () => {
    const escalado = escalarAlimento(alimento, 150);
    expect(escalado.nombre).toBe('Arroz');
    expect(escalado.confianza).toBe('media');
  });

  it('no divide por cero si la cantidad original es cero', () => {
    const raro = { ...alimento, cantidadG: 0 };
    expect(escalarAlimento(raro, 100).cantidadG).toBe(100);
  });
});
