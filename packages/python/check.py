#!/usr/bin/env python3

import subprocess
import sys


def main():
    result = subprocess.run(["uvx", "ty", "check"])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
