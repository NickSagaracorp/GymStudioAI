const MEDIODIA = 12;

/** Día local en formato YYYY-MM-DD. */
export function diaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Día local de una marca ISO. Nunca `iso.slice(0, 10)`: eso sería UTC. */
export function diaDeIso(iso: string): string {
  return diaLocal(new Date(iso));
}

function aFecha(dia: string): Date {
  const [anio, mes, numero] = dia.split('-').map(Number);
  return new Date(anio ?? 1970, (mes ?? 1) - 1, numero ?? 1, MEDIODIA);
}

export function sumarDias(dia: string, cantidad: number): string {
  const fecha = aFecha(dia);
  fecha.setDate(fecha.getDate() + cantidad);
  return diaLocal(fecha);
}

/** 0 = domingo, 6 = sábado, igual que `Date.getDay()`. */
export function diaSemanaDe(dia: string): number {
  return aFecha(dia).getDay();
}

/** El lunes de la semana a la que pertenece el día. */
export function lunesDe(dia: string): string {
  const semana = diaSemanaDe(dia);
  // Domingo (0) pertenece a la semana que empezó seis días antes.
  return sumarDias(dia, semana === 0 ? -6 : 1 - semana);
}
