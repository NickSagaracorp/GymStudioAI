const { MUSCULOS, esUtilizable, aEjercicio } = require('../filtro');

const base = {
  id: 'biceps/dumbbell-biceps-curl',
  slug: 'dumbbell-biceps-curl',
  name: 'Curl de bíceps con mancuernas',
  muscle: 'biceps',
  equipment: 'dumbbell',
  category: 'strength',
  secondaryMuscles: ['forearms'],
  file: 'biceps/dumbbell-biceps-curl.gif',
  gifUrl: 'https://cdn/biceps/dumbbell-biceps-curl.gif',
};

describe('esUtilizable', () => {
  it('acepta un ejercicio de fuerza de un músculo soportado', () => {
    expect(esUtilizable(base)).toBe(true);
  });

  it('rechaza estiramientos y cardio', () => {
    expect(esUtilizable({ ...base, category: 'stretching' })).toBe(false);
    expect(esUtilizable({ ...base, category: 'cardio' })).toBe(false);
  });

  it('rechaza músculos fuera de los trece soportados', () => {
    expect(esUtilizable({ ...base, muscle: 'spine' })).toBe(false);
  });

  it('rechaza variantes inestables por palabra clave', () => {
    expect(esUtilizable({ ...base, slug: 'dumbbell-curl-on-bosu-ball' })).toBe(false);
    expect(esUtilizable({ ...base, slug: 'dumbbell-biceps-curl-v-sit' })).toBe(false);
    expect(esUtilizable({ ...base, slug: 'dumbbell-curl-with-arm-blaster' })).toBe(false);
  });

  it('soporta exactamente trece músculos', () => {
    expect(MUSCULOS).toHaveLength(13);
  });
});

describe('aEjercicio', () => {
  it('normaliza al formato interno y descarta músculos secundarios no soportados', () => {
    expect(aEjercicio({ ...base, secondaryMuscles: ['forearms', 'spine'] }, 'https://cdn/x')).toEqual({
      id: 'biceps/dumbbell-biceps-curl',
      nombre: 'Curl de bíceps con mancuernas',
      musculo: 'biceps',
      equipamiento: 'dumbbell',
      musculosSecundarios: ['forearms'],
      miniatura: 'biceps__dumbbell-biceps-curl',
      gifUrl: 'https://cdn/x/biceps/dumbbell-biceps-curl.gif',
    });
  });
});
