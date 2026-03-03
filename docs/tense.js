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
    const oldLabels = container.querySelectorAll(".tense-label");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".tense-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#111111';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    const animations = [];
    const labels = [];

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

    const state = { sag: 160, vibration: 0, time: 0 };
    let isPlaying = false;
    const startPoint = new THREE.Vector3(-150, 0, 0);
    const endPoint = new THREE.Vector3(150, 0, 0);
    const lineCount = 100;

    const colors = [];
    const colorStart = new THREE.Color(0x0088aa);
    const colorMid = new THREE.Color(0xffffff);
    
    for (let i = 0; i <= lineCount; i++) {
        const t = i / lineCount;
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
                const wave = Math.sin(t * Math.PI) * Math.sin(state.time) + 
                             Math.sin(3 * t * Math.PI) * Math.sin(state.time * 1.5) * 0.15;
                y += wave * state.vibration;
            }
            pts.push(x, y, 0);
        }
        return pts;
    };

    const geometry = new LineGeometry();
    geometry.setPositions(getCatenaryPoints());
    geometry.setColors(colors);

    const material = new LineMaterial({
        vertexColors: true,
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

    const createLabel = (id, html, top, left, color) => {
        const div = document.createElement("div");
        div.className = "tense-label";
        div.id = id;
        div.innerHTML = html;
        div.style.cssText = `position:absolute; top:${top}; left:${left}; transform:translate(-50%, -50%); color:${color}; font-family:'Orbitron', monospace; font-weight:bold; opacity:0; z-index:10; background:rgba(17,17,17,0.9); border-radius:5px; pointer-events:none; text-align:center; text-shadow: 0 0 15px ${color}66; white-space:nowrap;`;
        container.appendChild(div);
        labels.push(div);
        return div;
    };

    const label = createLabel("lbl-tense", "TENSE<br><span style='font-size:0.6em; letter-spacing:3px;'>張り詰めた・緊張した</span>", "25%", "50%", "#00ffff");

    const update = () => {
        geometry.setPositions(getCatenaryPoints());
    };

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5, paused: true });
    tl.to(label, { opacity: 1, duration: 1.2, ease: "power2.out" })
      .to(state, { sag: 0, duration: 0.5, ease: "expo.out", onUpdate: update })
      .to(state, { vibration: 40, duration: 0.1, onUpdate: update }, "-=0.4")
      .to(state, { vibration: 0, duration: 2.5, ease: "power2.out", onUpdate: update })
      .to(label, { opacity: 0, duration: 0.8 }, "+=0.5")
      .to(state, { sag: 160, duration: 2.5, ease: "power2.inOut", onUpdate: update });

    animations.push(tl);

    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tense-controls';
        buttonContainer.style.cssText = `position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;`;

        // 💡 GSAPアニメーション用に position と overflow を追加
        const buttonStyles = `width: 25%; min-width: 100px; max-width: 160px; padding: 12px 0; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 30px; color: white; cursor: pointer; font-size: 14px; font-weight: bold; backdrop-filter: blur(5px); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); box-sizing: border-box; text-align: center; letter-spacing: 1px; position: relative; overflow: hidden;`;

        // 💡 テキストスライドアニメーション関数
        const animateButtonText = (btnElement, newText) => {
            const currentSpan = btnElement.querySelector('.active-text');
            if (currentSpan && currentSpan.textContent !== newText) {
                currentSpan.classList.remove('active-text');
                
                const newSpan = document.createElement('span');
                newSpan.className = 'active-text';
                newSpan.textContent = newText;
                newSpan.style.position = 'absolute';
                newSpan.style.left = '0';
                newSpan.style.width = '100%';
                newSpan.style.top = '50%';
                
                // 新しいテキストを下から待機させる
                gsap.set(newSpan, { yPercent: -50, y: 20, opacity: 0 });
                btnElement.appendChild(newSpan);
                
                // 現在のテキストを上へフェードアウト
                gsap.to(currentSpan, { 
                    yPercent: -50, y: -20, opacity: 0, duration: 0.3, ease: "power2.inOut", 
                    onComplete: () => currentSpan.remove() 
                });
                // 新しいテキストを下から中央へフェードイン
                gsap.to(newSpan, { 
                    yPercent: -50, y: 0, opacity: 1, duration: 0.3, ease: "power2.inOut" 
                });
            }
        };

        // --- PLAY/PAUSEボタン ---
        const playBtn = document.createElement('button');
        playBtn.style.cssText = buttonStyles;
        
        // 内部構造を作成
        const playDummy = document.createElement('span');
        playDummy.textContent = 'PLAY';
        playDummy.style.visibility = 'hidden';
        playBtn.appendChild(playDummy);
        
        const playActive = document.createElement('span');
        playActive.className = 'active-text';
        playActive.textContent = 'PLAY';
        playActive.style.position = 'absolute';
        playActive.style.left = '0';
        playActive.style.width = '100%';
        playActive.style.top = '50%';
        playActive.style.transform = 'translateY(-50%)';
        playBtn.appendChild(playActive);

        playBtn.addEventListener('click', () => {
            if (!isPlaying) {
                animations.forEach(anim => anim.play());
                isPlaying = true;
                animateButtonText(playBtn, 'PAUSE');
                playBtn.style.background = 'rgba(255, 255, 255, 0.4)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 1)';
            } else {
                animations.forEach(anim => anim.pause());
                isPlaying = false;
                animateButtonText(playBtn, 'PLAY');
                playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });

        playBtn.addEventListener('mouseover', () => {
            if (!isPlaying) {
                playBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            }
        });
        playBtn.addEventListener('mouseout', () => {
            if (!isPlaying) {
                playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });

        // --- RESETボタン ---
        const resetBtn = document.createElement('button');
        resetBtn.style.cssText = buttonStyles;
        
        // 内部構造を作成
        const resetDummy = document.createElement('span');
        resetDummy.textContent = 'RESET';
        resetDummy.style.visibility = 'hidden';
        resetBtn.appendChild(resetDummy);
        
        const resetActive = document.createElement('span');
        resetActive.className = 'active-text';
        resetActive.textContent = 'RESET';
        resetActive.style.position = 'absolute';
        resetActive.style.left = '0';
        resetActive.style.width = '100%';
        resetActive.style.top = '50%';
        resetActive.style.transform = 'translateY(-50%)';
        resetBtn.appendChild(resetActive);

        resetBtn.addEventListener('click', () => {
            animations.forEach(anim => { anim.pause(); anim.seek(0); });
            state.sag = 160; state.vibration = 0; state.time = 0;
            update();
            label.style.opacity = '0'; 
            
            if (isPlaying) {
                isPlaying = false;
                animateButtonText(playBtn, 'PLAY'); // テキストをPLAYに戻す
                playBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                playBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
            renderer.render(scene, camera);
        });

        resetBtn.addEventListener('mouseover', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        });
        resetBtn.addEventListener('mouseout', () => {
            resetBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            resetBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });

        buttonContainer.appendChild(playBtn);
        buttonContainer.appendChild(resetBtn);
        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    // --- 💡 修正: リサイズ関数を独立させて初期実行 ---
    const handleResize = () => {
        const newWidth = container.clientWidth || baseSize;
        renderer.setSize(newWidth, newWidth);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        material.resolution.set(newWidth, newWidth);

        const newFontSize = newWidth < 450 ? "14px" : "18px";
        const newPadding = newWidth < 450 ? "5px 10px" : "10px 20px";
        labels.forEach(lbl => {
            lbl.style.fontSize = newFontSize;
            lbl.style.padding = newPadding;
        });

        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    function animate() {
        requestAnimationFrame(animate);
        if (isPlaying) {
            state.time += 0.5;
            update();
        } else if (state.vibration > 0 || state.sag !== 160) {
            update();
        }
        renderer.render(scene, camera);
    }
    animate();
}