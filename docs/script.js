import { prependEntry } from "./prependEntry.js";
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
import { setupTearAnimation } from './tear.js';
import { setupWarnAnimation } from './warn.js';
import { setupNgramInSection } from './ngram.js';

let data = [];
let dataLoaded = false;

// 💡 追加：URLの変更を検知して自動検索をリセット・実行する関数
function handleUrlSearch() {
    if (!dataLoaded) return; // データ未読み込み時は処理をスキップ（fetch完了後に再度呼ばれるため）

    const paramString = window.location.search || window.location.hash.replace('#', '?');
    const urlParams = new URLSearchParams(paramString);
    const targetWord = urlParams.get('word');

    if (targetWord) {
        searchBox.value = targetWord;
        clearBtn.style.display = "flex";
        doSearch(); // 既存の結果をクリアして新しい単語を検索
    } else {
        // パラメータが消された場合は初期画面にリセットする
        searchBox.value = "";
        clearBtn.style.display = "none";
        results.innerHTML = "";
        prependEntry();
    }
}

// 💡 追加：URLのハッシュ（#word=...）が書き換えられたタイミングを検知する
window.addEventListener("hashchange", handleUrlSearch);

// JSON読み込み
fetch("data.json")
    .then(res => res.json())
    .then(json => {
        data = json;
        dataLoaded = true;

        // 💡 変更：データ読み込み完了後にURLをチェックして処理を実行
        handleUrlSearch();
    })
    .catch(err => {
        console.error("JSON読み込みエラー:", err);
    });

const searchBox = document.getElementById("searchBox");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");
const clearBtn = document.getElementById("clearBtn"); // 💡 クリアボタンの要素を取得
const viewportMeta = document.querySelector("meta[name=viewport]");

// 初期表示としてカレンダーと各言語解説を描画
// 💡 修正：初回読み込み時にURLパラメータがない場合のみ初期表示を描画（上書き防止）
const initialParams = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
if (!initialParams.get('word')) {
    prependEntry();
}

// 💡 サジェスト用要素の生成とスタイル設定（JSのみで完結）
const searchBoxContainer = document.querySelector(".search-box-container");
searchBoxContainer.style.position = "relative";

const suggestionList = document.createElement("ul");
Object.assign(suggestionList.style, {
    position: "absolute",
    top: "100%",
    left: "0",
    width: "100%",
    maxHeight: "240px",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    border: "1px solid #cccccc",
    borderRadius: "4px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: "1000",
    display: "none",
    margin: "4px 0 0 0",
    padding: "0",
    listStyle: "none"
});
searchBoxContainer.appendChild(suggestionList);

// 💡 スマホ判定関数
function isMobileView() {
    return window.matchMedia("(max-width: 767px)").matches;
}

// 💡 検索候補表示中の背景スクロール禁止制御
function setSuggestionDisplay(show) {
    if (show) {
        suggestionList.style.display = "block";
        document.body.style.overflow = "hidden";
    } else {
        suggestionList.style.display = "none";
        document.body.style.overflow = "";
    }
}

document.addEventListener("wheel", (e) => {
    if (suggestionList.style.display === "block" && !suggestionList.contains(e.target)) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener("touchmove", (e) => {
    if (suggestionList.style.display === "block" && !suggestionList.contains(e.target)) {
        e.preventDefault();
    }
}, { passive: false });

// 💡 検索用の正規化関数（小文字化 ＋ 半角・全角スペースを除去）
function normalizeForMatch(str) {
    return String(str).toLowerCase().replace(/[ \u3000]+/g, "");
}

// 💡 キーボード操作・ドラムロール表示用の選択インデックスとハイライト更新関数
let selectedSuggestionIndex = -1;

function updateSuggestionHighlight() {
    const items = suggestionList.querySelectorAll("li");
    if (items.length === 0) return;

    if (isMobileView()) {
        const listHeight = suggestionList.clientHeight || 240;
        const viewCenter = suggestionList.scrollTop + listHeight / 2;

        let closestIndex = 0;
        let minDistance = Infinity;
        items.forEach((li, index) => {
            const itemCenter = li.offsetTop + li.offsetHeight / 2;
            const dist = Math.abs(itemCenter - viewCenter);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = index;
            }
        });
        selectedSuggestionIndex = closestIndex;

        items.forEach((li, index) => {
            const itemCenter = li.offsetTop + li.offsetHeight / 2;
            const ratio = (itemCenter - viewCenter) / (listHeight / 2);
            const absRatio = Math.min(Math.abs(ratio), 1.2);
            const rotateX = -ratio * 28;
            const scale = index === closestIndex ? 1.04 : Math.max(0.88, 1 - absRatio * 0.12);
            const opacity = index === closestIndex ? 1 : Math.max(0.4, 1 - absRatio * 0.55);

            li.style.transform = `perspective(500px) rotateX(${rotateX.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
            li.style.opacity = String(opacity.toFixed(2));

            if (index === closestIndex) {
                li.style.backgroundColor = "#f0f4f8";
                li.style.zIndex = "3";
                li.style.boxShadow = "0 6px 14px rgba(0, 0, 0, 0.18)";
                li.style.borderRadius = "6px";
                li.style.fontWeight = "600";
            } else {
                li.style.backgroundColor = "#ffffff";
                li.style.zIndex = String(Math.max(1, Math.round((1.2 - absRatio) * 2)));
                li.style.boxShadow = "none";
                li.style.borderRadius = "4px";
                li.style.fontWeight = "normal";
            }
        });
        return;
    }

    items.forEach((li, index) => {
        li.style.opacity = "1";
        li.style.fontWeight = "normal";
        if (index === selectedSuggestionIndex) {
            li.style.backgroundColor = "#f0f4f8";
            li.style.zIndex = "2";
            li.style.transform = "scale(1.02)";
            li.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.18)";
            li.style.borderRadius = "4px";
            li.scrollIntoView({ block: "nearest" });
        } else {
            li.style.backgroundColor = "#ffffff";
            li.style.zIndex = "1";
            li.style.transform = "scale(1)";
            li.style.boxShadow = "none";
            li.style.borderRadius = "0";
        }
    });
}

// 💡 スマホでのスクロール時にドラムロール表示を更新
suggestionList.addEventListener("scroll", () => {
    if (isMobileView() && suggestionList.style.display === "block") {
        updateSuggestionHighlight();
    }
});

// 💡 data.jsonの"words"と"idioms"から候補リストを取得（重複除外）
let suggestionItems = [];
fetch("data.json")
    .then(res => res.json())
    .then(json => {
        const wordsList = (json.words || [])
            .filter(item => item && item.word)
            .map(item => ({
                word: String(item.word),
                normalizedWord: normalizeForMatch(item.word),
                searchValue: String(item.word)
            }));

        const idiomsList = (json.idioms || [])
            .filter(item => item && item.word)
            .map(item => ({
                word: String(item.word),
                normalizedWord: normalizeForMatch(item.word),
                searchValue: item.num !== undefined ? String(item.num) : String(item.word)
            }));

        const seen = new Set();
        suggestionItems = [...wordsList, ...idiomsList].filter(item => {
            const key = `${item.word}__${item.searchValue}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => {
            const wordA = a.normalizedWord;
            const wordB = b.normalizedWord;
            const len = Math.min(wordA.length, wordB.length);
            for (let i = 0; i < len; i++) {
                if (wordA[i] !== wordB[i]) {
                    return wordA.charCodeAt(i) - wordB.charCodeAt(i);
                }
            }
            return wordA.length - wordB.length;
        });
    });

// 💡 検索ボックスの外側をクリックしたときにサジェストを閉じる
document.addEventListener("click", (e) => {
    if (!searchBoxContainer.contains(e.target)) {
        setSuggestionDisplay(false);
        selectedSuggestionIndex = -1;
    }
});

// 💡 検索窓への入力監視 (×ボタンの表示/非表示切り替え)
searchBox.addEventListener("input", () => {
    if (searchBox.value.length > 0) {
        clearBtn.style.display = "flex";
    } else {
        clearBtn.style.display = "none";
    }

    const normalizedQuery = normalizeForMatch(searchBox.value);
    suggestionList.innerHTML = "";
    selectedSuggestionIndex = -1;

    if (!normalizedQuery) {
        setSuggestionDisplay(false);
        return;
    }

    const matchedItems = suggestionItems.filter(item =>
        item.normalizedWord.startsWith(normalizedQuery)
    );

    if (matchedItems.length === 0) {
        setSuggestionDisplay(false);
        return;
    }

    const mobile = isMobileView();
    suggestionList.style.padding = mobile ? (matchedItems.length >= 3 ? "76px 8px" : "8px") : "0";
    suggestionList.style.scrollSnapType = mobile ? "y proximity" : "none";

    matchedItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = item.word;
        li.dataset.searchValue = item.searchValue;
        Object.assign(li.style, {
            padding: "8px 12px",
            cursor: "pointer",
            borderBottom: "1px solid #eeeeee",
            color: "#333333",
            backgroundColor: "#ffffff",
            position: "relative",
            zIndex: "1",
            scrollSnapAlign: mobile ? "center" : "none",
            transition: mobile
                ? "background-color 0.1s ease, box-shadow 0.1s ease"
                : "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease"
        });

        li.addEventListener("mouseenter", () => {
            if (!isMobileView()) {
                selectedSuggestionIndex = index;
                updateSuggestionHighlight();
            }
        });
        li.addEventListener("mouseleave", () => {
            if (!isMobileView()) {
                selectedSuggestionIndex = -1;
                updateSuggestionHighlight();
            }
        });

        li.addEventListener("click", () => {
            searchBox.value = item.searchValue;
            suggestionList.innerHTML = "";
            setSuggestionDisplay(false);
            selectedSuggestionIndex = -1;
            searchBtn.click();
        });

        suggestionList.appendChild(li);
    });

    setSuggestionDisplay(true);

    if (mobile) {
        const initialIndex = matchedItems.length >= 3 ? 1 : 0;
        const targetLi = suggestionList.querySelectorAll("li")[initialIndex];
        if (targetLi) {
            suggestionList.scrollTop = targetLi.offsetTop - (suggestionList.clientHeight / 2) + (targetLi.offsetHeight / 2);
        }
        updateSuggestionHighlight();
    }
});

// 💡 クリアボタン押下時の処理
clearBtn.addEventListener("click", () => {
    searchBox.value = ""; // 検索窓の文字を空にする
    clearBtn.style.display = "none"; // ×ボタンを非表示にする
    suggestionList.innerHTML = "";
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    results.innerHTML = "";
    prependEntry();
    resetZoom(); // ズームリセット関数を実行
    searchBox.focus(); // 検索窓にフォーカスを戻す（次の入力を促す）
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
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    doSearch();
    resetZoom();
});

// Enter押下 ＆ 上下矢印キーでのサジェスト移動
searchBox.addEventListener("keydown", (e) => {
    const items = suggestionList.querySelectorAll("li");
    const isSuggestionVisible = suggestionList.style.display === "block" && items.length > 0;

    if (e.key === "ArrowDown" && isSuggestionVisible) {
        e.preventDefault();
        selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
        updateSuggestionHighlight();
        return;
    }

    if (e.key === "ArrowUp" && isSuggestionVisible) {
        e.preventDefault();
        selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
        updateSuggestionHighlight();
        return;
    }

    if (e.key === "Enter") {
        if (!dataLoaded) {
            results.innerHTML = "<p>データを読み込み中です。少し待ってから再試行してください。</p>";
            return;
        }
        if (isSuggestionVisible && selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
            e.preventDefault();
            searchBox.value = items[selectedSuggestionIndex].dataset.searchValue;
        }
        setSuggestionDisplay(false);
        selectedSuggestionIndex = -1;
        doSearch();
        resetZoom();
    }
});
// 単語イメージのアニメーション実行
function startAnimation(container, drawFunc) {
    if (!container) return;
    drawFunc();
}

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

        filtered = data.idioms.filter(item => {
            return item.num === numInput;
        });

    } else {
        // --- 英単語検索モード ---
        filtered = data.words.filter(item => {
            if (!item.word || typeof item.word !== "string") return false;
            return item.word.toLowerCase() === query;
        });
    }

    if (filtered.length === 0) {
        results.innerHTML = "<p>該当なし</p>";
        return;
    }

    // 改行→HTML および記号の余白調整用スパン付与
    const nl2br = (text) => {
        if (!text) return "";

        // 1. HTMLタグと英単語を同時に検索する
        // (<[^>]+>) : HTMLタグ全体（例: <span class="w"> や </span>）をキャプチャグループ1とする
        // ([a-zA-Z][a-zA-Z'-]*) : 英単語をキャプチャグループ2とする
        let html = text.replace(/(<[^>]+>)|([a-zA-Z][a-zA-Z'-]*)/g, (match, tag, word) => {
            if (tag) {
                // HTMLタグにマッチした場合は、何も変更せずにそのまま返す（保護）
                return tag;
            }
            if (word) {
                // テキスト部分の英単語にマッチした場合のみ、spanで囲んで返す
                return `<span lang="en" class="hyphen-auto">${word}</span>`;
            }
            return match;
        });

        // 2. その後、改行や記号の処理を行う
        html = html.replace(/\r?\n/g, "<br>");
        html = html.replace(/([「『（【［〔〈《｛〚｟])/g, '<span class="margin-left-only">$1</span>');
        html = html.replace(/([」』）】］〕〉》｝〛｠])/g, '<span class="margin-right-bracket">$1</span>'); // 閉じ括弧用
        html = html.replace(/([、。])/g, '<span class="margin-right-punctuation">$1</span>'); // 句読点用
        html = html.replace(/([・])/g, '<span class="margin-both">$1</span>');
        html = html.replace(/([：])/g, '<span class="margin-both">$1</span>');

        // 4パターンの連続記号に対して、それぞれ独立した余白調整用クラスを後続の記号に付与
        html = html.replace(/(<span class="margin-right-bracket"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-both"[^>]*>([・])<\/span>/g, '$1<span class="margin-both margin-reduce-bracket-dot">$2</span>');
        html = html.replace(/(<span class="margin-right-bracket"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-both"[^>]*>([：])<\/span>/g, '$1<span class="margin-both margin-reduce-bracket-colon">$2</span>');
        html = html.replace(/(<span class="margin-both"[^>]*>[・]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g, '$1<span class="margin-left-only margin-reduce-dot-bracket">$2</span>');
        html = html.replace(/(<span class="margin-both"[^>]*>[：]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g, '$1<span class="margin-left-only margin-reduce-colon-bracket">$2</span>');
        html = html.replace(/(<span class="margin-right-bracket"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-right-punctuation"[^>]*>([、。])<\/span>/g, '$1<span class="margin-right-punctuation margin-reduce-bracket-punctuation">$2</span>');
        html = html.replace(/(<span class="margin-right-punctuation"[^>]*>[、。]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g, '$1<span class="margin-left-only margin-reduce-punctuation-bracket">$2</span>');

        return html;
    };

    // 結果描画（新しい左右パネル構造に対応させる必要があります）
    filtered.forEach(item => {
        const div = document.createElement("div");
        div.className = "entry";

        let displayNum = item.num;
        if (!displayNum || displayNum === "") {
            displayNum = "empty";
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

            // 💡 h5の場合のみdetails/summary形式を適用（マークは非表示化）
            if (hKey.startsWith("h5")) {
                sectionDiv.innerHTML = `<details><summary class="subtitle" style="cursor: pointer; list-style: none;">${item[hKey]}</summary>
                <div class="content"></div></details>`;
            } else {
                sectionDiv.innerHTML = `<div class="subtitle">${item[hKey]}</div>
                <div class="content"></div>`;
            }

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
                        text = text.replace(/<\/span>(\r?\n)?<span class="ml">/, `</b></span><div id="audio-box-${item.num}" class="audio_box" style="display:inline-block; margin: 0 10px;"></div>$1<span class="ml">`);
                    }

                    // 💡 追加部分：h3のrelated項目で<span class="ml">を持つ場合のみアコーディオン化
                    if (hKey === "h3" && k.startsWith("related")) {
                        if (text.includes('<span class="ml">')) {
                            text = text.replace(/(<b>.*?<\/b>)(\r?\n)?/, '<details><summary style="cursor: pointer;">$1</summary>') + '</details>';
                        }
                    }

                    contentDiv.innerHTML += `<div>${nl2br(text)}</div>`;
                });
            }

            // 💡 追加：h2セクション内の .content の最後にNgram要素を追加
            if (!isNumber && hKey.startsWith("h2") && item.word) {
                setupNgramInSection(contentDiv, item.word.trim());
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
            { sel: ".epidemic", func: drawEpidemicModel },
            { sel: ".tear", func: setupTearAnimation },
            { sel: ".warn", func: setupWarnAnimation },
        ];

        configs.forEach(config => {
            const target = div.querySelector(config.sel);
            if (target) {
                startAnimation(target, config.func);
            }
        });

        // 定義した開閉アニメーション関数を実行
        setupDetailsAnimation(div);
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
        let rawMwPron = ""; // MW独自の独自発音表記を格納する変数

        // Merriam-WebsterのJSONから音声ファイル名と発音文字列を抽出
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            let targetEntry = data[0]; // デフォルトは一番最初の検索結果

            // エクセルから取得した品詞(partOfSpeech)の指定がある場合、一致するものを探す
            if (partOfSpeech) {
                const searchPos = partOfSpeech.trim().toLowerCase();
                const matchedEntry = data.find(entry => {
                    if (!entry.fl) return false;
                    const fl = entry.fl.toLowerCase();
                    return fl === searchPos || fl.includes(searchPos);
                });

                if (matchedEntry) {
                    targetEntry = matchedEntry;
                }
            }

            // 発音データ(prs)と音声データ(sound.audio)が存在するかチェック
            if (targetEntry.hwi && targetEntry.hwi.prs && targetEntry.hwi.prs.length > 0) {
                const prsObj = targetEntry.hwi.prs[0];
                if (prsObj.sound) {
                    audioFileName = prsObj.sound.audio;
                }
                if (prsObj.mw) {
                    rawMwPron = prsObj.mw;
                }
            }

            // 音声や発音記号がない場合、最初のエントリから取得
            if ((!audioFileName || !rawMwPron) && data[0].hwi && data[0].hwi.prs && data[0].hwi.prs.length > 0) {
                const firstPrsObj = data[0].hwi.prs[0];
                if (!audioFileName && firstPrsObj.sound) {
                    audioFileName = firstPrsObj.sound.audio;
                }
                if (!rawMwPron && firstPrsObj.mw) {
                    rawMwPron = firstPrsObj.mw;
                }
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

        // MWの独自表記を日本人向けの読みやすいIPAに変換する関数（網羅版）
        function convertMwToIpa(mwStr) {
            if (!mwStr) return "";
            let ipa = mwStr
                // カッコ書きの省略可能な発音表記や強勢記号の整理
                .replace(/\([ˈˌ]\)/g, '')
                .replace(/\*/g, 'ˈ')
                .replace(/\\u02cc/g, 'ˌ')
                // 2文字以上の組み合わせ（先に置換する必要があるもの）
                .replace(/au̇/g, 'aʊ')
                .replace(/aù/g, 'aʊ')
                .replace(/ȯi/g, 'ɔɪ')
                .replace(/yü/g, 'juː')
                .replace(/yu̇/g, 'jʊ')
                .replace(/t͟h/g, 'ð')   // 有声のth (thisなど)
                .replace(/th/g, 'θ')   // 無声のth (thinkなど)
                .replace(/sh/g, 'ʃ')
                .replace(/zh/g, 'ʒ')
                .replace(/ch/g, 'tʃ')
                // 単母音・長母音・子音の置換
                .replace(/j/g, 'dʒ')
                .replace(/y/g, 'j')    // MWの y はIPAの j (yes -> jes)
                .replace(/ē/g, 'iː')
                .replace(/ā/g, 'eɪ')
                .replace(/ī/g, 'aɪ')
                .replace(/ō/g, 'oʊ')
                .replace(/ü/g, 'uː')
                .replace(/ū/g, 'uː')
                .replace(/u̇/g, 'ʊ')
                .replace(/ȯ/g, 'ɔː')
                .replace(/ä/g, 'ɑː')
                .replace(/ȧ/g, 'ɑ')
                .replace(/a/g, 'æ')    // 単体の a は æ (catなど) ※長音・二重母音変換後に実行
                .replace(/æː/g, 'ɑː')  // 上記の置換で ä などが影響を受けないよう調整
                .replace(/ə̆/g, 'ə')
                .replace(/ᵊ/g, 'ə')
                // 音節区切りのハイフンやアンダーバーの整理
                .replace(/-/g, '')
                .replace(/_/g, '')
                // 空白を使ってアクセント記号を見やすくする
                .replace(/\s*([ˈˌ])/g, ' $1');

            return `/${ipa}/`;
        }

        // aの置換順序による干渉を防ぐため、安全に変換処理を実行
        function safeConvertMwToIpa(mwStr) {
            if (!mwStr) return "";
            let ipa = mwStr
                .replace(/\([ˈˌ]\)/g, '')
                .replace(/\*/g, 'ˈ')
                .replace(/\\u02cc/g, 'ˌ')
                // 二重母音・特殊子音を先に一時退避または変換
                .replace(/au̇|aù/g, 'A_U')
                .replace(/ā/g, 'E_I')
                .replace(/ī/g, 'A_I')
                .replace(/ä/g, 'A_H')
                .replace(/ȧ/g, 'A_H')
                .replace(/ȯi/g, 'ɔɪ')
                .replace(/yü/g, 'J_U_LONG')
                .replace(/yu̇/g, 'J_U_SHORT')
                .replace(/t͟h/g, 'ð')
                .replace(/th/g, 'θ')
                .replace(/sh/g, 'ʃ')
                .replace(/zh/g, 'ʒ')
                .replace(/ch/g, 'tʃ')
                .replace(/j/g, 'dʒ')
                .replace(/y/g, 'j')
                // 残った単体の a を æ に変換
                .replace(/a/g, 'æ')
                // 退避したものを戻す
                .replace(/A_U/g, 'aʊ')
                .replace(/E_I/g, 'eɪ')
                .replace(/A_I/g, 'aɪ')
                .replace(/A_H/g, 'ɑ')
                .replace(/J_U_LONG/g, 'juː')
                .replace(/J_U_SHORT/g, 'jʊ')
                // その他の母音
                .replace(/ē/g, 'iː')
                .replace(/ō/g, 'oʊ')
                .replace(/ü|ū/g, 'uː')
                .replace(/u̇/g, 'ʊ')
                .replace(/ȯ/g, 'ɔ')
                .replace(/ə̆|ᵊ/g, 'ə')
                // 区切り記号の除去
                .replace(/[-_]/g, '')
                // 空白を使ってアクセント記号を見やすくする
                .replace(/\s*([ˈˌ])/g, ' $1');

            return `/${ipa}/`;
        }

        const ipaText = safeConvertMwToIpa(rawMwPron);

        // 1回目の検索でDOM生成前だったり、親要素のinnerHTML更新で上書きされても確実に反映する
        const renderId = String(Date.now() + Math.random());
        let attempts = 0;
        const maxAttempts = 30; // 50ms × 30回（最大1.5秒間、要素の出現と上書きを監視）

        const applyToDom = () => {
            const audioBox = document.getElementById(`audio-box-${num}`);
            if (audioBox) {
                if (audioBox.dataset.renderId !== renderId || !audioBox.querySelector('div')) {
                    // アイコンとIPAを並べて描画
                    audioBox.innerHTML = `
                        <div style="display: inline-flex; align-items: center; gap: 6px; margin-bottom: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                            ${audioUrl ? `<span class="audio_button" style="cursor:pointer; display: inline-flex; align-items: center;"><i class="fa-solid fa-volume-high fa-rotate-by fa-sm" style="color: #ffffff; --fa-rotate-angle: 340deg;"></i></span>` : ''}
                            ${ipaText ? `<span class="ipa-text" style="font-size: 1em; color: #272727; font-weight: 500; margin-left: 10px;">${ipaText}</span>` : ''}
                        </div>
                    `;
                    audioBox.dataset.renderId = renderId;

                    // 音声URLが存在する場合のみイベントリスナーを設定
                    if (audioUrl) {
                        const btn = audioBox.querySelector('.audio_button');
                        const audio = new Audio(audioUrl);
                        audio.preload = 'auto';

                        btn.addEventListener('click', function () {
                            if (btn.style.pointerEvents === 'none') return;

                            btn.style.pointerEvents = 'none';
                            btn.style.opacity = '0.5';

                            audio.currentTime = 0;

                            audio.onended = () => {
                                btn.style.pointerEvents = 'auto';
                                btn.style.opacity = '1';
                            };

                            audio.onerror = () => {
                                btn.style.pointerEvents = 'auto';
                                btn.style.opacity = '1';
                            };

                            audio.play().catch(() => {
                                btn.style.pointerEvents = 'auto';
                                btn.style.opacity = '1';
                            });
                        });
                    }
                }
            }

            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(timerId);
            }
        };

        const timerId = setInterval(applyToDom, 50);
        applyToDom();
    } catch (error) {
        // エラー時の処理
    }
}


// 共通のアニメーション関数
function playAccordionAnimation(content, isOpening, triggerElement, initialTop, onFinish) {
    content.style.overflow = 'hidden';

    const style = window.getComputedStyle(content);
    const marginTop = style.marginTop;
    const marginBottom = style.marginBottom;
    const paddingTop = style.paddingTop;
    const paddingBottom = style.paddingBottom;

    const br = content.previousElementSibling;
    const hasBr = br && br.tagName === 'BR';

    let brHeight = 0;
    if (hasBr) {
        brHeight = br.getBoundingClientRect().height || (isOpening ? 16 : 0);
        br.style.display = 'none';
    }

    const adjustedMarginTop = hasBr ? `calc(${marginTop} + ${brHeight}px)` : marginTop;

    // スクロール位置を固定するロジック
    let lastTop = initialTop;
    let isAnimatingScroll = true;

    // ユーザーが手動でスクロールした場合は追従を解除する
    const cancelScrollFix = () => { isAnimatingScroll = false; };
    window.addEventListener('wheel', cancelScrollFix, { passive: true });
    window.addEventListener('touchmove', cancelScrollFix, { passive: true });

    const maintainScroll = () => {
        if (!isAnimatingScroll) return;
        const currentTop = triggerElement.getBoundingClientRect().top;
        const diff = currentTop - lastTop;

        // 0.5px以上のズレが生じた場合のみスクロール位置を補正する（微小なガタつき防止）
        if (Math.abs(diff) > 0.5) {
            window.scrollBy(0, diff);
            lastTop = triggerElement.getBoundingClientRect().top; // 実際のスクロール後の位置で更新
        }
        requestAnimationFrame(maintainScroll);
    };
    requestAnimationFrame(maintainScroll);

    const keyframes = isOpening
        ? [
            {
                opacity: 0,
                maxHeight: '0px',
                marginTop: '0px',
                marginBottom: '0px',
                paddingTop: '0px',
                paddingBottom: '0px'
            },
            {
                opacity: 1,
                maxHeight: content.scrollHeight + 'px',
                marginTop: adjustedMarginTop,
                marginBottom: marginBottom,
                paddingTop: paddingTop,
                paddingBottom: paddingBottom
            }
        ]
        : [
            {
                opacity: 1,
                maxHeight: content.scrollHeight + 'px',
                marginTop: adjustedMarginTop,
                marginBottom: marginBottom,
                paddingTop: paddingTop,
                paddingBottom: paddingBottom
            },
            {
                opacity: 0,
                maxHeight: '0px',
                marginTop: '0px',
                marginBottom: '0px',
                paddingTop: '0px',
                paddingBottom: '0px'
            }
        ];

    const animation = content.animate(keyframes, { duration: 700, easing: 'ease-out' });

    animation.onfinish = () => {
        content.style.overflow = '';
        if (hasBr) {
            br.style.display = ''; // <br>の表示を元に戻す
        }

        // スクロール固定の解除とイベントリスナーの削除
        isAnimatingScroll = false;
        window.removeEventListener('wheel', cancelScrollFix);
        window.removeEventListener('touchmove', cancelScrollFix);

        if (onFinish) onFinish();
    };
}

// h3/h5のdetails/summary形式の開閉処理
function setupDetailsAnimation(container) {
    container.querySelectorAll('.section.h3 details, .section.h5 details').forEach(details => {
        const summary = details.querySelector('summary');
        const content = details.querySelector('.ml') || details.querySelector('.content');

        if (!summary || !content) return;

        let isAnimating = false;

        summary.addEventListener('click', (e) => {
            e.preventDefault();

            if (isAnimating) return;
            isAnimating = true;

            // クリック直後のトリガー要素のY座標を取得
            const initialTop = summary.getBoundingClientRect().top;

            if (details.open) {
                playAccordionAnimation(content, false, summary, initialTop, () => {
                    details.removeAttribute('open');
                    isAnimating = false;
                });
            } else {
                details.setAttribute('open', 'true');
                playAccordionAnimation(content, true, summary, initialTop, () => {
                    isAnimating = false;
                });
            }
        });
    });
}

// サンプル画像のアコーディオン開閉処理
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
            trigger.textContent = 'イメージを表示'; // 指定のテキストに変更

            // コンテンツ（画像）を包むspan
            const content = document.createElement('span');
            content.classList.add('accordion-content');
            content.style.display = 'none'; // 初期状態は非表示にする

            const img = document.createElement('img');
            img.src = `./sample_images/${imageName}.png`;
            img.alt = imageName;

            // 画像クリック時の拡大表示処理を追加
            img.addEventListener('click', (e) => {
                e.stopPropagation(); // アコーディオンの開閉などへのイベント伝播を防ぐ

                // モーダルの背景要素を作成
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100vw';
                modal.style.height = '100vh';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '9999';
                modal.style.cursor = 'pointer';

                // 拡大画像要素を作成
                const modalImg = document.createElement('img');
                modalImg.src = img.src;
                modalImg.style.maxWidth = '95%';
                modalImg.style.maxHeight = '95%';
                modalImg.style.objectFit = 'contain'; // サイズ比を保つ

                // 画面に追加
                modal.appendChild(modalImg);
                document.body.appendChild(modal);

                // 拡大時は画面のスクロールを禁止
                document.body.style.overflow = 'hidden';

                // 画面のどこかをタップ・クリックしたら拡大表示を解除
                modal.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    // スクロール禁止を解除
                    document.body.style.overflow = '';
                });
            });

            content.appendChild(img);
            el.appendChild(trigger);
            el.appendChild(content);

            let isAnimating = false;

            trigger.addEventListener('click', (e) => {
                e.preventDefault();

                if (isAnimating) return;
                isAnimating = true;

                // クリック直後のトリガー要素のY座標を取得
                const initialTop = trigger.getBoundingClientRect().top;

                if (el.classList.contains('is-active')) {
                    playAccordionAnimation(content, false, trigger, initialTop, () => {
                        el.classList.remove('is-active');
                        content.style.display = 'none';
                        isAnimating = false;
                    });
                } else {
                    el.classList.add('is-active');
                    content.style.display = '';
                    playAccordionAnimation(content, true, trigger, initialTop, () => {
                        isAnimating = false;
                    });
                }
            });
        }
    });
}