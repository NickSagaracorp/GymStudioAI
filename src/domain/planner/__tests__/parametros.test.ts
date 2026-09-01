import { esGrande, rangoReps, seriesSemanales, PARAMETROS } from '../parametros';

describe('parámetros por objetivo', () => {
  it('define rangos distintos para los tres objetivos', () => {
    expect(PARAMETROS.volumen.repMin).toBe(8);
    expect(PARAMETROS.definicion.repMin).toBe(12);
    expect(PARAMETROS.fuerza.repMax).toBe(6);
  });

  it('descansa más en fuerza que en definición', () => {
    expect(PARAMETROS.fuerza.descansoSeg).toBeGreaterThan(PARAMETROS.definicion.descansoSeg);
  });
});

describe('clasificación de músculos', () => {
  it('trata pectoral y cuádriceps como grandes, bíceps y abdomen como pequeños', () => {
    expect(esGrande('pectorals')).toBe(true);
    expect(esGrande('quads')).toBe(true);
    expect(esGrande('biceps')).toBe(false);
    expect(esGrande('abs')).toBe(false);
  });
});

describe('series semanales', () => {
  it('da más volumen a los músculos grandes', () => {
    expect(seriesSemanales('pectorals', 'volumen', 'intermedio')).toBe(14);
    expect(seriesSemanales('biceps', 'volumen', 'intermedio')).toBe(9);
  });

  it('escala con el nivel', () => {
    expect(seriesSemanales('pectorals', 'volumen', 'principiante')).toBe(11);
    expect(seriesSemanales('pectorals', 'volumen', 'avanzado')).toBe(18);
  });

  it('reduce el volumen en fuerza', () => {
    expect(seriesSemanales('pectorals', 'fuerza', 'intermedio')).toBe(10);
  });
});

describe('rango de repeticiones', () => {
  it('amplía el rango en ejercicios de peso corporal', () => {
    expect(rangoReps('dumbbell', 'volumen')).toEqual({ repMin: 8, repMax: 12 });
    expect(rangoReps('bodyweight', 'volumen')).toEqual({ repMin: 12, repMax: 18 });
  });
});
