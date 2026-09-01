# Nutrición con análisis por IA — Plan de implementación

> **Para agentes:** los algoritmos y los contratos están en la especificación
> `docs/superpowers/specs/2026-09-01-nutricion-design.md`. Este plan fija el
> orden, los ficheros y los casos de prueba; la spec fija las fórmulas.

**Objetivo:** registrar comidas con foto y descripción, estimarlas con IA bajo
revisión obligatoria, y compararlas con un objetivo diario de macros calculado
en local.

**Orden:** primero el dominio puro, que es donde está el riesgo y se prueba sin
simulador; después la capa de datos; después la red; la interfaz al final.

---

## Tarea 1: Objetivos nutricionales

**Ficheros:** `src/domain/nutricion/tipos.ts`, `src/domain/nutricion/objetivos.ts`
**Test:** `src/domain/nutricion/__tests__/objetivos.test.ts`

Tipos: `NivelActividad`, `Macros`, `ObjetivoNutricional`, `DatosCalculo`.

Funciones puras:
- `metabolismoBasal(datos)` — Mifflin-St Jeor por sexo, con `otro` como media.
- `gastoTotal(datos)` — basal × factor de actividad.
- `caloriasObjetivo(datos)` — gasto ajustado por objetivo de entrenamiento.
- `calcularObjetivo(datos)` — reparto completo de macros y topes.

Casos de prueba:
- Basal de hombre, mujer y otro contra valores calculados a mano.
- Los cinco factores de actividad.
- +10 %, −20 % y 0 % según objetivo.
- La suma `4·P + 4·C + 9·G` cuadra con las calorías, con un margen de 1 kcal.
- Proteína a 2,0 g/kg y a 2,2 g/kg en definición.
- El suelo de grasa de 0,8 g/kg manda cuando el 25 % se queda por debajo.
- Fibra a 14 g por 1000 kcal; topes de azúcares y saturada al 10 %.
- Edad calculada desde la fecha de nacimiento, con el cumpleaños aún por pasar.

---

## Tarea 2: Totales del día

**Ficheros:** `src/domain/nutricion/totales.ts`
**Test:** `src/domain/nutricion/__tests__/totales.test.ts`

- `sumarAlimentos(alimentos)` → `Macros`.
- `totalesDelDia(comidas)` → macros y desglose por momento.
- `progresoContra(objetivo, totales)` → porcentaje por macro y si se pasa de
  los topes.

Casos: día vacío, comida sin alimentos, varias comidas, superar el tope de
azúcares, y cualquier gramo de grasa trans marcado como excedido.

---

## Tarea 3: Validación de lo que devuelve la IA

**Ficheros:** `src/domain/nutricion/validacion.ts`
**Test:** `src/domain/nutricion/__tests__/validacion.test.ts`

`validarAnalisis(bruto)` → `{ alimentos, descartados, avisos }`. Nunca lanza.

Casos: campos ausentes, no numéricos, negativos; `cantidadG` fuera de 1-2000;
azúcares mayores que carbohidratos; saturada más trans mayor que grasa total;
calorías incoherentes por encima y por debajo del 25 %, que se recalculan con
aviso; respuesta que no es objeto; `alimentos` que no es array; array vacío.

---

## Tarea 4: Migración 002 y repositorio de nutrición

**Ficheros:** `src/data/db/migraciones.ts` (añadir), `src/data/db/repos/nutricion.ts`
**Test:** `src/data/db/repos/__tests__/nutricion.test.ts`

Esquema según la sección 6 de la spec. `perfil` gana `nivel_actividad`.

Repositorio: `guardarComida`, `comidasDe(fecha)`, `borrarComida`,
`actualizarAlimento`, `borrarAlimento`, `guardarObjetivo`, `objetivo()`,
`fotosAnterioresA(fecha)`.

Casos: migrar sobre una base de la fase 1 conserva sus datos; guardar una comida
con sus alimentos y recuperarla; borrar la comida borra sus alimentos por cascada;
comidas de un día no traen las de otro.

---

## Tarea 5: Cliente de IA

**Ficheros:** `src/services/ia/analizador.ts`, `src/services/ia/imagen.ts`
**Test:** `src/services/ia/__tests__/analizador.test.ts`

`crearAnalizadorOpenAI({ fetch, apiKey, modelo })` implementa
`AnalizadorDeComida`. Errores tipados: `SIN_CLAVE`, `SIN_RED`, `CLAVE_INVALIDA`,
`CUOTA`, `RESPUESTA_ILEGIBLE`, `TIEMPO_AGOTADO`, `MODELO_INVALIDO`.

Casos con `fetch` simulado: petición bien formada con la imagen y la
descripción; cabecera `Authorization` presente; 401, 429 y 404 de modelo
mapeados; JSON ilegible; red caída; y que **la clave no aparece en el mensaje
de ningún error**.

`imagen.ts` solo envuelve expo-image-manipulator; no se prueba.

---

## Tarea 6: Onboarding ampliado

**Ficheros:** `app/onboarding.tsx`, `src/data/db/repos/perfil.ts`

Añadir sexo, fecha de nacimiento, peso inicial y nivel de actividad. El peso
inicial crea la primera medición. Al terminar se calcula y guarda el objetivo
nutricional.

Perfil existente sin `nivel_actividad`: la migración pone `moderado` y la
pestaña de comida pide los datos que falten la primera vez.

---

## Tarea 7: Navegación por pestañas

**Ficheros:** `app/(tabs)/_layout.tsx`, mover `hoy`, `progreso`, `ajustes`,
crear `comida`. `sesion`, `resumen`, `medicion` y `retos` quedan apiladas fuera.

Verificar que el enrutado sigue funcionando: empezar sesión, terminarla y
volver a la pestaña Hoy.

---

## Tarea 8: Pantalla de comida del día

**Ficheros:** `app/(tabs)/comida.tsx`, `src/ui/componentes/AnilloMacro.tsx`
**Test:** `src/ui/componentes/__tests__/AnilloMacro.test.tsx`

Calorías frente al objetivo, macros con su progreso, desplegable con azúcares,
fibra y desglose de grasa. Comidas del día agrupadas por momento. Selector de
fecha. Botones para añadir con foto o a mano.

---

## Tarea 9: Editor de alimentos

**Ficheros:** `src/ui/componentes/EditorAlimentos.tsx`
**Test:** `src/ui/componentes/__tests__/EditorAlimentos.test.tsx`

Lista editable de alimentos con totales arriba. Cambiar la cantidad recalcula
las macros proporcionalmente. Confianza baja destacada.

Casos: cambiar cantidad recalcula macros y total; borrar un alimento lo quita
del total; añadir uno a mano; guardar devuelve lo que hay en pantalla, no lo
que entró.

---

## Tarea 10: Alta de comida con foto y revisión

**Ficheros:** `app/comida/nueva.tsx`, `app/comida/manual.tsx`

Cámara o galería, descripción, análisis, pantalla de revisión con el editor de
la tarea 9, y guardado. Alta manual con el mismo editor sin IA.

---

## Tarea 11: Ajustes de nutrición

**Ficheros:** `app/(tabs)/ajustes.tsx`

Modelo de IA, interruptor de conservar fotos, borrado de fotos de más de 30
días con el espacio ocupado, nivel de actividad y calorías con opción de
sobrescribirlas.

---

## Tarea 12: Verificación en el emulador

Recorrido completo: onboarding ampliado, objetivo calculado, alta manual de una
comida, totales del día, y alta con foto si hay clave configurada. Capturas de
cada pantalla.
