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


def detect_finals_game1_gap(games):
    """
    Find Game 1 of the NBA Finals and return the score gap (winning margin).
    The Finals is identified as the series with the latest first-game date
    (it starts weeks after all conference finals end).
    Returns an integer gap or None if Finals haven't started yet.
    """
    # Build {game_id: {abbr: pts}} and {game_id: game_date}
    by_game_pts  = defaultdict(dict)
    by_game_date = {}
    for g in games:
        gid = g["GAME_ID"]
        by_game_pts[gid][g["TEAM_ABBREVIATION"]] = g.get("PTS") or 0
        by_game_date[gid] = g.get("GAME_DATE", "")

    # Group game_ids by series key (sorted abbr pair)
    by_series = defaultdict(list)
    for gid, teams in by_game_pts.items():
        if len(teams) != 2:
            continue
        key = "-".join(sorted(teams.keys()))
        by_series[key].append(gid)

    if not by_series:
        return None

    # Finals = series whose earliest game has the latest date across all series
    def series_start(gids):
        return min(by_game_date.get(g, "") for g in gids)

    finals_key = max(by_series, key=lambda k: series_start(by_series[k]))

    # Game 1 = earliest game in that series
    game1_id = min(by_series[finals_key], key=lambda g: by_game_date.get(g, ""))
    pts = by_game_pts[game1_id]
    if len(pts) == 2:
        vals = list(pts.values())
        return abs(vals[0] - vals[1])
    return None


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

    records          = {}
    finals_game1_gap = None
    error            = None

    try:
        games   = fetch_playoff_games()
        records = compute_records(games)
        finals_game1_gap = detect_finals_game1_gap(games)
        print(f"Fetched {len(games)} game rows → {len(records)} series")
        for k, v in sorted(records.items()):
            print(f"  {k}: {v}")
        print(f"Finals Game 1 gap: {finals_game1_gap}")
    except Exception as exc:
        error = str(exc)
        print(f"Error: {exc}", file=sys.stderr)

    output = {
        "updated":         datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "records":         records,
        "gameTimes":       existing_game_times,
        "finalsGame1Gap":  finals_game1_gap,
        "error":           error,
    }

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
