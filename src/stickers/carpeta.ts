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

/** Elimina del disco el archivo de un sticker, si todavía está. */
export async function eliminarArchivoDeSticker(nombre: string): Promise<void> {
  const archivo = archivoDeSticker(nombre);
  if (archivo.exists) archivo.delete();
}

/** Un nombre nuevo y único para un sticker (estático o animado: los dos son WebP). */
export function nombreNuevo(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
}
