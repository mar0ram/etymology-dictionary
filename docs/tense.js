import { THREE, Line2, LineMaterial, LineGeometry } from './three.js';
import { gsap } from './gsap.js';

/**
 * Line2を使用したテンションモデルの描画
 */
export function drawTenseLineModel() {
    const container = document.querySelector(".tense");
    if (!container) return;

    // --- 既存要素のクリーンアップ ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll(".tense-label");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".tense-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#111111';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    const animations = [];
    const labels = [];

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 0, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x111111, 1); 
    container.appendChild(renderer.domElement);

    const state = { sag: 160, vibration: 0 };
    const startPoint = new THREE.Vector3(-150, 0, 0);
    const endPoint = new THREE.Vector3(150, 0, 0);
    const lineCount = 100;

    // 💡 リアルな色のためのグラデーション設定
    const colors = [];
    const colorStart = new THREE.Color(0x0088aa); // 端の色（濃い）
    const colorMid = new THREE.Color(0xffffff);   // 中央の色（光沢・白）
    
    for (let i = 0; i <= lineCount; i++) {
        const t = i / lineCount;
        // 中央(0.5)で白に近づくグラデーション計算
        const mixRatio = 1 - Math.abs(t - 0.5) * 2;
        const finalColor = colorStart.clone().lerp(colorMid, mixRatio);
        colors.push(finalColor.r, finalColor.g, finalColor.b);
    }

    const getCatenaryPoints = () => {
        const pts = [];
        for (let i = 0; i <= lineCount; i++) {
            const t = i / lineCount;
            const x = startPoint.x * (1 - t) + endPoint.x * t;
            let y = (4 * state.sag) * t * (t - 1); 
            if (state.vibration > 0) {
                y += Math.sin(t * Math.PI) * Math.sin(Date.now() * 0.05) * state.vibration;
            }
            pts.push(x, y, 0);
        }
        return pts;
    };

    const geometry = new LineGeometry();
    geometry.setPositions(getCatenaryPoints());
    geometry.setColors(colors);

    const material = new LineMaterial({
        vertexColors: true,
        linewidth: 4,
        transparent: true,
        opacity: 0.9,
    });
    material.resolution.set(width, height);

    const line = new Line2(geometry, material);
    scene.add(line);

    const pinGeo = new THREE.SphereGeometry(3, 32, 32);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const p1 = new THREE.Mesh(pinGeo, pinMat);
    const p2 = new THREE.Mesh(pinGeo, pinMat);
    p1.position.copy(startPoint);
    p2.position.copy(endPoint);
    scene.add(p1, p2);

    // --- ラベル作成 ---
    const createLabel = (id, html, top, left, color) => {
        const div = document.createElement("div");
        div.className = "tense-label";
        div.id = id;
        div.innerHTML = html;
        const fontSize = width < 450 ? "12px" : "20px";
        const padding = width < 450 ? "5px 10px" : "10px 20px";
        div.style.cssText = `position:absolute; top:${top}; left:${left}; transform:translate(-50%, -50%); color:${color}; font-family:'Orbitron', monospace; font-size:${fontSize}; font-weight:bold; opacity:0; z-index:10; background:rgba(17,17,17,0.9); padding:${padding}; border-radius:5px; pointer-events:none; text-align:center; text-shadow: 0 0 15px ${color}66;`;
        container.appendChild(div);

        labels.push(div);
        return div;
    };

    const label = createLabel("lbl-tense", "TENSE<br><span style='font-size:0.6em; letter-spacing:3px;'>張り詰めた・緊張した</span>", "25%", "50%", "#00ffff");

    const update = () => {
        geometry.setPositions(getCatenaryPoints());
    };

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5, paused: true });

    tl.to(label, { opacity: 1, duration: 1.2, ease: "power2.out" })
      .to(state, { sag: 0, duration: 0.5, ease: "expo.out", onUpdate: update })
      .to(state, { vibration: 15, duration: 0.1, onUpdate: update }, "-=0.4")
      .to(state, { vibration: 0, duration: 1.5, ease: "elastic.out(1, 0.3)", onUpdate: update })
      .to(label, { opacity: 0, duration: 0.8 }, "+=1")
      .to(state, { sag: 160, duration: 2.5, ease: "power2.inOut", onUpdate: update });

    animations.push(tl);

    // --- コントロールボタンの作成 ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tense-controls';
        const buttonWidth = width * 0.25;
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 50;
            display: flex;
            gap: 10px;
        `;

        const buttonStyles = `
            width: ${buttonWidth}px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-sizing: border-box;
        `;

        let isPlaying = false;

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
                animations.forEach(anim => anim.play());
                isPlaying = true;
                playBtn.textContent = '⏸ Pause';
            } else {
                animations.forEach(anim => anim.pause());
                isPlaying = false;
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
            // 💡 すべてのアニメーションを停止して先頭に戻す
            animations.forEach(anim => {
                anim.pause();
                anim.seek(0);
            });
            
            // 💡 状態をリセット
            state.sag = 160;
            state.vibration = 0;
            update();
            
            // 💡 ラベルをリセット
            label.style.opacity = '0';
            
            // 💡 ボタン状態をリセット
            isPlaying = false;
            playBtn.textContent = '▶ Play';
            
            // 💡 シーンを再描画
            renderer.render(scene, camera);
        });

        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);

        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    function animate() {
        requestAnimationFrame(animate);
        if (state.vibration > 0 || state.sag !== 160) {
            update();
        }
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || baseSize;
        renderer.setSize(newWidth, newWidth);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        material.resolution.set(newWidth, newWidth);

        const newFontSize = newWidth < 450 ? "12px" : "20px";
        labels.forEach(lbl => {
            lbl.style.fontSize = newFontSize;
            lbl.style.padding = newWidth < 450 ? "5px 10px" : "10px 20px";
        });

        // ✅ ボタンサイズ、テキスト、パディングもリサイズに対応
        const newButtonWidth = newWidth * 0.25;
        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const newPadding = newWidth < 450 ? "6px 12px" : "10px 20px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.width = `${newButtonWidth}px`;
            btn.style.fontSize = newButtonFontSize;
            btn.style.padding = newPadding;
        });
    });
}