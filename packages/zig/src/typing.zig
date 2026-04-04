const std = @import("std");
const script_data = @import("script_data/mod.zig");
const schema = @import("script_data/schema.zig");
const transliterate = @import("transliterate/mod.zig");

const Allocator = std.mem.Allocator;

pub const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS: u64 = 4500;
pub const DEFAULT_USE_NATIVE_NUMERALS: bool = true;
pub const DEFAULT_INCLUDE_INHERENT_VOWEL: bool = false;

pub const TypingContextOptions = struct {
    auto_context_clear_time_ms: u64 = DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
    use_native_numerals: bool = DEFAULT_USE_NATIVE_NUMERALS,
    include_inherent_vowel: bool = DEFAULT_INCLUDE_INHERENT_VOWEL,
};

pub const TypingDiff = struct {
    to_delete_chars_count: usize,
    diff_add_text: []const u8,
    context_length: usize,
};

pub const ListType = enum {
    anya,
    vyanjana,
    matra,
    svara,

    fn fromList(list: schema.List) ListType {
        return switch (list) {
            .anya => .anya,
            .vyanjana => .vyanjana,
            .@"mAtrA" => .matra,
            .svara => .svara,
        };
    }
};

pub const TypingDataMapItem = struct {
    text: []const u8,
    list_type: ListType,
    mappings: []const []const u8,
};

pub const ScriptTypingDataMap = struct {
    common_krama_map: []const TypingDataMapItem,
    script_specific_krama_map: []const TypingDataMapItem,
};

pub const KramaDataItem = struct {
    text: []const u8,
    list_type: ListType,
};

pub const TypingContext = struct {
    arena: *std.heap.ArenaAllocator,
    normalized_typing_lang: []const u8,
    use_native_numerals: bool,
    include_inherent_vowel: bool,
    curr_input: std.array_list.Managed(u8),
    curr_output: std.array_list.Managed(u8),
    auto_context_clear_time_ms: u64,
    last_time_ms: ?u64,
    pending_a_continuation: bool,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
    trans_options: std.StringHashMapUnmanaged(bool),
    custom_rules: []const schema.Rule,

    pub fn new(typing_lang: []const u8, options: ?TypingContextOptions) !TypingContext {
        const opts = options orelse TypingContextOptions{};
        const normalized_typing_lang = (try script_data.getNormalizedScriptName(typing_lang)) orelse return error.InvalidScriptName;
        const from_script_data = try script_data.getScriptData("Normal");
        const to_script_data = try script_data.getScriptData(normalized_typing_lang);

        var self = TypingContext{
            .arena = try std.heap.page_allocator.create(std.heap.ArenaAllocator),
            .normalized_typing_lang = undefined,
            .use_native_numerals = opts.use_native_numerals,
            .include_inherent_vowel = opts.include_inherent_vowel,
            .curr_input = undefined,
            .curr_output = undefined,
            .auto_context_clear_time_ms = opts.auto_context_clear_time_ms,
            .last_time_ms = null,
            .pending_a_continuation = false,
            .from_script_data = from_script_data,
            .to_script_data = to_script_data,
            .trans_options = .{},
            .custom_rules = &.{},
        };
        self.arena.* = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        errdefer {
            self.arena.deinit();
            std.heap.page_allocator.destroy(self.arena);
        }

        const arena_allocator = self.arena.allocator();
        const resolved = try transliterate.resolveTransliterationRules(arena_allocator, from_script_data, to_script_data, null);

        self.normalized_typing_lang = try arena_allocator.dupe(u8, normalized_typing_lang);
        self.curr_input = std.array_list.Managed(u8).init(arena_allocator);
        self.curr_output = std.array_list.Managed(u8).init(arena_allocator);
        self.trans_options = resolved.trans_options;
        self.custom_rules = resolved.custom_rules;
        return self;
    }

    pub fn deinit(self: *TypingContext) void {
        self.arena.deinit();
        std.heap.page_allocator.destroy(self.arena);
        self.* = undefined;
    }

    pub fn clearContext(self: *TypingContext) void {
        self.last_time_ms = null;
        self.pending_a_continuation = false;
        self.curr_input.clearRetainingCapacity();
        self.curr_output.clearRetainingCapacity();
    }

    fn buildTranslitOptions(self: *const TypingContext) transliterate.TransliterationFnOptions {
        return .{
            .typing_mode = true,
            .use_native_numerals = self.use_native_numerals,
            .include_inherent_vowel = self.include_inherent_vowel,
        };
    }

    pub fn takeKeyInput(self: *TypingContext, key: []const u8) !TypingDiff {
        return self.takeKeyInputAtTime(key, nowMillis());
    }

    pub fn takeKeyInputAtTime(self: *TypingContext, key: []const u8, now_ms: u64) !TypingDiff {
        if (key.len == 0) {
            return .{
                .to_delete_chars_count = 0,
                .diff_add_text = "",
                .context_length = 0,
            };
        }

        if (self.last_time_ms) |last| {
            if (now_ms - last > self.auto_context_clear_time_ms) {
                self.clearContext();
            }
        }

        if (self.pending_a_continuation and !isAContinuationKey(key)) {
            self.clearContext();
        }

        const first_scalar = firstScalar(key) orelse "";
        try self.curr_input.appendSlice(first_scalar);

        var temp_arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer temp_arena.deinit();
        const temp_allocator = temp_arena.allocator();
        const prev_output = try temp_allocator.dupe(u8, self.curr_output.items);

        const result = try transliterate.transliterateTextCore(
            temp_allocator,
            self.curr_input.items,
            "Normal",
            self.normalized_typing_lang,
            self.from_script_data,
            self.to_script_data,
            &self.trans_options,
            self.custom_rules,
            self.buildTranslitOptions(),
        );

        var effective_output = result.output;
        var effective_context_length = result.context_length;
        if (std.mem.eql(u8, first_scalar, "a") and std.mem.eql(u8, result.output, prev_output)) {
            switch (self.to_script_data.*) {
                .brahmic => |brahmic| {
                    if (std.mem.endsWith(u8, prev_output, brahmic.halant)) {
                        effective_output = prev_output[0 .. prev_output.len - brahmic.halant.len];
                        effective_context_length = if (result.context_length == 1) 1 else 0;
                    }
                },
                else => {},
            }
        }

        if (effective_context_length > 0) {
            self.curr_output.clearRetainingCapacity();
            try self.curr_output.appendSlice(effective_output);
        } else {
            self.clearContext();
        }

        const diff = try computeDiff(self.arena.allocator(), prev_output, effective_output);
        self.last_time_ms = now_ms;
        const implicit_a_hold =
            std.mem.eql(u8, first_scalar, "a") and
            std.mem.eql(u8, result.output, prev_output) and
            effective_context_length == 1;
        self.pending_a_continuation = implicit_a_hold;
        return .{
            .to_delete_chars_count = diff.to_delete_chars_count,
            .diff_add_text = diff.diff_add_text,
            .context_length = effective_context_length,
        };
    }

    pub fn updateUseNativeNumerals(self: *TypingContext, use_native_numerals: bool) void {
        self.use_native_numerals = use_native_numerals;
    }

    pub fn updateIncludeInherentVowel(self: *TypingContext, include_inherent_vowel: bool) void {
        self.include_inherent_vowel = include_inherent_vowel;
    }

    pub fn getUseNativeNumerals(self: *const TypingContext) bool {
        return self.use_native_numerals;
    }

    pub fn getIncludeInherentVowel(self: *const TypingContext) bool {
        return self.include_inherent_vowel;
    }

    pub fn getNormalizedScript(self: *const TypingContext) []const u8 {
        return self.normalized_typing_lang;
    }
};

pub fn emulateTyping(allocator: Allocator, text: []const u8, typing_lang: []const u8, options: ?TypingContextOptions) ![]const u8 {
    var ctx = try TypingContext.new(typing_lang, options);
    defer ctx.deinit();

    var result = std.array_list.Managed(u8).init(allocator);
    defer result.deinit();

    var index: usize = 0;
    while (index < text.len) {
        const width = try std.unicode.utf8ByteSequenceLength(text[index]);
        const diff = try ctx.takeKeyInput(text[index .. index + width]);
        if (diff.to_delete_chars_count > 0) {
            truncateLastChars(&result, diff.to_delete_chars_count);
        }
        try result.appendSlice(diff.diff_add_text);
        index += width;
    }

    return try result.toOwnedSlice();
}

pub fn getScriptTypingDataMap(allocator: Allocator, script: []const u8) !ScriptTypingDataMap {
    const normalized = (try script_data.getNormalizedScriptName(script)) orelse return error.InvalidScriptName;
    if (std.mem.eql(u8, normalized, "Normal")) return error.InvalidScriptName;

    const script_info = try script_data.getScriptData(normalized);
    const common_attr = script_info.getCommonAttr();

    var common_krama_map = std.array_list.Managed(TypingDataMapItem).init(allocator);
    defer common_krama_map.deinit();
    for (common_attr.krama_text_arr) |entry| {
        const list_type = if (entry.list_arr_ref) |idx| ListType.fromList(common_attr.list[@intCast(idx)]) else ListType.anya;
        try common_krama_map.append(.{ .text = entry.text, .list_type = list_type, .mappings = &.{} });
    }

    var script_specific_map = std.array_list.Managed(TypingDataMapItem).init(allocator);
    defer script_specific_map.deinit();
    for (common_attr.custom_script_chars_arr) |entry| {
        const list_type = if (entry.primary_ref) |idx| ListType.fromList(common_attr.list[@intCast(idx)]) else ListType.anya;
        try script_specific_map.append(.{ .text = entry.text, .list_type = list_type, .mappings = &.{} });
    }

    for (common_attr.typing_text_to_krama_map) |entry| {
        if (entry.text.len == 0) continue;
        if (entry.value.custom_back_ref) |custom_back_ref| {
            if (custom_back_ref >= 0 and @as(usize, @intCast(custom_back_ref)) < script_specific_map.items.len) {
                script_specific_map.items[@intCast(custom_back_ref)] = try appendMapping(
                    allocator,
                    script_specific_map.items[@intCast(custom_back_ref)],
                    entry.text,
                );
            }
        } else if (entry.value.krama) |krama| {
            if (krama.len == 1 and krama[0] >= 0 and @as(usize, @intCast(krama[0])) < common_krama_map.items.len) {
                common_krama_map.items[@intCast(krama[0])] = try appendMapping(
                    allocator,
                    common_krama_map.items[@intCast(krama[0])],
                    entry.text,
                );
            }
        }
    }

    return .{
        .common_krama_map = try mergeDuplicateTextMappings(allocator, common_krama_map.items),
        .script_specific_krama_map = try mergeDuplicateTextMappings(allocator, script_specific_map.items),
    };
}

pub fn getScriptKramaData(allocator: Allocator, script: []const u8) ![]const KramaDataItem {
    const normalized = (try script_data.getNormalizedScriptName(script)) orelse return error.InvalidScriptName;
    if (std.mem.eql(u8, normalized, "Normal")) return error.InvalidScriptName;

    const script_info = try script_data.getScriptData(normalized);
    const common_attr = script_info.getCommonAttr();

    var out = std.array_list.Managed(KramaDataItem).init(allocator);
    defer out.deinit();
    for (common_attr.krama_text_arr) |entry| {
        const list_type = if (entry.list_arr_ref) |idx| ListType.fromList(common_attr.list[@intCast(idx)]) else ListType.anya;
        try out.append(.{ .text = entry.text, .list_type = list_type });
    }
    return try out.toOwnedSlice();
}

fn computeDiff(allocator: Allocator, prev_output: []const u8, output: []const u8) !TypingDiff {
    const prev_chars = try toScalarSlices(allocator, prev_output);
    const curr_chars = try toScalarSlices(allocator, output);

    var common_chars: usize = 0;
    while (common_chars < prev_chars.len and common_chars < curr_chars.len) : (common_chars += 1) {
        if (!std.mem.eql(u8, prev_chars[common_chars], curr_chars[common_chars])) break;
    }

    var add = std.array_list.Managed(u8).init(allocator);
    defer add.deinit();
    for (curr_chars[common_chars..]) |piece| {
        try add.appendSlice(piece);
    }

    return .{
        .to_delete_chars_count = prev_chars.len - common_chars,
        .diff_add_text = try add.toOwnedSlice(),
        .context_length = 0,
    };
}

fn truncateLastChars(out: *std.array_list.Managed(u8), count: usize) void {
    var remaining = count;
    while (remaining > 0 and out.items.len > 0) : (remaining -= 1) {
        var index: usize = 0;
        var last_start: usize = 0;
        while (index < out.items.len) {
            last_start = index;
            const width = std.unicode.utf8ByteSequenceLength(out.items[index]) catch break;
            index += width;
        }
        out.shrinkRetainingCapacity(last_start);
    }
}

fn appendMapping(allocator: Allocator, item: TypingDataMapItem, mapping: []const u8) !TypingDataMapItem {
    var list = std.array_list.Managed([]const u8).init(allocator);
    defer list.deinit();
    for (item.mappings) |existing| {
        try list.append(existing);
    }
    try list.append(mapping);
    return .{
        .text = item.text,
        .list_type = item.list_type,
        .mappings = try list.toOwnedSlice(),
    };
}

fn mergeDuplicateTextMappings(allocator: Allocator, items: []const TypingDataMapItem) ![]const TypingDataMapItem {
    var out = std.array_list.Managed(TypingDataMapItem).init(allocator);
    defer out.deinit();

    for (items) |item| {
        var found_index: ?usize = null;
        for (out.items, 0..) |existing, idx| {
            if (existing.list_type == item.list_type and std.mem.eql(u8, existing.text, item.text)) {
                found_index = idx;
                break;
            }
        }

        if (found_index) |idx| {
            out.items[idx] = try mergeItemMappings(allocator, out.items[idx], item.mappings);
        } else {
            try out.append(item);
        }
    }

    var filtered = std.array_list.Managed(TypingDataMapItem).init(allocator);
    defer filtered.deinit();
    for (out.items) |item| {
        if (item.mappings.len > 0) {
            try filtered.append(item);
        }
    }
    return try filtered.toOwnedSlice();
}

fn mergeItemMappings(allocator: Allocator, existing: TypingDataMapItem, new_mappings: []const []const u8) !TypingDataMapItem {
    var list = std.array_list.Managed([]const u8).init(allocator);
    defer list.deinit();

    for (existing.mappings) |mapping| {
        try list.append(mapping);
    }
    for (new_mappings) |mapping| {
        if (!containsMapping(list.items, mapping)) {
            try list.append(mapping);
        }
    }

    return .{
        .text = existing.text,
        .list_type = existing.list_type,
        .mappings = try list.toOwnedSlice(),
    };
}

fn containsMapping(list: []const []const u8, needle: []const u8) bool {
    for (list) |item| {
        if (std.mem.eql(u8, item, needle)) return true;
    }
    return false;
}

fn toScalarSlices(allocator: Allocator, text: []const u8) ![]const []const u8 {
    var out = std.array_list.Managed([]const u8).init(allocator);
    defer out.deinit();
    var index: usize = 0;
    while (index < text.len) {
        const width = try std.unicode.utf8ByteSequenceLength(text[index]);
        try out.append(text[index .. index + width]);
        index += width;
    }
    return try out.toOwnedSlice();
}

fn firstScalar(text: []const u8) ?[]const u8 {
    if (text.len == 0) return null;
    const width = std.unicode.utf8ByteSequenceLength(text[0]) catch return null;
    return text[0..width];
}

fn nowMillis() u64 {
    return @intCast(std.time.milliTimestamp());
}

fn isAContinuationKey(key: []const u8) bool {
    return std.mem.eql(u8, key, "a") or std.mem.eql(u8, key, "i") or std.mem.eql(u8, key, "u");
}

const fixtures = @import("test_helpers/fixtures.zig");

test "emulate typing auto transliteration yaml" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    const root_dir = try fixtures.transliterationTestDataRoot(arena_allocator);

    const input_dirs = [_][]const u8{
        try std.fs.path.join(arena_allocator, &.{ root_dir, "auto-nor-brahmic" }),
        try std.fs.path.join(arena_allocator, &.{ root_dir, "auto-nor-other" }),
    };

    for (input_dirs) |folder| {
        const files = try fixtures.listYamlFiles(arena_allocator, folder, false);
        for (files) |file_path| {
            const file = try std.fs.openFileAbsolute(file_path, .{});
            defer file.close();
            const text = try file.readToEndAlloc(arena_allocator, 8 * 1024 * 1024);
            const cases = try fixtures.parseTransliterationCases(arena_allocator, text);

            const file_name = std.fs.path.basename(file_path);
            for (cases) |case| {
                if (case.todo) continue;
                if (!std.mem.eql(u8, case.from, "Normal") or std.mem.eql(u8, case.to, "Normal")) continue;

                const result = try emulateTyping(allocator, case.input, case.to, null);
                defer allocator.free(result);

                if (std.mem.startsWith(u8, file_name, "auto") and
                    std.mem.eql(u8, case.to, "Tamil-Extended") and
                    containsAny(result, @import("transliterate/helpers.zig").VEDIC_SVARAS[0..]))
                {
                    continue;
                }

                if (!std.mem.eql(u8, result, case.output)) {
                    std.debug.print(
                        "Emulate typing mismatch in {s} index {s}\nscript={s}\ninput={s}\nexpected={s}\nactual={s}\n",
                        .{ file_name, case.index, case.to, case.input, case.output, result },
                    );
                    return error.TestExpectedEqual;
                }
            }
        }
    }
}

test "typing mode yaml parity" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    const root_dir = try fixtures.typingTestDataRoot(arena_allocator);

    const files = try fixtures.listYamlFiles(arena_allocator, root_dir, true);
    try std.testing.expect(files.len > 0);

    for (files) |file_path| {
        const file = try std.fs.openFileAbsolute(file_path, .{});
        defer file.close();
        const text = try file.readToEndAlloc(arena_allocator, 4 * 1024 * 1024);
        const cases = try fixtures.parseTypingCases(arena_allocator, text);

        for (cases) |case| {
            if (case.todo) continue;

            const opts = buildTypingOptions(case.options);
            const result = try emulateTyping(allocator, case.text, case.script, opts);
            defer allocator.free(result);
            if (!std.mem.eql(u8, result, case.output)) {
                std.debug.print(
                    "Typing mode mismatch in {s} index {}\nscript={s}\ninput={s}\nexpected={s}\nactual={s}\n",
                    .{ std.fs.path.basename(file_path), case.index, case.script, case.text, case.output, result },
                );
                return error.TestExpectedEqual;
            }

            if (case.preserve_check) {
                const preserve_option = [_]script_data.EnabledOption{
                    .{ .key = "all_to_normal:preserve_specific_chars", .enabled = true },
                };
                const preserved_output = try transliterate.transliterateText(
                    allocator,
                    result,
                    case.script,
                    "Normal",
                    preserve_option[0..],
                    null,
                );
                const preserved = preserved_output.output;
                defer allocator.free(preserved);
                if (!std.mem.eql(u8, preserved, case.text)) {
                    std.debug.print(
                        "Preserve check mismatch in {s} index {}\nscript={s}\ninput={s}\nexpected={s}\nactual={s}\n",
                        .{ std.fs.path.basename(file_path), case.index, case.script, case.text, case.text, preserved },
                    );
                    return error.TestExpectedEqual;
                }
            }
        }
    }
}

test "typing context fixture parity" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    const root_dir = try fixtures.typingTestDataRoot(arena_allocator);
    const context_file = try std.fs.path.join(arena_allocator, &.{ root_dir, "context", "01-context.yaml" });

    const file = try std.fs.openFileAbsolute(context_file, .{});
    defer file.close();
    const text = try file.readToEndAlloc(arena_allocator, 1024 * 1024);
    const cases = try fixtures.parseContextCases(arena_allocator, text);

    for (cases) |case| {
        var ctx = try TypingContext.new("Devanagari", null);
        defer ctx.deinit();

        var index: usize = 0;
        while (index < case.text.len) {
            const width = try std.unicode.utf8ByteSequenceLength(case.text[index]);
            _ = try ctx.takeKeyInputAtTime(case.text[index .. index + width], @intCast(index));
            index += width;
        }

        const context_length = if (ctx.curr_output.items.len == 0) @as(usize, 0) else try transliterateContextLength(&ctx);
        try std.testing.expectEqual(case.context, context_length);
    }
}

test "get script typing data map parity basics" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    const devanagari = try getScriptTypingDataMap(allocator, "Devanagari");
    try std.testing.expect(devanagari.common_krama_map.len > 0);

    const normalized = try getScriptTypingDataMap(allocator, "dev");
    try std.testing.expect(normalized.common_krama_map.len > 0);

    try std.testing.expectError(error.InvalidScriptName, getScriptTypingDataMap(allocator, "InvalidScript"));
    try std.testing.expectError(error.InvalidScriptName, getScriptTypingDataMap(allocator, "Normal"));

    const telugu = try getScriptTypingDataMap(allocator, "Telugu");
    var has_mappings = false;
    for (telugu.common_krama_map) |item| {
        if (item.mappings.len > 0) {
            has_mappings = true;
            break;
        }
    }
    try std.testing.expect(has_mappings);
}

test "typing smoke cases" {
    const allocator = std.testing.allocator;

    const zo = try emulateTyping(allocator, "zo", "Devanagari", null);
    defer allocator.free(zo);
    try std.testing.expectEqualStrings("ज़ो", zo);

    const viweka = try emulateTyping(allocator, "viwEka", "Devanagari", null);
    defer allocator.free(viweka);
    try std.testing.expectEqualStrings("विवेक", viweka);
}

test "typing diff smoke for zo" {
    var ctx = try TypingContext.new("Devanagari", null);
    defer ctx.deinit();

    const first = try ctx.takeKeyInputAtTime("z", 0);
    try std.testing.expectEqualStrings("ज़्", first.diff_add_text);

    const second = try ctx.takeKeyInputAtTime("o", 1);
    try std.testing.expectEqual(@as(usize, 1), second.to_delete_chars_count);
    try std.testing.expectEqualStrings("ो", second.diff_add_text);
}

test "typing diff smoke for ka" {
    var ctx = try TypingContext.new("Devanagari", null);
    defer ctx.deinit();

    const first = try ctx.takeKeyInputAtTime("k", 0);
    try std.testing.expectEqualStrings("क्", first.diff_add_text);

    const second = try ctx.takeKeyInputAtTime("a", 1);
    try std.testing.expectEqual(@as(usize, 1), second.to_delete_chars_count);
    try std.testing.expectEqualStrings("", second.diff_add_text);
}

fn containsAny(text: []const u8, needles: []const []const u8) bool {
    for (needles) |needle| {
        if (std.mem.indexOf(u8, text, needle) != null) return true;
    }
    return false;
}

fn transliterateContextLength(ctx: *TypingContext) !usize {
    var temp_arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer temp_arena.deinit();
    const result = try transliterate.transliterateTextCore(
        temp_arena.allocator(),
        ctx.curr_input.items,
        "Normal",
        ctx.normalized_typing_lang,
        ctx.from_script_data,
        ctx.to_script_data,
        &ctx.trans_options,
        ctx.custom_rules,
        ctx.buildTranslitOptions(),
    );
    return result.context_length;
}

fn buildTypingOptions(source: ?fixtures.TypingOptionsYaml) ?TypingContextOptions {
    if (source == null) return null;
    const src = source.?;
    var out = TypingContextOptions{};
    if (src.use_native_numerals) |value| out.use_native_numerals = value;
    if (src.include_inherent_vowel) |value| out.include_inherent_vowel = value;
    if (src.auto_context_clear_time_ms) |value| out.auto_context_clear_time_ms = value;
    return out;
}
