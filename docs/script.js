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
        <svg viewBox="0 0 960 760" style="width: 100%; height: auto; display: block; margin: 15px 0;">
            <g stroke="currentColor" stroke-width="1.5" fill="none">
                                <path d="M 40 380 L 160 380" />
                <path d="M 160 180 L 160 580" />
                
                                <path d="M 160 180 L 320 180" />
                <path d="M 320 80 L 320 280" />
                <path d="M 320 80 L 940 80" />                <path d="M 320 180 L 940 180" />                <path d="M 320 280 L 460 280" />                                <path d="M 160 380 L 620 380" />                                <path d="M 160 580 L 320 580" />
                <path d="M 320 480 L 320 580" />
                <path d="M 320 480 L 940 480" />                <path d="M 320 580 L 780 580" />                
                                <path d="M 480 580 L 480 680" />
                <path d="M 480 680 L 780 680" />            </g>
            <g fill="currentColor" text-anchor="middle" font-family="sans-serif">
                                <g font-size="20">
                    <text x="80" y="372" font-weight="bold">印欧祖語</text>
                    
                    <text x="240" y="172">ゲルマン祖語</text>
                    <text x="240" y="372">古代ギリシャ語</text>
                    <text x="240" y="572">原始イタリック語</text>
                    
                    <text x="400" y="72">フランク語</text>
                    <text x="400" y="172">古英語</text>
                    <text x="400" y="272">古ノルド語</text>
                    <text x="400" y="372">古典ギリシャ語</text>
                    <text x="400" y="472">古典ラテン語</text>
                    <text x="400" y="572">俗ラテン語</text>

                    <text x="560" y="172">中英語</text>
                    <text x="560" y="372">中世ギリシャ語</text>
                    <text x="560" y="472">後期ラテン語</text>
                    <text x="560" y="572">古フランス語</text>

                    <text x="720" y="172">近代英語</text>
                    <text x="720" y="472">中世ラテン語</text>
                    <text x="720" y="572">フランス語</text>
                    <text x="720" y="672">イタリア語</text>

                    <text x="880" y="72">オランダ語</text>
                    <text x="880" y="172">現代英語</text>
                    <text x="880" y="472">近代ラテン語</text>
                </g>
                <g font-size="17" fill="#a0a0a0">
                    <text x="240" y="206">（原始ゲルマン語）</text>
                    <text x="240" y="406">前9c.～前4c.</text>
                    <text x="240" y="606">前2千年紀～前1千年紀</text>
                    
                    <text x="400" y="106">5c.～9c.</text>
                    <text x="400" y="206">約450年～1100年</text>
                    <text x="400" y="306">700年～1350年</text>
                    <text x="400" y="406">前5c.～前4c.</text>
                    <text x="400" y="506">前1c.～3c.</text>
                    <text x="400" y="606">前1c.～9c.</text>

                    <text x="560" y="206">約1100年～1500年</text>
                    <text x="560" y="406">4c.～15c.</text>
                    <text x="560" y="506">3c.～6c.</text>
                    <text x="560" y="606">9c.～14c.</text>

                    <text x="720" y="206">約1500年～1900年</text>
                    <text x="720" y="506">7c.～15c.</text>
                    <text x="720" y="606">14c.～現代</text>
                    <text x="720" y="706">14c.～現代</text>

                    <text x="880" y="206">1900年～現代</text>
                    <text x="880" y="506">16c.～現代</text>
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
        <ul style="list-style-type: disc; padding-left: 17px;">
            <li><strong>印欧祖語:</strong> ヨーロッパからインドに至る多数の言語の共通の祖先と推定される言語。文字記録はなく、比較言語学を用いて理論的に再建されている。</li>
            <li><strong>ゲルマン祖語:</strong> 英語、ドイツ語、北欧諸語などゲルマン語派の共通祖先。紀元前1千年紀ごろに話されていたとされ、現在のゲルマン系言語の基礎となっている。</li>
            <li><strong>ギリシャ語:</strong> 古代から現代まで数千年にわたり記録が途切れることなく残る言語。西洋の哲学、科学、文学、そして学術用語に極めて大きな影響を与えた。</li>
            <li><strong>ラテン語:</strong> 古代ローマ帝国の公用語であり、フランス語やイタリア語などロマンス諸語の祖先。中世以降もヨーロッパの学問・宗教における共通語として機能し続けた。</li>
            <li><strong>古ノルド語:</strong> ヴァイキング時代から中世にかけて、主にスカンディナヴィア周辺で話されていた北ゲルマン語。現代のノルウェー語、スウェーデン語、デンマーク語などの直接の祖先。</li>
            <li><strong>フランク語:</strong> 古代後期から中世初期にかけてフランク人によって話されていた西ゲルマン語。古フランス語の語彙や発音に多大な影響を与え、現代のオランダ語などフランケン語群の基礎となった。</li>
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
            } else {
                childKeys.forEach(k => {
                    let text = item[k];
                    // 💡 「i2」の場合のみ、<b>と<span class="ml">の間にdiv要素（プレースホルダー）を挿入
                    if (k === "i2") {
                        text = text.replace(/<\/b>(\r?\n)?<span class="ml">/, `</b><div id="audio-box-${item.num}" class="audio_box" style="display:inline-block; margin: 0 10px;"></div>$1<span class="ml">`);
                    }
                    contentDiv.innerHTML += `<div>${nl2br(text)}</div>`;
                });
            }
            targetPanel.appendChild(sectionDiv);
        });
        results.appendChild(div);

        // 💡 最後に非同期で音声をAPIから取得し、先ほどのdiv内にアイコンを生成
        fetchAndSetAudio(item.word, item.num, item.partOfSpeech);
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

// 💡 Merriam-Webster APIから音声を取得し、該当のdiv要素内にアイコンを描画する関数
// ※呼び出し元を fetchAndSetAudio(word, num, partOfSpeech) となるよう調整してください
async function fetchAndSetAudio(word, num, partOfSpeech = "") {
    try {
        const k = "74a8b9a7-6973-4b74-b19d-1425e02f3912";
        const apiUrl = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${k}`;

        const response = await fetch(apiUrl);
        if (!response.ok) return;

        const data = await response.json();
        let audioFileName = "";

        // Merriam-WebsterのJSONから音声ファイル名（暗号のような文字列）を抽出
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            let targetEntry = data[0]; // デフォルトは一番最初の検索結果

            // エクセルから取得した品詞(partOfSpeech)の指定がある場合、一致するものを探す
            if (partOfSpeech) {
                const searchPos = partOfSpeech.trim().toLowerCase();
                const matchedEntry = data.find(entry => {
                    if (!entry.fl) return false;
                    const fl = entry.fl.toLowerCase();
                    // M-W特有の「transitive verb」などにもヒットさせるため、includesを使用
                    return fl === searchPos || fl.includes(searchPos);
                });

                if (matchedEntry) {
                    targetEntry = matchedEntry;
                }
            }

            // 発音データ(prs)と音声データ(sound.audio)が存在するかチェック
            if (targetEntry.hwi && targetEntry.hwi.prs && targetEntry.hwi.prs.length > 0 && targetEntry.hwi.prs[0].sound) {
                audioFileName = targetEntry.hwi.prs[0].sound.audio;
            }
        }

        let audioUrl = "";

        // ファイル名からMerriam-Websterの仕様に従って mp3 の URL を組み立てる
        if (audioFileName) {
            let subdir = audioFileName.charAt(0);
            if (audioFileName.startsWith("bix")) subdir = "bix";
            else if (audioFileName.startsWith("gg")) subdir = "gg";
            else if (/^[^a-zA-Z]/.test(subdir)) subdir = "number"; // 数字や記号で始まる場合

            audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioFileName}.mp3`;
        }

        // 音声データが見つかった場合のみアイコンを表示
        if (audioUrl) {
            const audioBox = document.getElementById(`audio-box-${num}`);
            if (audioBox) {
                // 連打防止のため、onclick属性を外し、JS側でイベントリスナーを設定する形に変更
                audioBox.innerHTML = `<span class="audio_button" style="cursor:pointer;"><i class="fa-solid fa-volume-high fa-rotate-by fa-sm" style="color: #ffffff; --fa-rotate-angle: 340deg;"></i></span>`;

                const btn = audioBox.querySelector('.audio_button');

                const audio = new Audio(audioUrl);
                audio.preload = 'auto';

                btn.addEventListener('click', function () {
                    // すでに無効化されている（再生中）場合は処理を抜ける
                    if (btn.style.pointerEvents === 'none') return;

                    // タップを無効化し、少し半透明にして再生中であることを視覚的に示す
                    btn.style.pointerEvents = 'none';
                    btn.style.opacity = '0.5';

                    audio.currentTime = 0;

                    // 再生終了時にタップを有効化して元の濃さに戻す
                    audio.onended = () => {
                        btn.style.pointerEvents = 'auto';
                        btn.style.opacity = '1';
                    };

                    // エラー時も元に戻す（無効化されっぱなしを防ぐ）
                    audio.onerror = () => {
                        btn.style.pointerEvents = 'auto';
                        btn.style.opacity = '1';
                    };

                    // 再生開始（失敗した場合も元に戻す）
                    audio.play().catch(() => {
                        btn.style.pointerEvents = 'auto';
                        btn.style.opacity = '1';
                    });
                });
            }
        }
    } catch (error) {
        // 音声がない場合やエラー時はプレースホルダーのdivは空のまま（アイコン非表示）
    }
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