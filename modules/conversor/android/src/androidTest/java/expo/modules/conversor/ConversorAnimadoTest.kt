package expo.modules.conversor

import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Corre en el teléfono: `./gradlew :conversor:connectedDebugAndroidTest` desde
 * `android/` (después de `npx expo prebuild`).
 *
 * Muestras en `src/androidTest/assets`:
 * - animado.gif: 240×320, 2 s a 10 fps.
 * - video-12s.mp4: 1280×720, 12 s, con audio.
 * - video-pesado.mp4: ruido de 72×72 ampliado, 6 s: no entra en 500 KB con 5 s.
 * - video-imposible.mp4: ruido de 512×512: no entra ni con 1 s.
 */
@RunWith(AndroidJUnit4::class)
class ConversorAnimadoTest {
  private val contexto = InstrumentationRegistry.getInstrumentation().targetContext
  private val conversor = ConversorAnimado(contexto)
  private lateinit var carpeta: File

  @Before
  fun prepararCarpeta() {
    carpeta = File(contexto.cacheDir, "conversor-animado-test").apply {
      deleteRecursively()
      mkdirs()
    }
  }

  private fun muestra(nombre: String): Uri {
    val copia = File(carpeta, nombre)
    InstrumentationRegistry.getInstrumentation().context.assets.open(nombre).use { entrada ->
      copia.outputStream().use { entrada.copyTo(it) }
    }
    return Uri.fromFile(copia)
  }

  /** Lo que importa de un WebP animado, leído del contenedor RIFF a mano. */
  private data class WebpAnimado(val ancho: Int, val alto: Int, val duraciones: List<Int>)

  private fun leerWebp(archivo: File): WebpAnimado {
    val b = ByteBuffer.wrap(archivo.readBytes()).order(ByteOrder.LITTLE_ENDIAN)
    fun fourcc(pos: Int) = String(ByteArray(4) { b.get(pos + it) }, Charsets.US_ASCII)
    fun u24(pos: Int) = (b.get(pos).toInt() and 0xFF) or
      ((b.get(pos + 1).toInt() and 0xFF) shl 8) or ((b.get(pos + 2).toInt() and 0xFF) shl 16)
    assertEquals("RIFF", fourcc(0))
    assertEquals("WEBP", fourcc(8))
    var ancho = 0
    var alto = 0
    val duraciones = mutableListOf<Int>()
    val chunks = mutableListOf<String>()
    var pos = 12
    while (pos + 8 <= b.limit()) {
      val tipo = fourcc(pos)
      val tamano = b.getInt(pos + 4)
      chunks += tipo
      when (tipo) {
        "VP8X" -> { ancho = u24(pos + 12) + 1; alto = u24(pos + 15) + 1 }
        "ANMF" -> duraciones += u24(pos + 8 + 12)
      }
      pos += 8 + tamano + (tamano and 1)
    }
    assertTrue("Falta ANIM: chunks $chunks", "ANIM" in chunks)
    return WebpAnimado(ancho, alto, duraciones)
  }

  private fun stickerAnimado(resultado: Resultado): WebpAnimado {
    assertTrue("Esperaba un sticker y vino $resultado", resultado is Resultado.Listo)
    val archivo = (resultado as Resultado.Listo).archivo
    assertTrue("El sticker pesa ${archivo.length()} bytes", archivo.length() <= 500 * 1024)
    val webp = leerWebp(archivo)
    assertEquals(512, webp.ancho)
    assertEquals(512, webp.alto)
    assertTrue("Tiene ${webp.duraciones.size} cuadros", webp.duraciones.size > 1)
    assertTrue("Cuadros de menos de 8 ms: ${webp.duraciones}", webp.duraciones.all { it >= 8 })
    return webp
  }

  @Test
  fun gifSeConvierteEnStickerAnimadoDe512ConTodoSuTramo() {
    val webp = stickerAnimado(conversor.convertir(muestra("animado.gif"), File(carpeta, "gif.webp")))

    // El GIF dura 2 s: entra entero.
    assertEquals(2000.0, webp.duraciones.sum().toDouble(), 150.0)
  }

  @Test
  fun videoDe12sDaUnStickerDe5sOMenosSinAudio() {
    val webp = stickerAnimado(conversor.convertir(muestra("video-12s.mp4"), File(carpeta, "12s.webp")))

    val duracion = webp.duraciones.sum()
    // Sin audio por construcción: un WebP no puede llevarlo.
    assertTrue("Dura $duracion ms", duracion in 1000..5000)
  }

  @Test
  fun videoMuyPesadoAcortaElTramoHastaEntrarEnElPeso() {
    val webp = stickerAnimado(conversor.convertir(muestra("video-pesado.mp4"), File(carpeta, "pesado.webp")))

    val duracion = webp.duraciones.sum()
    assertTrue("Dura $duracion ms: tendría que haberse acortado", duracion in 1000..4000)
  }

  @Test
  fun videoQueNoEntraNiCon1sSeDescartaConMotivoYNoDejaArchivo() {
    val destino = File(carpeta, "imposible.webp")

    val resultado = conversor.convertir(muestra("video-imposible.mp4"), destino)

    assertTrue("Esperaba un descarte y vino $resultado", resultado is Resultado.Descarte)
    assertTrue((resultado as Resultado.Descarte).motivo.contains("500 KB"))
    assertFalse(destino.exists())
  }

  @Test
  fun archivoQueNoEsGifNiVideoSeDescartaConMotivo() {
    val destino = File(carpeta, "nada.webp")

    val resultado = conversor.convertir(muestra("no-soportado.txt"), destino)

    assertTrue("Esperaba un descarte y vino $resultado", resultado is Resultado.Descarte)
    assertFalse(destino.exists())
  }
}
