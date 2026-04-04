const std = @import("std");
const schema = @import("schema.zig");

const Allocator = std.mem.Allocator;

pub const CustomOptionMap = std.StringArrayHashMapUnmanaged(schema.CustomOption);

pub const EnabledOption = struct {
    key: []const u8,
    enabled: bool = true,
};

pub const ActiveOption = struct {
    key: []const u8,
    enabled: bool,
};

pub fn parseCustomOptionsJsonBytes(allocator: Allocator, bytes: []const u8) !CustomOptionMap {
    const parsed = try std.json.parseFromSlice(schema.JsonValue, allocator, bytes, .{});
    return parseCustomOptionsValue(allocator, parsed.value);
}

pub fn parseCustomOptionsValue(allocator: Allocator, value: schema.JsonValue) !CustomOptionMap {
    const object = try schema.expectObject(value);
    var result: CustomOptionMap = .{};
    try result.ensureTotalCapacity(allocator, object.count());

    var iterator = object.iterator();
    while (iterator.next()) |entry| {
        try result.put(allocator, entry.key_ptr.*, try schema.parseCustomOption(allocator, entry.value_ptr.*));
    }
    return result;
}

pub fn getActiveCustomOptions(
    allocator: Allocator,
    options_map: *const CustomOptionMap,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
    input_options: []const EnabledOption,
) ![]const ActiveOption {
    var list = std.array_list.Managed(ActiveOption).init(allocator);
    defer list.deinit();

    for (input_options) |input_option| {
        const option = options_map.get(input_option.key) orelse continue;
        if (isOptionActiveForScripts(option, from_script_data, to_script_data)) {
            try list.append(.{
                .key = input_option.key,
                .enabled = input_option.enabled,
            });
        }
    }

    return try list.toOwnedSlice();
}

pub fn getAllApplicableOptionKeys(
    allocator: Allocator,
    options_map: *const CustomOptionMap,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
) ![]const []const u8 {
    var list = std.array_list.Managed([]const u8).init(allocator);
    defer list.deinit();

    for (options_map.keys(), options_map.values()) |key, option| {
        if (isOptionActiveForScripts(option, from_script_data, to_script_data)) {
            try list.append(key);
        }
    }

    return try list.toOwnedSlice();
}

pub fn isOptionActiveForScripts(
    option: schema.CustomOption,
    from_script_data: *const schema.ScriptData,
    to_script_data: *const schema.ScriptData,
) bool {
    if (option.from_script_type == .all and option.to_script_type == .all) {
        return true;
    }

    if (!matchesFromSide(option, from_script_data)) {
        return false;
    }

    return matchesToSide(option, to_script_data);
}

fn matchesFromSide(option: schema.CustomOption, from_script_data: *const schema.ScriptData) bool {
    if (option.from_script_type) |expected_script_type| {
        if (matchesExpectedScriptType(expected_script_type, from_script_data.scriptType())) {
            return true;
        }
    }

    if (option.from_script_name) |expected_names| {
        if (containsString(expected_names, from_script_data.scriptName())) {
            return true;
        }
    }

    return false;
}

fn matchesToSide(option: schema.CustomOption, to_script_data: *const schema.ScriptData) bool {
    if (option.to_script_type) |expected_script_type| {
        if (matchesExpectedScriptType(expected_script_type, to_script_data.scriptType())) {
            return true;
        }
    }

    if (option.to_script_name) |expected_names| {
        if (containsString(expected_names, to_script_data.scriptName())) {
            return true;
        }
    }

    return false;
}

fn matchesExpectedScriptType(expected: schema.CustomOptionScriptType, actual: schema.CustomOptionScriptType) bool {
    return expected == .all or expected == actual;
}

fn containsString(values: []const []const u8, needle: []const u8) bool {
    for (values) |value| {
        if (std.mem.eql(u8, value, needle)) {
            return true;
        }
    }
    return false;
}
