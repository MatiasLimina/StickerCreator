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
  /** Versión de datos: sube con cada cambio de contenido para que WhatsApp relea el paquete. */
  version: number;
}

// Forma de `paquetes.json`. Es un contrato con el proveedor de contenido nativo
// (Kotlin), que lo lee para responderle a WhatsApp: cambiarla implica cambiar
// también ese lado. El id de un paquete (`<tipo>-<numero>`) no puede cambiar
// una vez agregado a WhatsApp, por eso se guarda el número desde el primero.
interface PaqueteGuardado {
  tipo: TipoSticker;
  numero: number;
  stickers: string[];
  /** Versión de datos del contenido actual. */
  version: number;
  /**
   * Lo que ve WhatsApp: el proveedor de contenido sirve solo esto, y no
   * publica los paquetes con `publicado: null`. Se actualiza cuando el
   * paquete tiene el mínimo de stickers; si no lo tiene, queda la última
   * versión válida.
   */
  publicado: Publicado | null;
}

interface Publicado {
  version: number;
  nombre: string;
  autor: string;
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
      { tipo: 'estatico', numero: 1, stickers: [], version: 0, publicado: null },
      { tipo: 'animado', numero: 1, stickers: [], version: 0, publicado: null },
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
    version: paquete.version,
  };
}

/** Sube la versión y, si el paquete llega al mínimo, publica su contenido actual. */
function registrarCambio(paquete: PaqueteGuardado): void {
  paquete.version += 1;
  publicarSiCorresponde(paquete);
}

function publicarSiCorresponde(paquete: PaqueteGuardado): void {
  if (paquete.stickers.length >= MINIMO_PARA_AGREGAR) {
    const { nombre, autor } = vista(paquete);
    paquete.publicado = { version: paquete.version, nombre, autor, stickers: [...paquete.stickers] };
  }
}

/**
 * Completa un índice guardado antes de que existiera la versión de datos.
 * Devuelve true si tuvo que cambiar algo, para reescribirlo y que el
 * proveedor nativo lo vea.
 */
function completarIndiceViejo(indice: Indice): boolean {
  let cambio = false;
  for (const paquete of indice.paquetes) {
    if (paquete.version === undefined) {
      paquete.version = paquete.stickers.length;
      paquete.publicado = null;
      publicarSiCorresponde(paquete);
      cambio = true;
    }
  }
  return cambio;
}

export async function abrirBiblioteca(almacen: Almacen): Promise<Biblioteca> {
  const guardado = await almacen.leer();
  // Si el índice está corrupto, JSON.parse lanza: preferimos fallar a arrancar
  // vacío y pisar los stickers del usuario en la próxima escritura.
  const indice: Indice = guardado === null ? indiceInicial() : JSON.parse(guardado);
  if (completarIndiceViejo(indice)) await almacen.escribir(JSON.stringify(indice));

  return {
    paquetes: () => indice.paquetes.map(vista),
    async agregarSticker({ tipo, archivo }) {
      const destino = indice.paquetes.find((p) => p.tipo === tipo)!;
      destino.stickers.push(archivo);
      registrarCambio(destino);
      await almacen.escribir(JSON.stringify(indice));
      return vista(destino);
    },
  };
}
