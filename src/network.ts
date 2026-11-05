import { CleanupFn, DictionaryEntry } from "./types.js";

interface RelatedNode {
    word: string;
    isInDict: boolean;
    element: HTMLElement;
    x: number;
    y: number;
    width: number;
    height: number;
}

// 見出しや解説から語根表記があれば抽出する補助関数
function extractRootHint(item: DictionaryEntry): string {
    const h3Title = typeof item.h3 === "string" ? item.h3 : "";
    const match = h3Title.match(/([*][a-zA-Z0-9_-]+|-[a-zA-Z]+-?|[a-zA-Z]+-)/);
    if (match) return match[1];

    const i1 = typeof item.i1 === "string" ? item.i1 : "";
    const rootMatch = i1.match(/([*][a-zA-Z0-9_-]+)/);
    if (rootMatch) return rootMatch[1];

    return "";
}

// 2つの文字列の共通プレフィックス（構成要素の類似度）を算出
function getCommonPrefixLength(a: string, b: string): number {
    const minLen = Math.min(a.length, b.length);
    let i = 0;
    while (i < minLen && a[i].toLowerCase() === b[i].toLowerCase()) {
        i++;
    }
    return i;
}

export function setupEtymologyNetwork(
    entryDiv: HTMLElement,
    item: DictionaryEntry,
    allWords: DictionaryEntry[],
    onSelectWord: (word: string) => void
): CleanupFn | void {
    const h3Section = entryDiv.querySelector<HTMLElement>(".section.h3");
    if (!h3Section) return;

    const h3Content = h3Section.querySelector<HTMLElement>(".content");
    if (!h3Content) return;

    const barElements = h3Content.querySelectorAll<HTMLElement>(".h3-p4-bar");
    if (barElements.length === 0) return;

    const currentWord = String(item.word || "").trim();
    if (!currentWord) return;

    const rawNodes: { word: string; isInDict: boolean; element: HTMLElement }[] = [];
    const seen = new Set<string>();
    seen.add(currentWord.toLowerCase());

    barElements.forEach(bar => {
        const wordEl = bar.querySelector<HTMLElement>(".h3-p4-word");
        if (!wordEl) return;

        const rawWord = (wordEl.dataset.targetWord || wordEl.textContent || "").trim();
        if (!rawWord) return;

        const lower = rawWord.toLowerCase();
        if (seen.has(lower)) return;
        seen.add(lower);

        const isInDict = allWords.some(
            w => w.word && w.word.toLowerCase() === lower
        );

        rawNodes.push({
            word: rawWord,
            isInDict,
            element: bar
        });
    });

    if (rawNodes.length === 0) return;

    // ④ 構成要素が似ている（共通プレフィックス長が大きい）単語同士が近く（隣同士）に並ぶようにソート
    rawNodes.sort((a, b) => {
        const simA = getCommonPrefixLength(currentWord, a.word);
        const simB = getCommonPrefixLength(currentWord, b.word);
        if (simA !== simB) return simB - simA;
        return a.word.localeCompare(b.word);
    });

    // ① ボックスサイズ（単語のみ表示、はみ出ないサイズ）の決定
    const charWidth = 9;
    const paddingX = 26;
    const fixedHeight = 32;

    const relatedNodes: RelatedNode[] = rawNodes.map(node => {
        const width = Math.max(80, Math.round(node.word.length * charWidth + paddingX));
        return {
            ...node,
            x: 0,
            y: 0,
            width,
            height: fixedHeight
        };
    });

    // ②・④ 角度と距離を個別に計算し、ボックス同士や線同士が絶対に重ならない放射状配置
    const count = relatedNodes.length;
    const baseRadiusX = 230;
    const baseRadiusY = 135;

    // 円周を綺麗に分割しつつ、類似した単語同士が隣り合うように配置
    const angleStep = (2 * Math.PI) / count;

    relatedNodes.forEach((node, idx) => {
        const angle = idx * angleStep - Math.PI / 2;

        // 階層（内側・外側・中間）に散らすことで、ボックス同士の距離を十分に確保して重なりを完全防止
        const ringLevel = idx % 3; // 0, 1, 2
        const distanceMultiplier = 1.0 + ringLevel * 0.28;

        const rx = baseRadiusX * distanceMultiplier;
        const ry = baseRadiusY * distanceMultiplier;

        node.x = Math.round(Math.cos(angle) * rx);
        node.y = Math.round(Math.sin(angle) * ry);
    });

    // ネットワーク図のラッパー作成
    const container = document.createElement("div");
    container.className = "etymology-network-container";
    Object.assign(container.style, {
        position: "relative",
        width: "100%",
        height: "380px",
        marginBottom: "18px",
        backgroundColor: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none" // ③ スマホでの1本指スクロール（パン）＆2本指ピンチズームを有効化
    });

    // 凡例・操作ガイドバー
    const topBar = document.createElement("div");
    Object.assign(topBar.style, {
        position: "absolute",
        top: "8px",
        left: "10px",
        right: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: "2",
        fontSize: "11px",
        color: "#94a3b8"
    });

    const legend = document.createElement("div");
    Object.assign(legend.style, {
        display: "flex",
        gap: "10px",
        alignItems: "center",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        padding: "3px 8px",
        borderRadius: "6px"
    });
    legend.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:4px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#00b4cc;display:inline-block;"></span>辞書ジャンプ
        </span>
        <span style="display:inline-flex;align-items:center;gap:4px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#475569;display:inline-block;"></span>解説へ移動
        </span>
    `;

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "位置リセット";
    Object.assign(resetBtn.style, {
        pointerEvents: "auto",
        backgroundColor: "rgba(30, 41, 59, 0.85)",
        color: "#cbd5e1",
        border: "1px solid #334155",
        borderRadius: "5px",
        padding: "2px 8px",
        fontSize: "11px",
        cursor: "pointer"
    });

    topBar.appendChild(legend);
    topBar.appendChild(resetBtn);
    container.appendChild(topBar);

    // SVGキャンバスの生成
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "-360 -200 720 400");
    Object.assign(svg.style, {
        display: "block",
        width: "100%",
        height: "100%",
        cursor: "grab"
    });

    const viewportGroup = document.createElementNS(svgNS, "g");
    svg.appendChild(viewportGroup);

    const edgesGroup = document.createElementNS(svgNS, "g");
    const nodesGroup = document.createElementNS(svgNS, "g");
    viewportGroup.appendChild(edgesGroup);
    viewportGroup.appendChild(nodesGroup);

    // 関連語ノードおよび接続線の描画
    relatedNodes.forEach(node => {
        // ② 線同士が重ならないよう整理された放射状の接続線
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", "0");
        line.setAttribute("x2", node.x.toFixed(1));
        line.setAttribute("y2", node.y.toFixed(1));
        line.setAttribute("stroke", node.isInDict ? "rgba(0, 180, 204, 0.45)" : "rgba(100, 116, 139, 0.35)");
        line.setAttribute("stroke-width", node.isInDict ? "1.8" : "1.2");
        if (!node.isInDict) {
            line.setAttribute("stroke-dasharray", "4 3");
        }
        edgesGroup.appendChild(line);

        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("transform", `translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})`);
        g.style.cursor = "pointer";

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", (-node.width / 2).toFixed(1));
        rect.setAttribute("y", (-node.height / 2).toFixed(1));
        rect.setAttribute("width", node.width.toFixed(1));
        rect.setAttribute("height", node.height.toFixed(1));
        rect.setAttribute("rx", "7");
        rect.setAttribute("fill", node.isInDict ? "#1e293b" : "#151f30");
        rect.setAttribute("stroke", node.isInDict ? "#00b4cc" : "#475569");
        rect.setAttribute("stroke-width", node.isInDict ? "1.8" : "1.2");
        g.appendChild(rect);

        // ① 単語のみを表示し、ボックスからはみ出ないように配置
        const wordText = document.createElementNS(svgNS, "text");
        wordText.setAttribute("x", "0");
        wordText.setAttribute("y", "4");
        wordText.setAttribute("text-anchor", "middle");
        wordText.setAttribute("fill", node.isInDict ? "#f8fafc" : "#cbd5e1");
        wordText.setAttribute("font-size", "12");
        wordText.setAttribute("font-weight", "600");
        wordText.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        wordText.textContent = node.word;
        g.appendChild(wordText);

        g.addEventListener("mouseenter", () => {
            rect.setAttribute("fill", node.isInDict ? "#0f172a" : "#1e293b");
            rect.setAttribute("stroke", "#38bdf8");
            line.setAttribute("stroke", "#38bdf8");
            line.setAttribute("stroke-width", "2.4");
        });

        g.addEventListener("mouseleave", () => {
            rect.setAttribute("fill", node.isInDict ? "#1e293b" : "#151f30");
            rect.setAttribute("stroke", node.isInDict ? "#00b4cc" : "#475569");
            line.setAttribute("stroke", node.isInDict ? "rgba(0, 180, 204, 0.45)" : "rgba(100, 116, 139, 0.35)");
            line.setAttribute("stroke-width", node.isInDict ? "1.8" : "1.2");
        });

        const activateNode = (): void => {
            if (node.isInDict) {
                onSelectWord(node.word);
            } else {
                const parentDetails = node.element.closest("details");
                if (parentDetails && !parentDetails.open) {
                    const summary = parentDetails.querySelector<HTMLElement>("summary");
                    if (summary) summary.click();
                }
                node.element.scrollIntoView({ behavior: "smooth", block: "center" });
                node.element.style.transition = "background-color 0.3s ease";
                const origBg = node.element.style.backgroundColor;
                node.element.style.backgroundColor = "rgba(0, 180, 204, 0.25)";
                setTimeout(() => {
                    node.element.style.backgroundColor = origBg;
                }, 1200);
            }
        };

        let nodeHandledByPointer = false;

        g.addEventListener("pointerup", (e: PointerEvent) => {
            if (isDraggingMoved || activePointers.size > 1) return;
            e.stopPropagation();
            nodeHandledByPointer = true;
            setTimeout(() => {
                nodeHandledByPointer = false;
            }, 400);
            activateNode();
        });

        g.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            if (isDraggingMoved || nodeHandledByPointer) return;
            activateNode();
        });

        nodesGroup.appendChild(g);
    });

    // 中心ノード（現在の見出し語）の描画
    const centerGroup = document.createElementNS(svgNS, "g");
    const rootHint = extractRootHint(item);
    const centerW = Math.max(96, currentWord.length * 10 + 24);
    const centerH = rootHint ? 42 : 34;

    const centerRect = document.createElementNS(svgNS, "rect");
    centerRect.setAttribute("x", (-centerW / 2).toFixed(1));
    centerRect.setAttribute("y", (-centerH / 2).toFixed(1));
    centerRect.setAttribute("width", centerW.toFixed(1));
    centerRect.setAttribute("height", centerH.toFixed(1));
    centerRect.setAttribute("rx", "8");
    centerRect.setAttribute("fill", "#008fa1");
    centerRect.setAttribute("stroke", "#38bdf8");
    centerRect.setAttribute("stroke-width", "2");
    centerGroup.appendChild(centerRect);

    const centerText = document.createElementNS(svgNS, "text");
    centerText.setAttribute("x", "0");
    centerText.setAttribute("y", rootHint ? "-2" : "4");
    centerText.setAttribute("text-anchor", "middle");
    centerText.setAttribute("fill", "#ffffff");
    centerText.setAttribute("font-size", "14");
    centerText.setAttribute("font-weight", "700");
    centerText.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
    centerText.textContent = currentWord;
    centerGroup.appendChild(centerText);

    if (rootHint) {
        const subText = document.createElementNS(svgNS, "text");
        subText.setAttribute("x", "0");
        subText.setAttribute("y", "13");
        subText.setAttribute("text-anchor", "middle");
        subText.setAttribute("fill", "#e0f2fe");
        subText.setAttribute("font-size", "9");
        subText.textContent = rootHint;
        centerGroup.appendChild(subText);
    }

    nodesGroup.appendChild(centerGroup);
    container.appendChild(svg);

    h3Content.insertBefore(container, h3Content.firstChild);

    // --- ③ スマホ・PC両対応の1本指スクロール（パン）＆2本指ピンチズーム制御 ---
    let panX = 0;
    let panY = 0;
    let scale = 1;
    let isDraggingMoved = false;

    const activePointers = new Map<number, { x: number; y: number }>();
    let initialPinchDist = 0;
    let initialScale = 1;

    const updateTransform = (): void => {
        viewportGroup.setAttribute(
            "transform",
            `translate(${panX.toFixed(1)}, ${panY.toFixed(1)}) scale(${scale.toFixed(3)})`
        );
    };

    resetBtn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        panX = 0;
        panY = 0;
        scale = 1;
        updateTransform();
    });

    const onPointerDown = (e: PointerEvent): void => {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        isDraggingMoved = false;

        if (activePointers.size === 2) {
            // ③ 2本指タッチ開始（ピンチズーム準備）
            const pts = Array.from(activePointers.values());
            initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            initialScale = scale;
        }
        svg.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent): void => {
        if (!activePointers.has(e.pointerId)) return;
        const oldPt = activePointers.get(e.pointerId)!;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.size === 2) {
            // ③ 2本指によるピンチ拡大縮小
            isDraggingMoved = true;
            const pts = Array.from(activePointers.values());
            const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (initialPinchDist > 0) {
                const factor = currentDist / initialPinchDist;
                scale = Math.min(2.5, Math.max(0.5, initialScale * factor));
                updateTransform();
            }
        } else if (activePointers.size === 1) {
            // ③ 1本指のスクロール（パン移動）
            const dx = e.clientX - oldPt.x;
            const dy = e.clientY - oldPt.y;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                isDraggingMoved = true;
            }
            if (isDraggingMoved) {
                const rect = svg.getBoundingClientRect();
                const ratioX = rect.width > 0 ? 720 / rect.width : 1;
                const ratioY = rect.height > 0 ? 400 / rect.height : 1;
                panX += dx * ratioX;
                panY += dy * ratioY;
                updateTransform();
            }
        }
    };

    const onPointerUp = (e: PointerEvent): void => {
        activePointers.delete(e.pointerId);
        if (activePointers.size === 0) {
            svg.style.cursor = "grab";
            setTimeout(() => {
                isDraggingMoved = false;
            }, 50);
        }
    };

    const onWheel = (e: WheelEvent): void => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.9;
        scale = Math.min(2.5, Math.max(0.5, scale * factor));
        updateTransform();
    };

    svg.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    svg.addEventListener("wheel", onWheel, { passive: false });

    return () => {
        svg.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        svg.removeEventListener("wheel", onWheel);
        container.remove();
    };
}