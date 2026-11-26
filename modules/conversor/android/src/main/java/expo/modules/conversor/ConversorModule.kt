package expo.modules.conversor

import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
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

    AsyncFunction("convertirAnimado") { origen: String, destino: String, tramo: TramoDeJs? ->
      ConversorAnimado(contexto()).convertir(Uri.parse(origen), archivo(destino), tramo?.aTramo()).aMapa()
    }

    AsyncFunction("duracionDeVideo") { origen: String ->
      ConversorAnimado(contexto()).duracionDeVideo(Uri.parse(origen))?.toDouble()
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
    is Resultado.Listo -> listOfNotNull(
      "tipo" to "listo",
      "archivo" to Uri.fromFile(archivo).toString(),
      duracionMs?.let { "duracionMs" to it.toDouble() },
    ).toMap()
    is Resultado.Descarte -> mapOf("tipo" to "descarte", "motivo" to motivo)
  }
}

/** El tramo como llega de JS: `{ inicioMs, finMs }`. */
class TramoDeJs : Record {
  @Field var inicioMs: Double = 0.0
  @Field var finMs: Double = 0.0

  fun aTramo() = TramoElegido(inicioMs.toLong(), finMs.toLong())
}
