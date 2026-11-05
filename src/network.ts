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

// 2つの文字列の共通プレフィックス長（接頭辞の類似度）を算出
function getCommonPrefixLength(a: string, b: string): number {
    const minLen = Math.min(a.length, b.length);
    let i = 0;
    while (i < minLen && a[i].toLowerCase() === b[i].toLowerCase()) {
        i++;
    }
    return i;
}

// 2つの文字列の共通サフィックス長（接尾辞の類似度）を算出
function getCommonSuffixLength(a: string, b: string): number {
    const minLen = Math.min(a.length, b.length);
    let i = 0;
    while (
        i < minLen &&
        a[a.length - 1 - i].toLowerCase() === b[b.length - 1 - i].toLowerCase()
    ) {
        i++;
    }
    return i;
}

// 構成要素（接頭辞・接尾辞）の類似度スコアを算出
function getAffixSimilarity(a: string, b: string): number {
    const prefix = getCommonPrefixLength(a, b);
    const suffix = getCommonSuffixLength(a, b);
    return prefix * 3 + suffix * 2;
}

// 2つのボックスがマージン込みで重なっているかを判定
function boxesOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    padX: number,
    padY: number
): boolean {
    return (
        Math.abs(ax - bx) < (aw + bw) / 2 + padX &&
        Math.abs(ay - by) < (ah + bh) / 2 + padY
    );
}

// 線分 (x1, y1)-(x2, y2) がボックス (bx, by, bw, bh) と交差するかを判定
function segmentIntersectsBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    pad: number
): boolean {
    const minX = bx - bw / 2 - pad;
    const maxX = bx + bw / 2 + pad;
    const minY = by - bh / 2 - pad;
    const maxY = by + bh / 2 + pad;

    const dx = x2 - x1;
    const dy = y2 - y1;

    let tMin = 0;
    let tMax = 1;

    if (Math.abs(dx) < 1e-6) {
        if (x1 < minX || x1 > maxX) return false;
    } else {
        const invDx = 1 / dx;
        let t1 = (minX - x1) * invDx;
        let t2 = (maxX - x1) * invDx;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return false;
    }

    if (Math.abs(dy) < 1e-6) {
        if (y1 < minY || y1 > maxY) return false;
    } else {
        const invDy = 1 / dy;
        let t1 = (minY - y1) * invDy;
        let t2 = (maxY - y1) * invDy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return false;
    }

    return tMin <= tMax;
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

    // ④ 接頭辞・接尾辞などの構成要素が似ている単語同士が隣り合うようにチェインソート
    const baseSorted = [...rawNodes].sort((a, b) => {
        const simA = getAffixSimilarity(currentWord, a.word);
        const simB = getAffixSimilarity(currentWord, b.word);
        if (simA !== simB) return simB - simA;
        return a.word.localeCompare(b.word);
    });

    const orderedRawNodes: typeof rawNodes = [];
    const remaining = [...baseSorted];
    orderedRawNodes.push(remaining.shift()!);

    while (remaining.length > 0) {
        const lastWord = orderedRawNodes[orderedRawNodes.length - 1].word;
        let bestIdx = 0;
        let bestScore = -1;

        for (let i = 0; i < remaining.length; i++) {
            const score =
                getAffixSimilarity(lastWord, remaining[i].word) * 2 +
                getAffixSimilarity(currentWord, remaining[i].word);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        orderedRawNodes.push(remaining.splice(bestIdx, 1)[0]);
    }

    // ① ボックスサイズ（単語のみ表示、はみ出ないサイズ）の決定
    const charWidth = 9;
    const paddingX = 26;
    const fixedHeight = 32;

    const relatedNodes: RelatedNode[] = orderedRawNodes.map(node => {
        const width = Math.max(80, Math.round(node.word.length * charWidth + paddingX));
        return {
            ...node,
            x: 0,
            y: 0,
            width,
            height: fixedHeight
        };
    });

    // 中心ノードのサイズを先に算出
    const rootHint = extractRootHint(item);
    const centerW = Math.max(96, currentWord.length * 10 + 24);
    const centerH = rootHint ? 42 : 34;

    // ②・④ 単語数が少ないときは中心の近く、多いときはボックスも線も重ならない距離に自動配置
    const count = relatedNodes.length;

    // 上下位置の横長ボックスが重なりにくいよう、各ボックスの見かけ幅に応じた角度配分を計算
    const angularWeights = relatedNodes.map((node, idx) => {
        const roughAngle = (2 * Math.PI * idx) / count - Math.PI / 2;
        return (
            node.width * (0.35 + 0.65 * Math.abs(Math.sin(roughAngle))) +
            node.height * Math.abs(Math.cos(roughAngle))
        );
    });
    const totalWeight = angularWeights.reduce((acc, w) => acc + w, 0);

    const angles: number[] = [];
    let accumWeight = 0;
    for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * accumWeight) / totalWeight;
        angles.push(angle);
        accumWeight += angularWeights[i];
    }

    // 各ノードの中心からの初期距離（中心ボックスと重ならない最小限の距離から開始）
    const radii = relatedNodes.map((node, idx) => {
        const angle = angles[idx];
        const cosA = Math.abs(Math.cos(angle));
        const sinA = Math.abs(Math.sin(angle));

        // 単語が少ないときは中心から離さず、重ならない最小限の余白にする
        const gapX = count <= 4 ? 26 : 32;
        const gapY = count <= 4 ? 22 : 28;

        const minRx = centerW / 2 + node.width / 2 + gapX;
        const minRy = centerH / 2 + node.height / 2 + gapY;
        const ellipseDist = 1 / Math.hypot(cosA / minRx, sinA / minRy);

        const clearX = cosA > 1e-4 ? (centerW / 2 + node.width / 2 + 18) / cosA : Infinity;
        const clearY = sinA > 1e-4 ? (centerH / 2 + node.height / 2 + 18) / sinA : Infinity;
        const boxClearDist = Math.min(clearX, clearY);

        const baseDist = Math.max(ellipseDist, boxClearDist);

        // 単語が少ないとき（4個以下）は段差なし、多いときは隣と段差をつける
        const ringCount = count <= 4 ? 1 : count <= 10 ? 2 : 3;
        const ringLevel = idx % ringCount;
        const ringStep = count <= 4 ? 0 : 24;

        return baseDist + ringLevel * ringStep;
    });

    const syncCoords = (): void => {
        for (let i = 0; i < count; i++) {
            relatedNodes[i].x = Math.cos(angles[i]) * radii[i];
            relatedNodes[i].y = Math.sin(angles[i]) * radii[i];
        }
    };
    syncCoords();

    // ボックス同士の重なり、および「他の単語へ伸びる線とボックスの交差」がゼロになるまで距離を調整
    const boxPadX = 14;
    const boxPadY = 10;
    const linePad = 7;

    for (let iter = 0; iter < 240; iter++) {
        let changed = false;

        // 1. 接続線 (0,0)->(nodeJ.x, nodeJ.y) が別のボックス nodeI と重なる場合、内側の nodeI を外側へ押し出して線から外す
        for (let i = 0; i < count; i++) {
            const nodeI = relatedNodes[i];
            for (let j = 0; j < count; j++) {
                if (i === j) continue;
                const nodeJ = relatedNodes[j];
                if (
                    segmentIntersectsBox(
                        0,
                        0,
                        nodeJ.x,
                        nodeJ.y,
                        nodeI.x,
                        nodeI.y,
                        nodeI.width,
                        nodeI.height,
                        linePad
                    )
                ) {
                    radii[i] += 6;
                    if (radii[j] < radii[i] + 18) {
                        radii[j] += 4;
                    }
                    syncCoords();
                    changed = true;
                }
            }
        }

        // 2. ボックス同士が重なる場合、距離を広げて衝突を解消
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const a = relatedNodes[i];
                const b = relatedNodes[j];
                if (
                    boxesOverlap(
                        a.x,
                        a.y,
                        a.width,
                        a.height,
                        b.x,
                        b.y,
                        b.width,
                        b.height,
                        boxPadX,
                        boxPadY
                    )
                ) {
                    const diff = Math.abs(radii[i] - radii[j]);
                    if (diff < 34) {
                        if (radii[i] <= radii[j]) {
                            radii[j] += 7;
                            radii[i] += 2;
                        } else {
                            radii[i] += 7;
                            radii[j] += 2;
                        }
                    } else {
                        radii[i] += 5;
                        radii[j] += 5;
                    }
                    syncCoords();
                    changed = true;
                }
            }
        }

        if (!changed) break;
    }

    relatedNodes.forEach(node => {
        node.x = Math.round(node.x);
        node.y = Math.round(node.y);
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

    // 全ノードが収まるビューポートサイズを算出（単語が少ないときは基準サイズを維持）
    let maxExtentX = centerW / 2 + 40;
    let maxExtentY = centerH / 2 + 40;
    relatedNodes.forEach(node => {
        maxExtentX = Math.max(maxExtentX, Math.abs(node.x) + node.width / 2 + 24);
        maxExtentY = Math.max(maxExtentY, Math.abs(node.y) + node.height / 2 + 28);
    });
    const viewWidth = Math.max(680, Math.ceil(maxExtentX * 2));
    const viewHeight = Math.max(380, Math.ceil(maxExtentY * 2));

    // SVGキャンバスの生成
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `${-viewWidth / 2} ${-viewHeight / 2} ${viewWidth} ${viewHeight}`);
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
                const ratioX = rect.width > 0 ? viewWidth / rect.width : 1;
                const ratioY = rect.height > 0 ? viewHeight / rect.height : 1;
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