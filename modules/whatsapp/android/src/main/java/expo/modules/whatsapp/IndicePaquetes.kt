package expo.modules.whatsapp

import org.json.JSONObject
import java.io.File

/** Un paquete tal como se le publica a WhatsApp. */
data class PaquetePublicado(
  val id: String,
  val nombre: String,
  val autor: String,
  val animado: Boolean,
  /** Versión de datos: si cambia, WhatsApp vuelve a leer el paquete. */
  val version: Int,
  /** Nombres de archivo dentro de la carpeta `stickers/`. */
  val stickers: List<String>,
)

/**
 * Lee `paquetes.json`, el índice que escribe la biblioteca de paquetes (TS).
 * Su forma es un contrato con `src/paquetes/biblioteca.ts`: cada paquete tiene
 * `tipo`, `numero` y `publicado` (null mientras no tiene el mínimo de
 * stickers). Acá no se decide nada: se sirve lo que la biblioteca publicó.
 */
class IndicePaquetes(private val carpeta: File) {

  val carpetaStickers: File get() = File(carpeta, "stickers")

  fun publicados(): List<PaquetePublicado> {
    val archivo = File(carpeta, ARCHIVO)
    if (!archivo.exists()) return emptyList()
    val paquetes = JSONObject(archivo.readText()).getJSONArray("paquetes")
    return (0 until paquetes.length()).mapNotNull { i ->
      val paquete = paquetes.getJSONObject(i)
      val publicado = paquete.optJSONObject("publicado") ?: return@mapNotNull null
      val tipo = paquete.getString("tipo")
      val stickers = publicado.getJSONArray("stickers")
      PaquetePublicado(
        id = "$tipo-${paquete.getInt("numero")}",
        nombre = publicado.getString("nombre"),
        autor = publicado.getString("autor"),
        animado = tipo == "animado",
        version = publicado.getInt("version"),
        stickers = (0 until stickers.length()).map { stickers.getString(it) },
      )
    }
  }

  fun publicado(id: String): PaquetePublicado? = publicados().firstOrNull { it.id == id }

  companion object {
    const val ARCHIVO = "paquetes.json"
  }
}
