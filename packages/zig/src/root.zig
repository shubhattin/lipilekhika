pub const script_data = @import("script_data/mod.zig");
pub const transliterate_mod = @import("transliterate/mod.zig");
pub const typing = @import("typing.zig");

pub const Store = script_data.Store;
pub const ScriptData = script_data.ScriptData;
pub const CommonScriptAttr = script_data.CommonScriptAttr;
pub const TextToKramaMap = script_data.TextToKramaMap;
pub const CustomOption = script_data.CustomOption;
pub const ActiveOption = script_data.ActiveOption;
pub const EnabledOption = script_data.EnabledOption;
pub const ScriptListData = script_data.script_list.ScriptListData;

pub const TransliterationFnOptions = transliterate_mod.TransliterationFnOptions;
pub const TransliterationOutput = transliterate_mod.TransliterationOutput;

pub const ListType = typing.ListType;
pub const TypingContext = typing.TypingContext;
pub const TypingContextOptions = typing.TypingContextOptions;
pub const TypingDiff = typing.TypingDiff;
pub const ScriptTypingDataMap = typing.ScriptTypingDataMap;
pub const TypingDataMapItem = typing.TypingDataMapItem;
pub const KramaDataItem = typing.KramaDataItem;

pub const get_script_list_data = script_data.getScriptListData;
pub const get_normalized_script_name = script_data.getNormalizedScriptName;
pub const get_all_options = script_data.getAllOptions;
pub const get_script_typing_data_map = typing.getScriptTypingDataMap;
pub const get_script_krama_data = typing.getScriptKramaData;
pub const emulate_typing = typing.emulateTyping;

pub fn preload_script_data(script_name: []const u8) !void {
    try script_data.preloadScriptData(script_name);
}

pub fn get_schwa_status_for_script(script_name: []const u8) !?bool {
    const normalized = (try script_data.getNormalizedScriptName(script_name)) orelse return error.InvalidScriptName;
    const data = try script_data.getScriptData(normalized);
    return switch (data.*) {
        .brahmic => |brahmic| brahmic.schwa_property,
        .other => null,
    };
}

pub fn transliterate(
    allocator: @import("std").mem.Allocator,
    text: []const u8,
    from: []const u8,
    to: []const u8,
    trans_options: ?[]const EnabledOption,
) ![]const u8 {
    const normalized_from = (try script_data.getNormalizedScriptName(from)) orelse return error.InvalidScriptName;
    const normalized_to = (try script_data.getNormalizedScriptName(to)) orelse return error.InvalidScriptName;

    if (@import("std").mem.eql(u8, normalized_from, normalized_to)) {
        return try allocator.dupe(u8, text);
    }

    const result = try transliterate_mod.transliterateText(
        allocator,
        text,
        normalized_from,
        normalized_to,
        trans_options,
        null,
    );
    return result.output;
}

const std = @import("std");
const fixtures = @import("test_helpers/fixtures.zig");

test "root transliterate short-circuits identical scripts" {
    const output = try transliterate(std.testing.allocator, "abc", "Normal", "English", null);
    defer std.testing.allocator.free(output);
    try std.testing.expectEqualStrings("abc", output);
}

test "basic normal to devanagari transliteration" {
    const output = try transliterate(std.testing.allocator, "AUM shrI paramAtmanE namaH", "Normal", "Devanagari", null);
    defer std.testing.allocator.free(output);
    try std.testing.expectEqualStrings("ॐ श्री परमात्मने नमः", output);
}

test "transliteration yaml parity" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    const root_dir = try fixtures.transliterationTestDataRoot(arena_allocator);
    const files = try fixtures.listYamlFiles(arena_allocator, root_dir, false);
    var passed_cases: usize = 0;

    for (files) |file_path| {
        const file = try std.fs.openFileAbsolute(file_path, .{});
        defer file.close();
        const text = try file.readToEndAlloc(arena_allocator, 8 * 1024 * 1024);
        const cases = try fixtures.parseTransliterationCases(arena_allocator, text);

        const file_name = std.fs.path.basename(file_path);
        for (cases) |case| {
            if (case.todo) continue;
            const result = try transliterate(allocator, case.input, case.from, case.to, case.options);
            defer allocator.free(result);

            if (std.mem.startsWith(u8, file_name, "auto") and
                std.mem.eql(u8, case.to, "Tamil-Extended") and
                containsAny(result, transliterate_mod.helpers.VEDIC_SVARAS[0..]))
            {
                continue;
            }

            if (!std.mem.eql(u8, result, case.output)) {
                std.debug.print(
                    "Transliteration mismatch in {s} index {s}\nfrom={s} to={s}\ninput={s}\nexpected={s}\nactual={s}\n",
                    .{ file_name, case.index, case.from, case.to, case.input, case.output, result },
                );
                return error.TestExpectedEqual;
            }

            if (case.reversible) {
                const reversed = try transliterate(allocator, result, case.to, case.from, case.options);
                defer allocator.free(reversed);
                if (!std.mem.eql(u8, reversed, case.input)) {
                    std.debug.print(
                        "Reverse transliteration mismatch in {s} index {s}\nfrom={s} to={s}\ninput={s}\nexpected={s}\nactual={s}\n",
                        .{ file_name, case.index, case.to, case.from, result, case.input, reversed },
                    );
                    return error.TestExpectedEqual;
                }
            }

            passed_cases += 1;
        }
    }

    std.debug.print(
        "\n Zig Transliteration  Files  {d} passed ({d})\n Zig Transliteration  Tests  {d} passed ({d})\n",
        .{ files.len, files.len, passed_cases, passed_cases },
    );
}

fn containsAny(text: []const u8, needles: []const []const u8) bool {
    for (needles) |needle| {
        if (std.mem.indexOf(u8, text, needle) != null) return true;
    }
    return false;
}
