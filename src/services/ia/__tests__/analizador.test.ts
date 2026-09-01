import { crearAnalizadorOpenAI, ErrorAnalisis, MODELO_POR_DEFECTO } from '../analizador';

const CLAVE = 'sk-clave-secreta-de-prueba';

const ALIMENTO = {
  nombre: 'Pechuga de pollo',
  cantidadG: 180,
  kcal: 297,
  proteinaG: 55.8,
  carbosG: 0,
  azucaresG: 0,
  grasaG: 6.5,
  grasaSaturadaG: 1.9,
  grasaTransG: 0,
  fibraG: 0,
  confianza: 'alta',
};

function respuestaOk(contenido: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(contenido) } }] }),
  } as unknown as Response;
}

function respuestaError(status: number): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

function analizadorCon(fetchFalso: typeof fetch, extras: { modelo?: string } = {}) {
  return crearAnalizadorOpenAI({ fetch: fetchFalso, apiKey: CLAVE, ...extras });
}

const PETICION = { imagenBase64: 'AAAA', descripcion: 'pollo con arroz' };

describe('petición a OpenAI', () => {
  it('envía la imagen, la descripción y el modelo', async () => {
    let url = '';
    let opciones: RequestInit | undefined;

    const fetchFalso = (async (u: string, o: RequestInit) => {
      url = u;
      opciones = o;
      return respuestaOk({ alimentos: [ALIMENTO], notas: '' });
    }) as unknown as typeof fetch;

    await analizadorCon(fetchFalso).analizar(PETICION);

    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const cuerpo = JSON.parse(String(opciones?.body));
    expect(cuerpo.model).toBe(MODELO_POR_DEFECTO);
    expect(JSON.stringify(cuerpo)).toContain('data:image/jpeg;base64,AAAA');
    expect(JSON.stringify(cuerpo)).toContain('pollo con arroz');
    expect(cuerpo.response_format.json_schema.strict).toBe(true);
  });

  it('manda la clave en la cabecera de autorización', async () => {
    let cabeceras: Record<string, string> = {};
    const fetchFalso = (async (_u: string, o: RequestInit) => {
      cabeceras = o.headers as Record<string, string>;
      return respuestaOk({ alimentos: [], notas: '' });
    }) as unknown as typeof fetch;

    await analizadorCon(fetchFalso).analizar(PETICION);

    expect(cabeceras.Authorization).toBe(`Bearer ${CLAVE}`);
  });

  it('respeta el modelo configurado', async () => {
    let cuerpo = '';
    const fetchFalso = (async (_u: string, o: RequestInit) => {
      cuerpo = String(o.body);
      return respuestaOk({ alimentos: [], notas: '' });
    }) as unknown as typeof fetch;

    await analizadorCon(fetchFalso, { modelo: 'gpt-4o' }).analizar(PETICION);

    expect(JSON.parse(cuerpo).model).toBe('gpt-4o');
  });

  it('funciona sin descripción', async () => {
    let cuerpo = '';
    const fetchFalso = (async (_u: string, o: RequestInit) => {
      cuerpo = String(o.body);
      return respuestaOk({ alimentos: [], notas: '' });
    }) as unknown as typeof fetch;

    await analizadorCon(fetchFalso).analizar({ imagenBase64: 'AAAA', descripcion: '  ' });

    expect(cuerpo).toContain('Analiza esta comida.');
  });
});

describe('respuesta correcta', () => {
  it('devuelve los alimentos ya validados', async () => {
    const fetchFalso = (async () =>
      respuestaOk({ alimentos: [ALIMENTO], notas: '' })) as unknown as typeof fetch;

    const resultado = await analizadorCon(fetchFalso).analizar(PETICION);

    expect(resultado.alimentos).toHaveLength(1);
    expect(resultado.alimentos[0]?.nombre).toBe('Pechuga de pollo');
  });

  it('la validación filtra lo incoherente que llegue de la IA', async () => {
    const fetchFalso = (async () =>
      respuestaOk({
        alimentos: [ALIMENTO, { ...ALIMENTO, cantidadG: -5 }],
        notas: '',
      })) as unknown as typeof fetch;

    const resultado = await analizadorCon(fetchFalso).analizar(PETICION);

    expect(resultado.alimentos).toHaveLength(1);
    expect(resultado.descartados).toBe(1);
  });
});

describe('errores', () => {
  async function codigoDe(promesa: Promise<unknown>): Promise<string> {
    try {
      await promesa;
      return 'sin error';
    } catch (fallo) {
      return fallo instanceof ErrorAnalisis ? fallo.codigo : 'otro error';
    }
  }

  it('sin clave ni siquiera llama a la API', async () => {
    let llamadas = 0;
    const fetchFalso = (async () => {
      llamadas += 1;
      return respuestaOk({ alimentos: [], notas: '' });
    }) as unknown as typeof fetch;

    const analizador = crearAnalizadorOpenAI({ fetch: fetchFalso, apiKey: '   ' });

    expect(await codigoDe(analizador.analizar(PETICION))).toBe('SIN_CLAVE');
    expect(llamadas).toBe(0);
  });

  it('distingue clave inválida, cuota y modelo inexistente', async () => {
    const con = (status: number) =>
      analizadorCon((async () => respuestaError(status)) as unknown as typeof fetch);

    expect(await codigoDe(con(401).analizar(PETICION))).toBe('CLAVE_INVALIDA');
    expect(await codigoDe(con(403).analizar(PETICION))).toBe('CLAVE_INVALIDA');
    expect(await codigoDe(con(429).analizar(PETICION))).toBe('CUOTA');
    expect(await codigoDe(con(404).analizar(PETICION))).toBe('MODELO_INVALIDO');
    expect(await codigoDe(con(500).analizar(PETICION))).toBe('ERROR_SERVIDOR');
  });

  it('trata la red caída como falta de conexión', async () => {
    const fetchFalso = (async () => {
      throw new Error('Network request failed');
    }) as unknown as typeof fetch;

    expect(await codigoDe(analizadorCon(fetchFalso).analizar(PETICION))).toBe('SIN_RED');
  });

  it('distingue el tiempo agotado de la falta de red', async () => {
    const fetchFalso = (async () => {
      const fallo = new Error('abortada');
      fallo.name = 'AbortError';
      throw fallo;
    }) as unknown as typeof fetch;

    expect(await codigoDe(analizadorCon(fetchFalso).analizar(PETICION))).toBe('TIEMPO_AGOTADO');
  });

  it('marca como ilegible el contenido que no es JSON', async () => {
    const fetchFalso = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'esto no es JSON' } }] }),
      }) as unknown as Response) as unknown as typeof fetch;

    expect(await codigoDe(analizadorCon(fetchFalso).analizar(PETICION))).toBe(
      'RESPUESTA_ILEGIBLE',
    );
  });

  it('marca como ilegible una respuesta sin contenido', async () => {
    const fetchFalso = (async () =>
      ({ ok: true, status: 200, json: async () => ({ choices: [] }) }) as unknown as Response) as unknown as typeof fetch;

    expect(await codigoDe(analizadorCon(fetchFalso).analizar(PETICION))).toBe(
      'RESPUESTA_ILEGIBLE',
    );
  });

  it('ningún mensaje de error filtra la clave', async () => {
    const estados = [401, 403, 429, 404, 500];
    for (const estado of estados) {
      try {
        await analizadorCon(
          (async () => respuestaError(estado)) as unknown as typeof fetch,
        ).analizar(PETICION);
      } catch (fallo) {
        expect(String((fallo as Error).message)).not.toContain(CLAVE);
        expect(String((fallo as Error).message)).not.toContain('sk-');
      }
    }
  });
});
