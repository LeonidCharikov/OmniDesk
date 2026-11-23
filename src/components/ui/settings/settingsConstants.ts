import type { UserConfig } from '../../../types/tool';

export const DEFAULT_WIDGETS_CONFIG: NonNullable<UserConfig['widgets']> = {
  enabledWidgets: ['clock', 'timer', 'crypto', 'notes'],
  selectedCity: 'Europe/Prague',
  selectedCityName: 'Praha',
  selectedFiat: 'CZK',
  selectedCrypto: 'BTC',
  selectedCities: ['Europe/Prague'],
  selectedFiats: ['CZK'],
  selectedCryptos: ['BTC'],
  timerDurationMinutes: 25,
  quickNote: '',
};

export const ALL_CURRENCIES = [
  { code: 'CZK', name: 'Česká koruna', flag: '🇨🇿', symbol: 'Kč' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'USD', name: 'Americký dolar', flag: '🇺🇸', symbol: '$' },
  { code: 'GBP', name: 'Britská libra', flag: '🇬🇧', symbol: '£' },
  { code: 'CHF', name: 'Švýcarský frank', flag: '🇨🇭', symbol: 'CHF' },
  { code: 'PLN', name: 'Polský zlotý', flag: '🇵🇱', symbol: 'zł' },
  { code: 'JPY', name: 'Japonský jen', flag: '🇯🇵', symbol: '¥' },
  { code: 'CAD', name: 'Kanadský dolar', flag: '🇨🇦', symbol: 'C$' },
  { code: 'AUD', name: 'Australský dolar', flag: '🇦🇺', symbol: 'A$' },
  { code: 'HUF', name: 'Maďarský forint', flag: '🇭🇺', symbol: 'Ft' },
  { code: 'SEK', name: 'Švédská koruna', flag: '🇸🇪', symbol: 'kr' },
  { code: 'NOK', name: 'Norská koruna', flag: '🇳🇴', symbol: 'kr' },
  { code: 'DKK', name: 'Dánská koruna', flag: '🇩🇰', symbol: 'kr' },
  { code: 'RUB', name: 'Ruský rubl', flag: '🇷🇺', symbol: '₽' },
  { code: 'CNY', name: 'Čínský jüan', flag: '🇨🇳', symbol: '¥' },
];

export const CITIES = [
  { id: 'Europe/Prague', name: 'Praha', label: '🇨🇿 Praha (UTC+1)' },
  { id: 'Europe/London', name: 'Londýn', label: '🇬🇧 Londýn (UTC+0)' },
  { id: 'America/New_York', name: 'New York', label: '🇺🇸 New York (UTC-5)' },
  { id: 'Asia/Tokyo', name: 'Tokio', label: '🇯🇵 Tokio (UTC+9)' },
  { id: 'Europe/Moscow', name: 'Moskva', label: '🇷🇺 Moskva (UTC+3)' },
  { id: 'Asia/Dubai', name: 'Dubaj', label: '🇦🇪 Dubaj (UTC+4)' },
  { id: 'Australia/Sydney', name: 'Sydney', label: '🇦🇺 Sydney (UTC+11)' },
  { id: 'Asia/Singapore', name: 'Singapur', label: '🇸🇬 Singapur (UTC+8)' },
  { id: 'America/Los_Angeles', name: 'Los Angeles', label: '🇺🇸 Los Angeles (UTC-8)' },
  { id: 'Europe/Paris', name: 'Paříž', label: '🇫🇷 Paříž (UTC+1)' },
  { id: 'Europe/Berlin', name: 'Berlín', label: '🇩🇪 Berlín (UTC+1)' },
];

export const CITY_NAMES: Record<string, Record<'cs' | 'en' | 'de' | 'es' | 'ru', string>> = {
  'Europe/Prague': { cs: 'Praha', en: 'Prague', de: 'Prag', es: 'Praga', ru: 'Прага' },
  'Europe/London': { cs: 'Londýn', en: 'London', de: 'London', es: 'Londres', ru: 'Лондон' },
  'America/New_York': { cs: 'New York', en: 'New York', de: 'New York', es: 'Nueva York', ru: 'Нью-Йорк' },
  'Asia/Tokyo': { cs: 'Tokio', en: 'Tokyo', de: 'Tokio', es: 'Tokio', ru: 'Токио' },
  'Europe/Moscow': { cs: 'Moskva', en: 'Moscow', de: 'Moskau', es: 'Moscú', ru: 'Москва' },
  'Asia/Dubai': { cs: 'Dubaj', en: 'Dubai', de: 'Dubai', es: 'Dubái', ru: 'Дубай' },
  'Australia/Sydney': { cs: 'Sydney', en: 'Sydney', de: 'Sydney', es: 'Sídney', ru: 'Сидней' },
  'Asia/Singapore': { cs: 'Singapur', en: 'Singapore', de: 'Singapur', es: 'Singapur', ru: 'Сингапур' },
  'America/Los_Angeles': { cs: 'Los Angeles', en: 'Los Angeles', de: 'Los Angeles', es: 'Los Ángeles', ru: 'Лос-Анджелес' },
  'Europe/Paris': { cs: 'Paříž', en: 'Paris', de: 'Paris', es: 'París', ru: 'Париж' },
  'Europe/Berlin': { cs: 'Berlín', en: 'Berlin', de: 'Berlin', es: 'Berlín', ru: 'Берлин' },
};

export const FIATS = [
  { code: 'CZK', name: 'Česká koruna (CZK)' },
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'USD', name: 'Americký dolar (USD)' },
  { code: 'RUB', name: 'Ruský rubl (RUB)' },
  { code: 'GBP', name: 'Britská libra (GBP)' },
  { code: 'CHF', name: 'Švýcarský frank (CHF)' },
  { code: 'PLN', name: 'Polský zlotý (PLN)' },
  { code: 'JPY', name: 'Japonský jen (JPY)' },
  { code: 'CNY', name: 'Čínský jüan (CNY)' },
];

export const CURRENCY_NAMES: Record<string, Record<'cs' | 'en' | 'de' | 'es' | 'ru', string>> = {
  CZK: { cs: 'Česká koruna', en: 'Czech koruna', de: 'Tschechische Krone', es: 'Corona checa', ru: 'Чешская крона' },
  EUR: { cs: 'Euro', en: 'Euro', de: 'Euro', es: 'Euro', ru: 'Евро' },
  USD: { cs: 'Americký dolar', en: 'US dollar', de: 'US-Dollar', es: 'Dólar estadounidense', ru: 'Доллар США' },
  GBP: { cs: 'Britská libra', en: 'British pound', de: 'Britisches Pfund', es: 'Libra esterlina', ru: 'Британский фунт' },
  CHF: { cs: 'Švýcarský frank', en: 'Swiss franc', de: 'Schweizer Franken', es: 'Franco suizo', ru: 'Швейцарский франк' },
  PLN: { cs: 'Polský zlotý', en: 'Polish zloty', de: 'Polnischer Złoty', es: 'Zloty polaco', ru: 'Польский злотый' },
  JPY: { cs: 'Japonský jen', en: 'Japanese yen', de: 'Japanischer Yen', es: 'Yen japonés', ru: 'Японская иена' },
  CAD: { cs: 'Kanadský dolar', en: 'Canadian dollar', de: 'Kanadischer Dollar', es: 'Dólar canadiense', ru: 'Канадский доллар' },
  AUD: { cs: 'Australský dolar', en: 'Australian dollar', de: 'Australischer Dollar', es: 'Dólar australiano', ru: 'Австралийский доллар' },
  HUF: { cs: 'Maďarský forint', en: 'Hungarian forint', de: 'Ungarischer Forint', es: 'Forinto húngaro', ru: 'Венгерский форинт' },
  SEK: { cs: 'Švédská koruna', en: 'Swedish krona', de: 'Schwedische Krone', es: 'Corona sueca', ru: 'Шведская крона' },
  NOK: { cs: 'Norská koruna', en: 'Norwegian krone', de: 'Norwegische Krone', es: 'Corona noruega', ru: 'Норвежская крона' },
  DKK: { cs: 'Dánská koruna', en: 'Danish krone', de: 'Dänische Krone', es: 'Corona danesa', ru: 'Датская крона' },
  RUB: { cs: 'Ruský rubl', en: 'Russian ruble', de: 'Russischer Rubel', es: 'Rublo ruso', ru: 'Российский рубль' },
  CNY: { cs: 'Čínský jüan', en: 'Chinese yuan', de: 'Chinesischer Yuan', es: 'Yuan chino', ru: 'Китайский юань' },
};

export const CRYPTOS = [
  { code: 'BTC', name: 'Bitcoin (BTC)' },
  { code: 'ETH', name: 'Ethereum (ETH)' },
  { code: 'SOL', name: 'Solana (SOL)' },
  { code: 'TON', name: 'Toncoin (TON)' },
  { code: 'BNB', name: 'Binance Coin (BNB)' },
  { code: 'XRP', name: 'Ripple (XRP)' },
  { code: 'DOGE', name: 'Dogecoin (DOGE)' },
  { code: 'AVAX', name: 'Avalanche (AVAX)' },
];
