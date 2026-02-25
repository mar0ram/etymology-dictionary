import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawSteepModel() {
    // コンテナ要素の取得
    const container = document.querySelector(".steep");
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
    let isPlaying = true; 

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

    // --- オブジェクト作成 ---
    const gridRes = 40; 
    const gridGeo = new THREE.PlaneGeometry(400, 400, gridRes, gridRes);
    gridGeo.rotateX(-Math.PI / 2); 

    // 頂点カラーを保持するための属性を追加
    const count = gridGeo.attributes.position.count;
    gridGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    
    // マテリアルで vertexColors を有効化
    const gridMat = new THREE.MeshBasicMaterial({ 
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        vertexColors: true // 頂点ごとの色を使用
    });
    const mountainGrid = new THREE.Mesh(gridGeo, gridMat);
    scene.add(mountainGrid);

    // 山の変形用パラメータ
    const mountainParams = { currentHeight: 0 };

    // 山の形状と色を更新する関数
    const updateMountain = () => {
        const positions = gridGeo.attributes.position.array;
        const colors = gridGeo.attributes.color.array;
        const colorA = new THREE.Color(0x444444); // 低い部分：暗いグレー
        const colorB = new THREE.Color(0x00ffff); // 盛り上がる部分：シアン
        const tempColor = new THREE.Color();

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            const dist = Math.sqrt(x * x + z * z);
            const peak = Math.exp(-(dist * dist) / 7000); 
            
            const h = peak * mountainParams.currentHeight;
            positions[i + 1] = h;

            // 高さに基づいた色の計算 (0.0 - 1.0)
            const lerpFactor = Math.min(h / 150, 1.0);
            tempColor.lerpColors(colorA, colorB, lerpFactor);
            
            colors[i] = tempColor.r;
            colors[i + 1] = tempColor.g;
            colors[i + 2] = tempColor.b;
        }
        gridGeo.attributes.position.needsUpdate = true;
        gridGeo.attributes.color.needsUpdate = true;
    };

    // 初期状態の適用
    updateMountain();

    // --- コントロールボタンの作成 ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dimension-controls';
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 50;
            display: flex;
            gap: 15px;
            width: 100%;
            justify-content: center;
        `;

        const buttonStyles = `
            width: 25%;
            min-width: 100px;
            max-width: 160px;
            padding: 12px 0;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 30px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            backdrop-filter: blur(5px);
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-sizing: border-box;
            text-align: center;
            letter-spacing: 1px;
        `;

        const createBtn = (label, targetHeight) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = buttonStyles;
            btn.addEventListener('mouseover', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.2)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            });
            btn.addEventListener('click', () => {
                gsap.to(mountainParams, {
                    currentHeight: targetHeight,
                    duration: 1.5,
                    ease: "power2.inOut",
                    onUpdate: updateMountain
                });
            });
            return btn;
        };

        const steepBtn = createBtn('STEEP', 200);
        const gentleBtn = createBtn('GENTLE', 80);
        const flatBtn = createBtn('FLAT', 0);

        buttonContainer.appendChild(steepBtn);
        buttonContainer.appendChild(gentleBtn);
        buttonContainer.appendChild(flatBtn);

        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    // --- レンダリングループ ---
    function animate() {
        requestAnimationFrame(animate);
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

        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    });
}