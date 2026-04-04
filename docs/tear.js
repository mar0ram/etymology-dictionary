import { gsap } from './gsap.js';

export function setupTearAnimation() {
    const container = document.querySelector(".animation.tear");
    if (!container) return;

    const targetElement = container.previousElementSibling?.previousElementSibling;
    if (!targetElement || !targetElement.classList.contains("ml")) {
        console.warn(".ml element not found before .animation.tear");
        return;
    }

    const oldControls = container.querySelector(".tear-controls");
    if (oldControls) oldControls.remove();

    const controlsContainer = document.createElement("div");
    controlsContainer.className = "tear-controls";
    controlsContainer.style.display = "flex";
    controlsContainer.style.gap = "15px";
    controlsContainer.style.justifyContent = "center";
    controlsContainer.style.marginTop = "20px";

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

    const tearBtn = document.createElement("button");
    tearBtn.textContent = "TEAR";
    tearBtn.style.cssText = buttonStyles;

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "RESET";
    resetBtn.style.cssText = buttonStyles;
    resetBtn.style.opacity = "0.5";
    resetBtn.style.pointerEvents = "none";

    controlsContainer.appendChild(tearBtn);
    controlsContainer.appendChild(resetBtn);
    container.appendChild(controlsContainer);

    const addHover = (btn) => {
        btn.addEventListener("mouseover", () => {
            if (btn.style.pointerEvents !== "none") {
                btn.style.background = "rgba(0, 0, 0, 0.1)";
                btn.style.borderColor = "rgba(0, 0, 0, 0.5)";
            }
        });
        btn.addEventListener("mouseout", () => {
            if (btn.style.pointerEvents !== "none") {
                btn.style.background = "rgba(0, 0, 0, 0.05)";
                btn.style.borderColor = "rgba(0, 0, 0, 0.2)";
            }
        });
    };
    addHover(tearBtn);
    addHover(resetBtn);

    // リサイズイベントの処理（ボタンのサイズを画面幅に合わせる）
    const handleResize = () => {
        const width = container.clientWidth || window.innerWidth;
        const newButtonFontSize = width < 450 ? "10px" : "14px";
        tearBtn.style.fontSize = newButtonFontSize;
        resetBtn.style.fontSize = newButtonFontSize;
    };
    handleResize(); // 初期化時に一度実行
    window.addEventListener('resize', handleResize);

    let isTorn = false;
    let wrapper = null;

    const generateJaggedPath = (width, height, segments) => {
        const points = [];
        const segmentHeight = height / segments;
        const centerX = width / 2;
        const variance = width * 0.08;

        for (let i = 0; i <= segments; i++) {
            const y = i * segmentHeight;
            const x = (i === 0 || i === segments) 
                ? centerX 
                : centerX + (Math.random() - 0.5) * 2 * variance;
            points.push({ x, y });
        }
        return points;
    };

    tearBtn.addEventListener("click", () => {
        if (isTorn) return;
        isTorn = true;

        tearBtn.style.opacity = "0.5";
        tearBtn.style.pointerEvents = "none";
        resetBtn.style.opacity = "1";
        resetBtn.style.pointerEvents = "auto";

        const rect = targetElement.getBoundingClientRect();
        targetElement.style.visibility = "hidden";

        wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.top = `${targetElement.offsetTop}px`;
        wrapper.style.left = `${targetElement.offsetLeft}px`;
        wrapper.style.width = `${rect.width}px`;
        wrapper.style.height = `${rect.height}px`;
        wrapper.style.pointerEvents = "none";
        wrapper.style.zIndex = "100";

        targetElement.parentNode.insertBefore(wrapper, targetElement);

        const leftPart = targetElement.cloneNode(true);
        const rightPart = targetElement.cloneNode(true);

        const basePartStyle = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            visibility: visible;
            transform-origin: center top;
            box-sizing: border-box;
        `;
        leftPart.style.cssText += basePartStyle;
        rightPart.style.cssText += basePartStyle;

        const points = generateJaggedPath(rect.width, rect.height, 15);
        
        let leftPolygon = "0% 0%, ";
        let rightPolygon = "100% 0%, ";

        points.forEach(p => {
            const pctX = (p.x / rect.width) * 100;
            const pctY = (p.y / rect.height) * 100;
            leftPolygon += `${pctX}% ${pctY}%, `;
            rightPolygon += `${pctX}% ${pctY}%, `;
        });

        leftPolygon += "0% 100%";
        rightPolygon += "100% 100%";

        leftPart.style.clipPath = `polygon(${leftPolygon})`;
        rightPart.style.clipPath = `polygon(${rightPolygon})`;
        
        wrapper.appendChild(leftPart);
        wrapper.appendChild(rightPart);

        // 指定されたパラメータの適用
        const tearStrength = 11;
        const fadeSpeed = 3.5;
        const dropSpeed = 0.2; 
        
        // 落下速度0.2をアニメーションの持続時間（遅さ）に変換して落下距離を調整
        const dropDuration = fadeSpeed; 
        const dropDistance = rect.height * (1 / dropSpeed) * 0.5;

        const tl = gsap.timeline();
        
        tl.to([leftPart, rightPart], {
            scale: 1.05,
            duration: 0.1,
            ease: "power1.out"
        })
        .to(leftPart, {
            x: -rect.width * (tearStrength * 0.05),
            y: dropDistance,
            rotation: -tearStrength * 2,
            opacity: 0,
            duration: dropDuration,
            ease: "power2.in"
        }, "+=0.05")
        .to(rightPart, {
            x: rect.width * (tearStrength * 0.05),
            y: dropDistance,
            rotation: tearStrength * 2,
            opacity: 0,
            duration: dropDuration,
            ease: "power2.in"
        }, "<");
    });

    resetBtn.addEventListener("click", () => {
        if (!isTorn) return;
        isTorn = false;

        if (wrapper) {
            wrapper.remove();
            wrapper = null;
        }

        targetElement.style.visibility = "visible";

        resetBtn.style.opacity = "0.5";
        resetBtn.style.pointerEvents = "none";
        tearBtn.style.opacity = "1";
        tearBtn.style.pointerEvents = "auto";
    });
}