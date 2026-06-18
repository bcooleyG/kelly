(function () {
  "use strict";

  const searchInput = document.getElementById("search");
  const directory = document.getElementById("directory");
  const resultCount = document.getElementById("result-count");

  // The directory has ~9,000 entries; rendering them all at once locks up
  // the browser. We only ever paint the first MAX_RESULTS matches.
  const MAX_RESULTS = 300;

  let listings = [];

  // Load the directory data.
  fetch("data.json?v=0.11")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      // Sort alphabetically by name so the book reads in order.
      listings = data.slice().sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      // Precompute the lowercased search text and phone digits once, so
      // filtering on every keystroke is a cheap string scan.
      listings.forEach(function (item) {
        item._hay = (item.name + " " + item.address + " " + item.phone)
          .toLowerCase();
        item._digits = item.phone.replace(/\D/g, "");
      });
      render(listings, "");
    })
    .catch(function (err) {
      resultCount.textContent = "Could not load listings.";
      directory.innerHTML =
        '<p class="no-results">Directory data failed to load (' +
        escapeHtml(err.message) +
        "). If you opened this file directly, run it from a local web server.</p>";
    });

  // Debounced search.
  let timer = null;
  searchInput.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      const q = searchInput.value.trim();
      const matches = filterListings(q);
      render(matches, q);
    }, 120);
  });

  function filterListings(query) {
    if (!query) return listings;
    const q = query.toLowerCase();
    // Normalize digits so "5550142" matches "555-0142".
    const qDigits = q.replace(/\D/g, "");
    return listings.filter(function (item) {
      if (item._hay.indexOf(q) !== -1) return true;
      if (qDigits && item._digits.indexOf(qDigits) !== -1) return true;
      return false;
    });
  }

  function render(items, query) {
    directory.innerHTML = "";

    if (items.length === 0) {
      resultCount.textContent = 'No listings found for "' + query + '".';
      const p = document.createElement("p");
      p.className = "no-results";
      p.textContent = "No listings found. Try a different name or number.";
      directory.appendChild(p);
      return;
    }

    const shown = items.slice(0, MAX_RESULTS);
    const total = items.length;

    if (total > MAX_RESULTS) {
      resultCount.textContent =
        "Showing first " + MAX_RESULTS + " of " + total +
        (query ? ' matches for "' + query + '"' : " listings") +
        " — keep typing to narrow it down.";
    } else {
      resultCount.textContent =
        total +
        (total === 1 ? " listing" : " listings") +
        (query ? ' matching "' + query + '"' : " — entire directory");
    }

    // Build everything off-screen in one fragment, then attach once.
    const frag = document.createDocumentFragment();
    let currentLetter = null;
    let group = null;

    shown.forEach(function (item) {
      const letter = item.name.charAt(0).toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        group = document.createElement("div");
        group.className = "letter-group";
        const head = document.createElement("h2");
        head.className = "letter-head";
        head.textContent = letter;
        group.appendChild(head);
        frag.appendChild(group);
      }
      group.appendChild(buildListing(item, query));
    });
    directory.appendChild(frag);

    // When the list is capped, tell the reader at the BOTTOM too -- otherwise
    // hitting entry 300 mid-alphabet looks like the directory just ends.
    if (total > MAX_RESULTS) {
      const more = document.createElement("p");
      more.className = "list-footer";
      more.textContent =
        "+ " + (total - MAX_RESULTS) + " more listings not shown. Type a " +
        "name, number, or street above to find any listing in the directory.";
      directory.appendChild(more);
    }
  }

  function buildListing(item, query) {
    const row = document.createElement("div");
    row.className = "listing";

    const who = document.createElement("div");
    who.className = "who";

    const name = document.createElement("span");
    name.className = "name";
    name.innerHTML = highlight(item.name, query);
    who.appendChild(name);

    const addr = document.createElement("span");
    addr.className = "addr";
    addr.innerHTML = highlight(item.address, query);
    who.appendChild(addr);

    const number = document.createElement("span");
    number.className = "number";
    number.innerHTML = highlight(item.phone, query);

    row.appendChild(who);
    row.appendChild(number);
    return row;
  }

  // Highlight the matched substring (case-insensitive), escaping HTML first.
  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const q = query.trim();
    if (!q) return safe;
    try {
      const re = new RegExp("(" + escapeRegExp(q) + ")", "ig");
      return safe.replace(re, "<mark>$1</mark>");
    } catch (e) {
      return safe;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})();
