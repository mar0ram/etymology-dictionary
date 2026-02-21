import { THREE } from './three.js';

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

    // --- レイアウト調整 ---
    const updateLayout = () => {
        const w = container.clientWidth || baseSize;

        const leftScale = (w * 0.55) / (leftFiberCount * 4.5);
        fiberBundleLeftGroup.scale.set(leftScale, leftScale, leftScale);
        fiberBundleLeftGroup.position.x = -w * 0.26;

        const rightScale = (w * 0.5) / 90;
        fiberBundleRightGroup.scale.set(rightScale, rightScale, rightScale);
        fiberBundleRightGroup.position.x = w * 0.30;
    };
    updateLayout();

    // --- アニメーション制御変数 ---
    let animationStartTime = null;
    let isPlaying = false;
    let pausedTime = 0;

    // リセット用関数
    const resetAnimation = () => {
        animationStartTime = null;
        pausedTime = 0;
        isPlaying = false;

        // 左側ファイバーをリセット
        leftFibers.forEach(fiber => {
            fiber.line.material.opacity = fiber.initialOpacity;
            fiber.line.material.color.copy(fiber.baseColor);
        });

        // 右側ファイバーをリセット
        rightFibers.forEach(fiber => {
            fiber.line.material.opacity = fiber.initialOpacity;
            fiber.line.material.color.copy(fiber.baseColor);
        });

        // 回転をリセット
        fiberBundleLeftGroup.rotation.y = 0;
        fiberBundleRightGroup.rotation.y = 0;

        renderer.render(scene, camera);
    };

    const animateAll = () => {
        if (!animationStartTime) {
            animationStartTime = Date.now();
        }

        const elapsed = (Date.now() - animationStartTime) / 1000 + pausedTime;
        const time = elapsed;

        // 左側：工業用繊維
        leftFibers.forEach((fiber, i) => {
            const subtleShimmer = 0.1 + Math.sin(time * 0.6 + fiber.phase) * 0.08;
            fiber.line.material.opacity = 0.5 + subtleShimmer;

            const brightness = 0.75 + Math.sin(time * 0.8 + fiber.phase * 0.5) * 0.15;
            fiber.line.material.color.copy(fiber.baseColor).multiplyScalar(brightness);
        });

        // 右側：光ファイバー
        rightFibers.forEach((fiber, i) => {
            const lightWave = (time * 2.5 + fiber.phase + i * 0.08) % (Math.PI * 2);
            const lightIntensity = Math.sin(lightWave) * 0.5 + 0.5;

            const opacity = 0.3 + lightIntensity * 0.6;
            fiber.line.material.opacity = opacity;

            const colorShift = Math.sin(time * 1.8 + fiber.phase) * 0.1;
            const hue = fiber.hueBase + colorShift;
            const brightness = 0.55 + lightIntensity * 0.45;
            fiber.line.material.color.setHSL(hue, 1, brightness);
        });

        // 回転
        fiberBundleLeftGroup.rotation.y += 0.0008;
        fiberBundleRightGroup.rotation.y -= 0.002;
    };

    // --- コントロールボタン ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'fiber-controls';
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 50;
            display: flex;
            gap: 10px;
            width: 100%;
            justify-content: center;
        `;

        const buttonStyles = `
            width: 25%;
            min-width: 80px;
            max-width: 150px;
            padding: 10px 0;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-sizing: border-box;
            text-align: center;
        `;

        const playBtn = document.createElement('button');
        playBtn.textContent = '▶ Play';
        playBtn.style.cssText = buttonStyles;
        playBtn.addEventListener('mouseover', () => {
            playBtn.style.background = 'rgba(100, 200, 100, 0.9)';
            playBtn.style.transform = 'scale(1.05)';
        });
        playBtn.addEventListener('mouseout', () => {
            playBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            playBtn.style.transform = 'scale(1)';
        });
        playBtn.addEventListener('click', () => {
            if (!isPlaying) {
                isPlaying = true;
                playBtn.textContent = '⏸ Pause';
            } else {
                isPlaying = false;
                pausedTime += (Date.now() - animationStartTime) / 1000;
                animationStartTime = null;
                playBtn.textContent = '▶ Play';
            }
        });

        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↻ Reset';
        resetBtn.style.cssText = buttonStyles;
        resetBtn.addEventListener('mouseover', () => {
            resetBtn.style.background = 'rgba(150, 150, 150, 0.9)';
            resetBtn.style.transform = 'scale(1.05)';
        });
        resetBtn.addEventListener('mouseout', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            resetBtn.style.transform = 'scale(1)';
        });
        resetBtn.addEventListener('click', () => {
            resetAnimation();
            playBtn.textContent = '▶ Play';
        });

        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);

        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    function animate() {
        requestAnimationFrame(animate);
        if (isPlaying) animateAll();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const w = container.clientWidth || baseSize;
        renderer.setSize(w, w);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        updateLayout();

        // ✅ JSによるピクセル単位の幅計算を廃止し、レスポンシブなCSS設定に一任
        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    });
}