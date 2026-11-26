import { launchImageLibraryAsync } from 'expo-image-picker';
import Conversor from '../../modules/conversor';
import { abrirBiblioteca } from '../paquetes/biblioteca';
import { crearAlmacenEnMemoria } from '../paquetes/almacen-en-memoria';
import { crearStickerDesdeGaleria } from './crear-desde-galeria';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///docs' },
  Directory: jest.fn(),
  File: jest.fn().mockImplementation((_carpeta: unknown, nombre: string) => ({
    uri: `file:///docs/stickers/${nombre}`,
  })),
}));
jest.mock('../../modules/conversor', () => ({
  __esModule: true,
  default: { convertirImagen: jest.fn(), convertirAnimado: jest.fn(), duracionDeVideo: jest.fn() },
}));

const elegir = jest.mocked(launchImageLibraryAsync);
const conversor = jest.mocked(Conversor);

type Elegido = { uri: string; type: 'image' | 'video'; mimeType?: string };

function eligio(...assets: Elegido[]) {
  elegir.mockResolvedValue({ canceled: false, assets } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  const listo = async (_origen: string, destino: string) => ({ tipo: 'listo' as const, archivo: destino });
  conversor.convertirImagen.mockImplementation(listo);
  conversor.convertirAnimado.mockImplementation(listo);
});

describe('crear un sticker desde la galería', () => {
  it('un GIF se convierte en sticker animado y queda en "Mis stickers animados"', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    eligio({ uri: 'content://gif', type: 'image', mimeType: 'image/gif' });

    const resultado = await crearStickerDesdeGaleria(biblioteca);

    expect(conversor.convertirAnimado).toHaveBeenCalledWith('content://gif', expect.stringMatching(/\.webp$/), null);
    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados');
    expect(biblioteca.paquetes().find((p) => p.tipo === 'animado')?.cantidad).toBe(1);
    expect(biblioteca.paquetes().find((p) => p.tipo === 'estatico')?.cantidad).toBe(0);
  });

  it('un video se convierte en sticker animado', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    eligio({ uri: 'content://video', type: 'video', mimeType: 'video/mp4' });

    const resultado = await crearStickerDesdeGaleria(biblioteca);

    expect(conversor.convertirAnimado).toHaveBeenCalledWith('content://video', expect.any(String), null);
    expect(resultado?.paquetes.map((p) => p.nombre)).toEqual(['Mis stickers animados']);
  });

  it('un video largo pasa por el selector y se convierte con el tramo elegido', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    eligio({ uri: 'content://video', type: 'video', mimeType: 'video/mp4' });
    conversor.duracionDeVideo.mockResolvedValue(40_000);
    const elegirTramo = jest.fn().mockResolvedValue({ tramo: { inicio: 30_000, fin: 34_000 } });

    await crearStickerDesdeGaleria(biblioteca, elegirTramo);

    expect(elegirTramo).toHaveBeenCalledWith(expect.objectContaining({ archivo: { uri: 'content://video', mimeType: 'video/mp4' }, duracionVideo: 40_000 }));
    expect(conversor.convertirAnimado).toHaveBeenCalledWith('content://video', expect.any(String), {
      inicioMs: 30_000,
      finMs: 34_000,
    });
  });

  it('una foto sigue yendo a "Mis stickers"', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    eligio({ uri: 'content://foto', type: 'image', mimeType: 'image/jpeg' });

    const resultado = await crearStickerDesdeGaleria(biblioteca);

    expect(conversor.convertirImagen).toHaveBeenCalled();
    expect(conversor.convertirAnimado).not.toHaveBeenCalled();
    expect(resultado?.paquetes.map((p) => p.nombre)).toEqual(['Mis stickers']);
  });

  it('un video que no entra en el peso se descarta con el motivo y no se guarda', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    eligio({ uri: 'content://pesado', type: 'video', mimeType: 'video/mp4' });
    conversor.convertirAnimado.mockResolvedValue({ tipo: 'descarte', motivo: 'no entra en 500 KB' });

    const resultado = await crearStickerDesdeGaleria(biblioteca);

    expect(resultado).toEqual({ aviso: 'No se pudo crear el sticker: no entra en 500 KB', paquetes: [], acortados: 0 });
    expect(biblioteca.paquetes().every((p) => p.cantidad === 0)).toBe(true);
  });

  it('se pueden elegir varios archivos: uno por sticker, cada uno en su paquete', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    eligio(
      { uri: 'content://foto', type: 'image', mimeType: 'image/jpeg' },
      { uri: 'content://video', type: 'video' },
      { uri: 'content://foto2', type: 'image', mimeType: 'image/png' },
    );

    const resultado = await crearStickerDesdeGaleria(biblioteca);

    expect(elegir).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true }));
    expect(resultado?.aviso).toBe('2 agregados a Mis stickers, 1 a Mis stickers animados');
    expect(resultado?.paquetes.map((p) => p.nombre)).toEqual(['Mis stickers', 'Mis stickers animados']);
  });
});
