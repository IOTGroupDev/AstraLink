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

/**
 * Planet position for stellium detection
 */
export interface PlanetPosition {
  planet: string;
  longitude: number;
  sign?: string;
}

/**
 * Stellium - 3+ planets within tight orb
 */
export interface Stellium {
  planets: string[];
  sign?: string;
  averageLongitude: number;
  orb: number; // Maximum distance between planets
  strength: number; // Based on number of planets and tightness
}

/**
 * Detect stelliums (concentrations of 3+ planets)
 *
 * A stellium is traditionally defined as 3 or more planets within:
 * - Same zodiac sign (30° span), OR
 * - Within 8° orb (tight conjunction)
 *
 * @param planets - Array of planet positions with longitudes
 * @param maxOrb - Maximum orb to consider (default 8°)
 * @param minPlanets - Minimum planets to form stellium (default 3)
 * @returns Array of detected stelliums
 *
 * @example
 * ```typescript
 * const planets = [
 *   { planet: 'sun', longitude: 45, sign: 'Taurus' },
 *   { planet: 'mercury', longitude: 50, sign: 'Taurus' },
 *   { planet: 'venus', longitude: 52, sign: 'Taurus' },
 * ];
 *
 * const stelliums = detectStelliums(planets);
 * // Returns: [{ planets: ['sun', 'mercury', 'venus'], sign: 'Taurus', ... }]
 * ```
 */
export function detectStelliums(
  planets: PlanetPosition[],
  maxOrb: number = 8,
  minPlanets: number = 3,
): Stellium[] {
  const stelliums: Stellium[] = [];

  // Sort planets by longitude for easier clustering
  const sortedPlanets = [...planets].sort((a, b) => a.longitude - b.longitude);

  // Track which planets are already in a stellium
  const usedPlanets = new Set<string>();

  // Check each planet as potential stellium start
  for (let i = 0; i < sortedPlanets.length; i++) {
    if (usedPlanets.has(sortedPlanets[i].planet)) continue;

    const cluster: PlanetPosition[] = [sortedPlanets[i]];
    const startLongitude = sortedPlanets[i].longitude;

    // Find planets within orb
    for (let j = i + 1; j < sortedPlanets.length; j++) {
      const diff = normalizeAngleDiff(startLongitude, sortedPlanets[j].longitude);

      if (diff <= maxOrb) {
        cluster.push(sortedPlanets[j]);
      } else {
        break; // Planets are sorted, so no point checking further
      }
    }

    // If we have enough planets for a stellium
    if (cluster.length >= minPlanets) {
      const planetNames = cluster.map((p) => p.planet);

      // Calculate average longitude
      const avgLon =
        cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;

      // Calculate maximum spread (orb)
      const minLon = Math.min(...cluster.map((p) => p.longitude));
      const maxLon = Math.max(...cluster.map((p) => p.longitude));
      const spread = maxLon - minLon;

      // Calculate strength (more planets + tighter = stronger)
      // Base strength from number of planets (3=1.0, 4=1.5, 5=2.0, etc.)
      const countStrength = (cluster.length - 2) * 0.5;
      // Tightness strength (0° = 1.0, 8° = 0.0)
      const tightnessStrength = 1 - spread / maxOrb;
      const totalStrength = countStrength * (0.5 + tightnessStrength * 0.5);

      // Determine sign (use most common sign if available)
      let sign: string | undefined;
      if (cluster[0].sign) {
        const signCounts: Record<string, number> = {};
        cluster.forEach((p) => {
          if (p.sign) {
            signCounts[p.sign] = (signCounts[p.sign] || 0) + 1;
          }
        });
        sign = Object.keys(signCounts).reduce((a, b) =>
          signCounts[a] > signCounts[b] ? a : b
        );
      }

      stelliums.push({
        planets: planetNames,
        sign,
        averageLongitude: avgLon,
        orb: spread,
        strength: totalStrength,
      });

      // Mark planets as used
      planetNames.forEach((p) => usedPlanets.add(p));
    }
  }

  // Sort stelliums by strength (strongest first)
  return stelliums.sort((a, b) => b.strength - a.strength);
}

/**
 * Check if a natal chart has any stelliums
 */
export function hasStellium(planets: PlanetPosition[], maxOrb: number = 8): boolean {
  return detectStelliums(planets, maxOrb).length > 0;
}
