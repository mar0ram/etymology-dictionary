const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbyAwFoznSgLG_yThnBw7pO6796V4zG_12QRbcklkgEzJV8WBFP3emtDgZ32FiMpnwSh/exec";

const NGRAM_THEME = {
    lineColors: [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
        "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
        "#14b8a6", "#eab308", "#d946ef", "#64748b", "#b45309"
    ],
    axisTextColor: "#888888",
    gridColor: "rgba(136, 136, 136, 0.25)",
    tooltipBg: "rgba(20, 20, 20, 0.9)",
    tooltipText: "#ffffff",
    fontFamily: "sans-serif"
};

const ngramDataCache = {};

function ensureNgramStyles() {
    if (document.getElementById("ngram-custom-style")) return;
    const style = document.createElement("style");
    style.id = "ngram-custom-style";
    style.textContent = `
        .ngram-box {
            margin-top: 20px;
            padding: 16px;
            border: 1px solid #cccccc;
            border-radius: 8px;
            background-color: rgba(255, 255, 255, 0.05);
            color: inherit;
        }
        .ngram-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 0.9rem;
        }
        .ngram-word-input-group,
        .ngram-year-group {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }
        .ngram-word-input {
            padding: 4px 8px;
            border: 1px solid #cccccc;
            border-radius: 4px;
            background: transparent;
            color: inherit;
            font-size: 0.9rem;
            width: 160px;
        }
        .ngram-year-input {
            padding: 4px 6px;
            border: 1px solid #cccccc;
            border-radius: 4px;
            background: transparent;
            color: inherit;
            font-size: 0.9rem;
            width: 68px;
            text-align: center;
        }
        .ngram-btn,
        .ngram-preset-btn {
            padding: 4px 10px;
            border: 1px solid #cccccc;
            border-radius: 4px;
            background: transparent;
            color: inherit;
            cursor: pointer;
            font-size: 0.8rem;
        }
        .ngram-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }
        .ngram-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 0.85rem;
            color: #ffffff;
        }
        .ngram-tag-remove {
            cursor: pointer;
            font-weight: bold;
            line-height: 1;
        }
        .ngram-status {
            font-size: 0.85rem;
            margin-bottom: 6px;
            min-height: 1.2em;
        }
        .ngram-chart-container {
            position: relative;
            width: 100%;
            height: 300px;
        }
        @media (max-width: 600px) {
            .ngram-box {
                padding: 12px;
            }
            .ngram-chart-container {
                height: 240px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Base64やHTML埋め込みデータも含めてJSON配列を取り出すヘルパー関数
function parseNgramResponse(rawText) {
    if (!rawText || typeof rawText !== "string") return null;
    let text = rawText.trim();

    if (text.startsWith("data:") && text.includes(";base64,")) {
        const base64Part = text.split(";base64,")[1];
        text = atob(base64Part);
    }

    if (text.startsWith("[")) {
        return JSON.parse(text);
    }

    const scriptMatch = text.match(/<script[^>]*id=["']ngrams-data["'][^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch && scriptMatch[1]) {
        return JSON.parse(scriptMatch[1].trim());
    }
    const varMatch = text.match(/var\s+data\s*=\s*(\[\{[\s\S]*?\}\]);/);
    if (varMatch && varMatch[1]) {
        return JSON.parse(varMatch[1]);
    }

    return null;
}

async function fetchNgramTimeseries(word) {
    const cleanWord = word.trim();
    if (ngramDataCache[cleanWord]) {
        return ngramDataCache[cleanWord];
    }

    const jsonUrl = `https://books.google.com/ngrams/json?content=${encodeURIComponent(cleanWord)}&year_start=1500&year_end=2022&corpus=26&smoothing=3`;
    const graphUrl = `https://books.google.com/ngrams/graph?content=${encodeURIComponent(cleanWord)}&year_start=1500&year_end=2022&corpus=26&smoothing=3`;

    const fetchers = [];

    // 1. Google Apps Script プロキシ（設定されている場合は最優先で使用）
    if (GAS_PROXY_URL) {
        fetchers.push(async () => {
            const res = await fetch(`${GAS_PROXY_URL}?word=${encodeURIComponent(cleanWord)}`);
            if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
            return await res.json();
        });
    }

    // 2. フォールバック用公開プロキシ
    fetchers.push(async () => {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(jsonUrl)}`);
        if (!res.ok) throw new Error(`allorigins raw HTTP ${res.status}`);
        const text = await res.text();
        return parseNgramResponse(text);
    });

    fetchers.push(async () => {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jsonUrl)}`);
        if (!res.ok) throw new Error(`allorigins get HTTP ${res.status}`);
        const wrapper = await res.json();
        return parseNgramResponse(wrapper.contents);
    });

    fetchers.push(async () => {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(graphUrl)}`);
        if (!res.ok) throw new Error(`allorigins graph HTTP ${res.status}`);
        const wrapper = await res.json();
        return parseNgramResponse(wrapper.contents);
    });

    fetchers.push(async () => {
        const res = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(jsonUrl)}`);
        if (!res.ok) throw new Error(`codetabs HTTP ${res.status}`);
        const text = await res.text();
        return parseNgramResponse(text);
    });

    for (const fetcher of fetchers) {
        try {
            const json = await fetcher();
            if (Array.isArray(json)) {
                if (json.length > 0 && Array.isArray(json[0].timeseries)) {
                    const series = json[0].timeseries.map(v => v * 100);
                    ngramDataCache[cleanWord] = series;
                    return series;
                }
                return null;
            }
        } catch (e) {
            console.warn("Ngramプロキシ試行失敗:", e.message || e);
        }
    }
    throw new Error("すべてのプロキシでデータ取得に失敗しました");
}

export function setupNgramInSection(container, initialWord) {
    ensureNgramStyles();

    const MIN_YEAR = 1500;
    const MAX_YEAR = 2022;

    const box = document.createElement("div");
    box.className = "ngram-box";
    box.innerHTML = `
        <div class="ngram-controls">
            <div class="ngram-word-input-group">
                <input type="text" class="ngram-word-input" placeholder="比較する単語を追加">
                <button type="button" class="ngram-btn ngram-add-btn">追加</button>
            </div>
            <div class="ngram-year-group">
                <span>年代:</span>
                <input type="number" class="ngram-year-input ngram-start-year" min="${MIN_YEAR}" max="${MAX_YEAR - 1}" value="1900">
                <span>〜</span>
                <input type="number" class="ngram-year-input ngram-end-year" min="${MIN_YEAR + 1}" max="${MAX_YEAR}" value="2022">
                <div style="flex-basis: 100%; height: 0; margin-bottom: 0;"></div>
                <button type="button" class="ngram-preset-btn" data-start="1500" data-end="1900">近代英語</button>
                <button type="button" class="ngram-preset-btn" data-start="1900" data-end="2022">現代英語</button>
                <button type="button" class="ngram-preset-btn" data-start="1500" data-end="2022">全期間</button>
            </div>
        </div>
        <div class="ngram-tags"></div>
        <div class="ngram-status"></div>
        <div class="ngram-chart-container">
            <canvas style="width: 100%; height: 100%; display: block;"></canvas>
        </div>
        <div class="ngram-description" style="color: #7e7e7e; font-size: 0.85em; margin-top: 10px;">
            ※このグラフは Google Books Ngram Viewer のデータを使用しています。<br>
            Googleブックスに収録された書籍の中で、各年代にその単語がどのくらいの頻度（割合）で使われていたかの推移を示しています。<br>
            このグラフはあくまで参考値であり、必ずしも正確な言語使用の統計を表すものではありません。
        </div>
    `;
    container.appendChild(box);

    const wordInput = box.querySelector(".ngram-word-input");
    const addBtn = box.querySelector(".ngram-add-btn");
    const startYearInput = box.querySelector(".ngram-start-year");
    const endYearInput = box.querySelector(".ngram-end-year");
    const presetBtns = box.querySelectorAll(".ngram-preset-btn");
    const tagsContainer = box.querySelector(".ngram-tags");
    const statusEl = box.querySelector(".ngram-status");
    const chartContainer = box.querySelector(".ngram-chart-container");
    const canvas = box.querySelector("canvas");

    let activeWords = [];
    let hoverIndex = null;

    function renderTags() {
        tagsContainer.innerHTML = "";
        activeWords.forEach((item, idx) => {
            const tag = document.createElement("span");
            tag.className = "ngram-tag";
            tag.style.backgroundColor = item.color;
            tag.innerHTML = `<span>${item.word}</span><span class="ngram-tag-remove" title="削除">×</span>`;
            tag.querySelector(".ngram-tag-remove").addEventListener("click", () => {
                activeWords.splice(idx, 1);
                renderTags();
                drawCustomChart();
            });
            tagsContainer.appendChild(tag);
        });
    }

    function drawCustomChart() {
        const rect = chartContainer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        ctx.clearRect(0, 0, width, height);

        let startY = parseInt(startYearInput.value, 10) || MIN_YEAR;
        let endY = parseInt(endYearInput.value, 10) || MAX_YEAR;
        if (startY < MIN_YEAR) startY = MIN_YEAR;
        if (endY > MAX_YEAR) endY = MAX_YEAR;
        if (startY >= endY) startY = endY - 1;

        const startIndex = startY - MIN_YEAR;
        const endIndex = endY - MIN_YEAR + 1;
        const count = endIndex - startIndex;

        const padLeft = 64;
        const padRight = 16;
        const padTop = 16;
        const padBottom = 28;
        const plotW = Math.max(10, width - padLeft - padRight);
        const plotH = Math.max(10, height - padTop - padBottom);

        let maxVal = 0;
        activeWords.forEach(item => {
            const slice = item.series.slice(startIndex, endIndex);
            for (let i = 0; i < slice.length; i++) {
                if (slice[i] > maxVal) maxVal = slice[i];
            }
        });
        if (maxVal === 0) maxVal = 0.001;
        else maxVal *= 1.1;

        ctx.font = `11px ${NGRAM_THEME.fontFamily}`;
        ctx.lineWidth = 1;

        const yTicks = 4;
        for (let i = 0; i <= yTicks; i++) {
            const ratio = i / yTicks;
            const y = padTop + plotH - ratio * plotH;
            const val = ratio * maxVal;

            ctx.strokeStyle = NGRAM_THEME.gridColor;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(padLeft + plotW, y);
            ctx.stroke();

            ctx.fillStyle = NGRAM_THEME.axisTextColor;
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            const label = maxVal < 0.01 ? val.toFixed(5) + "%" : val.toFixed(3) + "%";
            ctx.fillText(label, padLeft - 6, y);
        }

        const xTicks = width < 480 ? 4 : 7;
        ctx.fillStyle = NGRAM_THEME.axisTextColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let i = 0; i <= xTicks; i++) {
            const idx = Math.round((i / xTicks) * (count - 1));
            const year = startY + idx;
            const x = padLeft + (idx / Math.max(1, count - 1)) * plotW;

            ctx.strokeStyle = NGRAM_THEME.gridColor;
            ctx.beginPath();
            ctx.moveTo(x, padTop);
            ctx.lineTo(x, padTop + plotH);
            ctx.stroke();

            ctx.fillText(String(year), x, padTop + plotH + 6);
        }

        activeWords.forEach(item => {
            const slice = item.series.slice(startIndex, endIndex);
            if (slice.length === 0) return;

            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < slice.length; i++) {
                const x = padLeft + (i / Math.max(1, count - 1)) * plotW;
                const y = padTop + plotH - (slice[i] / maxVal) * plotH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < count && activeWords.length > 0) {
            const x = padLeft + (hoverIndex / Math.max(1, count - 1)) * plotW;
            const year = startY + hoverIndex;

            ctx.strokeStyle = NGRAM_THEME.axisTextColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padTop);
            ctx.lineTo(x, padTop + plotH);
            ctx.stroke();

            const lines = [`${year}年`];
            activeWords.forEach(item => {
                const val = item.series[startIndex + hoverIndex] || 0;
                lines.push(`${item.word}: ${val.toFixed(5)}%`);
            });

            ctx.font = `12px ${NGRAM_THEME.fontFamily}`;
            let boxW = 0;
            lines.forEach(line => {
                const w = ctx.measureText(line).width;
                if (w > boxW) boxW = w;
            });
            boxW += 16;
            const boxH = lines.length * 18 + 10;

            let tipX = x + 10;
            if (tipX + boxW > width - 4) tipX = x - boxW - 10;
            const tipY = padTop + 8;

            ctx.fillStyle = NGRAM_THEME.tooltipBg;
            ctx.fillRect(tipX, tipY, boxW, boxH);

            ctx.fillStyle = NGRAM_THEME.tooltipText;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            lines.forEach((line, idx) => {
                ctx.fillText(line, tipX + 8, tipY + 6 + idx * 18);
            });
        }
    }

    function handlePointer(clientX) {
        const rect = canvas.getBoundingClientRect();
        const padLeft = 64;
        const padRight = 16;
        const plotW = Math.max(10, rect.width - padLeft - padRight);
        const relX = clientX - rect.left - padLeft;

        let startY = parseInt(startYearInput.value, 10) || MIN_YEAR;
        let endY = parseInt(endYearInput.value, 10) || MAX_YEAR;
        if (startY < MIN_YEAR) startY = MIN_YEAR;
        if (endY > MAX_YEAR) endY = MAX_YEAR;
        if (startY >= endY) startY = endY - 1;
        const count = endY - startY + 1;

        if (relX < 0 || relX > plotW) {
            hoverIndex = null;
        } else {
            hoverIndex = Math.round((relX / plotW) * (count - 1));
        }
        drawCustomChart();
    }

    canvas.addEventListener("mousemove", (e) => handlePointer(e.clientX));
    canvas.addEventListener("mouseleave", () => {
        hoverIndex = null;
        drawCustomChart();
    });
    canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) handlePointer(e.touches[0].clientX);
    }, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
            drawCustomChart();
        });
        ro.observe(chartContainer);
    } else {
        window.addEventListener("resize", drawCustomChart);
    }

    const POS_DEFINITIONS = [
        { tag: "NOUN", label: "N", dictNames: ["noun"] },
        { tag: "VERB", label: "V", dictNames: ["verb"] },
        { tag: "ADJ", label: "ADJ", dictNames: ["adjective"] },
        { tag: "ADV", label: "ADV", dictNames: ["adverb"] }
    ];

    async function resolveWordEntries(word) {
        // すでに "complete(ADJ)" のように品詞付きで指定された場合
        const explicitMatch = word.match(/^([a-zA-Z]+)\((N|V|ADJ|ADV)\)$/i);
        if (explicitMatch) {
            const base = explicitMatch[1];
            const label = explicitMatch[2].toUpperCase();
            const def = POS_DEFINITIONS.find(p => p.label === label);
            if (def) {
                const series = await fetchNgramTimeseries(`${base}_${def.tag}`);
                return series ? [{ displayWord: `${base}(${def.label})`, series }] : [];
            }
        }

        // 単一の英単語以外（フレーズ等）はそのまま検索
        if (!/^[a-zA-Z]+$/.test(word)) {
            const series = await fetchNgramTimeseries(word);
            return series ? [{ displayWord: word, series }] : [];
        }

        // 辞書APIでその単語が持つ品詞を確認（失敗時はNgramデータのみで判定）
        let dictPosSet = null;
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const found = new Set();
                    data.forEach(entry => {
                        if (Array.isArray(entry.meanings)) {
                            entry.meanings.forEach(m => {
                                if (m.partOfSpeech) found.add(m.partOfSpeech.toLowerCase());
                            });
                        }
                    });
                    if (found.size > 0) dictPosSet = found;
                }
            }
        } catch (e) {
            // 辞書APIが利用できない場合はNgramの頻度判定にフォールバック
        }

        const candidateDefs = dictPosSet
            ? POS_DEFINITIONS.filter(def => def.dictNames.some(d => dictPosSet.has(d)))
            : POS_DEFINITIONS;

        // 複数の品詞候補がある場合、品詞ごとにNgramデータを取得
        if (candidateDefs.length >= 2) {
            const results = await Promise.all(
                candidateDefs.map(async (def) => {
                    try {
                        const series = await fetchNgramTimeseries(`${word}_${def.tag}`);
                        if (!series) return null;
                        const maxVal = Math.max(...series);
                        return maxVal > 0 ? { def, series, maxVal } : null;
                    } catch (e) {
                        return null;
                    }
                })
            );

            const validResults = results.filter(Boolean);
            if (validResults.length >= 2) {
                const overallMax = Math.max(...validResults.map(r => r.maxVal));
                // Ngram上の誤解析ノイズ（最大頻度の3%未満の微小な品詞データ）を除外
                const significantResults = validResults.filter(r => r.maxVal >= overallMax * 0.03);

                if (significantResults.length >= 2) {
                    return significantResults.map(r => ({
                        displayWord: `${word}(${r.def.label})`,
                        series: r.series
                    }));
                }
            }
        }

        // 品詞が1つしかない場合は通常の単語として検索
        const series = await fetchNgramTimeseries(word);
        return series ? [{ displayWord: word, series }] : [];
    }

    async function addWordToGraph(targetWord) {
        if (/[,、]/.test(targetWord)) {
            const words = targetWord.split(/[,、]/).map(s => s.trim()).filter(Boolean);
            for (const word of words) {
                await addWordToGraph(word);
            }
            return;
        }

        const w = targetWord.trim();
        if (!w) return;

        if (activeWords.some(item => item.word.toLowerCase() === w.toLowerCase() || item.word.toLowerCase().startsWith(w.toLowerCase() + "("))) {
            statusEl.textContent = `「${w}」は既に表示されています。`;
            return;
        }

        statusEl.textContent = `「${w}」のNgramデータを取得中...`;
        addBtn.disabled = true;

        try {
            const entries = await resolveWordEntries(w);
            if (entries.length === 0) {
                statusEl.textContent = `「${w}」のデータが見つかりませんでした。`;
            } else {
                entries.forEach(entry => {
                    if (activeWords.some(item => item.word.toLowerCase() === entry.displayWord.toLowerCase())) return;

                    const usedColors = activeWords.map(item => item.color);
                    const nextColor = NGRAM_THEME.lineColors.find(c => !usedColors.includes(c))
                        || NGRAM_THEME.lineColors[activeWords.length % NGRAM_THEME.lineColors.length];

                    activeWords.push({
                        word: entry.displayWord,
                        series: entry.series,
                        color: nextColor
                    });
                });
                statusEl.textContent = "";
                renderTags();
                drawCustomChart();
            }
        } catch (err) {
            statusEl.textContent = "データの取得に失敗しました。時間をおいて再試行してください。";
        } finally {
            addBtn.disabled = false;
        }
    }

    addBtn.addEventListener("click", () => {
        addWordToGraph(wordInput.value);
        wordInput.value = "";
    });
    wordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addWordToGraph(wordInput.value);
            wordInput.value = "";
        }
    });

    startYearInput.addEventListener("change", drawCustomChart);
    endYearInput.addEventListener("change", drawCustomChart);

    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            startYearInput.value = btn.dataset.start;
            endYearInput.value = btn.dataset.end;
            drawCustomChart();
        });
    });

    addWordToGraph(initialWord);
}