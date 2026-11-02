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
let currentRenderedWord = null; // 💡 現在表示中の検索ワードを保持
let isSelectingSuggestion = false; // 💡 サジェスト選択・履歴移動中のinputイベント抑止フラグ
let suggestionSelectTimer = null; // 💡 サジェスト・関連語選択時の遅延処理タイマー
let historyDebounceTimer = null; // 💡 戻る・進む連打時のデバウンス用タイマー
let currentSearchId = 0; // 💡 非同期処理の世代管理用ID
const AUDIO_CACHE_STORAGE_KEY = "mw_audio_cache_v1";
let initialAudioCacheEntries = [];
try {
    initialAudioCacheEntries = JSON.parse(localStorage.getItem(AUDIO_CACHE_STORAGE_KEY) || "[]");
} catch (e) {
    initialAudioCacheEntries = [];
}
const audioCache = new Map(initialAudioCacheEntries); // 💡 音声・発音データのキャッシュ（localStorage連携）
const activeAudioTimers = new Set(); // 💡 実行中の音声DOM監視タイマー管理

// 💡 キャッシュをメモリとlocalStorageの両方に保存する関数（最大500件）
function saveAudioCache(key, value) {
    audioCache.set(key, value);
    try {
        if (audioCache.size > 500) {
            const oldestKey = audioCache.keys().next().value;
            audioCache.delete(oldestKey);
        }
        localStorage.setItem(AUDIO_CACHE_STORAGE_KEY, JSON.stringify([...audioCache]));
    } catch (e) {
        // ストレージ容量上限などの場合はメモリキャッシュのみ継続利用
    }
}

// 💡 最近調べた単語（検索履歴）の管理（localStorage連携・最大10件）
const RECENT_SEARCHES_STORAGE_KEY = "recent_searches_v1";
const MAX_RECENT_SEARCHES = 10;
let recentSearches = [];
try {
    const parsedRecent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || "[]");
    if (Array.isArray(parsedRecent)) {
        recentSearches = parsedRecent.filter(
            item => item && typeof item.searchValue === "string" && typeof item.label === "string"
        );
    }
} catch (e) {
    recentSearches = [];
}

function saveRecentSearch(searchValue, label) {
    const cleanValue = String(searchValue).trim();
    const cleanLabel = String(label).trim();
    if (!cleanValue || !cleanLabel) return;

    const normalizedTarget = cleanValue.toLowerCase();
    recentSearches = recentSearches.filter(
        item => String(item.searchValue).trim().toLowerCase() !== normalizedTarget
    );
    recentSearches.unshift({ searchValue: cleanValue, label: cleanLabel });

    if (recentSearches.length > MAX_RECENT_SEARCHES) {
        recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
    }

    try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
    } catch (e) {
        // ストレージ上限時などはメモリ上のみ保持
    }
}

function removeRecentSearch(searchValue) {
    const normalizedTarget = String(searchValue).trim().toLowerCase();
    recentSearches = recentSearches.filter(
        item => String(item.searchValue).trim().toLowerCase() !== normalizedTarget
    );
    try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
    } catch (e) { }
}

function clearAllRecentSearches() {
    recentSearches = [];
    try {
        localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch (e) { }
}

// 💡 ブラウザ標準のスクロール位置自動復元を無効化（戻る・進む時のチラつき防止）
if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}

let lastHistoryEventTime = 0; // 💡 戻る・進むの連打判定用タイムスタンプ
let heavyRenderTimer = null; // 💡 連打時にNgram・アニメーション・音声の起動を遅延・間引くタイマー

// 💡 進行中の非同期タイマーを停止し、メイン領域を安全にクリアする関数
function cleanupResultsResources() {
    if (heavyRenderTimer) {
        clearTimeout(heavyRenderTimer);
        heavyRenderTimer = null;
    }
    activeAudioTimers.forEach(id => clearInterval(id));
    activeAudioTimers.clear();
    if (!results) return;
    results.replaceChildren();
}

// 💡 追加：URLの変更を検知して自動検索をリセット・実行する関数
function handleUrlSearch(event) {
    if (!dataLoaded) return; // データ未読み込み時は処理をスキップ（fetch完了後に再度呼ばれるため）

    // サジェストや関連語選択時の150ms遅延タイマーが残っていれば解除（履歴移動の上書き防止）
    if (suggestionSelectTimer) {
        clearTimeout(suggestionSelectTimer);
        suggestionSelectTimer = null;
    }

    const paramString = window.location.hash.replace('#', '?') || window.location.search;
    const urlParams = new URLSearchParams(paramString);
    const stateWord = (event && event.state && typeof event.state.word === "string") ? event.state.word : null;
    const targetWord = urlParams.get('word') ?? stateWord;

    // 開いている画像モーダルがあれば閉じる
    document.querySelectorAll(".sample-image-modal").forEach(m => m.remove());

    // 履歴移動時はサジェストを閉じ、検索窓のフォーカスを解除してIME等の干渉を防ぐ
    isSelectingSuggestion = true;
    suggestionList.innerHTML = "";
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    if (document.activeElement === searchBox) {
        searchBox.blur();
    }

    if (targetWord) {
        searchBox.value = targetWord;
        clearBtn.style.display = "flex";
    } else {
        searchBox.value = "";
        clearBtn.style.display = "none";
    }

    const isSameTarget = targetWord
        ? (currentRenderedWord !== null && currentRenderedWord.toLowerCase() === targetWord.trim().toLowerCase() && results.children.length > 0)
        : (currentRenderedWord === null && results.children.length > 0);

    // 進行中の古い非同期処理（Ngram・音声等）だけを即座にキャンセルし、DOM自体は次の描画瞬間まで残す（footerのチラつき防止）
    if (!isSameTarget) {
        window.scrollTo(0, 0);
        currentSearchId++;
        if (heavyRenderTimer) {
            clearTimeout(heavyRenderTimer);
            heavyRenderTimer = null;
        }
        activeAudioTimers.forEach(id => clearInterval(id));
        activeAudioTimers.clear();
    }

    const executeUrlSearch = () => {
        historyDebounceTimer = null;
        isSelectingSuggestion = false;

        if (targetWord) {
            if (
                currentRenderedWord !== null &&
                currentRenderedWord.toLowerCase() === targetWord.trim().toLowerCase() &&
                results.children.length > 0
            ) {
                return;
            }
            window.scrollTo(0, 0);
            searchBox.value = targetWord;
            clearBtn.style.display = "flex";
            doSearch(false); // 履歴の二重追加を防ぎつつ検索を実行
            window.scrollTo(0, 0);
        } else {
            if (currentRenderedWord === null && results.children.length > 0) return;
            // パラメータが消された場合は初期画面にリセットする
            window.scrollTo(0, 0);
            currentSearchId++;
            currentRenderedWord = null;
            searchBox.value = "";
            clearBtn.style.display = "none";
            cleanupResultsResources();
            prependEntry();
            window.scrollTo(0, 0);
        }
    };

    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }

    if (event) {
        const now = Date.now();
        const isRapidClick = (now - lastHistoryEventTime) < 180;
        lastHistoryEventTime = now;

        if (isRapidClick) {
            // 連打中は前の画面を維持したまま120ms待って最終ページだけを描画する
            historyDebounceTimer = setTimeout(executeUrlSearch, 120);
        } else {
            // 単発の「戻る・進む」は待ち時間ゼロで即座に切り替える
            executeUrlSearch();
        }
    } else {
        executeUrlSearch();
    }
}

// 💡 追加：URLのハッシュ（#word=...）やブラウザの「戻る・進む」を検知する
window.addEventListener("hashchange", handleUrlSearch);
window.addEventListener("popstate", handleUrlSearch);

let suggestionItems = [];

// JSON読み込み（データ本体とサジェスト候補の生成を1回で実行）
fetch("data.json")
    .then(res => res.json())
    .then(json => {
        data = json;

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
                searchValue: item.num !== undefined ? String(item.num) : String(item.word),
                numStr: item.num !== undefined ? String(item.num) : ""
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

// 💡 スマホ・タブレット判定関数（画面幅1024px以下 または タッチ操作主体端末）
function isMobileView() {
    return window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
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

// 💡 候補が少ないときもスクロールして全項目を選択できるよう下部余白と高さを調整する関数
function setupSuggestionScrollPadding() {
    suggestionList.querySelectorAll(".suggestion-spacer").forEach(el => el.remove());
    suggestionList.style.maxHeight = "240px";

    const items = suggestionList.querySelectorAll("li");
    if (items.length === 0) return;

    if (isMobileView()) {
        const firstLi = items[0];
        const lastLi = items[items.length - 1];
        const naturalHeight = lastLi.offsetTop + lastLi.offsetHeight;
        const visibleHeight = Math.min(naturalHeight, 240);

        // 枠の見た目の高さは本来の候補数分の高さ（最大240px）に抑える
        suggestionList.style.maxHeight = `${visibleHeight}px`;

        const firstCenter = firstLi.offsetTop + firstLi.offsetHeight / 2;
        const lastCenter = lastLi.offsetTop + lastLi.offsetHeight / 2;
        const travelDistance = Math.max(0, lastCenter - firstCenter);
        // 候補が1件のときも少しスクロール感を持たせ、2件以上のときは最後の項目まで確実にスクロールできる余白を確保
        const extraScrollSpace = items.length > 1 ? travelDistance : 24;
        const requiredScrollHeight = visibleHeight + extraScrollSpace;
        const spacerHeight = Math.max(0, Math.ceil(requiredScrollHeight - naturalHeight));

        if (spacerHeight > 0) {
            const spacer = document.createElement("div");
            spacer.className = "suggestion-spacer";
            spacer.setAttribute("aria-hidden", "true");
            Object.assign(spacer.style, {
                height: `${spacerHeight}px`,
                width: "100%",
                flexShrink: "0",
                pointerEvents: "none"
            });
            suggestionList.appendChild(spacer);
        }
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
let isKeyboardScrollLock = false;
let keyboardScrollLockTimer = null;

function updateSuggestionHighlight({ fromKeyboard = false } = {}) {
    const items = suggestionList.querySelectorAll("li");
    if (items.length === 0) return;

    if (isMobileView()) {
        const firstLi = items[0];
        const lastLi = items[items.length - 1];
        const firstCenter = firstLi.offsetTop + firstLi.offsetHeight / 2;
        const lastCenter = lastLi.offsetTop + lastLi.offsetHeight / 2;
        const maxScroll = suggestionList.scrollHeight - suggestionList.clientHeight;

        let focusCenter = firstCenter;

        if (fromKeyboard && selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
            // キーボードの矢印キー操作時は、選択された項目に合わせてスクロール位置を移動する
            const targetLi = items[selectedSuggestionIndex];
            const targetCenter = targetLi.offsetTop + targetLi.offsetHeight / 2;
            focusCenter = targetCenter;

            if (maxScroll > 0 && lastCenter > firstCenter) {
                const targetRatio = (targetCenter - firstCenter) / (lastCenter - firstCenter);
                const targetScrollTop = Math.round(Math.min(Math.max(targetRatio, 0), 1) * maxScroll);
                isKeyboardScrollLock = true;
                if (keyboardScrollLockTimer) clearTimeout(keyboardScrollLockTimer);
                suggestionList.scrollTop = targetScrollTop;
                keyboardScrollLockTimer = setTimeout(() => {
                    isKeyboardScrollLock = false;
                    keyboardScrollLockTimer = null;
                }, 120);
            }
        } else {
            // スクロール操作時は、現在のスクロール位置から最も近い項目を選択状態にする
            const scrollRatio = maxScroll > 0 ? Math.min(Math.max(suggestionList.scrollTop / maxScroll, 0), 1) : 0;
            focusCenter = firstCenter + (lastCenter - firstCenter) * scrollRatio;

            let closestIndex = 0;
            let minDistance = Infinity;
            items.forEach((li, index) => {
                const itemCenter = li.offsetTop + li.offsetHeight / 2;
                const dist = Math.abs(itemCenter - focusCenter);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = index;
                }
            });
            selectedSuggestionIndex = closestIndex;
        }

        const listHeight = suggestionList.clientHeight || 240;
        items.forEach((li, index) => {
            const itemCenter = li.offsetTop + li.offsetHeight / 2;
            const ratio = (itemCenter - focusCenter) / (listHeight / 2);
            const absRatio = Math.min(Math.abs(ratio), 1.2);
            const rotateX = -ratio * 25;
            const scale = index === selectedSuggestionIndex ? 1.03 : Math.max(0.9, 1 - absRatio * 0.1);
            const opacity = index === selectedSuggestionIndex ? 1 : Math.max(0.45, 1 - absRatio * 0.5);

            li.style.transform = `perspective(500px) rotateX(${rotateX.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
            li.style.opacity = String(opacity.toFixed(2));

            if (index === selectedSuggestionIndex) {
                li.style.backgroundColor = "#f0f4f8";
                li.style.zIndex = "3";
                li.style.boxShadow = "0 6px 14px rgba(0, 0, 0, 0.18)";
                li.style.borderRadius = "4px";
                li.style.fontWeight = "600";
            } else {
                li.style.backgroundColor = "#ffffff";
                li.style.zIndex = String(Math.max(1, Math.round((1.2 - absRatio) * 2)));
                li.style.boxShadow = "none";
                li.style.borderRadius = "0";
                li.style.fontWeight = "normal";
            }
        });
        return;
    }

    items.forEach((li, index) => {
        li.style.opacity = "1";
        li.style.fontWeight = index === selectedSuggestionIndex ? "600" : "normal";
        if (index === selectedSuggestionIndex) {
            li.style.backgroundColor = "#f0f4f8";
            li.style.zIndex = "2";
            li.style.transform = "scale(1.02)";
            li.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.18)";
            li.style.borderRadius = "4px";

            if (fromKeyboard) {
                const headerEl = suggestionList.querySelector(".suggestion-header");
                const headerHeight = headerEl ? headerEl.offsetHeight : 0;
                const itemTop = li.offsetTop;
                const itemBottom = itemTop + li.offsetHeight;
                const viewTop = suggestionList.scrollTop + headerHeight;
                const viewBottom = suggestionList.scrollTop + suggestionList.clientHeight;

                if (itemTop < viewTop) {
                    suggestionList.scrollTop = itemTop - headerHeight;
                } else if (itemBottom > viewBottom) {
                    suggestionList.scrollTop = itemBottom - suggestionList.clientHeight;
                }
            }
        } else {
            li.style.backgroundColor = "#ffffff";
            li.style.zIndex = "1";
            li.style.transform = "scale(1)";
            li.style.boxShadow = "none";
            li.style.borderRadius = "0";
        }
    });
}

// 💡 スマホ・タブレットでのスクロール時にドラムロール表示を更新（requestAnimationFrameで負荷軽減）
let isSuggestionScrollTicking = false;
suggestionList.addEventListener("scroll", () => {
    if (isKeyboardScrollLock) return;
    if (!isSuggestionScrollTicking && isMobileView() && suggestionList.style.display === "block") {
        isSuggestionScrollTicking = true;
        requestAnimationFrame(() => {
            if (!isKeyboardScrollLock) {
                updateSuggestionHighlight();
            }
            isSuggestionScrollTicking = false;
        });
    }
}, { passive: true });


// 💡 検索ボックスの外側をクリックしたときにサジェストを閉じる
document.addEventListener("click", (e) => {
    if (!searchBoxContainer.contains(e.target)) {
        setSuggestionDisplay(false);
        selectedSuggestionIndex = -1;
    }
});

// 💡 サジェスト候補を選択・確定する共通関数（スマホのIME未確定時にも確実にフォーカス解除・非表示化）
function selectSuggestionItem(searchValue) {
    if (suggestionSelectTimer) {
        clearTimeout(suggestionSelectTimer);
        suggestionSelectTimer = null;
    }
    isSelectingSuggestion = true;
    searchBox.blur();
    searchBox.value = searchValue;
    clearBtn.style.display = "flex";
    suggestionList.innerHTML = "";
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    doSearch();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    resetZoom();
    suggestionSelectTimer = setTimeout(() => {
        suggestionSelectTimer = null;
        searchBox.value = searchValue;
        suggestionList.innerHTML = "";
        setSuggestionDisplay(false);
        isSelectingSuggestion = false;
    }, 150);
}

// 💡 検索窓が空のときに「最近の検索」リストを描画する関数
function renderRecentSuggestions() {
    if (isSelectingSuggestion || !dataLoaded) return;
    if (searchBox.value.length > 0) return;

    suggestionList.innerHTML = "";
    selectedSuggestionIndex = -1;

    if (recentSearches.length === 0) {
        setSuggestionDisplay(false);
        return;
    }

    // 見出し行（liではなくdivにすることで、矢印キー移動やドラムロール計算の干渉を防ぐ）
    const headerDiv = document.createElement("div");
    headerDiv.className = "suggestion-header";
    Object.assign(headerDiv.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 12px",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #e0e0e0",
        fontSize: "12px",
        color: "#666666",
        position: "sticky",
        top: "0",
        zIndex: "5"
    });

    const titleSpan = document.createElement("span");
    titleSpan.textContent = "最近の検索";

    const clearAllBtn = document.createElement("span");
    clearAllBtn.textContent = "履歴を消去";
    Object.assign(clearAllBtn.style, {
        cursor: "pointer",
        color: "#888888",
        fontSize: "11px",
        textDecoration: "underline"
    });

    const handleClearAll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearAllRecentSearches();
        suggestionList.innerHTML = "";
        setSuggestionDisplay(false);
        selectedSuggestionIndex = -1;
    };
    clearAllBtn.addEventListener("mousedown", handleClearAll);
    clearAllBtn.addEventListener("touchstart", handleClearAll, { passive: false });

    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(clearAllBtn);
    suggestionList.appendChild(headerDiv);

    const mobile = isMobileView();

    recentSearches.forEach((item, index) => {
        const li = document.createElement("li");
        li.dataset.searchValue = item.searchValue;
        Object.assign(li.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            cursor: "pointer",
            borderBottom: "1px solid #eeeeee",
            color: "#333333",
            backgroundColor: "#ffffff",
            position: "relative",
            zIndex: "1",
            transition: mobile
                ? "background-color 0.1s ease, box-shadow 0.1s ease"
                : "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease"
        });

        const labelWrap = document.createElement("span");
        Object.assign(labelWrap.style, {
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
        });

        const clockIcon = document.createElement("i");
        clockIcon.className = "fa-regular fa-clock fa-xs";
        clockIcon.style.color = "#999999";

        const textSpan = document.createElement("span");
        textSpan.textContent = item.label;

        labelWrap.appendChild(clockIcon);
        labelWrap.appendChild(textSpan);

        // 個別削除ボタン（×）
        const deleteBtn = document.createElement("span");
        deleteBtn.textContent = "×";
        deleteBtn.title = "この履歴を削除";
        Object.assign(deleteBtn.style, {
            padding: "0 6px",
            color: "#aaaaaa",
            fontSize: "14px",
            lineHeight: "1",
            cursor: "pointer",
            flexShrink: "0"
        });

        const handleRemoveItem = (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeRecentSearch(item.searchValue);
            renderRecentSuggestions();
        };
        deleteBtn.addEventListener("mousedown", handleRemoveItem);
        deleteBtn.addEventListener("touchstart", handleRemoveItem, { passive: false });
        deleteBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        li.appendChild(labelWrap);
        li.appendChild(deleteBtn);

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

        let touchStartX = 0;
        let touchStartY = 0;

        li.addEventListener("touchstart", (e) => {
            if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        li.addEventListener("touchend", (e) => {
            if (e.target === deleteBtn || deleteBtn.contains(e.target)) return;
            if (e.changedTouches && e.changedTouches.length > 0) {
                const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
                if (dx < 10 && dy < 10) {
                    e.preventDefault();
                    selectSuggestionItem(item.searchValue);
                }
            }
        });

        li.addEventListener("click", (e) => {
            if (e.target === deleteBtn || deleteBtn.contains(e.target)) return;
            selectSuggestionItem(item.searchValue);
        });

        suggestionList.appendChild(li);
    });

    setSuggestionDisplay(true);
    setupSuggestionScrollPadding();
    suggestionList.scrollTop = 0;

    if (mobile) {
        updateSuggestionHighlight();
    }
}

// 💡 検索窓への入力監視 (×ボタンの表示/非表示切り替え)
searchBox.addEventListener("input", () => {
    if (isSelectingSuggestion) return;

    if (searchBox.value.length > 0) {
        clearBtn.style.display = "flex";
    } else {
        clearBtn.style.display = "none";
        renderRecentSuggestions();
        return;
    }

    const normalizedQuery = normalizeForMatch(searchBox.value);
    suggestionList.innerHTML = "";
    selectedSuggestionIndex = -1;

    if (!normalizedQuery) {
        setSuggestionDisplay(false);
        return;
    }

    const MAX_SUGGESTIONS = 50; // 💡 DOM肥大化を防ぐ最大表示件数
    const isNumberQuery = /^[0-9]+$/.test(normalizedQuery);
    let matchedItems = [];

    if (isNumberQuery) {
        matchedItems = suggestionItems
            .filter(item => item.numStr && item.numStr.startsWith(normalizedQuery))
            .sort((a, b) => Number(a.numStr) - Number(b.numStr))
            .slice(0, MAX_SUGGESTIONS);
    } else {
        const prefixMatches = [];
        const partialMatches = [];
        // 💡 1文字のときは前方一致のみ、2文字以上で部分一致も検索する
        const enablePartial = normalizedQuery.length >= 2;

        for (let i = 0; i < suggestionItems.length; i++) {
            const item = suggestionItems[i];
            if (item.normalizedWord.startsWith(normalizedQuery)) {
                prefixMatches.push(item);
                if (prefixMatches.length >= MAX_SUGGESTIONS) break;
            } else if (enablePartial && item.normalizedWord.includes(normalizedQuery)) {
                partialMatches.push(item);
            }
        }

        matchedItems = prefixMatches.length >= MAX_SUGGESTIONS
            ? prefixMatches
            : prefixMatches.concat(partialMatches.slice(0, MAX_SUGGESTIONS - prefixMatches.length));
    }

    if (matchedItems.length === 0) {
        setSuggestionDisplay(false);
        return;
    }

    const mobile = isMobileView();
    const fragment = document.createDocumentFragment(); // 💡 メモリ上で一括構築してリフローを1回に抑える

    matchedItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = (isNumberQuery && item.numStr) ? `${item.numStr}. ${item.word}` : item.word;
        li.dataset.searchValue = item.searchValue;
        Object.assign(li.style, {
            padding: "8px 12px",
            cursor: "pointer",
            borderBottom: "1px solid #eeeeee",
            color: "#333333",
            backgroundColor: "#ffffff",
            position: "relative",
            zIndex: "1",
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

        let touchStartX = 0;
        let touchStartY = 0;

        li.addEventListener("touchstart", (e) => {
            if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        li.addEventListener("touchend", (e) => {
            if (e.changedTouches && e.changedTouches.length > 0) {
                const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
                if (dx < 10 && dy < 10) {
                    e.preventDefault();
                    selectSuggestionItem(item.searchValue);
                }
            }
        });

        li.addEventListener("click", () => {
            selectSuggestionItem(item.searchValue);
        });

        fragment.appendChild(li);
    });

    suggestionList.appendChild(fragment);
    setSuggestionDisplay(true);
    setupSuggestionScrollPadding();
    suggestionList.scrollTop = 0;

    if (mobile) {
        updateSuggestionHighlight();
    }
});

// 💡 クリアボタン押下時の処理
clearBtn.addEventListener("click", () => {
    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }
    if (suggestionSelectTimer) {
        clearTimeout(suggestionSelectTimer);
        suggestionSelectTimer = null;
        isSelectingSuggestion = false;
    }
    searchBox.value = ""; // 検索窓の文字を空にする
    clearBtn.style.display = "none"; // ×ボタンを非表示にする
    suggestionList.innerHTML = "";
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    searchBox.focus(); // 検索窓にフォーカスを戻す（次の入力を促す）
    renderRecentSuggestions(); // 空になったので最近の検索を表示
});

// サジェスト・履歴リスト内の操作中にblurでリストが消えて選択が空振りするのを防ぐ制御
let isInteractingWithSuggestion = false;
suggestionList.addEventListener("mousedown", (e) => {
    // PCでの項目クリック・スクロールバー操作時に検索窓のフォーカスが外れるのを防ぐ
    e.preventDefault();
});
suggestionList.addEventListener("touchstart", () => {
    isInteractingWithSuggestion = true;
}, { passive: true });
suggestionList.addEventListener("touchend", () => {
    setTimeout(() => {
        isInteractingWithSuggestion = false;
    }, 150);
}, { passive: true });
suggestionList.addEventListener("touchcancel", () => {
    isInteractingWithSuggestion = false;
}, { passive: true });

// フォーカス時のズーム防止（iOS Safari対策）＆ 空欄時の最近の検索表示
searchBox.addEventListener("focus", () => {
    if (viewportMeta) {
        viewportMeta.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0"
        );
    }
    if (searchBox.value.length === 0) {
        renderRecentSuggestions();
    }
});

// 検索窓のフォーカスが外れたら検索履歴を非表示にする
searchBox.addEventListener("blur", () => {
    setTimeout(() => {
        if (isInteractingWithSuggestion || document.activeElement === searchBox) return;
        if (searchBox.value.length === 0 || suggestionList.querySelector(".suggestion-header")) {
            suggestionList.innerHTML = "";
            setSuggestionDisplay(false);
            selectedSuggestionIndex = -1;
        }
    }, 100);
});

// 既にフォーカスがある状態で空の検索窓をクリックした場合にも最近の検索を表示
searchBox.addEventListener("click", () => {
    if (searchBox.value.length === 0 && suggestionList.style.display === "none") {
        renderRecentSuggestions();
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

// Enter押下 ＆ 上下矢印キーでのサジェスト・検索履歴移動（スマホ・タブレット・PC共通）
searchBox.addEventListener("keydown", (e) => {
    if (e.isComposing || e.keyCode === 229) return;

    if (e.key === "Escape") {
        if (suggestionList.style.display === "block") {
            e.preventDefault();
            suggestionList.innerHTML = "";
            setSuggestionDisplay(false);
            selectedSuggestionIndex = -1;
        }
        return;
    }

    // リストが閉じている状態で上下矢印キーが押された場合、履歴または候補を再表示する
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && suggestionList.style.display === "none") {
        if (searchBox.value.length === 0 && recentSearches.length > 0) {
            e.preventDefault();
            renderRecentSuggestions();
            const restoredItems = suggestionList.querySelectorAll("li");
            if (restoredItems.length > 0) {
                selectedSuggestionIndex = e.key === "ArrowDown" ? 0 : restoredItems.length - 1;
                updateSuggestionHighlight({ fromKeyboard: true });
            }
            return;
        }
    }

    const items = suggestionList.querySelectorAll("li");
    const isSuggestionVisible = suggestionList.style.display === "block" && items.length > 0;

    if (e.key === "ArrowDown" && isSuggestionVisible) {
        e.preventDefault();
        if (selectedSuggestionIndex < 0) {
            selectedSuggestionIndex = 0;
        } else {
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
        }
        updateSuggestionHighlight({ fromKeyboard: true });
        return;
    }

    if (e.key === "ArrowUp" && isSuggestionVisible) {
        e.preventDefault();
        if (selectedSuggestionIndex < 0) {
            selectedSuggestionIndex = items.length - 1;
        } else {
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
        }
        updateSuggestionHighlight({ fromKeyboard: true });
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        if (!dataLoaded) {
            results.innerHTML = "<p>データを読み込み中です。少し待ってから再試行してください。</p>";
            return;
        }
        if (isSuggestionVisible && selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
            selectSuggestionItem(items[selectedSuggestionIndex].dataset.searchValue);
            return;
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

function doSearch(updateHistory = true) {
    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }

    const raw = searchBox.value.trim();
    const query = raw.toLowerCase();

    if (!query) {
        return;
    }

    const searchId = ++currentSearchId;
    activeAudioTimers.forEach(id => clearInterval(id));
    activeAudioTimers.clear();

    currentRenderedWord = raw;

    if (updateHistory) {
        const paramString = window.location.hash.replace('#', '?') || window.location.search;
        const currentUrlWord = new URLSearchParams(paramString).get('word');
        if (!currentUrlWord || currentUrlWord.trim().toLowerCase() !== query) {
            window.history.pushState({ word: raw }, "", `#word=${encodeURIComponent(raw)}`);
        } else {
            window.history.replaceState({ word: raw }, "", `#word=${encodeURIComponent(raw)}`);
        }
    }

    cleanupResultsResources();
    window.scrollTo(0, 0);

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

    // 💡 検索結果が存在し、かつ通常の検索操作（履歴移動ではない）の場合に「最近の検索」へ保存
    if (updateHistory) {
        const firstHit = filtered[0];
        if (isNumber && firstHit && firstHit.num !== undefined) {
            saveRecentSearch(String(firstHit.num), `${firstHit.num}. ${firstHit.word}`);
        } else if (firstHit && firstHit.word) {
            saveRecentSearch(String(firstHit.word), String(firstHit.word));
        }
    }

    let relAudioCount = 0; // 💡 関連語の音声ボックス用連番

    // 改行→HTML および記号の余白調整用スパン付与
    const nl2br = (text) => {
        if (!text) return "";

        // 💡 案4：h2タイトル部分とh3関連語タイトル部分を抽出してHTMLに変換
        const headerPlaceholders = [];
        const preprocessedText = text
            .replace(
                /<span class="w">\s*<b>\s*【?\s*(?:(\d+)\s*\.\s*)?([^：:]+?)\s*[：:]\s*([\s\S]+?)\s*】?\s*<\/b>(?:<\/b>)?\s*<\/span>(?:<div id="(audio-box-[^"]+)" class="audio_box"[^>]*><\/div>)?(?:\r?\n)?/g,
                (match, num, word, meaningStr, audioBoxId) => {
                    const meanings = meaningStr
                        .split(/\s*[,，、]\s*/)
                        .map(s => s.trim())
                        .filter(Boolean);
                    const meaningTags = meanings
                        .map(m => `<span class="w-p4-meaning-item"><span class="w-p4-dot"></span><span>${m}</span></span>`)
                        .join("");
                    const numBadge = num ? `<span class="w-p4-num">${num.trim()}</span>` : "";
                    const audioBoxHtml = audioBoxId ? `<span id="${audioBoxId}" class="audio_box"></span>` : "";
                    const headerHtml = `<span class="w w-p4-header"><span class="w-p4-top">${numBadge}<span class="w-p4-word" lang="en">${word.trim()}</span>${audioBoxHtml}</span><span class="w-p4-meanings">${meaningTags}</span></span>`;
                    const placeholder = `<!--W_P4_HEADER_${headerPlaceholders.length}-->`;
                    headerPlaceholders.push(headerHtml);
                    return placeholder;
                }
            )
            .replace(
                /<b>\s*【\s*(?:(\d+)\s*\.\s*)?([^：:]+?)\s*[：:]\s*([\s\S]+?)\s*】\s*<\/b>/g,
                (match, num, word, meaningStr) => {
                    const cleanWord = word.trim();
                    const relAudioKey = `rel-${++relAudioCount}`;
                    const meanings = meaningStr
                        .split(/\s*[,，、]\s*/)
                        .map(s => s.trim())
                        .filter(Boolean);
                    const meaningTags = meanings
                        .map(m => `<span class="h3-p4-meaning-item"><span class="h3-p4-dot"></span><span>${m}</span></span>`)
                        .join("");
                    const numBadge = num ? `<span class="h3-p4-num">${num.trim()}</span>` : "";
                    const relAudioHtml = `<span id="audio-box-${relAudioKey}" class="audio_box h3-audio-box" data-audio-key="${relAudioKey}" data-word="${cleanWord}"></span>`;
                    const isWordInDict = (data.words || []).some(
                        w => w.word && w.word.toLowerCase() === cleanWord.toLowerCase() && w.word.toLowerCase() !== query
                    );
                    const wordSpanHtml = isWordInDict
                        ? `<span class="h3-p4-word h3-word-link" lang="en" data-target-word="${cleanWord}" title="「${cleanWord}」を検索" style="cursor: pointer; text-decoration: underline; text-underline-offset: 3px;">${cleanWord}<i class="fa-solid fa-arrow-up-right-from-square fa-2xs" style="margin-left: 4px; opacity: 0.75;"></i></span>`
                        : `<span class="h3-p4-word" lang="en">${cleanWord}</span>`;
                    const barHtml = `<span class="h3-p4-bar">${numBadge}${wordSpanHtml}${relAudioHtml}<span class="h3-p4-meanings">${meaningTags}</span></span>`;
                    const placeholder = `<!--W_P4_HEADER_${headerPlaceholders.length}-->`;
                    headerPlaceholders.push(barHtml);
                    return placeholder;
                }
            );

        // 1. HTMLタグと英単語を同時に検索する
        // (<[^>]+>) : HTMLタグ全体（例: <span class="w"> や </span>）をキャプチャグループ1とする
        // ([a-zA-Z][a-zA-Z'-]*) : 英単語をキャプチャグループ2とする
        let html = preprocessedText.replace(/(<[^>]+>)|([a-zA-Z][a-zA-Z'-]*)/g, (match, tag, word) => {
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
        html = html.replace(/(<span class="margin-right-punctuation"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-right-punctuation"[^>]*>([、。])<\/span>/g, '$1<span class="margin-right-punctuation margin-reduce-bracket-punctuation">$2</span>');
        html = html.replace(/(<span class="margin-right-punctuation"[^>]*>[、。]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g, '$1<span class="margin-left-only margin-reduce-punctuation-bracket">$2</span>');

        // 保護していたタイトルHTMLを復元
        headerPlaceholders.forEach((headerHtml, idx) => {
            html = html.replace(`<!--W_P4_HEADER_${idx}-->`, headerHtml);
        });

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
                        text = text.replace(/<\/span>(\r?\n)?<span class="ml">/, `</b></span><div id="audio-box-${item.num}" class="audio_box"></div><span class="ml">`);
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

            // 💡 追加：h2セクション内の .content の最後にNgram要素を追加（連打時のメモリ負荷を防ぐため後続のタスクで実行）
            if (!isNumber && hKey.startsWith("h2") && item.word) {
                sectionDiv.dataset.ngramWord = item.word.trim();
            }

            targetPanel.appendChild(sectionDiv);
        });
        results.appendChild(div);

        // 💡 関連語（h3）の見出し語クリックで該当単語へジャンプ（再検索）
        div.querySelectorAll(".h3-word-link").forEach(linkEl => {
            linkEl.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetWord = linkEl.dataset.targetWord;
                if (targetWord) {
                    selectSuggestionItem(targetWord);
                }
            });
        });

        insertSampleImages(div);

        // 定義した開閉アニメーション関数を実行
        setupDetailsAnimation(div);

        // 💡 Canvas・Ngram・音声取得などの高負荷処理（戻る・進む連打時は止まったページでのみ実行してクラッシュを防ぐ）
        const runHeavyFeatures = () => {
            if (searchId !== currentSearchId || !div.isConnected) return;

            div.querySelectorAll(".section[data-ngram-word]").forEach(sec => {
                const cDiv = sec.querySelector(".content");
                if (cDiv && sec.dataset.ngramWord) {
                    setupNgramInSection(cDiv, sec.dataset.ngramWord);
                }
            });

            fetchAndSetAudio(item.word, item.num, item.partOfSpeech, searchId);

            div.querySelectorAll(".h3-audio-box").forEach(box => {
                const relWord = box.dataset.word;
                const relKey = box.dataset.audioKey;
                if (relWord && relKey) {
                    const matchedWordObj = (data.words || []).find(
                        w => w.word && w.word.toLowerCase() === relWord.toLowerCase()
                    );
                    const relPos = matchedWordObj ? (matchedWordObj.partOfSpeech || "") : "";
                    fetchAndSetAudio(relWord, relKey, relPos, searchId);
                }
            });

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
        };

        if (updateHistory) {
            runHeavyFeatures();
        } else {
            heavyRenderTimer = setTimeout(() => {
                heavyRenderTimer = null;
                runHeavyFeatures();
            }, 150);
        }
    });
}

// 💡 MWの独自表記を日本人向けの読みやすいIPAに安全に変換する関数
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

// 💡 音声再生用の共有Audioインスタンス（複数生成によるメモリ肥大化を防止）
const sharedAudioPlayer = new Audio();
sharedAudioPlayer.preload = "none";
let activePlayingBtn = null;

// 💡 Merriam-Webster APIから音声を取得し、該当のdiv要素内にアイコンを描画する関数
// ※呼び出し元を fetchAndSetAudio(word, num, partOfSpeech) となるよう調整してください
async function fetchAndSetAudio(word, num, partOfSpeech = "", searchId = currentSearchId) {
    try {
        if (searchId !== currentSearchId) return;

        const cacheKey = `${String(word).toLowerCase()}__${String(partOfSpeech).trim().toLowerCase()}`;
        let audioUrl = "";
        let ipaText = "";

        if (audioCache.has(cacheKey)) {
            const cached = audioCache.get(cacheKey);
            audioUrl = cached.audioUrl;
            ipaText = cached.ipaText;
        } else {
            const k = "74a8b9a7-6973-4b74-b19d-1425e02f3912";
            const apiUrl = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${k}`;

            const response = await fetch(apiUrl);
            if (!response.ok || searchId !== currentSearchId) return;

            const data = await response.json();
            if (searchId !== currentSearchId) return;

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

            // ファイル名からMerriam-Websterの仕様に従って mp3 の URL を組み立てる
            if (audioFileName) {
                let subdir = audioFileName.charAt(0);
                if (audioFileName.startsWith("bix")) subdir = "bix";
                else if (audioFileName.startsWith("gg")) subdir = "gg";
                else if (/^[^a-zA-Z]/.test(subdir)) subdir = "number"; // 数字や記号で始まる場合

                audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioFileName}.mp3`;
            }

            ipaText = safeConvertMwToIpa(rawMwPron);
            saveAudioCache(cacheKey, { audioUrl, ipaText });
        }

        // DOM要素へ反映し、完了したら即座に監視を終える（不要なタイマー稼働によるスクロール負荷を防止）
        const renderId = String(Date.now() + Math.random());
        let attempts = 0;
        const maxAttempts = 20;
        let timerId = null;

        const applyToDom = () => {
            if (searchId !== currentSearchId) {
                if (timerId !== null) {
                    clearInterval(timerId);
                    activeAudioTimers.delete(timerId);
                }
                return true;
            }

            const audioBox = document.getElementById(`audio-box-${num}`);
            if (audioBox) {
                if (audioBox.dataset.renderId !== renderId || !audioBox.querySelector('div')) {
                    // アイコンとIPAを並べて描画
                    audioBox.innerHTML = `
                        <div style="display: inline-flex; align-items: center; gap: 6px; margin-bottom: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                            ${audioUrl ? `<span class="audio_button" style="cursor:pointer; display: inline-flex; align-items: center;"><i class="fa-solid fa-volume-high fa-rotate-by fa-sm" style="color: #ffffff; --fa-rotate-angle: 340deg;"></i></span>` : ''}
                            ${ipaText ? `<span class="ipa-text">${ipaText}</span>` : ''}
                        </div>
                    `;
                    audioBox.dataset.renderId = renderId;

                    // 音声URLが存在する場合のみイベントリスナーを設定
                    if (audioUrl) {
                        const btn = audioBox.querySelector('.audio_button');

                        btn.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (btn.dataset.playing === 'true') return;

                            // 他のボタンが再生中ならリセット
                            if (activePlayingBtn && activePlayingBtn !== btn) {
                                activePlayingBtn.dataset.playing = 'false';
                                activePlayingBtn.style.opacity = '1';
                            }

                            activePlayingBtn = btn;
                            btn.dataset.playing = 'true';
                            btn.style.opacity = '0.5';

                            sharedAudioPlayer.pause();
                            sharedAudioPlayer.src = audioUrl;
                            sharedAudioPlayer.currentTime = 0;

                            const resetBtn = () => {
                                btn.dataset.playing = 'false';
                                btn.style.opacity = '1';
                                if (activePlayingBtn === btn) {
                                    activePlayingBtn = null;
                                }
                            };

                            sharedAudioPlayer.onended = resetBtn;
                            sharedAudioPlayer.onerror = resetBtn;

                            sharedAudioPlayer.play().catch(resetBtn);
                        });
                    }
                }
                // 描画が完了したら即座にタイマーを停止する
                if (timerId !== null) {
                    clearInterval(timerId);
                    activeAudioTimers.delete(timerId);
                }
                return true;
            }

            attempts++;
            if (attempts >= maxAttempts && timerId !== null) {
                clearInterval(timerId);
                activeAudioTimers.delete(timerId);
            }
            return false;
        };

        // 即時実行してまだDOMがなかった場合のみインターバルを起動する
        if (!applyToDom()) {
            timerId = setInterval(applyToDom, 50);
            activeAudioTimers.add(timerId);
        }
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
            if (e.target.closest('.audio_button') || e.target.closest('.h3-word-link')) return;
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
function insertSampleImages(container = document) {
    const targetElements = container.querySelectorAll('div.sample_image');

    if (targetElements.length === 0) {
        return;
    }

    targetElements.forEach((el) => {
        if (el.dataset.sampleInitialized === 'true') return;
        const imageName = el.classList[1];

        if (imageName) {
            el.dataset.sampleInitialized = 'true';
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
                modal.className = 'sample-image-modal';
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