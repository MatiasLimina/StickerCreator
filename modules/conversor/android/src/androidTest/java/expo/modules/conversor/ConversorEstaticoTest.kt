package expo.modules.conversor

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Corre en emulador o teléfono: `./gradlew :conversor:connectedAndroidTest`
 * desde `android/` (después de `npx expo prebuild`).
 *
 * Los archivos de muestra están en `src/androidTest/assets`:
 * - foto-vertical.jpg: 600×1200 con ruido (el peor caso para comprimir).
 * - foto-horizontal.jpg: 1600×900.
 * - no-soportado.txt: texto plano.
 */
@RunWith(AndroidJUnit4::class)
class ConversorEstaticoTest {
  private val contexto = InstrumentationRegistry.getInstrumentation().targetContext
  private val conversor = ConversorEstatico(contexto)
  private lateinit var carpeta: File

  @Before
  fun prepararCarpeta() {
    carpeta = File(contexto.cacheDir, "conversor-test").apply {
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

  private fun stickerDe(resultado: Resultado): Bitmap {
    assertTrue("Esperaba un sticker y vino $resultado", resultado is Resultado.Listo)
    val archivo = (resultado as Resultado.Listo).archivo
    assertTrue("El sticker pesa ${archivo.length()} bytes", archivo.length() <= 100 * 1024)
    return BitmapFactory.decodeFile(archivo.path)
  }

  private fun alfa(imagen: Bitmap, x: Int, y: Int) = Color.alpha(imagen.getPixel(x, y))

  @Test
  fun fotoVerticalQuedaEn512ConBordesTransparentesALosCostados() {
    val sticker = stickerDe(conversor.convertir(muestra("foto-vertical.jpg"), File(carpeta, "v.webp")))

    assertEquals(512, sticker.width)
    assertEquals(512, sticker.height)
    // 600×1200 encaja como 256×512, centrado: ocupa x de 128 a 384.
    assertEquals(0, alfa(sticker, 20, 256))
    assertEquals(0, alfa(sticker, 491, 256))
    assertEquals(255, alfa(sticker, 256, 256))
    // Toca arriba y abajo: no se recortó nada.
    assertEquals(255, alfa(sticker, 256, 2))
    assertEquals(255, alfa(sticker, 256, 509))
  }

  @Test
  fun fotoHorizontalQuedaEn512ConBordesTransparentesArribaYAbajo() {
    val sticker = stickerDe(conversor.convertir(muestra("foto-horizontal.jpg"), File(carpeta, "h.webp")))

    assertEquals(512, sticker.width)
    assertEquals(512, sticker.height)
    // 1600×900 encaja como 512×288, centrado: ocupa y de 112 a 400.
    assertEquals(0, alfa(sticker, 256, 20))
    assertEquals(0, alfa(sticker, 256, 491))
    assertEquals(255, alfa(sticker, 2, 256))
    assertEquals(255, alfa(sticker, 509, 256))
  }

  @Test
  fun archivoNoSoportadoSeDescartaConMotivoYNoDejaArchivo() {
    val destino = File(carpeta, "nada.webp")

    val resultado = conversor.convertir(muestra("no-soportado.txt"), destino)

    assertTrue("Esperaba un descarte y vino $resultado", resultado is Resultado.Descarte)
    assertTrue((resultado as Resultado.Descarte).motivo.isNotBlank())
    assertTrue(!destino.exists())
  }

  @Test
  fun iconoDeBandejaEsUnPngDe96DeHasta50KB() {
    val sticker = conversor.convertir(muestra("foto-vertical.jpg"), File(carpeta, "v.webp"))
    val origen = (sticker as Resultado.Listo).archivo

    val icono = conversor.iconoDeBandeja(origen, File(carpeta, "icono.png"))

    assertTrue("Esperaba un ícono y vino $icono", icono is Resultado.Listo)
    val archivo = (icono as Resultado.Listo).archivo
    assertTrue("El ícono pesa ${archivo.length()} bytes", archivo.length() <= 50 * 1024)
    val opciones = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(archivo.path, opciones)
    assertEquals("image/png", opciones.outMimeType)
    assertEquals(96, opciones.outWidth)
    assertEquals(96, opciones.outHeight)
  }
}
