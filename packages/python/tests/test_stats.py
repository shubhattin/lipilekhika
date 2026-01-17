"""Test statistics tracking module."""

# Global counter for assertions
_assertion_count = 0
_file_assertion_counts = {}


def increment_assertion_count(count: int = 1, file_name: str | None = None):
    """Increment the global assertion counter and optionally track by file."""
    global _assertion_count, _file_assertion_counts
    _assertion_count += count

    if file_name:
        _file_assertion_counts[file_name] = (
            _file_assertion_counts.get(file_name, 0) + count
        )


def get_assertion_count() -> int:
    """Get the current assertion count."""
    return _assertion_count


def get_file_assertion_counts() -> dict[str, int]:
    """Get assertion counts by file."""
    return _file_assertion_counts.copy()


def reset_assertion_count():
    """Reset the assertion count to zero."""
    global _assertion_count, _file_assertion_counts
    _assertion_count = 0
    _file_assertion_counts = {}
