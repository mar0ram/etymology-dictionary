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

let data = [];
let dataLoaded = false;

// JSON読み込み
fetch("data.json")
    .then(res => res.json())
    .then(json => {
        data = json;
        dataLoaded = true;
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
prependEntry();

// 💡 検索窓への入力監視 (×ボタンの表示/非表示切り替え)
searchBox.addEventListener("input", () => {
    if (searchBox.value.length > 0) {
        clearBtn.style.display = "flex";
    } else {
        clearBtn.style.display = "none";
    }
});

// 💡 クリアボタン押下時の処理
clearBtn.addEventListener("click", () => {
    searchBox.value = ""; // 検索窓の文字を空にする
    clearBtn.style.display = "none"; // ×ボタンを非表示にする
    searchBox.focus(); // 検索窓にフォーカスを戻す（次の入力を促す）
    results.innerHTML = "";
    prependEntry();
    resetZoom(); // ズームリセット関数を実行
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
    doSearch();
    resetZoom();
});

// Enter押下
searchBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (!dataLoaded) {
            results.innerHTML = "<p>データを読み込み中です。少し待ってから再試行してください。</p>";
            return;
        }
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

        const actualNum = numInput + 1500; // Excel 実際の行番号

        filtered = data.filter(item => {
            return item.num === actualNum;
        });

    } else {
        // --- 英単語検索モード ---
        filtered = data.filter(item => {
            // 1〜1500 行のみ対象
            if (item.num > 1500) return false;
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
    let html = text.replace(/\r?\n/g, "<br>");
    html = html.replace(/([「『（【［〔〈《｛〚｟])/g, '<span class="margin-left-only">$1</span>');
    html = html.replace(/([」』）】］〕〉》｝〛｠])/g, '<span class="margin-right-bracket">$1</span>'); // 閉じ括弧用
    html = html.replace(/([、。])/g, '<span class="margin-right-punctuation">$1</span>'); // 句読点用
    html = html.replace(/([・：])/g, '<span class="margin-both">$1</span>');

    // 4パターンの連続記号に対して、それぞれ独立した余白調整用クラスを後続の記号に付与
    html = html.replace(/(<span class="margin-right-bracket"[^>]*>[」』）】］〕〉》｝〛｠]<\/span>)<span class="margin-both"[^>]*>([・：])<\/span>/g, '$1<span class="margin-both margin-reduce-bracket-dot">$2</span>');
    html = html.replace(/(<span class="margin-both"[^>]*>[・：]<\/span>)<span class="margin-left-only"[^>]*>([「『（【［〔〈《｛〚｟])<\/span>/g, '$1<span class="margin-left-only margin-reduce-dot-bracket">$2</span>');
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
        } else {
            const numVal = parseInt(displayNum, 10);
            if (numVal >= 1501) {
                displayNum = numVal - 1500;
            }
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

        // Merriam-WebsterのJSONから音声ファイル名（暗号のような文字列）を抽出
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            let targetEntry = data[0]; // デフォルトは一番最初の検索結果

            // エクセルから取得した品詞(partOfSpeech)の指定がある場合、一致するものを探す
            if (partOfSpeech) {
                const searchPos = partOfSpeech.trim().toLowerCase();
                const matchedEntry = data.find(entry => {
                    if (!entry.fl) return false;
                    const fl = entry.fl.toLowerCase();
                    // M-W特有の「transitive verb」などにもヒットさせるため、includesを使用
                    return fl === searchPos || fl.includes(searchPos);
                });

                if (matchedEntry) {
                    targetEntry = matchedEntry;
                }
            }

            // 発音データ(prs)と音声データ(sound.audio)が存在するかチェック
            if (targetEntry.hwi && targetEntry.hwi.prs && targetEntry.hwi.prs.length > 0 && targetEntry.hwi.prs[0].sound) {
                audioFileName = targetEntry.hwi.prs[0].sound.audio;
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

        // 音声データが見つかった場合のみアイコンを表示
        if (audioUrl) {
            const audioBox = document.getElementById(`audio-box-${num}`);
            if (audioBox) {
                // 連打防止のため、onclick属性を外し、JS側でイベントリスナーを設定する形に変更
                audioBox.innerHTML = `<span class="audio_button" style="cursor:pointer;"><i class="fa-solid fa-volume-high fa-rotate-by fa-sm" style="color: #ffffff; --fa-rotate-angle: 340deg;"></i></span>`;

                const btn = audioBox.querySelector('.audio_button');

                const audio = new Audio(audioUrl);
                audio.preload = 'auto';

                btn.addEventListener('click', function () {
                    // すでに無効化されている（再生中）場合は処理を抜ける
                    if (btn.style.pointerEvents === 'none') return;

                    // タップを無効化し、少し半透明にして再生中であることを視覚的に示す
                    btn.style.pointerEvents = 'none';
                    btn.style.opacity = '0.5';

                    audio.currentTime = 0;

                    // 再生終了時にタップを有効化して元の濃さに戻す
                    audio.onended = () => {
                        btn.style.pointerEvents = 'auto';
                        btn.style.opacity = '1';
                    };

                    // エラー時も元に戻す（無効化されっぱなしを防ぐ）
                    audio.onerror = () => {
                        btn.style.pointerEvents = 'auto';
                        btn.style.opacity = '1';
                    };

                    // 再生開始（失敗した場合も元に戻す）
                    audio.play().catch(() => {
                        btn.style.pointerEvents = 'auto';
                        btn.style.opacity = '1';
                    });
                });
            }
        }
    } catch (error) {
        // 音声がない場合やエラー時はプレースホルダーのdivは空のまま（アイコン非表示）
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