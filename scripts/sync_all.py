"""
Run all sync scripts with default options.

Fetches characters, weapons, echoes, fetters (element/sonata sets), and stat
translations and writes them to public/Data. Wuthery is the default source;
pass --encore to use Encore's faster early-patch sync path.
Also generates backend OCR data and LB constants.
Pass-through flags (e.g. --dry-run, --pretty) apply to all scripts.
"""

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    scripts_dir = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(description="Run all CDN sync scripts")
    parser.add_argument("--dry-run", action="store_true", help="Preview only (no writes)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    parser.add_argument("--encore", action="store_true", help="Use Encore API sync instead of the default Wuthery CDN path")
    parser.add_argument("--wuthery", action="store_true", help="Use Wuthery CDN sync (default; retained for compatibility)")
    # Backend template refresh controls (all routed to sync_backend.py, which is the
    # single source of truth for backend Data/ templates).
    parser.add_argument("--skip-element-icons", action="store_true", help="Skip backend element template refresh")
    parser.add_argument("--force-element-icons", action="store_true", help="Refresh existing backend element templates")
    parser.add_argument("--skip-character-icons", action="store_true", help="Skip backend character splash templates")
    parser.add_argument("--force-character-icons", action="store_true", help="Refresh existing backend character templates")
    parser.add_argument("--skip-weapon-icons", action="store_true", help="Skip backend weapon icon templates")
    parser.add_argument("--force-weapon-icons", action="store_true", help="Refresh existing backend weapon templates")
    parser.add_argument("--skip-echo-icons", action="store_true", help="Skip backend echo icon templates")
    parser.add_argument("--force-echo-icons", action="store_true", help="Refresh existing backend echo templates")
    args, rest = parser.parse_known_args()

    common_flags = []
    pretty_flags = []
    if args.dry_run:
        common_flags.append("--dry-run")
    if args.pretty:
        pretty_flags.append("--pretty")
    passthrough = [*common_flags, *pretty_flags, *rest]

    use_encore = args.encore and not args.wuthery

    if not use_encore:
        scripts = [
            ("Characters", [sys.executable, str(scripts_dir / "sync_characters.py"), "--fetch"]),
            ("Weapons",    [sys.executable, str(scripts_dir / "sync_weapons.py"), "--fetch"]),
            ("Echoes",     [sys.executable, str(scripts_dir / "sync_echoes.py"), "--fetch"]),
            ("Fetters",    [sys.executable, str(scripts_dir / "sync_fetters.py")]),
            ("Stats",      [sys.executable, str(scripts_dir / "stat_translations.py")]),
            ("Backend",    [sys.executable, str(scripts_dir / "sync_backend.py")]),
            ("Leaderboard",[sys.executable, str(scripts_dir / "sync_lb.py")]),
        ]
    else:
        encore_flags = [*common_flags, *pretty_flags, *rest]
        scripts = [
            ("Encore Data", [sys.executable, str(scripts_dir / "sync_encore.py"), *encore_flags]),
            ("Stats",      [sys.executable, str(scripts_dir / "stat_translations.py"), *common_flags, *pretty_flags]),
            ("Backend",    [sys.executable, str(scripts_dir / "sync_backend.py"), *common_flags]),
            ("Leaderboard",[sys.executable, str(scripts_dir / "sync_lb.py"), *common_flags, *pretty_flags]),
        ]
    backend_icon_flags = [
        "--" + flag.replace("_", "-")
        for flag in (
            "skip_element_icons", "force_element_icons",
            "skip_character_icons", "force_character_icons",
            "skip_weapon_icons", "force_weapon_icons",
            "skip_echo_icons", "force_echo_icons",
        )
        if getattr(args, flag)
    ]
    for name, cmd in scripts:
        if name == "Backend":
            cmd.extend(backend_icon_flags)
        if not use_encore:
            cmd.extend(passthrough)
        print(f"\n--- Sync {name} ---")
        r = subprocess.run(cmd, cwd=scripts_dir)
        if r.returncode != 0:
            return r.returncode
    print("\n--- All syncs done ---")
    return 0


if __name__ == "__main__":
    exit(main())
