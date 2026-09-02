import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/ui/ContextoApp';
import type { SerieConfirmada } from '@/ui/componentes/TablaSeries';
import type { BajadaRegistrada } from '@/ui/componentes/TablaDescendente';
import { calcularMeta } from '@/domain/planner/progresion';
import { calcularMetaDescendente } from '@/domain/planner/descendentes';
import type { EjercicioDia, Meta, MetaDescendente } from '@/domain/planner/tipos';
import type { Perfil } from '@/data/db/repos/perfil';

/**
 * Carga y gestiona el estado de una sesión de entrenamiento: ejercicios del
 * día, metas calculadas, series y bajadas registradas, y el descanso activo.
 */
export function useSesion(identificador: number) {
  const { programa, sesion, perfil, ejercicios: preferencias } = useApp();

  const [ejercicios, setEjercicios] = useState<EjercicioDia[]>([]);
  const [nombreDia, setNombreDia] = useState('');
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [metasDescendentes, setMetasDescendentes] = useState<Record<string, MetaDescendente>>({});
  const [descendentes, setDescendentes] = useState<Set<string>>(new Set());
  const [hechas, setHechas] = useState<Record<string, SerieConfirmada[]>>({});
  const [bajadas, setBajadas] = useState<Record<string, BajadaRegistrada[]>>({});
  const [descanso, setDescanso] = useState<number | null>(null);
  const [datosPerfil, setDatosPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const [miPerfil, activo] = await Promise.all([perfil.obtener(), programa.activo()]);
      if (!miPerfil || !activo || !vivo) return;

      const dias = await programa.diasDe(activo.id);
      const borradores = await Promise.all(
        dias.map(async (dia) => ({ dia, sesionId: (await sesion.borradorDe(dia.id))?.id })),
      );
      const encontrado = borradores.find((fila) => fila.sesionId === identificador)?.dia;
      if (!encontrado || !vivo) return;

      const marcados = new Set(await preferencias.descendentes());

      const registradas = await sesion.seriesDe(identificador);
      const porEjercicio: Record<string, SerieConfirmada[]> = {};
      const porBajada: Record<string, BajadaRegistrada[]> = {};

      for (const serie of registradas) {
        if (marcados.has(serie.ejercicioId)) {
          porBajada[serie.ejercicioId] = [
            ...(porBajada[serie.ejercicioId] ?? []),
            {
              bajada: serie.bajada,
              pesoLogrado: serie.pesoLogrado ?? 0,
              repsLogradas: serie.repsLogradas,
            },
          ];
        } else {
          porEjercicio[serie.ejercicioId] = [
            ...(porEjercicio[serie.ejercicioId] ?? []),
            {
              numero: serie.numero,
              pesoLogrado: serie.pesoLogrado,
              repsLogradas: serie.repsLogradas,
            },
          ];
        }
      }

      const calculadas: Record<string, Meta> = {};
      const calculadasDesc: Record<string, MetaDescendente> = {};

      for (const ejercicio of encontrado.ejercicios) {
        const historial = (await sesion.historialDe(ejercicio.ejercicioId)).filter(
          (s) => s.sesionId !== identificador,
        );

        calculadas[ejercicio.ejercicioId] = calcularMeta(historial, ejercicio, miPerfil);
        calculadasDesc[ejercicio.ejercicioId] = calcularMetaDescendente(
          historial,
          ejercicio.ejercicioId,
          miPerfil,
        );
      }

      if (!vivo) return;
      setDatosPerfil(miPerfil);
      setNombreDia(`Semana ${encontrado.semana} · ${encontrado.nombre}`);
      setEjercicios(encontrado.ejercicios);
      setMetas(calculadas);
      setMetasDescendentes(calculadasDesc);
      setDescendentes(marcados);
      setHechas(porEjercicio);
      setBajadas(porBajada);
    })();

    return () => {
      vivo = false;
    };
  }, [identificador, programa, sesion, perfil, preferencias]);

  const totalSeries = useMemo(
    () => ejercicios.reduce((suma, e) => suma + (metas[e.ejercicioId]?.series ?? e.series), 0),
    [ejercicios, metas],
  );

  const seriesHechas = useMemo(
    () =>
      Object.values(hechas).reduce((suma, lista) => suma + lista.length, 0) +
      // Una descendente cuenta como una serie del día, no como una por bajada.
      Object.values(bajadas).filter((lista) => lista.length > 0).length,
    [hechas, bajadas],
  );

  const confirmar = useCallback(
    async (ejercicio: EjercicioDia, serie: SerieConfirmada) => {
      const meta = metas[ejercicio.ejercicioId];

      await sesion.registrarSerie({
        sesionId: identificador,
        ejercicioId: ejercicio.ejercicioId,
        numero: serie.numero,
        pesoMeta: meta?.pesoMeta ?? null,
        repsMeta: meta?.repsMeta ?? ejercicio.repMin,
        pesoLogrado: serie.pesoLogrado,
        repsLogradas: serie.repsLogradas,
      });

      setHechas((anterior) => {
        const lista = (anterior[ejercicio.ejercicioId] ?? []).filter(
          (s) => s.numero !== serie.numero,
        );
        return { ...anterior, [ejercicio.ejercicioId]: [...lista, serie] };
      });
      setDescanso(ejercicio.descansoSeg);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [identificador, metas, sesion],
  );

  const confirmarBajada = useCallback(
    async (ejercicio: EjercicioDia, registro: BajadaRegistrada) => {
      await sesion.registrarSerie({
        sesionId: identificador,
        ejercicioId: ejercicio.ejercicioId,
        numero: 1,
        bajada: registro.bajada,
        pesoMeta: null,
        repsMeta: 0,
        pesoLogrado: registro.pesoLogrado,
        repsLogradas: registro.repsLogradas,
      });

      setBajadas((anterior) => {
        const lista = (anterior[ejercicio.ejercicioId] ?? []).filter(
          (b) => b.bajada !== registro.bajada,
        );
        return {
          ...anterior,
          [ejercicio.ejercicioId]: [...lista, registro].sort((a, b) => a.bajada - b.bajada),
        };
      });
    },
    [identificador, sesion],
  );

  const quitarBajada = useCallback(
    async (ejercicioId: string, indice: number) => {
      await sesion.borrarBajada(identificador, ejercicioId, indice);
      setBajadas((anterior) => ({
        ...anterior,
        [ejercicioId]: (anterior[ejercicioId] ?? []).filter((b) => b.bajada !== indice),
      }));
    },
    [identificador, sesion],
  );

  const alternarDescendente = useCallback(
    async (ejercicioId: string) => {
      const activo = !descendentes.has(ejercicioId);
      await preferencias.marcarDescendente(ejercicioId, activo);

      setDescendentes((anterior) => {
        const copia = new Set(anterior);
        if (activo) copia.add(ejercicioId);
        else copia.delete(ejercicioId);
        return copia;
      });
    },
    [descendentes, preferencias],
  );

  return {
    ejercicios,
    nombreDia,
    metas,
    metasDescendentes,
    descendentes,
    hechas,
    bajadas,
    descanso,
    setDescanso,
    datosPerfil,
    totalSeries,
    seriesHechas,
    confirmar,
    confirmarBajada,
    quitarBajada,
    alternarDescendente,
  };
}
