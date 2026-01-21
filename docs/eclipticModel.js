export function drawEclipticModel() {
    const container = document.querySelector(".tropic");
    if (!container) return;

    container.innerHTML = "";

    const size = 600;
    const cx = size / 2;
    const cy = size / 2;

    const earthRadius = 30;
    const sunRadius = 30;

    const sphereRadius = 220;
    const tilt = 23.4 * Math.PI / 180;
    const labelSize = 24;
    const solsticePointRadius = 5;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "90%");
    svg.setAttribute("height", "90%");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.display = "block";
    svg.style.margin = "0 auto";
    container.appendChild(svg);

    /* ===== 天球 ===== */
    const sphere = document.createElementNS(svgNS, "circle");
    sphere.setAttribute("cx", cx);
    sphere.setAttribute("cy", cy);
    sphere.setAttribute("r", sphereRadius);
    sphere.setAttribute("fill", "none");
    sphere.setAttribute("stroke", "#2b6cb0");
    sphere.setAttribute("stroke-width", "2");
    svg.appendChild(sphere);

    /* ===== 黄道 ===== */
    let d = "";
    const steps = 360;

    function eclipticXY(angleDeg) {
        const a = angleDeg * Math.PI / 180;
        const x = sphereRadius * Math.cos(a);
        const y = sphereRadius * Math.sin(a) * 0.35;

        return {
            x: cx + (x * Math.cos(tilt) - y * Math.sin(tilt)),
            y: cy + (x * Math.sin(tilt) + y * Math.cos(tilt))
        };
    }

    for (let i = 0; i <= steps; i++) {
        const p = eclipticXY(i);
        d += `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `;
    }

    const ecliptic = document.createElementNS(svgNS, "path");
    ecliptic.setAttribute("d", d);
    ecliptic.setAttribute("fill", "none");
    ecliptic.setAttribute("stroke", "#d53f8c");
    ecliptic.setAttribute("stroke-width", "2");
    svg.appendChild(ecliptic);

    /* ===== 地球 ===== */
    const earth = document.createElementNS(svgNS, "circle");
    earth.setAttribute("cx", cx);
    earth.setAttribute("cy", cy);
    earth.setAttribute("r", earthRadius);
    earth.setAttribute("fill", "#2c7be5");
    svg.appendChild(earth);

    /* ===== 北回帰線・南回帰線 ===== */
    const tropicAngle = 23.4 * Math.PI / 180;
    const tropicOffset = Math.sin(tropicAngle) * earthRadius;

    function createTropicLine(yOffset) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", cx - earthRadius);
        line.setAttribute("x2", cx + earthRadius);
        line.setAttribute("y1", cy + yOffset);
        line.setAttribute("y2", cy + yOffset);
        line.setAttribute("stroke", "#ffffff");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-dasharray", "4 4");
        return line;
    }

    svg.appendChild(createTropicLine(-tropicOffset));
    svg.appendChild(createTropicLine(tropicOffset));

    function createTropicLabel(text, yOffset, side) {
        const label = document.createElementNS(svgNS, "text");
        const offset = 12;

        if (side === "right") {
            label.setAttribute("x", cx + earthRadius + offset);
            label.setAttribute("text-anchor", "start");
        } else {
            label.setAttribute("x", cx - earthRadius - offset);
            label.setAttribute("text-anchor", "end");
        }

        label.setAttribute("y", cy + yOffset);
        label.setAttribute("fill", "#ffffff");
        label.setAttribute("font-size", labelSize);
        label.setAttribute("dominant-baseline", "middle");
        label.textContent = text;
        return label;
    }

    svg.appendChild(createTropicLabel("北回帰線", -tropicOffset * 2, "right"));
    svg.appendChild(createTropicLabel("南回帰線", tropicOffset * 2, "left"));


    /* ===== 至点（黄色い線） ===== */

    const summerSolstice = eclipticXY(180);
    const winterSolstice = eclipticXY(0);

    function drawSolsticeLine(from, toX, toY) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", toX);
        line.setAttribute("y2", toY);
        line.setAttribute("stroke", "#f6e05e");
        line.setAttribute("stroke-width", "2");
        svg.appendChild(line);
    }

    drawSolsticeLine(summerSolstice, cx - earthRadius, cy - tropicOffset);
    drawSolsticeLine(winterSolstice, cx + earthRadius, cy + tropicOffset);

    /* ===== 夏至点・冬至点（小円＋ラベル） ===== */

    function drawSolsticePoint(point, labelText, offsetX) {
        const dot = document.createElementNS(svgNS, "circle");
        dot.setAttribute("cx", point.x);
        dot.setAttribute("cy", point.y);
        dot.setAttribute("r", solsticePointRadius);
        dot.setAttribute("fill", "#f6e05e");
        svg.appendChild(dot);

        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", point.x + offsetX);
        label.setAttribute("y", point.y);
        label.setAttribute("fill", "#f6e05e");
        label.setAttribute("font-size", labelSize);
        label.setAttribute("dominant-baseline", "middle");
        label.textContent = labelText;
        svg.appendChild(label);
    }

    drawSolsticePoint(summerSolstice, "夏至点", -100);
    drawSolsticePoint(winterSolstice, "冬至点", 26);

    /* ===== 太陽 ===== */
    const sun = document.createElementNS(svgNS, "circle");
    sun.setAttribute("r", sunRadius);
    sun.setAttribute("fill", "#f6e05e");
    svg.appendChild(sun);

    gsap.to(sun, {
        duration: 20,
        repeat: -1,
        ease: "none",
        motionPath: {
            path: ecliptic,
            align: ecliptic,
            alignOrigin: [0.5, 0.5],
            start: 1,
            end: 0
        }
    });

    /* ===== ラベル ===== */
    const sphereLabel = document.createElementNS(svgNS, "text");
    sphereLabel.setAttribute("x", cx);
    sphereLabel.setAttribute("y", cy + sphereRadius + labelSize + 6);
    sphereLabel.setAttribute("text-anchor", "middle");
    sphereLabel.setAttribute("fill", "#2b6cb0");
    sphereLabel.setAttribute("font-size", labelSize);
    sphereLabel.textContent = "天球";
    svg.appendChild(sphereLabel);

    const eclipticLabel = document.createElementNS(svgNS, "text");
    eclipticLabel.setAttribute("x", cx);
    eclipticLabel.setAttribute(
        "y",
        cy + sphereRadius * 0.35 + labelSize * 2.5
    );
    eclipticLabel.setAttribute("text-anchor", "middle");
    eclipticLabel.setAttribute("fill", "#d53f8c");
    eclipticLabel.setAttribute("font-size", labelSize);
    eclipticLabel.textContent = "黄道";
    svg.appendChild(eclipticLabel);
}