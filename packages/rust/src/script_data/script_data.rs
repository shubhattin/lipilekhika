use core::ops::Deref;
use hashbrown::HashMap;

use crate::scripts::ScriptListEnum;
use alloc::string::String;

use super::char_table::CharIndexTable;
use super::data_blob::get_lipi_data;
use super::schema::{CommonScriptAttr, ScriptData};

impl Deref for ScriptData {
    type Target = CommonScriptAttr;
    /// Acts as a trick to access the common attributes as the compiles performs
    /// auto deref, eg :- data.script_id -> (*data).deref().script_id.
    ///
    /// avoids calling the `self.get_common_attr`. Acts as a shorthand.
    /// Does not seem to have any performance issues so keeping it.
    fn deref(&self) -> &Self::Target {
        match &self {
            ScriptData::Brahmic {
                common_script_attr, ..
            }
            | ScriptData::Other {
                common_script_attr, ..
            } => common_script_attr,
        }
    }
}

impl ScriptData {
    #[allow(dead_code)]
    pub fn get_common_attr(&self) -> &CommonScriptAttr {
        match self {
            ScriptData::Brahmic {
                common_script_attr, ..
            }
            | ScriptData::Other {
                common_script_attr, ..
            } => common_script_attr,
        }
    }

    pub fn get_common_attr_mut(&mut self) -> &mut CommonScriptAttr {
        match self {
            ScriptData::Brahmic {
                common_script_attr, ..
            }
            | ScriptData::Other {
                common_script_attr, ..
            } => common_script_attr,
        }
    }

    pub fn init_lookups(&mut self) {
        fn single_char(text: &str) -> Option<char> {
            let mut chars = text.chars();
            let ch = chars.next()?;
            chars.next().is_none().then_some(ch)
        }
        fn char_table<'a>(keys: impl Iterator<Item = &'a String>) -> CharIndexTable {
            CharIndexTable::from_entries(
                keys.enumerate()
                    .filter_map(|(i, text)| single_char(text).map(|ch| (ch, i))),
            )
        }

        let halant = match self {
            ScriptData::Brahmic { halant, .. } => Some(halant.clone()),
            _ => None,
        };
        let attr = self.get_common_attr_mut();

        // a sign written as a consonant + halant (the Tamil anusvAra ம்)
        attr.dead_consonant_sign_index = halant.and_then(|halant| {
            let list_item = |krama_index: Option<usize>| {
                krama_index
                    .and_then(|i| attr.krama_text_arr.get(i))
                    .and_then(|(_, li)| *li)
                    .and_then(|li| attr.list.get(li as usize))
            };
            attr.text_to_krama_map.iter().position(|(text, map)| {
                let Some(&[sign]) = map.krama.as_deref() else {
                    return false;
                };
                if list_item(usize::try_from(sign).ok()).is_some_and(|k| k.is_vyanjana()) {
                    return false;
                }
                text.strip_suffix(halant.as_str()).is_some_and(|consonant| {
                    single_char(consonant).is_some()
                        && list_item(attr.krama_text_arr.iter().position(|(t, _)| t == consonant))
                            .is_some_and(|k| k.is_vyanjana())
                })
            })
        });

        for (_, map) in attr
            .text_to_krama_map
            .iter_mut()
            .chain(attr.typing_text_to_krama_map.iter_mut())
        {
            map.next_chars = map
                .next
                .iter()
                .flatten()
                .filter_map(|n| single_char(n))
                .collect();
        }

        let mut krama_text_lookup = HashMap::with_capacity(attr.krama_text_arr.len());
        for (i, (text, _)) in attr.krama_text_arr.iter().enumerate() {
            krama_text_lookup.entry(text.clone()).or_insert(i);
        }
        attr.krama_text_lookup = krama_text_lookup;
        attr.krama_text_char_lookup = char_table(attr.krama_text_arr.iter().map(|(t, _)| t));

        let mut text_to_krama_lookup = HashMap::with_capacity(attr.text_to_krama_map.len());
        for (i, (text, _)) in attr.text_to_krama_map.iter().enumerate() {
            text_to_krama_lookup.entry(text.clone()).or_insert(i);
        }
        attr.text_to_krama_lookup = text_to_krama_lookup;
        attr.text_to_krama_char_lookup = char_table(attr.text_to_krama_map.iter().map(|(t, _)| t));

        let mut typing_text_to_krama_lookup =
            HashMap::with_capacity(attr.typing_text_to_krama_map.len());
        for (i, (text, _)) in attr.typing_text_to_krama_map.iter().enumerate() {
            typing_text_to_krama_lookup.entry(text.clone()).or_insert(i);
        }
        attr.typing_text_to_krama_lookup = typing_text_to_krama_lookup;
        attr.typing_text_to_krama_char_lookup =
            char_table(attr.typing_text_to_krama_map.iter().map(|(t, _)| t));

        let mut custom_script_chars_lookup =
            HashMap::with_capacity(attr.custom_script_chars_arr.len());
        for (i, (text, _, _)) in attr.custom_script_chars_arr.iter().enumerate() {
            custom_script_chars_lookup.entry(text.clone()).or_insert(i);
        }
        attr.custom_script_chars_lookup = custom_script_chars_lookup;
    }
}

impl ScriptData {
    /// Returns the (lazily decoded) data of `script`.
    ///
    /// All scripts are decoded together from the embedded blob on first use.
    #[inline]
    pub fn get_script_data(script: &ScriptListEnum) -> &'static ScriptData {
        &get_lipi_data().script_data[*script as usize]
    }

    pub fn text_to_krama_map_index(&self, text: &str, use_typing_map: bool) -> Option<usize> {
        if use_typing_map {
            self.typing_text_to_krama_lookup.get(text).copied()
        } else {
            self.text_to_krama_lookup.get(text).copied()
        }
    }

    #[inline]
    pub fn text_to_krama_map_char_index(&self, ch: char, use_typing_map: bool) -> Option<usize> {
        if use_typing_map {
            self.typing_text_to_krama_char_lookup.get(ch)
        } else {
            self.text_to_krama_char_lookup.get(ch)
        }
    }

    pub fn custom_script_char_index_of_text(&self, text: &str) -> Option<usize> {
        self.custom_script_chars_lookup.get(text).copied()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scripts::SCRIPTS;
    use core::str::FromStr;

    #[test]
    fn all_scripts_have_data() {
        for (name, id) in SCRIPTS {
            let script = ScriptListEnum::from_str(name).unwrap();
            assert_eq!(ScriptListEnum::from_id(*id), Some(script));
            let data = ScriptData::get_script_data(&script);
            assert_eq!(data.script_name, *name);
            assert_eq!(data.script_id, *id);
        }
    }
}
