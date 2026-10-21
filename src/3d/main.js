// Start de 3D-scènes (wordt gebundeld naar js/3d.js, zie tools/build.mjs). Zonder WebGL blijft wat er al in de HTML
// staat: het JS-teken als plaatje in de hero, en bij de scan een foto (html.no-webgl, zie css/style.css).
import { initHero } from './hero.js';
import { initScan } from './scan.js';
import { kanWebGL } from './util.js';

function start() {
	if (!kanWebGL()) {
		document.documentElement.classList.add('no-webgl');
		return;
	}
	const anker = document.getElementById('hero-3d');
	const laag = document.querySelector('.hero-canvas');
	if (anker && laag) {
		try {
			initHero(laag, anker);
			anker.closest('.hero').classList.add('is-3d');
		} catch (e) {
			console.warn('3D in de hero lukt niet', e);
		}
	}
	const scan = document.getElementById('scan-3d');
	if (scan) {
		try {
			initScan(scan, function () { scan.classList.add('is-3d'); }, function () { document.documentElement.classList.add('no-webgl'); });
		} catch (e) {
			console.warn('3D-scan lukt niet', e);
			document.documentElement.classList.add('no-webgl');
		}
	}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
