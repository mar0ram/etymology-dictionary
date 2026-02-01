import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gsap } from 'https://unpkg.com/gsap/index.js';

export function drawEclipticModel() {
    const container = document.querySelector(".tropic");
    if (!container) return;

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
        // スマホ(600px未満)なら10px、それ以外は14px
        div.style.fontSize = width < 600 ? "10px" : "14px";
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
    createLabel("地軸（垂直）", "25%", "28%", "#ffffff");
    createLabel("黄道", "75%", "30%", "#f6e05e");
    createLabel("北回帰線（tropic）", "40%", "54%", "#ff00bb");
    createLabel("南回帰線（tropic）", "55%", "27%", "#ff00bb");
    createLabel("熱帯", "48%", "59%", "#00ed24");
    createLabel("夏至点", "32%", "86%", "#ffffff");
    createLabel("冬至点", "59%", "2%", "#ffffff");

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
            label.style.fontSize = newWidth < 600 ? "10px" : "14px";
        });
    });
}

















const container = document.querySelector('.tropic');

// --- おおぐま座データ (変更なし) ---
const starsData = [
   { id: "alpha", ra: 165.93, dec: 61.75, mag: 1.8, color: 0xff4444 }, // 赤
    { id: "beta",  ra: 165.46, dec: 56.38, mag: 2.3, color: 0xff4444 }, // 赤
    { id: "gamma", ra: 178.45, dec: 53.69, mag: 2.4, color: 0xff4444 }, // 赤
    { id: "delta", ra: 183.85, dec: 57.03, mag: 3.3, color: 0xff4444 }, // 赤
    { id: "epsilon", ra: 193.47, dec: 55.96, mag: 1.8, color: 0xff4444 }, // 赤
    { id: "zeta",  ra: 200.08, dec: 54.92, mag: 2.2, color: 0xff4444 }, // 赤
    { id: "eta",   ra: 206.88, dec: 49.31, mag: 1.9, color: 0xff4444 }, // 赤
    { id: "omicron", ra: 128.9, dec: 60.71, mag: 3.3, color: 0xfff4ea },
    { id: "theta", ra: 142.6, dec: 51.6, mag: 3.1, color: 0xeaf4ff },
    { id: "upsilon", ra: 149.3, dec: 59.0, mag: 3.7, color: 0xfff4ea },
    { id: "h", ra: 140.5, dec: 63.1, mag: 3.6, color: 0xeaf4ff },
    { id: "iota", ra: 133.1, dec: 48.04, mag: 3.1, color: 0xeaf4ff },
    { id: "kappa", ra: 135.6, dec: 44.5, mag: 3.5, color: 0xeaf4ff },
    { id: "lambda", ra: 154.5, dec: 42.9, mag: 3.4, color: 0xfff4ea },
    { id: "mu", ra: 154.5, dec: 41.5, mag: 3.0, color: 0xfff4ea },
    { id: "psi", ra: 167.4, dec: 44.5, mag: 3.0, color: 0xfff4ea },
    { id: "chi", ra: 176.4, dec: 47.7, mag: 3.7, color: 0xfff4ea },
    { id: "nu", ra: 169.6, dec: 33.1, mag: 3.4, color: 0xfff4ea },
    { id: "xi", ra: 169.8, dec: 31.5, mag: 3.7, color: 0xfff4ea }
];

const connections = [
    ["alpha", "beta"], ["beta", "gamma"], ["gamma", "delta"], ["delta", "alpha"],
    ["delta", "epsilon"], ["epsilon", "zeta"], ["zeta", "eta"],
    ["alpha", "theta"], ["theta", "omicron"], ["omicron", "h"], ["h", "upsilon"], ["upsilon", "theta"],
    ["theta", "iota"], ["iota", "kappa"],
    ["beta", "psi"], ["psi", "lambda"], ["lambda", "mu"],
    ["gamma", "chi"], ["chi", "nu"], ["nu", "xi"]
];

// --- シーン設定 ---
const scene = new THREE.Scene();
const width = container.clientWidth || window.innerWidth;
const height = container.clientHeight || 400;
const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000);
camera.zoom = 1.1; 
camera.updateProjectionMatrix();
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(width, height);
// 【追加】デバイスのピクセル比を設定（これでボケが劇的に改善します）
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// --- 街の演出レイヤー (変更なし) ---
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
        for(let i=0; i<3; i++) {
            ctx.fillRect(x + w/4, canvas.height - h + 10 + i*15, 5, 5);
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

// --- 座標計算とスケーリング (変更なし) ---
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

// --- 星と星座線の描画 (修正: 輝きをクリアに) ---
const starMap = new Map();

const createGlowTexture = (color, isCore = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    
    const c = new THREE.Color(color);
    if (isCore) {
        // 芯の部分：中心を真っ白にし、境界をはっきりさせる
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    } else {
        // 後光の部分：中心を明るく、周辺への減衰を速くする
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.05, `rgba(${c.r*255}, ${c.g*255}, ${c.b*255}, 1)`);
        gradient.addColorStop(0.2, `rgba(${c.r*255}, ${c.g*255}, ${c.b*255}, 0.3)`);
        gradient.addColorStop(0.6, `rgba(${c.r*255}, ${c.g*255}, ${c.b*255}, 0)`);
    }
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
};

starsData.forEach(star => {
    const pos = getPos(star.ra, star.dec);
    // 星の等級によるサイズ差を少し強調
    const baseSize = Math.max(0.6, (5 - star.mag) * 1.1);
    const baseOpacity = Math.max(0.6, (6 - star.mag) / 5);

    // Glow (後光)
    const glowMaterial = new THREE.SpriteMaterial({
        map: createGlowTexture(star.color, false),
        color: star.color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: baseOpacity * 0.8
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.copy(pos);
    const glowScale = baseSize * 6; // 少し広がりを抑える
    glow.scale.set(glowScale, glowScale, 1);
    
    glow.userData = { 
        isStar: true, 
        baseOpacity: baseOpacity * 0.8, 
        baseScale: glowScale,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.04
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
    const coreScale = baseSize * 1.2; // 芯を小さく鋭く
    core.scale.set(coreScale, coreScale, 1);
    core.userData = { isCore: true, baseScale: coreScale };
    scene.add(core);

    starMap.set(star.id, pos);
});

// --- 以降、Line描画・アニメーション・リサイズ処理は元のまま ---
const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.15
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

let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.02;

    scene.children.forEach(child => {
        if (child.userData.isStar) {
            const twinkle = Math.sin(time * 2 + child.userData.phase) * 0.15;
            const noise = (Math.random() - 0.5) * 0.05; 
            
            child.material.opacity = child.userData.baseOpacity + twinkle + noise;
            const currentScale = child.userData.baseScale * (1 + twinkle * 0.5);
            child.scale.set(currentScale, currentScale, 1);
        }
    });
    
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    renderer.setSize(newWidth, newHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // リサイズ時もDPRを維持
    camera.left = -newWidth / 2;
    camera.right = newWidth / 2;
    camera.top = newHeight / 2;
    camera.bottom = -newHeight / 2;
    camera.updateProjectionMatrix();

    citySprite.scale.set(newWidth, newHeight / 3, 1);
    citySprite.position.set(0, -newHeight / 2 + newHeight / 6, 15);
});