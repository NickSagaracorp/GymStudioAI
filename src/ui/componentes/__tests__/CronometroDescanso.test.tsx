import { act, fireEvent, render } from '@testing-library/react-native';
import { CronometroDescanso } from '../CronometroDescanso';

describe('cronómetro de descanso', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('muestra el tiempo restante en minutos y segundos', async () => {
    const { getByTestId } = await render(<CronometroDescanso segundos={90} onFin={jest.fn()} />);
    expect(getByTestId('restante')).toHaveTextContent('1:30');
  });

  it('descuenta cada segundo', async () => {
    const { getByTestId } = await render(<CronometroDescanso segundos={90} onFin={jest.fn()} />);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(getByTestId('restante')).toHaveTextContent('1:25');
  });

  it('avisa al llegar a cero una sola vez', async () => {
    const onFin = jest.fn();
    await render(<CronometroDescanso segundos={3} onFin={onFin} />);
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('suma treinta segundos al pulsar el botón', async () => {
    const { getByTestId } = await render(<CronometroDescanso segundos={60} onFin={jest.fn()} />);
    await act(async () => {
      await fireEvent.press(getByTestId('sumar-30'));
    });
    expect(getByTestId('restante')).toHaveTextContent('1:30');
  });

  it('salta el descanso', async () => {
    const onFin = jest.fn();
    const { getByTestId } = await render(<CronometroDescanso segundos={60} onFin={onFin} />);
    await act(async () => {
      await fireEvent.press(getByTestId('saltar'));
    });
    expect(onFin).toHaveBeenCalledTimes(1);
  });
});
