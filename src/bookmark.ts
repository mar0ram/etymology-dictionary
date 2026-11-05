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

// 画面上に表示されている見出しの★ボタン状態を同期
function syncPageBookmarkButtons(): void {
    document.querySelectorAll<HTMLButtonElement>(".entry-bookmark-btn").forEach(btn => {
        const val = btn.dataset.searchValue || "";
        const active = isBookmarked(val);
        applyBookmarkBtnStyle(btn, active);
    });
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
                mlHtmlParts.push(`<div>${el.outerHTML}</div>`);
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
        mlHtml: mlHtmlParts.join("")
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

    // 1. ヘッダー要素の生成（タイトル・ロゴのみ。クリックで初期画面へ）
    const headerEl = document.createElement("header");
    headerEl.id = "siteHeader";
    headerEl.className = "site-header";
    Object.assign(headerEl.style, {
        width: "95%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "14px 0 6px 0",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        boxSizing: "border-box",
        cursor: "pointer",
        userSelect: "none"
    });

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
    mainTitle.textContent = "単語学習 補助ツール";
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
    subTitle.textContent = "語源・コアイメージで覚える";
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
    headerEl.appendChild(brandArea);

    headerEl.addEventListener("mouseenter", () => {
        brandArea.style.opacity = "0.82";
    });
    headerEl.addEventListener("mouseleave", () => {
        brandArea.style.opacity = "1";
    });
    headerEl.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        onReturnHome();
    });

    searchContainer.parentElement.insertBefore(headerEl, searchContainer);

    // 2. 「★ 単語帳」ボタン（画面上部に常に固定追従するフローティング仕様）
    const openModalBtn = document.createElement("button");
    openModalBtn.type = "button";
    openModalBtn.id = "openBookmarkModalBtn";
    openModalBtn.title = "マイ単語帳・フラッシュカード復習";
    Object.assign(openModalBtn.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: "105",
        padding: "10px 14px",
        fontSize: "13.5px",
        border: "1px solid #334155",
        backgroundColor: "rgba(30, 41, 59, 0.92)",
        backdropFilter: "blur(8px)",
        color: "#f8fafc",
        borderRadius: "10px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontWeight: "700",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)",
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
        openModalBtn.style.backgroundColor = "rgba(30, 41, 59, 0.92)";
    });

    openModalBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openBookmarkModal(getData, getRecentSearches, onSelectWord);
    });

    document.body.appendChild(openModalBtn);
}

function openBookmarkModal(
    getData: () => DictionaryData,
    getRecentSearches: () => RecentSearchItem[],
    onSelectWord: (searchValue: string) => void
): void {
    const existing = document.getElementById("bookmark-review-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "bookmark-review-modal";
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(6px)",
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
        maxHeight: "88vh",
        backgroundColor: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "14px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        color: "#f8fafc"
    });

    // ヘッダーとモード切替タブ
    const header = document.createElement("div");
    Object.assign(header.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: "1px solid #1e293b",
        backgroundColor: "#1e293b"
    });

    const tabGroup = document.createElement("div");
    Object.assign(tabGroup.style, {
        display: "flex",
        gap: "8px"
    });

    const listTabBtn = document.createElement("button");
    listTabBtn.type = "button";
    listTabBtn.textContent = "★ 保存一覧";

    const cardTabBtn = document.createElement("button");
    cardTabBtn.type = "button";
    cardTabBtn.textContent = "フラッシュカード復習";

    const styleTab = (btn: HTMLButtonElement, active: boolean): void => {
        Object.assign(btn.style, {
            padding: "8px 14px",
            fontSize: "14px",
            fontWeight: "700",
            borderRadius: "8px",
            border: active ? "1px solid #00b4cc" : "1px solid transparent",
            backgroundColor: active ? "rgba(0, 180, 204, 0.18)" : "transparent",
            color: active ? "#38bdf8" : "#94a3b8",
            cursor: "pointer"
        });
    };

    tabGroup.appendChild(listTabBtn);
    tabGroup.appendChild(cardTabBtn);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
        background: "transparent",
        border: "none",
        color: "#94a3b8",
        fontSize: "24px",
        lineHeight: "1",
        cursor: "pointer",
        padding: "0 6px"
    });

    header.appendChild(tabGroup);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const bodyArea = document.createElement("div");
    Object.assign(bodyArea.style, {
        padding: "18px",
        overflowY: "auto",
        flex: "1 1 auto"
    });
    panel.appendChild(bodyArea);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // フラッシュカード用の状態
    let activeTab: "list" | "card" = "list";
    let cardSource: "bookmarks" | "recent" = bookmarks.length > 0 ? "bookmarks" : "recent";
    let cardDirection: "en-to-ja" | "ja-to-en" = "en-to-ja";
    let deck: FlashcardData[] = [];
    let currentCardIndex = 0;
    let isCardFlipped = false;

    const closeModal = (): void => {
        window.removeEventListener("keydown", handleModalKeydown);
        overlay.remove();
    };

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
                padding: "40px 16px",
                color: "#94a3b8"
            });
            emptyMsg.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 8px; color: #cbd5e1;">まだ単語が保存されていません</div>
                <div style="font-size: 13px;">各単語の見出し右上にある「☆ 単語帳」ボタンを押すと、ここに保存されます。</div>
            `;
            bodyArea.appendChild(emptyMsg);
            return;
        }

        const data = getData();
        const listEl = document.createElement("div");
        Object.assign(listEl.style, {
            display: "flex",
            flexDirection: "column",
            gap: "8px"
        });

        bookmarks.forEach(item => {
            const cardInfo = buildFlashcardData(item.searchValue, item.word, data);
            const row = document.createElement("div");
            Object.assign(row.style, {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "10px",
                cursor: "pointer",
                gap: "12px",
                transition: "border-color 0.15s ease"
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
                gap: "4px",
                overflow: "hidden"
            });

            const wordLine = document.createElement("div");
            Object.assign(wordLine.style, {
                fontSize: "17px",
                fontWeight: "700",
                color: "#f8fafc"
            });
            wordLine.textContent = item.numStr ? `${item.numStr}. ${item.word}` : item.word;

            const meaningLine = document.createElement("div");
            Object.assign(meaningLine.style, {
                fontSize: "13px",
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
                padding: "5px 10px",
                fontSize: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "6px",
                cursor: "pointer",
                flexShrink: "0"
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
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px"
        });

        const sourceSelect = document.createElement("select");
        Object.assign(sourceSelect.style, {
            padding: "6px 10px",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "13px"
        });
        sourceSelect.innerHTML = `
            <option value="bookmarks" ${cardSource === "bookmarks" ? "selected" : ""}>★ 保存した単語 (${bookmarks.length})</option>
            <option value="recent" ${cardSource === "recent" ? "selected" : ""}>最近の検索履歴 (${getRecentSearches().length})</option>
        `;
        sourceSelect.addEventListener("change", () => {
            cardSource = sourceSelect.value as "bookmarks" | "recent";
            rebuildDeck();
            renderCardView();
        });

        const dirSelect = document.createElement("select");
        Object.assign(dirSelect.style, {
            padding: "6px 10px",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "13px"
        });
        dirSelect.innerHTML = `
            <option value="en-to-ja" ${cardDirection === "en-to-ja" ? "selected" : ""}>英語→日本語</option>
            <option value="ja-to-en" ${cardDirection === "ja-to-en" ? "selected" : ""}>日本語→英語</option>
        `;
        dirSelect.addEventListener("change", () => {
            cardDirection = dirSelect.value as "en-to-ja" | "ja-to-en";
            isCardFlipped = false;
            renderCardView();
        });

        const shuffleBtn = document.createElement("button");
        shuffleBtn.type = "button";
        shuffleBtn.textContent = "シャッフル";
        Object.assign(shuffleBtn.style, {
            padding: "6px 12px",
            backgroundColor: "#1e293b",
            color: "#cbd5e1",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "13px",
            cursor: "pointer"
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

        controls.appendChild(sourceSelect);
        controls.appendChild(dirSelect);
        controls.appendChild(shuffleBtn);
        bodyArea.appendChild(controls);

        if (deck.length === 0) {
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

        const currentCard = deck[currentCardIndex];

        // カード本体（表面・裏面でサイズが変わらないよう高さを固定）
        const cardBox = document.createElement("div");
        Object.assign(cardBox.style, {
            height: "340px",
            boxSizing: "border-box",
            overflow: "hidden",
            backgroundColor: isCardFlipped ? "#152238" : "#1e293b",
            border: isCardFlipped ? "2px solid #00b4cc" : "2px solid #334155",
            borderRadius: "12px",
            padding: "36px 20px 18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            cursor: "pointer",
            userSelect: "none",
            position: "relative",
            transition: "background-color 0.2s ease, border-color 0.2s ease"
        });

        const badge = document.createElement("div");
        Object.assign(badge.style, {
            position: "absolute",
            top: "12px",
            left: "14px",
            fontSize: "12px",
            color: "#94a3b8"
        });
        badge.textContent = `${currentCardIndex + 1} / ${deck.length}`;

        const flipGuide = document.createElement("div");
        Object.assign(flipGuide.style, {
            position: "absolute",
            top: "12px",
            right: "14px",
            fontSize: "12px",
            color: isCardFlipped ? "#38bdf8" : "#64748b"
        });
        flipGuide.textContent = isCardFlipped ? "裏面（解答）" : "タップ / Spaceでめくる";

        cardBox.appendChild(badge);
        cardBox.appendChild(flipGuide);

        const contentWrap = document.createElement("div");
        Object.assign(contentWrap.style, {
            width: "100%",
            height: "100%",
            minHeight: "0",
            display: "flex",
            flexDirection: "column",
            justifyContent: isCardFlipped && currentCard.mlHtml ? "flex-start" : "center",
            alignItems: "center",
            overflow: isCardFlipped ? "hidden" : "auto"
        });

        let mlScrollBox: HTMLElement | null = null;

        if (!isCardFlipped) {
            // 表面
            if (cardDirection === "en-to-ja") {
                const wordTitle = document.createElement("div");
                Object.assign(wordTitle.style, {
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#ffffff",
                    letterSpacing: "0.03em"
                });
                wordTitle.textContent = currentCard.word;
                contentWrap.appendChild(wordTitle);
            } else {
                // ⑤ 日本語→英語のとき、カード表面は単語の意味のみを表示（下のヒント部分は削除）
                const meaningTitle = document.createElement("div");
                Object.assign(meaningTitle.style, {
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#38bdf8",
                    lineHeight: "1.5"
                });
                meaningTitle.textContent = currentCard.meanings.join(" ・ ");
                contentWrap.appendChild(meaningTitle);
            }
        } else {
            // 裏面（解答）
            const ansWord = document.createElement("div");
            Object.assign(ansWord.style, {
                fontSize: "24px",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "6px",
                flexShrink: "0"
            });
            ansWord.textContent = currentCard.numStr
                ? `${currentCard.numStr}. ${currentCard.word}`
                : currentCard.word;

            const ansMeaning = document.createElement("div");
            Object.assign(ansMeaning.style, {
                fontSize: "17px",
                fontWeight: "700",
                color: "#fbbf24",
                marginBottom: currentCard.mlHtml ? "10px" : "0",
                flexShrink: "0"
            });
            ansMeaning.textContent = currentCard.meanings.join(" ・ ");

            contentWrap.appendChild(ansWord);
            contentWrap.appendChild(ansMeaning);

            // ④ 辞書ページの .ml 要素の内容（画像除く）をすべて表示し、固定カード内の残り領域でスクロール可能にする
            if (currentCard.mlHtml) {
                if (!document.getElementById("flashcard-scroll-style")) {
                    const styleEl = document.createElement("style");
                    styleEl.id = "flashcard-scroll-style";
                    styleEl.textContent = `
                        .flashcard-ml-scroll {
                            scrollbar-width: thin;
                            scrollbar-color: rgba(0, 180, 204, 0.5) rgba(15, 23, 42, 0.6);
                        }
                        .flashcard-ml-scroll::-webkit-scrollbar {
                            width: 6px;
                        }
                        .flashcard-ml-scroll::-webkit-scrollbar-track {
                            background: rgba(15, 23, 42, 0.6);
                            border-radius: 999px;
                            margin: 6px 0;
                        }
                        .flashcard-ml-scroll::-webkit-scrollbar-thumb {
                            background: linear-gradient(180deg, rgba(0, 180, 204, 0.65) 0%, rgba(56, 189, 248, 0.45) 100%);
                            border-radius: 999px;
                            border: 1px solid rgba(15, 23, 42, 0.4);
                        }
                        .flashcard-ml-scroll::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(180deg, #00b4cc 0%, #38bdf8 100%);
                        }
                        .flashcard-ml-scroll::-webkit-scrollbar-corner {
                            background: transparent;
                        }
                    `;
                    document.head.appendChild(styleEl);
                }

                mlScrollBox = document.createElement("div");
                mlScrollBox.className = "content flashcard-ml-scroll";
                Object.assign(mlScrollBox.style, {
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    padding: "12px 14px",
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
                mlScrollBox.innerHTML = currentCard.mlHtml;
                contentWrap.appendChild(mlScrollBox);
            }
        }

        // スクロール操作やテキストドラッグ時に誤ってカードがめくれないように判定
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
                if (mlScrollBox && mlScrollBox.contains(e.target as Node)) {
                    const rect = mlScrollBox.getBoundingClientRect();
                    if (e.clientX - rect.left > mlScrollBox.clientWidth) {
                        isScrollbarClick = true;
                    }
                }
            },
            { passive: true }
        );

        cardBox.appendChild(contentWrap);
        cardBox.addEventListener("click", (e: MouseEvent) => {
            const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
            const scrolled = mlScrollBox ? Math.abs(mlScrollBox.scrollTop - downScrollTop) > 2 : false;
            if (moveDist > 8 || scrolled || isScrollbarClick) {
                return;
            }
            isCardFlipped = !isCardFlipped;
            renderCardView();
        });
        bodyArea.appendChild(cardBox);

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
            currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
            isCardFlipped = false;
            renderCardView();
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
            closeModal();
            onSelectWord(currentCard.searchValue);
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
            currentCardIndex = (currentCardIndex + 1) % deck.length;
            isCardFlipped = false;
            renderCardView();
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
            isCardFlipped = !isCardFlipped;
            renderCardView();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            currentCardIndex = (currentCardIndex + 1) % deck.length;
            isCardFlipped = false;
            renderCardView();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            currentCardIndex = (currentCardIndex - 1 + deck.length) % deck.length;
            isCardFlipped = false;
            renderCardView();
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

    renderListView();
}