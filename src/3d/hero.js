// Hero: het JS-teken als drie blokken, alsof het net van de 3D-printer komt (printlaagjes op de zijkanten).
// De onderdelen vallen bij het laden in elkaar, net als in de paginaovergang. Muis of vinger kantelt het teken, slepen
// draait het, aanwijzen tilt een onderdeel op en klikken laat het uit elkaar springen. Rondom zweven kleine blokjes
// in de merkkleuren: het raspberry-blokje uit het teken.
import {
	Scene, PerspectiveCamera, Group, Mesh, ExtrudeGeometry, MeshStandardMaterial, MeshBasicMaterial, HemisphereLight,
	DirectionalLight, PointLight, Color, CanvasTexture, RepeatWrapping, SRGBColorSpace, InstancedMesh, Object3D,
	Raycaster, Vector2, PlaneGeometry
} from 'three';
import { DELEN, BREEDTE, vorm } from './js-mark.js';
import { maakRenderer, renderLus, veer, easeOutCubic, minderBeweging } from './util.js';

const SCHAAL = 2.5 / BREEDTE;          // het teken is 2,5 eenheden breed
const DIKTE = 34;                      // in SVG-eenheden, zoals het teken getekend is
const LAAG = 1.4;                      // hoogte van een printlaagje, in SVG-eenheden
const AANKOMST = [                     // waar de onderdelen vandaan komen (zoals in de paginaovergang)
	{ x: 1.5, y: 1.2, z: -0.8, r: 0.6 },
	{ x: 0.7, y: -1.6, z: 0.9, r: -0.5 },
	{ x: -1.8, y: 0.2, z: 1.0, r: 0.9 }
];
const UITEEN = [                       // waar ze heen springen bij een klik
	{ x: 0.55, y: 0.5, z: 0.55, r: 0.35 },
	{ x: 0.15, y: -0.45, z: -0.35, r: -0.25 },
	{ x: -0.75, y: 0.15, z: 0.9, r: 0.6 }
];

// Printlaagjes: dunne lichtere en donkere strepen langs de dikte, herhaald over de zijkanten
function laagjes() {
	const canvas = document.createElement('canvas');
	canvas.width = 4;
	canvas.height = 32;
	const ctx = canvas.getContext('2d');
	const verloop = ctx.createLinearGradient(0, 0, 0, 32);
	verloop.addColorStop(0, '#ffffff');
	verloop.addColorStop(0.55, '#e6e6e6');
	verloop.addColorStop(0.8, '#bdbdbd');
	verloop.addColorStop(1, '#ffffff');
	ctx.fillStyle = verloop;
	ctx.fillRect(0, 0, 4, 32);
	const textuur = new CanvasTexture(canvas);
	textuur.wrapS = textuur.wrapT = RepeatWrapping;
	textuur.repeat.set(0.01, 1 / LAAG);
	textuur.colorSpace = SRGBColorSpace;
	return textuur;
}

// Zachte schaduw onder het zwevende teken
function schaduwTextuur() {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 128;
	const ctx = canvas.getContext('2d');
	const verloop = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
	verloop.addColorStop(0, 'rgba(3,188,202,0.55)');
	verloop.addColorStop(0.45, 'rgba(3,188,202,0.18)');
	verloop.addColorStop(1, 'rgba(3,188,202,0)');
	ctx.fillStyle = verloop;
	ctx.fillRect(0, 0, 128, 128);
	return new CanvasTexture(canvas);
}

// container: de laag die de hele hero vult (daar komt het canvas in, zodat de blokjes nergens worden afgesneden).
// anker: het vak in de layout waar het teken moet staan (.hero-art); de camera zet het midden van de scène daar neer.
export function initHero(container, anker) {
	const { renderer, grootte } = maakRenderer(container, { maxPixelRatio: 1.75 });
	const scene = new Scene();
	const camera = new PerspectiveCamera(32, 1, 0.1, 200);
	camera.position.set(0, 0.15, 7.4);

	// Licht: helder van voren, aqua van links en raspberry van rechtsonder, zoals de gloed op de site
	scene.add(new HemisphereLight('#f3fffd', '#080a0d', 0.9));
	const hoofd = new DirectionalLight('#ffffff', 1.7);
	hoofd.position.set(2.5, 4, 6);
	scene.add(hoofd);
	const aqua = new PointLight('#03bcca', 22, 0, 2);
	aqua.position.set(-3.2, 1.8, 2.5);
	scene.add(aqua);
	const roze = new PointLight('#f10067', 16, 0, 2);
	roze.position.set(3, -2.2, 2);
	scene.add(roze);

	// Het teken
	const teken = new Group();
	teken.rotation.set(-0.12, 0.32, 0);
	scene.add(teken);
	const lagen = laagjes();
	const delen = DELEN.map(function (deel, i) {
		const geo = new ExtrudeGeometry(vorm(deel.pad), { depth: DIKTE, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.4, bevelSegments: 3, curveSegments: 10 });
		geo.translate(0, 0, -DIKTE / 2);
		geo.scale(SCHAAL, SCHAAL, SCHAAL);
		const kleur = new Color(deel.kleur);
		// Aqua en raspberry gloeien iets, zodat ze verzadigd blijven; de lichte J kleurt alleen door het licht
		const basis = deel.naam === 'j' ? 0 : 0.16;
		const voorkant = new MeshStandardMaterial({ color: kleur, roughness: 0.4, metalness: 0.02, emissive: kleur, emissiveIntensity: basis });
		const zijkant = new MeshStandardMaterial({ color: new Color(deel.zijkant), roughness: 0.62, metalness: 0, map: lagen, emissive: kleur, emissiveIntensity: 0.04 });
		const mesh = new Mesh(geo, [voorkant, zijkant]);
		mesh.userData.index = i;
		teken.add(mesh);
		return {
			mesh, voorkant,
			pos: { x: 0, y: 0, z: 0, r: 0 }, snel: { x: 0, y: 0, z: 0, r: 0 }, doel: { x: 0, y: 0, z: 0, r: 0 },
			basis, gloed: basis
		};
	});

	// Schaduw
	const schaduw = new Mesh(new PlaneGeometry(3.4, 1.1), new MeshBasicMaterial({ map: schaduwTextuur(), transparent: true, depthWrite: false, opacity: 0.7 }));
	schaduw.rotation.x = -Math.PI / 2;
	schaduw.position.y = -1.65;
	scene.add(schaduw);

	// Zwevende blokjes (raspberry, aqua, Misty Sage, Deep Teal)
	const blokGeo = new ExtrudeGeometry(vorm(DELEN[2].pad), { depth: 22, bevelEnabled: true, bevelThickness: 3, bevelSize: 2, bevelSegments: 2 });
	blokGeo.center();
	blokGeo.scale(SCHAAL * 0.42, SCHAAL * 0.42, SCHAAL * 0.42);
	const KLEUREN = ['#f10067', '#03bcca', '#f3fffd', '#029aa6'];
	const AANTAL = 16;
	const blokjes = new InstancedMesh(blokGeo, new MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }), AANTAL);
	const zweef = [];
	const hulp = new Object3D();
	for (let i = 0; i < AANTAL; i++) {
		// Een ring om het teken; de buitenste blokjes staan verder naar achteren en lijken daardoor kleiner
		const hoek = (i / AANTAL) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
		const ver = Math.random();
		const straal = 2.05 + ver * 1.3;
		zweef.push({
			x: Math.cos(hoek) * straal * 1.1, y: Math.sin(hoek) * straal * 0.8, z: 0.8 - ver * 2.6 - Math.random() * 0.6,
			fase: Math.random() * Math.PI * 2, tempo: 0.35 + Math.random() * 0.4, draai: (Math.random() - 0.5) * 0.8,
			grootte: 0.55 + Math.random() * 0.75, rx: Math.random() * Math.PI, ry: Math.random() * Math.PI
		});
		blokjes.setColorAt(i, new Color(KLEUREN[i % KLEUREN.length]));
	}
	scene.add(blokjes);

	// ------------------------------------------------------------------ interactie
	const muis = { x: 0, y: 0 }, zacht = { x: 0, y: 0 };
	const wijzer = new Vector2(9, 9);
	const raycaster = new Raycaster();
	let aangewezen = -1;
	let draai = 0, draaiSnel = 0;
	let sleept = false, start = null, vorigeX = 0;
	let uiteenTot = 0;
	const canvas = renderer.domElement;

	window.addEventListener('pointermove', function (e) {
		muis.x = (e.clientX / window.innerWidth) * 2 - 1;
		muis.y = -(e.clientY / window.innerHeight) * 2 + 1;
		const r = canvas.getBoundingClientRect();
		if (e.pointerType === 'mouse') wijzer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		if (sleept) {
			draaiSnel = (e.clientX - vorigeX) * 0.012;
			draai += draaiSnel;
			vorigeX = e.clientX;
		}
	}, { passive: true });
	canvas.addEventListener('pointerleave', function () { wijzer.set(9, 9); });
	canvas.addEventListener('pointerdown', function (e) {
		sleept = true;
		start = { x: e.clientX, y: e.clientY, t: performance.now() };
		vorigeX = e.clientX;
		draaiSnel = 0;
		canvas.classList.add('is-dragging');
	});
	function loslaten(e) {
		if (!sleept) return;
		sleept = false;
		canvas.classList.remove('is-dragging');
		// Kort getikt zonder te slepen: uit elkaar en weer terug
		if (e.type === 'pointerup' && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6 && performance.now() - start.t < 450) uiteenTot = performance.now() + 900;
		start = null;
	}
	window.addEventListener('pointerup', loslaten);
	window.addEventListener('pointercancel', loslaten); // de browser neemt het over om te scrollen

	// Het canvas vult de hele hero, maar het teken hoort midden in het vak van .hero-art en even groot als dat vak.
	// Met een view offset ligt het midden van de projectie op het midden van dat vak; de afstand van de camera
	// zorgt dat het vak (vierkant, breedte s) precies het beeld toont dat vroeger een eigen canvas had.
	function opnieuw() {
		const g = grootte();
		renderer.setSize(g.b, g.h, false);
		const vlak = container.getBoundingClientRect();
		const vak = anker.getBoundingClientRect();
		const s = Math.max(1, vak.width);
		const cx = vak.left - vlak.left + vak.width / 2;
		const cy = vak.top - vlak.top + vak.height / 2;
		const heelB = 2 * Math.max(cx, g.b - cx);
		const heelH = 2 * Math.max(cy, g.h - cy);
		camera.aspect = heelB / heelH;
		camera.position.z = 7.4 * heelH / s;
		camera.setViewOffset(heelB, heelH, heelB / 2 - cx, heelH / 2 - cy, g.b, g.h);
		camera.updateProjectionMatrix();
	}
	opnieuw();
	if ('ResizeObserver' in window) new ResizeObserver(opnieuw).observe(anker);

	// ------------------------------------------------------------------ animatie
	let aankomst = minderBeweging ? 1 : 0;
	const vertraging = [0, 0.12, 0.24];

	function frame(dt, t) {
		zacht.x += (muis.x - zacht.x) * Math.min(1, dt * 3);
		zacht.y += (muis.y - zacht.y) * Math.min(1, dt * 3);

		// Aanwijzen (alleen met een muis)
		raycaster.setFromCamera(wijzer, camera);
		const raak = raycaster.intersectObjects(delen.map((d) => d.mesh), false)[0];
		const nieuw = raak ? raak.object.userData.index : -1;
		if (nieuw !== aangewezen) {
			aangewezen = nieuw;
			if (!sleept) canvas.style.cursor = aangewezen >= 0 ? 'pointer' : '';
		}

		const uiteen = performance.now() < uiteenTot;
		if (aankomst < 1) aankomst = Math.min(1, aankomst + dt / 1.6);

		delen.forEach(function (d, i) {
			// Bij het laden: van buiten naar binnen, na elkaar
			const p = Math.max(0, Math.min(1, (aankomst * 1.6 - vertraging[i]) / 1.0));
			const e = easeOutCubic(p);
			const a = AANKOMST[i], u = UITEEN[i];
			const til = i === aangewezen && !uiteen ? 0.22 : 0;
			d.doel.x = uiteen ? u.x : 0;
			d.doel.y = uiteen ? u.y : 0;
			d.doel.z = uiteen ? u.z : til;
			d.doel.r = uiteen ? u.r : 0;
			for (const k of ['x', 'y', 'z', 'r']) {
				const uit = veer(d.pos[k], d.snel[k], d.doel[k], dt, 90, 9);
				d.pos[k] = uit[0];
				d.snel[k] = uit[1];
			}
			d.mesh.position.set(d.pos.x + a.x * (1 - e), d.pos.y + a.y * (1 - e), d.pos.z + a.z * (1 - e));
			d.mesh.rotation.z = d.pos.r + a.r * (1 - e);
			d.mesh.scale.setScalar(0.6 + 0.4 * e);
			d.mesh.visible = p > 0;
			d.gloed += ((i === aangewezen || uiteen ? d.basis + 0.18 : d.basis) - d.gloed) * Math.min(1, dt * 8);
			d.voorkant.emissiveIntensity = d.gloed;
		});

		// Draaien: slepen geeft een zwiep die uitdempt; daarna wiegt het teken rustig terug
		if (!sleept) {
			draaiSnel *= Math.exp(-dt * 2.2);
			draai = Math.atan2(Math.sin(draai + draaiSnel), Math.cos(draai + draaiSnel)); // de kortste weg terug
			if (Math.abs(draaiSnel) < 0.002) draai += (0 - draai) * Math.min(1, dt * 0.9);
		}
		const wieg = minderBeweging ? 0 : Math.sin(t * 0.45) * 0.22;
		teken.rotation.y = 0.32 + wieg + draai + zacht.x * 0.35;
		teken.rotation.x = -0.12 - zacht.y * 0.18;
		const zwevend = minderBeweging ? 0 : Math.sin(t * 0.9) * 0.08;
		teken.position.y = 0.1 + zwevend;
		schaduw.material.opacity = 0.62 - zwevend * 1.2;
		schaduw.scale.setScalar(1 - zwevend * 0.6);

		zweef.forEach(function (b, i) {
			const tt = minderBeweging ? 0 : t;
			hulp.position.set(
				// Dichterbij beweegt meer mee met de muis dan verder weg: diepte
				b.x + Math.sin(tt * b.tempo + b.fase) * 0.12 + zacht.x * 0.16 * (b.z + 3),
				b.y + Math.cos(tt * b.tempo * 0.8 + b.fase) * 0.16 + zacht.y * 0.12 * (b.z + 3),
				b.z
			);
			hulp.rotation.set(b.rx + tt * b.draai, b.ry + tt * b.draai * 0.7, 0);
			hulp.scale.setScalar(b.grootte * (0.3 + 0.7 * easeOutCubic(Math.min(1, aankomst * 1.3))));
			hulp.updateMatrix();
			blokjes.setMatrixAt(i, hulp.matrix);
		});
		blokjes.instanceMatrix.needsUpdate = true;

		renderer.render(scene, camera);
	}

	renderLus(container, frame, opnieuw);
}
