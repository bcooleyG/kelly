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
        # A line starting with a digit is a real business the source filed
        # phonetically (e.g. "8 Days..." among the E's, "66 Bowl" sorted to
        # the front), never a wrap tail -- it must not take part in stitching,
        # either as a fragment or as the trigger that demotes its neighbour.
        if result and not cur[0].isdigit():
            prev = result[-1]
            fc, fp = cur[0].lower(), prev[0].lower()
            if (fc != fp and cur.lower() < prev.lower()):
                # Look ahead past digit entries, whose front-loaded sort
                # position would otherwise fool the test below.
                nxt = next((seq[j] for j in range(i + 1, len(seq))
                            if not seq[j][0].isdigit()), None)
                resumes = nxt is None or nxt.lower() >= prev.lower()
                if resumes:
                    # `prev` is in its proper place; `cur` is the fragment.
                    result[-1] = prev + " " + cur
                    continue
                elif not prev[0].isdigit():
                    # `prev` itself was the fragment; fold it into the line
                    # above it, then keep `cur` as a normal entry.
                    frag = result.pop()
                    if result:
                        result[-1] = result[-1] + " " + frag
                    else:
                        result.append(frag)
        result.append(cur)
    return result


# A handful of names can't be un-wrapped by sort order alone: the source
# placed a real business A directly before a business B that was itself split
# across two rows, so B's first row reads like a valid entry after A. The
# stitcher pulls B's head onto A and strands B's tail. Each fix below was
# verified against the spreadsheet's consecutive rows; every mapping is a
# 1-to-1 rename, so the listing count is unchanged.
MANUAL_FIXES = {
    # Bridgeport First United / Methodist Church / Bridgeport Hill Service / Station
    "Bridgeport First United": "Bridgeport First United Methodist Church",
    "Methodist Church Bridgeport Hill Service Station":
        "Bridgeport Hill Service Station",
    # Dough Boys Pizza / Douglas Walker / Companies
    "Dough Boys Pizza Douglas Walker": "Dough Boys Pizza",
    "Companies": "Douglas Walker Companies",
    # J J's Coney Island / JM Davis Arms & / Historical Museum
    "J J's Coney Island JM Davis Arms &": "J J's Coney Island",
    "Historical Museum": "JM Davis Arms & Historical Museum",
    # X-Ite Homes / Xpedx Paper & Graphics / Store
    "X-Ite Homes Xpedx Paper & Graphics": "X-Ite Homes",
    "Store": "Xpedx Paper & Graphics Store",
    # Zipp Delivery / Zoller Designs & / Antiques
    "Zipp Delivery Zoller Designs &": "Zipp Delivery",
    "Antiques": "Zoller Designs & Antiques",
}


def load_names():
    """Return the full A-Z list of names, with wrapped rows stitched."""
    with open(CSV_NAME, encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    names = []
    for col in (0, 2, 4):
        names.extend(stitch_column(column_entries(rows, col)))
    return [MANUAL_FIXES.get(n, n) for n in names]


def main():
    names = load_names()
    out = [{"name": n} for n in names]
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(out)} listings to {OUT}")


if __name__ == "__main__":
    main()
