# Subir GymStudio AI a TestFlight desde el Mac

TestFlight es solo para iOS y hace falta Xcode, así que esto no se puede hacer
desde la máquina Windows donde se ha desarrollado. En un Mac sí, y es directo.

## 1. Llevarte el proyecto

El repositorio es **local, sin remoto**. Antes de nada, súbelo a un GitHub
privado desde Windows:

```bash
gh repo create GymStudioAI --private --source=. --push
```

O, si prefieres no usar git, copia la carpeta **excluyendo** `node_modules`,
`android` y `.expo`, que son pesadas y se regeneran solas.

### Lo que no viaja en el repositorio, a propósito

| Qué falta | Cómo se recupera |
|---|---|
| `node_modules` | `npm install` |
| `.env` con la clave de OpenAI | Copiar `.env.example` a `.env` y pegar la clave |
| `assets/catalog/ejercicios.json` y las 536 miniaturas | `npm run catalogo` (descarga del CDN, un par de minutos) |
| `android/` y `ios/` | `npx expo prebuild` |

## 2. Preparar el Mac

```bash
npm install
cp .env.example .env        # y pega tu clave de OpenAI
npm run catalogo            # genera el catálogo y las miniaturas
npm test                    # 250 tests, deberían pasar todos
```

## 3. Dos cambios antes de enviar a Apple

### Textos de permisos en español

Apple rechaza builds cuyos permisos no expliquen para qué se piden. El plugin
de `expo-image-picker` pone textos por defecto en inglés. Añade esto en
`app.json`, dentro de `expo.plugins`, sustituyendo la entrada suelta si la hay:

```json
["expo-image-picker", {
  "photosPermission": "GymStudio AI usa tus fotos para estimar las calorías de tus comidas.",
  "cameraPermission": "GymStudio AI usa la cámara para fotografiar tus comidas y estimar sus calorías."
}]
```

### La clave de OpenAI viaja dentro del binario

Está en `.env` y se incrusta al compilar. Si la build va a manos de otros
probadores, gastarían tu saldo. Antes de subir a TestFlight, deja
`EXPO_PUBLIC_OPENAI_API_KEY` vacío en `.env` y que cada probador ponga la suya en
Ajustes, que ya está preparado para eso.

## 4. Compilar y subir

Necesitas cuenta del Apple Developer Program (99 USD/año) y la app creada en
[App Store Connect](https://appstoreconnect.apple.com): Mis apps → **+** →
Nueva app, con el identificador **`com.sagaracorp.gymstudioai`**. Apunta el
*Apple ID de la app*, un número largo.

### Opción A: EAS Build, sin tocar Xcode

Es la más simple. Rellena en `eas.json` los tres marcadores de
`submit.production.ios` (`appleId`, `ascAppId`, `appleTeamId`; este último está
en developer.apple.com → Membership) y luego:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

La primera vez pregunta si gestiona certificados y perfiles por ti. Di que sí.

### Opción B: Xcode en local

```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
open ios/GymStudioAI.xcworkspace
```

En Xcode: selecciona tu equipo en *Signing & Capabilities*, elige *Any iOS
Device* como destino, y **Product → Archive**. Cuando termine, *Distribute App →
App Store Connect → Upload*.

En cualquiera de las dos, la build tarda de diez minutos a una hora en aparecer
en TestFlight. Apple hace una revisión rápida antes de poder repartirla a
probadores externos.

## Lo que conviene probar en el iPhone

Nada de esto se ha podido verificar en iOS, solo en Android:

- La silueta muscular en SVG.
- El deslizamiento horizontal entre ejercicios de la sesión.
- La cámara y la galería al registrar una comida.
- La notificación semanal del día de pesarte.
- El almacenamiento seguro de la clave, que en iOS usa el llavero.
