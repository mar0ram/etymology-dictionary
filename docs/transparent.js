import{i as e}from"./three.js";import{t}from"./gsap.js";function n(){let n=document.querySelector(`.transparent`);if(!n)return;let r=n.querySelector(`canvas`);r&&r.remove();let i=n.querySelector(`.transparent-controls`);i&&i.remove(),n.style.backgroundColor=`#000000`,n.style.overflow=`hidden`,n.style.position=`relative`;let a=n.clientWidth||600,o=a,s=new e.Scene;s.background=new e.Color(0);let c=new e.PerspectiveCamera(75,a/o,1,1e4);c.position.z=600;let l=new e.WebGLRenderer({antialias:!0,alpha:!0});l.setSize(a,o),l.setPixelRatio(Math.min(window.devicePixelRatio,2)),n.appendChild(l.domElement);let u=new e.BoxGeometry(90,90,90),d=new e.MeshPhongMaterial({color:16777215,emissive:1118481,shininess:30}),f=new e.Mesh(u,d);f.position.set(0,0,-150),f.rotation.set(.5,.7,0),s.add(f);let p=new e.DirectionalLight(16777215,2);p.position.set(100,200,400),s.add(p);let m=new e.AmbientLight(16777215,.4);s.add(m);let h=new e.Group,g=new e.ShaderMaterial({uniforms:{uTime:{value:0},uFrost:{value:1}},vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
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
    `,transparent:!0}),_=new e.Mesh(new e.PlaneGeometry(245,245),g);h.add(_);let v=new e.MeshPhongMaterial({color:8947848,shininess:80}),y=new e.Mesh(new e.BoxGeometry(269,12,25),v);y.position.y=128.5,h.add(y);let b=y.clone();b.position.y=-128.5,h.add(b);let x=new e.Mesh(new e.BoxGeometry(12,245,25),v);x.position.x=-128.5,h.add(x);let S=x.clone();S.position.x=128.5,h.add(S),h.position.z=100,s.add(h);let C=document.createElement(`div`);C.className=`transparent-controls`,C.style.cssText=`
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
    z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;
  `;let w=`
    width: 25%; min-width: 120px; max-width: 180px; padding: 12px 0;
    background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 30px; color: white; cursor: pointer; font-weight: bold;
    backdrop-filter: blur(5px); transition: all 0.4s; box-sizing: border-box;
    text-align: center; letter-spacing: 1px;
  `,T=document.createElement(`button`);T.textContent=`TRANSPARENT`,T.style.cssText=w;let E=document.createElement(`button`);E.textContent=`OPAQUE`,E.style.cssText=w,C.appendChild(T),C.appendChild(E),n.appendChild(C),T.addEventListener(`click`,()=>{t.to(g.uniforms.uFrost,{value:0,duration:2,ease:`power2.inOut`})}),E.addEventListener(`click`,()=>{t.to(g.uniforms.uFrost,{value:1,duration:2,ease:`power2.inOut`})});let D=()=>{let e=n.clientWidth||600,t=e;l.setSize(e,t),c.aspect=e/t,c.updateProjectionMatrix();let r=n.querySelectorAll(`.label`),i=e<450?`14px`:`18px`;r.forEach(e=>{e.style.fontSize=i});let a=e<450?`10px`:`14px`;C.querySelectorAll(`button`).forEach(e=>{e.style.fontSize=a})};D(),window.addEventListener(`resize`,D);let O=0,k=e=>{O=requestAnimationFrame(k),g.uniforms.uTime.value=e*.001,l.render(s,c)};return k(0),()=>{cancelAnimationFrame(O),window.removeEventListener(`resize`,D),t.killTweensOf(g.uniforms.uFrost),s.traverse(e=>{e.geometry&&e.geometry.dispose(),e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.dispose()):e.material.dispose())}),l.dispose(),typeof l.forceContextLoss==`function`&&l.forceContextLoss()}}export{n as drawTransparentAnimation};