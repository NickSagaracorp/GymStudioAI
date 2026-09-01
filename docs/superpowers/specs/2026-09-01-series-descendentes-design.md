# GymStudioAI — Series descendentes

- **Fecha:** 2026-09-01
- **Estado:** aprobado
- **Depende de:** fase 1 (entrenamiento guiado), construida y verificada

## 1. Qué es y por qué no es una superserie

Una **serie descendente** (*drop set*) es un solo ejercicio: arrancas con el peso
máximo que puedes mover, haces las repeticiones que salgan hasta el fallo, quitas
peso y sigues sin descansar, tantas veces como quieras.

Una **superserie** es otra cosa: dos ejercicios distintos encadenados sin
descanso. No se construye aquí. La distinción importa porque el modelo de datos
es distinto: la descendente necesita varias bajadas dentro de una misma serie, la
superserie necesita emparejar ejercicios.

El usuario ya las hace en pecho, hombros, brazos y espalda, y previsiblemente las
extenderá al resto.

## 2. Decisiones

| Decisión | Elección |
|---|---|
| Alcance | Solo series descendentes |
| Número de bajadas | Abierto: se añaden mientras se quiera |
| Peso de cada bajada | Sugerido al 80 % del anterior, editable |
| Progresión | Por repeticiones totales de la serie completa |
| Activación | Interruptor por ejercicio, que se recuerda entre sesiones |

## 3. Cómo funciona

### Registro

Un ejercicio marcado como descendente sustituye la tabla de series normal por
una lista de bajadas:

```
        Peso     Reps
Tope    24 kg     8      ✓
 ↓ 1    20 kg     6      ✓
 ↓ 2    16 kg     5      ✓
        [ + Otra bajada ]
```

- La primera fila es el **tope**: el peso de arranque, que es el que progresa.
- Cada bajada nueva propone el **80 % del peso anterior**, redondeado al
  incremento de mancuernas del perfil y con suelo en el peso mínimo disponible.
  Ese número es una sugerencia: se puede sobrescribir siempre.
- No hay meta de repeticiones. Se va al fallo, así que la app solo muestra
  cuántas repeticiones totales hiciste la última vez, para saber qué superar.
- No hay cronómetro de descanso entre bajadas, porque una descendente se hace
  sin descansar. El cronómetro salta al terminar la serie completa.

### Progresión

La app compara las **repeticiones totales** de la última sesión con las de la
anterior. Si mejoraron, el peso de arranque sube un incremento.

Ese criterio tiene un agujero conocido: el total se infla haciendo una bajada
más, no entrenando mejor. Por eso se guarda también **cuántas bajadas** tuvo
cada serie, y cuando el total mejora pero con más bajadas que la vez anterior,
la app lo avisa en pantalla en lugar de subir el peso en silencio:

> *Hiciste 19 repeticiones frente a 17, pero con una bajada más. El peso se
> mantiene.*

Así la decisión sigue siendo del usuario y la métrica que eligió se respeta,
pero no engaña.

### Activación

Un interruptor en la pantalla del ejercicio, dentro de la sesión. Se guarda por
identificador de ejercicio y se aplica a todas las sesiones futuras hasta que se
desactive. No lo decide el generador del plan.

## 4. Modelo de datos

Migración 003, sobre el esquema existente.

```sql
ALTER TABLE serie ADD COLUMN bajada INTEGER NOT NULL DEFAULT 0

CREATE TABLE ejercicio_descendente (
  ejercicio_id TEXT PRIMARY KEY,
  activado_en TEXT NOT NULL
)
```

`serie` no se duplica: una serie normal es una fila con `bajada = 0`, y una
descendente son varias filas con el mismo `numero` y `bajada` 0, 1, 2… Así el
historial, el volumen y los retos siguen funcionando sin tocarlos, porque todos
suman filas de `serie` sin mirar la bajada.

El borrado al reescribir una serie pasa a considerar `bajada`, para no perder
las demás bajadas al corregir una.

## 5. Arquitectura

| Pieza | Cambio |
|---|---|
| `domain/planner/progresion.ts` | Nueva rama para descendentes; `pesoSugeridoBajada()` |
| `domain/planner/tipos.ts` | `SerieHecha.bajada`; `Meta` gana el modo descendente |
| `data/db/repos/sesion.ts` | Registro y lectura por bajada |
| `data/db/repos/ejercicios.ts` | Preferencia de descendente por ejercicio |
| `ui/componentes/TablaDescendente.tsx` | Tabla de bajadas |
| `app/sesion/[sesionId].tsx` | Interruptor y elección de tabla |

`domain/planner` sigue sin conocer red ni base de datos.

## 6. Pruebas

- Peso sugerido: 80 % redondeado al incremento, con suelo en el peso mínimo, y
  que nunca proponga un peso igual o mayor que el anterior.
- Progresión descendente: primera vez pide peso; el total mejora y sube el peso;
  el total empeora y lo mantiene; el total mejora con más bajadas y lo mantiene
  avisando; una sola sesión de historial no sube nada.
- Una serie normal sigue guardándose con `bajada = 0` y su progresión no cambia.
- Corregir una bajada no borra las demás.
- La migración 003 conserva las series ya registradas.
