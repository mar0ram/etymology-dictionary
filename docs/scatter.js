import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawScatterAnimation() {
  const container = document.querySelector('.scatter');
  if (!container) return;

  // --- 初期化 (既存のCanvasを削除) ---
  const oldCanvas = container.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  const oldControls = container.querySelector('.scatter-controls');
  if (oldControls) oldControls.remove();

  container.style.backgroundColor = '#000000';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';

  // 💡 アニメーション管理用
  const animations = [];
  const particleCount = 2000;
  let originalPositions = [];
  let isScattered = false;

  let scene, camera, renderer, particles;

  const baseSize = 600;
  let width = container.clientWidth || baseSize;
  let height = container.clientHeight || baseSize;

  // --- Scene初期化 ---
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
  camera.position.z = 1000;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // --- パーティクル生成 ---
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const radius = 200 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    originalPositions.push({
      x: positions[i3],
      y: positions[i3 + 1],
      z: positions[i3 + 2]
    });

    const hue = 0.7 + Math.random() * 0.2;
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    sizes[i] = Math.random() * 4 + 1;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: renderer.getPixelRatio() }
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float time;
      uniform float pixelRatio;
      
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // --- コントロールボタンを作成 ---
  const createControlButtons = () => {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'scatter-controls';
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

    const scatterBtn = document.createElement('button');
    scatterBtn.textContent = 'SCATTER';
    scatterBtn.style.cssText = buttonStyles;
    scatterBtn.addEventListener('mouseover', () => {
      scatterBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      scatterBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
    });
    scatterBtn.addEventListener('mouseout', () => {
      scatterBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      scatterBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });

    const gatherBtn = document.createElement('button');
    gatherBtn.textContent = 'GATHER';
    gatherBtn.style.cssText = buttonStyles;
    gatherBtn.addEventListener('mouseover', () => {
      gatherBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      gatherBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
    });
    gatherBtn.addEventListener('mouseout', () => {
      gatherBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      gatherBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });

    buttonContainer.appendChild(scatterBtn);
    buttonContainer.appendChild(gatherBtn);

    return { buttonContainer, scatterBtn, gatherBtn };
  };

  const { buttonContainer, scatterBtn, gatherBtn } = createControlButtons();
  container.appendChild(buttonContainer);

  // --- アニメーション関数 ---
  const scatter = () => {
    if (isScattered) return;

    // ✅ 進行中のアニメーションをすべて終了
    animations.forEach(anim => anim.kill());
    animations.length = 0;

    isScattered = true;

    const positions = particles.geometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const targetX = (Math.random() - 0.5) * 3000;
      const targetY = (Math.random() - 0.5) * 3000;
      const targetZ = (Math.random() - 0.5) * 3000;

      const anim = gsap.to(positions, {
        duration: 2 + Math.random() * 1.5,
        ease: 'power2.out',
        [i3]: targetX,
        [i3 + 1]: targetY,
        [i3 + 2]: targetZ,
        onUpdate: () => {
          particles.geometry.attributes.position.needsUpdate = true;
        }
      });

      animations.push(anim);
    }
  };

  const gather = () => {
    if (!isScattered) return;

    // ✅ 進行中のアニメーションをすべて終了
    animations.forEach(anim => anim.kill());
    animations.length = 0;

    isScattered = false;

    const positions = particles.geometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const original = originalPositions[i];

      const anim = gsap.to(positions, {
        duration: 1.5 + Math.random() * 1,
        ease: 'elastic.out(1, 0.5)',
        [i3]: original.x,
        [i3 + 1]: original.y,
        [i3 + 2]: original.z,
        onUpdate: () => {
          particles.geometry.attributes.position.needsUpdate = true;
        }
      });

      animations.push(anim);
    }
  };

  // --- ボタンイベントリスナー ---
  scatterBtn.addEventListener('click', scatter);
  gatherBtn.addEventListener('click', gather);

  // --- アニメーションループ ---
  let time = 0;
  const animate = () => {
    requestAnimationFrame(animate);

    time += 0.005;

    if (particles) {
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
      particles.material.uniforms.time.value = time;
    }

    renderer.render(scene, camera);
  };
  animate();

  // --- リサイズ対応 ---
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth || baseSize;
    const newHeight = container.clientHeight || baseSize;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);

    // ✅ JSによるピクセル単位の幅計算を廃止し、レスポンシブなCSS設定に一任
    const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
    const buttons = controlsContainer.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.style.fontSize = newButtonFontSize;
    });
  });
}