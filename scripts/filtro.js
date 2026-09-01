const MUSCULOS = [
  'abs',
  'biceps',
  'calves',
  'delts',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'pectorals',
  'quads',
  'traps',
  'triceps',
  'upper-back',
];

const PALABRAS_EXCLUIDAS = [
  'bosu',
  'exercise-ball',
  'stability',
  'stork',
  'bowling',
  'v-sit',
  'arm-blaster',
];

function esUtilizable(bruto) {
  if (bruto.category !== 'strength') return false;
  if (!MUSCULOS.includes(bruto.muscle)) return false;
  return !PALABRAS_EXCLUIDAS.some((palabra) => bruto.slug.includes(palabra));
}

// El campo gifUrl del catálogo apunta a "ExerciseGymGigsDB" (errata del repo) y da 404,
// así que la URL se construye desde la base del CDN y la ruta del fichero.
function aEjercicio(bruto, base) {
  return {
    id: bruto.id,
    nombre: bruto.name,
    musculo: bruto.muscle,
    equipamiento: bruto.equipment,
    musculosSecundarios: (bruto.secondaryMuscles || []).filter((m) => MUSCULOS.includes(m)),
    miniatura: bruto.id.replace('/', '__'),
    gifUrl: `${base}/${bruto.file}`,
  };
}

module.exports = { MUSCULOS, PALABRAS_EXCLUIDAS, esUtilizable, aEjercicio };
