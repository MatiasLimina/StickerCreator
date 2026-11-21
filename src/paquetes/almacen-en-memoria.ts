import type { Almacen } from './almacen';

export function crearAlmacenEnMemoria(): Almacen {
  let indice: string | null = null;
  return {
    async leer() {
      return indice;
    },
    async escribir(nuevo) {
      indice = nuevo;
    },
  };
}
