"""
Run all three CDN sync scripts with default options.

Characters, weapons, and echoes are fetched from Wuthery CDN and written to
public/Data. Pass-through flags (e.g. --dry-run, --pretty) apply to all.
"""

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    # All sync scripts live in wuwabuilds/scripts; run from here
    scripts_dir = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(description="Run characters, weapons, and echoes sync")
    parser.add_argument("--dry-run", action="store_true", help="Preview only (no writes)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args, rest = parser.parse_known_args()

    passthrough = []
    if args.dry_run:
        passthrough.append("--dry-run")
    if args.pretty:
        passthrough.append("--pretty")
    passthrough.extend(rest)

    scripts = [
        ("Characters", [sys.executable, str(scripts_dir / "sync_characters.py"), "--fetch"]),
        ("Weapons", [sys.executable, str(scripts_dir / "sync_weapons.py"), "--fetch"]),
        ("Echoes", [sys.executable, str(scripts_dir / "sync_echoes.py"), "--fetch"]),
    ]
    for name, cmd in scripts:
        cmd.extend(passthrough)
        print(f"\n--- Sync {name} ---")
        r = subprocess.run(cmd, cwd=scripts_dir)
        if r.returncode != 0:
            return r.returncode
    print("\n--- All syncs done ---")
    return 0


if __name__ == "__main__":
    exit(main())
