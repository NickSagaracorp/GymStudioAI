# GymStudio AI

App móvil de entrenamiento con mancuernas y seguimiento de comidas. Funciona
sin internet salvo el análisis de fotos con IA. Todos los datos viven en el
dispositivo: no hay servidor ni cuentas.

React Native + Expo SDK 57 · TypeScript · SQLite · 250 tests.

## Qué hace

**Entrenamiento.** Genera un programa de 8 semanas a partir de tu objetivo, tus
días disponibles y las mancuernas que tienes. Te guía ejercicio a ejercicio con
la animación, la silueta del músculo trabajado y el registro de series con meta
y logro. La carga progresa sola por doble progresión.

**Series descendentes.** Cualquier ejercicio con peso se puede marcar como
descendente: arrancas con el peso tope, vas al fallo, y encadenas bajadas que la
app propone al 80 % del peso anterior.

**Nutrición.** Calcula tus objetivos de calorías y macros con Mifflin-St Jeor.
Registras comidas a mano o fotografiándolas: la IA estima los alimentos y tú
corriges las raciones antes de guardar.

**Progreso.** Peso corporal y nueve medidas, con gráficas y aviso semanal.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # pega tu clave de OpenAI, opcional
npm run catalogo          # descarga el catálogo de ejercicios y sus miniaturas
npm start
```

El catálogo son 536 ejercicios en español con sus animaciones, servidos desde
[ExerciseGymGifsDB](https://github.com/JahelCuadrado/ExerciseGymGifsDB) con la
versión fijada. No se versionan aquí porque se generan.

La clave de OpenAI es opcional: sin ella la app funciona entera salvo el
análisis de comidas por foto, que se puede hacer a mano.

## Estructura

| Carpeta | Qué contiene |
|---|---|
| `app/` | Pantallas y rutas de expo-router |
| `src/domain/` | Motor de entrenamiento y cálculo nutricional. Funciones puras, sin red ni base de datos |
| `src/data/` | Catálogo de ejercicios y SQLite tras un adaptador |
| `src/services/` | Caché de animaciones, avisos y cliente de OpenAI |
| `src/ui/` | Componentes y tema |
| `docs/superpowers/specs/` | Las decisiones de diseño y por qué se tomaron |

`src/domain` no importa React, ni la base de datos, ni la red: recibe datos y
devuelve datos. Ahí está el 80 % del riesgo del proyecto y por eso se prueba
entero sin simulador.

## Comandos

```bash
npm test              # 250 tests
npx tsc --noEmit      # comprobación de tipos
npm run catalogo      # regenera el catálogo de ejercicios
```

## Compilar

Android, en local con el SDK instalado:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Para iOS y TestFlight, ver [`docs/publicar-en-testflight.md`](docs/publicar-en-testflight.md).

## Aviso sobre la clave de OpenAI

`.env` está fuera de git a propósito. La clave se incrusta en el binario al
compilar, así que **si repartes una build a otras personas, gastarían tu
saldo**: deja la variable vacía y que cada uno ponga la suya en Ajustes.
