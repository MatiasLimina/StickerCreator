import { File, Paths } from 'expo-file-system';
import type { Almacen } from './almacen';

/**
 * Guarda el índice como `paquetes.json` en la carpeta privada de la app
 * (filesDir en Android). El proveedor de contenido nativo lee este mismo
 * archivo para responderle a WhatsApp, así que su ubicación es parte del
 * contrato con el código nativo.
 */
const NOMBRE = 'paquetes.json';

export function crearAlmacenEnArchivo(): Almacen {
  const destino = new File(Paths.document, NOMBRE);
  return {
    async leer() {
      return destino.exists ? destino.text() : null;
    },
    async escribir(indice) {
      // Escribimos a un temporal y lo renombramos encima: si la app muere a
      // mitad de camino, el índice anterior queda intacto.
      const temporal = new File(Paths.document, `${NOMBRE}.tmp`);
      await temporal.write(indice);
      temporal.moveSync(destino, { overwrite: true });
    },
  };
}
