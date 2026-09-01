import { fireEvent, render } from '@testing-library/react-native';
import { TablaDescendente } from '../TablaDescendente';
import type { Perfil } from '@/data/db/repos/perfil';
import type { MetaDescendente } from '@/domain/planner/tipos';

const PERFIL: Perfil = {
  nombre: 'Nick',
  sexo: 'hombre',
  fechaNac: '1988-04-12',
  alturaCm: 178,
  nivel: 'intermedio',
  objetivo: 'volumen',
  diasPorSemana: 4,
  mancuernaMinKg: 2,
  mancuernaMaxKg: 30,
  incrementoKg: 2,
  tieneBanco: true,
  tieneBarraDominadas: true,
  diaMedicion: 0,
  nivelActividad: 'moderado',
};

const META: MetaDescendente = {
  pesoTope: 24,
  pesoInicialRequerido: false,
  repsTotalesAnteriores: 19,
  bajadasAnteriores: 2,
  avisoInflado: null,
};

function pintar(extra: Partial<Parameters<typeof TablaDescendente>[0]> = {}) {
  const onConfirmar = jest.fn();
  const onQuitar = jest.fn();
  return {
    onConfirmar,
    onQuitar,
    ...extra,
    render: () =>
      render(
        <TablaDescendente
          meta={META}
          perfil={PERFIL}
          bajadas={[]}
          onConfirmar={onConfirmar}
          onQuitar={onQuitar}
          {...extra}
        />,
      ),
  };
}

describe('tabla de serie descendente', () => {
  it('arranca con el peso tope de la progresión', async () => {
    const caso = pintar();
    const { getByTestId } = await caso.render();

    expect(getByTestId('peso-bajada-0').props.value).toBe('24');
  });

  it('muestra qué hay que batir', async () => {
    const caso = pintar();
    const { getByTestId } = await caso.render();

    expect(getByTestId('cabecera-descendente')).toHaveTextContent(/A batir: 19 repeticiones/);
    expect(getByTestId('cabecera-descendente')).toHaveTextContent(/2 bajadas/);
  });

  it('la primera vez no hay marca que batir', async () => {
    const caso = pintar({
      meta: {
        pesoTope: null,
        pesoInicialRequerido: true,
        repsTotalesAnteriores: null,
        bajadasAnteriores: null,
        avisoInflado: null,
      },
    });
    const { getByTestId } = await caso.render();

    expect(getByTestId('cabecera-descendente')).toHaveTextContent(/Primera vez/);
    expect(getByTestId('peso-bajada-0').props.value).toBe('');
  });

  it('suma las repeticiones de las bajadas ya hechas', async () => {
    const caso = pintar({
      bajadas: [
        { bajada: 0, pesoLogrado: 24, repsLogradas: 8 },
        { bajada: 1, pesoLogrado: 20, repsLogradas: 6 },
      ],
    });
    const { getByTestId } = await caso.render();

    expect(getByTestId('reps-totales')).toHaveTextContent('14 reps');
  });

  it('propone el 80 % del peso anterior en la siguiente bajada', async () => {
    const caso = pintar({ bajadas: [{ bajada: 0, pesoLogrado: 24, repsLogradas: 8 }] });
    const { getByTestId } = await caso.render();

    // 24 × 0,8 = 19,2 → 20 con incrementos de 2 kg
    expect(getByTestId('peso-bajada-1').props.value).toBe('20');
  });

  it('registra una bajada con lo que hay en los campos', async () => {
    const caso = pintar();
    const { getByTestId } = await caso.render();

    await fireEvent.changeText(getByTestId('reps-bajada-0'), '9');
    await fireEvent.press(getByTestId('confirmar-bajada-0'));

    expect(caso.onConfirmar).toHaveBeenCalledWith({
      bajada: 0,
      pesoLogrado: 24,
      repsLogradas: 9,
    });
  });

  it('no registra nada sin repeticiones', async () => {
    const caso = pintar();
    const { getByTestId } = await caso.render();

    await fireEvent.press(getByTestId('confirmar-bajada-0'));

    expect(caso.onConfirmar).not.toHaveBeenCalled();
  });

  it('deja quitar una bajada, pero nunca el tope', async () => {
    const caso = pintar({
      bajadas: [
        { bajada: 0, pesoLogrado: 24, repsLogradas: 8 },
        { bajada: 1, pesoLogrado: 20, repsLogradas: 6 },
      ],
    });
    const { getByTestId, queryByTestId } = await caso.render();

    expect(queryByTestId('quitar-bajada-0')).toBeNull();

    await fireEvent.press(getByTestId('quitar-bajada-1'));
    expect(caso.onQuitar).toHaveBeenCalledWith(1);
  });

  it('añade una fila más al pulsar Otra bajada', async () => {
    const caso = pintar();
    const { getByTestId, queryByTestId } = await caso.render();

    expect(queryByTestId('bajada-1')).toBeNull();

    await fireEvent.press(getByTestId('otra-bajada'));

    expect(getByTestId('bajada-1')).toBeTruthy();
  });

  it('avisa cuando el total mejoró solo por hacer más bajadas', async () => {
    const caso = pintar({
      meta: { ...META, avisoInflado: 'Hiciste 21 repeticiones frente a 19, pero con 1 bajada más.' },
    });
    const { getByTestId } = await caso.render();

    expect(getByTestId('aviso-inflado')).toHaveTextContent(/1 bajada más/);
  });
});
