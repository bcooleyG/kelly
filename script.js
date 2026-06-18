(function () {
  "use strict";

  const searchInput = document.getElementById("search");
  const directory = document.getElementById("directory");
  const resultCount = document.getElementById("result-count");

  let listings = [];

  // Load the directory data.
  fetch("data.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      // Sort alphabetically by name so the book reads in order.
      listings = data.slice().sort(function (a, b) {
        return a.name.localeCompare(b.name);
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
      const haystack = (
        item.name +
        " " +
        item.address +
        " " +
        item.phone
      ).toLowerCase();
      if (haystack.indexOf(q) !== -1) return true;
      if (qDigits && item.phone.replace(/\D/g, "").indexOf(qDigits) !== -1) {
        return true;
      }
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

    resultCount.textContent =
      items.length +
      (items.length === 1 ? " listing" : " listings") +
      (query ? ' matching "' + query + '"' : " — entire directory");

    // Group by first letter of the (already sorted) name.
    let currentLetter = null;
    let group = null;

    items.forEach(function (item) {
      const letter = item.name.charAt(0).toUpperCase();
      if (letter !== currentLetter) {
        currentLetter = letter;
        group = document.createElement("div");
        group.className = "letter-group";
        const head = document.createElement("h2");
        head.className = "letter-head";
        head.textContent = letter;
        group.appendChild(head);
        directory.appendChild(group);
      }
      group.appendChild(buildListing(item, query));
    });
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
