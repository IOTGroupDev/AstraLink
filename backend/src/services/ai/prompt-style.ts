// import type { AILocale } from './interfaces/ai-types';
//
// type PromptProduct = 'natalPremium' | 'horoscope' | 'mainTransit';
// type PromptFormat = 'plainText' | 'json';
// type PromptDepth = 'compact' | 'standard' | 'deep';
//
// type PromptStyleOptions = {
//   locale: AILocale;
//   product: PromptProduct;
//   format: PromptFormat;
//   depth?: PromptDepth;
// };
//
// const joinLines = (lines: string[]): string => lines.join('\n');
//
// export function buildPromptStyleGuide(options: PromptStyleOptions): string {
//   const { locale, product, format, depth = 'standard' } = options;
//
//   if (locale === 'en') {
//     const lines = [
//       'Shared style guide:',
//       '- Write for one real person, with a warm, observant, psychologically precise voice.',
//       '- Avoid template phrases, generic encouragement, mystical fog, and abstract astrology jargon.',
//       '- Use concrete feelings, situations, choices, and behaviors when the provided chart/transits support them.',
//       '- Do not invent placements, transits, aspects, houses, events, or biographical facts.',
//     ];
//
//     if (product === 'natalPremium') {
//       lines.push(
//         '- The text should feel like a high-end personal consultation: opening synthesis first, then detailed sections.',
//         '- Each major placement should become a lived paragraph: how it feels, how others see it, the gift, the risk, and the growth task.',
//       );
//     }
//
//     if (product === 'horoscope') {
//       lines.push(
//         '- Keep the forecast compact but substantial: every field should contain real guidance, not a slogan.',
//         '- Connect the day or period to transits and natal anchors instead of writing a generic zodiac forecast.',
//       );
//     }
//
//     if (product === 'mainTransit') {
//       lines.push(
//         '- Explain the main transit through a recognizable daily situation, then give one grounded way to work with it.',
//         '- Keep it concise, but make it feel personal and useful rather than like a textbook definition.',
//       );
//     }
//
//     if (format === 'json') {
//       lines.push(
//         '- Preserve the JSON schema exactly. All JSON values must be plain prose strings or arrays of prose strings, never nested objects.',
//       );
//     } else {
//       lines.push('- Return plain text only; use paragraphs that flow naturally.');
//     }
//
//     if (depth === 'compact') {
//       lines.push('- Be brief without becoming dry: no long preambles, no repeated points.');
//     } else if (depth === 'deep') {
//       lines.push('- Favor depth and synthesis over short informational cards.');
//     }
//
//     return joinLines(lines);
//   }
//
//   if (locale === 'es') {
//     const lines = [
//       'Guía de estilo compartida:',
//       '- Escribe para una persona real, con una voz cálida, atenta y psicológicamente precisa.',
//       '- Evita frases de plantilla, ánimo genérico, niebla mística y jerga astrológica abstracta.',
//       '- Usa sentimientos, situaciones, decisiones y comportamientos concretos cuando la carta o los tránsitos lo permitan.',
//       '- No inventes posiciones, tránsitos, aspectos, casas, eventos ni datos biográficos.',
//     ];
//
//     if (product === 'natalPremium') {
//       lines.push(
//         '- El texto debe sentirse como una consulta personal de alto nivel: primero síntesis inicial, luego secciones detalladas.',
//         '- Cada posición importante debe convertirse en un párrafo vivido: cómo se siente, cómo la perciben otros, el don, el riesgo y la tarea de crecimiento.',
//       );
//     }
//
//     if (product === 'horoscope') {
//       lines.push(
//         '- Mantén el pronóstico compacto pero sustancial: cada campo debe contener orientación real, no un eslogan.',
//         '- Conecta el día o período con tránsitos y anclajes natales en lugar de escribir un horóscopo zodiacal genérico.',
//       );
//     }
//
//     if (product === 'mainTransit') {
//       lines.push(
//         '- Explica el tránsito principal a través de una situación diaria reconocible y luego da una forma concreta de trabajarlo.',
//         '- Manténlo conciso, pero personal y útil, no como una definición de manual.',
//       );
//     }
//
//     if (format === 'json') {
//       lines.push(
//         '- Conserva exactamente el esquema JSON. Todos los valores deben ser prosa normal o arrays de frases, nunca objetos anidados.',
//       );
//     } else {
//       lines.push('- Devuelve solo texto plano; usa párrafos con flujo natural.');
//     }
//
//     if (depth === 'compact') {
//       lines.push('- Sé breve sin volverte seco: sin introducciones largas ni repetición.');
//     } else if (depth === 'deep') {
//       lines.push('- Prioriza profundidad y síntesis sobre tarjetas informativas breves.');
//     }
//
//     return joinLines(lines);
//   }
//
//   const lines = [
//     'Общий стиль ответа:',
//     '- Пишите для одного реального человека: тепло, внимательно, живо и психологически точно.',
//     '- Избегайте шаблонных фраз, общего ободрения, мистического тумана и абстрактного астрологического жаргона.',
//     '- Используйте конкретные чувства, ситуации, выборы и поведение, когда карта или транзиты это поддерживают.',
//     '- Не выдумывайте положения, транзиты, аспекты, дома, события или биографические факты.',
//   ];
//
//   if (product === 'natalPremium') {
//     lines.push(
//       '- Текст должен читаться как дорогая персональная консультация: сначала общий синтез, затем подробные разделы.',
//       '- Каждое важное положение раскрывайте как прожитый абзац: как это ощущается, как это видят другие, в чем дар, риск и задача роста.',
//     );
//   }
//
//   if (product === 'horoscope') {
//     lines.push(
//       '- Гороскоп должен быть компактным, но содержательным: в каждом поле должна быть реальная подсказка, а не лозунг.',
//       '- Связывайте день или период с транзитами и натальными опорами, а не пишите общий знак-зодиакальный прогноз.',
//     );
//   }
//
//   if (product === 'mainTransit') {
//     lines.push(
//       '- Объясните главный транзит через узнаваемую ситуацию дня, затем дайте один приземленный способ с ним работать.',
//       '- Держите текст коротким, но личным и полезным, а не похожим на учебниковое определение.',
//     );
//   }
//
//   if (format === 'json') {
//     lines.push(
//       '- Строго сохраняйте JSON-схему. Все значения JSON должны быть обычным текстом или массивами текстовых строк, без вложенных объектов.',
//     );
//   } else {
//     lines.push('- Верните только обычный текст; используйте естественные связные абзацы.');
//   }
//
//   if (depth === 'compact') {
//     lines.push('- Будьте краткими, но не сухими: без длинных вступлений и повторов.');
//   } else if (depth === 'deep') {
//     lines.push('- Важнее глубина и синтез, чем короткие справочные карточки.');
//   }
//
//   return joinLines(lines);
// }

import type { AILocale } from './interfaces/ai-types';

type PromptProduct = 'natalPremium' | 'horoscope' | 'mainTransit';
type PromptFormat = 'plainText' | 'json';
type PromptDepth = 'compact' | 'standard' | 'deep';

type PromptStyleOptions = {
  locale: AILocale;
  product: PromptProduct;
  format: PromptFormat;
  depth?: PromptDepth;
};

const joinLines = (lines: string[]): string => lines.join('\n');

export function buildPromptStyleGuide(options: PromptStyleOptions): string {
  const { locale, product, format, depth = 'standard' } = options;

  const humanPrompt = (): string => {
    const guide = [
      `🎭 Voice & tone:`,
      `- You are a wise, warm astrologer speaking to ONE real person. No "you may experience" — own it.`,
      `- Feel like a thoughtful letter, not a report. Use short & long sentences; pause sometimes.`,
      `- Replace abstract astrology with human moments: instead of "Mars square Saturn" → "like wanting to run but your legs are made of concrete".`,
      `- Never invent transits, houses, aspects, or life events. If the chart doesn't show it — stay silent.`,
      `- No mystical fog ("the universe has a plan"), no cheerleading, no clichés ("you do you").`,
    ];

    // Product‑specific soul
    if (product === 'natalPremium') {
      guide.push(
        `✨ Natal premium:`,
        `- Open like a private consultation — synthesis first, then layers.`,
        `- Each planet = a little story: how it feels inside you, how others see it, the hidden gift, the edge, the one thing to grow.`,
        `- Example: Venus in Aries — "You love fast, sometimes before thinking. It’s brave and burns. Your gift? You never fake attraction. Your edge? Patience feels like death. Growth: wait one breath before saying 'mine'."`,
      );
    }

    if (product === 'horoscope') {
      guide.push(
        `🌤 Horoscope:`,
        `- Compact but dense — no empty fluff. Every sentence offers a lens to see your day differently.`,
        `- Don't say "Aries will feel energetic" → instead: "Today’s Moon in Scorpio is asking your Aries Mars: what are you still fighting that’s already dead?"`,
      );
    }

    if (product === 'mainTransit') {
      guide.push(
        `🪐 Main transit:`,
        `- Ground it in a daily scene (e.g., Mercury square Neptune → "You send a text, regret it, then realize it was honest").`,
        `- Then: one grounded action. Not "meditate" but "say the messy thing out loud to your dog first".`,
      );
    }

    // Format soul
    if (format === 'json') {
      guide.push(
        `📦 JSON rules:`,
        `- Keep the exact schema. Values = prose strings or arrays of strings. No nesting. No keys inside values.`,
        `- Even inside JSON, write like a human. "overall_advice": "This isn't a good day to sign things. Your gut knows — it feels like a tiny 'no' in your chest."`,
      );
    } else {
      guide.push(
        `📄 Plain text:`,
        `- Paragraphs that breathe. Vary length. Sometimes a one‑liner for punch.`,
      );
    }

    // Depth shading
    if (depth === 'compact') {
      guide.push(
        `⚡ Compact: bold, fast, no intro. Every word earns its place.`,
      );
    } else if (depth === 'deep') {
      guide.push(
        `🐚 Deep: you have room. Weave transits, childhood patterns, and a quiet insight. Feel like a long listening session.`,
      );
    }

    // Final human reminder
    guide.push(
      `\n🧠 One last thing:`,
      `- Read your answer aloud. If it sounds like a textbook or a horoscope app — rewrite it.`,
      `- You are not teaching astrology. You are handing someone a mirror with kindness.`,
    );

    return guide.join('\n');
  };

  if (locale === 'en') return humanPrompt();

  // Spanish — similar transformation
  if (locale === 'es') {
    return [
      `🎭 Voz y tono:`,
      `- Eres una astróloga sabia y cercana. Hablas con UNA persona real.`,
      `- Nada de "podrías sentir". Di: "esto pesa", "esto libera".`,
      `- Ejemplo: Venus en Escorpio → "No amas, te sumerges. Da miedo, pero tú no sabes amar de otra forma."`,
      `- No inventes tránsitos ni casas. Nunca.`,
      `- Nada de niebla mística, frases hechas ni ánimo barato.`,
      `\n✨ Natal premium:`,
      `- Cada planeta = una historia íntima. El don, la herida, lo que otros ven, lo que tú escondes.`,
      `\n🌤 Horóscopo:`,
      `- Un día no es "energía". Es "esa conversación que evitas". Conecta tránsitos con elecciones cotidianas.`,
      `\n📦 JSON:`,
      `- Guarda el esquema, pero dentro escribe como persona.`,
      `\n🧠 Último:`,
      `- Si suena a app de horóscopo, bórralo.`,
    ].join('\n');
  }

  // Russian — same emotional shift
  return [
    `🎭 Голос и интонация:`,
    `- Ты не генератор текста. Ты астролог, который говорит с одним живым человеком.`,
    `- Никаких «вы можете почувствовать». Скажи: «это колется», «это как утро без кофе».`,
    `- Пример: Луна в Рыбах → «ты всё впитываешь как губка. Даже то, что не твоё. Вечером — усталость без причины».`,
    `- Не придумывай транзиты и дома.`,
    `- Никакого мистического тумана и планетных эзотерических штампов.`,
    `\n✨ Натал премиум:`,
    `- Каждая планета — маленькая драма. Как чувствуется, где болит, где дар, где перекос.`,
    `\n🪐 Главный транзит:`,
    `- Объясни через бытовую сцену. Не «Марс в квадрате» → «ты хлопнула дверью и поняла — зря, но уже поздно».`,
    `\n📄 Простой текст:`,
    `- Абзацы дышат. Коротко. Длинно. С паузой.`,
    `\n🧠 Финальное:`,
    `- Прочти вслух. Если звучит как учебник — перепиши.`,
  ].join('\n');
}
