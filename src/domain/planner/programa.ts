import type { Catalogo, Ejercicio, Musculo } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import { esGrande, PARAMETROS, rangoReps, seriesSemanales } from './parametros';
import { accesoriosPara, anclaPara } from './seleccion';
import { splitPara } from './splits';
import type { DiaPlan, EjercicioDia, ProgramaPlan } from './tipos';

const SEMANAS = 8;
const SERIES_ANCLA_BASE = 4;
const SERIES_POR_ACCESORIO = 3;
const FACTOR_DESCARGA = 0.6;
/**
 * Tope de series por sesión. Con 90 s de descanso, 26 series son unos 58
 * minutos de trabajo; por encima de eso la sesión deja de ser sostenible.
 */
const MAX_SERIES_DIA = 26;
/** Suelo de series de un ancla cuando hay que recortar la sesión. */
const SERIES_MINIMAS_ANCLA = 2;

/** Semana 4 de cada mesociclo es descarga, por eso su bonus es cero. */
const BONUS_POR_SEMANA_DEL_CICLO: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 0 };

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Grandes primero, core siempre al final. */
function ordenarMusculos(musculos: Musculo[]): Musculo[] {
  const peso = (m: Musculo): number => (m === 'abs' ? 2 : esGrande(m) ? 0 : 1);
  return [...musculos].sort((a, b) => peso(a) - peso(b));
}

/**
 * Recorta la sesión hasta entrar en el tope diario, en dos fases. Primero caen
 * accesorios, empezando por el músculo que más volumen acumula. Si el día es
 * solo anclas y aún se pasa (cuerpo completo de nivel avanzado), se bajan
 * series de ancla una a una hasta un suelo de dos, nunca se elimina un ancla.
 */
function recortarAlTope(ejercicios: EjercicioDia[]): EjercicioDia[] {
  const total = (lista: EjercicioDia[]): number =>
    lista.reduce((suma, e) => suma + e.series, 0);

  let resultado = [...ejercicios];

  while (total(resultado) > MAX_SERIES_DIA) {
    const porMusculo = new Map<Musculo, number>();
    for (const ejercicio of resultado) {
      porMusculo.set(
        ejercicio.musculoObjetivo,
        (porMusculo.get(ejercicio.musculoObjetivo) ?? 0) + ejercicio.series,
      );
    }

    const masVolumen = (a: EjercicioDia, b: EjercicioDia): EjercicioDia => {
      const volumenA = porMusculo.get(a.musculoObjetivo) ?? 0;
      const volumenB = porMusculo.get(b.musculoObjetivo) ?? 0;
      if (volumenA !== volumenB) return volumenA > volumenB ? a : b;
      return a.orden > b.orden ? a : b;
    };

    const accesorios = resultado.filter((e) => !e.esAncla);

    if (accesorios.length > 0) {
      const victima = accesorios.reduce(masVolumen);
      resultado = resultado.filter((e) => e !== victima);
      continue;
    }

    const reducibles = resultado.filter((e) => e.series > SERIES_MINIMAS_ANCLA);
    if (reducibles.length === 0) break;

    const objetivo = reducibles.reduce(masVolumen);
    resultado = resultado.map((e) =>
      e === objetivo ? { ...e, series: e.series - 1 } : e,
    );
  }

  return resultado.map((ejercicio, indice) => ({ ...ejercicio, orden: indice + 1 }));
}

function construir(
  ejercicio: Ejercicio,
  musculo: Musculo,
  esAncla: boolean,
  series: number,
  perfil: Perfil,
  orden: number,
): EjercicioDia {
  const { repMin, repMax } = rangoReps(ejercicio.equipamiento, perfil.objetivo);
  return {
    orden,
    ejercicioId: ejercicio.id,
    musculoObjetivo: musculo,
    equipamiento: ejercicio.equipamiento,
    esAncla,
    series,
    repMin,
    repMax,
    descansoSeg: PARAMETROS[perfil.objetivo].descansoSeg,
  };
}

export function generarPrograma(
  perfil: Perfil,
  catalogo: Catalogo,
  semilla: string,
): ProgramaPlan {
  const split = splitPara(perfil.diasPorSemana);

  const apariciones = new Map<Musculo, number>();
  for (const plantilla of split.dias) {
    for (const musculo of plantilla.musculos) {
      apariciones.set(musculo, (apariciones.get(musculo) ?? 0) + 1);
    }
  }

  // Accesorios usados en las dos últimas semanas, por músculo, para no repetir.
  const historialAccesorios = new Map<Musculo, string[][]>();
  const dias: DiaPlan[] = [];

  for (let semana = 1; semana <= SEMANAS; semana += 1) {
    const mesociclo = Math.ceil(semana / 4);
    const semanaDelCiclo = ((semana - 1) % 4) + 1;
    const esDescarga = semanaDelCiclo === 4;
    const usadosEstaSemana = new Map<Musculo, string[]>();

    for (const [indice, plantilla] of split.dias.entries()) {
      const ejercicios: EjercicioDia[] = [];
      let orden = 1;

      for (const musculo of ordenarMusculos(plantilla.musculos)) {
        const veces = apariciones.get(musculo) ?? 1;
        const seriesDia = Math.max(
          3,
          Math.round(seriesSemanales(musculo, perfil.objetivo, perfil.nivel) / veces),
        );

        const anclaId = anclaPara(musculo, perfil);
        const ancla = catalogo.porId(anclaId);
        if (!ancla) throw new Error(`Ancla ausente del catálogo: ${anclaId}`);

        const seriesAnclaBase = Math.min(seriesDia, SERIES_ANCLA_BASE);
        const seriesAncla = esDescarga
          ? Math.max(1, Math.round(seriesAnclaBase * FACTOR_DESCARGA))
          : seriesAnclaBase + (BONUS_POR_SEMANA_DEL_CICLO[semanaDelCiclo] ?? 0);

        ejercicios.push(construir(ancla, musculo, true, seriesAncla, perfil, orden));
        orden += 1;

        const restante = seriesDia - seriesAnclaBase;
        const cantidad = acotar(Math.ceil(restante / SERIES_POR_ACCESORIO), 0, 3);

        if (cantidad > 0) {
          const recientes = (historialAccesorios.get(musculo) ?? []).flat();
          const candidatos = catalogo.porMusculo(musculo).filter((e) => e.id !== anclaId);

          const elegidos = accesoriosPara({
            candidatos,
            semilla: `${semilla}|${musculo}|${mesociclo}`,
            excluir: [anclaId, ...recientes],
            cantidad,
          });

          const seriesAccesorio = esDescarga
            ? Math.max(1, Math.round(SERIES_POR_ACCESORIO * FACTOR_DESCARGA))
            : SERIES_POR_ACCESORIO;

          for (const accesorio of elegidos) {
            ejercicios.push(construir(accesorio, musculo, false, seriesAccesorio, perfil, orden));
            orden += 1;
          }

          usadosEstaSemana.set(musculo, [
            ...(usadosEstaSemana.get(musculo) ?? []),
            ...elegidos.map((e) => e.id),
          ]);
        }
      }

      dias.push({
        semana,
        dia: indice + 1,
        nombre: plantilla.nombre,
        musculos: plantilla.musculos,
        ejercicios: recortarAlTope(ejercicios),
      });
    }

    for (const [musculo, usados] of usadosEstaSemana) {
      const previo = historialAccesorios.get(musculo) ?? [];
      historialAccesorios.set(musculo, [...previo, usados].slice(-2));
    }
  }

  return {
    objetivo: perfil.objetivo,
    split: split.id,
    semanas: SEMANAS,
    diasPorSemana: perfil.diasPorSemana,
    dias,
  };
}
