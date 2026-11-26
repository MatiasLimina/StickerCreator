import Conversor from '../../modules/conversor';
import { abrirBiblioteca } from '../paquetes/biblioteca';
import { crearAlmacenEnMemoria } from '../paquetes/almacen-en-memoria';
import { convertirTanda } from './tanda';

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

const conversor = jest.mocked(Conversor);
const listo = async (_origen: string, destino: string) => ({ tipo: 'listo' as const, archivo: destino });

beforeEach(() => {
  jest.clearAllMocks();
  conversor.convertirImagen.mockImplementation(listo);
  conversor.convertirAnimado.mockImplementation(listo);
});

describe('convertir una tanda de archivos de origen', () => {
  it('cada archivo va a su paquete y el aviso resume la tanda en una línea', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());

    const resultado = await convertirTanda(biblioteca, [
      { uri: 'content://foto1', mimeType: 'image/jpeg' },
      { uri: 'content://gif', mimeType: 'image/gif' },
      { uri: 'content://foto2', mimeType: 'image/png' },
    ]);

    expect(resultado?.aviso).toBe('2 agregados a Mis stickers, 1 a Mis stickers animados');
    expect(biblioteca.paquetes().map((p) => [p.nombre, p.cantidad])).toEqual([
      ['Mis stickers', 2],
      ['Mis stickers animados', 1],
    ]);
  });

  it('un archivo no soportado, uno que el conversor descarta y uno que falla no frenan a los demás', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.convertirAnimado.mockResolvedValueOnce({ tipo: 'descarte', motivo: 'no entra en 500 KB' });
    conversor.convertirImagen
      .mockRejectedValueOnce(new Error('archivo ilegible'))
      .mockImplementation(listo);

    const resultado = await convertirTanda(biblioteca, [
      { uri: 'content://pdf', mimeType: 'application/pdf' },
      { uri: 'content://video', mimeType: 'video/mp4' },
      { uri: 'content://rota', mimeType: 'image/jpeg' },
      { uri: 'content://foto', mimeType: 'image/jpeg' },
    ]);

    expect(resultado?.aviso).toBe('1 agregado a Mis stickers, 3 descartados');
    expect(conversor.convertirImagen).not.toHaveBeenCalledWith('content://pdf', expect.anything());
    expect(biblioteca.paquetes().map((p) => p.cantidad)).toEqual([1, 0]);
  });

  it('con un solo archivo, el aviso nombra el paquete o el motivo del descarte', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const foto = { uri: 'content://foto', mimeType: 'image/jpeg' };

    expect((await convertirTanda(biblioteca, [foto]))?.aviso).toBe('Agregado a Mis stickers');

    conversor.convertirImagen.mockResolvedValueOnce({ tipo: 'descarte', motivo: 'no entra en 100 KB' });
    expect((await convertirTanda(biblioteca, [foto]))?.aviso).toBe('No se pudo crear el sticker: no entra en 100 KB');
  });

  it('varios archivos al mismo paquete se cuentan, aunque no haya descartes', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const foto = { uri: 'content://foto', mimeType: 'image/jpeg' };

    expect((await convertirTanda(biblioteca, [foto, foto, foto]))?.aviso).toBe('3 agregados a Mis stickers');
  });

  it('devuelve cada paquete tocado una sola vez, con todos los stickers de la tanda', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const foto = { uri: 'content://foto', mimeType: 'image/jpeg' };

    const { paquetes } = (await convertirTanda(biblioteca, [foto, foto, foto, { uri: 'x', mimeType: 'text/plain' }]))!;

    expect(paquetes.map((p) => [p.nombre, p.cantidad, p.sePuedeAgregar])).toEqual([['Mis stickers', 3, true]]);
  });
});

describe('elegir el tramo de un video suelto antes de convertirlo', () => {
  const video = { uri: 'content://video', mimeType: 'video/mp4' };
  const tramoElegido = { inicio: 12_000, fin: 15_000 };

  it('un video de más de 5 s pide el selector con su duración y se convierte con el tramo elegido', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockResolvedValue(18_000);
    const elegirTramo = jest.fn().mockResolvedValue(tramoElegido);

    const resultado = await convertirTanda(biblioteca, [video], elegirTramo);

    expect(elegirTramo).toHaveBeenCalledWith(video, 18_000);
    expect(conversor.convertirAnimado).toHaveBeenCalledWith('content://video', expect.any(String), {
      inicioMs: 12_000,
      finMs: 15_000,
    });
    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados');
  });

  it.each([
    ['un GIF largo', { uri: 'content://gif', mimeType: 'image/gif' }, 18_000],
    ['un video de 5 s justos', video, 5000],
    ['un video sin duración conocida', video, null],
  ])('%s se convierte directo, sin selector y con el tramo automático', async (_caso, archivo, duracion) => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockResolvedValue(duracion);
    const elegirTramo = jest.fn();

    const resultado = await convertirTanda(biblioteca, [archivo], elegirTramo);

    expect(elegirTramo).not.toHaveBeenCalled();
    expect(conversor.convertirAnimado).toHaveBeenCalledWith(archivo.uri, expect.any(String), null);
    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados');
  });

  it('si no se puede leer la duración, el video se convierte directo', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockRejectedValue(new Error('archivo ilegible'));
    const elegirTramo = jest.fn();

    await convertirTanda(biblioteca, [video], elegirTramo);

    expect(elegirTramo).not.toHaveBeenCalled();
    expect(conversor.convertirAnimado).toHaveBeenCalledWith('content://video', expect.any(String), null);
  });

  it('volver desde el selector no crea stickers ni toca la biblioteca', async () => {
    const almacen = crearAlmacenEnMemoria();
    const escribir = jest.spyOn(almacen, 'escribir');
    const biblioteca = await abrirBiblioteca(almacen);
    escribir.mockClear();
    conversor.duracionDeVideo.mockResolvedValue(18_000);

    const resultado = await convertirTanda(biblioteca, [video], jest.fn().mockResolvedValue(null));

    expect(resultado).toBeNull();
    expect(conversor.convertirAnimado).not.toHaveBeenCalled();
    expect(escribir).not.toHaveBeenCalled();
    expect(biblioteca.paquetes().map((p) => p.cantidad)).toEqual([0, 0]);
  });

  it('si el conversor acortó el tramo, el aviso lo dice en la misma línea', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockResolvedValue(18_000);
    conversor.convertirAnimado.mockImplementation(async (_origen, destino) => ({
      tipo: 'listo' as const,
      archivo: destino,
      duracionMs: 3000,
    }));

    const resultado = await convertirTanda(biblioteca, [video], jest.fn().mockResolvedValue({ inicio: 10_000, fin: 15_000 }));

    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados · 1 tramo se acortó a 3 s');
  });

  it('si el conversor respetó el tramo, el aviso no habla de acortes', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockResolvedValue(18_000);
    conversor.convertirAnimado.mockImplementation(async (_origen, destino) => ({
      tipo: 'listo' as const,
      archivo: destino,
      duracionMs: 3000,
    }));

    const resultado = await convertirTanda(biblioteca, [video], jest.fn().mockResolvedValue(tramoElegido));

    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados');
  });

  it('en una tanda de varios archivos, los videos largos siguen con el tramo automático (los selectores en fila son de #27)', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockResolvedValue(18_000);
    const elegirTramo = jest.fn();

    await convertirTanda(biblioteca, [video, { uri: 'content://foto', mimeType: 'image/jpeg' }], elegirTramo);

    expect(elegirTramo).not.toHaveBeenCalled();
    expect(conversor.convertirAnimado).toHaveBeenCalledWith('content://video', expect.any(String), null);
  });
});
