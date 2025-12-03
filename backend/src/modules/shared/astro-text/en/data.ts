// duplicate early extended dictionaries removed; single definitions kept after imports
// backend/src/modules/shared/astro-text/en/data.ts
// EN locale dictionaries for astro-text module
// Note: PeriodFrame keys remain RU ('Сегодня', 'Завтра', 'На этой неделе', 'В этом месяце')
// to keep compatibility with current pipeline. Text content is in English.

import type { PlanetKey, Sign, AspectType, PeriodFrame, Tone } from '../types';

export const ASPECT_NAMES_EN: Record<AspectType, string> = {
  conjunction: 'in conjunction with',
  opposition: 'in opposition to',
  trine: 'in trine to',
  square: 'in square to',
  sextile: 'in sextile to',
};

// Minimal planet-in-sign phrases for all planets (generic but distinct).
export const PLANET_IN_SIGN_EN: Partial<
  Record<PlanetKey, Partial<Record<Sign, string>>>
> = {
  sun: {
    Aries: 'Sun in Aries brings initiative, vitality, and leadership.',
    Taurus:
      'Sun in Taurus brings consistency, practicality, and appreciation of comfort.',
    Gemini: 'Sun in Gemini brings curiosity, adaptability, and communication.',
    Cancer: 'Sun in Cancer brings sensitivity, care, and emphasis on home.',
    Leo: 'Sun in Leo brings confidence, creativity, and radiance.',
    Virgo: 'Sun in Virgo brings analysis, precision, and service.',
    Libra: 'Sun in Libra brings harmony, fairness, and diplomacy.',
    Scorpio: 'Sun in Scorpio brings intensity, depth, and transformation.',
    Sagittarius: 'Sun in Sagittarius brings openness, philosophy, and growth.',
    Capricorn:
      'Sun in Capricorn brings responsibility, ambition, and structure.',
    Aquarius: 'Sun in Aquarius brings originality, independence, and ideals.',
    Pisces: 'Sun in Pisces brings imagination, intuition, and compassion.',
  },
  moon: {
    Aries: 'Moon in Aries intensifies emotional spontaneity and passion.',
    Taurus: 'Moon in Taurus stabilizes emotions and loves comfort.',
    Gemini: 'Moon in Gemini brings emotional flexibility and curiosity.',
    Cancer: 'Moon in Cancer heightens sensitivity and intuition.',
    Leo: 'Moon in Leo adds generosity and a need for recognition.',
    Virgo: 'Moon in Virgo adds practicality and care in details.',
    Libra: 'Moon in Libra seeks balance and harmony in relationships.',
    Scorpio: 'Moon in Scorpio deepens feelings and intensity.',
    Sagittarius: 'Moon in Sagittarius uplifts mood and desire for freedom.',
    Capricorn: 'Moon in Capricorn adds restraint and responsibility.',
    Aquarius: 'Moon in Aquarius values independence and originality.',
    Pisces: 'Moon in Pisces raises empathy and dreaminess.',
  },
  mercury: {
    Aries: 'Mercury in Aries quickens thought and direct speech.',
    Taurus: 'Mercury in Taurus brings practicality and consistency of thought.',
    Gemini: 'Mercury in Gemini boosts communication and versatility.',
    Cancer: 'Mercury in Cancer adds intuition and emotional memory.',
    Leo: 'Mercury in Leo expresses with confidence and flair.',
    Virgo: 'Mercury in Virgo refines analysis and attention to detail.',
    Libra: 'Mercury in Libra seeks balance and fairness in dialogue.',
    Scorpio:
      'Mercury in Scorpio penetrates to the core and speaks with intensity.',
    Sagittarius:
      'Mercury in Sagittarius broadens perspectives and philosophical thinking.',
    Capricorn: 'Mercury in Capricorn structures ideas and plans strategically.',
    Aquarius: 'Mercury in Aquarius innovates and thinks unconventionally.',
    Pisces: 'Mercury in Pisces imagines, empathizes, and connects intuitively.',
  },
  venus: {
    Aries: 'Venus in Aries loves boldly and directly.',
    Taurus: 'Venus in Taurus values stability, comfort, and sensuality.',
    Gemini: 'Venus in Gemini enjoys lightness, curiosity, and conversation.',
    Cancer: 'Venus in Cancer nurtures closeness and safety.',
    Leo: 'Venus in Leo loves generously and theatrically.',
    Virgo: 'Venus in Virgo cares through practical acts and attention.',
    Libra: 'Venus in Libra seeks harmony, beauty, and cooperation.',
    Scorpio: 'Venus in Scorpio bonds intensely and transforms through love.',
    Sagittarius: 'Venus in Sagittarius loves freedom and shared adventures.',
    Capricorn: 'Venus in Capricorn commits steadily and values reliability.',
    Aquarius: 'Venus in Aquarius values independence and friendly love.',
    Pisces: 'Venus in Pisces loves compassionately and poetically.',
  },
  mars: {
    Aries: 'Mars in Aries acts fast, direct, and boldly.',
    Taurus: 'Mars in Taurus acts steadily and persistently.',
    Gemini: 'Mars in Gemini acts flexibly and through ideas.',
    Cancer: 'Mars in Cancer acts protectively and indirectly.',
    Leo: 'Mars in Leo acts proudly and creatively.',
    Virgo: 'Mars in Virgo acts precisely and efficiently.',
    Libra: 'Mars in Libra acts diplomatically and cooperatively.',
    Scorpio: 'Mars in Scorpio acts intensely and strategically.',
    Sagittarius: 'Mars in Sagittarius acts expansively and optimistically.',
    Capricorn: 'Mars in Capricorn acts disciplined and goal-oriented.',
    Aquarius: 'Mars in Aquarius acts innovatively and collectively.',
    Pisces: 'Mars in Pisces acts sensitively and inspired.',
  },
  jupiter: {
    Aries: 'Jupiter in Aries expands courage and initiative.',
    Taurus: 'Jupiter in Taurus expands stability and material growth.',
    Gemini: 'Jupiter in Gemini expands learning and communication.',
    Cancer: 'Jupiter in Cancer expands care and family values.',
    Leo: 'Jupiter in Leo expands creativity and self-expression.',
    Virgo: 'Jupiter in Virgo expands service and craftsmanship.',
    Libra: 'Jupiter in Libra expands fairness and partnerships.',
    Scorpio: 'Jupiter in Scorpio expands depth and transformation.',
    Sagittarius: 'Jupiter in Sagittarius expands horizons and faith.',
    Capricorn: 'Jupiter in Capricorn expands responsibility and results.',
    Aquarius: 'Jupiter in Aquarius expands innovation and networks.',
    Pisces: 'Jupiter in Pisces expands compassion and imagination.',
  },
  saturn: {
    Aries: 'Saturn in Aries demands disciplined initiative.',
    Taurus: 'Saturn in Taurus demands stable resource management.',
    Gemini: 'Saturn in Gemini demands structured learning and speech.',
    Cancer: 'Saturn in Cancer demands emotional maturity and boundaries.',
    Leo: 'Saturn in Leo demands responsibility in self-expression.',
    Virgo: 'Saturn in Virgo demands precision and practical service.',
    Libra: 'Saturn in Libra demands balanced commitment and fairness.',
    Scorpio: 'Saturn in Scorpio demands integrity in power and depth.',
    Sagittarius:
      'Saturn in Sagittarius demands responsibility in beliefs and expansion.',
    Capricorn: 'Saturn in Capricorn structures ambition and leadership.',
    Aquarius: 'Saturn in Aquarius structures innovation and community.',
    Pisces: 'Saturn in Pisces structures compassion and imagination.',
  },
  uranus: {
    Aries: 'Uranus in Aries electrifies initiative and breakthroughs.',
    Taurus: 'Uranus in Taurus disrupts stability and values for renewal.',
    Gemini: 'Uranus in Gemini innovates ideas and communication.',
    Cancer: 'Uranus in Cancer awakens new emotional patterns.',
    Leo: 'Uranus in Leo liberates creativity and self-expression.',
    Virgo: 'Uranus in Virgo modernizes methods and health routines.',
    Libra: 'Uranus in Libra revolutionizes relationships and fairness.',
    Scorpio: 'Uranus in Scorpio intensifies transformation and truth.',
    Sagittarius: 'Uranus in Sagittarius frees beliefs and expands horizons.',
    Capricorn: 'Uranus in Capricorn reforms structures and authority.',
    Aquarius: 'Uranus in Aquarius amplifies originality and networks.',
    Pisces: 'Uranus in Pisces dissolves limits and inspires intuition.',
  },
  neptune: {
    Aries: 'Neptune in Aries spiritualizes will and action.',
    Taurus: 'Neptune in Taurus dissolves rigid values and refines senses.',
    Gemini: 'Neptune in Gemini inspires poetic thinking and flexible views.',
    Cancer: 'Neptune in Cancer heightens empathy and longing for belonging.',
    Leo: 'Neptune in Leo idealizes creativity and heart expression.',
    Virgo: 'Neptune in Virgo refines service and compassionate details.',
    Libra: 'Neptune in Libra idealizes harmony and shared beauty.',
    Scorpio: 'Neptune in Scorpio deepens mysteries and healing.',
    Sagittarius: 'Neptune in Sagittarius inspires vision and faith.',
    Capricorn: 'Neptune in Capricorn dissolves stale rules for higher order.',
    Aquarius: 'Neptune in Aquarius dreams of humane innovation.',
    Pisces: 'Neptune in Pisces amplifies imagination and unity.',
  },
  pluto: {
    Aries: 'Pluto in Aries transforms identity and raw drive.',
    Taurus: 'Pluto in Taurus transforms values and material attachments.',
    Gemini: 'Pluto in Gemini transforms thought and information power.',
    Cancer: 'Pluto in Cancer transforms family and emotional roots.',
    Leo: 'Pluto in Leo transforms creative power and personal pride.',
    Virgo: 'Pluto in Virgo transforms work, health, and analysis.',
    Libra: 'Pluto in Libra transforms relationships and social contracts.',
    Scorpio: 'Pluto in Scorpio empowers regeneration and truth.',
    Sagittarius:
      'Pluto in Sagittarius transforms belief systems and expansion.',
    Capricorn: 'Pluto in Capricorn transforms institutions and authority.',
    Aquarius: 'Pluto in Aquarius transforms networks and collective progress.',
    Pisces: 'Pluto in Pisces transforms spirituality and the unseen.',
  },
  north_node: {
    Aries: 'North Node in Aries calls for developing independence and courage.',
    Taurus:
      'North Node in Taurus guides toward building stability and self-worth.',
    Gemini: 'North Node in Gemini encourages communication and learning.',
    Cancer: 'North Node in Cancer focuses on emotional security and nurturing.',
    Leo: 'North Node in Leo promotes self-expression and leadership.',
    Virgo: 'North Node in Virgo emphasizes service and practical skills.',
    Libra: 'North Node in Libra teaches balance and harmonious relationships.',
    Scorpio: 'North Node in Scorpio demands transformation and intimacy.',
    Sagittarius: 'North Node in Sagittarius expands horizons and philosophy.',
    Capricorn: 'North Node in Capricorn builds responsibility and structure.',
    Aquarius: 'North Node in Aquarius fosters innovation and community.',
    Pisces: 'North Node in Pisces develops compassion and spirituality.',
  },
  south_node: {
    Aries: 'South Node in Aries indicates past life independence to balance.',
    Taurus: 'South Node in Taurus shows comfort patterns to release.',
    Gemini: 'South Node in Gemini reveals communication habits to evolve.',
    Cancer: 'South Node in Cancer points to emotional dependencies to heal.',
    Leo: 'South Node in Leo suggests creative pride to moderate.',
    Virgo: 'South Node in Virgo indicates service patterns to transform.',
    Libra: 'South Node in Libra shows relationship dynamics to balance.',
    Scorpio: 'South Node in Scorpio reveals power issues to resolve.',
    Sagittarius: 'South Node in Sagittarius points to beliefs to expand.',
    Capricorn: 'South Node in Capricorn indicates structures to rebuild.',
    Aquarius: 'South Node in Aquarius shows detachment to integrate.',
    Pisces: 'South Node in Pisces reveals illusions to clarify.',
  },
  lilith: {
    Aries: 'Lilith in Aries expresses raw feminine power and independence.',
    Taurus: 'Lilith in Taurus rebels against material constraints and values.',
    Gemini: 'Lilith in Gemini challenges communication norms and curiosity.',
    Cancer: 'Lilith in Cancer confronts emotional vulnerability and care.',
    Leo: 'Lilith in Leo rejects false pride and demands authentic expression.',
    Virgo: 'Lilith in Virgo resists perfectionism and embraces imperfection.',
    Libra: 'Lilith in Libra challenges superficial harmony and justice.',
    Scorpio: 'Lilith in Scorpio embodies dark feminine power and truth.',
    Sagittarius: 'Lilith in Sagittarius rejects dogma and seeks freedom.',
    Capricorn:
      'Lilith in Capricorn defies authority and builds authentic power.',
    Aquarius:
      'Lilith in Aquarius revolutionizes norms and embraces uniqueness.',
    Pisces: 'Lilith in Pisces dissolves boundaries and embraces mystery.',
  },
  chiron: {
    Aries: 'Chiron in Aries heals wounds of identity and self-assertion.',
    Taurus: 'Chiron in Taurus addresses wounds of self-worth and security.',
    Gemini: 'Chiron in Gemini heals communication and learning traumas.',
    Cancer: 'Chiron in Cancer mends emotional and family wounds.',
    Leo: 'Chiron in Leo heals creative expression and recognition issues.',
    Virgo: 'Chiron in Virgo addresses health and service-related wounds.',
    Libra: 'Chiron in Libra heals relationship and balance wounds.',
    Scorpio: 'Chiron in Scorpio transforms deep trauma and power wounds.',
    Sagittarius: 'Chiron in Sagittarius heals belief and expansion wounds.',
    Capricorn: 'Chiron in Capricorn addresses authority and structure wounds.',
    Aquarius: 'Chiron in Aquarius heals detachment and community wounds.',
    Pisces: 'Chiron in Pisces mends spiritual and boundary wounds.',
  },
};

// Detailed house interpretations by sign (personality and self-expression influence)
export const HOUSE_SIGN_INTERPRETATIONS_EN: Partial<
  Record<number, Partial<Record<Sign, string>>>
> = {
  1: {
    Aries:
      '1st House in Aries makes you bright and dynamic in self-expression. You appear as a confident leader, always ready for action. Your personality radiates energy and initiative, attracting others and helping achieve goals.',
    Taurus:
      '1st House in Taurus gives your personality stability and reliability. You appear calm and grounded, valuing comfort and beauty. Your self-expression is practical and sensual, creating the impression of a reliable partner.',
    Gemini:
      '1st House in Gemini makes you communicative and flexible in self-expression. You appear intelligent and adaptive, easily establishing contacts. Your personality is curious and lively, helping in communication and learning.',
    Cancer:
      '1st House in Cancer gives your personality care and intuition. You appear sensitive and homely, creating an atmosphere of comfort. Your self-expression is emotional and caring, helping in close relationships.',
    Leo: '1st House in Leo makes you bright and confident in self-expression. You appear charismatic, loving to be in the spotlight. Your personality is creative and generous, inspiring others.',
    Virgo:
      '1st House in Virgo gives your personality neatness and attentiveness. You appear practical and reliable, paying attention to details. Your self-expression is systematic and serving, helping in work and caring for others.',
    Libra:
      '1st House in Libra makes you diplomatic and aesthetic in self-expression. You appear harmonious and tactful, valuing beauty. Your personality is balanced and partnership-oriented, helping in relationships.',
    Scorpio:
      '1st House in Scorpio gives your personality depth and magnetism. You appear mysterious and strong, possessing inner power. Your self-expression is intense and transformative, attracting deep connections.',
    Sagittarius:
      '1st House in Sagittarius makes you optimistic and direct in self-expression. You appear philosophical and adventurous. Your personality is open and honest, helping in learning and travel.',
    Capricorn:
      '1st House in Capricorn gives your personality responsibility and ambition. You appear disciplined and strategic, building long-term plans. Your self-expression is practical and purposeful.',
    Aquarius:
      '1st House in Aquarius makes you original and independent in self-expression. You appear innovative and humanist, thinking unconventionally. Your personality is objective and friendly, helping in community.',
    Pisces:
      '1st House in Pisces gives your personality empathy and creativity. You appear dreamy and intuitive, possessing rich imagination. Your self-expression is compassionate and inspiring.',
  },
  2: {
    Aries:
      '2nd House in Aries makes your attitude to finances active and initiative. You earn through bold actions and leadership. Your values are connected to independence and achievement, helping financial growth.',
    Taurus:
      '2nd House in Taurus strengthens practicality in financial matters. You value stability and material comfort. Your values are connected to reliability and sensual pleasures, helping accumulate resources.',
    Gemini:
      '2nd House in Gemini makes your financial thinking flexible and communicative. You earn through communication and learning. Your values are connected to diversity and adaptability, helping in different spheres.',
    Cancer:
      '2nd House in Cancer adds emotionality to financial questions. You value security and family values. Your resources are connected to care and home, helping stable accumulation.',
    Leo: '2nd House in Leo makes your attitude to finances generous and creative. You earn through self-expression and leadership. Your values are connected to recognition and generosity.',
    Virgo:
      '2nd House in Virgo adds practicality and attention to details in finances. You value systematic approach to resources. Your values are connected to service and efficiency, helping stable growth.',
    Libra:
      '2nd House in Libra makes your financial thinking diplomatic and aesthetic. You value harmony in partnerships. Your resources are connected to beauty and balance in relationships.',
    Scorpio:
      '2nd House in Scorpio adds depth and intensity to financial questions. You value transformation and shared resources. Your values are connected to strength and depth, helping in crises.',
    Sagittarius:
      '2nd House in Sagittarius makes your attitude to finances optimistic and broad. You value freedom and travel. Your resources are connected to philosophy and horizon expansion.',
    Capricorn:
      '2nd House in Capricorn adds discipline and ambition to finances. You value long-term investments. Your values are connected to responsibility and structure, helping stable growth.',
    Aquarius:
      '2nd House in Aquarius makes your financial thinking innovative and independent. You value social projects. Your resources are connected to community and progress.',
    Pisces:
      '2nd House in Pisces adds intuition and compassion to financial questions. You value spiritual values. Your resources are connected to imagination and helping others.',
  },
  3: {
    Aries:
      '3rd House in Aries makes your thinking fast and direct. You effectively communicate and learn through action. Your communication is initiative and energetic, helping in learning and contacts.',
    Taurus:
      '3rd House in Taurus adds practicality and consistency to thinking. You learn through experience and value stability. Your communication is reliable and sensual, helping in close communication.',
    Gemini:
      '3rd House in Gemini strengthens curiosity and flexibility of mind. You are master of communication and learning. Your communication is lively and adaptive, helping in diverse contacts.',
    Cancer:
      '3rd House in Cancer adds emotionality and intuition to thinking. You learn through feelings and care. Your communication is sensitive and family-oriented, helping in close connections.',
    Leo: '3rd House in Leo makes your self-expression bright and creative. You learn through self-expression. Your communication is confident and inspiring, helping in teaching.',
    Virgo:
      '3rd House in Virgo adds analyticity and attention to details to thinking. You learn through analysis and service. Your communication is precise and practical, helping in learning.',
    Libra:
      '3rd House in Libra makes your thinking diplomatic and aesthetic. You learn through harmony. Your communication is tactful and balanced, helping in partnerships.',
    Scorpio:
      '3rd House in Scorpio adds depth and intensity to thinking. You learn through transformation. Your communication is insightful and powerful, helping in deep connections.',
    Sagittarius:
      '3rd House in Scorpio makes your thinking broad and philosophical. You learn through travel. Your communication is honest and optimistic, helping in learning.',
    Capricorn:
      '3rd House in Capricorn adds discipline and ambition to thinking. You learn through structure. Your communication is responsible and strategic, helping in career.',
    Aquarius:
      '3rd House in Aquarius makes your thinking innovative and independent. You learn through community. Your communication is original and objective, helping in progress.',
    Pisces:
      '3rd House in Pisces adds intuition and imagination to thinking. You learn through empathy. Your communication is compassionate and creative, helping in art.',
  },
  4: {
    Aries:
      '4th House in Aries makes your home active and initiative. You create energetic family atmosphere. Your roots are connected to independence and action, helping in new beginnings.',
    Taurus:
      '4th House in Taurus adds stability and comfort to home. You value material security. Your roots are connected to practicality and sensual pleasures, creating comfort.',
    Gemini:
      '4th House in Gemini makes your home communicative and flexible. You value intellectual atmosphere. Your roots are connected to learning and diversity, helping in adaptation.',
    Cancer:
      '4th House in Cancer strengthens emotionality and care in family. You create atmosphere of love. Your roots are connected to intuition and home, giving deep security.',
    Leo: '4th House in Leo makes your home bright and creative. You value self-expression in family. Your roots are connected to pride and generosity, creating inspiring atmosphere.',
    Virgo:
      '4th House in Virgo adds practicality and order to home. You value systematic approach to family. Your roots are connected to service and health, creating stability.',
    Libra:
      '4th House in Libra makes your home harmonious and aesthetic. You value partnership in family. Your roots are connected to balance and beauty, creating peaceful atmosphere.',
    Scorpio:
      '4th House in Scorpio adds depth and intensity to family. You value transformation. Your roots are connected to strength and depth, helping in crises.',
    Sagittarius:
      '4th House in Sagittarius makes your home optimistic and open. You value travel. Your roots are connected to freedom and philosophy, expanding horizons.',
    Capricorn:
      '4th House in Capricorn adds responsibility and ambition to home. You build strong foundation. Your roots are connected to discipline and structure, giving stability.',
    Aquarius:
      '4th House in Aquarius makes your home innovative and independent. You value progress. Your roots are connected to community and originality, helping in changes.',
    Pisces:
      '4th House in Pisces adds compassion and imagination to home. You create atmosphere of love. Your roots are connected to empathy and spirituality, giving deep connection.',
  },
  5: {
    Aries:
      '5th House in Aries makes your creativity active and initiative. You express yourself through action. Your children and romance are connected to energy and boldness, bringing joy.',
    Taurus:
      '5th House in Taurus adds practicality and sensuality to creativity. You enjoy comfort. Your children and romance are connected to stability and pleasures.',
    Gemini:
      '5th House in Gemini makes your creativity flexible and communicative. You love diversity. Your children and romance are connected to learning and communication.',
    Cancer:
      '5th House in Cancer adds care and emotionality to creativity. You love caring. Your children and romance are connected to family and security.',
    Leo: '5th House in Leo strengthens creativity and self-expression. You love being in center. Your children and romance are connected to pride and generosity.',
    Virgo:
      '5th House in Virgo adds practicality and attention to details to creativity. You love serving. Your children and romance are connected to care and health.',
    Libra:
      '5th House in Libra makes your creativity harmonious and aesthetic. You love beauty. Your children and romance are connected to partnership and balance.',
    Scorpio:
      '5th House in Scorpio adds depth and intensity to creativity. You love transformation. Your children and romance are connected to strength and depth.',
    Sagittarius:
      '5th House in Sagittarius makes your creativity optimistic and broad. You love freedom. Your children and romance are connected to travel and philosophy.',
    Capricorn:
      '5th House in Capricorn adds responsibility and ambition to creativity. You build future. Your children and romance are connected to discipline and goals.',
    Aquarius:
      '5th House in Aquarius makes your creativity innovative and independent. You love progress. Your children and romance are connected to community and originality.',
    Pisces:
      '5th House in Pisces adds imagination and compassion to creativity. You love dreaming. Your children and romance are connected to empathy and spirituality.',
  },
  6: {
    Aries:
      '6th House in Aries makes your service active and initiative. You act decisively. Your health and work are connected to energy and leadership, helping in overcoming.',
    Taurus:
      '6th House in Taurus adds practicality and stability to service. You value comfort. Your health and work are connected to sensual pleasures and reliability.',
    Gemini:
      '6th House in Gemini makes your service flexible and communicative. You love diversity. Your health and work are connected to learning and communication.',
    Cancer:
      '6th House in Cancer adds care and emotionality to service. You love caring. Your health and work are connected to family and security.',
    Leo: '6th House in Leo makes your service bright and creative. You love inspiring. Your health and work are connected to self-expression and pride.',
    Virgo:
      '6th House in Virgo strengthens attention to details and system in service. You are master of analysis. Your health and work are connected to perfection and care.',
    Libra:
      '6th House in Libra makes your service harmonious and aesthetic. You love balance. Your health and work are connected to partnership and beauty.',
    Scorpio:
      '6th House in Scorpio adds depth and intensity to service. You love transformation. Your health and work are connected to strength and depth.',
    Sagittarius:
      '6th House in Sagittarius makes your service optimistic and broad. You love freedom. Your health and work are connected to travel and philosophy.',
    Capricorn:
      '6th House in Capricorn adds responsibility and ambition to service. You build career. Your health and work are connected to discipline and goals.',
    Aquarius:
      '6th House in Aquarius makes your service innovative and independent. You love progress. Your health and work are connected to community and originality.',
    Pisces:
      '6th House in Pisces adds compassion and imagination to service. You love helping. Your health and work are connected to empathy and spirituality.',
  },
  7: {
    Aries:
      '7th House in Aries makes your partnerships active and initiative. You seek equal partner. Your relationships are connected to energy and independence, bringing dynamics.',
    Taurus:
      '7th House in Taurus adds stability and practicality to partnerships. You value reliability. Your relationships are connected to comfort and sensual pleasures.',
    Gemini:
      '7th House in Gemini makes partnerships flexible and communicative. You love communication. Your relationships are connected to learning and diversity.',
    Cancer:
      '7th House in Cancer adds care and emotionality to partnerships. You seek care. Your relationships are connected to family and security.',
    Leo: '7th House in Leo makes partnerships bright and creative. You love attention. Your relationships are connected to self-expression and pride.',
    Virgo:
      '7th House in Virgo adds practicality and attention to details to partnerships. You value service. Your relationships are connected to care and health.',
    Libra:
      '7th House in Libra strengthens harmony and aesthetics in partnerships. You are master of diplomacy. Your relationships are connected to balance and beauty.',
    Scorpio:
      '7th House in Scorpio adds depth and intensity to partnerships. You seek transformation. Your relationships are connected to strength and depth.',
    Sagittarius:
      '7th House in Sagittarius makes partnerships optimistic and broad. You love freedom. Your relationships are connected to travel and philosophy.',
    Capricorn:
      '7th House in Capricorn adds responsibility and ambition to partnerships. You build future. Your relationships are connected to discipline and goals.',
    Aquarius:
      '7th House in Aquarius makes partnerships innovative and independent. You value equality. Your relationships are connected to community and progress.',
    Pisces:
      '7th House in Pisces adds compassion and imagination to partnerships. You seek soul. Your relationships are connected to empathy and spirituality.',
  },
  8: {
    Aries:
      '8th House in Aries makes transformation active and initiative. You act boldly. Your crises and shared resources are connected to energy and independence.',
    Taurus:
      '8th House in Taurus adds practicality and stability to transformation. You value security. Your crises and resources are connected to comfort and reliability.',
    Gemini:
      '8th House in Gemini makes transformation flexible and communicative. You adapt. Your crises and resources are connected to learning and diversity.',
    Cancer:
      '8th House in Cancer adds emotionality and care to transformation. You feel deeply. Your crises and resources are connected to family and security.',
    Leo: '8th House in Leo makes transformation bright and creative. You express strength. Your crises and resources are connected to self-expression and pride.',
    Virgo:
      '8th House in Virgo adds practicality and attention to details to transformation. You analyze. Your crises and resources are connected to care and health.',
    Libra:
      '8th House in Virgo makes transformation harmonious and aesthetic. You seek balance. Your crises and resources are connected to partnership and beauty.',
    Scorpio:
      '8th House in Scorpio strengthens depth and intensity of transformation. You are crisis master. Your crises and resources are connected to strength and depth.',
    Sagittarius:
      '8th House in Sagittarius makes transformation optimistic and broad. You seek meaning. Your crises and resources are connected to travel and philosophy.',
    Capricorn:
      '8th House in Capricorn adds responsibility and ambition to transformation. You rebuild. Your crises and resources are connected to discipline and goals.',
    Aquarius:
      '8th House in Aquarius makes transformation innovative and independent. You change system. Your crises and resources are connected to community and progress.',
    Pisces:
      '8th House in Pisces adds compassion and imagination to transformation. You dissolve. Your crises and resources are connected to empathy and spirituality.',
  },
  9: {
    Aries:
      '9th House in Aries makes your worldview active and initiative. You act boldly. Your travels and philosophy are connected to energy and independence.',
    Taurus:
      '9th House in Taurus adds practicality and stability to worldview. You value comfort. Your travels and philosophy are connected to reliability and pleasures.',
    Gemini:
      '9th House in Gemini makes worldview flexible and communicative. You love learning. Your travels and philosophy are connected to diversity and communication.',
    Cancer:
      '9th House in Cancer adds care and emotionality to worldview. You feel connection. Your travels and philosophy are connected to family and security.',
    Leo: '9th House in Leo makes worldview bright and creative. You inspire. Your travels and philosophy are connected to self-expression and pride.',
    Virgo:
      '9th House in Virgo adds practicality and attention to details to worldview. You analyze. Your travels and philosophy are connected to service and health.',
    Libra:
      '9th House in Virgo makes worldview harmonious and aesthetic. You seek balance. Your travels and philosophy are connected to beauty and partnership.',
    Scorpio:
      '9th House in Scorpio adds depth and intensity to worldview. You penetrate essence. Your travels and philosophy are connected to strength and transformation.',
    Sagittarius:
      '9th House in Sagittarius strengthens optimism and breadth of worldview. You are seeker. Your travels and philosophy are connected to freedom and meaning.',
    Capricorn:
      '9th House in Capricorn adds responsibility and ambition to worldview. You build future. Your travels and philosophy are connected to discipline and goals.',
    Aquarius:
      '9th House in Aquarius makes worldview innovative and independent. You change world. Your travels and philosophy are connected to progress and community.',
    Pisces:
      '9th House in Pisces adds imagination and compassion to worldview. You connect. Your travels and philosophy are connected to empathy and unity.',
  },
  10: {
    Aries:
      '10th House in Aries makes your career active and initiative. You are leader. Your public life is connected to energy and independence, helping in achievements.',
    Taurus:
      '10th House in Taurus adds practicality and stability to career. You are reliable. Your public life is connected to comfort and material values.',
    Gemini:
      '10th House in Gemini makes career flexible and communicative. You are adaptive. Your public life is connected to learning and diverse contacts.',
    Cancer:
      '10th House in Cancer adds care and emotionality to career. You care. Your public life is connected to family and security.',
    Leo: '10th House in Leo makes career bright and creative. You inspire. Your public life is connected to self-expression and recognition.',
    Virgo:
      '10th House in Virgo adds practicality and attention to details to career. You serve. Your public life is connected to care and efficiency.',
    Libra:
      '10th House in Libra makes career harmonious and aesthetic. You are diplomat. Your public life is connected to partnership and beauty.',
    Scorpio:
      '10th House in Scorpio adds depth and intensity to career. You transform. Your public life is connected to strength and depth.',
    Sagittarius:
      '10th House in Sagittarius makes career optimistic and broad. You expand. Your public life is connected to travel and philosophy.',
    Capricorn:
      '10th House in Capricorn strengthens responsibility and ambition in career. You build. Your public life is connected to discipline and achievements.',
    Aquarius:
      '10th House in Aquarius makes career innovative and independent. You change. Your public life is connected to progress and community.',
    Pisces:
      '10th House in Pisces adds compassion and imagination to career. You help. Your public life is connected to empathy and spirituality.',
  },
  11: {
    Aries:
      '11th House in Aries makes your goals active and initiative. You act boldly. Your friends and aspirations are connected to energy and independence.',
    Taurus:
      '11th House in Taurus adds practicality and stability to goals. You are reliable. Your friends and aspirations are connected to comfort and material values.',
    Gemini:
      '11th House in Gemini makes goals flexible and communicative. You are adaptive. Your friends and aspirations are connected to learning and diversity.',
    Cancer:
      '11th House in Cancer adds care and emotionality to goals. You care. Your friends and aspirations are connected to family and security.',
    Leo: '11th House in Leo makes goals bright and creative. You inspire. Your friends and aspirations are connected to self-expression and recognition.',
    Virgo:
      '11th House in Virgo adds practicality and attention to details to goals. You serve. Your friends and aspirations are connected to care and efficiency.',
    Libra:
      '11th House in Virgo makes goals harmonious and aesthetic. You are diplomatic. Your friends and aspirations are connected to partnership and beauty.',
    Scorpio:
      '11th House in Scorpio adds depth and intensity to goals. You transform. Your friends and aspirations are connected to strength and depth.',
    Sagittarius:
      '11th House in Sagittarius makes goals optimistic and broad. You expand. Your friends and aspirations are connected to travel and philosophy.',
    Capricorn:
      '11th House in Capricorn adds responsibility and ambition to goals. You build. Your friends and aspirations are connected to discipline and achievements.',
    Aquarius:
      '11th House in Aquarius strengthens innovation and independence in goals. You change. Your friends and aspirations are connected to progress and community.',
    Pisces:
      '11th House in Pisces adds compassion and imagination to goals. You help. Your friends and aspirations are connected to empathy and spirituality.',
  },
  12: {
    Aries:
      '12th House in Aries makes your subconscious active and initiative. You act intuitively. Your secrets and spirituality are connected to energy and independence.',
    Taurus:
      '12th House in Taurus adds practicality and stability to subconscious. You are grounded. Your secrets and spirituality are connected to comfort and material values.',
    Gemini:
      '12th House in Gemini makes subconscious flexible and communicative. You are adaptive. Your secrets and spirituality are connected to learning and diversity.',
    Cancer:
      '12th House in Cancer adds care and emotionality to subconscious. You feel. Your secrets and spirituality are connected to family and security.',
    Leo: '12th House in Leo makes subconscious bright and creative. You express. Your secrets and spirituality are connected to self-expression and pride.',
    Virgo:
      '12th House in Virgo adds practicality and attention to details to subconscious. You analyze. Your secrets and spirituality are connected to care and health.',
    Libra:
      '12th House in Virgo makes subconscious harmonious and aesthetic. You balance. Your secrets and spirituality are connected to partnership and beauty.',
    Scorpio:
      '12th House in Scorpio adds depth and intensity to subconscious. You transform. Your secrets and spirituality are connected to strength and depth.',
    Sagittarius:
      '12th House in Sagittarius makes subconscious optimistic and broad. You expand. Your secrets and spirituality are connected to travel and philosophy.',
    Capricorn:
      '12th House in Capricorn adds responsibility and ambition to subconscious. You build. Your secrets and spirituality are connected to discipline and goals.',
    Aquarius:
      '12th House in Aquarius makes subconscious innovative and independent. You change. Your secrets and spirituality are connected to progress and community.',
    Pisces:
      '12th House in Pisces strengthens imagination and compassion in subconscious. You connect. Your secrets and spirituality are connected to empathy and unity.',
  },
};

export const ASCENDANT_EN: Partial<Record<Sign, string>> = {
  Aries: 'Ascendant in Aries appears bold, direct, and energetic.',
  Taurus: 'Ascendant in Taurus appears steady, practical, and grounded.',
  Gemini: 'Ascendant in Gemini appears lively, communicative, and curious.',
  Cancer: 'Ascendant in Cancer appears caring, sensitive, and intuitive.',
  Leo: 'Ascendant in Leo appears bright, confident, and generous.',
  Virgo: 'Ascendant in Virgo appears neat, attentive, and practical.',
  Libra: 'Ascendant in Libra appears balanced, aesthetic, and diplomatic.',
  Scorpio: 'Ascendant in Scorpio appears intense, deep, and magnetic.',
  Sagittarius: 'Ascendant in Sagittarius appears open, direct, and optimistic.',
  Capricorn:
    'Ascendant in Capricorn appears responsible, reserved, and ambitious.',
  Aquarius:
    'Ascendant in Aquarius appears original, independent, and friendly.',
  Pisces: 'Ascendant in Pisces appears gentle, inspired, and empathetic.',
};

export const HOUSES_THEMES_EN: Record<number, string> = {
  1: 'personality and self-expression',
  2: 'finances and values',
  3: 'communication and learning',
  4: 'home and family',
  5: 'creativity and romance',
  6: 'health and service',
  7: 'partnership and marriage',
  8: 'transformation and shared resources',
  9: 'philosophy and journeys',
  10: 'career and public standing',
  11: 'friendship and aspirations',
  12: 'subconscious and spirituality',
};

export const HOUSES_AREAS_EN: Record<number, string> = {
  1: 'Personality',
  2: 'Finances',
  3: 'Communication',
  4: 'Home and Family',
  5: 'Creativity',
  6: 'Health',
  7: 'Partnership',
  8: 'Transformation',
  9: 'Journeys',
  10: 'Career',
  11: 'Friendship',
  12: 'Spirituality',
};

export const GENERAL_TEMPLATES_EN: Record<
  PeriodFrame,
  Record<Tone, string[]>
> = {
  Сегодня: {
    positive: [
      'Today is supportive: planetary energy opens favorable opportunities.',
    ],
    neutral: [
      'Today is balanced: keep a steady pace and follow your intuition.',
    ],
    challenging: [
      'Today requires patience: treat obstacles as growth lessons.',
    ],
  },
  Завтра: {
    positive: ['Tomorrow brings inspiration and positive movement.'],
    neutral: ['Tomorrow is steady: plan and prepare with care.'],
    challenging: ['Tomorrow may be testing: proceed mindfully.'],
  },
  'На этой неделе': {
    positive: ['This week supports progress and meaningful steps.'],
    neutral: ['This week is stable: focus on priorities.'],
    challenging: ['This week may challenge your balance: be patient.'],
  },
  'В этом месяце': {
    positive: ['This month favors long-term projects and grounded growth.'],
    neutral: ['This month moves steadily: refine routines.'],
    challenging: ['This month requires resilience and careful pacing.'],
  },
};

export const LOVE_PERIOD_PHRASES_EN: Record<
  PeriodFrame,
  { positive: string[]; neutral: string[]; negative: string[] }
> = {
  Сегодня: {
    positive: [
      'creates a romantic atmosphere',
      'strengthens mutual attraction',
      'invites tenderness and care',
      'aligns you for warm dialogue',
    ],
    neutral: [
      'influences your mood',
      'encourages calm exchanges',
      'invites honest conversation',
      'reminds you to be attentive',
    ],
    negative: [
      'creates tension',
      'can heighten sensitivity',
      'demands restraint in reactions',
      'tests the harmony of bonds',
    ],
  },
  Завтра: {
    positive: [
      'promises pleasant encounters',
      'favors reconciliations and confessions',
      'boosts charm and mutual interest',
      'supports sincere connection',
    ],
    neutral: [
      'facilitates communication',
      'helps you hear each other',
      'promotes gentle compromises',
      'invites quiet closeness',
    ],
    negative: [
      'may trigger misunderstandings',
      'requires patience and tact',
      'reminds about personal boundaries',
      'can reveal unspoken expectations',
    ],
  },
  'На этой неделе': {
    positive: [
      'opens perspectives for relationships',
      'supports deepening trust',
      'encourages shared plans',
      'brings warm gestures of attention',
    ],
    neutral: [
      'maintains stability in a couple',
      'encourages balance of roles',
      'calls for moderation and care',
      'aligns you to a common rhythm',
    ],
    negative: [
      'demands work on the relationship',
      'raises questions of mutual support',
      'highlights misalignments',
      'tests agreements for resilience',
    ],
  },
  'В этом месяце': {
    positive: [
      'creates favorable conditions for love',
      'supports long-term harmony',
      'strengthens mutual understanding',
      'gives time for warm traditions',
    ],
    neutral: [
      'promotes relationship development',
      'sets a mature dialogue',
      'encourages joint decisions',
      'supports a steady rhythm',
    ],
    negative: [
      'calls for priority re-evaluation',
      'invites honesty and responsibility',
      'may require a pause for restoration',
      'suggests the need for boundaries',
    ],
  },
};

export const CAREER_PERIOD_ACTIONS_EN: Record<
  PeriodFrame,
  { jupiter: string[]; saturn: string[]; mars: string[]; neutral: string[] }
> = {
  Сегодня: {
    jupiter: ['today is favorable for', 'today opens opportunities for'],
    saturn: ['today requires', 'today is important to focus on'],
    mars: ['today brings energy for', 'today invites active push in'],
    neutral: ['today continue working on', 'today maintain stable pace in'],
  },
  Завтра: {
    jupiter: [
      'tomorrow opens possibilities for',
      'tomorrow is good to expand in',
    ],
    saturn: [
      'tomorrow requires planning for',
      'tomorrow organize and systematize',
    ],
    mars: ['tomorrow brings impulse to', 'tomorrow you can speed up'],
    neutral: ['tomorrow focus on', 'tomorrow continue refining'],
  },
  'На этой неделе': {
    jupiter: ['this week favors growth in', 'this week supports scaling of'],
    saturn: ['this week requires', 'this week is for structuring'],
    mars: ['this week adds drive for', 'this week enables a breakthrough in'],
    neutral: [
      'this week suits steady work on',
      'this week consolidates results in',
    ],
  },
  'В этом месяце': {
    jupiter: [
      'this month opens growth in',
      'this month supports strategic initiatives in',
    ],
    saturn: ['this month calls for', 'this month is for discipline in'],
    mars: [
      'this month adds energy for progress in',
      'this month strengthens momentum in',
    ],
    neutral: [
      'this month favors development of',
      'this month improves processes in',
    ],
  },
};

export const ADVICE_POOLS_EN: Record<PeriodFrame, string[]> = {
  Сегодня: [
    'Today trust your intuition and take the first step.',
    'Today stay open to new experiences and surprises.',
    'Today practice gratitude for what you have.',
  ],
  Завтра: [
    'Tomorrow start with clear intentions and a positive tone.',
    'Tomorrow be flexible and ready for opportunities.',
    'Tomorrow spend time planning important tasks.',
  ],
  'На этой неделе': [
    'This week balance work and rest.',
    'This week strengthen your strengths and talents.',
    'This week foster meaningful relationships.',
  ],
  'В этом месяце': [
    'This month focus on long-term goals with patience.',
    'This month invest in learning and growth.',
    'This month build a solid foundation for future success.',
  ],
};

export const SIGN_COLORS_EN: Record<Sign, string[]> = {
  Aries: ['Red', 'Orange'],
  Taurus: ['Green', 'Pink'],
  Gemini: ['Yellow', 'Light Blue'],
  Cancer: ['Silver', 'White'],
  Leo: ['Gold', 'Orange'],
  Virgo: ['Brown', 'Beige'],
  Libra: ['Pink', 'Light Blue'],
  Scorpio: ['Burgundy', 'Black'],
  Sagittarius: ['Purple', 'Blue'],
  Capricorn: ['Gray', 'Green'],
  Aquarius: ['Sky Blue', 'Silver'],
  Pisces: ['Turquoise', 'Lavender'],
};

export const ASPECT_PAIR_TEMPLATES_EN: Partial<
  Record<
    AspectType,
    Partial<Record<PlanetKey, Partial<Record<PlanetKey, string>>>>
  >
> = {
  conjunction: {
    sun: {
      moon: 'Sun in conjunction with Moon unifies will and emotion—good for initiatives.',
    },
    venus: {
      mars: 'Venus conjunct Mars excites passion and creative momentum.',
    },
    jupiter: {
      pluto: 'Jupiter conjunct Pluto transforms growth with deep power.',
    },
  },
  trine: {
    mercury: {
      jupiter:
        'Mercury trine Jupiter brings clarity, learning, and opportunity.',
    },
    sun: {
      moon: 'Sun trine Moon supports emotional flow and clear intentions.',
    },
    venus: {
      jupiter: 'Venus trine Jupiter favors relationships, art, and generosity.',
    },
  },
  square: {
    mars: {
      saturn:
        'Mars square Saturn demands patience, discipline, and structured action.',
    },
    moon: {
      mars: 'Moon square Mars tests emotional control—mind impulses.',
    },
    saturn: {
      uranus:
        'Saturn square Uranus clashes stability with change—balance required.',
    },
  },
  opposition: {
    moon: {
      neptune:
        'Moon opposite Neptune blurs feelings—seek grounding and clarity.',
    },
    sun: {
      saturn: 'Sun opposite Saturn emphasizes responsibility and boundaries.',
    },
  },
  sextile: {
    mercury: {
      venus:
        'Mercury sextile Venus smooths conversations and creative collaboration.',
    },
    neptune: {
      pluto: 'Neptune sextile Pluto deepens insight and subtle transformation.',
    },
  },
};

export const ASCENDANT_META_EN: Partial<
  Record<
    Sign,
    {
      keywords: string[];
      strengths: string[];
      challenges: string[];
    }
  >
> = {
  Aries: {
    keywords: ['initiative', 'direct', 'energetic'],
    strengths: ['Courage', 'Quick response', 'Leadership'],
    challenges: ['Impulsiveness', 'Bluntness', 'Impatience'],
  },
  Taurus: {
    keywords: ['steady', 'practical', 'reliable'],
    strengths: ['Endurance', 'Consistency', 'Sensuality'],
    challenges: ['Stubbornness', 'Routine preference', 'Slowness'],
  },
  Gemini: {
    keywords: ['communicative', 'flexible', 'curious'],
    strengths: ['Ease of contact', 'Quick mind', 'Adaptability'],
    challenges: ['Superficiality', 'Attention scatter', 'Inconstancy'],
  },
  Cancer: {
    keywords: ['sensitive', 'caring', 'intuitive'],
    strengths: ['Empathy', 'Care', 'Home comfort'],
    challenges: ['Vulnerability', 'Closure', 'Mood swings'],
  },
  Leo: {
    keywords: ['bright', 'generous', 'confident'],
    strengths: ['Charisma', 'Creativity', 'Magnanimity'],
    challenges: ['Dramatics', 'Pride', 'Need for recognition'],
  },
  Virgo: {
    keywords: ['neat', 'attentive', 'practical'],
    strengths: ['Systematicity', 'Service', 'Analyticity'],
    challenges: ['Criticism', 'Anxiety', 'Perfectionism'],
  },
  Libra: {
    keywords: ['diplomatic', 'aesthetic', 'balanced'],
    strengths: ['Tact', 'Agreement skills', 'Sense of measure'],
    challenges: [
      'Indecision',
      "Dependence on others' opinions",
      'Conflict avoidance',
    ],
  },
  Scorpio: {
    keywords: ['deep', 'magnetic', 'decisive'],
    strengths: ['Insight', 'Willpower', 'Resilience'],
    challenges: ['Suspicion', 'Jealousy', 'Bluntness'],
  },
  Sagittarius: {
    keywords: ['optimistic', 'direct', 'philosophical'],
    strengths: ['Broad outlook', 'Enthusiasm', 'Honesty'],
    challenges: ['Impulsiveness', 'Discipline lack', 'Superficiality'],
  },
  Capricorn: {
    keywords: ['responsible', 'ambitious', 'practical'],
    strengths: ['Discipline', 'Reliability', 'Strategic thinking'],
    challenges: ['Rigidity', 'Isolation', 'Overwork'],
  },
  Aquarius: {
    keywords: ['original', 'independent', 'humane'],
    strengths: ['Innovation', 'Friendliness', 'Objectivity'],
    challenges: ['Detachment', 'Stubbornness', 'Impracticality'],
  },
  Pisces: {
    keywords: ['dreamy', 'empathetic', 'creative'],
    strengths: ['Intuition', 'Empathy', 'Imagination'],
    challenges: ['Distraction', 'Self-sacrifice', 'Indecision'],
  },
};

// Extended details dictionaries (EN)
export const PLANET_IN_SIGN_EXT_EN: Partial<
  Record<PlanetKey, Partial<Record<Sign, string[]>>>
> = {
  sun: {
    Aries: [
      '• Strong impulse for leadership and decisive action.',
      '• High need to move fast and directly.',
      '• Fuels motivation; great for starting initiatives.',
      '• Practice patience and planning to sustain results.',
      '• Energy rises in competitive contexts.',
      '• Self-esteem grows through personal wins.',
      '• Fast decisions are a plus; impulsiveness is a risk.',
      '• Physical activity helps discharge tension.',
      '• Authority is built by example.',
      '• Partnerships need respect for mutual freedom.',
      '• Practice: one bold step toward a key goal daily.',
      '• Resource: ignite work that truly excites you.',
      '• Balance: momentum vs stability.',
      '• Skill: constructive dialogue over pressure.',
      '• Outcome: leadership with awareness and responsibility.',
    ],
    Taurus: [
      '• Emphasis on stability, reliability, practical value.',
      '• Progress through steady routines and consistency.',
      '• Comfort and quality fuel motivation.',
      '• Strength in finishing what was started.',
      '• Risk: inertia and clinging to the comfort zone.',
      '• Asset: patience and loyalty to the course.',
      '• Financial discipline strengthens security.',
      '• Body signals are important: heed fatigue and satiety.',
      '• Sensory joy: taste, touch, and beauty matter.',
      '• Partnerships valued for dependability and calm.',
      '• Practice: small daily improvements (Kaizen).',
      '• Resource: nature, hands-on processes.',
      '• Skill: flexibility in change.',
      '• Reminder: do not confuse stability with stagnation.',
      '• Outcome: grounded growth with solid footing.',
    ],
    Gemini: [
      '• Versatile identity across many roles',
      '• Curiosity fuels learning',
      '• Communication is core strength',
      '• Risk: scattered focus',
      '• Skill: depth over breadth',
      '• Outcome: intelligent expression',
    ],
    Cancer: [
      '• Identity rooted in emotional security',
      '• Intuition guides decisions',
      '• Nurturing others feels natural',
      '• Risk: over-attachment',
      '• Skill: healthy boundaries',
      '• Outcome: emotional wisdom',
    ],
    Leo: [
      '• Creative self-expression central',
      '• Leadership through authenticity',
      '• Generosity of spirit',
      '• Risk: need for constant validation',
      '• Skill: humility',
      '• Outcome: radiant confidence',
    ],
    Virgo: [
      '• Practical service brings meaning',
      '• Analytical precision valued',
      '• Health and improvement focus',
      '• Risk: perfectionism',
      '• Skill: acceptance',
      '• Outcome: useful mastery',
    ],
    Libra: [
      '• Identity through relationships',
      '• Balance and harmony sought',
      '• Aesthetic appreciation strong',
      '• Risk: losing self in others',
      '• Skill: self-assertion',
      '• Outcome: elegant partnership',
    ],
    Scorpio: [
      '• Intensity and depth define',
      '• Transformation is constant',
      '• Emotional power immense',
      '• Risk: control issues',
      '• Skill: vulnerability',
      '• Outcome: profound authenticity',
    ],
    Sagittarius: [
      '• Philosophy and adventure drive',
      '• Truth-seeking essential',
      '• Optimism naturally present',
      '• Risk: overextension',
      '• Skill: grounding',
      '• Outcome: wise inspiration',
    ],
    Capricorn: [
      '• Achievement through discipline',
      '• Long-term goals matter',
      '• Authority earned',
      '• Risk: coldness',
      '• Skill: warmth',
      '• Outcome: mature leadership',
    ],
    Aquarius: [
      '• Unique individuality celebrated',
      '• Innovation excites',
      '• Collective vision held',
      '• Risk: emotional detachment',
      '• Skill: intimacy',
      '• Outcome: revolutionary insight',
    ],
    Pisces: [
      '• Spiritual sensitivity profound',
      '• Compassion boundless',
      '• Artistic expression natural',
      '• Risk: escapism',
      '• Skill: boundaries',
      '• Outcome: transcendent wisdom',
    ],
  },
  moon: {
    Aries: [
      '• Emotions flare up quickly and fade soon after.',
      '• Honest, direct feeling exchange is needed.',
      '• Movement and exercise reduce stress.',
      '• Triggers: delays, blocked initiative.',
      '• Skill: a brief pause before reacting.',
      '• Support: short goals and quick wins.',
      '• Respect independence needs of loved ones.',
      '• Energy is often higher in the morning.',
      '• Practice: box-breath 4–4–4–4 under pressure.',
      '• Outcome: emotional courage without aggression.',
    ],
    Taurus: [
      '• Emotional steadiness and need for comfort.',
      '• Rituals and predictability reduce stress.',
      '• Body-based practices ground the mood.',
      '• Sensitivity to texture, scent, touch.',
      '• Support: good food and a calm pace.',
      '• Risk: looping in familiar safe zones.',
      '• Skill: gently trying new experiences.',
      '• Relationships valued for loyalty.',
      '• Practice: nightly grounding rituals.',
      '• Outcome: stability as a base for openness.',
    ],
    Gemini: [
      '• Emotional processing through talking',
      '• Mood shifts with mental stimulation',
      '• Curiosity about feelings',
      '• Risk: intellectualizing emotions',
      '• Skill: feeling without analyzing',
      '• Outcome: emotional intelligence',
    ],
    Cancer: [
      '• Deep emotional sensitivity',
      '• Intuition highly attuned',
      '• Nurturing instinct strong',
      '• Risk: emotional overwhelm',
      '• Skill: self-care boundaries',
      '• Outcome: emotional mastery',
    ],
    Leo: [
      '• Emotions expressed dramatically',
      '• Need for emotional recognition',
      '• Warmth and generosity natural',
      '• Risk: ego in feelings',
      '• Skill: emotional humility',
      '• Outcome: radiant emotional authenticity',
    ],
    Virgo: [
      '• Emotions analyzed and organized',
      '• Service eases emotional stress',
      '• Perfectionism in self-care',
      '• Risk: over-criticism of feelings',
      '• Skill: accepting imperfect emotions',
      '• Outcome: practical emotional wisdom',
    ],
    Libra: [
      '• Emotions balanced through relationships',
      '• Harmony sought in feelings',
      '• Discomfort with conflict',
      '• Risk: suppressing true emotions',
      '• Skill: emotional honesty',
      '• Outcome: balanced emotional expression',
    ],
    Scorpio: [
      '• Emotions intensely felt',
      '• Deep transformation through feeling',
      '• Loyalty in emotional bonds',
      '• Risk: emotional manipulation',
      '• Skill: emotional vulnerability',
      '• Outcome: profound emotional depth',
    ],
    Sagittarius: [
      '• Emotions optimistic and expansive',
      '• Philosophy helps process feelings',
      '• Freedom in emotional expression',
      '• Risk: avoiding deep emotions',
      '• Skill: emotional presence',
      '• Outcome: inspired emotional wisdom',
    ],
    Capricorn: [
      '• Emotions controlled and structured',
      '• Responsibility in emotional expression',
      '• Time helps process feelings',
      '• Risk: emotional coldness',
      '• Skill: emotional warmth',
      '• Outcome: mature emotional strength',
    ],
    Aquarius: [
      '• Emotions detached and analyzed',
      '• Unique emotional expression',
      '• Collective feelings matter',
      '• Risk: emotional disconnection',
      '• Skill: personal emotional intimacy',
      '• Outcome: innovative emotional awareness',
    ],
    Pisces: [
      '• Emotions boundless and mystical',
      '• Empathy without limits',
      '• Artistic emotional expression',
      '• Risk: emotional overwhelm',
      '• Skill: emotional boundaries',
      '• Outcome: transcendent emotional wisdom',
    ],
  },
  mercury: {
    Aries: [
      '• Quick thinking',
      '• Direct communication',
      '• Instant decisions',
      '• Debate as process',
      '• Risk: speaking before thinking',
      '• Brevity valued',
      '• Active learning',
      '• Practice: pause',
      '• Messages without filters',
      '• Sporty mind',
      '• Outcome: bold communication',
    ],
    Taurus: [
      '• Deliberate thinking',
      '• Practical communication',
      '• Thoughtful decisions',
      '• Words have value',
      '• Risk: stubbornness',
      '• Sensory learning',
      '• Calm voice',
      '• Practice: openness',
      '• Steady concentration',
      '• Strong memory',
      '• Outcome: reliable communication',
    ],
    Gemini: [
      '• Flexible mind',
      '• Versatile communication',
      '• Insatiable curiosity',
      '• Connecting ideas',
      '• Risk: scattered attention',
      '• Social learning',
      '• Fluent expression',
      '• Practice: depth',
      '• Fast processing',
      '• Clever humor',
      '• Outcome: vibrant communication',
    ],
    Cancer: [
      '• Intuitive thinking',
      '• Empathic communication',
      '• Emotional memory',
      '• Protective words',
      '• Risk: subjectivity',
      '• Safe learning',
      '• Sincere voice',
      '• Practice: objectivity',
      '• Feelings inform',
      '• Internal writing',
      '• Outcome: nurturing communication',
    ],
    Leo: [
      '• Creative thinking',
      '• Expressive communication',
      '• Confident ideas',
      '• Personal narrative',
      '• Risk: ego',
      '• Natural oratory',
      '• Generous knowledge',
      '• Practice: listening',
      '• Memorable presentations',
      '• Stories captivate',
      '• Outcome: radiant expression',
    ],
    Virgo: [
      '• Analytical thinking',
      '• Detailed communication',
      '• Keen observation',
      '• Information organization',
      '• Risk: criticism',
      '• Methodical learning',
      '• Breaking down complexity',
      '• Practice: accepting imperfection',
      '• Practical solutions',
      '• Clear writing',
      '• Outcome: precise communication',
    ],
    Libra: [
      '• Balanced thinking',
      '• Harmonious communication',
      '• Multiple perspectives',
      '• Words build bridges',
      '• Risk: indecisiveness',
      '• Collaborative learning',
      '• Verbal mediation',
      '• Practice: firmness',
      '• Aesthetic writing',
      '• Balanced arguments',
      '• Outcome: elegant communication',
    ],
    Scorpio: [
      '• Deep thinking',
      '• Intense communication',
      '• Uncompromising truth',
      '• Words with power',
      '• Risk: manipulation',
      '• Thorough research',
      '• Perceiving unspoken',
      '• Practice: vulnerability',
      '• Profound writing',
      '• Silence speaks too',
      '• Outcome: magnetic communication',
    ],
    Sagittarius: [
      '• Expansive thinking',
      '• Optimistic communication',
      '• Big ideas',
      '• Truth without tact',
      '• Risk: exaggeration',
      '• Teaching calling',
      '• Humor in messaging',
      '• Practice: attention to detail',
      '• Inspiring words',
      '• Brutal honesty',
      '• Outcome: inspiring communication',
    ],
    Capricorn: [
      '• Strategic thinking',
      '• Professional communication',
      '• Targeted information',
      '• Measured words',
      '• Risk: coldness',
      '• Applied learning',
      '• Authority through competence',
      '• Practice: warmth',
      '• Time for processing',
      '• Concise writing',
      '• Outcome: mature expression',
    ],
    Aquarius: [
      '• Original thinking',
      '• Unique communication',
      '• Revolutionary ideas',
      '• Non-standard perspectives',
      '• Risk: detachment',
      '• Technology in expression',
      '• Accessible concepts',
      '• Practice: emotional connection',
      '• Innovation methods',
      '• Intellectual freedom',
      '• Outcome: revolutionary communication',
    ],
    Pisces: [
      '• Intuitive thinking',
      '• Poetic communication',
      '• Understanding through feeling',
      '• Words create atmosphere',
      '• Risk: vagueness',
      '• Artistic expression',
      '• Empathy in listening',
      '• Practice: concreteness',
      '• Metaphors illuminate',
      '• Mystical writing',
      '• Outcome: transcendent communication',
    ],
  },
  venus: {
    Aries: [
      '• Direct love',
      '• Instant attraction',
      '• Active conquest',
      '• Independence valued',
      '• Risk: impatience',
      '• Spontaneity',
      '• Practice: patience',
      '• Desire clearly expressed',
      '• Electrifying beginning',
      '• Outcome: bold love',
    ],
    Taurus: [
      '• Stable love',
      '• Tangible attraction',
      '• Physical pleasure',
      '• Loyalty essential',
      '• Risk: possessiveness',
      '• Slow building',
      '• Practice: openness',
      '• Comfort creates connection',
      '• Long-term commitment',
      '• Outcome: solid love',
    ],
    Gemini: [
      '• Intellectual love',
      '• Attraction to mind',
      '• Variety sustains',
      '• Communication as love',
      '• Risk: superficiality',
      '• Endless curiosity',
      '• Practice: depth',
      '• Words express',
      '• Friendship first',
      '• Outcome: lively love',
    ],
    Cancer: [
      '• Nurturing love',
      '• Attraction to security',
      '• Home as center',
      '• Mutual care',
      '• Risk: dependency',
      '• Deep intimacy',
      '• Practice: boundaries',
      '• Cooking as love',
      '• Family valued',
      '• Outcome: warm love',
    ],
    Leo: [
      '• Generous love',
      '• Attraction to confidence',
      '• Dramatic romance',
      '• Mutual admiration',
      '• Risk: need for attention',
      '• Generous expression',
      '• Practice: receiving',
      '• Grand gestures',
      '• Fun',
      '• Outcome: radiant love',
    ],
    Virgo: [
      '• Practical love',
      '• Attraction to competence',
      '• Service demonstrates',
      '• Mutual improvement',
      '• Risk: criticism',
      '• Details matter',
      '• Practice: acceptance',
      '• Help as language',
      '• Routines create closeness',
      '• Outcome: useful love',
    ],
    Libra: [
      '• Balanced love',
      '• Attraction to beauty',
      '• Partnership ideal',
      '• Equality',
      '• Risk: losing self',
      '• Aesthetics important',
      '• Practice: maintaining identity',
      '• Refined romance',
      '• Shared decisions',
      '• Outcome: elegant love',
    ],
    Scorpio: [
      '• Intense love',
      '• Magnetic attraction',
      '• Deep intimacy',
      '• Absolute loyalty',
      '• Risk: jealousy',
      '• Vulnerability as act',
      '• Practice: trust',
      '• Mystery',
      '• All or nothing',
      '• Outcome: powerful love',
    ],
    Sagittarius: [
      '• Free love',
      '• Attraction to independence',
      '• Shared exploration',
      '• Philosophy unites',
      '• Risk: avoiding commitment',
      '• Brutal honesty',
      '• Practice: presence',
      '• Humor enlivens',
      '• Freedom',
      '• Outcome: expansive love',
    ],
    Capricorn: [
      '• Mature love',
      '• Attraction to stability',
      '• Building future',
      '• Mutual respect',
      '• Risk: coldness',
      '• Time builds',
      '• Practice: tenderness',
      '• Shared goals',
      '• Loyalty proven',
      '• Outcome: solid love',
    ],
    Aquarius: [
      '• Unique love',
      '• Attraction to originality',
      '• Friendship base',
      '• Independence preserved',
      '• Risk: detachment',
      '• Freedom',
      '• Practice: emotional closeness',
      '• Innovation',
      '• Equality',
      '• Outcome: free love',
    ],
    Pisces: [
      '• Mystical love',
      '• Attraction to sensitivity',
      '• Emotional merging',
      '• Boundless empathy',
      '• Risk: losing boundaries',
      '• Romance nourishes',
      '• Practice: boundaries',
      '• Art connects',
      '• Unconditional love',
      '• Outcome: transcendent love',
    ],
  },
  mars: {
    Aries: [
      '• Direct action',
      '• Abundant energy',
      '• Competitive leadership',
      '• Risk: aggression',
      '• Courage',
      '• Practice: pause',
      '• Sports channel',
      '• Outcome: bold action',
    ],
    Taurus: [
      '• Steady action',
      '• Long-term energy',
      '• Persistence',
      '• Risk: inertia',
      '• Strategic patience',
      '• Practice: adaptability',
      '• Constant rhythm',
      '• Outcome: effective action',
    ],
    Gemini: [
      '• Multiple actions',
      '• Mental energy',
      '• Dexterity',
      '• Risk: dispersion',
      '• Adaptability',
      '• Practice: focus',
      '• Communication weapon',
      '• Outcome: versatile action',
    ],
    Cancer: [
      '• Protective action',
      '• Emotional energy',
      '• Tenacity',
      '• Risk: passive aggression',
      '• Intuition leads',
      '• Practice: assertiveness',
      '• Home defended',
      '• Outcome: cautious action',
    ],
    Leo: [
      '• Dramatic action',
      '• Creative energy',
      '• Charismatic leadership',
      '• Risk: ego',
      '• Generosity',
      '• Practice: humility',
      '• Courage',
      '• Outcome: radiant action',
    ],
    Virgo: [
      '• Precise action',
      '• Service energy',
      '• Analysis before movement',
      '• Risk: paralysis',
      '• Improvement',
      '• Practice: imperfect action',
      '• Detailed work',
      '• Outcome: useful action',
    ],
    Libra: [
      '• Balanced action',
      '• Collaborative energy',
      '• Thoughtful decision',
      '• Risk: indecisiveness',
      '• Partnership strengthens',
      '• Practice: action without consensus',
      '• Justice motivates',
      '• Outcome: elegant action',
    ],
    Scorpio: [
      '• Intense action',
      '• Transforming energy',
      '• Ruthless determination',
      '• Risk: revenge',
      '• Research before attack',
      '• Practice: forgiveness',
      '• Deep penetration',
      '• Outcome: transforming action',
    ],
    Sagittarius: [
      '• Expansive action',
      '• Adventurous energy',
      '• Optimism',
      '• Risk: overestimation',
      '• Philosophy leads',
      '• Practice: realism',
      '• Exploration',
      '• Outcome: inspiring action',
    ],
    Capricorn: [
      '• Strategic action',
      '• Achievement energy',
      '• Ambition',
      '• Risk: coldness',
      '• Authority earned',
      '• Practice: celebrating',
      '• Long-term goals',
      '• Outcome: mature action',
    ],
    Aquarius: [
      '• Innovative action',
      '• Collective energy',
      '• Independence',
      '• Risk: rebellion without cause',
      '• Originality',
      '• Practice: emotional connection',
      '• Technology tool',
      '• Outcome: revolutionary action',
    ],
    Pisces: [
      '• Flowing action',
      '• Spiritual energy',
      '• Compassion leads',
      '• Risk: dispersion',
      '• Sacrifice for greater',
      '• Practice: boundaries',
      '• Intuition',
      '• Outcome: transcendent action',
    ],
  },
  jupiter: {
    Aries: [
      '• Bold expansion',
      '• Optimism',
      '• Self-confidence',
      '• Risk: arrogance',
      '• Lucky beginnings',
      '• Outcome: rapid growth',
    ],
    Taurus: [
      '• Material expansion',
      '• Abundance',
      '• Faith in resources',
      '• Risk: excess',
      '• Lucky investments',
      '• Outcome: prosperity',
    ],
    Gemini: [
      '• Intellectual expansion',
      '• Communication opportunities',
      '• Faith in connections',
      '• Risk: dispersion',
      '• Wide network',
      '• Outcome: intellectual growth',
    ],
    Cancer: [
      '• Emotional expansion',
      '• Home abundance',
      '• Faith in intuition',
      '• Risk: overprotection',
      '• Family blessed',
      '• Outcome: emotional growth',
    ],
    Leo: [
      '• Creative expansion',
      '• Expression abundance',
      '• Faith in greatness',
      '• Risk: grandiosity',
      '• Generosity',
      '• Outcome: radiant growth',
    ],
    Virgo: [
      '• Expansion through service',
      '• Health abundance',
      '• Faith in improvement',
      '• Risk: perfectionism',
      '• Service gives opportunities',
      '• Outcome: useful growth',
    ],
    Libra: [
      '• Expansion through relationships',
      '• Partnership abundance',
      '• Faith in balance',
      '• Risk: dependency',
      '• Harmony',
      '• Outcome: harmonious growth',
    ],
    Scorpio: [
      '• Expansion through transformation',
      '• Depth abundance',
      '• Faith in power',
      '• Risk: intensity',
      '• Hidden resources',
      '• Outcome: deep growth',
    ],
    Sagittarius: [
      '• Natural expansion',
      '• Adventure abundance',
      '• Higher faith',
      '• Risk: excess',
      '• Lucky travels',
      '• Outcome: expansive growth',
    ],
    Capricorn: [
      '• Structured expansion',
      '• Abundance through work',
      '• Faith in work',
      '• Risk: ambition',
      '• Long-term success',
      '• Outcome: mature growth',
    ],
    Aquarius: [
      '• Expansion through innovation',
      '• Community abundance',
      '• Faith in future',
      '• Risk: rebellion',
      '• Friendship',
      '• Outcome: revolutionary growth',
    ],
    Pisces: [
      '• Spiritual expansion',
      '• Compassion abundance',
      '• Mystical faith',
      '• Risk: escapism',
      '• Service',
      '• Outcome: transcendent growth',
    ],
  },
  saturn: {
    Aries: [
      '• Discipline of impulse',
      '• Responsibility',
      '• Challenge: frustration',
      '• Lesson: think before acting',
      '• Outcome: responsible leadership',
    ],
    Taurus: [
      '• Discipline of resources',
      '• Financial responsibility',
      '• Challenge: fear of lack',
      '• Lesson: release attachments',
      '• Outcome: earned prosperity',
    ],
    Gemini: [
      '• Discipline of scattered',
      '• Communication responsibility',
      '• Challenge: mental blocks',
      '• Lesson: depth over breadth',
      '• Outcome: mature intellect',
    ],
    Cancer: [
      '• Emotional discipline',
      '• Care responsibility',
      '• Challenge: family wounds',
      '• Lesson: self-care',
      '• Outcome: emotional maturity',
    ],
    Leo: [
      '• Discipline of ego',
      '• Leadership responsibility',
      '• Challenge: lack of recognition',
      '• Lesson: humility',
      '• Outcome: mature leadership',
    ],
    Virgo: [
      '• Natural discipline',
      '• Perfection responsibility',
      '• Challenge: self-criticism',
      '• Lesson: accepting imperfection',
      '• Outcome: mastery',
    ],
    Libra: [
      '• Discipline of decisions',
      '• Relationship responsibility',
      '• Challenge: fear',
      '• Lesson: own identity',
      '• Outcome: mature relationships',
    ],
    Scorpio: [
      '• Discipline of intensity',
      '• Power responsibility',
      '• Challenge: crises',
      '• Lesson: release control',
      '• Outcome: transforming power',
    ],
    Sagittarius: [
      '• Discipline of optimism',
      '• Freedom responsibility',
      '• Challenge: limitation',
      '• Lesson: depth',
      '• Outcome: mature wisdom',
    ],
    Capricorn: [
      '• Extreme discipline',
      '• Enhanced responsibility',
      '• Challenge: early responsibility',
      '• Lesson: enjoyment',
      '• Outcome: structural mastery',
    ],
    Aquarius: [
      '• Discipline of originality',
      '• Innovation responsibility',
      '• Challenge: alienation',
      '• Lesson: connection',
      '• Outcome: mature innovation',
    ],
    Pisces: [
      '• Discipline of sensitivity',
      '• Compassion responsibility',
      '• Challenge: boundaries',
      '• Lesson: grounding',
      '• Outcome: mature compassion',
    ],
  },
  uranus: {
    Aries: [
      '• Radical innovation',
      '• Revolutionary leadership',
      '• Sudden changes',
      '• Total freedom',
    ],
    Taurus: [
      '• Value revolution',
      '• Material changes',
      '• Practical innovation',
    ],
    Gemini: [
      '• Mental genius',
      '• Innovative communication',
      '• Revolutionary ideas',
    ],
    Cancer: [
      '• Emotional revolution',
      '• Unconventional home',
      '• Care innovation',
    ],
    Leo: ['• Revolutionary creativity', '• Unique leadership'],
    Virgo: ['• Method innovation', '• Unique systems'],
    Libra: ['• Unique relationships', '• Partnership revolution'],
    Scorpio: ['• Radical transformation', '• Deep revolution'],
    Sagittarius: ['• Revolutionary philosophy', '• Extreme freedom'],
    Capricorn: ['• Structural revolution', '• Authority innovation'],
    Aquarius: ['• Natural revolution', '• Absolute freedom'],
    Pisces: ['• Spiritual revolution', '• Mystical innovation'],
  },
  neptune: {
    Aries: ['• Inspired action', '• Visionary leadership'],
    Taurus: ['• Matter spiritualization', '• Mystical values'],
    Gemini: ['• Inspired communication', '• Intuitive thinking'],
    Cancer: ['• Infinite empathy', '• Deep intuition'],
    Leo: ['• Divine creativity', '• Mystical self-expression'],
    Virgo: ['• Compassionate service', '• Spiritual healing'],
    Libra: ['• Idealized love', '• Spiritual beauty'],
    Scorpio: ['• Mystical transformation', '• Spiritual power'],
    Sagittarius: ['• Spiritual search', '• Mystical faith'],
    Capricorn: ['• Spiritual structure', '• Inspired authority'],
    Aquarius: ['• Utopian vision', '• Humanitarian idealism'],
    Pisces: ['• Pure spirituality', '• Universal compassion'],
  },
  pluto: {
    Aries: ['• Identity transformation', '• Personal power', '• Will rebirth'],
    Taurus: ['• Value transformation', '• Power over resources'],
    Gemini: ['• Mental transformation', '• Communication power'],
    Cancer: ['• Emotional transformation', '• Emotion power'],
    Leo: ['• Ego transformation', '• Creative power'],
    Virgo: ['• Service transformation', '• Analysis power'],
    Libra: ['• Relationship transformation', '• Partnership power'],
    Scorpio: ['• Enhanced transformation', '• Extreme power'],
    Sagittarius: ['• Philosophical transformation', '• Teaching power'],
    Capricorn: ['• Structural transformation', '• Authority power'],
    Aquarius: ['• Revolutionary transformation', '• Innovation power'],
    Pisces: ['• Spiritual transformation', '• Mystical power'],
  },
  north_node: {
    Aries: [
      '• Destiny: independence',
      '• Lesson: courage',
      '• Direction: leadership',
    ],
    Taurus: ['• Destiny: stability', '• Lesson: self-worth'],
    Gemini: ['• Destiny: communication', '• Lesson: curiosity'],
    Cancer: ['• Destiny: care', '• Lesson: vulnerability'],
    Leo: ['• Destiny: radiance', '• Lesson: self-expression'],
    Virgo: ['• Destiny: service', '• Lesson: discernment'],
    Libra: ['• Destiny: harmony', '• Lesson: commitment'],
    Scorpio: ['• Destiny: transformation', '• Lesson: vulnerability'],
    Sagittarius: ['• Destiny: truth', '• Lesson: faith'],
    Capricorn: ['• Destiny: legacy', '• Lesson: responsibility'],
    Aquarius: ['• Destiny: innovation', '• Lesson: individuality'],
    Pisces: ['• Destiny: transcendence', '• Lesson: compassion'],
  },
  south_node: {
    Aries: ['• Pattern: excessive independence', '• Release: impulsiveness'],
    Taurus: ['• Pattern: material attachment', '• Release: stubbornness'],
    Gemini: ['• Pattern: dispersion', '• Release: superficiality'],
    Cancer: ['• Pattern: dependency', '• Release: overprotection'],
    Leo: ['• Pattern: need for attention', '• Release: arrogance'],
    Virgo: ['• Pattern: perfectionism', '• Release: criticism'],
    Libra: ['• Pattern: relationship dependency', '• Release: indecisiveness'],
    Scorpio: ['• Pattern: control', '• Release: manipulation'],
    Sagittarius: ['• Pattern: excess', '• Release: escapism'],
    Capricorn: ['• Pattern: rigidity', '• Release: coldness'],
    Aquarius: ['• Pattern: detachment', '• Release: rebellion'],
    Pisces: ['• Pattern: escapism', '• Release: victimization'],
  },
  lilith: {
    Aries: ['• Raw feminine power', '• Fierce independence'],
    Taurus: ['• Rebellion against materialism', '• Radical self-worth'],
    Gemini: ['• Power in voice', '• Unfiltered communication'],
    Cancer: ['• Rebellion against maternal role', '• Emotional power'],
    Leo: ['• Creative power without apology', '• Radical radiance'],
    Virgo: ['• Rebellion against perfection', '• Power in imperfection'],
    Libra: ['• Rebellion against pleasing', '• Power in disagreement'],
    Scorpio: ['• Extreme sexual power', '• Enhanced rebellion'],
    Sagittarius: ['• Rebellion against dogma', '• Raw truth'],
    Capricorn: ['• Rebellion against authority', '• Power without approval'],
    Aquarius: ['• Radical rebellion', '• Power in difference'],
    Pisces: ['• Rebellion against victim', '• Power in sensitivity'],
  },
  chiron: {
    Aries: [
      '• Wound: identity',
      '• Healing: self-assertion',
      '• Gift: teaching courage',
    ],
    Taurus: ['• Wound: self-worth', '• Healing: self-acceptance'],
    Gemini: ['• Wound: communication', '• Gift: teaching voice'],
    Cancer: ['• Wound: care', '• Healing: self-care'],
    Leo: ['• Wound: recognition', '• Healing: self-validation'],
    Virgo: ['• Wound: perfection', '• Gift: teaching service'],
    Libra: ['• Wound: relationships', '• Healing: own identity'],
    Scorpio: ['• Wound: trust', '• Healing: vulnerability'],
    Sagittarius: ['• Wound: meaning', '• Gift: teaching wisdom'],
    Capricorn: ['• Wound: authority', '• Healing: self-recognition'],
    Aquarius: ['• Wound: belonging', '• Healing: authenticity'],
    Pisces: ['• Wound: boundaries', '• Healing: grounding'],
  },
};

export const ASCENDANT_EXT_EN: Partial<Record<Sign, string[]>> = {
  Aries: [
    '• Impression: energetic, direct, initiating.',
    '• You set the tone quickly in new encounters.',
    '• Respect others’ pace and timing.',
    '• Resource: sports, challenges, competition.',
    '• Style: minimalistic, power accents.',
    '• Skill: softer delivery and active listening.',
    '• Lead without overpowering.',
    '• Practice: breath and intention before presenting.',
    '• Shadow: haste and sharpness.',
    '• Outcome: confidence that inspires.',
  ],
  Taurus: [
    '• Impression: steady, reliable, calm.',
    '• Connection through quality and usefulness.',
    '• Style: textures, natural materials.',
    '• Resource: nature, handcraft, tactile work.',
    '• Skill: flexibility in times of change.',
    '• Relationships built slowly, lasting long.',
    '• Practice: small daily steps.',
    '• Shadow: inertia.',
    '• Outcome: quiet strength that creates trust.',
    '• Principle: fewer words, more deeds.',
  ],
};

export const HOUSE_SIGN_INTERPRETATIONS_EXT_EN: Partial<
  Record<number, Partial<Record<Sign, string[]>>>
> = {
  1: {
    Aries: [
      '• Bold, straightforward self-presentation.',
      '• Strong first impression; action-oriented.',
      '• Drive for self-reliance and decisive choices.',
      '• Skill: channel initiative constructively.',
      '• Resource: sprints over marathons.',
      '• Style: clean, dynamic, practical.',
      '• Partnerships: protect both parties’ autonomy.',
      '• Risk: pushing instead of dialoguing.',
      '• Practice: one priority goal per day.',
      '• Outcome: inspiring, contagious drive.',
    ],
    Taurus: [
      '• Calm, confident self-presentation.',
      '• Strength through stability and substance.',
      '• Skill: patience and consistency.',
      '• Resource: rituals, material anchors.',
      '• Style: comfortable, quality-centered.',
      '• Relationships: loyalty and predictability.',
      '• Risk: stagnation and over-attachment.',
      '• Practice: improve 1% daily.',
      '• Outcome: dependable presence for the long run.',
      '• Principle: quality over speed.',
    ],
  },
};
