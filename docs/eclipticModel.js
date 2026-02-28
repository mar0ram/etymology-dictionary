import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawEclipticModel() {
    const container = document.querySelector(".tropic");
    if (!container) return;

    // --- 初期化 ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll(".ecliptic-label");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".ecliptic-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#000000';
    container.style.position = "relative";
    container.style.overflow = "hidden";

    // アニメーション・ラベル管理
    const animations = [];
    const labels = [];

    const baseSize = 600 * 0.7;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 250, 600);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const sunTexture = textureLoader.load("./textures/sun.jpg");
    sunTexture.colorSpace = THREE.SRGBColorSpace;
    const earthTexture = textureLoader.load("./textures/earth.jpg");
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const earthRadius = 40 * 0.7;
    const sunRadius = 40;
    const celestialSphereRadius = 230 * 0.7;
    const eclipticRadius = celestialSphereRadius + 1;
    const tiltRad = 23.4 * Math.PI / 180;

    const createLabel = (text, top, left, color) => {
        const div = document.createElement("div");
        div.className = "ecliptic-label";
        div.innerHTML = text;
        div.style.position = "absolute";
        div.style.top = top;
        div.style.left = left;
        div.style.transform = "translate(-50%, -50%)";
        div.style.color = color;
        div.style.fontSize = width < 450 ? "12px" : "16px";
        div.style.fontWeight = "normal";
        div.style.pointerEvents = "none";
        div.style.whiteSpace = "nowrap";
        div.style.zIndex = "5";
        container.appendChild(div);
        labels.push(div);
        return div;
    };

    const celestialColor = "#4a90e2";
    const celestialSphere = new THREE.Mesh(
        new THREE.SphereGeometry(celestialSphereRadius, 32, 32),
        new THREE.MeshBasicMaterial({
            color: celestialColor,
            wireframe: true,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
            depthTest: true
        })
    );
    scene.add(celestialSphere);
    celestialSphere.renderOrder = 2;

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        specular: new THREE.Color(0x333333),
        shininess: 15
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);
    earth.renderOrder = 1;

    const axisHeight = earthRadius * 10;
    const axisMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, axisHeight, 8),
        new THREE.MeshBasicMaterial({ color: "#ffffff" })
    );
    earthGroup.add(axisMesh);

    const tropicalMask = new THREE.Mesh(
        new THREE.SphereGeometry(earthRadius + 0.3, 64, 32, 0, Math.PI * 2, Math.PI / 2 - tiltRad, tiltRad * 2),
        new THREE.MeshBasicMaterial({ color: "#00d320", transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    earth.add(tropicalMask);

    const eclipticContainer = new THREE.Group();
    eclipticContainer.rotation.z = tiltRad;
    scene.add(eclipticContainer);

    const eclipticMesh = new THREE.Mesh(
        new THREE.TorusGeometry(eclipticRadius, 1.2, 16, 100),
        new THREE.MeshBasicMaterial({ color: "#f6e05e", transparent: true, opacity: 0.6 })
    );
    eclipticMesh.rotation.x = Math.PI / 2;
    eclipticContainer.add(eclipticMesh);

    const createSolsticePoint = (x) => {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(7, 16, 16),
            new THREE.MeshBasicMaterial({ color: "#ffffff" })
        );
        mesh.position.x = x;
        return mesh;
    };
    eclipticContainer.add(createSolsticePoint(eclipticRadius));
    eclipticContainer.add(createSolsticePoint(-eclipticRadius));

    const createSun = (xPos) => {
        const sGroup = new THREE.Group();
        sGroup.position.x = xPos;
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(sunRadius, 64, 64),
            new THREE.MeshBasicMaterial({ map: sunTexture })
        );
        const corona = new THREE.Mesh(
            new THREE.SphereGeometry(sunRadius * 1.15, 64, 64),
            new THREE.MeshBasicMaterial({
                color: 0xffaa33, transparent: true, opacity: 0.35,
                blending: THREE.AdditiveBlending, side: THREE.BackSide
            })
        );
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(sunRadius * 1.25, 64, 64),
            new THREE.MeshBasicMaterial({
                color: 0xffdd88, transparent: true, opacity: 0.15,
                blending: THREE.AdditiveBlending
            })
        );
        const light = new THREE.PointLight(0xffffff, 2.5, 0);
        sGroup.add(light, core, corona, glow);
        return sGroup;
    };

    eclipticContainer.add(createSun(eclipticRadius));
    eclipticContainer.add(createSun(-eclipticRadius));

    scene.add(new THREE.AmbientLight("#ffffff", 0.3));

    const createDrawingAnimation = (sunIsSummer) => {
        const beamColor = "#ff7700";
        const sign = sunIsSummer ? 1 : -1;
        const sunPos = new THREE.Vector3(sign * eclipticRadius, 0, 0);
        sunPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRad);
        const tropicY = sign * earthRadius * Math.sin(tiltRad);
        const tropicRadius = earthRadius * Math.cos(tiltRad);
        const targetPos = new THREE.Vector3(sign * tropicRadius, tropicY, 0);
        const dist = sunPos.distanceTo(targetPos);
        const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, dist, 8);
        beamGeo.rotateX(-Math.PI / 2);
        beamGeo.translate(0, 0, dist / 2);
        const beamMat = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0 });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.copy(sunPos);
        beamMesh.lookAt(targetPos);
        scene.add(beamMesh);
        const ringMat = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0 });
        let ringMesh = null;
        const state = { beamScale: 0, arc: 0 };
        const tl = gsap.timeline({
            repeat: -1, repeatDelay: 0.5, paused: true,
            onRepeat: () => {
                if (ringMesh) {
                    scene.remove(ringMesh);
                    ringMesh.geometry.dispose();
                    ringMesh = null;
                }
            }
        });
        tl.set(state, { beamScale: 0, arc: 0 });
        tl.set([beamMat, ringMat], { opacity: 0 });
        tl.to(state, {
            beamScale: 1, duration: 0.5,
            onStart: () => { beamMat.opacity = 1; },
            onUpdate: () => { beamMesh.scale.z = state.beamScale; }
        });
        tl.to(state, {
            arc: Math.PI * 2, duration: 8, ease: "none",
            onStart: () => { ringMat.opacity = 1; },
            onUpdate: () => {
                if (ringMesh) {
                    scene.remove(ringMesh);
                    ringMesh.geometry.dispose();
                    ringMesh = null;
                }
                if (state.arc > 0.01) {
                    const geo = new THREE.TorusGeometry(tropicRadius, 1.2, 8, 64, state.arc);
                    ringMesh = new THREE.Mesh(geo, ringMat);
                    ringMesh.rotation.x = Math.PI / 2;
                    ringMesh.rotation.z = sunIsSummer ? -state.arc : Math.PI - state.arc;
                    ringMesh.position.y = tropicY;
                    scene.add(ringMesh);
                }
            }
        });
        tl.to([beamMat, ringMat], {
            opacity: 0, duration: 0.5,
            onComplete: () => {
                if (ringMesh) {
                    scene.remove(ringMesh);
                    ringMesh.geometry.dispose();
                    ringMesh = null;
                }
            }
        });
        animations.push(tl);
    };

    createDrawingAnimation(true);
    createDrawingAnimation(false);

    const earthRot = gsap.to(earth.rotation, {
        y: Math.PI * 2, duration: 8, repeat: -1, ease: "none", paused: true
    });
    animations.push(earthRot);

    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ecliptic-controls';
        buttonContainer.style.cssText = `
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;
        `;
        const buttonStyles = `
            width: 25%; min-width: 100px; max-width: 160px; padding: 12px 0;
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 30px; color: white; cursor: pointer; font-size: 14px; font-weight: bold;
            backdrop-filter: blur(5px); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-sizing: border-box; text-align: center; letter-spacing: 1px;
        `;
        let isPlaying = false;
        const playBtn = document.createElement('button');
        playBtn.textContent = 'PLAY';
        playBtn.style.cssText = buttonStyles;
        playBtn.addEventListener('click', () => {
            if (!isPlaying) {
                animations.forEach(anim => anim.play());
                isPlaying = true;
                playBtn.textContent = 'PAUSE';
            } else {
                animations.forEach(anim => anim.pause());
                isPlaying = false;
                playBtn.textContent = 'PLAY';
            }
        });
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'RESET';
        resetBtn.style.cssText = buttonStyles;
        resetBtn.addEventListener('click', () => {
            animations.forEach(anim => { anim.pause(); anim.seek(0); });
            earth.rotation.y = 0;
            earthGroup.rotation.set(0, 0, 0);
            isPlaying = false;
            playBtn.textContent = 'PLAY';
            renderer.render(scene, camera);
        });
        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);
        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    createLabel("天球", "16%", "50%", celestialColor);
    createLabel("地軸", "30%", "45%", "#ffffff");
    createLabel("黄道", "68%", "58%", "#f6e05e");
    createLabel("北回帰線<br>tropic", "51%", "65%", "#ff7700");
    createLabel("南回帰線<br>tropic", "62%", "40%", "#ff7700");
    createLabel("熱帯", "50%", "40%", "#00ed24");
    createLabel("夏至点", "32%", "93%", "#ffffff");
    createLabel("冬至点", "67%", "11%", "#ffffff");
    createLabel("※本来は地球が太陽の周りをまわっているが、<br>　わかりやすくするために地球を中心に描いている。", "7%", "50%", "#ffffff");

    // --- 💡 修正: リサイズ関数を独立させて初期実行 ---
    const handleResize = () => {
        const newWidth = container.clientWidth || baseSize;
        renderer.setSize(newWidth, newWidth);
        camera.aspect = 1;
        camera.updateProjectionMatrix();

        const newFontSize = newWidth < 450 ? "12px" : "16px";
        labels.forEach(lbl => {
            lbl.style.fontSize = newFontSize;
        });

        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    };

    // 初期化時に一度実行
    handleResize();

    window.addEventListener('resize', handleResize);

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}