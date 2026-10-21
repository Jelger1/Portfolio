// "Over mij": een 3D-scan van Jelger als wolk van lichtgevende deeltjes, in het merkverloop (raspberry onderaan,
// via Deep Teal en aqua naar Misty Sage bovenaan). De deeltjes vliegen in elkaar als de sectie in beeld komt, wijken
// voor de muis (of vinger) en een klik laat de scan uit elkaar spatten en weer samenkomen.
// De posities staan in assets/3d/scan.bin (gemaakt door tools/build.mjs uit assets/Jelgerin3d.glb) en worden pas
// opgehaald als de sectie in de buurt komt.
import {
	Scene, PerspectiveCamera, Group, Points, BufferGeometry, Float32BufferAttribute, ShaderMaterial, AdditiveBlending,
	Color, Raycaster, Vector2, Vector3, Plane, Matrix4
} from 'three';
import { maakRenderer, renderLus, easeInOutCubic, minderBeweging } from './util.js';

const BESTAND = 'assets/3d/scan.bin';
const OPBOUW = 2.6;        // seconden om in elkaar te vliegen
const STRAAL = 0.35;       // invloed van de muis
const DUW = 0.07;
const TERUG = 3.2;         // hoe snel deeltjes terugveren (per seconde)
const VERLOOP = [[0, '#f10067'], [0.22, '#c4127a'], [0.48, '#029aa6'], [0.78, '#03bcca'], [1, '#f3fffd']].map((s) => [s[0], new Color(s[1])]);

const vertexShader = `
	attribute float aSize;
	attribute vec3 aColor;
	uniform float uPixelRatio;
	varying vec3 vColor;
	void main() {
		vColor = aColor;
		vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
		gl_PointSize = aSize * uPixelRatio / (-mvPosition.z);
		gl_Position = projectionMatrix * mvPosition;
	}
`;
const fragmentShader = `
	varying vec3 vColor;
	void main() {
		float d = length(gl_PointCoord - vec2(0.5));
		if (d > 0.5) discard;
		float kern = 1.0 - smoothstep(0.0, 0.12, d);
		float gloed = 1.0 - smoothstep(0.05, 0.5, d);
		gl_FragColor = vec4(vColor + vec3(0.35) * kern, gloed * 0.8);
	}
`;

function kleurOp(t, uit) {
	for (let i = 1; i < VERLOOP.length; i++) {
		if (t <= VERLOOP[i][0]) {
			const a = VERLOOP[i - 1], b = VERLOOP[i];
			return uit.copy(a[1]).lerp(b[1], (t - a[0]) / (b[0] - a[0]));
		}
	}
	return uit.copy(VERLOOP[VERLOOP.length - 1][1]);
}

// klaar(): de scan staat in beeld. mislukt(): laden of tekenen lukte niet (dan toont de pagina een foto).
export function initScan(container, klaar, mislukt) {
	let gestart = false;
	// Pas laden als de sectie dichtbij is: de rest van de pagina hoeft er niet op te wachten
	new IntersectionObserver(function (entries, observer) {
		if (!entries[0].isIntersecting || gestart) return;
		gestart = true;
		observer.disconnect();
		fetch(BESTAND).then(function (res) {
			if (!res.ok) throw new Error(BESTAND + ': ' + res.status);
			return res.arrayBuffer();
		}).then(function (buffer) {
			bouw(container, new Int16Array(buffer));
			if (klaar) klaar();
		}).catch(function (e) {
			console.warn('3D-scan niet geladen', e);
			if (mislukt) mislukt();
		});
	}, { rootMargin: '600px 0px' }).observe(container);
}

function bouw(container, ruw) {
	const { renderer, grootte } = maakRenderer(container);
	const scene = new Scene();
	const camera = new PerspectiveCamera(35, 1, 0.1, 100);
	camera.position.set(0, 0, 3);

	const aantal = ruw.length / 3;
	const vorm = new Float32Array(ruw.length);
	for (let i = 0; i < ruw.length; i++) vorm[i] = (ruw[i] / 32767) * 1.1;

	let minY = Infinity, maxY = -Infinity;
	for (let i = 1; i < vorm.length; i += 3) { if (vorm[i] < minY) minY = vorm[i]; if (vorm[i] > maxY) maxY = vorm[i]; }
	const kleuren = new Float32Array(aantal * 3);
	const maten = new Float32Array(aantal);
	const verspreid = new Float32Array(aantal * 3);
	const tmp = new Color();
	for (let i = 0; i < aantal; i++) {
		kleurOp((vorm[i * 3 + 1] - minY) / (maxY - minY || 1), tmp);
		kleuren[i * 3] = tmp.r; kleuren[i * 3 + 1] = tmp.g; kleuren[i * 3 + 2] = tmp.b;
		maten[i] = 7 + Math.random() * 6;
		verspreid[i * 3] = (Math.random() - 0.5) * 8;
		verspreid[i * 3 + 1] = (Math.random() - 0.5) * 8;
		verspreid[i * 3 + 2] = (Math.random() - 0.5) * 8;
	}

	const geo = new BufferGeometry();
	geo.setAttribute('position', new Float32BufferAttribute(minderBeweging ? vorm.slice() : verspreid.slice(), 3));
	geo.setAttribute('aSize', new Float32BufferAttribute(maten, 1));
	geo.setAttribute('aColor', new Float32BufferAttribute(kleuren, 3));
	const posities = geo.attributes.position;
	const materiaal = new ShaderMaterial({
		vertexShader, fragmentShader,
		uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
		transparent: true, depthWrite: false, blending: AdditiveBlending
	});
	const groep = new Group();
	groep.add(new Points(geo, materiaal));
	scene.add(groep);

	// Muis en vinger
	const muis = { x: 0, y: 0 }, zacht = { x: 0, y: 0 };
	const lokaal = new Vector2(9999, 9999);
	const raycaster = new Raycaster();
	const vlak = new Plane(new Vector3(0, 0, 1), 0);
	const punt = new Vector3();
	const inverse = new Matrix4();
	window.addEventListener('pointermove', function (e) {
		muis.x = (e.clientX / window.innerWidth) * 2 - 1;
		muis.y = -(e.clientY / window.innerHeight) * 2 + 1;
		const r = container.getBoundingClientRect();
		lokaal.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
	}, { passive: true });
	container.addEventListener('pointerleave', function () { lokaal.set(9999, 9999); });

	// Opbouw start als de scan echt in beeld is
	let opbouw = minderBeweging ? 1 : 0;
	let bezig = minderBeweging;
	new IntersectionObserver(function (entries, observer) {
		if (entries[0].isIntersecting) { bezig = true; observer.disconnect(); }
	}, { threshold: 0.25 }).observe(container);

	// Klik: uit elkaar spatten en weer samenkomen
	const snelheden = new Float32Array(aantal * 3);
	let spat = -1;
	container.addEventListener('click', function () {
		if (opbouw < 1 || spat >= 0) return;
		spat = 0;
		for (let i = 0; i < aantal; i++) {
			const i3 = i * 3;
			const x = vorm[i3], y = vorm[i3 + 1], z = vorm[i3 + 2];
			const l = Math.sqrt(x * x + y * y + z * z) || 1;
			const f = 0.9 + Math.random() * 1.5;
			snelheden[i3] = (x / l) * f + (Math.random() - 0.5) * 0.7;
			snelheden[i3 + 1] = (y / l) * f + (Math.random() - 0.5) * 0.7;
			snelheden[i3 + 2] = (z / l) * f + (Math.random() - 0.5) * 0.7;
		}
	});

	function opnieuw() {
		const g = grootte();
		renderer.setSize(g.b, g.h, false);
		camera.aspect = g.b / g.h;
		camera.position.z = camera.aspect < 1 ? 3.3 / Math.max(0.6, camera.aspect) : 3.3;
		camera.updateProjectionMatrix();
	}
	opnieuw();

	function frame(dt, t) {
		zacht.x += (muis.x - zacht.x) * Math.min(1, dt * 1.2);
		zacht.y += (muis.y - zacht.y) * Math.min(1, dt * 1.2);
		groep.rotation.y = -Math.PI / 2 + zacht.x * 0.4;
		groep.rotation.x = -zacht.y * 0.2;
		groep.position.y = -0.3 + (minderBeweging ? 0 : Math.sin(t * 0.8) * 0.05);
		groep.position.x = minderBeweging ? 0 : Math.sin(t * 0.5) * 0.03;
		groep.updateMatrixWorld();

		const p = posities.array;
		if (bezig && opbouw < 1) {
			opbouw = Math.min(1, opbouw + dt / OPBOUW);
			const e = easeInOutCubic(opbouw);
			for (let i = 0; i < p.length; i++) p[i] = verspreid[i] + (vorm[i] - verspreid[i]) * e;
			posities.needsUpdate = true;
		} else if (spat >= 0) {
			spat += dt;
			if (spat < 1.4) {
				const rem = Math.exp(-dt * 0.8);
				for (let i = 0; i < p.length; i++) { p[i] += snelheden[i] * dt; snelheden[i] *= rem; }
			} else {
				const k = Math.min(1, dt * 1.6);
				let klaar = true;
				for (let i = 0; i < p.length; i++) {
					p[i] += (vorm[i] - p[i]) * k;
					if (klaar && Math.abs(vorm[i] - p[i]) > 0.004) klaar = false;
				}
				if (klaar) spat = -1;
			}
			posities.needsUpdate = true;
		} else if (opbouw >= 1) {
			// Deeltjes wijken voor de muis en veren terug
			raycaster.setFromCamera(lokaal, camera);
			const geraakt = raycaster.ray.intersectPlane(vlak, punt);
			const m = geraakt ? punt.applyMatrix4(inverse.copy(groep.matrixWorld).invert()) : null;
			const r2 = STRAAL * STRAAL;
			const k = Math.min(1, dt * TERUG);
			for (let i = 0; i < p.length; i += 3) {
				const x = vorm[i], y = vorm[i + 1], z = vorm[i + 2];
				if (m) {
					const dx = x - m.x, dy = y - m.y, dz = z - m.z;
					const d2 = dx * dx + dy * dy + dz * dz;
					if (d2 < r2 && d2 > 0.0001) {
						const d = Math.sqrt(d2);
						const f = (1 - d / STRAAL) * DUW / d;
						p[i] = x + dx * f; p[i + 1] = y + dy * f; p[i + 2] = z + dz * f;
						continue;
					}
				}
				p[i] += (x - p[i]) * k; p[i + 1] += (y - p[i + 1]) * k; p[i + 2] += (z - p[i + 2]) * k;
			}
			posities.needsUpdate = true;
		}
		renderer.render(scene, camera);
	}

	renderLus(container, frame, opnieuw);
}
