import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawSchemeModel() {
    const container = document.querySelector(".scheme");
    if (!container) return;

    // --- 初期化 (既存のCanvasとラベルを削除) ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll(".scheme-label");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".scheme-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#0d1117';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    // 💡 アニメーション管理用
    const animations = [];
    const labels = [];
    let isRotating = false; // 💡 回転制御フラグ（初期値：false = 静止）

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
        new THREE.Vector3(-totalWidth / 2 - 20, 0, 0),
        new THREE.Vector3(totalWidth / 2 + 20, 0, 0)
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
        const fragCount = 20;
        const fragGeo = new THREE.IcosahedronGeometry(4, 0);
        const fragMat = new THREE.MeshLambertMaterial({ color: 0x666666 });

        for (let i = 0; i < fragCount; i++) {
            const mesh = new THREE.Mesh(fragGeo, fragMat.clone());
            mesh.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 300 + 150,
                (Math.random() - 0.5) * 200
            );
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
        div.className = "scheme-label";
        div.innerHTML = text;
        const fontSize = width < 450 ? "14px" : "18px";
        const padding = width < 450 ? "5px 10px" : "10px 20px";
        div.style.cssText = `position:absolute; top:${top}; left:${left}; transform:translate(-50%, -50%); color:${color}; font-family:'Courier New', monospace; font-size:${fontSize}; font-weight:bold; opacity:0; z-index:10; background:rgba(13, 17, 23, 0); padding:${padding}; border-radius:5px; pointer-events:none; text-align:center;`;
        container.appendChild(div);

        labels.push(div);
        return div;
    };

    const lbl1 = createLabel("バラバラな要素", "70%", "50%", "#aaaaaa");
    const lbl2 = createLabel("まとまってできる<br>SCHEME（体系）", "20%", "50%", "#00d2ff");
    const lbl3 = createLabel("順序づけられた<br>SCHEME（計画）", "70%", "50%", "#ffffff");

    // --- アニメーション ---
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3, paused: true });

    // 0. リセット
    tl.add(() => {
        isRotating = true; // ✅ リピート時に回転フラグを再有効化
        modules.forEach(m => {
            m.fragments.forEach(f => {
                f.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300 + 150, (Math.random() - 0.5) * 200);
                f.material.color.setHex(0x666666);
            });
            m.hullLines.material.opacity = 0;
            m.group.rotation.set(0, 0, 0); // 💡 回転をリセット
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
        m.fragments.forEach((f, fi) => {
            tl.to(f.position, {
                x: f.userData.targetPos.x,
                y: f.userData.targetPos.y,
                z: f.userData.targetPos.z,
                duration: 1.2,
                ease: "back.out(1.2)"
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

    // 💡 アニメーション終了時に回転停止
    tl.add(() => {
        isRotating = false;
    });

    animations.push(tl);

    // --- コントロールボタンの作成 ---
    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'scheme-controls';
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
                animations.forEach(anim => anim.play());
                isPlaying = true;
                playBtn.textContent = 'PAUSE';
                isRotating = true; // 💡 Play時に回転開始
            } else {
                animations.forEach(anim => anim.pause());
                isPlaying = false;
                playBtn.textContent = 'PLAY';
                isRotating = false; // 💡 一時停止時に回転停止
            }
        });

        const resetBtn = document.createElement('button');
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

            // フラグメント（要素）のリセット
            modules.forEach(m => {
                m.fragments.forEach(f => {
                    f.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300 + 150, (Math.random() - 0.5) * 200);
                    f.material.color.setHex(0x666666);
                    f.scale.set(1, 1, 1);
                });
                m.hullLines.material.opacity = 0;
                m.group.rotation.set(0, 0, 0);
            });

            // メインのグループをリセット
            outerFrame.material.opacity = 0;
            flowLine.material.opacity = 0;
            mainGroup.scale.set(1, 1, 1);
            mainGroup.rotation.set(0, 0, 0);

            // ラベルをリセット
            lbl1.style.opacity = '0';
            lbl2.style.opacity = '0';
            lbl3.style.opacity = '0';

            // 状態をリセット
            isPlaying = false;
            playBtn.textContent = 'PLAY';
            isRotating = false; // 💡 回転を停止

            // シーンを再描画
            renderer.render(scene, camera);
        });

        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);

        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    // --- ループ ---
    function animate() {
        requestAnimationFrame(animate);
        if (isRotating) { // 💡 フラグをチェックして回転を制御
            modules.forEach(m => { m.group.rotation.y += 0.01; });
        }
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