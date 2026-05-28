#include "transliterate.hpp"
#include "../script_data/script_list.hpp"
#include "../utils/strings.hpp"
#include "../script_data/custom_options.hpp"
#include <stdexcept>
#include <algorithm>
#include <iostream>
#include <array>

namespace lipilekhika {

static bool is_skip_char(std::string_view c) {
    if (c.empty()) return false;
    unsigned char ch = static_cast<unsigned char>(c[0]);
    static const std::array<bool, 256> skip_table = []() {
        std::array<bool, 256> t = { false };
        t[' '] = true;
        t['\n'] = true;
        t['\r'] = true;
        t['\t'] = true;
        t[','] = true;
        t['~'] = true;
        t['!'] = true;
        t['@'] = true;
        t['?'] = true;
        t['%'] = true;
        return t;
    }();
    return skip_table[ch];
}

static CustomOptionScriptTypeEnum custom_option_script_type_of(const ScriptData& script_data) {
    if (std::holds_alternative<BrahmicScriptData>(script_data)) {
        return CustomOptionScriptTypeEnum::Brahmic;
    } else {
        return CustomOptionScriptTypeEnum::Other;
    }
}

static bool custom_option_script_type_matches(CustomOptionScriptTypeEnum expected, CustomOptionScriptTypeEnum actual) {
    return expected == CustomOptionScriptTypeEnum::All || expected == actual;
}

std::unordered_map<std::string, bool> get_active_custom_options(
    const ScriptData& from_script_data,
    const ScriptData& to_script_data,
    const std::unordered_map<std::string, bool>& input_options
) {
    if (input_options.empty()) {
        return {};
    }
    std::unordered_map<std::string, bool> active;
    const std::string& from_script_name = get_common_attr(from_script_data).script_name;
    const std::string& to_script_name = get_common_attr(to_script_data).script_name;
    
    const auto& custom_options_map = get_custom_options_map();
    active.reserve(input_options.size());
    
    auto from_type = custom_option_script_type_of(from_script_data);
    auto to_type = custom_option_script_type_of(to_script_data);

    for (const auto& [key, enabled] : input_options) {
        const CustomOptions* option_info = nullptr;
        for (const auto& pair : custom_options_map) {
            if (pair.first == key) {
                option_info = &pair.second;
                break;
            }
        }
        if (!option_info) {
            continue;
        }

        bool from_matches = false;
        if (option_info->from_script_type && custom_option_script_type_matches(*option_info->from_script_type, from_type)) {
            from_matches = true;
        } else if (option_info->from_script_name) {
            for (const auto& name : *option_info->from_script_name) {
                if (name == from_script_name) {
                    from_matches = true;
                    break;
                }
            }
        }

        if (!from_matches) {
            continue;
        }

        bool to_matches = false;
        if (option_info->to_script_type && custom_option_script_type_matches(*option_info->to_script_type, to_type)) {
            to_matches = true;
        } else if (option_info->to_script_name) {
            for (const auto& name : *option_info->to_script_name) {
                if (name == to_script_name) {
                    to_matches = true;
                    break;
                }
            }
        }

        if (from_matches && to_matches) {
            active[key] = enabled;
        }
    }

    return active;
}

ResolvedTransliterationRules resolve_transliteration_rules(
    const ScriptData& from_script_data,
    const ScriptData& to_script_data,
    const std::unordered_map<std::string, bool>& transliteration_input_options
) {
    auto trans_options = get_active_custom_options(
        from_script_data,
        to_script_data,
        transliteration_input_options
    );

    const auto& custom_options_map = get_custom_options_map();
    std::vector<const Rule*> custom_rules;

    for (const auto& pair : custom_options_map) {
        auto it = trans_options.find(pair.first);
        if (it != trans_options.end() && it->second) {
            for (const auto& r : pair.second.rules) {
                custom_rules.push_back(&r);
            }
        }
    }

    return { trans_options, custom_rules };
}

static bool check_should_use_replace(const Rule* rule, CheckInEnum allowed) {
    return std::visit([allowed](const auto& r) -> bool {
        return r.use_replace && *r.use_replace && r.check_in && *r.check_in == allowed;
    }, *rule);
}

static std::string get_rule_replace_text(const Rule* rule, const ScriptData& script_data) {
    return std::visit([&script_data](const auto& r) -> std::string {
        std::string res;
        for (int16_t k : r.replace_with) {
            res.append(krama_text_or_empty(script_data, k));
        }
        return res;
    }, *rule);
}

static void apply_custom_replace_rules_inplace(
    std::string& res,
    const ScriptData& script_data,
    const std::vector<const Rule*>& rules,
    CheckInEnum allowed_input_rule_type
) {
    if (rules.empty()) {
        return;
    }

    for (const Rule* rule : rules) {
        if (!check_should_use_replace(rule, allowed_input_rule_type)) {
            continue;
        }

        std::visit([&res, &script_data, rule](const auto& r) {
            using T = std::decay_t<decltype(r)>;
            if constexpr (std::is_same_v<T, RuleReplacePrevKramaKeys>) {
                std::string prev_string;
                for (int16_t p : r.prev) {
                    prev_string.append(krama_text_or_empty(script_data, p));
                }
                std::string repl_text = get_rule_replace_text(rule, script_data);

                for (int16_t follow_krama_index : r.following) {
                    auto follow_krama_string = krama_text_or_empty(script_data, follow_krama_index);
                    if (follow_krama_string.empty()) {
                        continue;
                    }

                    std::string search = prev_string + std::string(follow_krama_string);
                    std::string replace = repl_text + std::string(follow_krama_string);

                    size_t pos = 0;
                    while ((pos = res.find(search, pos)) != std::string::npos) {
                        res.replace(pos, search.length(), replace);
                        pos += replace.length();
                    }
                }
            } else if constexpr (std::is_same_v<T, RuleDirectReplace>) {
                std::string replace_with = r.replace_text ? *r.replace_text : get_rule_replace_text(rule, script_data);

                for (const auto& grp : r.to_replace) {
                    std::string to_replace_string;
                    for (int16_t k : grp) {
                        to_replace_string.append(krama_text_or_empty(script_data, k));
                    }

                    if (!to_replace_string.empty()) {
                        size_t pos = 0;
                        while ((pos = res.find(to_replace_string, pos)) != std::string::npos) {
                            res.replace(pos, to_replace_string.length(), replace_with);
                            pos += replace_with.length();
                        }
                    }
                }
            }
        }, *rule);
    }
}

struct TransliterateCtx {
    ScriptListEnum from_script;
    ScriptListEnum to_script;
    const ScriptData& from_script_data;
    const ScriptData& to_script_data;
    const std::vector<const Rule*>& custom_rules;
    InputTextCursor& cursor;
    ResultStringBuilder& result;
    PrevContextBuilder& prev_context;
    bool prev_context_in_use;
    std::optional<std::string_view> brahmic_halant;
    std::optional<std::string_view> brahmic_nuqta;
    bool typing_mode;
    bool include_inherent_vowels;
    bool use_conjunct_enabling_halant;
    bool use_typing_map;

    bool prev_context_cleanup(
        std::optional<PrevContextItem> item,
        std::optional<const std::vector<std::string>*> next,
        std::optional<bool> last_extra_call = std::nullopt
    ) {
        bool last_call = last_extra_call.value_or(false);
        bool result_str_concat_status = false;

        std::optional<std::string_view> item_text = std::nullopt;
        const List* item_type = nullptr;
        if (item) {
            if (item->first) item_text = *(item->first);
            item_type = item->second;
        }

        // custom cleanup logic/cases
        if (((brahmic_nuqta &&
              prev_context.type_at(-3) &&
              is_vyanjana(*(prev_context.type_at(-3))) &&
              prev_context.text_at(-2) == *brahmic_nuqta &&
              prev_context.type_at(-1) &&
              is_matra(*(prev_context.type_at(-1)))) ||
             (prev_context.type_at(-2) &&
              is_vyanjana(*(prev_context.type_at(-2))) &&
              prev_context.type_at(-1) &&
              is_matra(*(prev_context.type_at(-1))))) &&
            (!item || (item_type && is_anya(*item_type))))
        {
            prev_context.clear();
        }

        if (std::holds_alternative<BrahmicScriptData>(from_script_data) &&
            std::holds_alternative<OtherScriptData>(to_script_data))
        {
            bool ta_ext_case = true;
            if (is_script_tamil_ext(from_script)) {
                std::optional<std::string_view> item_first_char = std::nullopt;
                if (item_text && !item_text->empty()) {
                    item_first_char = get_first_utf8_char(*item_text);
                }
                std::optional<std::string_view> halant_first_char = std::nullopt;
                if (brahmic_halant && !brahmic_halant->empty()) {
                    halant_first_char = get_first_utf8_char(*brahmic_halant);
                }
                ta_ext_case = (item_first_char != halant_first_char);
            }

            bool vyanjana_case = (!brahmic_nuqta || item_text != *brahmic_nuqta) &&
                ((prev_context.type_at(-1) && is_vyanjana(*(prev_context.type_at(-1)))) ||
                 (brahmic_halant &&
                  prev_context.type_at(-2) &&
                  is_vyanjana(*(prev_context.type_at(-2))) &&
                  prev_context.text_at(-1) == brahmic_nuqta));

            bool to_anya_or_null = (!item_type || !is_matra(*item_type) && item_text != brahmic_halant) ||
                (item_type && is_anya(*item_type));

            if (item_text != brahmic_halant &&
                ta_ext_case &&
                vyanjana_case &&
                to_anya_or_null)
            {
                const auto& schwa = std::get<OtherScriptData>(to_script_data).schwa_character;
                result.emit(schwa);
            }
        }
        else if (std::holds_alternative<OtherScriptData>(from_script_data) &&
                 std::holds_alternative<BrahmicScriptData>(to_script_data))
        {
            if (prev_context.type_at(-1) &&
                is_vyanjana(*(prev_context.type_at(-1))) &&
                (item_type && (is_matra(*item_type) || is_svara(*item_type))))
            {
                std::string linked_matra = "";
                if (item_type && is_svara(*item_type)) {
                    const auto& svara = std::get<ListSvara>(*item_type);
                    if (!svara.matra_krama_ref.empty()) {
                        linked_matra = std::string(krama_text_or_empty(to_script_data, svara.matra_krama_ref[0]));
                    }
                } else if (item_text) {
                    linked_matra = std::string(*item_text);
                }

                const auto& to_brahmic = std::get<BrahmicScriptData>(to_script_data);
                result.emit_pieces_with_reorder(
                    std::vector<std::string>{linked_matra},
                    to_brahmic.halant,
                    is_script_tamil_ext(to_script) && is_ta_ext_superscript_tail(result.last_char())
                );
                result_str_concat_status = true;
            }
            else if (!include_inherent_vowels &&
                     (prev_context.type_at(-1) && is_vyanjana(*(prev_context.type_at(-1)))) &&
                     !(item_text == brahmic_halant || (item_type && is_matra(*item_type))))
            {
                if (brahmic_halant) {
                    const auto& to_brahmic = std::get<BrahmicScriptData>(to_script_data);
                    bool should_reorder = is_script_tamil_ext(to_script) && is_ta_ext_superscript_tail(result.last_char());
                    result.emit_pieces_with_reorder(
                        std::vector<std::string>{std::string(*brahmic_halant)},
                        to_brahmic.halant,
                        should_reorder
                    );

                    if (to_script == ScriptListEnum::Sinhala && use_conjunct_enabling_halant) {
                        if (auto last_piece = result.last_piece()) {
                            result.rewrite_at(-1, std::string(*last_piece) + "\u200D");
                        }
                    }
                }
            }
            else if (include_inherent_vowels &&
                     item &&
                     item_type && is_vyanjana(*item_type) &&
                     ((prev_context.type_at(-1) && is_vyanjana(*(prev_context.type_at(-1)))) ||
                      (brahmic_nuqta &&
                       prev_context.type_at(-2) && is_vyanjana(*(prev_context.type_at(-2))) &&
                       prev_context.text_at(-1) == *brahmic_nuqta)))
            {
                if (brahmic_halant) {
                    const auto& to_brahmic = std::get<BrahmicScriptData>(to_script_data);
                    bool should_reorder = is_script_tamil_ext(to_script) && is_ta_ext_superscript_tail(result.last_char());
                    result.emit_pieces_with_reorder(
                        std::vector<std::string>{std::string(*brahmic_halant)},
                        to_brahmic.halant,
                        should_reorder
                    );

                    if (to_script == ScriptListEnum::Sinhala && use_conjunct_enabling_halant) {
                        if (auto last_piece = result.last_piece()) {
                            result.rewrite_at(-1, std::string(*last_piece) + "\u200D");
                        }
                    }
                }
            }
        }

        // custom typing mode context clear logic
        bool to_clear_context = false;
        if (typing_mode &&
            (!next || !(*next) || (*next)->empty()) &&
            !last_call &&
            !(is_script_tamil_ext(to_script) && is_ta_ext_superscript_tail(result.last_char())))
        {
            to_clear_context = true;
            if (item_type && is_vyanjana(*item_type)) {
                to_clear_context = false;
            }
            if (to_clear_context) {
                prev_context.clear();
            }
        }

        // addition and shifting
        if ((!typing_mode || (!last_call && !to_clear_context)) && item) {
            prev_context.push(*item);
        }

        return result_str_concat_status;
    }

    void apply_custom_trans_rules(ssize_t text_index, ssize_t delta) {
        ssize_t current_text_index = text_index + delta;

        for (const Rule* rule_ptr : custom_rules) {
            bool use_rep = std::visit([](const auto& r) -> bool {
                return r.use_replace && *(r.use_replace);
            }, *rule_ptr);
            if (use_rep) {
                continue;
            }

            std::visit([&](const auto& r) {
                using T = std::decay_t<decltype(r)>;
                if constexpr (std::is_same_v<T, RuleReplacePrevKramaKeys>) {
                    bool has_neg = false;
                    for (int16_t p : r.prev) {
                        if (p < 0) { has_neg = true; break; }
                    }
                    if (has_neg) return;

                    bool is_check_in_input = !r.check_in || *(r.check_in) != CheckInEnum::Output;
                    if (is_check_in_input) {
                        if (current_text_index < 0 || text_index < 0) {
                            return;
                        }
                        auto prev_match = match_prev_krama_sequence(
                            from_script_data,
                            [&](ssize_t i) -> std::optional<std::string_view> {
                                return cursor.peek_at_str(static_cast<size_t>(i));
                            },
                            current_text_index,
                            r.prev
                        );

                        if (prev_match.matched) {
                            if (auto next_ch = cursor.peek_at(static_cast<size_t>(text_index))) {
                                if (auto next_idx = krama_index_of_text(from_script_data, *next_ch)) {
                                    int16_t next_i16 = static_cast<int16_t>(*next_idx);
                                    bool found_following = false;
                                    for (int16_t f : r.following) {
                                        if (f == next_i16) { found_following = true; break; }
                                    }
                                    if (found_following) {
                                        auto pieces = replace_with_pieces(to_script_data, r.replace_with);
                                        result.rewrite_tail_pieces(prev_match.matched_len, pieces);
                                    }
                                }
                            }
                        }
                    } else {
                        // output
                        auto last_piece = result.last_piece();
                        if (!last_piece) return;

                        if (auto following_idx = krama_index_of_text(to_script_data, *last_piece)) {
                            int16_t following_i16 = static_cast<int16_t>(*following_idx);
                            bool found_following = false;
                            for (int16_t f : r.following) {
                                if (f == following_i16) { found_following = true; break; }
                            }
                            if (!found_following) return;

                            auto prev_match = match_prev_krama_sequence(
                                to_script_data,
                                [&](ssize_t i) -> std::optional<std::string_view> {
                                    return result.peek_at(i);
                                },
                                -2,
                                r.prev
                            );
                            if (prev_match.matched) {
                                std::string last_piece_owned = std::string(*last_piece);
                                auto pieces = replace_with_pieces(to_script_data, r.replace_with);
                                pieces.push_back(last_piece_owned);
                                result.rewrite_tail_pieces(prev_match.matched_len + 1, pieces);
                            }
                        }
                    }
                } else if constexpr (std::is_same_v<T, RuleDirectReplace>) {
                    const ScriptData& lookup_data = (r.check_in && *(r.check_in) == CheckInEnum::Output) ? to_script_data : from_script_data;

                    for (const auto& search_group : r.to_replace) {
                        bool has_neg = false;
                        for (int16_t p : search_group) {
                            if (p < 0) { has_neg = true; break; }
                        }
                        if (has_neg) continue;

                        auto matched = match_prev_krama_sequence(
                            lookup_data,
                            [&](ssize_t i) -> std::optional<std::string_view> {
                                return result.peek_at(i);
                            },
                            -1,
                            search_group
                        );
                        if (!matched.matched) {
                            continue;
                        }
                        if (r.replace_text) {
                            result.rewrite_tail_pieces(matched.matched_len, std::vector<std::string>{*(r.replace_text)});
                        } else {
                            auto pieces = replace_with_pieces(lookup_data, r.replace_with);
                            result.rewrite_tail_pieces(matched.matched_len, pieces);
                        }
                        break;
                    }
                }
            }, *rule_ptr);
        }
    }
};

TransliterationOutput transliterate_text_core(
    const std::string& input_text,
    ScriptListEnum from_script,
    ScriptListEnum to_script,
    const ScriptData& from_script_data,
    const ScriptData& to_script_data,
    const std::vector<const Rule*>& custom_rules,
    TransliterationFnOptions opts
) {
    std::string modified_text_buf;
    std::string_view text;

    if (opts.typing_mode && from_script == ScriptListEnum::Normal) {
        modified_text_buf = apply_typing_input_aliases(input_text, to_script);
        text = modified_text_buf;
    } else {
        text = input_text;
    }

    if (!custom_rules.empty()) {
        if (modified_text_buf.empty()) {
            modified_text_buf = input_text;
        }
        apply_custom_replace_rules_inplace(
            modified_text_buf,
            from_script_data,
            custom_rules,
            CheckInEnum::Input
        );
        text = modified_text_buf;
    }

    ResultStringBuilder result;
    InputTextCursor cursor(text);
    PrevContextBuilder prev_context(3);

    bool prev_context_in_use = (std::holds_alternative<BrahmicScriptData>(from_script_data) && std::holds_alternative<OtherScriptData>(to_script_data))
        || (std::holds_alternative<OtherScriptData>(from_script_data) && std::holds_alternative<BrahmicScriptData>(to_script_data))
        || (opts.typing_mode && from_script == ScriptListEnum::Normal && std::holds_alternative<OtherScriptData>(to_script_data));

    std::optional<std::string_view> brahmic_nuqta = std::nullopt;
    std::optional<std::string_view> brahmic_halant = std::nullopt;

    if (std::holds_alternative<BrahmicScriptData>(from_script_data) && std::holds_alternative<OtherScriptData>(to_script_data)) {
        const auto& b = std::get<BrahmicScriptData>(from_script_data);
        if (b.nuqta) brahmic_nuqta = *b.nuqta;
        brahmic_halant = b.halant;
    } else if (std::holds_alternative<OtherScriptData>(from_script_data) && std::holds_alternative<BrahmicScriptData>(to_script_data)) {
        const auto& b = std::get<BrahmicScriptData>(to_script_data);
        if (b.nuqta) brahmic_nuqta = *b.nuqta;
        brahmic_halant = b.halant;
    }

    bool use_typing_map = (opts.use_typing_chars || opts.typing_mode) && from_script == ScriptListEnum::Normal;

    const ScriptData& text_to_krama_lookup_script_data = use_typing_map ? to_script_data : from_script_data;
    const auto& from_text_to_krama_map = use_typing_map ? get_common_attr(to_script_data).typing_text_to_krama_map : get_common_attr(from_script_data).text_to_krama_map;

    ssize_t ignore_ta_ext_sup_num_text_index = -1;

    bool is_from_tamil_ext_ = is_script_tamil_ext(from_script);
    bool is_to_tamil_ext_ = is_script_tamil_ext(to_script);

    bool opt_preserve_specific_chars_ = opts.preserve_specific_chars && to_script == ScriptListEnum::Normal;

    TransliterateCtx ctx = {
        from_script,
        to_script,
        from_script_data,
        to_script_data,
        custom_rules,
        cursor,
        result,
        prev_context,
        prev_context_in_use,
        brahmic_halant,
        brahmic_nuqta,
        opts.typing_mode,
        opts.include_inherent_vowel,
        opts.use_conjunct_enabling_halant,
        use_typing_map
    };

    size_t chars_len = ctx.cursor.char_count();
    const TextToKramaMapItem* text_to_krama_item = nullptr;

    while (ctx.cursor.pos() < chars_len) {
        size_t text_index = ctx.cursor.pos();
        auto ch_opt = ctx.cursor.peek();
        if (!ch_opt) break;
        std::string_view ch = *ch_opt;

        if (ignore_ta_ext_sup_num_text_index != -1 && static_cast<ssize_t>(text_index) >= ignore_ta_ext_sup_num_text_index) {
            ignore_ta_ext_sup_num_text_index = -1;
            ctx.cursor.advance(1);
            continue;
        }

        if (is_skip_char(ch)) {
            ctx.cursor.advance(1);
            if (ctx.prev_context_in_use) {
                ctx.prev_context_cleanup(PrevContextItem{ " ", nullptr }, std::nullopt);
                ctx.prev_context.clear();
            }
            ctx.result.emit(ch);
            continue;
        }

        if (ch.length() == 1 && std::isdigit(ch[0]) && !opts.use_native_numerals) {
            ctx.result.emit(ch);
            ctx.cursor.advance(1);
            ctx.prev_context_cleanup(PrevContextItem{ ch, nullptr }, std::nullopt);
            continue;
        }

        if (opt_preserve_specific_chars_) {
            auto idx = custom_script_char_index_of_text(from_script_data, ch);
            if (idx) {
                const auto& custom_item = get_common_attr(from_script_data).custom_script_chars_arr[*idx];
                const List* list_item = nullptr;
                if (custom_item.val1) {
                    list_item = &get_common_attr(from_script_data).list[*custom_item.val1];
                }
                ctx.prev_context_cleanup(PrevContextItem{ custom_item.text, list_item }, std::nullopt);

                std::string normal_text = "";
                if (custom_item.val2) {
                    normal_text = get_common_attr(from_script_data).typing_text_to_krama_map[*custom_item.val2].text;
                }
                ctx.result.emit(normal_text);
                ctx.cursor.advance(utf8_char_count(custom_item.text));
                continue;
            }
        }

        std::optional<size_t> text_to_krama_item_index = std::nullopt;
        text_to_krama_item = nullptr;
        {
            size_t scan_units = 0;
            std::optional<size_t> last_valid_vowel_match_index = std::nullopt;
            bool check_vowel_retraction = ctx.prev_context_in_use
                && std::holds_alternative<OtherScriptData>(from_script_data)
                && std::holds_alternative<BrahmicScriptData>(to_script_data)
                && ((ctx.prev_context.type_at(-1) && is_vyanjana(*(ctx.prev_context.type_at(-1))))
                    || (ctx.brahmic_nuqta &&
                        ctx.prev_context.type_at(-2) && is_vyanjana(*(ctx.prev_context.type_at(-2))) &&
                        ctx.prev_context.text_at(-1) == ctx.brahmic_nuqta));

            while (true) {
                auto next_char = ctx.cursor.peek_at(text_index + scan_units + 1);

                if (ignore_ta_ext_sup_num_text_index != -1 && next_char && is_ta_ext_superscript_tail(next_char)) {
                    scan_units += 1;
                }

                size_t end_index = text_index + scan_units + 1;
                std::string_view char_to_search;
                std::string temp_search_buf;
                if (ignore_ta_ext_sup_num_text_index != -1) {
                    auto a = ctx.cursor.slice(text_index, ignore_ta_ext_sup_num_text_index);
                    auto b = (end_index > static_cast<size_t>(ignore_ta_ext_sup_num_text_index)) ?
                        ctx.cursor.slice(ignore_ta_ext_sup_num_text_index + 1, end_index) : std::nullopt;
                    temp_search_buf = std::string(a.value_or("")) + std::string(b.value_or(""));
                    char_to_search = temp_search_buf;
                } else {
                    char_to_search = ctx.cursor.slice(text_index, end_index).value_or("");
                }

                auto potential_match_index = text_to_krama_map_index(text_to_krama_lookup_script_data, char_to_search, use_typing_map);
                if (!potential_match_index) {
                    text_to_krama_item_index = std::nullopt;
                    break;
                }

                const auto& potential_match = from_text_to_krama_map[*potential_match_index];

                if (check_vowel_retraction && potential_match.map.krama && !potential_match.map.krama->empty()) {
                    int16_t krama_id = (*potential_match.map.krama)[0];
                    if (krama_id >= 0) {
                        auto list_idx = get_common_attr(to_script_data).krama_text_arr[krama_id].value;
                        const List* list_type = list_idx ? &get_common_attr(to_script_data).list[*list_idx] : nullptr;
                        bool is_single_vowel = potential_match.map.krama->size() == 1 && list_type && (is_svara(*list_type) || is_matra(*list_type));
                        if (is_single_vowel) {
                            last_valid_vowel_match_index = potential_match_index;
                        } else if (last_valid_vowel_match_index) {
                            text_to_krama_item_index = last_valid_vowel_match_index;
                            break;
                        }
                    }
                }

                if (potential_match.map.next && !potential_match.map.next->empty()) {
                    auto nth_next = ctx.cursor.peek_at(end_index);

                    if (is_from_tamil_ext_ && std::holds_alternative<BrahmicScriptData>(from_script_data)) {
                        auto n_1_th_next = nth_next ? ctx.cursor.peek_at(end_index + 1) : std::nullopt;
                        auto n_2_th_next = (nth_next && n_1_th_next) ? ctx.cursor.peek_at(end_index + 2) : std::nullopt;



                        if (ignore_ta_ext_sup_num_text_index == -1 &&
                            is_ta_ext_superscript_tail(n_1_th_next) &&
                            [&]() -> bool {
                                for (const auto& x : *potential_match.map.next) {
                                    if (*n_1_th_next == x) return true;
                                }
                                return false;
                            }())
                        {
                            std::string search_str = std::string(char_to_search) + std::string(*n_1_th_next);
                            auto char_index = text_to_krama_map_index(from_script_data, search_str, false);
                            auto nth_char_text_index = nth_next ? krama_index_of_text(from_script_data, *nth_next) : std::nullopt;

                            if (char_index && nth_char_text_index) {
                                text_to_krama_item_index = char_index;

                                auto list_ref = get_common_attr(from_script_data).krama_text_arr[*nth_char_text_index].value;
                                const List* nth_char_type = list_ref ? &get_common_attr(from_script_data).list[*list_ref] : nullptr;

                                const auto& from_brahmic = std::get<BrahmicScriptData>(from_script_data);
                                if ((nth_next && *nth_next == from_brahmic.halant) || (nth_char_type && is_matra(*nth_char_type))) {
                                    ignore_ta_ext_sup_num_text_index = static_cast<ssize_t>(end_index + (nth_next ? 1 : 0));
                                    break;
                                }
                            }
                        }
                        else if (ignore_ta_ext_sup_num_text_index == -1 &&
                                 is_ta_ext_superscript_tail(n_2_th_next) &&
                                 [&]() -> bool {
                                     for (const auto& x : *potential_match.map.next) {
                                         if (*n_2_th_next == x) return true;
                                     }
                                     return false;
                                 }())
                        {
                            std::string search_str = std::string(char_to_search) + std::string(*n_2_th_next);
                            auto char_index = text_to_krama_map_index(from_script_data, search_str, false);
                            
                            auto nth_char_text_index = nth_next ? krama_index_of_text(from_script_data, *nth_next) : std::nullopt;
                            auto n1_char_text_index = n_1_th_next ? krama_index_of_text(from_script_data, *n_1_th_next) : std::nullopt;

                            if (char_index && nth_char_text_index && n1_char_text_index)
                            {
                                text_to_krama_item_index = char_index;

                                auto list_ref_nth = get_common_attr(from_script_data).krama_text_arr[*nth_char_text_index].value;
                                const List* nth_char_type = list_ref_nth ? &get_common_attr(from_script_data).list[*list_ref_nth] : nullptr;

                                auto list_ref_n1 = get_common_attr(from_script_data).krama_text_arr[*n1_char_text_index].value;
                                const List* n_1_th_char_type = list_ref_n1 ? &get_common_attr(from_script_data).list[*list_ref_n1] : nullptr;

                                if (nth_char_type && is_matra(*nth_char_type) && n_1_th_char_type && is_matra(*n_1_th_char_type)) {
                                    ignore_ta_ext_sup_num_text_index = static_cast<ssize_t>(end_index + (nth_next ? 1 : 0) + (n_1_th_next ? 1 : 0));
                                    break;
                                }
                            }
                        }

                        if (ignore_ta_ext_sup_num_text_index == -1 &&
                                 nth_next &&
                                 is_vedic_svara_tail(n_1_th_next) &&
                                 is_ta_ext_superscript_tail(n_2_th_next) &&
                                 [&]() -> bool {
                                     for (const auto& x : *potential_match.map.next) {
                                         if (*n_2_th_next == x) return true;
                                     }
                                     return false;
                                 }())
                        {
                            if (auto nth_char_text_index = krama_index_of_text(from_script_data, *nth_next)) {
                                auto list_ref_nth = get_common_attr(from_script_data).krama_text_arr[*nth_char_text_index].value;
                                const List* nth_char_type = list_ref_nth ? &get_common_attr(from_script_data).list[*list_ref_nth] : nullptr;

                                if (nth_char_type && is_matra(*nth_char_type)) {
                                    std::string search_str2 = std::string(char_to_search) + std::string(*n_2_th_next);
                                    auto char_index = text_to_krama_map_index(from_script_data, search_str2, false);
                                    if (char_index) {
                                        text_to_krama_item_index = char_index;
                                        ignore_ta_ext_sup_num_text_index = static_cast<ssize_t>(end_index + (nth_next ? 1 : 0) + (n_1_th_next ? 1 : 0));
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (nth_next && [&]() -> bool {
                        for (const auto& x : *potential_match.map.next) {
                            if (*nth_next == x) return true;
                        }
                        return false;
                    }()) {
                        scan_units += 1;
                        continue;
                    }
                }

                text_to_krama_item_index = potential_match_index;
                break;
            }
        }

        if (text_to_krama_item_index) {
            text_to_krama_item = &from_text_to_krama_map[*text_to_krama_item_index];
            const std::string& matched_text = text_to_krama_item->text;
            const TextToKramaMap& map = text_to_krama_item->map;

            bool is_type_vyanjana = false;
            if (map.krama && !map.krama->empty()) {
                int16_t first_krama = (*map.krama)[0];
                if (first_krama >= 0) {
                    auto list_idx = get_common_attr(ctx.from_script_data).krama_text_arr[first_krama].value;
                    if (list_idx) {
                        is_type_vyanjana = is_vyanjana(get_common_attr(ctx.from_script_data).list[*list_idx]);
                    }
                }
            }

            size_t matched_char_count = utf8_char_count(matched_text);
            size_t index_delete_length = 0;
            if (ignore_ta_ext_sup_num_text_index != -1 && matched_char_count > 1 && is_type_vyanjana) {
                auto last_ch = get_last_utf8_char(matched_text);
                if (is_ta_ext_superscript_tail(last_ch)) {
                    index_delete_length = 1;
                }
            }
            size_t matched_len_units = matched_char_count - index_delete_length;
            ctx.cursor.advance(matched_len_units);

            if ((ctx.typing_mode || ctx.use_typing_map) && map.custom_back_ref && *map.custom_back_ref >= 0) {
                const auto& custom_item = get_common_attr(to_script_data).custom_script_chars_arr[*map.custom_back_ref];
                ctx.result.emit(custom_item.text);
                const List* list_item = nullptr;
                if (custom_item.val1) {
                    list_item = &get_common_attr(to_script_data).list[*custom_item.val1];
                }
                const std::vector<std::string>* next_ptr = map.next ? &(*map.next) : nullptr;
                ctx.prev_context_cleanup(
                    PrevContextItem{ matched_text, list_item },
                    next_ptr
                );
                continue;
            }

            if (map.krama) {
                bool has_valid_krama = false;
                for (int16_t k : *map.krama) {
                    if (k != -1) { has_valid_krama = true; break; }
                }

                if (has_valid_krama) {
                    SmallStringViewVector pieces;
                    for (int16_t k : *map.krama) {
                        if (k >= 0) {
                            pieces.push_back(krama_text_or_empty(ctx.to_script_data, k));
                        }
                    }

                    bool result_concat_status = false;
                    if (ctx.prev_context_in_use) {
                        if (std::holds_alternative<BrahmicScriptData>(from_script_data) &&
                            std::holds_alternative<OtherScriptData>(to_script_data))
                        {
                            const List* item = nullptr;
                            if (map.fallback_list_ref && !(ctx.use_typing_map || ctx.typing_mode)) {
                                if (static_cast<size_t>(*map.fallback_list_ref) < get_common_attr(from_script_data).list.size()) {
                                    item = &get_common_attr(from_script_data).list[*map.fallback_list_ref];
                                }
                            }

                            if (!item && (!map.krama || map.krama->empty())) {
                                item = nullptr;
                            } else if (!item && map.krama) {
                                std::vector<const List*> list_refs;
                                for (int16_t x : *map.krama) {
                                    const List* r = nullptr;
                                    if (x >= 0) {
                                        const auto& arr = get_common_attr(from_script_data).krama_text_arr;
                                        if (static_cast<size_t>(x) < arr.size()) {
                                            auto list_ref = arr[x].value;
                                            if (list_ref) {
                                                r = &get_common_attr(from_script_data).list[*list_ref];
                                            }
                                        }
                                    }
                                    list_refs.push_back(r);
                                }

                                if (is_from_tamil_ext_ && [&list_refs]() {
                                    bool has_matra = false, has_vyanjana = false;
                                    for (const auto& r : list_refs) {
                                        if (r && is_matra(*r)) has_matra = true;
                                        if (r && is_vyanjana(*r)) has_vyanjana = true;
                                    }
                                    return has_matra && has_vyanjana;
                                }()) {
                                    if (!list_refs.empty() && list_refs.front()) {
                                        static const List static_anya_list = ListAnya{ {} };
                                        item = &static_anya_list;
                                    }
                                } else if (is_from_tamil_ext_ && list_refs.size() > 1 && [&list_refs]() {
                                    for (const auto& r : list_refs) if (!r) return true;
                                    return false;
                                }()) {
                                    if (!list_refs.empty() && list_refs.back()) {
                                        item = list_refs.back();
                                    }
                                } else {
                                    if (!list_refs.empty() && list_refs.front()) {
                                        item = list_refs.front();
                                    }
                                }
                            }

                            result_concat_status = ctx.prev_context_cleanup(
                                PrevContextItem{ matched_text, item },
                                std::nullopt
                            );
                        }
                        else if (std::holds_alternative<BrahmicScriptData>(to_script_data) &&
                                 std::holds_alternative<OtherScriptData>(from_script_data))
                        {
                            const List* item = nullptr;
                            if (map.fallback_list_ref) {
                                item = &get_common_attr(to_script_data).list[*map.fallback_list_ref];
                            } else if (map.krama && !map.krama->empty()) {
                                int16_t first_k = (*map.krama)[0];
                                if (first_k >= 0) {
                                    auto list_idx = get_common_attr(to_script_data).krama_text_arr[first_k].value;
                                    if (list_idx) {
                                        item = &get_common_attr(to_script_data).list[*list_idx];
                                    }
                                }
                            }

                            const std::vector<std::string>* next_list_ptr = nullptr;
                            if (opts.typing_mode && from_script == ScriptListEnum::Normal) {
                                if (map.next) next_list_ptr = &(*map.next);
                            }
                            result_concat_status = ctx.prev_context_cleanup(
                                PrevContextItem{ matched_text, item },
                                next_list_ptr
                            );
                        }
                        else if (opts.typing_mode && from_script == ScriptListEnum::Normal &&
                                 std::holds_alternative<OtherScriptData>(to_script_data))
                        {
                            const std::vector<std::string>* next_list_ptr = map.next ? &(*map.next) : nullptr;
                            result_concat_status = ctx.prev_context_cleanup(
                                PrevContextItem{ matched_text, nullptr },
                                next_list_ptr
                            );
                        }
                    }

                    if (!result_concat_status) {
                        if (std::holds_alternative<BrahmicScriptData>(to_script_data)) {
                            const auto& to_brahmic = std::get<BrahmicScriptData>(to_script_data);
                            if (is_to_tamil_ext_ && is_ta_ext_superscript_tail(ctx.result.last_char())) {
                                bool is_halant_or_matra = false;
                                if (pieces.size() == 1 && pieces[0] == to_brahmic.halant) {
                                    is_halant_or_matra = true;
                                } else if (map.krama && !map.krama->empty()) {
                                    int16_t last_k = map.krama->back();
                                    if (last_k >= 0) {
                                        auto list_idx = get_common_attr(to_script_data).krama_text_arr[last_k].value;
                                        if (list_idx && is_matra(get_common_attr(to_script_data).list[*list_idx])) {
                                            is_halant_or_matra = true;
                                        }
                                    }
                                }

                                if (is_halant_or_matra) {
                                    ctx.result.emit_pieces_with_reorder(pieces, to_brahmic.halant, true);
                                } else if (!pieces.empty() && is_vedic_svara_tail(InputTextCursor(pieces.back()).peek())) {
                                    auto last = ctx.result.pop_last_char().value_or("");
                                    ctx.result.emit_pieces(pieces);
                                    ctx.result.emit(last);
                                } else {
                                    ctx.result.emit_pieces(pieces);
                                }
                            } else {
                                ctx.result.emit_pieces(pieces);
                            }
                        } else {
                            ctx.result.emit_pieces(pieces);
                        }
                    }

                    ctx.apply_custom_trans_rules(ctx.cursor.pos(), -static_cast<ssize_t>(matched_len_units));
                    continue;
                } else {
                    bool contains_neg_one = false;
                    for (int16_t k : *map.krama) {
                        if (k == -1) { contains_neg_one = true; break; }
                    }
                    if (contains_neg_one) {
                        ctx.result.emit(matched_text);
                        if (opts.typing_mode) {
                            const std::vector<std::string>* next_ptr = map.next ? &(*map.next) : nullptr;
                            ctx.prev_context_cleanup(
                                PrevContextItem{ matched_text, nullptr },
                                next_ptr
                            );
                        }
                        continue;
                    }
                }
            }
        } else {
            ctx.cursor.advance(1);
            text_index = ctx.cursor.pos();
        }

        std::string_view char_to_search = text_to_krama_item ? std::string_view(text_to_krama_item->text) : ch;
        auto idx = krama_index_of_text(from_script_data, char_to_search);
        if (!idx) {
            if (ctx.prev_context_in_use) {
                ctx.prev_context_cleanup(PrevContextItem{ char_to_search, nullptr }, std::nullopt);
                ctx.prev_context.clear();
            }
            ctx.result.emit(char_to_search);
            continue;
        }

        bool result_concat_status = false;
        if (ctx.prev_context_in_use) {
            if (std::holds_alternative<BrahmicScriptData>(from_script_data)) {
                auto list_idx = get_common_attr(from_script_data).krama_text_arr[*idx].value;
                const List* item = nullptr;
                if (list_idx) item = &get_common_attr(from_script_data).list[*list_idx];
                result_concat_status = ctx.prev_context_cleanup(PrevContextItem{ char_to_search, item }, std::nullopt);
            } else if (std::holds_alternative<BrahmicScriptData>(to_script_data)) {
                auto list_idx = get_common_attr(to_script_data).krama_text_arr[*idx].value;
                const List* item = nullptr;
                if (list_idx) item = &get_common_attr(to_script_data).list[*list_idx];
                result_concat_status = ctx.prev_context_cleanup(PrevContextItem{ char_to_search, item }, std::nullopt);
            }
        }

        if (!result_concat_status) {
            std::string piece = std::string(krama_text_or_empty(to_script_data, *idx));
            std::vector<std::string> pieces = { piece };
            if (std::holds_alternative<BrahmicScriptData>(to_script_data)) {
                const auto& to_brahmic = std::get<BrahmicScriptData>(to_script_data);
                if (is_to_tamil_ext_ && is_ta_ext_superscript_tail(ctx.result.last_char())) {
                    bool is_halant_or_matra = false;
                    if (piece == to_brahmic.halant) {
                        is_halant_or_matra = true;
                    } else {
                        auto list_idx = get_common_attr(to_script_data).krama_text_arr[*idx].value;
                        if (list_idx && is_matra(get_common_attr(to_script_data).list[*list_idx])) {
                            is_halant_or_matra = true;
                        }
                    }

                    if (is_halant_or_matra) {
                        ctx.result.emit_pieces_with_reorder(pieces, to_brahmic.halant, true);
                    } else if (is_vedic_svara_tail(InputTextCursor(piece).peek())) {
                        auto last = ctx.result.pop_last_char().value_or("");
                        ctx.result.emit(piece);
                        ctx.result.emit(last);
                    } else {
                        ctx.result.emit(piece);
                    }
                } else {
                    ctx.result.emit(piece);
                }
            } else {
                ctx.result.emit(piece);
            }
        }

        ctx.apply_custom_trans_rules(ctx.cursor.pos(), -1);
    }

    if (ctx.prev_context_in_use) {
        ctx.prev_context_cleanup(std::nullopt, std::nullopt, true);
    }

    std::string output = ctx.result.str();
    apply_custom_replace_rules_inplace(
        output,
        to_script_data,
        custom_rules,
        CheckInEnum::Output
    );

    return TransliterationOutput{ output, ctx.prev_context.length() };
}

static bool is_option_active_for_scripts(
    const CustomOptions& option_info,
    const ScriptData& from_script_data,
    const ScriptData& to_script_data
) {
    auto from_type = custom_option_script_type_of(from_script_data);
    auto to_type = custom_option_script_type_of(to_script_data);
    const std::string& from_script_name = get_common_attr(from_script_data).script_name;
    const std::string& to_script_name = get_common_attr(to_script_data).script_name;

    bool from_matches = false;
    if (option_info.from_script_type && custom_option_script_type_matches(*option_info.from_script_type, from_type)) {
        from_matches = true;
    } else if (option_info.from_script_name) {
        for (const auto& name : *option_info.from_script_name) {
            if (name == from_script_name) {
                from_matches = true;
                break;
            }
        }
    }

    if (!from_matches) {
        return false;
    }

    bool to_matches = false;
    if (option_info.to_script_type && custom_option_script_type_matches(*option_info.to_script_type, to_type)) {
        to_matches = true;
    } else if (option_info.to_script_name) {
        for (const auto& name : *option_info.to_script_name) {
            if (name == to_script_name) {
                to_matches = true;
                break;
            }
        }
    }

    return from_matches && to_matches;
}

static bool is_option_enabled_and_active(
    const std::string& key,
    const std::unordered_map<std::string, bool>& input_options,
    const ScriptData& from_script_data,
    const ScriptData& to_script_data
) {
    if (input_options.empty()) {
        return false;
    }
    auto it = input_options.find(key);
    if (it == input_options.end() || !it->second) {
        return false;
    }
    const auto& custom_options_map = get_custom_options_map();
    for (const auto& pair : custom_options_map) {
        if (pair.first == key) {
            return is_option_active_for_scripts(pair.second, from_script_data, to_script_data);
        }
    }
    return false;
}

TransliterationOutput transliterate_text(
    const std::string& text,
    ScriptListEnum from_script,
    ScriptListEnum to_script,
    const std::unordered_map<std::string, bool>& transliteration_input_options,
    std::optional<TransliterationFnOptions> options
) {
    const auto& from_data = get_script_data(from_script);
    const auto& to_data = get_script_data(to_script);

    std::vector<const Rule*> custom_rules;
    if (!transliteration_input_options.empty()) {
        const auto& custom_options_map = get_custom_options_map();
        for (const auto& pair : custom_options_map) {
            auto it = transliteration_input_options.find(pair.first);
            if (it != transliteration_input_options.end() && it->second) {
                if (is_option_active_for_scripts(pair.second, from_data, to_data)) {
                    for (const auto& r : pair.second.rules) {
                        custom_rules.push_back(&r);
                    }
                }
            }
        }
    }

    TransliterationFnOptions opts = options.value_or(TransliterationFnOptions{});
    opts.use_conjunct_enabling_halant = is_option_enabled_and_active("all_to_sinhala:use_conjunct_enabling_halant", transliteration_input_options, from_data, to_data);
    opts.use_typing_chars = is_option_enabled_and_active("normal_to_all:use_typing_chars", transliteration_input_options, from_data, to_data);
    opts.preserve_specific_chars = is_option_enabled_and_active("all_to_normal:preserve_specific_chars", transliteration_input_options, from_data, to_data);

    return transliterate_text_core(
        text,
        from_script,
        to_script,
        from_data,
        to_data,
        custom_rules,
        opts
    );
}

} // namespace lipilekhika
