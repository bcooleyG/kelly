#!/usr/bin/env python3
"""Build data.json for the Seclucity directory from the source CSV.

Reads "Seclucity Search 3 column csv.csv" (3 newspaper-style columns that
together form one A-Z list of business names), stitches names that were
wrapped across two rows back together, and writes them out as a plain list
of names.

Run:  python3 build_data.py
"""
import csv
import json

CSV_NAME = "Seclucity Search 3 column csv.csv"
OUT = "data.json"


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

    Each column is sorted, so a real entry never sorts before the one above
    it. A line that breaks that order is the tail of a wrapped name. We only
    act when the out-of-order line ALSO starts with a different first
    character than its neighbour -- a same-initial break is just a source
    mis-sort of two real businesses (e.g. "Adams Kevin" vs "Adam's Mark", or
    "100th Meridian Museum" vs "1 Step Ahead Salon"), which must be left
    alone. The line that resumes the run tells us which is the fragment.
    """
    result = []
    for i, cur in enumerate(seq):
        if result:
            prev = result[-1]
            fc, fp = cur[0].lower(), prev[0].lower()
            if (fc != fp and cur.lower() < prev.lower()):
                nxt = seq[i + 1] if i + 1 < len(seq) else None
                resumes = nxt is None or nxt.lower() >= prev.lower()
                # A line starting with a digit is a real business the source
                # filed phonetically (e.g. "8 Days..." among the E's), never a
                # wrap tail -- so it must not be absorbed.
                if resumes and not cur[0].isdigit():
                    # `prev` is in its proper place; `cur` is the fragment.
                    result[-1] = prev + " " + cur
                    continue
                elif not resumes and not prev[0].isdigit():
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


def main():
    names = load_names()
    out = [{"name": n} for n in names]
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(out)} listings to {OUT}")


if __name__ == "__main__":
    main()
