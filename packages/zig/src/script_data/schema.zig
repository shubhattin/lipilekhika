const std = @import("std");

pub const Allocator = std.mem.Allocator;
pub const JsonValue = std.json.Value;
pub const JsonObjectMap = std.json.ObjectMap;
pub const JsonArray = std.json.Array;

pub const ParseError = error{
    InvalidSchema,
    MissingField,
    UnsupportedNumber,
};

pub const TextToKramaMap = struct {
    next: ?[]const []const u8,
    krama: ?[]const i16,
    fallback_list_ref: ?i16,
    custom_back_ref: ?i16,
};

pub const KramaTextEntry = struct {
    text: []const u8,
    list_arr_ref: ?i16,
};

pub const TextMapEntry = struct {
    text: []const u8,
    value: TextToKramaMap,
};

pub const CustomScriptCharEntry = struct {
    text: []const u8,
    primary_ref: ?i16,
    secondary_ref: ?i16,
};

pub const SimpleList = struct {
    krama_ref: []const i16,
};

pub const SvaraList = struct {
    krama_ref: []const i16,
    matra_krama_ref: []const i16,
};

pub const List = union(enum) {
    anya: SimpleList,
    vyanjana: SimpleList,
    @"mAtrA": SimpleList,
    svara: SvaraList,

    pub fn getKramaRef(self: List) []const i16 {
        return switch (self) {
            .anya => |value| value.krama_ref,
            .vyanjana => |value| value.krama_ref,
            .@"mAtrA" => |value| value.krama_ref,
            .svara => |value| value.krama_ref,
        };
    }

    pub fn isSvara(self: List) bool {
        return self == .svara;
    }

    pub fn isMatra(self: List) bool {
        return self == .@"mAtrA";
    }

    pub fn isVyanjana(self: List) bool {
        return self == .vyanjana;
    }

    pub fn isAnya(self: List) bool {
        return self == .anya;
    }
};

pub const CommonScriptAttr = struct {
    script_name: []const u8,
    script_id: u8,
    krama_text_arr: []const KramaTextEntry,
    krama_text_arr_index: []const usize,
    text_to_krama_map: []const TextMapEntry,
    typing_text_to_krama_map: []const TextMapEntry,
    custom_script_chars_arr: []const CustomScriptCharEntry,
    list: []const List,

    krama_text_lookup: std.StringHashMapUnmanaged(usize) = .{},
    text_to_krama_lookup: std.StringHashMapUnmanaged(usize) = .{},
    typing_text_to_krama_lookup: std.StringHashMapUnmanaged(usize) = .{},
    custom_script_chars_lookup: std.StringHashMapUnmanaged(usize) = .{},

    pub fn initLookups(self: *CommonScriptAttr, allocator: Allocator) !void {
        try self.krama_text_lookup.ensureTotalCapacity(allocator, @intCast(self.krama_text_arr.len));
        for (self.krama_text_arr, 0..) |entry, index| {
            const gop = try self.krama_text_lookup.getOrPut(allocator, entry.text);
            if (!gop.found_existing) {
                gop.value_ptr.* = index;
            }
        }

        try self.text_to_krama_lookup.ensureTotalCapacity(allocator, @intCast(self.text_to_krama_map.len));
        for (self.text_to_krama_map, 0..) |entry, index| {
            const gop = try self.text_to_krama_lookup.getOrPut(allocator, entry.text);
            if (!gop.found_existing) {
                gop.value_ptr.* = index;
            }
        }

        try self.typing_text_to_krama_lookup.ensureTotalCapacity(allocator, @intCast(self.typing_text_to_krama_map.len));
        for (self.typing_text_to_krama_map, 0..) |entry, index| {
            const gop = try self.typing_text_to_krama_lookup.getOrPut(allocator, entry.text);
            if (!gop.found_existing) {
                gop.value_ptr.* = index;
            }
        }

        try self.custom_script_chars_lookup.ensureTotalCapacity(allocator, @intCast(self.custom_script_chars_arr.len));
        for (self.custom_script_chars_arr, 0..) |entry, index| {
            const gop = try self.custom_script_chars_lookup.getOrPut(allocator, entry.text);
            if (!gop.found_existing) {
                gop.value_ptr.* = index;
            }
        }
    }
};

pub const BrahmicScriptData = struct {
    common_script_attr: CommonScriptAttr,
    schwa_property: bool,
    halant: []const u8,
    nuqta: ?[]const u8,
};

pub const OtherScriptData = struct {
    common_script_attr: CommonScriptAttr,
    schwa_character: []const u8,
};

pub const ScriptData = union(enum) {
    brahmic: BrahmicScriptData,
    other: OtherScriptData,

    pub fn getCommonAttr(self: *const ScriptData) *const CommonScriptAttr {
        return switch (self.*) {
            .brahmic => |*value| &value.common_script_attr,
            .other => |*value| &value.common_script_attr,
        };
    }

    pub fn getCommonAttrMut(self: *ScriptData) *CommonScriptAttr {
        return switch (self.*) {
            .brahmic => |*value| &value.common_script_attr,
            .other => |*value| &value.common_script_attr,
        };
    }

    pub fn scriptName(self: *const ScriptData) []const u8 {
        return self.getCommonAttr().script_name;
    }

    pub fn scriptType(self: *const ScriptData) CustomOptionScriptType {
        return switch (self.*) {
            .brahmic => .brahmic,
            .other => .other,
        };
    }

    pub fn initLookups(self: *ScriptData, allocator: Allocator) !void {
        try self.getCommonAttrMut().initLookups(allocator);
    }

    pub fn textToKramaMapIndex(self: *const ScriptData, text: []const u8, use_typing_map: bool) ?usize {
        const attr = self.getCommonAttr();
        if (use_typing_map) {
            return attr.typing_text_to_krama_lookup.get(text);
        }
        return attr.text_to_krama_lookup.get(text);
    }

    pub fn customScriptCharIndexOfText(self: *const ScriptData, text: []const u8) ?usize {
        return self.getCommonAttr().custom_script_chars_lookup.get(text);
    }
};

pub const CustomOptionScriptType = enum {
    brahmic,
    other,
    all,
};

pub const CheckIn = enum {
    input,
    output,
};

pub const ReplacePrevKramaKeysRule = struct {
    use_replace: ?bool,
    prev: []const i16,
    following: []const i16,
    replace_with: []const i16,
    check_in: ?CheckIn,
};

pub const DirectReplaceRule = struct {
    use_replace: ?bool,
    to_replace: []const []const i16,
    replace_with: []const i16,
    replace_text: ?[]const u8,
    check_in: ?CheckIn,
};

pub const Rule = union(enum) {
    replace_prev_krama_keys: ReplacePrevKramaKeysRule,
    direct_replace: DirectReplaceRule,
};

pub const CustomOption = struct {
    from_script_name: ?[]const []const u8,
    from_script_type: ?CustomOptionScriptType,
    to_script_name: ?[]const []const u8,
    to_script_type: ?CustomOptionScriptType,
    check_in: CheckIn,
    rules: []const Rule,
};

pub fn parseScriptDataJsonBytes(allocator: Allocator, bytes: []const u8) !ScriptData {
    const parsed = try std.json.parseFromSlice(JsonValue, allocator, bytes, .{});
    return parseScriptDataValue(allocator, parsed.value);
}

pub fn parseScriptDataValue(allocator: Allocator, value: JsonValue) !ScriptData {
    const object = try expectObject(value);
    const script_type = try getRequiredString(object, "script_type");
    const common = try parseCommonScriptAttr(allocator, object);

    if (std.mem.eql(u8, script_type, "brahmic")) {
        return .{
            .brahmic = .{
                .common_script_attr = common,
                .schwa_property = try getRequiredBool(object, "schwa_property"),
                .halant = try getRequiredString(object, "halant"),
                .nuqta = try getOptionalString(object, "nuqta"),
            },
        };
    }

    if (std.mem.eql(u8, script_type, "other")) {
        return .{
            .other = .{
                .common_script_attr = common,
                .schwa_character = try getRequiredString(object, "schwa_character"),
            },
        };
    }

    return error.InvalidSchema;
}

pub fn parseCommonScriptAttr(allocator: Allocator, object: JsonObjectMap) !CommonScriptAttr {
    return .{
        .script_name = try getRequiredString(object, "script_name"),
        .script_id = try parseU8(try getRequiredValue(object, "script_id")),
        .krama_text_arr = try parseKramaTextArray(allocator, try getRequiredValue(object, "krama_text_arr")),
        .krama_text_arr_index = try parseUsizeArray(allocator, try getRequiredValue(object, "krama_text_arr_index")),
        .text_to_krama_map = try parseTextMapEntries(allocator, try getRequiredValue(object, "text_to_krama_map")),
        .typing_text_to_krama_map = try parseTextMapEntries(allocator, try getRequiredValue(object, "typing_text_to_krama_map")),
        .custom_script_chars_arr = try parseCustomScriptCharsArray(allocator, try getRequiredValue(object, "custom_script_chars_arr")),
        .list = try parseListArray(allocator, try getRequiredValue(object, "list")),
    };
}

pub fn parseTextToKramaMap(allocator: Allocator, value: JsonValue) !TextToKramaMap {
    const object = try expectObject(value);
    return .{
        .next = try parseOptionalStringArrayField(allocator, object, "next"),
        .krama = try parseOptionalI16ArrayField(allocator, object, "krama"),
        .fallback_list_ref = try parseOptionalI16Field(object, "fallback_list_ref"),
        .custom_back_ref = try parseOptionalI16Field(object, "custom_back_ref"),
    };
}

pub fn parseList(allocator: Allocator, value: JsonValue) !List {
    const object = try expectObject(value);
    const list_type = try getRequiredString(object, "type");
    const krama_ref = try parseI16Array(allocator, try getRequiredValue(object, "krama_ref"));

    if (std.mem.eql(u8, list_type, "anya")) {
        return .{ .anya = .{ .krama_ref = krama_ref } };
    }
    if (std.mem.eql(u8, list_type, "vyanjana")) {
        return .{ .vyanjana = .{ .krama_ref = krama_ref } };
    }
    if (std.mem.eql(u8, list_type, "mAtrA")) {
        return .{ .@"mAtrA" = .{ .krama_ref = krama_ref } };
    }
    if (std.mem.eql(u8, list_type, "svara")) {
        return .{
            .svara = .{
                .krama_ref = krama_ref,
                .matra_krama_ref = try parseI16Array(allocator, try getRequiredValue(object, "mAtrA_krama_ref")),
            },
        };
    }
    return error.InvalidSchema;
}

pub fn parseCustomOptionScriptType(value: JsonValue) !CustomOptionScriptType {
    const string_value = try expectString(value);
    if (std.mem.eql(u8, string_value, "brahmic")) return .brahmic;
    if (std.mem.eql(u8, string_value, "other")) return .other;
    if (std.mem.eql(u8, string_value, "all")) return .all;
    return error.InvalidSchema;
}

pub fn parseCheckIn(value: JsonValue) !CheckIn {
    const string_value = try expectString(value);
    if (std.mem.eql(u8, string_value, "input")) return .input;
    if (std.mem.eql(u8, string_value, "output")) return .output;
    return error.InvalidSchema;
}

pub fn parseRule(allocator: Allocator, value: JsonValue) !Rule {
    const object = try expectObject(value);
    const rule_type = try getRequiredString(object, "type");
    if (std.mem.eql(u8, rule_type, "replace_prev_krama_keys")) {
        return .{
            .replace_prev_krama_keys = .{
                .use_replace = try parseOptionalBoolField(object, "use_replace"),
                .prev = try parseI16Array(allocator, try getRequiredValue(object, "prev")),
                .following = try parseI16Array(allocator, try getRequiredValue(object, "following")),
                .replace_with = try parseI16Array(allocator, try getRequiredValue(object, "replace_with")),
                .check_in = try parseOptionalCheckInField(object, "check_in"),
            },
        };
    }

    if (std.mem.eql(u8, rule_type, "direct_replace")) {
        return .{
            .direct_replace = .{
                .use_replace = try parseOptionalBoolField(object, "use_replace"),
                .to_replace = try parseArrayOfI16Array(allocator, try getRequiredValue(object, "to_replace")),
                .replace_with = try parseI16Array(allocator, try getRequiredValue(object, "replace_with")),
                .replace_text = try getOptionalString(object, "replace_text"),
                .check_in = try parseOptionalCheckInField(object, "check_in"),
            },
        };
    }

    return error.InvalidSchema;
}

pub fn parseCustomOption(allocator: Allocator, value: JsonValue) !CustomOption {
    const object = try expectObject(value);
    return .{
        .from_script_name = try parseOptionalStringArrayField(allocator, object, "from_script_name"),
        .from_script_type = try parseOptionalScriptTypeField(object, "from_script_type"),
        .to_script_name = try parseOptionalStringArrayField(allocator, object, "to_script_name"),
        .to_script_type = try parseOptionalScriptTypeField(object, "to_script_type"),
        .check_in = try parseCheckIn(try getRequiredValue(object, "check_in")),
        .rules = try parseRulesArray(allocator, try getRequiredValue(object, "rules")),
    };
}

pub fn expectObject(value: JsonValue) !JsonObjectMap {
    return switch (value) {
        .object => |object| object,
        else => error.InvalidSchema,
    };
}

pub fn expectArray(value: JsonValue) !JsonArray {
    return switch (value) {
        .array => |array| array,
        else => error.InvalidSchema,
    };
}

pub fn expectString(value: JsonValue) ![]const u8 {
    return switch (value) {
        .string => |string_value| string_value,
        else => error.InvalidSchema,
    };
}

pub fn expectBool(value: JsonValue) !bool {
    return switch (value) {
        .bool => |bool_value| bool_value,
        else => error.InvalidSchema,
    };
}

pub fn parseI16(value: JsonValue) !i16 {
    return switch (value) {
        .integer => |integer_value| std.math.cast(i16, integer_value) orelse error.UnsupportedNumber,
        else => error.InvalidSchema,
    };
}

pub fn parseU8(value: JsonValue) !u8 {
    return switch (value) {
        .integer => |integer_value| std.math.cast(u8, integer_value) orelse error.UnsupportedNumber,
        else => error.InvalidSchema,
    };
}

pub fn parseUsize(value: JsonValue) !usize {
    return switch (value) {
        .integer => |integer_value| std.math.cast(usize, integer_value) orelse error.UnsupportedNumber,
        else => error.InvalidSchema,
    };
}

pub fn getRequiredValue(object: JsonObjectMap, key: []const u8) !JsonValue {
    return object.get(key) orelse error.MissingField;
}

pub fn getRequiredString(object: JsonObjectMap, key: []const u8) ![]const u8 {
    return expectString(try getRequiredValue(object, key));
}

pub fn getRequiredBool(object: JsonObjectMap, key: []const u8) !bool {
    return expectBool(try getRequiredValue(object, key));
}

pub fn getOptionalString(object: JsonObjectMap, key: []const u8) !?[]const u8 {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        .string => |string_value| string_value,
        else => error.InvalidSchema,
    };
}

pub fn parseOptionalBoolField(object: JsonObjectMap, key: []const u8) !?bool {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        .bool => |bool_value| bool_value,
        else => error.InvalidSchema,
    };
}

pub fn parseOptionalI16Field(object: JsonObjectMap, key: []const u8) !?i16 {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        else => try parseI16(value),
    };
}

pub fn parseOptionalScriptTypeField(object: JsonObjectMap, key: []const u8) !?CustomOptionScriptType {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        else => try parseCustomOptionScriptType(value),
    };
}

pub fn parseOptionalCheckInField(object: JsonObjectMap, key: []const u8) !?CheckIn {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        else => try parseCheckIn(value),
    };
}

pub fn parseOptionalStringArrayField(allocator: Allocator, object: JsonObjectMap, key: []const u8) !?[]const []const u8 {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        else => try parseStringArray(allocator, value),
    };
}

pub fn parseOptionalI16ArrayField(allocator: Allocator, object: JsonObjectMap, key: []const u8) !?[]const i16 {
    const value = object.get(key) orelse return null;
    return switch (value) {
        .null => null,
        else => try parseI16Array(allocator, value),
    };
}

pub fn parseStringArray(allocator: Allocator, value: JsonValue) ![]const []const u8 {
    const array = try expectArray(value);
    const slice = try allocator.alloc([]const u8, array.items.len);
    for (array.items, 0..) |item, index| {
        slice[index] = try expectString(item);
    }
    return slice;
}

pub fn parseI16Array(allocator: Allocator, value: JsonValue) ![]const i16 {
    const array = try expectArray(value);
    const slice = try allocator.alloc(i16, array.items.len);
    for (array.items, 0..) |item, index| {
        slice[index] = try parseI16(item);
    }
    return slice;
}

pub fn parseUsizeArray(allocator: Allocator, value: JsonValue) ![]const usize {
    const array = try expectArray(value);
    const slice = try allocator.alloc(usize, array.items.len);
    for (array.items, 0..) |item, index| {
        slice[index] = try parseUsize(item);
    }
    return slice;
}

pub fn parseArrayOfI16Array(allocator: Allocator, value: JsonValue) ![]const []const i16 {
    const array = try expectArray(value);
    const slice = try allocator.alloc([]const i16, array.items.len);
    for (array.items, 0..) |item, index| {
        slice[index] = try parseI16Array(allocator, item);
    }
    return slice;
}

pub fn parseKramaTextArray(allocator: Allocator, value: JsonValue) ![]const KramaTextEntry {
    const array = try expectArray(value);
    const slice = try allocator.alloc(KramaTextEntry, array.items.len);
    for (array.items, 0..) |item, index| {
        const tuple = try expectArray(item);
        if (tuple.items.len != 2) return error.InvalidSchema;
        slice[index] = .{
            .text = try expectString(tuple.items[0]),
            .list_arr_ref = switch (tuple.items[1]) {
                .null => null,
                else => try parseI16(tuple.items[1]),
            },
        };
    }
    return slice;
}

pub fn parseTextMapEntries(allocator: Allocator, value: JsonValue) ![]const TextMapEntry {
    const array = try expectArray(value);
    const slice = try allocator.alloc(TextMapEntry, array.items.len);
    for (array.items, 0..) |item, index| {
        const tuple = try expectArray(item);
        if (tuple.items.len != 2) return error.InvalidSchema;
        slice[index] = .{
            .text = try expectString(tuple.items[0]),
            .value = try parseTextToKramaMap(allocator, tuple.items[1]),
        };
    }
    return slice;
}

pub fn parseCustomScriptCharsArray(allocator: Allocator, value: JsonValue) ![]const CustomScriptCharEntry {
    const array = try expectArray(value);
    const slice = try allocator.alloc(CustomScriptCharEntry, array.items.len);
    for (array.items, 0..) |item, index| {
        const tuple = try expectArray(item);
        if (tuple.items.len != 3) return error.InvalidSchema;
        slice[index] = .{
            .text = try expectString(tuple.items[0]),
            .primary_ref = switch (tuple.items[1]) {
                .null => null,
                else => try parseI16(tuple.items[1]),
            },
            .secondary_ref = switch (tuple.items[2]) {
                .null => null,
                else => try parseI16(tuple.items[2]),
            },
        };
    }
    return slice;
}

pub fn parseListArray(allocator: Allocator, value: JsonValue) ![]const List {
    const array = try expectArray(value);
    const slice = try allocator.alloc(List, array.items.len);
    for (array.items, 0..) |item, index| {
        slice[index] = try parseList(allocator, item);
    }
    return slice;
}

pub fn parseRulesArray(allocator: Allocator, value: JsonValue) ![]const Rule {
    const array = try expectArray(value);
    const slice = try allocator.alloc(Rule, array.items.len);
    for (array.items, 0..) |item, index| {
        slice[index] = try parseRule(allocator, item);
    }
    return slice;
}
