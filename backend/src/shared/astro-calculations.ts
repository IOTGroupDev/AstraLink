/**
 * Shared astronomical calculations utilities
 * Централизованные функции для астрологических вычислений
 */

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

export interface AspectDefinition {
  type: AspectType;
  angle: number;
  orb: number;
}

export interface AspectResult {
  type: AspectType;
  orb: number;
  strength: number; // 0-1, где 1 = exact aspect
}

/**
 * Default orbs for major aspects
 */
export const DEFAULT_ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  sextile: 6,
  square: 8,
  trine: 8,
  opposition: 8,
};

/**
 * Aspect definitions with angles
 */
export const ASPECT_DEFINITIONS: Array<Omit<AspectDefinition, 'orb'>> = [
  { type: 'conjunction', angle: 0 },
  { type: 'sextile', angle: 60 },
  { type: 'square', angle: 90 },
  { type: 'trine', angle: 120 },
  { type: 'opposition', angle: 180 },
];

/**
 * Normalize angle difference to 0-180 range
 */
export function normalizeAngleDiff(longitude1: number, longitude2: number): number {
  const diff = Math.abs(longitude1 - longitude2);
  return Math.min(diff, 360 - diff);
}

/**
 * Calculate aspect between two celestial longitudes
 *
 * @param longitude1 - First celestial longitude (0-360)
 * @param longitude2 - Second celestial longitude (0-360)
 * @param customOrbs - Optional custom orbs for each aspect type
 * @returns AspectResult if aspect found within orb, null otherwise
 *
 * @example
 * ```typescript
 * const aspect = calculateAspect(45, 135); // 90° = square
 * // Returns: { type: 'square', orb: 0, strength: 1 }
 *
 * const aspect2 = calculateAspect(45, 140); // 95° ≈ square
 * // Returns: { type: 'square', orb: 5, strength: 0.375 }
 * ```
 */
export function calculateAspect(
  longitude1: number,
  longitude2: number,
  customOrbs?: Partial<Record<AspectType, number>>,
): AspectResult | null {
  const normalizedDiff = normalizeAngleDiff(longitude1, longitude2);
  const orbs = { ...DEFAULT_ASPECT_ORBS, ...customOrbs };

  for (const aspectDef of ASPECT_DEFINITIONS) {
    const aspectType = aspectDef.type;
    const aspectAngle = aspectDef.angle;
    const allowedOrb = orbs[aspectType];

    const orbDelta = Math.abs(normalizedDiff - aspectAngle);

    if (orbDelta <= allowedOrb) {
      return {
        type: aspectType,
        orb: orbDelta,
        strength: 1 - orbDelta / allowedOrb,
      };
    }
  }

  return null;
}

/**
 * Calculate aspect and return only the type (simplified version)
 * Used for backward compatibility with chart.service.ts
 *
 * @param longitude1 - First celestial longitude
 * @param longitude2 - Second celestial longitude
 * @returns Aspect type string or 'other' if no major aspect found
 */
export function calculateAspectType(
  longitude1: number,
  longitude2: number,
): AspectType | 'other' {
  const aspect = calculateAspect(longitude1, longitude2);
  return aspect ? aspect.type : 'other';
}

/**
 * Calculate aspect with custom orb specifications (for advisor service)
 *
 * @param longitude1 - First longitude
 * @param longitude2 - Second longitude
 * @param orbSpecs - Custom orb specifications with base weights
 * @returns Aspect with type and orb, or null
 */
export function calculateAspectWithSpecs(
  longitude1: number,
  longitude2: number,
  orbSpecs: Record<AspectType, { base: number; orb: number }>,
): { type: AspectType; orb: number } | null {
  const normalizedDiff = normalizeAngleDiff(longitude1, longitude2);

  for (const aspectDef of ASPECT_DEFINITIONS) {
    const aspectType = aspectDef.type;
    const spec = orbSpecs[aspectType];

    if (!spec) continue;

    const orbDelta = Math.abs(normalizedDiff - aspectDef.angle);

    if (orbDelta <= spec.orb) {
      return {
        type: aspectType,
        orb: orbDelta,
      };
    }
  }

  return null;
}

/**
 * Calculate aspect strength (0-1) given orb and max orb
 * Utility function for various strength calculations
 */
export function calculateAspectStrength(orb: number, maxOrb: number): number {
  return Math.max(0, 1 - orb / maxOrb);
}
