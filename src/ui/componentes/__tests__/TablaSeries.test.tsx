import { fireEvent, render } from '@testing-library/react-native';
import { TablaSeries } from '../TablaSeries';
import type { Meta } from '@/domain/planner/tipos';

const META: Meta = { pesoMeta: 20, repsMeta: 10, series: 3, pesoInicialRequerido: false };

describe('tabla de series', () => {
  it('muestra una fila por serie con la meta', async () => {
    const { getByTestId } = await render(
      <TablaSeries meta={META} conCarga registradas={[]} onConfirmar={jest.fn()} />,
    );
    expect(getByTestId('meta-1')).toHaveTextContent('20 kg × 10');
    expect(getByTestId('meta-3')).toBeTruthy();
  });

  it('precarga los campos de logrado con la meta', async () => {
    const { getByTestId } = await render(
      <TablaSeries meta={META} conCarga registradas={[]} onConfirmar={jest.fn()} />,
    );
    expect(getByTestId('peso-1').props.value).toBe('20');
    expect(getByTestId('reps-1').props.value).toBe('10');
  });

  it('confirma la serie con lo que hay en los campos', async () => {
    const onConfirmar = jest.fn();
    const { getByTestId } = await render(
      <TablaSeries meta={META} conCarga registradas={[]} onConfirmar={onConfirmar} />,
    );

    await fireEvent.changeText(getByTestId('reps-1'), '9');
    await fireEvent.press(getByTestId('confirmar-1'));

    expect(onConfirmar).toHaveBeenCalledWith({ numero: 1, pesoLogrado: 20, repsLogradas: 9 });
  });

  it('marca como hechas las series ya registradas', async () => {
    const { getByTestId } = await render(
      <TablaSeries
        meta={META}
        conCarga
        registradas={[{ numero: 1, pesoLogrado: 20, repsLogradas: 10 }]}
        onConfirmar={jest.fn()}
      />,
    );
    expect(getByTestId('fila-1').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('fila-2').props.accessibilityState.checked).toBe(false);
  });

  it('muestra lo registrado, no la meta, en una serie ya hecha', async () => {
    const { getByTestId } = await render(
      <TablaSeries
        meta={META}
        conCarga
        registradas={[{ numero: 1, pesoLogrado: 22, repsLogradas: 8 }]}
        onConfirmar={jest.fn()}
      />,
    );
    expect(getByTestId('peso-1').props.value).toBe('22');
    expect(getByTestId('reps-1').props.value).toBe('8');
  });

  it('oculta el campo de peso en ejercicios de peso corporal', async () => {
    const { queryByTestId, getByTestId } = await render(
      <TablaSeries
        meta={{ ...META, pesoMeta: null }}
        conCarga={false}
        registradas={[]}
        onConfirmar={jest.fn()}
      />,
    );
    expect(queryByTestId('peso-1')).toBeNull();
    expect(getByTestId('meta-1')).toHaveTextContent('10 reps');
  });

  it('confirma sin peso en ejercicios de peso corporal', async () => {
    const onConfirmar = jest.fn();
    const { getByTestId } = await render(
      <TablaSeries
        meta={{ ...META, pesoMeta: null }}
        conCarga={false}
        registradas={[]}
        onConfirmar={onConfirmar}
      />,
    );

    await fireEvent.press(getByTestId('confirmar-2'));

    expect(onConfirmar).toHaveBeenCalledWith({ numero: 2, pesoLogrado: null, repsLogradas: 10 });
  });
});

describe('primera vez con un ejercicio de mancuerna', () => {
  const PRIMERA: Meta = { pesoMeta: null, repsMeta: 8, series: 3, pesoInicialRequerido: true };

  it('pide el peso aunque la meta todavía no lo sepa', async () => {
    const { getByTestId } = await render(
      <TablaSeries meta={PRIMERA} conCarga registradas={[]} onConfirmar={jest.fn()} />,
    );
    expect(getByTestId('peso-1')).toBeTruthy();
    expect(getByTestId('peso-1').props.value).toBe('');
    expect(getByTestId('meta-1')).toHaveTextContent('? kg × 8');
  });

  it('registra el peso que el usuario escribe', async () => {
    const onConfirmar = jest.fn();
    const { getByTestId } = await render(
      <TablaSeries meta={PRIMERA} conCarga registradas={[]} onConfirmar={onConfirmar} />,
    );

    await fireEvent.changeText(getByTestId('peso-1'), '14');
    await fireEvent.press(getByTestId('confirmar-1'));

    expect(onConfirmar).toHaveBeenCalledWith({ numero: 1, pesoLogrado: 14, repsLogradas: 8 });
  });
});
