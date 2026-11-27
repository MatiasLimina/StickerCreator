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
  /**
   * Hay contenido publicado que WhatsApp todavía no confirmó: hace falta
   * pedirle que actualice el paquete. Solo importa si WhatsApp ya lo tiene.
   */
  pendienteEnWhatsApp: boolean;
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
  /**
   * La versión de `publicado` que WhatsApp confirmó la última vez que se le
   * pidió agregar o actualizar el paquete. Solo la usa TS: el proveedor nativo
   * no la lee. Falta en los índices viejos, y ahí cuenta como nunca confirmada.
   */
  confirmada?: number;
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
  /**
   * Saca los stickers de sus paquetes, con una sola versión nueva por paquete,
   * y devuelve los paquetes que cambiaron. Un sticker que ya no está se ignora.
   */
  borrarStickers(archivos: string[]): Promise<VistaPaquete[]>;
  /**
   * Registra que WhatsApp aceptó el paquete en esa versión (la de la vista
   * con la que se le pidió). Si después llegaron cambios, siguen pendientes.
   */
  confirmarEnWhatsApp(id: string, version: number): Promise<void>;
}

function indiceInicial(): Indice {
  return {
    paquetes: [
      { tipo: 'estatico', numero: 1, stickers: [], version: 0, publicado: null },
      { tipo: 'animado', numero: 1, stickers: [], version: 0, publicado: null },
    ],
  };
}

/** "Mis stickers", "Mis stickers 2", "Mis stickers 3"…: el primero va sin número. */
function nombreDe({ tipo, numero }: PaqueteGuardado): string {
  return numero === 1 ? NOMBRE_BASE[tipo] : `${NOMBRE_BASE[tipo]} ${numero}`;
}

function vista(paquete: PaqueteGuardado): VistaPaquete {
  const cantidad = paquete.stickers.length;
  return {
    id: `${paquete.tipo}-${paquete.numero}`,
    nombre: nombreDe(paquete),
    autor: AUTOR,
    tipo: paquete.tipo,
    stickers: [...paquete.stickers],
    cantidad,
    capacidad: CAPACIDAD,
    faltan: Math.max(0, MINIMO_PARA_AGREGAR - cantidad),
    sePuedeAgregar: cantidad >= MINIMO_PARA_AGREGAR,
    icono: paquete.stickers[0] ?? null,
    version: paquete.version,
    pendienteEnWhatsApp: paquete.publicado !== null && paquete.publicado.version !== paquete.confirmada,
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

/**
 * El paquete abierto de un tipo es el de número más alto. Si está lleno, crea
 * el siguiente y lo ubica después del último de su tipo, para que la pantalla
 * los muestre agrupados. El lleno no se toca: su id ya puede estar en WhatsApp.
 */
function paqueteAbierto(indice: Indice, tipo: TipoSticker): PaqueteGuardado {
  const delTipo = indice.paquetes.filter((p) => p.tipo === tipo);
  const masNuevo = delTipo.reduce((a, b) => (b.numero > a.numero ? b : a));
  if (masNuevo.stickers.length < CAPACIDAD) return masNuevo;
  const siguiente: PaqueteGuardado = { tipo, numero: masNuevo.numero + 1, stickers: [], version: 0, publicado: null };
  const ultimoEnLista = delTipo[delTipo.length - 1];
  indice.paquetes.splice(indice.paquetes.indexOf(ultimoEnLista) + 1, 0, siguiente);
  return siguiente;
}

/** Los archivos que nombra el índice: los stickers de cada paquete y los que WhatsApp tiene publicados. */
function archivosEnUso(indice: Indice): Set<string> {
  return new Set(indice.paquetes.flatMap((p) => [...p.stickers, ...(p.publicado?.stickers ?? [])]));
}

/**
 * Abre la biblioteca sobre su almacén. `descartar` elimina del disco el
 * archivo de un sticker que el índice dejó de nombrar: uno borrado que
 * WhatsApp no tiene publicado, o uno que solo seguía vivo en una versión
 * publicada vieja.
 */
export async function abrirBiblioteca(
  almacen: Almacen,
  descartar: (archivo: string) => Promise<void> = async () => {},
): Promise<Biblioteca> {
  const guardado = await almacen.leer();
  // Si el índice está corrupto, JSON.parse lanza: preferimos fallar a arrancar
  // vacío y pisar los stickers del usuario en la próxima escritura.
  const indice: Indice = guardado === null ? indiceInicial() : JSON.parse(guardado);
  if (completarIndiceViejo(indice)) await almacen.escribir(JSON.stringify(indice));

  /**
   * Guarda el índice y recién después descarta los archivos que dejó de
   * nombrar: el proveedor nunca ve un índice que apunta a un archivo borrado.
   * Si descartar falla, el archivo queda huérfano, pero el cambio ya está hecho.
   */
  async function guardar(enUsoAntes: Set<string>) {
    await almacen.escribir(JSON.stringify(indice));
    const enUso = archivosEnUso(indice);
    for (const archivo of enUsoAntes) {
      if (!enUso.has(archivo)) await descartar(archivo).catch(() => {});
    }
  }

  return {
    paquetes: () => indice.paquetes.map(vista),
    async agregarSticker({ tipo, archivo }) {
      const enUso = archivosEnUso(indice);
      const destino = paqueteAbierto(indice, tipo);
      destino.stickers.push(archivo);
      registrarCambio(destino);
      await guardar(enUso);
      return vista(destino);
    },
    async borrarStickers(archivos) {
      const aBorrar = new Set(archivos);
      const tocados = indice.paquetes.filter((p) => p.stickers.some((a) => aBorrar.has(a)));
      if (tocados.length === 0) return [];
      const enUso = archivosEnUso(indice);
      for (const paquete of tocados) {
        paquete.stickers = paquete.stickers.filter((a) => !aBorrar.has(a));
        registrarCambio(paquete);
      }
      await guardar(enUso);
      return tocados.map(vista);
    },
    async confirmarEnWhatsApp(id, version) {
      const paquete = indice.paquetes.find((p) => vista(p).id === id);
      if (!paquete || paquete.confirmada === version) return;
      paquete.confirmada = version;
      await almacen.escribir(JSON.stringify(indice));
    },
  };
}
