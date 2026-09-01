const fs = require('fs');
const path = require('path');
const { esUtilizable, aEjercicio } = require('./filtro');

const BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.2.0';
const DIR_CATALOGO = path.join(__dirname, '..', 'assets', 'catalog');
const DIR_THUMBS = path.join(__dirname, '..', 'assets', 'thumbs');
const RUTA_JSON = path.join(DIR_CATALOGO, 'ejercicios.json');

// Anclas del motor de planificación. Si alguna no sobrevive al filtro, esto falla.
const ANCLAS = [
  'pectorals/dumbbell-bench-press',
  'pectorals/push-up',
  'delts/dumbbell-arnold-press',
  'triceps/dumbbell-close-grip-press',
  'biceps/dumbbell-biceps-curl',
  'forearms/dumbbell-reverse-wrist-curl',
  'upper-back/dumbbell-bent-over-row',
  'upper-back/inverted-row-bent-knees',
  'lats/chin-up',
  'quads/dumbbell-goblet-squat',
  'glutes/dumbbell-romanian-deadlift',
  'hamstrings/dumbbell-lying-femoral',
  'calves/dumbbell-standing-calf-raise',
  'abs/crunch-floor',
  'traps/dumbbell-shrug',
];

async function traerJson(ruta) {
  const respuesta = await fetch(`${BASE}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} devolvió ${respuesta.status}`);
  return respuesta.json();
}

async function descargarMiniatura(bruto, destino) {
  const url = `${BASE}/${bruto.file.replace('.gif', '.thumb.webp')}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`miniatura ${url} devolvió ${respuesta.status}`);
  fs.writeFileSync(destino, Buffer.from(await respuesta.arrayBuffer()));
}

async function main() {
  if (process.argv.includes('--si-falta') && fs.existsSync(RUTA_JSON)) {
    console.log('Catálogo ya generado, no se hace nada.');
    return;
  }

  const [mancuernas, corporal] = await Promise.all([
    traerJson('/api/es/equipment/dumbbell.json'),
    traerJson('/api/es/equipment/bodyweight.json'),
  ]);

  const brutos = [...mancuernas.exercises, ...corporal.exercises].filter(esUtilizable);
  const ejercicios = brutos.map((bruto) => aEjercicio(bruto, BASE)).sort((a, b) => a.id.localeCompare(b.id));

  const ids = new Set(ejercicios.map((e) => e.id));
  const faltan = ANCLAS.filter((ancla) => !ids.has(ancla));
  if (faltan.length > 0) throw new Error(`Anclas ausentes del catálogo: ${faltan.join(', ')}`);

  fs.mkdirSync(DIR_CATALOGO, { recursive: true });
  fs.mkdirSync(DIR_THUMBS, { recursive: true });
  fs.writeFileSync(RUTA_JSON, JSON.stringify(ejercicios), 'utf8');

  let descargadas = 0;
  for (const bruto of brutos) {
    const destino = path.join(DIR_THUMBS, `${bruto.id.replace('/', '__')}.webp`);
    if (!fs.existsSync(destino)) {
      await descargarMiniatura(bruto, destino);
      descargadas += 1;
      if (descargadas % 50 === 0) console.log(`  ${descargadas} miniaturas...`);
    }
  }

  const lineas = ejercicios.map(
    (e) => `  '${e.miniatura}': require('./${e.miniatura}.webp'),`,
  );
  fs.writeFileSync(
    path.join(DIR_THUMBS, 'index.ts'),
    '// Generado por scripts/build-catalog.js. No editar a mano.\n' +
      `export const MINIATURAS: Record<string, number> = {\n${lineas.join('\n')}\n};\n`,
    'utf8',
  );

  console.log(`${ejercicios.length} ejercicios, ${descargadas} miniaturas nuevas.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
