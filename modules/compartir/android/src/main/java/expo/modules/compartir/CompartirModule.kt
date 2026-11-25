package expo.modules.compartir

import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * La entrada por el menú Compartir de Android. Los archivos compartidos llegan
 * en el intent de la actividad: al abrir la app (arranque en frío) o, como la
 * actividad es `singleTask`, en un intent nuevo con la app ya abierta.
 */
class CompartirModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Compartir")

    Events("compartido")

    // Devuelve los archivos compartidos pendientes y los marca como leídos,
    // para no convertirlos dos veces (por ejemplo, si JS se recarga).
    AsyncFunction("leerCompartidos") {
      val actividad = appContext.currentActivity ?: return@AsyncFunction emptyList<Map<String, String?>>()
      val archivos = archivosDe(actividad.intent, actividad.contentResolver)
      if (archivos.isNotEmpty()) actividad.intent = Intent(Intent.ACTION_MAIN)
      archivos
    }.runOnQueue(Queues.MAIN)

    // Con la app abierta, el intent nuevo queda como el de la actividad y
    // avisamos a JS, que lo lee con `leerCompartidos`. Si JS todavía no
    // escucha, el pedido no se pierde: lo lee al arrancar.
    OnNewIntent { intent ->
      if (intent.action != Intent.ACTION_SEND && intent.action != Intent.ACTION_SEND_MULTIPLE) return@OnNewIntent
      appContext.currentActivity?.intent = intent
      sendEvent("compartido")
    }

    // Manda la app al fondo: vuelve a primer plano la app desde la que se
    // compartió, y la app sigue viva para la próxima vez.
    AsyncFunction("volverAlOrigen") {
      appContext.currentActivity?.moveTaskToBack(true)
      Unit
    }.runOnQueue(Queues.MAIN)
  }

  private fun archivosDe(intent: Intent?, resolver: ContentResolver): List<Map<String, String?>> {
    val uris: List<Uri> = when (intent?.action) {
      Intent.ACTION_SEND -> listOfNotNull(extraUri(intent))
      Intent.ACTION_SEND_MULTIPLE -> extraUris(intent)
      else -> emptyList()
    }
    // El tipo que declara el intent puede ser genérico ("*/*" al compartir
    // fotos y videos juntos): preferimos el de cada archivo.
    val tipoDelIntent = intent?.type?.takeUnless { it.contains('*') }
    return uris.map { uri ->
      mapOf("uri" to uri.toString(), "mimeType" to (resolver.getType(uri) ?: tipoDelIntent))
    }
  }

  private fun extraUri(intent: Intent): Uri? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    }

  private fun extraUris(intent: Intent): List<Uri> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM)
    }.orEmpty().filterNotNull()
}
