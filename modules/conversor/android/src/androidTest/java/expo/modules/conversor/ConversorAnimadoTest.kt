package expo.modules.conversor

import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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
 * - video-quieto.mp4: 2 s de un solo color: no tiene movimiento.
 * - video-colores.mp4: 320×240, 10 s de testsrc2 con un recuadro arriba a la
 *   izquierda rojo los primeros 5 s y azul los últimos 5 s.
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
  private data class CabeceraWebp(val ancho: Int, val alto: Int, val duraciones: List<Int>)

  private fun leerWebp(archivo: File): CabeceraWebp {
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
    return CabeceraWebp(ancho, alto, duraciones)
  }

  private fun stickerAnimado(resultado: Resultado): CabeceraWebp {
    assertTrue("Esperaba un sticker y vino $resultado", resultado is Resultado.Listo)
    val archivo = (resultado as Resultado.Listo).archivo
    assertTrue("El sticker pesa ${archivo.length()} bytes", archivo.length() <= 500 * 1024)
    val webp = leerWebp(archivo)
    assertEquals(512, webp.ancho)
    assertEquals(512, webp.alto)
    assertTrue("Tiene ${webp.duraciones.size} cuadros", webp.duraciones.size > 1)
    assertTrue("Cuadros de menos de 8 ms: ${webp.duraciones}", webp.duraciones.all { it >= 8 })
    // El ícono de bandeja sale del primer cuadro, leído con BitmapFactory.
    val primerCuadro = BitmapFactory.decodeFile(archivo.path)
    assertEquals(512, primerCuadro?.width)
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
    // Entra con el tramo entero de 5 s (75 cuadros de 66 ms). Sin audio por
    // construcción: un WebP no puede llevarlo.
    assertEquals(4950, duracion)
  }

  @Test
  fun sinTramoUsaLosPrimeros5sEInformaLaDuracion() {
    val resultado = conversor.convertir(muestra("video-colores.mp4"), File(carpeta, "sin-tramo.webp"))

    stickerAnimado(resultado)
    assertEquals(5000L, (resultado as Resultado.Listo).duracionMs)
    assertEquals("rojo", colorDelRecuadro(resultado.archivo))
  }

  @Test
  fun conTramoLosCuadrosSalenDelInicioElegido() {
    // El recuadro cambia de rojo a azul a los 5 s: medio segundo antes sigue
    // rojo y un segundo después ya es azul.
    val antes = conversor.convertir(
      muestra("video-colores.mp4"),
      File(carpeta, "tramo-antes.webp"),
      TramoElegido(inicioMs = 4500, finMs = 6500),
    )
    val despues = conversor.convertir(
      muestra("video-colores.mp4"),
      File(carpeta, "tramo-despues.webp"),
      TramoElegido(inicioMs = 6000, finMs = 8500),
    )

    stickerAnimado(antes)
    val webp = stickerAnimado(despues)
    assertEquals("rojo", colorDelRecuadro((antes as Resultado.Listo).archivo))
    assertEquals("azul", colorDelRecuadro((despues as Resultado.Listo).archivo))
    // Sin acortar, informa la duración pedida.
    assertEquals(2000L, antes.duracionMs)
    assertEquals(2500L, despues.duracionMs)
    assertEquals(2500.0, webp.duraciones.sum().toDouble(), 150.0)
  }

  @Test
  fun unVideoQueTerminaAntesDeLoDeclaradoNoSeInformaComoAcortado() {
    // El tramo llega justo hasta el final: aunque el último cuadro falte, no
    // es un acorte por peso.
    val resultado = conversor.convertir(
      muestra("video-colores.mp4"),
      File(carpeta, "hasta-el-final.webp"),
      TramoElegido(inicioMs = 6500, finMs = 10000),
    )

    stickerAnimado(resultado)
    assertEquals(3500L, (resultado as Resultado.Listo).duracionMs)
  }

  @Test
  fun conTramoQueNoEntraEnElPesoAcortaDesdeElFinalEInformaLaDuracion() {
    val resultado = conversor.convertir(
      muestra("video-pesado.mp4"),
      File(carpeta, "pesado-tramo.webp"),
      TramoElegido(inicioMs = 1000, finMs = 6000),
    )

    val webp = stickerAnimado(resultado)
    val informada = (resultado as Resultado.Listo).duracionMs!!
    assertTrue("Informa $informada ms: tendría que haberse acortado", informada in 1000L..4000L)
    assertEquals(informada.toDouble(), webp.duraciones.sum().toDouble(), 150.0)
  }

  @Test
  fun laDuracionDeUnVideoSeLeeSinConvertirlo() {
    assertEquals(12000.0, conversor.duracionDeVideo(muestra("video-12s.mp4"))!!.toDouble(), 100.0)
  }

  @Test
  fun laDuracionDeAlgoQueNoEsUnVideoEsDesconocida() {
    assertNull(conversor.duracionDeVideo(muestra("no-soportado.txt")))
    assertNull(conversor.duracionDeVideo(muestra("animado.gif")))
  }

  /**
   * El color del recuadro de video-colores.mp4 en el primer cuadro del
   * sticker: 320×240 encajado en 512×512 queda en 512×384, 64 px más abajo.
   */
  private fun colorDelRecuadro(archivo: File): String {
    val pixel = BitmapFactory.decodeFile(archivo.path).getPixel(64, 128)
    return when {
      Color.red(pixel) > 180 && Color.blue(pixel) < 80 -> "rojo"
      Color.blue(pixel) > 180 && Color.red(pixel) < 80 -> "azul"
      else -> "otro: #${Integer.toHexString(pixel)}"
    }
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
  fun videoSinMovimientoSeDescartaConMotivoYNoDejaArchivo() {
    // libwebp junta los cuadros iguales en uno y saca un WebP estático, que
    // WhatsApp rechazaría dentro de un paquete animado.
    val destino = File(carpeta, "quieto.webp")

    val resultado = conversor.convertir(muestra("video-quieto.mp4"), destino)

    assertTrue("Esperaba un descarte y vino $resultado", resultado is Resultado.Descarte)
    assertTrue((resultado as Resultado.Descarte).motivo.contains("movimiento"))
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
