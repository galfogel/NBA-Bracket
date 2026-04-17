#!/usr/bin/env python3
"""
Fetch NBA 2025-26 playoff series records from stats.nba.com
and write results to data/scores.json.

Key format: sorted team abbreviations joined by '-' (e.g. "BOS-PHI")
Value: { "BOS": 2, "PHI": 1 }
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not installed.", file=sys.stderr)
    sys.exit(1)

# Headers required to avoid NBA API blocks
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Connection": "keep-alive",
}


def fetch_playoff_games():
    """Return all team-game rows for the 2025-26 NBA Playoffs."""
    url = "https://stats.nba.com/stats/leaguegamefinder"
    params = {
        "PlayerOrTeam": "T",
        "Season": "2025-26",
        "SeasonType": "Playoffs",
        "LeagueID": "00",
    }
    resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    rs = data["resultSets"][0]
    columns = rs["headers"]
    return [dict(zip(columns, row)) for row in rs["rowSet"]]


def compute_records(games):
    """
    Returns { "ABR1-ABR2": {"ABR1": wins, "ABR2": wins}, ... }
    where the key is the two team abbreviations sorted alphabetically.
    """
    # Collect {game_id: {abbr: WL}}
    by_game = defaultdict(dict)
    for g in games:
        by_game[g["GAME_ID"]][g["TEAM_ABBREVIATION"]] = g["WL"]

    records = defaultdict(lambda: defaultdict(int))
    for teams in by_game.values():
        abbrs = sorted(teams.keys())
        if len(abbrs) != 2:
            continue
        key = "-".join(abbrs)
        for abbr, wl in teams.items():
            if wl == "W":
                records[key][abbr] += 1

    # Ensure both teams appear in every entry
    for key, wins in records.items():
        a1, a2 = key.split("-")
        wins.setdefault(a1, 0)
        wins.setdefault(a2, 0)

    return {k: dict(v) for k, v in records.items()}


PLAYIN_CANDIDATES = {
    "E8": ["ORL", "CHA"],
    "W8": ["GSW", "PHX"],
}


def detect_playin_seeds(records):
    """
    Once a play-in team appears in the first-round Playoff records, it is the
    confirmed #8 seed.  Returns {'E8': 'ORL'|'CHA'|None, 'W8': 'GSW'|'PHX'|None}.
    """
    all_abbrs = set()
    for key in records:
        all_abbrs.update(key.split("-"))

    seeds = {}
    for slot, candidates in PLAYIN_CANDIDATES.items():
        seeds[slot] = next((a for a in candidates if a in all_abbrs), None)
    return seeds


def main():
    out_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "data", "scores.json")
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Preserve manually-set fields (gameTimes) — only records/scores are auto-updated.
    existing_game_times = {}
    if os.path.exists(out_path):
        try:
            with open(out_path) as f:
                existing = json.load(f)
            existing_game_times = existing.get("gameTimes", {})
        except Exception:
            pass

    records = {}
    playin  = {"E8": None, "W8": None}
    error   = None

    try:
        games   = fetch_playoff_games()
        records = compute_records(games)
        playin  = detect_playin_seeds(records)
        print(f"Fetched {len(games)} game rows → {len(records)} series")
        for k, v in sorted(records.items()):
            print(f"  {k}: {v}")
        print(f"Play-in seeds: {playin}")
    except Exception as exc:
        error = str(exc)
        print(f"Error: {exc}", file=sys.stderr)

    output = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "records": records,
        "playIn":  playin,
        "gameTimes": existing_game_times,
        "error": error,
    }

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
