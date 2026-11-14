import { transliterate, type ScriptListType } from 'lipilekhika';
import { getScriptKramaData, getScriptTypingDataMap } from 'lipilekhika/typing';

/**
 * The organized layout of the typing help.
 *
 * The krama array is index aligned across all scripts, so the layout is described once with
 * the `Normal` krama text of each position (`k`, `kh`, ...) and resolved for any script. The
 * typing map and the script comparison both render from the same layout.
 */

export type CharType = 'svara' | 'vyanjana' | 'anya' | 'mAtrA';
type KramaRow = [text: string, type: CharType];

export type Glyph = {
  text: string;
  /** the main key to type it */
  primary?: string;
  /** the other keys which give the same text */
  alternates: string[];
};

export type Cell = {
  id: string;
  /** the character in the selected script */
  main: Glyph;
  /** the vowel sign (mAtrA) of a svara */
  sign?: Glyph;
  /** compare mode: the same position in the compared script */
  other?: { text: string; sign?: string };
  /** a short description, for the invisible or special characters */
  label?: string;
};

export type Group = {
  id: string;
  title: string;
  /** a short description shown with the title */
  hint?: string;
  /** a fixed grid where the column has a meaning (the vargas), empty slots are `null` */
  columns?: number;
  cells: (Cell | null)[];
};

export type SectionId = 'svara' | 'vyanjana' | 'other' | 'special';
export type Section = { id: SectionId; title: string; hint?: string; groups: Group[] };

/** The keys which change how the typing works, they are not characters of the script */
export type TypingControls = {
  /** `q` keeps two keys apart (brahmic scripts only) */
  separator?: { joined: string; joined_text: string; split: string; split_text: string };
  joiners: { key: string; name: string; example?: { input: string; output: string } }[];
  /** keys which give a letter as it is (`QQ` → Q) */
  literals: { key: string; text: string }[];
};

export type Layout = {
  script: ScriptListType;
  compare?: ScriptListType;
  /** false for the romanized scripts, which have no separate mAtrA or vyanjana types */
  brahmic: boolean;
  /** only in the typing map */
  controls?: TypingControls;
  sections: Section[];
};

type GroupSpec = {
  id: string;
  title: string;
  hint?: string;
  columns?: number;
  /** `Normal` krama text, or `dev:<char>` for the positions without a Normal text */
  items: string[];
};

const SVARA_ITEMS = [
  'a',
  'A',
  'i',
  'I',
  'u',
  'U',
  'e',
  'E',
  'ai',
  'o',
  'O',
  'au',
  'R',
  'RR',
  'LR',
  'LRR',
  'aiI',
  'auU'
];

export const VARGA_SPECS: GroupSpec[] = [
  { id: 'ka', title: 'Ka-varga', hint: 'velar', columns: 5, items: ['k', 'kh', 'g', 'gh', 'G'] },
  {
    id: 'cha',
    title: 'Cha-varga',
    hint: 'palatal',
    columns: 5,
    items: ['ch', 'Ch', 'j', 'jh', 'J']
  },
  {
    id: 'Ta',
    title: 'Ṭa-varga',
    hint: 'retroflex',
    columns: 5,
    items: ['T', 'Th', 'D', 'Dh', 'N']
  },
  { id: 'ta', title: 'Ta-varga', hint: 'dental', columns: 5, items: ['t', 'th', 'd', 'dh', 'n'] },
  { id: 'pa', title: 'Pa-varga', hint: 'labial', columns: 5, items: ['p', 'ph', 'b', 'bh', 'm'] }
];

const VYANJANA_REST_SPECS: GroupSpec[] = [
  { id: 'antahstha', title: 'Antaḥstha', hint: 'semivowels', items: ['y', 'r', 'l', 'v'] },
  { id: 'ushma', title: 'Ūṣma', hint: 'sibilants', items: ['sh', 'Sh', 's', 'h'] },
  { id: 'extra', title: 'Additional', items: ['L', 'Lz', 'rz', 'nz'] },
  {
    id: 'nukta',
    title: 'Nukta forms',
    hint: 'consonants with a dot below',
    items: ['kz', 'khz', 'gz', 'jz', 'Dz', 'Dhz', 'phz', 'yz']
  }
];

/** typed as a sequence of keys, `x` is a key of its own for क्ष */
const CONJUNCTS: { seq: string; keys: string[] }[] = [
  { seq: 'kSh', keys: ['kSh'] },
  { seq: 'tr', keys: ['tr'] },
  { seq: 'jJ', keys: ['jJ', 'jY'] },
  { seq: 'shr', keys: ['shr'] }
];

const OTHER_SPECS: GroupSpec[] = [
  {
    id: 'yogavaha',
    title: 'Ayogavāha',
    hint: 'anusvāra, candrabindu, visarga',
    items: ['M', 'MM', 'H']
  },
  { id: 'symbols', title: 'Symbols', items: ['AUM', '`', 'dev:्', 'dev:़', '°'] },
  {
    id: 'numerals',
    title: 'Numerals',
    hint: 'plain digits follow the "native numerals" setting, .1 always gives the native digit',
    items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  },
  { id: 'punctuation', title: 'Punctuation', items: ['.', '..'] },
  { id: 'vedic', title: 'Vedic accents', items: ['↓', '↑', '↑↑', '↑↑↑'] }
];

const CHAR_LABELS: Record<string, string> = {
  '‍': 'Zero width joiner',
  '‌': 'Zero width non-joiner',
  '्': 'Halant',
  '़': 'Nukta',
  ऽ: 'Avagraha',
  '॰': 'Abbreviation sign'
};

/** Dotted circle base for the combining signs, so a lone mAtrA or halant stays visible */
export const displayText = (text: string) => (/^\p{M}/u.test(text) ? '◌' + text : text);

const isAscii = (s: string) => /^[\x20-\x7e]+$/.test(s);

/** The `Normal` text of the position is the main key, when it can be typed */
function splitKeys(keys: string[], normal_text?: string): Pick<Glyph, 'primary' | 'alternates'> {
  let primary: string | undefined;
  if (normal_text && isAscii(normal_text) && keys.includes(normal_text)) primary = normal_text;
  else primary = keys.find(isAscii) ?? keys[0];
  return { primary, alternates: keys.filter((k) => k !== primary) };
}

const kramaCache = new Map<string, Promise<KramaRow[]>>();
const getKrama = (script: ScriptListType) => {
  let prom = kramaCache.get(script);
  if (!prom) {
    prom = getScriptKramaData(script) as Promise<KramaRow[]>;
    kramaCache.set(script, prom);
  }
  return prom;
};

export async function buildLayout(
  script: ScriptListType,
  compare?: ScriptListType
): Promise<Layout> {
  const [krama, typing_map, normal, dev, cmp] = await Promise.all([
    getKrama(script),
    getScriptTypingDataMap(script),
    getKrama('Normal'),
    getKrama('Devanagari'),
    compare ? getKrama(compare) : Promise.resolve(null)
  ]);
  const comparing = cmp !== null;

  const indexOf = (id: string) =>
    id.startsWith('dev:')
      ? dev.findIndex(([t]) => t === id.slice(4))
      : normal.findIndex(([t]) => t === id);

  const keyOf = (text: string, type: CharType) => `${text}\u0000${type}`;
  const keys_map = new Map<string, string[]>();
  for (const [text, type, mappings] of typing_map.common_krama_map)
    keys_map.set(keyOf(text, type), mappings);

  /** the typing map entries already shown, the rest ends up in the "Unlisted" group */
  const shown_entries = new Set<string>();
  /** the cells already shown, a second position with the same text (or text pair) is skipped */
  const seen_cells = new Set<string>();

  const glyphAt = (i: number): Glyph | null => {
    const row = krama[i];
    if (!row || !row[0]) return null;
    const [text, type] = row;
    const keys = keys_map.get(keyOf(text, type)) ?? [];
    return { text, ...splitKeys(keys, normal[i]?.[0]) };
  };
  const markShown = (i: number) => {
    const row = krama[i];
    if (row) shown_entries.add(keyOf(row[0], row[1]));
  };

  const brahmic = krama[indexOf('k')]?.[1] === 'vyanjana';

  const cellAt = (id: string, with_sign = false): Cell | null => {
    const i = indexOf(id);
    if (i === -1) return null;
    const main = glyphAt(i);
    if (!main) return null;

    let sign: Glyph | undefined;
    if (with_sign && krama[i + 1]?.[1] === 'mAtrA') sign = glyphAt(i + 1) ?? undefined;

    let other: Cell['other'];
    if (cmp) {
      const other_text = cmp[i]?.[0] ?? '';
      const other_sign = with_sign && cmp[i + 1]?.[1] === 'mAtrA' ? cmp[i + 1][0] : undefined;
      other = { text: other_text, sign: other_sign || undefined };
    }

    // a character which can not be typed has nothing to show in the typing map
    if (!comparing && !main.primary) return null;

    const dedupe_key = [main.text, sign?.text, other?.text, other?.sign].join('\u0000');
    if (seen_cells.has(dedupe_key)) return null;
    seen_cells.add(dedupe_key);
    markShown(i);
    if (sign) markShown(i + 1);

    return { id, main, sign, other, label: CHAR_LABELS[main.text] };
  };

  const buildGroup = (spec: GroupSpec, with_sign = false): Group => {
    const cells = spec.items.map((id) => cellAt(id, with_sign));
    return {
      id: spec.id,
      title: spec.title,
      hint: spec.hint,
      columns: spec.columns,
      // keep the empty slots only where the column has a meaning
      cells: spec.columns ? cells : cells.filter((c) => c !== null)
    };
  };
  const nonEmpty = (g: Group) => g.cells.some((c) => c !== null);

  // Svara
  const svara_group = buildGroup({ id: 'svara', title: 'Svara', items: SVARA_ITEMS }, brahmic);

  // Vyanjana
  const varga_groups = VARGA_SPECS.map((s) => buildGroup(s));
  const rest_groups = VYANJANA_REST_SPECS.map((s) => buildGroup(s));

  // the inherent `a` gives the bare conjunct in the brahmic scripts, the romanized ones have none
  const conjunctText = (seq: string, to: ScriptListType) =>
    transliterate(seq + 'a', 'Normal', to).then((text) =>
      to_brahmic.get(to) ? text : text.replace(/a$/, '')
    );
  const to_brahmic = new Map<ScriptListType, boolean>([[script, brahmic]]);
  if (compare && cmp) to_brahmic.set(compare, cmp[indexOf('k')]?.[1] === 'vyanjana');
  const [texts, other_texts] = await Promise.all([
    Promise.all(CONJUNCTS.map(({ seq }) => conjunctText(seq, script))),
    compare ? Promise.all(CONJUNCTS.map(({ seq }) => conjunctText(seq, compare))) : []
  ]);
  const conjunct_cells: Cell[] = CONJUNCTS.map(({ seq, keys }, idx) => {
    const text = texts[idx];
    const type: CharType = brahmic ? 'vyanjana' : 'anya';
    const own_keys = keys_map.get(keyOf(text, type)) ?? [];
    if (own_keys.length) shown_entries.add(keyOf(text, type));
    return {
      id: 'conj-' + seq,
      main: { text, primary: keys[0], alternates: [...keys.slice(1), ...own_keys] },
      other: compare ? { text: other_texts[idx] } : undefined
    };
  });
  const conjunct_group: Group = {
    id: 'conjuncts',
    title: 'Common conjuncts',
    hint: 'typed as a sequence of consonants',
    cells: conjunct_cells
  };

  // Other
  const other_groups = OTHER_SPECS.map((s) => buildGroup(s));

  // Special
  const special_groups: Group[] = [];
  if (!comparing) {
    if (brahmic) {
      const sign_cells: Cell[] = [];
      for (const cell of svara_group.cells) {
        if (cell?.sign?.primary) {
          sign_cells.push({ id: 'sign-' + cell.id, main: cell.sign, label: undefined });
        }
      }
      special_groups.push({
        id: 'signs',
        title: 'Standalone mātrā signs',
        hint: 'a vowel sign on its own, without a consonant before it',
        cells: sign_cells
      });
    }

    const specific = typing_map.script_specific_krama_map;
    const toCell = ([text, , mappings]: (typeof specific)[number], idx: number): Cell => ({
      id: `specific-${idx}`,
      main: { text, ...splitKeys(mappings) },
      label: CHAR_LABELS[text]
    });
    // the joiners and the literal letters are typing controls, not characters of the script
    special_groups.push({
      id: 'extra',
      title: 'Extra characters',
      hint: 'beyond the common set',
      cells: specific.map(toCell).filter((c) => !isAscii(c.main.text) && !isInvisible(c.main.text))
    });

    const unlisted: Cell[] = [];
    typing_map.common_krama_map.forEach(([text, type, mappings], idx) => {
      if (shown_entries.has(keyOf(text, type))) return;
      if (type === 'mAtrA') return;
      unlisted.push({
        id: `unlisted-${idx}`,
        main: { text, ...splitKeys(mappings) },
        label: CHAR_LABELS[text]
      });
    });
    special_groups.push({ id: 'unlisted', title: 'Other characters', cells: unlisted });
  }

  let controls: TypingControls | undefined;
  if (!comparing) {
    const specific = typing_map.script_specific_krama_map;
    const t = (text: string) => transliterate(text, 'Normal', script);
    const [kha, k, ha, sha] = await Promise.all([t('kha'), t('k'), t('ha'), t('Sha')]);
    controls = {
      separator: brahmic
        ? { joined: 'kh', joined_text: kha, split: 'kqh', split_text: k + ha }
        : undefined,
      joiners: specific
        .filter(([text, , keys]) => isInvisible(text) && keys.length > 0)
        .map(([text, , keys]) => ({
          key: keys[0],
          name: CHAR_LABELS[text] ?? 'Invisible character',
          example:
            brahmic && text === '\u200d'
              ? { input: 'k.qSh', output: k + '\u200d' + sha }
              : undefined
        })),
      literals: specific
        .filter(([text, , keys]) => isAscii(text) && keys.length > 0 && keys[0] !== text)
        .map(([text, , keys]) => ({ key: keys[0], text }))
    };
  }

  const sections: Section[] = [
    {
      id: 'svara',
      title: 'Svara',
      hint: brahmic ? 'vowels with their mātrā signs' : 'vowels',
      groups: [svara_group]
    },
    {
      id: 'vyanjana',
      title: 'Vyañjana',
      hint: 'consonants',
      groups: [...varga_groups, ...rest_groups, conjunct_group]
    },
    { id: 'other', title: 'Other', groups: other_groups },
    { id: 'special', title: 'Special', groups: special_groups }
  ];
  for (const section of sections) section.groups = section.groups.filter(nonEmpty);

  return {
    script,
    compare,
    brahmic,
    controls,
    sections: sections.filter((s) => s.groups.length > 0)
  };
}

/** What the typing help renders a layout with */
export type HelpContext = {
  layout: Layout;
  mode: 'typing' | 'compare';
  show_alternates: boolean;
  /** font class of the selected script */
  font: string;
  /** font class of the compared script */
  other_font: string;
};

/** The format characters (ZWJ...) render as nothing, show their label instead */
export const isInvisible = (text: string) => /^[\p{Cf}\s]+$/u.test(text);
