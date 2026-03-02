import { drawEclipticModel } from "./eclipticModel.js";
import { drawArcticModel } from "./arctic.js";
import { drawDimensionModel } from "./dimension.js";
import { drawSchemeModel } from "./scheme.js";
import { drawPostponeModel } from "./postpone.js";
import { drawFiberModel } from "./fiber.js";
import { drawTenseLineModel } from "./tense.js";
import { drawScatterAnimation } from './scatter.js';
import { drawTransparentAnimation } from './transparent.js';
import { drawSteepModel } from './steep.js';
import { drawPrecedeModel } from './precede.js';
import { drawEpidemicModel } from './epidemic.js';

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

function prependEntry(text = '現代英語に関わるさまざまな言語') {
    const entry = document.createElement('div');
    entry.className = 'entry';

    const head = document.createElement('div');
    head.className = 'head';
    head.id = 'head';
    head.textContent = text;

    entry.appendChild(head);

    const treeWrapper = document.createElement('div');
    treeWrapper.style.width = '100%';
    treeWrapper.innerHTML = `
        <svg viewBox="0 0 580 760" style="width: 100%; height: auto; display: block; margin: 15px 0;">
            <g stroke="currentColor" stroke-width="1.5" fill="none">
                                <path d="M 290 55 L 130 110" />
                <path d="M 290 55 L 290 110" />
                <path d="M 290 55 L 450 210" />

                                <path d="M 130 155 L 140 320" />
                <path d="M 130 155 L 60 440" />
                <path d="M 290 155 L 290 210" />

                                <path d="M 450 255 L 450 320" />

                                <path d="M 140 365 L 170 440" />
                <path d="M 450 365 L 310 440" />
                <path d="M 450 365 L 510 440" />
                <path d="M 450 365 L 410 560" />

                                <path d="M 170 485 L 170 560" />
                <path d="M 310 485 L 310 560" />
                <path d="M 510 485 L 510 560" />

                                <path d="M 170 605 L 170 680" />
            </g>
            <g fill="currentColor" text-anchor="middle" font-family="sans-serif">
                                <g font-size="16">
                    <text x="290" y="40" font-weight="bold">印欧祖語</text>
                    <text x="130" y="130">ゲルマン祖語</text>
                    <text x="290" y="130">古代ギリシャ語</text>
                    <text x="290" y="230">古典ギリシャ語</text>
                    <text x="450" y="230">古典ラテン語</text>
                    <text x="140" y="340">古英語</text>
                    <text x="450" y="340">後期ラテン語</text>
                    <text x="60" y="460">古ノルド語</text>
                    <text x="170" y="460">中英語</text>
                    <text x="310" y="460">古フランス語</text>
                    <text x="510" y="460">中世ラテン語</text>
                    <text x="170" y="580">近代英語</text>
                    <text x="410" y="580">イタリア語</text>
                    <text x="310" y="580">フランス語</text>
                    <text x="510" y="580">近代ラテン語</text>
                    <text x="170" y="700">現代英語</text>
                </g>
                
                                <g font-size="11">
                    <text x="130" y="150">（原始ゲルマン語）</text>
                    <text x="290" y="150">（前9世紀–前6世紀）</text>
                    <text x="290" y="250">（前5世紀–前4世紀）</text>
                    <text x="450" y="250">（前1世紀–3世紀）</text>
                    <text x="140" y="360">（約450年–1150年）</text>
                    <text x="450" y="360">（3世紀–6世紀）</text>
                    <text x="60" y="480">（800年–1350年）</text>
                    <text x="170" y="480">（約1150年–1500年）</text>
                    <text x="310" y="480">（9世紀–14世紀）</text>
                    <text x="510" y="480">（7世紀–15世紀）</text>
                    <text x="170" y="600">（約1500年–1700年）</text>
                    <text x="310" y="600">（14世紀–現代）</text>
                    <text x="510" y="600">（16世紀–現代）</text>
                    <text x="170" y="720">（1700年–現代）</text>
                </g>
            </g>
        </svg>
    `;
    entry.appendChild(treeWrapper);

    const explanations = document.createElement('div');
    explanations.style.margin = '15px 0';
    explanations.style.lineHeight = '1.6';
    explanations.style.fontSize = '14px';
    explanations.innerHTML = `
        <ul style="list-style-type: disc; padding-left: 20px;">
            <li><strong>印欧祖語:</strong> ヨーロッパからインドに至る多数の言語の共通の祖先と推定される言語。文字記録はなく、比較言語学を用いて理論的に再建されています。</li>
            <li><strong>ゲルマン祖語:</strong> 英語、ドイツ語、北欧諸語などゲルマン語派の共通祖先。紀元前1千年紀ごろに話されていたとされ、現在のゲルマン系言語の基礎となっています。</li>
            <li><strong>ギリシャ語:</strong> 古代から現代まで数千年にわたり記録が途切れることなく残る言語。西洋の哲学、科学、文学、そして学術用語に極めて大きな影響を与えました。</li>
            <li><strong>ラテン語:</strong> 古代ローマ帝国の公用語であり、フランス語やイタリア語などロマンス諸語の祖先。中世以降もヨーロッパの学問・宗教における共通語として機能し続けました。</li>
            <li><strong>古ノルド語:</strong> ヴァイキング時代から中世にかけて、主にスカンディナヴィア周辺で話されていた北ゲルマン語。現代のノルウェー語、スウェーデン語、デンマーク語などの直接の祖先です。</li>
        </ul>
    `;
    entry.appendChild(explanations);

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

        insertSampleImages();

        const configs = [
            { sel: ".tropic", func: drawEclipticModel },
            { sel: ".arctic", func: drawArcticModel },
            { sel: ".dimension", func: drawDimensionModel },
            { sel: ".scheme", func: drawSchemeModel },
            { sel: ".postpone", func: drawPostponeModel },
            { sel: ".fiber", func: drawFiberModel },
            { sel: ".tense", func: drawTenseLineModel },
            { sel: ".scatter", func: drawScatterAnimation },
            { sel: ".transparent", func: drawTransparentAnimation },
            { sel: ".steep", func: drawSteepModel },
            { sel: ".precede", func: drawPrecedeModel },
            { sel: ".epidemic", func: drawEpidemicModel }
        ];

        configs.forEach(config => {
            const target = div.querySelector(config.sel);
            if (target) {
                startAnimation(target, config.func);
            }
        });
    });
}

function startAnimation(container, drawFunc) {
    if (!container) return;
    drawFunc();
}

/*クラス名に基づいて<img>要素を挿入し、洗練されたアコーディオンにする関数*/
function insertSampleImages() {
    const targetElements = document.querySelectorAll('div.sample_image');

    if (targetElements.length === 0) {
        return;
    }

    targetElements.forEach((el) => {
        const imageName = el.classList[1];

        if (imageName) {
            // トリガーとなるspan
            const trigger = document.createElement('span');
            trigger.classList.add('accordion-trigger');
            trigger.textContent = '画像を表示'; // 指定のテキストに変更

            // コンテンツ（画像）を包むspan
            const content = document.createElement('span');
            content.classList.add('accordion-content');

            const img = document.createElement('img');
            img.src = `./sample_images/${imageName}.png`;
            img.alt = imageName;

            content.appendChild(img);
            el.appendChild(trigger);
            el.appendChild(content);

            trigger.addEventListener('click', () => {
                el.classList.toggle('is-active');
            });
        }
    });
}


















