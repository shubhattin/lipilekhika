const std = @import("std");
const schema = @import("schema.zig");

const Allocator = std.mem.Allocator;

pub const NameId = struct {
    name: []const u8,
    id: u8,
};

pub const ScriptListData = struct {
    scripts: []const NameId,
    langs: []const NameId,
    lang_script_map: std.StringHashMapUnmanaged([]const u8) = .{},
    script_alternates_map: std.StringHashMapUnmanaged([]const u8) = .{},

    pub fn findScript(self: *const ScriptListData, canonical_name: []const u8) ?[]const u8 {
        for (self.scripts) |entry| {
            if (std.mem.eql(u8, entry.name, canonical_name)) {
                return entry.name;
            }
        }
        return null;
    }

    pub fn findLang(self: *const ScriptListData, canonical_name: []const u8) ?[]const u8 {
        for (self.langs) |entry| {
            if (std.mem.eql(u8, entry.name, canonical_name)) {
                return entry.name;
            }
        }
        return null;
    }

    pub fn getNormalizedScriptName(self: *const ScriptListData, script_name: []const u8) ?[]const u8 {
        var capitalized_buf: [128]u8 = undefined;
        var lowercase_buf: [128]u8 = undefined;
        if (script_name.len > capitalized_buf.len) return null;

        const capitalized = capitalizeFirstAndAfterDash(script_name, capitalized_buf[0..script_name.len]);
        if (self.findScript(capitalized)) |canonical_script| {
            return canonical_script;
        }

        if (self.findLang(capitalized)) |canonical_lang| {
            return self.lang_script_map.get(canonical_lang);
        }

        const lower_name = toAsciiLower(script_name, lowercase_buf[0..script_name.len]);
        return self.script_alternates_map.get(lower_name);
    }
};

pub fn parseScriptListJsonBytes(allocator: Allocator, bytes: []const u8) !ScriptListData {
    const parsed = try std.json.parseFromSlice(schema.JsonValue, allocator, bytes, .{});
    return parseScriptListValue(allocator, parsed.value);
}

pub fn parseScriptListValue(allocator: Allocator, value: schema.JsonValue) !ScriptListData {
    const object = try schema.expectObject(value);

    var result = ScriptListData{
        .scripts = try parseOrderedNameIds(allocator, try schema.getRequiredValue(object, "scripts")),
        .langs = try parseOrderedNameIds(allocator, try schema.getRequiredValue(object, "langs")),
    };

    result.lang_script_map = try parseStringToStringMap(allocator, try schema.getRequiredValue(object, "lang_script_map"));
    result.script_alternates_map = try parseStringToStringMap(allocator, try schema.getRequiredValue(object, "script_alternates_map"));
    return result;
}

fn parseOrderedNameIds(allocator: Allocator, value: schema.JsonValue) ![]const NameId {
    const object = try schema.expectObject(value);
    const slice = try allocator.alloc(NameId, object.count());

    var iterator = object.iterator();
    var index: usize = 0;
    while (iterator.next()) |entry| {
        slice[index] = .{
            .name = entry.key_ptr.*,
            .id = try schema.parseU8(entry.value_ptr.*),
        };
        index += 1;
    }

    sortNameIds(slice);
    return slice;
}

fn parseStringToStringMap(allocator: Allocator, value: schema.JsonValue) !std.StringHashMapUnmanaged([]const u8) {
    const object = try schema.expectObject(value);
    var result: std.StringHashMapUnmanaged([]const u8) = .{};
    try result.ensureTotalCapacity(allocator, @intCast(object.count()));

    var iterator = object.iterator();
    while (iterator.next()) |entry| {
        try result.put(allocator, entry.key_ptr.*, try schema.expectString(entry.value_ptr.*));
    }
    return result;
}

fn sortNameIds(slice: []NameId) void {
    var i: usize = 0;
    while (i < slice.len) : (i += 1) {
        var j: usize = i + 1;
        while (j < slice.len) : (j += 1) {
            if (slice[j].id < slice[i].id) {
                std.mem.swap(NameId, &slice[i], &slice[j]);
            }
        }
    }
}

fn capitalizeFirstAndAfterDash(input: []const u8, output: []u8) []const u8 {
    var capitalize_next = true;
    for (input, 0..) |char, index| {
        if (char == '-') {
            capitalize_next = true;
            output[index] = char;
        } else if (capitalize_next and std.ascii.isAlphabetic(char)) {
            output[index] = std.ascii.toUpper(char);
            capitalize_next = false;
        } else {
            output[index] = std.ascii.toLower(char);
            capitalize_next = false;
        }
    }
    return output[0..input.len];
}

fn toAsciiLower(input: []const u8, output: []u8) []const u8 {
    for (input, 0..) |char, index| {
        output[index] = std.ascii.toLower(char);
    }
    return output[0..input.len];
}
