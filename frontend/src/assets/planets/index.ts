import type { ImageSourcePropType } from 'react-native';

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
  | 'pluto'
  | 'ascendant';

const NAME_RU_TO_KEY: Record<string, PlanetKey> = {
  Солнце: 'sun',
  Луна: 'moon',
  Меркурий: 'mercury',
  Венера: 'venus',
  Марс: 'mars',
  Юпитер: 'jupiter',
  Сатурн: 'saturn',
  Уран: 'uranus',
  Нептун: 'neptune',
  Плутон: 'pluto',
  Асцендент: 'ascendant',
};

const REMOTE_URIS: Record<PlanetKey, string> = {
  sun: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Visible_Sun_-_November_16%2C_2012.jpg/640px-Visible_Sun_-_November_16%2C_2012.jpg',
  moon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg',
  mercury:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercury_in_true_color.jpg/640px-Mercury_in_true_color.jpg',
  venus:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/640px-Venus-real_color.jpg',
  mars: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/640px-OSIRIS_Mars_true_color.jpg',
  jupiter:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Jupiter_by_Cassini-Huygens.jpg/640px-Jupiter_by_Cassini-Huygens.jpg',
  saturn:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/640px-Saturn_during_Equinox.jpg',
  uranus:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/640px-Uranus2.jpg',
  neptune:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/640px-Neptune_Full.jpg',
  pluto:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg/640px-Nh-pluto-in-true-color_2x_JPEG-edit-frame.jpg',
  ascendant:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/ESO_-_Milky_Way.jpg/640px-ESO_-_Milky_Way.jpg',
};

const LOCAL_IMAGES: Partial<Record<PlanetKey, ImageSourcePropType>> = {
  // When local assets are added under frontend/assets/planets, uncomment and map like:
  // sun: require('../../../assets/planets/sun.png'),
  // moon: require('../../../assets/planets/moon.png'),
  // mercury: require('../../../assets/planets/mercury.png'),
  // venus: require('../../../assets/planets/venus.png'),
  // mars: require('../../../assets/planets/mars.png'),
  // jupiter: require('../../../assets/planets/jupiter.png'),
  // saturn: require('../../../assets/planets/saturn.png'),
  // uranus: require('../../../assets/planets/uranus.png'),
  // neptune: require('../../../assets/planets/neptune.png'),
  // pluto: require('../../../assets/planets/pluto.png'),
  // ascendant: require('../../../assets/planets/ascendant.png'),
};

const DEFAULT_URI = REMOTE_URIS.sun;

function normalizeToKey(input: string): PlanetKey | undefined {
  if (!input) return undefined;
  const trimmed = String(input).trim();
  const ru = NAME_RU_TO_KEY[trimmed as keyof typeof NAME_RU_TO_KEY];
  if (ru) return ru;
  const lower = trimmed.toLowerCase();
  switch (lower) {
    case 'sun':
      return 'sun';
    case 'moon':
      return 'moon';
    case 'mercury':
      return 'mercury';
    case 'venus':
      return 'venus';
    case 'mars':
      return 'mars';
    case 'jupiter':
      return 'jupiter';
    case 'saturn':
      return 'saturn';
    case 'uranus':
      return 'uranus';
    case 'neptune':
      return 'neptune';
    case 'pluto':
      return 'pluto';
    case 'ascendant':
    case 'asc':
      return 'ascendant';
    default:
      return undefined;
  }
}

export function getPlanetImageSource(input: string): ImageSourcePropType {
  const key = normalizeToKey(input) || 'sun';
  const local = LOCAL_IMAGES[key];
  if (local) return local;
  const uri = REMOTE_URIS[key] || DEFAULT_URI;
  return { uri };
}

export function getPlanetImageUri(input: string): string {
  const key = normalizeToKey(input) || 'sun';
  return REMOTE_URIS[key] || DEFAULT_URI;
}

export function planetKeyFromRu(nameRu: string): PlanetKey | undefined {
  return NAME_RU_TO_KEY[nameRu];
}
