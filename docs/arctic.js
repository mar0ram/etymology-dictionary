import { THREE } from './three.js';

export function drawArcticModel() {
    const container = document.querySelector('.arctic');
    if (!container) return;

    // --- 初期化 (既存のCanvasを削除) ---
    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    const oldControls = container.querySelector('.arctic-controls');
    if (oldControls) oldControls.remove();

    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    // --- おおぐま座データ ---
    const starsData = [
        { id: "alpha", ra: 165.93, dec: 61.75, mag: 1.8, color: 0xff4444 },
        { id: "beta", ra: 165.46, dec: 55.38, mag: 2.3, color: 0xff4444 },
        { id: "gamma", ra: 178.45, dec: 53.69, mag: 2.4, color: 0xff4444 },
        { id: "delta", ra: 183.5, dec: 57.1, mag: 3.3, color: 0xff4444 },
        { id: "epsilon", ra: 193.47, dec: 56.96, mag: 1.8, color: 0xff4444 },
        { id: "zeta", ra: 200.08, dec: 56.92, mag: 2.2, color: 0xff4444 },
        { id: "eta", ra: 207.88, dec: 54.31, mag: 1.9, color: 0xff4444 },
        { id: "omicron", ra: 128.9, dec: 63.71, mag: 3.3, color: 0xfff4ea },
        { id: "theta", ra: 142.6, dec: 51.6, mag: 3.1, color: 0xeaf4ff },
        { id: "upsilon", ra: 149.3, dec: 59.0, mag: 3.7, color: 0xfff4ea },
        { id: "h", ra: 143.5, dec: 64.4, mag: 3.6, color: 0xeaf4ff },
        { id: "iota", ra: 130.1, dec: 49.04, mag: 3.1, color: 0xeaf4ff },
        { id: "kappa", ra: 130.6, dec: 47.5, mag: 3.5, color: 0xeaf4ff },
        { id: "lambda", ra: 153.5, dec: 42.9, mag: 3.4, color: 0xfff4ea },
        { id: "mu", ra: 154.5, dec: 41.5, mag: 3.0, color: 0xfff4ea },
        { id: "psi", ra: 167.4, dec: 44.5, mag: 3.0, color: 0xfff4ea },
        { id: "chi", ra: 176.4, dec: 47.7, mag: 3.7, color: 0xfff4ea },
        { id: "nu", ra: 169.6, dec: 33.1, mag: 3.4, color: 0xfff4ea },
        { id: "xi", ra: 169.5, dec: 31.5, mag: 3.7, color: 0xfff4ea }
    ];

    const connections = [
        ["alpha", "beta"], ["beta", "gamma"], ["gamma", "delta"], ["delta", "alpha"],
        ["delta", "epsilon"], ["epsilon", "zeta"], ["zeta", "eta"],
        ["alpha", "h"],
        ["beta", "upsilon"],
        ["h", "upsilon"],
        ["h", "omicron"],
        ["omicron", "upsilon"],
        ["upsilon", "theta"],
        ["theta", "kappa"],
        ["kappa", "iota"],
        ["chi", "psi"],
        ["psi", "mu"],
        ["lambda", "mu"],
        ["gamma", "chi"],
        ["chi", "nu"],
        ["nu", "xi"]
    ];

    // --- シーン設定 ---
    const scene = new THREE.Scene();
    const baseSize = 600 * 0.7;
    let width = container.clientWidth || baseSize;
    let height = width;
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000);
    camera.zoom = 1.1;
    camera.updateProjectionMatrix();
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 街の演出レイヤー ---
    container.style.background = "linear-gradient(to bottom, #050510 0%, #101025 70%, #201a30 100%)";

    const createCityTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050508';

        let x = 0;
        while (x < canvas.width) {
            const w = 20 + Math.random() * 50;
            const h = 30 + Math.random() * 100;
            ctx.fillRect(x, canvas.height - h, w, h);
            ctx.fillStyle = Math.random() > 0.7 ? '#ffaa00' : '#222';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(x + w / 4, canvas.height - h + 10 + i * 15, 5, 5);
            }
            ctx.fillStyle = '#050508';
            x += w + 5;
        }
        return new THREE.CanvasTexture(canvas);
    };

    const cityTex = createCityTexture();
    const cityMaterial = new THREE.SpriteMaterial({ map: cityTex, transparent: true });
    const citySprite = new THREE.Sprite(cityMaterial);
    citySprite.scale.set(width, height / 3, 1);
    citySprite.position.set(0, -height / 2 + height / 6, 15);
    scene.add(citySprite);

    // --- 座標計算とスケーリング ---
    const avgDec = starsData.reduce((sum, s) => sum + s.dec, 0) / starsData.length;
    const cosDec = Math.cos(avgDec * Math.PI / 180);

    const coords = starsData.map(s => ({
        x: -s.ra * cosDec,
        y: s.dec
    }));

    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const verticalOffset = height * 0.1;
    const scale = Math.min(width, height) * 0.7 / Math.max(maxX - minX, maxY - minY);

    const getPos = (ra, dec) => new THREE.Vector3(
        (-ra * cosDec - centerX) * scale,
        (dec - centerY) * scale + verticalOffset,
        0
    );

    // --- 星と星座線の描画 ---
    const starMap = new Map();

    // 💡 改善：より美しいグロウテクスチャを作成（解像度向上＆グラデーション最適化）
    const createGlowTexture = (color, isCore = false) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);

        const c = new THREE.Color(color);
        if (isCore) {
            // コア：より明るく鋭い光のグラデーション
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
            // グロー：より滑らかで美しいグラデーション
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.02, `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, 1)`);
            gradient.addColorStop(0.1, `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, 0.8)`);
            gradient.addColorStop(0.3, `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, 0.4)`);
            gradient.addColorStop(0.6, `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, 0.1)`);
            gradient.addColorStop(1, `rgba(${c.r * 255}, ${c.g * 255}, ${c.b * 255}, 0)`);
        }

        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(canvas);
    };

    starsData.forEach(star => {
        const pos = getPos(star.ra, star.dec);
        const baseSize = Math.max(0.9, (5.5 - star.mag) * 1.3);
        const baseOpacity = Math.max(0.6, (6 - star.mag) / 5);

        // Glow (後光)
        const glowMaterial = new THREE.SpriteMaterial({
            map: createGlowTexture(star.color, false),
            color: star.color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: baseOpacity * 1.2
        });
        const glow = new THREE.Sprite(glowMaterial);
        glow.position.copy(pos);
        const glowScale = baseSize * 8;
        glow.scale.set(glowScale, glowScale, 1);

        glow.userData = {
            isStar: true,
            baseOpacity: baseOpacity * 1.2,
            baseScale: glowScale,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.03 + Math.random() * 0.04,
            pulseIntensity: 0.3 + Math.random() * 0.3
        };
        scene.add(glow);

        // Core (中心の鋭い光)
        const coreMaterial = new THREE.SpriteMaterial({
            map: createGlowTexture(0xffffff, true),
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 1.0
        });
        const core = new THREE.Sprite(coreMaterial);
        core.position.copy(pos);
        const coreScale = baseSize * 1.5;
        core.scale.set(coreScale, coreScale, 1);
        core.userData = { isCore: true, baseScale: coreScale };
        scene.add(core);

        starMap.set(star.id, pos);
    });

    // --- Line描画 ---
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.3,
        linewidth: 1.5
    });

    connections.forEach(([startId, endId]) => {
        const startPos = starMap.get(startId);
        const endPos = starMap.get(endId);
        if (startPos && endPos) {
            const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
            const line = new THREE.Line(geometry, lineMaterial);
            scene.add(line);
        }
    });

    // --- 状態管理用オブジェクト ---
    const state = {
        isTwinklingEnabled: false
    };

    // --- コントロールボタンを作成 ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'arctic-controls';
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

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '○ Twinkling';
        toggleBtn.style.cssText = buttonStyles;
        toggleBtn.addEventListener('mouseover', () => {
            toggleBtn.style.background = 'rgba(200, 150, 255, 0.9)';
            toggleBtn.style.transform = 'scale(1.05)';
        });
        toggleBtn.addEventListener('mouseout', () => {
            toggleBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            toggleBtn.style.transform = 'scale(1)';
        });
        toggleBtn.addEventListener('click', () => {
            state.isTwinklingEnabled = !state.isTwinklingEnabled;
            if (state.isTwinklingEnabled) {
                toggleBtn.textContent = '✦ Twinkling';
            } else {
                toggleBtn.textContent = '○ Twinkling';
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
            state.isTwinklingEnabled = false;
            toggleBtn.textContent = '○ Twinkling';
        });

        buttonContainer.appendChild(toggleBtn);
        buttonContainer.appendChild(resetBtn);

        return buttonContainer;
    };

    const buttonContainer = createControlButtons();
    container.appendChild(buttonContainer);

    // --- アニメーション ---
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.02;

        scene.children.forEach(child => {
            if (child.userData.isStar) {
                if (state.isTwinklingEnabled) {
                    // 💡 改善：より複雑で美しい輝きアニメーション
                    const twinkle = Math.sin(time * 2 + child.userData.phase) * 0.15;
                    const pulse = Math.sin(time * 0.8 + child.userData.phase * 2) * child.userData.pulseIntensity;
                    const shimmer = Math.cos(time * 3.5 + child.userData.phase) * 0.08;
                    const noise = (Math.random() - 0.5) * 0.05;

                    child.material.opacity = Math.max(0.3, Math.min(1.0, child.userData.baseOpacity + twinkle + pulse + shimmer + noise));
                    const currentScale = child.userData.baseScale * (1 + (twinkle + pulse) * 0.4);
                    child.scale.set(currentScale, currentScale, 1);
                } else {
                    // 静止状態：アニメーションなし
                    child.material.opacity = child.userData.baseOpacity;
                    child.scale.set(child.userData.baseScale, child.userData.baseScale, 1);
                }
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    // --- リサイズ対応 ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || baseSize;
        const newHeight = newWidth;

        renderer.setSize(newWidth, newHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

     // ✅ JSによるピクセル単位の幅計算を廃止し、レスポンシブなCSS設定に一任
        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    });
}