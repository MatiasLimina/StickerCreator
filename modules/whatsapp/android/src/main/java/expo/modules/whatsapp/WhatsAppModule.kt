package expo.modules.whatsapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Agregar a WhatsApp y consultar si un paquete ya está agregado. Siempre
 * apunta a WhatsApp normal (`com.whatsapp`), nunca a WhatsApp Business.
 */
class WhatsAppModule : Module() {
  /** La llamada a `agregar` que espera la respuesta de WhatsApp. */
  private var pendiente: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("WhatsApp")

    AsyncFunction("estaAgregado") { id: String -> estaAgregado(contexto(), id) }

    AsyncFunction("agregar") { id: String, nombre: String, promise: Promise ->
      val contexto = contexto()
      if (!estaInstalado(contexto)) {
        promise.resolve(mapOf("tipo" to "no-instalado"))
        return@AsyncFunction
      }
      // Si quedó una llamada anterior colgada, la cerramos como cancelada.
      pendiente?.resolve(mapOf("tipo" to "cancelado"))
      pendiente = promise
      val intent = Intent(ACCION_AGREGAR).apply {
        setPackage(PAQUETE_WHATSAPP)
        putExtra("sticker_pack_id", id)
        putExtra("sticker_pack_authority", ProveedorStickers.autoridad(contexto))
        putExtra("sticker_pack_name", nombre)
      }
      try {
        appContext.throwingActivity.startActivityForResult(intent, CODIGO_AGREGAR)
      } catch (e: Exception) {
        // Sin esto la llamada quedaría esperando una respuesta que no llega.
        pendiente = null
        throw e
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, resultado ->
      if (resultado.requestCode != CODIGO_AGREGAR) return@OnActivityResult
      val promise = pendiente ?: return@OnActivityResult
      pendiente = null
      val error = resultado.data?.getStringExtra("validation_error")
      promise.resolve(
        when {
          resultado.resultCode == Activity.RESULT_OK -> mapOf("tipo" to "agregado")
          error != null -> mapOf("tipo" to "error", "motivo" to error)
          else -> mapOf("tipo" to "cancelado")
        },
      )
    }
  }

  private fun contexto(): Context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun estaInstalado(contexto: Context): Boolean = try {
    contexto.packageManager.getApplicationInfo(PAQUETE_WHATSAPP, 0).enabled
  } catch (e: PackageManager.NameNotFoundException) {
    false
  }

  /** Le pregunta a WhatsApp si el paquete está en su lista. */
  private fun estaAgregado(contexto: Context, id: String): Boolean {
    if (!estaInstalado(contexto)) return false
    val consulta = Uri.Builder()
      .scheme("content")
      .authority("$PAQUETE_WHATSAPP.provider.sticker_whitelist_check")
      .appendPath("is_whitelisted")
      .appendQueryParameter("authority", ProveedorStickers.autoridad(contexto))
      .appendQueryParameter("identifier", id)
      .build()
    return contexto.contentResolver.query(consulta, null, null, null, null)?.use { cursor ->
      cursor.moveToFirst() && cursor.getInt(cursor.getColumnIndexOrThrow("result")) == 1
    } ?: false
  }

  private companion object {
    const val PAQUETE_WHATSAPP = "com.whatsapp"
    const val ACCION_AGREGAR = "com.whatsapp.intent.action.ENABLE_STICKER_PACK"
    const val CODIGO_AGREGAR = 4704
  }
}
