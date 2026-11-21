/**
 * Dónde la biblioteca guarda su índice (el JSON con los paquetes y sus stickers).
 * En producción es un archivo en la carpeta privada de la app, que también lee
 * el código nativo; en tests, memoria.
 */
export interface Almacen {
  /** El índice guardado, o null si todavía no hay nada. */
  leer(): Promise<string | null>;
  /** Reemplaza el índice completo. */
  escribir(indice: string): Promise<void>;
}
