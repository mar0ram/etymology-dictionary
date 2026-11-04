import{i as e}from"./three.js";import{t}from"./gsap.js";function n(){let n=document.querySelector(`.steep`);if(!n)return;let r=n.querySelector(`canvas`);r&&r.remove(),n.querySelectorAll(`div[id^='lbl-d']`).forEach(e=>e.remove());let i=n.querySelector(`.dimension-controls`);i&&i.remove(),n.style.backgroundColor=`#111111`,n.style.overflow=`hidden`,n.style.position=`relative`;let a=n.clientWidth||600,o=a,s=new e.Scene,c=new e.PerspectiveCamera(45,a/o,1,2e3);c.position.set(400,300,400),c.lookAt(0,0,0);let l=new e.WebGLRenderer({antialias:!0,alpha:!0});l.setSize(a,o),l.setPixelRatio(window.devicePixelRatio),n.appendChild(l.domElement);let u=new e.PlaneGeometry(400,400,40,40);u.rotateX(-Math.PI/2);let d=u.attributes.position.count;u.setAttribute(`color`,new e.BufferAttribute(new Float32Array(d*3),3));let f=new e.MeshBasicMaterial({wireframe:!0,transparent:!0,opacity:.6,vertexColors:!0}),p=new e.Mesh(u,f);s.add(p);let m={currentHeight:0},h=()=>{let t=u.attributes.position.array,n=u.attributes.color.array,r=new e.Color(4473924),i=new e.Color(65535),a=new e.Color;for(let e=0;e<t.length;e+=3){let o=t[e],s=t[e+2],c=Math.sqrt(o*o+s*s),l=Math.exp(-(c*c)/7e3)*m.currentHeight;t[e+1]=l;let u=Math.min(l/150,1);a.lerpColors(r,i,u),n[e]=a.r,n[e+1]=a.g,n[e+2]=a.b}u.attributes.position.needsUpdate=!0,u.attributes.color.needsUpdate=!0};h();let g=(()=>{let e=document.createElement(`div`);e.className=`dimension-controls`,e.style.cssText=`
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 50;
            display: flex;
            gap: 15px;
            width: 100%;
            justify-content: center;
        `;let n=(e,n)=>{let r=document.createElement(`button`);return r.textContent=e,r.style.cssText=`
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
        `,r.addEventListener(`mouseover`,()=>{r.style.background=`rgba(255, 255, 255, 0.2)`,r.style.borderColor=`rgba(255, 255, 255, 0.8)`}),r.addEventListener(`mouseout`,()=>{r.style.background=`rgba(255, 255, 255, 0.1)`,r.style.borderColor=`rgba(255, 255, 255, 0.3)`}),r.addEventListener(`click`,()=>{t.to(m,{currentHeight:n,duration:1.5,ease:`power2.inOut`,onUpdate:h})}),r};return e.appendChild(n(`STEEP`,200)),e.appendChild(n(`GENTLE`,80)),e.appendChild(n(`FLAT`,0)),e})();n.appendChild(g);let _=()=>{let e=n.clientWidth||600,t=e;l.setSize(e,t),c.aspect=e/t,c.updateProjectionMatrix();let r=e<450?`10px`:`14px`;g.querySelectorAll(`button`).forEach(e=>{e.style.fontSize=r})};_(),window.addEventListener(`resize`,_);let v=0;function y(){v=requestAnimationFrame(y),l.render(s,c)}return y(),()=>{cancelAnimationFrame(v),window.removeEventListener(`resize`,_),t.killTweensOf(m),u.dispose(),f.dispose(),l.dispose(),typeof l.forceContextLoss==`function`&&l.forceContextLoss()}}export{n as drawSteepModel};