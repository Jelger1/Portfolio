// Bouwt wat de site nodig heeft. Draai na een wijziging in src/3d/, een nieuwe foto of een nieuwe 3D-scan: npm run build
// De site zelf blijft gewone HTML, CSS en JavaScript in de hoofdmap (GitHub Pages publiceert die zoals hij is), dus
// de uitkomst van deze build gaat gewoon mee in git.
//
//  1. js/3d.js           de 3D-scènes (src/3d/) met Three.js gebundeld: alleen de delen die gebruikt worden
//  2. assets/3d/scan.bin de posities uit assets/Jelgerin3d.glb, genormaliseerd en als 16-bits getallen (10x kleiner)
//  3. assets/img/*.webp  kleine WebP-versies van de grote foto's (alleen opnieuw als het origineel nieuwer is)
//  4. privacy.html, 404.html: het paginadoek komt uit index.html, zodat het maar op één plek staat
//  5. ?v=...             in de HTML: een vingerafdruk van elk CSS- en JS-bestand, zodat bezoekers nooit een oude versie zien
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import sharp from 'sharp';
import { Matrix4, Vector3, Quaternion } from 'three';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...delen) => path.join(ROOT, ...delen);

// Foto's: bron in assets/, uitkomst in assets/img/. breedte = langste zijde in pixels.
const FOTOS = [
	{ bron: 'POSTER-SANCTUS-FUSION.jpg', naam: 'sanctus-poster', breedtes: [1600] },
	{ bron: 'Beer-Tap-Mockup.jpg', naam: 'sanctus-biertap', breedtes: [1600] },
	{ bron: 'Beer-Tap-Mockup-V2.jpg', naam: 'sanctus-biertap-v2', breedtes: [1200] },
	{ bron: 'Can-Mockup-Sanctus-Fusion-Info.jpg', naam: 'sanctus-blik', breedtes: [800, 1600] },
	{ bron: 'Sanctus-Fusion-Merchandise-T-Shirt.jpg', naam: 'sanctus-shirt-wit', breedtes: [1600] },
	{ bron: 'Sanctus-Fusion-Merchandise-T-Shirt-Zwart.jpg', naam: 'sanctus-shirt-zwart', breedtes: [1600] },
	{ bron: 'Jelger-Pic.jpg', naam: 'jelger', breedtes: [160, 800], vierkant: true },
	// Screenshots van de projectsites (1440x900) voor de voorbeelden in de lijst; vervang de JPG als een site verandert
	{ bron: 'screens/rolduc.jpg', naam: 'project-rolduc', breedtes: [700, 1400] },
	{ bron: 'screens/heerlen.jpg', naam: 'project-heerlen', breedtes: [700, 1400] },
	{ bron: 'screens/codemonster.jpg', naam: 'project-codemonster', breedtes: [700, 1400] },
	{ bron: 'Jelly-Bot.png', naam: 'jelly-bot', breedtes: [96], vierkant: true }
];

function nieuwer(bron, doel) {
	return !fs.existsSync(doel) || fs.statSync(bron).mtimeMs > fs.statSync(doel).mtimeMs;
}

// ---------------------------------------------------------------------------------------------- 1. 3D-bundel
async function bundel() {
	await esbuild.build({
		entryPoints: [p('src/3d/main.js')],
		outfile: p('js/3d.js'),
		bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'eof', logLevel: 'warning'
	});
	console.log('js/3d.js', Math.round(fs.statSync(p('js/3d.js')).size / 1024) + ' kB');
}

// ---------------------------------------------------------------------------------------------- 2. 3D-scan
// De deeltjesweergave in "Over mij" gebruikt alleen de posities van de hoekpunten. Die gaan genormaliseerd (midden op 0,
// grootste maat 2,2) en als Int16 in één bestand: ±32767 is ±1,1. Normalen, UV's en de textuur van de GLB vallen weg.
function scan() {
	const bron = p('assets/Jelgerin3d.glb');
	const doel = p('assets/3d/scan.bin');
	if (!fs.existsSync(bron) || !nieuwer(bron, doel)) return;
	const glb = fs.readFileSync(bron);
	if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('assets/Jelgerin3d.glb is geen GLB-bestand');
	const jsonLengte = glb.readUInt32LE(12);
	const gltf = JSON.parse(glb.subarray(20, 20 + jsonLengte).toString('utf8'));
	const bin = glb.subarray(20 + jsonLengte + 8);
	if (gltf.extensionsUsed && gltf.extensionsUsed.length) throw new Error('GLB met extensies (' + gltf.extensionsUsed.join(', ') + ') wordt niet ondersteund');

	const punten = [];
	function bezoek(index, ouder) {
		const node = gltf.nodes[index];
		const eigen = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
			new Vector3().fromArray(node.translation || [0, 0, 0]), new Quaternion().fromArray(node.rotation || [0, 0, 0, 1]), new Vector3().fromArray(node.scale || [1, 1, 1]));
		const wereld = ouder.clone().multiply(eigen);
		if (node.mesh !== undefined) {
			for (const primitive of gltf.meshes[node.mesh].primitives) {
				const accessor = gltf.accessors[primitive.attributes.POSITION];
				const view = gltf.bufferViews[accessor.bufferView];
				const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
				const stap = view.byteStride || 12;
				const v = new Vector3();
				for (let i = 0; i < accessor.count; i++) {
					const o = start + i * stap;
					v.set(bin.readFloatLE(o), bin.readFloatLE(o + 4), bin.readFloatLE(o + 8)).applyMatrix4(wereld);
					punten.push(v.x, v.y, v.z);
				}
			}
		}
		(node.children || []).forEach((kind) => bezoek(kind, wereld));
	}
	gltf.scenes[gltf.scene || 0].nodes.forEach((n) => bezoek(n, new Matrix4()));

	const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
	for (let i = 0; i < punten.length; i++) { min[i % 3] = Math.min(min[i % 3], punten[i]); max[i % 3] = Math.max(max[i % 3], punten[i]); }
	const midden = min.map((m, i) => (m + max[i]) / 2);
	const schaal = 2.2 / Math.max(...max.map((m, i) => m - min[i]));
	const uit = new Int16Array(punten.length);
	for (let i = 0; i < punten.length; i++) uit[i] = Math.round(((punten[i] - midden[i % 3]) * schaal / 1.1) * 32767);
	fs.mkdirSync(path.dirname(doel), { recursive: true });
	fs.writeFileSync(doel, Buffer.from(uit.buffer));
	console.log('assets/3d/scan.bin', punten.length / 3 + ' punten, ' + Math.round(uit.byteLength / 1024) + ' kB');
}

// ---------------------------------------------------------------------------------------------- 3. foto's
async function fotos() {
	fs.mkdirSync(p('assets/img'), { recursive: true });
	for (const foto of FOTOS) {
		const bron = p('assets', foto.bron);
		for (const breedte of foto.breedtes) {
			const doel = p('assets/img', foto.naam + '-' + breedte + '.webp');
			if (!nieuwer(bron, doel)) continue;
			const beeld = sharp(bron).rotate();
			await (foto.vierkant ? beeld.resize(breedte, breedte, { fit: 'cover' }) : beeld.resize(breedte, breedte, { fit: 'inside', withoutEnlargement: true }))
				.webp({ quality: 80, effort: 6 }).toFile(doel);
			console.log('assets/img/' + path.basename(doel), Math.round(fs.statSync(doel).size / 1024) + ' kB');
		}
	}
}

// ---------------------------------------------------------------------------------------------- 4. gedeelde stukken
function gedeeld() {
	const index = fs.readFileSync(p('index.html'), 'utf8');
	const doek = index.match(/<div class="page-curtain"[\s\S]*?<\/div>/);
	if (!doek) throw new Error('index.html: paginadoek niet gevonden');
	for (const pagina of ['privacy.html', '404.html']) {
		const bestand = p(pagina);
		if (!fs.existsSync(bestand)) continue;
		const html = fs.readFileSync(bestand, 'utf8');
		const nieuw = html.replace(/<div class="page-curtain"[\s\S]*?<\/div>/, doek[0]);
		if (nieuw !== html) { fs.writeFileSync(bestand, nieuw); console.log(pagina + ': paginadoek bijgewerkt'); }
	}
}

// ---------------------------------------------------------------------------------------------- 5. vingerafdrukken
function versies() {
	for (const pagina of ['index.html', 'privacy.html', '404.html']) {
		const bestand = p(pagina);
		if (!fs.existsSync(bestand)) continue;
		const html = fs.readFileSync(bestand, 'utf8');
		const nieuw = html.replace(/((?:\/|\b)(?:css|js)\/[\w.-]+\.(?:css|js))\?v=[\w]+/g, function (geheel, pad) {
			const doel = p(pad.replace(/^\//, ''));
			if (!fs.existsSync(doel)) return geheel;
			return pad + '?v=' + crypto.createHash('sha1').update(fs.readFileSync(doel)).digest('hex').slice(0, 8);
		});
		if (nieuw !== html) { fs.writeFileSync(bestand, nieuw); console.log(pagina + ': versies bijgewerkt'); }
	}
}

await bundel();
scan();
await fotos();
gedeeld();
versies();
