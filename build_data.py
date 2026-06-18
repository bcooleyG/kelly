#!/usr/bin/env python3
"""Build data.json for the Seclucity directory from the source CSV.

Reads "Seclucity Search 3 column csv.csv" (3 newspaper-style columns that
together form one A-Z list of business names), stitches names that were
wrapped across two rows back together, and assigns each a fake but
real-looking Tulsa-metro phone number and address.

Run:  python3 build_data.py
"""
import csv
import json
import random

CSV_NAME = "Seclucity Search 3 column csv.csv"
OUT = "data.json"

# Deterministic output so re-running yields the same fake data.
random.seed(20260618)

# --- Tulsa-metro street names, grouped by city (all real streets) ---
STREETS = {
    "Tulsa": [
        "S Riverside Dr", "S Peoria Ave", "S Harvard Ave", "S Yale Ave",
        "S Sheridan Rd", "S Memorial Dr", "S Mingo Rd", "S Lewis Ave",
        "S Utica Ave", "E Admiral Pl", "E 11th St", "E 15th St", "E 21st St",
        "E 31st St", "E 41st St", "E 51st St", "E 71st St", "E 81st St",
        "S Garnett Rd", "E Cherry St", "S Boston Ave", "S Cincinnati Ave",
        "S Denver Ave", "S Elgin Ave", "N Greenwood Ave", "E Archer St",
        "E Pine St", "E Apache St", "S Florence Ave", "E Kenosha St",
    ],
    "Broken Arrow": [
        "S Elm Pl", "S Aspen Ave", "S Olive Ave", "E Kenosha St",
        "E New Orleans St", "E Houston St", "S Lynn Lane Rd", "E Albany St",
        "S County Line Rd", "E Omaha St", "E Tucson St", "S Main St",
        "E Washington St", "S 9th St", "E Florence St", "E Detroit St",
        "S 23rd St", "E College St", "S Vandever Ave", "W Boston St",
    ],
    "Owasso": [
        "E 86th St N", "E 96th St N", "E 76th St N", "E 116th St N",
        "N Main St", "N Garnett Rd", "N 129th E Ave", "N Mingo Rd",
        "E Larkin Ave", "N Ash St", "N Birch St", "N Cedar St",
        "N Dogwood St", "N Elm St", "E 2nd Ave", "N Atlanta St",
    ],
    "Bixby": [
        "E 151st St", "E 141st St", "E 161st St", "E 121st St", "E 111th St",
        "S Memorial Dr", "S Mingo Rd", "S Garnett Rd", "S Lewis Ave",
        "S Yale Ave", "E Dawes Ave", "S Cabaniss Ave", "N Riverview Dr",
        "W Breckenridge Ave", "E 131st St",
    ],
    "Jenks": [
        "S Elm St", "W Main St", "S 1st St", "S A St", "S B St",
        "E Aquarium Dr", "W 96th St", "E 91st St", "S Elwood Ave",
        "S Riverfront Dr", "W 121st St", "E Veterans Pkwy", "S Stoneybrook Dr",
        "E 101st St", "W 71st St",
    ],
}

# City -> plausible ZIP codes.
ZIPS = {
    "Tulsa": ["74103", "74104", "74105", "74112", "74114", "74135", "74136"],
    "Broken Arrow": ["74011", "74012", "74014"],
    "Owasso": ["74055"],
    "Bixby": ["74008"],
    "Jenks": ["74037"],
}
CITIES = list(STREETS.keys())


def first_letter(s):
    """First alphabetic character, uppercased, or None."""
    for ch in s:
        if ch.isalpha():
            return ch.upper()
    return None


def column_entries(rows, col):
    """Names in one column, top to bottom, minus the title and A/Z headers."""
    out = []
    for row in rows:
        v = row[col].strip() if len(row) > col else ""
        if not v or v == "Solution Search System":
            continue
        if len(v) == 1 and v.isalpha():            # letter divider, not a name
            continue
        if v.isdigit():                            # page number, not a name
            continue
        out.append(v)
    return out


def stitch_column(seq):
    """Stitch names that were wrapped across two rows back together.

    Each column is sorted A-Z, so a real entry never sorts before the one
    above it. A line that breaks that order is the tail of a wrapped name.
    We only act when the out-of-order line ALSO starts with a different
    letter than its neighbour -- a same-letter break is just a source
    mis-sort of two real businesses (e.g. "Adams Kevin" vs "Adam's Mark"),
    which must be left alone. The line that resumes the alphabetical run
    tells us which of the two lines is the stray fragment.
    """
    result = []
    for i, cur in enumerate(seq):
        if result:
            prev = result[-1]
            fc, fp = first_letter(cur), first_letter(prev)
            if (fc and fp and fc != fp and cur.lower() < prev.lower()):
                nxt = seq[i + 1] if i + 1 < len(seq) else None
                resumes = nxt is None or nxt.lower() >= prev.lower()
                if resumes:
                    # `prev` is in its proper place; `cur` is the fragment.
                    result[-1] = prev + " " + cur
                    continue
                else:
                    # `prev` itself was the fragment; fold it into the line
                    # above it, then keep `cur` as a normal entry.
                    frag = result.pop()
                    if result:
                        result[-1] = result[-1] + " " + frag
                    else:
                        result.append(frag)
        result.append(cur)
    return result


def load_names():
    """Return the full A-Z list of names, with wrapped rows stitched."""
    with open(CSV_NAME, encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    names = []
    for col in (0, 2, 4):
        names.extend(stitch_column(column_entries(rows, col)))
    return names


def make_phone():
    area = random.choice(["918", "918", "918", "539"])   # 918 dominant
    prefix = random.randint(200, 989)
    line = random.randint(0, 9999)
    return f"({area}) {prefix:03d}-{line:04d}"


def make_address():
    city = random.choice(CITIES)
    street = random.choice(STREETS[city])
    num = random.randint(100, 15999)
    zip_ = random.choice(ZIPS[city])
    return f"{num} {street}, {city}, OK {zip_}"


def main():
    names = load_names()
    out = [{
        "name": n,
        "phone": make_phone(),
        "address": make_address(),
    } for n in names]
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(out)} listings to {OUT}")


if __name__ == "__main__":
    main()
