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
    const elegirTramo = jest.fn().mockResolvedValue({ tramo: tramoElegido });

    const resultado = await convertirTanda(biblioteca, [video], elegirTramo);

    expect(elegirTramo).toHaveBeenCalledWith({ archivo: video, duracionVideo: 18_000, numero: 1, total: 1, enTanda: false });
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

    const resultado = await convertirTanda(biblioteca, [video], jest.fn().mockResolvedValue({ tramo: { inicio: 10_000, fin: 15_000 } }));

    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados · 1 tramo se acortó a 3 s');
    expect(resultado?.acortados).toBe(1);
  });

  it('si el conversor respetó el tramo, el aviso no habla de acortes', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    conversor.duracionDeVideo.mockResolvedValue(18_000);
    conversor.convertirAnimado.mockImplementation(async (_origen, destino) => ({
      tipo: 'listo' as const,
      archivo: destino,
      duracionMs: 3000,
    }));

    const resultado = await convertirTanda(biblioteca, [video], jest.fn().mockResolvedValue({ tramo: tramoElegido }));

    expect(resultado?.aviso).toBe('Agregado a Mis stickers animados');
    expect(resultado?.acortados).toBe(0);
  });
});

describe('selectores de tramo en fila dentro de una tanda', () => {
  const largo1 = { uri: 'content://largo1', mimeType: 'video/mp4' };
  const largo2 = { uri: 'content://largo2', mimeType: 'video/mp4' };
  const largo3 = { uri: 'content://largo3', mimeType: 'video/mp4' };
  const foto = { uri: 'content://foto', mimeType: 'image/jpeg' };
  const corto = { uri: 'content://corto', mimeType: 'video/mp4' };
  const duraciones: Record<string, number> = {
    'content://largo1': 18_000,
    'content://largo2': 30_000,
    'content://largo3': 9000,
    'content://corto': 4000,
  };

  beforeEach(() => {
    conversor.duracionDeVideo.mockImplementation(async (uri: string) => duraciones[uri] ?? null);
  });

  /** El tramo con el que se convirtió cada archivo, en el orden en que se convirtieron. */
  const tramosConvertidos = () =>
    conversor.convertirAnimado.mock.calls.map(([uri, , tramo]) => [uri, tramo ?? null]);

  it('cada video largo pasa por su selector, en el orden de la tanda, y se convierte con su tramo junto con los demás', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const elegirTramo = jest
      .fn()
      .mockResolvedValueOnce({ tramo: { inicio: 2000, fin: 6000 } })
      .mockResolvedValueOnce({ tramo: { inicio: 20_000, fin: 25_000 } });

    const resultado = await convertirTanda(biblioteca, [largo1, foto, corto, largo2], elegirTramo);

    expect(elegirTramo.mock.calls).toEqual([
      [{ archivo: largo1, duracionVideo: 18_000, numero: 1, total: 2, enTanda: true }],
      [{ archivo: largo2, duracionVideo: 30_000, numero: 2, total: 2, enTanda: true }],
    ]);
    expect(tramosConvertidos()).toEqual([
      ['content://largo1', { inicioMs: 2000, finMs: 6000 }],
      ['content://corto', null],
      ['content://largo2', { inicioMs: 20_000, finMs: 25_000 }],
    ]);
    expect(conversor.convertirImagen).toHaveBeenCalledWith('content://foto', expect.any(String));
    expect(resultado?.aviso).toBe('3 agregados a Mis stickers animados, 1 a Mis stickers');
  });

  it('«Usar automático para el resto» conserva el tramo del selector abierto y manda sin tramo a los videos largos que faltan', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const elegirTramo = jest
      .fn()
      .mockResolvedValueOnce({ tramo: { inicio: 2000, fin: 6000 } })
      .mockResolvedValueOnce({ tramo: { inicio: 20_000, fin: 25_000 }, restoAutomatico: true });

    await convertirTanda(biblioteca, [largo1, largo2, foto, largo3], elegirTramo);

    expect(elegirTramo).toHaveBeenCalledTimes(2);
    expect(tramosConvertidos()).toEqual([
      ['content://largo1', { inicioMs: 2000, finMs: 6000 }],
      ['content://largo2', { inicioMs: 20_000, finMs: 25_000 }],
      ['content://largo3', null],
    ]);
  });

  it('volver en un selector del medio de la fila cancela la tanda entera: no convierte nada ni toca la biblioteca', async () => {
    const almacen = crearAlmacenEnMemoria();
    const escribir = jest.spyOn(almacen, 'escribir');
    const biblioteca = await abrirBiblioteca(almacen);
    escribir.mockClear();
    const elegirTramo = jest
      .fn()
      .mockResolvedValueOnce({ tramo: { inicio: 2000, fin: 6000 } })
      .mockResolvedValueOnce(null);

    const resultado = await convertirTanda(biblioteca, [foto, largo1, largo2, largo3], elegirTramo);

    expect(resultado).toBeNull();
    expect(elegirTramo).toHaveBeenCalledTimes(2);
    expect(conversor.convertirImagen).not.toHaveBeenCalled();
    expect(conversor.convertirAnimado).not.toHaveBeenCalled();
    expect(escribir).not.toHaveBeenCalled();
  });

  it('el aviso cuenta los tramos acortados de la tanda', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    // largo1 y largo3 no entran en 500 KB: el conversor los acorta a 3 s y 2 s.
    const finales: Record<string, number> = { 'content://largo1': 3000, 'content://largo2': 5000, 'content://largo3': 2000 };
    conversor.convertirAnimado.mockImplementation(async (origen, destino) => ({
      tipo: 'listo' as const,
      archivo: destino,
      duracionMs: finales[origen],
    }));
    const quintos = { tramo: { inicio: 0, fin: 5000 } };

    const resultado = await convertirTanda(biblioteca, [largo1, largo2, largo3], jest.fn().mockResolvedValue(quintos));

    expect(resultado?.aviso).toBe('3 agregados a Mis stickers animados · 2 tramos se acortaron');
    expect(resultado?.acortados).toBe(2);
  });
});
