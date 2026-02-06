import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawDimensionModel() {
    // コンテナ要素の取得
    const container = document.querySelector(".dimension");
    if (!container) return;
    
    container.style.backgroundColor = '#111111';
    container.style.overflow = "hidden";

    // --- 初期化 ---
    container.innerHTML = "";
    container.style.position = "relative";

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
    lineMesh.position.set(offset, offset, offset);
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
    
    planeGroup.position.set(offset, offset, offset);
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

    solidGroup.position.set(offset, offset, offset);
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
        div.style.fontSize = width < 450 ? "14px" : "20px";
        div.style.fontWeight = "bold";
        div.style.fontFamily = "'Courier New', sans-serif";
        div.style.pointerEvents = "none";
        div.style.textShadow = `0 0 10px ${color}`;
        div.style.opacity = 0;
        container.appendChild(div);
        return div;
    };

    // --- ラベル位置の調整 (立体と被らない位置へ) ---
    // 1D: 左下
    const label1 = createLabel("lbl-d1", "1D<br><span style='font-size:0.7em'>Line / Length</span>", "80%", "20%", "#00ffff");
    // 2D: 左上
    const label2 = createLabel("lbl-d2", "2D<br><span style='font-size:0.7em'>Plane / Area</span>", "20%", "20%", "#ff00ff");
    // 3D: 右上
    const label3 = createLabel("lbl-d3", "3D<br><span style='font-size:0.7em'>Space / Volume</span>", "20%", "80%", "#ffaa00");


    // --- アニメーション (GSAP Timeline) ---
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    // 0. 初期状態リセット
    tl.set(lineMesh.scale, { x: 0 })
      .set(planeGroup.scale, { y: 0 })
      .set(solidGroup.scale, { z: 0 })
      .set([planeGroup, solidGroup], { visible: false })
      .set([label1, label2, label3], { opacity: 0 }); // 位置は固定なのでopacityのみリセット

    // 1. Dimension 1: 線を描く
    tl.to(lineMesh.scale, { x: 1, duration: 1.5, ease: "power2.inOut" })
      .to(label1, { opacity: 1, duration: 0.5 }, "-=1.0"); // 1D出現

    // 2. Dimension 2: 線を上に伸ばして面にする
    tl.set(planeGroup, { visible: true })
      .to(planeGroup.scale, { y: 1, duration: 1.5, ease: "power2.inOut" })
      .to(label2, { opacity: 1, duration: 0.5 }, "-=1.0"); // 2D出現（1Dはそのまま）

    // 3. Dimension 3: 面を手前に伸ばして立体にする
    tl.set(solidGroup, { visible: true })
      .to(solidGroup.scale, { z: 1, duration: 1.5, ease: "power2.inOut" })
      .to(label3, { opacity: 1, duration: 0.5 }, "-=1.0"); // 3D出現（1D, 2Dもそのまま）

    // 4. 回転演出
    tl.to(mainGroup.rotation, { y: Math.PI / 2, duration: 2, ease: "power1.inOut" });

    // 5. フェードアウト
    tl.to([mainGroup.scale, label1, label2, label3], { opacity: 0, duration: 1, onUpdate: () => {
        // フェードアウト処理
    }});


    // --- レンダリングループ ---
    function animate() {
        requestAnimationFrame(animate);
        scene.rotation.y += 0.002;
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

        const fontSize = newWidth < 450 ? "14px" : "20px";
        [label1, label2, label3].forEach(l => l.style.fontSize = fontSize);
    });
}