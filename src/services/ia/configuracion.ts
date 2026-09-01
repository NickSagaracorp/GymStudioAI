import * as SecureStore from 'expo-secure-store';
import { MODELO_POR_DEFECTO } from './analizador';

export const CLAVE_API = 'openai_api_key';
export const CLAVE_MODELO = 'openai_modelo';
export const CLAVE_CONSERVAR_FOTOS = 'conservar_fotos';

/**
 * Clave precargada desde .env, que está fuera de git. Sirve para no tener que
 * escribirla en cada instalación de desarrollo; en cuanto se guarda una clave
 * desde Ajustes, esa manda.
 */
export const CLAVE_POR_DEFECTO = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

async function leer(clave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(clave);
  } catch {
    return null;
  }
}

export async function apiKey(): Promise<string> {
  const guardada = await leer(CLAVE_API);
  if (guardada !== null && guardada.trim() !== '') return guardada;
  return CLAVE_POR_DEFECTO;
}

/** true si la clave en uso viene del .env y no la ha escrito el usuario. */
export async function usaClavePorDefecto(): Promise<boolean> {
  const guardada = await leer(CLAVE_API);
  return (guardada === null || guardada.trim() === '') && CLAVE_POR_DEFECTO !== '';
}

export async function modelo(): Promise<string> {
  const guardado = await leer(CLAVE_MODELO);
  return guardado && guardado.trim() !== '' ? guardado.trim() : MODELO_POR_DEFECTO;
}

/** Las fotos se conservan salvo que el usuario diga lo contrario. */
export async function conservarFotos(): Promise<boolean> {
  return (await leer(CLAVE_CONSERVAR_FOTOS)) !== 'no';
}

export async function guardar(clave: string, valor: string): Promise<void> {
  await SecureStore.setItemAsync(clave, valor);
}
