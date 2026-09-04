# Navegación de sesión y gamificación — Plan de implementación

> **Para agentes:** los criterios y las reglas están en la especificación
> `docs/superpowers/specs/2026-09-02-navegacion-y-gamificacion-design.md`. Este
> plan fija el orden, los ficheros, las firmas y los casos de prueba. Se ejecuta
> con `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Objetivo:** que el usuario sepa en todo momento en qué ejercicio está y cuántos
le quedan, y que la app celebre lo que consigue —serie, ejercicio, músculo, día,
racha y medición— para que volver mañana apetezca.

**Arquitectura:** toda la lógica nueva vive en `src/domain/gamificacion/`, sin
React ni SQL, igual que `domain/planner`. La capa de datos añade una migración y
un repositorio de logros. La interfaz consume funciones puras y no calcula nada.

**Stack:** Expo SDK 57, React Native 0.86, expo-router, expo-sqlite, Jest con
`jest-expo` y `better-sqlite3` en memoria, TypeScript en modo estricto con
`noUncheckedIndexedAccess`.

**Antes de escribir código de Expo:** consultar
`https://docs.expo.dev/versions/v57.0.0/` para cualquier API de Expo que se toque
(en este plan, solo `expo-haptics`).

**Comandos:**
- Pruebas de un fichero: `npm test -- <ruta>`
- Todas las pruebas: `npm test`
- Tipos: `npx tsc --noEmit`

**Cambios respecto a la spec** (decididos al detallar el plan, ya incorporados
aquí):
1. Las claves de `logro` empiezan por la sesión —`sesion:<id>:...`— para poder
   leer todas las de una sesión con un solo prefijo.
2. Se añade un sexto estado de día, `extra`: entrenaste un día fuera de tu
   agenda. Se pinta con 🔥 apagado y no cuenta para la racha. Ignorarlo del todo
   habría sido desmotivador.
3. En objetivo `fuerza`, el progreso se mide con perímetros y peso al alza, y el
   mensaje es el que enmarca el trabajo de fuerza. Cruzar el volumen levantado
   con la medición habría exigido plumbing nuevo sin mejorar el mensaje.

---

## Tarea 1: Fechas locales

**Ficheros:** `src/domain/gamificacion/fechas.ts`
**Test:** `src/domain/gamificacion/__tests__/fechas.test.ts`

La base guarda `terminada_en` en ISO UTC. Todo el cálculo de rachas se hace en
días locales, porque un entrenamiento de las 22:00 tiene que contar para hoy.
Todas las fechas del módulo se manipulan a mediodía, que es inmune al cambio de
hora.

```ts
const MEDIODIA = 12;

/** Día local en formato YYYY-MM-DD. */
export function diaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Día local de una marca ISO. Nunca `iso.slice(0, 10)`: eso sería UTC. */
export function diaDeIso(iso: string): string {
  return diaLocal(new Date(iso));
}

function aFecha(dia: string): Date {
  const [anio, mes, numero] = dia.split('-').map(Number);
  return new Date(anio ?? 1970, (mes ?? 1) - 1, numero ?? 1, MEDIODIA);
}

export function sumarDias(dia: string, cantidad: number): string {
  const fecha = aFecha(dia);
  fecha.setDate(fecha.getDate() + cantidad);
  return diaLocal(fecha);
}

/** 0 = domingo, 6 = sábado, igual que `Date.getDay()`. */
export function diaSemanaDe(dia: string): number {
  return aFecha(dia).getDay();
}

/** El lunes de la semana a la que pertenece el día. */
export function lunesDe(dia: string): string {
  const semana = diaSemanaDe(dia);
  // Domingo (0) pertenece a la semana que empezó seis días antes.
  return sumarDias(dia, semana === 0 ? -6 : 1 - semana);
}
```

- [ ] **Paso 1:** escribir `src/domain/gamificacion/__tests__/fechas.test.ts` con
      estos casos:
  - `diaLocal(new Date(2026, 8, 2, 22, 30))` → `'2026-09-02'`.
  - `diaDeIso` de una marca a las 22:00 locales devuelve ese mismo día (construir
    el ISO con `new Date(2026, 8, 2, 22, 0).toISOString()`, no con literal, para
    que la prueba no dependa de la zona horaria de la máquina).
  - `sumarDias('2026-02-28', 1)` → `'2026-03-01'`; `sumarDias('2026-01-01', -1)`
    → `'2025-12-31'`.
  - `diaSemanaDe('2026-09-02')` → `3` (miércoles).
  - `lunesDe('2026-09-02')` → `'2026-08-31'`; `lunesDe('2026-09-06')` (domingo) →
    `'2026-08-31'`; `lunesDe('2026-08-31')` → `'2026-08-31'`.
- [ ] **Paso 2:** `npm test -- src/domain/gamificacion/__tests__/fechas.test.ts`
      → falla porque el módulo no existe.
- [ ] **Paso 3:** crear `src/domain/gamificacion/fechas.ts` con el código de arriba.
- [ ] **Paso 4:** repetir el comando → pasa.
- [ ] **Paso 5:** commit `feat: fechas locales para el cálculo de rachas`.

---

## Tarea 2: Racha y estados de la semana

**Ficheros:** `src/domain/gamificacion/racha.ts`
**Test:** `src/domain/gamificacion/__tests__/racha.test.ts`

```ts
import { diaSemanaDe, lunesDe, sumarDias } from './fechas';

export type EstadoDia = 'fuego' | 'extra' | 'helado' | 'pendiente' | 'futuro' | 'descanso';

export interface DiaMarcador {
  /** YYYY-MM-DD. */
  dia: string;
  /** 0 = domingo, 6 = sábado. */
  indiceSemana: number;
  estado: EstadoDia;
}

export interface Racha {
  actual: number;
  record: number;
}

/** Tope de seguridad: nadie tiene diez años de historial en esta app. */
const MAX_DIAS = 3650;

function esDeAgenda(dia: string, agenda: number[]): boolean {
  return agenda.includes(diaSemanaDe(dia));
}

function diasDeAgendaEntre(desde: string, hasta: string, agenda: number[]): string[] {
  const lista: string[] = [];
  let cursor = desde;
  for (let paso = 0; paso < MAX_DIAS && cursor <= hasta; paso += 1) {
    if (esDeAgenda(cursor, agenda)) lista.push(cursor);
    cursor = sumarDias(cursor, 1);
  }
  return lista;
}

/** Los siete días de la semana de `hoy`, de lunes a domingo. */
export function semanaDe(
  diasEntrenados: string[],
  agenda: number[],
  hoy: string,
): DiaMarcador[] {
  const hechos = new Set(diasEntrenados);
  const lunes = lunesDe(hoy);

  return Array.from({ length: 7 }, (_, paso) => {
    const dia = sumarDias(lunes, paso);
    const entrenado = hechos.has(dia);

    let estado: EstadoDia;
    if (!esDeAgenda(dia, agenda)) estado = entrenado ? 'extra' : 'descanso';
    else if (entrenado) estado = 'fuego';
    else if (dia < hoy) estado = 'helado';
    else if (dia === hoy) estado = 'pendiente';
    else estado = 'futuro';

    return { dia, indiceSemana: diaSemanaDe(dia), estado };
  });
}

/**
 * Recorre solo los días de la agenda: un domingo de descanso no rompe nada.
 * El día de hoy, si aún está pendiente, tampoco rompe: queda tiempo de entrenar.
 */
export function calcularRacha(
  diasEntrenados: string[],
  agenda: number[],
  hoy: string,
): Racha {
  if (agenda.length === 0 || diasEntrenados.length === 0) return { actual: 0, record: 0 };

  const hechos = new Set(diasEntrenados);
  const primero = [...diasEntrenados].sort()[0] as string;

  let corriendo = 0;
  let record = 0;

  for (const dia of diasDeAgendaEntre(primero, hoy, agenda)) {
    if (hechos.has(dia)) {
      corriendo += 1;
      record = Math.max(record, corriendo);
    } else if (dia !== hoy) {
      corriendo = 0;
    }
  }

  return { actual: corriendo, record };
}
```

- [ ] **Paso 1:** escribir el test. Agenda de referencia `[1, 2, 4, 5]` (lunes,
      martes, jueves, viernes). Casos:
  - **Racha:** entrenados `['2026-08-31', '2026-09-01']` (lun y mar) con
    `hoy = '2026-09-02'` (miércoles, fuera de agenda) → `actual: 2`.
  - **El fin de semana no rompe:** entrenados viernes `2026-08-28` y lunes
    `2026-08-31`, `hoy = '2026-08-31'` → `actual: 2`.
  - **Un día de agenda fallado sí rompe:** entrenados `['2026-08-31']` (lun),
    saltado el martes, entrenado jueves `2026-09-03`, `hoy = '2026-09-03'` →
    `actual: 1`, `record: 1`.
  - **Hoy pendiente no rompe:** entrenados lun y mar, `hoy = '2026-09-03'`
    (jueves, de agenda, sin entrenar) → `actual: 2`.
  - **Récord sobrevive a una racha rota:** cuatro días seguidos de agenda, un
    hueco, y uno más → `actual: 1`, `record: 4`.
  - **Entrenar fuera de agenda no suma:** añadir un domingo entrenado a un caso
    con `actual: 2` y comprobar que sigue en `2`.
  - **Sin historial:** `calcularRacha([], [1, 3, 5], '2026-09-02')` →
    `{ actual: 0, record: 0 }`.
  - **Agenda vacía:** devuelve `{ actual: 0, record: 0 }` sin recorrer nada.
  - **Cambiar la agenda recalcula:** los mismos entrenados con agenda `[1, 3, 5]`
    dan un resultado distinto que con `[1, 2, 4, 5]`, sin tocar la entrada.
  - **Semana:** `semanaDe([], [1, 2, 4, 5], '2026-09-02')` devuelve 7 días que
    empiezan en `'2026-08-31'` con `indiceSemana` `[1,2,3,4,5,6,0]`.
  - **Los seis estados:** lunes entrenado → `fuego`; martes pasado sin entrenar →
    `helado`; miércoles fuera de agenda → `descanso`; miércoles fuera de agenda
    pero entrenado → `extra`; jueves futuro de agenda → `futuro`; y con
    `hoy` puesto en un jueves sin entrenar → `pendiente`.
  - **Un día fuera de agenda nunca sale helado**, aunque esté en el pasado.
- [ ] **Paso 2:** ejecutar → falla.
- [ ] **Paso 3:** crear `src/domain/gamificacion/racha.ts` con el código de arriba.
- [ ] **Paso 4:** `npm test -- src/domain/gamificacion/__tests__/racha.test.ts` → pasa.
- [ ] **Paso 5:** commit `feat: racha y marcador semanal sobre la agenda acordada`.

---

## Tarea 3: Hitos de la sesión

**Ficheros:** `src/domain/gamificacion/logros.ts`
**Test:** `src/domain/gamificacion/__tests__/logros.test.ts`

```ts
import type { Musculo } from '@/data/catalog/tipos';

export type Hito =
  | { tipo: 'ejercicio'; clave: string; ejercicioId: string }
  | { tipo: 'musculo'; clave: string; musculo: Musculo }
  | { tipo: 'dia'; clave: string };

export interface EstadoEjercicio {
  ejercicioId: string;
  musculoObjetivo: Musculo;
  completo: boolean;
}

/**
 * Un ejercicio normal está completo cuando tiene todas sus series. Una
 * descendente, cuando tiene el tope y al menos una bajada: son dos filas,
 * porque el tope se guarda como bajada 0.
 */
export function ejercicioCompleto(entrada: {
  esDescendente: boolean;
  seriesRegistradas: number;
  seriesMeta: number;
  bajadasRegistradas: number;
}): boolean {
  return entrada.esDescendente
    ? entrada.bajadasRegistradas >= 2
    : entrada.seriesMeta > 0 && entrada.seriesRegistradas >= entrada.seriesMeta;
}

export function claveEjercicio(sesionId: number, ejercicioId: string): string {
  return `sesion:${sesionId}:ejercicio:${ejercicioId}`;
}

export function claveMusculo(sesionId: number, musculo: Musculo): string {
  return `sesion:${sesionId}:musculo:${musculo}`;
}

export function claveDia(sesionId: number): string {
  return `sesion:${sesionId}:dia`;
}

export function prefijoSesion(sesionId: number): string {
  return `sesion:${sesionId}:`;
}

/**
 * Hitos alcanzados que aún no se han celebrado, de menor a mayor: primero el
 * ejercicio, luego el músculo, luego el día. La interfaz muestra el mayor.
 */
export function hitosNuevos(
  sesionId: number,
  estados: EstadoEjercicio[],
  yaCelebrados: Set<string>,
): Hito[] {
  const hitos: Hito[] = [];

  for (const estado of estados) {
    if (!estado.completo) continue;
    const clave = claveEjercicio(sesionId, estado.ejercicioId);
    if (!yaCelebrados.has(clave)) {
      hitos.push({ tipo: 'ejercicio', clave, ejercicioId: estado.ejercicioId });
    }
  }

  for (const musculo of [...new Set(estados.map((e) => e.musculoObjetivo))]) {
    const suyos = estados.filter((e) => e.musculoObjetivo === musculo);
    if (!suyos.every((e) => e.completo)) continue;
    const clave = claveMusculo(sesionId, musculo);
    if (!yaCelebrados.has(clave)) hitos.push({ tipo: 'musculo', clave, musculo });
  }

  if (estados.length > 0 && estados.every((e) => e.completo)) {
    const clave = claveDia(sesionId);
    if (!yaCelebrados.has(clave)) hitos.push({ tipo: 'dia', clave });
  }

  return hitos;
}
```

- [ ] **Paso 1:** escribir el test con estos casos:
  - `ejercicioCompleto` normal: 3 de 3 series → `true`; 2 de 3 → `false`.
  - `ejercicioCompleto` descendente: 2 filas → `true`; 1 fila (solo el tope) →
    `false`. Las series normales registradas no cuentan si es descendente.
  - Completar un ejercicio de dos que comparten músculo devuelve solo el hito de
    ejercicio, no el de músculo.
  - Completar el segundo devuelve el hito de músculo.
  - Completar todos los músculos del día devuelve además el hito de día.
  - Una clave ya presente en `yaCelebrados` no se devuelve.
  - Con la lista vacía no hay hito de día.
  - Las claves tienen exactamente la forma `sesion:7:ejercicio:pectorals/press`,
    `sesion:7:musculo:pectorals` y `sesion:7:dia`.
  - `prefijoSesion(7)` es prefijo de las tres.
- [ ] **Paso 2:** ejecutar → falla.
- [ ] **Paso 3:** crear `src/domain/gamificacion/logros.ts`.
- [ ] **Paso 4:** ejecutar → pasa.
- [ ] **Paso 5:** commit `feat: hitos de ejercicio, musculo y dia`.

---

## Tarea 4: Veredicto de la medición

**Ficheros:** `src/domain/gamificacion/mediciones.ts`
**Test:** `src/domain/gamificacion/__tests__/mediciones.test.ts`

```ts
import type { Objetivo } from '@/data/db/repos/perfil';
import type { Medicion, TipoMedida } from '@/data/db/repos/mediciones';

/** Por debajo de esto es ruido de báscula y de cinta métrica. */
export const UMBRAL_KG = 0.3;
export const UMBRAL_CM = 0.5;

export interface Veredicto {
  hayProgreso: boolean;
  titulo: string;
  detalle: string;
}

export interface ContextoAnimo {
  entrenamientosDelMes: number;
  rachaActual: number;
}

interface Criterio {
  medidas: TipoMedida[];
  /** -1 si progresar es bajar, 1 si es subir. */
  direccion: -1 | 1;
}

const CRITERIOS: Record<Objetivo, Criterio> = {
  definicion: { medidas: ['cintura'], direccion: -1 },
  volumen: { medidas: ['pecho', 'brazo_der', 'brazo_izq'], direccion: 1 },
  fuerza: { medidas: ['pecho', 'brazo_der', 'brazo_izq'], direccion: 1 },
};

const ETIQUETA: Partial<Record<TipoMedida, string>> = {
  cintura: 'de cintura',
  pecho: 'de pecho',
  brazo_der: 'de brazo derecho',
  brazo_izq: 'de brazo izquierdo',
};

function formatear(delta: number, unidad: string): string {
  const signo = delta > 0 ? '+' : '−';
  const valor = Math.abs(delta).toFixed(1).replace('.', ',').replace(/,0$/, '');
  return `${signo}${valor} ${unidad}`;
}

function cuenta(delta: number, direccion: -1 | 1, umbral: number): boolean {
  return Math.abs(delta) >= umbral && Math.sign(delta) === direccion;
}

export function evaluarMedicion(
  objetivo: Objetivo,
  anterior: Medicion | null,
  actual: Medicion,
  contexto: ContextoAnimo,
): Veredicto {
  if (!anterior) {
    return {
      hayProgreso: false,
      titulo: 'Punto de partida',
      detalle: 'Guardado. A partir de hoy cada medición se compara con esta.',
    };
  }

  const criterio = CRITERIOS[objetivo];
  const logros: string[] = [];

  const deltaPeso = actual.pesoKg - anterior.pesoKg;
  if (cuenta(deltaPeso, criterio.direccion, UMBRAL_KG)) {
    logros.push(formatear(deltaPeso, 'kg'));
  }

  for (const medida of criterio.medidas) {
    const antes = anterior.medidas[medida];
    const ahora = actual.medidas[medida];
    if (antes === undefined || ahora === undefined) continue;
    const delta = ahora - antes;
    if (cuenta(delta, criterio.direccion, UMBRAL_CM)) {
      logros.push(`${formatear(delta, 'cm')} ${ETIQUETA[medida] ?? ''}`.trim());
    }
  }

  if (logros.length > 0) {
    return {
      hayProgreso: true,
      titulo: '¡Vas por buen camino!',
      detalle: logros.join(' · '),
    };
  }

  const racha =
    contexto.rachaActual > 0 ? ` y una racha de ${contexto.rachaActual} días` : '';

  return {
    hayProgreso: false,
    titulo: 'Sigue ahí',
    detalle:
      'El cuerpo no cambia en línea recta. Llevas ' +
      `${contexto.entrenamientosDelMes} entrenamientos este mes${racha}: ` +
      'eso es lo que construye el resultado.',
  };
}
```

- [ ] **Paso 1:** escribir el test. Constructor de apoyo en el propio fichero:
      `const medicion = (pesoKg: number, medidas = {}): Medicion => ({ id: 1, fecha: '2026-09-02', pesoKg, notas: null, medidas });`
      Casos:
  - Sin medición anterior → `hayProgreso: false` y título `'Punto de partida'`.
  - `definicion`: 80 → 78,5 kg → progreso, detalle contiene `−1,5 kg`.
  - `definicion`: 80 → 81,5 kg (subir) → sin progreso.
  - `definicion`: cintura 90 → 88 con el peso igual → progreso con
    `−2 cm de cintura`.
  - `volumen`: 70 → 71 kg → progreso con `+1 kg`.
  - `volumen`: 70 → 69 kg → sin progreso.
  - `fuerza`: pecho 100 → 101 → progreso.
  - Umbral: 80 → 79,8 kg en `definicion` (0,2 kg) → sin progreso.
  - Umbral: cintura 90 → 89,7 (0,3 cm) → sin progreso.
  - Una medida presente en la anterior pero ausente en la actual no rompe ni
    cuenta.
  - Sin progreso con `rachaActual: 0` → el detalle no menciona racha y no
    contiene `undefined` ni `NaN`.
  - Sin progreso con `rachaActual: 5` y 12 entrenamientos → el detalle contiene
    `12 entrenamientos` y `5 días`.
- [ ] **Paso 2:** ejecutar → falla.
- [ ] **Paso 3:** crear `src/domain/gamificacion/mediciones.ts`.
- [ ] **Paso 4:** ejecutar → pasa.
- [ ] **Paso 5:** commit `feat: veredicto de la medicion segun el objetivo`.

---

## Tarea 5: Migración 004, agenda en el perfil y repositorio de logros

**Ficheros:**
- Modificar: `src/data/db/migraciones.ts`, `src/data/db/repos/perfil.ts`,
  `src/data/db/repos/sesion.ts`, `src/nucleo/contenedor.ts`
- Crear: `src/data/db/repos/logros.ts`
- Tests: `src/data/db/__tests__/migraciones.test.ts` (ampliar),
  `src/data/db/repos/__tests__/perfil.test.ts` (ampliar),
  `src/data/db/repos/__tests__/logros.test.ts` (nuevo),
  `src/data/db/repos/__tests__/sesion.test.ts` (ampliar)

**Migración 004**, al final de `MIGRACIONES`:

```ts
  // 004 — agenda semanal y logros celebrados
  [
    // CSV de índices de día (0 = domingo). Vacío = derivar de dias_por_semana.
    "ALTER TABLE perfil ADD COLUMN dias_semana TEXT NOT NULL DEFAULT ''",
    `CREATE TABLE logro (
      clave TEXT PRIMARY KEY,
      conseguido_en TEXT NOT NULL
    )`,
  ],
```

**Perfil.** Añadir `diasSemana: number[]` al interfaz y `dias_semana: string` a
`FilaPerfil`. Exportar la derivación:

```ts
/** Reparto estándar para perfiles creados antes de que existiera la agenda. */
export function agendaPorDefecto(diasPorSemana: number): number[] {
  const REPARTOS: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
  };
  return REPARTOS[Math.min(6, Math.max(1, Math.round(diasPorSemana)))] ?? [1, 3, 5];
}

function leerAgenda(csv: string, diasPorSemana: number): number[] {
  const guardados = csv
    .split(',')
    // Descartar los trozos vacíos es imprescindible: `Number('')` es 0, no NaN,
    // así que un CSV vacío se colaría como "entrena solo los domingos" y nunca
    // llegaría al reparto por defecto.
    .map((trozo) => trozo.trim())
    .filter((trozo) => trozo !== '')
    .map((trozo) => Number(trozo))
    .filter((numero) => Number.isInteger(numero) && numero >= 0 && numero <= 6);

  return guardados.length > 0
    ? [...new Set(guardados)].sort((a, b) => a - b)
    : agendaPorDefecto(diasPorSemana);
}
```

En `obtener()`: `diasSemana: leerAgenda(fila.dias_semana ?? '', fila.dias_por_semana)`.
En `guardar()`: añadir la columna `dias_semana` al INSERT, al `DO UPDATE SET` y
al array de parámetros con `perfil.diasSemana.join(',')`.

**Sesión.** Añadir al repositorio, importando `diaDeIso` de
`@/domain/gamificacion/fechas`:

```ts
    /** Días locales con al menos una sesión completada, de menor a mayor. */
    async fechasCompletadas(): Promise<string[]> {
      const filas = await adaptador.consultar<{ terminada_en: string }>(
        `SELECT terminada_en FROM sesion
         WHERE estado = 'completada' AND terminada_en IS NOT NULL`,
      );
      return [...new Set(filas.map((fila) => diaDeIso(fila.terminada_en)))].sort();
    },
```

**Logros.** `src/data/db/repos/logros.ts`:

```ts
import type { Adaptador } from '../adaptador';

/** Lista de hitos ya celebrados. Solo se pregunta si una clave existe. */
export function repoLogros(adaptador: Adaptador) {
  return {
    async marcar(clave: string): Promise<void> {
      await adaptador.ejecutar(
        `INSERT INTO logro (clave, conseguido_en) VALUES (?, ?)
         ON CONFLICT(clave) DO NOTHING`,
        [clave, new Date().toISOString()],
      );
    },

    /** Todas las claves que empiezan por el prefijo, como conjunto. */
    async claves(prefijo: string): Promise<Set<string>> {
      const filas = await adaptador.consultar<{ clave: string }>(
        'SELECT clave FROM logro WHERE clave LIKE ? ESCAPE ?',
        [`${prefijo.replace(/[%_\\]/g, '\\$&')}%`, '\\'],
      );
      return new Set(filas.map((fila) => fila.clave));
    },
  };
}
```

**Contenedor.** Importar `repoLogros`, añadir `logros: ReturnType<typeof repoLogros>`
al interfaz `Contenedor` y `logros: repoLogros(adaptador)` al objeto devuelto.

- [ ] **Paso 1:** ampliar los tests existentes y escribir el nuevo:
  - `migraciones.test.ts`: añadir `'logro'` a la lista de tablas esperadas; nuevo
    caso que migra hasta la versión 3 a mano —recorriendo
    `MIGRACIONES.slice(0, 3)` y fijando `PRAGMA user_version = 3`—, inserta un
    perfil y una sesión, migra del todo y comprueba que siguen ahí y que
    `dias_semana` vale `''`.
  - `perfil.test.ts`: añadir `diasSemana: [1, 2, 4, 5]` a la constante `PERFIL`;
    caso de ida y vuelta que comprueba `diasSemana`; caso que escribe
    `dias_semana = ''` con SQL directo sobre un perfil de `diasPorSemana: 3` y
    espera `[1, 3, 5]` al leer; el mismo caso con basura y separadores sueltos
    (`',,x,'`) también espera `[1, 3, 5]`; caso de `agendaPorDefecto(4)` →
    `[1, 2, 4, 5]` y `agendaPorDefecto(9)` → `[1, 2, 3, 4, 5, 6]`.
  - `logros.test.ts`: marcar y leer con prefijo; marcar dos veces la misma clave
    no duplica ni lanza; `claves('sesion:7:')` no trae las de `sesion:70:`;
    prefijo sin resultados devuelve un conjunto vacío.
  - `sesion.test.ts`: `fechasCompletadas()` agrupa dos sesiones del mismo día en
    una sola fecha, ignora los borradores y devuelve las fechas ordenadas.
- [ ] **Paso 2:** ejecutar los cuatro ficheros → fallan.
- [ ] **Paso 3:** aplicar los cambios de este apartado.
- [ ] **Paso 4:** `npm test -- src/data` → pasa. `npx tsc --noEmit` → limpio
      salvo los errores esperados en `app/onboarding.tsx` por el `Perfil` sin
      `diasSemana`, que se arreglan en la tarea 6.
- [ ] **Paso 5:** commit `feat: migracion 004 con agenda semanal y logros`.

---

## Tarea 6: Selector de agenda en onboarding y ajustes

**Ficheros:**
- Crear: `src/ui/componentes/SelectorDias.tsx`
- Test: `src/ui/componentes/__tests__/SelectorDias.test.tsx`
- Modificar: `app/onboarding.tsx`, `app/(tabs)/ajustes.tsx`

```tsx
import { Text, View } from 'react-native';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

/** Índice 0 = domingo, para cuadrar con `Date.getDay()`. */
const ETIQUETAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

export const MIN_DIAS = 2;
export const MAX_DIAS = 6;

/** Chips de lunes a domingo. Devuelve siempre la agenda ordenada. */
export function SelectorDias({
  seleccionados,
  onCambio,
}: {
  seleccionados: number[];
  onCambio: (dias: number[]) => void;
}) {
  function alternar(dia: number) {
    const activo = seleccionados.includes(dia);
    if (activo && seleccionados.length <= MIN_DIAS) return;
    if (!activo && seleccionados.length >= MAX_DIAS) return;

    const siguiente = activo
      ? seleccionados.filter((d) => d !== dia)
      : [...seleccionados, dia];

    onCambio([...siguiente].sort((a, b) => a - b));
  }

  return (
    <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
      {ORDEN.map((dia) => {
        const activo = seleccionados.includes(dia);
        return (
          <Text
            key={dia}
            testID={`dia-agenda-${dia}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => alternar(dia)}
            style={{
              ...tipografia.cuerpo,
              width: 38,
              paddingVertical: espaciado.sm,
              borderRadius: radio.sm,
              overflow: 'hidden',
              textAlign: 'center',
              backgroundColor: activo ? colores.acento : colores.superficieAlta,
              color: activo ? colores.acentoTexto : colores.texto,
            }}
          >
            {ETIQUETAS[dia]}
          </Text>
        );
      })}
    </View>
  );
}
```

**Onboarding.** Sustituir el estado `diasPorSemana` por
`const [agenda, setAgenda] = useState<number[]>([1, 3, 5]);`. En el bloque *Días
por semana*, cambiar el título a `Qué días entrenas` y el componente `Opciones`
por `<SelectorDias seleccionados={agenda} onCambio={setAgenda} />`, con un
`Text` tenue debajo: `Entre 2 y 6 días. Tu racha solo cuenta estos días.` En
`terminar()`, poner `diasPorSemana: agenda.length` y `diasSemana: agenda`.

**Ajustes.** Añadir bajo `<Text style={tipografia.seccion}>Programa</Text>`:
estado `const [agenda, setAgenda] = useState<number[]>([]);` cargado en el
`useEffect` existente con `perfil.obtener()`, el `SelectorDias`, y un botón
`guardar-agenda` que llama a
`perfil.guardar({ ...miPerfil, diasSemana: agenda, diasPorSemana: agenda.length })`
y pone `mensaje` en `Agenda guardada.` El `useEffect` necesita `perfil` en su
lista de dependencias.

- [ ] **Paso 1:** escribir `SelectorDias.test.tsx`: pinta siete chips empezando
      por la L; tocar un chip inactivo lo añade y devuelve la lista ordenada;
      tocar uno activo lo quita; con dos seleccionados, tocar uno activo no lo
      quita; con seis, tocar uno inactivo no lo añade.
- [ ] **Paso 2:** ejecutar → falla.
- [ ] **Paso 3:** crear el componente y aplicar los cambios de onboarding y ajustes.
- [ ] **Paso 4:** `npm test -- src/ui/componentes/__tests__/SelectorDias.test.tsx`
      → pasa. `npx tsc --noEmit` → limpio.
- [ ] **Paso 5:** commit `feat: elegir los dias de la semana que se entrena`.

---

## Tarea 7: Marcador semanal en la pantalla Hoy

**Ficheros:**
- Crear: `src/ui/componentes/MarcadorSemanal.tsx`
- Test: `src/ui/componentes/__tests__/MarcadorSemanal.test.tsx`
- Modificar: `app/(tabs)/hoy.tsx`

```tsx
import { Text, View } from 'react-native';
import type { DiaMarcador, EstadoDia } from '@/domain/gamificacion/racha';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const ICONO: Record<EstadoDia, string> = {
  fuego: '🔥',
  extra: '🔥',
  helado: '🧊',
  pendiente: '',
  futuro: '',
  descanso: '',
};

const FONDO: Record<EstadoDia, string> = {
  fuego: colores.acento,
  extra: colores.superficieAlta,
  helado: colores.superficieAlta,
  pendiente: 'transparent',
  futuro: colores.superficie,
  descanso: 'transparent',
};

export function MarcadorSemanal({
  dias,
  racha,
  record,
}: {
  dias: DiaMarcador[];
  racha: number;
  record: number;
}) {
  return (
    <View style={{ gap: espaciado.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {dias.map((dia) => (
          <View key={dia.dia} style={{ alignItems: 'center', gap: espaciado.xs }}>
            <Text style={tipografia.tenue}>{LETRAS[dia.indiceSemana]}</Text>
            <View
              testID={`marcador-${dia.indiceSemana}`}
              accessibilityLabel={`${LETRAS[dia.indiceSemana]}: ${dia.estado}`}
              style={{
                width: 34,
                height: 34,
                borderRadius: radio.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: FONDO[dia.estado],
                borderWidth: dia.estado === 'pendiente' ? 2 : 1,
                borderColor:
                  dia.estado === 'pendiente' ? colores.acento : colores.borde,
                opacity: dia.estado === 'descanso' || dia.estado === 'extra' ? 0.55 : 1,
              }}
            >
              <Text style={{ fontSize: 16 }}>{ICONO[dia.estado]}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text testID="texto-racha" style={tipografia.tenue}>
        {racha > 0
          ? `🔥 ${racha} ${racha === 1 ? 'día' : 'días'} de racha · récord ${record}`
          : 'Entrena hoy y empieza tu racha'}
      </Text>
    </View>
  );
}
```

**Hoy.** En la carga, añadir `sesion.fechasCompletadas()` al `Promise.all` y
guardar `diasEntrenados`. Calcular con `useMemo`, a partir de `datosPerfil`:

```ts
const hoyLocal = diaLocal(new Date());
const agenda = datosPerfil?.diasSemana ?? [];
const dias = semanaDe(diasEntrenados, agenda, hoyLocal);
const { actual, record } = calcularRacha(diasEntrenados, agenda, hoyLocal);
```

Y renderizar `<MarcadorSemanal dias={dias} racha={actual} record={record} />`
dentro de una tarjeta, justo debajo del bloque del saludo.

- [ ] **Paso 1:** escribir `MarcadorSemanal.test.tsx`: pinta siete círculos;
      un día `fuego` lleva 🔥; uno `helado` lleva 🧊; uno `pendiente` no lleva
      icono; con `racha: 0` el texto invita a empezar; con `racha: 1` dice
      `1 día` en singular; con `racha: 5` y `record: 12` el texto contiene ambos.
- [ ] **Paso 2:** ejecutar → falla.
- [ ] **Paso 3:** crear el componente y enchufarlo en `hoy.tsx`.
- [ ] **Paso 4:** ejecutar → pasa. `npx tsc --noEmit` → limpio.
- [ ] **Paso 5:** commit `feat: marcador semanal con racha en la pantalla hoy`.

---

## Tarea 8: Confeti y celebración

**Ficheros:**
- Crear: `src/ui/componentes/Celebracion.tsx`
- Test: `src/ui/componentes/__tests__/Celebracion.test.tsx`
- Modificar: `package.json` (vía `npx expo install expo-haptics`)

- [ ] **Paso 1:** instalar la dependencia con la versión que fija el SDK:
      `npx expo install expo-haptics`. Comprobar que `package.json` la lista y
      que no cambia ninguna otra versión.

- [ ] **Paso 2:** escribir `Celebracion.test.tsx`. Mockear el módulo nativo al
      principio del fichero, porque en Jest no hay motor háptico:

```tsx
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
```

Casos: con `visible={false}` no pinta el título; con `visible` pinta título y
detalle; en nivel `grande` pinta piezas de confeti (`getAllByTestId(/^confeti-/)`
con longitud mayor que cero); en nivel `chico` no pinta ninguna; al aparecer
llama a `notificationAsync`; tocar el fondo (`testID="cerrar-celebracion"`)
dispara `onCerrar`.

- [ ] **Paso 3:** crear el componente.

```tsx
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SiluetaMuscular, vistaPara } from '@/ui/componentes/SiluetaMuscular';
import type { Musculo } from '@/data/catalog/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export type NivelCelebracion = 'chico' | 'medio' | 'grande';

const { width: ANCHO, height: ALTO } = Dimensions.get('window');

const PIEZAS: Record<NivelCelebracion, number> = { chico: 0, medio: 16, grande: 32 };
const DURACION: Record<NivelCelebracion, number> = { chico: 900, medio: 1600, grande: 2200 };
const PALETA = [colores.acento, colores.exito, colores.aviso, colores.texto];

function Pieza({ indice, total, duracion }: { indice: number; total: number; duracion: number }) {
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(avance, {
      toValue: 1,
      duration: duracion,
      delay: (indice % 8) * 60,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [avance, duracion, indice]);

  const desplazamiento = avance.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, ALTO],
  });
  const giro = avance.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${(indice % 2 === 0 ? 1 : -1) * 720}deg`],
  });

  return (
    <Animated.View
      testID={`confeti-${indice}`}
      style={{
        position: 'absolute',
        left: ((indice + 0.5) / total) * ANCHO,
        width: 8,
        height: 14,
        borderRadius: 2,
        backgroundColor: PALETA[indice % PALETA.length],
        opacity: avance.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [{ translateY: desplazamiento }, { rotate: giro }],
      }}
    />
  );
}

/**
 * Overlay de celebración. Se cierra solo, y también al tocar: nunca bloquea al
 * usuario en mitad de una serie.
 */
export function Celebracion({
  visible,
  nivel,
  titulo,
  detalle,
  musculo,
  onCerrar,
}: {
  visible: boolean;
  nivel: NivelCelebracion;
  titulo: string;
  detalle?: string;
  musculo?: Musculo;
  onCerrar: () => void;
}) {
  useEffect(() => {
    if (!visible) return;

    if (nivel === 'chico') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const temporizador = setTimeout(onCerrar, DURACION[nivel] + 400);
    return () => clearTimeout(temporizador);
  }, [visible, nivel, onCerrar]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable
        testID="cerrar-celebracion"
        onPress={onCerrar}
        style={{
          flex: 1,
          backgroundColor: '#0E1116E6',
          alignItems: 'center',
          justifyContent: 'center',
          padding: espaciado.lg,
          gap: espaciado.md,
        }}
      >
        {Array.from({ length: PIEZAS[nivel] }, (_, indice) => (
          <Pieza
            key={indice}
            indice={indice}
            total={PIEZAS[nivel]}
            duracion={DURACION[nivel]}
          />
        ))}

        {musculo && (
          <SiluetaMuscular
            principales={[musculo]}
            secundarios={[]}
            vista={vistaPara([musculo])}
            ancho={130}
          />
        )}

        <Text
          testID="titulo-celebracion"
          style={{ ...tipografia.titulo, textAlign: 'center' }}
        >
          {titulo}
        </Text>

        {detalle !== undefined && detalle !== '' && (
          <Text
            testID="detalle-celebracion"
            style={{
              ...tipografia.cuerpo,
              textAlign: 'center',
              color: colores.textoTenue,
              backgroundColor: colores.superficie,
              borderRadius: radio.md,
              padding: espaciado.md,
              overflow: 'hidden',
            }}
          >
            {detalle}
          </Text>
        )}
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Paso 4:** `npm test -- src/ui/componentes/__tests__/Celebracion.test.tsx`
      → pasa.
- [ ] **Paso 5:** commit `feat: overlay de celebracion con confeti y haptica`.

---

## Tarea 9: Extraer el hook y la tarjeta de la pantalla de sesión

Refactor puro: **no cambia ningún comportamiento**. Se hace antes de tocar la
navegación para no mezclar movimiento de código con cambios de lógica.

**Ficheros:**
- Crear: `src/ui/hooks/useSesion.ts`, `src/ui/componentes/TarjetaEjercicio.tsx`
- Modificar: `app/sesion/[sesionId].tsx`

`useSesion(identificador: number)` mueve, tal cual, el `useEffect` de carga, los
estados (`ejercicios`, `nombreDia`, `metas`, `metasDescendentes`, `descendentes`,
`hechas`, `bajadas`, `datosPerfil`) y los callbacks (`confirmar`,
`confirmarBajada`, `quitarBajada`, `alternarDescendente`). Devuelve todo eso más
`descanso` y `setDescanso`.

`TarjetaEjercicio` recibe `{ ejercicio, ficha, meta, metaDesc, perfil, esDescendente,
hechas, bajadas, onConfirmar, onConfirmarBajada, onQuitarBajada, onAlternarDescendente,
ancho }` y devuelve el `ScrollView` que hoy está dentro de `renderItem`, con el
mismo marcado y los mismos `testID`.

- [ ] **Paso 1:** `npm test` para dejar constancia del estado verde de partida.
- [ ] **Paso 2:** crear `src/ui/hooks/useSesion.ts` moviendo el código sin
      modificarlo.
- [ ] **Paso 3:** crear `src/ui/componentes/TarjetaEjercicio.tsx` moviendo el
      marcado sin modificarlo.
- [ ] **Paso 4:** reescribir `app/sesion/[sesionId].tsx` usando ambos. Debe
      quedar por debajo de 130 líneas. `npm test` sigue verde y
      `npx tsc --noEmit` limpio.
- [ ] **Paso 5:** commit `refactor: extraer useSesion y TarjetaEjercicio`.

---

## Tarea 10: Barra de navegación entre ejercicios

**Ficheros:**
- Crear: `src/ui/componentes/BarraEjercicios.tsx`
- Test: `src/ui/componentes/__tests__/BarraEjercicios.test.tsx`
- Modificar: `app/sesion/[sesionId].tsx`

```tsx
import { Pressable, Text, View } from 'react-native';
import { Boton } from '@/ui/componentes/Boton';
import { colores, espaciado } from '@/ui/tema';

/**
 * Puntos de posición y avance. El botón de terminar solo aparece en el último
 * ejercicio: pulsarlo por error era lo que cerraba la sesión entera.
 */
export function BarraEjercicios({
  total,
  indice,
  completos,
  onAnterior,
  onSiguiente,
  onTerminar,
  onIrA,
}: {
  total: number;
  indice: number;
  completos: boolean[];
  onAnterior: () => void;
  onSiguiente: () => void;
  onTerminar: () => void;
  onIrA: (indice: number) => void;
}) {
  const esUltimo = indice >= total - 1;

  return (
    <View style={{ padding: espaciado.lg, gap: espaciado.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: espaciado.sm }}>
        {Array.from({ length: total }, (_, posicion) => (
          <Pressable
            key={posicion}
            testID={`punto-${posicion}`}
            accessibilityRole="button"
            accessibilityState={{ selected: posicion === indice }}
            onPress={() => onIrA(posicion)}
            style={{
              width: posicion === indice ? 24 : 10,
              height: 10,
              borderRadius: 5,
              backgroundColor:
                posicion === indice
                  ? colores.acento
                  : completos[posicion]
                    ? colores.exito
                    : colores.borde,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        {indice > 0 && (
          <View style={{ width: 96 }}>
            <Boton
              testID="ejercicio-anterior"
              titulo="‹ Anterior"
              variante="secundario"
              onPress={onAnterior}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {esUltimo ? (
            <Boton testID="terminar-sesion" titulo="Terminar entrenamiento" onPress={onTerminar} />
          ) : (
            <Boton testID="siguiente-ejercicio" titulo="Siguiente ejercicio" onPress={onSiguiente} />
          )}
        </View>
      </View>
    </View>
  );
}
```

**Pantalla de sesión.** Añadir:

```tsx
const lista = useRef<FlatList<EjercicioDia>>(null);
const [indice, setIndice] = useState(0);

const completos = ejercicios.map((ejercicio) =>
  ejercicioCompleto({
    esDescendente: descendentes.has(ejercicio.ejercicioId),
    seriesRegistradas: (hechas[ejercicio.ejercicioId] ?? []).length,
    seriesMeta: metas[ejercicio.ejercicioId]?.series ?? ejercicio.series,
    bajadasRegistradas: (bajadas[ejercicio.ejercicioId] ?? []).length,
  }),
);

function irA(destino: number) {
  const limitado = Math.max(0, Math.min(ejercicios.length - 1, destino));
  setIndice(limitado);
  lista.current?.scrollToIndex({ index: limitado, animated: true });
}

function siguiente() {
  if (completos[indice]) return irA(indice + 1);

  const ficha = catalogo.porId(ejercicios[indice]?.ejercicioId ?? '');
  Alert.alert(
    'Te faltan series',
    `Aún no has confirmado todas las series de ${ficha?.nombre ?? 'este ejercicio'}.`,
    [
      { text: 'Quedarme', style: 'cancel' },
      { text: 'Seguir igual', onPress: () => irA(indice + 1) },
    ],
  );
}

function terminar() {
  const pendientes = completos.filter((completo) => !completo).length;
  if (pendientes === 0) return router.replace(`/resumen/${identificador}`);

  Alert.alert(
    'Quedan ejercicios',
    `Te faltan ${pendientes} ${pendientes === 1 ? 'ejercicio' : 'ejercicios'} del día.`,
    [
      { text: 'Seguir entrenando', style: 'cancel' },
      { text: 'Terminar igual', onPress: () => router.replace(`/resumen/${identificador}`) },
    ],
  );
}
```

En la `FlatList`: `ref={lista}` y
`onMomentumScrollEnd={(evento) => setIndice(Math.round(evento.nativeEvent.contentOffset.x / ANCHO))}`.
En la cabecera, sustituir el texto de series por
`Ejercicio {indice + 1} de {ejercicios.length} · {seriesHechas} de {totalSeries} series`.
Al final, cambiar el `View` con el botón por
`<BarraEjercicios total={ejercicios.length} indice={indice} completos={completos} onAnterior={() => irA(indice - 1)} onSiguiente={siguiente} onTerminar={terminar} onIrA={irA} />`.

- [ ] **Paso 1:** escribir `BarraEjercicios.test.tsx`: con `indice: 0` de 3 pinta
      `siguiente-ejercicio` y no `terminar-sesion`; con `indice: 2` de 3 pinta
      `terminar-sesion` y no `siguiente-ejercicio`; con `indice: 0` no pinta
      `ejercicio-anterior`; con `indice: 1` sí; pinta un punto por ejercicio;
      tocar `punto-2` llama a `onIrA` con `2`; pulsar el botón principal llama al
      callback correspondiente.
- [ ] **Paso 2:** ejecutar → falla.
- [ ] **Paso 3:** crear el componente y aplicar los cambios de la pantalla.
- [ ] **Paso 4:** ejecutar → pasa. `npx tsc --noEmit` limpio. Verificación
      manual con `npm start`: entrar en una sesión, comprobar que el botón dice
      *Siguiente ejercicio*, que avanza, que avisa si faltan series y que en el
      último aparece *Terminar entrenamiento*.
- [ ] **Paso 5:** commit `feat: navegacion entre ejercicios con aviso de series pendientes`.

---

## Tarea 11: Celebraciones dentro de la sesión

**Ficheros:** `app/sesion/[sesionId].tsx`

Estado y efecto, usando `logros` del contenedor:

```tsx
const { catalogo, logros } = useApp();
const [celebrados, setCelebrados] = useState<Set<string>>(new Set());
const [celebracion, setCelebracion] = useState<{
  nivel: NivelCelebracion;
  titulo: string;
  detalle?: string;
  musculo?: Musculo;
} | null>(null);
```

Cargar lo ya celebrado al abrir:

```tsx
useEffect(() => {
  let vivo = true;
  logros.claves(prefijoSesion(identificador)).then((claves) => {
    if (vivo) setCelebrados(claves);
  });
  return () => {
    vivo = false;
  };
}, [identificador, logros]);
```

Tras confirmar una serie o una bajada, revisar hitos. Se llama desde un
`useEffect` que depende de `completos.join(',')`, para que corra después de que
el estado se haya actualizado:

```tsx
useEffect(() => {
  if (ejercicios.length === 0) return;

  const estados = ejercicios.map((ejercicio, posicion) => ({
    ejercicioId: ejercicio.ejercicioId,
    musculoObjetivo: ejercicio.musculoObjetivo,
    completo: completos[posicion] ?? false,
  }));

  const nuevos = hitosNuevos(identificador, estados, celebrados);
  if (nuevos.length === 0) return;

  const mayor = nuevos[nuevos.length - 1] as Hito;
  for (const hito of nuevos) void logros.marcar(hito.clave);
  setCelebrados((anterior) => new Set([...anterior, ...nuevos.map((h) => h.clave)]));

  if (mayor.tipo === 'ejercicio') {
    setCelebracion({
      nivel: 'medio',
      titulo: `¡${catalogo.porId(mayor.ejercicioId)?.nombre ?? 'Ejercicio'} completo!`,
    });
  } else if (mayor.tipo === 'musculo') {
    setCelebracion({
      nivel: 'grande',
      titulo: `¡${nombreMusculo(mayor.musculo)} completo!`,
      detalle: 'Todos los ejercicios de ese músculo, hechos.',
      musculo: mayor.musculo,
    });
  } else {
    setCelebracion({
      nivel: 'grande',
      titulo: '¡Día completo!',
      detalle: 'Pulsa Terminar entrenamiento para cerrarlo.',
    });
  }
  // `completos` se compara por contenido: es un array nuevo en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [completos.join(','), ejercicios, identificador, celebrados, logros, catalogo]);
```

En `confirmar` (dentro de `useSesion`), tras registrar la serie, añadir la
vibración ligera de la serie suelta:
`void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);`

Y al final del árbol de la pantalla:

```tsx
<Celebracion
  visible={celebracion !== null}
  nivel={celebracion?.nivel ?? 'medio'}
  titulo={celebracion?.titulo ?? ''}
  detalle={celebracion?.detalle}
  musculo={celebracion?.musculo}
  onCerrar={() => setCelebracion(null)}
/>
```

- [ ] **Paso 1:** ejecutar `npm test` para partir de verde.
- [ ] **Paso 2:** aplicar los cambios.
- [ ] **Paso 3:** `npx tsc --noEmit` limpio y `npm test` verde.
- [ ] **Paso 4:** verificación manual con `npm start`: completar todas las series
      de un ejercicio y ver el confeti; completar el segundo ejercicio del mismo
      músculo y ver la silueta; salir de la sesión y volver a entrar sin que se
      repitan las celebraciones.
- [ ] **Paso 5:** commit `feat: celebrar ejercicio, musculo y dia dentro de la sesion`.

---

## Tarea 12: Resumen con confeti y racha

**Ficheros:** `app/resumen/[sesionId].tsx`

Tras `cerrarSesion`, cargar perfil y fechas y calcular la racha:

```tsx
const [racha, setRacha] = useState<Racha>({ actual: 0, record: 0 });

useEffect(() => {
  let vivo = true;
  (async () => {
    const [miPerfil, fechas] = await Promise.all([
      perfil.obtener(),
      sesion.fechasCompletadas(),
    ]);
    if (!vivo || !miPerfil) return;
    setRacha(calcularRacha(fechas, miPerfil.diasSemana, diaLocal(new Date())));
  })();
  return () => {
    vivo = false;
  };
}, [perfil, sesion, resumen]);
```

La dependencia en `resumen` hace que la racha se calcule después de que
`cerrarSesion` haya marcado la sesión como completada, que es lo que la mete en
`fechasCompletadas()`.

Añadir la `Celebracion` de nivel `grande` visible cuando `resumen !== null`, con
título `'¡Entrenamiento terminado!'` y detalle
`` `${resumen.seriesCompletadas} series · ${Math.round(resumen.volumenKg)} kg` ``.
Añadir una línea `testID="racha-resumen"` con
`` `🔥 ${racha.actual} días de racha` `` cuando `racha.actual > 0`, y marcar la
racha con `logros.marcar(\`racha:${racha.actual}\`)` para no volver a celebrarla.

- [ ] **Paso 1:** `npm test` de partida.
- [ ] **Paso 2:** aplicar los cambios.
- [ ] **Paso 3:** `npx tsc --noEmit` limpio y `npm test` verde.
- [ ] **Paso 4:** verificación manual: terminar una sesión y ver confeti, series,
      volumen y racha.
- [ ] **Paso 5:** commit `feat: confeti y racha en el resumen del entrenamiento`.

---

## Tarea 13: Mensaje al registrar la medición

**Ficheros:** `app/medicion.tsx`

`guardar()` deja de llamar a `router.back()` directo. En su lugar:

```tsx
const [veredicto, setVeredicto] = useState<Veredicto | null>(null);

async function guardar() {
  if (pesoKg === null || guardando) return;
  setGuardando(true);

  const historial = await mediciones.historial();
  const anterior = historial[historial.length - 1] ?? null;

  const nueva: Medicion = {
    id: 0,
    fecha: diaLocal(new Date()),
    pesoKg,
    notas: null,
    medidas: valores,
  };
  await mediciones.guardar(nueva);

  const [miPerfil, fechas] = await Promise.all([
    perfil.obtener(),
    sesion.fechasCompletadas(),
  ]);
  const hoy = diaLocal(new Date());
  const agenda = miPerfil?.diasSemana ?? [];
  const desdeHaceUnMes = sumarDias(hoy, -30);

  setVeredicto(
    evaluarMedicion(miPerfil?.objetivo ?? 'volumen', anterior, nueva, {
      entrenamientosDelMes: fechas.filter((fecha) => fecha >= desdeHaceUnMes).length,
      rachaActual: calcularRacha(fechas, agenda, hoy).actual,
    }),
  );
}
```

`mediciones.guardar` recibe `MedicionNueva`, que es `Medicion` sin `id`: pasarle
`nueva` sobra un campo, así que se le pasa
`{ fecha: nueva.fecha, pesoKg, notas: null, medidas: valores }` y el objeto
`nueva` se usa solo para evaluar.

Con progreso se muestra `<Celebracion nivel="grande" ...>`; sin progreso, una
tarjeta con el título y el detalle y un botón `volver-medicion` que hace
`router.back()`. En ambos casos el usuario sale con un toque.

- [ ] **Paso 1:** `npm test` de partida.
- [ ] **Paso 2:** aplicar los cambios. `medicion.tsx` necesita `perfil` y
      `sesion` de `useApp()`.
- [ ] **Paso 3:** `npx tsc --noEmit` limpio y `npm test` verde.
- [ ] **Paso 4:** verificación manual: guardar una medición con menos peso
      teniendo objetivo `definicion` y ver la celebración; guardar otra idéntica
      y ver el mensaje alentador con el número real de entrenamientos.
- [ ] **Paso 5:** commit `feat: mensaje de progreso al registrar la medicion`.

---

## Tarea 14: Verificación final

- [ ] **Paso 1:** `npm test` — toda la batería en verde.
- [ ] **Paso 2:** `npx tsc --noEmit` — sin errores.
- [ ] **Paso 3:** `npm start` y recorrer el flujo entero en el dispositivo:
      onboarding con agenda → pantalla Hoy con marcador → sesión completa con
      *Siguiente ejercicio*, avisos y celebraciones → resumen → medición.
- [ ] **Paso 4:** actualizar `README.md` con la agenda semanal, la racha y las
      celebraciones en la lista de funciones, y subir la versión a `1.2.0` en
      `package.json` y `app.json`.
- [ ] **Paso 5:** commit `chore: version 1.2.0 con navegacion guiada y gamificacion`.
