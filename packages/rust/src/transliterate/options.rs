use crate::custom_options::CustomOptions;
use crate::script_data::{CustomOptionScriptTypeEnum, Rule, ScriptData};
use alloc::vec::Vec;

/// maps the ScriptData type to Custom Option Script Type
fn custom_option_script_type_of(
    script_data: &ScriptData,
) -> crate::script_data::CustomOptionScriptTypeEnum {
    match script_data {
        ScriptData::Brahmic { .. } => crate::script_data::CustomOptionScriptTypeEnum::Brahmic,
        ScriptData::Other { .. } => crate::script_data::CustomOptionScriptTypeEnum::Other,
    }
}
/// also consider the all case for matching
fn custom_option_script_type_matches(
    expected: CustomOptionScriptTypeEnum,
    actual: CustomOptionScriptTypeEnum,
) -> bool {
    matches!(expected, CustomOptionScriptTypeEnum::All) || expected == actual
}
pub fn get_active_custom_options(
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    input_options: Option<&CustomOptions>,
) -> CustomOptions {
    let Some(input_options) = input_options else {
        return CustomOptions::default();
    };

    let from_script_name = &from_script_data.script_name;
    let to_script_name = &to_script_data.script_name;
    let custom_options_map = crate::script_data::get_custom_options_map();
    let mut active = CustomOptions::default();

    let from_type = custom_option_script_type_of(from_script_data);
    let to_type = custom_option_script_type_of(to_script_data);

    for (key, enabled) in input_options.as_entries() {
        let Some(option_info) = custom_options_map.get(key) else {
            continue;
        };

        let from_matches = option_info
            .from_script_type
            .is_some_and(|t| custom_option_script_type_matches(t, from_type))
            || option_info
                .from_script_name
                .as_ref()
                .is_some_and(|names| names.iter().any(|n| n == from_script_name));
        if !from_matches {
            continue;
        }

        let to_matches = option_info
            .to_script_type
            .is_some_and(|t| custom_option_script_type_matches(t, to_type))
            || option_info
                .to_script_name
                .as_ref()
                .is_some_and(|names| names.iter().any(|n| n == to_script_name));

        if from_matches && to_matches {
            active
                .try_set(key, enabled)
                .expect("CustomOptions keys must remain in sync with custom_options.json");
        }
    }

    active
}

#[derive(Debug, Clone)]
pub struct ResolvedTransliterationRules {
    pub trans_options: CustomOptions,
    pub custom_rules: Vec<&'static Rule>,
}
/// Resolves active options once and flattens enabled rules into a single list.
pub fn resolve_transliteration_rules(
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    transliteration_input_options: Option<&CustomOptions>,
) -> ResolvedTransliterationRules {
    // The overwhelmingly common API call has no custom options. Avoid loading
    // and scanning custom-option data when every option is necessarily disabled.
    if transliteration_input_options.is_none() {
        return ResolvedTransliterationRules {
            trans_options: CustomOptions::default(),
            custom_rules: Vec::new(),
        };
    }

    let trans_options = get_active_custom_options(
        from_script_data,
        to_script_data,
        transliteration_input_options,
    );

    let custom_options_map = crate::script_data::get_custom_options_map();
    let mut custom_rules: Vec<&'static Rule> = Vec::new();

    for (key, enabled) in trans_options.as_entries() {
        if !enabled {
            continue;
        }
        if let Some(opt) = custom_options_map.get(key) {
            custom_rules.extend(opt.rules.iter());
        }
    }

    ResolvedTransliterationRules {
        trans_options,
        custom_rules,
    }
}
