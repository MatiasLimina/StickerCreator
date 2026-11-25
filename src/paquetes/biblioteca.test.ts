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

describe('paquetes que se llenan', () => {
  async function agregarVarios(
    biblioteca: Awaited<ReturnType<typeof abrirBiblioteca>>,
    tipo: 'estatico' | 'animado',
    cantidad: number,
    prefijo: string = tipo,
  ) {
    let ultimo;
    for (let i = 1; i <= cantidad; i++) {
      ultimo = await biblioteca.agregarSticker({ tipo, archivo: `${prefijo}-${i}.webp` });
    }
    return ultimo!;
  }

  it('el sticker 31 crea "Mis stickers 2" y el paquete lleno no cambia', async () => {
    const biblioteca = await abrirBiblioteca(crearAlmacenEnMemoria());
    await agregarVarios(biblioteca, 'estatico', 30);
    const lleno = biblioteca.paquetes().find((p) => p.id === 'estatico-1')!;

    const destino = await biblioteca.agregarSticker({ tipo: 'estatico', archivo: 'nuevo.webp' });

    expect(destino.id).toBe('estatico-2');
    expect(destino.nombre).toBe('Mis stickers 2');
    expect(destino.stickers).toEqual(['nuevo.webp']);
    expect(biblioteca.paquetes().find((p) => p.id === 'estatico-1')).toEqual(lleno);
    expect(lleno.cantidad).toBe(30);
  });

  it('la numeración sigue y es independiente para estáticos y animados', async () => {
    const almacen = crearAlmacenEnMemoria();
    const biblioteca = await abrirBiblioteca(almacen);

    const tercero = await agregarVarios(biblioteca, 'estatico', 61);
    const animado = await agregarVarios(biblioteca, 'animado', 31);

    expect(tercero.id).toBe('estatico-3');
    expect(tercero.nombre).toBe('Mis stickers 3');
    expect(animado.id).toBe('animado-2');
    expect(animado.nombre).toBe('Mis stickers animados 2');
    const enPantalla = (await abrirBiblioteca(almacen)).paquetes().map((p) => [p.nombre, p.cantidad]);
    expect(enPantalla).toEqual([
      ['Mis stickers', 30],
      ['Mis stickers 2', 30],
      ['Mis stickers 3', 1],
      ['Mis stickers animados', 30],
      ['Mis stickers animados 2', 1],
    ]);
  });

  it('el paquete nuevo muestra cuántos faltan y con 3 stickers se publica con su nombre', async () => {
    const almacen = crearAlmacenEnMemoria();
    const biblioteca = await abrirBiblioteca(almacen);
    await agregarVarios(biblioteca, 'animado', 30, 'viejo');

    const conUno = await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'a.webp' });
    expect(conUno.faltan).toBe(2);
    expect(conUno.sePuedeAgregar).toBe(false);

    await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'b.webp' });
    const conTres = await biblioteca.agregarSticker({ tipo: 'animado', archivo: 'c.webp' });

    expect(conTres.sePuedeAgregar).toBe(true);
    const indice = JSON.parse((await almacen.leer())!);
    const segundo = indice.paquetes.find((p: { tipo: string; numero: number }) => p.tipo === 'animado' && p.numero === 2);
    expect(segundo.publicado).toEqual({
      version: conTres.version,
      nombre: 'Mis stickers animados 2',
      autor: 'StickerCreator',
      stickers: ['a.webp', 'b.webp', 'c.webp'],
    });
  });
});
