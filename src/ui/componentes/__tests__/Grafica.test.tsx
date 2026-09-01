import { render } from '@testing-library/react-native';
import { coordenadasDe, Grafica } from '../Grafica';

describe('gráfica de progreso', () => {
  it('avisa cuando no hay ningún registro', async () => {
    const { getByTestId } = await render(<Grafica titulo="Peso" puntos={[]} />);
    expect(getByTestId('grafica-vacia-Peso')).toHaveTextContent(/Sin datos de Peso/);
  });

  it('con un solo registro muestra el valor y no dibuja línea', async () => {
    const { getByTestId, queryByTestId } = await render(
      <Grafica titulo="Peso" puntos={[{ etiqueta: '2026-09-01', valor: 78.4 }]} />,
    );

    expect(getByTestId('valor-Peso')).toHaveTextContent(/78\.4/);
    expect(getByTestId('unico-Peso')).toHaveTextContent(/Primer registro/);
    expect(queryByTestId('linea-Peso')).toBeNull();
  });

  it('dibuja la línea a partir del segundo registro', async () => {
    const { getByTestId } = await render(
      <Grafica
        titulo="Peso"
        puntos={[
          { etiqueta: '2026-09-01', valor: 80 },
          { etiqueta: '2026-09-08', valor: 78.5 },
        ]}
      />,
    );

    expect(getByTestId('linea-Peso')).toBeTruthy();
    expect(getByTestId('valor-Peso')).toHaveTextContent(/78\.5/);
    expect(getByTestId('variacion-Peso')).toHaveTextContent(/-1\.5/);
  });

  it('marca las subidas con signo positivo', async () => {
    const { getByTestId } = await render(
      <Grafica
        titulo="Brazo"
        puntos={[
          { etiqueta: '2026-09-01', valor: 36 },
          { etiqueta: '2026-09-08', valor: 37 },
        ]}
      />,
    );
    expect(getByTestId('variacion-Brazo')).toHaveTextContent(/\+1/);
  });

});

describe('proyección de los puntos', () => {
  it('centra la línea cuando el valor no ha cambiado', () => {
    expect(
      coordenadasDe(
        [
          { etiqueta: 'a', valor: 78 },
          { etiqueta: 'b', valor: 78 },
        ],
        300,
        90,
      ),
    ).toEqual([
      { x: 0, y: 45 },
      { x: 300, y: 45 },
    ]);
  });

  it('pone el valor más alto arriba y el más bajo abajo', () => {
    const [primero, segundo] = coordenadasDe(
      [
        { etiqueta: 'a', valor: 70 },
        { etiqueta: 'b', valor: 80 },
      ],
      300,
      90,
    );
    expect(primero).toEqual({ x: 0, y: 90 });
    expect(segundo).toEqual({ x: 300, y: 0 });
  });

  it('un único punto va al centro horizontal', () => {
    expect(coordenadasDe([{ etiqueta: 'a', valor: 70 }], 300, 90)).toEqual([{ x: 150, y: 45 }]);
  });

  it('sin puntos no devuelve coordenadas', () => {
    expect(coordenadasDe([])).toEqual([]);
  });
});
