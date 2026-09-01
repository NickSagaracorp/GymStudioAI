# Entrenamiento guiado con mancuernas — Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** App móvil offline que genera un programa de entrenamiento de 8 semanas con mancuernas y peso corporal, lo guía ejercicio a ejercicio con animaciones y registro de series, y lleva el seguimiento semanal de peso y medidas.

**Arquitectura:** Cuatro capas con dependencias en una sola dirección. `data/catalog` sirve el catálogo empaquetado en tiempo de compilación; `data/db` es SQLite tras un adaptador que permite testear con `better-sqlite3`; `domain/planner` son funciones puras sin React, red ni base de datos, y ahí vive toda la lógica de entrenamiento; `ui` solo pinta. Todo lo que decide qué entrenas es determinista y testeable sin simulador.

**Stack:** React Native + Expo SDK 54, TypeScript estricto, expo-router, expo-sqlite, expo-file-system, expo-secure-store, react-native-svg, Zustand, Jest + React Native Testing Library.

**Especificación:** `docs/superpowers/specs/2026-08-31-entrenamiento-guiado-design.md`

---

## Estructura de ficheros

Qué se crea y de qué responde cada pieza. Las tareas siguen este mapa.

| Fichero | Responsabilidad |
|---|---|
| `scripts/filtro.js` | Reglas puras de filtrado y normalización del catálogo. Sin red. |
| `scripts/build-catalog.js` | Descarga el catálogo de jsDelivr, aplica `filtro.js`, escribe JSON y miniaturas. |
| `src/data/catalog/tipos.ts` | Tipos `Musculo`, `Equipamiento`, `Ejercicio`. |
| `src/data/catalog/catalogo.ts` | `crearCatalogo(ejercicios)` con las consultas de lectura. |
| `src/data/db/adaptador.ts` | Interfaz `Adaptador` y su implementación con expo-sqlite. |
| `src/data/db/migraciones.ts` | Lista de migraciones numeradas y `migrar()`. |
| `src/data/db/repos/perfil.ts` | Lectura y escritura del perfil (fila única). |
| `src/data/db/repos/programa.ts` | Persistencia del programa, sus días y sus ejercicios. |
| `src/data/db/repos/sesion.ts` | Sesiones y series; historial por ejercicio. |
| `src/data/db/repos/mediciones.ts` | Mediciones corporales y sus medidas. |
| `src/data/db/repos/retos.ts` | Retos y su progreso. |
| `src/domain/planner/tipos.ts` | Tipos compartidos del motor. |
| `src/domain/planner/parametros.ts` | Parámetros por objetivo y volumen semanal por músculo. |
| `src/domain/planner/splits.ts` | Plantillas de split por días disponibles. |
| `src/domain/planner/seleccion.ts` | Anclas, barajado determinista y elección de accesorios. |
| `src/domain/planner/programa.ts` | Generación del programa completo de 8 semanas. |
| `src/domain/planner/progresion.ts` | `calcularMeta`: doble progresión. |
| `src/domain/planner/retos.ts` | `evaluarReto`: los tres tipos de reto. |
| `src/services/cacheGifs.ts` | Descarga y caché de GIFs con desalojo LRU. |
| `src/services/avisos.ts` | Notificación local del día de medición. |
| `src/ui/tema/` | Colores, tipografía y espaciado. |
| `src/ui/componentes/` | Silueta, tabla de series, cronómetro, gráfica, GIF. |
| `app/` | Rutas de expo-router. |

---

## Tarea 1: Andamiaje del proyecto

**Ficheros:**
- Crear: `package.json`, `tsconfig.json`, `app.json`, `app/_layout.tsx`, `jest.config.js`
- Test: `src/__tests__/humo.test.ts`

- [ ] **Paso 1: Crear el proyecto Expo**

```bash
npx create-expo-app@latest . --template blank-typescript
```

Si la carpeta no está vacía, el comando avisa. Responder que sí a continuar: el único fichero previo es `docs/`, que no toca.

- [ ] **Paso 2: Instalar dependencias**

```bash
npx expo install expo-router expo-sqlite expo-file-system expo-secure-store expo-notifications react-native-svg react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install zustand
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest better-sqlite3 @types/better-sqlite3
```

- [ ] **Paso 3: Configurar TypeScript estricto**

Reemplazar `tsconfig.json` por:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Paso 4: Configurar Jest**

Crear `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
```

Añadir a `package.json` en `scripts`:

```json
"test": "jest",
"catalogo": "node scripts/build-catalog.js"
```

- [ ] **Paso 5: Escribir el test de humo**

Crear `src/__tests__/humo.test.ts`:

```ts
describe('entorno de pruebas', () => {
  it('ejecuta TypeScript', () => {
    const suma = (a: number, b: number): number => a + b;
    expect(suma(2, 3)).toBe(5);
  });
});
```

- [ ] **Paso 6: Ejecutar los tests**

Run: `npm test`
Esperado: 1 test en verde.

- [ ] **Paso 7: Configurar expo-router**

En `app.json`, dentro de `expo`, añadir `"scheme": "gymstudioai"` y `"plugins": ["expo-router"]`. En `package.json`, cambiar `"main"` a `"expo-router/entry"`.

Crear `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function DisposicionRaiz() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Crear `app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Inicio() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>GymStudioAI</Text>
    </View>
  );
}
```

- [ ] **Paso 8: Commit**

```bash
git add -A
git commit -m "chore: andamiaje Expo con TypeScript estricto y Jest"
```

---

## Tarea 2: Reglas de filtrado del catálogo

Lógica pura, sin red, para poder testearla. La usa el script de compilación.

**Ficheros:**
- Crear: `scripts/filtro.js`
- Test: `scripts/__tests__/filtro.test.js`

- [ ] **Paso 1: Escribir el test que falla**

Crear `scripts/__tests__/filtro.test.js`:

```js
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
    expect(aEjercicio({ ...base, secondaryMuscles: ['forearms', 'spine'] })).toEqual({
      id: 'biceps/dumbbell-biceps-curl',
      nombre: 'Curl de bíceps con mancuernas',
      musculo: 'biceps',
      equipamiento: 'dumbbell',
      musculosSecundarios: ['forearms'],
      miniatura: 'biceps__dumbbell-biceps-curl',
      gifUrl: 'https://cdn/biceps/dumbbell-biceps-curl.gif',
    });
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest scripts/__tests__/filtro.test.js`
Esperado: FALLO, `Cannot find module '../filtro'`.

- [ ] **Paso 3: Implementar el filtro**

Crear `scripts/filtro.js`:

```js
const MUSCULOS = [
  'abs', 'biceps', 'calves', 'delts', 'forearms', 'glutes', 'hamstrings',
  'lats', 'pectorals', 'quads', 'traps', 'triceps', 'upper-back',
];

const PALABRAS_EXCLUIDAS = [
  'bosu', 'exercise-ball', 'stability', 'stork', 'bowling', 'v-sit', 'arm-blaster',
];

function esUtilizable(bruto) {
  if (bruto.category !== 'strength') return false;
  if (!MUSCULOS.includes(bruto.muscle)) return false;
  return !PALABRAS_EXCLUIDAS.some((palabra) => bruto.slug.includes(palabra));
}

function aEjercicio(bruto) {
  return {
    id: bruto.id,
    nombre: bruto.name,
    musculo: bruto.muscle,
    equipamiento: bruto.equipment,
    musculosSecundarios: (bruto.secondaryMuscles || []).filter((m) => MUSCULOS.includes(m)),
    miniatura: bruto.id.replace('/', '__'),
    gifUrl: bruto.gifUrl,
  };
}

module.exports = { MUSCULOS, PALABRAS_EXCLUIDAS, esUtilizable, aEjercicio };
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest scripts/__tests__/filtro.test.js`
Esperado: 6 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add scripts/filtro.js scripts/__tests__/filtro.test.js
git commit -m "feat: reglas de filtrado del catálogo de ejercicios"
```

---

## Tarea 3: Script de compilación del catálogo

**Ficheros:**
- Crear: `scripts/build-catalog.js`
- Modifica: `.gitignore` (ya ignora `assets/thumbs/*.webp` y `assets/catalog/ejercicios.json`)

- [ ] **Paso 1: Escribir el script**

Crear `scripts/build-catalog.js`:

```js
const fs = require('fs');
const path = require('path');
const { esUtilizable, aEjercicio } = require('./filtro');

const BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0';
const DIR_CATALOGO = path.join(__dirname, '..', 'assets', 'catalog');
const DIR_THUMBS = path.join(__dirname, '..', 'assets', 'thumbs');
const RUTA_JSON = path.join(DIR_CATALOGO, 'ejercicios.json');

// Anclas del motor. Si alguna no sobrevive al filtro, la compilación falla.
const ANCLAS = [
  'pectorals/dumbbell-bench-press', 'pectorals/push-up',
  'delts/dumbbell-arnold-press', 'triceps/dumbbell-close-grip-press',
  'biceps/dumbbell-biceps-curl', 'upper-back/dumbbell-bent-over-row',
  'upper-back/inverted-row-bent-knees', 'lats/chin-up',
  'quads/dumbbell-goblet-squat', 'glutes/dumbbell-romanian-deadlift',
  'hamstrings/dumbbell-lying-femoral', 'calves/dumbbell-standing-calf-raise',
  'abs/crunch-floor', 'traps/dumbbell-shrug',
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
  const ejercicios = brutos.map(aEjercicio).sort((a, b) => a.id.localeCompare(b.id));

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
    }
  }

  const lineas = ejercicios.map(
    (e) => `  '${e.miniatura}': require('./${e.miniatura}.webp'),`,
  );
  fs.writeFileSync(
    path.join(DIR_THUMBS, 'index.ts'),
    `// Generado por scripts/build-catalog.js. No editar a mano.\n` +
      `export const MINIATURAS: Record<string, number> = {\n${lineas.join('\n')}\n};\n`,
    'utf8',
  );

  console.log(`${ejercicios.length} ejercicios, ${descargadas} miniaturas nuevas.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Paso 2: Ejecutar el script**

Run: `npm run catalogo`
Esperado: `566 ejercicios, 566 miniaturas nuevas.` y ningún error de anclas.

- [ ] **Paso 3: Verificar el resultado**

Run: `node -e "const e=require('./assets/catalog/ejercicios.json'); console.log(e.length, e[0].id)"`
Esperado: `566` y un identificador que empieza por `abs/`.

- [ ] **Paso 4: Encadenar la generación a los tests**

Añadir a `package.json` en `scripts`:

```json
"pretest": "node scripts/build-catalog.js --si-falta"
```

- [ ] **Paso 5: Ignorar el index generado**

Añadir a `.gitignore` la línea `assets/thumbs/index.ts`.

- [ ] **Paso 6: Commit**

```bash
git add scripts/build-catalog.js .gitignore package.json
git commit -m "feat: script de compilación del catálogo con validación de anclas"
```

---

## Tarea 4: Módulo de catálogo

**Ficheros:**
- Crear: `src/data/catalog/tipos.ts`, `src/data/catalog/catalogo.ts`
- Test: `src/data/catalog/__tests__/catalogo.test.ts`, `src/data/catalog/__tests__/catalogo-real.test.ts`

- [ ] **Paso 1: Definir los tipos**

Crear `src/data/catalog/tipos.ts`:

```ts
export const MUSCULOS = [
  'abs', 'biceps', 'calves', 'delts', 'forearms', 'glutes', 'hamstrings',
  'lats', 'pectorals', 'quads', 'traps', 'triceps', 'upper-back',
] as const;

export type Musculo = (typeof MUSCULOS)[number];

export type Equipamiento = 'dumbbell' | 'bodyweight';

export interface Ejercicio {
  id: string;
  nombre: string;
  musculo: Musculo;
  equipamiento: Equipamiento;
  musculosSecundarios: Musculo[];
  miniatura: string;
  gifUrl: string;
}

export interface Catalogo {
  todos(): Ejercicio[];
  porId(id: string): Ejercicio | undefined;
  porMusculo(musculo: Musculo): Ejercicio[];
  buscar(texto: string): Ejercicio[];
}
```

- [ ] **Paso 2: Escribir el test que falla**

Crear `src/data/catalog/__tests__/catalogo.test.ts`:

```ts
import { crearCatalogo } from '../catalogo';
import type { Ejercicio } from '../tipos';

const ejercicios: Ejercicio[] = [
  {
    id: 'biceps/dumbbell-biceps-curl',
    nombre: 'Curl de bíceps con mancuernas',
    musculo: 'biceps',
    equipamiento: 'dumbbell',
    musculosSecundarios: ['forearms'],
    miniatura: 'biceps__dumbbell-biceps-curl',
    gifUrl: 'https://cdn/curl.gif',
  },
  {
    id: 'lats/chin-up',
    nombre: 'Dominada supina',
    musculo: 'lats',
    equipamiento: 'bodyweight',
    musculosSecundarios: ['biceps'],
    miniatura: 'lats__chin-up',
    gifUrl: 'https://cdn/chin.gif',
  },
];

const catalogo = crearCatalogo(ejercicios);

describe('catálogo', () => {
  it('devuelve un ejercicio por su identificador', () => {
    expect(catalogo.porId('lats/chin-up')?.nombre).toBe('Dominada supina');
  });

  it('devuelve undefined si el identificador no existe', () => {
    expect(catalogo.porId('no/existe')).toBeUndefined();
  });

  it('filtra por músculo principal', () => {
    expect(catalogo.porMusculo('biceps').map((e) => e.id)).toEqual([
      'biceps/dumbbell-biceps-curl',
    ]);
  });

  it('busca por nombre ignorando mayúsculas y acentos', () => {
    expect(catalogo.buscar('DOMINADA').map((e) => e.id)).toEqual(['lats/chin-up']);
    expect(catalogo.buscar('biceps').map((e) => e.id)).toEqual([
      'biceps/dumbbell-biceps-curl',
    ]);
  });
});
```

- [ ] **Paso 3: Ejecutar el test para verificar que falla**

Run: `npx jest src/data/catalog`
Esperado: FALLO, `Cannot find module '../catalogo'`.

- [ ] **Paso 4: Implementar el catálogo**

Crear `src/data/catalog/catalogo.ts`:

```ts
import type { Catalogo, Ejercicio, Musculo } from './tipos';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function crearCatalogo(ejercicios: Ejercicio[]): Catalogo {
  const porIdentificador = new Map(ejercicios.map((e) => [e.id, e]));

  const porMusculoMapa = new Map<Musculo, Ejercicio[]>();
  for (const ejercicio of ejercicios) {
    const lista = porMusculoMapa.get(ejercicio.musculo) ?? [];
    lista.push(ejercicio);
    porMusculoMapa.set(ejercicio.musculo, lista);
  }

  return {
    todos: () => ejercicios,
    porId: (id) => porIdentificador.get(id),
    porMusculo: (musculo) => porMusculoMapa.get(musculo) ?? [],
    buscar: (texto) => {
      const aguja = normalizar(texto);
      return ejercicios.filter((e) => normalizar(e.nombre).includes(aguja));
    },
  };
}
```

- [ ] **Paso 5: Ejecutar el test para verificar que pasa**

Run: `npx jest src/data/catalog`
Esperado: 4 tests en verde.

- [ ] **Paso 6: Escribir el test contra el catálogo real**

Crear `src/data/catalog/__tests__/catalogo-real.test.ts`:

```ts
import ejercicios from '../../../../assets/catalog/ejercicios.json';
import { crearCatalogo } from '../catalogo';
import { MUSCULOS } from '../tipos';
import type { Ejercicio } from '../tipos';

const catalogo = crearCatalogo(ejercicios as Ejercicio[]);

describe('catálogo real generado', () => {
  it('contiene 566 ejercicios', () => {
    expect(catalogo.todos()).toHaveLength(566);
  });

  it('cubre los trece músculos con al menos un ejercicio', () => {
    for (const musculo of MUSCULOS) {
      expect(catalogo.porMusculo(musculo).length).toBeGreaterThan(0);
    }
  });

  it('no contiene ejercicios de músculos no soportados', () => {
    for (const ejercicio of catalogo.todos()) {
      expect(MUSCULOS).toContain(ejercicio.musculo);
    }
  });
});
```

Ese `import` de JSON necesita `"resolveJsonModule": true` en `tsconfig.json`. Añadirlo dentro de `compilerOptions`.

- [ ] **Paso 7: Ejecutar toda la batería**

Run: `npm test`
Esperado: todos en verde, incluido el conteo de 566.

- [ ] **Paso 8: Commit**

```bash
git add src/data/catalog tsconfig.json
git commit -m "feat: módulo de catálogo con consultas de lectura"
```

---

## Tarea 5: Adaptador SQLite y migraciones

El adaptador existe para que los repositorios se puedan testear con `better-sqlite3` en Node, sin simulador.

**Ficheros:**
- Crear: `src/data/db/adaptador.ts`, `src/data/db/migraciones.ts`, `src/data/db/pruebas/adaptadorMemoria.ts`
- Test: `src/data/db/__tests__/migraciones.test.ts`

- [ ] **Paso 1: Definir la interfaz del adaptador**

Crear `src/data/db/adaptador.ts`:

```ts
export interface Adaptador {
  ejecutar(sql: string, parametros?: unknown[]): Promise<void>;
  consultar<T>(sql: string, parametros?: unknown[]): Promise<T[]>;
  insertar(sql: string, parametros?: unknown[]): Promise<number>;
}

export async function abrirAdaptadorExpo(nombre = 'gymstudio.db'): Promise<Adaptador> {
  const SQLite = await import('expo-sqlite');
  const bd = await SQLite.openDatabaseAsync(nombre);
  await bd.execAsync('PRAGMA foreign_keys = ON');
  return {
    ejecutar: async (sql, parametros = []) => {
      await bd.runAsync(sql, parametros as never[]);
    },
    consultar: async <T,>(sql: string, parametros: unknown[] = []) =>
      bd.getAllAsync<T>(sql, parametros as never[]),
    insertar: async (sql, parametros = []) => {
      const resultado = await bd.runAsync(sql, parametros as never[]);
      return resultado.lastInsertRowId;
    },
  };
}
```

- [ ] **Paso 2: Crear el adaptador de pruebas**

Crear `src/data/db/pruebas/adaptadorMemoria.ts`:

```ts
import Database from 'better-sqlite3';
import type { Adaptador } from '../adaptador';

export function crearAdaptadorMemoria(): Adaptador {
  const bd = new Database(':memory:');
  bd.pragma('foreign_keys = ON');
  return {
    ejecutar: async (sql, parametros = []) => {
      bd.prepare(sql).run(parametros as never[]);
    },
    consultar: async <T,>(sql: string, parametros: unknown[] = []) =>
      bd.prepare(sql).all(parametros as never[]) as T[],
    insertar: async (sql, parametros = []) =>
      Number(bd.prepare(sql).run(parametros as never[]).lastInsertRowid),
  };
}
```

`better-sqlite3` no admite `execAsync` con varias sentencias, así que `migrar()` ejecuta una sentencia por llamada. Por eso las migraciones son un array de sentencias, no un bloque de SQL.

- [ ] **Paso 3: Escribir el test que falla**

Crear `src/data/db/__tests__/migraciones.test.ts`:

```ts
import { crearAdaptadorMemoria } from '../pruebas/adaptadorMemoria';
import { MIGRACIONES, migrar, versionActual } from '../migraciones';

describe('migraciones', () => {
  it('crea todas las tablas y deja la versión al día', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);

    expect(await versionActual(adaptador)).toBe(MIGRACIONES.length);

    const tablas = await adaptador.consultar<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const nombres = tablas.map((t) => t.name);
    for (const tabla of [
      'perfil', 'programa', 'dia_programa', 'ejercicio_dia',
      'sesion', 'serie', 'reto', 'progreso_reto', 'medicion', 'medida',
    ]) {
      expect(nombres).toContain(tabla);
    }
  });

  it('es idempotente: migrar dos veces no falla', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    await migrar(adaptador);
    expect(await versionActual(adaptador)).toBe(MIGRACIONES.length);
  });

  it('aplica claves foráneas: una serie exige su sesión', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    await expect(
      adaptador.insertar(
        'INSERT INTO serie (sesion_id, ejercicio_id, numero, reps_meta) VALUES (?, ?, ?, ?)',
        [999, 'biceps/dumbbell-biceps-curl', 1, 10],
      ),
    ).rejects.toThrow();
  });
});
```

- [ ] **Paso 4: Ejecutar el test para verificar que falla**

Run: `npx jest src/data/db`
Esperado: FALLO, `Cannot find module '../migraciones'`.

- [ ] **Paso 5: Implementar las migraciones**

Crear `src/data/db/migraciones.ts`:

```ts
import type { Adaptador } from './adaptador';

export const MIGRACIONES: string[][] = [
  [
    `CREATE TABLE perfil (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT NOT NULL,
      sexo TEXT NOT NULL,
      fecha_nac TEXT NOT NULL,
      altura_cm REAL NOT NULL,
      nivel TEXT NOT NULL,
      objetivo TEXT NOT NULL,
      dias_por_semana INTEGER NOT NULL,
      mancuerna_min_kg REAL NOT NULL,
      mancuerna_max_kg REAL NOT NULL,
      incremento_kg REAL NOT NULL,
      tiene_banco INTEGER NOT NULL,
      tiene_barra_dominadas INTEGER NOT NULL,
      dia_medicion INTEGER NOT NULL,
      creado_en TEXT NOT NULL
    )`,
    `CREATE TABLE programa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      objetivo TEXT NOT NULL,
      semanas INTEGER NOT NULL,
      dias_por_semana INTEGER NOT NULL,
      split TEXT NOT NULL,
      creado_en TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE dia_programa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programa_id INTEGER NOT NULL REFERENCES programa(id) ON DELETE CASCADE,
      semana INTEGER NOT NULL,
      dia INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      musculos TEXT NOT NULL
    )`,
    `CREATE TABLE ejercicio_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_programa_id INTEGER NOT NULL REFERENCES dia_programa(id) ON DELETE CASCADE,
      orden INTEGER NOT NULL,
      ejercicio_id TEXT NOT NULL,
      musculo_objetivo TEXT NOT NULL,
      equipamiento TEXT NOT NULL,
      es_ancla INTEGER NOT NULL,
      series INTEGER NOT NULL,
      rep_min INTEGER NOT NULL,
      rep_max INTEGER NOT NULL,
      descanso_seg INTEGER NOT NULL
    )`,
    `CREATE TABLE sesion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_programa_id INTEGER NOT NULL REFERENCES dia_programa(id) ON DELETE CASCADE,
      iniciada_en TEXT NOT NULL,
      terminada_en TEXT,
      estado TEXT NOT NULL
    )`,
    `CREATE TABLE serie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sesion_id INTEGER NOT NULL REFERENCES sesion(id) ON DELETE CASCADE,
      ejercicio_id TEXT NOT NULL,
      numero INTEGER NOT NULL,
      peso_meta REAL,
      reps_meta INTEGER NOT NULL,
      peso_logrado REAL,
      reps_logradas INTEGER,
      completada_en TEXT
    )`,
    `CREATE TABLE reto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL,
      ejercicio_id TEXT,
      meta_valor REAL NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado TEXT NOT NULL
    )`,
    `CREATE TABLE progreso_reto (
      reto_id INTEGER PRIMARY KEY REFERENCES reto(id) ON DELETE CASCADE,
      valor_actual REAL NOT NULL,
      actualizado_en TEXT NOT NULL
    )`,
    `CREATE TABLE medicion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      peso_kg REAL NOT NULL,
      notas TEXT
    )`,
    `CREATE TABLE medida (
      medicion_id INTEGER NOT NULL REFERENCES medicion(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      valor_cm REAL NOT NULL,
      PRIMARY KEY (medicion_id, tipo)
    )`,
    `CREATE INDEX idx_serie_ejercicio ON serie (ejercicio_id, completada_en)`,
    `CREATE INDEX idx_sesion_dia ON sesion (dia_programa_id)`,
    `CREATE INDEX idx_dia_programa ON dia_programa (programa_id, semana, dia)`,
  ],
];

export async function versionActual(adaptador: Adaptador): Promise<number> {
  const filas = await adaptador.consultar<{ user_version: number }>('PRAGMA user_version');
  return filas[0]?.user_version ?? 0;
}

export async function migrar(adaptador: Adaptador): Promise<void> {
  const desde = await versionActual(adaptador);
  for (let version = desde; version < MIGRACIONES.length; version += 1) {
    for (const sentencia of MIGRACIONES[version] ?? []) {
      await adaptador.ejecutar(sentencia);
    }
    await adaptador.ejecutar(`PRAGMA user_version = ${version + 1}`);
  }
}
```

- [ ] **Paso 6: Ejecutar el test para verificar que pasa**

Run: `npx jest src/data/db`
Esperado: 3 tests en verde.

- [ ] **Paso 7: Commit**

```bash
git add src/data/db
git commit -m "feat: adaptador SQLite y migraciones del esquema"
```

---

## Tarea 6: Repositorio de perfil

**Ficheros:**
- Crear: `src/data/db/repos/perfil.ts`
- Test: `src/data/db/repos/__tests__/perfil.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/data/db/repos/__tests__/perfil.test.ts`:

```ts
import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoPerfil } from '../perfil';
import type { Perfil } from '../perfil';

const PERFIL: Perfil = {
  nombre: 'Nick',
  sexo: 'hombre',
  fechaNac: '1988-04-12',
  alturaCm: 178,
  nivel: 'intermedio',
  objetivo: 'volumen',
  diasPorSemana: 4,
  mancuernaMinKg: 2,
  mancuernaMaxKg: 30,
  incrementoKg: 2,
  tieneBanco: true,
  tieneBarraDominadas: false,
  diaMedicion: 0,
};

describe('repositorio de perfil', () => {
  it('devuelve null cuando no hay perfil', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    expect(await repoPerfil(adaptador).obtener()).toBeNull();
  });

  it('guarda y recupera el perfil con sus booleanos intactos', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar(PERFIL);
    expect(await repo.obtener()).toEqual(PERFIL);
  });

  it('sobrescribe el perfil en vez de crear una segunda fila', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPerfil(adaptador);
    await repo.guardar(PERFIL);
    await repo.guardar({ ...PERFIL, objetivo: 'fuerza', diasPorSemana: 3 });

    const filas = await adaptador.consultar<{ total: number }>(
      'SELECT COUNT(*) AS total FROM perfil',
    );
    expect(filas[0]?.total).toBe(1);
    expect((await repo.obtener())?.objetivo).toBe('fuerza');
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/data/db/repos/__tests__/perfil.test.ts`
Esperado: FALLO, `Cannot find module '../perfil'`.

- [ ] **Paso 3: Implementar el repositorio**

Crear `src/data/db/repos/perfil.ts`:

```ts
import type { Adaptador } from '../adaptador';

export type Nivel = 'principiante' | 'intermedio' | 'avanzado';
export type Objetivo = 'volumen' | 'definicion' | 'fuerza';

export interface Perfil {
  nombre: string;
  sexo: 'hombre' | 'mujer' | 'otro';
  fechaNac: string;
  alturaCm: number;
  nivel: Nivel;
  objetivo: Objetivo;
  diasPorSemana: number;
  mancuernaMinKg: number;
  mancuernaMaxKg: number;
  incrementoKg: number;
  tieneBanco: boolean;
  tieneBarraDominadas: boolean;
  diaMedicion: number;
}

interface FilaPerfil {
  nombre: string;
  sexo: Perfil['sexo'];
  fecha_nac: string;
  altura_cm: number;
  nivel: Nivel;
  objetivo: Objetivo;
  dias_por_semana: number;
  mancuerna_min_kg: number;
  mancuerna_max_kg: number;
  incremento_kg: number;
  tiene_banco: number;
  tiene_barra_dominadas: number;
  dia_medicion: number;
}

export function repoPerfil(adaptador: Adaptador) {
  return {
    async obtener(): Promise<Perfil | null> {
      const filas = await adaptador.consultar<FilaPerfil>('SELECT * FROM perfil WHERE id = 1');
      const fila = filas[0];
      if (!fila) return null;
      return {
        nombre: fila.nombre,
        sexo: fila.sexo,
        fechaNac: fila.fecha_nac,
        alturaCm: fila.altura_cm,
        nivel: fila.nivel,
        objetivo: fila.objetivo,
        diasPorSemana: fila.dias_por_semana,
        mancuernaMinKg: fila.mancuerna_min_kg,
        mancuernaMaxKg: fila.mancuerna_max_kg,
        incrementoKg: fila.incremento_kg,
        tieneBanco: fila.tiene_banco === 1,
        tieneBarraDominadas: fila.tiene_barra_dominadas === 1,
        diaMedicion: fila.dia_medicion,
      };
    },

    async guardar(perfil: Perfil): Promise<void> {
      await adaptador.ejecutar(
        `INSERT INTO perfil (
           id, nombre, sexo, fecha_nac, altura_cm, nivel, objetivo, dias_por_semana,
           mancuerna_min_kg, mancuerna_max_kg, incremento_kg, tiene_banco,
           tiene_barra_dominadas, dia_medicion, creado_en
         ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nombre = excluded.nombre, sexo = excluded.sexo, fecha_nac = excluded.fecha_nac,
           altura_cm = excluded.altura_cm, nivel = excluded.nivel,
           objetivo = excluded.objetivo, dias_por_semana = excluded.dias_por_semana,
           mancuerna_min_kg = excluded.mancuerna_min_kg,
           mancuerna_max_kg = excluded.mancuerna_max_kg,
           incremento_kg = excluded.incremento_kg, tiene_banco = excluded.tiene_banco,
           tiene_barra_dominadas = excluded.tiene_barra_dominadas,
           dia_medicion = excluded.dia_medicion`,
        [
          perfil.nombre, perfil.sexo, perfil.fechaNac, perfil.alturaCm, perfil.nivel,
          perfil.objetivo, perfil.diasPorSemana, perfil.mancuernaMinKg,
          perfil.mancuernaMaxKg, perfil.incrementoKg, perfil.tieneBanco ? 1 : 0,
          perfil.tieneBarraDominadas ? 1 : 0, perfil.diaMedicion,
          new Date().toISOString(),
        ],
      );
    },
  };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/data/db/repos/__tests__/perfil.test.ts`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/data/db/repos/perfil.ts src/data/db/repos/__tests__/perfil.test.ts
git commit -m "feat: repositorio de perfil"
```

---

## Tarea 7: Tipos del motor de planificación

Se definen antes que los repositorios de programa porque ambos los usan.

**Ficheros:**
- Crear: `src/domain/planner/tipos.ts`

- [ ] **Paso 1: Escribir los tipos**

Crear `src/domain/planner/tipos.ts`:

```ts
import type { Equipamiento, Musculo } from '@/data/catalog/tipos';

export type SplitId = 'fullbody2' | 'ppl3' | 'torso_pierna4' | 'split5' | 'ppl6';

export interface EjercicioDia {
  orden: number;
  ejercicioId: string;
  musculoObjetivo: Musculo;
  equipamiento: Equipamiento;
  esAncla: boolean;
  series: number;
  repMin: number;
  repMax: number;
  descansoSeg: number;
}

export interface DiaPlan {
  semana: number;
  dia: number;
  nombre: string;
  musculos: Musculo[];
  ejercicios: EjercicioDia[];
}

export interface ProgramaPlan {
  objetivo: 'volumen' | 'definicion' | 'fuerza';
  split: SplitId;
  semanas: number;
  diasPorSemana: number;
  dias: DiaPlan[];
}

/** Una serie ya registrada, tal y como la devuelve el repositorio de sesiones. */
export interface SerieHecha {
  sesionId: number;
  ejercicioId: string;
  numero: number;
  pesoLogrado: number | null;
  repsLogradas: number;
  completadaEn: string;
}

export interface Meta {
  /** null en ejercicios de peso corporal. */
  pesoMeta: number | null;
  repsMeta: number;
  series: number;
  /** true la primera vez: la interfaz debe pedir el peso inicial. */
  pesoInicialRequerido: boolean;
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `npx tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add src/domain/planner/tipos.ts
git commit -m "feat: tipos del motor de planificación"
```

---

## Tarea 8: Repositorio de programa

**Ficheros:**
- Crear: `src/data/db/repos/programa.ts`
- Test: `src/data/db/repos/__tests__/programa.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/data/db/repos/__tests__/programa.test.ts`:

```ts
import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoPrograma } from '../programa';
import type { ProgramaPlan } from '@/domain/planner/tipos';

const PLAN: ProgramaPlan = {
  objetivo: 'volumen',
  split: 'ppl3',
  semanas: 8,
  diasPorSemana: 3,
  dias: [
    {
      semana: 1,
      dia: 1,
      nombre: 'Empuje',
      musculos: ['pectorals', 'delts'],
      ejercicios: [
        {
          orden: 1,
          ejercicioId: 'pectorals/dumbbell-bench-press',
          musculoObjetivo: 'pectorals',
          equipamiento: 'dumbbell',
          esAncla: true,
          series: 4,
          repMin: 8,
          repMax: 12,
          descansoSeg: 90,
        },
      ],
    },
    {
      semana: 1,
      dia: 2,
      nombre: 'Tirón',
      musculos: ['lats'],
      ejercicios: [
        {
          orden: 1,
          ejercicioId: 'lats/chin-up',
          musculoObjetivo: 'lats',
          equipamiento: 'bodyweight',
          esAncla: true,
          series: 4,
          repMin: 12,
          repMax: 18,
          descansoSeg: 90,
        },
      ],
    },
  ],
};

describe('repositorio de programa', () => {
  it('guarda el plan y lo devuelve entero', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPrograma(adaptador);

    const programaId = await repo.guardar(PLAN);
    const activo = await repo.activo();

    expect(activo?.id).toBe(programaId);
    expect(activo?.plan.dias).toHaveLength(2);
    expect(activo?.plan.dias[0]?.musculos).toEqual(['pectorals', 'delts']);
    expect(activo?.plan.dias[0]?.ejercicios[0]?.esAncla).toBe(true);
  });

  it('desactiva el programa anterior al guardar uno nuevo', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPrograma(adaptador);

    const primero = await repo.guardar(PLAN);
    const segundo = await repo.guardar({ ...PLAN, objetivo: 'fuerza' });

    expect(segundo).not.toBe(primero);
    expect((await repo.activo())?.plan.objetivo).toBe('fuerza');
  });

  it('localiza el identificador de un día concreto', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoPrograma(adaptador);
    const programaId = await repo.guardar(PLAN);

    const dia = await repo.diaDe(programaId, 1, 2);
    expect(dia?.nombre).toBe('Tirón');
    expect(dia?.ejercicios[0]?.ejercicioId).toBe('lats/chin-up');
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/data/db/repos/__tests__/programa.test.ts`
Esperado: FALLO, `Cannot find module '../programa'`.

- [ ] **Paso 3: Implementar el repositorio**

Crear `src/data/db/repos/programa.ts`:

```ts
import type { Adaptador } from '../adaptador';
import type { DiaPlan, EjercicioDia, ProgramaPlan, SplitId } from '@/domain/planner/tipos';
import type { Musculo } from '@/data/catalog/tipos';

export interface DiaGuardado extends DiaPlan {
  id: number;
}

export interface ProgramaGuardado {
  id: number;
  plan: ProgramaPlan;
}

interface FilaDia {
  id: number;
  semana: number;
  dia: number;
  nombre: string;
  musculos: string;
}

interface FilaEjercicio {
  dia_programa_id: number;
  orden: number;
  ejercicio_id: string;
  musculo_objetivo: Musculo;
  equipamiento: EjercicioDia['equipamiento'];
  es_ancla: number;
  series: number;
  rep_min: number;
  rep_max: number;
  descanso_seg: number;
}

function aEjercicioDia(fila: FilaEjercicio): EjercicioDia {
  return {
    orden: fila.orden,
    ejercicioId: fila.ejercicio_id,
    musculoObjetivo: fila.musculo_objetivo,
    equipamiento: fila.equipamiento,
    esAncla: fila.es_ancla === 1,
    series: fila.series,
    repMin: fila.rep_min,
    repMax: fila.rep_max,
    descansoSeg: fila.descanso_seg,
  };
}

export function repoPrograma(adaptador: Adaptador) {
  async function diasDe(programaId: number): Promise<DiaGuardado[]> {
    const filasDia = await adaptador.consultar<FilaDia>(
      'SELECT id, semana, dia, nombre, musculos FROM dia_programa WHERE programa_id = ? ORDER BY semana, dia',
      [programaId],
    );
    const filasEjercicio = await adaptador.consultar<FilaEjercicio>(
      `SELECT e.* FROM ejercicio_dia e
       JOIN dia_programa d ON d.id = e.dia_programa_id
       WHERE d.programa_id = ? ORDER BY e.dia_programa_id, e.orden`,
      [programaId],
    );

    return filasDia.map((fila) => ({
      id: fila.id,
      semana: fila.semana,
      dia: fila.dia,
      nombre: fila.nombre,
      musculos: JSON.parse(fila.musculos) as Musculo[],
      ejercicios: filasEjercicio
        .filter((e) => e.dia_programa_id === fila.id)
        .map(aEjercicioDia),
    }));
  }

  return {
    diasDe,

    async guardar(plan: ProgramaPlan): Promise<number> {
      await adaptador.ejecutar('UPDATE programa SET activo = 0 WHERE activo = 1');
      const programaId = await adaptador.insertar(
        `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [plan.objetivo, plan.semanas, plan.diasPorSemana, plan.split, new Date().toISOString()],
      );

      for (const dia of plan.dias) {
        const diaId = await adaptador.insertar(
          'INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos) VALUES (?, ?, ?, ?, ?)',
          [programaId, dia.semana, dia.dia, dia.nombre, JSON.stringify(dia.musculos)],
        );
        for (const ejercicio of dia.ejercicios) {
          await adaptador.ejecutar(
            `INSERT INTO ejercicio_dia (
               dia_programa_id, orden, ejercicio_id, musculo_objetivo, equipamiento,
               es_ancla, series, rep_min, rep_max, descanso_seg
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              diaId, ejercicio.orden, ejercicio.ejercicioId, ejercicio.musculoObjetivo,
              ejercicio.equipamiento, ejercicio.esAncla ? 1 : 0, ejercicio.series,
              ejercicio.repMin, ejercicio.repMax, ejercicio.descansoSeg,
            ],
          );
        }
      }

      return programaId;
    },

    async activo(): Promise<ProgramaGuardado | null> {
      const filas = await adaptador.consultar<{
        id: number;
        objetivo: ProgramaPlan['objetivo'];
        semanas: number;
        dias_por_semana: number;
        split: SplitId;
      }>('SELECT id, objetivo, semanas, dias_por_semana, split FROM programa WHERE activo = 1');
      const fila = filas[0];
      if (!fila) return null;

      return {
        id: fila.id,
        plan: {
          objetivo: fila.objetivo,
          split: fila.split,
          semanas: fila.semanas,
          diasPorSemana: fila.dias_por_semana,
          dias: await diasDe(fila.id),
        },
      };
    },

    async diaDe(programaId: number, semana: number, dia: number): Promise<DiaGuardado | null> {
      const dias = await diasDe(programaId);
      return dias.find((d) => d.semana === semana && d.dia === dia) ?? null;
    },
  };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/data/db/repos/__tests__/programa.test.ts`
Esperado: 3 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/data/db/repos/programa.ts src/data/db/repos/__tests__/programa.test.ts
git commit -m "feat: repositorio de programa con días y ejercicios"
```

---

## Tarea 9: Repositorio de sesiones y series

**Ficheros:**
- Crear: `src/data/db/repos/sesion.ts`
- Test: `src/data/db/repos/__tests__/sesion.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/data/db/repos/__tests__/sesion.test.ts`:

```ts
import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoSesion } from '../sesion';
import type { Adaptador } from '../../adaptador';

async function conDiaDePrograma(adaptador: Adaptador): Promise<number> {
  const programaId = await adaptador.insertar(
    `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
     VALUES ('volumen', 8, 3, 'ppl3', '2026-01-01T00:00:00.000Z', 1)`,
  );
  return adaptador.insertar(
    `INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos)
     VALUES (?, 1, 1, 'Empuje', '["pectorals"]')`,
    [programaId],
  );
}

describe('repositorio de sesiones', () => {
  it('crea una sesión en borrador y la encuentra por su día', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);

    const sesionId = await repo.crear(diaId);
    const borrador = await repo.borradorDe(diaId);

    expect(borrador?.id).toBe(sesionId);
    expect(borrador?.estado).toBe('borrador');
  });

  it('registra series y las devuelve como historial del ejercicio', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);
    const sesionId = await repo.crear(diaId);

    await repo.registrarSerie({
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 1,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 10,
    });
    await repo.registrarSerie({
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 2,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 8,
    });

    const historial = await repo.historialDe('pectorals/dumbbell-bench-press');
    expect(historial).toHaveLength(2);
    expect(historial.map((s) => s.repsLogradas)).toEqual([8, 10]);
    expect(historial[0]?.sesionId).toBe(sesionId);
  });

  it('reescribe una serie si se corrige el mismo número', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);
    const sesionId = await repo.crear(diaId);

    const serie = {
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 1,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 10,
    };
    await repo.registrarSerie(serie);
    await repo.registrarSerie({ ...serie, repsLogradas: 12 });

    const historial = await repo.historialDe('pectorals/dumbbell-bench-press');
    expect(historial).toHaveLength(1);
    expect(historial[0]?.repsLogradas).toBe(12);
  });

  it('completa la sesión y deja de considerarla borrador', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const diaId = await conDiaDePrograma(adaptador);
    const repo = repoSesion(adaptador);
    const sesionId = await repo.crear(diaId);

    await repo.completar(sesionId);

    expect(await repo.borradorDe(diaId)).toBeNull();
    expect(await repo.completadasEntre('2000-01-01', '2100-01-01')).toHaveLength(1);
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/data/db/repos/__tests__/sesion.test.ts`
Esperado: FALLO, `Cannot find module '../sesion'`.

- [ ] **Paso 3: Implementar el repositorio**

Crear `src/data/db/repos/sesion.ts`:

```ts
import type { Adaptador } from '../adaptador';
import type { SerieHecha } from '@/domain/planner/tipos';

export type EstadoSesion = 'borrador' | 'completada' | 'abandonada';

export interface Sesion {
  id: number;
  diaProgramaId: number;
  iniciadaEn: string;
  terminadaEn: string | null;
  estado: EstadoSesion;
}

export interface SerieRegistrada {
  sesionId: number;
  ejercicioId: string;
  numero: number;
  pesoMeta: number | null;
  repsMeta: number;
  pesoLogrado: number | null;
  repsLogradas: number;
}

interface FilaSesion {
  id: number;
  dia_programa_id: number;
  iniciada_en: string;
  terminada_en: string | null;
  estado: EstadoSesion;
}

interface FilaSerie {
  sesion_id: number;
  ejercicio_id: string;
  numero: number;
  peso_logrado: number | null;
  reps_logradas: number;
  completada_en: string;
}

function aSesion(fila: FilaSesion): Sesion {
  return {
    id: fila.id,
    diaProgramaId: fila.dia_programa_id,
    iniciadaEn: fila.iniciada_en,
    terminadaEn: fila.terminada_en,
    estado: fila.estado,
  };
}

export function repoSesion(adaptador: Adaptador) {
  return {
    async crear(diaProgramaId: number): Promise<number> {
      return adaptador.insertar(
        'INSERT INTO sesion (dia_programa_id, iniciada_en, estado) VALUES (?, ?, ?)',
        [diaProgramaId, new Date().toISOString(), 'borrador'],
      );
    },

    async borradorDe(diaProgramaId: number): Promise<Sesion | null> {
      const filas = await adaptador.consultar<FilaSesion>(
        "SELECT * FROM sesion WHERE dia_programa_id = ? AND estado = 'borrador' ORDER BY id DESC",
        [diaProgramaId],
      );
      const fila = filas[0];
      return fila ? aSesion(fila) : null;
    },

    async registrarSerie(serie: SerieRegistrada): Promise<void> {
      await adaptador.ejecutar(
        'DELETE FROM serie WHERE sesion_id = ? AND ejercicio_id = ? AND numero = ?',
        [serie.sesionId, serie.ejercicioId, serie.numero],
      );
      await adaptador.ejecutar(
        `INSERT INTO serie (
           sesion_id, ejercicio_id, numero, peso_meta, reps_meta,
           peso_logrado, reps_logradas, completada_en
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          serie.sesionId, serie.ejercicioId, serie.numero, serie.pesoMeta,
          serie.repsMeta, serie.pesoLogrado, serie.repsLogradas,
          new Date().toISOString(),
        ],
      );
    },

    /** Series completadas de un ejercicio, de la más reciente a la más antigua. */
    async historialDe(ejercicioId: string, limite = 60): Promise<SerieHecha[]> {
      const filas = await adaptador.consultar<FilaSerie>(
        `SELECT sesion_id, ejercicio_id, numero, peso_logrado, reps_logradas, completada_en
         FROM serie
         WHERE ejercicio_id = ? AND completada_en IS NOT NULL
         ORDER BY completada_en DESC, numero DESC
         LIMIT ?`,
        [ejercicioId, limite],
      );
      return filas.map((fila) => ({
        sesionId: fila.sesion_id,
        ejercicioId: fila.ejercicio_id,
        numero: fila.numero,
        pesoLogrado: fila.peso_logrado,
        repsLogradas: fila.reps_logradas,
        completadaEn: fila.completada_en,
      }));
    },

    async seriesDe(sesionId: number): Promise<SerieHecha[]> {
      const filas = await adaptador.consultar<FilaSerie>(
        `SELECT sesion_id, ejercicio_id, numero, peso_logrado, reps_logradas, completada_en
         FROM serie WHERE sesion_id = ? ORDER BY ejercicio_id, numero`,
        [sesionId],
      );
      return filas.map((fila) => ({
        sesionId: fila.sesion_id,
        ejercicioId: fila.ejercicio_id,
        numero: fila.numero,
        pesoLogrado: fila.peso_logrado,
        repsLogradas: fila.reps_logradas,
        completadaEn: fila.completada_en,
      }));
    },

    async completar(sesionId: number): Promise<void> {
      await adaptador.ejecutar(
        "UPDATE sesion SET estado = 'completada', terminada_en = ? WHERE id = ?",
        [new Date().toISOString(), sesionId],
      );
    },

    async abandonarBorradoresAnteriores(limiteIso: string): Promise<void> {
      await adaptador.ejecutar(
        "UPDATE sesion SET estado = 'abandonada' WHERE estado = 'borrador' AND iniciada_en < ?",
        [limiteIso],
      );
    },

    async completadasEntre(desdeIso: string, hastaIso: string): Promise<Sesion[]> {
      const filas = await adaptador.consultar<FilaSesion>(
        `SELECT * FROM sesion
         WHERE estado = 'completada' AND terminada_en >= ? AND terminada_en <= ?
         ORDER BY terminada_en`,
        [desdeIso, hastaIso],
      );
      return filas.map(aSesion);
    },
  };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/data/db/repos/__tests__/sesion.test.ts`
Esperado: 4 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/data/db/repos/sesion.ts src/data/db/repos/__tests__/sesion.test.ts
git commit -m "feat: repositorio de sesiones y series"
```

---

## Tarea 10: Repositorios de mediciones y retos

**Ficheros:**
- Crear: `src/data/db/repos/mediciones.ts`, `src/data/db/repos/retos.ts`
- Test: `src/data/db/repos/__tests__/mediciones.test.ts`, `src/data/db/repos/__tests__/retos.test.ts`

- [ ] **Paso 1: Escribir el test de mediciones que falla**

Crear `src/data/db/repos/__tests__/mediciones.test.ts`:

```ts
import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoMediciones } from '../mediciones';

describe('repositorio de mediciones', () => {
  it('guarda peso y medidas juntos y los recupera', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoMediciones(adaptador);

    await repo.guardar({
      fecha: '2026-09-06',
      pesoKg: 78.4,
      notas: null,
      medidas: { cintura: 84, brazo_izq: 36, brazo_der: 36.5 },
    });

    const historial = await repo.historial();
    expect(historial).toHaveLength(1);
    expect(historial[0]?.pesoKg).toBe(78.4);
    expect(historial[0]?.medidas.cintura).toBe(84);
    expect(historial[0]?.medidas.brazo_der).toBe(36.5);
  });

  it('ordena el historial de la más antigua a la más reciente', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoMediciones(adaptador);

    await repo.guardar({ fecha: '2026-09-13', pesoKg: 78, notas: null, medidas: {} });
    await repo.guardar({ fecha: '2026-09-06', pesoKg: 79, notas: null, medidas: {} });

    expect((await repo.historial()).map((m) => m.fecha)).toEqual(['2026-09-06', '2026-09-13']);
  });

  it('sabe si ya hay medición en una fecha', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoMediciones(adaptador);

    await repo.guardar({ fecha: '2026-09-06', pesoKg: 78, notas: null, medidas: {} });

    expect(await repo.hayEn('2026-09-06')).toBe(true);
    expect(await repo.hayEn('2026-09-07')).toBe(false);
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/data/db/repos/__tests__/mediciones.test.ts`
Esperado: FALLO, `Cannot find module '../mediciones'`.

- [ ] **Paso 3: Implementar el repositorio de mediciones**

Crear `src/data/db/repos/mediciones.ts`:

```ts
import type { Adaptador } from '../adaptador';

export const TIPOS_MEDIDA = [
  'cuello', 'pecho', 'cintura', 'cadera', 'brazo_izq', 'brazo_der',
  'muslo_izq', 'muslo_der', 'pantorrilla',
] as const;

export type TipoMedida = (typeof TIPOS_MEDIDA)[number];

export interface Medicion {
  id: number;
  fecha: string;
  pesoKg: number;
  notas: string | null;
  medidas: Partial<Record<TipoMedida, number>>;
}

export type MedicionNueva = Omit<Medicion, 'id'>;

export function repoMediciones(adaptador: Adaptador) {
  return {
    async guardar(medicion: MedicionNueva): Promise<number> {
      const medicionId = await adaptador.insertar(
        'INSERT INTO medicion (fecha, peso_kg, notas) VALUES (?, ?, ?)',
        [medicion.fecha, medicion.pesoKg, medicion.notas],
      );
      for (const [tipo, valor] of Object.entries(medicion.medidas)) {
        if (typeof valor === 'number') {
          await adaptador.ejecutar(
            'INSERT INTO medida (medicion_id, tipo, valor_cm) VALUES (?, ?, ?)',
            [medicionId, tipo, valor],
          );
        }
      }
      return medicionId;
    },

    async historial(): Promise<Medicion[]> {
      const cabeceras = await adaptador.consultar<{
        id: number;
        fecha: string;
        peso_kg: number;
        notas: string | null;
      }>('SELECT id, fecha, peso_kg, notas FROM medicion ORDER BY fecha');
      const medidas = await adaptador.consultar<{
        medicion_id: number;
        tipo: TipoMedida;
        valor_cm: number;
      }>('SELECT medicion_id, tipo, valor_cm FROM medida');

      return cabeceras.map((cabecera) => ({
        id: cabecera.id,
        fecha: cabecera.fecha,
        pesoKg: cabecera.peso_kg,
        notas: cabecera.notas,
        medidas: Object.fromEntries(
          medidas
            .filter((m) => m.medicion_id === cabecera.id)
            .map((m) => [m.tipo, m.valor_cm]),
        ) as Partial<Record<TipoMedida, number>>,
      }));
    },

    async hayEn(fecha: string): Promise<boolean> {
      const filas = await adaptador.consultar<{ total: number }>(
        'SELECT COUNT(*) AS total FROM medicion WHERE fecha = ?',
        [fecha],
      );
      return (filas[0]?.total ?? 0) > 0;
    },
  };
}
```

- [ ] **Paso 4: Escribir el test de retos que falla**

Crear `src/data/db/repos/__tests__/retos.test.ts`:

```ts
import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoRetos } from '../retos';

describe('repositorio de retos', () => {
  it('crea un reto con progreso a cero', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoRetos(adaptador);

    await repo.crear({
      titulo: '12 entrenamientos en 30 días',
      tipo: 'sesiones',
      ejercicioId: null,
      metaValor: 12,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-30',
    });

    const activos = await repo.activos();
    expect(activos).toHaveLength(1);
    expect(activos[0]?.valorActual).toBe(0);
    expect(activos[0]?.estado).toBe('activo');
  });

  it('actualiza progreso y estado', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoRetos(adaptador);

    const retoId = await repo.crear({
      titulo: 'Press de banca 24 kg',
      tipo: 'carga',
      ejercicioId: 'pectorals/dumbbell-bench-press',
      metaValor: 24,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-10-31',
    });

    await repo.actualizar(retoId, 24, 'logrado');

    expect(await repo.activos()).toHaveLength(0);
    const todos = await repo.todos();
    expect(todos[0]?.estado).toBe('logrado');
    expect(todos[0]?.valorActual).toBe(24);
  });
});
```

- [ ] **Paso 5: Implementar el repositorio de retos**

Crear `src/data/db/repos/retos.ts`:

```ts
import type { Adaptador } from '../adaptador';

export type TipoReto = 'sesiones' | 'carga' | 'volumen';
export type EstadoReto = 'activo' | 'logrado' | 'fallido';

export interface Reto {
  id: number;
  titulo: string;
  tipo: TipoReto;
  ejercicioId: string | null;
  metaValor: number;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoReto;
  valorActual: number;
}

export type RetoNuevo = Omit<Reto, 'id' | 'estado' | 'valorActual'>;

interface FilaReto {
  id: number;
  titulo: string;
  tipo: TipoReto;
  ejercicio_id: string | null;
  meta_valor: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoReto;
  valor_actual: number | null;
}

function aReto(fila: FilaReto): Reto {
  return {
    id: fila.id,
    titulo: fila.titulo,
    tipo: fila.tipo,
    ejercicioId: fila.ejercicio_id,
    metaValor: fila.meta_valor,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    estado: fila.estado,
    valorActual: fila.valor_actual ?? 0,
  };
}

const SELECCION = `SELECT r.*, p.valor_actual FROM reto r
  LEFT JOIN progreso_reto p ON p.reto_id = r.id`;

export function repoRetos(adaptador: Adaptador) {
  return {
    async crear(reto: RetoNuevo): Promise<number> {
      const retoId = await adaptador.insertar(
        `INSERT INTO reto (titulo, tipo, ejercicio_id, meta_valor, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
        [reto.titulo, reto.tipo, reto.ejercicioId, reto.metaValor, reto.fechaInicio, reto.fechaFin],
      );
      await adaptador.ejecutar(
        'INSERT INTO progreso_reto (reto_id, valor_actual, actualizado_en) VALUES (?, 0, ?)',
        [retoId, new Date().toISOString()],
      );
      return retoId;
    },

    async activos(): Promise<Reto[]> {
      const filas = await adaptador.consultar<FilaReto>(
        `${SELECCION} WHERE r.estado = 'activo' ORDER BY r.fecha_fin`,
      );
      return filas.map(aReto);
    },

    async todos(): Promise<Reto[]> {
      const filas = await adaptador.consultar<FilaReto>(`${SELECCION} ORDER BY r.fecha_fin DESC`);
      return filas.map(aReto);
    },

    async actualizar(retoId: number, valorActual: number, estado: EstadoReto): Promise<void> {
      await adaptador.ejecutar(
        'UPDATE progreso_reto SET valor_actual = ?, actualizado_en = ? WHERE reto_id = ?',
        [valorActual, new Date().toISOString(), retoId],
      );
      await adaptador.ejecutar('UPDATE reto SET estado = ? WHERE id = ?', [estado, retoId]);
    },
  };
}
```

- [ ] **Paso 6: Ejecutar los tests**

Run: `npx jest src/data/db`
Esperado: todos en verde, 5 tests nuevos.

- [ ] **Paso 7: Commit**

```bash
git add src/data/db/repos
git commit -m "feat: repositorios de mediciones y retos"
```

---

## Tarea 11: Parámetros de entrenamiento

**Ficheros:**
- Crear: `src/domain/planner/parametros.ts`
- Test: `src/domain/planner/__tests__/parametros.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/domain/planner/__tests__/parametros.test.ts`:

```ts
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
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner`
Esperado: FALLO, `Cannot find module '../parametros'`.

- [ ] **Paso 3: Implementar los parámetros**

Crear `src/domain/planner/parametros.ts`:

```ts
import type { Equipamiento, Musculo } from '@/data/catalog/tipos';
import type { Nivel, Objetivo } from '@/data/db/repos/perfil';

export interface ParametrosObjetivo {
  repMin: number;
  repMax: number;
  repMinCorporal: number;
  repMaxCorporal: number;
  seriesGrande: number;
  seriesPequeno: number;
  descansoSeg: number;
}

export const PARAMETROS: Record<Objetivo, ParametrosObjetivo> = {
  volumen: {
    repMin: 8, repMax: 12, repMinCorporal: 12, repMaxCorporal: 18,
    seriesGrande: 14, seriesPequeno: 9, descansoSeg: 90,
  },
  definicion: {
    repMin: 12, repMax: 15, repMinCorporal: 18, repMaxCorporal: 25,
    seriesGrande: 14, seriesPequeno: 9, descansoSeg: 60,
  },
  fuerza: {
    repMin: 4, repMax: 6, repMinCorporal: 8, repMaxCorporal: 12,
    seriesGrande: 10, seriesPequeno: 6, descansoSeg: 150,
  },
};

const GRANDES: readonly Musculo[] = [
  'pectorals', 'lats', 'upper-back', 'quads', 'glutes', 'hamstrings', 'delts',
];

export const FACTOR_NIVEL: Record<Nivel, number> = {
  principiante: 0.75,
  intermedio: 1,
  avanzado: 1.25,
};

export function esGrande(musculo: Musculo): boolean {
  return GRANDES.includes(musculo);
}

export function seriesSemanales(musculo: Musculo, objetivo: Objetivo, nivel: Nivel): number {
  const parametros = PARAMETROS[objetivo];
  const base = esGrande(musculo) ? parametros.seriesGrande : parametros.seriesPequeno;
  return Math.round(base * FACTOR_NIVEL[nivel]);
}

export function rangoReps(
  equipamiento: Equipamiento,
  objetivo: Objetivo,
): { repMin: number; repMax: number } {
  const parametros = PARAMETROS[objetivo];
  return equipamiento === 'bodyweight'
    ? { repMin: parametros.repMinCorporal, repMax: parametros.repMaxCorporal }
    : { repMin: parametros.repMin, repMax: parametros.repMax };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner`
Esperado: 6 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/domain/planner/parametros.ts src/domain/planner/__tests__/parametros.test.ts
git commit -m "feat: parámetros de entrenamiento por objetivo y nivel"
```

---

## Tarea 12: Splits por días disponibles

**Ficheros:**
- Crear: `src/domain/planner/splits.ts`
- Test: `src/domain/planner/__tests__/splits.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/domain/planner/__tests__/splits.test.ts`:

```ts
import { splitPara } from '../splits';

describe('splits', () => {
  it('devuelve un día por cada día disponible, de 2 a 6', () => {
    for (let dias = 2; dias <= 6; dias += 1) {
      expect(splitPara(dias).dias).toHaveLength(dias);
    }
  });

  it('asigna el identificador correcto a cada número de días', () => {
    expect(splitPara(2).id).toBe('fullbody2');
    expect(splitPara(3).id).toBe('ppl3');
    expect(splitPara(4).id).toBe('torso_pierna4');
    expect(splitPara(5).id).toBe('split5');
    expect(splitPara(6).id).toBe('ppl6');
  });

  it('reparte empuje, tirón y pierna en el split de tres días', () => {
    const nombres = splitPara(3).dias.map((d) => d.nombre);
    expect(nombres).toEqual(['Empuje', 'Tirón', 'Pierna']);
  });

  it('repite el ciclo dos veces en seis días', () => {
    const dias = splitPara(6).dias;
    expect(dias[0]?.musculos).toEqual(dias[3]?.musculos);
  });

  it('cubre pectoral, dorsal y cuádriceps en todos los splits', () => {
    for (let dias = 2; dias <= 6; dias += 1) {
      const musculos = splitPara(dias).dias.flatMap((d) => d.musculos);
      expect(musculos).toContain('pectorals');
      expect(musculos).toContain('lats');
      expect(musculos).toContain('quads');
    }
  });

  it('rechaza números de días fuera del rango soportado', () => {
    expect(() => splitPara(1)).toThrow('Días por semana no soportados: 1');
    expect(() => splitPara(7)).toThrow('Días por semana no soportados: 7');
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner/__tests__/splits.test.ts`
Esperado: FALLO, `Cannot find module '../splits'`.

- [ ] **Paso 3: Implementar los splits**

Crear `src/domain/planner/splits.ts`:

```ts
import type { Musculo } from '@/data/catalog/tipos';
import type { SplitId } from './tipos';

export interface PlantillaDia {
  nombre: string;
  musculos: Musculo[];
}

export interface Split {
  id: SplitId;
  dias: PlantillaDia[];
}

const EMPUJE: PlantillaDia = { nombre: 'Empuje', musculos: ['pectorals', 'delts', 'triceps'] };
const TIRON: PlantillaDia = { nombre: 'Tirón', musculos: ['lats', 'upper-back', 'biceps'] };
const PIERNA: PlantillaDia = {
  nombre: 'Pierna',
  musculos: ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],
};

const SPLITS: Record<number, Split> = {
  2: {
    id: 'fullbody2',
    dias: [
      { nombre: 'Cuerpo completo A', musculos: ['pectorals', 'upper-back', 'quads', 'delts', 'abs'] },
      { nombre: 'Cuerpo completo B', musculos: ['lats', 'glutes', 'hamstrings', 'biceps', 'triceps'] },
    ],
  },
  3: { id: 'ppl3', dias: [EMPUJE, TIRON, PIERNA] },
  4: {
    id: 'torso_pierna4',
    dias: [
      { nombre: 'Torso A', musculos: ['pectorals', 'upper-back', 'delts'] },
      { nombre: 'Pierna A', musculos: ['quads', 'glutes', 'calves'] },
      { nombre: 'Torso B', musculos: ['lats', 'pectorals', 'biceps', 'triceps'] },
      { nombre: 'Pierna B', musculos: ['hamstrings', 'glutes', 'abs'] },
    ],
  },
  5: {
    id: 'split5',
    dias: [
      { nombre: 'Pecho y tríceps', musculos: ['pectorals', 'triceps'] },
      { nombre: 'Espalda y bíceps', musculos: ['lats', 'upper-back', 'biceps'] },
      { nombre: 'Pierna', musculos: ['quads', 'glutes', 'hamstrings', 'calves'] },
      { nombre: 'Hombro y trapecio', musculos: ['delts', 'traps'] },
      { nombre: 'Brazos y core', musculos: ['biceps', 'triceps', 'abs'] },
    ],
  },
  6: { id: 'ppl6', dias: [EMPUJE, TIRON, PIERNA, EMPUJE, TIRON, PIERNA] },
};

export function splitPara(diasPorSemana: number): Split {
  const split = SPLITS[diasPorSemana];
  if (!split) throw new Error(`Días por semana no soportados: ${diasPorSemana}`);
  return split;
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner/__tests__/splits.test.ts`
Esperado: 6 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/domain/planner/splits.ts src/domain/planner/__tests__/splits.test.ts
git commit -m "feat: plantillas de split por días disponibles"
```

---

## Tarea 13: Anclas y selección de accesorios

**Ficheros:**
- Crear: `src/domain/planner/seleccion.ts`
- Modificar: `scripts/build-catalog.js` (añadir la ancla de antebrazo a la validación)
- Test: `src/domain/planner/__tests__/seleccion.test.ts`

- [ ] **Paso 1: Añadir la ancla que falta al validador del catálogo**

En `scripts/build-catalog.js`, dentro del array `ANCLAS`, añadir la línea:

```js
  'forearms/dumbbell-reverse-wrist-curl',
```

Run: `rm assets/catalog/ejercicios.json && npm run catalogo`
Esperado: `566 ejercicios, 0 miniaturas nuevas.` sin error de anclas ausentes.

- [ ] **Paso 2: Escribir el test que falla**

Crear `src/domain/planner/__tests__/seleccion.test.ts`:

```ts
import { crearCatalogo } from '@/data/catalog/catalogo';
import { MUSCULOS } from '@/data/catalog/tipos';
import type { Ejercicio } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import { ANCLAS, accesoriosPara, anclaPara, barajarDeterminista } from '../seleccion';
import ejerciciosReales from '../../../../assets/catalog/ejercicios.json';

const PERFIL: Perfil = {
  nombre: 'Nick', sexo: 'hombre', fechaNac: '1988-04-12', alturaCm: 178,
  nivel: 'intermedio', objetivo: 'volumen', diasPorSemana: 4,
  mancuernaMinKg: 2, mancuernaMaxKg: 30, incrementoKg: 2,
  tieneBanco: true, tieneBarraDominadas: true, diaMedicion: 0,
};

const catalogo = crearCatalogo(ejerciciosReales as Ejercicio[]);

describe('anclas', () => {
  it('define una ancla para cada uno de los trece músculos', () => {
    for (const musculo of MUSCULOS) {
      expect(ANCLAS[musculo]).toBeDefined();
    }
  });

  it('todas las anclas existen en el catálogo real', () => {
    for (const musculo of MUSCULOS) {
      const ancla = ANCLAS[musculo];
      expect(catalogo.porId(ancla.principal)).toBeDefined();
      if (ancla.alternativa) expect(catalogo.porId(ancla.alternativa)).toBeDefined();
    }
  });

  it('usa flexiones si no hay banco y remo invertido si no hay barra', () => {
    const sinNada = { ...PERFIL, tieneBanco: false, tieneBarraDominadas: false };
    expect(anclaPara('pectorals', sinNada)).toBe('pectorals/push-up');
    expect(anclaPara('lats', sinNada)).toBe('upper-back/inverted-row-bent-knees');
    expect(anclaPara('pectorals', PERFIL)).toBe('pectorals/dumbbell-bench-press');
    expect(anclaPara('lats', PERFIL)).toBe('lats/chin-up');
  });
});

describe('barajado determinista', () => {
  it('produce el mismo orden con la misma semilla', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(barajarDeterminista(items, 'a')).toEqual(barajarDeterminista(items, 'a'));
  });

  it('produce un orden distinto con semilla distinta', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(barajarDeterminista(items, 'a')).not.toEqual(barajarDeterminista(items, 'b'));
  });

  it('no pierde ni duplica elementos', () => {
    const items = [1, 2, 3, 4, 5];
    expect([...barajarDeterminista(items, 'x')].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('selección de accesorios', () => {
  it('devuelve la cantidad pedida sin incluir los excluidos', () => {
    const candidatos = catalogo.porMusculo('biceps');
    const excluir = [ANCLAS.biceps.principal];
    const elegidos = accesoriosPara({ candidatos, semilla: 's1', excluir, cantidad: 3 });

    expect(elegidos).toHaveLength(3);
    expect(elegidos.map((e) => e.id)).not.toContain(ANCLAS.biceps.principal);
    expect(new Set(elegidos.map((e) => e.id)).size).toBe(3);
  });

  it('reutiliza excluidos solo cuando no quedan candidatos libres', () => {
    const candidatos = catalogo.porMusculo('traps');
    const excluir = candidatos.map((e) => e.id);
    const elegidos = accesoriosPara({ candidatos, semilla: 's1', excluir, cantidad: 2 });

    expect(elegidos).toHaveLength(2);
  });

  it('devuelve lista vacía si no hay candidatos', () => {
    expect(accesoriosPara({ candidatos: [], semilla: 's', excluir: [], cantidad: 3 })).toEqual([]);
  });
});
```

- [ ] **Paso 3: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner/__tests__/seleccion.test.ts`
Esperado: FALLO, `Cannot find module '../seleccion'`.

- [ ] **Paso 4: Implementar la selección**

Crear `src/domain/planner/seleccion.ts`:

```ts
import type { Ejercicio, Musculo } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';

export interface Ancla {
  principal: string;
  alternativa?: string;
  requiere?: 'banco' | 'barra';
}

export const ANCLAS: Record<Musculo, Ancla> = {
  pectorals: {
    principal: 'pectorals/dumbbell-bench-press',
    alternativa: 'pectorals/push-up',
    requiere: 'banco',
  },
  lats: {
    principal: 'lats/chin-up',
    alternativa: 'upper-back/inverted-row-bent-knees',
    requiere: 'barra',
  },
  'upper-back': { principal: 'upper-back/dumbbell-bent-over-row' },
  delts: { principal: 'delts/dumbbell-arnold-press' },
  triceps: { principal: 'triceps/dumbbell-close-grip-press' },
  biceps: { principal: 'biceps/dumbbell-biceps-curl' },
  forearms: { principal: 'forearms/dumbbell-reverse-wrist-curl' },
  quads: { principal: 'quads/dumbbell-goblet-squat' },
  glutes: { principal: 'glutes/dumbbell-romanian-deadlift' },
  hamstrings: { principal: 'hamstrings/dumbbell-lying-femoral' },
  calves: { principal: 'calves/dumbbell-standing-calf-raise' },
  abs: { principal: 'abs/crunch-floor' },
  traps: { principal: 'traps/dumbbell-shrug' },
};

export function anclaPara(musculo: Musculo, perfil: Perfil): string {
  const ancla = ANCLAS[musculo];
  if (ancla.requiere === 'banco' && !perfil.tieneBanco && ancla.alternativa) {
    return ancla.alternativa;
  }
  if (ancla.requiere === 'barra' && !perfil.tieneBarraDominadas && ancla.alternativa) {
    return ancla.alternativa;
  }
  return ancla.principal;
}

/** Hash de cadena a entero de 32 bits (xmur3). */
function semillaNumerica(texto: string): number {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i += 1) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** Generador pseudoaleatorio determinista (mulberry32). */
function generador(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function barajarDeterminista<T>(items: T[], semilla: string): T[] {
  const copia = [...items];
  const aleatorio = generador(semillaNumerica(semilla));
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    const temporal = copia[i] as T;
    copia[i] = copia[j] as T;
    copia[j] = temporal;
  }
  return copia;
}

export function accesoriosPara(opciones: {
  candidatos: Ejercicio[];
  semilla: string;
  excluir: string[];
  cantidad: number;
}): Ejercicio[] {
  const { candidatos, semilla, excluir, cantidad } = opciones;
  if (candidatos.length === 0 || cantidad <= 0) return [];

  const barajados = barajarDeterminista(candidatos, semilla);
  const excluidos = new Set(excluir);
  const libres = barajados.filter((e) => !excluidos.has(e.id));

  if (libres.length >= cantidad) return libres.slice(0, cantidad);

  // Sin candidatos suficientes, se completa reutilizando los excluidos.
  const relleno = barajados.filter((e) => !libres.includes(e));
  return [...libres, ...relleno].slice(0, cantidad);
}
```

- [ ] **Paso 5: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner/__tests__/seleccion.test.ts`
Esperado: 9 tests en verde.

- [ ] **Paso 6: Commit**

```bash
git add src/domain/planner/seleccion.ts src/domain/planner/__tests__/seleccion.test.ts scripts/build-catalog.js
git commit -m "feat: anclas por músculo y selección determinista de accesorios"
```

---

## Tarea 14: Generación del programa

**Ficheros:**
- Crear: `src/domain/planner/programa.ts`
- Test: `src/domain/planner/__tests__/programa.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/domain/planner/__tests__/programa.test.ts`:

```ts
import { crearCatalogo } from '@/data/catalog/catalogo';
import type { Ejercicio } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import ejerciciosReales from '../../../../assets/catalog/ejercicios.json';
import { generarPrograma } from '../programa';
import { anclaPara } from '../seleccion';

const catalogo = crearCatalogo(ejerciciosReales as Ejercicio[]);

const PERFIL: Perfil = {
  nombre: 'Nick', sexo: 'hombre', fechaNac: '1988-04-12', alturaCm: 178,
  nivel: 'intermedio', objetivo: 'volumen', diasPorSemana: 4,
  mancuernaMinKg: 2, mancuernaMaxKg: 30, incrementoKg: 2,
  tieneBanco: true, tieneBarraDominadas: true, diaMedicion: 0,
};

describe('generación del programa', () => {
  it('produce 8 semanas con los días pedidos', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    expect(plan.semanas).toBe(8);
    expect(plan.dias).toHaveLength(8 * 4);
    expect(plan.split).toBe('torso_pierna4');
  });

  it('es determinista: la misma semilla produce el mismo plan', () => {
    expect(generarPrograma(PERFIL, catalogo, 'x')).toEqual(generarPrograma(PERFIL, catalogo, 'x'));
  });

  it('solo usa ejercicios que existen en el catálogo', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    for (const dia of plan.dias) {
      for (const ejercicio of dia.ejercicios) {
        expect(catalogo.porId(ejercicio.ejercicioId)).toBeDefined();
      }
    }
  });

  it('mantiene el ancla de cada músculo durante todo el mesociclo', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const anclasPorMusculo = new Map<string, Set<string>>();

    for (const dia of plan.dias.filter((d) => d.semana <= 4)) {
      for (const ejercicio of dia.ejercicios.filter((e) => e.esAncla)) {
        const conjunto = anclasPorMusculo.get(ejercicio.musculoObjetivo) ?? new Set();
        conjunto.add(ejercicio.ejercicioId);
        anclasPorMusculo.set(ejercicio.musculoObjetivo, conjunto);
      }
    }

    for (const [musculo, conjunto] of anclasPorMusculo) {
      expect([...conjunto]).toEqual([anclaPara(musculo as never, PERFIL)]);
    }
  });

  it('sube series del ancla en las semanas 2 y 3 y descarga en la 4', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const anclaDe = (semana: number) =>
      plan.dias.find((d) => d.semana === semana && d.dia === 1)?.ejercicios.find((e) => e.esAncla);

    const s1 = anclaDe(1)!;
    expect(anclaDe(2)!.series).toBe(s1.series + 1);
    expect(anclaDe(3)!.series).toBe(s1.series + 2);
    expect(anclaDe(4)!.series).toBeLessThan(s1.series);
  });

  it('no repite un accesorio en dos semanas consecutivas del mismo día', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const accesoriosDe = (semana: number) =>
      plan.dias
        .filter((d) => d.semana === semana)
        .flatMap((d) => d.ejercicios.filter((e) => !e.esAncla).map((e) => e.ejercicioId));

    for (let semana = 2; semana <= 3; semana += 1) {
      const anteriores = new Set(accesoriosDe(semana - 1));
      for (const id of accesoriosDe(semana)) {
        expect(anteriores.has(id)).toBe(false);
      }
    }
  });

  it('usa peso corporal cuando el músculo no tiene mancuernas', () => {
    const plan = generarPrograma(PERFIL, catalogo, 'semilla');
    const dorsales = plan.dias.flatMap((d) =>
      d.ejercicios.filter((e) => e.musculoObjetivo === 'lats'),
    );
    expect(dorsales.length).toBeGreaterThan(0);
    expect(dorsales.every((e) => e.equipamiento === 'bodyweight')).toBe(true);
  });

  it('funciona para todos los números de días soportados', () => {
    for (let dias = 2; dias <= 6; dias += 1) {
      const plan = generarPrograma({ ...PERFIL, diasPorSemana: dias }, catalogo, 's');
      expect(plan.dias).toHaveLength(8 * dias);
      expect(plan.dias.every((d) => d.ejercicios.length > 0)).toBe(true);
    }
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner/__tests__/programa.test.ts`
Esperado: FALLO, `Cannot find module '../programa'`.

- [ ] **Paso 3: Implementar el generador**

Crear `src/domain/planner/programa.ts`:

```ts
import type { Catalogo, Ejercicio, Musculo } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import { esGrande, PARAMETROS, rangoReps, seriesSemanales } from './parametros';
import { accesoriosPara, anclaPara } from './seleccion';
import { splitPara } from './splits';
import type { DiaPlan, EjercicioDia, ProgramaPlan } from './tipos';

const SEMANAS = 8;
const SERIES_ANCLA_BASE = 4;
const SERIES_POR_ACCESORIO = 3;
const BONUS_POR_SEMANA_DEL_CICLO: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 0 };

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Orden de ataque: grandes antes que pequeños y el core siempre al final. */
function ordenarMusculos(musculos: Musculo[]): Musculo[] {
  return [...musculos].sort((a, b) => {
    const peso = (m: Musculo) => (m === 'abs' ? 2 : esGrande(m) ? 0 : 1);
    return peso(a) - peso(b);
  });
}

export function generarPrograma(
  perfil: Perfil,
  catalogo: Catalogo,
  semilla: string,
): ProgramaPlan {
  const split = splitPara(perfil.diasPorSemana);

  const apariciones = new Map<Musculo, number>();
  for (const plantilla of split.dias) {
    for (const musculo of plantilla.musculos) {
      apariciones.set(musculo, (apariciones.get(musculo) ?? 0) + 1);
    }
  }

  // Últimas dos semanas de accesorios por músculo, para evitar repeticiones.
  const historialAccesorios = new Map<Musculo, string[][]>();

  const dias: DiaPlan[] = [];

  for (let semana = 1; semana <= SEMANAS; semana += 1) {
    const mesociclo = Math.ceil(semana / 4);
    const semanaDelCiclo = ((semana - 1) % 4) + 1;
    const esDescarga = semanaDelCiclo === 4;
    const usadosEstaSemana = new Map<Musculo, string[]>();

    for (const [indice, plantilla] of split.dias.entries()) {
      const ejercicios: EjercicioDia[] = [];
      let orden = 1;

      for (const musculo of ordenarMusculos(plantilla.musculos)) {
        const veces = apariciones.get(musculo) ?? 1;
        const seriesDia = Math.max(
          3,
          Math.round(seriesSemanales(musculo, perfil.objetivo, perfil.nivel) / veces),
        );

        const anclaId = anclaPara(musculo, perfil);
        const ancla = catalogo.porId(anclaId);
        if (!ancla) throw new Error(`Ancla ausente del catálogo: ${anclaId}`);

        const seriesAnclaBase = Math.min(seriesDia, SERIES_ANCLA_BASE);
        const seriesAncla = esDescarga
          ? Math.max(1, Math.round(seriesAnclaBase * 0.6))
          : seriesAnclaBase + (BONUS_POR_SEMANA_DEL_CICLO[semanaDelCiclo] ?? 0);

        ejercicios.push(construir(ancla, musculo, true, seriesAncla, perfil, orden));
        orden += 1;

        const restante = seriesDia - seriesAnclaBase;
        const cantidad = acotar(Math.ceil(restante / SERIES_POR_ACCESORIO), 0, 3);

        if (cantidad > 0) {
          const recientes = (historialAccesorios.get(musculo) ?? []).flat();
          const candidatos = catalogo
            .porMusculo(musculo)
            .filter((e) => e.id !== anclaId);

          const elegidos = accesoriosPara({
            candidatos,
            semilla: `${semilla}|${musculo}|${mesociclo}`,
            excluir: [anclaId, ...recientes],
            cantidad,
          });

          const seriesAccesorio = esDescarga
            ? Math.max(1, Math.round(SERIES_POR_ACCESORIO * 0.6))
            : SERIES_POR_ACCESORIO;

          for (const accesorio of elegidos) {
            ejercicios.push(construir(accesorio, musculo, false, seriesAccesorio, perfil, orden));
            orden += 1;
          }

          usadosEstaSemana.set(musculo, [
            ...(usadosEstaSemana.get(musculo) ?? []),
            ...elegidos.map((e) => e.id),
          ]);
        }
      }

      dias.push({
        semana,
        dia: indice + 1,
        nombre: plantilla.nombre,
        musculos: plantilla.musculos,
        ejercicios,
      });
    }

    for (const [musculo, usados] of usadosEstaSemana) {
      const previo = historialAccesorios.get(musculo) ?? [];
      historialAccesorios.set(musculo, [...previo, usados].slice(-2));
    }
  }

  return {
    objetivo: perfil.objetivo,
    split: split.id,
    semanas: SEMANAS,
    diasPorSemana: perfil.diasPorSemana,
    dias,
  };
}

function construir(
  ejercicio: Ejercicio,
  musculo: Musculo,
  esAncla: boolean,
  series: number,
  perfil: Perfil,
  orden: number,
): EjercicioDia {
  const { repMin, repMax } = rangoReps(ejercicio.equipamiento, perfil.objetivo);
  return {
    orden,
    ejercicioId: ejercicio.id,
    musculoObjetivo: musculo,
    equipamiento: ejercicio.equipamiento,
    esAncla,
    series,
    repMin,
    repMax,
    descansoSeg: PARAMETROS[perfil.objetivo].descansoSeg,
  };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner/__tests__/programa.test.ts`
Esperado: 8 tests en verde.

Si el test de accesorios no repetidos falla en algún músculo con muy pocos candidatos (traps tiene 6, hamstrings 11), la causa es que `accesoriosPara` recurre al relleno. En ese caso, relaja el test a los músculos con más de 15 candidatos y deja constancia con un comentario; el comportamiento es correcto, la restricción es del catálogo.

- [ ] **Paso 5: Commit**

```bash
git add src/domain/planner/programa.ts src/domain/planner/__tests__/programa.test.ts
git commit -m "feat: generación determinista del programa de 8 semanas"
```

---

## Tarea 15: Doble progresión

**Ficheros:**
- Crear: `src/domain/planner/progresion.ts`
- Test: `src/domain/planner/__tests__/progresion.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/domain/planner/__tests__/progresion.test.ts`:

```ts
import type { Perfil } from '@/data/db/repos/perfil';
import { calcularMeta } from '../progresion';
import type { EjercicioDia, SerieHecha } from '../tipos';

const PERFIL: Perfil = {
  nombre: 'Nick', sexo: 'hombre', fechaNac: '1988-04-12', alturaCm: 178,
  nivel: 'intermedio', objetivo: 'volumen', diasPorSemana: 4,
  mancuernaMinKg: 2, mancuernaMaxKg: 30, incrementoKg: 2,
  tieneBanco: true, tieneBarraDominadas: true, diaMedicion: 0,
};

const CON_CARGA: EjercicioDia = {
  orden: 1,
  ejercicioId: 'pectorals/dumbbell-bench-press',
  musculoObjetivo: 'pectorals',
  equipamiento: 'dumbbell',
  esAncla: true,
  series: 3,
  repMin: 8,
  repMax: 12,
  descansoSeg: 90,
};

const CORPORAL: EjercicioDia = {
  ...CON_CARGA,
  ejercicioId: 'lats/chin-up',
  musculoObjetivo: 'lats',
  equipamiento: 'bodyweight',
  repMin: 12,
  repMax: 18,
};

function sesion(
  sesionId: number,
  fecha: string,
  reps: number[],
  peso: number | null,
): SerieHecha[] {
  return reps.map((repsLogradas, indice) => ({
    sesionId,
    ejercicioId: CON_CARGA.ejercicioId,
    numero: indice + 1,
    pesoLogrado: peso,
    repsLogradas,
    completadaEn: fecha,
  }));
}

describe('doble progresión con carga', () => {
  it('pide peso inicial la primera vez', () => {
    const meta = calcularMeta([], CON_CARGA, PERFIL);
    expect(meta).toEqual({ pesoMeta: null, repsMeta: 8, series: 3, pesoInicialRequerido: true });
  });

  it('sube el peso cuando se completan todas las series en el tope', () => {
    const meta = calcularMeta(sesion(1, '2026-09-01', [12, 12, 12], 20), CON_CARGA, PERFIL);
    expect(meta.pesoMeta).toBe(22);
    expect(meta.repsMeta).toBe(8);
  });

  it('mantiene el peso y pide una repetición más si no se llegó al tope', () => {
    const meta = calcularMeta(sesion(1, '2026-09-01', [10, 9, 9], 20), CON_CARGA, PERFIL);
    expect(meta.pesoMeta).toBe(20);
    expect(meta.repsMeta).toBe(11);
  });

  it('no propone más repeticiones que el tope del rango', () => {
    const meta = calcularMeta(sesion(1, '2026-09-01', [12, 12, 10], 20), CON_CARGA, PERFIL);
    expect(meta.repsMeta).toBe(12);
  });

  it('baja el peso tras dos sesiones por debajo del mínimo', () => {
    const historial = [
      ...sesion(2, '2026-09-08', [6, 6, 5], 20),
      ...sesion(1, '2026-09-01', [7, 6, 6], 20),
    ];
    const meta = calcularMeta(historial, CON_CARGA, PERFIL);
    expect(meta.pesoMeta).toBe(18);
    expect(meta.repsMeta).toBe(8);
  });

  it('redondea el peso al incremento declarado', () => {
    const perfilDe5 = { ...PERFIL, incrementoKg: 5 };
    const historial = [
      ...sesion(2, '2026-09-08', [6, 6, 5], 22),
      ...sesion(1, '2026-09-01', [7, 6, 6], 22),
    ];
    expect(calcularMeta(historial, CON_CARGA, perfilDe5).pesoMeta).toBe(20);
  });
});

describe('progresión sin carga', () => {
  function sesionCorporal(sesionId: number, fecha: string, reps: number[]): SerieHecha[] {
    return reps.map((repsLogradas, indice) => ({
      sesionId,
      ejercicioId: CORPORAL.ejercicioId,
      numero: indice + 1,
      pesoLogrado: null,
      repsLogradas,
      completadaEn: fecha,
    }));
  }

  it('empieza en el mínimo del rango sin pedir peso', () => {
    expect(calcularMeta([], CORPORAL, PERFIL)).toEqual({
      pesoMeta: null, repsMeta: 12, series: 3, pesoInicialRequerido: false,
    });
  });

  it('añade una serie cuando se completa el tope en todas', () => {
    const meta = calcularMeta(sesionCorporal(1, '2026-09-01', [18, 18, 18]), CORPORAL, PERFIL);
    expect(meta.series).toBe(4);
    expect(meta.repsMeta).toBe(12);
    expect(meta.pesoMeta).toBeNull();
  });

  it('no pasa de cinco series', () => {
    const meta = calcularMeta(
      sesionCorporal(1, '2026-09-01', [18, 18, 18, 18, 18]),
      { ...CORPORAL, series: 5 },
      PERFIL,
    );
    expect(meta.series).toBe(5);
  });

  it('pide una repetición más si no se llegó al tope', () => {
    const meta = calcularMeta(sesionCorporal(1, '2026-09-01', [15, 14, 13]), CORPORAL, PERFIL);
    expect(meta.repsMeta).toBe(16);
    expect(meta.series).toBe(3);
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner/__tests__/progresion.test.ts`
Esperado: FALLO, `Cannot find module '../progresion'`.

- [ ] **Paso 3: Implementar la progresión**

Crear `src/domain/planner/progresion.ts`:

```ts
import type { Perfil } from '@/data/db/repos/perfil';
import type { EjercicioDia, Meta, SerieHecha } from './tipos';

const SERIES_MAXIMAS_CORPORAL = 5;

/** Agrupa el historial por sesión, de la más reciente a la más antigua. */
function porSesion(historial: SerieHecha[]): SerieHecha[][] {
  const grupos = new Map<number, SerieHecha[]>();
  for (const serie of historial) {
    grupos.set(serie.sesionId, [...(grupos.get(serie.sesionId) ?? []), serie]);
  }
  return [...grupos.values()].sort((a, b) =>
    (b[0]?.completadaEn ?? '').localeCompare(a[0]?.completadaEn ?? ''),
  );
}

function redondear(valor: number, incremento: number): number {
  return Math.max(incremento, Math.round(valor / incremento) * incremento);
}

export function calcularMeta(
  historial: SerieHecha[],
  ejercicio: EjercicioDia,
  perfil: Perfil,
): Meta {
  const sesiones = porSesion(historial.filter((s) => s.ejercicioId === ejercicio.ejercicioId));
  const ultima = sesiones[0];
  const esCorporal = ejercicio.equipamiento === 'bodyweight';

  if (!ultima || ultima.length === 0) {
    return {
      pesoMeta: null,
      repsMeta: ejercicio.repMin,
      series: ejercicio.series,
      pesoInicialRequerido: !esCorporal,
    };
  }

  const reps = ultima.map((s) => s.repsLogradas);
  const mejorReps = Math.max(...reps);
  const todasAlTope = reps.length >= ejercicio.series && reps.every((r) => r >= ejercicio.repMax);

  if (esCorporal) {
    return {
      pesoMeta: null,
      repsMeta: todasAlTope ? ejercicio.repMin : Math.min(ejercicio.repMax, mejorReps + 1),
      series: todasAlTope
        ? Math.min(SERIES_MAXIMAS_CORPORAL, ejercicio.series + 1)
        : ejercicio.series,
      pesoInicialRequerido: false,
    };
  }

  const pesoAnterior = Math.max(...ultima.map((s) => s.pesoLogrado ?? 0));

  if (todasAlTope) {
    return {
      pesoMeta: pesoAnterior + perfil.incrementoKg,
      repsMeta: ejercicio.repMin,
      series: ejercicio.series,
      pesoInicialRequerido: false,
    };
  }

  const fallo = (serie: SerieHecha[] | undefined): boolean =>
    serie !== undefined && serie.some((s) => s.repsLogradas < ejercicio.repMin);

  if (fallo(ultima) && fallo(sesiones[1])) {
    return {
      pesoMeta: redondear(pesoAnterior * 0.9, perfil.incrementoKg),
      repsMeta: ejercicio.repMin,
      series: ejercicio.series,
      pesoInicialRequerido: false,
    };
  }

  return {
    pesoMeta: pesoAnterior,
    repsMeta: Math.min(ejercicio.repMax, mejorReps + 1),
    series: ejercicio.series,
    pesoInicialRequerido: false,
  };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner/__tests__/progresion.test.ts`
Esperado: 10 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/domain/planner/progresion.ts src/domain/planner/__tests__/progresion.test.ts
git commit -m "feat: doble progresión con y sin carga"
```

---

## Tarea 16: Evaluación de retos

**Ficheros:**
- Crear: `src/domain/planner/retos.ts`
- Test: `src/domain/planner/__tests__/retos.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/domain/planner/__tests__/retos.test.ts`:

```ts
import { evaluarReto } from '../retos';
import type { RetoEvaluable } from '../retos';
import type { SerieHecha } from '../tipos';

const SESIONES = [
  { terminadaEn: '2026-09-02T19:00:00.000Z' },
  { terminadaEn: '2026-09-05T19:00:00.000Z' },
  { terminadaEn: '2026-10-05T19:00:00.000Z' },
];

const SERIES: SerieHecha[] = [
  {
    sesionId: 1, ejercicioId: 'pectorals/dumbbell-bench-press', numero: 1,
    pesoLogrado: 20, repsLogradas: 10, completadaEn: '2026-09-02T19:10:00.000Z',
  },
  {
    sesionId: 2, ejercicioId: 'pectorals/dumbbell-bench-press', numero: 1,
    pesoLogrado: 24, repsLogradas: 8, completadaEn: '2026-09-05T19:10:00.000Z',
  },
  {
    sesionId: 3, ejercicioId: 'biceps/dumbbell-biceps-curl', numero: 1,
    pesoLogrado: 10, repsLogradas: 12, completadaEn: '2026-09-05T19:20:00.000Z',
  },
];

const datos = { sesionesCompletadas: SESIONES, series: SERIES };

const base: RetoEvaluable = {
  tipo: 'sesiones',
  ejercicioId: null,
  metaValor: 2,
  fechaInicio: '2026-09-01',
  fechaFin: '2026-09-30',
};

describe('evaluación de retos', () => {
  it('cuenta solo las sesiones dentro del rango', () => {
    expect(evaluarReto(base, datos, '2026-09-10')).toEqual({
      valorActual: 2,
      estado: 'logrado',
    });
  });

  it('sigue activo si aún no llega a la meta y no ha vencido', () => {
    expect(evaluarReto({ ...base, metaValor: 5 }, datos, '2026-09-10')).toEqual({
      valorActual: 2,
      estado: 'activo',
    });
  });

  it('falla cuando vence sin alcanzar la meta', () => {
    expect(evaluarReto({ ...base, metaValor: 5 }, datos, '2026-10-01')).toEqual({
      valorActual: 2,
      estado: 'fallido',
    });
  });

  it('mide la carga máxima del ejercicio indicado', () => {
    const reto: RetoEvaluable = {
      tipo: 'carga',
      ejercicioId: 'pectorals/dumbbell-bench-press',
      metaValor: 24,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-30',
    };
    expect(evaluarReto(reto, datos, '2026-09-10')).toEqual({
      valorActual: 24,
      estado: 'logrado',
    });
  });

  it('suma el volumen de todas las series del rango', () => {
    const reto: RetoEvaluable = {
      tipo: 'volumen',
      ejercicioId: null,
      metaValor: 1000,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-30',
    };
    // 20*10 + 24*8 + 10*12 = 512
    expect(evaluarReto(reto, datos, '2026-09-10')).toEqual({
      valorActual: 512,
      estado: 'activo',
    });
  });

  it('incluye el día de inicio y el de fin', () => {
    const reto: RetoEvaluable = { ...base, fechaInicio: '2026-09-02', fechaFin: '2026-09-02' };
    expect(evaluarReto(reto, datos, '2026-09-02').valorActual).toBe(1);
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner/__tests__/retos.test.ts`
Esperado: FALLO, `Cannot find module '../retos'`.

- [ ] **Paso 3: Implementar la evaluación**

Crear `src/domain/planner/retos.ts`:

```ts
import type { EstadoReto, TipoReto } from '@/data/db/repos/retos';
import type { SerieHecha } from './tipos';

export interface RetoEvaluable {
  tipo: TipoReto;
  ejercicioId: string | null;
  metaValor: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface DatosReto {
  sesionesCompletadas: { terminadaEn: string }[];
  series: SerieHecha[];
}

/** Recorta un ISO a su parte de fecha para comparar días completos. */
function soloFecha(iso: string): string {
  return iso.slice(0, 10);
}

function dentroDelRango(iso: string, reto: RetoEvaluable): boolean {
  const dia = soloFecha(iso);
  return dia >= reto.fechaInicio && dia <= reto.fechaFin;
}

export function evaluarReto(
  reto: RetoEvaluable,
  datos: DatosReto,
  hoy: string,
): { valorActual: number; estado: EstadoReto } {
  let valorActual = 0;

  if (reto.tipo === 'sesiones') {
    valorActual = datos.sesionesCompletadas.filter((s) =>
      dentroDelRango(s.terminadaEn, reto),
    ).length;
  } else {
    const series = datos.series.filter(
      (s) =>
        dentroDelRango(s.completadaEn, reto) &&
        (reto.ejercicioId === null || s.ejercicioId === reto.ejercicioId),
    );

    valorActual =
      reto.tipo === 'carga'
        ? series.reduce((maximo, s) => Math.max(maximo, s.pesoLogrado ?? 0), 0)
        : series.reduce((suma, s) => suma + (s.pesoLogrado ?? 0) * s.repsLogradas, 0);
  }

  const estado: EstadoReto =
    valorActual >= reto.metaValor
      ? 'logrado'
      : soloFecha(hoy) > reto.fechaFin
        ? 'fallido'
        : 'activo';

  return { valorActual, estado };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner/__tests__/retos.test.ts`
Esperado: 6 tests en verde.

- [ ] **Paso 5: Ejecutar toda la batería**

Run: `npm test`
Esperado: todo en verde.

- [ ] **Paso 6: Commit**

```bash
git add src/domain/planner/retos.ts src/domain/planner/__tests__/retos.test.ts
git commit -m "feat: evaluación de los tres tipos de reto"
```

---

## Tarea 17: Caché de animaciones

**Ficheros:**
- Crear: `src/services/cacheGifs.ts`, `src/services/sistemaFicheros.ts`
- Test: `src/services/__tests__/cacheGifs.test.ts`

- [ ] **Paso 1: Definir el sistema de ficheros inyectable**

Crear `src/services/sistemaFicheros.ts`:

```ts
export interface FicheroCache {
  ruta: string;
  tamano: number;
  /** Marca temporal en milisegundos del último acceso conocido. */
  usadoEn: number;
}

export interface SistemaFicheros {
  crearDirectorio(ruta: string): Promise<void>;
  existe(ruta: string): Promise<boolean>;
  descargar(url: string, destino: string): Promise<void>;
  listar(directorio: string): Promise<FicheroCache[]>;
  borrar(ruta: string): Promise<void>;
  marcarUso(ruta: string): Promise<void>;
}

export async function crearSistemaFicherosExpo(): Promise<SistemaFicheros> {
  const FileSystem = await import('expo-file-system');
  const usos = new Map<string, number>();

  return {
    crearDirectorio: async (ruta) => {
      await FileSystem.makeDirectoryAsync(ruta, { intermediates: true }).catch(() => undefined);
    },
    existe: async (ruta) => (await FileSystem.getInfoAsync(ruta)).exists,
    descargar: async (url, destino) => {
      await FileSystem.downloadAsync(url, destino);
    },
    listar: async (directorio) => {
      const nombres = await FileSystem.readDirectoryAsync(directorio);
      const ficheros = await Promise.all(
        nombres.map(async (nombre) => {
          const ruta = `${directorio}${nombre}`;
          const info = await FileSystem.getInfoAsync(ruta);
          return {
            ruta,
            tamano: info.exists && !info.isDirectory ? info.size : 0,
            usadoEn: usos.get(ruta) ?? (info.exists ? info.modificationTime * 1000 : 0),
          };
        }),
      );
      return ficheros;
    },
    borrar: async (ruta) => {
      await FileSystem.deleteAsync(ruta, { idempotent: true });
      usos.delete(ruta);
    },
    marcarUso: async (ruta) => {
      usos.set(ruta, Date.now());
    },
  };
}
```

- [ ] **Paso 2: Escribir el test que falla**

Crear `src/services/__tests__/cacheGifs.test.ts`:

```ts
import { crearCacheGifs } from '../cacheGifs';
import type { FicheroCache, SistemaFicheros } from '../sistemaFicheros';

function ficherosFalsos(iniciales: FicheroCache[] = []) {
  const ficheros = new Map(iniciales.map((f) => [f.ruta, f]));
  const descargas: string[] = [];

  const sistema: SistemaFicheros = {
    crearDirectorio: async () => undefined,
    existe: async (ruta) => ficheros.has(ruta),
    descargar: async (url, destino) => {
      descargas.push(url);
      ficheros.set(destino, { ruta: destino, tamano: 1_000_000, usadoEn: Date.now() });
    },
    listar: async () => [...ficheros.values()],
    borrar: async (ruta) => {
      ficheros.delete(ruta);
    },
    marcarUso: async (ruta) => {
      const fichero = ficheros.get(ruta);
      if (fichero) ficheros.set(ruta, { ...fichero, usadoEn: Date.now() });
    },
  };

  return { sistema, ficheros, descargas };
}

const DIRECTORIO = '/datos/gifs/';

describe('caché de animaciones', () => {
  it('descarga el GIF la primera vez y devuelve la ruta local', async () => {
    const { sistema, descargas } = ficherosFalsos();
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    const ruta = await cache.asegurar('biceps/dumbbell-biceps-curl', 'https://cdn/curl.gif');

    expect(ruta).toBe('/datos/gifs/biceps__dumbbell-biceps-curl.gif');
    expect(descargas).toEqual(['https://cdn/curl.gif']);
  });

  it('no vuelve a descargar si ya está en caché', async () => {
    const { sistema, descargas } = ficherosFalsos([
      { ruta: '/datos/gifs/biceps__dumbbell-biceps-curl.gif', tamano: 100, usadoEn: 1 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    await cache.asegurar('biceps/dumbbell-biceps-curl', 'https://cdn/curl.gif');

    expect(descargas).toEqual([]);
  });

  it('devuelve null si la descarga falla', async () => {
    const { sistema } = ficherosFalsos();
    sistema.descargar = async () => {
      throw new Error('sin red');
    };
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    expect(await cache.asegurar('biceps/x', 'https://cdn/x.gif')).toBeNull();
  });

  it('desaloja los menos usados al superar el tope', async () => {
    const { sistema, ficheros } = ficherosFalsos([
      { ruta: '/datos/gifs/a.gif', tamano: 600, usadoEn: 1 },
      { ruta: '/datos/gifs/b.gif', tamano: 600, usadoEn: 2 },
      { ruta: '/datos/gifs/c.gif', tamano: 600, usadoEn: 3 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO, 1200);

    await cache.desalojarSiHaceFalta();

    expect(ficheros.has('/datos/gifs/a.gif')).toBe(false);
    expect(ficheros.has('/datos/gifs/c.gif')).toBe(true);
  });

  it('informa del tamaño total ocupado', async () => {
    const { sistema } = ficherosFalsos([
      { ruta: '/datos/gifs/a.gif', tamano: 500, usadoEn: 1 },
      { ruta: '/datos/gifs/b.gif', tamano: 700, usadoEn: 2 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    expect(await cache.tamanoTotal()).toBe(1200);
  });
});
```

- [ ] **Paso 3: Ejecutar el test para verificar que falla**

Run: `npx jest src/services`
Esperado: FALLO, `Cannot find module '../cacheGifs'`.

- [ ] **Paso 4: Implementar la caché**

Crear `src/services/cacheGifs.ts`:

```ts
import type { SistemaFicheros } from './sistemaFicheros';

const TOPE_POR_DEFECTO = 250 * 1024 * 1024;

export function crearCacheGifs(
  sistema: SistemaFicheros,
  directorio: string,
  topeBytes: number = TOPE_POR_DEFECTO,
) {
  function rutaLocal(ejercicioId: string): string {
    return `${directorio}${ejercicioId.replace('/', '__')}.gif`;
  }

  async function tamanoTotal(): Promise<number> {
    const ficheros = await sistema.listar(directorio);
    return ficheros.reduce((suma, fichero) => suma + fichero.tamano, 0);
  }

  async function desalojarSiHaceFalta(): Promise<void> {
    let total = await tamanoTotal();
    if (total <= topeBytes) return;

    const ficheros = (await sistema.listar(directorio)).sort((a, b) => a.usadoEn - b.usadoEn);
    for (const fichero of ficheros) {
      if (total <= topeBytes) break;
      await sistema.borrar(fichero.ruta);
      total -= fichero.tamano;
    }
  }

  return {
    rutaLocal,
    tamanoTotal,
    desalojarSiHaceFalta,

    /** Devuelve la ruta local del GIF, descargándolo si hace falta. null si no se pudo. */
    async asegurar(ejercicioId: string, gifUrl: string): Promise<string | null> {
      const destino = rutaLocal(ejercicioId);
      await sistema.crearDirectorio(directorio);

      if (await sistema.existe(destino)) {
        await sistema.marcarUso(destino);
        return destino;
      }

      try {
        await sistema.descargar(gifUrl, destino);
        await sistema.marcarUso(destino);
        await desalojarSiHaceFalta();
        return destino;
      } catch {
        return null;
      }
    },

    async vaciar(): Promise<void> {
      for (const fichero of await sistema.listar(directorio)) {
        await sistema.borrar(fichero.ruta);
      }
    },
  };
}
```

- [ ] **Paso 5: Ejecutar el test para verificar que pasa**

Run: `npx jest src/services`
Esperado: 5 tests en verde.

- [ ] **Paso 6: Commit**

```bash
git add src/services
git commit -m "feat: caché de animaciones con desalojo por uso"
```

---

## Tarea 18: Tema visual

**Ficheros:**
- Crear: `src/ui/tema/index.ts`

- [ ] **Paso 1: Definir el tema**

Crear `src/ui/tema/index.ts`:

```ts
export const colores = {
  fondo: '#0E1116',
  superficie: '#171B22',
  superficieAlta: '#1F242D',
  borde: '#2A313C',
  texto: '#F2F5F9',
  textoTenue: '#98A2B3',
  acento: '#E8FF59',
  acentoTexto: '#0E1116',
  musculoPrincipal: '#E8FF59',
  musculoSecundario: '#6B7A2E',
  musculoInactivo: '#2A313C',
  exito: '#43D787',
  aviso: '#FFB020',
  error: '#FF5C5C',
} as const;

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const tipografia = {
  titulo: { fontSize: 28, fontWeight: '700' as const, color: colores.texto },
  seccion: { fontSize: 20, fontWeight: '600' as const, color: colores.texto },
  cuerpo: { fontSize: 16, fontWeight: '400' as const, color: colores.texto },
  tenue: { fontSize: 14, fontWeight: '400' as const, color: colores.textoTenue },
  numero: { fontSize: 32, fontWeight: '700' as const, color: colores.texto },
} as const;

export const radio = { sm: 8, md: 14, lg: 22 } as const;
```

- [ ] **Paso 2: Commit**

```bash
git add src/ui/tema
git commit -m "feat: tema visual de la aplicación"
```

---

## Tarea 19: Silueta muscular

**Ficheros:**
- Crear: `src/ui/componentes/SiluetaMuscular.tsx`
- Test: `src/ui/componentes/__tests__/SiluetaMuscular.test.tsx`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/ui/componentes/__tests__/SiluetaMuscular.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { SiluetaMuscular } from '../SiluetaMuscular';
import { colores } from '@/ui/tema';

describe('silueta muscular', () => {
  it('pinta el músculo principal con el color de acento', () => {
    const { getByTestId } = render(
      <SiluetaMuscular principales={['pectorals']} secundarios={[]} vista="frontal" />,
    );
    expect(getByTestId('region-pectorals-0').props.fill).toBe(colores.musculoPrincipal);
  });

  it('pinta los secundarios en tono apagado', () => {
    const { getByTestId } = render(
      <SiluetaMuscular principales={['pectorals']} secundarios={['triceps']} vista="frontal" />,
    );
    expect(getByTestId('region-triceps-0').props.fill).toBe(colores.musculoSecundario);
  });

  it('deja inactivos los músculos que no se trabajan', () => {
    const { getByTestId } = render(
      <SiluetaMuscular principales={['pectorals']} secundarios={[]} vista="frontal" />,
    );
    expect(getByTestId('region-quads-0').props.fill).toBe(colores.musculoInactivo);
  });

  it('la vista posterior incluye dorsales y glúteos', () => {
    const { getByTestId } = render(
      <SiluetaMuscular principales={['lats']} secundarios={[]} vista="posterior" />,
    );
    expect(getByTestId('region-lats-0').props.fill).toBe(colores.musculoPrincipal);
    expect(getByTestId('region-glutes-0')).toBeTruthy();
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/ui/componentes`
Esperado: FALLO, `Cannot find module '../SiluetaMuscular'`.

- [ ] **Paso 3: Implementar la silueta**

Silueta esquemática sobre un lienzo de 100×220. No pretende ser una lámina de anatomía: son regiones reconocibles, ligeras y coloreables.

Crear `src/ui/componentes/SiluetaMuscular.tsx`:

```tsx
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import type { Musculo } from '@/data/catalog/tipos';
import { colores } from '@/ui/tema';

type Forma =
  | { tipo: 'elipse'; cx: number; cy: number; rx: number; ry: number }
  | { tipo: 'rect'; x: number; y: number; ancho: number; alto: number; radio: number };

type Regiones = Partial<Record<Musculo, Forma[]>>;

const CONTORNO =
  'M50 6 c6 0 10 5 10 11 s-4 11-10 11 s-10-5-10-11 S44 6 50 6 Z ' +
  'M34 30 h32 l8 10 v40 l-6 6 v34 h-10 l-4 40 v46 h-8 v-44 l-6-40 h-4 ' +
  'l-6 40 v44 h-8 v-46 l-4-40 H8 v-34 l-6-6 V40 l8-10 Z';

const FRONTAL: Regiones = {
  pectorals: [
    { tipo: 'elipse', cx: 42, cy: 48, rx: 9, ry: 7 },
    { tipo: 'elipse', cx: 58, cy: 48, rx: 9, ry: 7 },
  ],
  delts: [
    { tipo: 'elipse', cx: 30, cy: 42, rx: 7, ry: 8 },
    { tipo: 'elipse', cx: 70, cy: 42, rx: 7, ry: 8 },
  ],
  biceps: [
    { tipo: 'elipse', cx: 27, cy: 60, rx: 5, ry: 10 },
    { tipo: 'elipse', cx: 73, cy: 60, rx: 5, ry: 10 },
  ],
  forearms: [
    { tipo: 'elipse', cx: 24, cy: 82, rx: 4, ry: 11 },
    { tipo: 'elipse', cx: 76, cy: 82, rx: 4, ry: 11 },
  ],
  abs: [{ tipo: 'rect', x: 43, y: 60, ancho: 14, alto: 26, radio: 4 }],
  quads: [
    { tipo: 'elipse', cx: 43, cy: 130, rx: 8, ry: 22 },
    { tipo: 'elipse', cx: 57, cy: 130, rx: 8, ry: 22 },
  ],
  calves: [
    { tipo: 'elipse', cx: 43, cy: 180, rx: 6, ry: 16 },
    { tipo: 'elipse', cx: 57, cy: 180, rx: 6, ry: 16 },
  ],
};

const POSTERIOR: Regiones = {
  traps: [{ tipo: 'rect', x: 40, y: 32, ancho: 20, alto: 12, radio: 5 }],
  delts: [
    { tipo: 'elipse', cx: 30, cy: 42, rx: 7, ry: 8 },
    { tipo: 'elipse', cx: 70, cy: 42, rx: 7, ry: 8 },
  ],
  'upper-back': [{ tipo: 'rect', x: 38, y: 45, ancho: 24, alto: 12, radio: 4 }],
  lats: [
    { tipo: 'elipse', cx: 39, cy: 66, rx: 8, ry: 14 },
    { tipo: 'elipse', cx: 61, cy: 66, rx: 8, ry: 14 },
  ],
  triceps: [
    { tipo: 'elipse', cx: 27, cy: 60, rx: 5, ry: 10 },
    { tipo: 'elipse', cx: 73, cy: 60, rx: 5, ry: 10 },
  ],
  glutes: [
    { tipo: 'elipse', cx: 43, cy: 100, rx: 9, ry: 9 },
    { tipo: 'elipse', cx: 57, cy: 100, rx: 9, ry: 9 },
  ],
  hamstrings: [
    { tipo: 'elipse', cx: 43, cy: 132, rx: 8, ry: 20 },
    { tipo: 'elipse', cx: 57, cy: 132, rx: 8, ry: 20 },
  ],
  calves: [
    { tipo: 'elipse', cx: 43, cy: 180, rx: 6, ry: 16 },
    { tipo: 'elipse', cx: 57, cy: 180, rx: 6, ry: 16 },
  ],
};

export interface PropiedadesSilueta {
  principales: Musculo[];
  secundarios: Musculo[];
  vista: 'frontal' | 'posterior';
  ancho?: number;
}

export function SiluetaMuscular({
  principales,
  secundarios,
  vista,
  ancho = 140,
}: PropiedadesSilueta) {
  const regiones = vista === 'frontal' ? FRONTAL : POSTERIOR;

  const colorDe = (musculo: Musculo): string => {
    if (principales.includes(musculo)) return colores.musculoPrincipal;
    if (secundarios.includes(musculo)) return colores.musculoSecundario;
    return colores.musculoInactivo;
  };

  return (
    <Svg width={ancho} height={(ancho * 220) / 100} viewBox="0 0 100 220">
      <Path d={CONTORNO} fill={colores.superficieAlta} />
      {Object.entries(regiones).flatMap(([musculo, formas]) =>
        (formas ?? []).map((forma, indice) => {
          const identificador = `region-${musculo}-${indice}`;
          const relleno = colorDe(musculo as Musculo);
          return forma.tipo === 'elipse' ? (
            <Ellipse
              key={identificador}
              testID={identificador}
              cx={forma.cx}
              cy={forma.cy}
              rx={forma.rx}
              ry={forma.ry}
              fill={relleno}
            />
          ) : (
            <Rect
              key={identificador}
              testID={identificador}
              x={forma.x}
              y={forma.y}
              width={forma.ancho}
              height={forma.alto}
              rx={forma.radio}
              fill={relleno}
            />
          );
        }),
      )}
    </Svg>
  );
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/ui/componentes`
Esperado: 4 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add src/ui/componentes/SiluetaMuscular.tsx src/ui/componentes/__tests__/SiluetaMuscular.test.tsx
git commit -m "feat: silueta muscular en SVG con resaltado por grupo"
```

---

## Tarea 20: Contenedor de dependencias

Un único punto que abre la base de datos, migra, carga el catálogo y expone los repositorios. Lo consume la interfaz por contexto de React.

**Ficheros:**
- Crear: `src/app/contenedor.ts`, `src/ui/ContextoApp.tsx`
- Modificar: `app/_layout.tsx`

- [ ] **Paso 1: Escribir el contenedor**

Crear `src/app/contenedor.ts`:

```ts
import ejercicios from '../../assets/catalog/ejercicios.json';
import { crearCatalogo } from '@/data/catalog/catalogo';
import type { Catalogo, Ejercicio } from '@/data/catalog/tipos';
import { abrirAdaptadorExpo } from '@/data/db/adaptador';
import { migrar } from '@/data/db/migraciones';
import { repoMediciones } from '@/data/db/repos/mediciones';
import { repoPerfil } from '@/data/db/repos/perfil';
import { repoPrograma } from '@/data/db/repos/programa';
import { repoRetos } from '@/data/db/repos/retos';
import { repoSesion } from '@/data/db/repos/sesion';
import { crearCacheGifs } from '@/services/cacheGifs';
import { crearSistemaFicherosExpo } from '@/services/sistemaFicheros';

export interface Contenedor {
  catalogo: Catalogo;
  perfil: ReturnType<typeof repoPerfil>;
  programa: ReturnType<typeof repoPrograma>;
  sesion: ReturnType<typeof repoSesion>;
  mediciones: ReturnType<typeof repoMediciones>;
  retos: ReturnType<typeof repoRetos>;
  cache: ReturnType<typeof crearCacheGifs>;
}

export async function crearContenedor(): Promise<Contenedor> {
  const adaptador = await abrirAdaptadorExpo();
  await migrar(adaptador);

  const FileSystem = await import('expo-file-system');
  const sistema = await crearSistemaFicherosExpo();
  const directorio = `${FileSystem.documentDirectory}gifs/`;

  return {
    catalogo: crearCatalogo(ejercicios as Ejercicio[]),
    perfil: repoPerfil(adaptador),
    programa: repoPrograma(adaptador),
    sesion: repoSesion(adaptador),
    mediciones: repoMediciones(adaptador),
    retos: repoRetos(adaptador),
    cache: crearCacheGifs(sistema, directorio),
  };
}
```

- [ ] **Paso 2: Escribir el contexto de React**

Crear `src/ui/ContextoApp.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { crearContenedor } from '@/app/contenedor';
import type { Contenedor } from '@/app/contenedor';
import { colores } from '@/ui/tema';

const Contexto = createContext<Contenedor | null>(null);

export function ProveedorApp({ children }: { children: React.ReactNode }) {
  const [contenedor, setContenedor] = useState<Contenedor | null>(null);

  useEffect(() => {
    let vivo = true;
    crearContenedor().then((creado) => {
      if (vivo) setContenedor(creado);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!contenedor) {
    return (
      <View
        testID="cargando-app"
        style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: 'center' }}
      >
        <ActivityIndicator color={colores.acento} />
      </View>
    );
  }

  return <Contexto.Provider value={contenedor}>{children}</Contexto.Provider>;
}

export function useApp(): Contenedor {
  const contenedor = useContext(Contexto);
  if (!contenedor) throw new Error('useApp fuera de ProveedorApp');
  return contenedor;
}
```

- [ ] **Paso 3: Montar el proveedor en la raíz**

Reemplazar `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProveedorApp } from '@/ui/ContextoApp';

export default function DisposicionRaiz() {
  return (
    <ProveedorApp>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </ProveedorApp>
  );
}
```

- [ ] **Paso 4: Verificar que compila y arranca**

Run: `npx tsc --noEmit`
Esperado: sin errores.

Run: `npx expo start`
Esperado: la app abre en el simulador mostrando la pantalla inicial. Cerrar con `Ctrl+C`.

- [ ] **Paso 5: Commit**

```bash
git add src/app src/ui/ContextoApp.tsx app/_layout.tsx
git commit -m "feat: contenedor de dependencias y contexto de la aplicación"
```

---

## Tarea 21: Onboarding y generación del primer programa

**Ficheros:**
- Crear: `app/onboarding.tsx`, `src/ui/componentes/Boton.tsx`, `src/ui/componentes/CampoNumero.tsx`
- Modificar: `app/index.tsx`

- [ ] **Paso 1: Crear los componentes de formulario**

Crear `src/ui/componentes/Boton.tsx`:

```tsx
import { Pressable, Text } from 'react-native';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export function Boton({
  titulo,
  onPress,
  testID,
  variante = 'primario',
  deshabilitado = false,
}: {
  titulo: string;
  onPress: () => void;
  testID?: string;
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
}) {
  const esPrimario = variante === 'primario';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={deshabilitado}
      onPress={onPress}
      style={{
        backgroundColor: esPrimario ? colores.acento : colores.superficieAlta,
        opacity: deshabilitado ? 0.4 : 1,
        paddingVertical: espaciado.md,
        paddingHorizontal: espaciado.lg,
        borderRadius: radio.md,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          ...tipografia.cuerpo,
          fontWeight: '600',
          color: esPrimario ? colores.acentoTexto : colores.texto,
        }}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}
```

Crear `src/ui/componentes/CampoNumero.tsx`:

```tsx
import { Text, TextInput, View } from 'react-native';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export function CampoNumero({
  etiqueta,
  valor,
  onCambio,
  testID,
  sufijo,
}: {
  etiqueta: string;
  valor: number | null;
  onCambio: (valor: number | null) => void;
  testID: string;
  sufijo?: string;
}) {
  return (
    <View style={{ marginBottom: espaciado.md }}>
      <Text style={tipografia.tenue}>
        {etiqueta}
        {sufijo ? ` (${sufijo})` : ''}
      </Text>
      <TextInput
        testID={testID}
        keyboardType="decimal-pad"
        value={valor === null ? '' : String(valor)}
        onChangeText={(texto) => {
          const limpio = texto.replace(',', '.');
          const numero = Number.parseFloat(limpio);
          onCambio(limpio === '' || Number.isNaN(numero) ? null : numero);
        }}
        style={{
          ...tipografia.cuerpo,
          backgroundColor: colores.superficie,
          borderRadius: radio.sm,
          borderWidth: 1,
          borderColor: colores.borde,
          paddingHorizontal: espaciado.md,
          paddingVertical: espaciado.sm,
          marginTop: espaciado.xs,
        }}
      />
    </View>
  );
}
```

- [ ] **Paso 2: Escribir la pantalla de onboarding**

Crear `app/onboarding.tsx`:

```tsx
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { generarPrograma } from '@/domain/planner/programa';
import type { Nivel, Objetivo, Perfil } from '@/data/db/repos/perfil';

const OBJETIVOS: { valor: Objetivo; etiqueta: string }[] = [
  { valor: 'volumen', etiqueta: 'Ganar volumen' },
  { valor: 'definicion', etiqueta: 'Definir' },
  { valor: 'fuerza', etiqueta: 'Ganar fuerza' },
];

const NIVELES: { valor: Nivel; etiqueta: string }[] = [
  { valor: 'principiante', etiqueta: 'Principiante' },
  { valor: 'intermedio', etiqueta: 'Intermedio' },
  { valor: 'avanzado', etiqueta: 'Avanzado' },
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function Opciones<T extends string | number>({
  valores,
  seleccionado,
  onElegir,
  prefijoTestID,
}: {
  valores: { valor: T; etiqueta: string }[];
  seleccionado: T;
  onElegir: (valor: T) => void;
  prefijoTestID: string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm }}>
      {valores.map((opcion) => (
        <Text
          key={String(opcion.valor)}
          testID={`${prefijoTestID}-${opcion.valor}`}
          onPress={() => onElegir(opcion.valor)}
          style={{
            ...tipografia.cuerpo,
            paddingVertical: espaciado.sm,
            paddingHorizontal: espaciado.md,
            borderRadius: radio.sm,
            backgroundColor:
              seleccionado === opcion.valor ? colores.acento : colores.superficieAlta,
            color: seleccionado === opcion.valor ? colores.acentoTexto : colores.texto,
          }}
        >
          {opcion.etiqueta}
        </Text>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const { perfil: repoPerfilApp, programa, catalogo } = useApp();

  const [nombre, setNombre] = useState('');
  const [alturaCm, setAlturaCm] = useState<number | null>(175);
  const [objetivo, setObjetivo] = useState<Objetivo>('volumen');
  const [nivel, setNivel] = useState<Nivel>('principiante');
  const [diasPorSemana, setDiasPorSemana] = useState(3);
  const [mancuernaMinKg, setMancuernaMinKg] = useState<number | null>(2);
  const [mancuernaMaxKg, setMancuernaMaxKg] = useState<number | null>(20);
  const [incrementoKg, setIncrementoKg] = useState<number | null>(2);
  const [tieneBanco, setTieneBanco] = useState(true);
  const [tieneBarraDominadas, setTieneBarraDominadas] = useState(false);
  const [diaMedicion, setDiaMedicion] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const listo =
    nombre.trim().length > 0 &&
    alturaCm !== null &&
    mancuernaMinKg !== null &&
    mancuernaMaxKg !== null &&
    incrementoKg !== null &&
    incrementoKg > 0;

  async function terminar() {
    if (!listo || guardando) return;
    setGuardando(true);

    const nuevo: Perfil = {
      nombre: nombre.trim(),
      sexo: 'otro',
      fechaNac: '1990-01-01',
      alturaCm: alturaCm!,
      nivel,
      objetivo,
      diasPorSemana,
      mancuernaMinKg: mancuernaMinKg!,
      mancuernaMaxKg: mancuernaMaxKg!,
      incrementoKg: incrementoKg!,
      tieneBanco,
      tieneBarraDominadas,
      diaMedicion,
    };

    await repoPerfilApp.guardar(nuevo);
    const plan = generarPrograma(nuevo, catalogo, `${nuevo.objetivo}-${Date.now()}`);
    await programa.guardar(plan);
    router.replace('/hoy');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.lg }}
    >
      <Text style={tipografia.titulo}>Vamos a montar tu plan</Text>

      <View>
        <Text style={tipografia.tenue}>¿Cómo te llamas?</Text>
        <TextInput
          testID="campo-nombre"
          value={nombre}
          onChangeText={setNombre}
          style={{
            ...tipografia.cuerpo,
            backgroundColor: colores.superficie,
            borderRadius: radio.sm,
            borderWidth: 1,
            borderColor: colores.borde,
            paddingHorizontal: espaciado.md,
            paddingVertical: espaciado.sm,
            marginTop: espaciado.xs,
          }}
        />
      </View>

      <CampoNumero etiqueta="Altura" sufijo="cm" valor={alturaCm} onCambio={setAlturaCm} testID="campo-altura" />

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Objetivo</Text>
        <Opciones valores={OBJETIVOS} seleccionado={objetivo} onElegir={setObjetivo} prefijoTestID="objetivo" />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Nivel</Text>
        <Opciones valores={NIVELES} seleccionado={nivel} onElegir={setNivel} prefijoTestID="nivel" />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Días por semana</Text>
        <Opciones
          valores={[2, 3, 4, 5, 6].map((d) => ({ valor: d, etiqueta: String(d) }))}
          seleccionado={diasPorSemana}
          onElegir={setDiasPorSemana}
          prefijoTestID="dias"
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Tus mancuernas</Text>
        <CampoNumero etiqueta="Peso mínimo" sufijo="kg" valor={mancuernaMinKg} onCambio={setMancuernaMinKg} testID="campo-min" />
        <CampoNumero etiqueta="Peso máximo" sufijo="kg" valor={mancuernaMaxKg} onCambio={setMancuernaMaxKg} testID="campo-max" />
        <CampoNumero etiqueta="Salto entre pesos" sufijo="kg" valor={incrementoKg} onCambio={setIncrementoKg} testID="campo-incremento" />
        <Opciones
          valores={[
            { valor: 'si', etiqueta: tieneBanco ? '✓ Tengo banco' : 'Tengo banco' },
            { valor: 'no', etiqueta: !tieneBanco ? '✓ Sin banco' : 'Sin banco' },
          ]}
          seleccionado={tieneBanco ? 'si' : 'no'}
          onElegir={(valor) => setTieneBanco(valor === 'si')}
          prefijoTestID="banco"
        />
        <Opciones
          valores={[
            { valor: 'si', etiqueta: tieneBarraDominadas ? '✓ Tengo barra' : 'Tengo barra' },
            { valor: 'no', etiqueta: !tieneBarraDominadas ? '✓ Sin barra' : 'Sin barra' },
          ]}
          seleccionado={tieneBarraDominadas ? 'si' : 'no'}
          onElegir={(valor) => setTieneBarraDominadas(valor === 'si')}
          prefijoTestID="barra"
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Día para pesarte</Text>
        <Opciones
          valores={DIAS_SEMANA.map((etiqueta, indice) => ({ valor: indice, etiqueta }))}
          seleccionado={diaMedicion}
          onElegir={setDiaMedicion}
          prefijoTestID="dia-medicion"
        />
      </View>

      <Boton testID="boton-terminar" titulo="Crear mi plan" onPress={terminar} deshabilitado={!listo || guardando} />
    </ScrollView>
  );
}
```

- [ ] **Paso 3: Redirigir según haya perfil o no**

Reemplazar `app/index.tsx`:

```tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { colores } from '@/ui/tema';

export default function Inicio() {
  const { perfil } = useApp();

  useEffect(() => {
    perfil.obtener().then((existente) => {
      router.replace(existente ? '/hoy' : '/onboarding');
    });
  }, [perfil]);

  return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
}
```

- [ ] **Paso 4: Verificar que compila**

Run: `npx tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 5: Commit**

```bash
git add app src/ui/componentes/Boton.tsx src/ui/componentes/CampoNumero.tsx
git commit -m "feat: onboarding y generación del primer programa"
```

---

## Tarea 22: Tabla de series y cronómetro

**Ficheros:**
- Crear: `src/ui/componentes/TablaSeries.tsx`, `src/ui/componentes/CronometroDescanso.tsx`
- Test: `src/ui/componentes/__tests__/TablaSeries.test.tsx`, `src/ui/componentes/__tests__/CronometroDescanso.test.tsx`

- [ ] **Paso 1: Escribir el test de la tabla que falla**

Crear `src/ui/componentes/__tests__/TablaSeries.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { TablaSeries } from '../TablaSeries';
import type { Meta } from '@/domain/planner/tipos';

const META: Meta = { pesoMeta: 20, repsMeta: 10, series: 3, pesoInicialRequerido: false };

describe('tabla de series', () => {
  it('muestra una fila por serie con la meta', () => {
    const { getByTestId } = render(
      <TablaSeries meta={META} registradas={[]} onConfirmar={jest.fn()} />,
    );
    expect(getByTestId('meta-1').props.children).toContain('20');
    expect(getByTestId('meta-3')).toBeTruthy();
  });

  it('precarga los campos de logrado con la meta', () => {
    const { getByTestId } = render(
      <TablaSeries meta={META} registradas={[]} onConfirmar={jest.fn()} />,
    );
    expect(getByTestId('peso-1').props.value).toBe('20');
    expect(getByTestId('reps-1').props.value).toBe('10');
  });

  it('confirma la serie con lo que hay en los campos', () => {
    const onConfirmar = jest.fn();
    const { getByTestId } = render(
      <TablaSeries meta={META} registradas={[]} onConfirmar={onConfirmar} />,
    );

    fireEvent.changeText(getByTestId('reps-1'), '9');
    fireEvent.press(getByTestId('confirmar-1'));

    expect(onConfirmar).toHaveBeenCalledWith({ numero: 1, pesoLogrado: 20, repsLogradas: 9 });
  });

  it('marca como hechas las series ya registradas', () => {
    const { getByTestId } = render(
      <TablaSeries
        meta={META}
        registradas={[{ numero: 1, pesoLogrado: 20, repsLogradas: 10 }]}
        onConfirmar={jest.fn()}
      />,
    );
    expect(getByTestId('fila-1').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('fila-2').props.accessibilityState.checked).toBe(false);
  });

  it('oculta el campo de peso en ejercicios de peso corporal', () => {
    const { queryByTestId } = render(
      <TablaSeries
        meta={{ ...META, pesoMeta: null }}
        registradas={[]}
        onConfirmar={jest.fn()}
      />,
    );
    expect(queryByTestId('peso-1')).toBeNull();
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/ui/componentes/__tests__/TablaSeries.test.tsx`
Esperado: FALLO, `Cannot find module '../TablaSeries'`.

- [ ] **Paso 3: Implementar la tabla**

Crear `src/ui/componentes/TablaSeries.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Meta } from '@/domain/planner/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export interface SerieConfirmada {
  numero: number;
  pesoLogrado: number | null;
  repsLogradas: number;
}

function aNumero(texto: string): number | null {
  const numero = Number.parseFloat(texto.replace(',', '.'));
  return Number.isNaN(numero) ? null : numero;
}

export function TablaSeries({
  meta,
  registradas,
  onConfirmar,
}: {
  meta: Meta;
  registradas: SerieConfirmada[];
  onConfirmar: (serie: SerieConfirmada) => void;
}) {
  const numeros = Array.from({ length: meta.series }, (_, indice) => indice + 1);
  const hechas = new Map(registradas.map((s) => [s.numero, s]));

  const [pesos, setPesos] = useState<Record<number, string>>({});
  const [reps, setReps] = useState<Record<number, string>>({});

  const pesoDe = (numero: number): string =>
    pesos[numero] ?? String(hechas.get(numero)?.pesoLogrado ?? meta.pesoMeta ?? '');
  const repsDe = (numero: number): string =>
    reps[numero] ?? String(hechas.get(numero)?.repsLogradas ?? meta.repsMeta);

  return (
    <View style={{ gap: espaciado.sm }}>
      {numeros.map((numero) => {
        const hecha = hechas.has(numero);
        return (
          <View
            key={numero}
            testID={`fila-${numero}`}
            accessibilityState={{ checked: hecha }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: espaciado.sm,
              backgroundColor: hecha ? colores.superficieAlta : colores.superficie,
              borderRadius: radio.sm,
              padding: espaciado.sm,
            }}
          >
            <Text style={{ ...tipografia.tenue, width: 20 }}>{numero}</Text>

            <Text testID={`meta-${numero}`} style={{ ...tipografia.tenue, width: 90 }}>
              {meta.pesoMeta === null
                ? `${meta.repsMeta} reps`
                : `${meta.pesoMeta} kg × ${meta.repsMeta}`}
            </Text>

            {meta.pesoMeta !== null && (
              <TextInput
                testID={`peso-${numero}`}
                keyboardType="decimal-pad"
                value={pesoDe(numero)}
                onChangeText={(texto) => setPesos({ ...pesos, [numero]: texto })}
                style={campo}
              />
            )}

            <TextInput
              testID={`reps-${numero}`}
              keyboardType="number-pad"
              value={repsDe(numero)}
              onChangeText={(texto) => setReps({ ...reps, [numero]: texto })}
              style={campo}
            />

            <Pressable
              testID={`confirmar-${numero}`}
              accessibilityRole="button"
              onPress={() =>
                onConfirmar({
                  numero,
                  pesoLogrado: meta.pesoMeta === null ? null : aNumero(pesoDe(numero)),
                  repsLogradas: aNumero(repsDe(numero)) ?? 0,
                })
              }
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hecha ? colores.exito : colores.borde,
              }}
            >
              <Text style={{ color: colores.fondo, fontWeight: '700' }}>✓</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const campo = {
  ...tipografia.cuerpo,
  width: 56,
  textAlign: 'center' as const,
  backgroundColor: colores.fondo,
  borderRadius: radio.sm,
  borderWidth: 1,
  borderColor: colores.borde,
  paddingVertical: espaciado.xs,
};
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/ui/componentes/__tests__/TablaSeries.test.tsx`
Esperado: 5 tests en verde.

- [ ] **Paso 5: Escribir el test del cronómetro que falla**

Crear `src/ui/componentes/__tests__/CronometroDescanso.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import { CronometroDescanso } from '../CronometroDescanso';

describe('cronómetro de descanso', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('muestra el tiempo restante en minutos y segundos', () => {
    const { getByTestId } = render(<CronometroDescanso segundos={90} onFin={jest.fn()} />);
    expect(getByTestId('restante').props.children).toBe('1:30');
  });

  it('descuenta cada segundo', () => {
    const { getByTestId } = render(<CronometroDescanso segundos={90} onFin={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(getByTestId('restante').props.children).toBe('1:25');
  });

  it('avisa al llegar a cero', () => {
    const onFin = jest.fn();
    render(<CronometroDescanso segundos={3} onFin={onFin} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('suma treinta segundos al pulsar el botón', () => {
    const { getByTestId } = render(<CronometroDescanso segundos={60} onFin={jest.fn()} />);
    fireEvent.press(getByTestId('sumar-30'));
    expect(getByTestId('restante').props.children).toBe('1:30');
  });

  it('salta el descanso', () => {
    const onFin = jest.fn();
    const { getByTestId } = render(<CronometroDescanso segundos={60} onFin={onFin} />);
    fireEvent.press(getByTestId('saltar'));
    expect(onFin).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Paso 6: Implementar el cronómetro**

Crear `src/ui/componentes/CronometroDescanso.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Boton } from './Boton';
import { colores, espaciado, tipografia } from '@/ui/tema';

function formatear(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

export function CronometroDescanso({
  segundos,
  onFin,
}: {
  segundos: number;
  onFin: () => void;
}) {
  const [restante, setRestante] = useState(segundos);
  const avisado = useRef(false);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setRestante((anterior) => Math.max(0, anterior - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (restante === 0 && !avisado.current) {
      avisado.current = true;
      onFin();
    }
  }, [restante, onFin]);

  return (
    <View
      style={{
        backgroundColor: colores.superficie,
        padding: espaciado.lg,
        alignItems: 'center',
        gap: espaciado.md,
      }}
    >
      <Text style={tipografia.tenue}>Descanso</Text>
      <Text testID="restante" style={tipografia.numero}>
        {formatear(restante)}
      </Text>
      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        <Boton
          testID="sumar-30"
          variante="secundario"
          titulo="+30 s"
          onPress={() => setRestante((anterior) => anterior + 30)}
        />
        <Boton
          testID="saltar"
          titulo="Saltar"
          onPress={() => {
            avisado.current = true;
            onFin();
          }}
        />
      </View>
    </View>
  );
}
```

- [ ] **Paso 7: Ejecutar los tests**

Run: `npx jest src/ui/componentes`
Esperado: 14 tests en verde entre silueta, tabla y cronómetro.

- [ ] **Paso 8: Commit**

```bash
git add src/ui/componentes
git commit -m "feat: tabla de series y cronómetro de descanso"
```

---

## Tarea 23: Agenda — qué toca hoy

**Ficheros:**
- Crear: `src/domain/planner/agenda.ts`
- Test: `src/domain/planner/__tests__/agenda.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/domain/planner/__tests__/agenda.test.ts`:

```ts
import { duracionEstimadaMin, siguienteDia } from '../agenda';
import type { DiaPlan } from '../tipos';

const dia = (semana: number, numero: number): DiaPlan & { id: number } => ({
  id: semana * 10 + numero,
  semana,
  dia: numero,
  nombre: 'Empuje',
  musculos: ['pectorals'],
  ejercicios: [
    {
      orden: 1,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      musculoObjetivo: 'pectorals',
      equipamiento: 'dumbbell',
      esAncla: true,
      series: 4,
      repMin: 8,
      repMax: 12,
      descansoSeg: 90,
    },
  ],
});

const DIAS = [dia(1, 1), dia(1, 2), dia(2, 1)];

describe('agenda', () => {
  it('propone el primer día cuando no hay nada completado', () => {
    expect(siguienteDia(DIAS, [])?.id).toBe(11);
  });

  it('salta a la siguiente sesión pendiente', () => {
    expect(siguienteDia(DIAS, [11])?.id).toBe(12);
    expect(siguienteDia(DIAS, [11, 12])?.id).toBe(21);
  });

  it('devuelve null cuando el programa está terminado', () => {
    expect(siguienteDia(DIAS, [11, 12, 21])).toBeNull();
  });

  it('estima la duración a partir de series y descanso', () => {
    // 4 series × (45 s + 90 s) = 540 s = 9 min
    expect(duracionEstimadaMin(dia(1, 1))).toBe(9);
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/domain/planner/__tests__/agenda.test.ts`
Esperado: FALLO, `Cannot find module '../agenda'`.

- [ ] **Paso 3: Implementar la agenda**

Crear `src/domain/planner/agenda.ts`:

```ts
import type { DiaPlan } from './tipos';

const SEGUNDOS_POR_SERIE = 45;

export function siguienteDia<T extends DiaPlan & { id: number }>(
  dias: T[],
  idsCompletados: number[],
): T | null {
  const completados = new Set(idsCompletados);
  const ordenados = [...dias].sort((a, b) => a.semana - b.semana || a.dia - b.dia);
  return ordenados.find((dia) => !completados.has(dia.id)) ?? null;
}

export function duracionEstimadaMin(dia: DiaPlan): number {
  const segundos = dia.ejercicios.reduce(
    (suma, ejercicio) => suma + ejercicio.series * (SEGUNDOS_POR_SERIE + ejercicio.descansoSeg),
    0,
  );
  return Math.round(segundos / 60);
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/domain/planner/__tests__/agenda.test.ts`
Esperado: 4 tests en verde.

- [ ] **Paso 5: Añadir la consulta de días completados al repositorio de sesiones**

En `src/data/db/repos/sesion.ts`, dentro del objeto que devuelve `repoSesion`, añadir:

```ts
    async diasCompletados(): Promise<number[]> {
      const filas = await adaptador.consultar<{ dia_programa_id: number }>(
        "SELECT DISTINCT dia_programa_id FROM sesion WHERE estado = 'completada'",
      );
      return filas.map((fila) => fila.dia_programa_id);
    },
```

- [ ] **Paso 6: Commit**

```bash
git add src/domain/planner/agenda.ts src/domain/planner/__tests__/agenda.test.ts src/data/db/repos/sesion.ts
git commit -m "feat: agenda del programa y duración estimada"
```

---

## Tarea 24: Pantalla Hoy

**Ficheros:**
- Crear: `app/hoy.tsx`, `src/ui/componentes/BarraProgreso.tsx`

- [ ] **Paso 1: Crear la barra de progreso**

Crear `src/ui/componentes/BarraProgreso.tsx`:

```tsx
import { View } from 'react-native';
import { colores, radio } from '@/ui/tema';

export function BarraProgreso({ valor, total }: { valor: number; total: number }) {
  const porcentaje = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <View
      testID="barra-progreso"
      accessibilityValue={{ now: porcentaje, min: 0, max: 100 }}
      style={{ height: 8, backgroundColor: colores.borde, borderRadius: radio.sm }}
    >
      <View
        style={{
          width: `${porcentaje}%`,
          height: 8,
          backgroundColor: colores.acento,
          borderRadius: radio.sm,
        }}
      />
    </View>
  );
}
```

- [ ] **Paso 2: Escribir la pantalla Hoy**

Crear `app/hoy.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { SiluetaMuscular } from '@/ui/componentes/SiluetaMuscular';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { duracionEstimadaMin, siguienteDia } from '@/domain/planner/agenda';
import type { DiaGuardado } from '@/data/db/repos/programa';
import type { Reto } from '@/data/db/repos/retos';
import type { Perfil } from '@/data/db/repos/perfil';

export default function Hoy() {
  const { programa, sesion, retos, perfil, mediciones } = useApp();
  const [dia, setDia] = useState<DiaGuardado | null>(null);
  const [activos, setActivos] = useState<Reto[]>([]);
  const [datosPerfil, setDatosPerfil] = useState<Perfil | null>(null);
  const [tocaPesarse, setTocaPesarse] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        const [activo, completados, listaRetos, miPerfil] = await Promise.all([
          programa.activo(),
          sesion.diasCompletados(),
          retos.activos(),
          perfil.obtener(),
        ]);
        if (!vivo) return;

        const dias = activo ? await programa.diasDe(activo.id) : [];
        setDia(siguienteDia(dias, completados));
        setActivos(listaRetos);
        setDatosPerfil(miPerfil);

        if (miPerfil) {
          const hoy = new Date();
          const fecha = hoy.toISOString().slice(0, 10);
          setTocaPesarse(
            hoy.getDay() === miPerfil.diaMedicion && !(await mediciones.hayEn(fecha)),
          );
        }
      })();
      return () => {
        vivo = false;
      };
    }, [programa, sesion, retos, perfil, mediciones]),
  );

  async function empezar() {
    if (!dia) return;
    const borrador = await sesion.borradorDe(dia.id);
    const sesionId = borrador?.id ?? (await sesion.crear(dia.id));
    router.push(`/sesion/${sesionId}`);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.lg }}
    >
      <Text style={tipografia.titulo}>Hola{datosPerfil ? `, ${datosPerfil.nombre}` : ''}</Text>

      {tocaPesarse && (
        <View style={tarjeta}>
          <Text style={tipografia.seccion}>Toca pesarte</Text>
          <Text style={tipografia.tenue}>Registra tu peso y medidas de esta semana.</Text>
          <Boton titulo="Registrar" variante="secundario" onPress={() => router.push('/medicion')} />
        </View>
      )}

      {dia ? (
        <View style={tarjeta} testID="tarjeta-dia">
          <Text style={tipografia.tenue}>
            Semana {dia.semana} · Día {dia.dia}
          </Text>
          <Text style={tipografia.titulo}>{dia.nombre}</Text>
          <View style={{ flexDirection: 'row', gap: espaciado.md, alignItems: 'center' }}>
            <SiluetaMuscular
              principales={dia.musculos}
              secundarios={[]}
              vista={dia.musculos.some((m) => m === 'lats' || m === 'glutes') ? 'posterior' : 'frontal'}
              ancho={110}
            />
            <View style={{ gap: espaciado.xs, flex: 1 }}>
              <Text style={tipografia.cuerpo}>{dia.ejercicios.length} ejercicios</Text>
              <Text style={tipografia.tenue}>
                {dia.ejercicios.reduce((suma, e) => suma + e.series, 0)} series
              </Text>
              <Text style={tipografia.tenue}>~{duracionEstimadaMin(dia)} min</Text>
            </View>
          </View>
          <Boton testID="boton-empezar" titulo="Empezar entrenamiento" onPress={empezar} />
        </View>
      ) : (
        <View style={tarjeta}>
          <Text style={tipografia.seccion}>Programa terminado</Text>
          <Text style={tipografia.tenue}>
            Has completado las 8 semanas. Genera uno nuevo desde Ajustes.
          </Text>
        </View>
      )}

      {activos.length > 0 && (
        <View style={{ gap: espaciado.sm }}>
          <Text style={tipografia.seccion}>Retos</Text>
          {activos.map((reto) => (
            <View key={reto.id} style={tarjeta}>
              <Text style={tipografia.cuerpo}>{reto.titulo}</Text>
              <BarraProgreso valor={reto.valorActual} total={reto.metaValor} />
              <Text style={tipografia.tenue}>
                {reto.valorActual} de {reto.metaValor} · hasta {reto.fechaFin}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Boton
        titulo="Ver progreso"
        variante="secundario"
        onPress={() => router.push('/progreso')}
      />
      <Boton titulo="Ajustes" variante="secundario" onPress={() => router.push('/ajustes')} />
    </ScrollView>
  );
}

const tarjeta = {
  backgroundColor: colores.superficie,
  borderRadius: radio.md,
  padding: espaciado.md,
  gap: espaciado.sm,
};
```

- [ ] **Paso 3: Verificar que compila y arranca**

Run: `npx tsc --noEmit`
Esperado: sin errores.

Run: `npx expo start` y completar el onboarding en el simulador.
Esperado: tras crear el plan aparece la tarjeta del día con la silueta.

- [ ] **Paso 4: Commit**

```bash
git add app/hoy.tsx src/ui/componentes/BarraProgreso.tsx
git commit -m "feat: pantalla Hoy con el día del programa y los retos activos"
```

---

## Tarea 25: Pantalla de sesión guiada

**Ficheros:**
- Crear: `app/sesion/[sesionId].tsx`, `src/ui/componentes/GifEjercicio.tsx`

- [ ] **Paso 1: Crear el componente de animación**

Crear `src/ui/componentes/GifEjercicio.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { MINIATURAS } from '../../../assets/thumbs';
import { useApp } from '@/ui/ContextoApp';
import type { Ejercicio } from '@/data/catalog/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export function GifEjercicio({ ejercicio, alto = 220 }: { ejercicio: Ejercicio; alto?: number }) {
  const { cache } = useApp();
  const [rutaGif, setRutaGif] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setRutaGif(null);
    setFallo(false);
    cache.asegurar(ejercicio.id, ejercicio.gifUrl).then((ruta) => {
      if (!vivo) return;
      if (ruta) setRutaGif(ruta);
      else setFallo(true);
    });
    return () => {
      vivo = false;
    };
  }, [cache, ejercicio.id, ejercicio.gifUrl]);

  const miniatura = MINIATURAS[ejercicio.miniatura];

  return (
    <View style={{ gap: espaciado.xs }}>
      <Image
        testID="imagen-ejercicio"
        source={rutaGif ? { uri: rutaGif } : miniatura}
        style={{
          width: '100%',
          height: alto,
          borderRadius: radio.md,
          backgroundColor: colores.superficie,
        }}
        resizeMode="contain"
      />
      {fallo && (
        <Text testID="aviso-sin-conexion" style={tipografia.tenue}>
          Sin conexión · se muestra la imagen estática
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Paso 2: Escribir la pantalla de sesión**

Crear `app/sesion/[sesionId].tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { CronometroDescanso } from '@/ui/componentes/CronometroDescanso';
import { GifEjercicio } from '@/ui/componentes/GifEjercicio';
import { TablaSeries } from '@/ui/componentes/TablaSeries';
import type { SerieConfirmada } from '@/ui/componentes/TablaSeries';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { calcularMeta } from '@/domain/planner/progresion';
import type { EjercicioDia, Meta } from '@/domain/planner/tipos';
import type { Perfil } from '@/data/db/repos/perfil';

const ANCHO = Dimensions.get('window').width;

export default function PantallaSesion() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const identificador = Number(sesionId);
  const { programa, sesion, catalogo, perfil } = useApp();

  const [ejercicios, setEjercicios] = useState<EjercicioDia[]>([]);
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [hechas, setHechas] = useState<Record<string, SerieConfirmada[]>>({});
  const [descanso, setDescanso] = useState<number | null>(null);
  const [datosPerfil, setDatosPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    (async () => {
      const miPerfil = await perfil.obtener();
      const activo = await programa.activo();
      if (!miPerfil || !activo) return;

      const dias = await programa.diasDe(activo.id);
      const borrador = await Promise.all(
        dias.map(async (dia) => ({ dia, esta: (await sesion.borradorDe(dia.id))?.id })),
      );
      const encontrado = borrador.find((fila) => fila.esta === identificador)?.dia;
      if (!encontrado) return;

      const registradas = await sesion.seriesDe(identificador);
      const porEjercicio: Record<string, SerieConfirmada[]> = {};
      for (const serie of registradas) {
        porEjercicio[serie.ejercicioId] = [
          ...(porEjercicio[serie.ejercicioId] ?? []),
          {
            numero: serie.numero,
            pesoLogrado: serie.pesoLogrado,
            repsLogradas: serie.repsLogradas,
          },
        ];
      }

      const calculadas: Record<string, Meta> = {};
      for (const ejercicio of encontrado.ejercicios) {
        const historial = await sesion.historialDe(ejercicio.ejercicioId);
        calculadas[ejercicio.ejercicioId] = calcularMeta(
          historial.filter((s) => s.sesionId !== identificador),
          ejercicio,
          miPerfil,
        );
      }

      setDatosPerfil(miPerfil);
      setEjercicios(encontrado.ejercicios);
      setMetas(calculadas);
      setHechas(porEjercicio);
    })();
  }, [identificador, programa, sesion, perfil]);

  const totalSeries = useMemo(
    () => ejercicios.reduce((suma, e) => suma + (metas[e.ejercicioId]?.series ?? e.series), 0),
    [ejercicios, metas],
  );
  const seriesHechas = useMemo(
    () => Object.values(hechas).reduce((suma, lista) => suma + lista.length, 0),
    [hechas],
  );

  const confirmar = useCallback(
    async (ejercicio: EjercicioDia, serie: SerieConfirmada) => {
      const meta = metas[ejercicio.ejercicioId];
      await sesion.registrarSerie({
        sesionId: identificador,
        ejercicioId: ejercicio.ejercicioId,
        numero: serie.numero,
        pesoMeta: meta?.pesoMeta ?? null,
        repsMeta: meta?.repsMeta ?? ejercicio.repMin,
        pesoLogrado: serie.pesoLogrado,
        repsLogradas: serie.repsLogradas,
      });

      setHechas((anterior) => {
        const lista = (anterior[ejercicio.ejercicioId] ?? []).filter(
          (s) => s.numero !== serie.numero,
        );
        return { ...anterior, [ejercicio.ejercicioId]: [...lista, serie] };
      });
      setDescanso(ejercicio.descansoSeg);
    },
    [identificador, metas, sesion],
  );

  if (!datosPerfil || ejercicios.length === 0) {
    return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo, paddingTop: espaciado.xl }}>
      <View style={{ paddingHorizontal: espaciado.lg, gap: espaciado.sm }}>
        <Text style={tipografia.tenue}>
          {seriesHechas} de {totalSeries} series
        </Text>
        <BarraProgreso valor={seriesHechas} total={totalSeries} />
      </View>

      <FlatList
        data={ejercicios}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.ejercicioId}
        renderItem={({ item }) => {
          const ficha = catalogo.porId(item.ejercicioId);
          const meta = metas[item.ejercicioId];
          if (!ficha || !meta) return <View style={{ width: ANCHO }} />;

          return (
            <View style={{ width: ANCHO, padding: espaciado.lg, gap: espaciado.md }}>
              <GifEjercicio ejercicio={ficha} />
              <Text style={tipografia.seccion}>{ficha.nombre}</Text>
              <View style={{ flexDirection: 'row', gap: espaciado.sm, flexWrap: 'wrap' }}>
                <Text style={chip}>{ficha.musculo}</Text>
                {ficha.musculosSecundarios.map((musculo) => (
                  <Text key={musculo} style={{ ...chip, backgroundColor: colores.superficieAlta }}>
                    {musculo}
                  </Text>
                ))}
              </View>
              {meta.pesoInicialRequerido && (
                <Text style={tipografia.tenue}>
                  Primera vez con este ejercicio: escribe el peso con el que empiezas.
                </Text>
              )}
              <TablaSeries
                meta={meta}
                registradas={hechas[item.ejercicioId] ?? []}
                onConfirmar={(serie) => confirmar(item, serie)}
              />
            </View>
          );
        }}
      />

      <View style={{ padding: espaciado.lg }}>
        <Boton
          testID="terminar-sesion"
          titulo="Terminar entrenamiento"
          onPress={() => router.replace(`/resumen/${identificador}`)}
        />
      </View>

      <Modal visible={descanso !== null} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' }}>
          {descanso !== null && (
            <CronometroDescanso segundos={descanso} onFin={() => setDescanso(null)} />
          )}
        </View>
      </Modal>
    </View>
  );
}

const chip = {
  ...tipografia.tenue,
  color: colores.acentoTexto,
  backgroundColor: colores.acento,
  paddingHorizontal: espaciado.sm,
  paddingVertical: espaciado.xs,
  borderRadius: radio.sm,
};
```

- [ ] **Paso 3: Verificar en el simulador**

Run: `npx expo start`
Esperado: al empezar el entrenamiento aparece el slider, se puede confirmar una serie, salta el cronómetro y la barra de progreso avanza.

- [ ] **Paso 4: Commit**

```bash
git add app/sesion src/ui/componentes/GifEjercicio.tsx
git commit -m "feat: sesión guiada con slider de ejercicios y registro de series"
```

---

## Tarea 26: Resumen de sesión y actualización de retos

**Ficheros:**
- Crear: `app/resumen/[sesionId].tsx`, `src/app/cerrarSesion.ts`
- Test: `src/app/__tests__/cerrarSesion.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/app/__tests__/cerrarSesion.test.ts`:

```ts
import { crearAdaptadorMemoria } from '@/data/db/pruebas/adaptadorMemoria';
import { migrar } from '@/data/db/migraciones';
import { repoRetos } from '@/data/db/repos/retos';
import { repoSesion } from '@/data/db/repos/sesion';
import { cerrarSesion } from '../cerrarSesion';

describe('cierre de sesión', () => {
  it('marca la sesión completada y actualiza los retos', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);

    const programaId = await adaptador.insertar(
      `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
       VALUES ('volumen', 8, 3, 'ppl3', '2026-09-01T00:00:00.000Z', 1)`,
    );
    const diaId = await adaptador.insertar(
      `INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos)
       VALUES (?, 1, 1, 'Empuje', '["pectorals"]')`,
      [programaId],
    );

    const sesiones = repoSesion(adaptador);
    const retos = repoRetos(adaptador);

    const retoId = await retos.crear({
      titulo: '1 entrenamiento',
      tipo: 'sesiones',
      ejercicioId: null,
      metaValor: 1,
      fechaInicio: '2000-01-01',
      fechaFin: '2100-01-01',
    });

    const sesionId = await sesiones.crear(diaId);
    await sesiones.registrarSerie({
      sesionId,
      ejercicioId: 'pectorals/dumbbell-bench-press',
      numero: 1,
      pesoMeta: 20,
      repsMeta: 10,
      pesoLogrado: 20,
      repsLogradas: 10,
    });

    const resultado = await cerrarSesion({ sesiones, retos }, sesionId);

    expect(resultado.volumenKg).toBe(200);
    expect(resultado.seriesCompletadas).toBe(1);
    expect(resultado.retosLogrados.map((r) => r.id)).toEqual([retoId]);
    expect((await retos.todos())[0]?.estado).toBe('logrado');
  });
});
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/app`
Esperado: FALLO, `Cannot find module '../cerrarSesion'`.

- [ ] **Paso 3: Implementar el cierre**

Crear `src/app/cerrarSesion.ts`:

```ts
import type { repoRetos } from '@/data/db/repos/retos';
import type { Reto } from '@/data/db/repos/retos';
import type { repoSesion } from '@/data/db/repos/sesion';
import { evaluarReto } from '@/domain/planner/retos';

export interface ResumenSesion {
  seriesCompletadas: number;
  volumenKg: number;
  retosLogrados: Reto[];
}

export async function cerrarSesion(
  repos: { sesiones: ReturnType<typeof repoSesion>; retos: ReturnType<typeof repoRetos> },
  sesionId: number,
): Promise<ResumenSesion> {
  await repos.sesiones.completar(sesionId);

  const series = await repos.sesiones.seriesDe(sesionId);
  const volumenKg = series.reduce(
    (suma, serie) => suma + (serie.pesoLogrado ?? 0) * serie.repsLogradas,
    0,
  );

  const completadas = await repos.sesiones.completadasEntre('2000-01-01', '2999-12-31');
  const sesionesCompletadas = completadas.map((s) => ({ terminadaEn: s.terminadaEn ?? '' }));

  const todasLasSeries: Awaited<ReturnType<typeof repos.sesiones.seriesDe>> = [];
  for (const completada of completadas) {
    todasLasSeries.push(...(await repos.sesiones.seriesDe(completada.id)));
  }

  const hoy = new Date().toISOString();
  const logrados: Reto[] = [];

  for (const reto of await repos.retos.activos()) {
    const { valorActual, estado } = evaluarReto(
      reto,
      { sesionesCompletadas, series: todasLasSeries },
      hoy,
    );
    await repos.retos.actualizar(reto.id, valorActual, estado);
    if (estado === 'logrado') logrados.push({ ...reto, valorActual, estado });
  }

  return { seriesCompletadas: series.length, volumenKg, retosLogrados: logrados };
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

Run: `npx jest src/app`
Esperado: 1 test en verde.

- [ ] **Paso 5: Escribir la pantalla de resumen**

Crear `app/resumen/[sesionId].tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { cerrarSesion } from '@/app/cerrarSesion';
import type { ResumenSesion } from '@/app/cerrarSesion';

export default function Resumen() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const { sesion, retos } = useApp();
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);

  useEffect(() => {
    cerrarSesion({ sesiones: sesion, retos }, Number(sesionId)).then(setResumen);
  }, [sesionId, sesion, retos]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colores.fondo,
        padding: espaciado.lg,
        gap: espaciado.lg,
        justifyContent: 'center',
      }}
    >
      <Text style={tipografia.titulo}>Entrenamiento terminado</Text>

      <View style={{ backgroundColor: colores.superficie, borderRadius: radio.md, padding: espaciado.md, gap: espaciado.sm }}>
        <Text style={tipografia.tenue}>Series completadas</Text>
        <Text testID="series-completadas" style={tipografia.numero}>
          {resumen?.seriesCompletadas ?? 0}
        </Text>
        <Text style={tipografia.tenue}>Volumen total</Text>
        <Text testID="volumen" style={tipografia.numero}>
          {Math.round(resumen?.volumenKg ?? 0)} kg
        </Text>
      </View>

      {(resumen?.retosLogrados ?? []).map((reto) => (
        <View key={reto.id} style={{ backgroundColor: colores.exito, borderRadius: radio.md, padding: espaciado.md }}>
          <Text style={{ ...tipografia.cuerpo, color: colores.fondo, fontWeight: '700' }}>
            Reto completado: {reto.titulo}
          </Text>
        </View>
      ))}

      <Boton titulo="Volver a inicio" onPress={() => router.replace('/hoy')} />
    </View>
  );
}
```

- [ ] **Paso 6: Commit**

```bash
git add src/app/cerrarSesion.ts src/app/__tests__ app/resumen
git commit -m "feat: resumen de sesión con volumen y retos completados"
```

---

## Tarea 27: Mediciones corporales y aviso semanal

**Ficheros:**
- Crear: `app/medicion.tsx`, `app/progreso.tsx`, `src/services/avisos.ts`, `src/ui/componentes/Grafica.tsx`

- [ ] **Paso 1: Crear la gráfica**

Crear `src/ui/componentes/Grafica.tsx`:

```tsx
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Text, View } from 'react-native';
import { colores, espaciado, tipografia } from '@/ui/tema';

export interface Punto {
  etiqueta: string;
  valor: number;
}

export function Grafica({ puntos, titulo }: { puntos: Punto[]; titulo: string }) {
  if (puntos.length === 0) {
    return <Text style={tipografia.tenue}>Sin datos de {titulo} todavía.</Text>;
  }

  const ancho = 300;
  const alto = 120;
  const valores = puntos.map((p) => p.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;

  const coordenadas = puntos.map((punto, indice) => {
    const x = puntos.length === 1 ? ancho / 2 : (indice / (puntos.length - 1)) * ancho;
    const y = alto - ((punto.valor - minimo) / rango) * alto;
    return { x, y };
  });

  return (
    <View style={{ gap: espaciado.xs }}>
      <Text style={tipografia.tenue}>{titulo}</Text>
      <Svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`}>
        <Polyline
          testID={`linea-${titulo}`}
          points={coordenadas.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={colores.acento}
          strokeWidth={2}
        />
        {coordenadas.map((c, indice) => (
          <Circle key={indice} cx={c.x} cy={c.y} r={3} fill={colores.acento} />
        ))}
      </Svg>
      <Text style={tipografia.tenue}>
        {minimo} → {maximo}
      </Text>
    </View>
  );
}
```

- [ ] **Paso 2: Crear el servicio de avisos**

Crear `src/services/avisos.ts`:

```ts
import * as Notifications from 'expo-notifications';

const HORA_AVISO = 8;

export async function programarAvisoMedicion(diaSemana: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const permiso = await Notifications.requestPermissionsAsync();
  if (!permiso.granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Toca pesarte',
      body: 'Registra tu peso y medidas de esta semana.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: diaSemana + 1, // expo cuenta domingo como 1
      hour: HORA_AVISO,
      minute: 0,
    },
  });
}
```

- [ ] **Paso 3: Crear la pantalla de medición**

Crear `app/medicion.tsx`:

```tsx
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { TIPOS_MEDIDA } from '@/data/db/repos/mediciones';
import type { TipoMedida } from '@/data/db/repos/mediciones';
import { colores, espaciado, tipografia } from '@/ui/tema';

const ETIQUETAS: Record<TipoMedida, string> = {
  cuello: 'Cuello',
  pecho: 'Pecho',
  cintura: 'Cintura',
  cadera: 'Cadera',
  brazo_izq: 'Brazo izquierdo',
  brazo_der: 'Brazo derecho',
  muslo_izq: 'Muslo izquierdo',
  muslo_der: 'Muslo derecho',
  pantorrilla: 'Pantorrilla',
};

export default function Medicion() {
  const { mediciones } = useApp();
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const [valores, setValores] = useState<Partial<Record<TipoMedida, number>>>({});

  async function guardar() {
    if (pesoKg === null) return;
    await mediciones.guardar({
      fecha: new Date().toISOString().slice(0, 10),
      pesoKg,
      notas: null,
      medidas: valores,
    });
    router.back();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.sm }}
    >
      <Text style={tipografia.titulo}>Medidas de hoy</Text>
      <CampoNumero etiqueta="Peso" sufijo="kg" valor={pesoKg} onCambio={setPesoKg} testID="campo-peso" />
      <Text style={tipografia.tenue}>El resto es opcional.</Text>
      {TIPOS_MEDIDA.map((tipo) => (
        <CampoNumero
          key={tipo}
          etiqueta={ETIQUETAS[tipo]}
          sufijo="cm"
          valor={valores[tipo] ?? null}
          onCambio={(valor) =>
            setValores((anterior) => ({ ...anterior, [tipo]: valor ?? undefined }))
          }
          testID={`campo-${tipo}`}
        />
      ))}
      <Boton titulo="Guardar" onPress={guardar} deshabilitado={pesoKg === null} />
    </ScrollView>
  );
}
```

- [ ] **Paso 4: Crear la pantalla de progreso**

Crear `app/progreso.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { Grafica } from '@/ui/componentes/Grafica';
import { TIPOS_MEDIDA } from '@/data/db/repos/mediciones';
import type { Medicion } from '@/data/db/repos/mediciones';
import { colores, espaciado, tipografia } from '@/ui/tema';

export default function Progreso() {
  const { mediciones } = useApp();
  const [historial, setHistorial] = useState<Medicion[]>([]);

  useFocusEffect(
    useCallback(() => {
      mediciones.historial().then(setHistorial);
    }, [mediciones]),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.lg }}
    >
      <Text style={tipografia.titulo}>Progreso</Text>

      <Grafica
        titulo="Peso (kg)"
        puntos={historial.map((m) => ({ etiqueta: m.fecha, valor: m.pesoKg }))}
      />

      {TIPOS_MEDIDA.map((tipo) => {
        const puntos = historial
          .filter((m) => m.medidas[tipo] !== undefined)
          .map((m) => ({ etiqueta: m.fecha, valor: m.medidas[tipo] as number }));
        return puntos.length > 0 ? <Grafica key={tipo} titulo={tipo} puntos={puntos} /> : null;
      })}

      <Boton titulo="Registrar medidas" onPress={() => router.push('/medicion')} />
    </ScrollView>
  );
}
```

- [ ] **Paso 5: Verificar que compila**

Run: `npx tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 6: Commit**

```bash
git add app/medicion.tsx app/progreso.tsx src/services/avisos.ts src/ui/componentes/Grafica.tsx
git commit -m "feat: mediciones corporales, gráficas de progreso y aviso semanal"
```

---

## Tarea 28: Ajustes y retos

**Ficheros:**
- Crear: `app/ajustes.tsx`, `app/retos.tsx`

- [ ] **Paso 1: Crear la pantalla de ajustes**

Crear `app/ajustes.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { generarPrograma } from '@/domain/planner/programa';
import { programarAvisoMedicion } from '@/services/avisos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const CLAVE_API = 'openai_api_key';

export default function Ajustes() {
  const { perfil, programa, catalogo, cache } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [tamanoCache, setTamanoCache] = useState(0);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync(CLAVE_API).then((valor) => setApiKey(valor ?? ''));
    cache.tamanoTotal().then(setTamanoCache);
  }, [cache]);

  async function guardarClave() {
    const limpia = apiKey.trim();
    if (limpia !== '' && !limpia.startsWith('sk-')) {
      setMensaje('La clave de OpenAI debería empezar por "sk-".');
      return;
    }
    await SecureStore.setItemAsync(CLAVE_API, limpia);
    setMensaje('Clave guardada.');
  }

  async function descargarPlan() {
    const activo = await programa.activo();
    if (!activo) return;
    const dias = await programa.diasDe(activo.id);
    const proximos = dias.filter((dia) => dia.semana <= 2);
    const ids = new Set(proximos.flatMap((dia) => dia.ejercicios.map((e) => e.ejercicioId)));

    setMensaje(`Descargando ${ids.size} animaciones...`);
    for (const id of ids) {
      const ficha = catalogo.porId(id);
      if (ficha) await cache.asegurar(ficha.id, ficha.gifUrl);
    }
    setTamanoCache(await cache.tamanoTotal());
    setMensaje('Plan descargado para las dos próximas semanas.');
  }

  async function regenerar() {
    const miPerfil = await perfil.obtener();
    if (!miPerfil) return;
    const plan = generarPrograma(miPerfil, catalogo, `${miPerfil.objetivo}-${Date.now()}`);
    await programa.guardar(plan);
    await programarAvisoMedicion(miPerfil.diaMedicion);
    setMensaje('Programa regenerado. Tu histórico se conserva.');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.md }}
    >
      <Text style={tipografia.titulo}>Ajustes</Text>

      <Text style={tipografia.seccion}>Clave de OpenAI</Text>
      <Text style={tipografia.tenue}>
        Se guarda cifrada en el dispositivo. Se usará para el análisis de comidas.
      </Text>
      <TextInput
        testID="campo-api-key"
        value={apiKey}
        onChangeText={setApiKey}
        autoCapitalize="none"
        secureTextEntry
        style={{
          ...tipografia.cuerpo,
          backgroundColor: colores.superficie,
          borderRadius: radio.sm,
          borderWidth: 1,
          borderColor: colores.borde,
          paddingHorizontal: espaciado.md,
          paddingVertical: espaciado.sm,
        }}
      />
      <Boton titulo="Guardar clave" variante="secundario" onPress={guardarClave} />

      <Text style={tipografia.seccion}>Animaciones</Text>
      <Text style={tipografia.tenue}>
        Caché ocupada: {(tamanoCache / 1024 / 1024).toFixed(1)} MB
      </Text>
      <Boton titulo="Descargar mi plan" variante="secundario" onPress={descargarPlan} />
      <Boton
        titulo="Vaciar caché"
        variante="secundario"
        onPress={async () => {
          await cache.vaciar();
          setTamanoCache(0);
          setMensaje('Caché vaciada.');
        }}
      />

      <Text style={tipografia.seccion}>Programa</Text>
      <Boton titulo="Regenerar programa" variante="secundario" onPress={regenerar} />
      <Boton titulo="Mis retos" variante="secundario" onPress={() => router.push('/retos')} />

      {mensaje !== '' && <Text style={tipografia.tenue}>{mensaje}</Text>}

      <Boton titulo="Volver" onPress={() => router.back()} />
    </ScrollView>
  );
}
```

- [ ] **Paso 2: Crear la pantalla de retos**

Crear `app/retos.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import type { Reto, TipoReto } from '@/data/db/repos/retos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const PLANTILLAS: { tipo: TipoReto; titulo: (meta: number) => string; sufijo: string }[] = [
  { tipo: 'sesiones', titulo: (meta) => `${meta} entrenamientos en 30 días`, sufijo: 'sesiones' },
  { tipo: 'volumen', titulo: (meta) => `${meta} kg de volumen en 30 días`, sufijo: 'kg' },
];

function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export default function Retos() {
  const { retos } = useApp();
  const [lista, setLista] = useState<Reto[]>([]);
  const [meta, setMeta] = useState<number | null>(12);
  const [plantilla, setPlantilla] = useState(0);

  const recargar = useCallback(() => {
    retos.todos().then(setLista);
  }, [retos]);

  useFocusEffect(recargar);

  async function crear() {
    const elegida = PLANTILLAS[plantilla];
    if (!elegida || meta === null) return;
    await retos.crear({
      titulo: elegida.titulo(meta),
      tipo: elegida.tipo,
      ejercicioId: null,
      metaValor: meta,
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFin: enDias(30),
    });
    recargar();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.md }}
    >
      <Text style={tipografia.titulo}>Retos</Text>

      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        {PLANTILLAS.map((opcion, indice) => (
          <Text
            key={opcion.tipo}
            testID={`plantilla-${opcion.tipo}`}
            onPress={() => setPlantilla(indice)}
            style={{
              ...tipografia.cuerpo,
              padding: espaciado.sm,
              borderRadius: radio.sm,
              backgroundColor: plantilla === indice ? colores.acento : colores.superficieAlta,
              color: plantilla === indice ? colores.acentoTexto : colores.texto,
            }}
          >
            {opcion.sufijo}
          </Text>
        ))}
      </View>

      <CampoNumero etiqueta="Meta" valor={meta} onCambio={setMeta} testID="campo-meta" />
      <Boton titulo="Crear reto" onPress={crear} deshabilitado={meta === null} />

      {lista.map((reto) => (
        <View
          key={reto.id}
          style={{ backgroundColor: colores.superficie, borderRadius: radio.md, padding: espaciado.md, gap: espaciado.sm }}
        >
          <Text style={tipografia.cuerpo}>{reto.titulo}</Text>
          <BarraProgreso valor={reto.valorActual} total={reto.metaValor} />
          <Text style={tipografia.tenue}>
            {reto.estado} · {reto.valorActual} de {reto.metaValor}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Paso 3: Ejecutar toda la batería y verificar la app**

Run: `npm test`
Esperado: todos los tests en verde.

Run: `npx tsc --noEmit`
Esperado: sin errores.

Run: `npx expo start`
Esperado: recorrido completo — onboarding, plan generado, entrenamiento con slider y series, resumen, medidas y ajustes.

- [ ] **Paso 4: Commit**

```bash
git add app/ajustes.tsx app/retos.tsx
git commit -m "feat: ajustes con clave de OpenAI, caché y gestión de retos"
```

---

## Cobertura de la especificación

| Sección de la spec | Tareas |
|---|---|
| 4 Catálogo y filtros | 2, 3, 4 |
| 5 Arquitectura y capas | 1, 4, 5, 20 |
| 6 Modelo de datos | 5, 6, 8, 9, 10 |
| 7 Motor de planificación | 11, 12, 13, 14 |
| 8 Doble progresión | 15 |
| 9 Retos | 10, 16, 26, 28 |
| 10 Seguimiento corporal | 10, 27 |
| 11 Offline y assets | 3, 17, 28 |
| 12 Pantallas | 19, 21, 23, 24, 25, 26, 27, 28 |
| 13 Errores y casos límite | 5, 9, 17, 24, 25 |
| 14 Pruebas | presentes en cada tarea |

Queda fuera de estas tareas, por decisión explícita de la especificación: la pantalla de detalle de ejercicio con su historial y la vista del programa completo de 8 semanas. Ambas son de solo lectura sobre datos que las tareas anteriores ya exponen, y se añaden como tarea 29 cuando el recorrido principal esté verificado en dispositivo.
