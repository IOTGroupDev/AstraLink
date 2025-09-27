export interface UserProfile {
  id: string;
  name: string;
  email: string;
  zodiacSign: ZodiacSign;
  element: Element;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  avatar?: string;
  registrationDate: string;
  isDarkMode: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  zodiacSign?: ZodiacSign;
  avatar?: string;
  isDarkMode?: boolean;
}

export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';

export interface ElementColors {
  Fire: string[];
  Earth: string[];
  Air: string[];
  Water: string[];
}

export const ELEMENT_COLORS: ElementColors = {
  Fire: ['#FF6B35', '#F7931E', '#FFD23F'],
  Earth: ['#8BC34A', '#4CAF50', '#795548'],
  Air: ['#FFEB3B', '#9C27B0', '#E1BEE7'],
  Water: ['#2196F3', '#00BCD4', '#006064'],
};

export const ZODIAC_ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
};

export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};
