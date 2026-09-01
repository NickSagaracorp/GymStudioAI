# GymStudioAI — Fase 2: nutrición y análisis de comidas con IA

- **Fecha:** 2026-09-01
- **Estado:** pendiente de aprobación
- **Depende de:** `2026-08-31-entrenamiento-guiado-design.md` (fase 1, construida y verificada)

## 1. Objetivo

Registrar lo que comes fotografiando el plato y describiéndolo, para saber
cuántas calorías y macros llevas en el día frente a un objetivo calculado a
partir de tus datos y tu meta de entrenamiento.

La fase 1 no depende de esto: si no hay clave de API, la app sigue funcionando
entera salvo el análisis por foto.

## 2. Alcance

### Dentro de la fase 2

- Onboarding ampliado con sexo, fecha de nacimiento, peso inicial y nivel de
  actividad, que hoy faltan y son imprescindibles para el cálculo.
- Objetivos diarios de calorías y macros, calculados en local.
- Barra de pestañas: Hoy, Comida, Progreso y Ajustes.
- Pantalla del día con lo ingerido frente al objetivo.
- Alta de comida con foto y descripción, análisis por IA y **revisión antes de
  guardar**.
- Alta de comida a mano, sin IA y sin internet.
- Edición y borrado de comidas ya registradas.
- Ajustes de nutrición: modelo de IA, conservar o no las fotos, borrado de
  fotos antiguas.

### Fuera de la fase 2

Menú semanal sugerido, recetas, lectura de códigos de barras, base de datos de
alimentos empaquetada, registro de agua, exportación de informes nutricionales
y ajuste automático de objetivos según la evolución del peso.

## 3. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Estimación de macros | IA con foto y descripción, revisable antes de guardar |
| Plan de alimentación | Objetivos diarios de macros, calculados en local |
| Detalle de macros | Grasa desglosada, más fibra y azúcares |
| Navegación | Barra de pestañas inferior |
| Fotos de comida | Interruptor en ajustes; se conservan por defecto |

## 4. Objetivos nutricionales

Cálculo determinista, sin internet, en `domain/nutricion/objetivos.ts`.

### Gasto energético

**Metabolismo basal, Mifflin-St Jeor:**

- Hombre: `10 × peso_kg + 6,25 × altura_cm − 5 × edad + 5`
- Mujer: `10 × peso_kg + 6,25 × altura_cm − 5 × edad − 161`
- Otro: media de las dos fórmulas

**Gasto total:** basal × factor de actividad.

| Nivel | Factor |
|---|---|
| Sedentario | 1,2 |
| Ligero | 1,375 |
| Moderado | 1,55 |
| Alto | 1,725 |
| Muy alto | 1,9 |

El nivel de actividad lo declara el usuario y es independiente de los días de
entrenamiento: alguien que entrena tres días pero trabaja de pie gasta más que
quien entrena cinco y está sentado.

**Ajuste por objetivo de entrenamiento:**

| Objetivo | Ajuste | Razón |
|---|---|---|
| Volumen | +10 % | Superávit moderado, para ganar músculo sin exceso de grasa |
| Definición | −20 % | Déficit sostenible, alrededor de 0,5-0,7 kg por semana |
| Fuerza | 0 % | Mantenimiento |

### Reparto de macros

1. **Proteína:** 2,0 g por kg de peso; 2,2 g en definición, donde protege la
   masa muscular durante el déficit.
2. **Grasa:** 25 % de las calorías, con un suelo de 0,8 g por kg. El suelo
   manda si el porcentaje se queda por debajo.
3. **Carbohidratos:** las calorías que sobran, a 4 kcal por gramo.
4. **Fibra:** 14 g por cada 1000 kcal.

**Topes recomendados**, que se muestran como límite y no como meta:

- Azúcares: 10 % de las calorías.
- Grasa saturada: 10 % de las calorías.
- Grasa trans: 0 g; cualquier cantidad se marca en rojo.

El objetivo se recalcula cuando cambian el peso, el objetivo de entrenamiento o
el nivel de actividad. El usuario puede sobrescribir las calorías a mano; en ese
caso los macros se reparten sobre su cifra y queda marcado como ajuste manual.

## 5. Análisis de comida con IA

### Flujo

1. El usuario hace una foto o elige una de la galería y escribe una
   descripción opcional ("pechuga a la plancha con arroz, plato hondo").
2. La imagen se comprime a 1024 px de lado mayor y calidad 0,7 antes de salir
   del dispositivo.
3. Se envía a la API de OpenAI junto con la descripción y se pide una respuesta
   con esquema JSON estricto.
4. **La app muestra lo detectado y no guarda nada todavía.** El usuario puede
   corregir cantidades, borrar alimentos, añadir uno a mano y solo entonces
   guardar.

El paso 4 no es opcional. La IA acierta razonablemente al identificar alimentos
y falla a menudo al estimar el tamaño de la ración, que es justo lo que
determina las calorías. Sin revisión, los totales del día no valen nada.

### Contrato con la API

Petición a `POST https://api.openai.com/v1/chat/completions` con la clave del
usuario, imagen en `data:` base64 y `response_format` de tipo `json_schema`
con `strict: true`. Modelo configurable en ajustes, por defecto `gpt-4o-mini`.

Esquema de respuesta:

```json
{
  "alimentos": [
    {
      "nombre": "Pechuga de pollo a la plancha",
      "cantidadG": 180,
      "kcal": 297,
      "proteinaG": 55.8,
      "carbosG": 0,
      "azucaresG": 0,
      "grasaG": 6.5,
      "grasaSaturadaG": 1.9,
      "grasaTransG": 0,
      "fibraG": 0,
      "confianza": "alta"
    }
  ],
  "notas": "Ración estimada por comparación con el plato."
}
```

`confianza` es `alta`, `media` o `baja`, y la interfaz destaca en ámbar los
alimentos de confianza baja para que el usuario los revise primero.

### Validación

La respuesta **nunca se guarda tal cual**. Un validador puro comprueba, alimento
a alimento:

- Todos los campos numéricos presentes, finitos y no negativos.
- `cantidadG` entre 1 y 2000.
- `azucaresG ≤ carbosG` y `grasaSaturadaG + grasaTransG ≤ grasaG`.
- Coherencia energética: las calorías declaradas no se separan más de un 25 %
  de `4 × proteína + 4 × carbos + 9 × grasa`. Si se separan, se recalculan a
  partir de los macros y se avisa en pantalla.

Un alimento que no pase la validación se descarta y se informa de cuántos se
descartaron. Una respuesta entera inválida se trata como error de análisis, con
la opción de reintentar o registrar a mano.

### Errores

| Situación | Comportamiento |
|---|---|
| Sin clave configurada | La cámara ni se abre; se ofrece ir a ajustes o registrar a mano |
| Sin internet | Aviso claro y alta manual disponible |
| Clave inválida (401) | "La clave de OpenAI no es válida", con enlace a ajustes |
| Cuota agotada (429) | "Has superado tu cuota de OpenAI"; se distingue de un fallo genérico |
| Respuesta ilegible | Se ofrece reintentar una vez, luego alta manual |
| Tiempo de espera | 60 segundos de límite; se cancela y se ofrece reintentar |

La clave sale del almacenamiento seguro y **nunca se escribe en registros**.

## 6. Modelo de datos

Migración 002, que se añade a la 001 de la fase 1.

```sql
ALTER TABLE perfil ADD COLUMN nivel_actividad TEXT NOT NULL DEFAULT 'moderado'

objetivo_nutricional
  id INTEGER PRIMARY KEY CHECK (id = 1)
  kcal REAL NOT NULL
  proteina_g REAL NOT NULL
  carbos_g REAL NOT NULL
  grasa_g REAL NOT NULL
  fibra_g REAL NOT NULL
  tope_azucares_g REAL NOT NULL
  tope_saturada_g REAL NOT NULL
  ajuste_manual INTEGER NOT NULL DEFAULT 0
  calculado_en TEXT NOT NULL

comida
  id INTEGER PRIMARY KEY AUTOINCREMENT
  fecha TEXT NOT NULL                -- YYYY-MM-DD
  momento TEXT NOT NULL              -- desayuno|almuerzo|cena|snack
  descripcion TEXT
  foto_uri TEXT                      -- NULL si no hay foto o no se conserva
  origen TEXT NOT NULL               -- ia|manual
  creada_en TEXT NOT NULL

alimento
  id INTEGER PRIMARY KEY AUTOINCREMENT
  comida_id INTEGER NOT NULL REFERENCES comida(id) ON DELETE CASCADE
  nombre TEXT NOT NULL
  cantidad_g REAL NOT NULL
  kcal REAL NOT NULL
  proteina_g REAL NOT NULL
  carbos_g REAL NOT NULL
  azucares_g REAL NOT NULL
  grasa_g REAL NOT NULL
  grasa_saturada_g REAL NOT NULL
  grasa_trans_g REAL NOT NULL
  fibra_g REAL NOT NULL
  confianza TEXT                     -- alta|media|baja, NULL si es manual

CREATE INDEX idx_comida_fecha ON comida (fecha)
CREATE INDEX idx_alimento_comida ON alimento (comida_id)
```

Las macros se guardan **por alimento, no por comida**: así se puede corregir o
borrar un alimento suelto y el total se recalcula solo.

## 7. Arquitectura

Se respeta la separación de la fase 1 y se añaden dos piezas.

| Pieza | Responsabilidad |
|---|---|
| `src/domain/nutricion/objetivos.ts` | Mifflin-St Jeor, gasto total y reparto de macros. Funciones puras. |
| `src/domain/nutricion/totales.ts` | Suma de un día y comparación con el objetivo. Funciones puras. |
| `src/domain/nutricion/validacion.ts` | Validación y saneado de lo que devuelve la IA. Función pura. |
| `src/services/ia/analizador.ts` | Interfaz `AnalizadorDeComida` y cliente de OpenAI. Recibe `fetch` inyectado. |
| `src/services/ia/imagen.ts` | Compresión y codificación de la foto. |
| `src/data/db/repos/nutricion.ts` | Comidas y alimentos. |

`domain/nutricion` no conoce la red ni la base de datos, igual que
`domain/planner`. El cliente de IA recibe `fetch` por parámetro, así que se
prueba sin tocar internet.

### Navegación

`app/(tabs)/` con cuatro pestañas: `hoy`, `comida`, `progreso` y `ajustes`.
Las pantallas actuales de sesión, resumen, medición y retos siguen siendo rutas
apiladas fuera de las pestañas. `retos` pasa a ser un acceso desde Hoy.

## 8. Pantallas

**Comida (pestaña).** Anillo o barras con calorías consumidas frente al
objetivo, y debajo proteína, carbohidratos y grasa con su progreso. Un
desplegable muestra el detalle: azúcares y fibra, y el desglose de grasa en
insaturada, saturada y trans, con los topes marcados. Después, las comidas del
día agrupadas por momento, cada una con su miniatura, sus calorías y acceso a
editarla. Botones para añadir con foto o a mano. Selector de fecha para
consultar días anteriores.

**Añadir con foto.** Cámara o galería, campo de descripción, botón Analizar.
Mientras espera, un indicador con el aviso de que puede tardar unos segundos.

**Revisión del análisis.** Lista de alimentos detectados, cada uno con nombre,
cantidad en gramos editable y sus macros, que se recalculan proporcionalmente al
cambiar la cantidad. Los de confianza baja aparecen destacados. Se puede borrar
un alimento, añadir uno a mano y elegir el momento del día. Totales de la comida
arriba, siempre visibles. Botones Guardar y Descartar.

**Añadir a mano.** El mismo editor de alimentos sin el paso de IA, para cuando
no hay internet o no hay clave.

**Ajustes de nutrición.** Modelo de IA, interruptor para conservar las fotos,
borrado de fotos de más de 30 días con el espacio que ocupan, nivel de
actividad y objetivo de calorías con opción de sobrescribirlo.

## 9. Pruebas

**Jest sobre `domain/nutricion`**, donde está el riesgo:

- Mifflin-St Jeor para hombre, mujer y otro, contra valores calculados a mano.
- Gasto total para los cinco factores de actividad.
- Ajuste de calorías por los tres objetivos.
- Reparto de macros: que la suma en calorías cuadre con el total, que la
  proteína respete los gramos por kilo y que el suelo de grasa mande cuando el
  porcentaje se queda corto.
- Totales del día: suma de varias comidas, día vacío y comida sin alimentos.
- Validación de respuestas de IA: campos ausentes, negativos, azúcares mayores
  que los carbohidratos, incoherencia energética por encima y por debajo del
  25 %, y respuesta entera inválida.

**Cliente de IA** con `fetch` simulado: petición bien formada, cabecera de
autorización presente, y los errores 401, 429, tiempo de espera y JSON ilegible
convertidos en errores tipados y distinguibles.

**React Native Testing Library** para la pantalla de revisión: cambiar la
cantidad de un alimento recalcula sus macros y el total de la comida; borrar un
alimento lo quita del total; guardar persiste lo que hay en pantalla, no lo que
devolvió la IA.

## 10. Riesgos y supuestos

- **La estimación de raciones por IA es poco fiable.** Es la razón de que la
  revisión sea obligatoria y de que la confianza baja se destaque. Aun así, los
  totales del día son una estimación, no una medición.
- **El coste lo paga el usuario** con su propia clave. Cada análisis envía una
  imagen comprimida; conviene indicarlo en ajustes.
- **El nombre del modelo por defecto puede quedar obsoleto.** Por eso es
  configurable y el error de modelo inexistente se muestra con su mensaje.
- **El peso para el cálculo sale de la última medición.** El onboarding pasa a
  pedir un peso inicial, que además crea la primera medición y arranca la
  gráfica de progreso desde el primer día.
- **Sexo y edad son necesarios** para la fórmula. El onboarding actual los deja
  fijos, así que hay que añadirlos y migrar el perfil existente pidiéndolos la
  primera vez que se abra la pestaña de comida.
