import { THREE } from './three.js';
import { gsap } from './gsap.js';

export function drawTransparentAnimation() {
  const container = document.querySelector('.transparent');
  if (!container) return;

  // --- 初期化 (既存のCanvasを削除) ---
  const oldCanvas = container.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  const oldControls = container.querySelector('.transparent-controls');
  if (oldControls) oldControls.remove();

  container.style.backgroundColor = '#000000';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';

  const baseSize = 600;
  let width = container.clientWidth || baseSize;
  let height = width;

  // --- Scene初期化 ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
  camera.position.z = 600;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // --- 奥にあるオブジェクト (さいころ) ---
  const cubeSize = 90;
  const diceGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const diceMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x111111,
    shininess: 30,
  });
  const dice = new THREE.Mesh(diceGeometry, diceMaterial);
  dice.position.set(0, 0, -150);
  dice.rotation.set(0.5, 0.7, 0); 
  scene.add(dice);

  // --- ライティング ---
  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.position.set(100, 200, 400);
  scene.add(mainLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // --- 窓ユニット (外枠 + ガラス) ---
  const windowGroup = new THREE.Group();
  const glassSize = 245;

  // 1. すりガラス
  const glassMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFrost: { value: 1.0 }, 
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFrost;
      varying vec2 vUv;
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      void main() {
        float noise = random(vUv + uTime * 0.02);
        vec3 color = vec3(0.95, 0.98, 1.0);
        float alpha = mix(0.0, 1.0, uFrost); 
        float grain = mix(0.0, 0.1, uFrost) * noise;
        gl_FragColor = vec4(color + grain, alpha);
      }
    `,
    transparent: true,
  });
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(glassSize, glassSize), glassMaterial);
  windowGroup.add(glassPane);

  // 2. 外枠
  const frameMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x888888, 
    shininess: 80 
  });
  const fT = 12; 
  const fD = 25; 

  const topF = new THREE.Mesh(new THREE.BoxGeometry(glassSize + fT * 2, fT, fD), frameMaterial);
  topF.position.y = glassSize / 2 + fT / 2;
  windowGroup.add(topF);

  const bottomF = topF.clone();
  bottomF.position.y = -(glassSize / 2 + fT / 2);
  windowGroup.add(bottomF);

  const leftF = new THREE.Mesh(new THREE.BoxGeometry(fT, glassSize, fD), frameMaterial);
  leftF.position.x = -(glassSize / 2 + fT / 2);
  windowGroup.add(leftF);

  const rightF = leftF.clone();
  rightF.position.x = glassSize / 2 + fT / 2;
  windowGroup.add(rightF);

  windowGroup.position.z = 100;
  scene.add(windowGroup);

  // --- コントロールボタンを作成 ---
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'transparent-controls';
  controlsContainer.style.cssText = `
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
    z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;
  `;

  const buttonStyles = `
    width: 25%; min-width: 120px; max-width: 180px; padding: 12px 0;
    background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 30px; color: white; cursor: pointer; font-weight: bold;
    backdrop-filter: blur(5px); transition: all 0.4s; box-sizing: border-box;
    text-align: center; letter-spacing: 1px;
  `;

  const transBtn = document.createElement('button');
  transBtn.textContent = 'TRANSPARENT';
  transBtn.style.cssText = buttonStyles;

  const opaqueBtn = document.createElement('button');
  opaqueBtn.textContent = 'OPAQUE';
  opaqueBtn.style.cssText = buttonStyles;

  controlsContainer.appendChild(transBtn);
  controlsContainer.appendChild(opaqueBtn);
  container.appendChild(controlsContainer);

  // --- アニメーション関数 ---
  const makeTransparent = () => {
    gsap.to(glassMaterial.uniforms.uFrost, { value: 0.0, duration: 2.0, ease: 'power2.inOut' });
  };

  const makeOpaque = () => {
    gsap.to(glassMaterial.uniforms.uFrost, { value: 1.0, duration: 2.0, ease: 'power2.inOut' });
  };

  transBtn.addEventListener('click', makeTransparent);
  opaqueBtn.addEventListener('click', makeOpaque);

  // --- 💡 修正: リサイズ関数を独立させて初期実行 ---
  const handleResize = () => {
    const newWidth = container.clientWidth || baseSize;
    const newHeight = newWidth;

    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // ラベルのフォントサイズ調整
    const labels = container.querySelectorAll('.label'); 
    const newFontSize = newWidth < 450 ? "14px" : "18px";
    labels.forEach(lbl => {
      lbl.style.fontSize = newFontSize;
    });

    // ボタンのフォントサイズ調整
    const newButtonFontSize = newWidth < 450 ? "10px" : "14px";
    const buttons = controlsContainer.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.style.fontSize = newButtonFontSize;
    });
  };

  // 初期化時に実行
  handleResize();
  window.addEventListener('resize', handleResize);

  // --- アニメーションループ ---
  const animate = (time) => {
    requestAnimationFrame(animate);
    glassMaterial.uniforms.uTime.value = time * 0.001;
    renderer.render(scene, camera);
  };
  animate(0);
}