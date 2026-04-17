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


def main():
    out_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "data", "scores.json")
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Preserve existing deadlines — the script only updates records/scores,
    # not the deadlines (those are set manually or by a separate process).
    existing_deadlines = {"1": "2026-04-18T22:00:00Z", "2": None, "3": None, "4": None}
    if os.path.exists(out_path):
        try:
            with open(out_path) as f:
                existing = json.load(f)
            existing_deadlines = existing.get("deadlines", existing_deadlines)
        except Exception:
            pass

    records = {}
    error = None

    try:
        games = fetch_playoff_games()
        records = compute_records(games)
        print(f"Fetched {len(games)} game rows → {len(records)} series")
        for k, v in sorted(records.items()):
            print(f"  {k}: {v}")
    except Exception as exc:
        error = str(exc)
        print(f"Error: {exc}", file=sys.stderr)

    output = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "records": records,
        "deadlines": existing_deadlines,
        "error": error,
    }

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
