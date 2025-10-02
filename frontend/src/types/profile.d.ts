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
export declare const ELEMENT_COLORS: ElementColors;
export declare const ZODIAC_ELEMENTS: Record<ZodiacSign, Element>;
export declare const ZODIAC_SYMBOLS: Record<ZodiacSign, string>;
