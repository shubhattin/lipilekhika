const std = @import("std");
const script_data = @import("../script_data/mod.zig");

const Allocator = std.mem.Allocator;

pub const TransliterationTestCase = struct {
    index: []const u8,
    from: []const u8,
    to: []const u8,
    input: []const u8,
    output: []const u8,
    options: []const script_data.EnabledOption = &.{},
    reversible: bool = false,
    todo: bool = false,
};

pub const TypingOptionsYaml = struct {
    use_native_numerals: ?bool = null,
    include_inherent_vowel: ?bool = null,
    auto_context_clear_time_ms: ?u64 = null,
};

pub const TypingTestCase = struct {
    index: i64,
    text: []const u8,
    output: []const u8,
    script: []const u8,
    preserve_check: bool = false,
    todo: bool = false,
    options: ?TypingOptionsYaml = null,
};

pub const ContextTestCase = struct {
    index: i64,
    text: []const u8,
    context: usize,
};

pub fn transliterationTestDataRoot(allocator: Allocator) ![]const u8 {
    return try std.fs.cwd().realpathAlloc(allocator, "../../test_data/transliteration");
}

pub fn typingTestDataRoot(allocator: Allocator) ![]const u8 {
    return try std.fs.cwd().realpathAlloc(allocator, "../../test_data/typing");
}

pub fn listYamlFiles(allocator: Allocator, root_dir: []const u8, skip_context_dir: bool) ![]const []const u8 {
    var collected = std.array_list.Managed([]const u8).init(allocator);
    defer collected.deinit();
    try listYamlFilesRecursive(allocator, root_dir, root_dir, skip_context_dir, &collected);
    return try collected.toOwnedSlice();
}

pub fn parseTransliterationCases(allocator: Allocator, text: []const u8) ![]const TransliterationTestCase {
    var items = std.array_list.Managed(TransliterationTestCase).init(allocator);
    defer items.deinit();

    var parser = YamlListParser.init(allocator, text);
    while (try parser.nextItem()) |item| {
        var options = std.array_list.Managed(script_data.EnabledOption).init(allocator);
        defer options.deinit();

        if (item.options) |options_map| {
            var iterator = options_map.iterator();
            while (iterator.next()) |entry| {
                try options.append(.{
                    .key = entry.key_ptr.*,
                    .enabled = parseBool(entry.value_ptr.*),
                });
            }
        }

        try items.append(.{
            .index = try dupOrEmpty(allocator, item.fields.get("index")),
            .from = try dupRequired(allocator, item.fields.get("from")),
            .to = try dupRequired(allocator, item.fields.get("to")),
            .input = try dupRequired(allocator, item.fields.get("input")),
            .output = try dupRequired(allocator, item.fields.get("output")),
            .options = try options.toOwnedSlice(),
            .reversible = parseOptionalBool(item.fields.get("reversible")),
            .todo = parseOptionalBool(item.fields.get("todo")),
        });
    }

    return try items.toOwnedSlice();
}

pub fn parseTypingCases(allocator: Allocator, text: []const u8) ![]const TypingTestCase {
    var items = std.array_list.Managed(TypingTestCase).init(allocator);
    defer items.deinit();

    var parser = YamlListParser.init(allocator, text);
    while (try parser.nextItem()) |item| {
        var parsed_options: ?TypingOptionsYaml = null;
        if (item.options) |options_map| {
            parsed_options = .{
                .use_native_numerals = parseOptionalBoolPtr(options_map.get("useNativeNumerals")),
                .include_inherent_vowel = parseOptionalBoolPtr(options_map.get("includeInherentVowel")),
                .auto_context_clear_time_ms = parseOptionalU64(options_map.get("autoContextTClearTimeMs")),
            };
        }

        try items.append(.{
            .index = try parseI64Required(item.fields.get("index")),
            .text = try dupRequired(allocator, item.fields.get("text")),
            .output = try dupRequired(allocator, item.fields.get("output")),
            .script = try dupRequired(allocator, item.fields.get("script")),
            .preserve_check = parseOptionalBool(item.fields.get("preserve_check")),
            .todo = parseOptionalBool(item.fields.get("todo")),
            .options = parsed_options,
        });
    }

    return try items.toOwnedSlice();
}

pub fn parseContextCases(allocator: Allocator, text: []const u8) ![]const ContextTestCase {
    var items = std.array_list.Managed(ContextTestCase).init(allocator);
    defer items.deinit();

    var parser = YamlListParser.init(allocator, text);
    while (try parser.nextItem()) |item| {
        try items.append(.{
            .index = try parseI64Required(item.fields.get("index")),
            .text = try dupRequired(allocator, item.fields.get("text")),
            .context = @intCast(try parseI64Required(item.fields.get("context"))),
        });
    }

    return try items.toOwnedSlice();
}

fn listYamlFilesRecursive(
    allocator: Allocator,
    base_dir: []const u8,
    current_dir: []const u8,
    skip_context_dir: bool,
    out: *std.array_list.Managed([]const u8),
) !void {
    var dir = try openDirForPath(current_dir, true);
    defer dir.close();

    var iterator = dir.iterate();
    while (try iterator.next()) |entry| {
        const full_path = try std.fs.path.join(allocator, &.{ current_dir, entry.name });
        if (entry.kind == .directory) {
            if (skip_context_dir and std.mem.eql(u8, entry.name, "context")) continue;
            try listYamlFilesRecursive(allocator, base_dir, full_path, skip_context_dir, out);
        } else if (entry.kind == .file and std.mem.endsWith(u8, entry.name, ".yaml")) {
            try out.append(full_path);
        }
    }
}

const ParsedYamlItem = struct {
    fields: std.StringHashMapUnmanaged([]const u8),
    options: ?std.StringHashMapUnmanaged([]const u8),
};

const YamlListParser = struct {
    allocator: Allocator,
    text: []const u8,
    lines: []const []const u8,
    index: usize,

    fn init(allocator: Allocator, text: []const u8) YamlListParser {
        return .{
            .allocator = allocator,
            .text = text,
            .lines = splitLines(allocator, text) catch unreachable,
            .index = 0,
        };
    }

    fn nextItem(self: *YamlListParser) !?ParsedYamlItem {
        while (self.index < self.lines.len) : (self.index += 1) {
            const line = trim(self.lines[self.index]);
            if (line.len == 0 or std.mem.startsWith(u8, line, "#")) continue;
            if (!std.mem.startsWith(u8, line, "- ")) continue;

            var fields: std.StringHashMapUnmanaged([]const u8) = .{};
            try fields.ensureTotalCapacity(self.allocator, 8);
            var options: ?std.StringHashMapUnmanaged([]const u8) = null;

            const first_line = line[2..];
            try parseKeyValueInto(self.allocator, &fields, first_line);
            self.index += 1;

            while (self.index < self.lines.len) : (self.index += 1) {
                const raw_line = self.lines[self.index];
                const current = trim(raw_line);
                if (current.len == 0 or std.mem.startsWith(u8, current, "#")) continue;
                if (std.mem.startsWith(u8, current, "- ")) break;

                const indent = raw_line.len - std.mem.trimLeft(u8, raw_line, " ").len;
                if (std.mem.eql(u8, current, "options:")) {
                    options = .{};
                    try options.?.ensureTotalCapacity(self.allocator, 8);
                    continue;
                }

                if (options != null and indent >= 4) {
                    try parseKeyValueInto(self.allocator, &options.?, current);
                } else {
                    try parseKeyValueInto(self.allocator, &fields, current);
                }
            }

            return .{
                .fields = fields,
                .options = options,
            };
        }

        return null;
    }
};

fn splitLines(allocator: Allocator, text: []const u8) ![]const []const u8 {
    var out = std.array_list.Managed([]const u8).init(allocator);
    defer out.deinit();
    var iter = std.mem.splitScalar(u8, text, '\n');
    while (iter.next()) |line| {
        try out.append(std.mem.trimRight(u8, line, "\r"));
    }
    return try out.toOwnedSlice();
}

fn parseKeyValueInto(
    allocator: Allocator,
    map: *std.StringHashMapUnmanaged([]const u8),
    line: []const u8,
) !void {
    const colon_index = findKeyValueSeparator(line) orelse return;
    const raw_key = trim(line[0..colon_index]);
    const key = unquote(raw_key);
    const raw_value = trim(line[colon_index + 1 ..]);
    const parsed_value = try parseYamlValue(allocator, raw_value);
    try map.put(allocator, try allocator.dupe(u8, key), parsed_value);
}

fn parseYamlValue(allocator: Allocator, raw_value: []const u8) ![]const u8 {
    if (raw_value.len >= 2 and raw_value[0] == '"' and raw_value[raw_value.len - 1] == '"') {
        return try unescapeDoubleQuoted(allocator, raw_value[1 .. raw_value.len - 1]);
    }
    return try allocator.dupe(u8, raw_value);
}

fn unescapeDoubleQuoted(allocator: Allocator, text: []const u8) ![]const u8 {
    var out = std.array_list.Managed(u8).init(allocator);
    defer out.deinit();

    var index: usize = 0;
    while (index < text.len) : (index += 1) {
        if (text[index] == '\\' and index + 1 < text.len) {
            index += 1;
            switch (text[index]) {
                'n' => try out.append('\n'),
                '"' => try out.append('"'),
                '\\' => try out.append('\\'),
                else => try out.append(text[index]),
            }
        } else {
            try out.append(text[index]);
        }
    }

    return try out.toOwnedSlice();
}

fn trim(text: []const u8) []const u8 {
    return std.mem.trim(u8, text, " ");
}

fn unquote(text: []const u8) []const u8 {
    if (text.len >= 2 and text[0] == '"' and text[text.len - 1] == '"') {
        return text[1 .. text.len - 1];
    }
    return text;
}

fn findKeyValueSeparator(line: []const u8) ?usize {
    if (line.len == 0) return null;
    if (line[0] == '"') {
        var i: usize = 1;
        while (i < line.len) : (i += 1) {
            if (line[i] == '"' and line[i - 1] != '\\') {
                var j = i + 1;
                while (j < line.len) : (j += 1) {
                    if (line[j] == ':') return j;
                }
                return null;
            }
        }
        return null;
    }
    return std.mem.indexOfScalar(u8, line, ':');
}

fn dupRequired(allocator: Allocator, value: ?[]const u8) ![]const u8 {
    return try allocator.dupe(u8, value orelse return error.MissingField);
}

fn dupOrEmpty(allocator: Allocator, value: ?[]const u8) ![]const u8 {
    return try allocator.dupe(u8, value orelse "");
}

fn parseBool(text: []const u8) bool {
    return std.mem.eql(u8, text, "true");
}

fn parseOptionalBool(value: ?[]const u8) bool {
    return if (value) |text| parseBool(text) else false;
}

fn parseOptionalBoolPtr(value: ?[]const u8) ?bool {
    return if (value) |text| parseBool(text) else null;
}

fn parseOptionalU64(value: ?[]const u8) ?u64 {
    return if (value) |text| std.fmt.parseInt(u64, text, 10) catch null else null;
}

fn parseI64Required(value: ?[]const u8) !i64 {
    return try std.fmt.parseInt(i64, value orelse return error.MissingField, 10);
}

fn openDirForPath(path: []const u8, iterate: bool) !std.fs.Dir {
    if (std.fs.path.isAbsolute(path)) {
        return try std.fs.openDirAbsolute(path, .{ .iterate = iterate });
    }
    return try std.fs.cwd().openDir(path, .{ .iterate = iterate });
}
