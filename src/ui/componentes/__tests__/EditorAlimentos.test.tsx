import { fireEvent, render } from '@testing-library/react-native';
import { EditorAlimentos } from '../EditorAlimentos';
import type { Alimento } from '@/domain/nutricion/tipos';

function alimento(parcial: Partial<Alimento> = {}): Alimento {
  return {
    nombre: 'Arroz',
    cantidadG: 100,
    kcal: 130,
    proteinaG: 2.7,
    carbosG: 28,
    azucaresG: 0.1,
    grasaG: 0.3,
    grasaSaturadaG: 0.1,
    grasaTransG: 0,
    fibraG: 0.4,
    confianza: 'media',
    ...parcial,
  };
}

describe('editor de alimentos', () => {
  it('muestra el total de la comida', async () => {
    const { getByTestId } = await render(
      <EditorAlimentos
        alimentos={[alimento({ kcal: 130 }), alimento({ nombre: 'Pollo', kcal: 300 })]}
        onCambio={jest.fn()}
      />,
    );
    expect(getByTestId('total-comida')).toHaveTextContent(/430 kcal/);
  });

  it('avisa cuando no queda ningún alimento', async () => {
    const { getByTestId } = await render(
      <EditorAlimentos alimentos={[]} onCambio={jest.fn()} />,
    );
    expect(getByTestId('sin-alimentos')).toHaveTextContent(/No hay alimentos/);
  });

  it('reescala las macros al cambiar la cantidad', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <EditorAlimentos alimentos={[alimento()]} onCambio={onCambio} />,
    );

    await fireEvent.changeText(getByTestId('cantidad-0'), '200');

    const nuevos = onCambio.mock.calls[0]?.[0] as Alimento[];
    expect(nuevos[0]?.cantidadG).toBe(200);
    expect(nuevos[0]?.kcal).toBe(260);
    expect(nuevos[0]?.carbosG).toBe(56);
  });

  it('ignora cantidades vacías o inválidas sin romper', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <EditorAlimentos alimentos={[alimento()]} onCambio={onCambio} />,
    );

    await fireEvent.changeText(getByTestId('cantidad-0'), '');
    await fireEvent.changeText(getByTestId('cantidad-0'), 'abc');

    expect(onCambio).not.toHaveBeenCalled();
  });

  it('quita un alimento de la lista', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <EditorAlimentos
        alimentos={[alimento(), alimento({ nombre: 'Pollo' })]}
        onCambio={onCambio}
      />,
    );

    await fireEvent.press(getByTestId('borrar-0'));

    const nuevos = onCambio.mock.calls[0]?.[0] as Alimento[];
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]?.nombre).toBe('Pollo');
  });

  it('añade un alimento en blanco', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <EditorAlimentos alimentos={[alimento()]} onCambio={onCambio} />,
    );

    await fireEvent.press(getByTestId('anadir-alimento'));

    const nuevos = onCambio.mock.calls[0]?.[0] as Alimento[];
    expect(nuevos).toHaveLength(2);
    expect(nuevos[1]?.kcal).toBe(0);
  });

  it('permite corregir el nombre', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <EditorAlimentos alimentos={[alimento()]} onCambio={onCambio} />,
    );

    await fireEvent.changeText(getByTestId('nombre-0'), 'Arroz integral');

    const nuevos = onCambio.mock.calls[0]?.[0] as Alimento[];
    expect(nuevos[0]?.nombre).toBe('Arroz integral');
    expect(nuevos[0]?.kcal).toBe(130);
  });

  it('destaca las estimaciones de confianza baja', async () => {
    const { getByTestId, queryByTestId } = await render(
      <EditorAlimentos alimentos={[alimento({ confianza: 'baja' })]} onCambio={jest.fn()} />,
    );
    expect(getByTestId('aviso-0')).toHaveTextContent(/poco fiable/);

    const { queryByTestId: sinAviso } = await render(
      <EditorAlimentos alimentos={[alimento({ confianza: 'alta' })]} onCambio={jest.fn()} />,
    );
    expect(sinAviso('aviso-0')).toBeNull();
    expect(queryByTestId('sin-alimentos')).toBeNull();
  });
});
