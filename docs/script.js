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
const clearBtn = document.getElementById("clearBtn"); // 💡 クリアボタンの要素を取得
const viewportMeta = document.querySelector("meta[name=viewport]");

// 💡 検索窓への入力監視 (×ボタンの表示/非表示切り替え)
searchBox.addEventListener("input", () => {
    if (searchBox.value.length > 0) {
        clearBtn.style.display = "block";
    } else {
        clearBtn.style.display = "none";
    }
});

// 💡 クリアボタン押下時の処理
clearBtn.addEventListener("click", () => {
    searchBox.value = ""; // 検索窓の文字を空にする
    clearBtn.style.display = "none"; // ×ボタンを非表示にする
    searchBox.focus(); // 検索窓にフォーカスを戻す（次の入力を促す）
    results.innerHTML = ""; // 検索結果もクリアする

    resetZoom(); // ズームリセット関数を実行
});

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
    const raw = searchBox.value.trim();
    const query = raw.toLowerCase();
    results.innerHTML = "";

    if (!query) {
        results.innerHTML = "<p>1900は単語／1000は番号を入力</p>";
        return;
    }

    // 数値判定（整数のみ）
    const isNumber = /^[0-9]+$/.test(query);

    let filtered = [];

    if (isNumber) {
        // --- 数値検索モード ---
        const numInput = parseInt(query, 10);

        // 1〜1000 以外はエラー
        if (numInput < 1 || numInput > 1000) {
            results.innerHTML = "<p>番号検索は 1〜1000 の範囲のみ有効です</p>";
            return;
        }

        const actualNum = numInput + 1500; // Excel 実際の行番号

        filtered = data.filter(item => {
            return item.num === actualNum;
        });

    } else {
        // --- 英単語検索モード ---
        filtered = data.filter(item => {
            // 1〜1500 行のみ対象
            if (item.num > 1500) return false;
            if (!item.word || typeof item.word !== "string") return false;
            return item.word.toLowerCase() === query;
        });
    }

    if (filtered.length === 0) {
        results.innerHTML = "<p>該当なし</p>";
        return;
    }

    // 改行→HTML
    const nl2br = (text) => {
        if (!text) return "";
        return text.replace(/\r?\n/g, "<br>");
    };

    // 結果描画（新しい左右パネル構造に対応させる必要があります）
    filtered.forEach(item => {
        const div = document.createElement("div");
        div.className = "entry";

        let displayNum = item.num;
        if (!displayNum || displayNum === "") {
            displayNum = "empty";
        } else {
            const numVal = parseInt(displayNum, 10);
            if (numVal >= 1501) {
                displayNum = numVal - 1500;
            }
        }

        // 修正した番号を反映
        div.innerHTML = `<div class="head">${displayNum}. ${item.word}</div>`;

        // 💡 左右パネルのラッパーを作成
        const wrapper = document.createElement("div");
        wrapper.className = "section-wrapper";
        const mainPanel = document.createElement("div");
        mainPanel.className = "main-info-panel"; // 左パネル
        const timelinePanel = document.createElement("div");
        timelinePanel.className = "timeline-panel"; // 右パネル

        div.appendChild(wrapper);
        wrapper.appendChild(mainPanel);
        wrapper.appendChild(timelinePanel);

        const allKeys = Object.keys(item);
        const hKeys = allKeys.filter(k => k.startsWith("h")).sort((a, b) => a.localeCompare(b));

        hKeys.forEach((hKey, idx) => {
            if (!item[hKey] || item[hKey] === "") return;

            const nextHKey = hKeys[idx + 1];
            const startIdx = allKeys.indexOf(hKey) + 1;
            const endIdx = nextHKey ? allKeys.indexOf(nextHKey) : allKeys.length;

            const childKeys = allKeys.slice(startIdx, endIdx).filter(k => item[k] && item[k] !== "");
            if (childKeys.length === 0) return;

            // 💡 セクションを左右どちらのパネルに追加するかを判定
            const targetPanel = (hKey.startsWith("h1") || hKey.startsWith("h5")) ? mainPanel : timelinePanel;

            const sectionDiv = document.createElement("div");
            sectionDiv.className = `section ${hKey}`;

            sectionDiv.innerHTML = `<div class="subtitle">${item[hKey]}</div>
                                    <div class="content"></div>`;

            const contentDiv = sectionDiv.querySelector(".content");

            if (hKey.startsWith("h1")) {
                const parts = childKeys.map(k => `<div>${nl2br(item[k])}</div>`);
                contentDiv.innerHTML = parts.join("");
            } else if (hKey.startsWith("h5")) {
                let i = 1;
                while (item[`tag${i}`] || item[`p${i}`]) {
                    const tag = nl2br(item[`tag${i}`] || "");
                    const p = nl2br(item[`p${i}`] || "");
                    if (tag) contentDiv.innerHTML += `<span class="tag">${tag}</span>`; // spanに変更
                    if (p) contentDiv.innerHTML += `<div class="p">${p}</div>`;
                    i++;
                }
            } else if (hKey.startsWith("h6")) {
                let i = 1;
                while (item[`period${i}`] || item[`meaning${i}`]) {
                    const per = nl2br(item[`period${i}`] || "");
                    const mean = nl2br(item[`meaning${i}`] || "");
                    if (per || mean)
                        contentDiv.innerHTML += `<div class="period-meaning"><span class="period">${per}</span><span class="meaning">${mean}</span></div>`;
                    i++;
                }
            } else {
                childKeys.forEach(k => {
                    contentDiv.innerHTML += `<div>${nl2br(item[k])}</div>`;
                });
            }
            targetPanel.appendChild(sectionDiv);
        });

        results.appendChild(div);
        drawEclipticModel();
    });
}

function drawEclipticModel() {
  const container = document.querySelector(".tropic");
  if (!container) return;

  container.innerHTML = "";

  const size = 600;
  const cx = size / 2;
  const cy = size / 2;

  const earthRadius = 25;
  const sunRadius = 25;

  const sphereRadius = 220;
  const tilt = 23.4 * Math.PI / 180;
  const labelSize = 24;
  const tropicLabelSize = 14;
  const solsticePointRadius = 5;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "90%");
  svg.setAttribute("height", "90%");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.style.display = "block";
  svg.style.margin = "0 auto";
  container.appendChild(svg);

  /* ===== 天球 ===== */
  const sphere = document.createElementNS(svgNS, "circle");
  sphere.setAttribute("cx", cx);
  sphere.setAttribute("cy", cy);
  sphere.setAttribute("r", sphereRadius);
  sphere.setAttribute("fill", "none");
  sphere.setAttribute("stroke", "#2b6cb0");
  sphere.setAttribute("stroke-width", "2");
  svg.appendChild(sphere);

  /* ===== 黄道 ===== */
  let d = "";
  const steps = 360;

  function eclipticXY(angleDeg) {
    const a = angleDeg * Math.PI / 180;
    const x = sphereRadius * Math.cos(a);
    const y = sphereRadius * Math.sin(a) * 0.35;

    return {
      x: cx + (x * Math.cos(tilt) - y * Math.sin(tilt)),
      y: cy + (x * Math.sin(tilt) + y * Math.cos(tilt))
    };
  }

  for (let i = 0; i <= steps; i++) {
    const p = eclipticXY(i);
    d += `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `;
  }

  const ecliptic = document.createElementNS(svgNS, "path");
  ecliptic.setAttribute("d", d);
  ecliptic.setAttribute("fill", "none");
  ecliptic.setAttribute("stroke", "#d53f8c");
  ecliptic.setAttribute("stroke-width", "2");
  svg.appendChild(ecliptic);

  /* ===== 地球 ===== */
  const earth = document.createElementNS(svgNS, "circle");
  earth.setAttribute("cx", cx);
  earth.setAttribute("cy", cy);
  earth.setAttribute("r", earthRadius);
  earth.setAttribute("fill", "#2c7be5");
  svg.appendChild(earth);

  /* ===== 北回帰線・南回帰線 ===== */
  const tropicAngle = 23.4 * Math.PI / 180;
  const tropicOffset = Math.sin(tropicAngle) * earthRadius;

  function createTropicLine(yOffset) {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", cx - earthRadius);
    line.setAttribute("x2", cx + earthRadius);
    line.setAttribute("y1", cy + yOffset);
    line.setAttribute("y2", cy + yOffset);
    line.setAttribute("stroke", "#ffffff");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "4 4");
    return line;
  }

  svg.appendChild(createTropicLine(-tropicOffset));
  svg.appendChild(createTropicLine(tropicOffset));

  function createTropicLabel(text, yOffset) {
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", cx + earthRadius + 24);
    label.setAttribute("y", cy + yOffset);
    label.setAttribute("fill", "#ffffff");
    label.setAttribute("font-size", tropicLabelSize);
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = text;
    return label;
  }

  svg.appendChild(createTropicLabel("北回帰線", -tropicOffset));
  svg.appendChild(createTropicLabel("南回帰線", tropicOffset));

  /* ===== 至点（黄色い線） ===== */

  const summerSolstice = eclipticXY(180);
  const winterSolstice = eclipticXY(0);

  function drawSolsticeLine(from, toX, toY) {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", toX);
    line.setAttribute("y2", toY);
    line.setAttribute("stroke", "#f6e05e");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  }

  drawSolsticeLine(summerSolstice, cx - earthRadius, cy - tropicOffset);
  drawSolsticeLine(winterSolstice, cx + earthRadius, cy + tropicOffset);

  /* ===== 夏至点・冬至点（小円＋ラベル） ===== */

  function drawSolsticePoint(point, labelText, offsetX) {
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.setAttribute("r", solsticePointRadius);
    dot.setAttribute("fill", "#f6e05e");
    svg.appendChild(dot);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", point.x + offsetX);
    label.setAttribute("y", point.y);
    label.setAttribute("fill", "#f6e05e");
    label.setAttribute("font-size", 14);
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = labelText;
    svg.appendChild(label);
  }

  drawSolsticePoint(summerSolstice, "夏至点", -60);
  drawSolsticePoint(winterSolstice, "冬至点", 12);

  /* ===== 太陽 ===== */
  const sun = document.createElementNS(svgNS, "circle");
  sun.setAttribute("r", sunRadius);
  sun.setAttribute("fill", "#f6e05e");
  svg.appendChild(sun);

  gsap.to(sun, {
    duration: 20,
    repeat: -1,
    ease: "none",
    motionPath: {
      path: ecliptic,
      align: ecliptic,
      alignOrigin: [0.5, 0.5],
      start: 1,
      end: 0
    }
  });

  /* ===== ラベル ===== */
  const sphereLabel = document.createElementNS(svgNS, "text");
  sphereLabel.setAttribute("x", cx);
  sphereLabel.setAttribute("y", cy + sphereRadius + labelSize + 6);
  sphereLabel.setAttribute("text-anchor", "middle");
  sphereLabel.setAttribute("fill", "#2b6cb0");
  sphereLabel.setAttribute("font-size", labelSize);
  sphereLabel.textContent = "天球";
  svg.appendChild(sphereLabel);

  const eclipticLabel = document.createElementNS(svgNS, "text");
  eclipticLabel.setAttribute("x", cx);
  eclipticLabel.setAttribute(
    "y",
    cy + sphereRadius * 0.35 + labelSize * 2.5
  );
  eclipticLabel.setAttribute("text-anchor", "middle");
  eclipticLabel.setAttribute("fill", "#d53f8c");
  eclipticLabel.setAttribute("font-size", labelSize);
  eclipticLabel.textContent = "黄道";
  svg.appendChild(eclipticLabel);
}
