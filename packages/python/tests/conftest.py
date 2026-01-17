"""Pytest configuration and hooks for tracking test statistics."""

import pytest
import sys
from pathlib import Path

# Add tests directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from test_stats import get_assertion_count, get_file_assertion_counts, reset_assertion_count

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.text import Text
    HAS_RICH = True
except ImportError:
    HAS_RICH = False


@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session, exitstatus):
    """Write test statistics summary after all tests complete."""
    assertion_count = get_assertion_count()
    file_counts = get_file_assertion_counts()
    
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
    
    if HAS_RICH:
        console = Console()
        console.print()  # Blank line
        
        # Create summary table
        table = Table(show_header=False, box=None, pad_edge=False)
        table.add_column("Label", style="cyan", no_wrap=True)
        table.add_column("Value", style="bold green", justify="right")
        
        # Per-file assertion counts
        if file_counts:
            for file_name in sorted(file_counts.keys()):
                count = file_counts[file_name]
                display_name = file_name.replace('test_', '').replace('.py', '')
                table.add_row(f"  • {display_name}", f"{count:,} assertions")
            
            table.add_row("", "")  # Blank row
        
        #Total counts
        table.add_row(" Assertions", f"[bold]{assertion_count:,}[/bold] [dim]passed ({assertion_count:,})[/dim]")
        table.add_row(" Tests", f"[bold]{passed_count}[/bold] [dim]passed ({passed_count + failed_count + skipped_count})[/dim]")
        
        if failed_count > 0:
            table.add_row(" [red]Failed[/red]", f"[bold red]{failed_count}[/bold red]")
        if skipped_count > 0:
            table.add_row(" [yellow]Skipped[/yellow]", f"[bold yellow]{skipped_count}[/bold yellow]")
        
        # Display in a panel
        panel = Panel(
            table,
            title="[bold cyan]✨ Test Summary[/bold cyan]",
            border_style="bright_cyan",
            padding=(1, 2)
        )
        console.print(panel)
    else:
        # Fallback to plain text if Rich is not available
        print("\n╭──────────────────────────────────────────╮")
        print("│           Test Summary                   │")
        print("╰──────────────────────────────────────────╯\n")
        
        if file_counts:
            print(" Per File:")
            for file_name in sorted(file_counts.keys()):
                count = file_counts[file_name]
                display_name = file_name.replace('test_', '').replace('.py', '')
                print(f"   • {display_name:20s} {count:6d} assertions")
            print()
        
        print(f" Assertions  {assertion_count} passed ({assertion_count})")
        print(f" Tests       {passed_count} passed ({passed_count + failed_count + skipped_count})")
        
        if failed_count > 0:
            print(f" Failed      {failed_count}")
        if skipped_count > 0:
            print(f" Skipped     {skipped_count}")
        print()


@pytest.hookimpl(tryfirst=True)
def pytest_sessionstart(session):
    """Reset assertion count at session start."""
    reset_assertion_count()
