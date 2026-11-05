interface IpaGuideEntry {
    symbol: string;
    category: "vowel" | "diphthong" | "consonant" | "stress";
    title: string;
    tip: string;
}

const IPA_GUIDE_MAP: Record<string, IpaGuideEntry> = {
    "ˈ": { symbol: "ˈ", category: "stress", title: "第一強勢（メインアクセント）", tip: "直後の音節を最も「高く・長く・強く」発音します。英語のリズムの核となる位置です。" },
    "ˌ": { symbol: "ˌ", category: "stress", title: "第二強勢（副次アクセント）", tip: "直後の音節を第一強勢より少し抑えつつ、弱音節よりはっきり発音してリズムを作ります。" },
    "juː": { symbol: "juː", category: "diphthong", title: "半母音 + 長母音 /juː/", tip: "日本語の「ユー」に近い音ですが、唇を丸めて前に突き出しながら長めに発音します。" },
    "jʊ": { symbol: "jʊ", category: "diphthong", title: "半母音 + 短母音 /jʊ/", tip: "唇を軽く丸め、力を抜いて短く「ユ」と発音します。" },
    "aʊ": { symbol: "aʊ", category: "diphthong", title: "二重母音 /aʊ/", tip: "口を大きく開けた「ア」から始め、唇を丸めた「ウ」へ向かって滑らかに音を変化させます。" },
    "eɪ": { symbol: "eɪ", category: "diphthong", title: "二重母音 /eɪ/", tip: "「エ」から「イ」へ滑らかに繋げます。「エー」と伸ばさず、最後に軽く「イ」を添えるのがコツです。" },
    "aɪ": { symbol: "aɪ", category: "diphthong", title: "二重母音 /aɪ/", tip: "口を広めに開けた「ア」から「イ」へ素早く滑らかに移行します。" },
    "ɔɪ": { symbol: "ɔɪ", category: "diphthong", title: "二重母音 /ɔɪ/", tip: "喉の奥を開いた「オ」から始め、「イ」へ向かって滑らかに変化させます。" },
    "oʊ": { symbol: "oʊ", category: "diphthong", title: "二重母音 /oʊ/", tip: "「オ」から始め、最後に唇をすぼめて「ウ」へ変化させます。「オー」と平らに伸ばさないよう注意します。" },
    "iː": { symbol: "iː", category: "vowel", title: "長母音 /iː/", tip: "口角を左右にしっかり引き、舌を高く保ったまま「イー」と長めに発音します。" },
    "uː": { symbol: "uː", category: "vowel", title: "長母音 /uː/", tip: "唇を丸く前に突き出し、舌の奥を引き上げて「ウー」と長めに発音します。" },
    "ɑr": { symbol: "ɑr", category: "vowel", title: "R音化母音 /ɑr/", tip: "口を大きく開けて「アー」と発音しながら、同時に舌先をどこにも触れさせず奥へ巻きます。" },
    "ɔr": { symbol: "ɔr", category: "vowel", title: "R音化母音 /ɔr/", tip: "唇を少し丸めて「オー」と出しながら、舌先を上顎に触れさせずに奥へ引きます。" },
    "ər": { symbol: "ər", category: "vowel", title: "R音化曖昧母音 /ər/", tip: "口を軽く開けて力を抜き、舌先を宙に浮かせたまま短くこもった「アァ」のような音を出します。" },
    "æ": { symbol: "æ", category: "vowel", title: "短母音 /æ/（アとエの中間音）", tip: "口を横に広げつつ顎もしっかり下げ、舌先を下前歯の裏につけて「エ」の口で「ア」と発音します。" },
    "ɑ": { symbol: "ɑ", category: "vowel", title: "母音 /ɑ/", tip: "顎を大きく下げ、喉の奥を広く開けて明るくはっきりと「ア」と発音します。" },
    "ɔ": { symbol: "ɔ", category: "vowel", title: "母音 /ɔ/", tip: "顎を下げて口の中を縦に広く保ち、「ア」に近い響きを持った深い「オ」を発音します。" },
    "ʊ": { symbol: "ʊ", category: "vowel", title: "短母音 /ʊ/", tip: "唇を強く突き出さず、リラックスした状態で短く「ウ」（少し「オ」に近い響き）と発音します。" },
    "ə": { symbol: "ə", category: "vowel", title: "曖昧母音（シュワー） /ə/", tip: "英語で最も重要な弱母音です。口や舌の力を完全に抜き、ごく短く曖昧に「ア」と呟くように発音します。" },
    "e": { symbol: "e", category: "vowel", title: "短母音 /e/", tip: "日本語の「エ」よりも少し口を横に引き、歯切れよく短く発音します。" },
    "ɛ": { symbol: "ɛ", category: "vowel", title: "短母音 /ɛ/", tip: "口を少し広めに開け、リラックスして短く「エ」と発音します。" },
    "i": { symbol: "i", category: "vowel", title: "短母音 /i/", tip: "語末の -y や弱音節によく現れる、力を抜いた短い「イ」の音です。" },
    "ɪ": { symbol: "ɪ", category: "vowel", title: "短母音 /ɪ/", tip: "「イ」と「エ」の中間のような音です。口角を張らず、力を抜いて短く発音します。" },
    "ʌ": { symbol: "ʌ", category: "vowel", title: "短母音 /ʌ/", tip: "口を軽く開け、短く鋭く「ア」と発音します。" },
    "tʃ": { symbol: "tʃ", category: "consonant", title: "無声破擦音 /tʃ/", tip: "舌先を歯茎の少し奥につけてから息を破裂させ、唇を少し丸めて「チュ」のように息だけで出します。" },
    "dʒ": { symbol: "dʒ", category: "consonant", title: "有声破擦音 /dʒ/", tip: "/tʃ/ の状態に声帯の振動（声）を加え、力強く「ヂュ／ジュ」と発音します。" },
    "θ": { symbol: "θ", category: "consonant", title: "無声歯摩擦音 /θ/（th）", tip: "上下の前歯の隙間に舌先を軽く触れさせ、その隙間から「ス」と息だけを漏らします。" },
    "ð": { symbol: "ð", category: "consonant", title: "有声歯摩擦音 /ð/（th）", tip: "上下の前歯に舌先を軽く触れさせ、隙間から息を出しながら声帯を震わせて「ズ」と発音します。" },
    "ʃ": { symbol: "ʃ", category: "consonant", title: "無声後部歯茎摩擦音 /ʃ/（sh）", tip: "唇を少し前に丸めて突き出し、静かにさせる時の「シーッ」のように息を強く摩擦させます。" },
    "ʒ": { symbol: "ʒ", category: "consonant", title: "有声後部歯茎摩擦音 /ʒ/", tip: "/ʃ/ の口のまま声帯を震わせ、滑らかに「ジュ」と摩擦音を響かせます。" },
    "ŋ": { symbol: "ŋ", category: "consonant", title: "軟口蓋鼻音 /ŋ/（ng）", tip: "舌の奥を上顎の奥（軟口蓋）に密着させ、鼻から息を抜いて「ン」と響かせます。" },
    "p": { symbol: "p", category: "consonant", title: "無声両唇閉鎖音 /p/", tip: "両唇を閉じて息を止めたあと、勢いよく破裂させて「プッ」と発音します（声は出さない）。" },
    "b": { symbol: "b", category: "consonant", title: "有声両唇閉鎖音 /b/", tip: "両唇を閉じた状態から、声帯を震わせながら「ブッ」と力強く破裂させます。" },
    "t": { symbol: "t", category: "consonant", title: "無声歯茎閉鎖音 /t/", tip: "舌先を上の歯茎につけて息を止め、一気に離して「トゥ」と息を出します。" },
    "d": { symbol: "d", category: "consonant", title: "有声歯茎閉鎖音 /d/", tip: "舌先を歯茎につけ、声を響かせながら「ドゥ」と弾きます。" },
    "k": { symbol: "k", category: "consonant", title: "無声軟口蓋閉鎖音 /k/", tip: "舌の奥を上顎の奥につけて息を止め、勢いよく離して「クッ」と出します。" },
    "g": { symbol: "g", category: "consonant", title: "有声軟口蓋閉鎖音 /g/", tip: "舌の奥を上顎の奥につけ、声を響かせながら「グッ」と破裂させます。" },
    "s": { symbol: "s", category: "consonant", title: "無声歯茎摩擦音 /s/", tip: "上下の歯を軽く閉じ、舌先を歯茎に近づけて「スーー」と息を擦らせます。" },
    "z": { symbol: "z", category: "consonant", title: "有声歯茎摩擦音 /z/", tip: "/s/ の口のまま声帯を震わせ、低く「ズーー」と響かせます。" },
    "h": { symbol: "h", category: "consonant", title: "声門摩擦音 /h/", tip: "口や舌に力を入れず、喉の奥から「ハッ、ヒッ」と息を吐き出すように出します。" },
    "m": { symbol: "m", category: "consonant", title: "両唇鼻音 /m/", tip: "唇を軽く閉じ、鼻に抜ける声を響かせながら「ムーー」と発音します。" },
    "n": { symbol: "n", category: "consonant", title: "歯茎鼻音 /n/", tip: "舌先を上歯茎につけ、鼻から声を抜いて「ンー」と響かせます。" },
    "r": { symbol: "r", category: "consonant", title: "接近音 /r/", tip: "舌先を口の中のどこにも触れさせず奥へ引き、唇を少し丸めて「ウ」の構えから始めます。" },
    "l": { symbol: "l", category: "consonant", title: "側面接近音 /l/", tip: "舌先を上の前歯の付け根（歯茎）にしっかりと押し当てて発音します。" },
    "v": { symbol: "v", category: "consonant", title: "有声唇歯摩擦音 /v/", tip: "上の前歯を下唇の内側に軽く当て、隙間から息を出しながら声帯を震わせます。" },
    "f": { symbol: "f", category: "consonant", title: "無声唇歯摩擦音 /f/", tip: "上の前歯を下唇に軽く触れさせ、隙間から「フ」と息だけを摩擦させて出します。" },
    "w": { symbol: "w", category: "consonant", title: "両唇軟口蓋接近音 /w/", tip: "唇を小さくすぼめて突き出した状態から、素早く次の母音へ口を広げます。" },
    "j": { symbol: "j", category: "consonant", title: "硬口蓋接近音 /j/（y）", tip: "日本語の「ヤ・ユ・ヨ」の子音部分と同じく、舌の中央を上顎に近づけて発音します。" }
};

const SORTED_TOKEN_KEYS = Object.keys(IPA_GUIDE_MAP).sort((a, b) => b.length - a.length);

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tokenizeIpa(rawInner: string): string[] {
    const tokens: string[] = [];
    let idx = 0;
    while (idx < rawInner.length) {
        let matched = "";
        for (let k = 0; k < SORTED_TOKEN_KEYS.length; k++) {
            const key = SORTED_TOKEN_KEYS[k];
            if (rawInner.startsWith(key, idx)) {
                matched = key;
                break;
            }
        }
        if (matched) {
            tokens.push(matched);
            idx += matched.length;
        } else {
            tokens.push(rawInner[idx]);
            idx += 1;
        }
    }
    return tokens;
}

// ページ上ではすっきりとした1つのインタラクティブなボタン（カプセル）として表示
export function renderInteractiveIpaHtml(ipaText: string): string {
    if (!ipaText) return "";
    const rawInner = ipaText.replace(/^\/|\/$/g, "").trim();
    if (!rawInner) return escapeHtml(ipaText);

    return `
        <span class="ipa-pill-trigger" role="button" tabindex="0" title="タップして発音解説を表示" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: rgba(30, 41, 59, 0.85); border: 1px solid #334155; border-radius: 999px; color: #f8fafc; font-size: 13.5px; cursor: pointer; transition: all 0.2s ease; user-select: none;">
            <span style="color: #38bdf8; font-weight: 600;">/</span>
            <span>${escapeHtml(rawInner)}</span>
            <span style="color: #38bdf8; font-weight: 600;">/</span>
            <i class="fa-solid fa-circle-question" style="font-size: 11px; color: #00b4cc; margin-left: 2px;"></i>
        </span>
    `;
}

// ポップオーバーの管理
let activePopover: HTMLElement | null = null;
let activeTriggerEl: HTMLElement | null = null;

function closeIpaPopover(): void {
    if (activePopover) {
        activePopover.remove();
        activePopover = null;
    }
    if (activeTriggerEl) {
        activeTriggerEl.style.borderColor = "#334155";
        activeTriggerEl.style.backgroundColor = "rgba(30, 41, 59, 0.85)";
        activeTriggerEl = null;
    }
    window.removeEventListener("scroll", closeIpaPopover, true);
    window.removeEventListener("keydown", onPopoverKeydown);
    document.removeEventListener("pointerdown", onOutsidePointerDown);
}

function onPopoverKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
        closeIpaPopover();
    }
}

function onOutsidePointerDown(e: PointerEvent): void {
    const target = e.target as Node;
    if (activePopover && activePopover.contains(target)) return;
    if (activeTriggerEl && activeTriggerEl.contains(target)) return;
    closeIpaPopover();
}

function showIpaPopover(triggerEl: HTMLElement, ipaText: string, word: string): void {
    if (activeTriggerEl === triggerEl && activePopover) {
        closeIpaPopover();
        return;
    }

    closeIpaPopover();
    activeTriggerEl = triggerEl;
    triggerEl.style.borderColor = "#00b4cc";
    triggerEl.style.backgroundColor = "rgba(0, 180, 204, 0.15)";

    const rawInner = ipaText.replace(/^\/|\/$/g, "").trim();
    const tokens = tokenizeIpa(rawInner);

    const popover = document.createElement("div");
    popover.className = "ipa-guide-popover";
    Object.assign(popover.style, {
        position: "fixed",
        zIndex: "10000",
        width: "320px",
        maxWidth: "calc(100vw - 24px)",
        backgroundColor: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "12px",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.7)",
        padding: "16px",
        color: "#f8fafc",
        fontSize: "13px",
        lineHeight: "1.5",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    });

    popover.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
            <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">発音・音素ガイド (${escapeHtml(word)})</div>
                <div style="font-size: 14px; font-weight: 700; color: #38bdf8; margin-top: 2px;">音をタップしてコツを確認</div>
            </div>
            <span class="ipa-popover-close" style="cursor: pointer; color: #94a3b8; font-size: 18px; line-height: 1; padding: 2px 6px;">×</span>
        </div>
        <div class="ipa-chips-container" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; max-height: 110px; overflow-y: auto; padding: 2px;"></div>
        <div class="ipa-tip-box" style="background: rgba(30, 41, 59, 0.85); border: 1px solid #334155; border-radius: 8px; padding: 10px 12px;"></div>
    `;

    document.body.appendChild(popover);
    activePopover = popover;

    const closeBtn = popover.querySelector<HTMLElement>(".ipa-popover-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            closeIpaPopover();
        });
    }

    const chipsContainer = popover.querySelector<HTMLElement>(".ipa-chips-container")!;
    const tipBox = popover.querySelector<HTMLElement>(".ipa-tip-box")!;

    let activeChipBtn: HTMLButtonElement | null = null;

    const selectToken = (token: string, btn: HTMLButtonElement): void => {
        if (activeChipBtn) {
            activeChipBtn.style.backgroundColor = "#1e293b";
            activeChipBtn.style.borderColor = "#334155";
            activeChipBtn.style.color = "#f8fafc";
        }
        activeChipBtn = btn;
        btn.style.backgroundColor = "rgba(0, 180, 204, 0.25)";
        btn.style.borderColor = "#00b4cc";
        btn.style.color = "#38bdf8";

        const guide = IPA_GUIDE_MAP[token] || {
            symbol: token,
            title: `音素 /${token}/`,
            tip: "この音素の個別解説は準備中です。一般的な発音の基本に沿って短くクリアに発音しましょう。"
        };

        tipBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-weight: 700; color: #38bdf8; font-size: 14px;">/${escapeHtml(guide.symbol)}/</span>
                <span style="font-weight: 700; color: #f8fafc; font-size: 13px;">${escapeHtml(guide.title)}</span>
            </div>
            <div style="color: #cbd5e1; font-size: 12.5px; line-height: 1.5;">${escapeHtml(guide.tip)}</div>
        `;
    };

    let firstSelectableBtn: HTMLButtonElement | null = null;

    tokens.forEach(token => {
        if (token === " " || token === "·") return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = token;
        Object.assign(btn.style, {
            padding: "5px 10px",
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.15s ease"
        });

        btn.addEventListener("click", () => {
            selectToken(token, btn);
        });

        chipsContainer.appendChild(btn);
        if (!firstSelectableBtn && token !== "ˈ" && token !== "ˌ") {
            firstSelectableBtn = btn;
        } else if (!firstSelectableBtn) {
            firstSelectableBtn = btn;
        }
    });

    if (firstSelectableBtn) {
        (firstSelectableBtn as HTMLButtonElement).click();
    }

    // 位置調整
    const rect = triggerEl.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - popRect.width / 2;
    if (left < 12) left = 12;
    if (left + popRect.width > window.innerWidth - 12) {
        left = window.innerWidth - popRect.width - 12;
    }

    let top = rect.bottom + 8;
    if (top + popRect.height > window.innerHeight - 12) {
        top = Math.max(12, rect.top - popRect.height - 8);
    }

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;

    setTimeout(() => {
        window.addEventListener("scroll", closeIpaPopover, true);
        window.addEventListener("keydown", onPopoverKeydown);
        document.addEventListener("pointerdown", onOutsidePointerDown);
    }, 10);
}

export function bindInteractiveIpaEvents(container: HTMLElement, ipaText: string, word: string): void {
    const trigger = container.querySelector<HTMLElement>(".ipa-pill-trigger");
    if (!trigger) return;

    trigger.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        showIpaPopover(trigger, ipaText, word);
    });
}