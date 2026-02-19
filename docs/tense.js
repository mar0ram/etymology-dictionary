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
    const oldLabels = container.querySelectorAll("#lbl-tense");
    oldLabels.forEach(l => l.remove());

    container.style.backgroundColor = '#111111';
    container.style.overflow = "hidden";
    container.style.position = "relative";

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
    geometry.setColors(colors); // 💡 頂点カラーを適用

    const material = new LineMaterial({
        vertexColors: true,     // 💡 頂点カラーを有効化
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

    // --- ラベル ---
    const label = document.createElement("div");
    label.id = "lbl-tense";
    label.innerHTML = "TENSE<br><span style='font-size:0.6em; letter-spacing:3px;'>張り詰めた・緊張した</span>";
    label.style.cssText = `
        position: absolute; top: 25%; left: 50%; transform: translate(-50%, -50%);
        color: #00ffff; font-family: 'Orbitron', sans-serif; text-align: center;
        opacity: 0; pointer-events: none; text-shadow: 0 0 15px #00ffff; z-index: 5;
    `;
    label.style.fontSize = width < 450 ? "14px" : "24px";
    container.appendChild(label);

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

    container._gsapAnimations = [tl];

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
        label.style.fontSize = newWidth < 450 ? "14px" : "24px";
    });
}