const std = @import("std");
const schema = @import("schema.zig");
const script_list_mod = @import("script_list.zig");
const custom_options_mod = @import("custom_options.zig");

const Allocator = std.mem.Allocator;
const testing = std.testing;

const max_file_bytes = 16 * 1024 * 1024;

pub const Error = error{
    InvalidScriptName,
};

pub const Store = struct {
    arena: std.heap.ArenaAllocator,
    data_root: []const u8,
    script_list: script_list_mod.ScriptListData,
    custom_options: custom_options_mod.CustomOptionMap = .{},
    script_data: std.StringHashMapUnmanaged(schema.ScriptData) = .{},

    pub fn init(backing_allocator: Allocator) !Store {
        return initWithDataRoot(backing_allocator, null);
    }

    pub fn initWithDataRoot(backing_allocator: Allocator, data_root_override: ?[]const u8) !Store {
        var arena = std.heap.ArenaAllocator.init(backing_allocator);
        errdefer arena.deinit();

        var self = Store{
            .arena = arena,
            .data_root = undefined,
            .script_list = undefined,
        };

        const arena_allocator = self.arena.allocator();
        self.data_root = if (data_root_override) |data_root|
            try arena_allocator.dupe(u8, data_root)
        else
            try defaultDataRoot(arena_allocator);

        try self.load();
        return self;
    }

    pub fn deinit(self: *Store) void {
        self.arena.deinit();
        self.* = undefined;
    }

    pub fn getScriptListData(self: *const Store) *const script_list_mod.ScriptListData {
        return &self.script_list;
    }

    pub fn getCustomOptions(self: *const Store) *const custom_options_mod.CustomOptionMap {
        return &self.custom_options;
    }

    pub fn getNormalizedScriptName(self: *const Store, script_name: []const u8) ?[]const u8 {
        return self.script_list.getNormalizedScriptName(script_name);
    }

    pub fn getScriptData(self: *const Store, script_name: []const u8) ?*const schema.ScriptData {
        const normalized = self.getNormalizedScriptName(script_name) orelse return null;
        return self.script_data.getPtr(normalized);
    }

    pub fn getAllOptions(
        self: *const Store,
        allocator: Allocator,
        from_script_name: []const u8,
        to_script_name: []const u8,
    ) ![]const []const u8 {
        const from_script_data = self.getScriptData(from_script_name) orelse return Error.InvalidScriptName;
        const to_script_data = self.getScriptData(to_script_name) orelse return Error.InvalidScriptName;
        return custom_options_mod.getAllApplicableOptionKeys(
            allocator,
            &self.custom_options,
            from_script_data,
            to_script_data,
        );
    }

    pub fn getActiveCustomOptions(
        self: *const Store,
        allocator: Allocator,
        from_script_name: []const u8,
        to_script_name: []const u8,
        input_options: []const custom_options_mod.EnabledOption,
    ) ![]const custom_options_mod.ActiveOption {
        const from_script_data = self.getScriptData(from_script_name) orelse return Error.InvalidScriptName;
        const to_script_data = self.getScriptData(to_script_name) orelse return Error.InvalidScriptName;
        return custom_options_mod.getActiveCustomOptions(
            allocator,
            &self.custom_options,
            from_script_data,
            to_script_data,
            input_options,
        );
    }

    fn load(self: *Store) !void {
        const arena_allocator = self.arena.allocator();

        const script_list_path = try std.fs.path.join(arena_allocator, &.{ self.data_root, "script_list.json" });
        const script_list_bytes = try readFileAlloc(arena_allocator, script_list_path);
        self.script_list = try script_list_mod.parseScriptListJsonBytes(arena_allocator, script_list_bytes);

        const custom_options_path = try std.fs.path.join(arena_allocator, &.{ self.data_root, "custom_options.json" });
        const custom_options_bytes = try readFileAlloc(arena_allocator, custom_options_path);
        self.custom_options = try custom_options_mod.parseCustomOptionsJsonBytes(arena_allocator, custom_options_bytes);

        try self.loadScriptDataDirectory();
    }

    fn loadScriptDataDirectory(self: *Store) !void {
        const arena_allocator = self.arena.allocator();
        const script_data_dir_path = try std.fs.path.join(arena_allocator, &.{ self.data_root, "script_data" });
        var dir = try openDirForPath(script_data_dir_path, true);
        defer dir.close();

        var iterator = dir.iterate();
        while (try iterator.next()) |entry| {
            if (entry.kind != .file) continue;
            if (!std.mem.endsWith(u8, entry.name, ".json")) continue;

            const file_path = try std.fs.path.join(arena_allocator, &.{ script_data_dir_path, entry.name });
            const bytes = try readFileAlloc(arena_allocator, file_path);
            var parsed_script = try schema.parseScriptDataJsonBytes(arena_allocator, bytes);
            try parsed_script.initLookups(arena_allocator);
            try self.script_data.put(arena_allocator, parsed_script.scriptName(), parsed_script);
        }
    }
};

var global_store: ?Store = null;

pub fn getGlobalStore() !*Store {
    if (global_store == null) {
        global_store = try Store.init(std.heap.page_allocator);
    }
    return &global_store.?;
}

pub fn preloadScriptData(_: []const u8) !void {
    _ = try getGlobalStore();
}

pub fn getScriptListData() !*const script_list_mod.ScriptListData {
    const store = try getGlobalStore();
    return store.getScriptListData();
}

pub fn getCustomOptionsMap() !*const custom_options_mod.CustomOptionMap {
    const store = try getGlobalStore();
    return store.getCustomOptions();
}

pub fn getNormalizedScriptName(script_name: []const u8) !?[]const u8 {
    const store = try getGlobalStore();
    return store.getNormalizedScriptName(script_name);
}

pub fn getScriptData(script_name: []const u8) !*const schema.ScriptData {
    const store = try getGlobalStore();
    return store.getScriptData(script_name) orelse Error.InvalidScriptName;
}

pub fn getAllOptions(
    allocator: Allocator,
    from_script_name: []const u8,
    to_script_name: []const u8,
) ![]const []const u8 {
    const store = try getGlobalStore();
    return store.getAllOptions(allocator, from_script_name, to_script_name);
}

pub fn defaultDataRoot(allocator: Allocator) ![]const u8 {
    return try std.fs.cwd().realpathAlloc(allocator, "src/data");
}

fn readFileAlloc(allocator: Allocator, path: []const u8) ![]u8 {
    if (std.fs.path.isAbsolute(path)) {
        const file = try std.fs.openFileAbsolute(path, .{});
        defer file.close();
        return try file.readToEndAlloc(allocator, max_file_bytes);
    }

    const file = try std.fs.cwd().openFile(path, .{});
    defer file.close();
    return try file.readToEndAlloc(allocator, max_file_bytes);
}

fn openDirForPath(path: []const u8, iterate: bool) !std.fs.Dir {
    if (std.fs.path.isAbsolute(path)) {
        return try std.fs.openDirAbsolute(path, .{ .iterate = iterate });
    }
    return try std.fs.cwd().openDir(path, .{ .iterate = iterate });
}

test "all script data json files parse" {
    const allocator = testing.allocator;
    const data_root = try defaultDataRoot(allocator);
    defer allocator.free(data_root);

    const script_data_path = try std.fs.path.join(allocator, &.{ data_root, "script_data" });
    defer allocator.free(script_data_path);

    var dir = try openDirForPath(script_data_path, true);
    defer dir.close();

    var iterator = dir.iterate();
    while (try iterator.next()) |entry| {
        if (entry.kind != .file) continue;
        if (!std.mem.endsWith(u8, entry.name, ".json")) continue;

        const file_path = try std.fs.path.join(allocator, &.{ script_data_path, entry.name });
        defer allocator.free(file_path);

        const bytes = try readFileAlloc(allocator, file_path);
        defer allocator.free(bytes);

        _ = try schema.parseScriptDataJsonBytes(allocator, bytes);
    }
}

test "script list and custom options parse" {
    const allocator = testing.allocator;
    const data_root = try defaultDataRoot(allocator);
    defer allocator.free(data_root);

    const script_list_path = try std.fs.path.join(allocator, &.{ data_root, "script_list.json" });
    defer allocator.free(script_list_path);
    const script_list_bytes = try readFileAlloc(allocator, script_list_path);
    defer allocator.free(script_list_bytes);
    const script_list = try script_list_mod.parseScriptListJsonBytes(allocator, script_list_bytes);
    try testing.expect(script_list.scripts.len > 0);
    try testing.expect(script_list.langs.len > 0);

    const custom_options_path = try std.fs.path.join(allocator, &.{ data_root, "custom_options.json" });
    defer allocator.free(custom_options_path);
    const custom_options_bytes = try readFileAlloc(allocator, custom_options_path);
    defer allocator.free(custom_options_bytes);
    const options = try custom_options_mod.parseCustomOptionsJsonBytes(allocator, custom_options_bytes);
    try testing.expect(options.count() > 0);
}

test "store loads all data and normalizes names" {
    var store = try Store.init(testing.allocator);
    defer store.deinit();

    try testing.expect(store.script_data.count() > 0);
    try testing.expectEqualStrings("Devanagari", store.getNormalizedScriptName("dev").?);
    try testing.expectEqualStrings("Tamil-Extended", store.getNormalizedScriptName("TAM-EXT").?);
    try testing.expectEqualStrings("Normal", store.getNormalizedScriptName("English").?);
    try testing.expect(store.getNormalizedScriptName("UnknownScript") == null);
}

test "script data unions decode correctly" {
    var store = try Store.init(testing.allocator);
    defer store.deinit();

    const devanagari = store.getScriptData("Devanagari").?;
    switch (devanagari.*) {
        .brahmic => |brahmic| {
            try testing.expectEqual(false, brahmic.schwa_property);
            try testing.expectEqualStrings("्", brahmic.halant);
            try testing.expect(brahmic.common_script_attr.list.len > 0);

            var saw_svara = false;
            var saw_matra = false;
            for (brahmic.common_script_attr.list) |list| {
                saw_svara = saw_svara or list.isSvara();
                saw_matra = saw_matra or list.isMatra();
            }
            try testing.expect(saw_svara);
            try testing.expect(saw_matra);
        },
        .other => unreachable,
    }

    const normal = store.getScriptData("Normal").?;
    switch (normal.*) {
        .other => |other| {
            try testing.expectEqualStrings("a", other.schwa_character);
            try testing.expectEqual(@as(usize, 0), other.common_script_attr.list.len);
        },
        .brahmic => unreachable,
    }
}

test "lookup indexes keep the first matching entry" {
    var store = try Store.init(testing.allocator);
    defer store.deinit();

    const devanagari = store.getScriptData("Devanagari").?;
    const common = devanagari.getCommonAttr();

    try testing.expectEqual(@as(?usize, 1), common.krama_text_lookup.get("अ"));
    try testing.expectEqual(@as(?usize, 2), devanagari.textToKramaMapIndex("ऎ", false));
    try testing.expectEqual(@as(?usize, 0), devanagari.customScriptCharIndexOfText(""));
}

test "get all options preserves custom option order" {
    var store = try Store.init(testing.allocator);
    defer store.deinit();

    const options = try store.getAllOptions(testing.allocator, "dev", "tel");
    defer testing.allocator.free(options);

    try testing.expectEqual(@as(usize, 1), options.len);
    try testing.expectEqualStrings(
        "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
        options[0],
    );
}

test "active custom option filtering matches js cases" {
    var store = try Store.init(testing.allocator);
    defer store.deinit();

    const case_one_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "all_to_normal:remove_virAma_and_double_virAma" },
    };
    const case_one_expected = [_][]const u8{
        "all_to_normal:remove_virAma_and_double_virAma",
    };

    const case_two_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "all_to_normal:remove_virAma_and_double_virAma" },
        .{ .key = "all_to_normal:replace_avagraha_with_a" },
        .{ .key = "all_to_sinhala:use_conjunct_enabling_halant" },
    };
    const case_two_expected = [_][]const u8{
        "all_to_normal:remove_virAma_and_double_virAma",
        "all_to_normal:replace_avagraha_with_a",
    };

    const case_three_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "all_to_normal:replace_avagraha_with_a" },
    };
    const case_three_expected = [_][]const u8{
        "all_to_normal:replace_avagraha_with_a",
    };

    const case_four_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" },
        .{ .key = "all_to_sinhala:use_conjunct_enabling_halant" },
    };
    const case_four_expected = [_][]const u8{
        "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
    };

    const case_five_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" },
    };
    const case_five_expected = [_][]const u8{};

    const case_six_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "all_to_sinhala:use_conjunct_enabling_halant" },
    };
    const case_six_expected = [_][]const u8{
        "all_to_sinhala:use_conjunct_enabling_halant",
    };

    const case_seven_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "all_to_sinhala:use_conjunct_enabling_halant" },
    };
    const case_seven_expected = [_][]const u8{
        "all_to_sinhala:use_conjunct_enabling_halant",
    };

    const case_eight_inputs = [_]custom_options_mod.EnabledOption{
        .{ .key = "all_to_sinhala:use_conjunct_enabling_halant" },
        .{ .key = "all_to_normal:remove_virAma_and_double_virAma" },
    };
    const case_eight_expected = [_][]const u8{
        "all_to_sinhala:use_conjunct_enabling_halant",
    };

    const cases = [_]struct {
        from: []const u8,
        to: []const u8,
        inputs: []const custom_options_mod.EnabledOption,
        expected: []const []const u8,
    }{
        .{ .from = "Devanagari", .to = "Normal", .inputs = case_one_inputs[0..], .expected = case_one_expected[0..] },
        .{ .from = "Telugu", .to = "Normal", .inputs = case_two_inputs[0..], .expected = case_two_expected[0..] },
        .{ .from = "Romanized", .to = "Normal", .inputs = case_three_inputs[0..], .expected = case_three_expected[0..] },
        .{ .from = "Devanagari", .to = "Telugu", .inputs = case_four_inputs[0..], .expected = case_four_expected[0..] },
        .{ .from = "Romanized", .to = "Tamil", .inputs = case_five_inputs[0..], .expected = case_five_expected[0..] },
        .{ .from = "Normal", .to = "Sinhala", .inputs = case_six_inputs[0..], .expected = case_six_expected[0..] },
        .{ .from = "Romanized", .to = "Sinhala", .inputs = case_seven_inputs[0..], .expected = case_seven_expected[0..] },
        .{ .from = "Telugu", .to = "Sinhala", .inputs = case_eight_inputs[0..], .expected = case_eight_expected[0..] },
    };

    for (cases) |case| {
        const active = try store.getActiveCustomOptions(testing.allocator, case.from, case.to, case.inputs);
        defer testing.allocator.free(active);
        try expectActiveKeys(active, case.expected);
    }
}

fn expectActiveKeys(active: []const custom_options_mod.ActiveOption, expected: []const []const u8) !void {
    try testing.expectEqual(expected.len, active.len);
    for (expected) |expected_key| {
        var found = false;
        for (active) |active_option| {
            if (std.mem.eql(u8, active_option.key, expected_key)) {
                found = true;
                break;
            }
        }
        try testing.expect(found);
    }
}
