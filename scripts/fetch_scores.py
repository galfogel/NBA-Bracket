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

# cdn.nba.com is the public CDN that powers NBA.com itself — no aggressive
# anti-bot filtering like stats.nba.com/stats/*, which silently drops requests.
SCHEDULE_URL = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
}


def fetch_playoff_games():
    """Return (flattened_rows, raw_game_objects) for finished 2025-26 NBA Playoff games.

    flattened_rows shape: {GAME_ID, GAME_DATE, TEAM_ABBREVIATION, WL, PTS}
    raw_game_objects: one dict per finished playoff game from the schedule JSON.
    """
    last_exc = None
    for attempt in range(3):
        try:
            resp = requests.get(SCHEDULE_URL, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception as exc:
            last_exc = exc
            print(f"Attempt {attempt + 1} failed: {exc}", file=sys.stderr)
    else:
        raise last_exc

    rows = []
    raw_games = []
    for gd in data.get("leagueSchedule", {}).get("gameDates", []):
        for g in gd.get("games", []):
            # Playoff filter: only playoff games have seriesGameNumber set.
            if not g.get("seriesGameNumber"):
                continue
            # 3 = final. Skip upcoming (1) and live (2) — no result yet.
            if g.get("gameStatus") != 3:
                continue
            home = g.get("homeTeam") or {}
            away = g.get("awayTeam") or {}
            h_abbr, a_abbr = home.get("teamTricode"), away.get("teamTricode")
            h_pts, a_pts   = home.get("score") or 0, away.get("score") or 0
            if not h_abbr or not a_abbr:
                continue
            h_wl = "W" if h_pts > a_pts else "L"
            a_wl = "W" if a_pts > h_pts else "L"
            gid  = g.get("gameId")
            date = g.get("gameDateUTC") or g.get("gameDateEst") or ""
            rows.append({"GAME_ID": gid, "GAME_DATE": date,
                         "TEAM_ABBREVIATION": h_abbr, "WL": h_wl, "PTS": h_pts})
            rows.append({"GAME_ID": gid, "GAME_DATE": date,
                         "TEAM_ABBREVIATION": a_abbr, "WL": a_wl, "PTS": a_pts})
            raw_games.append(g)
    return rows, raw_games


def compute_game_scores(raw_games):
    """
    Returns { "ABR1-ABR2": [ { "n", "home", "homePts", "away", "awayPts", "date" }, ... ] }
    sorted by game number. Key is sorted team abbreviations joined by '-'.
    """
    series = defaultdict(list)
    for g in raw_games:
        home = g.get("homeTeam") or {}
        away = g.get("awayTeam") or {}
        h = home.get("teamTricode")
        a = away.get("teamTricode")
        if not h or not a:
            continue
        key = "-".join(sorted([h, a]))
        series[key].append({
            "n":       g.get("seriesGameNumber"),
            "gameId":  g.get("gameId"),
            "home":    h,
            "homePts": home.get("score") or 0,
            "away":    a,
            "awayPts": away.get("score") or 0,
            "date":    (g.get("gameDateUTC") or "")[:10],
        })
    return {k: sorted(v, key=lambda x: x["n"] or 0) for k, v in series.items()}


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

    series_starts = {k: series_start(v) for k, v in by_series.items()}
    finals_key    = max(series_starts, key=lambda k: series_starts[k])

    # Sanity check: the Finals starts weeks after all other rounds.
    # If the "latest" series started within 20 days of the earliest, it's not the Finals.
    if len(series_starts) >= 2:
        earliest_other = min(v for k, v in series_starts.items() if k != finals_key)
        try:
            fmt = "%Y-%m-%dT%H:%M:%SZ"
            t_finals = datetime.strptime(series_starts[finals_key][:19] + "Z", fmt)
            t_other  = datetime.strptime(earliest_other[:19] + "Z", fmt)
            if (t_finals - t_other).days < 20:
                return None
        except Exception:
            return None
    else:
        return None  # Only one series — can't distinguish Finals from R1

    # Game 1 = earliest game in Finals
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

    # Preserve manually-set fields (gameTimes) and cached game scores on error.
    existing_game_times  = {}
    existing_game_scores = {}
    if os.path.exists(out_path):
        try:
            with open(out_path) as f:
                existing = json.load(f)
            existing_game_times  = existing.get("gameTimes", {})
            existing_game_scores = existing.get("games", {})
        except Exception:
            pass

    records          = {}
    game_scores      = {}
    finals_game1_gap = None
    error            = None

    try:
        games, raw_games = fetch_playoff_games()
        records      = compute_records(games)
        game_scores  = compute_game_scores(raw_games)
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
        "games":           game_scores if not error else existing_game_scores,
        "gameTimes":       existing_game_times,
        "finalsGame1Gap":  finals_game1_gap,
        "error":           error,
    }

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path}")

    if error:
        sys.exit(1)


if __name__ == "__main__":
    main()
