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
  /** Genera el ícono de bandeja (PNG de 96×96, hasta 50 KB) a partir de un sticker. */
  generarIconoBandeja(sticker: string, destino: string): Promise<ResultadoConversion>;
}

export default requireNativeModule<ConversorNativo>('Conversor');
