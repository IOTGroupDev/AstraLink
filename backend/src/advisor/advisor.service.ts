import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { ChartService } from '@/chart/chart.service';
import { EvaluateAdviceDto } from './dto/evaluate-advice.dto';
import {
  AdviceResponseDto,
  AdvisorAspect,
  AdvisorFactor,
  AdvisorVerdict,
} from './dto/advice-response.dto';

type PlanetKey =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

@Injectable()
export class AdvisorService {
  private readonly logger = new Logger(AdvisorService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly ephemeris: EphemerisService,
    private readonly chartService: ChartService,
  ) {}

  async evaluate(userId: string, dto: EvaluateAdviceDto): Promise<AdviceResponseDto> {
    const tz = dto.timezone || 'UTC';
    const cacheKey = `advisor:${userId}:${dto.date}:${dto.topic}:${tz}`;

    // Try cache
    const cached = await this.redis.get<AdviceResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load natal chart (source of truth — no mock)
    const natal = await this.chartService.getNatalChart(userId);
    const natalData = (natal as any)?.data ?? natal;
    const natalPlanets = (natalData?.planets || {}) as Record<PlanetKey, any>;

    // Evaluate at 12:00:00Z for deterministic MVP (hourly windows can be added later)
    const dateNoonUTC = new Date(`${dto.date}T12:00:00.000Z`);
    const jd = this.ephemeris.dateToJulianDay(dateNoonUTC);
    const currentPlanets = await this.ephemeris.calculatePlanets(jd);

    // Compute current-to-natal aspects for key planets
    const trackedPlanets: PlanetKey[] = [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
    ];
    const aspects: AdvisorAspect[] = [];
    const factors: AdvisorFactor[] = [];

    // Topic weights (planet influence per topic)
    const topicPlanetWeights: Record<string, Partial<Record<PlanetKey, number>>> = {
      contract: { mercury: 15, jupiter: 8, saturn: 6, sun: 4 },
      meeting: { mercury: 12, venus: 6, sun: 6, jupiter: 6 },
      negotiation: { mercury: 14, jupiter: 8, saturn: 6, moon: 4 },
      date: { venus: 15, moon: 8, sun: 5 },
      travel: { jupiter: 12, mercury: 8, moon: 4 },
      purchase: { mercury: 10, venus: 8, saturn: 4 },
      health: { sun: 8, moon: 8, mars: 8, saturn: 4 },
      custom: { sun: 6, moon: 6, mercury: 6, venus: 6, mars: 6, jupiter: 6, saturn: 6 },
    };

    // Aspect base weights (positive/negative) and orb policy
    const aspectWeights: Record<AdvisorAspect['type'], { base: number; orb: number }> = {
      conjunction: { base: 10, orb: 8 },
      sextile: { base: 8, orb: 6 },
      square: { base: -10, orb: 8 },
      trine: { base: 12, orb: 8 },
      opposition: { base: -12, orb: 8 },
    };

    // Calculate aspects and factor contributions per planet vs its natal position
    for (const p of trackedPlanets) {
      const cur = (currentPlanets as any)[p];
      const nat = (natalPlanets as any)[p];
      if (!cur || !nat) continue;

      const a = this.calculateAspect(cur.longitude, nat.longitude, aspectWeights);
      if (a) {
        const impactSigned = this.aspectImpactSigned(a.type, a.orb, aspectWeights);
        aspects.push({
          planetA: p,
          planetB: p,
          type: a.type,
          orb: a.orb,
          impact: impactSigned / 12, // normalize roughly into -1..1
        });

        const planetWeight = topicPlanetWeights[dto.topic]?.[p] ?? 0;
        const contribution = planetWeight * (impactSigned / 12); // normalize to planet weight scale
        factors.push({
          label: `${this.capitalize(p)} ${a.type}`,
          weight: planetWeight,
          value: 1 - a.orb / (aspectWeights[a.type].orb || 1),
          contribution,
        });
      }
    }

    // Mercury retrograde penalty for topics relying on clarity/tech/contracts
    const merc = (currentPlanets as any).mercury;
    const mercRetroPenaltyTopics = new Set(['contract', 'purchase', 'meeting', 'negotiation']);
    if (merc?.isRetrograde && mercRetroPenaltyTopics.has(dto.topic)) {
      const penalty = -12;
      factors.push({
        label: 'Mercury retrograde',
        weight: penalty,
        value: 1,
        contribution: penalty,
      });
    }

    // Aggregate score: base 50 + sum(contributions)
    let score = 50 + factors.reduce((acc, f) => acc + f.contribution, 0);
    score = Math.round(Math.min(100, Math.max(0, score)));

    const verdict: AdvisorVerdict = score >= 70 ? 'good' : score >= 50 ? 'neutral' : 'challenging';

    // Best windows MVP: whole day as a single window (hourly windows can be added later)
    const bestWindows = [
      {
        startISO: new Date(`${dto.date}T00:00:00.000Z`).toISOString(),
        endISO: new Date(`${dto.date}T23:59:59.999Z`).toISOString(),
        score,
      },
    ];

    // Houses MVP: keep empty; can be extended using natal houses relevance
    const houses: AdviceResponseDto['houses'] = [];

    const explanation =
      `Оценка основана на реальных транзитах к вашей натальной карте на ${dto.date} (UTC 12:00). ` +
      `Учтены ключевые аспекты по теме “${dto.topic}” и (если применимо) ретроградность Меркурия. ` +
      `Полный список аспектов и вкладов доступен ниже.`;

    const response: AdviceResponseDto = {
      verdict,
      score,
      factors,
      aspects,
      houses,
      bestWindows,
      explanation,
      generatedBy: 'rules',
      evaluatedAt: new Date().toISOString(),
      date: dto.date,
      topic: dto.topic,
      timezone: dto.timezone,
    };

    // Cache for 6 hours
    await this.redis.set(cacheKey, response, 6 * 3600);
    return response;
  }

  private calculateAspect(
    longitude1: number,
    longitude2: number,
    specs: Record<AdvisorAspect['type'], { base: number; orb: number }>,
  ): { type: AdvisorAspect['type']; orb: number } | null {
    const diff = Math.abs(longitude1 - longitude2);
    const normalizedDiff = Math.min(diff, 360 - diff);

    const candidates: Array<{ type: AdvisorAspect['type']; angle: number; orb: number }> = [
      { type: 'conjunction', angle: 0, orb: specs.conjunction.orb },
      { type: 'sextile', angle: 60, orb: specs.sextile.orb },
      { type: 'square', angle: 90, orb: specs.square.orb },
      { type: 'trine', angle: 120, orb: specs.trine.orb },
      { type: 'opposition', angle: 180, orb: specs.opposition.orb },
    ];

    for (const c of candidates) {
      const orb = Math.abs(normalizedDiff - c.angle);
      if (orb <= c.orb) {
        return { type: c.type, orb };
      }
    }
    return null;
  }

  private aspectImpactSigned(
    type: AdvisorAspect['type'],
    orb: number,
    specs: Record<AdvisorAspect['type'], { base: number; orb: number }>,
  ): number {
    const spec = specs[type];
    const strength = 1 - Math.min(1, orb / (spec.orb || 1));
    return spec.base * strength;
  }

  private capitalize(s: string): string {
    return s.length ? s[0].toUpperCase() + s.slice(1) : s;
  }
}