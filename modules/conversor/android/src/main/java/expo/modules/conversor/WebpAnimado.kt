package expo.modules.conversor

import android.graphics.Bitmap

/** El codificador de WebP animado de libwebp, compilado con el NDK (ver docs/adr/0003). */
internal object WebpAnimado {
  init {
    System.loadLibrary("webpanimado")
  }

  /**
   * Codifica los cuadros (ARGB_8888 de `ancho`×`alto`) como un WebP animado con
   * pérdida, en bucle, con `duracionMs` por cuadro. Devuelve null si libwebp falla.
   */
  @JvmStatic
  external fun codificar(cuadros: Array<Bitmap>, ancho: Int, alto: Int, duracionMs: Int, calidad: Int): ByteArray?
}
