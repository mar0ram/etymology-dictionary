import { drawEclipticModel } from "./eclipticModel.js";
import { drawArcticModel } from "./arctic.js";
import { drawDimensionModel } from "./dimension.js";
import { drawSchemeModel } from "./scheme.js";
import { drawPostponeModel } from "./postpone.js";
import { drawFiberModel } from "./fiber.js";
import { drawTenseLineModel } from "./tense.js";

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

function prependEntry(text = 'number. word') {
    const entry = document.createElement('div');
    entry.className = 'entry';

    const head = document.createElement('div');
    head.className = 'head';
    head.id = 'head';
    head.textContent = text;

    entry.appendChild(head);
    results.prepend(entry);
}
prependEntry();

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
    results.innerHTML = "";
    prependEntry();

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

        const configs = [
            { sel: ".tropic", func: drawEclipticModel },
            { sel: ".arctic", func: drawArcticModel },
            { sel: ".dimension", func: drawDimensionModel },
            { sel: ".scheme", func: drawSchemeModel },
            { sel: ".postpone", func: drawPostponeModel },
            { sel: ".fiber", func: drawFiberModel },
            { sel: ".tense", func: drawTenseLineModel }
        ];

        configs.forEach(config => {
            const target = div.querySelector(config.sel);
            if (target) {
                attachMask(target, config.func);
            }
        });

        insertSampleImages();
    });
}

/**
 * 描画済みのコンテナにマスク（ボタン）を被せる関数
 */
function attachMask(container, drawFunc) {
    if (!container) return;
    // 1. まず描画を実行（この時点でCanvasやラベルが生成される）
    drawFunc();

    container.style.position = "relative";

    // 2. マスク層（オーバーレイ）を作成
    const overlay = document.createElement("div");
    overlay.className = "model-mask";
    overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); /* Canvasの上を覆う */
        display: flex; align-items: center; justify-content: center;
        z-index: 100; /* ラベルよりも上にくるように設定 */
        cursor: pointer; transition: opacity 0.6s ease;
    `;

    overlay.innerHTML = `
        <div style="text-align: center; color: #fff;">
            <div style="font-size: 50px; text-shadow: 0 0 15px rgba(255,255,255,0.8);">▶</div>
            <div style="font-size: 12px; margin-top: 10px; letter-spacing: 2px;">START ANIMATION</div>
        </div>
    `;

    // 3. クリックでアニメーション開始
    overlay.addEventListener("click", () => {
        overlay.style.opacity = "0";

        // 止めていたGSAPを再生
        if (container._gsapAnimations) {
            container._gsapAnimations.forEach(anim => anim.play());
        }

        if (container._modelState) {
            container._modelState.isPlaying = true;
        }

        setTimeout(() => {
            overlay.remove(); // 完全に消去
        }, 600);
    }, { once: true });

    container.appendChild(overlay);
}

/**
 * クラス名に基づいて<img>要素を挿入する関数
 * 要素が存在しない場合は何もしません。
 */
function insertSampleImages() {
  // 「sample_image」クラスを持つすべてのdiv要素を取得
  const targetElements = document.querySelectorAll('div.sample_image');

  // 要素が0個（取得できない）場合は、ここで処理を終了
  if (targetElements.length === 0) {
    return;
  }

  // 要素が存在する場合のみ、以下の処理を実行
  targetElements.forEach((el) => {
    // classListから2つ目のクラス名（インデックス1）を取得
    const imageName = el.classList[1];

    // 2つ目のクラス名が存在する場合のみ実行
    if (imageName) {
      const img = document.createElement('img');
      img.src = `./sample_images/${imageName}.png`;
      img.alt = imageName;
      
      el.appendChild(img);
    }
  });
}