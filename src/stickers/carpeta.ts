import { Directory, File, Paths } from 'expo-file-system';

/**
 * Los stickers viven en `stickers/` dentro de la carpeta privada de la app.
 * El índice guarda solo el nombre del archivo: el proveedor de contenido
 * nativo los busca en esta misma carpeta, así que es parte del contrato.
 */
const carpeta = new Directory(Paths.document, 'stickers');

export function archivoDeSticker(nombre: string): File {
  return new File(carpeta, nombre);
}

/** Un nombre nuevo y único para un sticker estático. */
export function nombreNuevo(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
}
