import {
  binarySearchLowerWithIndex,
  createSearchIndex
} from '../utils/binary_search/binary_search';

/**
 * These Krama keys are written in an order where the keys which comes first shall take precedence if in the krama_text_map two have the same key
 * then the one that comes first shall be chosen
 * For eg. kau (from Bengali)
 * the "au" can land both on au and auU because of tne nature of the binary search algorithm
 * so to componsate that we chose the first one in case of multiple possible mappings
 *
 * So Be careful with similar mAtrAs, different forms of the same vyanajana (like with nuqta and other forms)
 */
const KramaKeysMap = {
  ॐ: 'AUM',
  अ: 'a-svara',
  '': 'a-mAtrA',
  ॳ: 'a1-svara',
  'ऺ': 'a1-mAtrA',
  आ: 'A-svara',
  'ा': 'A-mAtrA',
  ॴ: 'A1-svara',
  'ऻ': 'A1-mAtrA',
  इ: 'i-svara',
  'ि': 'i-mAtrA',
  ई: 'I-svara',
  'ी': 'I-mAtrA',
  उ: 'u-svara',
  'ु': 'u-mAtrA',
  ॶ: 'u1-svara',
  'ॖ': 'u1-mAtrA',
  ऊ: 'U-svara',
  'ू': 'U-mAtrA',
  ॷ: 'U1-svara',
  'ॗ': 'U1-mAtrA',
  ए: 'E-svara',
  'े': 'E-mAtrA',
  ऎ: 'e-svara',
  'ॆ': 'e-mAtrA',
  ऐ: 'ai-svara',
  'ै': 'ai-mAtrA',
  ऍ: 'aiI-svara',
  'ॅ': 'aiI-mAtrA',
  ओ: 'O-svara',
  'ो': 'O-mAtrA',
  ऒ: 'o-svara',
  'ॊ': 'o-mAtrA',
  औ: 'au-svara',
  'ौ': 'au-mAtrA',
  ऑ: 'auU-svara',
  'ॉ': 'auU-mAtrA',
  ऋ: 'R-svara',
  'ृ': 'R-mAtrA',
  ॠ: 'RR-svara',
  'ॄ': 'RR-mAtrA',
  ऌ: 'LR-svara',
  'ॢ': 'LR-mAtrA',
  ॡ: 'LRR-svara',
  'ॣ': 'LRR-mAtrA',
  'ं': 'anusvAra',
  'ँ': 'anunAnAsika',
  'ः': 'visarga',
  ऽ: 'avagraha',
  '्': 'halant',
  '़': 'nuqta',
  '॰': 'saMkShepachihna',
  क: 'k',
  क़: 'kz',
  ख: 'kh',
  ख़: 'khz',
  ग: 'g',
  ग़: 'gz',
  ॻ: 'g1',
  घ: 'gh',
  ङ: 'G',
  च: 'C',
  छ: 'Ch',
  ज: 'j',
  ज़: 'jz',
  ॼ: 'j1',
  झ: 'jh',
  ञ: 'J',
  त: 't',
  थ: 'th',
  द: 'd',
  ध: 'dh',
  न: 'n',
  ऩ: 'nz',
  ट: 'T',
  ठ: 'Th',
  ड: 'D',
  ड़: 'Dz',
  ॾ: 'D1',
  ढ: 'Dh',
  ढ़: 'Dhz',
  ण: 'N',
  प: 'p',
  फ: 'ph',
  फ़: 'phz',
  ब: 'b',
  ॿ: 'b1',
  भ: 'bh',
  म: 'm',
  य: 'y',
  य़: 'yz',
  व: 'v',
  र: 'r',
  ऱ: 'rz',
  ल: 'l',
  ळ: 'L',
  ऴ: 'Lz',
  ह: 'h',
  स: 's',
  श: 'sh',
  ष: 'Sh',
  // 4 vedic accent symbols
  '॒': 'anudAttA',
  '॑': 'udAtta-1',
  '᳚': 'udAtta-2',
  '᳛': 'udAtta-3',
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
  '।': 'virama',
  '॥': 'double_virama'
} as const;

export const KramaKeysArray = Object.keys(KramaKeysMap) as (keyof typeof KramaKeysMap)[];
/**
 * Krama(क्रम) is the array in which most of the keys used in scripts are present
 * It is an array which contains and describes common elements of different scripts allowing fast and efficient lookup
 * and transliteration of different scripts
 */
export type KramaKeysType = (typeof KramaKeysArray)[number];

export type KramaKeysLabelType = (typeof KramaKeysMap)[KramaKeysType];
export const KramaLabelsArray = Object.values(KramaKeysMap) as KramaKeysLabelType[];

export const KramaKeysIndexB = createSearchIndex(KramaKeysArray);
export const KramaLabelsIndexB = createSearchIndex(KramaLabelsArray);

/** This type will be used as a convinient method to dscribe the krama key which we want to map to
 * This shall be ultimately converted to KramaKeysType
 */
export type KramaKeysExtendedType = KramaKeysType | KramaKeysLabelType;

export const resolveKramaKeysExtendedType = (
  krama_key_ext: KramaKeysExtendedType
): KramaKeysType => {
  if (binarySearchLowerWithIndex(KramaKeysArray, KramaKeysIndexB, krama_key_ext) !== -1)
    return krama_key_ext as KramaKeysType;
  const index = binarySearchLowerWithIndex(KramaLabelsArray, KramaLabelsIndexB, krama_key_ext);
  return KramaKeysArray[index];
};
