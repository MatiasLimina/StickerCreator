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
  default: { convertirImagen: jest.fn(), convertirAnimado: jest.fn() },
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

    expect(resultado.aviso).toBe('2 agregados a Mis stickers, 1 a Mis stickers animados');
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

    expect(resultado.aviso).toBe('1 agregado a Mis stickers, 3 descartados');
    expect(conversor.convertirImagen).not.toHaveBeenCalledWith('content://pdf', expect.anything());
    expect(biblioteca.paquetes().map((p) => p.cantidad)).toEqual([1, 0]);
  });

  it('con un solo archivo, el aviso nombra el paquete o el motivo del descarte', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const foto = { uri: 'content://foto', mimeType: 'image/jpeg' };

    expect((await convertirTanda(biblioteca, [foto])).aviso).toBe('Agregado a Mis stickers');

    conversor.convertirImagen.mockResolvedValueOnce({ tipo: 'descarte', motivo: 'no entra en 100 KB' });
    expect((await convertirTanda(biblioteca, [foto])).aviso).toBe('No se pudo crear el sticker: no entra en 100 KB');
  });

  it('devuelve cada paquete tocado una sola vez, con todos los stickers de la tanda', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    const foto = { uri: 'content://foto', mimeType: 'image/jpeg' };

    const { paquetes } = await convertirTanda(biblioteca, [foto, foto, foto, { uri: 'x', mimeType: 'text/plain' }]);

    expect(paquetes.map((p) => [p.nombre, p.cantidad, p.sePuedeAgregar])).toEqual([['Mis stickers', 3, true]]);
  });
});
