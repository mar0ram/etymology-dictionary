import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawPostponeModel() {
    const container = document.querySelector(".postpone");
    if (!container) return;

    // --- 初期化 ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll("div[id^='lbl-postpone']");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".postpone-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#00050a';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    const animations = [];
    const labels = [];
    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x00050a, 0.002);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(220, 180, 280);
    camera.lookAt(0, 0, -100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- サイバー空間演出：グリッド ---
    const gridHelper = new THREE.GridHelper(1200, 60, 0x00ffff, 0x001122);
    gridHelper.position.y = -2;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.4;
    scene.add(gridHelper);

    // --- サイバー空間演出：デジタル・パーティクル ---
    const partCount = 200;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i++) {
        partPos[i] = (Math.random() - 0.5) * 800;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 2, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // --- ライト ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const blueLight = new THREE.PointLight(0x00f2ff, 2.5, 1000);
    blueLight.position.set(100, 250, 100);
    scene.add(blueLight);

    const COLOR_AXIS = 0x00ffff;
    const COLOR_OBJ = 0xff0055;
    const COLOR_PATH = 0xffff00;

    // === 1. モダンな時間軸 ===
    const axisGroup = new THREE.Group();
    const axisLength = 350;
    const lineGeo = new THREE.BoxGeometry(1.5, 0.5, axisLength);
    lineGeo.translate(0, 0, -axisLength / 2);
    const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshStandardMaterial({
        color: COLOR_AXIS,
        emissive: COLOR_AXIS,
        emissiveIntensity: 1.0
    }));
    axisGroup.add(lineMesh);

    for (let i = 0; i <= 10; i++) {
        const z = -(axisLength / 10) * i;
        const tickGeo = new THREE.BoxGeometry(i % 5 === 0 ? 30 : 15, 0.8, 0.8);
        const tick = new THREE.Mesh(tickGeo, new THREE.MeshStandardMaterial({
            color: COLOR_AXIS,
            emissive: COLOR_AXIS,
            emissiveIntensity: 1.5
        }));
        tick.position.set(0, 0, z);
        axisGroup.add(tick);
    }
    scene.add(axisGroup);

    // === 2. オブジェクト ===
    const objSize = 12;
    const objMesh = new THREE.Mesh(
        new THREE.BoxGeometry(objSize, objSize, objSize),
        new THREE.MeshStandardMaterial({ color: COLOR_OBJ, metalness: 1.0, roughness: 0.1, emissive: COLOR_OBJ, emissiveIntensity: 0.4 })
    );
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(objMesh.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    objMesh.add(edge);
    scene.add(objMesh);

    // === 3. 放物線パス ===
    const startPos = new THREE.Vector3(0, 6, 0);
    const endPos = new THREE.Vector3(0, 6, -220);

    const curve = new THREE.QuadraticBezierCurve3(startPos, new THREE.Vector3(0, 150, -110), endPos);

    const pathPoints = curve.getPoints(50);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineBasicMaterial({
        color: COLOR_PATH,
        transparent: true,
        opacity: 0,
        linewidth: 2
    });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathLine.geometry.setDrawRange(0, 0);
    scene.add(pathLine);

    // --- ラベル作成 ---
    const createLabel = (id, html, top, left, color) => {
        const div = document.createElement("div");
        div.id = id;
        div.innerHTML = html;
        const fontSize = width < 450 ? "14px" : "18px";
        const padding = width < 450 ? "5px 10px" : "10px 20px";
        div.style.cssText = `position:absolute; top:${top}; left:${left}; transform:translate(0%, -50%); color:${color}; font-family:'Courier New', monospace; font-size:${fontSize}; font-weight:bold; opacity:0; z-index:10; background:rgba(0,15,30,0.9); padding:${padding}; border-radius:0px; border: 1px solid ${color}; box-shadow: 0 0 20px ${color}66; pointer-events:none; white-space:nowrap; text-transform: uppercase; letter-spacing: 0.2em;`;
        container.appendChild(div);

        labels.push(div);
        return div;
    };

    const lblPost = createLabel("lbl-postpone-post", "post <span style='font-size:0.8em; color:#fff;'>[あとに]</span>", "20%", "50%", "#00ffff");
    const lblPonere = createLabel("lbl-postpone-ponere", "ponere <span style='font-size:0.8em; color:#fff;'>[置く]</span>", "60%", "50%", "#ffa500");

    // 💡 初期状態：オブジェクトと時間軸を非表示
    axisGroup.visible = false;
    objMesh.visible = false;

    // --- アニメーション・タイムライン ---
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1, paused: true });
    const progress = { val: 0, line: 0 };

    tl.set(axisGroup.scale, { z: 0.001 })
        .set(objMesh.scale, { x: 0, y: 0, z: 0 })
        .set(objMesh.position, { x: startPos.x, y: startPos.y, z: startPos.z })
        .set(pathMat, { opacity: 0 })
        .add(() => { pathLine.geometry.setDrawRange(0, 0); })
        .set([lblPost, lblPonere], { opacity: 0 })
        .add(() => {
            // 💡 アニメーション開始時に表示
            axisGroup.visible = true;
            objMesh.visible = true;
        }, 0);

    tl.to(axisGroup.scale, { z: 1, duration: 1 });
    tl.to(objMesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out" });

    tl.to(pathMat, { opacity: 0.8, duration: 0.1 })
        .to(progress, {
            line: 51,
            duration: 1.0,
            ease: "power1.inOut",
            onUpdate: () => {
                pathLine.geometry.setDrawRange(0, progress.line);
            }
        });

    tl.to(lblPost, { opacity: 1, duration: 0.6, scale: 1.2 })
        .to(lblPost, { scale: 1, duration: 0.2 });

    tl.to({}, { duration: 1.5 });

    tl.to(progress, {
        val: 1,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => {
            const p = curve.getPoint(progress.val);
            objMesh.position.set(p.x, p.y, p.z);
        }
    });

    tl.to(objMesh.position, { y: 6, duration: 0.4, ease: "bounce.out" });

    tl.to(lblPonere, { opacity: 1, duration: 0.6, scale: 1.2 })
        .to(lblPonere, { scale: 1, duration: 0.2 });

    tl.to({}, { duration: 1 });

    tl.to([objMesh.scale, axisGroup.scale, lblPost, lblPonere], { opacity: 0, duration: 1 });

    animations.push(tl);

    // --- コントロールボタンの作成 ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'postpone-controls';
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

        let isPlaying = false;

        const playBtn = document.createElement('button');
       playBtn.textContent = 'PLAY';
        playBtn.style.cssText = buttonStyles;
        playBtn.addEventListener('mouseover', () => {
            playBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            playBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        });
        playBtn.addEventListener('mouseout', () => {
            playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        playBtn.addEventListener('click', () => {
            if (!isPlaying) {
                tl.play();
                isPlaying = true;
                playBtn.textContent = 'PAUSE';
            } else {
                tl.pause();
                isPlaying = false;
                playBtn.textContent = 'PLAY';
            }
        });

        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↻ Reset';
       resetBtn.textContent = 'RESET';
        resetBtn.style.cssText = buttonStyles;
        resetBtn.addEventListener('mouseover', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        });
        resetBtn.addEventListener('mouseout', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        resetBtn.addEventListener('click', () => {
            // すべてのアニメーションを停止して先頭に戻す
            animations.forEach(anim => {
                anim.pause();
                anim.seek(0);
            });

            // オブジェクトと軸の表示/非表示をリセット
            axisGroup.visible = false;
            objMesh.visible = false;

            // オブジェクトの位置とスケールをリセット
            objMesh.position.set(startPos.x, startPos.y, startPos.z);
            objMesh.scale.set(0, 0, 0);
            axisGroup.scale.set(1, 0.001, 1);

            // パスをリセット
            pathLine.geometry.setDrawRange(0, 0);
            pathMat.opacity = 0;

            // ラベルをリセット
            lblPost.style.opacity = '0';
            lblPonere.style.opacity = '0';

            // 状態をリセット
            isPlaying = false;
            playBtn.textContent = 'PLAY';

            // シーンを再描画
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
        particles.rotation.y += 0.001;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || baseSize;
        renderer.setSize(newWidth, newWidth);
        camera.aspect = 1;
        camera.updateProjectionMatrix();

        const newFontSize = newWidth < 450 ? "14px" : "18px";
        labels.forEach(lbl => {
            lbl.style.fontSize = newFontSize;
            lbl.style.padding = newWidth < 450 ? "5px 10px" : "10px 20px";
        });

        // ✅ JSによるピクセル単位の幅計算を廃止し、レスポンシブなCSS設定に一任
        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    });
}