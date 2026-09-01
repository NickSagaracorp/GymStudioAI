import { validarAnalisis } from '@/domain/nutricion/validacion';
import type { ResultadoValidacion } from '@/domain/nutricion/validacion';

export type CodigoError =
  | 'SIN_CLAVE'
  | 'SIN_RED'
  | 'CLAVE_INVALIDA'
  | 'CUOTA'
  | 'MODELO_INVALIDO'
  | 'RESPUESTA_ILEGIBLE'
  | 'TIEMPO_AGOTADO'
  | 'ERROR_SERVIDOR';

const MENSAJES: Record<CodigoError, string> = {
  SIN_CLAVE: 'Configura tu clave de OpenAI en Ajustes para analizar fotos.',
  SIN_RED: 'Sin conexión. Puedes registrar la comida a mano.',
  CLAVE_INVALIDA: 'La clave de OpenAI no es válida. Revísala en Ajustes.',
  CUOTA: 'Has superado tu cuota de OpenAI.',
  MODELO_INVALIDO: 'El modelo configurado no existe o no tienes acceso.',
  RESPUESTA_ILEGIBLE: 'La respuesta no se pudo interpretar. Inténtalo otra vez.',
  TIEMPO_AGOTADO: 'El análisis tardó demasiado. Inténtalo otra vez.',
  ERROR_SERVIDOR: 'OpenAI devolvió un error. Inténtalo más tarde.',
};

/** El mensaje sale de una tabla fija: nunca lleva la clave ni el cuerpo crudo. */
export class ErrorAnalisis extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError) {
    super(MENSAJES[codigo]);
    this.name = 'ErrorAnalisis';
    this.codigo = codigo;
  }
}

export interface PeticionAnalisis {
  /** Imagen ya comprimida, en base64 sin el prefijo `data:`. */
  imagenBase64: string;
  descripcion: string;
}

export interface AnalizadorDeComida {
  analizar(peticion: PeticionAnalisis): Promise<ResultadoValidacion>;
}

export const MODELO_POR_DEFECTO = 'gpt-4o-mini';
const URL_API = 'https://api.openai.com/v1/chat/completions';
const TIEMPO_LIMITE_MS = 60_000;

const INSTRUCCIONES =
  'Eres un nutricionista. A partir de la foto y la descripción, identifica cada ' +
  'alimento del plato y estima su cantidad en gramos y sus macronutrientes. ' +
  'Responde solo con el JSON del esquema. Si dudas de una ración, indícalo con ' +
  'una confianza baja en lugar de inventar precisión.';

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['alimentos', 'notas'],
  properties: {
    alimentos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'nombre',
          'cantidadG',
          'kcal',
          'proteinaG',
          'carbosG',
          'azucaresG',
          'grasaG',
          'grasaSaturadaG',
          'grasaTransG',
          'fibraG',
          'confianza',
        ],
        properties: {
          nombre: { type: 'string' },
          cantidadG: { type: 'number' },
          kcal: { type: 'number' },
          proteinaG: { type: 'number' },
          carbosG: { type: 'number' },
          azucaresG: { type: 'number' },
          grasaG: { type: 'number' },
          grasaSaturadaG: { type: 'number' },
          grasaTransG: { type: 'number' },
          fibraG: { type: 'number' },
          confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
        },
      },
    },
    notas: { type: 'string' },
  },
} as const;

function codigoParaEstado(estado: number): CodigoError {
  if (estado === 401 || estado === 403) return 'CLAVE_INVALIDA';
  if (estado === 429) return 'CUOTA';
  if (estado === 404) return 'MODELO_INVALIDO';
  return 'ERROR_SERVIDOR';
}

export function crearAnalizadorOpenAI(opciones: {
  fetch: typeof fetch;
  apiKey: string;
  modelo?: string;
  tiempoLimiteMs?: number;
}): AnalizadorDeComida {
  const { apiKey, modelo = MODELO_POR_DEFECTO, tiempoLimiteMs = TIEMPO_LIMITE_MS } = opciones;

  return {
    async analizar({ imagenBase64, descripcion }): Promise<ResultadoValidacion> {
      if (apiKey.trim() === '') throw new ErrorAnalisis('SIN_CLAVE');

      const control = new AbortController();
      const temporizador = setTimeout(() => control.abort(), tiempoLimiteMs);

      let respuesta: Response;
      try {
        respuesta = await opciones.fetch(URL_API, {
          method: 'POST',
          signal: control.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: INSTRUCCIONES },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text:
                      descripcion.trim() === ''
                        ? 'Analiza esta comida.'
                        : `Analiza esta comida. El usuario indica: ${descripcion.trim()}`,
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${imagenBase64}` },
                  },
                ],
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'analisis_comida', strict: true, schema: ESQUEMA },
            },
          }),
        });
      } catch (fallo) {
        clearTimeout(temporizador);
        const abortada = fallo instanceof Error && fallo.name === 'AbortError';
        throw new ErrorAnalisis(abortada ? 'TIEMPO_AGOTADO' : 'SIN_RED');
      } finally {
        clearTimeout(temporizador);
      }

      if (!respuesta.ok) throw new ErrorAnalisis(codigoParaEstado(respuesta.status));

      let contenido: unknown;
      try {
        const cuerpo = (await respuesta.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const texto = cuerpo.choices?.[0]?.message?.content;
        if (typeof texto !== 'string') throw new Error('sin contenido');
        contenido = JSON.parse(texto);
      } catch {
        throw new ErrorAnalisis('RESPUESTA_ILEGIBLE');
      }

      return validarAnalisis(contenido);
    },
  };
}
