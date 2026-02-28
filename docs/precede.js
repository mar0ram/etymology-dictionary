import { THREE } from './three.js';

export function drawPrecedeModel() {
    // コンテナ要素の取得
    const container = document.querySelector(".precede");
    if (!container) return;

    // --- 初期化 (既存のCanvasとラベルを削除) ---
    const oldCanvas = container.querySelector("canvas");
    if (oldCanvas) oldCanvas.remove();
    const oldLabels = container.querySelectorAll("div[id^='lbl-d']");
    oldLabels.forEach(l => l.remove());
    const oldControls = container.querySelector(".dimension-controls");
    if (oldControls) oldControls.remove();
    const oldJoystick = container.querySelector(".joystick-base");
    if (oldJoystick) oldJoystick.remove();

    // 近未来的な背景グラデーションとサイバーグリッドの準備
    container.style.background = 'linear-gradient(135deg, #0a0e17 0%, #1a2333 100%)';
    container.style.overflow = "hidden";
    container.style.position = "relative";

    // 💡 アニメーション管理用
    let isPlaying = true; 

    const baseSize = 600;
    let width = container.clientWidth || baseSize;
    let height = width;

    const scene = new THREE.Scene();

    // 平面上（2D）での移動にするため、正投影カメラ（OrthographicCamera）に変更
    const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 2000);
    camera.position.set(0, 0, 400); // 真上から見下ろす
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 光源の追加 ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(1, 1, 2).normalize();
    scene.add(directionalLight);

    // --- 背景のサイバーグリッド ---
    const gridGeometry = new THREE.PlaneGeometry(width * 2, height * 2, 50, 50);
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x004466, wireframe: true, transparent: true, opacity: 0.1 });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.position.z = -1; // オブジェクトより後ろに配置
    scene.add(gridMesh);

    // --- オブジェクト作成（ハイクオリティなレイヤー構造へ変更） ---
    // 1. 操作オブジェクト (シアン系)
    const player = new THREE.Group();
    player.position.set(0, 0, 0);

    // プレイヤー：ベースシェル（ダークメタルな八角形）
    const pBaseGeo = new THREE.CircleGeometry(10, 8);
    const pBaseMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.9, roughness: 0.2 });
    const pBase = new THREE.Mesh(pBaseGeo, pBaseMat);
    player.add(pBase);

    // プレイヤー：発光コア
    const pCoreGeo = new THREE.CircleGeometry(6, 32);
    const pCoreMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.0 });
    const pCore = new THREE.Mesh(pCoreGeo, pCoreMat);
    pCore.position.z = 1;
    player.add(pCore);

    // プレイヤー：回転するアウターリング（途切れたデジタルリング）
    const pRingGeo = new THREE.RingGeometry(12, 14, 32, 1, 0, Math.PI * 1.5);
    const pRingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const pRing = new THREE.Mesh(pRingGeo, pRingMat);
    pRing.position.z = 0.5;
    player.add(pRing);

    // プレイヤー：内側のワイヤーフレーム装飾
    const pInnerGeo = new THREE.RingGeometry(8, 9, 16);
    const pInnerMat = new THREE.MeshBasicMaterial({ color: 0x00cccc, wireframe: true, transparent: true, opacity: 0.5 });
    const pInner = new THREE.Mesh(pInnerGeo, pInnerMat);
    pInner.position.z = 0.6;
    player.add(pInner);

    scene.add(player);


    // 2. 先行するオブジェクト (マゼンタ系)
    const precedeRadius = 10;
    const precedeObj = new THREE.Group();

    // 先行：ベースシェル（ダークメタルな六角形）
    const prBaseGeo = new THREE.CircleGeometry(precedeRadius, 6);
    const prBaseMat = new THREE.MeshStandardMaterial({ color: 0x331122, metalness: 0.9, roughness: 0.2 });
    const prBase = new THREE.Mesh(prBaseGeo, prBaseMat);
    precedeObj.add(prBase);

    // 先行：発光コア
    const prCoreGeo = new THREE.CircleGeometry(4, 32);
    const prCoreMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0 });
    const prCore = new THREE.Mesh(prCoreGeo, prCoreMat);
    prCore.position.z = 1;
    precedeObj.add(prCore);

    // 先行：回転するヘキサゴンアウター
    const prRingGeo = new THREE.RingGeometry(13, 14, 6);
    const prRingMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.7 });
    const prRing = new THREE.Mesh(prRingGeo, prRingMat);
    prRing.position.z = 0.5;
    precedeObj.add(prRing);

    scene.add(precedeObj);


    // --- データライン作成 ---
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
    const linePoints = [];
    linePoints.push(new THREE.Vector3(0, 0, 0));
    linePoints.push(new THREE.Vector3(0, 0, 0));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const dataLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(dataLine);

    // --- ラベル作成（ホログラフィックなフレームへ） ---
    const label = document.createElement('div');
    label.id = 'lbl-d-precede';
    label.textContent = '先行する';
    label.style.cssText = `
        position: absolute;
        color: #ffffff;
        background: linear-gradient(135deg, rgba(255, 0, 255, 0.2) 0%, rgba(255, 0, 255, 0.4) 100%);
        padding: 6px 14px;
        border: 1px solid rgba(255, 0, 255, 0.6);
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        pointer-events: none;
        transform: translate(-50%, -50%); /* 基準点を中央に変更 */
        z-index: 100;
        white-space: nowrap;
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.4);
        letter-spacing: 1px;
    `;
    container.appendChild(label);

    // --- 仮想ジョイスティックの作成（デジタルコアとネオンリングへ） ---
    const initialStickScale = width < 450 ? 0.7 : 1.0; // 初期ロード時のスケール
    
    const joystickBase = document.createElement('div');
    joystickBase.className = 'joystick-base';
    joystickBase.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        width: ${100 * initialStickScale}px;
        height: ${100 * initialStickScale}px;
        background: rgba(0, 0, 0, 0.2);
        border: 2px solid rgba(0, 255, 255, 0.4);
        border-radius: 50%;
        z-index: 50;
        touch-action: none;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
    `;
    
    const joystickThumb = document.createElement('div');
    joystickThumb.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${40 * initialStickScale}px;
        height: ${40 * initialStickScale}px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
    `;
    joystickBase.appendChild(joystickThumb);
    container.appendChild(joystickBase);

    // ジョイスティックのロジック
    let stickActive = false;
    const stickPos = new THREE.Vector2(0, 0);
    let maxRadius = 40 * initialStickScale; // letに変更しスケールを適用
    const baseCenter = { x: 0, y: 0 };

    const updateJoystick = (clientX, clientY) => {
        const rect = joystickBase.getBoundingClientRect();
        baseCenter.x = rect.left + rect.width / 2;
        baseCenter.y = rect.top + rect.height / 2;

        let dx = clientX - baseCenter.x;
        let dy = clientY - baseCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
        }

        joystickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        // -1.0 〜 1.0 に正規化
        stickPos.set(dx / maxRadius, dy / maxRadius);
    };

    joystickBase.addEventListener('pointerdown', (e) => {
        stickActive = true;
        updateJoystick(e.clientX, e.clientY);
        joystickBase.setPointerCapture(e.pointerId);
    });

    joystickBase.addEventListener('pointermove', (e) => {
        if (!stickActive) return;
        updateJoystick(e.clientX, e.clientY);
    });

    // スティックから離したら中心に戻し、オブジェクトを動かさない処理
    joystickBase.addEventListener('pointerup', (e) => {
        stickActive = false;
        joystickThumb.style.transform = `translate(-50%, -50%)`;
        stickPos.set(0, 0);
        joystickBase.releasePointerCapture(e.pointerId);
    });

    // --- 移動・追従ロジック用変数 ---
    const speed = 2;
    const gap = 60; // 二つのオブジェクトの隙間
    const targetDir = new THREE.Vector3(1, 0, 0); // 目標とする進行方向
    const currentOffset = new THREE.Vector3(gap, 0, 0); // 現在の先行オブジェクトの相対位置
    // 球面補間（回り込み）用の回転軸 (2D平面なのでZ軸)
    const rotAxis = new THREE.Vector3(0, 0, 1);

    // --- レンダリングループ ---
    function animate() {
        if (!isPlaying) return;
        requestAnimationFrame(animate);

        const halfW = width / 2;
        const halfH = height / 2;
        const time = Date.now() * 0.005;

        // --- オブジェクトの装飾アニメーション追加 ---
        pRing.rotation.z -= 0.05; // プレイヤーアウターリングの逆回転
        pInner.rotation.z += 0.02; // プレイヤーインナーリングの正回転
        prRing.rotation.z += 0.03; // 先行オブジェクトアウターの正回転
        pBase.rotation.z += 0.005; // ベースのゆっくりとした回転
        prBase.rotation.z -= 0.008;

        // コアの明滅（パルス効果）
        pCore.scale.setScalar(1 + Math.sin(time) * 0.15);
        prCore.scale.setScalar(1 + Math.cos(time * 1.2) * 0.15);


        // 1. 操作オブジェクトの移動と方向の更新
        if (stickPos.lengthSq() > 0) {
            // スティックの方向をXY平面上のベクトルに完全連動
            // Y軸は画面上方向がプラスであるため、スティックの下方向（プラス）をマイナスに反転して同期
            const moveVec = new THREE.Vector3(stickPos.x, -stickPos.y, 0).normalize();
            player.position.addScaledVector(moveVec, speed);
            
            // 入力がある場合のみ目標方向を更新（常に進行方向を向く）
            targetDir.copy(moveVec);
        }

        // 2. 先行オブジェクトの回り込みロジック (隙間を保ちながら目標方向へ高速に球面補間)
        // ワープではなく、角度の差を計算して回転させることで「回り込む」軌道を実装。

        //現在のオフセットベクトルと目標方向ベクトルの間の角度を計算
        const currentAngle = Math.atan2(currentOffset.y, currentOffset.x);
        const targetAngle = Math.atan2(targetDir.y, targetDir.x);

        // 角度の差を計算 (-PI 〜 PI の範囲にする)
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

        // 角度を高速に補間 (係数を大幅に上げる。0.08 -> 0.4)
        // 1フレームで角度の差の40%を埋めることで、「回り込む」軌道を保ちつつ、瞬時に近い動きにする。
        const stepAngle = angleDiff * 0.4;

        // currentOffset を Z軸周りに回転させる
        // applyAxisAngle はベクトルを回転させるが、その長さ（gap）は保たれる。
        currentOffset.applyAxisAngle(rotAxis, stepAngle);

        // キャンバス範囲制限（先行オブジェクトがキャンバスの4辺に接する位置を限界とする）
        // まず先行オブジェクトの仮位置を計算
        let px = player.position.x + currentOffset.x;
        let py = player.position.y + currentOffset.y;

        // 先行オブジェクトが画面の境界に達した場合、操作オブジェクトごと押し戻す
        if (px > halfW - precedeRadius) {
            player.position.x = halfW - precedeRadius - currentOffset.x;
        } else if (px < -halfW + precedeRadius) {
            player.position.x = -halfW + precedeRadius - currentOffset.x;
        }

        if (py > halfH - precedeRadius) {
            player.position.y = halfH - precedeRadius - currentOffset.y;
        } else if (py < -halfH + precedeRadius) {
            player.position.y = -halfH + precedeRadius - currentOffset.y;
        }

        // プレイヤー自身も画面外に出ないように制限（先行オブジェクトが手前にある場合のフェイルセーフ）
        const playerRadius = 15;
        player.position.x = Math.max(-halfW + playerRadius, Math.min(halfW - playerRadius, player.position.x));
        player.position.y = Math.max(-halfH + playerRadius, Math.min(halfH - playerRadius, player.position.y));

        // 3. 制限をかけた上で先行オブジェクトの位置を確定
        precedeObj.position.copy(player.position).add(currentOffset);

        // 4. ラベルの座標追従 (進行方向に向けてオフセットを追加)
        const screenPos = precedeObj.position.clone();
        screenPos.project(camera);
        let x = (screenPos.x * 0.5 + 0.5) * width;
        let y = (screenPos.y * -0.5 + 0.5) * height;

        // 進行方向（targetDir）に基づいて画面空間でのオフセットを計算 (45px先へ配置)
        const labelOffset = 45;
        x += targetDir.x * labelOffset;
        y += -targetDir.y * labelOffset; // 3DのY軸(上正)から画面のY軸(下正)へ変換して適用

        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        // データラインの更新
        const linePositions = dataLine.geometry.attributes.position.array;
        linePositions[0] = player.position.x;
        linePositions[1] = player.position.y;
        linePositions[2] = player.position.z;
        linePositions[3] = precedeObj.position.x + targetDir.x * 30; // 先行オブジェクトのさらに前方へ
        linePositions[4] = precedeObj.position.y + targetDir.y * 30;
        linePositions[5] = precedeObj.position.z;
        dataLine.geometry.attributes.position.needsUpdate = true;

        // 背景グリッドの移動（動的なサイバー空間の表現）
        gridMesh.position.x += 0.2;
        gridMesh.position.y -= 0.1;
        if (gridMesh.position.x > width / 2) gridMesh.position.x = -width / 2;
        if (gridMesh.position.y < -height / 2) gridMesh.position.y = height / 2;

        renderer.render(scene, camera);
    }
    animate();

    // --- リサイズ処理 ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || baseSize;
        const newHeight = newWidth; // 既存のアスペクト比ロジックを踏襲

        width = newWidth;
        height = newHeight;

        renderer.setSize(newWidth, newHeight);
        
        // OrthographicCamera 用の境界更新
        camera.left = width / -2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = height / -2;
        camera.updateProjectionMatrix();

        // ジョイスティックのリサイズ追従処理を追加
        const stickScale = newWidth < 450 ? 0.7 : 1.0;
        joystickBase.style.width = `${100 * stickScale}px`;
        joystickBase.style.height = `${100 * stickScale}px`;
        joystickThumb.style.width = `${40 * stickScale}px`;
        joystickThumb.style.height = `${40 * stickScale}px`;
        maxRadius = 40 * stickScale;

        // 背景グリッドのリサイズ
        gridMesh.scale.set(newWidth * 2 / width, newHeight * 2 / height, 1);
    });
}