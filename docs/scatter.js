import{i as e}from"./three.js";import{t}from"./gsap.js";function n(){let n=document.querySelector(`.scatter`);if(!n)return;let r=n.querySelector(`canvas`);r&&r.remove();let i=n.querySelector(`.scatter-controls`);i&&i.remove(),n.style.backgroundColor=`#000000`,n.style.overflow=`hidden`,n.style.position=`relative`;let a=[],o=2e3,s=[],c=!1,l,u,d,f,p=n.clientWidth||600,m=n.clientHeight||600;l=new e.Scene,l.fog=new e.FogExp2(0,.001),l.background=new e.Color(0),u=new e.PerspectiveCamera(75,p/m,1,1e4),u.position.z=1e3,d=new e.WebGLRenderer({antialias:!0,alpha:!0}),d.setSize(p,m),d.setPixelRatio(Math.min(window.devicePixelRatio,2)),n.appendChild(d.domElement);let h=new e.BufferGeometry,g=new Float32Array(o*3),_=new Float32Array(o*3),v=new Float32Array(o);for(let t=0;t<o;t++){let n=t*3,r=200+Math.random()*100,i=Math.random()*Math.PI*2,a=Math.acos(2*Math.random()-1);g[n]=r*Math.sin(a)*Math.cos(i),g[n+1]=r*Math.sin(a)*Math.sin(i),g[n+2]=r*Math.cos(a),s.push({x:g[n],y:g[n+1],z:g[n+2]});let o=.7+Math.random()*.2,c=new e.Color().setHSL(o,.8,.6);_[n]=c.r,_[n+1]=c.g,_[n+2]=c.b,v[t]=Math.random()*4+1}h.setAttribute(`position`,new e.BufferAttribute(g,3)),h.setAttribute(`color`,new e.BufferAttribute(_,3)),h.setAttribute(`size`,new e.BufferAttribute(v,1));let y=new e.ShaderMaterial({uniforms:{time:{value:0},pixelRatio:{value:d.getPixelRatio()}},vertexShader:`
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
    `,fragmentShader:`
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,transparent:!0,vertexColors:!0,blending:e.AdditiveBlending,depthWrite:!1});f=new e.Points(h,y),l.add(f);let{buttonContainer:b,scatterBtn:x,gatherBtn:S}=(()=>{let e=document.createElement(`div`);e.className=`scatter-controls`,e.style.cssText=`
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            z-index: 50; display: flex; gap: 15px; width: 100%; justify-content: center;
        `;let t=`
            width: 25%; min-width: 100px; max-width: 160px; padding: 12px 0;
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 30px; color: white; cursor: pointer; font-size: 14px; font-weight: bold;
            backdrop-filter: blur(5px); transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            box-sizing: border-box; text-align: center; letter-spacing: 1px;
        `,n=document.createElement(`button`);n.textContent=`SCATTER`,n.style.cssText=t;let r=document.createElement(`button`);return r.textContent=`GATHER`,r.style.cssText=t,e.appendChild(n),e.appendChild(r),{buttonContainer:e,scatterBtn:n,gatherBtn:r}})();n.appendChild(b),x.addEventListener(`click`,()=>{if(c)return;a.forEach(e=>e.kill()),a.length=0,c=!0;let e=f.geometry.attributes.position.array;for(let n=0;n<o;n++){let r=n*3,i=(Math.random()-.5)*3e3,o=(Math.random()-.5)*3e3,s=(Math.random()-.5)*3e3,c=t.to(e,{duration:2+Math.random()*1.5,ease:`power2.out`,[r]:i,[r+1]:o,[r+2]:s,onUpdate:()=>{f.geometry.attributes.position.needsUpdate=!0}});a.push(c)}}),S.addEventListener(`click`,()=>{if(!c)return;a.forEach(e=>e.kill()),a.length=0,c=!1;let e=f.geometry.attributes.position.array;for(let n=0;n<o;n++){let r=n*3,i=s[n],o=t.to(e,{duration:1.5+Math.random()*1,ease:`elastic.out(1, 0.5)`,[r]:i.x,[r+1]:i.y,[r+2]:i.z,onUpdate:()=>{f.geometry.attributes.position.needsUpdate=!0}});a.push(o)}});let C=()=>{let e=n.clientWidth||600,t=n.clientHeight||600;u.aspect=e/t,u.updateProjectionMatrix(),d.setSize(e,t);let r=e<450?`10px`:`14px`;b.querySelectorAll(`button`).forEach(e=>{e.style.fontSize=r})};C(),window.addEventListener(`resize`,C);let w=0,T=0,E=()=>{T=requestAnimationFrame(E),w+=.005,f&&(f.rotation.y+=.001,f.rotation.x+=5e-4,f.material.uniforms.time.value=w),d.render(l,u)};return E(),()=>{cancelAnimationFrame(T),window.removeEventListener(`resize`,C),a.forEach(e=>e.kill()),h.dispose(),y.dispose(),d.dispose(),typeof d.forceContextLoss==`function`&&d.forceContextLoss()}}export{n as drawScatterAnimation};