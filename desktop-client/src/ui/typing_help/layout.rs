//! The organized layout of the typing help, a port of the web app's
//! `docs/docs-and-web-client/src/components/typing_help/layout.ts`.
//!
//! The krama array is index aligned across all scripts, so the layout is described once with
//! the `Normal` krama text of each position (`k`, `kh`, ...) and resolved for any script. The
//! typing map and the script comparison both render from the same layout.

use lipilekhika::typing::{ListType, get_script_krama_data, get_script_typing_data_map};
use lipilekhika::{Script, ScriptListEnum, transliterate};
use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use unicode_general_category::{GeneralCategory, get_general_category};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Glyph {
  pub text: String,
  /// the main key to type it
  pub primary: Option<String>,
  /// the other keys which give the same text
  pub alternates: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OtherGlyph {
  pub text: String,
  pub sign: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Cell {
  pub id: String,
  /// the character in the selected script
  pub main: Glyph,
  /// the vowel sign (mAtrA) of a svara
  pub sign: Option<Glyph>,
  /// compare mode: the same position in the compared script
  pub other: Option<OtherGlyph>,
  /// a short description, for the invisible or special characters
  pub label: Option<&'static str>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Group {
  pub id: &'static str,
  pub title: &'static str,
  /// a short description shown with the title
  pub hint: Option<&'static str>,
  /// a fixed grid where the column has a meaning (the vargas), empty slots are `None`
  pub columns: Option<usize>,
  pub cells: Vec<Option<Cell>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SectionId {
  Svara,
  Vyanjana,
  Other,
  Special,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Section {
  pub id: SectionId,
  pub title: &'static str,
  pub hint: Option<&'static str>,
  pub groups: Vec<Group>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Separator {
  pub joined: String,
  pub joined_text: String,
  pub split: String,
  pub split_text: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Joiner {
  pub key: String,
  pub name: &'static str,
  pub example: Option<(String, String)>,
}

/// The keys which change how the typing works, they are not characters of the script
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct TypingControls {
  /// `q` keeps two keys apart (brahmic scripts only)
  pub separator: Option<Separator>,
  pub joiners: Vec<Joiner>,
  /// keys which give a letter as it is (`QQ` → Q)
  pub literals: Vec<(String, String)>,
}

impl TypingControls {
  pub fn is_empty(&self) -> bool {
    self.separator.is_none() && self.joiners.is_empty() && self.literals.is_empty()
  }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Layout {
  pub script: ScriptListEnum,
  pub compare: Option<ScriptListEnum>,
  /// false for the romanized scripts, which have no separate mAtrA or vyanjana types
  pub brahmic: bool,
  /// only in the typing map
  pub controls: Option<TypingControls>,
  pub sections: Vec<Section>,
}

struct GroupSpec {
  id: &'static str,
  title: &'static str,
  hint: Option<&'static str>,
  columns: Option<usize>,
  /// `Normal` krama text, or `dev:<char>` for the positions without a Normal text
  items: &'static [&'static str],
}

const SVARA_ITEMS: &[&str] = &[
  "a", "A", "i", "I", "u", "U", "e", "E", "ai", "o", "O", "au", "R", "RR", "LR", "LRR", "aiI",
  "auU",
];

const VARGA_SPECS: &[GroupSpec] = &[
  GroupSpec {
    id: "ka",
    title: "Ka-varga",
    hint: Some("velar"),
    columns: Some(5),
    items: &["k", "kh", "g", "gh", "G"],
  },
  GroupSpec {
    id: "cha",
    title: "Cha-varga",
    hint: Some("palatal"),
    columns: Some(5),
    items: &["ch", "Ch", "j", "jh", "J"],
  },
  GroupSpec {
    id: "Ta",
    title: "Ṭa-varga",
    hint: Some("retroflex"),
    columns: Some(5),
    items: &["T", "Th", "D", "Dh", "N"],
  },
  GroupSpec {
    id: "ta",
    title: "Ta-varga",
    hint: Some("dental"),
    columns: Some(5),
    items: &["t", "th", "d", "dh", "n"],
  },
  GroupSpec {
    id: "pa",
    title: "Pa-varga",
    hint: Some("labial"),
    columns: Some(5),
    items: &["p", "ph", "b", "bh", "m"],
  },
];

const VYANJANA_REST_SPECS: &[GroupSpec] = &[
  GroupSpec {
    id: "antahstha",
    title: "Antaḥstha",
    hint: Some("semivowels"),
    columns: None,
    items: &["y", "r", "l", "v"],
  },
  GroupSpec {
    id: "ushma",
    title: "Ūṣma",
    hint: Some("sibilants"),
    columns: None,
    items: &["sh", "Sh", "s", "h"],
  },
  GroupSpec {
    id: "extra",
    title: "Additional",
    hint: None,
    columns: None,
    items: &["L", "Lz", "rz", "nz"],
  },
  GroupSpec {
    id: "nukta",
    title: "Nukta forms",
    hint: Some("for Urdu and Persian sounds"),
    columns: None,
    items: &["kz", "khz", "gz", "jz", "Dz", "Dhz", "phz", "yz"],
  },
];

/// typed as a sequence of keys, `x` is a key of its own for क्ष
const CONJUNCTS: &[(&str, &[&str])] = &[
  ("kSh", &["kSh"]),
  ("tr", &["tr"]),
  ("jJ", &["jJ", "jY"]),
  ("shr", &["shr"]),
];

const OTHER_SPECS: &[GroupSpec] = &[
  GroupSpec {
    id: "yogavaha",
    title: "Ayogavāha",
    hint: Some("anusvāra, candrabindu, visarga"),
    columns: None,
    items: &["M", "MM", "H"],
  },
  GroupSpec {
    id: "symbols",
    title: "Symbols",
    hint: None,
    columns: None,
    items: &["AUM", "`", "dev:्", "dev:़", "°"],
  },
  GroupSpec {
    id: "numerals",
    title: "Numerals",
    hint: Some(
      "plain digits follow the \"native numerals\" setting, .1 always gives the native digit",
    ),
    columns: None,
    items: &["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  },
  GroupSpec {
    id: "punctuation",
    title: "Punctuation",
    hint: None,
    columns: None,
    items: &[".", ".."],
  },
  GroupSpec {
    id: "vedic",
    title: "Vedic accents",
    hint: None,
    columns: None,
    items: &["↓", "↑", "↑↑", "↑↑↑"],
  },
];

fn char_label(text: &str) -> Option<&'static str> {
  Some(match text {
    "\u{200d}" => "Zero width joiner",
    "\u{200c}" => "Zero width non-joiner",
    "्" => "Halant",
    "़" => "Nukta",
    "ऽ" => "Avagraha",
    "॰" => "Abbreviation sign",
    _ => return None,
  })
}

fn is_mark(c: char) -> bool {
  matches!(
    get_general_category(c),
    GeneralCategory::NonspacingMark | GeneralCategory::SpacingMark | GeneralCategory::EnclosingMark
  )
}

/// Dotted circle base for the combining signs, so a lone mAtrA or halant stays visible
pub fn display_text(text: &str) -> String {
  match text.chars().next() {
    Some(c) if is_mark(c) => format!("◌{text}"),
    _ => text.to_string(),
  }
}

/// The format characters (ZWJ...) render as nothing, show their label instead
pub fn is_invisible(text: &str) -> bool {
  !text.is_empty()
    && text
      .chars()
      .all(|c| c.is_whitespace() || get_general_category(c) == GeneralCategory::Format)
}

fn is_ascii_text(s: &str) -> bool {
  !s.is_empty() && s.bytes().all(|b| (0x20..=0x7e).contains(&b))
}

/// The `Normal` text of the position is the main key, when it can be typed
fn split_keys(keys: &[String], normal_text: Option<&str>) -> (Option<String>, Vec<String>) {
  let primary = match normal_text {
    Some(n) if is_ascii_text(n) && keys.iter().any(|k| k == n) => Some(n.to_string()),
    _ => keys
      .iter()
      .find(|k| is_ascii_text(k))
      .or(keys.first())
      .cloned(),
  };
  let alternates = keys
    .iter()
    .filter(|k| Some(*k) != primary.as_ref())
    .cloned()
    .collect();
  (primary, alternates)
}

fn to_script(s: ScriptListEnum) -> Script {
  Script::from_str(s.as_ref()).expect("ScriptListEnum canonical name is a valid Script")
}

fn normal_to(text: &str, script: ScriptListEnum) -> String {
  transliterate(text, Script::Normal, to_script(script), None).into_owned()
}

type Key = (String, ListType);

/// Builds the layout of the typing map (`compare` is `None`) or of the comparison with `compare`.
pub fn build_layout(script: ScriptListEnum, compare: Option<ScriptListEnum>) -> Layout {
  let krama = get_script_krama_data(to_script(script));
  let typing_map = get_script_typing_data_map(to_script(script));
  let normal = get_script_krama_data(Script::Normal);
  let dev = get_script_krama_data(Script::Devanagari);
  let cmp = compare.map(|c| get_script_krama_data(to_script(c)));
  let comparing = cmp.is_some();

  let index_of = |id: &str| -> Option<usize> {
    if let Some(dev_char) = id.strip_prefix("dev:") {
      dev.iter().position(|(t, _)| t == dev_char)
    } else {
      normal.iter().position(|(t, _)| t == id)
    }
  };

  let mut keys_map: HashMap<Key, Vec<String>> = HashMap::new();
  for (text, ty, mappings) in &typing_map.common_krama_map {
    keys_map.insert((text.clone(), ty.clone()), mappings.clone());
  }

  // the typing map entries already shown, the rest ends up in the "Other characters" group
  let mut shown_entries: HashSet<Key> = HashSet::new();
  // the cells already shown, a second position with the same text (or text pair) is skipped
  let mut seen_cells: HashSet<String> = HashSet::new();

  let glyph_at = |i: usize| -> Option<Glyph> {
    let (text, ty) = krama.get(i)?;
    if text.is_empty() {
      return None;
    }
    let keys = keys_map
      .get(&(text.clone(), ty.clone()))
      .cloned()
      .unwrap_or_default();
    let (primary, alternates) = split_keys(&keys, normal.get(i).map(|(t, _)| t.as_str()));
    Some(Glyph {
      text: text.clone(),
      primary,
      alternates,
    })
  };

  let brahmic = index_of("k")
    .and_then(|i| krama.get(i))
    .is_some_and(|(_, ty)| *ty == ListType::Vyanjana);

  let mut cell_at = |id: &str, with_sign: bool| -> Option<Cell> {
    let i = index_of(id)?;
    let main = glyph_at(i)?;

    let mut sign = None;
    if with_sign
      && krama
        .get(i + 1)
        .is_some_and(|(_, ty)| *ty == ListType::Matra)
    {
      sign = glyph_at(i + 1);
    }

    let other = cmp.as_ref().map(|cmp| {
      let other_text = cmp.get(i).map(|(t, _)| t.clone()).unwrap_or_default();
      let other_sign = if with_sign {
        cmp
          .get(i + 1)
          .filter(|(t, ty)| *ty == ListType::Matra && !t.is_empty())
          .map(|(t, _)| t.clone())
      } else {
        None
      };
      OtherGlyph {
        text: other_text,
        sign: other_sign,
      }
    });

    // a character which can not be typed has nothing to show in the typing map
    if !comparing && main.primary.is_none() {
      return None;
    }

    let dedupe_key = [
      main.text.as_str(),
      sign.as_ref().map_or("", |s| s.text.as_str()),
      other.as_ref().map_or("", |o| o.text.as_str()),
      other.as_ref().and_then(|o| o.sign.as_deref()).unwrap_or(""),
    ]
    .join("\u{0}");
    if !seen_cells.insert(dedupe_key) {
      return None;
    }
    if let Some((t, ty)) = krama.get(i) {
      shown_entries.insert((t.clone(), ty.clone()));
    }
    if sign.is_some()
      && let Some((t, ty)) = krama.get(i + 1)
    {
      shown_entries.insert((t.clone(), ty.clone()));
    }

    let label = char_label(&main.text);
    Some(Cell {
      id: id.to_string(),
      main,
      sign,
      other,
      label,
    })
  };

  let mut build_group = |spec: &GroupSpec, with_sign: bool| -> Group {
    let cells: Vec<Option<Cell>> = spec.items.iter().map(|id| cell_at(id, with_sign)).collect();
    Group {
      id: spec.id,
      title: spec.title,
      hint: spec.hint,
      columns: spec.columns,
      // keep the empty slots only where the column has a meaning
      cells: if spec.columns.is_some() {
        cells
      } else {
        cells.into_iter().filter(Option::is_some).collect()
      },
    }
  };

  // Svara
  let svara_group = build_group(
    &GroupSpec {
      id: "svara",
      title: "Svara",
      hint: None,
      columns: None,
      items: SVARA_ITEMS,
    },
    brahmic,
  );

  // Vyanjana
  let varga_groups: Vec<Group> = VARGA_SPECS.iter().map(|s| build_group(s, false)).collect();
  let rest_groups: Vec<Group> = VYANJANA_REST_SPECS
    .iter()
    .map(|s| build_group(s, false))
    .collect();
  let other_groups: Vec<Group> = OTHER_SPECS.iter().map(|s| build_group(s, false)).collect();

  // the inherent `a` gives the bare conjunct in the brahmic scripts, the romanized ones have none
  let cmp_brahmic = cmp.as_ref().is_some_and(|cmp| {
    index_of("k")
      .and_then(|i| cmp.get(i))
      .is_some_and(|(_, ty)| *ty == ListType::Vyanjana)
  });
  let conjunct_text = |seq: &str, to: ScriptListEnum, to_brahmic: bool| -> String {
    let text = normal_to(&format!("{seq}a"), to);
    if to_brahmic {
      text
    } else {
      text.strip_suffix('a').map(str::to_string).unwrap_or(text)
    }
  };
  let conjunct_cells: Vec<Option<Cell>> = CONJUNCTS
    .iter()
    .map(|(seq, keys)| {
      let text = conjunct_text(seq, script, brahmic);
      let ty = if brahmic {
        ListType::Vyanjana
      } else {
        ListType::Anya
      };
      let own_keys = keys_map
        .get(&(text.clone(), ty.clone()))
        .cloned()
        .unwrap_or_default();
      if !own_keys.is_empty() {
        shown_entries.insert((text.clone(), ty));
      }
      let mut alternates: Vec<String> = keys[1..].iter().map(|k| k.to_string()).collect();
      alternates.extend(own_keys);
      Some(Cell {
        id: format!("conj-{seq}"),
        main: Glyph {
          text,
          primary: Some(keys[0].to_string()),
          alternates,
        },
        sign: None,
        other: compare.map(|c| OtherGlyph {
          text: conjunct_text(seq, c, cmp_brahmic),
          sign: None,
        }),
        label: None,
      })
    })
    .collect();
  let conjunct_group = Group {
    id: "conjuncts",
    title: "Common conjuncts",
    hint: Some("typed as a sequence of consonants"),
    columns: None,
    cells: conjunct_cells,
  };

  // Special
  let mut special_groups: Vec<Group> = Vec::new();
  if !comparing {
    if brahmic {
      let sign_cells: Vec<Option<Cell>> = svara_group
        .cells
        .iter()
        .flatten()
        .filter_map(|cell| {
          let sign = cell.sign.as_ref()?;
          sign.primary.as_ref()?;
          Some(Some(Cell {
            id: format!("sign-{}", cell.id),
            main: sign.clone(),
            sign: None,
            other: None,
            label: None,
          }))
        })
        .collect();
      special_groups.push(Group {
        id: "signs",
        title: "Standalone mātrā signs",
        hint: Some("a vowel sign on its own, without a consonant before it"),
        columns: None,
        cells: sign_cells,
      });
    }

    // the joiners and the literal letters are typing controls, not characters of the script
    let extra_cells: Vec<Option<Cell>> = typing_map
      .script_specific_krama_map
      .iter()
      .enumerate()
      .map(|(idx, (text, _, mappings))| {
        let (primary, alternates) = split_keys(mappings, None);
        Cell {
          id: format!("specific-{idx}"),
          main: Glyph {
            text: text.clone(),
            primary,
            alternates,
          },
          sign: None,
          other: None,
          label: char_label(text),
        }
      })
      .filter(|c| !is_ascii_text(&c.main.text) && !is_invisible(&c.main.text))
      .map(Some)
      .collect();
    special_groups.push(Group {
      id: "extra",
      title: "Extra characters",
      hint: Some("beyond the common set"),
      columns: None,
      cells: extra_cells,
    });

    let unlisted: Vec<Option<Cell>> = typing_map
      .common_krama_map
      .iter()
      .enumerate()
      .filter(|(_, (text, ty, _))| {
        !shown_entries.contains(&(text.clone(), ty.clone())) && *ty != ListType::Matra
      })
      .map(|(idx, (text, _, mappings))| {
        let (primary, alternates) = split_keys(mappings, None);
        Some(Cell {
          id: format!("unlisted-{idx}"),
          main: Glyph {
            text: text.clone(),
            primary,
            alternates,
          },
          sign: None,
          other: None,
          label: char_label(text),
        })
      })
      .collect();
    special_groups.push(Group {
      id: "unlisted",
      title: "Other characters",
      hint: None,
      columns: None,
      cells: unlisted,
    });
  }

  let controls = (!comparing).then(|| {
    let specific = &typing_map.script_specific_krama_map;
    let kha = normal_to("kha", script);
    let k = normal_to("k", script);
    let ha = normal_to("ha", script);
    let sha = normal_to("Sha", script);
    TypingControls {
      separator: brahmic.then(|| Separator {
        joined: "kh".into(),
        joined_text: kha,
        split: "kqh".into(),
        split_text: format!("{k}{ha}"),
      }),
      joiners: specific
        .iter()
        .filter(|(text, _, keys)| is_invisible(text) && !keys.is_empty())
        .map(|(text, _, keys)| Joiner {
          key: keys[0].clone(),
          name: char_label(text).unwrap_or("Invisible character"),
          example: (brahmic && text == "\u{200d}")
            .then(|| ("k.qSh".to_string(), format!("{k}\u{200d}{sha}"))),
        })
        .collect(),
      literals: specific
        .iter()
        .filter(|(text, _, keys)| is_ascii_text(text) && !keys.is_empty() && keys[0] != *text)
        .map(|(text, _, keys)| (keys[0].clone(), text.clone()))
        .collect(),
    }
  });

  let mut vyanjana_groups = varga_groups;
  vyanjana_groups.extend(rest_groups);
  vyanjana_groups.push(conjunct_group);

  let mut sections = vec![
    Section {
      id: SectionId::Svara,
      title: "Svara",
      hint: Some(if brahmic {
        "vowels with their mātrā signs"
      } else {
        "vowels"
      }),
      groups: vec![svara_group],
    },
    Section {
      id: SectionId::Vyanjana,
      title: "Vyañjana",
      hint: Some("consonants"),
      groups: vyanjana_groups,
    },
    Section {
      id: SectionId::Other,
      title: "Other",
      hint: None,
      groups: other_groups,
    },
    Section {
      id: SectionId::Special,
      title: "Special",
      hint: None,
      groups: special_groups,
    },
  ];
  for section in &mut sections {
    section
      .groups
      .retain(|g| g.cells.iter().any(Option::is_some));
  }
  sections.retain(|s| !s.groups.is_empty());

  Layout {
    script,
    compare,
    brahmic,
    controls,
    sections,
  }
}

/// ई with its keys (I, ee, ii) in the script, the example of the "alternate keys" info
pub fn alternates_example(layout: &Layout) -> Option<(String, Vec<String>)> {
  let cell = layout
    .sections
    .first()?
    .groups
    .first()?
    .cells
    .iter()
    .flatten()
    .find(|c| c.id == "I")?;
  let primary = cell.main.primary.clone()?;
  let mut keys = vec![primary];
  keys.extend(
    cell
      .main
      .alternates
      .iter()
      .filter(|k| !k.starts_with('.'))
      .cloned(),
  );
  Some((cell.main.text.clone(), keys))
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn devanagari_typing_map() {
    let layout = build_layout(ScriptListEnum::Devanagari, None);
    assert!(layout.brahmic);
    let ids: Vec<SectionId> = layout.sections.iter().map(|s| s.id).collect();
    assert_eq!(
      ids,
      [
        SectionId::Svara,
        SectionId::Vyanjana,
        SectionId::Other,
        SectionId::Special
      ]
    );
    let svara = &layout.sections[0].groups[0];
    let a = svara.cells[0].as_ref().unwrap();
    assert_eq!(a.main.text, "अ");
    assert_eq!(a.main.primary.as_deref(), Some("a"));
    let aa = svara.cells[1].as_ref().unwrap();
    assert_eq!(aa.main.text, "आ");
    assert_eq!(aa.sign.as_ref().unwrap().text, "ा");
    let ka = &layout.sections[1].groups[0];
    assert_eq!(ka.columns, Some(5));
    assert_eq!(ka.cells[0].as_ref().unwrap().main.text, "क");
    assert!(layout.controls.as_ref().unwrap().separator.is_some());
    let (text, keys) = alternates_example(&layout).unwrap();
    assert_eq!(text, "ई");
    assert_eq!(keys[0], "I");
  }

  #[test]
  fn compare_has_other_texts() {
    let layout = build_layout(ScriptListEnum::Devanagari, Some(ScriptListEnum::Romanized));
    assert!(layout.controls.is_none());
    assert!(layout.sections.iter().all(|s| s.id != SectionId::Special));
    let ka = layout.sections[1].groups[0].cells[0].as_ref().unwrap();
    assert_eq!(ka.other.as_ref().unwrap().text, "k");
  }

  #[test]
  fn romanized_is_not_brahmic() {
    let layout = build_layout(ScriptListEnum::Romanized, None);
    assert!(!layout.brahmic);
    assert!(layout.controls.as_ref().unwrap().separator.is_none());
  }

  #[test]
  fn display_and_invisible() {
    assert_eq!(display_text("ा"), "◌ा");
    assert_eq!(display_text("क"), "क");
    assert!(is_invisible("\u{200d}"));
    assert!(!is_invisible("क"));
  }
}
