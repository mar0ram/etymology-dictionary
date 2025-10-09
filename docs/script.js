let data = [];
let dataLoaded = false;

// JSON読み込み
fetch("data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    dataLoaded = true;
  })
  .catch(err => {
    console.error("JSON読み込みエラー:", err);
  });

const searchBox = document.getElementById("searchBox");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");
const clearBtn = document.getElementById("clearBtn");
const viewportMeta = document.querySelector("meta[name=viewport]");

// フォーカス時のズーム防止（iOS Safari対策）
searchBox.addEventListener("focus", () => {
  if (viewportMeta) {
    viewportMeta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0"
    );
  }
});

// ズームリセット関数
function resetZoom() {
  if (document.activeElement) document.activeElement.blur();
  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (viewportMeta) {
      viewportMeta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0"
      );
    }
  }, 100);
}

// 検索ボタン押下
searchBtn.addEventListener("click", () => {
  if (!dataLoaded) {
    results.innerHTML = "<p>データを読み込み中です。少し待ってから再試行してください。</p>";
    return;
  }
  doSearch();
  resetZoom();
});

// Enter押下
searchBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (!dataLoaded) {
      results.innerHTML = "<p>データを読み込み中です。少し待ってから再試行してください。</p>";
      return;
    }
    doSearch();
    resetZoom();
  }
});

function doSearch() {
  const query = searchBox.value.trim().toLowerCase();
  results.innerHTML = "";

  if (!query) {
    results.innerHTML = "<p>単語を入力してください</p>";
    return;
  }

  const filtered = data.filter(item => {
    if (!item.word || typeof item.word !== "string") return false;
    return item.word.toLowerCase() === query;
  });

  if (filtered.length === 0) {
    results.innerHTML = "<p>該当なし</p>";
    return;
  }

  // ✅ 改行をHTMLに反映するための関数
  const nl2br = (text) => {
    if (!text) return "";
    return text.replace(/\r?\n/g, "<br>");
  };

  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `<div class="head">${item.num}. ${item.word}</div>`;

    const allKeys = Object.keys(item);
    const hKeys = allKeys.filter(k => k.startsWith("h")).sort((a, b) => a.localeCompare(b));

    hKeys.forEach((hKey, idx) => {
      if (!item[hKey] || item[hKey] === "") return;

      const nextHKey = hKeys[idx + 1];
      const startIdx = allKeys.indexOf(hKey) + 1;
      const endIdx = nextHKey ? allKeys.indexOf(nextHKey) : allKeys.length;

      const childKeys = allKeys.slice(startIdx, endIdx).filter(k => item[k] && item[k] !== "");
      if (childKeys.length === 0) return;

      div.innerHTML += `<div class="section ${hKey}">
                          <div class="subtitle">${item[hKey]}</div>
                          <div class="content"></div>
                        </div>`;

      const contentDiv = div.querySelector(".section:last-child .content");

      if (hKey.startsWith("h1")) {
        const parts = childKeys.map(k => nl2br(item[k])); // ← 改行対応
        contentDiv.innerHTML = parts.join(" + ");
      } else if (hKey.startsWith("h5")) {
        let i = 1;
        while (item[`tag${i}`] || item[`p${i}`]) {
          const tag = nl2br(item[`tag${i}`] || ""); // ← 改行対応
          const p = nl2br(item[`p${i}`] || "");     // ← 改行対応
          if (tag) contentDiv.innerHTML += `<div class="tag">${tag}</div>`;
          if (p) contentDiv.innerHTML += `<div class="p">${p}</div>`;
          i++;
        }
      } else if (hKey.startsWith("h6")) {
        let i = 1;
        while (item[`period${i}`] || item[`meaning${i}`]) {
          const per = nl2br(item[`period${i}`] || "");   // ← 改行対応
          const mean = nl2br(item[`meaning${i}`] || ""); // ← 改行対応
          if (per || mean)
            contentDiv.innerHTML += `<div class="period-meaning"><span class="period">${per}</span><span class="meaning">${mean}</span></div>`;
          i++;
        }
      } else {
        childKeys.forEach(k => {
          contentDiv.innerHTML += `<div>${nl2br(item[k])}</div>`; // ← 改行対応
        });
      }
    });

    results.appendChild(div);
  });
}
