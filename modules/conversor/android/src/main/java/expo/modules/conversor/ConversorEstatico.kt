package expo.modules.conversor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ImageDecoder
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException

/** Lo que devuelve el conversor: un archivo listo o un descarte con motivo. */
sealed class Resultado {
  data class Listo(val archivo: File) : Resultado()
  data class Descarte(val motivo: String) : Resultado()
}

private const val LADO_STICKER = 512
private const val PESO_MAXIMO_STICKER = 100 * 1024
private const val LADO_ICONO = 96
private const val PESO_MAXIMO_ICONO = 50 * 1024

// De mejor a peor: se usa la primera calidad que entra en el peso.
private val CALIDADES = listOf(90, 80, 70, 60, 50, 40, 30, 20, 10, 0)

/**
 * Convierte un archivo de origen de imagen en un sticker estático de WhatsApp:
 * WebP de 512×512 con el contenido entero encajado y bordes transparentes, de
 * hasta 100 KB. No depende de Expo, así se prueba directo en el emulador.
 */
class ConversorEstatico(private val contexto: Context) {

  fun convertir(origen: Uri, destino: File): Resultado {
    val imagen = try {
      decodificar(origen)
    } catch (e: IOException) {
      null
    } ?: return Resultado.Descarte("El archivo no es una imagen soportada")

    val lienzo = encajar(imagen, LADO_STICKER)
    val bytes = CALIDADES.asSequence()
      .map { calidad -> comprimir(lienzo, formatoWebp(), calidad) }
      .firstOrNull { it.size <= PESO_MAXIMO_STICKER }
      ?: return Resultado.Descarte("La imagen no entra en 100 KB ni con la calidad mínima")

    return guardar(bytes, destino)
  }

  /** El ícono de bandeja del paquete: PNG de 96×96, de hasta 50 KB. */
  fun iconoDeBandeja(sticker: File, destino: File): Resultado {
    val imagen = BitmapFactory.decodeFile(sticker.path)
      ?: return Resultado.Descarte("El sticker no se pudo leer")
    // PNG ignora la calidad; 96×96 sin comprimir son 36 KB, pero lo chequeamos igual.
    val bytes = comprimir(encajar(imagen, LADO_ICONO), Bitmap.CompressFormat.PNG, 100)
    if (bytes.size > PESO_MAXIMO_ICONO) {
      return Resultado.Descarte("El ícono no entra en 50 KB")
    }
    return guardar(bytes, destino)
  }

  /**
   * Decodifica ya achicada (una foto de 12 MP no entra cómoda en memoria) y
   * en software, porque después se dibuja en un Canvas común. Devuelve null
   * si el formato no se reconoce.
   */
  private fun decodificar(origen: Uri): Bitmap? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val fuente = ImageDecoder.createSource(contexto.contentResolver, origen)
      return ImageDecoder.decodeBitmap(fuente) { decoder, info, _ ->
        decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        val escala = LADO_STICKER.toFloat() / maxOf(info.size.width, info.size.height)
        if (escala < 1f) {
          decoder.setTargetSize(
            maxOf(1, (info.size.width * escala).toInt()),
            maxOf(1, (info.size.height * escala).toInt()),
          )
        }
      }
    }
    // Android 7-8: BitmapFactory no aplica la rotación EXIF de las fotos.
    val limites = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    abrir(origen) { BitmapFactory.decodeStream(it, null, limites) }
    if (limites.outWidth <= 0 || limites.outHeight <= 0) return null
    var muestreo = 1
    while (maxOf(limites.outWidth, limites.outHeight) / (muestreo * 2) >= LADO_STICKER) muestreo *= 2
    val opciones = BitmapFactory.Options().apply { inSampleSize = muestreo }
    return abrir(origen) { BitmapFactory.decodeStream(it, null, opciones) }
  }

  private fun <T> abrir(origen: Uri, leer: (java.io.InputStream) -> T): T {
    val entrada = contexto.contentResolver.openInputStream(origen)
      ?: throw IOException("No se pudo abrir $origen")
    return entrada.use(leer)
  }

  /** Dibuja la imagen entera, centrada, en un cuadrado transparente de `lado`. */
  private fun encajar(imagen: Bitmap, lado: Int): Bitmap {
    val escala = lado.toFloat() / maxOf(imagen.width, imagen.height)
    val ancho = imagen.width * escala
    val alto = imagen.height * escala
    val izquierda = (lado - ancho) / 2
    val arriba = (lado - alto) / 2
    val cuadrado = Bitmap.createBitmap(lado, lado, Bitmap.Config.ARGB_8888)
    Canvas(cuadrado).drawBitmap(
      imagen,
      null,
      RectF(izquierda, arriba, izquierda + ancho, arriba + alto),
      Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG),
    )
    return cuadrado
  }

  @Suppress("DEPRECATION")
  private fun formatoWebp(): Bitmap.CompressFormat =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Bitmap.CompressFormat.WEBP_LOSSY
    else Bitmap.CompressFormat.WEBP // hasta Android 10, WEBP con calidad < 100 es lossy

  private fun comprimir(imagen: Bitmap, formato: Bitmap.CompressFormat, calidad: Int): ByteArray =
    ByteArrayOutputStream().also { imagen.compress(formato, calidad, it) }.toByteArray()

  private fun guardar(bytes: ByteArray, destino: File): Resultado {
    destino.parentFile?.mkdirs()
    destino.writeBytes(bytes)
    return Resultado.Listo(destino)
  }
}
