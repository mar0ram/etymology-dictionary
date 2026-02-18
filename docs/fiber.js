import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawFiberModel() {
    const container = document.querySelector(".fiber");
    if (!container) return;

    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    container.style.backgroundColor = '#020202'; 

    const animations = [];
    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 1, 3000);
    camera.position.set(0, 0, 900);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- 左側：工業用布 ---
    const warpCount = 70; 
    const spacing = 4.0;
    const textileGroup = new THREE.Group();
    scene.add(textileGroup);

    const textileMat = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending 
    });

    const textiles = [];
    for (let i = 0; i < warpCount; i++) {
        const points = [];
        const x = (i * spacing) - (warpCount * spacing) / 2;
        for (let j = 0; j <= 40; j++) {
            points.push(new THREE.Vector3(x, (j - 20) * 10, 0));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, textileMat);
        textileGroup.add(line);
        textiles.push(line);
    }

    // --- 右側：筋繊維 ---
    const muscleGroup = new THREE.Group();
    scene.add(muscleGroup);

    const muscleMat = new THREE.LineBasicMaterial({ 
        color: 0xff3300, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending 
    });

    const muscles = [];
    const muscleSubFiberCount = 120; 
    for (let i = 0; i < muscleSubFiberCount; i++) {
        const points = [];
        const angle = (i / muscleSubFiberCount) * Math.PI * 2;
        const radius = 25 + Math.random() * 15; 
        
        for (let j = 0; j <= 40; j++) {
            const y = (j - 20) * 10;
            const twist = y * 0.02;
            const bulge = Math.cos(y * 0.05) * 5; 
            const x = Math.cos(angle + twist) * (radius + bulge);
            const z = Math.sin(angle + twist) * (radius + bulge);
            points.push(new THREE.Vector3(x, y, z));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, muscleMat);
        muscleGroup.add(line);
        muscles.push(line);
    }

    // --- レイアウト調整（距離をさらに離す設定） ---
    const updateLayout = () => {
        const w = container.clientWidth || baseSize;
        
        const textileScale = (w * 0.6) / (warpCount * spacing);
        textileGroup.scale.set(textileScale, textileScale, textileScale);
        // 布をさらに左へ（-0.22 → -0.28）
        textileGroup.position.x = -w * 0.28; 

        const muscleScale = (w * 0.5) / 100;
        muscleGroup.scale.set(muscleScale, muscleScale, muscleScale);
        // 筋繊維をさらに右へ（0.25 → 0.32）
        muscleGroup.position.x = w * 0.32; 
    };
    updateLayout();

    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.to({}, { duration: 10 }); 

    const animateAll = () => {
        const time = Date.now() * 0.002;
        
        textiles.forEach((line, i) => {
            const pos = line.geometry.attributes.position.array;
            for (let j = 0; j < pos.length; j += 3) {
                pos[j + 2] = Math.sin(pos[j + 1] * 0.05 + time + i * 0.2) * 5;
            }
            line.geometry.attributes.position.needsUpdate = true;
        });

        muscles.forEach((line, i) => {
            const pos = line.geometry.attributes.position.array;
            const pulse = Math.sin(time * 1.5 + i * 0.1) * 2; 
            for (let j = 0; j < pos.length; j += 3) {
                const angle = Math.atan2(pos[j + 2], pos[j]);
                const r = Math.sqrt(pos[j]**2 + pos[j + 2]**2) + pulse * 0.1;
                pos[j] = Math.cos(angle) * r;
                pos[j + 2] = Math.sin(angle) * r;
            }
            line.geometry.attributes.position.needsUpdate = true;
        });

        textileGroup.rotation.y += 0.003;
        muscleGroup.rotation.y -= 0.005; 
    };

    animations.push(tl);
    container._gsapAnimations = animations;

    function animate() {
        requestAnimationFrame(animate);
        if (tl.isActive()) animateAll();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const w = container.clientWidth || baseSize;
        renderer.setSize(w, w);
        camera.aspect = 1; 
        camera.updateProjectionMatrix();
        updateLayout();
    });
}