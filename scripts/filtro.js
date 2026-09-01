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

// La categoría "strength" del catálogo origen no basta: cuela halterofilia,
// ejercicios de agilidad, calistenia de élite y material que no tenemos.
const PALABRAS_EXCLUIDAS = [
  // Material inestable o accesorios que no se asumen disponibles.
  'bosu',
  'exercise-ball',
  'stability',
  'balance-board',
  'arm-blaster',
  'stork',
  'v-sit',
  // Halterofilia y movimientos técnicos que no se autoprograman.
  'snatch',
  'jerk',
  'clean',
  'muscle-up',
  'bowling',
  // Agilidad y desplazamientos, no trabajo de fuerza por series.
  'quick-feet',
  'farmers-walk',
  'inchworm',
  // Calistenia de élite: no es material de un plan generado.
  'planche',
  'maltese',
  'front-lever',
  'back-lever',
  'iron-cross',
  // Estiramientos y posturas de yoga marcados como "strength" en el origen.
  'stretch',
  '-pose',
];

// Entradas concretas del catálogo que no describen un ejercicio real.
const SLUGS_EXCLUIDOS = ['flag', 'potty-squat', 'assisted-prone-hamstring'];

function esUtilizable(bruto) {
  if (bruto.category !== 'strength') return false;
  if (!MUSCULOS.includes(bruto.muscle)) return false;
  // Entradas comodín tipo "quads/quads", que no son un ejercicio.
  if (bruto.slug === bruto.muscle) return false;
  if (SLUGS_EXCLUIDOS.includes(bruto.slug)) return false;
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

module.exports = { MUSCULOS, PALABRAS_EXCLUIDAS, SLUGS_EXCLUIDOS, esUtilizable, aEjercicio };
