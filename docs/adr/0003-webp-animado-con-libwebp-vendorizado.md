# WebP animado con libwebp vendorizado y compilado con el NDK

Android no codifica WebP animado de forma nativa: `Bitmap.compress` solo hace imágenes sueltas. Para los stickers animados compilamos libwebp 1.6.0 (la biblioteca de referencia de Google, licencia BSD) dentro del módulo `conversor`. Su código fuente está copiado en `modules/conversor/android/third_party/libwebp`, se compila con el mismo NDK que React Native y un puente JNI chico (`webp_animado.c`) expone su codificador de animaciones (`WebPAnimEncoder`). Los cuadros se leen con APIs de Android: `MediaMetadataRetriever` para los videos y `Movie` para los GIF.

## Spike (noviembre de 2026)

Se midió con ffmpeg en la PC el peso de un tramo de 5 s a 512×512, comparando el codificador de animaciones de libwebp con armar el contenedor a mano a partir de cuadros sueltos (cada cuadro es una imagen completa):

| Origen | Ajustes | Codificador de animaciones | Cuadros sueltos |
|---|---|---|---|
| Video con todo en movimiento | 10 fps, calidad 50 | 458 KB | 466 KB |
| Video de prueba (testsrc2) | 10 fps, calidad 50 | 256 KB | 262 KB |
| Fondo quieto con algo que se mueve | 10 fps, calidad 50 | 78 KB | 350 KB |

Cuando casi todo el cuadro se mueve, las dos opciones pesan lo mismo. Pero los GIF y los videos típicos para stickers tienen fondo quieto, y ahí el codificador de animaciones pesa entre 4 y 5 veces menos, porque solo guarda lo que cambió entre cuadros. Con un tope de 500 KB, esa diferencia decide si un sticker entra con 5 s y buena calidad o si hay que acortarlo.

## Considered Options

- **Armar el contenedor WebP animado a mano en Kotlin**, con cuadros comprimidos por `Bitmap.compress`: no suma código nativo, pero cada cuadro va completo y los stickers con fondo quieto pesan entre 4 y 5 veces más. Se descartó.
- **Un fork de ffmpeg-kit** (el original se retiró en 2025 y sus artefactos ya no están en Maven Central): resuelve también la lectura de GIF y video, pero suma decenas de MB al APK, depende de un mantenedor externo sin garantías y arrastra licencias LGPL/GPL. Se descartó.
- **libwebp por JNI** (la elegida): es lo mismo que usa ffmpeg para WebP animado, pero sin el resto de ffmpeg. Suma unos cientos de KB por arquitectura.

## Consequences

- El código de libwebp vive en el repo (unos 3 MB). Para actualizarlo hay que reemplazar la carpeta por la de una versión nueva: ver qué archivos se copiaron en `third_party/libwebp`.
- El primer build compila libwebp para cada arquitectura: tarda un poco más, pero no necesita nada que el NDK de React Native no tenga.
- libwebp se compila optimizado (`-O2`) también en debug: sin eso, en un Samsung S22 cada intento de codificar 5 s tardaba entre 20 y 30 s; optimizado, alrededor de 1 s.
- Lo lento ahora es leer los cuadros del video: `MediaMetadataRetriever` decodifica cada cuadro por separado desde el cuadro clave anterior (unos 20 s para un tramo de 5 s de un video de 720p en el S22). Si con videos reales molesta, el próximo paso es leer en secuencia con `MediaCodec`.
- `Movie` está deprecada. Si Android la quita, la lectura de GIF tendrá que pasar a otro decodificador; el codificador no cambia.
- Los ajustes de peso (calidad, cuadros por segundo y acortes del tramo) están en `ConversorAnimado.kt`.
