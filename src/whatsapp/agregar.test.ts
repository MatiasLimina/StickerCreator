import WhatsApp from '../../modules/whatsapp';
import type { VistaPaquete } from '../paquetes/biblioteca';
import { agregarAWhatsApp } from './agregar';

jest.mock('../../modules/whatsapp', () => ({ __esModule: true, default: { agregar: jest.fn(), estaAgregado: jest.fn() } }));

const paquete = { id: 'p1', nombre: 'Mis stickers' } as VistaPaquete;
const respuesta = (r: unknown) => (WhatsApp.agregar as jest.Mock).mockResolvedValueOnce(r);

describe('agregarAWhatsApp: tipo del aviso según cómo terminó', () => {
  it('agregado: aviso normal', async () => {
    respuesta({ tipo: 'agregado' });
    expect(await agregarAWhatsApp(paquete)).toMatchObject({ agregado: true, tipoAviso: 'normal' });
  });
  it('cancelado sin paquete previo: sin aviso', async () => {
    respuesta({ tipo: 'cancelado' });
    expect(await agregarAWhatsApp(paquete)).toMatchObject({ aviso: null });
  });
  it('cancelado con paquete previo: aviso normal (el usuario decidió no confirmar)', async () => {
    respuesta({ tipo: 'cancelado' });
    expect(await agregarAWhatsApp(paquete, true)).toMatchObject({ tipoAviso: 'normal' });
  });
  it('WhatsApp no instalado: error', async () => {
    respuesta({ tipo: 'no-instalado' });
    expect(await agregarAWhatsApp(paquete)).toMatchObject({ agregado: false, tipoAviso: 'error' });
  });
  it('WhatsApp rechazó el paquete: error con su motivo', async () => {
    respuesta({ tipo: 'error', motivo: 'tray_image_file demasiado grande' });
    const r = await agregarAWhatsApp(paquete);
    expect(r.tipoAviso).toBe('error');
    expect(r.aviso).toContain('tray_image_file demasiado grande');
  });
});
