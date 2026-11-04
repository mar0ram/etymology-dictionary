import { activeCleanups, registerCleanup } from "./types.js";

export function resetZoom(viewportMeta: HTMLMetaElement | null): void {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        if (viewportMeta) {
            viewportMeta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0");
        }
    }, 100);
}

// --- アコーディオンアニメーション共通関数 ---
export function playAccordionAnimation(
    content: HTMLElement,
    isOpening: boolean,
    triggerElement: HTMLElement,
    initialTop: number,
    onFinish?: () => void
): void {
    content.style.overflow = "hidden";

    const style = window.getComputedStyle(content);
    const marginTop = style.marginTop;
    const marginBottom = style.marginBottom;
    const paddingTop = style.paddingTop;
    const paddingBottom = style.paddingBottom;

    const br = content.previousElementSibling as HTMLElement | null;
    const hasBr = Boolean(br && br.tagName === "BR");

    let brHeight = 0;
    if (hasBr && br) {
        brHeight = br.getBoundingClientRect().height || (isOpening ? 16 : 0);
        br.style.display = "none";
    }

    const adjustedMarginTop = hasBr ? `calc(${marginTop} + ${brHeight}px)` : marginTop;

    let lastTop = initialTop;
    let isAnimatingScroll = true;
    let rafId = 0;

    const cancelScrollFix = (): void => {
        isAnimatingScroll = false;
    };
    window.addEventListener("wheel", cancelScrollFix, { passive: true });
    window.addEventListener("touchmove", cancelScrollFix, { passive: true });

    const cleanupScrollListeners = (): void => {
        isAnimatingScroll = false;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("wheel", cancelScrollFix);
        window.removeEventListener("touchmove", cancelScrollFix);
    };
    registerCleanup(cleanupScrollListeners);

    const maintainScroll = (): void => {
        if (!isAnimatingScroll || !triggerElement.isConnected) return;
        const currentTop = triggerElement.getBoundingClientRect().top;
        const diff = currentTop - lastTop;

        if (Math.abs(diff) > 0.5) {
            window.scrollBy(0, diff);
            lastTop = triggerElement.getBoundingClientRect().top;
        }
        rafId = requestAnimationFrame(maintainScroll);
    };
    rafId = requestAnimationFrame(maintainScroll);

    const keyframes = isOpening
        ? [
              {
                  opacity: 0,
                  maxHeight: "0px",
                  marginTop: "0px",
                  marginBottom: "0px",
                  paddingTop: "0px",
                  paddingBottom: "0px"
              },
              {
                  opacity: 1,
                  maxHeight: content.scrollHeight + "px",
                  marginTop: adjustedMarginTop,
                  marginBottom: marginBottom,
                  paddingTop: paddingTop,
                  paddingBottom: paddingBottom
              }
          ]
        : [
              {
                  opacity: 1,
                  maxHeight: content.scrollHeight + "px",
                  marginTop: adjustedMarginTop,
                  marginBottom: marginBottom,
                  paddingTop: paddingTop,
                  paddingBottom: paddingBottom
              },
              {
                  opacity: 0,
                  maxHeight: "0px",
                  marginTop: "0px",
                  marginBottom: "0px",
                  paddingTop: "0px",
                  paddingBottom: "0px"
              }
          ];

    const animation = content.animate(keyframes, { duration: 700, easing: "ease-out" });

    animation.onfinish = () => {
        content.style.overflow = "";
        if (hasBr && br) {
            br.style.display = "";
        }
        cleanupScrollListeners();
        activeCleanups.delete(cleanupScrollListeners);
        if (onFinish) onFinish();
    };
}

export function setupDetailsAnimation(container: HTMLElement): void {
    container.querySelectorAll<HTMLDetailsElement>(".section.h3 details, .section.h5 details").forEach(details => {
        const summary = details.querySelector<HTMLElement>("summary");
        const content = (details.querySelector<HTMLElement>(".ml") ||
            details.querySelector<HTMLElement>(".content"));

        if (!summary || !content) return;

        let isAnimating = false;

        summary.addEventListener("click", (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest(".audio_button") || target.closest(".h3-word-link")) return;
            e.preventDefault();

            if (isAnimating) return;
            isAnimating = true;

            const initialTop = summary.getBoundingClientRect().top;

            if (details.open) {
                playAccordionAnimation(content, false, summary, initialTop, () => {
                    details.removeAttribute("open");
                    isAnimating = false;
                });
            } else {
                details.setAttribute("open", "true");
                playAccordionAnimation(content, true, summary, initialTop, () => {
                    isAnimating = false;
                });
            }
        });
    });
}

export function insertSampleImages(container: ParentNode = document): void {
    const targetElements = container.querySelectorAll<HTMLElement>("div.sample_image");
    if (targetElements.length === 0) return;

    targetElements.forEach(el => {
        if (el.dataset.sampleInitialized === "true") return;
        const imageName = el.classList[1];

        if (imageName) {
            el.dataset.sampleInitialized = "true";

            const trigger = document.createElement("span");
            trigger.classList.add("accordion-trigger");
            trigger.textContent = "イメージを表示";

            const content = document.createElement("span");
            content.classList.add("accordion-content");
            content.style.display = "none";

            const img = document.createElement("img");
            img.src = `./sample_images/${imageName}.png`;
            img.alt = imageName;

            img.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();

                const modal = document.createElement("div");
                modal.className = "sample-image-modal";
                Object.assign(modal.style, {
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: "9999",
                    cursor: "pointer"
                });

                const modalImg = document.createElement("img");
                modalImg.src = img.src;
                Object.assign(modalImg.style, {
                    maxWidth: "95%",
                    maxHeight: "95%",
                    objectFit: "contain"
                });

                modal.appendChild(modalImg);
                document.body.appendChild(modal);
                document.body.style.overflow = "hidden";

                modal.addEventListener("click", () => {
                    modal.remove();
                    document.body.style.overflow = "";
                });
            });

            content.appendChild(img);
            el.appendChild(trigger);
            el.appendChild(content);

            let isAnimating = false;

            trigger.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();

                if (isAnimating) return;
                isAnimating = true;

                const initialTop = trigger.getBoundingClientRect().top;

                if (el.classList.contains("is-active")) {
                    playAccordionAnimation(content, false, trigger, initialTop, () => {
                        el.classList.remove("is-active");
                        content.style.display = "none";
                        isAnimating = false;
                    });
                } else {
                    el.classList.add("is-active");
                    content.style.display = "";
                    playAccordionAnimation(content, true, trigger, initialTop, () => {
                        isAnimating = false;
                    });
                }
            });
        }
    });
}