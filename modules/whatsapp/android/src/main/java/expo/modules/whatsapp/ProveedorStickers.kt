package expo.modules.whatsapp

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.UriMatcher
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
import java.io.FileNotFoundException

/**
 * Implementa el contrato de stickers de WhatsApp (el del proyecto de ejemplo
 * oficial, `WhatsApp/stickers`): metadatos de cada paquete publicado, la lista
 * de sus stickers y sus archivos. Lee el índice en cada consulta, así WhatsApp
 * siempre ve lo último que guardó la biblioteca.
 */
class ProveedorStickers : ContentProvider() {

  private lateinit var rutas: UriMatcher

  override fun onCreate(): Boolean {
    val autoridad = autoridad(context!!)
    rutas = UriMatcher(UriMatcher.NO_MATCH).apply {
      addURI(autoridad, "metadata", METADATOS)
      addURI(autoridad, "metadata/*", METADATOS_DE_UN_PAQUETE)
      addURI(autoridad, "stickers/*", STICKERS)
      addURI(autoridad, "stickers_asset/*/*", ARCHIVO)
    }
    return true
  }

  private fun indice() = IndicePaquetes(context!!.filesDir)

  override fun query(
    uri: Uri,
    projection: Array<out String>?,
    selection: String?,
    selectionArgs: Array<out String>?,
    sortOrder: String?,
  ): Cursor = when (rutas.match(uri)) {
    METADATOS -> metadatos(indice().publicados())
    METADATOS_DE_UN_PAQUETE -> metadatos(listOfNotNull(indice().publicado(uri.lastPathSegment!!)))
    STICKERS -> stickers(indice().publicado(uri.lastPathSegment!!))
    else -> throw IllegalArgumentException("URI desconocida: $uri")
  }

  private fun metadatos(paquetes: List<PaquetePublicado>): Cursor =
    MatrixCursor(COLUMNAS_METADATOS).apply {
      for (paquete in paquetes) {
        addRow(
          arrayOf<Any?>(
            paquete.id,
            paquete.nombre,
            paquete.autor,
            BANDEJA,
            "", // android_play_store_link
            "", // ios_app_download_link
            "", // sticker_pack_publisher_email
            "", // sticker_pack_publisher_website
            "", // sticker_pack_privacy_policy_website
            "", // sticker_pack_license_agreement_website
            paquete.version.toString(),
            0, // whatsapp_will_not_cache_stickers: que los cachee
            if (paquete.animado) 1 else 0,
          ),
        )
      }
    }

  private fun stickers(paquete: PaquetePublicado?): Cursor =
    MatrixCursor(COLUMNAS_STICKERS).apply {
      paquete?.stickers?.forEach { addRow(arrayOf<Any?>(it, EMOJI, "")) }
    }

  override fun openAssetFile(uri: Uri, mode: String): AssetFileDescriptor {
    // Solo lectura: un modo con "w" saltea el permiso de lectura del manifiesto.
    if (mode != "r") throw SecurityException("Los stickers son de solo lectura")
    if (rutas.match(uri) != ARCHIVO) throw FileNotFoundException("URI desconocida: $uri")
    val (id, nombre) = uri.pathSegments.let { it[1] to it[2] }
    val indice = indice()
    val paquete = indice.publicado(id) ?: throw FileNotFoundException("Paquete no publicado: $id")
    // Solo se sirven archivos del paquete: un nombre con "../" no llega a nada.
    val archivo = when (nombre) {
      BANDEJA -> bandeja(paquete, indice)
      in paquete.stickers -> File(indice.carpetaStickers, nombre)
      else -> throw FileNotFoundException("$nombre no es parte de $id")
    }
    return AssetFileDescriptor(
      ParcelFileDescriptor.open(archivo, ParcelFileDescriptor.MODE_READ_ONLY),
      0,
      AssetFileDescriptor.UNKNOWN_LENGTH,
    )
  }

  /**
   * El ícono de bandeja (PNG de 96×96) sale del primer sticker publicado. Se
   * genera la primera vez que WhatsApp lo pide para cada versión y queda en
   * caché; las versiones viejas se borran. WhatsApp puede pedir archivos desde
   * varios hilos a la vez: se genera de a uno.
   */
  @Synchronized
  private fun bandeja(paquete: PaquetePublicado, indice: IndicePaquetes): File {
    val carpeta = File(context!!.cacheDir, "bandeja").apply { mkdirs() }
    val destino = File(carpeta, "${paquete.id}-${paquete.version}.png")
    if (destino.exists()) return destino

    val sticker = BitmapFactory.decodeFile(File(indice.carpetaStickers, paquete.stickers.first()).path)
      ?: throw FileNotFoundException("No se pudo leer el primer sticker de ${paquete.id}")
    val icono = Bitmap.createScaledBitmap(sticker, LADO_BANDEJA, LADO_BANDEJA, true)
    val temporal = File(carpeta, "${destino.name}.tmp")
    temporal.outputStream().use { icono.compress(Bitmap.CompressFormat.PNG, 100, it) }
    temporal.renameTo(destino)
    carpeta.listFiles { f -> f.name.startsWith("${paquete.id}-") && f != destino }?.forEach { it.delete() }
    return destino
  }

  override fun getType(uri: Uri): String? {
    val autoridad = autoridad(context!!)
    return when (rutas.match(uri)) {
      METADATOS -> "vnd.android.cursor.dir/vnd.$autoridad.metadata"
      METADATOS_DE_UN_PAQUETE -> "vnd.android.cursor.item/vnd.$autoridad.metadata"
      STICKERS -> "vnd.android.cursor.dir/vnd.$autoridad.stickers"
      ARCHIVO -> if (uri.lastPathSegment == BANDEJA) "image/png" else "image/webp"
      else -> null
    }
  }

  override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException()
  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException()
  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException()

  companion object {
    /** Debe coincidir con `android:authorities` del manifiesto. */
    fun autoridad(contexto: Context) = "${contexto.packageName}.stickers"

    /** Nombre del ícono de bandeja dentro de cada paquete. */
    const val BANDEJA = "bandeja.png"
    private const val LADO_BANDEJA = 96
    /** WhatsApp pide al menos un emoji por sticker; no le pedimos uno al usuario. */
    private const val EMOJI = "🙂"

    private const val METADATOS = 1
    private const val METADATOS_DE_UN_PAQUETE = 2
    private const val STICKERS = 3
    private const val ARCHIVO = 4

    val COLUMNAS_METADATOS = arrayOf(
      "sticker_pack_identifier",
      "sticker_pack_name",
      "sticker_pack_publisher",
      "sticker_pack_icon",
      "android_play_store_link",
      "ios_app_download_link",
      "sticker_pack_publisher_email",
      "sticker_pack_publisher_website",
      "sticker_pack_privacy_policy_website",
      "sticker_pack_license_agreement_website",
      "image_data_version",
      "whatsapp_will_not_cache_stickers",
      "animated_sticker_pack",
    )

    val COLUMNAS_STICKERS = arrayOf("sticker_file_name", "sticker_emoji", "sticker_accessibility_text")
  }
}
