describe('entorno de pruebas', () => {
  it('ejecuta TypeScript', () => {
    const suma = (a: number, b: number): number => a + b;
    expect(suma(2, 3)).toBe(5);
  });
});
