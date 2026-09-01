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

describe('ruido del catálogo origen', () => {
  const bruto = (slug, muscle = 'quads') => ({
    ...base,
    slug,
    muscle,
    id: `${muscle}/${slug}`,
  });

  it('rechaza entradas comodín cuyo slug es el propio músculo', () => {
    expect(esUtilizable(bruto('quads'))).toBe(false);
  });

  it('rechaza halterofilia y movimientos técnicos', () => {
    expect(esUtilizable(bruto('snatch-pull'))).toBe(false);
    expect(esUtilizable(bruto('squat-jerk'))).toBe(false);
    expect(esUtilizable(bruto('dumbbell-clean', 'glutes'))).toBe(false);
  });

  it('rechaza agilidad, desplazamientos y calistenia de élite', () => {
    expect(esUtilizable(bruto('quick-feet-v-2'))).toBe(false);
    expect(esUtilizable(bruto('farmers-walk'))).toBe(false);
    expect(esUtilizable(bruto('full-planche', 'abs'))).toBe(false);
    expect(esUtilizable(bruto('flag', 'abs'))).toBe(false);
  });

  it('conserva los ejercicios legítimos de esos mismos músculos', () => {
    expect(esUtilizable(bruto('sissy-squat'))).toBe(true);
    expect(esUtilizable(bruto('split-squats'))).toBe(true);
    expect(esUtilizable(bruto('crunch-floor', 'abs'))).toBe(true);
  });
});

describe('estiramientos colados como fuerza', () => {
  const bruto = (slug, muscle = 'hamstrings') => ({ ...base, slug, muscle, id: `${muscle}/${slug}` });

  it('rechaza posturas de yoga y estiramientos', () => {
    expect(esUtilizable(bruto('reclining-big-toe-pose-with-rope'))).toBe(false);
    expect(esUtilizable(bruto('seated-wide-angle-pose-sequence'))).toBe(false);
    expect(esUtilizable(bruto('assisted-prone-hamstring'))).toBe(false);
  });

  it('conserva los curls femorales reales', () => {
    expect(esUtilizable(bruto('inverse-leg-curl-bench-support'))).toBe(true);
    expect(esUtilizable(bruto('glute-ham-raise'))).toBe(true);
  });
});
