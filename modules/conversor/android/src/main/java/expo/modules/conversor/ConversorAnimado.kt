package expo.modules.conversor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Movie
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.util.Log
import java.io.File
import java.io.IOException
import kotlin.math.ceil
import kotlin.math.roundToInt

private const val PESO_MAXIMO = 500 * 1024
private const val TRAMO_MAXIMO_MS = 5000L

/** Los cuadros se leen una sola vez a este ritmo; cada intento elige entre ellos. */
private const val FPS_LECTURA = 15

/** Acortes del tramo, en orden, cuando ni con el último paso entra en el peso. */
private val ACORTES_MS = listOf(4000L, 3000L, 2000L, 1000L)

private data class Paso(val fps: Int, val calidad: Int)

// De mejor a peor: baja la calidad y los cuadros por segundo de a poco. El
// último es el piso: más abajo el sticker se ve mal, así que conviene acortar.
// Con 15 fps como máximo, cada cuadro dura 66 ms o más (WhatsApp pide 8 ms).
private val PASOS = listOf(
  Paso(15, 75),
  Paso(15, 50),
  Paso(10, 50),
  Paso(10, 35),
  Paso(8, 35),
  Paso(8, 20),
)

private const val NO_SOPORTADO = "El archivo no es un GIF o video soportado"

/** El tramo leído del archivo de origen, ya encajado en 512×512. */
private class Tramo(val cuadros: List<Bitmap>, val duracionMs: Long)

private class Descartado(val motivo: String) : Exception(motivo)

/**
 * Convierte un GIF o video en un sticker animado de WhatsApp: WebP animado de
 * 512×512 encajado, sin audio, del tramo de los primeros 5 s, de hasta 500 KB.
 * Para entrar en el peso baja la calidad y los cuadros por segundo; si no
 * alcanza, acorta el tramo (5 → 4 → 3 → 2 → 1 s); si ni así entra, lo descarta.
 * No depende de Expo, así se prueba directo en el teléfono.
 */
class ConversorAnimado(private val contexto: Context) {

  fun convertir(origen: Uri, destino: File): Resultado {
    val tramo = try {
      leerTramo(origen)
    } catch (e: Descartado) {
      return Resultado.Descarte(e.motivo)
    }
    try {
      for (duracionMs in duraciones(tramo.duracionMs)) {
        val bytes = mejorQueEntra(tramo.cuadros, duracionMs) ?: continue
        // libwebp junta los cuadros iguales: sin movimiento sale un WebP
        // estático, y WhatsApp rechaza el paquete animado que lo contenga.
        if (!esAnimado(bytes)) return Resultado.Descarte("El archivo no tiene movimiento")
        return guardar(bytes, destino)
      }
      return Resultado.Descarte("El sticker animado no entra en 500 KB ni acortando el tramo a 1 s")
    } finally {
      tramo.cuadros.forEach(Bitmap::recycle)
    }
  }

  /** Un WebP es animado si tiene la cabecera extendida (VP8X) con la marca de animación. */
  private fun esAnimado(webp: ByteArray): Boolean =
    webp.size > 20 && String(webp, 12, 4, Charsets.US_ASCII) == "VP8X" && (webp[20].toInt() and 0x02) != 0

  /** El tramo entero primero y después los acortes que sean más cortos que él. */
  private fun duraciones(tramoMs: Long): List<Long> = listOf(tramoMs) + ACORTES_MS.filter { it < tramoMs }

  /**
   * El primer paso que entra en el peso con esta duración, o null si ni el
   * piso entra. Prueba el piso primero: si no entra, hay que acortar y no
   * vale la pena codificar los pasos mejores.
   */
  private fun mejorQueEntra(cuadros: List<Bitmap>, duracionMs: Long): ByteArray? {
    val piso = codificar(cuadros, duracionMs, PASOS.last())?.takeIf { it.size <= PESO_MAXIMO } ?: return null
    return PASOS.dropLast(1).asSequence()
      .mapNotNull { paso -> codificar(cuadros, duracionMs, paso) }
      .firstOrNull { it.size <= PESO_MAXIMO }
      ?: piso
  }

  /** Codifica la duración pedida con un paso, o null si no alcanza para dos cuadros. */
  private fun codificar(cuadros: List<Bitmap>, duracionMs: Long, paso: Paso): ByteArray? {
    val cantidad = (duracionMs * paso.fps / 1000).toInt()
    if (cantidad < 2) return null
    val duracionCuadroMs = 1000 / paso.fps
    val elegidos = Array(cantidad) { k ->
      cuadros[minOf(cuadros.lastIndex, (k * FPS_LECTURA.toDouble() / paso.fps).roundToInt())]
    }
    val inicio = SystemClock.elapsedRealtime()
    val bytes = WebpAnimado.codificar(elegidos, LADO_STICKER, LADO_STICKER, duracionCuadroMs, paso.calidad)
      ?: throw IllegalStateException("libwebp no pudo codificar la animación")
    Log.d(
      "ConversorAnimado",
      "${duracionMs}ms ${paso.fps}fps q${paso.calidad}: ${bytes.size / 1024}KB en ${SystemClock.elapsedRealtime() - inicio}ms",
    )
    return bytes
  }

  private fun leerTramo(origen: Uri): Tramo = if (esGif(origen)) leerGif(origen) else leerVideo(origen)

  private fun esGif(origen: Uri): Boolean {
    val cabecera = try {
      contexto.abrir(origen) { entrada -> ByteArray(6).also { entrada.read(it) } }
    } catch (e: IOException) {
      throw Descartado(NO_SOPORTADO)
    }
    return String(cabecera, Charsets.US_ASCII).let { it == "GIF87a" || it == "GIF89a" }
  }

  /**
   * Movie está deprecada, pero es la única API de Android que deja pedir el
   * cuadro de un GIF en un instante dado (AnimatedImageDrawable solo lo
   * reproduce), y sigue disponible.
   */
  @Suppress("DEPRECATION")
  private fun leerGif(origen: Uri): Tramo {
    val bytes = contexto.abrir(origen) { it.readBytes() }
    val gif = Movie.decodeByteArray(bytes, 0, bytes.size) ?: throw Descartado(NO_SOPORTADO)
    if (gif.width() <= 0 || gif.height() <= 0) throw Descartado(NO_SOPORTADO)
    if (gif.duration() <= 0) throw Descartado("El GIF no tiene animación")
    val duracionMs = minOf(TRAMO_MAXIMO_MS, gif.duration().toLong())
    val lienzo = Bitmap.createBitmap(gif.width(), gif.height(), Bitmap.Config.ARGB_8888)
    val canvas = Canvas(lienzo)
    try {
      val cuadros = leerCuadros(instantesMs(duracionMs)) { instante ->
        lienzo.eraseColor(Color.TRANSPARENT)
        gif.setTime(instante.toInt())
        gif.draw(canvas, 0f, 0f)
        encajar(lienzo, LADO_STICKER)
      }
      return Tramo(cuadros, duracionMs)
    } finally {
      lienzo.recycle()
    }
  }

  private fun leerVideo(origen: Uri): Tramo {
    val lector = MediaMetadataRetriever()
    try {
      try {
        lector.setDataSource(contexto, origen)
      } catch (e: RuntimeException) {
        throw Descartado(NO_SOPORTADO)
      }
      val duracion = lector.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
      if (lector.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) != "yes" || duracion == null) {
        throw Descartado(NO_SOPORTADO)
      }
      // Se lee hasta el primer cuadro que falte (la duración declarada puede
      // pasarse del último cuadro): saltear uno aceleraría el sticker.
      val cuadros = leerCuadros(instantesMs(minOf(TRAMO_MAXIMO_MS, duracion))) { instante ->
        cuadroDeVideo(lector, instante * 1000)?.let { cuadro ->
          encajar(cuadro, LADO_STICKER).also { cuadro.recycle() }
        }
      }
      if (cuadros.size < 2) {
        cuadros.forEach(Bitmap::recycle)
        throw Descartado("El video es demasiado corto")
      }
      return Tramo(cuadros, cuadros.size * 1000L / FPS_LECTURA)
    } finally {
      lector.release()
    }
  }

  /** El cuadro más cercano al instante, ya achicado si el teléfono lo permite. */
  private fun cuadroDeVideo(lector: MediaMetadataRetriever, instanteUs: Long): Bitmap? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      lector.getScaledFrameAtTime(instanteUs, MediaMetadataRetriever.OPTION_CLOSEST, LADO_STICKER, LADO_STICKER)
    } else {
      lector.getFrameAtTime(instanteUs, MediaMetadataRetriever.OPTION_CLOSEST)
    }

  /**
   * Lee un cuadro por instante hasta el primero que dé null. Si algo falla a
   * mitad de camino, libera los cuadros ya leídos antes de propagar el error.
   */
  private fun leerCuadros(instantesMs: List<Long>, leer: (Long) -> Bitmap?): List<Bitmap> {
    val cuadros = mutableListOf<Bitmap>()
    try {
      for (instante in instantesMs) cuadros += leer(instante) ?: break
      return cuadros
    } catch (e: Throwable) {
      cuadros.forEach(Bitmap::recycle)
      throw e
    }
  }

  private fun instantesMs(duracionMs: Long): List<Long> =
    (0 until ceil(duracionMs * FPS_LECTURA / 1000.0).toInt()).map { it * 1000L / FPS_LECTURA }
}
