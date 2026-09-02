import { evaluarMedicion } from '../mediciones';
import type { Medicion } from '@/data/db/repos/mediciones';

const medicion = (pesoKg: number, medidas: Medicion['medidas'] = {}): Medicion => ({
  id: 1,
  fecha: '2026-09-02',
  pesoKg,
  notas: null,
  medidas,
});

const SIN_ANIMO = { entrenamientosDelMes: 0, rachaActual: 0 };

describe('evaluarMedicion', () => {
  it('sin medicion anterior no hay progreso y el titulo es punto de partida', () => {
    const veredicto = evaluarMedicion('definicion', null, medicion(80), SIN_ANIMO);
    expect(veredicto.hayProgreso).toBe(false);
    expect(veredicto.titulo).toBe('Punto de partida');
  });

  it('definicion: bajar de peso es progreso con el signo menos tipografico', () => {
    const veredicto = evaluarMedicion(
      'definicion',
      medicion(80),
      medicion(78.5),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(true);
    expect(veredicto.detalle).toContain('−1,5 kg');
  });

  it('definicion: subir de peso no es progreso', () => {
    const veredicto = evaluarMedicion(
      'definicion',
      medicion(80),
      medicion(81.5),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(false);
  });

  it('definicion: bajar la cintura con el peso igual es progreso', () => {
    const veredicto = evaluarMedicion(
      'definicion',
      medicion(80, { cintura: 90 }),
      medicion(80, { cintura: 88 }),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(true);
    expect(veredicto.detalle).toContain('−2 cm de cintura');
  });

  it('volumen: subir de peso es progreso', () => {
    const veredicto = evaluarMedicion('volumen', medicion(70), medicion(71), SIN_ANIMO);
    expect(veredicto.hayProgreso).toBe(true);
    expect(veredicto.detalle).toContain('+1 kg');
  });

  it('volumen: bajar de peso no es progreso', () => {
    const veredicto = evaluarMedicion('volumen', medicion(70), medicion(69), SIN_ANIMO);
    expect(veredicto.hayProgreso).toBe(false);
  });

  it('fuerza: subir el pecho es progreso', () => {
    const veredicto = evaluarMedicion(
      'fuerza',
      medicion(80, { pecho: 100 }),
      medicion(80, { pecho: 101 }),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(true);
  });

  it('umbral: 0,2 kg en definicion no cuenta como progreso', () => {
    const veredicto = evaluarMedicion(
      'definicion',
      medicion(80),
      medicion(79.8),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(false);
  });

  it('umbral: 0,3 cm de cintura no cuenta como progreso', () => {
    const veredicto = evaluarMedicion(
      'definicion',
      medicion(80, { cintura: 90 }),
      medicion(80, { cintura: 89.7 }),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(false);
  });

  it('una medida ausente en la actual no rompe ni cuenta', () => {
    const veredicto = evaluarMedicion(
      'definicion',
      medicion(80, { cintura: 90 }),
      medicion(80, {}),
      SIN_ANIMO,
    );
    expect(veredicto.hayProgreso).toBe(false);
    expect(veredicto.detalle).not.toContain('undefined');
    expect(veredicto.detalle).not.toContain('NaN');
  });

  it('sin progreso y racha 0 no menciona la racha ni contiene undefined/NaN', () => {
    const veredicto = evaluarMedicion('definicion', medicion(80), medicion(80), {
      entrenamientosDelMes: 3,
      rachaActual: 0,
    });
    expect(veredicto.hayProgreso).toBe(false);
    expect(veredicto.detalle).not.toContain('racha');
    expect(veredicto.detalle).not.toContain('días');
    expect(veredicto.detalle).not.toContain('undefined');
    expect(veredicto.detalle).not.toContain('NaN');
  });

  it('sin progreso con racha 5 y 12 entrenamientos menciona ambos', () => {
    const veredicto = evaluarMedicion('definicion', medicion(80), medicion(80), {
      entrenamientosDelMes: 12,
      rachaActual: 5,
    });
    expect(veredicto.hayProgreso).toBe(false);
    expect(veredicto.detalle).toContain('12 entrenamientos');
    expect(veredicto.detalle).toContain('5 días');
  });
});
