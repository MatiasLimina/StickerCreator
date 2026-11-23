package expo.modules.whatsapp

import android.database.Cursor
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.FileNotFoundException

/**
 * Contrato con WhatsApp: consulta el proveedor por el ContentResolver, como lo
 * hace WhatsApp. Corre en un teléfono: `./gradlew :whatsapp:connectedDebugAndroidTest`
 * desde `android/` (después de `npx expo prebuild`).
 *
 * El `paquetes.json` de cada test tiene la forma que escribe
 * `src/paquetes/biblioteca.ts` (ver sus tests de "lo que la biblioteca publica").
 */
@RunWith(AndroidJUnit4::class)
class ProveedorStickersTest {
  private val contexto = InstrumentationRegistry.getInstrumentation().targetContext
  private val autoridad = ProveedorStickers.autoridad(contexto)
  private val stickers = File(contexto.filesDir, "stickers")
  private val indice = File(contexto.filesDir, "paquetes.json")

  @Before
  fun prepararCarpeta() {
    stickers.deleteRecursively()
    stickers.mkdirs()
    File(contexto.cacheDir, "bandeja").deleteRecursively()
  }

  @After
  fun limpiar() {
    stickers.deleteRecursively()
    indice.delete()
  }

  private fun uri(vararg partes: String): Uri =
    Uri.Builder().scheme("content").authority(autoridad).apply { partes.forEach { appendPath(it) } }.build()

  private fun consultar(vararg partes: String): Cursor =
    contexto.contentResolver.query(uri(*partes), null, null, null, null)!!

  /** Un sticker WebP de 512×512 de un color, para reconocerlo después. */
  private fun sticker(nombre: String, color: Int) {
    val imagen = Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888).apply { eraseColor(color) }
    @Suppress("DEPRECATION")
    File(stickers, nombre).outputStream().use { imagen.compress(Bitmap.CompressFormat.WEBP, 80, it) }
  }

  private fun guardarIndice(json: String) = indice.writeText(json)

  private val estaticoPublicado = """
    {"tipo":"estatico","numero":1,"stickers":["a.webp","b.webp","c.webp"],"version":3,
     "publicado":{"version":3,"nombre":"Mis stickers","autor":"StickerCreator","stickers":["a.webp","b.webp","c.webp"]}}
  """

  private fun filas(cursor: Cursor): List<Map<String, String?>> = cursor.use {
    buildList {
      while (it.moveToNext()) add(it.columnNames.associateWith { columna -> it.getString(it.getColumnIndexOrThrow(columna)) })
    }
  }

  @Test
  fun losMetadatosTraenLoQueWhatsAppPideDeCadaPaquetePublicado() {
    guardarIndice("""{"paquetes":[$estaticoPublicado]}""")

    val paquetes = filas(consultar("metadata"))

    assertEquals(1, paquetes.size)
    val paquete = paquetes.single()
    assertEquals("estatico-1", paquete["sticker_pack_identifier"])
    assertEquals("Mis stickers", paquete["sticker_pack_name"])
    assertEquals("StickerCreator", paquete["sticker_pack_publisher"])
    assertEquals("bandeja.png", paquete["sticker_pack_icon"])
    assertEquals("3", paquete["image_data_version"])
    assertEquals("0", paquete["animated_sticker_pack"])
    assertEquals("0", paquete["whatsapp_will_not_cache_stickers"])
  }

  @Test
  fun unPaqueteSinPublicarNoAparece() {
    guardarIndice(
      """{"paquetes":[$estaticoPublicado,
        {"tipo":"animado","numero":1,"stickers":["x.webp","y.webp"],"version":2,"publicado":null}]}""",
    )

    val ids = filas(consultar("metadata")).map { it["sticker_pack_identifier"] }

    assertEquals(listOf("estatico-1"), ids)
    assertTrue(filas(consultar("metadata", "animado-1")).isEmpty())
    assertTrue(filas(consultar("stickers", "animado-1")).isEmpty())
  }

  @Test
  fun unPaqueteAnimadoSePublicaConLaBanderaDeAnimado() {
    guardarIndice(
      """{"paquetes":[{"tipo":"animado","numero":2,"stickers":["x.webp","y.webp","z.webp"],"version":7,
        "publicado":{"version":7,"nombre":"Mis stickers animados 2","autor":"StickerCreator","stickers":["x.webp","y.webp","z.webp"]}}]}""",
    )

    val paquete = filas(consultar("metadata", "animado-2")).single()

    assertEquals("animado-2", paquete["sticker_pack_identifier"])
    assertEquals("Mis stickers animados 2", paquete["sticker_pack_name"])
    assertEquals("1", paquete["animated_sticker_pack"])
  }

  @Test
  fun losStickersDelPaqueteSeListanConEmojiYSeLeenDelArchivo() {
    guardarIndice("""{"paquetes":[$estaticoPublicado]}""")
    sticker("a.webp", Color.RED)
    sticker("b.webp", Color.GREEN)
    sticker("c.webp", Color.BLUE)

    val lista = filas(consultar("stickers", "estatico-1"))

    assertEquals(listOf("a.webp", "b.webp", "c.webp"), lista.map { it["sticker_file_name"] })
    assertTrue(lista.all { !it["sticker_emoji"].isNullOrEmpty() })
    val leido = contexto.contentResolver.openInputStream(uri("stickers_asset", "estatico-1", "b.webp"))!!
      .use { it.readBytes() }
    assertArrayEquals(File(stickers, "b.webp").readBytes(), leido)
  }

  @Test
  fun elIconoDeBandejaEsUnPngDe96DelPrimerSticker() {
    guardarIndice("""{"paquetes":[$estaticoPublicado]}""")
    sticker("a.webp", Color.RED)
    sticker("b.webp", Color.GREEN)
    sticker("c.webp", Color.BLUE)

    val bytes = contexto.contentResolver.openInputStream(uri("stickers_asset", "estatico-1", "bandeja.png"))!!
      .use { it.readBytes() }

    val opciones = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opciones)
    assertEquals("image/png", opciones.outMimeType)
    assertEquals(96, opciones.outWidth)
    assertEquals(96, opciones.outHeight)
    assertTrue("El ícono pesa ${bytes.size} bytes", bytes.size <= 50 * 1024)
    val icono = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    // Sale del primer sticker (rojo), no de los otros. WebP con pérdida: tolerancia.
    val centro = icono.getPixel(48, 48)
    assertTrue("El centro del ícono es #%08X".format(centro), Color.red(centro) > 200 && Color.green(centro) < 60 && Color.blue(centro) < 60)
  }

  @Test
  fun trasUnCambioLaVersionSubeYAparecenLosStickersNuevos() {
    guardarIndice("""{"paquetes":[$estaticoPublicado]}""")
    val antes = filas(consultar("metadata", "estatico-1")).single()["image_data_version"]

    guardarIndice(
      """{"paquetes":[{"tipo":"estatico","numero":1,"stickers":["a.webp","b.webp","c.webp","d.webp"],"version":4,
        "publicado":{"version":4,"nombre":"Mis stickers","autor":"StickerCreator","stickers":["a.webp","b.webp","c.webp","d.webp"]}}]}""",
    )

    val despues = filas(consultar("metadata", "estatico-1")).single()["image_data_version"]
    assertEquals("3", antes)
    assertEquals("4", despues)
    assertEquals(
      listOf("a.webp", "b.webp", "c.webp", "d.webp"),
      filas(consultar("stickers", "estatico-1")).map { it["sticker_file_name"] },
    )
  }

  @Test
  fun noSirveArchivosQueNoSonDelPaquete() {
    guardarIndice("""{"paquetes":[$estaticoPublicado]}""")
    File(contexto.filesDir, "secreto.txt").writeText("no")

    for (nombre in listOf("d.webp", "../paquetes.json", "..%2Fsecreto.txt")) {
      try {
        contexto.contentResolver.openInputStream(uri("stickers_asset", "estatico-1", nombre))!!.close()
        fail("Sirvió $nombre")
      } catch (esperado: FileNotFoundException) {
      }
    }
    File(contexto.filesDir, "secreto.txt").delete()
  }

  @Test
  fun noAbreArchivosEnModoEscritura() {
    guardarIndice("""{"paquetes":[$estaticoPublicado]}""")
    sticker("a.webp", Color.RED)

    for (modo in listOf("w", "rw", "wt")) {
      try {
        contexto.contentResolver.openAssetFileDescriptor(uri("stickers_asset", "estatico-1", "a.webp"), modo)!!.close()
        fail("Abrió a.webp en modo $modo")
      } catch (esperado: SecurityException) {
      }
    }
  }
}
