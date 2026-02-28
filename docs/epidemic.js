import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawEpidemicModel() {
    const container = document.querySelector(".epidemic");
    if (!container) return;

    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldControls = container.querySelector(".dimension-controls");
    if (oldControls) oldControls.remove();

    container.style.backgroundColor = '#02040a'; 
    container.style.overflow = "hidden";
    container.style.position = "relative";

    let currentType = null; 
    let activeCircles = []; 

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width * 0.6;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 0, 370);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const mapTexture = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'); 
    
    const mapGeo = new THREE.PlaneGeometry(600, 300);
    const mapMat = new THREE.MeshBasicMaterial({ 
        map: mapTexture,
        transparent: true,
        opacity: 0.7,
        color: 0x99bbff 
    });
    const mapPlane = new THREE.Mesh(mapGeo, mapMat);
    scene.add(mapPlane);

    const historicalPoints = [
        { name: "London", x: -2, y: 86 },
        { name: "Mumbai", x: 121, y: 31 },
        { name: "Hong Kong", x: 190, y: 37 },
        { name: "Congo", x: 25, y: -7 },
        { name: "New York", x: -123, y: 67 },
        { name: "Mexico City", x: -165, y: 32 },
        { name: "Istanbul", x: 48, y: 68 },
        { name: "Athens", x: 39, y: 63 }
    ];

    const createInfectionCircle = (point, size, color) => {
        const group = new THREE.Group();
        const fillGeo = new THREE.CircleGeometry(size, 32);
        const fillMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.2, side: THREE.DoubleSide
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        const edgeGeo = new THREE.EdgesGeometry(new THREE.CircleGeometry(size, 32));
        const edgeMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const edge = new THREE.LineSegments(edgeGeo, edgeMat);

        group.add(fill);
        group.add(edge);
        group.position.set(point.x, point.y, 2);
        scene.add(group);
        activeCircles.push(group);

        gsap.to(group.scale, {
            x: 0.6, y: 0.6, duration: 1.0, ease: "sine.inOut", repeat: -1, yoyo: true
        });
        gsap.to([fillMat, edgeMat], {
            opacity: 0.1, duration: 1.0, ease: "sine.inOut", repeat: -1, yoyo: true
        });
    };

    const clearCircles = () => {
        activeCircles.forEach(obj => {
            gsap.killTweensOf(obj.scale);
            scene.remove(obj);
        });
        activeCircles = [];
    };

    const createControlButtons = () => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dimension-controls';
        buttonContainer.style.cssText = `
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;
        `;

        const buttonStyles = `
            width: 35%; min-width: 120px; max-width: 180px; padding: 12px 0;
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 30px; color: white; cursor: pointer; font-size: 14px; font-weight: bold;
            backdrop-filter: blur(5px); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-sizing: border-box; text-align: center; letter-spacing: 1px;
        `;

        const createBtn = (label, type) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = buttonStyles;
            
            btn.addEventListener('click', () => {
                if (currentType === type) return;
                clearCircles();
                currentType = type;

                if (type === 'epidemic') {
                    const point = historicalPoints[Math.floor(Math.random() * historicalPoints.length)];
                    const mainSize = 12;
                    createInfectionCircle(point, mainSize, 0x00ffff);
                    
                    const subCount = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < subCount; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = mainSize * 0.8; 
                        const subPoint = {
                            x: point.x + Math.cos(angle) * dist,
                            y: point.y + Math.sin(angle) * dist
                        };
                        createInfectionCircle(subPoint, mainSize * (0.3 + Math.random() * 0.4), 0x00ffff);
                    }
                } else {
                    const colors = [0xff00ff, 0x00ffff, 0xff0055];
                    const count = Math.floor(Math.random() * 3) + 4; 
                    const shuffled = [...historicalPoints].sort(() => 0.5 - Math.random());
                    const selectedPoints = shuffled.slice(0, count);

                    let cumulativeDelay = 0;
                    selectedPoints.forEach((point, i) => {
                        if (i > 0) {
                            cumulativeDelay += 500 + Math.random() * 500;
                        }
                        setTimeout(() => {
                            if (currentType !== 'pandemic') return;
                            const color = colors[i % colors.length];
                            createInfectionCircle(point, 12 + Math.random() * 6, color);
                        }, cumulativeDelay);
                    });
                }
            });

            btn.addEventListener('mouseover', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.2)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            });

            return btn;
        };

        buttonContainer.appendChild(createBtn('EPIDEMIC', 'epidemic'));
        buttonContainer.appendChild(createBtn('PANDEMIC', 'pandemic'));
        return buttonContainer;
    };

    const controlsContainer = createControlButtons();
    container.appendChild(controlsContainer);

    // 💡【修正の肝】リサイズ処理を関数として独立させる
    const handleResize = () => {
        const newWidth = container.clientWidth || baseSize;
        const newHeight = newWidth * 0.6;
        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
        const buttons = controlsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.style.fontSize = newButtonFontSize;
        });
    };

    // 初期化の最後で実行し、現在のサイズに合わせる
    handleResize();

    window.addEventListener('resize', handleResize);

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}