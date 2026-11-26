import { requireNativeModule } from 'expo';

/** Lo que devuelve el conversor nativo: un archivo listo o un descarte con motivo. */
export type ResultadoConversion =
  | {
      tipo: 'listo';
      /** URI `file://` del archivo generado. */
      archivo: string;
      /** Solo en un sticker animado: cuánto dura el tramo que quedó, en ms (menos que el pedido si se acortó). */
      duracionMs?: number;
    }
  | { tipo: 'descarte'; motivo: string };

/** El tramo de un video que el usuario eligió, en ms desde el principio. */
export interface TramoElegido {
  inicioMs: number;
  finMs: number;
}

interface ConversorNativo {
  /**
   * Convierte un archivo de origen de imagen (URI `file://` o `content://`) en
   * un sticker estático: WebP de 512×512, contenido encajado con bordes
   * transparentes, hasta 100 KB. `destino` es la ruta o URI del WebP a crear.
   */
  convertirImagen(origen: string, destino: string): Promise<ResultadoConversion>;
  /**
   * Convierte un GIF o video (URI `file://` o `content://`) en un sticker
   * animado: WebP animado de 512×512 encajado, sin audio, hasta 500 KB, del
   * `tramo` elegido de un video o, sin tramo (o en un GIF), de los primeros
   * 5 s. Si no entra en el peso baja la calidad y los cuadros por segundo, y
   * después acorta el tramo desde el final hasta 1 s, conservando el inicio; si
   * ni así entra, lo descarta con el motivo. Listo informa la duración final.
   */
  convertirAnimado(origen: string, destino: string, tramo: TramoElegido | null): Promise<ResultadoConversion>;
  /** La duración de un video en ms, sin leer cuadros, o null si no se puede saber (o no es un video). */
  duracionDeVideo(origen: string): Promise<number | null>;
  /** Genera el ícono de bandeja (PNG de 96×96, hasta 50 KB) a partir de un sticker. */
  generarIconoBandeja(sticker: string, destino: string): Promise<ResultadoConversion>;
}

export default requireNativeModule<ConversorNativo>('Conversor');
