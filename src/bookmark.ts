import { DictionaryData, DictionaryEntry, RecentSearchItem } from "./types.js";
import { createFormatter } from "./formatter.js";

export interface BookmarkItem {
    searchValue: string;
    word: string;
    numStr: string;
    savedAt: number;
}

interface FlashcardData {
    searchValue: string;
    word: string;
    numStr: string;
    meanings: string[];
    mlHtml: string;
}

const BOOKMARK_STORAGE_KEY = "word_bookmarks_v1";
let bookmarks: BookmarkItem[] = [];

try {
    const raw = JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) || "[]");
    if (Array.isArray(raw)) {
        bookmarks = raw.filter(
            (b): b is BookmarkItem =>
                Boolean(b && typeof b.searchValue === "string" && typeof b.word === "string")
        );
    }
} catch {
    bookmarks = [];
}

function saveBookmarksToStorage(): void {
    try {
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
        // ストレージ上限時はメモリ上のみ保持
    }
}

export function isBookmarked(searchValue: string): boolean {
    const target = searchValue.trim().toLowerCase();
    return bookmarks.some(b => b.searchValue.trim().toLowerCase() === target);
}

export function toggleBookmark(item: DictionaryEntry, isNumberSearch: boolean): boolean {
    const word = String(item.word || "").trim();
    if (!word) return false;

    const numStr = item.num !== undefined && item.num !== "" ? String(item.num) : "";
    const searchValue = isNumberSearch && numStr ? numStr : word;
    const target = searchValue.toLowerCase();

    const existingIdx = bookmarks.findIndex(b => b.searchValue.toLowerCase() === target);
    let added = false;

    if (existingIdx >= 0) {
        bookmarks.splice(existingIdx, 1);
        added = false;
    } else {
        bookmarks.unshift({
            searchValue,
            word,
            numStr,
            savedAt: Date.now()
        });
        added = true;
    }

    saveBookmarksToStorage();
    updateNavBadge();
    return added;
}

function removeBookmarkByValue(searchValue: string): void {
    const target = searchValue.trim().toLowerCase();
    bookmarks = bookmarks.filter(b => b.searchValue.trim().toLowerCase() !== target);
    saveBookmarksToStorage();
    updateNavBadge();
    syncPageBookmarkButtons();
}

let currentDockEntry: DictionaryEntry | null = null;
let currentDockIsNumber = false;
let dockEl: HTMLElement | null = null;
let dockStarBtn: HTMLButtonElement | null = null;
let closeLiquidSearchImmediate: (() => void) | null = null;

function updateDockStarState(): void {
    if (!dockStarBtn || !currentDockEntry || !currentDockEntry.word) return;
    const word = String(currentDockEntry.word).trim();
    const numStr =
        currentDockEntry.num !== undefined && currentDockEntry.num !== ""
            ? String(currentDockEntry.num)
            : "";
    const searchValue = currentDockIsNumber && numStr ? numStr : word;
    const active = isBookmarked(searchValue);

    const iconEl = dockStarBtn.querySelector<HTMLElement>("i");
    const labelEl = dockStarBtn.querySelector<HTMLElement>(".liquid-btn-label");
    if (iconEl) {
        iconEl.className = active ? "fa-solid fa-star" : "fa-regular fa-star";
        iconEl.style.color = active ? "#fbbf24" : "#ffffff";
        iconEl.style.filter = active
            ? "drop-shadow(0 1px 2px rgba(15, 23, 42, 0.95)) drop-shadow(0 0 6px rgba(251, 191, 36, 0.65))"
            : "";
    }
    if (labelEl) {
        labelEl.textContent = "登録";
        labelEl.style.color = active ? "#fde68a" : "#f8fafc";
    }
    dockStarBtn.classList.toggle("is-active-star", active);
}

// 画面上に表示されている見出しの★ボタン状態と下部ドックを同期
function syncPageBookmarkButtons(): void {
    document.querySelectorAll<HTMLButtonElement>(".entry-bookmark-btn").forEach(btn => {
        const val = btn.dataset.searchValue || "";
        const active = isBookmarked(val);
        applyBookmarkBtnStyle(btn, active);
    });
    updateDockStarState();
}

// 単語検索ページでの下部Liquid Glassドックの表示・状態更新
export function setBottomDockContext(
    item: DictionaryEntry | null,
    isNumberSearch: boolean
): void {
    currentDockEntry = item;
    currentDockIsNumber = isNumberSearch;

    if (!dockEl) return;

    if (!item || !item.word) {
        if (closeLiquidSearchImmediate) {
            closeLiquidSearchImmediate();
        }
        dockEl.style.opacity = "0";
        dockEl.style.pointerEvents = "none";
        dockEl.style.transform = "translate(-50%, 20px) scale(0.96)";
        return;
    }

    updateDockStarState();
    dockEl.style.opacity = "1";
    dockEl.style.pointerEvents = "auto";
    dockEl.style.transform = "translate(-50%, 0) scale(1)";
}

function applyBookmarkBtnStyle(btn: HTMLButtonElement, active: boolean): void {
    btn.innerHTML = active
        ? `<i class="fa-solid fa-star" style="color: #fbbf24;"></i><span>保存済</span>`
        : `<i class="fa-regular fa-star" style="color: #94a3b8;"></i><span>単語帳</span>`;
    Object.assign(btn.style, {
        backgroundColor: active ? "rgba(251, 191, 36, 0.14)" : "rgba(30, 41, 59, 0.8)",
        borderColor: active ? "rgba(251, 191, 36, 0.5)" : "#334155",
        color: active ? "#fde68a" : "#cbd5e1"
    });
}

// 各単語エントリの見出し（.head）に★ボタンを追加
export function attachBookmarkButton(
    entryDiv: HTMLElement,
    item: DictionaryEntry,
    isNumberSearch: boolean
): void {
    const headEl = entryDiv.querySelector<HTMLElement>(".head");
    if (!headEl || !item.word) return;

    const word = String(item.word).trim();
    const numStr = item.num !== undefined && item.num !== "" ? String(item.num) : "";
    const searchValue = isNumberSearch && numStr ? numStr : word;

    Object.assign(headEl.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap"
    });

    const titleText = headEl.textContent || "";
    headEl.textContent = "";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = titleText;
    headEl.appendChild(titleSpan);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "entry-bookmark-btn";
    btn.dataset.searchValue = searchValue;
    Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        fontSize: "13px",
        fontWeight: "600",
        borderRadius: "8px",
        border: "1px solid #334155",
        cursor: "pointer",
        flexShrink: "0",
        transition: "all 0.2s ease"
    });

    applyBookmarkBtnStyle(btn, isBookmarked(searchValue));

    btn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const nowActive = toggleBookmark(item, isNumberSearch);
        applyBookmarkBtnStyle(btn, nowActive);
        updateDockStarState();
    });

    headEl.appendChild(btn);
}

// 辞書データからフラッシュカード用の「意味（単語・熟語対応）」と「.ml要素のHTML全文（画像除く）」を抽出
function buildFlashcardData(
    searchValue: string,
    fallbackWord: string,
    data: DictionaryData
): FlashcardData | null {
    const cleanVal = searchValue.trim();
    const isNum = /^[0-9]+$/.test(cleanVal);

    let entry: DictionaryEntry | undefined;
    if (isNum) {
        const num = parseInt(cleanVal, 10);
        entry =
            (data.idioms || []).find(item => Number(item.num) === num) ||
            (data.words || []).find(item => Number(item.num) === num);
    } else {
        entry =
            (data.words || []).find(
                item => item.word && String(item.word).toLowerCase() === cleanVal.toLowerCase()
            ) ||
            (data.idioms || []).find(
                item => item.word && String(item.word).toLowerCase() === cleanVal.toLowerCase()
            );
    }

    if (!entry && fallbackWord) {
        const cleanFallback = fallbackWord.trim().toLowerCase();
        entry =
            (data.words || []).find(
                item => item.word && String(item.word).toLowerCase() === cleanFallback
            ) ||
            (data.idioms || []).find(
                item => item.word && String(item.word).toLowerCase() === cleanFallback
            );
    }

    const word = String(entry?.word || fallbackWord).trim();
    const numStr = entry?.num !== undefined && entry?.num !== "" ? String(entry.num) : "";

    const meanings: string[] = [];
    const mlHtmlParts: string[] = [];

    if (entry) {
        const nl2br = createFormatter(word.toLowerCase(), data.words || []);
        const allKeys = Object.keys(entry);
        const contentKeys = allKeys.filter(
            k =>
                k !== "num" &&
                k !== "word" &&
                k !== "partOfSpeech" &&
                !/^h\d+/i.test(k) &&
                !k.startsWith("related") &&
                !/^tag\d+/i.test(k) &&
                !/^p\d+/i.test(k) &&
                typeof entry[k] === "string" &&
                String(entry[k]).trim() !== ""
        );

        const pushMeaningString = (rawMeaning: string): void => {
            const cleaned = rawMeaning
                .replace(/<[^>]+>/g, "")
                .replace(/^[\s【]+|[\s】]+$/g, "")
                .trim();
            if (!cleaned) return;
            cleaned
                .split(/\s*[,，、]\s*/)
                .map(s => s.trim())
                .filter(Boolean)
                .forEach(m => {
                    if (!meanings.includes(m)) {
                        meanings.push(m);
                    }
                });
        };

        contentKeys.forEach(k => {
            const rawText = String(entry[k]);
            const fixedText = rawText.replace(
                /<\/span>(\r?\n)?<span class="ml">/g,
                '</b></span>$1<span class="ml">'
            );

            // 1. <span class="w">...</span> から意味を抽出（単語・熟語共通）
            const wMatches = [...fixedText.matchAll(/<span class="w">([\s\S]*?)<\/span>/g)];
            wMatches.forEach(m => {
                const inner = m[1]
                    .replace(/<[^>]+>/g, "")
                    .replace(/^[\s【]+|[\s】]+$/g, "")
                    .trim();
                if (!inner) return;
                const colonIdx = inner.search(/[：:]/);
                if (colonIdx >= 0) {
                    pushMeaningString(inner.slice(colonIdx + 1));
                } else {
                    pushMeaningString(inner.replace(/^\d+\s*\.\s*/, ""));
                }
            });

            // 2. <span class="w"> がない場合の <b>【...】</b> パターンからの意味抽出
            if (wMatches.length === 0) {
                const withoutMl = fixedText.replace(/<span class="ml">[\s\S]*/g, "");
                const bMatches = [
                    ...withoutMl.matchAll(/<b>\s*【([\s\S]*?)】\s*(?:<\/b>)?/g),
                    ...withoutMl.matchAll(/【([^】]+)】/g)
                ];
                bMatches.forEach(m => {
                    const inner = m[1].replace(/<[^>]+>/g, "").trim();
                    if (!inner) return;
                    const colonIdx = inner.search(/[：:]/);
                    if (colonIdx >= 0) {
                        pushMeaningString(inner.slice(colonIdx + 1));
                    } else {
                        pushMeaningString(inner.replace(/^\d+\s*\.\s*/, ""));
                    }
                });
            }

            // 3. 辞書ページの .ml 要素の内容をすべて抽出（画像は省き、CSSが効くようHTML構造を維持）
            const formattedHtml = nl2br(fixedText);
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = formattedHtml;

            // .ml 内の画像要素（div.sample_image や img）および直後の余分な改行を除去
            tempDiv.querySelectorAll(".sample_image, img").forEach(imgEl => {
                const next = imgEl.nextElementSibling;
                if (next && next.tagName === "BR") {
                    next.remove();
                }
                imgEl.remove();
            });

            const mlEls = Array.from(tempDiv.querySelectorAll<HTMLElement>(".ml")).filter(
                el => !el.parentElement?.closest(".ml")
            );
            mlEls.forEach(el => {
                const inner = el.innerHTML.trim();
                if (inner) {
                    mlHtmlParts.push(inner);
                }
            });
        });
    }

    if (meanings.length === 0 && entry) {
        // 万一特殊フォーマットの熟語等で上記に該当しなかった場合の最終抽出
        const fallbackRaw = String(entry.i2 || entry.i1 || "");
        const beforeMl = fallbackRaw.split(/<span class="ml">/)[0] || "";
        const plain = beforeMl
            .replace(/<[^>]+>/g, "")
            .replace(/^[\s【]+|[\s】]+$/g, "")
            .trim();
        if (plain) {
            const colonIdx = plain.search(/[：:]/);
            const targetPart = colonIdx >= 0 ? plain.slice(colonIdx + 1) : plain.replace(/^\d+\s*\.\s*/, "");
            targetPart
                .split(/\s*[,，、]\s*/)
                .map(s => s.trim())
                .filter(Boolean)
                .forEach(m => meanings.push(m));
        }
    }

    return {
        searchValue: cleanVal,
        word,
        numStr,
        meanings,
        mlHtml: mlHtmlParts.join("<br><br>")
    };
}

let navBadgeEl: HTMLElement | null = null;

function updateNavBadge(): void {
    if (!navBadgeEl) return;
    navBadgeEl.textContent = String(bookmarks.length);
    navBadgeEl.style.display = bookmarks.length > 0 ? "inline-flex" : "none";
}

export function initBookmarkSystem(
    getData: () => DictionaryData,
    getRecentSearches: () => RecentSearchItem[],
    onSelectWord: (searchValue: string) => void,
    onReturnHome: () => void
): void {
    const searchContainer = document.querySelector<HTMLElement>(".search-container");
    if (!searchContainer || !searchContainer.parentElement) return;

    const existingHeader = document.getElementById("siteHeader");
    if (existingHeader) existingHeader.remove();

    const existingFloatingBtn = document.getElementById("openBookmarkModalBtn");
    if (existingFloatingBtn) existingFloatingBtn.remove();

    // ヘッダー要素の生成
    const headerEl = document.createElement("header");
    headerEl.id = "siteHeader";
    headerEl.className = "site-header";
    Object.assign(headerEl.style, {
        width: "95%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "14px 0 6px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        boxSizing: "border-box",
        cursor: "pointer",
        userSelect: "none"
    });

    // 左側：タイトル・ロゴ領域（クリックで初期画面へ）
    const brandArea = document.createElement("div");
    brandArea.className = "site-header-brand";
    Object.assign(brandArea.style, {
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        minWidth: "0",
        transition: "opacity 0.2s ease"
    });

    const brandIconWrap = document.createElement("span");
    Object.assign(brandIconWrap.style, {
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        background: "linear-gradient(135deg, rgba(0, 180, 204, 0.22) 0%, rgba(0, 143, 161, 0.1) 100%)",
        border: "1px solid rgba(0, 180, 204, 0.4)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0"
    });

    const brandIcon = document.createElement("i");
    brandIcon.className = "fa-solid fa-book-open";
    brandIcon.style.color = "#00b4cc";
    brandIcon.style.fontSize = "14px";
    brandIconWrap.appendChild(brandIcon);

    const titleTextWrap = document.createElement("div");
    Object.assign(titleTextWrap.style, {
        display: "flex",
        flexDirection: "column",
        minWidth: "0"
    });

    const mainTitle = document.createElement("span");
    mainTitle.textContent = "単語学習 サポート";
    Object.assign(mainTitle.style, {
        fontSize: "17px",
        fontWeight: "800",
        color: "#f8fafc",
        letterSpacing: "0.03em",
        lineHeight: "1.2",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
    });

    const subTitle = document.createElement("span");
    subTitle.textContent = "語源・コアイメージ";
    Object.assign(subTitle.style, {
        fontSize: "11px",
        color: "#94a3b8",
        lineHeight: "1.2",
        marginTop: "4px"
    });

    titleTextWrap.appendChild(mainTitle);
    titleTextWrap.appendChild(subTitle);
    brandArea.appendChild(brandIconWrap);
    brandArea.appendChild(titleTextWrap);

    // 右端：「★ 単語帳」ボタン（フローティングさせずヘッダー右端に固定配置）
    const openModalBtn = document.createElement("button");
    openModalBtn.type = "button";
    openModalBtn.id = "openBookmarkModalBtn";
    openModalBtn.title = "マイ単語帳・フラッシュカード復習";
    Object.assign(openModalBtn.style, {
        padding: "9px 14px",
        flex: "0 0 auto",
        fontSize: "14px",
        border: "1px solid #334155",
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        borderRadius: "9px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        fontWeight: "700",
        transition: "all 0.2s ease"
    });

    const starIcon = document.createElement("i");
    starIcon.className = "fa-solid fa-star";
    starIcon.style.color = "#fbbf24";

    const btnLabel = document.createElement("span");
    btnLabel.textContent = "単語帳";

    navBadgeEl = document.createElement("span");
    Object.assign(navBadgeEl.style, {
        backgroundColor: "#00b4cc",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "700",
        padding: "1px 6px",
        borderRadius: "999px",
        minWidth: "18px",
        height: "18px",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: "1"
    });

    openModalBtn.appendChild(starIcon);
    openModalBtn.appendChild(btnLabel);
    openModalBtn.appendChild(navBadgeEl);
    updateNavBadge();

    openModalBtn.addEventListener("mouseenter", () => {
        openModalBtn.style.borderColor = "#00b4cc";
        openModalBtn.style.backgroundColor = "#0f172a";
    });
    openModalBtn.addEventListener("mouseleave", () => {
        openModalBtn.style.borderColor = "#334155";
        openModalBtn.style.backgroundColor = "#1e293b";
    });

    openModalBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openBookmarkModal(getData, getRecentSearches, onSelectWord);
    });

    headerEl.addEventListener("mouseenter", (e: MouseEvent) => {
        if (!openModalBtn.contains(e.target as Node)) {
            brandArea.style.opacity = "0.82";
        }
    });
    headerEl.addEventListener("mouseleave", () => {
        brandArea.style.opacity = "1";
    });
    headerEl.addEventListener("click", (e: MouseEvent) => {
        if (openModalBtn.contains(e.target as Node)) return;
        e.preventDefault();
        onReturnHome();
    });

    headerEl.appendChild(brandArea);
    headerEl.appendChild(openModalBtn);

    searchContainer.parentElement.insertBefore(headerEl, searchContainer);

    // 検索窓と検索ボタンがスクロールに追従しないように固定解除
    Object.assign(searchContainer.style, {
        position: "relative",
        top: "auto"
    });

    // Liquid Glass 用のSVGレンズ屈折フィルタ定義（下の要素をガラス曲面に沿って湾曲させる）
    if (!document.getElementById("liquid-glass-svg-defs")) {
        const svgDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgDefs.id = "liquid-glass-svg-defs";
        Object.assign(svgDefs.style, {
            position: "fixed",
            width: "0",
            height: "0",
            pointerEvents: "none",
            opacity: "0"
        });

        const lensMapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><defs><radialGradient id="g" cx="50%" cy="50%" r="54%"><stop offset="0%" stop-color="rgb(128,128,128)"/><stop offset="68%" stop-color="rgb(138,118,128)"/><stop offset="90%" stop-color="rgb(215,40,128)"/><stop offset="100%" stop-color="rgb(255,0,128)"/></radialGradient></defs><rect width="320" height="80" rx="40" fill="url(#g)"/></svg>`;
        const lensMapUri = `data:image/svg+xml;utf8,${encodeURIComponent(lensMapSvg)}`;

        svgDefs.innerHTML = `
            <defs>
                <filter id="liquid-glass-lens" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
                    <feImage href="${lensMapUri}" result="lensMap" preserveAspectRatio="none" />
                    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves="2" seed="3" result="waveNoise" />
                    <feBlend mode="overlay" in="lensMap" in2="waveNoise" result="combinedMap" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="softBg" />
                    <feDisplacementMap in="softBg" in2="combinedMap" scale="22" xChannelSelector="R" yChannelSelector="G" result="refracted" />
                    <feColorMatrix in="refracted" type="saturate" values="1.45" />
                </filter>
            </defs>
        `;
        document.body.appendChild(svgDefs);
    }

    // Liquid Glass ボトムドックおよび検索ポップアップのスタイル定義
    if (!document.getElementById("liquid-glass-dock-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "liquid-glass-dock-style";
        styleEl.textContent = `
            .search-container {
                position: relative !important;
                top: auto !important;
                z-index: 600 !important;
            }
            #suggestionList {
                z-index: 601 !important;
            }
            .liquid-glass-dock {
                position: fixed;
                bottom: max(16px, env(safe-area-inset-bottom, 16px));
                left: 50%;
                transform: translate(-50%, 20px) scale(0.96);
                z-index: 950;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 9px 15px;
                border-radius: 9999px;
                background:
                    radial-gradient(120% 140% at 50% 0%, rgba(255, 255, 255, 0.22) 0%, rgba(15, 23, 42, 0.18) 55%, rgba(15, 23, 42, 0.30) 100%),
                    rgba(15, 23, 42, 0.24);
                backdrop-filter: url(#liquid-glass-lens) blur(4px) saturate(190%) brightness(0.92) contrast(1.08);
                -webkit-backdrop-filter: blur(6px) saturate(200%) brightness(0.92) contrast(1.08);
                border: 1px solid rgba(255, 255, 255, 0.42);
                box-shadow:
                    0 16px 36px rgba(0, 0, 0, 0.40),
                    0 2px 8px rgba(0, 0, 0, 0.24),
                    0 0 0 1px rgba(15, 23, 42, 0.25),
                    inset 0 2px 2px rgba(255, 255, 255, 0.80),
                    inset 0 -2px 3px rgba(255, 255, 255, 0.32),
                    inset 3px 0 6px rgba(56, 189, 248, 0.22),
                    inset -3px 0 6px rgba(255, 255, 255, 0.26),
                    inset 0 0 18px rgba(15, 23, 42, 0.18);
                overflow: hidden;
                opacity: 0;
                pointer-events: none;
                user-select: none;
                transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .liquid-glass-dock::before {
                content: "";
                position: absolute;
                inset: 1px 10px auto 10px;
                height: 42%;
                border-radius: 9999px;
                background: linear-gradient(
                    180deg,
                    rgba(255, 255, 255, 0.42) 0%,
                    rgba(255, 255, 255, 0.06) 65%,
                    rgba(255, 255, 255, 0) 100%
                );
                pointer-events: none;
            }
            .liquid-glass-btn {
                position: relative;
                min-width: 64px;
                height: 50px;
                padding: 6px 14px;
                border-radius: 9999px;
                border: 1px solid rgba(255, 255, 255, 0.38);
                background:
                    radial-gradient(100% 120% at 50% 0%, rgba(255, 255, 255, 0.26) 0%, rgba(15, 23, 42, 0.16) 62%, rgba(15, 23, 42, 0.28) 100%),
                    rgba(15, 23, 42, 0.20);
                box-shadow:
                    0 4px 12px rgba(0, 0, 0, 0.22),
                    0 0 0 1px rgba(15, 23, 42, 0.20),
                    inset 0 1.5px 1.5px rgba(255, 255, 255, 0.82),
                    inset 0 -1.5px 2px rgba(255, 255, 255, 0.28),
                    inset 0 0 10px rgba(15, 23, 42, 0.14);
                backdrop-filter: blur(2.5px) saturate(180%) brightness(0.94);
                -webkit-backdrop-filter: blur(3.5px) saturate(190%) brightness(0.94);
                color: #ffffff;
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                cursor: pointer;
                overflow: hidden;
                transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
                -webkit-tap-highlight-color: transparent;
            }
            .liquid-glass-btn::before {
                content: "";
                position: absolute;
                inset: 1px 6px auto 6px;
                height: 45%;
                border-radius: 9999px;
                background: linear-gradient(
                    180deg,
                    rgba(255, 255, 255, 0.45) 0%,
                    rgba(255, 255, 255, 0.04) 100%
                );
                pointer-events: none;
            }
            .liquid-glass-btn:hover {
                transform: translateY(-2px) scale(1.03);
                border-color: rgba(255, 255, 255, 0.65);
                background:
                    radial-gradient(100% 120% at 50% 0%, rgba(255, 255, 255, 0.34) 0%, rgba(15, 23, 42, 0.18) 65%, rgba(56, 189, 248, 0.22) 100%),
                    rgba(15, 23, 42, 0.24);
                box-shadow:
                    0 8px 18px rgba(0, 0, 0, 0.28),
                    inset 0 2px 2px rgba(255, 255, 255, 0.92),
                    inset 0 -2px 3px rgba(56, 189, 248, 0.38);
            }
            .liquid-glass-btn:active {
                transform: scale(0.93);
            }
            .liquid-glass-btn.is-active-star {
                border-color: rgba(251, 191, 36, 0.72);
                background:
                    radial-gradient(100% 120% at 50% 0%, rgba(251, 191, 36, 0.32) 0%, rgba(15, 23, 42, 0.22) 65%, rgba(251, 191, 36, 0.20) 100%),
                    rgba(15, 23, 42, 0.26);
            }
            .liquid-glass-btn.is-active-search {
                border-color: rgba(56, 189, 248, 0.85);
                background:
                    radial-gradient(100% 120% at 50% 0%, rgba(56, 189, 248, 0.38) 0%, rgba(15, 23, 42, 0.22) 65%, rgba(0, 180, 204, 0.28) 100%),
                    rgba(15, 23, 42, 0.28);
            }
            .liquid-glass-btn i {
                position: relative;
                z-index: 1;
                font-size: 16px;
                line-height: 1;
                color: #ffffff;
                filter:
                    drop-shadow(0 0 2px rgba(15, 23, 42, 0.95))
                    drop-shadow(0 1px 4px rgba(0, 0, 0, 0.85));
                transition: transform 0.2s ease, color 0.2s ease;
            }
            .liquid-glass-btn .liquid-btn-label {
                position: relative;
                z-index: 1;
                font-size: 10.5px;
                font-weight: 700;
                letter-spacing: 0.03em;
                line-height: 1;
                color: #ffffff;
                text-shadow:
                    0 0 2px rgba(15, 23, 42, 0.98),
                    0 1px 3px rgba(0, 0, 0, 0.90),
                    0 0 6px rgba(15, 23, 42, 0.75);
                white-space: nowrap;
            }
            /* 虫眼鏡から飛び出す・吸い込まれる Liquid Glass 検索パネル */
            .liquid-search-popup {
                position: fixed;
                bottom: calc(max(16px, env(safe-area-inset-bottom, 16px)) + 78px);
                left: 50%;
                width: min(92vw, 440px);
                z-index: 955;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 12px;
                border-radius: 26px;
                background:
                    radial-gradient(120% 140% at 50% 0%, rgba(255, 255, 255, 0.24) 0%, rgba(15, 23, 42, 0.22) 55%, rgba(15, 23, 42, 0.36) 100%),
                    rgba(15, 23, 42, 0.28);
                backdrop-filter: url(#liquid-glass-lens) blur(5px) saturate(195%) brightness(0.92) contrast(1.08);
                -webkit-backdrop-filter: blur(8px) saturate(200%) brightness(0.92) contrast(1.08);
                border: 1px solid rgba(255, 255, 255, 0.44);
                box-shadow:
                    0 18px 42px rgba(0, 0, 0, 0.45),
                    0 2px 10px rgba(0, 0, 0, 0.28),
                    0 0 0 1px rgba(15, 23, 42, 0.28),
                    inset 0 2px 2px rgba(255, 255, 255, 0.82),
                    inset 0 -2px 3px rgba(255, 255, 255, 0.30),
                    inset 3px 0 6px rgba(56, 189, 248, 0.22),
                    inset -3px 0 6px rgba(255, 255, 255, 0.24);
                box-sizing: border-box;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transform: translate(-50%, 24px) scale(0.06);
                transition:
                    transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1),
                    opacity 0.22s ease,
                    visibility 0.34s;
            }
            .liquid-search-popup.is-open {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
                transform: translate(-50%, 0) scale(1);
            }
            .liquid-search-popup.is-closing {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transform: translate(-50%, 24px) scale(0.05);
                transition:
                    transform 0.26s cubic-bezier(0.36, 0, 0.66, -0.2),
                    opacity 0.20s ease,
                    visibility 0.26s;
            }
            .liquid-search-bar-row {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
            }
            .liquid-search-input-wrap {
                position: relative;
                flex: 1 1 auto;
                min-width: 0;
                display: flex;
                align-items: center;
            }
            .liquid-search-input {
                width: 100%;
                height: 44px;
                padding: 0 16px;
                border-radius: 9999px;
                border: 1px solid rgba(255, 255, 255, 0.42);
                background:
                    radial-gradient(100% 120% at 50% 0%, rgba(255, 255, 255, 0.22) 0%, rgba(15, 23, 42, 0.24) 100%),
                    rgba(15, 23, 42, 0.28);
                box-shadow:
                    inset 0 1.5px 2px rgba(0, 0, 0, 0.35),
                    inset 0 -1px 1.5px rgba(255, 255, 255, 0.45);
                color: #ffffff;
                font-size: 16px;
                font-weight: 600;
                outline: none;
                box-sizing: border-box;
                text-shadow: 0 1px 2px rgba(15, 23, 42, 0.9);
            }
            .liquid-search-input::placeholder {
                color: rgba(241, 245, 249, 0.78);
                text-shadow: 0 1px 2px rgba(15, 23, 42, 0.85);
            }
            .liquid-search-input:focus {
                border-color: rgba(56, 189, 248, 0.9);
                box-shadow:
                    0 0 0 2px rgba(56, 189, 248, 0.28),
                    inset 0 1.5px 2px rgba(0, 0, 0, 0.35),
                    inset 0 -1px 1.5px rgba(255, 255, 255, 0.6);
            }
            .liquid-search-submit-btn {
                height: 44px;
                padding: 0 18px;
                border-radius: 9999px;
                border: 1px solid rgba(255, 255, 255, 0.46);
                background:
                    radial-gradient(100% 120% at 50% 0%, rgba(56, 189, 248, 0.45) 0%, rgba(0, 180, 204, 0.28) 65%, rgba(15, 23, 42, 0.35) 100%),
                    rgba(0, 180, 204, 0.25);
                box-shadow:
                    0 4px 12px rgba(0, 0, 0, 0.25),
                    inset 0 1.5px 1.5px rgba(255, 255, 255, 0.85),
                    inset 0 -1.5px 2px rgba(255, 255, 255, 0.30);
                color: #ffffff;
                font-size: 14px;
                font-weight: 800;
                letter-spacing: 0.03em;
                white-space: nowrap;
                cursor: pointer;
                flex-shrink: 0;
                text-shadow:
                    0 0 2px rgba(15, 23, 42, 0.98),
                    0 1px 3px rgba(0, 0, 0, 0.90);
                transition: transform 0.15s ease, border-color 0.2s ease;
            }
            .liquid-search-submit-btn:hover {
                transform: translateY(-1px);
                border-color: rgba(255, 255, 255, 0.78);
            }
            .liquid-search-submit-btn:active {
                transform: scale(0.94);
            }
            .liquid-search-history-list {
                list-style: none;
                margin: 0;
                padding: 4px;
                max-height: min(34vh, 220px);
                overflow-y: auto;
                overscroll-behavior: contain;
                border-radius: 18px;
                background: rgba(15, 23, 42, 0.32);
                border: 1px solid rgba(255, 255, 255, 0.24);
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
                scrollbar-width: thin;
                scrollbar-color: rgba(56, 189, 248, 0.55) transparent;
            }
            .liquid-search-history-list:empty {
                display: none;
            }
            .liquid-search-history-header {
                padding: 5px 12px 4px 12px;
                font-size: 11px;
                font-weight: 700;
                color: #bae6fd;
                text-shadow: 0 1px 2px rgba(15, 23, 42, 0.95);
                letter-spacing: 0.03em;
            }
            .liquid-search-history-item {
                padding: 9px 12px;
                border-radius: 12px;
                color: #ffffff;
                font-size: 14.5px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                text-shadow:
                    0 0 2px rgba(15, 23, 42, 0.98),
                    0 1px 3px rgba(0, 0, 0, 0.88);
                transition: background 0.15s ease;
            }
            .liquid-search-history-item:hover,
            .liquid-search-history-item:active {
                background: rgba(56, 189, 248, 0.25);
            }
            @media (max-width: 480px) {
                .liquid-glass-dock {
                    gap: 7px;
                    padding: 7px 11px;
                }
                .liquid-glass-btn {
                    min-width: 58px;
                    height: 46px;
                    padding: 5px 11px;
                }
                .liquid-glass-btn i {
                    font-size: 15px;
                }
                .liquid-glass-btn .liquid-btn-label {
                    font-size: 10px;
                }
                .liquid-search-popup {
                    bottom: calc(max(16px, env(safe-area-inset-bottom, 16px)) + 72px);
                    padding: 10px;
                    border-radius: 22px;
                }
            }
        `;
        document.head.appendChild(styleEl);
    }

    const existingDock = document.getElementById("liquidGlassBottomDock");
    if (existingDock) existingDock.remove();

    const existingSearchPopup = document.getElementById("liquidGlassSearchPopup");
    if (existingSearchPopup) existingSearchPopup.remove();

    dockEl = document.createElement("nav");
    dockEl.id = "liquidGlassBottomDock";
    dockEl.className = "liquid-glass-dock";
    dockEl.setAttribute("aria-label", "クイックアクション");

    // ドック上のタップ・クリックが背後要素に貫通しないように遮断
    ["pointerdown", "mousedown", "touchstart", "touchend", "click"].forEach(evtName => {
        dockEl!.addEventListener(evtName, (e: Event) => {
            e.stopPropagation();
        });
    });

    const createDockButton = (iconClass: string, labelText: string): HTMLButtonElement => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "liquid-glass-btn";

        const icon = document.createElement("i");
        icon.className = iconClass;

        const label = document.createElement("span");
        label.className = "liquid-btn-label";
        label.textContent = labelText;

        btn.appendChild(icon);
        btn.appendChild(label);
        return btn;
    };

    // --- Liquid Glass 検索ポップアップ（検索窓・検索ボタン・検索履歴）の構築 ---
    const searchPopupEl = document.createElement("div");
    searchPopupEl.id = "liquidGlassSearchPopup";
    searchPopupEl.className = "liquid-search-popup";

    // 背景要素へのクリック・タップ貫通を防止
    ["pointerdown", "mousedown", "touchstart", "click"].forEach(evtName => {
        searchPopupEl.addEventListener(evtName, (e: Event) => {
            e.stopPropagation();
        });
    });

    const searchBarRow = document.createElement("div");
    searchBarRow.className = "liquid-search-bar-row";

    const searchInputWrap = document.createElement("div");
    searchInputWrap.className = "liquid-search-input-wrap";

    const liquidInput = document.createElement("input");
    liquidInput.type = "text";
    liquidInput.className = "liquid-search-input";
    liquidInput.placeholder = "単語・熟語番号を入力...";
    liquidInput.autocomplete = "off";
    liquidInput.autocapitalize = "off";
    liquidInput.spellcheck = false;

    const liquidSubmitBtn = document.createElement("button");
    liquidSubmitBtn.type = "button";
    liquidSubmitBtn.className = "liquid-search-submit-btn";
    liquidSubmitBtn.textContent = "検索";

    const liquidHistoryList = document.createElement("ul");
    liquidHistoryList.className = "liquid-search-history-list";

    searchInputWrap.appendChild(liquidInput);
    searchBarRow.appendChild(searchInputWrap);
    searchBarRow.appendChild(liquidSubmitBtn);
    searchPopupEl.appendChild(searchBarRow);
    searchPopupEl.appendChild(liquidHistoryList);
    document.body.appendChild(searchPopupEl);

    // タップ・クリック後のゴーストクリック貫通を防ぐ一時シールド関数
    const blockGhostClickThrough = (): void => {
        const shield = document.createElement("div");
        Object.assign(shield.style, {
            position: "fixed",
            inset: "0",
            zIndex: "9998",
            background: "transparent",
            pointerEvents: "auto"
        });
        const swallow = (ev: Event): void => {
            ev.preventDefault();
            ev.stopPropagation();
        };
        ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"].forEach(
            type => shield.addEventListener(type, swallow, { passive: false })
        );
        document.body.appendChild(shield);
        setTimeout(() => {
            shield.remove();
        }, 360);
    };

    // 1. 虫眼鏡アイコン + 検索
    const searchDockBtn = createDockButton("fa-solid fa-magnifying-glass", "検索");
    let isLiquidSearchOpen = false;
    let closeAnimTimer: ReturnType<typeof setTimeout> | null = null;

    // 虫眼鏡ボタンの中心座標を基準に transform-origin を計算（ひょいっと飛び出し・吸い込まれる起点）
    const updatePopupOriginToSearchBtn = (): void => {
        const btnRect = searchDockBtn.getBoundingClientRect();
        const popWidth = Math.min(window.innerWidth * 0.92, 440);
        const popLeft = (window.innerWidth - popWidth) / 2;
        const originX = Math.max(24, Math.min(popWidth - 24, btnRect.left + btnRect.width / 2 - popLeft));
        searchPopupEl.style.transformOrigin = `${Math.round(originX)}px calc(100% + 42px)`;
    };

    // 検索履歴・入力候補リストの描画
    const renderLiquidSuggestions = (): void => {
        liquidHistoryList.innerHTML = "";
        const rawQuery = liquidInput.value.trim();

        if (!rawQuery) {
            const recent = getRecentSearches();
            if (recent.length === 0) return;

            const headerLi = document.createElement("li");
            headerLi.className = "liquid-search-history-header";
            headerLi.textContent = "最近の検索履歴";
            liquidHistoryList.appendChild(headerLi);

            recent.forEach(item => {
                const li = document.createElement("li");
                li.className = "liquid-search-history-item";
                li.innerHTML = `
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.label}</span>
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 12px; opacity: 0.75; flex-shrink: 0;"></i>
                `;
                const triggerSelect = (ev: Event): void => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    executeLiquidSearch(item.searchValue);
                };
                li.addEventListener("click", triggerSelect);
                liquidHistoryList.appendChild(li);
            });
            return;
        }

        const dict = getData();
        const isNum = /^[0-9]+$/.test(rawQuery);
        const matches: { label: string; searchValue: string }[] = [];

        if (isNum) {
            (dict.idioms || []).forEach(item => {
                if (item.num !== undefined && String(item.num).startsWith(rawQuery)) {
                    matches.push({
                        label: `${item.num}. ${item.word}`,
                        searchValue: String(item.num)
                    });
                }
            });
        } else {
            const lowerQ = rawQuery.toLowerCase();
            const words = dict.words || [];
            words.forEach(item => {
                if (item.word && String(item.word).toLowerCase().startsWith(lowerQ)) {
                    matches.push({
                        label: String(item.word),
                        searchValue: String(item.word)
                    });
                }
            });
            if (matches.length < 15) {
                words.forEach(item => {
                    const w = String(item.word || "");
                    if (w && !w.toLowerCase().startsWith(lowerQ) && w.toLowerCase().includes(lowerQ)) {
                        matches.push({
                            label: w,
                            searchValue: w
                        });
                    }
                });
            }
        }

        matches.slice(0, 15).forEach(m => {
            const li = document.createElement("li");
            li.className = "liquid-search-history-item";
            li.innerHTML = `
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.label}</span>
                <i class="fa-solid fa-magnifying-glass" style="font-size: 11px; opacity: 0.7; flex-shrink: 0;"></i>
            `;
            const triggerSelect = (ev: Event): void => {
                ev.preventDefault();
                ev.stopPropagation();
                executeLiquidSearch(m.searchValue);
            };
            li.addEventListener("click", triggerSelect);
            liquidHistoryList.appendChild(li);
        });
    };

    // 背景部分をタップ・クリックした際に、背後への貫通を防ぎつつ虫眼鏡へ吸い込んで閉じる
    const onOutsideSearchPointerDown = (e: PointerEvent): void => {
        if (!isLiquidSearchOpen) return;
        const target = e.target as Node | null;
        if (target && (searchPopupEl.contains(target) || (dockEl && dockEl.contains(target)))) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        blockGhostClickThrough();
        suckIntoMagnifierAndClose();
    };

    // 虫眼鏡ボタンへ吸い込まれるアニメーションで閉じる（入力文字もリセット）
    const suckIntoMagnifierAndClose = (): void => {
        if (!isLiquidSearchOpen) return;
        isLiquidSearchOpen = false;
        document.removeEventListener("pointerdown", onOutsideSearchPointerDown, true);
        searchDockBtn.classList.remove("is-active-search");
        liquidInput.value = "";
        liquidInput.blur();

        updatePopupOriginToSearchBtn();
        searchPopupEl.classList.remove("is-open");
        searchPopupEl.classList.add("is-closing");

        if (closeAnimTimer) clearTimeout(closeAnimTimer);
        closeAnimTimer = setTimeout(() => {
            searchPopupEl.classList.remove("is-closing");
            liquidHistoryList.innerHTML = "";
        }, 270);
    };

    // 検索実行時などに即座に非表示にして入力文字をクリア
    closeLiquidSearchImmediate = (): void => {
        isLiquidSearchOpen = false;
        document.removeEventListener("pointerdown", onOutsideSearchPointerDown, true);
        searchDockBtn.classList.remove("is-active-search");
        if (closeAnimTimer) {
            clearTimeout(closeAnimTimer);
            closeAnimTimer = null;
        }
        liquidInput.value = "";
        liquidInput.blur();
        liquidHistoryList.innerHTML = "";
        searchPopupEl.classList.remove("is-open", "is-closing");
    };

    const executeLiquidSearch = (rawTarget: string): void => {
        const target = rawTarget.trim();
        if (!target) return;
        blockGhostClickThrough();
        if (closeLiquidSearchImmediate) {
            closeLiquidSearchImmediate();
        }
        onSelectWord(target);
    };

    liquidInput.addEventListener("input", () => {
        renderLiquidSuggestions();
    });

    liquidInput.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            executeLiquidSearch(liquidInput.value);
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            suckIntoMagnifierAndClose();
        }
    });

    liquidSubmitBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        executeLiquidSearch(liquidInput.value);
    });

    searchDockBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLiquidSearchOpen) {
            // 入力途中でもう一度虫眼鏡ボタンを押したら、虫眼鏡ボタンに吸い込まれて消える（文字も消去）
            suckIntoMagnifierAndClose();
            return;
        }

        // 開くときは常に空の状態から開始し、虫眼鏡ボタンからひょいっと飛び出して即座にフォーカス
        if (closeAnimTimer) {
            clearTimeout(closeAnimTimer);
            closeAnimTimer = null;
        }
        liquidInput.value = "";
        renderLiquidSuggestions();
        updatePopupOriginToSearchBtn();

        isLiquidSearchOpen = true;
        searchDockBtn.classList.add("is-active-search");
        searchPopupEl.classList.remove("is-closing");
        searchPopupEl.classList.add("is-open");
        document.addEventListener("pointerdown", onOutsideSearchPointerDown, true);

        // モバイルでも即座にキーボードが立ち上がるよう同期フォーカス
        liquidInput.focus({ preventScroll: true });
    });

    // 2. 星アイコン + 登録
    dockStarBtn = createDockButton("fa-regular fa-star", "登録");
    dockStarBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentDockEntry) return;
        toggleBookmark(currentDockEntry, currentDockIsNumber);
        syncPageBookmarkButtons();
    });

    // 3. 本アイコン + テスト
    const testDockBtn = createDockButton("fa-solid fa-book", "テスト");
    testDockBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLiquidSearchOpen && closeLiquidSearchImmediate) {
            closeLiquidSearchImmediate();
        }
        openBookmarkModal(getData, getRecentSearches, onSelectWord, "card");
    });

    // 4. メガホンアイコン + 発音
    const pronDockBtn = createDockButton("fa-solid fa-bullhorn", "発音");
    pronDockBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const mainAudioBtn =
            document.querySelector<HTMLElement>("#results .entry .w-p4-header .audio_button") ||
            document.querySelector<HTMLElement>("#results .entry .audio_button");
        if (mainAudioBtn) {
            mainAudioBtn.click();
        }
    });

    dockEl.appendChild(searchDockBtn);
    dockEl.appendChild(dockStarBtn);
    dockEl.appendChild(testDockBtn);
    dockEl.appendChild(pronDockBtn);

    document.body.appendChild(dockEl);
}

function openBookmarkModal(
    getData: () => DictionaryData,
    getRecentSearches: () => RecentSearchItem[],
    onSelectWord: (searchValue: string) => void,
    initialTab: "list" | "card" = "list"
): void {
    const existing = document.getElementById("bookmark-review-modal") as
        | (HTMLElement & { __closeModal?: () => void })
        | null;
    if (existing) {
        if (typeof existing.__closeModal === "function") {
            existing.__closeModal();
        } else {
            existing.remove();
        }
    }

    // iPhoneの上下バー領域（セーフエリア外）まで描画を広げるため viewport-fit=cover を確実に付与
    const vpMeta = document.querySelector<HTMLMetaElement>("meta[name=viewport]");
    if (vpMeta) {
        const content = vpMeta.getAttribute("content") || "";
        if (!content.includes("viewport-fit=cover")) {
            vpMeta.setAttribute(
                "content",
                content ? `${content}, viewport-fit=cover` : "width=device-width, initial-scale=1.0, viewport-fit=cover"
            );
        }
    }

    // 画面外（上下URLバー・ツールバー裏）まで完全に覆うマスクおよびモーダル内スクロールバーのスタイル定義
    if (!document.getElementById("bookmark-modal-fullscreen-style")) {
        const modalStyle = document.createElement("style");
        modalStyle.id = "bookmark-modal-fullscreen-style";
        modalStyle.textContent = `
            #bookmark-review-modal::before {
                content: "";
                position: fixed;
                top: -100vh;
                left: -100vw;
                width: 300vw;
                height: 300vh;
                background-color: rgba(0, 0, 0, 0.78);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                pointer-events: none;
                z-index: -1;
            }
            .bookmark-modal-body-scroll {
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 180, 204, 0.5) rgba(15, 23, 42, 0.6);
            }
            .bookmark-modal-body-scroll::-webkit-scrollbar {
                width: 6px;
            }
            .bookmark-modal-body-scroll::-webkit-scrollbar-track {
                background: rgba(15, 23, 42, 0.6);
                border-radius: 999px;
                margin: 6px 0;
            }
            .bookmark-modal-body-scroll::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(0, 180, 204, 0.65) 0%, rgba(56, 189, 248, 0.45) 100%);
                border-radius: 999px;
                border: 1px solid rgba(15, 23, 42, 0.4);
            }
            .bookmark-modal-body-scroll::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, #00b4cc 0%, #38bdf8 100%);
            }
            .bookmark-modal-body-scroll::-webkit-scrollbar-corner {
                background: transparent;
            }
        `;
        document.head.appendChild(modalStyle);
    }

    // iOS Safariの上下バー着色（ティント）をマスク合成色に同期し、背景スクロールをロック
    const computeMaskedBgColor = (): string => {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor || "";
        const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor || "";
        const rawBg = bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent" ? bodyBg : htmlBg;
        const match = rawBg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (match) {
            const r = Math.round(Number(match[1]) * 0.22);
            const g = Math.round(Number(match[2]) * 0.22);
            const b = Math.round(Number(match[3]) * 0.22);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return "#04060b";
    };

    const maskedBarColor = computeMaskedBgColor();
    let themeMeta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    const hadThemeMeta = Boolean(themeMeta);
    const prevThemeContent = themeMeta ? themeMeta.getAttribute("content") : null;
    if (!themeMeta) {
        themeMeta = document.createElement("meta");
        themeMeta.name = "theme-color";
        document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", maskedBarColor);

    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.backgroundColor = maskedBarColor;
    document.body.style.overflow = "hidden";

    const overlay = document.createElement("div") as HTMLElement & { __closeModal?: () => void };
    overlay.id = "bookmark-review-modal";
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100dvh",
        zIndex: "9999",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px",
        boxSizing: "border-box"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
        width: "100%",
        maxWidth: "680px",
        maxHeight: "calc(100% - 32px)",
        margin: "auto",
        backgroundColor: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "14px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#f8fafc"
    });

    // 現在ユーザーに見えている画面領域（Visual Viewport）の中央に常時合わせる
    const syncOverlayToViewport = (): void => {
        const vv = window.visualViewport;
        if (vv) {
            overlay.style.top = `${vv.offsetTop}px`;
            overlay.style.left = `${vv.offsetLeft}px`;
            overlay.style.width = `${vv.width}px`;
            overlay.style.height = `${vv.height}px`;
        } else {
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = `${window.innerWidth}px`;
            overlay.style.height = `${window.innerHeight}px`;
        }
    };
    syncOverlayToViewport();
    window.addEventListener("resize", syncOverlayToViewport);
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncOverlayToViewport);
        window.visualViewport.addEventListener("scroll", syncOverlayToViewport);
    }

    // ヘッダーとモード切替タブ
    const header = document.createElement("div");
    Object.assign(header.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "8px",
        flexWrap: "nowrap",
        flexShrink: "0",
        padding: "clamp(10px, 2.8vw, 14px) clamp(12px, 3.5vw, 18px)",
        borderBottom: "1px solid #1e293b",
        backgroundColor: "#1e293b"
    });

    const tabGroup = document.createElement("div");
    Object.assign(tabGroup.style, {
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        minWidth: "0",
        gap: "clamp(6px, 1.8vw, 8px)"
    });

    const listTabBtn = document.createElement("button");
    listTabBtn.type = "button";
    listTabBtn.textContent = "★ 保存一覧";

    const cardTabBtn = document.createElement("button");
    cardTabBtn.type = "button";
    cardTabBtn.textContent = "フラッシュカード復習";

    const styleTab = (btn: HTMLButtonElement, active: boolean): void => {
        Object.assign(btn.style, {
            padding: "clamp(6px, 1.8vw, 8px) clamp(10px, 2.8vw, 14px)",
            fontSize: "clamp(12px, 3.3vw, 14px)",
            fontWeight: "700",
            lineHeight: "1.2",
            whiteSpace: "nowrap",
            borderRadius: "8px",
            border: active ? "1px solid #00b4cc" : "1px solid transparent",
            backgroundColor: active ? "rgba(0, 180, 204, 0.18)" : "transparent",
            color: active ? "#38bdf8" : "#94a3b8",
            cursor: "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease"
        });
    };

    tabGroup.appendChild(listTabBtn);
    tabGroup.appendChild(cardTabBtn);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "clamp(28px, 7.5vw, 32px)",
        height: "clamp(28px, 7.5vw, 32px)",
        flexShrink: "0",
        background: "transparent",
        border: "none",
        borderRadius: "6px",
        color: "#94a3b8",
        fontSize: "clamp(20px, 5.5vw, 24px)",
        lineHeight: "1",
        cursor: "pointer",
        padding: "0"
    });

    header.appendChild(tabGroup);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const bodyArea = document.createElement("div");
    bodyArea.className = "bookmark-modal-body-scroll";
    Object.assign(bodyArea.style, {
        padding: "clamp(12px, 3.5vw, 18px)",
        overflowY: "auto",
        overscrollBehavior: "contain",
        flex: "1 1 auto"
    });
    panel.appendChild(bodyArea);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // フラッシュカード用の状態
    let activeTab: "list" | "card" = initialTab;
    let cardSource: "bookmarks" | "recent" = bookmarks.length > 0 ? "bookmarks" : "recent";
    let cardDirection: "en-to-ja" | "ja-to-en" = "en-to-ja";
    let deck: FlashcardData[] = [];
    let currentCardIndex = 0;
    let isCardFlipped = false;
    let toggleCardFlip: (() => void) | null = null;
    let navigateCard: ((dir: "prev" | "next") => void) | null = null;

    const closeModal = (): void => {
        window.removeEventListener("keydown", handleModalKeydown);
        window.removeEventListener("resize", syncOverlayToViewport);
        if (window.visualViewport) {
            window.visualViewport.removeEventListener("resize", syncOverlayToViewport);
            window.visualViewport.removeEventListener("scroll", syncOverlayToViewport);
        }
        document.documentElement.style.backgroundColor = prevHtmlBg;
        document.body.style.overflow = prevBodyOverflow;
        if (themeMeta) {
            if (hadThemeMeta) {
                if (prevThemeContent !== null) {
                    themeMeta.setAttribute("content", prevThemeContent);
                } else {
                    themeMeta.removeAttribute("content");
                }
            } else {
                themeMeta.remove();
            }
        }
        overlay.remove();
    };
    overlay.__closeModal = closeModal;

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e: MouseEvent) => {
        if (e.target === overlay) closeModal();
    });

    // 一覧タブの描画
    const renderListView = (): void => {
        styleTab(listTabBtn, true);
        styleTab(cardTabBtn, false);
        bodyArea.innerHTML = "";

        if (bookmarks.length === 0) {
            const emptyMsg = document.createElement("div");
            Object.assign(emptyMsg.style, {
                textAlign: "center",
                padding: "clamp(28px, 7vw, 40px) clamp(12px, 3.5vw, 16px)",
                color: "#94a3b8"
            });
            emptyMsg.innerHTML = `
                <div style="font-size: clamp(14px, 3.8vw, 16px); margin-bottom: 8px; color: #cbd5e1;">まだ単語が保存されていません</div>
                <div style="font-size: clamp(12px, 3.2vw, 13px); line-height: 1.5;">各単語の見出し右上にある「☆ 単語帳」ボタンを押すと、ここに保存されます。</div>
            `;
            bodyArea.appendChild(emptyMsg);
            return;
        }

        const listHeader = document.createElement("div");
        Object.assign(listHeader.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            marginBottom: "clamp(10px, 2.6vw, 12px)",
            padding: "0 2px"
        });

        const countLabel = document.createElement("div");
        Object.assign(countLabel.style, {
            fontSize: "clamp(12px, 3.2vw, 13px)",
            fontWeight: "600",
            color: "#94a3b8"
        });
        countLabel.innerHTML = `保存件数: <span style="color: #38bdf8; font-weight: 700;">${bookmarks.length}</span> 件`;

        const clearAllBtn = document.createElement("button");
        clearAllBtn.type = "button";
        Object.assign(clearAllBtn.style, {
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "clamp(4px, 1.2vw, 6px) clamp(9px, 2.5vw, 12px)",
            fontSize: "clamp(11px, 3vw, 12px)",
            fontWeight: "600",
            lineHeight: "1.2",
            whiteSpace: "nowrap",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "6px",
            cursor: "pointer",
            flexShrink: "0",
            transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
        });

        const trashIcon = document.createElement("i");
        trashIcon.className = "fa-regular fa-trash-can";
        trashIcon.style.fontSize = "clamp(10px, 2.8vw, 11px)";

        const clearAllText = document.createElement("span");
        clearAllText.textContent = "一括削除";

        clearAllBtn.appendChild(trashIcon);
        clearAllBtn.appendChild(clearAllText);

        clearAllBtn.addEventListener("mouseenter", () => {
            clearAllBtn.style.backgroundColor = "rgba(239, 68, 68, 0.28)";
            clearAllBtn.style.borderColor = "rgba(248, 113, 113, 0.65)";
            clearAllBtn.style.color = "#fecaca";
        });
        clearAllBtn.addEventListener("mouseleave", () => {
            clearAllBtn.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
            clearAllBtn.style.borderColor = "rgba(239, 68, 68, 0.35)";
            clearAllBtn.style.color = "#f87171";
        });

        clearAllBtn.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const existingConfirm = document.getElementById("bookmark-clear-confirm-overlay");
            if (existingConfirm) existingConfirm.remove();

            const confirmOverlay = document.createElement("div");
            confirmOverlay.id = "bookmark-clear-confirm-overlay";
            Object.assign(confirmOverlay.style, {
                position: "fixed",
                inset: "0",
                backgroundColor: "rgba(2, 6, 23, 0.72)",
                backdropFilter: "blur(3px)",
                zIndex: "10001",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "16px",
                boxSizing: "border-box"
            });

            const confirmBox = document.createElement("div");
            Object.assign(confirmBox.style, {
                width: "100%",
                maxWidth: "340px",
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "12px",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.7)",
                padding: "clamp(16px, 4.5vw, 22px)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                textAlign: "center",
                color: "#f8fafc"
            });

            const titleRow = document.createElement("div");
            Object.assign(titleRow.style, {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "clamp(15px, 4.2vw, 17px)",
                fontWeight: "700",
                color: "#f87171"
            });

            const warnIcon = document.createElement("i");
            warnIcon.className = "fa-solid fa-triangle-exclamation";
            const titleText = document.createElement("span");
            titleText.textContent = "一括削除の確認";
            titleRow.appendChild(warnIcon);
            titleRow.appendChild(titleText);

            const descText = document.createElement("div");
            Object.assign(descText.style, {
                fontSize: "clamp(12px, 3.4vw, 13.5px)",
                lineHeight: "1.6",
                color: "#cbd5e1"
            });
            descText.innerHTML = `保存されている <span style="color: #38bdf8; font-weight: 700;">${bookmarks.length}</span> 件の単語をすべて削除しますか？`;

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, {
                display: "flex",
                gap: "10px",
                marginTop: "6px"
            });

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.textContent = "キャンセル";
            Object.assign(cancelBtn.style, {
                flex: "1 1 0",
                padding: "9px 12px",
                fontSize: "clamp(12px, 3.4vw, 13px)",
                fontWeight: "600",
                backgroundColor: "#1e293b",
                color: "#cbd5e1",
                border: "1px solid #475569",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
            });
            cancelBtn.addEventListener("mouseenter", () => {
                cancelBtn.style.backgroundColor = "#334155";
                cancelBtn.style.color = "#ffffff";
            });
            cancelBtn.addEventListener("mouseleave", () => {
                cancelBtn.style.backgroundColor = "#1e293b";
                cancelBtn.style.color = "#cbd5e1";
            });

            const confirmDelBtn = document.createElement("button");
            confirmDelBtn.type = "button";
            confirmDelBtn.textContent = "すべて削除";
            Object.assign(confirmDelBtn.style, {
                flex: "1 1 0",
                padding: "9px 12px",
                fontSize: "clamp(12px, 3.4vw, 13px)",
                fontWeight: "700",
                backgroundColor: "rgba(239, 68, 68, 0.22)",
                color: "#fca5a5",
                border: "1px solid rgba(248, 113, 113, 0.55)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
            });
            confirmDelBtn.addEventListener("mouseenter", () => {
                confirmDelBtn.style.backgroundColor = "rgba(239, 68, 68, 0.38)";
                confirmDelBtn.style.borderColor = "#f87171";
                confirmDelBtn.style.color = "#ffffff";
            });
            confirmDelBtn.addEventListener("mouseleave", () => {
                confirmDelBtn.style.backgroundColor = "rgba(239, 68, 68, 0.22)";
                confirmDelBtn.style.borderColor = "rgba(248, 113, 113, 0.55)";
                confirmDelBtn.style.color = "#fca5a5";
            });

            cancelBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.preventDefault();
                ev.stopPropagation();
                confirmOverlay.remove();
            });

            confirmOverlay.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                if (ev.target === confirmOverlay) {
                    confirmOverlay.remove();
                }
            });

            confirmDelBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.preventDefault();
                ev.stopPropagation();
                confirmOverlay.remove();
                bookmarks = [];
                saveBookmarksToStorage();
                updateNavBadge();
                syncPageBookmarkButtons();
                renderListView();
            });

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(confirmDelBtn);
            confirmBox.appendChild(titleRow);
            confirmBox.appendChild(descText);
            confirmBox.appendChild(btnRow);
            confirmOverlay.appendChild(confirmBox);
            overlay.appendChild(confirmOverlay);
        });

        listHeader.appendChild(countLabel);
        listHeader.appendChild(clearAllBtn);
        bodyArea.appendChild(listHeader);

        const data = getData();
        const listEl = document.createElement("div");
        Object.assign(listEl.style, {
            display: "flex",
            flexDirection: "column",
            gap: "clamp(6px, 1.8vw, 8px)"
        });

        bookmarks.forEach(item => {
            const cardInfo = buildFlashcardData(item.searchValue, item.word, data);
            const row = document.createElement("div");
            Object.assign(row.style, {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "clamp(10px, 2.6vw, 12px) clamp(10px, 3vw, 14px)",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                cursor: "pointer",
                gap: "clamp(8px, 2.5vw, 12px)",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease, background-color 0.15s ease"
            });

            row.addEventListener("mouseenter", () => {
                row.style.borderColor = "#00b4cc";
            });
            row.addEventListener("mouseleave", () => {
                row.style.borderColor = "#334155";
            });

            const leftCol = document.createElement("div");
            Object.assign(leftCol.style, {
                display: "flex",
                flexDirection: "column",
                flex: "1 1 auto",
                minWidth: "0",
                gap: "clamp(2px, 0.8vw, 4px)",
                overflow: "hidden"
            });

            const wordLine = document.createElement("div");
            Object.assign(wordLine.style, {
                fontSize: "clamp(15px, 4.2vw, 17px)",
                fontWeight: "700",
                lineHeight: "1.3",
                color: "#f8fafc",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            });
            wordLine.textContent = item.numStr ? `${item.numStr}. ${item.word}` : item.word;

            const meaningLine = document.createElement("div");
            Object.assign(meaningLine.style, {
                fontSize: "clamp(12px, 3.2vw, 13px)",
                lineHeight: "1.3",
                color: "#94a3b8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            });
            meaningLine.textContent = cardInfo ? cardInfo.meanings.join(" / ") : "";

            leftCol.appendChild(wordLine);
            leftCol.appendChild(meaningLine);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.textContent = "削除";
            Object.assign(delBtn.style, {
                padding: "clamp(4px, 1.2vw, 6px) clamp(8px, 2.4vw, 11px)",
                fontSize: "clamp(11px, 3vw, 12px)",
                fontWeight: "600",
                lineHeight: "1.2",
                whiteSpace: "nowrap",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "6px",
                cursor: "pointer",
                flexShrink: "0",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
            });

            delBtn.addEventListener("mouseenter", () => {
                delBtn.style.backgroundColor = "rgba(239, 68, 68, 0.28)";
                delBtn.style.borderColor = "rgba(248, 113, 113, 0.65)";
                delBtn.style.color = "#fecaca";
            });
            delBtn.addEventListener("mouseleave", () => {
                delBtn.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
                delBtn.style.borderColor = "rgba(239, 68, 68, 0.35)";
                delBtn.style.color = "#f87171";
            });

            delBtn.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();
                removeBookmarkByValue(item.searchValue);
                renderListView();
            });

            row.addEventListener("click", () => {
                closeModal();
                onSelectWord(item.searchValue);
            });

            row.appendChild(leftCol);
            row.appendChild(delBtn);
            listEl.appendChild(row);
        });

        bodyArea.appendChild(listEl);
    };

    // デッキ構築
    const rebuildDeck = (): void => {
        const data = getData();
        const recent = getRecentSearches();
        deck = [];

        if (cardSource === "bookmarks") {
            bookmarks.forEach(b => {
                const c = buildFlashcardData(b.searchValue, b.word, data);
                if (c) deck.push(c);
            });
        } else {
            recent.forEach(r => {
                const cleanLabel = r.label.replace(/^\d+\.\s*/, "");
                const c = buildFlashcardData(r.searchValue, cleanLabel, data);
                if (c) deck.push(c);
            });
        }

        currentCardIndex = 0;
        isCardFlipped = false;
    };

    // フラッシュカード演習タブの描画
    const renderCardView = (): void => {
        styleTab(listTabBtn, false);
        styleTab(cardTabBtn, true);
        bodyArea.innerHTML = "";

        // 上部コントロールバー（出題元・出題方向・シャッフル）
        const controls = document.createElement("div");
        Object.assign(controls.style, {
            display: "flex",
            flexWrap: "nowrap",
            gap: "clamp(5px, 1.5vw, 8px)",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            width: "100%",
            boxSizing: "border-box"
        });

        const dropdownClosers: (() => void)[] = [];
        const closeAllDropdowns = (): void => {
            dropdownClosers.forEach(closeFn => closeFn());
        };

        const createCustomDropdown = <T extends string>(
            options: { value: T; label: string }[],
            currentValue: T,
            onChange: (newValue: T) => void,
            allowShrink = false
        ): HTMLElement => {
            const wrapper = document.createElement("div");
            Object.assign(wrapper.style, {
                position: "relative",
                display: "inline-flex",
                flex: allowShrink ? "0 1 auto" : "0 0 auto",
                minWidth: "0",
                userSelect: "none"
            });

            const currentOpt = options.find(o => o.value === currentValue) || options[0];

            const triggerBtn = document.createElement("button");
            triggerBtn.type = "button";
            Object.assign(triggerBtn.style, {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "clamp(4px, 1.2vw, 8px)",
                height: "clamp(32px, 8vw, 36px)",
                padding: "0 clamp(7px, 2.2vw, 11px)",
                width: "100%",
                minWidth: "0",
                boxSizing: "border-box",
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "8px",
                fontSize: "clamp(11px, 3vw, 13px)",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease"
            });

            const labelSpan = document.createElement("span");
            labelSpan.textContent = currentOpt.label;
            Object.assign(labelSpan.style, {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
            });

            const arrowIcon = document.createElement("i");
            arrowIcon.className = "fa-solid fa-chevron-down";
            Object.assign(arrowIcon.style, {
                fontSize: "clamp(10px, 2.6vw, 11px)",
                color: "#38bdf8",
                flexShrink: "0",
                transition: "transform 0.2s ease"
            });

            triggerBtn.appendChild(labelSpan);
            triggerBtn.appendChild(arrowIcon);

            const menuList = document.createElement("div");
            Object.assign(menuList.style, {
                position: "absolute",
                top: "calc(100% + 6px)",
                left: "0",
                minWidth: "100%",
                width: "max-content",
                backgroundColor: "#0f172a",
                border: "1px solid #00b4cc",
                borderRadius: "10px",
                boxShadow: "0 12px 28px rgba(0, 0, 0, 0.65)",
                padding: "5px",
                boxSizing: "border-box",
                zIndex: "100",
                display: "none",
                flexDirection: "column",
                gap: "3px"
            });

            let isOpen = false;

            const handleOutsidePointerDown = (e: PointerEvent): void => {
                if (!wrapper.isConnected) {
                    document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
                    return;
                }
                if (!wrapper.contains(e.target as Node)) {
                    closeDropdown();
                }
            };

            const closeDropdown = (): void => {
                if (!isOpen) return;
                isOpen = false;
                menuList.style.display = "none";
                arrowIcon.style.transform = "rotate(0deg)";
                triggerBtn.style.borderColor = "#475569";
                triggerBtn.style.backgroundColor = "#1e293b";
                triggerBtn.style.boxShadow = "none";
                document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
            };

            const openDropdown = (): void => {
                closeAllDropdowns();
                isOpen = true;
                menuList.style.display = "flex";
                arrowIcon.style.transform = "rotate(180deg)";
                triggerBtn.style.borderColor = "#00b4cc";
                triggerBtn.style.backgroundColor = "#0f172a";
                triggerBtn.style.boxShadow = "0 0 0 2px rgba(0, 180, 204, 0.22)";
                document.addEventListener("pointerdown", handleOutsidePointerDown, true);
            };

            dropdownClosers.push(closeDropdown);

            triggerBtn.addEventListener("mouseenter", () => {
                if (!isOpen) {
                    triggerBtn.style.borderColor = "#00b4cc";
                    triggerBtn.style.backgroundColor = "#0f172a";
                }
            });
            triggerBtn.addEventListener("mouseleave", () => {
                if (!isOpen) {
                    triggerBtn.style.borderColor = "#475569";
                    triggerBtn.style.backgroundColor = "#1e293b";
                }
            });

            triggerBtn.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (isOpen) {
                    closeDropdown();
                } else {
                    openDropdown();
                }
            });

            options.forEach(opt => {
                const isSelected = opt.value === currentValue;
                const itemBtn = document.createElement("button");
                itemBtn.type = "button";
                Object.assign(itemBtn.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: isSelected ? "rgba(0, 180, 204, 0.18)" : "transparent",
                    color: isSelected ? "#38bdf8" : "#e2e8f0",
                    fontSize: "clamp(12px, 3.2vw, 13px)",
                    fontWeight: isSelected ? "700" : "500",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease, color 0.15s ease"
                });

                const itemText = document.createElement("span");
                itemText.textContent = opt.label;

                const checkIcon = document.createElement("i");
                checkIcon.className = "fa-solid fa-check";
                Object.assign(checkIcon.style, {
                    fontSize: "11px",
                    color: "#38bdf8",
                    opacity: isSelected ? "1" : "0"
                });

                itemBtn.appendChild(itemText);
                itemBtn.appendChild(checkIcon);

                itemBtn.addEventListener("mouseenter", () => {
                    if (!isSelected) {
                        itemBtn.style.backgroundColor = "#1e293b";
                        itemBtn.style.color = "#ffffff";
                    }
                });
                itemBtn.addEventListener("mouseleave", () => {
                    if (!isSelected) {
                        itemBtn.style.backgroundColor = "transparent";
                        itemBtn.style.color = "#e2e8f0";
                    }
                });

                itemBtn.addEventListener("click", (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDropdown();
                    if (opt.value !== currentValue) {
                        onChange(opt.value);
                    }
                });

                menuList.appendChild(itemBtn);
            });

            wrapper.appendChild(triggerBtn);
            wrapper.appendChild(menuList);
            return wrapper;
        };

        const sourceDropdown = createCustomDropdown<"bookmarks" | "recent">(
            [
                { value: "bookmarks", label: `★ 保存した単語 (${bookmarks.length})` },
                { value: "recent", label: `最近の検索履歴 (${getRecentSearches().length})` }
            ],
            cardSource,
            newVal => {
                cardSource = newVal;
                rebuildDeck();
                renderCardView();
            },
            true
        );

        const dirDropdown = createCustomDropdown<"en-to-ja" | "ja-to-en">(
            [
                { value: "en-to-ja", label: "英語→日本語" },
                { value: "ja-to-en", label: "日本語→英語" }
            ],
            cardDirection,
            newVal => {
                cardDirection = newVal;
                isCardFlipped = false;
                renderCardView();
            },
            false
        );

        const shuffleBtn = document.createElement("button");
        shuffleBtn.type = "button";
        Object.assign(shuffleBtn.style, {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(4px, 1.2vw, 6px)",
            height: "clamp(32px, 8vw, 36px)",
            padding: "0 clamp(7px, 2.2vw, 11px)",
            flex: "0 0 auto",
            boxSizing: "border-box",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #475569",
            borderRadius: "8px",
            fontSize: "clamp(11px, 3vw, 13px)",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s ease, background-color 0.15s ease"
        });

        const shuffleIcon = document.createElement("i");
        shuffleIcon.className = "fa-solid fa-shuffle";
        Object.assign(shuffleIcon.style, {
            fontSize: "clamp(10px, 2.8vw, 12px)",
            color: "#38bdf8",
            flexShrink: "0"
        });

        const shuffleLabel = document.createElement("span");
        shuffleLabel.textContent = "シャッフル";

        shuffleBtn.appendChild(shuffleIcon);
        shuffleBtn.appendChild(shuffleLabel);

        shuffleBtn.addEventListener("mouseenter", () => {
            shuffleBtn.style.borderColor = "#00b4cc";
            shuffleBtn.style.backgroundColor = "#0f172a";
        });
        shuffleBtn.addEventListener("mouseleave", () => {
            shuffleBtn.style.borderColor = "#475569";
            shuffleBtn.style.backgroundColor = "#1e293b";
        });

        shuffleBtn.addEventListener("click", () => {
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            currentCardIndex = 0;
            isCardFlipped = false;
            renderCardView();
        });

        controls.appendChild(sourceDropdown);
        controls.appendChild(dirDropdown);
        controls.appendChild(shuffleBtn);
        bodyArea.appendChild(controls);

        if (deck.length === 0) {
            toggleCardFlip = null;
            navigateCard = null;
            const emptyBox = document.createElement("div");
            Object.assign(emptyBox.style, {
                textAlign: "center",
                padding: "44px 16px",
                color: "#94a3b8"
            });
            emptyBox.textContent =
                cardSource === "bookmarks"
                    ? "保存された単語がありません。単語をブックマークするか、「最近の検索履歴」に切り替えてください。"
                    : "最近の検索履歴がありません。";
            bodyArea.appendChild(emptyBox);
            return;
        }

        if (!document.getElementById("flashcard-scroll-style")) {
            const styleEl = document.createElement("style");
            styleEl.id = "flashcard-scroll-style";
            styleEl.textContent = `
                .flashcard-ml-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }
                .flashcard-ml-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .flashcard-ml-scroll::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 999px;
                    margin: 6px 0;
                }
                .flashcard-ml-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 999px;
                    border: 1px solid #f8fafc;
                }
                .flashcard-ml-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .flashcard-ml-scroll::-webkit-scrollbar-corner {
                    background: transparent;
                }
                .flashcard-ml-scroll.ml {
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: clamp(10px, 2.6vw, 14px) clamp(12px, 3.2vw, 16px) !important;
                    box-sizing: border-box !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                }
                .flashcard-3d-scene {
                    perspective: 1200px;
                    -webkit-perspective: 1200px;
                }
                .flashcard-3d-inner {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d;
                    -webkit-transform-style: preserve-3d;
                    transition: transform 0.52s cubic-bezier(0.22, 1, 0.36, 1);
                    transform: rotateY(0deg);
                }
                .flashcard-3d-inner.is-flipped {
                    transform: rotateY(180deg);
                }
                .flashcard-3d-face {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    border-radius: 12px;
                    padding: 32px clamp(10px, 3vw, 20px) clamp(10px, 2.8vw, 18px) clamp(10px, 3vw, 20px);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    overflow: hidden;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .flashcard-3d-face-front {
                    background-color: #1e293b;
                    border: 2px solid #334155;
                    transform: rotateY(0deg) translateZ(1px);
                    -webkit-transform: rotateY(0deg) translateZ(1px);
                }
                .flashcard-3d-face-back {
                    background-color: #152238;
                    border: 2px solid #00b4cc;
                    transform: rotateY(180deg) translateZ(1px);
                    -webkit-transform: rotateY(180deg) translateZ(1px);
                }
            `;
            document.head.appendChild(styleEl);
        }

        // カードが左右にスライドして出入りするステージ枠（要素外へはみ出たカードを隠す）
        const cardViewport = document.createElement("div");
        Object.assign(cardViewport.style, {
            width: "100%",
            height: "clamp(300px, 48dvh, 420px)",
            position: "relative",
            overflow: "hidden",
            borderRadius: "12px"
        });

        // 指定したインデックスのカード要素一式を生成するヘルパー
        const buildCardElement = (
            cardIndex: number,
            initialFlipped: boolean
        ): { element: HTMLElement; flip: () => void } => {
            const cardData = deck[cardIndex];

            const cardBox = document.createElement("div");
            cardBox.className = "flashcard-3d-scene";
            Object.assign(cardBox.style, {
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                cursor: "pointer",
                userSelect: "none",
                willChange: "transform, opacity"
            });

            const cardFlipInner = document.createElement("div");
            cardFlipInner.className = `flashcard-3d-inner${initialFlipped ? " is-flipped" : ""}`;

            const appendFaceBadges = (faceEl: HTMLElement, isBackFace: boolean): void => {
                const badge = document.createElement("div");
                Object.assign(badge.style, {
                    position: "absolute",
                    top: "10px",
                    left: "clamp(10px, 3vw, 16px)",
                    fontSize: "12px",
                    color: "#94a3b8"
                });
                badge.textContent = `${cardIndex + 1} / ${deck.length}`;

                const flipGuide = document.createElement("div");
                Object.assign(flipGuide.style, {
                    position: "absolute",
                    top: "10px",
                    right: "clamp(10px, 3vw, 16px)",
                    fontSize: "12px",
                    color: isBackFace ? "#38bdf8" : "#64748b"
                });
                flipGuide.textContent = isBackFace ? "裏面（解答）" : "タップ / Spaceでめくる";

                faceEl.appendChild(badge);
                faceEl.appendChild(flipGuide);
            };

            // --- 1. 表面（Front Face）の構築 ---
            const frontFace = document.createElement("div");
            frontFace.className = "flashcard-3d-face flashcard-3d-face-front";
            frontFace.style.pointerEvents = initialFlipped ? "none" : "auto";
            appendFaceBadges(frontFace, false);

            const frontContentWrap = document.createElement("div");
            Object.assign(frontContentWrap.style, {
                width: "100%",
                height: "100%",
                minHeight: "0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                overflow: "auto"
            });

            if (cardDirection === "en-to-ja") {
                const wordTitle = document.createElement("div");
                Object.assign(wordTitle.style, {
                    fontSize: "clamp(26px, 6.5vw, 32px)",
                    fontWeight: "700",
                    color: "#ffffff",
                    letterSpacing: "0.03em"
                });
                wordTitle.textContent = cardData.word;
                frontContentWrap.appendChild(wordTitle);
            } else {
                // ⑤ 日本語→英語のとき、カード表面は単語の意味のみを表示（下のヒント部分は削除）
                const meaningTitle = document.createElement("div");
                Object.assign(meaningTitle.style, {
                    fontSize: "clamp(20px, 5.2vw, 24px)",
                    fontWeight: "700",
                    color: "#38bdf8",
                    lineHeight: "1.5"
                });
                meaningTitle.textContent = cardData.meanings.join(" ・ ");
                frontContentWrap.appendChild(meaningTitle);
            }
            frontFace.appendChild(frontContentWrap);

            // --- 2. 裏面（Back Face）の構築 ---
            const backFace = document.createElement("div");
            backFace.className = "flashcard-3d-face flashcard-3d-face-back";
            backFace.style.pointerEvents = initialFlipped ? "auto" : "none";
            appendFaceBadges(backFace, true);

            const backContentWrap = document.createElement("div");
            Object.assign(backContentWrap.style, {
                width: "100%",
                height: "100%",
                minHeight: "0",
                display: "flex",
                flexDirection: "column",
                justifyContent: cardData.mlHtml ? "flex-start" : "center",
                alignItems: "center",
                overflow: "hidden"
            });

            const ansWord = document.createElement("div");
            Object.assign(ansWord.style, {
                fontSize: "clamp(20px, 5.2vw, 24px)",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "4px",
                flexShrink: "0"
            });
            ansWord.textContent = cardData.numStr
                ? `${cardData.numStr}. ${cardData.word}`
                : cardData.word;

            const ansMeaning = document.createElement("div");
            Object.assign(ansMeaning.style, {
                fontSize: "clamp(15px, 4vw, 17px)",
                fontWeight: "700",
                color: "#fbbf24",
                marginBottom: cardData.mlHtml ? "8px" : "0",
                flexShrink: "0"
            });
            ansMeaning.textContent = cardData.meanings.join(" ・ ");

            backContentWrap.appendChild(ansWord);
            backContentWrap.appendChild(ansMeaning);

            let mlScrollBox: HTMLElement | null = null;

            // ④ 辞書ページの .ml 要素の内容（画像除く）をすべて表示し、固定カード内の残り領域でスクロール可能にする
            if (cardData.mlHtml) {
                mlScrollBox = document.createElement("div");
                mlScrollBox.className = "ml flashcard-ml-scroll";
                Object.assign(mlScrollBox.style, {
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    padding: "clamp(10px, 2.6vw, 14px) clamp(12px, 3.2vw, 16px)",
                    borderRadius: "8px",
                    textAlign: "left",
                    flex: "1 1 auto",
                    minHeight: "0",
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    touchAction: "pan-y",
                    boxSizing: "border-box",
                    width: "100%"
                });
                mlScrollBox.innerHTML = cardData.mlHtml;
                backContentWrap.appendChild(mlScrollBox);
            }
            backFace.appendChild(backContentWrap);

            cardFlipInner.appendChild(frontFace);
            cardFlipInner.appendChild(backFace);
            cardBox.appendChild(cardFlipInner);

            let localFlipped = initialFlipped;
            const performFlip = (): void => {
                localFlipped = !localFlipped;
                isCardFlipped = localFlipped;
                cardFlipInner.classList.toggle("is-flipped", localFlipped);
                frontFace.style.pointerEvents = localFlipped ? "none" : "auto";
                backFace.style.pointerEvents = localFlipped ? "auto" : "none";
            };

            let downX = 0;
            let downY = 0;
            let downScrollTop = 0;
            let isScrollbarClick = false;

            cardBox.addEventListener(
                "pointerdown",
                (e: PointerEvent) => {
                    downX = e.clientX;
                    downY = e.clientY;
                    downScrollTop = mlScrollBox ? mlScrollBox.scrollTop : 0;
                    isScrollbarClick = false;
                    if (localFlipped && mlScrollBox && mlScrollBox.contains(e.target as Node)) {
                        const rect = mlScrollBox.getBoundingClientRect();
                        if (e.clientX - rect.left > mlScrollBox.clientWidth) {
                            isScrollbarClick = true;
                        }
                    }
                },
                { passive: true }
            );

            cardBox.addEventListener("click", (e: MouseEvent) => {
                const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
                const scrolled =
                    localFlipped && mlScrollBox ? Math.abs(mlScrollBox.scrollTop - downScrollTop) > 2 : false;
                if (moveDist > 8 || scrolled || isScrollbarClick) {
                    return;
                }
                performFlip();
            });

            return { element: cardBox, flip: performFlip };
        };

        let activeCardObj = buildCardElement(currentCardIndex, isCardFlipped);
        toggleCardFlip = activeCardObj.flip;
        cardViewport.appendChild(activeCardObj.element);
        bodyArea.appendChild(cardViewport);

        let slideTimer: ReturnType<typeof setTimeout> | null = null;
        let outgoingCardEl: HTMLElement | null = null;

        // prev / next 押下時に現在のカードを左右へスライドアウトさせ、新しいカードを反対側からスライドインさせる
        const slideToCard = (dir: "prev" | "next"): void => {
            if (deck.length === 0) return;

            // 連打された場合は進行中のスライドの後片付けを即座に完了させる
            if (slideTimer) {
                clearTimeout(slideTimer);
                slideTimer = null;
            }
            if (outgoingCardEl) {
                outgoingCardEl.remove();
                outgoingCardEl = null;
            }

            const nextIndex =
                dir === "next"
                    ? (currentCardIndex + 1) % deck.length
                    : (currentCardIndex - 1 + deck.length) % deck.length;

            currentCardIndex = nextIndex;
            isCardFlipped = false;

            const oldCardEl = activeCardObj.element;
            oldCardEl.style.pointerEvents = "none";
            outgoingCardEl = oldCardEl;

            const newCardObj = buildCardElement(currentCardIndex, false);
            const newCardEl = newCardObj.element;
            activeCardObj = newCardObj;
            toggleCardFlip = newCardObj.flip;

            // next: 新カードは右(+108%)から登場し、旧カードは左(-108%)へ消える
            // prev: 新カードは左(-108%)から登場し、旧カードは右(+108%)へ消える
            const enterFromX = dir === "next" ? "108%" : "-108%";
            const exitToX = dir === "next" ? "-108%" : "108%";

            newCardEl.style.transition = "none";
            newCardEl.style.transform = `translate3d(${enterFromX}, 0, 0)`;
            cardViewport.appendChild(newCardEl);

            // 初期位置を確定させてからトランジションを開始
            void newCardEl.offsetWidth;

            const slideTransition = "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)";
            oldCardEl.style.transition = slideTransition;
            newCardEl.style.transition = slideTransition;

            oldCardEl.style.transform = `translate3d(${exitToX}, 0, 0)`;
            newCardEl.style.transform = "translate3d(0, 0, 0)";

            slideTimer = setTimeout(() => {
                slideTimer = null;
                if (outgoingCardEl === oldCardEl) {
                    outgoingCardEl = null;
                }
                oldCardEl.remove();
                newCardEl.style.transition = "";
                newCardEl.style.transform = "";
            }, 390);
        };
        navigateCard = slideToCard;

        // ①・② 下部ナビゲーションボタン（prev / 辞書ページへ / next・折り返し防止）
        const navBar = document.createElement("div");
        Object.assign(navBar.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            gap: "8px",
            flexWrap: "nowrap"
        });

        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.textContent = "prev";
        Object.assign(prevBtn.style, {
            padding: "9px clamp(12px, 3vw, 18px)",
            fontSize: "clamp(12px, 3.5vw, 15px)",
            whiteSpace: "nowrap",
            flexShrink: "0",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600"
        });
        prevBtn.addEventListener("click", () => {
            slideToCard("prev");
        });

        const openDictBtn = document.createElement("button");
        openDictBtn.type = "button";
        openDictBtn.textContent = "辞書ページへ";
        Object.assign(openDictBtn.style, {
            padding: "9px clamp(12px, 3vw, 18px)",
            fontSize: "clamp(12px, 3.5vw, 15px)",
            whiteSpace: "nowrap",
            flexShrink: "0",
            backgroundColor: "rgba(0, 180, 204, 0.18)",
            color: "#38bdf8",
            border: "1px solid #00b4cc",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600"
        });
        openDictBtn.addEventListener("click", () => {
            const targetCard = deck[currentCardIndex];
            if (!targetCard) return;
            closeModal();
            onSelectWord(targetCard.searchValue);
        });

        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.textContent = "next";
        Object.assign(nextBtn.style, {
            padding: "9px clamp(12px, 3vw, 18px)",
            fontSize: "clamp(12px, 3.5vw, 15px)",
            whiteSpace: "nowrap",
            flexShrink: "0",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600"
        });
        nextBtn.addEventListener("click", () => {
            slideToCard("next");
        });

        navBar.appendChild(prevBtn);
        navBar.appendChild(openDictBtn);
        navBar.appendChild(nextBtn);
        bodyArea.appendChild(navBar);
    };

    const handleModalKeydown = (e: KeyboardEvent): void => {
        if (e.key === "Escape") {
            e.preventDefault();
            closeModal();
            return;
        }
        if (activeTab !== "card" || deck.length === 0) return;

        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (toggleCardFlip) {
                toggleCardFlip();
            } else {
                isCardFlipped = !isCardFlipped;
                renderCardView();
            }
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            if (navigateCard) {
                navigateCard("next");
            } else {
                currentCardIndex = (currentCardIndex + 1) % deck.length;
                isCardFlipped = false;
                renderCardView();
            }
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            if (navigateCard) {
                navigateCard("prev");
            } else {
                currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
                isCardFlipped = false;
                renderCardView();
            }
        }
    };

    window.addEventListener("keydown", handleModalKeydown);

    listTabBtn.addEventListener("click", () => {
        activeTab = "list";
        renderListView();
    });
    cardTabBtn.addEventListener("click", () => {
        activeTab = "card";
        rebuildDeck();
        renderCardView();
    });

    if (initialTab === "card") {
        rebuildDeck();
        renderCardView();
    } else {
        renderListView();
    }
}