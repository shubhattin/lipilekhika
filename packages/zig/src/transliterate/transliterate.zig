const std = @import("std");
const script_data_mod = @import("../script_data/mod.zig");
const schema = @import("../script_data/schema.zig");
const store_mod = @import("../script_data/script_data.zig");
const custom_options_mod = @import("../script_data/custom_options.zig");
const helpers = @import("helpers.zig");

const Allocator = std.mem.Allocator;

const DEFAULT_USE_NATIVE_NUMERALS_MODE = true;
const DEFAULT_INCLUDE_INHERENT_VOWEL_MODE = false;
const CHARS_TO_SKIP = [_][]const u8{ " ", "\n", "\r", "\t", ",", "~", "!", "@", "?", "%" };
const MAX_CONTEXT_LENGTH: usize = 3;

pub const TransliterationFnOptions = struct {
    typing_mode: bool = false,
    use_native_numerals: bool = DEFAULT_USE_NATIVE_NUMERALS_MODE,
    include_inherent_vowel: bool = DEFAULT_INCLUDE_INHERENT_VOWEL_MODE,
};

pub const TransliterationOutput = struct {
    output: []const u8,
    context_length: usize,
};

pub const ResolvedTransliterationRules = struct {
    trans_options: std.StringHashMapUnmanaged(bool),
    custom_rules: []const schema.Rule,
};

const TransliterateCtx = struct {
    allocator: Allocator,
    from_script_name: []const u8,
    to_script_name: []const u8,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
    trans_options: *const std.StringHashMapUnmanaged(bool),
    custom_rules: []const schema.Rule,
    cursor: *helpers.InputTextCursor,
    result: *helpers.ResultStringBuilder,
    prev_context: *helpers.PrevContextBuilder,
    prev_context_in_use: bool,
    brahmic_halant: ?[]const u8,
    brahmic_nuqta: ?[]const u8,
    typing_mode: bool,
    include_inherent_vowels: bool,

    fn prevContextCleanup(
        self: *TransliterateCtx,
        item: ?helpers.PrevContextItem,
        next: ?[]const []const u8,
        last_extra_call: ?bool,
    ) !bool {
        const last_extra = last_extra_call orelse false;
        var result_concat_status = false;

        const item_text = if (item) |value| value.text else null;
        const item_type = if (item) |value| value.list else null;

        if (((self.brahmic_nuqta != null and
            listIsVyanjana(self.prev_context.typeAt(-3)) and
            helpers.optSliceEql(self.prev_context.textAt(-2), self.brahmic_nuqta) and
            listIsMatra(self.prev_context.typeAt(-1))) or
            (listIsVyanjana(self.prev_context.typeAt(-2)) and listIsMatra(self.prev_context.typeAt(-1)))) and
            (item == null or listIsAnya(item_type)))
        {
            self.prev_context.clear();
        }

        if (isBrahmic(self.from_script_data) and isOther(self.to_script_data)) {
            const ta_ext_case = if (helpers.isScriptTamilExt(self.from_script_name)) blk: {
                const item_head = if (item_text) |text| helpers.firstScalarSlice(text) else null;
                const halant_head = if (self.brahmic_halant) |text| helpers.firstScalarSlice(text) else null;
                break :blk !helpers.optSliceEql(item_head, halant_head);
            } else true;

            const vyanjana_case =
                (!helpers.optSliceEql(item_text, self.brahmic_nuqta)) and
                (listIsVyanjana(self.prev_context.typeAt(-1)) or
                    (self.brahmic_halant != null and
                        listIsVyanjana(self.prev_context.typeAt(-2)) and
                        helpers.optSliceEql(self.prev_context.textAt(-1), self.brahmic_nuqta)));

            const to_anya_or_null =
                ((!listIsMatra(item_type) and !helpers.optSliceEql(item_text, self.brahmic_halant)) or
                listIsAnya(item_type) or
                item_type == null);

            if (!helpers.optSliceEql(item_text, self.brahmic_halant) and ta_ext_case and vyanjana_case and to_anya_or_null) {
                switch (self.to_script_data.*) {
                    .other => |other| try self.result.emit(other.schwa_character),
                    else => {},
                }
            }
        } else if (isOther(self.from_script_data) and isBrahmic(self.to_script_data)) {
            if (listIsVyanjana(self.prev_context.typeAt(-1)) and (listIsMatra(item_type) or listIsSvara(item_type))) {
                var linked_matra: []const u8 = item_text orelse "";
                if (item_type) |item_list| {
                    switch (item_list) {
                        .svara => |svara| linked_matra = helpers.kramaTextOrEmpty(self.to_script_data, svara.matra_krama_ref[0]),
                        else => {},
                    }
                }

                switch (self.to_script_data.*) {
                    .brahmic => |brahmic| {
                        try self.result.emitPiecesWithReorder(
                            &.{linked_matra},
                            brahmic.halant,
                            helpers.isScriptTamilExt(self.to_script_name) and helpers.isTaExtSuperscriptTail(self.result.lastChar()),
                        );
                        result_concat_status = true;
                    },
                    else => {},
                }
            } else if (!self.include_inherent_vowels and
                listIsVyanjana(self.prev_context.typeAt(-1)) and
                !(helpers.optSliceEql(item_text, self.brahmic_halant) or listIsMatra(item_type)))
            {
                if (self.brahmic_halant) |halant_text| {
                    switch (self.to_script_data.*) {
                        .brahmic => |brahmic| {
                            try self.result.emitPiecesWithReorder(
                                &.{halant_text},
                                brahmic.halant,
                                helpers.isScriptTamilExt(self.to_script_name) and helpers.isTaExtSuperscriptTail(self.result.lastChar()),
                            );

                            if (std.mem.eql(u8, self.to_script_name, "Sinhala") and transOpt(self.trans_options, "all_to_sinhala:use_conjunct_enabling_halant")) {
                                if (self.result.lastPiece()) |last_piece| {
                                    const joined = try joinSlices(self.allocator, &.{ last_piece, "\u{200D}" });
                                    self.result.rewriteAt(-1, joined);
                                }
                            }
                        },
                        else => {},
                    }
                }
            } else if (self.include_inherent_vowels and
                item != null and
                listIsVyanjana(item_type) and
                (listIsVyanjana(self.prev_context.typeAt(-1)) or
                    (self.brahmic_nuqta != null and
                        listIsVyanjana(self.prev_context.typeAt(-2)) and
                        helpers.optSliceEql(self.prev_context.textAt(-1), self.brahmic_nuqta))))
            {
                if (self.brahmic_halant) |halant_text| {
                    switch (self.to_script_data.*) {
                        .brahmic => |brahmic| {
                            try self.result.emitPiecesWithReorder(
                                &.{halant_text},
                                brahmic.halant,
                                helpers.isScriptTamilExt(self.to_script_name) and helpers.isTaExtSuperscriptTail(self.result.lastChar()),
                            );

                            if (std.mem.eql(u8, self.to_script_name, "Sinhala") and transOpt(self.trans_options, "all_to_sinhala:use_conjunct_enabling_halant")) {
                                if (self.result.lastPiece()) |last_piece| {
                                    const joined = try joinSlices(self.allocator, &.{ last_piece, "\u{200D}" });
                                    self.result.rewriteAt(-1, joined);
                                }
                            }
                        },
                        else => {},
                    }
                }
            }
        }

        var to_clear_context = false;
        if (self.typing_mode and
            (next == null or next.?.len == 0) and
            !last_extra and
            !(helpers.isScriptTamilExt(self.to_script_name) and helpers.isTaExtSuperscriptTail(self.result.lastChar())))
        {
            to_clear_context = true;
            if (listIsVyanjana(item_type)) {
                to_clear_context = false;
            }
            if (to_clear_context) {
                self.prev_context.clear();
            }
        }

        if ((!self.typing_mode) or (!last_extra and !to_clear_context)) {
            if (item) |value| {
                try self.prev_context.push(value);
            }
        }

        return result_concat_status;
    }

    fn i16VecToUsizeVec(self: *TransliterateCtx, values: []const i16) !?[]const usize {
        var out = try self.allocator.alloc(usize, values.len);
        for (values, 0..) |value, index| {
            if (value < 0) {
                return null;
            }
            out[index] = @intCast(value);
        }
        return out;
    }

    fn applyCustomTransRules(self: *TransliterateCtx, text_index: isize, delta: isize) !void {
        const current_text_index = text_index + delta;

        for (self.custom_rules) |rule| {
            switch (rule) {
                .direct_replace => |value| if (value.use_replace == true) continue,
                .replace_prev_krama_keys => |value| if (value.use_replace == true) continue,
            }

            switch (rule) {
                .replace_prev_krama_keys => |value| {
                    const prev_arr_as_usize_opt = try self.i16VecToUsizeVec(value.prev);
                    const prev_arr_as_usize = prev_arr_as_usize_opt orelse continue;

                    const is_check_in_input = value.check_in != .output;
                    if (is_check_in_input) {
                        if (current_text_index < 0 or text_index < 0) continue;

                        const prev_match = helpers.matchPrevKramaSequence(
                            self.from_script_data,
                            self,
                            struct {
                                fn peek(ctx: *TransliterateCtx, i: isize) ?[]const u8 {
                                    if (i < 0) return null;
                                    return ctx.cursor.peekAtStr(@intCast(i));
                                }
                            }.peek,
                            current_text_index,
                            prev_arr_as_usize,
                        );

                        if (prev_match.matched) {
                            if (text_index >= 0) {
                                if (self.cursor.peekAt(@intCast(text_index))) |next_ch| {
                                    const next_idx = helpers.kramaIndexOfText(self.from_script_data, next_ch);
                                    if (next_idx) |next_index| {
                                        if (containsI16(value.following, @intCast(next_index))) {
                                            const pieces = try helpers.replaceWithPieces(self.allocator, self.to_script_data, value.replace_with);
                                            try self.result.rewriteTailPieces(prev_match.matched_len, pieces);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        const last_piece = self.result.lastPiece() orelse continue;
                        const following_idx = helpers.kramaIndexOfText(self.to_script_data, last_piece) orelse continue;
                        if (!containsI16(value.following, @intCast(following_idx))) continue;

                        const prev_match = helpers.matchPrevKramaSequence(
                            self.to_script_data,
                            self,
                            struct {
                                fn peek(ctx: *TransliterateCtx, i: isize) ?[]const u8 {
                                    return if (ctx.result.peekAt(i)) |cursor| cursor.ch else null;
                                }
                            }.peek,
                            -2,
                            prev_arr_as_usize,
                        );

                        if (prev_match.matched) {
                            var pieces = std.array_list.Managed([]const u8).init(self.allocator);
                            defer pieces.deinit();
                            const replace_pieces = try helpers.replaceWithPieces(self.allocator, self.to_script_data, value.replace_with);
                            for (replace_pieces) |piece| {
                                try pieces.append(piece);
                            }
                            try pieces.append(last_piece);
                            try self.result.rewriteTailPieces(prev_match.matched_len + 1, pieces.items);
                        }
                    }
                },
                .direct_replace => |value| {
                    const lookup_data = if (value.check_in == .output) self.to_script_data else self.from_script_data;
                    for (value.to_replace) |search_group| {
                        const sg_usize_opt = try self.i16VecToUsizeVec(search_group);
                        const sg_usize = sg_usize_opt orelse continue;
                        const matched = helpers.matchPrevKramaSequence(
                            lookup_data,
                            self,
                            struct {
                                fn peek(ctx: *TransliterateCtx, i: isize) ?[]const u8 {
                                    return if (ctx.result.peekAt(i)) |cursor| cursor.ch else null;
                                }
                            }.peek,
                            -1,
                            sg_usize,
                        );
                        if (!matched.matched) continue;

                        if (value.replace_text) |replace_text| {
                            try self.result.rewriteTailPieces(matched.matched_len, &.{replace_text});
                        } else {
                            const pieces = try helpers.replaceWithPieces(self.allocator, lookup_data, value.replace_with);
                            try self.result.rewriteTailPieces(matched.matched_len, pieces);
                        }
                        break;
                    }
                },
            }
        }
    }
};

pub fn getActiveCustomOptions(
    allocator: Allocator,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
    input_options: ?[]const script_data_mod.EnabledOption,
) !std.StringHashMapUnmanaged(bool) {
    var active: std.StringHashMapUnmanaged(bool) = .{};
    const custom_options_map = try store_mod.getCustomOptionsMap();
    const options = input_options orelse return active;

    try active.ensureTotalCapacity(allocator, @intCast(options.len));
    for (options) |option| {
        const option_info = custom_options_map.get(option.key) orelse continue;
        if (custom_options_mod.isOptionActiveForScripts(option_info, from_script_data, to_script_data)) {
            try active.put(allocator, option.key, option.enabled);
        }
    }

    return active;
}

pub fn resolveTransliterationRules(
    allocator: Allocator,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
    input_options: ?[]const script_data_mod.EnabledOption,
) !ResolvedTransliterationRules {
    var trans_options = try getActiveCustomOptions(allocator, from_script_data, to_script_data, input_options);
    const custom_options_map = try store_mod.getCustomOptionsMap();

    var custom_rules = std.array_list.Managed(schema.Rule).init(allocator);
    defer custom_rules.deinit();

    for (custom_options_map.keys(), custom_options_map.values()) |key, option| {
        if (trans_options.get(key) != true) continue;
        for (option.rules) |rule| {
            try custom_rules.append(rule);
        }
    }

    return .{
        .trans_options = trans_options,
        .custom_rules = try custom_rules.toOwnedSlice(),
    };
}

pub fn transliterateTextCore(
    allocator: Allocator,
    text_in: []const u8,
    from_script_name: []const u8,
    to_script_name: []const u8,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
    trans_options_in: *const std.StringHashMapUnmanaged(bool),
    custom_rules: []const schema.Rule,
    options: ?TransliterationFnOptions,
) !TransliterationOutput {
    const opts = options orelse TransliterationFnOptions{};

    if (opts.typing_mode and !std.mem.eql(u8, from_script_name, "Normal")) {
        return error.InvalidTypingModeScript;
    }

    var trans_options_owned: std.StringHashMapUnmanaged(bool) = .{};
    var trans_options = trans_options_in;
    if (opts.typing_mode) {
        try trans_options_owned.ensureTotalCapacity(allocator, trans_options_in.count() + 1);
        var iter = trans_options_in.iterator();
        while (iter.next()) |entry| {
            try trans_options_owned.put(allocator, entry.key_ptr.*, entry.value_ptr.*);
        }
        try trans_options_owned.put(allocator, "normal_to_all:use_typing_chars", true);
        trans_options = &trans_options_owned;
    }

    var text = text_in;
    if (opts.typing_mode and std.mem.eql(u8, from_script_name, "Normal")) {
        text = try helpers.applyTypingInputAliases(allocator, text, to_script_name);
    }

    text = try applyCustomReplaceRules(allocator, text, from_script_data, custom_rules, .input);

    var result = helpers.ResultStringBuilder.init(allocator);
    var cursor = try helpers.InputTextCursor.init(allocator, text);
    var prev_context = helpers.PrevContextBuilder.init(allocator, MAX_CONTEXT_LENGTH);

    const prev_context_in_use =
        (isBrahmic(from_script_data) and isOther(to_script_data)) or
        (isOther(from_script_data) and isBrahmic(to_script_data)) or
        (opts.typing_mode and std.mem.eql(u8, from_script_name, "Normal") and isOther(to_script_data));

    var brahmic_nuqta: ?[]const u8 = null;
    var brahmic_halant: ?[]const u8 = null;
    switch (from_script_data.*) {
        .brahmic => |brahmic| if (isOther(to_script_data)) {
            brahmic_nuqta = brahmic.nuqta;
            brahmic_halant = brahmic.halant;
        },
        else => {},
    }
    switch (to_script_data.*) {
        .brahmic => |brahmic| if (isOther(from_script_data)) {
            brahmic_nuqta = brahmic.nuqta;
            brahmic_halant = brahmic.halant;
        },
        else => {},
    }

    const use_typing_map = (transOpt(trans_options, "normal_to_all:use_typing_chars") or opts.typing_mode) and
        std.mem.eql(u8, from_script_name, "Normal");
    const text_to_krama_lookup_script_data = if (use_typing_map) to_script_data else from_script_data;
    const from_text_to_krama_map = if (use_typing_map)
        to_script_data.getCommonAttr().typing_text_to_krama_map
    else
        from_script_data.getCommonAttr().text_to_krama_map;

    var ignore_ta_ext_sup_num_text_index: isize = -1;

    var ctx = TransliterateCtx{
        .allocator = allocator,
        .from_script_name = from_script_name,
        .to_script_name = to_script_name,
        .from_script_data = from_script_data,
        .to_script_data = to_script_data,
        .trans_options = trans_options,
        .custom_rules = custom_rules,
        .cursor = &cursor,
        .result = &result,
        .prev_context = &prev_context,
        .prev_context_in_use = prev_context_in_use,
        .brahmic_halant = brahmic_halant,
        .brahmic_nuqta = brahmic_nuqta,
        .typing_mode = opts.typing_mode,
        .include_inherent_vowels = opts.include_inherent_vowel,
    };

    const chars_len = ctx.cursor.charCount();
    while (ctx.cursor.pos() < chars_len) {
        var text_index = ctx.cursor.pos();
        const ch = ctx.cursor.peek() orelse break;

        if (ignore_ta_ext_sup_num_text_index != -1 and @as(isize, @intCast(text_index)) >= ignore_ta_ext_sup_num_text_index) {
            ignore_ta_ext_sup_num_text_index = -1;
            ctx.cursor.advance(1);
            continue;
        }

        if (containsSlice(CHARS_TO_SKIP[0..], ch)) {
            ctx.cursor.advance(1);
            if (ctx.prev_context_in_use) {
                _ = try ctx.prevContextCleanup(.{ .text = " ", .list = null }, null, null);
                ctx.prev_context.clear();
            }
            try ctx.result.emit(ch);
            continue;
        }

        if (isSingleAsciiDigit(ch) and !opts.use_native_numerals) {
            try ctx.result.emit(ch);
            ctx.cursor.advance(1);
            _ = try ctx.prevContextCleanup(.{ .text = ch, .list = null }, null, null);
            continue;
        }

        if (transOpt(trans_options, "all_to_normal:preserve_specific_chars") and std.mem.eql(u8, to_script_name, "Normal")) {
            const idx = from_script_data.customScriptCharIndexOfText(ch);
            if (idx) |custom_idx| {
                const custom_item = from_script_data.getCommonAttr().custom_script_chars_arr[custom_idx];
                const list_item = if (custom_item.primary_ref) |i|
                    from_script_data.getCommonAttr().list[@intCast(i)]
                else
                    null;
                _ = try ctx.prevContextCleanup(.{ .text = custom_item.text, .list = list_item }, null, null);

                const normal_text = if (custom_item.secondary_ref) |back_ref|
                    from_script_data.getCommonAttr().typing_text_to_krama_map[@intCast(back_ref)].text
                else
                    "";
                try ctx.result.emit(normal_text);
                ctx.cursor.advance(utf8CharCount(custom_item.text));
                continue;
            }
        }

        const text_to_krama_item_index: ?usize = blk: {
            var scan_units: usize = 0;
            var last_valid_vowel_match_index: ?usize = null;
            const check_vowel_retraction = ctx.prev_context_in_use and
                isOther(from_script_data) and
                isBrahmic(to_script_data) and
                (listIsVyanjana(ctx.prev_context.typeAt(-1)) or
                    (ctx.brahmic_nuqta != null and
                        listIsVyanjana(ctx.prev_context.typeAt(-2)) and
                        helpers.optSliceEql(ctx.prev_context.textAt(-1), ctx.brahmic_nuqta)));

            while (true) {
                const next_char = ctx.cursor.peekAt(text_index + scan_units + 1);
                if (ignore_ta_ext_sup_num_text_index != -1 and next_char != null and helpers.isTaExtSuperscriptTail(next_char)) {
                    scan_units += 1;
                }

                const end_index = text_index + scan_units + 1;
                const char_to_search = if (ignore_ta_ext_sup_num_text_index != -1)
                    try joinIgnoringIndex(ctx.allocator, ctx.cursor, text_index, @intCast(ignore_ta_ext_sup_num_text_index), end_index)
                else
                    (try ctx.cursor.slice(text_index, end_index)).?;

                const potential_match_index = text_to_krama_lookup_script_data.textToKramaMapIndex(char_to_search, use_typing_map) orelse break :blk last_valid_vowel_match_index;
                const potential_match = from_text_to_krama_map[potential_match_index];

                if (check_vowel_retraction) {
                    if (potential_match.value.krama) |krama| {
                        if (krama.len > 0 and krama[0] >= 0) {
                            const list_idx = to_script_data.getCommonAttr().krama_text_arr[@intCast(krama[0])].list_arr_ref;
                            const list_type = if (list_idx) |li| to_script_data.getCommonAttr().list[@intCast(li)] else null;
                            const is_single_vowel = krama.len == 1 and (listIsSvara(list_type) or listIsMatra(list_type));
                            if (is_single_vowel) {
                                last_valid_vowel_match_index = potential_match_index;
                            } else if (last_valid_vowel_match_index != null) {
                                break :blk last_valid_vowel_match_index;
                            }
                        }
                    }
                }

                if (potential_match.value.next) |next_list| {
                    if (next_list.len > 0) {
                        const nth_next_character = ctx.cursor.peekAt(end_index);
                        if (helpers.isScriptTamilExt(from_script_name) and isBrahmic(from_script_data)) {
                            const n_1_th_next_character = if (nth_next_character != null) ctx.cursor.peekAt(end_index + 1) else null;
                            const n_2_th_next_character = if (nth_next_character != null and n_1_th_next_character != null) ctx.cursor.peekAt(end_index + 2) else null;

                            if (ignore_ta_ext_sup_num_text_index == -1 and
                                helpers.isTaExtSuperscriptTail(n_1_th_next_character) and
                                containsSlice(next_list, n_1_th_next_character.?))
                            {
                                const char_index = from_script_data.textToKramaMapIndex(
                                    try joinSlices(ctx.allocator, &.{ char_to_search, n_1_th_next_character.? }),
                                    false,
                                );
                                const nth_char_text_index = helpers.kramaIndexOfText(from_script_data, nth_next_character orelse "");
                                if (char_index != null and nth_char_text_index != null) {
                                    const nth_char_type = from_script_data.getCommonAttr().krama_text_arr[nth_char_text_index.?].list_arr_ref;
                                    const nth_list = if (nth_char_type) |li| from_script_data.getCommonAttr().list[@intCast(li)] else null;
                                    switch (from_script_data.*) {
                                        .brahmic => |brahmic| {
                                            if (helpers.optSliceEql(nth_next_character, brahmic.halant) or listIsMatra(nth_list)) {
                                                ignore_ta_ext_sup_num_text_index = @intCast(end_index + @as(usize, if (nth_next_character != null) 1 else 0));
                                                break :blk char_index;
                                            }
                                        },
                                        else => {},
                                    }
                                }
                            } else if (ignore_ta_ext_sup_num_text_index == -1 and
                                helpers.isTaExtSuperscriptTail(n_2_th_next_character) and
                                containsSlice(next_list, n_2_th_next_character.?))
                            {
                                const char_index = from_script_data.textToKramaMapIndex(
                                    try joinSlices(ctx.allocator, &.{ char_to_search, n_2_th_next_character.? }),
                                    false,
                                );
                                const nth_char_text_index = helpers.kramaIndexOfText(from_script_data, nth_next_character orelse "");
                                const n_1_text_index = helpers.kramaIndexOfText(from_script_data, n_1_th_next_character orelse "");
                                if (char_index != null and nth_char_text_index != null and n_1_text_index != null) {
                                    const nth_list_ref = from_script_data.getCommonAttr().krama_text_arr[nth_char_text_index.?].list_arr_ref;
                                    const n_1_list_ref = from_script_data.getCommonAttr().krama_text_arr[n_1_text_index.?].list_arr_ref;
                                    const nth_list = if (nth_list_ref) |li| from_script_data.getCommonAttr().list[@intCast(li)] else null;
                                    const n_1_list = if (n_1_list_ref) |li| from_script_data.getCommonAttr().list[@intCast(li)] else null;
                                    if (listIsMatra(nth_list) and listIsMatra(n_1_list)) {
                                        ignore_ta_ext_sup_num_text_index = @intCast(end_index +
                                            @as(usize, if (nth_next_character != null) 1 else 0) +
                                            @as(usize, if (n_1_th_next_character != null) 1 else 0));
                                        break :blk char_index;
                                    }
                                }
                            }

                            if (ignore_ta_ext_sup_num_text_index == -1 and
                                nth_next_character != null and
                                helpers.isVedicSvaraTail(n_1_th_next_character) and
                                helpers.isTaExtSuperscriptTail(n_2_th_next_character) and
                                containsSlice(next_list, n_2_th_next_character.?))
                            {
                                const nth_char_text_index = helpers.kramaIndexOfText(from_script_data, nth_next_character.?);
                                if (nth_char_text_index) |index| {
                                    const nth_list_ref = from_script_data.getCommonAttr().krama_text_arr[index].list_arr_ref;
                                    const nth_list = if (nth_list_ref) |li| from_script_data.getCommonAttr().list[@intCast(li)] else null;
                                    if (listIsMatra(nth_list)) {
                                        const char_index = from_script_data.textToKramaMapIndex(
                                            try joinSlices(ctx.allocator, &.{ char_to_search, n_2_th_next_character.? }),
                                            false,
                                        );
                                        if (char_index) |matched_index| {
                                            ignore_ta_ext_sup_num_text_index = @intCast(end_index +
                                                @as(usize, if (nth_next_character != null) 1 else 0) +
                                                @as(usize, if (n_1_th_next_character != null) 1 else 0));
                                            break :blk matched_index;
                                        }
                                    }
                                }
                            }
                        }

                        if (nth_next_character) |nth_ch| {
                            if (containsSlice(next_list, nth_ch)) {
                                scan_units += 1;
                                continue;
                            }
                        }
                    }
                }

                break :blk potential_match_index;
            }
        };

        const text_to_krama_item = if (text_to_krama_item_index) |index| from_text_to_krama_map[index] else null;
        if (text_to_krama_item) |match_item| {
            const matched_text = match_item.text;
            const map = match_item.value;
            const is_type_vyanjana = blk: {
                if (map.krama) |krama| {
                    if (krama.len > 0 and krama[0] >= 0) {
                        const list_ref = from_script_data.getCommonAttr().krama_text_arr[@intCast(krama[0])].list_arr_ref;
                        const list_type = if (list_ref) |li| from_script_data.getCommonAttr().list[@intCast(li)] else null;
                        break :blk listIsVyanjana(list_type);
                    }
                }
                break :blk false;
            };

            const index_delete_length: usize = if (ignore_ta_ext_sup_num_text_index != -1 and utf8CharCount(matched_text) > 1 and is_type_vyanjana and helpers.isTaExtSuperscriptTail(lastScalar(matched_text))) 1 else 0;
            const matched_len_units = utf8CharCount(matched_text) - index_delete_length;
            ctx.cursor.advance(matched_len_units);

            if (transOpt(trans_options, "normal_to_all:use_typing_chars")) {
                if (map.custom_back_ref) |custom_back_ref| {
                    if (custom_back_ref >= 0) {
                        const custom_item = to_script_data.getCommonAttr().custom_script_chars_arr[@intCast(custom_back_ref)];
                        try ctx.result.emit(custom_item.text);
                        const list_item = if (custom_item.primary_ref) |li| to_script_data.getCommonAttr().list[@intCast(li)] else null;
                        _ = try ctx.prevContextCleanup(.{ .text = matched_text, .list = list_item }, map.next, null);
                        continue;
                    }
                }
            }

            if (map.krama) |krama| {
                if (hasAnyNonNegative(krama)) {
                    var pieces = std.array_list.Managed([]const u8).init(allocator);
                    defer pieces.deinit();
                    for (krama) |item| {
                        if (item < 0) continue;
                        try pieces.append(helpers.kramaTextOrEmpty(ctx.to_script_data, item));
                    }

                    var result_concat_status = false;
                    if (ctx.prev_context_in_use) {
                        if (isBrahmic(from_script_data) and isOther(to_script_data)) {
                            var item: ?schema.List = if (map.fallback_list_ref != null and !transOpt(trans_options, "normal_to_all:use_typing_chars"))
                                from_script_data.getCommonAttr().list[@intCast(map.fallback_list_ref.?)]
                            else
                                null;

                            if (item == null and krama.len > 0) {
                                const list_refs = try allocator.alloc(?schema.List, krama.len);
                                for (krama, 0..) |entry, idx| {
                                    if (entry < 0) {
                                        list_refs[idx] = null;
                                    } else {
                                        const list_ref = from_script_data.getCommonAttr().krama_text_arr[@intCast(entry)].list_arr_ref;
                                        list_refs[idx] = if (list_ref) |li|
                                            from_script_data.getCommonAttr().list[@intCast(li)]
                                        else
                                            null;
                                    }
                                }

                                if (helpers.isScriptTamilExt(from_script_name) and anyListIsMatra(list_refs) and anyListIsVyanjana(list_refs)) {
                                    if (list_refs.len > 0 and list_refs[0] != null) {
                                        item = .{ .anya = .{ .krama_ref = list_refs[0].?.getKramaRef() } };
                                    }
                                } else if (helpers.isScriptTamilExt(from_script_name) and list_refs.len > 1 and anyListNull(list_refs)) {
                                    item = list_refs[list_refs.len - 1];
                                } else if (list_refs.len > 0) {
                                    item = list_refs[0];
                                }
                            }

                            result_concat_status = try ctx.prevContextCleanup(.{ .text = matched_text, .list = item }, null, null);
                        } else if (isBrahmic(to_script_data) and isOther(from_script_data)) {
                            var item: ?schema.List = null;
                            if (map.fallback_list_ref) |fallback| {
                                item = to_script_data.getCommonAttr().list[@intCast(fallback)];
                            } else if (krama.len > 0) {
                                const first = krama[0];
                                if (first >= 0) {
                                    const list_ref = to_script_data.getCommonAttr().krama_text_arr[@intCast(first)].list_arr_ref;
                                    if (list_ref) |li| item = to_script_data.getCommonAttr().list[@intCast(li)];
                                }
                            }

                            const next_list = if (opts.typing_mode and std.mem.eql(u8, from_script_name, "Normal")) map.next else null;
                            result_concat_status = try ctx.prevContextCleanup(.{ .text = matched_text, .list = item }, next_list, null);
                        } else if (opts.typing_mode and std.mem.eql(u8, from_script_name, "Normal") and isOther(to_script_data)) {
                            result_concat_status = try ctx.prevContextCleanup(.{ .text = matched_text, .list = null }, map.next, null);
                        }
                    }

                    if (!result_concat_status) {
                        switch (to_script_data.*) {
                            .brahmic => |brahmic| {
                                if (helpers.isScriptTamilExt(to_script_name) and helpers.isTaExtSuperscriptTail(ctx.result.lastChar())) {
                                    if ((pieces.items.len > 0 and std.mem.eql(u8, pieces.items[0], brahmic.halant) and pieces.items.len == 1) or
                                        (map.krama != null and lastKramaIsMatra(to_script_data, map.krama.?)))
                                    {
                                        try ctx.result.emitPiecesWithReorder(pieces.items, brahmic.halant, true);
                                    } else if (pieces.items.len > 0 and helpers.isVedicSvaraTail(lastScalar(pieces.items[pieces.items.len - 1]))) {
                                        const last = ctx.result.popLastChar() orelse "";
                                        try ctx.result.emitPieces(pieces.items);
                                        try ctx.result.emit(last);
                                    } else {
                                        try ctx.result.emitPieces(pieces.items);
                                    }
                                } else {
                                    try ctx.result.emitPieces(pieces.items);
                                }
                            },
                            else => try ctx.result.emitPieces(pieces.items),
                        }
                    }

                    try ctx.applyCustomTransRules(@intCast(ctx.cursor.pos()), -@as(isize, @intCast(matched_len_units)));
                    continue;
                } else if (hasNegative(krama)) {
                    try ctx.result.emit(matched_text);
                    if (opts.typing_mode) {
                        _ = try ctx.prevContextCleanup(.{ .text = matched_text, .list = null }, map.next, null);
                    }
                    continue;
                }
            }
        } else {
            ctx.cursor.advance(1);
            text_index = ctx.cursor.pos();
        }

        const char_to_search = if (text_to_krama_item) |item| item.text else ch;
        const index = helpers.kramaIndexOfText(from_script_data, char_to_search) orelse {
            if (ctx.prev_context_in_use) {
                _ = try ctx.prevContextCleanup(.{ .text = char_to_search, .list = null }, null, null);
                ctx.prev_context.clear();
            }
            try ctx.result.emit(char_to_search);
            continue;
        };

        var result_concat_status = false;
        if (ctx.prev_context_in_use) {
            if (isBrahmic(from_script_data)) {
                const list_idx = from_script_data.getCommonAttr().krama_text_arr[index].list_arr_ref;
                const item = if (list_idx) |li| from_script_data.getCommonAttr().list[@intCast(li)] else null;
                result_concat_status = try ctx.prevContextCleanup(.{ .text = char_to_search, .list = item }, null, null);
            } else if (isBrahmic(to_script_data)) {
                const list_idx = to_script_data.getCommonAttr().krama_text_arr[index].list_arr_ref;
                const item = if (list_idx) |li| to_script_data.getCommonAttr().list[@intCast(li)] else null;
                result_concat_status = try ctx.prevContextCleanup(.{ .text = char_to_search, .list = item }, null, null);
            }
        }

        if (!result_concat_status) {
            const to_add_text = helpers.kramaTextOrEmpty(to_script_data, @intCast(index));
            const pieces = [_][]const u8{to_add_text};
            switch (to_script_data.*) {
                .brahmic => |brahmic| {
                    if (helpers.isScriptTamilExt(to_script_name) and helpers.isTaExtSuperscriptTail(ctx.result.lastChar())) {
                        if (std.mem.eql(u8, to_add_text, brahmic.halant) or kramaIndexIsMatra(to_script_data, index)) {
                            try ctx.result.emitPiecesWithReorder(pieces[0..], brahmic.halant, true);
                        } else if (helpers.isVedicSvaraTail(lastScalar(to_add_text))) {
                            const last = ctx.result.popLastChar() orelse "";
                            try ctx.result.emitPieces(pieces[0..]);
                            try ctx.result.emit(last);
                        } else {
                            try ctx.result.emitPieces(pieces[0..]);
                        }
                    } else {
                        try ctx.result.emitPieces(pieces[0..]);
                    }
                },
                else => try ctx.result.emitPieces(pieces[0..]),
            }
        }

        try ctx.applyCustomTransRules(@intCast(ctx.cursor.pos()), -1);
    }

    if (ctx.prev_context_in_use) {
        _ = try ctx.prevContextCleanup(null, null, true);
    }

    if (!opts.typing_mode and isBrahmic(from_script_data) and isOther(to_script_data) and listIsVyanjana(ctx.prev_context.typeAt(-1))) {
        switch (to_script_data.*) {
            .other => |other| {
                const last_piece = ctx.result.lastPiece() orelse "";
                if (!std.mem.endsWith(u8, last_piece, other.schwa_character)) {
                    try ctx.result.emit(other.schwa_character);
                }
            },
            else => {},
        }
    }

    var output = try ctx.result.toOwnedString();
    output = try applyCustomReplaceRules(allocator, output, to_script_data, custom_rules, .output);
    return .{
        .output = output,
        .context_length = ctx.prev_context.length(),
    };
}

pub fn transliterateText(
    allocator: Allocator,
    text: []const u8,
    from_script_name: []const u8,
    to_script_name: []const u8,
    input_options: ?[]const script_data_mod.EnabledOption,
    options: ?TransliterationFnOptions,
) !TransliterationOutput {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const temp_allocator = arena.allocator();

    const from_norm = (try store_mod.getNormalizedScriptName(from_script_name)) orelse return error.UnknownFromScript;
    const to_norm = (try store_mod.getNormalizedScriptName(to_script_name)) orelse return error.UnknownToScript;
    const from_data = try store_mod.getScriptData(from_norm);
    const to_data = try store_mod.getScriptData(to_norm);

    const resolved = try resolveTransliterationRules(temp_allocator, from_data, to_data, input_options);
    const result = try transliterateTextCore(
        temp_allocator,
        text,
        from_norm,
        to_norm,
        from_data,
        to_data,
        &resolved.trans_options,
        resolved.custom_rules,
        options,
    );

    return .{
        .output = try allocator.dupe(u8, result.output),
        .context_length = result.context_length,
    };
}

fn applyCustomReplaceRules(
    allocator: Allocator,
    text_in: []const u8,
    script_data: *const schema.ScriptData,
    rules: []const schema.Rule,
    allowed_input_rule_type: schema.CheckIn,
) ![]const u8 {
    if (rules.len == 0) return text_in;

    var text = text_in;
    for (rules) |rule| {
        if (!ruleCheckShouldUseReplace(rule, allowed_input_rule_type)) continue;

        switch (rule) {
            .replace_prev_krama_keys => |value| {
                var prev_parts = std.array_list.Managed([]const u8).init(allocator);
                defer prev_parts.deinit();
                for (value.prev) |p| try prev_parts.append(helpers.kramaTextOrEmpty(script_data, p));
                const prev_string = try joinSlices(allocator, prev_parts.items);
                const repl_text = try getRuleReplaceText(allocator, rule, script_data);

                for (value.following) |follow_krama_index| {
                    const follow_krama_string = helpers.kramaTextOrEmpty(script_data, follow_krama_index);
                    if (follow_krama_string.len == 0) continue;
                    const search = try joinSlices(allocator, &.{ prev_string, follow_krama_string });
                    const replace = try joinSlices(allocator, &.{ repl_text, follow_krama_string });
                    text = try helpers.replaceAllAlloc(allocator, text, search, replace);
                }
            },
            .direct_replace => |value| {
                const replace_with = if (value.replace_text) |replace_text|
                    replace_text
                else
                    try getRuleReplaceText(allocator, rule, script_data);

                for (value.to_replace) |grp| {
                    var grp_parts = std.array_list.Managed([]const u8).init(allocator);
                    defer grp_parts.deinit();
                    for (grp) |k| try grp_parts.append(helpers.kramaTextOrEmpty(script_data, k));
                    const to_replace_string = try joinSlices(allocator, grp_parts.items);
                    if (to_replace_string.len > 0) {
                        text = try helpers.replaceAllAlloc(allocator, text, to_replace_string, replace_with);
                    }
                }
            },
        }
    }

    return text;
}

fn getRuleReplaceText(allocator: Allocator, rule: schema.Rule, script_data: *const schema.ScriptData) ![]const u8 {
    var parts = std.array_list.Managed([]const u8).init(allocator);
    defer parts.deinit();

    switch (rule) {
        .replace_prev_krama_keys => |value| {
            for (value.replace_with) |item| try parts.append(helpers.kramaTextOrEmpty(script_data, item));
        },
        .direct_replace => |value| {
            for (value.replace_with) |item| try parts.append(helpers.kramaTextOrEmpty(script_data, item));
        },
    }

    return try joinSlices(allocator, parts.items);
}

fn ruleCheckShouldUseReplace(rule: schema.Rule, allowed: schema.CheckIn) bool {
    return switch (rule) {
        .replace_prev_krama_keys => |value| value.use_replace == true and value.check_in == allowed,
        .direct_replace => |value| value.use_replace == true and value.check_in == allowed,
    };
}

fn transOpt(map: *const std.StringHashMapUnmanaged(bool), key: []const u8) bool {
    return map.get(key) orelse false;
}

fn isSingleAsciiDigit(text: []const u8) bool {
    return text.len == 1 and std.ascii.isDigit(text[0]);
}

fn joinSlices(allocator: Allocator, pieces: []const []const u8) ![]const u8 {
    var out = std.array_list.Managed(u8).init(allocator);
    defer out.deinit();
    for (pieces) |piece| {
        if (piece.len > 0) {
            try out.appendSlice(piece);
        }
    }
    return try out.toOwnedSlice();
}

fn joinIgnoringIndex(
    allocator: Allocator,
    cursor: *const helpers.InputTextCursor,
    start: usize,
    ignore_index: usize,
    end_index: usize,
) ![]const u8 {
    const a = (try cursor.slice(start, ignore_index)) orelse "";
    const b = if (end_index > ignore_index) (try cursor.slice(ignore_index + 1, end_index)) orelse "" else "";
    return try joinSlices(allocator, &.{ a, b });
}

fn containsSlice(haystack: []const []const u8, needle: []const u8) bool {
    for (haystack) |item| {
        if (std.mem.eql(u8, item, needle)) return true;
    }
    return false;
}

fn containsI16(values: []const i16, needle: i16) bool {
    for (values) |value| {
        if (value == needle) return true;
    }
    return false;
}

fn utf8CharCount(text: []const u8) usize {
    var count: usize = 0;
    var index: usize = 0;
    while (index < text.len) {
        const width = std.unicode.utf8ByteSequenceLength(text[index]) catch break;
        index += width;
        count += 1;
    }
    return count;
}

fn lastScalar(text: []const u8) ?[]const u8 {
    if (text.len == 0) return null;
    var index: usize = 0;
    var last_start: usize = 0;
    while (index < text.len) {
        last_start = index;
        const width = std.unicode.utf8ByteSequenceLength(text[index]) catch return null;
        index += width;
    }
    return text[last_start..];
}

fn hasAnyNonNegative(values: []const i16) bool {
    for (values) |value| {
        if (value >= 0) return true;
    }
    return false;
}

fn hasNegative(values: []const i16) bool {
    for (values) |value| {
        if (value < 0) return true;
    }
    return false;
}

fn isBrahmic(script: *const schema.ScriptData) bool {
    return switch (script.*) {
        .brahmic => true,
        .other => false,
    };
}

fn isOther(script: *const schema.ScriptData) bool {
    return !isBrahmic(script);
}

fn listIsAnya(list: ?schema.List) bool {
    return if (list) |value| value.isAnya() else false;
}

fn listIsVyanjana(list: ?schema.List) bool {
    return if (list) |value| value.isVyanjana() else false;
}

fn listIsMatra(list: ?schema.List) bool {
    return if (list) |value| value.isMatra() else false;
}

fn listIsSvara(list: ?schema.List) bool {
    return if (list) |value| value.isSvara() else false;
}

fn anyListIsMatra(values: []const ?schema.List) bool {
    for (values) |value| {
        if (listIsMatra(value)) return true;
    }
    return false;
}

fn anyListIsVyanjana(values: []const ?schema.List) bool {
    for (values) |value| {
        if (listIsVyanjana(value)) return true;
    }
    return false;
}

fn anyListNull(values: []const ?schema.List) bool {
    for (values) |value| {
        if (value == null) return true;
    }
    return false;
}

fn lastKramaIsMatra(script: *const schema.ScriptData, krama: []const i16) bool {
    if (krama.len == 0) return false;
    const last_i = krama[krama.len - 1];
    if (last_i < 0) return false;
    const list_ref = script.getCommonAttr().krama_text_arr[@intCast(last_i)].list_arr_ref;
    const list_value = if (list_ref) |li| script.getCommonAttr().list[@intCast(li)] else null;
    return listIsMatra(list_value);
}

fn kramaIndexIsMatra(script: *const schema.ScriptData, index: usize) bool {
    const list_ref = script.getCommonAttr().krama_text_arr[index].list_arr_ref;
    const list_value = if (list_ref) |li| script.getCommonAttr().list[@intCast(li)] else null;
    return listIsMatra(list_value);
}
