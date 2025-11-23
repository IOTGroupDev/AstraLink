/**
 * Prediction Service
 * Microservice for generating astrological predictions
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EphemerisService } from '../../services/ephemeris.service';
import { getSignColors } from '../../modules/shared/astro-text';
import { calculateAspectType } from '../../shared/astro-calculations';

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(private ephemerisService: EphemerisService) {}

  /**
   * Get astrological predictions
   */
  async getPredictions(natalChart: any, period: string = 'day') {
    if (!natalChart) {
      throw new NotFoundException('Natal chart not found');
    }

    // Calculate target date for prediction
    let targetDate = new Date();
    if (period === 'tomorrow') {
      targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (period === 'week') {
      targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Get planetary positions for target date
    const julianDay = this.ephemerisService.dateToJulianDay(targetDate);
    const targetPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);

    // Generate predictions based on transits
    const predictions = this.generatePredictionsInternal(
      natalChart,
      { planets: targetPlanets },
      period,
    );

    return {
      period,
      date: targetDate.toISOString(),
      predictions, // Return as predictions object
      currentPlanets: targetPlanets,
      // Also return flat fields for backward compatibility
      ...predictions,
    };
  }

  /**
   * Generate extended predictions based on natal chart and current positions
   */
  private generatePredictionsInternal(
    natalChart: any,
    currentPlanets: any,
    period: string,
  ) {
    const predictions = {
      general: '',
      love: '',
      career: '',
      health: '',
      finance: '',
      advice: '',
      luckyNumbers: [] as number[],
      luckyColors: [] as string[],
      energy: 50,
      mood: 'Neutral',
      challenges: [] as string[],
      opportunities: [] as string[],
      generatedBy: 'ephemeris' as const,
    };

    const natalPlanets = natalChart.data?.planets || natalChart.planets || {};
    const current = currentPlanets.planets || {};

    // Determine period prefix
    const periodPrefix =
      period === 'tomorrow'
        ? 'Завтра'
        : period === 'week'
          ? 'На этой неделе'
          : period === 'month'
            ? 'В этом месяце'
            : 'Сегодня';

    // Calculate energy based on aspects
    let energyScore = 50;
    let harmoniousCount = 0;
    let challengingCount = 0;

    // Sun analysis
    if (current.sun && natalPlanets.sun) {
      const sunAspect = this.calculateAspect(
        current.sun.longitude,
        natalPlanets.sun.longitude,
      );

      if (sunAspect === 'conjunction' || sunAspect === 'trine') {
        predictions.general = `${periodPrefix} благоприятный период для самореализации. Солнце усиливает вашу энергию и уверенность.`;
        energyScore += 15;
        harmoniousCount++;
        predictions.opportunities.push('Новые начинания и проекты');
      } else if (sunAspect === 'opposition' || sunAspect === 'square') {
        predictions.general = `${periodPrefix} может потребовать от вас терпения. Возможны испытания, которые помогут вам вырасти.`;
        energyScore -= 10;
        challengingCount++;
        predictions.challenges.push('Конфликты с окружающими');
      } else {
        predictions.general = `${periodPrefix} энергия Солнца влияет на вашу активность и жизненную силу.`;
      }
    }

    // Moon analysis (emotions and intuition)
    if (current.moon && natalPlanets.moon) {
      const moonAspect = this.calculateAspect(
        current.moon.longitude,
        natalPlanets.moon.longitude,
      );

      if (moonAspect === 'conjunction' || moonAspect === 'trine') {
        predictions.health = `${periodPrefix} ваше эмоциональное состояние стабильно. Хорошее время для заботы о себе.`;
        energyScore += 10;
        harmoniousCount++;
      } else if (moonAspect === 'square') {
        predictions.health = `${periodPrefix} будьте внимательны к своим эмоциям. Избегайте стрессовых ситуаций.`;
        energyScore -= 5;
        challengingCount++;
        predictions.challenges.push('Эмоциональная нестабильность');
      } else {
        predictions.health = `${periodPrefix} Луна влияет на ваши эмоции и интуицию.`;
      }
    }

    // Venus analysis (love and relationships)
    if (current.venus && natalPlanets.venus) {
      const venusAspect = this.calculateAspect(
        current.venus.longitude,
        natalPlanets.venus.longitude,
      );

      if (venusAspect === 'trine' || venusAspect === 'sextile') {
        predictions.love = `${periodPrefix} Венера создает гармоничные аспекты. Отличное время для романтики и общения с близкими.`;
        energyScore += 10;
        harmoniousCount++;
        predictions.opportunities.push('Гармония в отношениях');
      } else if (venusAspect === 'square' || venusAspect === 'opposition') {
        predictions.love = `${periodPrefix} Венера в напряженном аспекте. Проявите терпение и понимание в отношениях.`;
        challengingCount++;
        predictions.challenges.push('Недопонимание в отношениях');
      } else {
        predictions.love = `${periodPrefix} Венера влияет на вашу привлекательность и способность выражать чувства.`;
      }
    }

    // Mars analysis (energy and action)
    if (current.mars && natalPlanets.mars) {
      const marsAspect = this.calculateAspect(
        current.mars.longitude,
        natalPlanets.mars.longitude,
      );

      if (marsAspect === 'trine') {
        predictions.career = `${periodPrefix} Марс придает вам энергию и решительность. Отличное время для карьерных достижений.`;
        energyScore += 15;
        harmoniousCount++;
        predictions.opportunities.push('Карьерный рост');
      } else if (marsAspect === 'square') {
        predictions.career = `${periodPrefix} Марс создает напряжение. Избегайте конфликтов на работе и проявляйте терпение.`;
        energyScore -= 10;
        challengingCount++;
        predictions.challenges.push('Препятствия в работе');
      } else {
        predictions.career = `${periodPrefix} Марс влияет на вашу энергию и амбиции в профессиональной сфере.`;
      }
    }

    // Jupiter analysis (growth and expansion)
    if (current.jupiter && natalPlanets.jupiter) {
      const jupiterAspect = this.calculateAspect(
        current.jupiter.longitude,
        natalPlanets.jupiter.longitude,
      );

      if (jupiterAspect === 'trine' || jupiterAspect === 'conjunction') {
        predictions.finance = `${periodPrefix} Юпитер благоволит вашим финансам. Время для разумных инвестиций.`;
        energyScore += 10;
        harmoniousCount++;
        predictions.opportunities.push('Финансовые возможности');
      } else {
        predictions.finance = `${periodPrefix} финансовая ситуация стабильна. Придерживайтесь бюджета и избегайте рисков.`;
      }
    }

    // Mercury analysis (communication and thinking)
    if (current.mercury && natalPlanets.mercury) {
      const mercuryAspect = this.calculateAspect(
        current.mercury.longitude,
        natalPlanets.mercury.longitude,
      );
      if (mercuryAspect === 'square' || mercuryAspect === 'opposition') {
        predictions.challenges.push('Сложности в коммуникации');
      } else if (mercuryAspect === 'trine' || mercuryAspect === 'sextile') {
        predictions.opportunities.push('Ясность мышления');
      }
    }

    // Normalize energy (0-100)
    predictions.energy = Math.min(100, Math.max(0, energyScore));

    // Determine mood
    if (harmoniousCount > challengingCount + 2) {
      predictions.mood = 'Радостное и вдохновленное';
    } else if (harmoniousCount > challengingCount) {
      predictions.mood = 'Оптимистичное';
    } else if (challengingCount > harmoniousCount) {
      predictions.mood = 'Сдержанное и осторожное';
    } else {
      predictions.mood = 'Нейтральное и сбалансированное';
    }

    // Generate lucky numbers (based on planetary positions)
    predictions.luckyNumbers = [
      (Math.floor((current.sun?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.moon?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.venus?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.jupiter?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.mars?.longitude || 0) / 10) % 90) + 1,
    ].filter((num, index, self) => self.indexOf(num) === index);

    // Determine lucky colors based on signs
    const sunSign = current.sun?.sign || 'Aries';
    const moonSign = current.moon?.sign || 'Cancer';

    // Use centralized astro-text facade for sign colors
    let sunPrimaryColor = 'Белый';
    let moonPrimaryColor = 'Серый';
    try {
      const sunColors = getSignColors(sunSign, 'ru') || [];
      const moonColors = getSignColors(moonSign, 'ru') || [];
      sunPrimaryColor = sunColors[0] || sunPrimaryColor;
      moonPrimaryColor = moonColors[0] || moonPrimaryColor;
    } catch {
      // keep defaults
    }

    predictions.luckyColors = [sunPrimaryColor, moonPrimaryColor].filter(
      (color, index, self) => self.indexOf(color) === index,
    );

    // Generate advice
    if (period === 'day' || period === 'tomorrow') {
      if (predictions.energy > 75) {
        predictions.advice = `${periodPrefix} доверяйте своей интуиции и действуйте решительно.`;
      } else if (predictions.energy > 50) {
        predictions.advice = `${periodPrefix} фокусируйтесь на важных делах и избегайте распыления энергии.`;
      } else {
        predictions.advice = `${periodPrefix} практикуйте терпение и заботьтесь о своем внутреннем балансе.`;
      }
    } else if (period === 'week') {
      predictions.advice = `На этой неделе практикуйте благодарность и оставайтесь открытыми новому опыту.`;
    } else if (period === 'month') {
      predictions.advice = `В этом месяце сосредоточьтесь на долгосрочных целях и не забывайте отдыхать.`;
    }

    return predictions;
  }

  /**
   * Calculate aspect between two longitudes
   */
  private calculateAspect(longitude1: number, longitude2: number): string {
    // Use shared utility instead of duplicating logic
    return calculateAspectType(longitude1, longitude2);
  }
}
