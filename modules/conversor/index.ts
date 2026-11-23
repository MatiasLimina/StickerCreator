import { requireNativeModule } from 'expo';

/** Lo que devuelve el conversor nativo: un archivo listo o un descarte con motivo. */
export type ResultadoConversion =
  | { tipo: 'listo'; /** URI `file://` del archivo generado. */ archivo: string }
  | { tipo: 'descarte'; motivo: string };

interface ConversorNativo {
  /**
   * Convierte un archivo de origen de imagen (URI `file://` o `content://`) en
   * un sticker estático: WebP de 512×512, contenido encajado con bordes
   * transparentes, hasta 100 KB. `destino` es la ruta o URI del WebP a crear.
   */
  convertirImagen(origen: string, destino: string): Promise<ResultadoConversion>;
  /**
   * Convierte un GIF o video (URI `file://` o `content://`) en un sticker
   * animado: WebP animado de 512×512 encajado, sin audio, del tramo de los
   * primeros 5 s, hasta 500 KB. Si no entra en el peso baja la calidad y los
   * cuadros por segundo, y después acorta el tramo hasta 1 s; si ni así entra,
   * lo descarta con el motivo.
   */
  convertirAnimado(origen: string, destino: string): Promise<ResultadoConversion>;
  /** Genera el ícono de bandeja (PNG de 96×96, hasta 50 KB) a partir de un sticker. */
  generarIconoBandeja(sticker: string, destino: string): Promise<ResultadoConversion>;
}

export default requireNativeModule<ConversorNativo>('Conversor');
