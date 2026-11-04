import{t as e}from"./gsap.js";function t(){let t=document.querySelector(`.animation.tear`);if(!t)return;let n=t.previousElementSibling?.previousElementSibling;if(!n||!n.classList.contains(`ml`)){console.warn(`.ml element not found before .animation.tear`);return}let r=t.querySelector(`.tear-controls`);r&&r.remove();let i=document.createElement(`div`);i.className=`tear-controls`,i.style.display=`flex`,i.style.gap=`15px`,i.style.justifyContent=`center`,i.style.marginTop=`20px`;let a=`
        padding: 10px 25px;
        background: rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 30px;
        color: #333333;
        cursor: pointer;
        font-weight: bold;
        letter-spacing: 1px;
        transition: all 0.3s ease;
    `,o=document.createElement(`button`);o.textContent=`TEAR`,o.style.cssText=a;let s=document.createElement(`button`);s.textContent=`RESET`,s.style.cssText=a,s.style.opacity=`0.5`,s.style.pointerEvents=`none`,i.appendChild(o),i.appendChild(s),t.appendChild(i);let c=e=>{e.addEventListener(`mouseover`,()=>{e.style.pointerEvents!==`none`&&(e.style.background=`rgba(0, 0, 0, 0.1)`,e.style.borderColor=`rgba(0, 0, 0, 0.5)`)}),e.addEventListener(`mouseout`,()=>{e.style.pointerEvents!==`none`&&(e.style.background=`rgba(0, 0, 0, 0.05)`,e.style.borderColor=`rgba(0, 0, 0, 0.2)`)})};c(o),c(s);let l=()=>{let e=(t.clientWidth||window.innerWidth)<450?`10px`:`14px`;o.style.fontSize=e,s.style.fontSize=e};l(),window.addEventListener(`resize`,l);let u=!1,d=null,f=(e,t,n)=>{let r=[],i=t/n,a=e/2,o=e*.08;for(let e=0;e<=n;e++){let t=e*i,s=e===0||e===n?a:a+(Math.random()-.5)*2*o;r.push({x:s,y:t})}return r};return o.addEventListener(`click`,()=>{if(u)return;u=!0,o.style.opacity=`0.5`,o.style.pointerEvents=`none`,s.style.opacity=`1`,s.style.pointerEvents=`auto`;let t=n.getBoundingClientRect();n.style.visibility=`hidden`,d=document.createElement(`div`),d.style.position=`absolute`,d.style.top=`${n.offsetTop}px`,d.style.left=`${n.offsetLeft}px`,d.style.width=`${t.width}px`,d.style.height=`${t.height}px`,d.style.pointerEvents=`none`,d.style.zIndex=`100`,n.parentNode.insertBefore(d,n);let r=n.cloneNode(!0),i=n.cloneNode(!0),a=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            visibility: visible;
            transform-origin: center top;
            box-sizing: border-box;
        `;r.style.cssText+=a,i.style.cssText+=a;let c=f(t.width,t.height,15),l=`0% 0%, `,p=`100% 0%, `;c.forEach(e=>{let n=e.x/t.width*100,r=e.y/t.height*100;l+=`${n}% ${r}%, `,p+=`${n}% ${r}%, `}),l+=`0% 100%`,p+=`100% 100%`,r.style.clipPath=`polygon(${l})`,i.style.clipPath=`polygon(${p})`,d.appendChild(r),d.appendChild(i);let m=3.5,h=t.height*5*.5;e.timeline().to([r,i],{scale:1.05,duration:.1,ease:`power1.out`}).to(r,{x:-t.width*.55,y:h,rotation:-22,opacity:0,duration:m,ease:`power2.in`},`+=0.05`).to(i,{x:t.width*.55,y:h,rotation:22,opacity:0,duration:m,ease:`power2.in`},`<`)}),s.addEventListener(`click`,()=>{u&&(u=!1,d&&=(d.remove(),null),n.style.visibility=`visible`,s.style.opacity=`0.5`,s.style.pointerEvents=`none`,o.style.opacity=`1`,o.style.pointerEvents=`auto`)}),()=>{window.removeEventListener(`resize`,l),d&&=(e.killTweensOf(d.children),d.remove(),null)}}export{t as setupTearAnimation};