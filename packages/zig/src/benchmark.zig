const std = @import("std");
const root = @import("root.zig");
const fixtures = @import("test_helpers/fixtures.zig");

const Allocator = std.mem.Allocator;
const BULK_SEPARATOR = "\n";

const BenchSummary = struct {
    transliteration_cases: usize,
    transliteration_batches: usize,
    typing_cases: usize,
    typing_batches: usize,
    total_fixture_cases: usize,
    normal_to_other_cases: usize,
    total_iterated_workloads: usize,
    transliteration_iterated_ms: f64,
    transliteration_bulk_ms: f64,
    typing_iterated_ms: f64,
    typing_bulk_ms: f64,
};

const TransliterationBatch = struct {
    from: []const u8,
    to: []const u8,
    input: []const u8,
};

const TypingBatch = struct {
    script: []const u8,
    input: []const u8,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const output_json = blk: {
        var args = try std.process.argsWithAllocator(allocator);
        defer args.deinit();
        _ = args.next();
        break :blk while (args.next()) |arg| {
            if (std.mem.eql(u8, arg, "--json")) break true;
        } else false;
    };

    const summary = try benchmark(allocator);

    if (output_json) {
        const stdout = std.fs.File.stdout().deprecatedWriter();
        try stdout.print(
            "{{\n  \"transliteration_cases\": {d},\n  \"transliteration_batches\": {d},\n  \"typing_cases\": {d},\n  \"typing_batches\": {d},\n  \"total_fixture_cases\": {d},\n  \"normal_to_other_cases\": {d},\n  \"total_iterated_workloads\": {d},\n  \"transliteration_iterated_ms\": {d:.2},\n  \"transliteration_bulk_ms\": {d:.2},\n  \"typing_iterated_ms\": {d:.2},\n  \"typing_bulk_ms\": {d:.2}\n}}\n",
            .{
                summary.transliteration_cases,
                summary.transliteration_batches,
                summary.typing_cases,
                summary.typing_batches,
                summary.total_fixture_cases,
                summary.normal_to_other_cases,
                summary.total_iterated_workloads,
                summary.transliteration_iterated_ms,
                summary.transliteration_bulk_ms,
                summary.typing_iterated_ms,
                summary.typing_bulk_ms,
            },
        );
        return;
    }

    const stdout = std.fs.File.stdout().deprecatedWriter();
    try stdout.print("Zig Benchmark Results\n", .{});
    try stdout.print("Transliteration Cases: {d}\n", .{summary.transliteration_cases});
    try stdout.print("Transliteration Batches: {d}\n", .{summary.transliteration_batches});
    try stdout.print("Typing Cases: {d}\n", .{summary.typing_cases});
    try stdout.print("Typing Batches: {d}\n", .{summary.typing_batches});
    try stdout.print("Total Fixture Cases: {d}\n", .{summary.total_fixture_cases});
    try stdout.print("Normal->Other Cases: {d}\n", .{summary.normal_to_other_cases});
    try stdout.print("Total Iterated Workloads: {d}\n", .{summary.total_iterated_workloads});
    try stdout.print("Transliteration Iterated: {d:.2} ms\n", .{summary.transliteration_iterated_ms});
    try stdout.print("Transliteration Bulk: {d:.2} ms\n", .{summary.transliteration_bulk_ms});
    try stdout.print("Typing Iterated: {d:.2} ms\n", .{summary.typing_iterated_ms});
    try stdout.print("Typing Bulk: {d:.2} ms\n", .{summary.typing_bulk_ms});
}

fn benchmark(allocator: Allocator) !BenchSummary {
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    try root.preload_script_data("Normal");

    const translit_root = try fixtures.transliterationTestDataRoot(arena_allocator);
    const translit_files = try fixtures.listYamlFiles(arena_allocator, translit_root, false);
    const transliteration_cases = try loadTransliterationCases(arena_allocator, translit_files);
    const transliteration_batches = try buildTransliterationBatches(arena_allocator, transliteration_cases);

    const typing_root = try fixtures.typingTestDataRoot(arena_allocator);
    const typing_files = try fixtures.listYamlFiles(arena_allocator, typing_root, true);
    const typing_cases = try loadTypingCases(arena_allocator, typing_files);
    const typing_batches = try buildTypingBatches(arena_allocator, transliteration_cases, typing_cases);
    const normal_to_other_cases = countNormalToOtherCases(transliteration_cases);
    const total_fixture_cases = transliteration_cases.len + typing_cases.len;
    const total_iterated_workloads = transliteration_cases.len + normal_to_other_cases + typing_cases.len;

    const transliteration_iterated_ms = try measureIndividualTransliteration(allocator, transliteration_cases);
    const transliteration_bulk_ms = try measureBulkTransliteration(allocator, transliteration_batches);
    const typing_iterated_ms = try measureIndividualTyping(allocator, transliteration_cases, typing_cases);
    const typing_bulk_ms = try measureBulkTyping(allocator, typing_batches);

    return .{
        .transliteration_cases = transliteration_cases.len,
        .transliteration_batches = transliteration_batches.len,
        .typing_cases = typing_cases.len,
        .typing_batches = typing_batches.len,
        .total_fixture_cases = total_fixture_cases,
        .normal_to_other_cases = normal_to_other_cases,
        .total_iterated_workloads = total_iterated_workloads,
        .transliteration_iterated_ms = transliteration_iterated_ms,
        .transliteration_bulk_ms = transliteration_bulk_ms,
        .typing_iterated_ms = typing_iterated_ms,
        .typing_bulk_ms = typing_bulk_ms,
    };
}

fn loadTransliterationCases(allocator: Allocator, files: []const []const u8) ![]const fixtures.TransliterationTestCase {
    var out = std.array_list.Managed(fixtures.TransliterationTestCase).init(allocator);
    defer out.deinit();

    for (files) |file_path| {
        const file = try std.fs.openFileAbsolute(file_path, .{});
        defer file.close();
        const text = try file.readToEndAlloc(allocator, 8 * 1024 * 1024);
        const cases = try fixtures.parseTransliterationCases(allocator, text);
        for (cases) |case| {
            if (case.todo) continue;
            try out.append(case);
        }
    }

    return try out.toOwnedSlice();
}

fn loadTypingCases(allocator: Allocator, files: []const []const u8) ![]const fixtures.TypingTestCase {
    var out = std.array_list.Managed(fixtures.TypingTestCase).init(allocator);
    defer out.deinit();

    for (files) |file_path| {
        const file = try std.fs.openFileAbsolute(file_path, .{});
        defer file.close();
        const text = try file.readToEndAlloc(allocator, 4 * 1024 * 1024);
        const cases = try fixtures.parseTypingCases(allocator, text);
        for (cases) |case| {
            if (case.todo) continue;
            try out.append(case);
        }
    }

    return try out.toOwnedSlice();
}

fn buildTransliterationBatches(
    allocator: Allocator,
    cases: []const fixtures.TransliterationTestCase,
) ![]const TransliterationBatch {
    var grouped = std.StringHashMapUnmanaged(std.array_list.Managed([]const u8)){};
    defer {
        var it = grouped.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.deinit();
        }
        grouped.deinit(allocator);
    }

    for (cases) |case| {
        const key = try std.fmt.allocPrint(allocator, "{s}\x00{s}", .{ case.from, case.to });
        const gop = try grouped.getOrPut(allocator, key);
        if (!gop.found_existing) {
            gop.value_ptr.* = std.array_list.Managed([]const u8).init(allocator);
        }
        try gop.value_ptr.append(case.input);
    }

    var batches = std.array_list.Managed(TransliterationBatch).init(allocator);
    defer batches.deinit();

    var it = grouped.iterator();
    while (it.next()) |entry| {
        const sep = std.mem.indexOfScalar(u8, entry.key_ptr.*, 0).?;
        const from = entry.key_ptr.*[0..sep];
        const to = entry.key_ptr.*[sep + 1 ..];
        const input = try std.mem.join(allocator, BULK_SEPARATOR, entry.value_ptr.items);
        try batches.append(.{
            .from = from,
            .to = to,
            .input = input,
        });
    }

    return try batches.toOwnedSlice();
}

fn buildTypingBatches(
    allocator: Allocator,
    translit_cases: []const fixtures.TransliterationTestCase,
    typing_cases: []const fixtures.TypingTestCase,
) ![]const TypingBatch {
    var grouped = std.StringHashMapUnmanaged(std.array_list.Managed([]const u8)){};
    defer {
        var it = grouped.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.deinit();
        }
        grouped.deinit(allocator);
    }

    for (translit_cases) |case| {
        if (!std.mem.eql(u8, case.from, "Normal")) continue;
        const gop = try grouped.getOrPut(allocator, case.to);
        if (!gop.found_existing) {
            gop.value_ptr.* = std.array_list.Managed([]const u8).init(allocator);
        }
        try gop.value_ptr.append(case.input);
    }

    for (typing_cases) |case| {
        const gop = try grouped.getOrPut(allocator, case.script);
        if (!gop.found_existing) {
            gop.value_ptr.* = std.array_list.Managed([]const u8).init(allocator);
        }
        try gop.value_ptr.append(case.text);
    }

    var batches = std.array_list.Managed(TypingBatch).init(allocator);
    defer batches.deinit();

    var it = grouped.iterator();
    while (it.next()) |entry| {
        const input = try std.mem.join(allocator, BULK_SEPARATOR, entry.value_ptr.items);
        try batches.append(.{
            .script = entry.key_ptr.*,
            .input = input,
        });
    }

    return try batches.toOwnedSlice();
}

fn measureIndividualTransliteration(allocator: Allocator, cases: []const fixtures.TransliterationTestCase) !f64 {
    const start = std.time.nanoTimestamp();
    for (cases) |case| {
        const output = try root.transliterate(allocator, case.input, case.from, case.to, case.options);
        allocator.free(output);
    }
    const end = std.time.nanoTimestamp();
    return @as(f64, @floatFromInt(end - start)) / @as(f64, std.time.ns_per_ms);
}

fn measureBulkTransliteration(allocator: Allocator, batches: []const TransliterationBatch) !f64 {
    const start = std.time.nanoTimestamp();
    for (batches) |batch| {
        const output = try root.transliterate(allocator, batch.input, batch.from, batch.to, null);
        allocator.free(output);
    }
    const end = std.time.nanoTimestamp();
    return @as(f64, @floatFromInt(end - start)) / @as(f64, std.time.ns_per_ms);
}

fn measureIndividualTyping(
    allocator: Allocator,
    translit_cases: []const fixtures.TransliterationTestCase,
    typing_cases: []const fixtures.TypingTestCase,
) !f64 {
    const start = std.time.nanoTimestamp();
    for (translit_cases) |case| {
        if (!std.mem.eql(u8, case.from, "Normal")) continue;
        const output = try root.emulate_typing(allocator, case.input, case.to, null);
        allocator.free(output);
    }
    for (typing_cases) |case| {
        const options = buildTypingOptions(case.options);
        const output = try root.emulate_typing(allocator, case.text, case.script, options);
        allocator.free(output);
    }
    const end = std.time.nanoTimestamp();
    return @as(f64, @floatFromInt(end - start)) / @as(f64, std.time.ns_per_ms);
}

fn measureBulkTyping(allocator: Allocator, batches: []const TypingBatch) !f64 {
    const start = std.time.nanoTimestamp();
    for (batches) |batch| {
        const output = try root.emulate_typing(allocator, batch.input, batch.script, null);
        allocator.free(output);
    }
    const end = std.time.nanoTimestamp();
    return @as(f64, @floatFromInt(end - start)) / @as(f64, std.time.ns_per_ms);
}

fn countNormalToOtherCases(cases: []const fixtures.TransliterationTestCase) usize {
    var count: usize = 0;
    for (cases) |case| {
        if (std.mem.eql(u8, case.from, "Normal") and !std.mem.eql(u8, case.to, "Normal")) {
            count += 1;
        }
    }
    return count;
}

fn buildTypingOptions(source: ?fixtures.TypingOptionsYaml) ?root.TypingContextOptions {
    if (source == null) return null;
    const src = source.?;
    var out = root.TypingContextOptions{};
    if (src.use_native_numerals) |value| out.use_native_numerals = value;
    if (src.include_inherent_vowel) |value| out.include_inherent_vowel = value;
    if (src.auto_context_clear_time_ms) |value| out.auto_context_clear_time_ms = value;
    return out;
}
