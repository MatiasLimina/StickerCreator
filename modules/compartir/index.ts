import { requireNativeModule, type EventSubscription } from 'expo';

/** Un archivo recibido por Compartir: su URI `content://` y su tipo MIME, si se conoce. */
export interface ArchivoCompartido {
  uri: string;
  mimeType: string | null;
}

interface CompartirNativo {
  /** Los archivos que llegaron por Compartir y todavía no se leyeron (vacío si no hay). */
  leerCompartidos(): Promise<ArchivoCompartido[]>;
  /** Avisa que llegaron archivos con la app abierta; se leen con `leerCompartidos`. */
  addListener(evento: 'compartido', escucha: () => void): EventSubscription;
  /** Manda la app al fondo para volver a la app desde la que se compartió. */
  volverAlOrigen(): Promise<void>;
}

export default requireNativeModule<CompartirNativo>('Compartir');
