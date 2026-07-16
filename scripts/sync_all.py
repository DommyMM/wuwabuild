"""
Run all sync scripts with default options.

Fetches characters, weapons, echoes, fetters (element/sonata sets), and stat
translations and writes them to public/Data. Wuthery is the default source;
pass --encore to use Encore's faster early-patch sync path.
Also generates backend OCR data and LB constants.
Supported flags are routed only to child scripts that declare them.
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
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--encore", action="store_true", help="Use Encore API sync instead of the default Wuthery CDN path")
    source.add_argument("--wuthery", action="store_true", help="Use Wuthery CDN sync (default; retained for compatibility)")
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
    args = parser.parse_args()

    dry_run_flags = []
    pretty_flags = []
    if args.dry_run:
        dry_run_flags.append("--dry-run")
    if args.pretty:
        pretty_flags.append("--pretty")

    data_flags = [*dry_run_flags, *pretty_flags]
    # sync_all's own --dry-run means "preview only" everywhere, including the
    # image mirror: --apply is what actually downloads into public/game-images
    # and rewrites the JSON, so it's only passed on a real run.
    mirror_flags = [] if args.dry_run else ["--apply"]
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
    backend_flags = [*dry_run_flags, *backend_icon_flags]

    if not args.encore:
        scripts = [
            ("Characters", [sys.executable, str(scripts_dir / "sync_characters.py"), "--fetch", *data_flags]),
            ("Weapons",    [sys.executable, str(scripts_dir / "sync_weapons.py"), "--fetch", *data_flags]),
            ("Echoes",     [sys.executable, str(scripts_dir / "sync_echoes.py"), "--fetch", *data_flags]),
            ("Fetters",    [sys.executable, str(scripts_dir / "sync_fetters.py"), *data_flags]),
            ("Stats",      [sys.executable, str(scripts_dir / "stat_translations.py"), *data_flags]),
            ("Image mirror", [sys.executable, str(scripts_dir / "mirror_images_to_public.py"), *mirror_flags]),
            ("Backend",    [sys.executable, str(scripts_dir / "sync_backend.py"), *backend_flags]),
            ("Leaderboard",[sys.executable, str(scripts_dir / "sync_lb.py"), *data_flags]),
        ]
    else:
        scripts = [
            ("Encore Data", [sys.executable, str(scripts_dir / "sync_encore.py"), *data_flags]),
            ("Stats",      [sys.executable, str(scripts_dir / "stat_translations.py"), *data_flags]),
            ("Image mirror", [sys.executable, str(scripts_dir / "mirror_images_to_public.py"), *mirror_flags]),
            ("Backend",    [sys.executable, str(scripts_dir / "sync_backend.py"), *backend_flags]),
            ("Leaderboard",[sys.executable, str(scripts_dir / "sync_lb.py"), *data_flags]),
        ]

    for name, cmd in scripts:
        print(f"\n--- Sync {name} ---")
        r = subprocess.run(cmd, cwd=scripts_dir)
        if r.returncode != 0:
            return r.returncode
    print("\n--- All syncs done ---")
    return 0


if __name__ == "__main__":
    exit(main())
