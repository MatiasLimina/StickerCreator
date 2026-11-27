# Compilar y probar en el teléfono

Las pruebas nativas (tests instrumentados y la app) se corren en un teléfono físico por USB, no en un emulador: en esta PC el emulador anda mal.

Los comandos están en PowerShell. Desde Git Bash, usá `export VAR=valor` y rutas con barra normal.

## Una sola vez

1. **Android SDK sin emulador** en `D:\DevTools\Android`: `cmdline-tools`, `platform-tools`, `platforms;android-37.0`, `build-tools;37.0.0` y `ndk;27.1.12297006` (las versiones salen de `node_modules/react-native/gradle/libs.versions.toml`).
2. **Rutas largas:** con `LongPathsEnabled = 1` en el registro, reemplazá `D:\DevTools\Android\cmake\<versión>\bin\ninja.exe` por ninja 1.12 o superior. El 1.10 del SDK falla con "Filename longer than 260 characters". `subst` a una unidad raíz no sirve: el autolinking de Expo no encuentra el `package.json`.
3. **Teléfono:** Ajustes → Acerca del teléfono → Información de software → tocá 7 veces "Número de compilación". Después, Ajustes → Opciones de desarrollador → "Depuración USB". Ojo: la pantalla de desarrollador de TalkBack no es la correcta. Al conectar el cable, aceptá "¿Permitir depuración USB?".
4. Si el teléfono tiene un APK de EAS, desinstalalo antes del primer build local. La firma es otra y Android no deja reemplazarlo, y desinstalar borra los datos de la app.

## Cada vez

```powershell
$env:ANDROID_HOME = "D:\DevTools\Android"
$adb = "D:\DevTools\Android\platform-tools\adb.exe"
& $adb devices                     # el teléfono tiene que figurar como "device", no "unauthorized"

npx expo prebuild --platform android --clean --no-install   # solo si cambió app.json, un plugin o una dependencia nativa
cd android
$soloTelefono = "-PreactNativeArchitectures=arm64-v8a", "--max-workers=2"
.\gradlew :conversor:connectedDebugAndroidTest :whatsapp:connectedDebugAndroidTest @soloTelefono   # tests instrumentados en el teléfono
.\gradlew :app:assembleDebug @soloTelefono                  # APK de desarrollo
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
cd ..
```

Para abrir la app con el JS local:

```powershell
& $adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --port 8081
```

Después abrí StickerCreator en el teléfono. No uses `CI=1`: en ese modo Metro no recarga cambios y sirve el JS viejo.

- Resultados de los tests: `modules\<módulo>\android\build\outputs\androidTest-results\connected\debug\*.xml` (`conversor` o `whatsapp`).
- `$soloTelefono` compila el C++ solo para el procesador del teléfono (arm64) y con 2 tareas en paralelo. Sin eso, Gradle compila para las 4 arquitecturas de `gradle.properties`, incluidas las de emulador, y el 2026-11-27 dejó la PC con 0,4 GB de RAM libre.
- El primer build tarda entre 10 y 25 minutos porque compila el C++ de React Native. Los siguientes tardan unos pocos minutos.
- Una dependencia nativa nueva (por ejemplo, de `npx expo install`) obliga a recompilar e instalar el APK. Un cambio solo de JS se ve con Metro, sin recompilar.

## Al terminar

```powershell
& $adb reverse --remove-all
& $adb kill-server
```

Cortá Metro con Ctrl+C y desenchufá el cable. El APK de desarrollo necesita Metro para cargar: para usar la app sin la PC hace falta un build de EAS.
