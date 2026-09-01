import * as SecureStore from 'expo-secure-store';
import { MODELO_POR_DEFECTO } from './analizador';

export const CLAVE_API = 'openai_api_key';
export const CLAVE_MODELO = 'openai_modelo';
export const CLAVE_CONSERVAR_FOTOS = 'conservar_fotos';

async function leer(clave: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(clave);
  } catch {
    return null;
  }
}

export async function apiKey(): Promise<string> {
  return (await leer(CLAVE_API)) ?? '';
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
