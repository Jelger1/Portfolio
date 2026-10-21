// Gedeeld door de 3D-scènes: renderer, renderlus die alleen draait als de scène in beeld is, en "minder beweging".
import { WebGLRenderer } from 'three';

export const minderBeweging = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function kanWebGL() {
	try {
		const canvas = document.createElement('canvas');
		return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
	} catch (e) {
		return false;
	}
}

// Renderer die zijn container vult en meeschaalt. Geeft { renderer, grootte } terug; grootte() = { b, h }.
export function maakRenderer(container, opties) {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, (opties && opties.maxPixelRatio) || 2));
	renderer.setClearColor(0x000000, 0);
	container.appendChild(renderer.domElement);
	function grootte() {
		return { b: Math.max(1, container.clientWidth), h: Math.max(1, container.clientHeight) };
	}
	const g = grootte();
	renderer.setSize(g.b, g.h, false);
	return { renderer, grootte };
}

// Roept elk frame frame(dt, t) aan zolang de container in beeld is (scheelt GPU en accu), en vangt grootteveranderingen op.
export function renderLus(container, frame, opnieuw) {
	let zichtbaar = false;
	let loopt = false;
	let vorige = 0;
	let tijd = 0;

	function lus(nu) {
		if (!zichtbaar) { loopt = false; return; }
		const dt = Math.min(0.05, vorige ? (nu - vorige) / 1000 : 0.016);
		vorige = nu;
		tijd += dt;
		frame(dt, tijd);
		requestAnimationFrame(lus);
	}
	function start() {
		if (loopt) return;
		loopt = true;
		vorige = 0;
		requestAnimationFrame(lus);
	}

	new IntersectionObserver(function (entries) {
		zichtbaar = entries[0].isIntersecting;
		if (zichtbaar) start();
	}, { rootMargin: '80px' }).observe(container);

	if (opnieuw && 'ResizeObserver' in window) new ResizeObserver(opnieuw).observe(container);
	else if (opnieuw) window.addEventListener('resize', opnieuw);
}

// Veer: beweegt naar doel met wat na-veren. Werkt per frame met dt in seconden.
export function veer(huidig, snelheid, doel, dt, stijfheid, demping) {
	const v = (snelheid + (doel - huidig) * stijfheid * dt) * Math.exp(-demping * dt);
	return [huidig + v * dt, v];
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
export function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
