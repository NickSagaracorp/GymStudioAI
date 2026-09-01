# GymStudioAI — Fase 1: entrenamiento guiado con mancuernas

- **Fecha:** 2026-08-31
- **Estado:** aprobado, listo para plan de implementación
- **Alcance:** arquitectura completa de la app + módulo de entrenamiento guiado

## 1. Objetivo

App móvil que arma y guía un programa de entrenamiento con mancuernas para tres
objetivos (volumen, definición, fuerza), muestra los ejercicios del día en un
slider con su animación y el músculo trabajado, registra series con meta y logro,
y lleva el seguimiento semanal de peso y medidas corporales.

Todo el entrenamiento funciona sin internet. La app no tiene servidor ni cuentas:
los datos viven en el dispositivo.

## 2. Alcance

### Dentro de la fase 1

- Onboarding con datos personales, objetivo y equipamiento disponible.
- Generación local del programa (motor de reglas determinista).
- Programa numerado por semanas y días, con mesociclos de 4 semanas.
- Sesión guiada: slider de ejercicios, animación, silueta muscular, tabla de
  series con meta y logro, cronómetro de descanso, resumen final.
- Progresión automática de cargas por doble progresión.
- Retos con objetivo medible, fecha límite y barra de progreso.
- Seguimiento semanal de peso y medidas corporales con gráficas.
- Pantalla de ajustes, incluida la casilla para la API key de OpenAI (guardada,
  aún sin uso en esta fase).
- Caché de animaciones y descarga anticipada del plan.

### Fuera de la fase 1

Nutrición y análisis de fotos con IA, plan de alimentación, racha y calendario de
días, insignias y récords personales, equipamiento distinto de mancuernas y peso
corporal, sincronización en la nube, compartir entrenamientos.

La capa de IA se deja preparada arquitectónicamente (servicio aislado y
almacenamiento seguro de la clave) para que la fase 2 no obligue a rehacer nada.

## 3. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Plataforma | React Native + Expo, iOS y Android |
| Generación del plan | Motor de reglas local y determinista |
| Equipamiento | Mancuernas + catálogo completo de peso corporal |
| Granularidad muscular | Grupo muscular (sin cabezas musculares en v1) |
| Progresión | Doble progresión automática |
| Gamificación | Programa por semanas + retos con objetivo |
| Visualización anatómica | Silueta SVG con músculos resaltados |
| Seguimiento corporal | Peso + 9 medidas, día fijo semanal con aviso |
| Assets | Metadata y miniaturas empaquetadas, GIFs bajo demanda |
| Idioma | Español |

## 4. Fuente de datos: el catálogo de ejercicios

Origen: `github.com/JahelCuadrado/ExerciseGymGifsDB`, consumido por jsDelivr con
**la versión fijada en `@v1.1.0`**. Nunca se apunta a `main`: un cambio en el repo
no puede romper la app en producción.

Base: `https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0`

El catálogo se descarga **en tiempo de compilación**, no en ejecución. El script
`scripts/build-catalog.mjs` toma `/api/es/equipment/dumbbell.json` y
`/api/es/equipment/bodyweight.json`, aplica los filtros de abajo y produce
`assets/catalog/ejercicios.json` más las miniaturas.

### Filtros aplicados

1. `category === "strength"` — descarta estiramientos, cardio y pliometría, que
   el catálogo de peso corporal mezcla con los ejercicios de fuerza.
2. Lista negra por palabra clave en el slug: `bosu`, `exercise-ball`,
   `stability`, `stork`, `bowling`, `v-sit`, `arm-blaster`. Son variantes
   inestables o con material raro que no deben entrar en un plan generado.

Los ejercicios excluidos siguen accesibles desde el buscador manual; lo que el
filtro decide es qué puede elegir el generador.

### Cobertura resultante

666 ejercicios. Por músculo (mancuerna / peso corporal):

| Músculo | Manc. | Corp. | Músculo | Manc. | Corp. |
|---|---|---|---|---|---|
| biceps | 63 | 5 | glutes | 17 | 48 |
| delts | 59 | 6 | quads | 5 | 19 |
| triceps | 38 | 35 | hamstrings | 1 | 15 |
| pectorals | 28 | 50 | calves | 7 | 18 |
| upper-back | 10 | 21 | abs | 1 | 108 |
| lats | 0 | 39 | traps | 4 | 2 |

El catálogo de mancuernas por sí solo no tiene dorsales, isquiotibiales ni
abdominales utilizables. Por eso se incorpora el de peso corporal: no es una
ampliación de alcance, es lo que hace viable un programa equilibrado.

### Campos que aporta cada ejercicio

`id` (`musculo/slug`), `slug`, `name` en español, `muscle`, `bodyPart`,
`equipment`, `category`, `secondaryMuscles`, `file`, `gifUrl`.

**Limitación conocida:** el campo `instructions` del repo es texto genérico
idéntico para todos los ejercicios ("Activa el core antes de iniciar el
movimiento…"). No aporta valor y **no se muestra en v1**. En la pantalla de
ejercicio se muestra la animación, el músculo y los secundarios. La técnica real
se resuelve en fase 2 con un botón "Explicar técnica" que consulta la IA y
guarda el resultado en base de datos.

## 5. Arquitectura

### Stack

| Pieza | Elección |
|---|---|
| Runtime | React Native + Expo SDK 54, TypeScript en modo estricto |
| Navegación | expo-router |
| Estado de sesión | Zustand |
| Base de datos | expo-sqlite con migraciones numeradas |
| Ficheros y caché | expo-file-system |
| Clave de API | expo-secure-store |
| Anatomía | react-native-svg |
| Gráficas | react-native-svg (componentes propios, sin librería pesada) |
| Avisos | expo-notifications (solo notificaciones locales) |

### Capas

| Capa | Responsabilidad | Depende de |
|---|---|---|
| `data/catalog` | Carga el JSON empaquetado y expone consultas (`porMusculo`, `porEquipamiento`, `buscar`, `porId`). Solo lectura, sin estado. | — |
| `data/db` | SQLite: esquema, migraciones y repositorios tipados por entidad. | — |
| `domain/planner` | Genera el programa, elige ejercicios, calcula metas de serie y evalúa retos. **Funciones puras.** | interfaces de catalog y db |
| `services` | Caché de GIFs, notificaciones locales, y (fase 2) el cliente de IA. | — |
| `ui` | Pantallas y componentes. No contiene lógica de entrenamiento. | todas |

`domain/planner` no importa React, ni la base de datos concreta, ni la red.
Recibe datos y devuelve datos. Ahí está el riesgo real del proyecto y por eso se
testea al completo sin simulador.

### Estructura de carpetas

```
app/                        rutas de expo-router
  (tabs)/hoy.tsx
  (tabs)/programa.tsx
  (tabs)/progreso.tsx
  (tabs)/ajustes.tsx
  onboarding/[paso].tsx
  sesion/[sesionId].tsx
  ejercicio/[ejercicioId].tsx
src/
  data/catalog/             ejercicios.ts, consultas.ts, tipos.ts
  data/db/                  esquema.sql, migraciones.ts, repos/*.ts
  domain/planner/           splits.ts, parametros.ts, seleccion.ts,
                            progresion.ts, programa.ts, retos.ts
  services/                 cacheGifs.ts, avisos.ts, ia/ (fase 2)
  ui/componentes/           SiluetaMuscular.tsx, TablaSeries.tsx,
                            CronometroDescanso.tsx, GifEjercicio.tsx,
                            Grafica.tsx, BarraProgreso.tsx
  ui/tema/                  colores.ts, tipografia.ts, espaciado.ts
assets/
  catalog/ejercicios.json
  thumbs/                   666 .webp + index.ts (mapa de requires)
scripts/build-catalog.mjs
```

## 6. Modelo de datos

SQLite, migraciones numeradas desde la 001. Todas las fechas en ISO 8601 local.

```sql
perfil
  id INTEGER PK CHECK(id = 1)      -- fila única
  nombre TEXT
  sexo TEXT                        -- hombre|mujer|otro
  fecha_nac TEXT
  altura_cm REAL
  nivel TEXT                       -- principiante|intermedio|avanzado
  objetivo TEXT                    -- volumen|definicion|fuerza
  dias_por_semana INTEGER          -- 2..6
  mancuerna_min_kg REAL
  mancuerna_max_kg REAL
  incremento_kg REAL               -- salto real entre mancuernas (p.ej. 2)
  tiene_banco INTEGER
  tiene_barra_dominadas INTEGER
  dia_medicion INTEGER             -- 0=domingo .. 6=sábado
  creado_en TEXT

programa
  id INTEGER PK
  objetivo TEXT
  semanas INTEGER                  -- 8
  dias_por_semana INTEGER
  split TEXT                       -- fullbody2|ppl3|torso_pierna4|split5|ppl6
  creado_en TEXT
  activo INTEGER                   -- solo uno activo

dia_programa
  id INTEGER PK
  programa_id INTEGER FK
  semana INTEGER                   -- 1..8
  dia INTEGER                      -- 1..dias_por_semana
  nombre TEXT                      -- "Empuje", "Pierna"
  musculos TEXT                    -- json: ["pectorals","delts","triceps"]

ejercicio_dia
  id INTEGER PK
  dia_programa_id INTEGER FK
  orden INTEGER
  ejercicio_id TEXT                -- "pectorals/dumbbell-bench-press"
  musculo_objetivo TEXT
  equipamiento TEXT                -- dumbbell|bodyweight
  es_ancla INTEGER
  series INTEGER
  rep_min INTEGER
  rep_max INTEGER
  descanso_seg INTEGER

sesion
  id INTEGER PK
  dia_programa_id INTEGER FK
  iniciada_en TEXT
  terminada_en TEXT
  estado TEXT                      -- borrador|completada|abandonada

serie
  id INTEGER PK
  sesion_id INTEGER FK
  ejercicio_id TEXT
  numero INTEGER
  peso_meta REAL                   -- NULL en peso corporal
  reps_meta INTEGER
  peso_logrado REAL
  reps_logradas INTEGER
  completada_en TEXT

reto
  id INTEGER PK
  titulo TEXT
  tipo TEXT                        -- sesiones|carga|volumen
  ejercicio_id TEXT                -- solo tipo carga
  meta_valor REAL
  fecha_inicio TEXT
  fecha_fin TEXT
  estado TEXT                      -- activo|logrado|fallido

progreso_reto
  reto_id INTEGER PK FK
  valor_actual REAL
  actualizado_en TEXT

medicion
  id INTEGER PK
  fecha TEXT
  peso_kg REAL
  notas TEXT

medida
  medicion_id INTEGER FK
  tipo TEXT                        -- cuello|pecho|cintura|cadera|brazo_izq|
                                   -- brazo_der|muslo_izq|muslo_der|pantorrilla
  valor_cm REAL
  PRIMARY KEY (medicion_id, tipo)
```

Dos detalles deliberados:

- `serie` guarda meta y logro por separado. Es lo que permite mostrar "objetivo
  12 kg × 10" junto a "hecho 12 kg × 9", y es la única entrada que necesita la
  progresión para calcular la sesión siguiente.
- `medicion` y `medida` están separadas en cabecera y filas. Añadir una medida
  nueva no obliga a migrar la tabla.

Índices: `serie(ejercicio_id, completada_en)` para el historial de progresión,
`sesion(dia_programa_id)`, `medida(medicion_id)`.

## 7. Motor de planificación

### Splits por días disponibles

| Días | Split | Días y músculos |
|---|---|---|
| 2 | `fullbody2` | A: pectorals, upper-back, quads, delts, abs · B: lats, glutes, hamstrings, biceps, triceps |
| 3 | `ppl3` | Empuje: pectorals, delts, triceps · Tirón: lats, upper-back, biceps · Pierna: quads, glutes, hamstrings, calves, abs |
| 4 | `torso_pierna4` | Torso A: pectorals, upper-back, delts · Pierna A: quads, glutes, calves · Torso B: lats, pectorals, biceps, triceps · Pierna B: hamstrings, glutes, abs |
| 5 | `split5` | Pecho+tríceps · Espalda+bíceps · Pierna · Hombro+trapecio · Brazos+core |
| 6 | `ppl6` | Empuje / Tirón / Pierna, repetido dos veces |

### Parámetros por objetivo

| Objetivo | Reps (carga) | Reps (peso corporal) | Series/semana músculo grande | Músculo pequeño | Descanso |
|---|---|---|---|---|---|
| Volumen | 8-12 | 12-18 | 14 | 9 | 90 s |
| Definición | 12-15 | 18-25 | 14 | 9 | 60 s |
| Fuerza | 4-6 | 8-12 | 10 | 6 | 150 s |

Los ejercicios de peso corporal usan un rango de repeticiones un 50 % mayor,
porque no se les puede añadir carga.

Músculos grandes: `pectorals`, `lats`, `upper-back`, `quads`, `glutes`,
`hamstrings`, `delts`. Pequeños: `biceps`, `triceps`, `calves`, `abs`, `traps`,
`forearms`.

El nivel del perfil escala el volumen: principiante ×0,75, intermedio ×1,
avanzado ×1,25, redondeando a series enteras.

### Mesociclo

Un programa son 8 semanas, dos mesociclos de 4:

- Semana 1: series base.
- Semana 2: +1 serie en cada ejercicio ancla.
- Semana 3: +2 series en cada ejercicio ancla.
- Semana 4: descarga, 60 % de las series de la semana 1, mismo peso.

El segundo mesociclo (semanas 5-8) repite el patrón pero **reselecciona los
accesorios** y mantiene las anclas, para que la progresión de carga tenga
continuidad durante las 8 semanas.

### Selección de ejercicios

Por cada músculo de un día, el motor elige un ancla y de uno a tres accesorios,
hasta cubrir las series semanales objetivo repartidas entre los días en que ese
músculo aparece.

**Anclas.** Lista curada y fija. Es el ejercicio que se repite todo el mesociclo
y, por tanto, el único sobre el que la progresión de carga tiene sentido. Se
prefiere siempre la variante con mancuerna cuando existe:

| Músculo | Ancla | Alternativa sin banco / sin barra |
|---|---|---|
| pectorals | `pectorals/dumbbell-bench-press` | `pectorals/push-up` |
| delts | `delts/dumbbell-arnold-press` | — |
| triceps | `triceps/dumbbell-close-grip-press` | — |
| biceps | `biceps/dumbbell-biceps-curl` | — |
| upper-back | `upper-back/dumbbell-bent-over-row` | — |
| lats | `lats/chin-up` | `upper-back/inverted-row-bent-knees` |
| quads | `quads/dumbbell-goblet-squat` | — |
| glutes | `glutes/dumbbell-romanian-deadlift` | — |
| hamstrings | `hamstrings/dumbbell-lying-femoral` | — |
| calves | `calves/dumbbell-standing-calf-raise` | — |
| abs | `abs/crunch-floor` | — |
| traps | `traps/dumbbell-shrug` | — |

El script de compilación valida que todos estos identificadores existen en el
catálogo generado; si alguno no existe, la compilación falla.

**Accesorios.** Se toman del catálogo filtrado del músculo, ordenados por un
barajado determinista con semilla `programa_id + musculo + mesociclo`, y se
descarta cualquiera usado en las dos semanas anteriores. Determinista significa
que regenerar el mismo programa produce el mismo resultado, lo cual hace que las
pruebas sean posibles.

**Orden dentro del día:** primero las anclas de los músculos grandes, después los
accesorios de grandes, luego los pequeños, y core al final.

**Duración estimada:** `series_totales × (45 s + descanso)`, mostrada en la
tarjeta del día.

## 8. Progresión de cargas

Función pura `calcularMeta(historial, ejercicioDia, perfil)`. El historial son
las series completadas de ese `ejercicio_id`, más recientes primero.

Ejercicios con carga:

1. Sin historial → la app pide el peso inicial; la meta de reps es `rep_min`.
2. La última sesión completó todas las series en `rep_max` → peso anterior +
   `perfil.incremento_kg`, reps vuelven a `rep_min`.
3. No alcanzó `rep_max` en todas → mismo peso, meta de reps = mejor marca + 1,
   con tope en `rep_max`.
4. Dos sesiones seguidas por debajo de `rep_min` → peso × 0,9 redondeado al
   incremento, reps a `rep_min`.

Ejercicios de peso corporal (`peso_meta` es `NULL`):

1. Sin historial → meta = `rep_min`.
2. Todas las series en `rep_max` → se añade una serie, hasta un máximo de 5, y
   las reps vuelven a `rep_min`.
3. En otro caso → meta = mejor marca + 1, con tope en `rep_max`.

El redondeo al incremento respeta lo que el usuario declaró tener en casa: si sus
mancuernas suben de 5 en 5 kg, el motor nunca propone 12,5 kg.

## 9. Retos

Tres tipos, todos evaluables en local:

| Tipo | Meta | Cómo se mide |
|---|---|---|
| `sesiones` | N sesiones completadas antes de la fecha | cuenta de `sesion.estado = completada` en el rango |
| `carga` | Levantar X kg en un ejercicio | máximo `peso_logrado` de ese `ejercicio_id` en el rango |
| `volumen` | X kg de volumen acumulado | suma de `peso_logrado × reps_logradas` en el rango |

El usuario los crea desde plantillas rellenando meta y fecha. `evaluarRetos` es
una función pura que se ejecuta al cerrar cada sesión y al abrir la pantalla de
inicio; actualiza `progreso_reto` y marca `logrado` o `fallido`. Al completarse,
la app lo celebra en el resumen de la sesión.

## 10. Seguimiento corporal

Peso más nueve medidas: cuello, pecho, cintura, cadera, brazo izquierdo y
derecho, muslo izquierdo y derecho, pantorrilla. Ninguna es obligatoria salvo el
peso; se guarda lo que se rellene.

El día elegido en `perfil.dia_medicion` la pantalla de inicio muestra la tarjeta
"Toca pesarte" y se dispara una notificación local a las 8:00. Si ya hay una
medición ese día, ni tarjeta ni aviso.

La pantalla de progreso dibuja una gráfica por métrica con selector de rango
(1 mes, 3 meses, todo) y la variación respecto a la primera medición.

## 11. Estrategia offline y assets

**Empaquetado en el binario:** `ejercicios.json` (666 ejercicios en español,
aproximadamente 700 KB) y las 666 miniaturas `.webp` (unos 14 MB). App de
alrededor de 30 MB.

**Bajo demanda:** los GIFs se descargan de jsDelivr la primera vez que se abre el
ejercicio y se guardan en `FileSystem.documentDirectory + "gifs/"`. La caché tiene
un tope de 250 MB con desalojo del menos usado recientemente.

**Descarga anticipada:** el botón "Descargar mi plan" en ajustes precarga los
GIFs de todos los ejercicios de las próximas dos semanas del programa, entre 40 y
60 ficheros y unos 15 MB, con barra de progreso.

**Degradación:** si el GIF no está en caché y no hay red, se muestra la miniatura
estática con un icono discreto de "sin conexión". El entrenamiento no se
interrumpe nunca por esto.

## 12. Pantallas

**Onboarding** (5 pasos): nombre y datos básicos → objetivo → días por semana y
nivel → equipamiento (mancuernas mínimo, máximo e incremento; banco; barra de
dominadas) → día de medición. Al terminar se genera el programa y se entra en Hoy.

**Hoy.** Tarjeta principal del día: "Semana 3 · Día 2 · Empuje", silueta SVG con
los músculos del día resaltados, número de ejercicios, duración estimada y botón
Empezar. Debajo, retos activos con su barra, y la tarjeta de medición cuando
toca. Si el día es de descanso, la tarjeta lo dice y ofrece adelantar el
siguiente entrenamiento.

**Sesión.** Slider horizontal paginado, un ejercicio por página, con barra de
progreso de la sesión arriba. Cada página: animación a ancho completo (miniatura
si no está descargada), nombre del ejercicio, chips de músculo principal y
secundarios, y la tabla de series:

```
 #   Meta            Logrado
 1   12 kg × 10      [12] × [10]   ✓
 2   12 kg × 10      [12] × [ 9]   ✓
 3   12 kg × 10      [  ] × [  ]
```

Los campos de logrado vienen precargados con la meta, así que confirmar una serie
que salió como estaba previsto es un solo toque. Al marcarla se abre el
cronómetro de descanso a pantalla completa, con cuenta atrás, opción de saltar y
de sumar 30 segundos.

Al terminar: resumen con series completadas, volumen total en kg, comparación
contra la misma sesión de la semana anterior y retos que hayan avanzado.

**Ejercicio.** Animación grande, silueta, y gráfica del historial de peso y reps
de ese ejercicio.

**Programa.** Vista de las 8 semanas con sus días, estado de cada uno y acceso al
detalle. Permite regenerar el programa, avisando de que se conserva el histórico.

**Progreso.** Gráficas de peso corporal y medidas, historial de sesiones y
volumen semanal.

**Ajustes.** API key de OpenAI (almacenamiento seguro, validada por formato),
objetivo y días por semana, equipamiento disponible, día de medición, descargar
mi plan, tamaño y borrado de la caché, exportar datos a JSON.

## 13. Errores y casos límite

| Situación | Comportamiento |
|---|---|
| Sin red al abrir un ejercicio | Miniatura estática con icono de sin conexión; reintento automático al reabrir |
| Descarga de GIF fallida | Se registra y se reintenta la próxima vez; nunca bloquea la sesión |
| Caché llena | Desalojo del menos usado recientemente hasta bajar de 250 MB |
| Sesión abandonada a medias | Queda en `borrador`; al volver el mismo día se ofrece retomar, después se marca `abandonada` |
| App cerrada durante la sesión | Cada serie se persiste al confirmarla, no al final; no se pierde nada |
| Peso o reps fuera de rango | Validación: peso 0-500 kg, reps 0-100 |
| Cambio de objetivo | Genera un programa nuevo; el histórico de series y medidas se conserva |
| Ancla que el usuario no puede hacer | Se puede sustituir por otro ejercicio del mismo músculo desde la sesión; la sustitución se guarda para el resto del mesociclo |
| Sin banco o sin barra de dominadas | El motor usa la alternativa declarada en la tabla de anclas |
| Migración de esquema | Migraciones numeradas y transaccionales; un fallo deja la versión anterior intacta |

## 14. Pruebas

**Jest sobre `domain/planner`**, que es puro y concentra el riesgo:

- El split correcto para cada número de días entre 2 y 6.
- Volumen semanal por músculo dentro del rango del objetivo y del nivel.
- El ancla es estable durante todo el mesociclo.
- Los accesorios no se repiten en dos semanas consecutivas.
- La generación es determinista: misma entrada, mismo programa.
- Progresión con carga: sin historial, subida, estancamiento, dos fallos
  seguidos, y redondeo al incremento declarado.
- Progresión sin carga: subida de reps y adición de serie con tope en 5.
- Evaluación de los tres tipos de reto, incluidos los bordes de fecha.
- Sustitución de anclas cuando falta banco o barra de dominadas.

**React Native Testing Library** para la pantalla de sesión: confirmar una serie
la persiste y actualiza la meta de la siguiente; el slider navega entre
ejercicios; el cronómetro arranca al completar una serie.

**Prueba del catálogo:** el script de compilación verifica que todo identificador
de la lista de anclas existe en el JSON generado y que cada ejercicio tiene su
miniatura. Si falla, la compilación falla.

Sin pruebas end-to-end en v1.

## 15. Riesgos y supuestos

- **El catálogo es de terceros.** Se mitiga fijando la versión `v1.1.0` y
  empaquetando metadata y miniaturas en el binario: aunque el repo desaparezca,
  la app sigue funcionando y solo se perderían las animaciones no cacheadas.
- **Las instrucciones del repo no sirven.** Asumido y documentado; se resuelve en
  la fase 2 con IA.
- **Los nombres en español son traducciones automáticas** y algunos suenan
  forzados ("Inclinación lateral con mancuerna"). Aceptable en v1; se puede
  añadir una tabla de correcciones para los ejercicios más frecuentes.
- **Isquiotibiales tiene un solo ejercicio con mancuerna.** El peso corporal
  aporta 15 más, suficiente para el volumen previsto, pero la progresión de carga
  en ese músculo dependerá casi por completo del peso muerto rumano de glúteos.
- **La silueta SVG hay que dibujarla.** No viene con el catálogo. Son dos vistas
  (frontal y posterior) con una capa por grupo muscular, identificadas con los
  mismos nombres que usa la API.
