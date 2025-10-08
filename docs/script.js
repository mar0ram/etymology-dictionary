let data = [];

// JSON読み込み
fetch("data.json")
  .then(res => res.json())
  .then(json => { data = json; });

const searchBox = document.getElementById("searchBox");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");
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

// フォーカスを外すとズームを元に戻す
function resetZoom() {
  if (document.activeElement) document.activeElement.blur(); // フォーカス解除
  if (viewportMeta) {
    viewportMeta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=10.0"
    );
  }
}

// ビューポートリセット関数
function resetZoom() {
  // フォーカスを外す
  if (document.activeElement) document.activeElement.blur();

  // 少し遅延してスクロール位置をトップに戻す
  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // ビューポートを再設定（iOS Safari対応）
    const viewportMeta = document.querySelector("meta[name=viewport]");
    if (viewportMeta) {
      viewportMeta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0"
      );
    }
  }, 100); // 100ms 遅延で確実に反映
}

// 検索ボタン押下
searchBtn.addEventListener("click", () => {
  doSearch();
  resetZoom();
});

// Enter押下
searchBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
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

  const filtered = data.filter(item => item.word.toLowerCase() === query);

  if (filtered.length === 0) {
    results.innerHTML = "<p>該当なし</p>";
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `<div class="head">${item.num}. ${item.word}</div>`;

    const allKeys = Object.keys(item);
    const hKeys = allKeys.filter(k => k.startsWith("h")).sort((a,b) => a.localeCompare(b));

    hKeys.forEach((hKey, idx) => {
      if (!item[hKey] || item[hKey] === "") return;

      const nextHKey = hKeys[idx + 1];
      const startIdx = allKeys.indexOf(hKey) + 1;
      const endIdx = nextHKey ? allKeys.indexOf(nextHKey) : allKeys.length;

      // 子要素だけ抽出（空白は除外）
      const childKeys = allKeys.slice(startIdx, endIdx).filter(k => item[k] && item[k] !== "");
      if (childKeys.length === 0) return; // 子要素がない場合はh自体をスキップ

      div.innerHTML += `<div class="section ${hKey}">
                          <div class="subtitle">${item[hKey]}</div>
                          <div class="content"></div>
                        </div>`;

      const contentDiv = div.querySelector(".section:last-child .content");

      if (hKey.startsWith("h1")) {
        // partNを横並び＋「+」でつなぐ
        const parts = childKeys.map(k => item[k]);
        contentDiv.innerHTML = parts.join(" + ");

      } else if (hKey.startsWith("h4")) {
        // tagN / pNを表示、pNは一字下げ
        let i = 1;
        while(item[`tag${i}`] || item[`p${i}`]) {
          const tag = item[`tag${i}`] || "";
          const p = item[`p${i}`] || "";
          if (tag) contentDiv.innerHTML += `<div class="tag">${tag}</div>`;
          if (p) contentDiv.innerHTML += `<div class="p">${p}</div>`;
          i++;
        }

      } else if (hKey.startsWith("h5")) {
        // periodN：meaningN を横並びで改行
        let i = 1;
        while(item[`period${i}`] || item[`meaning${i}`]) {
          const per = item[`period${i}`] || "";
          const mean = item[`meaning${i}`] || "";
          if (per || mean) contentDiv.innerHTML += `<div class="period-meaning"><span class="period">${per}</span><span class="meaning">${mean}</span></div>`;
          i++;
        }

      } else {
        // その他はそのまま表示
        childKeys.forEach(k => {
          contentDiv.innerHTML += `<div>${item[k]}</div>`;
        });
      }

    });

    results.appendChild(div);
  });
}
