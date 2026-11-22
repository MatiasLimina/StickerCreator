# StickerCreator

App Android personal (Expo SDK 58, React Native, TypeScript) que convierte imágenes, GIFs y videos en stickers de WhatsApp. Vocabulario en `GLOSSARY.md`; decisiones en `docs/adr/`.

## Comandos

```bash
npm test                    # Jest (biblioteca de paquetes y demás lógica en TS)
npm run typecheck           # tsc --noEmit
npx expo install <paquete>  # siempre en lugar de npm install <paquete>: resuelve versiones compatibles con el SDK
npx expo-doctor             # diagnóstico de dependencias y config
npx expo run:android        # development build local (requiere Android SDK)
# tests instrumentados del conversor, con un teléfono o emulador conectado (después de `npx expo prebuild`):
cd android && ./gradlew :conversor:connectedDebugAndroidTest
```

Las pruebas nativas y los builds locales se hacen en un teléfono físico por USB, sin emulador: SDK en `D:\DevTools\Android`, paso a paso en `docs/agents/probar-en-telefono.md` (incluye el arreglo de rutas largas de Windows).

## Reglas

- Expo cambia mucho entre SDKs: antes de usar una API de Expo/React Native, leé la doc versionada (`https://docs.expo.dev/versions/v58.0.0/`) o `https://docs.expo.dev/llms.txt`, no la memoria.
- `android/` se genera (Continuous Native Generation) y está ignorado: la config nativa va en `app.json` y config plugins, nunca a mano.
- El índice de paquetes vive en `paquetes.json` dentro de la carpeta privada de la app; el proveedor de contenido nativo lo lee, así que su formato es un contrato entre TS y Kotlin.

## Agent skills

### Issue tracker

Issues y specs viven en GitHub Issues de `MatiasLimina/StickerCreator` (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Etiquetas por defecto: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` y `docs/adr/` en la raíz. See `docs/agents/domain.md`.
