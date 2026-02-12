import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawSchemeModel() {
    const container = document.querySelector(".scheme");
    if (!container) return;

    container.style.backgroundColor = '#0d1117';
    container.style.overflow = "hidden";

    // --- 初期化 ---
    container.innerHTML = "";
    container.style.position = "relative";

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(450, 300, 550); 
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- ライティング ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(200, 500, 200);
    scene.add(pointLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // ==========================================
    // 1. スキーム全体の枠組み (Outer Scheme Frame)
    // ==========================================
    const totalWidth = 500;
    const outerBoxGeo = new THREE.BoxGeometry(totalWidth, 120, 120);
    const outerEdges = new THREE.EdgesGeometry(outerBoxGeo);
    const outerFrame = new THREE.LineSegments(
        outerEdges, 
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    mainGroup.add(outerFrame);

    // 貫く中心軸 (Central Flow Line)
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-totalWidth/2 - 20, 0, 0),
        new THREE.Vector3(totalWidth/2 + 20, 0, 0)
    ]);
    const flowLine = new THREE.Line(
        axisGeom, 
        new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 })
    );
    mainGroup.add(flowLine);

    // ==========================================
    // 2. 各ステップの構造体 (Modules)
    // ==========================================
    const moduleCount = 3;
    const modules = [];
    const colors = [0x00d2ff, 0x3388ff, 0x7744ff];

    for (let m = 0; m < moduleCount; m++) {
        const moduleGroup = new THREE.Group();
        const mX = (m - (moduleCount - 1) / 2) * 160; 
        moduleGroup.position.set(mX, 0, 0);
        
        const fragments = [];
        // --- 変更点：要素数を20個に増加 ---
        const fragCount = 20; 
        const fragGeo = new THREE.IcosahedronGeometry(4, 0); // 少し小さくして密度を高める
        const fragMat = new THREE.MeshLambertMaterial({ color: 0x666666 });

        for (let i = 0; i < fragCount; i++) {
            const mesh = new THREE.Mesh(fragGeo, fragMat.clone());
            // 初期位置のランダム範囲を少し広げてカオス感を出す
            mesh.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 300 + 150, 
                (Math.random() - 0.5) * 200
            );
            // ターゲット位置（ボックス内に高密度で集まる）
            mesh.userData.targetPos = {
                x: (Math.random() - 0.5) * 45,
                y: (Math.random() - 0.5) * 45,
                z: (Math.random() - 0.5) * 45
            };
            fragments.push(mesh);
            moduleGroup.add(mesh);
        }

        const hullGeo = new THREE.BoxGeometry(60, 60, 60);
        const hullLines = new THREE.LineSegments(
            new THREE.EdgesGeometry(hullGeo), 
            new THREE.LineBasicMaterial({ color: colors[m], transparent: true, opacity: 0 })
        );
        
        moduleGroup.add(hullLines);
        modules.push({ group: moduleGroup, fragments, hullLines, color: colors[m] });
        mainGroup.add(moduleGroup);
    }

    // --- ラベル ---
    const createLabel = (text, top, left, color) => {
        const div = document.createElement("div");
        div.innerHTML = text;
        div.style.position = "absolute";
        div.style.top = top;
        div.style.left = left;
        div.style.transform = "translate(-50%, -50%)";
        div.style.color = color;
        div.style.fontSize = width < 450 ? "14px" : "20px";
        div.style.fontWeight = "bold";
        div.style.fontFamily = "sans-serif";
        div.style.textAlign = "center";
        div.style.opacity = 0;
        container.appendChild(div);
        return div;
    };

    const lbl1 = createLabel("バラバラな要素", "80%", "50%", "#aaaaaa");
    const lbl2 = createLabel("まとまってできる<br>SCHEME（体系）", "20%", "50%", "#00d2ff");
    const lbl3 = createLabel("順序づけられた<br>SCHEME（計画）", "80%", "50%", "#ffffff");

    // --- アニメーション ---
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });

    // 0. リセット
    tl.add(() => {
        modules.forEach(m => {
            m.fragments.forEach(f => {
                f.position.set((Math.random()-0.5)*200, (Math.random()-0.5)*300+150, (Math.random()-0.5)*200);
                f.material.color.setHex(0x666666);
            });
            m.hullLines.material.opacity = 0;
        });
        outerFrame.material.opacity = 0;
        flowLine.material.opacity = 0;
        [lbl1, lbl2, lbl3].forEach(l => l.style.opacity = 0);
    });

    // 1. 導入
    tl.to(lbl1, { opacity: 1, duration: 1 }).to(lbl1, { opacity: 0, duration: 0.5 }, "+=1");

    // 2. 順序立てて構成
    tl.to(lbl2, { opacity: 1, duration: 1 });
    modules.forEach((m, mi) => {
        // --- 変更点：要素数が増えたため stagger を少し速く(0.04)設定してテンポを維持 ---
        m.fragments.forEach((f, fi) => {
            tl.to(f.position, {
                x: f.userData.targetPos.x,
                y: f.userData.targetPos.y,
                z: f.userData.targetPos.z,
                duration: 1.2,
                ease: "back.out(1.2)" // 収束時に少し弾む動きを追加
            }, `step${mi}+=${fi * 0.04}`);
            
            tl.to(f.material.color, { 
                r: new THREE.Color(m.color).r, 
                g: new THREE.Color(m.color).g, 
                b: new THREE.Color(m.color).b, 
                duration: 0.6 
            }, `step${mi}+=${fi * 0.04}`);
        });
        tl.to(m.hullLines.material, { opacity: 0.8, duration: 0.5 }, `step${mi}+=0.8`);
    });

    // 3. 体系化 (軸と外枠の出現)
    tl.to(lbl2, { opacity: 0, duration: 0.5 }, "+=0.5")
      .to(flowLine.material, { opacity: 1, duration: 0.8 }, "final")
      .to(outerFrame.material, { opacity: 0.3, duration: 1.2 }, "final")
      .to(lbl3, { opacity: 1, duration: 1 }, "final+=0.5")
      .to(mainGroup.rotation, { y: Math.PI * 0.15, duration: 2, ease: "power2.inOut" }, "final");

    // 4. フェードアウト
    tl.to([mainGroup.scale, lbl3], { opacity: 0, duration: 1, delay: 2 });

    // --- ループ ---
    function animate() {
        requestAnimationFrame(animate);
        modules.forEach(m => { m.group.rotation.y += 0.01; });
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        renderer.setSize(w, w);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    });
}