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
  async getPredictions(
    natalChart: any,
    period: string = 'day',
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    if (!natalChart) {
      throw new NotFoundException(
        locale === 'en'
          ? 'Natal chart not found'
          : locale === 'es'
            ? 'No se encontró la carta natal'
            : 'Натальная карта не найдена',
      );
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
      locale,
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
    locale: 'ru' | 'en' | 'es' = 'ru',
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
      mood:
        locale === 'en'
          ? 'Neutral'
          : locale === 'es'
            ? 'Neutral'
            : 'Нейтральное',
      challenges: [] as string[],
      opportunities: [] as string[],
      generatedBy: 'ephemeris' as const,
    };

    const natalPlanets = natalChart.data?.planets || natalChart.planets || {};
    const current = currentPlanets.planets || {};

    // Determine period prefix
    const periodPrefix =
      period === 'tomorrow'
        ? locale === 'en'
          ? 'Tomorrow'
          : locale === 'es'
            ? 'Mañana'
            : 'Завтра'
        : period === 'week'
          ? locale === 'en'
            ? 'This week'
            : locale === 'es'
              ? 'Esta semana'
              : 'На этой неделе'
          : period === 'month'
            ? locale === 'en'
              ? 'This month'
              : locale === 'es'
                ? 'Este mes'
                : 'В этом месяце'
            : locale === 'en'
              ? 'Today'
              : locale === 'es'
                ? 'Hoy'
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
        predictions.general =
          locale === 'en'
            ? `${periodPrefix} is favorable for self-realization. The Sun boosts your energy and confidence.`
            : locale === 'es'
              ? `${periodPrefix} es un período favorable para la autorrealización. El Sol fortalece tu energía y confianza.`
              : `${periodPrefix} благоприятный период для самореализации. Солнце усиливает вашу энергию и уверенность.`;
        energyScore += 15;
        harmoniousCount++;
        predictions.opportunities.push(
          locale === 'en'
            ? 'New beginnings and projects'
            : locale === 'es'
              ? 'Nuevos comienzos y proyectos'
              : 'Новые начинания и проекты',
        );
      } else if (sunAspect === 'opposition' || sunAspect === 'square') {
        predictions.general =
          locale === 'en'
            ? `${periodPrefix} may require patience. Challenges can help you grow.`
            : locale === 'es'
              ? `${periodPrefix} puede requerir paciencia. Los desafíos pueden ayudarte a crecer.`
              : `${periodPrefix} может потребовать от вас терпения. Возможны испытания, которые помогут вам вырасти.`;
        energyScore -= 10;
        challengingCount++;
        predictions.challenges.push(
          locale === 'en'
            ? 'Conflicts with others'
            : locale === 'es'
              ? 'Conflictos con los demás'
              : 'Конфликты с окружающими',
        );
      } else {
        predictions.general =
          locale === 'en'
            ? `${periodPrefix} the Sun’s energy influences your activity and vitality.`
            : locale === 'es'
              ? `${periodPrefix} la energía del Sol influye en tu actividad y vitalidad.`
              : `${periodPrefix} энергия Солнца влияет на вашу активность и жизненную силу.`;
      }
    }

    // Moon analysis (emotions and intuition)
    if (current.moon && natalPlanets.moon) {
      const moonAspect = this.calculateAspect(
        current.moon.longitude,
        natalPlanets.moon.longitude,
      );

      if (moonAspect === 'conjunction' || moonAspect === 'trine') {
        predictions.health =
          locale === 'en'
            ? `${periodPrefix} your emotional state is stable. A good time to care for yourself.`
            : locale === 'es'
              ? `${periodPrefix} tu estado emocional es estable. Buen momento para cuidarte.`
              : `${periodPrefix} ваше эмоциональное состояние стабильно. Хорошее время для заботы о себе.`;
        energyScore += 10;
        harmoniousCount++;
      } else if (moonAspect === 'square') {
        predictions.health =
          locale === 'en'
            ? `${periodPrefix} be mindful of your emotions. Avoid stressful situations.`
            : locale === 'es'
              ? `${periodPrefix} cuida tus emociones. Evita situaciones estresantes.`
              : `${periodPrefix} будьте внимательны к своим эмоциям. Избегайте стрессовых ситуаций.`;
        energyScore -= 5;
        challengingCount++;
        predictions.challenges.push(
          locale === 'en'
            ? 'Emotional instability'
            : locale === 'es'
              ? 'Inestabilidad emocional'
              : 'Эмоциональная нестабильность',
        );
      } else {
        predictions.health =
          locale === 'en'
            ? `${periodPrefix} the Moon influences your emotions and intuition.`
            : locale === 'es'
              ? `${periodPrefix} la Luna influye en tus emociones e intuición.`
              : `${periodPrefix} Луна влияет на ваши эмоции и интуицию.`;
      }
    }

    // Venus analysis (love and relationships)
    if (current.venus && natalPlanets.venus) {
      const venusAspect = this.calculateAspect(
        current.venus.longitude,
        natalPlanets.venus.longitude,
      );

      if (venusAspect === 'trine' || venusAspect === 'sextile') {
        predictions.love =
          locale === 'en'
            ? `${periodPrefix} Venus forms harmonious aspects. A great time for romance and connection.`
            : locale === 'es'
              ? `${periodPrefix} Venus crea aspectos armoniosos. Excelente momento para el romance y la conexión.`
              : `${periodPrefix} Венера создает гармоничные аспекты. Отличное время для романтики и общения с близкими.`;
        energyScore += 10;
        harmoniousCount++;
        predictions.opportunities.push(
          locale === 'en'
            ? 'Harmony in relationships'
            : locale === 'es'
              ? 'Armonía en las relaciones'
              : 'Гармония в отношениях',
        );
      } else if (venusAspect === 'square' || venusAspect === 'opposition') {
        predictions.love =
          locale === 'en'
            ? `${periodPrefix} Venus is in a tense aspect. Practice patience and understanding in relationships.`
            : locale === 'es'
              ? `${periodPrefix} Venus está en un aspecto tenso. Practica la paciencia y la comprensión en las relaciones.`
              : `${periodPrefix} Венера в напряженном аспекте. Проявите терпение и понимание в отношениях.`;
        challengingCount++;
        predictions.challenges.push(
          locale === 'en'
            ? 'Misunderstandings in relationships'
            : locale === 'es'
              ? 'Malentendidos en las relaciones'
              : 'Недопонимание в отношениях',
        );
      } else {
        predictions.love =
          locale === 'en'
            ? `${periodPrefix} Venus influences your attractiveness and ability to express feelings.`
            : locale === 'es'
              ? `${periodPrefix} Venus influye en tu atractivo y capacidad de expresar sentimientos.`
              : `${periodPrefix} Венера влияет на вашу привлекательность и способность выражать чувства.`;
      }
    }

    // Mars analysis (energy and action)
    if (current.mars && natalPlanets.mars) {
      const marsAspect = this.calculateAspect(
        current.mars.longitude,
        natalPlanets.mars.longitude,
      );

      if (marsAspect === 'trine') {
        predictions.career =
          locale === 'en'
            ? `${periodPrefix} Mars gives you energy and determination. A great time for career achievements.`
            : locale === 'es'
              ? `${periodPrefix} Marte te aporta energía y determinación. Excelente momento para logros profesionales.`
              : `${periodPrefix} Марс придает вам энергию и решительность. Отличное время для карьерных достижений.`;
        energyScore += 15;
        harmoniousCount++;
        predictions.opportunities.push(
          locale === 'en'
            ? 'Career growth'
            : locale === 'es'
              ? 'Crecimiento profesional'
              : 'Карьерный рост',
        );
      } else if (marsAspect === 'square') {
        predictions.career =
          locale === 'en'
            ? `${periodPrefix} Mars creates tension. Avoid conflicts at work and be patient.`
            : locale === 'es'
              ? `${periodPrefix} Marte crea tensión. Evita conflictos en el trabajo y sé paciente.`
              : `${periodPrefix} Марс создает напряжение. Избегайте конфликтов на работе и проявляйте терпение.`;
        energyScore -= 10;
        challengingCount++;
        predictions.challenges.push(
          locale === 'en'
            ? 'Obstacles at work'
            : locale === 'es'
              ? 'Obstáculos en el trabajo'
              : 'Препятствия в работе',
        );
      } else {
        predictions.career =
          locale === 'en'
            ? `${periodPrefix} Mars influences your energy and ambitions in your professional sphere.`
            : locale === 'es'
              ? `${periodPrefix} Marte influye en tu energía y ambiciones en el ámbito profesional.`
              : `${periodPrefix} Марс влияет на вашу энергию и амбиции в профессиональной сфере.`;
      }
    }

    // Jupiter analysis (growth and expansion)
    if (current.jupiter && natalPlanets.jupiter) {
      const jupiterAspect = this.calculateAspect(
        current.jupiter.longitude,
        natalPlanets.jupiter.longitude,
      );

      if (jupiterAspect === 'trine' || jupiterAspect === 'conjunction') {
        predictions.finance =
          locale === 'en'
            ? `${periodPrefix} Jupiter favors your finances. Time for reasonable investments.`
            : locale === 'es'
              ? `${periodPrefix} Júpiter favorece tus finanzas. Tiempo de inversiones razonables.`
              : `${periodPrefix} Юпитер благоволит вашим финансам. Время для разумных инвестиций.`;
        energyScore += 10;
        harmoniousCount++;
        predictions.opportunities.push(
          locale === 'en'
            ? 'Financial opportunities'
            : locale === 'es'
              ? 'Oportunidades financieras'
              : 'Финансовые возможности',
        );
      } else {
        predictions.finance =
          locale === 'en'
            ? `${periodPrefix} your financial situation is stable. Stick to a budget and avoid risks.`
            : locale === 'es'
              ? `${periodPrefix} la situación financiera es estable. Mantén el presupuesto y evita riesgos.`
              : `${periodPrefix} финансовая ситуация стабильна. Придерживайтесь бюджета и избегайте рисков.`;
      }
    }

    // Mercury analysis (communication and thinking)
    if (current.mercury && natalPlanets.mercury) {
      const mercuryAspect = this.calculateAspect(
        current.mercury.longitude,
        natalPlanets.mercury.longitude,
      );
      if (mercuryAspect === 'square' || mercuryAspect === 'opposition') {
        predictions.challenges.push(
          locale === 'en'
            ? 'Communication difficulties'
            : locale === 'es'
              ? 'Dificultades en la comunicación'
              : 'Сложности в коммуникации',
        );
      } else if (mercuryAspect === 'trine' || mercuryAspect === 'sextile') {
        predictions.opportunities.push(
          locale === 'en'
            ? 'Clarity of thought'
            : locale === 'es'
              ? 'Claridad mental'
              : 'Ясность мышления',
        );
      }
    }

    // Normalize energy (0-100)
    predictions.energy = Math.min(100, Math.max(0, energyScore));

    // Determine mood
    if (harmoniousCount > challengingCount + 2) {
      predictions.mood =
        locale === 'en'
          ? 'Joyful and inspired'
          : locale === 'es'
            ? 'Alegre e inspirado'
            : 'Радостное и вдохновленное';
    } else if (harmoniousCount > challengingCount) {
      predictions.mood =
        locale === 'en'
          ? 'Optimistic'
          : locale === 'es'
            ? 'Optimista'
            : 'Оптимистичное';
    } else if (challengingCount > harmoniousCount) {
      predictions.mood =
        locale === 'en'
          ? 'Reserved and cautious'
          : locale === 'es'
            ? 'Reservado y prudente'
            : 'Сдержанное и осторожное';
    } else {
      predictions.mood =
        locale === 'en'
          ? 'Neutral and balanced'
          : locale === 'es'
            ? 'Neutral y equilibrado'
            : 'Нейтральное и сбалансированное';
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
    let sunPrimaryColor =
      locale === 'en' ? 'White' : locale === 'es' ? 'Blanco' : 'Белый';
    let moonPrimaryColor =
      locale === 'en' ? 'Gray' : locale === 'es' ? 'Gris' : 'Серый';
    try {
      const sunColors = getSignColors(sunSign, locale) || [];
      const moonColors = getSignColors(moonSign, locale) || [];
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
        predictions.advice =
          locale === 'en'
            ? `${periodPrefix} trust your intuition and act decisively.`
            : locale === 'es'
              ? `${periodPrefix} confía en tu intuición y actúa con decisión.`
              : `${periodPrefix} доверяйте своей интуиции и действуйте решительно.`;
      } else if (predictions.energy > 50) {
        predictions.advice =
          locale === 'en'
            ? `${periodPrefix} focus on what matters and avoid scattering your energy.`
            : locale === 'es'
              ? `${periodPrefix} concéntrate en lo importante y evita dispersar tu energía.`
              : `${periodPrefix} фокусируйтесь на важных делах и избегайте распыления энергии.`;
      } else {
        predictions.advice =
          locale === 'en'
            ? `${periodPrefix} practice patience and care for your inner balance.`
            : locale === 'es'
              ? `${periodPrefix} practica la paciencia y cuida tu equilibrio interno.`
              : `${periodPrefix} практикуйте терпение и заботьтесь о своем внутреннем балансе.`;
      }
    } else if (period === 'week') {
      predictions.advice =
        locale === 'en'
          ? 'This week practice gratitude and stay open to new experiences.'
          : locale === 'es'
            ? 'Esta semana practica la gratitud y mantente abierto a nuevas experiencias.'
            : 'На этой неделе практикуйте благодарность и оставайтесь открытыми новому опыту.';
    } else if (period === 'month') {
      predictions.advice =
        locale === 'en'
          ? 'This month focus on long-term goals and remember to rest.'
          : locale === 'es'
            ? 'Este mes concéntrate en objetivos a largo plazo y no olvides descansar.'
            : 'В этом месяце сосредоточьтесь на долгосрочных целях и не забывайте отдыхать.';
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
