"""Test statistics tracking module."""

# Global counter for assertions
_assertion_count = 0


def increment_assertion_count(count: int = 1):
    """Increment the global assertion counter."""
    global _assertion_count
    _assertion_count += count


def get_assertion_count() -> int:
    """Get the current assertion count."""
    return _assertion_count


def reset_assertion_count():
    """Reset the assertion count to zero."""
    global _assertion_count
    _assertion_count = 0
