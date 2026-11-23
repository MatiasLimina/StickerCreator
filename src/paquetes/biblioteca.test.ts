import { abrirBiblioteca } from './biblioteca';
import { crearAlmacenEnMemoria } from './almacen-en-memoria';

describe('biblioteca de paquetes', () => {
  it('arranca con "Mis stickers" y "Mis stickers animados" vacíos, a 3 de poder agregarse', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());

    expect(biblioteca.paquetes()).toEqual([
      {
        id: 'estatico-1',
        nombre: 'Mis stickers',
        autor: 'StickerCreator',
        tipo: 'estatico',
        stickers: [],
        cantidad: 0,
        capacidad: 30,
        faltan: 3,
        sePuedeAgregar: false,
        icono: null,
        version: 0,
      },
      {
        id: 'animado-1',
        nombre: 'Mis stickers animados',
        autor: 'StickerCreator',
        tipo: 'animado',
        stickers: [],
        cantidad: 0,
        capacidad: 30,
        faltan: 3,
        sePuedeAgregar: false,
        icono: null,
        version: 0,
      },
    ]);
  });

  it('un sticker estático va a "Mis stickers" y el animado queda intacto', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());

    const destino = await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'gato.webp' });

    expect(destino.nombre).toBe('Mis stickers');
    const [estatico, animado] = biblioteca.paquetes();
    expect(estatico.stickers).toEqual(['gato.webp']);
    expect(estatico.cantidad).toBe(1);
    expect(estatico.faltan).toBe(2);
    expect(animado.stickers).toEqual([]);
  });

  it('con 3 stickers animados el paquete animado se puede agregar y su ícono es el primero', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());

    await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'baile.webp' });
    await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'salto.webp' });
    const animado = await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'giro.webp' });

    expect(animado.nombre).toBe('Mis stickers animados');
    expect(animado.cantidad).toBe(3);
    expect(animado.faltan).toBe(0);
    expect(animado.sePuedeAgregar).toBe(true);
    expect(animado.icono).toBe('baile.webp');
    expect(biblioteca.paquetes()[0].cantidad).toBe(0);
  });

  it('recupera paquetes y stickers al reabrirse sobre el mismo almacén', async () => {
    const almacen = crearAlmacenEnMemoria();
    const primera = await abrirBiblioteca(almacen);
    await primera.agregarSticker({ tipo: 'estatico', archivo: 'gato.webp' });
    await primera.agregarSticker({ tipo: 'animado', archivo: 'baile.webp' });

    const reabierta = await abrirBiblioteca(almacen);

    const [estatico, animado] = reabierta.paquetes();
    expect(estatico.stickers).toEqual(['gato.webp']);
    expect(animado.stickers).toEqual(['baile.webp']);
  });
});

describe('lo que la biblioteca publica para WhatsApp', () => {
  // `paquetes.json` es el contrato con el proveedor de contenido nativo: lo que
  // está en `publicado` es lo único que WhatsApp ve de cada paquete.
  async function publicadoEnElIndice(almacen: ReturnType<typeof crearAlmacenEnMemoria>, id: string) {
    const indice = JSON.parse((await almacen.leer())!);
    const paquete = indice.paquetes.find(
      (p: { tipo: string; numero: number }) => `${p.tipo}-${p.numero}` === id,
    );
    return paquete.publicado;
  }

  it('cada sticker nuevo sube la versión de datos del paquete', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());

    const primero = await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'a.webp' });
    const segundo = await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'b.webp' });

    expect(segundo.version).toBeGreaterThan(primero.version);
    expect(biblioteca.paquetes()[1].version).toBe(0);
  });

  it('un paquete con menos de 3 stickers no se publica', async () => {
    const almacen = crearAlmacenEnMemoria();
    const biblioteca = await abrirBiblioteca(almacen);

    await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'a.webp' });
    await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'b.webp' });

    expect(await publicadoEnElIndice(almacen, 'estatico-1')).toBeNull();
  });

  it('con 3 stickers se publican esos stickers con la versión del paquete', async () => {
    const almacen = crearAlmacenEnMemoria();
    const biblioteca = await abrirBiblioteca(almacen);

    await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'a.webp' });
    await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'b.webp' });
    const paquete = await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'c.webp' });

    expect(await publicadoEnElIndice(almacen, 'animado-1')).toEqual({
      version: paquete.version,
      nombre: 'Mis stickers animados',
      autor: 'StickerCreator',
      stickers: ['a.webp', 'b.webp', 'c.webp'],
    });
  });

  it('un sticker nuevo en un paquete publicado se publica con una versión más alta', async () => {
    const almacen = crearAlmacenEnMemoria();
    const biblioteca = await abrirBiblioteca(almacen);
    for (const archivo of ['a.webp', 'b.webp', 'c.webp']) {
      await biblioteca.agregarSticker({ tipo: 'estatico', archivo });
    }
    const antes = await publicadoEnElIndice(almacen, 'estatico-1');

    await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'd.webp' });

    const despues = await publicadoEnElIndice(almacen, 'estatico-1');
    expect(despues.stickers).toEqual(['a.webp', 'b.webp', 'c.webp', 'd.webp']);
    expect(despues.version).toBeGreaterThan(antes.version);
  });

  it('un índice guardado antes de la versión de datos se publica al abrirlo', async () => {
    const almacen = crearAlmacenEnMemoria();
    await almacen.escribir(
      JSON.stringify({
        paquetes: [
          { tipo: 'estatico', numero: 1, stickers: ['a.webp', 'b.webp', 'c.webp'] },
          { tipo: 'animado', numero: 1, stickers: ['x.webp'] },
        ],
      }),
    );

    const biblioteca = await abrirBiblioteca(almacen);

    const publicado = await publicadoEnElIndice(almacen, 'estatico-1');
    expect(publicado.stickers).toEqual(['a.webp', 'b.webp', 'c.webp']);
    expect(publicado.version).toBe(biblioteca.paquetes()[0].version);
    expect(await publicadoEnElIndice(almacen, 'animado-1')).toBeNull();
  });
});
