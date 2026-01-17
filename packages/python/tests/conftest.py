"""Pytest configuration and hooks for tracking test statistics."""

import pytest
import sys
from pathlib import Path

# Add tests directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from test_stats import get_assertion_count, reset_assertion_count

@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session, exitstatus):
    """Write test statistics summary after all tests complete."""
    assertion_count = get_assertion_count()
    
    # Get actual passed/failed from the terminal reporter
    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    if reporter:
        passed_count = len(reporter.stats.get("passed", []))
        failed_count = len(reporter.stats.get("failed", []))
        skipped_count = len(reporter.stats.get("skipped", []))
    else:
        passed_count = 0
        failed_count = 0
        skipped_count = 0
    
    # Write summary to file
    summary = f"""
╭──────────────────────────────────────────╮
│           Test Summary                   │
╰──────────────────────────────────────────╯

 Assertions  {assertion_count} passed ({assertion_count})
 Tests       {passed_count} passed ({passed_count + failed_count + skipped_count})
"""
    
    if failed_count > 0:
        summary += f" Failed      {failed_count}\n"
    if skipped_count > 0:
        summary += f" Skipped     {skipped_count}\n"
    
    # Also print to console
    print(summary)


@pytest.hookimpl(tryfirst=True)
def pytest_sessionstart(session):
    """Reset assertion count at session start."""
    reset_assertion_count()
