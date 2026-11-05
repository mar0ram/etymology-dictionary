import { DictionaryData, DictionaryEntry, RecentSearchItem } from "./types.js";

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
    etymologyHint: string;
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

// 辞書データからフラッシュカード用の「意味」と「語源・コアイメージヒント」を抽出
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
        entry = (data.idioms || []).find(item => item.num === num);
    } else {
        entry = (data.words || []).find(
            item => item.word && String(item.word).toLowerCase() === cleanVal.toLowerCase()
        );
    }

    if (!entry) {
        entry = (data.words || []).find(
            item => item.word && String(item.word).toLowerCase() === fallbackWord.toLowerCase()
        );
    }

    const word = String(entry?.word || fallbackWord).trim();
    const numStr = entry?.num !== undefined && entry?.num !== "" ? String(entry.num) : "";

    const meanings: string[] = [];
    let etymologyHint = "";

    if (entry) {
        const i2Raw = String(entry.i2 || "");
        const headerMatch = i2Raw.match(
            /<span class="w">\s*<b>\s*【?\s*(?:\d+\s*\.\s*)?[^：:]+?\s*[：:]\s*([\s\S]+?)\s*】?\s*<\/b>/
        );
        if (headerMatch && headerMatch[1]) {
            headerMatch[1]
                .split(/\s*[,，、]\s*/)
                .map(s => s.replace(/<[^>]+>/g, "").trim())
                .filter(Boolean)
                .forEach(m => meanings.push(m));
        }

        const stripHtml = (html: string): string =>
            html
                .replace(/<span class="w">[\s\S]*?<\/span>/g, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const i1Text = stripHtml(String(entry.i1 || ""));
        const i2Body = stripHtml(i2Raw);
        const rawHint = i1Text || i2Body;

        if (rawHint) {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const wordRegex = new RegExp(`\\b${escapedWord}\\b`, "gi");
            const masked = rawHint.replace(wordRegex, " [ ___ ] ");
            etymologyHint = masked.length > 140 ? masked.slice(0, 140) + "…" : masked;
        }
    }

    if (meanings.length === 0) {
        meanings.push("（辞書ページで詳細を確認）");
    }
    if (!etymologyHint) {
        etymologyHint = "コアイメージ・語源の詳細は「辞書で開く」から確認できます。";
    }

    return {
        searchValue: cleanVal,
        word,
        numStr,
        meanings,
        etymologyHint
    };
}

let navBadgeEl: HTMLElement | null = null;

function updateNavBadge(): void {
    if (!navBadgeEl) return;
    navBadgeEl.textContent = String(bookmarks.length);
    navBadgeEl.style.display = bookmarks.length > 0 ? "inline-flex" : "none";
}

// 検索バー横の「★ 単語帳」ボタンと復習モーダルの初期化
export function initBookmarkSystem(
    getData: () => DictionaryData,
    getRecentSearches: () => RecentSearchItem[],
    onSelectWord: (searchValue: string) => void
): void {
    const searchContainer = document.querySelector<HTMLElement>(".search-container");
    if (!searchContainer) return;

    const openModalBtn = document.createElement("button");
    openModalBtn.type = "button";
    openModalBtn.id = "openBookmarkModalBtn";
    openModalBtn.title = "マイ単語帳・フラッシュカード復習";
    Object.assign(openModalBtn.style, {
        padding: "16px 16px",
        flex: "0 0 auto",
        fontSize: "16px",
        border: "1px solid #334155",
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        borderRadius: "10px",
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
        fontSize: "12px",
        fontWeight: "700",
        padding: "1px 7px",
        borderRadius: "999px",
        minWidth: "18px",
        height: "20px",
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

    searchContainer.appendChild(openModalBtn);

    openModalBtn.addEventListener("click", () => {
        openBookmarkModal(getData, getRecentSearches, onSelectWord);
    });
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
            <option value="en-to-ja" ${cardDirection === "en-to-ja" ? "selected" : ""}>英語 ➔ 意味・コアイメージ</option>
            <option value="ja-to-en" ${cardDirection === "ja-to-en" ? "selected" : ""}>意味・語源ヒント ➔ 英語</option>
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

        // カード本体
        const cardBox = document.createElement("div");
        Object.assign(cardBox.style, {
            minHeight: "230px",
            backgroundColor: isCardFlipped ? "#152238" : "#1e293b",
            border: isCardFlipped ? "2px solid #00b4cc" : "1px solid #334155",
            borderRadius: "12px",
            padding: "24px 20px",
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
            marginTop: "12px",
            width: "100%"
        });

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
                const meaningTitle = document.createElement("div");
                Object.assign(meaningTitle.style, {
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#38bdf8",
                    marginBottom: "14px"
                });
                meaningTitle.textContent = currentCard.meanings.join(" ・ ");

                const hintBox = document.createElement("div");
                Object.assign(hintBox.style, {
                    fontSize: "14px",
                    color: "#cbd5e1",
                    lineHeight: "1.6",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    padding: "12px",
                    borderRadius: "8px"
                });
                hintBox.textContent = currentCard.etymologyHint;

                contentWrap.appendChild(meaningTitle);
                contentWrap.appendChild(hintBox);
            }
        } else {
            // 裏面（解答）
            const ansWord = document.createElement("div");
            Object.assign(ansWord.style, {
                fontSize: "26px",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "8px"
            });
            ansWord.textContent = currentCard.numStr
                ? `${currentCard.numStr}. ${currentCard.word}`
                : currentCard.word;

            const ansMeaning = document.createElement("div");
            Object.assign(ansMeaning.style, {
                fontSize: "18px",
                fontWeight: "700",
                color: "#fbbf24",
                marginBottom: "12px"
            });
            ansMeaning.textContent = currentCard.meanings.join(" ・ ");

            const ansHint = document.createElement("div");
            Object.assign(ansHint.style, {
                fontSize: "13px",
                color: "#cbd5e1",
                lineHeight: "1.6",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                padding: "10px 12px",
                borderRadius: "8px",
                textAlign: "left"
            });
            ansHint.textContent = currentCard.etymologyHint;

            contentWrap.appendChild(ansWord);
            contentWrap.appendChild(ansMeaning);
            contentWrap.appendChild(ansHint);
        }

        cardBox.appendChild(contentWrap);
        cardBox.addEventListener("click", () => {
            isCardFlipped = !isCardFlipped;
            renderCardView();
        });
        bodyArea.appendChild(cardBox);

        // 下部ナビゲーションボタン
        const navBar = document.createElement("div");
        Object.assign(navBar.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            gap: "10px"
        });

        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.textContent = "← 前へ";
        Object.assign(prevBtn.style, {
            padding: "10px 16px",
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
        openDictBtn.textContent = "辞書で詳しく見る";
        Object.assign(openDictBtn.style, {
            padding: "10px 16px",
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
        nextBtn.textContent = "次へ →";
        Object.assign(nextBtn.style, {
            padding: "10px 16px",
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