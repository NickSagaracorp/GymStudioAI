const mockAlmacen = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (clave: string) => mockAlmacen.get(clave) ?? null,
  setItemAsync: async (clave: string, valor: string) => {
    mockAlmacen.set(clave, valor);
  },
}));

describe('clave de OpenAI', () => {
  beforeEach(() => {
    mockAlmacen.clear();
    jest.resetModules();
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-de-fichero-env';
  });

  it('usa la clave del .env cuando no hay ninguna guardada', async () => {
    const configuracion = require('../configuracion') as typeof import('../configuracion');
    expect(await configuracion.apiKey()).toBe('sk-de-fichero-env');
    expect(await configuracion.usaClavePorDefecto()).toBe(true);
  });

  it('la clave escrita por el usuario manda sobre la del .env', async () => {
    const configuracion = require('../configuracion') as typeof import('../configuracion');
    await configuracion.guardar(configuracion.CLAVE_API, 'sk-escrita-a-mano');

    expect(await configuracion.apiKey()).toBe('sk-escrita-a-mano');
    expect(await configuracion.usaClavePorDefecto()).toBe(false);
  });

  it('borrar la clave del usuario devuelve el control a la del .env', async () => {
    const configuracion = require('../configuracion') as typeof import('../configuracion');
    await configuracion.guardar(configuracion.CLAVE_API, 'sk-escrita-a-mano');
    await configuracion.guardar(configuracion.CLAVE_API, '');

    expect(await configuracion.apiKey()).toBe('sk-de-fichero-env');
    expect(await configuracion.usaClavePorDefecto()).toBe(true);
  });

  it('sin .env y sin clave guardada devuelve cadena vacía', async () => {
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    const configuracion = require('../configuracion') as typeof import('../configuracion');

    expect(await configuracion.apiKey()).toBe('');
    expect(await configuracion.usaClavePorDefecto()).toBe(false);
  });
});
