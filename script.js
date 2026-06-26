(function () {
  "use strict";

  const searchInput = document.getElementById("search");
  const directory = document.getElementById("directory");
  const resultCount = document.getElementById("result-count");

  // The directory has ~9,000 entries; painting them all at once locks up
  // the browser. Instead we render in batches and add the next batch as the
  // reader scrolls toward the bottom (infinite scroll).
  const BATCH = 250;

  let listings = [];   // full directory, sorted
  let view = [];       // current result set (all listings, or search matches)
  let rendered = 0;    // how many of `view` are currently in the DOM
  let viewQuery = "";  // query the current view is highlighted for
  let lastLetter = null;

  // Sentinel sits at the end of the list; when it scrolls into view we
  // append the next batch.
  const sentinel = document.createElement("div");
  sentinel.className = "scroll-sentinel";
  const observer = new IntersectionObserver(
    function (entries) {
      if (entries[0].isIntersecting) renderMore();
    },
    { rootMargin: "800px" }   // start loading before it's actually visible
  );

  // Load the directory data.
  fetch("data.json?v=0.17")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      // Sort by the spoken sort key so number-leading names file as if
      // spelled out ("66 Rising" -> "Sixty-Six Rising", under S).
      listings = data.slice().sort(function (a, b) {
        return sortKey(a).localeCompare(sortKey(b));
      });
      // Precompute the lowercased name (for search) and the section letter
      // (from the sort key) once, so per-keystroke work stays cheap.
      listings.forEach(function (item) {
        item._hay = item.name.toLowerCase();
        item._letter = sortKey(item).charAt(0).toUpperCase();
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

  // The key a listing files under: its spoken form if it has one (number-
  // leading names), otherwise the name itself.
  function sortKey(item) {
    return item.sort || item.name;
  }

  function filterListings(query) {
    if (!query) return listings;
    const q = query.toLowerCase();
    return listings.filter(function (item) {
      return item._hay.indexOf(q) !== -1;
    });
  }

  // Start a fresh view: clear the list, render the first batch, and let the
  // scroll observer pull in the rest.
  function render(items, query) {
    observer.unobserve(sentinel);
    directory.innerHTML = "";
    view = items;
    viewQuery = query;
    rendered = 0;
    lastLetter = null;

    if (items.length === 0) {
      resultCount.textContent = 'No listings found for "' + query + '".';
      const p = document.createElement("p");
      p.className = "no-results";
      p.textContent = "No listings found. Try a different name.";
      directory.appendChild(p);
      return;
    }

    resultCount.textContent =
      items.length.toLocaleString() +
      (items.length === 1 ? " listing" : " listings") +
      (query ? ' matching "' + query + '"' : " — entire directory");

    renderMore();
  }

  // Append the next batch of the current view to the DOM.
  function renderMore() {
    if (rendered >= view.length) return;

    const end = Math.min(rendered + BATCH, view.length);
    const frag = document.createDocumentFragment();

    for (let i = rendered; i < end; i++) {
      const item = view[i];
      const letter = item._letter;
      if (letter !== lastLetter) {
        lastLetter = letter;
        const head = document.createElement("h2");
        head.className = "letter-head";
        head.textContent = letter;
        frag.appendChild(head);
      }
      frag.appendChild(buildListing(item, viewQuery));
    }
    rendered = end;
    directory.appendChild(frag);

    if (rendered < view.length) {
      directory.appendChild(sentinel);   // keep sentinel at the very bottom
      observer.observe(sentinel);
    } else {
      observer.unobserve(sentinel);
      const done = document.createElement("p");
      done.className = "list-footer";
      done.textContent =
        "End of directory — " + view.length.toLocaleString() + " listings.";
      directory.appendChild(done);
    }
  }

  function buildListing(item, query) {
    const row = document.createElement("div");
    row.className = "listing";
    row.innerHTML = highlight(item.name, query);
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
