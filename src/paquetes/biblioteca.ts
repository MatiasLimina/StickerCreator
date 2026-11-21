import type { Almacen } from './almacen';

export type TipoSticker = 'estatico' | 'animado';

const CAPACIDAD = 30;
const MINIMO_PARA_AGREGAR = 3;
const AUTOR = 'StickerCreator';
const NOMBRE_BASE: Record<TipoSticker, string> = {
  estatico: 'Mis stickers',
  animado: 'Mis stickers animados',
};

/** Un paquete tal como lo ve la pantalla (y más adelante, WhatsApp). */
export interface VistaPaquete {
  id: string;
  nombre: string;
  autor: string;
  tipo: TipoSticker;
  /** Archivos de los stickers, en orden de llegada. */
  stickers: string[];
  cantidad: number;
  capacidad: number;
  /** Cuántos stickers faltan para poder agregarlo a WhatsApp (0 si ya se puede). */
  faltan: number;
  sePuedeAgregar: boolean;
  /** El primer sticker vigente, o null si el paquete está vacío. */
  icono: string | null;
}

// Forma de `paquetes.json`. Es un contrato con el proveedor de contenido nativo
// (Kotlin), que lo lee para responderle a WhatsApp: cambiarla implica cambiar
// también ese lado. El id de un paquete (`<tipo>-<numero>`) no puede cambiar
// una vez agregado a WhatsApp, por eso se guarda el número desde el primero.
interface PaqueteGuardado {
  tipo: TipoSticker;
  numero: number;
  stickers: string[];
}

interface Indice {
  paquetes: PaqueteGuardado[];
}

export interface StickerNuevo {
  tipo: TipoSticker;
  /** Archivo del sticker ya convertido. */
  archivo: string;
}

export interface Biblioteca {
  paquetes(): VistaPaquete[];
  /** Guarda el sticker en el paquete que le corresponde y devuelve ese paquete. */
  agregarSticker(sticker: StickerNuevo): Promise<VistaPaquete>;
}

function indiceInicial(): Indice {
  return {
    paquetes: [
      { tipo: 'estatico', numero: 1, stickers: [] },
      { tipo: 'animado', numero: 1, stickers: [] },
    ],
  };
}

function vista(paquete: PaqueteGuardado): VistaPaquete {
  const cantidad = paquete.stickers.length;
  return {
    id: `${paquete.tipo}-${paquete.numero}`,
    nombre: NOMBRE_BASE[paquete.tipo],
    autor: AUTOR,
    tipo: paquete.tipo,
    stickers: [...paquete.stickers],
    cantidad,
    capacidad: CAPACIDAD,
    faltan: Math.max(0, MINIMO_PARA_AGREGAR - cantidad),
    sePuedeAgregar: cantidad >= MINIMO_PARA_AGREGAR,
    icono: paquete.stickers[0] ?? null,
  };
}

export async function abrirBiblioteca(almacen: Almacen): Promise<Biblioteca> {
  const guardado = await almacen.leer();
  // Si el índice está corrupto, JSON.parse lanza: preferimos fallar a arrancar
  // vacío y pisar los stickers del usuario en la próxima escritura.
  const indice: Indice = guardado === null ? indiceInicial() : JSON.parse(guardado);

  return {
    paquetes: () => indice.paquetes.map(vista),
    async agregarSticker({ tipo, archivo }) {
      const destino = indice.paquetes.find((p) => p.tipo === tipo)!;
      destino.stickers.push(archivo);
      await almacen.escribir(JSON.stringify(indice));
      return vista(destino);
    },
  };
}
