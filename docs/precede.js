import { THREE } from './three.js';

export function drawPrecedeModel() {
    // コンテナ要素の取得
    const container = document.querySelector(".precede");
    if (!container) return;

    // --- 初期化 ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll("div[id^='lbl-d']");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".dimension-controls");
    if (oldControls) oldControls.remove();
    const oldJoystick = container.querySelector(".joystick-base");
    if (oldJoystick) oldJoystick.remove();

    container.style.background = 'linear-gradient(135deg, #0a0e17 0%, #1a2333 100%)';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    let isPlaying = true;

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 2000);
    camera.position.set(0, 0, 400);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 光源 ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(1, 1, 2).normalize();
    scene.add(directionalLight);

    // --- 背景グリッド ---
    const gridGeometry = new THREE.PlaneGeometry(width * 2, height * 2, 50, 50);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x004466, wireframe: true, transparent: true, opacity: 0.1 });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.position.z = -1;
    scene.add(gridMesh);

    // --- オブジェクト作成 ---
    const player = new THREE.Group();
    const pBase = new THREE.Mesh(new THREE.CircleGeometry(10, 8), new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.9, roughness: 0.2 }));
    player.add(pBase);
    const pCore = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.0 }));
    pCore.position.z = 1;
    player.add(pCore);
    const pRing = new THREE.Mesh(new THREE.RingGeometry(12, 14, 32, 1, 0, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    pRing.position.z = 0.5;
    player.add(pRing);
    const pInner = new THREE.Mesh(new THREE.RingGeometry(8, 9, 16), new THREE.MeshBasicMaterial({ color: 0x00cccc, wireframe: true, transparent: true, opacity: 0.5 }));
    pInner.position.z = 0.6;
    player.add(pInner);
    scene.add(player);

    const precedeRadius = 10;
    const precedeObj = new THREE.Group();
    const prBase = new THREE.Mesh(new THREE.CircleGeometry(precedeRadius, 6), new THREE.MeshStandardMaterial({ color: 0x331122, metalness: 0.9, roughness: 0.2 }));
    precedeObj.add(prBase);
    const prCore = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0 }));
    prCore.position.z = 1;
    precedeObj.add(prCore);
    const prRing = new THREE.Mesh(new THREE.RingGeometry(13, 14, 6), new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.7 }));
    prRing.position.z = 0.5;
    precedeObj.add(prRing);
    scene.add(precedeObj);

    // --- ラベル ---
    const label = document.createElement('div');
    label.id = 'lbl-d-precede';
    label.textContent = '先行する';
    label.style.cssText = `position: absolute; color: #ffffff; background: linear-gradient(135deg, rgba(255, 0, 255, 0.2) 0%, rgba(255, 0, 255, 0.4) 100%); padding: 6px 14px; border: 1px solid rgba(255, 0, 255, 0.6); border-radius: 4px; font-weight: bold; pointer-events: none; transform: translate(-50%, -50%); z-index: 100; white-space: nowrap; box-shadow: 0 0 10px rgba(255, 0, 255, 0.4); letter-spacing: 1px;`;
    container.appendChild(label);

    // --- ジョイスティック ---
    const joystickBase = document.createElement('div');
    joystickBase.className = 'joystick-base';
    joystickBase.style.cssText = `position: absolute; bottom: 20px; left: 20px; background: rgba(0, 0, 0, 0.2); border: 2px solid rgba(0, 255, 255, 0.4); border-radius: 50%; z-index: 50; touch-action: none; box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);`;
    const joystickThumb = document.createElement('div');
    joystickThumb.style.cssText = `position: absolute; top: 50%; left: 50%; background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);`;
    joystickBase.appendChild(joystickThumb);
    container.appendChild(joystickBase);

    let stickActive = false;
    const stickPos = new THREE.Vector2(0, 0);
    let maxRadius = 40;

    const updateJoystick = (clientX, clientY) => {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
        }
        joystickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        stickPos.set(dx / maxRadius, dy / maxRadius);
    };

    joystickBase.addEventListener('pointerdown', (e) => { stickActive = true; updateJoystick(e.clientX, e.clientY); joystickBase.setPointerCapture(e.pointerId); });
    joystickBase.addEventListener('pointermove', (e) => { if (stickActive) updateJoystick(e.clientX, e.clientY); });
    joystickBase.addEventListener('pointerup', (e) => { stickActive = false; joystickThumb.style.transform = `translate(-50%, -50%)`; stickPos.set(0, 0); joystickBase.releasePointerCapture(e.pointerId); });

    // --- ロジック変数 ---
    const speed = 2;
    const gap = 60;
    const targetDir = new THREE.Vector3(1, 0, 0);
    const currentOffset = new THREE.Vector3(gap, 0, 0);
    const rotAxis = new THREE.Vector3(0, 0, 1);

    // --- 💡 修正: リサイズ関数を独立させて初期実行 ---
    const handleResize = () => {
        const newWidth = container.clientWidth || baseSize;
        width = newWidth;
        height = newWidth;

        renderer.setSize(width, height);
        camera.left = width / -2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = height / -2;
        camera.updateProjectionMatrix();

        // ジョイスティックのリサイズ
        const stickScale = width < 450 ? 0.7 : 1.0;
        joystickBase.style.width = `${100 * stickScale}px`;
        joystickBase.style.height = `${100 * stickScale}px`;
        joystickThumb.style.width = `${40 * stickScale}px`;
        joystickThumb.style.height = `${40 * stickScale}px`;
        maxRadius = 40 * stickScale;

        // ラベルのリサイズ
        label.style.fontSize = width < 450 ? "12px" : "14px";
        label.style.padding = width < 450 ? "4px 10px" : "6px 14px";

        // グリッドのリサイズ
        gridMesh.scale.set(width * 2 / baseSize, height * 2 / baseSize, 1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    function animate() {
        if (!isPlaying) return;
        requestAnimationFrame(animate);

        const halfW = width / 2;
        const halfH = height / 2;
        const time = Date.now() * 0.005;

        pRing.rotation.z -= 0.05;
        pInner.rotation.z += 0.02;
        prRing.rotation.z += 0.03;
        pCore.scale.setScalar(1 + Math.sin(time) * 0.15);
        prCore.scale.setScalar(1 + Math.cos(time * 1.2) * 0.15);

        if (stickPos.lengthSq() > 0) {
            const moveVec = new THREE.Vector3(stickPos.x, -stickPos.y, 0).normalize();
            player.position.addScaledVector(moveVec, speed);
            targetDir.copy(moveVec);
        }

        const currentAngle = Math.atan2(currentOffset.y, currentOffset.x);
        const targetAngle = Math.atan2(targetDir.y, targetDir.x);
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        currentOffset.applyAxisAngle(rotAxis, angleDiff * 0.4);

        let px = player.position.x + currentOffset.x;
        if (px > halfW - precedeRadius) player.position.x = halfW - precedeRadius - currentOffset.x;
        else if (px < -halfW + precedeRadius) player.position.x = -halfW + precedeRadius - currentOffset.x;

        let py = player.position.y + currentOffset.y;
        if (py > halfH - precedeRadius) player.position.y = halfH - precedeRadius - currentOffset.y;
        else if (py < -halfH + precedeRadius) player.position.y = -halfH + precedeRadius - currentOffset.y;

        precedeObj.position.copy(player.position).add(currentOffset);

        const screenPos = precedeObj.position.clone().project(camera);
        let lx = (screenPos.x * 0.5 + 0.5) * width;
        let ly = (screenPos.y * -0.5 + 0.5) * height;
        label.style.left = `${lx + targetDir.x * 45}px`;
        label.style.top = `${ly + -targetDir.y * 45}px`;

        gridMesh.position.x += 0.2;
        gridMesh.position.y -= 0.1;
        if (gridMesh.position.x > width / 2) gridMesh.position.x = -width / 2;
        if (gridMesh.position.y < -height / 2) gridMesh.position.y = height / 2;

        renderer.render(scene, camera);
    }
    animate();
}