package expo.modules.conversor

import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Puente entre JS y el conversor. Un descarte no es un error: vuelve como
 * resultado normal (`{ tipo: "descarte", motivo }`) para que la app lo muestre
 * y siga.
 */
class ConversorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Conversor")

    AsyncFunction("convertirImagen") { origen: String, destino: String ->
      conversor().convertir(Uri.parse(origen), archivo(destino)).aMapa()
    }

    AsyncFunction("convertirAnimado") { origen: String, destino: String ->
      ConversorAnimado(contexto()).convertir(Uri.parse(origen), archivo(destino)).aMapa()
    }

    AsyncFunction("generarIconoBandeja") { sticker: String, destino: String ->
      conversor().iconoDeBandeja(archivo(sticker), archivo(destino)).aMapa()
    }
  }

  private fun contexto() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun conversor() = ConversorEstatico(contexto())

  /** Acepta una ruta común o una URI `file://` (como las de expo-file-system). */
  private fun archivo(ruta: String): File =
    if (ruta.startsWith("file:")) File(Uri.parse(ruta).path!!) else File(ruta)

  private fun Resultado.aMapa(): Map<String, Any> = when (this) {
    is Resultado.Listo -> mapOf("tipo" to "listo", "archivo" to Uri.fromFile(archivo).toString())
    is Resultado.Descarte -> mapOf("tipo" to "descarte", "motivo" to motivo)
  }
}
