import { THREE } from './three.js';
import { gsap } from './gsap.js'; // 💡 GSAPを追加

export function drawFiberModel() {
    const container = document.querySelector(".fiber");
    if (!container) return;

    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldControls = container.querySelector(".fiber-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#020202';
    container.style.position = "relative";
    container.style.overflow = "hidden";

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 1, 3000);
    camera.position.set(0, 0, 900);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- 左側：工業用繊維バンドル ---
    const fiberBundleLeftGroup = new THREE.Group();
    scene.add(fiberBundleLeftGroup);

    const leftFibers = [];
    const leftFiberCount = 50;
    for (let i = 0; i < leftFiberCount; i++) {
        const points = [];
        const x = (i - leftFiberCount / 2) * 4.5;
        const randomPhase = Math.random() * Math.PI * 2;
        const randomAmplitude = 2 + Math.random() * 2;

        for (let j = 0; j <= 60; j++) {
            const y = (j - 30) * 8;
            const wave = Math.sin(y * 0.015 + randomPhase) * randomAmplitude;
            const jitter = (Math.random() - 0.5) * 0.5;
            points.push(new THREE.Vector3(x + wave + jitter, y, 0));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x8a8a8a,
            transparent: true,
            opacity: 0.55,
            linewidth: 2
        });
        const line = new THREE.Line(geo, lineMat);
        fiberBundleLeftGroup.add(line);
        leftFibers.push({
            line,
            geo,
            baseColor: lineMat.color.clone(),
            phase: randomPhase,
            amplitude: randomAmplitude,
            initialOpacity: 0.55
        });
    }

    // --- 右側：光ファイバーバンドル ---
    const fiberBundleRightGroup = new THREE.Group();
    scene.add(fiberBundleRightGroup);

    const rightFibers = [];
    const rightFiberCount = 60;
    for (let i = 0; i < rightFiberCount; i++) {
        const points = [];
        const angle = (i / rightFiberCount) * Math.PI * 2;
        const baseRadius = 40;

        for (let j = 0; j <= 60; j++) {
            const y = (j - 30) * 8;
            const twistAngle = angle + y * 0.025;
            const radius = baseRadius + Math.sin(y * 0.01 + i * 0.2) * 10;
            const x = Math.cos(twistAngle) * radius;
            const z = Math.sin(twistAngle) * radius;
            points.push(new THREE.Vector3(x, y, z));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const hue = 0.52 + (i / rightFiberCount) * 0.18;
        const lineMat = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHSL(hue, 1, 0.55),
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });
        const line = new THREE.Line(geo, lineMat);
        fiberBundleRightGroup.add(line);
        rightFibers.push({
            line,
            geo,
            baseColor: lineMat.color.clone(),
            phase: Math.random() * Math.PI * 2,
            hueBase: hue,
            initialOpacity: 0.65
        });
    }

    // 💡 レイアウト更新ロジック
    const updateLayout = (w) => {
        const leftScale = (w * 0.55) / (leftFiberCount * 4.5);
        fiberBundleLeftGroup.scale.set(leftScale, leftScale, leftScale);
        fiberBundleLeftGroup.position.x = -w * 0.26;

        const rightScale = (w * 0.5) / 90;
        fiberBundleRightGroup.scale.set(rightScale, rightScale, rightScale);
        fiberBundleRightGroup.position.x = w * 0.30;
    };

    // --- アニメーション制御変数 ---
    let animationStartTime = null;
    let isPlaying = false;
    let pausedTime = 0;

    const resetAnimation = () => {
        animationStartTime = null;
        pausedTime = 0;
        isPlaying = false;
        leftFibers.forEach(fiber => {
            fiber.line.material.opacity = fiber.initialOpacity;
            fiber.line.material.color.copy(fiber.baseColor);
        });
        rightFibers.forEach(fiber => {
            fiber.line.material.opacity = fiber.initialOpacity;
            fiber.line.material.color.copy(fiber.baseColor);
        });
        fiberBundleLeftGroup.rotation.y = 0;
        fiberBundleRightGroup.rotation.y = 0;
        renderer.render(scene, camera);
    };

    const animateAll = () => {
        if (!animationStartTime) animationStartTime = Date.now();
        const elapsed = (Date.now() - animationStartTime) / 1000 + pausedTime;
        const time = elapsed;

        leftFibers.forEach((fiber) => {
            const subtleShimmer = 0.1 + Math.sin(time * 0.6 + fiber.phase) * 0.08;
            fiber.line.material.opacity = 0.5 + subtleShimmer;
            const brightness = 0.75 + Math.sin(time * 0.8 + fiber.phase * 0.5) * 0.15;
            fiber.line.material.color.copy(fiber.baseColor).multiplyScalar(brightness);
        });

        rightFibers.forEach((fiber, i) => {
            const lightWave = (time * 2.5 + fiber.phase + i * 0.08) % (Math.PI * 2);
            const lightIntensity = Math.sin(lightWave) * 0.5 + 0.5;
            fiber.line.material.opacity = 0.3 + lightIntensity * 0.6;
            const colorShift = Math.sin(time * 1.8 + fiber.phase) * 0.1;
            const hue = fiber.hueBase + colorShift;
            const brightness = 0.55 + lightIntensity * 0.45;
            fiber.line.material.color.setHSL(hue, 1, brightness);
        });

        fiberBundleLeftGroup.rotation.y += 0.0008;
        fiberBundleRightGroup.rotation.y -= 0.002;
    };

    // --- コントロールボタン ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'fiber-controls';
        buttonContainer.style.cssText = `
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;
        `;

        // 💡 GSAPアニメーション用に position と overflow を追加
        const buttonStyles = `
            width: 25%; min-width: 100px; max-width: 160px; padding: 12px 0;
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 30px; color: white; cursor: pointer; font-size: 14px; font-weight: bold;
            backdrop-filter: blur(5px); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-sizing: border-box; text-align: center; letter-spacing: 1px;
            position: relative; overflow: hidden;
        `;

        // 💡 テキストスライドアニメーション関数
        const animateButtonText = (btnElement, newText) => {
            const currentSpan = btnElement.querySelector('.active-text');
            if (currentSpan && currentSpan.textContent !== newText) {
                currentSpan.classList.remove('active-text');
                
                const newSpan = document.createElement('span');
                newSpan.className = 'active-text';
                newSpan.textContent = newText;
                newSpan.style.position = 'absolute';
                newSpan.style.left = '0';
                newSpan.style.width = '100%';
                newSpan.style.top = '50%';
                
                // 新しいテキストを下から待機させる
                gsap.set(newSpan, { yPercent: -50, y: 20, opacity: 0 });
                btnElement.appendChild(newSpan);
                
                // 現在のテキストを上へフェードアウト
                gsap.to(currentSpan, { 
                    yPercent: -50, y: -20, opacity: 0, duration: 0.3, ease: "power2.inOut", 
                    onComplete: () => currentSpan.remove() 
                });
                // 新しいテキストを下から中央へフェードイン
                gsap.to(newSpan, { 
                    yPercent: -50, y: 0, opacity: 1, duration: 0.3, ease: "power2.inOut" 
                });
            }
        };

        // --- PLAY/PAUSEボタン ---
        const playBtn = document.createElement('button');
        playBtn.style.cssText = buttonStyles;
        
        // 内部構造を作成
        const playDummy = document.createElement('span');
        playDummy.textContent = 'PLAY';
        playDummy.style.visibility = 'hidden';
        playBtn.appendChild(playDummy);
        
        const playActive = document.createElement('span');
        playActive.className = 'active-text';
        playActive.textContent = 'PLAY';
        playActive.style.position = 'absolute';
        playActive.style.left = '0';
        playActive.style.width = '100%';
        playActive.style.top = '50%';
        playActive.style.transform = 'translateY(-50%)';
        playBtn.appendChild(playActive);

        playBtn.addEventListener('click', () => {
            if (!isPlaying) {
                isPlaying = true;
                animateButtonText(playBtn, 'PAUSE');
                playBtn.style.background = 'rgba(255, 255, 255, 0.4)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 1)';
            } else {
                isPlaying = false;
                pausedTime += (Date.now() - animationStartTime) / 1000;
                animationStartTime = null;
                animateButtonText(playBtn, 'PLAY');
                playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });

        playBtn.addEventListener('mouseover', () => {
            if (!isPlaying) {
                playBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            }
        });
        playBtn.addEventListener('mouseout', () => {
            if (!isPlaying) {
                playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });

        // --- RESETボタン ---
        const resetBtn = document.createElement('button');
        resetBtn.style.cssText = buttonStyles;
        
        // 内部構造を作成
        const resetDummy = document.createElement('span');
        resetDummy.textContent = 'RESET';
        resetDummy.style.visibility = 'hidden';
        resetBtn.appendChild(resetDummy);
        
        const resetActive = document.createElement('span');
        resetActive.className = 'active-text';
        resetActive.textContent = 'RESET';
        resetActive.style.position = 'absolute';
        resetActive.style.left = '0';
        resetActive.style.width = '100%';
        resetActive.style.top = '50%';
        resetActive.style.transform = 'translateY(-50%)';
        resetBtn.appendChild(resetActive);

        resetBtn.addEventListener('click', () => {
            resetAnimation();
            animateButtonText(playBtn, 'PLAY'); // テキストをPLAYに戻す
            playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });

        resetBtn.addEventListener('mouseover', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        });
        resetBtn.addEventListener('mouseout', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });

        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);
        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    // --- 💡 修正: リサイズ関数を独立させて初期実行 ---
    const handleResize = () => {
        const newWidth = container.clientWidth || baseSize;
        const newHeight = newWidth;

        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        
        // レイアウト更新
        updateLayout(newWidth);

        // ボタンのフォントサイズ調整
        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    };

    // 初期化時に一度実行
    handleResize();

    window.addEventListener('resize', handleResize);

    function animate() {
        requestAnimationFrame(animate);
        if (isPlaying) animateAll();
        renderer.render(scene, camera);
    }
    animate();
}