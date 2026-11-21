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
