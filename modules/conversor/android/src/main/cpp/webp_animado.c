// Puente JNI entre ConversorAnimado (Kotlin) y el codificador de animaciones
// de libwebp. Una llamada codifica una animación entera y devuelve los bytes.
#include <android/bitmap.h>
#include <jni.h>

#include "webp/encode.h"
#include "webp/mux.h"

// Agrega un cuadro (Bitmap ARGB_8888 del tamaño del lienzo) al codificador.
static int agregar_cuadro(JNIEnv* env, jobject bitmap, int ancho, int alto,
                          WebPPicture* cuadro, WebPAnimEncoder* codificador,
                          int marca_ms, const WebPConfig* config) {
  AndroidBitmapInfo info;
  if (AndroidBitmap_getInfo(env, bitmap, &info) != ANDROID_BITMAP_RESULT_SUCCESS ||
      info.format != ANDROID_BITMAP_FORMAT_RGBA_8888 ||
      (int)info.width != ancho || (int)info.height != alto) {
    return 0;
  }
  void* pixeles;
  if (AndroidBitmap_lockPixels(env, bitmap, &pixeles) != ANDROID_BITMAP_RESULT_SUCCESS) return 0;
  // Los Bitmap de Android tienen el alfa premultiplicado y libwebp lo espera
  // sin premultiplicar: solo cambia en los pocos píxeles semitransparentes
  // del borde del contenido encajado, así que no vale la pena convertir.
  int ok = WebPPictureImportRGBA(cuadro, (const uint8_t*)pixeles, (int)info.stride);
  AndroidBitmap_unlockPixels(env, bitmap);
  return ok && WebPAnimEncoderAdd(codificador, cuadro, marca_ms, config);
}

// Codifica los cuadros como un WebP animado con pérdida, en bucle infinito,
// todos con la misma duración. Devuelve null si libwebp falla.
JNIEXPORT jbyteArray JNICALL
Java_expo_modules_conversor_WebpAnimado_codificar(JNIEnv* env, jclass clase, jobjectArray cuadros,
                                                  jint ancho, jint alto, jint duracion_ms,
                                                  jint calidad) {
  (void)clase;
  WebPAnimEncoderOptions opciones;
  WebPConfig config;
  WebPPicture cuadro;
  if (!WebPAnimEncoderOptionsInit(&opciones) || !WebPConfigInit(&config) ||
      !WebPPictureInit(&cuadro)) {
    return NULL;
  }
  opciones.anim_params.loop_count = 0;
  opciones.anim_params.bgcolor = 0;  // fondo transparente, como los bordes del encajado
  config.quality = (float)calidad;
  config.thread_level = 1;
  cuadro.use_argb = 1;
  cuadro.width = ancho;
  cuadro.height = alto;

  WebPAnimEncoder* codificador = WebPAnimEncoderNew(ancho, alto, &opciones);
  if (codificador == NULL) return NULL;

  jsize cantidad = (*env)->GetArrayLength(env, cuadros);
  int marca_ms = 0;
  int ok = 1;
  for (jsize i = 0; ok && i < cantidad; ++i) {
    jobject bitmap = (*env)->GetObjectArrayElement(env, cuadros, i);
    ok = agregar_cuadro(env, bitmap, ancho, alto, &cuadro, codificador, marca_ms, &config);
    (*env)->DeleteLocalRef(env, bitmap);
    marca_ms += duracion_ms;
  }
  // El cuadro nulo final marca dónde termina el último cuadro.
  ok = ok && WebPAnimEncoderAdd(codificador, NULL, marca_ms, NULL);

  WebPData salida;
  WebPDataInit(&salida);
  ok = ok && WebPAnimEncoderAssemble(codificador, &salida);

  jbyteArray bytes = NULL;
  if (ok) {
    bytes = (*env)->NewByteArray(env, (jsize)salida.size);
    if (bytes != NULL) {
      (*env)->SetByteArrayRegion(env, bytes, 0, (jsize)salida.size, (const jbyte*)salida.bytes);
    }
  }
  WebPDataClear(&salida);
  WebPPictureFree(&cuadro);
  WebPAnimEncoderDelete(codificador);
  return bytes;
}
