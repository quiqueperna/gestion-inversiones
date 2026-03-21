import { describe, it, expect } from 'vitest';
import { parseOperationText } from '../operation-parser';

describe('parseOperationText', () => {
  it('parsea formato libre: símbolo cantidad precio tipo fecha', () => {
    const result = parseOperationText('AAPL 10 150.50 BUY 2024-01-15');
    expect(result).not.toBeNull();
    expect(result?.symbol).toBe('AAPL');
    expect(result?.quantity).toBe(10);
    expect(result?.price).toBe(150.50);
    expect(result?.type).toBe('BUY');
    expect(result?.date).toBe('2024-01-15');
  });

  it('parsea formato clave=valor', () => {
    const result = parseOperationText('simbolo=NVDA cantidad=5 precio=800 tipo=BUY fecha=2024-06-01 broker=IOL');
    expect(result).not.toBeNull();
    expect(result?.symbol).toBe('NVDA');
    expect(result?.quantity).toBe(5);
    expect(result?.price).toBe(800);
    expect(result?.broker).toBe('IOL');
  });

  it('normaliza símbolo a uppercase', () => {
    const result = parseOperationText('tsla 20 200 BUY 2024-01-01');
    expect(result?.symbol).toBe('TSLA');
  });

  it('detecta SELL correctamente', () => {
    const result = parseOperationText('MSFT 5 400 SELL 2024-03-01');
    expect(result?.type).toBe('SELL');
  });

  it('retorna null para input vacío', () => {
    expect(parseOperationText('')).toBeNull();
    expect(parseOperationText('   ')).toBeNull();
  });

  it('retorna null para input insuficiente', () => {
    expect(parseOperationText('AAPL 10')).toBeNull();
  });

  it('detecta broker cuando está presente', () => {
    const result = parseOperationText('AAPL 10 150 BUY 2024-01-01 IOL');
    expect(result?.broker).toBe('IOL');
  });

  it('parsea formato DD/MM/YYYY', () => {
    const result = parseOperationText('AAPL 10 150 BUY 15/01/2024');
    expect(result?.date).toBe('2024-01-15');
  });

  it('parsea export IBKR: símbolo fecha cantidad precio broker', () => {
    const result = parseOperationText('TSLA 2024-03-15 20 250.50 BUY IBKR');
    expect(result?.symbol).toBe('TSLA');
    expect(result?.quantity).toBe(20);
    expect(result?.price).toBe(250.50);
    expect(result?.broker).toBe('IBKR');
    expect(result?.date).toBe('2024-03-15');
  });

  it('parsea símbolo de CEDEAR sin punto', () => {
    const result = parseOperationText('GGAL 2024-06-01 100 32.5 BUY AMR');
    expect(result?.symbol).toBe('GGAL');
  });

  it('parsea SELL con broker al final', () => {
    const result = parseOperationText('NVDA 10 800 SELL 2024-09-01 IOL');
    expect(result?.type).toBe('SELL');
    expect(result?.symbol).toBe('NVDA');
  });

  it('formato clave=valor con orden diferente de claves', () => {
    const result = parseOperationText('tipo=SELL precio=200 simbolo=MSFT cantidad=5 fecha=2024-08-01');
    expect(result?.symbol).toBe('MSFT');
    expect(result?.type).toBe('SELL');
    expect(result?.price).toBe(200);
    expect(result?.quantity).toBe(5);
  });

  it('retorna null si precio es cero', () => {
    const result = parseOperationText('AAPL 10 0 BUY 2024-01-01');
    expect(result).toBeNull();
  });
});
