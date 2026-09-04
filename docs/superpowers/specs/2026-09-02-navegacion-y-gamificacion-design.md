# GymStudioAI — Navegación de sesión y gamificación

- **Fecha:** 2026-09-02
- **Estado:** aprobado
- **Depende de:** fase 1 (entrenamiento guiado) y fase 3 (series descendentes), construidas

## 1. El problema

La pantalla de sesión es un carrusel horizontal (`FlatList` paginada) sin ningún
indicio de que haya más ejercicios detrás. Lo único que se ve abajo es
**Terminar entrenamiento**, así que el usuario lo pulsó creyendo que terminaba el
ejercicio actual y cerró la sesión del día entera con un ejercicio hecho.

El fallo no es del botón: es que la interfaz no comunica ni *dónde estoy* ni
*cuántos quedan*. Se arregla en tres capas —posición, avance explícito y
finalización solo al final— y sobre esa base se monta la gamificación, porque
una app de gimnasio se abandona por falta de motivación mucho antes que por
falta de funciones.

## 2. Decisiones

| Decisión | Elección |
|---|---|
| Avance entre ejercicios | Botón **Siguiente ejercicio**; el swipe sigue funcionando |
| Botón de terminar | Solo aparece en el último ejercicio del día |
| Series sin confirmar al avanzar | Aviso con opción de seguir igual; nunca se bloquea |
| Regla de racha | Solo cuentan los días de la agenda acordada por el usuario |
| Día cumplido / fallado | 🔥 fuego / 🧊 helado |
| Celebraciones | Confeti con `Animated` de RN + `expo-haptics` |
| Celebración por serie suelta | Vibración y micro-aviso, sin overlay |
| Sin progreso en la medición | Mensaje alentador, nunca confeti ni reproche |

## 3. Agenda semanal

Hoy el perfil solo guarda `dias_por_semana` como número. La racha necesita
*qué* días, no *cuántos*: si alguien entrena lunes, martes, jueves y viernes, el
domingo no puede romperle nada.

`Perfil` gana `diasSemana: number[]` (0 = domingo … 6 = sábado, ordenado).

- **Onboarding:** el selector numérico de días por semana se sustituye por siete
  chips L–D de selección múltiple. Mínimo 2, máximo 6. `diasPorSemana` pasa a
  derivarse de `diasSemana.length`, que es la invariante que mantiene el
  generador de programas funcionando sin tocarlo.
- **Ajustes:** la sección *Programa* gana un editor de la agenda con los mismos
  chips. Cambiar la agenda no reescribe el historial: la racha se recalcula
  siempre con la agenda vigente.
- **Perfiles ya creados:** si `dias_semana` viene vacío se deriva de
  `diasPorSemana` con un reparto estándar —1→L · 2→L,J · 3→L,X,V · 4→L,M,J,V ·
  5→L–V · 6→L–S— para que nadie se quede sin agenda tras actualizar.

## 4. Navegación de la sesión

Tres piezas sobre la pantalla actual:

- **Cabecera:** `Ejercicio 2 de 6` junto al nombre del día.
- **Puntos de posición**, uno por ejercicio, sobre la barra inferior: verde si
  está completo, acento si es el actual, gris si está pendiente. Tocar un punto
  salta a ese ejercicio.
- **Barra inferior:** `‹ Anterior` (secundario, oculto en el primero) y el botón
  principal **Siguiente ejercicio**, que solo en el último se convierte en
  **Terminar entrenamiento**.

El índice actual sale de `onMomentumScrollEnd` sobre la lista paginada
(`Math.round(offsetX / ANCHO)`), y *Siguiente* llama a `scrollToIndex`. El swipe
no se toca: el botón añade un camino, no sustituye el que ya había.

**Aviso al avanzar con series pendientes.** Si el ejercicio actual no está
completo, un `Alert` dice cuántas faltan y ofrece *Seguir igual* / *Quedarme*.
Lo mismo al pulsar *Terminar entrenamiento* cuando queda algún ejercicio
incompleto, contando ejercicios y no series, que es como lo piensa el usuario.

Un ejercicio se considera completo cuando tiene tantas series registradas como
`Meta.series`, o —si está marcado como descendente— cuando tiene registrada al
menos la fila del tope y una bajada, que es la forma mínima de una descendente.

**Refactor necesario.** `app/sesion/[sesionId].tsx` ya está en 335 líneas y este
cambio le añade navegación y celebraciones. Se parte en:

| Pieza | Responsabilidad |
|---|---|
| `ui/hooks/useSesion.ts` | Carga día, metas, series ya hechas y preferencias |
| `ui/componentes/TarjetaEjercicio.tsx` | Un ejercicio: gif, chips, interruptor y tabla |
| `ui/componentes/BarraEjercicios.tsx` | Puntos de posición y botones anterior/siguiente/terminar |
| `app/sesion/[sesionId].tsx` | Orquesta: estado del carrusel, avisos y celebraciones |

## 5. Marcador semanal y racha

Lógica pura en `domain/gamificacion/racha.ts`, sin React ni SQL.

La semana va de lunes a domingo. Cada día tiene uno de cinco estados:

| Situación | Estado | Aspecto |
|---|---|---|
| Día de agenda con entrenamiento completado | `fuego` | 🔥 sobre fondo acento |
| Día de agenda pasado sin entrenar | `helado` | 🧊 sobre fondo apagado |
| Día de agenda que es hoy y aún sin entrenar | `pendiente` | Borde acento, sin relleno |
| Día de agenda futuro | `futuro` | Tenue |
| Día fuera de la agenda | `descanso` | Neutro; no cuenta para nada |

**Racha.** Se recorre hacia atrás desde hoy pasando **solo por los días de la
agenda**: suma uno por cada día con entrenamiento y se corta en el primer día de
agenda sin él. El día de hoy, si aún está pendiente, no rompe la racha: todavía
hay tiempo de entrenar. Se muestra en días de ejercicios completados:

> 🔥 5 días de racha · récord 12

El récord se calcula con el mismo recorrido sobre todo el historial y es el
máximo de todas las rachas encontradas.

**Fecha local, no UTC.** `sesion.terminada_en` se guarda en ISO UTC. El día se
compone en hora local a partir de `new Date(iso)`, nunca con `slice(0, 10)`, que
mandaría un entrenamiento de las 22:00 al día siguiente y rompería la racha sin
motivo.

El componente es `ui/componentes/MarcadorSemanal.tsx`, colocado en *Hoy* bajo el
saludo, antes de la tarjeta del día.

## 6. Celebraciones

Dependencia nueva: **`expo-haptics`**, instalada con `npx expo install` para
fijar la versión del SDK 57. El confeti son `Animated.View` con
`useNativeDriver: true`, así que no entra ninguna otra dependencia nativa.

`ui/componentes/Celebracion.tsx` es un overlay transparente con tres tamaños
—`chico`, `medio`, `grande`— que ajustan número de piezas, duración y patrón
háptico, con autocierre y cierre al tocar.

| Hito | Nivel | Qué se ve |
|---|---|---|
| Serie confirmada | — | Vibración y micro-aviso *Serie 3 ✓*. Sin overlay |
| Última serie de un ejercicio | medio | Confeti breve · *¡Press banca completo!* |
| Todos los ejercicios de un músculo del día | grande | Confeti y `SiluetaMuscular` con ese músculo encendido · *¡Pecho completo!* |
| Día completo | grande | En el resumen: confeti, series, volumen y racha |
| Racha mantenida o récord nuevo | grande | En el resumen: *🔥 6 días seguidos* |

Veinte overlays por sesión anulan el efecto de los cinco que importan, así que
la serie suelta se queda en vibración. La fila ya se pone verde al confirmarla.

**Qué hito toca** lo decide `domain/gamificacion/logros.ts`, función pura que
recibe los ejercicios del día, las series registradas y las claves ya
celebradas, y devuelve los hitos nuevos. Un músculo cuenta como completo cuando
todos los ejercicios del día cuyo `musculoObjetivo` es ese músculo están
completos.

**No repetir celebraciones.** Una tabla `logro` guarda lo ya celebrado, con
claves `dia:<sesionId>`, `musculo:<sesionId>:<musculo>`,
`ejercicio:<sesionId>:<ejercicioId>` y `racha:<n>`. Salir y volver a entrar en la
sesión no vuelve a lanzar el confeti.

## 7. Mensajes de medición

`domain/gamificacion/mediciones.ts` compara la medición recién guardada con la
anterior e interpreta el resultado según `perfil.objetivo`:

| Objetivo | Qué cuenta como progreso |
|---|---|
| `definicion` | Baja el peso o baja la cintura |
| `volumen` | Sube el peso, o suben brazo o pecho |
| `fuerza` | El peso corporal es secundario; manda el volumen levantado |

Umbral: un cambio cuenta como progreso a partir de 0,3 kg en peso o 0,5 cm en
una medida. Por debajo es ruido de báscula y cinta métrica, y se trata como
"sin cambios".

- **Con progreso:** celebración grande con el cambio concreto —*−1,2 kg y −2 cm
  de cintura*—, no un genérico.
- **Sin progreso o con retroceso:** nunca confeti y nunca reproche. Un mensaje
  que reencuadra hacia lo que sí controla el usuario: *El cuerpo no cambia en
  línea recta. Llevas 12 entrenamientos este mes y una racha de 5 días: eso es lo
  que construye el resultado.*
- **Primera medición:** se registra como punto de partida, sin juicio.

El mensaje aparece en `app/medicion.tsx` al guardar, antes de volver atrás.

## 8. Modelo de datos

Migración 004.

```sql
ALTER TABLE perfil ADD COLUMN dias_semana TEXT NOT NULL DEFAULT ''

CREATE TABLE logro (
  clave TEXT PRIMARY KEY,
  conseguido_en TEXT NOT NULL
)
```

`dias_semana` es un CSV de índices, por ejemplo `1,2,4,5`. Vacío significa *sin
agenda explícita* y activa la derivación desde `dias_por_semana` descrita en la
sección 3.

`logro` es una lista de claves ya conseguidas, sin más estructura: lo único que
se le pregunta es si una clave existe.

## 9. Arquitectura

| Pieza | Cambio |
|---|---|
| `data/db/migraciones.ts` | Migración 004 |
| `data/db/repos/perfil.ts` | `diasSemana` con derivación por defecto |
| `data/db/repos/sesion.ts` | `fechasCompletadas()`: días locales con sesión completada |
| `data/db/repos/logros.ts` | Nuevo: `conseguidos()`, `marcar()` |
| `domain/gamificacion/racha.ts` | Nuevo: estados de la semana y cálculo de racha |
| `domain/gamificacion/logros.ts` | Nuevo: qué hito se alcanza |
| `domain/gamificacion/mediciones.ts` | Nuevo: progreso y mensaje según objetivo |
| `ui/componentes/MarcadorSemanal.tsx` | Nuevo |
| `ui/componentes/Celebracion.tsx` | Nuevo, con el confeti dentro |
| `ui/componentes/BarraEjercicios.tsx` | Nuevo |
| `ui/componentes/TarjetaEjercicio.tsx` | Extraído de la pantalla de sesión |
| `ui/hooks/useSesion.ts` | Extraído de la pantalla de sesión |
| `nucleo/contenedor.ts` | Monta el repositorio de logros |
| `app/onboarding.tsx` | Chips de agenda semanal |
| `app/(tabs)/ajustes.tsx` | Editor de agenda en la sección *Programa* |
| `app/(tabs)/hoy.tsx` | Marcador semanal |
| `app/sesion/[sesionId].tsx` | Navegación, avisos y celebraciones |
| `app/resumen/[sesionId].tsx` | Confeti, racha y hito del día |
| `app/medicion.tsx` | Mensaje de progreso |

`domain/gamificacion` no conoce React, red ni base de datos, igual que
`domain/planner`.

## 10. Pruebas

- **Racha:** agenda L,M,J,V con el fin de semana de por medio no se rompe; un
  jueves fallado sí la rompe; hoy pendiente no la rompe; el récord sobrevive a
  una racha rota; cambiar la agenda recalcula sin tocar el historial.
- **Estados de la semana:** los cinco estados, y que un día fuera de agenda
  nunca salga helado.
- **Logros:** hito por ejercicio, por músculo y por día; un músculo con dos
  ejercicios no se celebra hasta el segundo; una clave ya marcada no vuelve a
  celebrarse.
- **Mediciones:** progreso y no progreso para cada objetivo; cambio por debajo
  del umbral tratado como sin cambios; primera medición.
- **Navegación:** el botón dice *Siguiente ejercicio* salvo en el último, donde
  dice *Terminar entrenamiento*; avanzar con series pendientes avisa; el aviso
  deja seguir.
- **Perfil:** `diasSemana` va y vuelve de la base; un perfil sin agenda la deriva
  de `diasPorSemana`.
- **Migración 004:** conserva perfil, sesiones y series ya guardadas.
