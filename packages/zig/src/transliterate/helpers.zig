const std = @import("std");
const schema = @import("../script_data/schema.zig");

pub const Allocator = std.mem.Allocator;

pub const MatchPrevKramaSequenceResult = struct {
    matched: bool,
    matched_len: usize,
};

pub const PrevContextItem = struct {
    text: ?[]const u8,
    list: ?schema.List,
};

pub const InputCursor = struct {
    ch: []const u8,
};

pub const TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS = [_][]const u8{ "²", "³", "⁴" };
pub const VEDIC_SVARAS = [_][]const u8{ "॒", "॑", "᳚", "᳛" };

const VEDIC_SVARAS_TYPING_SYMBOLS = [_][]const u8{ "_", "'''", "''", "'" };
const VEDIC_SVARAS_NORMAL_SYMBOLS = [_][]const u8{ "↓", "↑↑↑", "↑↑", "↑" };

pub fn optSliceEql(left: ?[]const u8, right: ?[]const u8) bool {
    if (left == null and right == null) return true;
    if (left == null or right == null) return false;
    return std.mem.eql(u8, left.?, right.?);
}

pub fn isScriptTamilExt(name: []const u8) bool {
    return std.mem.eql(u8, name, "Tamil-Extended");
}

pub fn isTaExtSuperscriptTail(ch: ?[]const u8) bool {
    if (ch) |value| {
        for (TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS) |candidate| {
            if (std.mem.eql(u8, value, candidate)) return true;
        }
    }
    return false;
}

pub fn isVedicSvaraTail(ch: ?[]const u8) bool {
    if (ch) |value| {
        for (VEDIC_SVARAS) |candidate| {
            if (std.mem.eql(u8, value, candidate)) return true;
        }
    }
    return false;
}

pub fn firstScalarSlice(text: []const u8) ?[]const u8 {
    if (text.len == 0) return null;
    const width = std.unicode.utf8ByteSequenceLength(text[0]) catch return null;
    return text[0..width];
}

pub fn applyTypingInputAliases(allocator: Allocator, text: []const u8, to_script_name: []const u8) ![]const u8 {
    if (text.len == 0) return text;

    var current = text;
    if (std.mem.indexOfScalar(u8, current, 'x') != null) {
        current = try replaceAllAlloc(allocator, current, "x", "kSh");
    }

    if (isScriptTamilExt(to_script_name)) {
        for (VEDIC_SVARAS_TYPING_SYMBOLS, VEDIC_SVARAS_NORMAL_SYMBOLS) |symbol, replacement| {
            if (std.mem.indexOf(u8, current, symbol) != null) {
                current = try replaceAllAlloc(allocator, current, symbol, replacement);
            }
        }
    }

    return current;
}

pub fn kramaTextOrNull(script_data: *const schema.ScriptData, idx: i16) ?[]const u8 {
    if (idx < 0) return null;
    const attr = script_data.getCommonAttr();
    if (@as(usize, @intCast(idx)) >= attr.krama_text_arr.len) return null;
    return attr.krama_text_arr[@intCast(idx)].text;
}

pub fn kramaTextOrEmpty(script_data: *const schema.ScriptData, idx: i16) []const u8 {
    return kramaTextOrNull(script_data, idx) orelse "";
}

pub fn kramaIndexOfText(script_data: *const schema.ScriptData, text: []const u8) ?usize {
    return script_data.getCommonAttr().krama_text_lookup.get(text);
}

pub fn matchPrevKramaSequence(
    script_data: *const schema.ScriptData,
    peek_ctx: anytype,
    peek_at: anytype,
    anchor_index: isize,
    prev: []const usize,
) MatchPrevKramaSequenceResult {
    var i: usize = 0;
    while (i < prev.len) : (i += 1) {
        const expected_krama_index = prev[prev.len - 1 - i];
        const info = peek_at(peek_ctx, anchor_index - @as(isize, @intCast(i))) orelse {
            return .{ .matched = false, .matched_len = 0 };
        };
        const got_krama_index = kramaIndexOfText(script_data, info);
        if (got_krama_index == null or got_krama_index.? != expected_krama_index) {
            return .{ .matched = false, .matched_len = 0 };
        }
    }

    return .{ .matched = true, .matched_len = prev.len };
}

pub fn replaceWithPieces(
    allocator: Allocator,
    script_data: *const schema.ScriptData,
    replace_with: []const i16,
) ![]const []const u8 {
    var pieces = std.array_list.Managed([]const u8).init(allocator);
    defer pieces.deinit();

    for (replace_with) |item| {
        const text = kramaTextOrEmpty(script_data, item);
        if (text.len > 0) {
            try pieces.append(text);
        }
    }

    return try pieces.toOwnedSlice();
}

pub const ResultStringBuilder = struct {
    allocator: Allocator,
    result: std.array_list.Managed([]const u8),

    pub fn init(allocator: Allocator) ResultStringBuilder {
        return .{
            .allocator = allocator,
            .result = std.array_list.Managed([]const u8).init(allocator),
        };
    }

    pub fn emit(self: *ResultStringBuilder, text: []const u8) !void {
        if (text.len == 0) return;
        try self.result.append(text);
    }

    pub fn emitPieces(self: *ResultStringBuilder, pieces: []const []const u8) !void {
        for (pieces) |piece| {
            try self.emit(piece);
        }
    }

    pub fn lastPiece(self: *const ResultStringBuilder) ?[]const u8 {
        if (self.result.items.len == 0) return null;
        return self.result.items[self.result.items.len - 1];
    }

    pub fn lastChar(self: *const ResultStringBuilder) ?[]const u8 {
        const last_piece = self.lastPiece() orelse return null;
        return lastScalarSlice(last_piece);
    }

    pub fn popLastChar(self: *ResultStringBuilder) ?[]const u8 {
        if (self.result.items.len == 0) return null;
        const last_index = self.result.items.len - 1;
        const last_piece = self.result.items[last_index];
        const split = splitLastScalar(last_piece) orelse return null;
        if (split.prefix.len == 0) {
            _ = self.result.pop();
        } else {
            self.result.items[last_index] = split.prefix;
        }
        return split.last;
    }

    pub fn rewriteTailPieces(self: *ResultStringBuilder, count: usize, new_pieces: []const []const u8) !void {
        const len = self.result.items.len;
        const start = len -| count;
        self.result.shrinkRetainingCapacity(start);
        try self.emitPieces(new_pieces);
    }

    pub fn withLastCharMovedAfter(
        self: *ResultStringBuilder,
        before_pieces: []const []const u8,
        after_pieces: []const []const u8,
    ) !void {
        const last = self.popLastChar();
        try self.emitPieces(before_pieces);
        if (last) |value| {
            try self.emit(value);
        }
        try self.emitPieces(after_pieces);
    }

    pub fn peekAt(self: *const ResultStringBuilder, index: isize) ?InputCursor {
        const len: isize = @intCast(self.result.items.len);
        if (len == 0) return null;

        var i = index;
        if (i < 0) i = len + i;
        if (i < 0 or i >= len) return null;

        return .{ .ch = self.result.items[@intCast(i)] };
    }

    pub fn rewriteAt(self: *ResultStringBuilder, index: isize, new_piece: []const u8) void {
        const len: isize = @intCast(self.result.items.len);
        if (len == 0) return;

        var i = index;
        if (i < 0) i = len + i;
        if (i < 0 or i >= len) return;

        self.result.items[@intCast(i)] = new_piece;
    }

    pub fn toOwnedString(self: *const ResultStringBuilder) ![]const u8 {
        var out = std.array_list.Managed(u8).init(self.allocator);
        defer out.deinit();

        for (self.result.items) |piece| {
            try out.appendSlice(piece);
        }

        return try out.toOwnedSlice();
    }

    pub fn emitPiecesWithReorder(
        self: *ResultStringBuilder,
        pieces: []const []const u8,
        halant: []const u8,
        should_reorder: bool,
    ) !void {
        if (pieces.len == 0) return;
        if (!should_reorder) {
            try self.emitPieces(pieces);
            return;
        }

        const first_piece = pieces[0];
        if (std.mem.startsWith(u8, first_piece, halant)) {
            const rest_first = first_piece[halant.len..];
            var after_pieces = std.array_list.Managed([]const u8).init(self.allocator);
            defer after_pieces.deinit();
            if (rest_first.len > 0) {
                try after_pieces.append(rest_first);
            }
            for (pieces[1..]) |piece| {
                try after_pieces.append(piece);
            }

            const before = [_][]const u8{halant};
            try self.withLastCharMovedAfter(before[0..], after_pieces.items);
        } else {
            try self.withLastCharMovedAfter(pieces, &.{});
        }
    }
};

pub const PrevContextBuilder = struct {
    allocator: Allocator,
    arr: std.array_list.Managed(PrevContextItem),
    max_len: usize,

    pub fn init(allocator: Allocator, max_len: usize) PrevContextBuilder {
        return .{
            .allocator = allocator,
            .arr = std.array_list.Managed(PrevContextItem).init(allocator),
            .max_len = max_len,
        };
    }

    pub fn clear(self: *PrevContextBuilder) void {
        self.arr.clearRetainingCapacity();
    }

    pub fn length(self: *const PrevContextBuilder) usize {
        return self.arr.items.len;
    }

    fn resolveArrIndex(self: *const PrevContextBuilder, index: isize) ?usize {
        if (self.arr.items.len == 0) return null;
        const len: isize = @intCast(self.arr.items.len);
        var i = index;
        if (i < 0) i = len + i;
        if (i < 0 or i >= len) return null;
        return @intCast(i);
    }

    pub fn at(self: *const PrevContextBuilder, index: isize) ?PrevContextItem {
        const resolved = self.resolveArrIndex(index) orelse return null;
        return self.arr.items[resolved];
    }

    pub fn typeAt(self: *const PrevContextBuilder, index: isize) ?schema.List {
        const item = self.at(index) orelse return null;
        return item.list;
    }

    pub fn textAt(self: *const PrevContextBuilder, index: isize) ?[]const u8 {
        const item = self.at(index) orelse return null;
        return item.text;
    }

    pub fn push(self: *PrevContextBuilder, item: PrevContextItem) !void {
        const text = item.text orelse return;
        if (text.len == 0) return;

        try self.arr.append(item);
        if (self.arr.items.len > self.max_len) {
            _ = self.arr.orderedRemove(0);
        }
    }
};

pub const InputTextCursor = struct {
    allocator: Allocator,
    chars: std.array_list.Managed([]const u8),
    pos_units: usize,

    pub fn init(allocator: Allocator, text: []const u8) !InputTextCursor {
        var chars = std.array_list.Managed([]const u8).init(allocator);

        var i: usize = 0;
        while (i < text.len) {
            const width = try std.unicode.utf8ByteSequenceLength(text[i]);
            try chars.append(text[i .. i + width]);
            i += width;
        }

        return .{
            .allocator = allocator,
            .chars = chars,
            .pos_units = 0,
        };
    }

    pub fn pos(self: *const InputTextCursor) usize {
        return self.pos_units;
    }

    pub fn charCount(self: *const InputTextCursor) usize {
        return self.chars.items.len;
    }

    pub fn peekAt(self: *const InputTextCursor, index_units: usize) ?[]const u8 {
        if (index_units >= self.chars.items.len) return null;
        return self.chars.items[index_units];
    }

    pub fn peek(self: *const InputTextCursor) ?[]const u8 {
        return self.peekAt(self.pos_units);
    }

    pub fn peekAtStr(self: *const InputTextCursor, index_units: usize) ?[]const u8 {
        return self.peekAt(index_units);
    }

    pub fn advance(self: *InputTextCursor, units: usize) void {
        self.pos_units += units;
    }

    pub fn slice(self: *const InputTextCursor, start: usize, end: usize) !?[]const u8 {
        if (start > end or end > self.chars.items.len) return null;
        var out = std.array_list.Managed(u8).init(self.allocator);
        defer out.deinit();

        for (self.chars.items[start..end]) |piece| {
            try out.appendSlice(piece);
        }

        return try out.toOwnedSlice();
    }
};

pub fn replaceAllAlloc(allocator: Allocator, text: []const u8, needle: []const u8, replacement: []const u8) ![]const u8 {
    if (needle.len == 0) return text;

    var out = std.array_list.Managed(u8).init(allocator);
    defer out.deinit();

    var cursor: usize = 0;
    var changed = false;
    while (std.mem.indexOfPos(u8, text, cursor, needle)) |idx| {
        changed = true;
        try out.appendSlice(text[cursor..idx]);
        try out.appendSlice(replacement);
        cursor = idx + needle.len;
    }

    if (!changed) return text;

    try out.appendSlice(text[cursor..]);
    return try out.toOwnedSlice();
}

fn splitLastScalar(text: []const u8) ?struct { prefix: []const u8, last: []const u8 } {
    if (text.len == 0) return null;

    var index: usize = 0;
    var last_start: usize = 0;
    while (index < text.len) {
        last_start = index;
        const width = std.unicode.utf8ByteSequenceLength(text[index]) catch return null;
        index += width;
    }

    return .{
        .prefix = text[0..last_start],
        .last = text[last_start..],
    };
}

fn lastScalarSlice(text: []const u8) ?[]const u8 {
    const split = splitLastScalar(text) orelse return null;
    return split.last;
}
