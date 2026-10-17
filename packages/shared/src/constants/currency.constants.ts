export const CURRENCY = {
  CODE: 'USD',
  SYMBOL: '$',
  DECIMALS: 2,
  LOCALE_DEFAULT: 'es-CO',
} as const;

export const FINANCIAL_RULES = {
  MAX_AMOUNT: 999999999999.99,
  MIN_AMOUNT: 0.01,
} as const;
