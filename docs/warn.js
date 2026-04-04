import { gsap } from './gsap.js';

export function setupWarnAnimation() {
    const container = document.querySelector(".animation.warn");
    if (!container) return;

    // クラス名mlの要素を取得（基本は2つ前、無ければ全体から検索）
    let targetElement = container.previousElementSibling?.previousElementSibling;
    if (!targetElement || !targetElement.classList.contains("ml")) {
        targetElement = document.querySelector(".ml");
    }
    if (!targetElement) {
        console.warn(".ml element not found");
        return;
    }

    // 既存のコントロールがあれば初期化
    const oldControls = container.querySelector(".warn-controls");
    if (oldControls) oldControls.remove();
    // 既存のマスク画面があれば削除（body直下に置くため全体検索）
    const oldScreen = document.querySelector(".warn-screen");
    if (oldScreen) oldScreen.remove();

    // ボタンコンテナの作成
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "warn-controls";
    controlsContainer.style.display = "flex";
    controlsContainer.style.gap = "15px";
    controlsContainer.style.justifyContent = "center";
    controlsContainer.style.marginBottom = "20px";
    controlsContainer.style.position = "relative";
    controlsContainer.style.zIndex = "10";

    const buttonStyles = `
        padding: 10px 25px;
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 30px;
        color: #333333;
        cursor: pointer;
        font-weight: bold;
        letter-spacing: 1px;
        transition: all 0.3s ease;
    `;

    // 視覚的に目立つWARNボタン
    const warnBtn = document.createElement("button");
    warnBtn.textContent = "WARN";
    warnBtn.style.cssText = buttonStyles;
    warnBtn.style.background = "rgba(255, 0, 0, 0.1)";
    warnBtn.style.borderColor = "rgba(255, 0, 0, 0.5)";
    warnBtn.style.color = "#cc0000";

    // 通常の止めるボタン
    const stopBtn = document.createElement("button");
    stopBtn.textContent = "STOP";
    stopBtn.style.cssText = buttonStyles;
    stopBtn.style.opacity = "0.5";
    stopBtn.style.pointerEvents = "none";

    controlsContainer.appendChild(warnBtn);
    controlsContainer.appendChild(stopBtn);
    container.appendChild(controlsContainer);

    // ボタンのホバーエフェクト
    const addHover = (btn, isWarn) => {
        btn.addEventListener("mouseover", () => {
            if (btn.style.pointerEvents !== "none") {
                btn.style.background = isWarn ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.1)";
                btn.style.borderColor = isWarn ? "rgba(255, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)";
            }
        });
        btn.addEventListener("mouseout", () => {
            if (btn.style.pointerEvents !== "none") {
                btn.style.background = isWarn ? "rgba(255, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.05)";
                btn.style.borderColor = isWarn ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.2)";
            }
        });
    };
    addHover(warnBtn, true);
    addHover(stopBtn, false);

    // ml要素の上に被せるマスク用のコンテナ（bodyに絶対配置）
    const screen = document.createElement("div");
    screen.className = "warn-screen";
    // 後ろのテキストが見えるように背景を透過（半透明の黒）に変更
    screen.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    screen.style.position = "absolute";
    screen.style.overflow = "hidden";
    screen.style.display = "flex";
    screen.style.flexDirection = "column";
    screen.style.justifyContent = "center";
    screen.style.alignItems = "center";
    screen.style.opacity = "0"; // 初期は非表示
    screen.style.pointerEvents = "none";
    screen.style.zIndex = "1000"; // 他の要素を確実に覆う
    document.body.appendChild(screen);

    // 暗めの赤のパルス背景（サイレンの光）
    const glow = document.createElement("div");
    glow.style.position = "absolute";
    glow.style.top = "0";
    glow.style.left = "0";
    glow.style.width = "100%";
    glow.style.height = "100%";
    glow.style.background = "radial-gradient(circle, rgba(139,0,0,0.8) 0%, rgba(0,0,0,0) 80%)";
    glow.style.opacity = "0";
    screen.appendChild(glow);

    // コンテンツをまとめるラッパー（上下中央に揃える）
    const contentWrapper = document.createElement("div");
    contentWrapper.style.position = "relative";
    contentWrapper.style.zIndex = "2";
    contentWrapper.style.width = "100%";
    contentWrapper.style.height = "100%";
    contentWrapper.style.display = "flex";
    contentWrapper.style.flexDirection = "column";
    contentWrapper.style.justifyContent = "center"; // 上下中央
    contentWrapper.style.alignItems = "center";
    screen.appendChild(contentWrapper);

    // 帯のコンテナ用スタイル
    const bandContainerStyle = `
        width: 100%;
        overflow: hidden;
        display: flex;
        justify-content: flex-start;
    `;

    // 帯本体の共有スタイル（中は黒、縁は赤く発光）
    const bandStyle = `
        display: flex;
        width: max-content;
        white-space: nowrap;
        color: #000000;
        -webkit-text-stroke: 1.5px #ff0000;
        text-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.5);
        font-weight: bold;
        line-height: 1;
        letter-spacing: 4px;
    `;
    
    // 途切れないように長いテキストを用意
    const warningText = "WARNING ".repeat(50);
    const bandHTML = `<span>${warningText}</span><span>${warningText}</span>`;

    // 上の帯
    const topBandContainer = document.createElement("div");
    topBandContainer.style.cssText = bandContainerStyle;
    topBandContainer.style.marginBottom = "4px";
    const topBand = document.createElement("div");
    topBand.style.cssText = bandStyle;
    topBand.innerHTML = bandHTML;
    topBandContainer.appendChild(topBand);
    contentWrapper.appendChild(topBandContainer);

    // 中央のテキスト（白・h2要素）
    const centerText = document.createElement("h2");
    centerText.className = "h2";
    centerText.textContent = "警告！　注意！";
    centerText.style.color = "#ffffff";
    centerText.style.fontWeight = "bold";
    centerText.style.lineHeight = "1";
    centerText.style.margin = "0";
    centerText.style.textShadow = "0 0 10px rgba(255,255,255,0.3)";
    contentWrapper.appendChild(centerText);

    // 下の帯
    const bottomBandContainer = document.createElement("div");
    bottomBandContainer.style.cssText = bandContainerStyle;
    bottomBandContainer.style.marginTop = "4px";
    const bottomBand = document.createElement("div");
    bottomBand.style.cssText = bandStyle;
    bottomBand.innerHTML = bandHTML;
    bottomBandContainer.appendChild(bottomBand);
    contentWrapper.appendChild(bottomBandContainer);

    // アニメーションの参照を保持
    let pulseAnim = null;
    let topScrollAnim = null;
    let bottomScrollAnim = null;

    // WARNボタンのクリック処理
    warnBtn.addEventListener("click", () => {
        warnBtn.style.opacity = "0.5";
        warnBtn.style.pointerEvents = "none";
        stopBtn.style.opacity = "1";
        stopBtn.style.pointerEvents = "auto";

        // ml要素の現在の座標とサイズを取得してマスクを覆い被せる
        const rect = targetElement.getBoundingClientRect();
        screen.style.top = `${rect.top + window.scrollY}px`;
        screen.style.left = `${rect.left + window.scrollX}px`;
        screen.style.width = `${rect.width}px`;
        screen.style.height = `${rect.height}px`;
        
        // 対象要素に角丸があればマスクにも適用
        const computedStyle = window.getComputedStyle(targetElement);
        screen.style.borderRadius = computedStyle.borderRadius || "0px";

        // フォントサイズの調整（ml要素の幅を基準にする）
        const newTitleSize = rect.width < 450 ? "28px" : "48px";
        const newBandSize = rect.width < 450 ? "18px" : "28px";
        centerText.style.fontSize = newTitleSize;
        topBand.style.fontSize = newBandSize;
        bottomBand.style.fontSize = newBandSize;

        // 画面をフェードイン
        gsap.to(screen, { opacity: 1, duration: 0.5 });

        // サイレンのゆっくりとしたパルス
        pulseAnim = gsap.fromTo(glow, 
            { opacity: 0.1 }, 
            { opacity: 1, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" }
        );

        // スクロール速度を以前の0.7倍（秒数を70秒から100秒に延長）
        const scrollDuration = 100;

        // 上の帯：右から左へ途切れることなくスクロール
        gsap.set(topBand, { xPercent: 0 });
        topScrollAnim = gsap.to(topBand, {
            xPercent: -50,
            ease: "none",
            duration: scrollDuration,
            repeat: -1
        });

        // 下の帯：左から右へスクロール（逆方向）
        gsap.set(bottomBand, { xPercent: -50 });
        bottomScrollAnim = gsap.to(bottomBand, {
            xPercent: 0,
            ease: "none",
            duration: scrollDuration,
            repeat: -1
        });
    });

    // 止めるボタンのクリック処理
    stopBtn.addEventListener("click", () => {
        stopBtn.style.opacity = "0.5";
        stopBtn.style.pointerEvents = "none";
        warnBtn.style.opacity = "1";
        warnBtn.style.pointerEvents = "auto";

        // 画面をフェードアウトしてアニメーションを完全停止
        gsap.to(screen, { 
            opacity: 0, 
            duration: 0.3, 
            onComplete: () => {
                if (pulseAnim) pulseAnim.kill();
                if (topScrollAnim) topScrollAnim.kill();
                if (bottomScrollAnim) bottomScrollAnim.kill();
                gsap.set(topBand, { xPercent: 0 });
                gsap.set(bottomBand, { xPercent: -50 });
            }
        });
    });

    // リサイズ対応（マスクの追従とボタンの調整）
    const handleResize = () => {
        const windowWidth = container.clientWidth || window.innerWidth;
        const newButtonFontSize = windowWidth < 450 ? "10px" : "14px";
        warnBtn.style.fontSize = newButtonFontSize;
        stopBtn.style.fontSize = newButtonFontSize;

        // 表示中であればマスクのサイズと位置を再計算
        if (screen.style.opacity !== "0" && screen.style.opacity !== "") {
            const rect = targetElement.getBoundingClientRect();
            screen.style.top = `${rect.top + window.scrollY}px`;
            screen.style.left = `${rect.left + window.scrollX}px`;
            screen.style.width = `${rect.width}px`;
            screen.style.height = `${rect.height}px`;

            const newTitleSize = rect.width < 450 ? "28px" : "48px";
            const newBandSize = rect.width < 450 ? "18px" : "28px";
            centerText.style.fontSize = newTitleSize;
            topBand.style.fontSize = newBandSize;
            bottomBand.style.fontSize = newBandSize;
        }
    };
    
    handleResize(); // 初期実行
    window.addEventListener('resize', handleResize);
}