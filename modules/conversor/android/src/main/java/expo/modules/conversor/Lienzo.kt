package expo.modules.conversor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import java.io.File
import java.io.IOException
import java.io.InputStream

/** Lado de un sticker de WhatsApp, estático o animado. */
internal const val LADO_STICKER = 512

/** Dibuja la imagen entera, centrada, en un cuadrado transparente de `lado`. */
internal fun encajar(imagen: Bitmap, lado: Int): Bitmap {
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

internal fun guardar(bytes: ByteArray, destino: File): Resultado {
  destino.parentFile?.mkdirs()
  destino.writeBytes(bytes)
  return Resultado.Listo(destino)
}

/** Abre el archivo de origen (URI `file://` o `content://`) y lo lee con `leer`. */
internal fun <T> Context.abrir(origen: Uri, leer: (InputStream) -> T): T {
  val entrada = contentResolver.openInputStream(origen) ?: throw IOException("No se pudo abrir $origen")
  return entrada.use(leer)
}
