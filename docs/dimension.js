import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawDimensionModel() {
    // コンテナ要素の取得
    const container = document.querySelector(".dimension");
    if (!container) return;

    // --- 初期化 (既存のCanvasとラベルを削除) ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll("div[id^='lbl-d']");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".dimension-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#111111';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    // 💡 アニメーション管理用
    const animations = [];
    const labels = [];
    let isPlaying = false; // スコープを関数全体に移動

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(400, 300, 400);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 色とマテリアルの定義 ---
    const colorLine = 0x00ffff; // シアン（1D）
    const colorPlane = 0xff00ff; // マゼンタ（2D）
    const colorSolid = 0xffaa00; // オレンジ（3D）

    // --- オブジェクト作成関数 ---
    const gridHelper = new THREE.GridHelper(400, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    const dimSize = 150;
    const offset = -dimSize / 2;

    // === Dimension 1: 直線 (Line) ===
    const lineGeo = new THREE.BoxGeometry(dimSize, 2, 2);
    lineGeo.translate(dimSize / 2, 0, 0);
    const lineMesh = new THREE.Mesh(
        lineGeo,
        new THREE.MeshBasicMaterial({ color: colorLine })
    );
    lineMesh.position.set(offset, offset + dimSize / 2, offset);
    lineMesh.scale.set(0, 1, 1);
    mainGroup.add(lineMesh);

    // === Dimension 2: 平面 (Plane) ===
    const planeBorderGeo = new THREE.BoxGeometry(dimSize, dimSize, 2);
    const planeEdges = new THREE.EdgesGeometry(planeBorderGeo);
    const planeLines = new THREE.LineSegments(
        planeEdges,
        new THREE.LineBasicMaterial({ color: colorPlane })
    );
    const planeFill = new THREE.Mesh(
        new THREE.PlaneGeometry(dimSize, dimSize),
        new THREE.MeshBasicMaterial({ color: colorPlane, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );

    const planeGroup = new THREE.Group();
    planeGroup.add(planeLines);
    planeGroup.add(planeFill);

    planeLines.geometry.translate(dimSize / 2, dimSize / 2, 0);
    planeFill.geometry.translate(dimSize / 2, dimSize / 2, 0);

    planeGroup.position.set(offset, offset + dimSize / 2, offset);
    planeGroup.scale.set(1, 0, 1);
    planeGroup.visible = false;
    mainGroup.add(planeGroup);

    // === Dimension 3: 空間 (Solid/Volume) ===
    const boxGeo = new THREE.BoxGeometry(dimSize, dimSize, dimSize);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLines = new THREE.LineSegments(
        boxEdges,
        new THREE.LineBasicMaterial({ color: colorSolid })
    );
    const boxFill = new THREE.Mesh(
        boxGeo,
        new THREE.MeshBasicMaterial({ color: colorSolid, transparent: true, opacity: 0.15 })
    );

    const solidGroup = new THREE.Group();
    solidGroup.add(boxLines);
    solidGroup.add(boxFill);

    boxLines.geometry.translate(dimSize / 2, dimSize / 2, dimSize / 2);
    boxFill.geometry.translate(dimSize / 2, dimSize / 2, dimSize / 2);

    solidGroup.position.set(offset, offset + dimSize / 2, offset);
    solidGroup.scale.set(1, 1, 0);
    solidGroup.visible = false;
    mainGroup.add(solidGroup);


    // --- ラベル作成用ヘルパー ---
    const createLabel = (id, text, top, left, color) => {
        const div = document.createElement("div");
        div.id = id;
        div.innerHTML = text;
        div.style.position = "absolute";
        div.style.top = top;
        div.style.left = left;
        div.style.transform = "translate(-50%, -50%)";
        div.style.color = color;
        div.style.fontSize = width < 450 ? "14px" : "18px";
        div.style.fontWeight = "bold";
        div.style.fontFamily = "'Courier New', sans-serif";
        div.style.pointerEvents = "none";
        div.style.textShadow = `0 0 10px ${color}`;
        div.style.opacity = 0;
        div.style.whiteSpace = "nowrap";
        div.style.zIndex = "5";
        container.appendChild(div);

        labels.push(div);
        return div;
    };

    // --- ラベル位置の調整 ---
    const label1 = createLabel("lbl-d1", "1D<br><span style='font-size:0.7em'>直線 / 測定観点：長さ</span>", "60%", "20%", "#00ffff");
    const label2 = createLabel("lbl-d2", "2D<br><span style='font-size:0.7em'>平面 / 測定観点：面積</span>", "10%", "20%", "#ff00ff");
    const label3 = createLabel("lbl-d3", "3D<br><span style='font-size:0.7em'>空間 / 測定観点：体積</span>", "10%", "80%", "#ffaa00");


    // --- アニメーション (GSAP Timeline) ---
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2, paused: true });

    // 0. 初期状態リセット
    tl.set(lineMesh.scale, { x: 0 })
        .set(planeGroup.scale, { y: 0 })
        .set(solidGroup.scale, { z: 0 })
        .set([planeGroup, solidGroup], { visible: false })
        .set([label1, label2, label3], { opacity: 0 });

    // 1. Dimension 1: 線を描く
    tl.to(lineMesh.scale, { x: 1, duration: 1.5, ease: "power2.inOut" })
        .to(label1, { opacity: 1, duration: 0.5 }, "-=1.0");

    // 2. Dimension 2: 線を上に伸ばして面にする
    tl.set(planeGroup, { visible: true })
        .to(planeGroup.scale, { y: 1, duration: 1.5, ease: "power2.inOut" })
        .to(label2, { opacity: 1, duration: 0.5 }, "-=1.0");

    // 3. Dimension 3: 面を手前に伸ばして立体にする
    tl.set(solidGroup, { visible: true })
        .to(solidGroup.scale, { z: 1, duration: 1.5, ease: "power2.inOut" })
        .to(label3, { opacity: 1, duration: 0.5 }, "-=1.0");

    // 4. 回転演出
    tl.to(mainGroup.rotation, { y: Math.PI / 2, duration: 2, ease: "power1.inOut" });

    // 5. フェードアウト
    tl.to([mainGroup.scale, label1, label2, label3], { opacity: 0, duration: 1 });

    animations.push(tl);

    // --- コントロールボタンの作成 ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dimension-controls';
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
                tl.play();
                isPlaying = true;
                playBtn.textContent = '⏸ Pause';
            } else {
                tl.pause();
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
            tl.pause();
            tl.seek(0);
            isPlaying = false;
            playBtn.textContent = '▶ Play';
            // 初期状態を確実に表示
            lineMesh.scale.set(0, 1, 1);
            planeGroup.scale.set(1, 0, 1);
            solidGroup.scale.set(1, 1, 0);
            planeGroup.visible = false;
            solidGroup.visible = false;
            mainGroup.scale.set(1, 1, 1);
            mainGroup.rotation.set(0, 0, 0);
            scene.rotation.set(0, 0, 0); // グリッドの回転をリセット
            label1.style.opacity = 0;
            label2.style.opacity = 0;
            label3.style.opacity = 0;
            renderer.render(scene, camera);
        });

        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);

        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    // --- レンダリングループ ---
    function animate() {
        requestAnimationFrame(animate);
        if (isPlaying) {
            scene.rotation.y += 0.002;
        }
        renderer.render(scene, camera);
    }
    animate();

    // --- リサイズ処理 ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || baseSize;
        const newHeight = newWidth;

        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        const newFontSize = newWidth < 450 ? "14px" : "18px";
        labels.forEach(lbl => {
            lbl.style.fontSize = newFontSize;
        });

        // ✅ JSによるピクセル単位の幅計算を廃止し、レスポンシブなCSS設定に一任
        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    });
}