import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawEclipticModel() {
    const container = document.querySelector(".tropic");
    if (!container) return;
    container.style.backgroundColor = '#000000';

    // --- 初期化 ---
    container.innerHTML = "";
    container.style.position = "relative";
    
    // 横幅を取得し、高さを横幅の100%（正方形）に設定
    const baseSize = 600 * 0.7;
    let width = container.clientWidth || baseSize;
    let height = width; // 100%

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 250, 500);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- ラベル作成用ヘルパー関数 ---
    const createLabel = (text, top, left, color) => {
        const div = document.createElement("div");
        div.className = "ecliptic-label"; // リサイズ制御用
        div.textContent = text;
        div.style.position = "absolute";
        div.style.top = top;
        div.style.left = left;
        div.style.color = color;
        // スマホ(400px未満)なら10px、それ以外は14px
        div.style.fontSize = width < 400 ? "10px" : "14px";
        div.style.fontWeight = "normal";
        div.style.pointerEvents = "none";
        div.style.whiteSpace = "nowrap";
        container.appendChild(div);
    };

    // --- 定数 ---
    const earthRadius = 40 * 0.7;
    const sunRadius = 25 * 0.7;
    const eclipticRadius = 220 * 0.7;
    const celestialSphereRadius = 230 * 0.7;
    const tiltRad = 23.4 * Math.PI / 180;

    // --- 天球 ---
    const celestialColor = "#4a90e2";
    const celestialSphere = new THREE.Mesh(
        new THREE.SphereGeometry(celestialSphereRadius, 32, 32),
        new THREE.MeshBasicMaterial({ color: celestialColor, wireframe: true, transparent: true, opacity: 0.12 })
    );
    scene.add(celestialSphere);

    // --- 地球 (地軸を垂直に固定) ---
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = 0; // ★垂直に設定
    scene.add(earthGroup);

    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
        color: "#2c7be5",
        emissive: "#051020",
        specular: "#222222",
        shininess: 10
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    // 地軸の棒 (垂直)
    const axisHeight = earthRadius * 10;
    const axisGeo = new THREE.CylinderGeometry(0.5, 0.5, axisHeight, 8);
    const axisMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const axisMesh = new THREE.Mesh(axisGeo, axisMat);
    earthGroup.add(axisMesh);

    // --- 熱帯の表現 ---
    const tropicalGeo = new THREE.SphereGeometry(
        earthRadius + 0.3,
        64,
        32,
        0,
        Math.PI * 2,
        Math.PI / 2 - tiltRad,
        tiltRad * 2
    );
    const tropicalMat = new THREE.MeshBasicMaterial({
        color: "#00d320",
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const tropicalMask = new THREE.Mesh(tropicalGeo, tropicalMat);
    earth.add(tropicalMask);

    // 回帰線
    const createTropicMesh = (latitudeRad) => {
        const y = earthRadius * Math.sin(latitudeRad);
        const r = earthRadius * Math.cos(latitudeRad);
        const geometry = new THREE.TorusGeometry(r, 1.2, 8, 100);
        const material = new THREE.MeshBasicMaterial({ color: "#ff00bb", transparent: true, opacity: 1 });
        const torus = new THREE.Mesh(geometry, material);
        torus.rotation.x = Math.PI / 2;
        torus.position.y = y;
        return torus;
    };
    earth.add(createTropicMesh(tiltRad));
    earth.add(createTropicMesh(-tiltRad));

    // --- 太陽 & 光源 ---
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);

    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(sunRadius, 32, 32),
        new THREE.MeshBasicMaterial({ color: "#ffffff" })
    );
    sunGroup.add(sun);

    const sunGlowInner = new THREE.Mesh(
        new THREE.SphereGeometry(sunRadius * 1.2, 32, 32),
        new THREE.MeshBasicMaterial({ color: "#f6e05e", transparent: true, opacity: 0.4 })
    );
    sunGroup.add(sunGlowInner);

    const sunGlowOuter = new THREE.Mesh(
        new THREE.SphereGeometry(sunRadius * 1.8, 32, 32),
        new THREE.MeshBasicMaterial({ color: "#f59e0b", transparent: true, opacity: 0.15 })
    );
    sunGroup.add(sunGlowOuter);

    const sunLight = new THREE.PointLight("#fffde7", 3.5, 0, 0);
    sunGroup.add(sunLight);

    // --- 黄道 (23.4度傾ける) ---
    const eclipticTubeRadius = 1;
    const eclipticGeo = new THREE.TorusGeometry(eclipticRadius, eclipticTubeRadius, 16, 100);
    const eclipticMat = new THREE.MeshBasicMaterial({
        color: "#f6e05e",
        transparent: true,
        opacity: 0.8
    });
    const eclipticMesh = new THREE.Mesh(eclipticGeo, eclipticMat);
    eclipticMesh.rotation.x = Math.PI / 2;

    const eclipticContainer = new THREE.Group();
    eclipticContainer.rotation.z = tiltRad; 
    eclipticContainer.add(eclipticMesh);
    scene.add(eclipticContainer);

    // 至点マーカー
    const createSolsticePoint = (x) => {
        const geo = new THREE.SphereGeometry(7, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0, 0);
        return mesh;
    };
    eclipticContainer.add(createSolsticePoint(eclipticRadius));
    eclipticContainer.add(createSolsticePoint(-eclipticRadius));

    scene.add(new THREE.AmbientLight("#ffffff", 0.2));

    // --- アニメーション ---
    const state = { angle: 0 };
    gsap.to(state, {
        angle: Math.PI * 2,
        duration: 20,
        repeat: -1,
        ease: "none",
        onUpdate: () => {
            const cos = Math.cos(state.angle);
            const sin = Math.sin(state.angle);
            sunGroup.position.set(
                cos * eclipticRadius * Math.cos(tiltRad),
                cos * eclipticRadius * Math.sin(tiltRad),
                sin * eclipticRadius
            );
        }
    });

    gsap.to(earth.rotation, {
        y: Math.PI * 2,
        duration: 8,
        repeat: -1,
        ease: "none"
    });

    // --- ラベルの配置 ---
    createLabel("天球", "5%", "48%", celestialColor);
    createLabel("地軸", "25%", "40%", "#ffffff");
    createLabel("黄道", "75%", "30%", "#f6e05e");
    createLabel("北回帰線：tropic", "40%", "54%", "#e800aa");
    createLabel("南回帰線：tropic", "55%", "27%", "#e800aa");
    createLabel("熱帯", "48%", "59%", "#00ed24");
    createLabel("夏至点", "32%", "86%", "#ffffff");
    createLabel("冬至点", "59%", "3%", "#ffffff");

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || baseSize;
        const newHeight = newWidth; // 100%
        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        const labels = container.querySelectorAll(".ecliptic-label");
        labels.forEach(label => {
            label.style.fontSize = newWidth < 400 ? "10px" : "14px";
        });
    });
    console.log('tropical');
    
}