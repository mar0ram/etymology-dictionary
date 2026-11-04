import { prependEntry } from "./prependEntry.js";
import { setupNgramInSection } from "./ngram.js";
import {
    CleanupFn,
    Disposable,
    AnimationResult,
    DictionaryEntry,
    DictionaryData,
    SuggestionItem,
    RecentSearchItem,
    activeCleanups,
    registerCleanup
} from "./types.js";
import { fetchAndSetAudio, stopSharedAudio } from "./audio.js";
import { createFormatter } from "./formatter.js";
import { resetZoom, setupDetailsAnimation, insertSampleImages } from "./ui.js";

export type { CleanupFn, Disposable, AnimationResult };
export { registerCleanup };

// --- 状態管理 ---
let data: DictionaryData = { words: [], idioms: [] };
let dataLoaded = false;
let currentRenderedWord: string | null = null;
let isSelectingSuggestion = false;
let suggestionSelectTimer: ReturnType<typeof setTimeout> | null = null;
let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let heavyRenderTimer: ReturnType<typeof setTimeout> | null = null;
let lastHistoryEventTime = 0;
let lastHandledUrl = "";

// 非同期通信・描画の世代および中断管理
let currentSearchAbortController: AbortController | null = null;

// --- 最近調べた単語（検索履歴）の管理（localStorage連携・最大10件） ---
const RECENT_SEARCHES_STORAGE_KEY = "recent_searches_v1";
const MAX_RECENT_SEARCHES = 10;
let recentSearches: RecentSearchItem[] = [];
try {
    const parsedRecent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || "[]");
    if (Array.isArray(parsedRecent)) {
        recentSearches = parsedRecent.filter(
            (item): item is RecentSearchItem =>
                Boolean(item && typeof item.searchValue === "string" && typeof item.label === "string")
        );
    }
} catch {
    recentSearches = [];
}

function saveRecentSearch(searchValue: string, label: string): void {
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
    } catch {
        // ストレージ上限時などはメモリ上のみ保持
    }
}

function removeRecentSearch(searchValue: string): void {
    const normalizedTarget = String(searchValue).trim().toLowerCase();
    recentSearches = recentSearches.filter(
        item => String(item.searchValue).trim().toLowerCase() !== normalizedTarget
    );
    try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches));
    } catch { }
}

function clearAllRecentSearches(): void {
    recentSearches = [];
    try {
        localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch { }
}

// ブラウザ標準のスクロール位置自動復元を無効化
if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}

// --- DOM要素の取得 ---
const searchBox = document.getElementById("searchBox") as HTMLInputElement;
const searchBtn = document.getElementById("searchBtn") as HTMLElement;
const results = document.getElementById("results") as HTMLElement;
const clearBtn = document.getElementById("clearBtn") as HTMLElement;
const viewportMeta = document.querySelector<HTMLMetaElement>("meta[name=viewport]");
const searchBoxContainer = document.querySelector<HTMLElement>(".search-box-container")!;

// --- 進行中の非同期処理・アニメーション・タイマーを完全停止しリソースを解放する関数 ---
function abortPendingOperations(): void {
    if (currentSearchAbortController) {
        currentSearchAbortController.abort();
        currentSearchAbortController = null;
    }
    if (heavyRenderTimer) {
        clearTimeout(heavyRenderTimer);
        heavyRenderTimer = null;
    }
    stopSharedAudio();
}

function cleanupResultsResources(): void {
    abortPendingOperations();

    // 登録済みの全アニメーション・イベントリスナーの破棄処理を実行
    activeCleanups.forEach(cleanup => {
        try {
            cleanup();
        } catch (e) {
            console.error("Cleanup error:", e);
        }
    });
    activeCleanups.clear();

    if (!results) return;
    results.replaceChildren();
}

// --- URL変更検知・履歴移動制御 ---
function handleUrlSearch(event?: PopStateEvent | HashChangeEvent): void {
    if (!dataLoaded) return;

    // popstate と hashchange の連続発火による二重実行を防止
    const currentFullUrl = window.location.href;
    if (event && event.type === "hashchange" && currentFullUrl === lastHandledUrl) {
        return;
    }
    lastHandledUrl = currentFullUrl;

    if (suggestionSelectTimer) {
        clearTimeout(suggestionSelectTimer);
        suggestionSelectTimer = null;
    }

    const paramString = window.location.hash.replace("#", "?") || window.location.search;
    const urlParams = new URLSearchParams(paramString);
    const popStateWord =
        event && "state" in event && event.state && typeof event.state.word === "string"
            ? event.state.word
            : null;
    const targetWord = urlParams.get("word") ?? popStateWord;

    // 開いている画像モーダルがあれば閉じ、背景スクロールロックも解除
    const modals = document.querySelectorAll(".sample-image-modal");
    if (modals.length > 0) {
        modals.forEach(m => m.remove());
        document.body.style.overflow = "";
    }

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
        ? currentRenderedWord !== null &&
          currentRenderedWord.toLowerCase() === targetWord.trim().toLowerCase() &&
          results.children.length > 0
        : currentRenderedWord === null && results.children.length > 0;

    if (!isSameTarget) {
        window.scrollTo(0, 0);
        abortPendingOperations();
    }

    const executeUrlSearch = (): void => {
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
            doSearch(false);
            window.scrollTo(0, 0);
        } else {
            if (currentRenderedWord === null && results.children.length > 0) return;
            window.scrollTo(0, 0);
            currentRenderedWord = null;
            searchBox.value = "";
            clearBtn.style.display = "none";
            cleanupResultsResources();
            const res = prependEntry() as AnimationResult;
            registerCleanup(res);
            window.scrollTo(0, 0);
        }
    };

    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }

    if (event) {
        const now = Date.now();
        const isRapidClick = now - lastHistoryEventTime < 180;
        lastHistoryEventTime = now;

        if (isRapidClick) {
            historyDebounceTimer = setTimeout(executeUrlSearch, 120);
        } else {
            executeUrlSearch();
        }
    } else {
        executeUrlSearch();
    }
}

window.addEventListener("popstate", handleUrlSearch);
window.addEventListener("hashchange", handleUrlSearch);

// --- JSONデータ読み込み ---
let suggestionItems: SuggestionItem[] = [];

fetch("data.json")
    .then(res => res.json())
    .then((json: DictionaryData) => {
        data = json;

        const wordsList: SuggestionItem[] = (json.words || [])
            .filter(item => Boolean(item && item.word))
            .map(item => ({
                word: String(item.word),
                normalizedWord: normalizeForMatch(String(item.word)),
                searchValue: String(item.word)
            }));

        const idiomsList: SuggestionItem[] = (json.idioms || [])
            .filter(item => Boolean(item && item.word))
            .map(item => ({
                word: String(item.word),
                normalizedWord: normalizeForMatch(String(item.word)),
                searchValue: item.num !== undefined ? String(item.num) : String(item.word),
                numStr: item.num !== undefined ? String(item.num) : ""
            }));

        const seen = new Set<string>();
        suggestionItems = [...wordsList, ...idiomsList]
            .filter(item => {
                const key = `${item.word}__${item.searchValue}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => {
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
        handleUrlSearch();
    })
    .catch(err => {
        console.error("JSON読み込みエラー:", err);
    });

// 初回読み込み時にURLパラメータがない場合のみ初期表示を描画
const initialParams = new URLSearchParams(window.location.search || window.location.hash.replace("#", "?"));
if (!initialParams.get("word")) {
    const res = prependEntry() as AnimationResult;
    registerCleanup(res);
}

// --- サジェスト用要素の生成とスタイル設定 ---
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

function setSuggestionDisplay(show: boolean): void {
    if (show) {
        suggestionList.style.display = "block";
    } else {
        suggestionList.style.display = "none";
    }
}

function normalizeForMatch(str: string): string {
    return String(str).toLowerCase().replace(/[ \u3000]+/g, "");
}

let selectedSuggestionIndex = -1;

function updateSuggestionHighlight({ fromKeyboard = false }: { fromKeyboard?: boolean } = {}): void {
    const items = suggestionList.querySelectorAll<HTMLLIElement>("li");
    if (items.length === 0) return;

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
                const headerEl = suggestionList.querySelector<HTMLElement>(".suggestion-header");
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

document.addEventListener("click", (e: MouseEvent) => {
    if (!searchBoxContainer.contains(e.target as Node)) {
        setSuggestionDisplay(false);
        selectedSuggestionIndex = -1;
    }
});

function clearButtonRedState(): void {
    clearBtn.blur();
    clearBtn.classList.add("no-hover");
    const restoreHover = (): void => {
        clearBtn.classList.remove("no-hover");
        window.removeEventListener("mousemove", restoreHover);
        window.removeEventListener("touchstart", restoreHover);
    };
    window.addEventListener("mousemove", restoreHover, { once: true, passive: true });
    window.addEventListener("touchstart", restoreHover, { once: true, passive: true });
}

function selectSuggestionItem(searchValue: string): void {
    if (suggestionSelectTimer) {
        clearTimeout(suggestionSelectTimer);
        suggestionSelectTimer = null;
    }
    isSelectingSuggestion = true;
    searchBox.blur();
    clearButtonRedState();
    searchBox.value = searchValue;
    clearBtn.style.display = "flex";
    suggestionList.innerHTML = "";
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    doSearch();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    resetZoom(viewportMeta);
    suggestionSelectTimer = setTimeout(() => {
        suggestionSelectTimer = null;
        searchBox.value = searchValue;
        suggestionList.innerHTML = "";
        setSuggestionDisplay(false);
        isSelectingSuggestion = false;
    }, 150);
}

function renderRecentSuggestions(): void {
    if (isSelectingSuggestion || !dataLoaded) return;
    if (searchBox.value.length > 0) return;

    suggestionList.innerHTML = "";
    selectedSuggestionIndex = -1;

    if (recentSearches.length === 0) {
        setSuggestionDisplay(false);
        return;
    }

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

    const handleClearAll = (e: Event): void => {
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
            transition: "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease"
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

        const handleRemoveItem = (e: Event): void => {
            e.preventDefault();
            e.stopPropagation();
            removeRecentSearch(item.searchValue);
            renderRecentSuggestions();
        };
        deleteBtn.addEventListener("mousedown", handleRemoveItem);
        deleteBtn.addEventListener("touchstart", handleRemoveItem, { passive: false });
        deleteBtn.addEventListener("click", (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        });

        li.appendChild(labelWrap);
        li.appendChild(deleteBtn);

        li.addEventListener("mouseenter", () => {
            selectedSuggestionIndex = index;
            updateSuggestionHighlight();
        });
        li.addEventListener("mouseleave", () => {
            selectedSuggestionIndex = -1;
            updateSuggestionHighlight();
        });

        let touchStartX = 0;
        let touchStartY = 0;

        li.addEventListener(
            "touchstart",
            (e: TouchEvent) => {
                if (e.touches && e.touches.length > 0) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            },
            { passive: true }
        );

        li.addEventListener("touchend", (e: TouchEvent) => {
            if (e.target === deleteBtn || deleteBtn.contains(e.target as Node)) return;
            if (e.changedTouches && e.changedTouches.length > 0) {
                const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
                if (dx < 10 && dy < 10) {
                    e.preventDefault();
                    selectSuggestionItem(item.searchValue);
                }
            }
        });

        li.addEventListener("click", (e: MouseEvent) => {
            if (e.target === deleteBtn || deleteBtn.contains(e.target as Node)) return;
            selectSuggestionItem(item.searchValue);
        });

        suggestionList.appendChild(li);
    });

    setSuggestionDisplay(true);
    suggestionList.scrollTop = 0;
}

// --- 検索窓への入力監視 ---
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

    const MAX_SUGGESTIONS = 50;
    const isNumberQuery = /^[0-9]+$/.test(normalizedQuery);
    let matchedItems: SuggestionItem[] = [];

    if (isNumberQuery) {
        matchedItems = suggestionItems
            .filter(item => Boolean(item.numStr && item.numStr.startsWith(normalizedQuery)))
            .sort((a, b) => Number(a.numStr) - Number(b.numStr))
            .slice(0, MAX_SUGGESTIONS);
    } else {
        const prefixMatches: SuggestionItem[] = [];
        const partialMatches: SuggestionItem[] = [];
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

        matchedItems =
            prefixMatches.length >= MAX_SUGGESTIONS
                ? prefixMatches
                : prefixMatches.concat(partialMatches.slice(0, MAX_SUGGESTIONS - prefixMatches.length));
    }

    if (matchedItems.length === 0) {
        setSuggestionDisplay(false);
        return;
    }

    const fragment = document.createDocumentFragment();

    matchedItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = isNumberQuery && item.numStr ? `${item.numStr}. ${item.word}` : item.word;
        li.dataset.searchValue = item.searchValue;
        Object.assign(li.style, {
            padding: "8px 12px",
            cursor: "pointer",
            borderBottom: "1px solid #eeeeee",
            color: "#333333",
            backgroundColor: "#ffffff",
            position: "relative",
            zIndex: "1",
            transition: "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease"
        });

        li.addEventListener("mouseenter", () => {
            selectedSuggestionIndex = index;
            updateSuggestionHighlight();
        });
        li.addEventListener("mouseleave", () => {
            selectedSuggestionIndex = -1;
            updateSuggestionHighlight();
        });

        let touchStartX = 0;
        let touchStartY = 0;

        li.addEventListener(
            "touchstart",
            (e: TouchEvent) => {
                if (e.touches && e.touches.length > 0) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            },
            { passive: true }
        );

        li.addEventListener("touchend", (e: TouchEvent) => {
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
    suggestionList.scrollTop = 0;
});

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
    clearButtonRedState();
    searchBox.value = "";
    clearBtn.style.display = "none";
    suggestionList.innerHTML = "";
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    searchBox.focus();
    renderRecentSuggestions();
});

let isInteractingWithSuggestion = false;
suggestionList.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
});
suggestionList.addEventListener(
    "touchstart",
    () => {
        isInteractingWithSuggestion = true;
    },
    { passive: true }
);
suggestionList.addEventListener(
    "touchend",
    () => {
        setTimeout(() => {
            isInteractingWithSuggestion = false;
        }, 150);
    },
    { passive: true }
);
suggestionList.addEventListener(
    "touchcancel",
    () => {
        isInteractingWithSuggestion = false;
    },
    { passive: true }
);

searchBox.addEventListener("focus", () => {
    if (viewportMeta) {
        viewportMeta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0");
    }
    if (searchBox.value.length === 0) {
        renderRecentSuggestions();
    }
});

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

searchBox.addEventListener("click", () => {
    if (searchBox.value.length === 0 && suggestionList.style.display === "none") {
        renderRecentSuggestions();
    }
});

searchBtn.addEventListener("click", () => {
    if (!dataLoaded) {
        results.innerHTML = "<p>データを読み込み中です。少し待ってから再試行してください。</p>";
        return;
    }
    clearButtonRedState();
    setSuggestionDisplay(false);
    selectedSuggestionIndex = -1;
    doSearch();
    resetZoom(viewportMeta);
});

searchBox.addEventListener("keydown", (e: KeyboardEvent) => {
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

    const items = suggestionList.querySelectorAll<HTMLLIElement>("li");
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
            const targetVal = items[selectedSuggestionIndex].dataset.searchValue;
            if (targetVal !== undefined) {
                selectSuggestionItem(targetVal);
                return;
            }
        }
        searchBox.blur();
        clearButtonRedState();
        setSuggestionDisplay(false);
        selectedSuggestionIndex = -1;
        doSearch();
        resetZoom(viewportMeta);
    }
});

// 単語イメージのアニメーション遅延読み込み・実行と破棄関数の登録
function startAnimation(
    container: Element | null,
    loadAndDraw: () => Promise<AnimationResult>,
    signal: AbortSignal
): void {
    if (!container) return;
    void loadAndDraw()
        .then(cleanupResult => {
            if (signal.aborted || !container.isConnected) {
                if (typeof cleanupResult === "function") {
                    cleanupResult();
                } else if (cleanupResult && typeof cleanupResult === "object" && typeof cleanupResult.dispose === "function") {
                    cleanupResult.dispose();
                }
                return;
            }
            registerCleanup(cleanupResult);
        })
        .catch(err => {
            console.error("Animation load error:", err);
        });
}

// --- 検索メイン処理 ---
function doSearch(updateHistory = true): void {
    if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
    }

    const raw = searchBox.value.trim();
    const query = raw.toLowerCase();

    if (!query) {
        return;
    }

    currentRenderedWord = raw;

    if (updateHistory) {
        const paramString = window.location.hash.replace("#", "?") || window.location.search;
        const currentUrlWord = new URLSearchParams(paramString).get("word");
        if (!currentUrlWord || currentUrlWord.trim().toLowerCase() !== query) {
            window.history.pushState({ word: raw }, "", `#word=${encodeURIComponent(raw)}`);
        } else {
            window.history.replaceState({ word: raw }, "", `#word=${encodeURIComponent(raw)}`);
        }
        lastHandledUrl = window.location.href;
    }

    // 前のページの通信・タイマー・アニメーションを完全に破棄してから新しいAbortControllerを生成
    cleanupResultsResources();
    const abortController = new AbortController();
    currentSearchAbortController = abortController;
    const { signal } = abortController;

    window.scrollTo(0, 0);

    const isNumber = /^[0-9]+$/.test(query);
    let filtered: DictionaryEntry[] = [];

    if (isNumber) {
        const numInput = parseInt(query, 10);
        if (numInput < 1 || numInput > 1000) {
            results.innerHTML = "<p>番号検索は 1〜1000 の範囲のみ有効です</p>";
            return;
        }
        filtered = (data.idioms || []).filter(item => item.num === numInput);
    } else {
        filtered = (data.words || []).filter(item => {
            if (!item.word || typeof item.word !== "string") return false;
            return item.word.toLowerCase() === query;
        });
    }

    if (filtered.length === 0) {
        results.innerHTML = "<p>該当なし</p>";
        return;
    }

    if (updateHistory) {
        const firstHit = filtered[0];
        if (isNumber && firstHit && firstHit.num !== undefined) {
            saveRecentSearch(String(firstHit.num), `${firstHit.num}. ${firstHit.word}`);
        } else if (firstHit && firstHit.word) {
            saveRecentSearch(String(firstHit.word), String(firstHit.word));
        }
    }

    const nl2br = createFormatter(query, data.words || []);

    filtered.forEach(item => {
        const div = document.createElement("div");
        div.className = "entry";

        let displayNum = item.num;
        if (!displayNum || displayNum === "") {
            displayNum = "empty";
        }

        div.innerHTML = `<div class="head">${displayNum}. ${item.word}</div>`;

        const wrapper = document.createElement("div");
        wrapper.className = "section-wrapper";
        const mainPanel = document.createElement("div");
        mainPanel.className = "main-info-panel";
        const timelinePanel = document.createElement("div");
        timelinePanel.className = "timeline-panel";

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

            const targetPanel = hKey.startsWith("h1") || hKey.startsWith("h5") ? mainPanel : timelinePanel;

            const sectionDiv = document.createElement("div");
            sectionDiv.className = `section ${hKey}`;

            if (hKey.startsWith("h5")) {
                sectionDiv.innerHTML = `<details><summary class="subtitle" style="cursor: pointer; list-style: none;">${item[hKey]}</summary>
                <div class="content"></div></details>`;
            } else {
                sectionDiv.innerHTML = `<div class="subtitle">${item[hKey]}</div>
                <div class="content"></div>`;
            }

            const contentDiv = sectionDiv.querySelector<HTMLElement>(".content")!;

            if (hKey.startsWith("h1")) {
                const parts = childKeys.map(k => `<div>${nl2br(String(item[k]))}</div>`);
                contentDiv.innerHTML = parts.join("");
            } else if (hKey.startsWith("h5")) {
                const htmlParts: string[] = [];
                let i = 1;
                while (item[`tag${i}`] || item[`p${i}`]) {
                    const tag = nl2br(String(item[`tag${i}`] || ""));
                    const p = nl2br(String(item[`p${i}`] || ""));
                    if (tag) htmlParts.push(`<span class="tag">${tag}</span>`);
                    if (p) htmlParts.push(`<div class="p">${p}</div>`);
                    i++;
                }
                contentDiv.innerHTML = htmlParts.join("");
            } else {
                const htmlParts: string[] = [];
                childKeys.forEach(k => {
                    let text = String(item[k]);
                    if (k === "i2") {
                        text = text.replace(
                            /<\/span>(\r?\n)?<span class="ml">/,
                            `</b></span><div id="audio-box-${item.num}" class="audio_box"></div><span class="ml">`
                        );
                    }

                    if (hKey === "h3" && k.startsWith("related")) {
                        if (text.includes('<span class="ml">')) {
                            text =
                                text.replace(/(<b>.*?<\/b>)(\r?\n)?/, '<details><summary style="cursor: pointer;">$1</summary>') +
                                "</details>";
                        }
                    }

                    htmlParts.push(`<div>${nl2br(text)}</div>`);
                });
                contentDiv.innerHTML = htmlParts.join("");
            }

            if (!isNumber && hKey.startsWith("h2") && item.word) {
                sectionDiv.dataset.ngramWord = item.word.trim();
            }

            targetPanel.appendChild(sectionDiv);
        });
        results.appendChild(div);

        div.querySelectorAll<HTMLElement>(".h3-word-link").forEach(linkEl => {
            linkEl.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const targetWord = linkEl.dataset.targetWord;
                if (targetWord) {
                    selectSuggestionItem(targetWord);
                }
            });
        });

        insertSampleImages(div);
        setupDetailsAnimation(div);

        const runHeavyFeatures = (): void => {
            if (signal.aborted || !div.isConnected) return;

            div.querySelectorAll<HTMLElement>(".section[data-ngram-word]").forEach(sec => {
                const cDiv = sec.querySelector<HTMLElement>(".content");
                if (cDiv && sec.dataset.ngramWord) {
                    const ngramCleanup = setupNgramInSection(cDiv, sec.dataset.ngramWord) as AnimationResult;
                    registerCleanup(ngramCleanup);
                }
            });

            if (item.word) {
                void fetchAndSetAudio(item.word, String(item.num ?? ""), item.partOfSpeech || "", signal);
            }

            div.querySelectorAll<HTMLElement>(".h3-audio-box").forEach(box => {
                const relWord = box.dataset.word;
                const relKey = box.dataset.audioKey;
                if (relWord && relKey) {
                    const matchedWordObj = (data.words || []).find(
                        w => w.word && w.word.toLowerCase() === relWord.toLowerCase()
                    );
                    const relPos = matchedWordObj ? matchedWordObj.partOfSpeech || "" : "";
                    void fetchAndSetAudio(relWord, relKey, relPos, signal);
                }
            });

            const configs: { sel: string; load: () => Promise<AnimationResult> }[] = [
                { sel: ".tropic", load: () => import("./eclipticModel.js").then(m => m.drawEclipticModel()) },
                { sel: ".arctic", load: () => import("./arctic.js").then(m => m.drawArcticModel()) },
                { sel: ".dimension", load: () => import("./dimension.js").then(m => m.drawDimensionModel()) },
                { sel: ".scheme", load: () => import("./scheme.js").then(m => m.drawSchemeModel()) },
                { sel: ".postpone", load: () => import("./postpone.js").then(m => m.drawPostponeModel()) },
                { sel: ".fiber", load: () => import("./fiber.js").then(m => m.drawFiberModel()) },
                { sel: ".tense", load: () => import("./tense.js").then(m => m.drawTenseLineModel()) },
                { sel: ".scatter", load: () => import("./scatter.js").then(m => m.drawScatterAnimation()) },
                { sel: ".transparent", load: () => import("./transparent.js").then(m => m.drawTransparentAnimation()) },
                { sel: ".steep", load: () => import("./steep.js").then(m => m.drawSteepModel()) },
                { sel: ".precede", load: () => import("./precede.js").then(m => m.drawPrecedeModel()) },
                { sel: ".epidemic", load: () => import("./epidemic.js").then(m => m.drawEpidemicModel()) },
                { sel: ".tear", load: () => import("./tear.js").then(m => m.setupTearAnimation()) },
                { sel: ".warn", load: () => import("./warn.js").then(m => m.setupWarnAnimation()) }
            ];

            configs.forEach(config => {
                const target = div.querySelector(config.sel);
                if (target) {
                    startAnimation(target, config.load, signal);
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