// nodejs version using puppeteer
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const RES = 150;  // px / in
const SCALE_FACTOR = 1;

// Convert all the SVG to PNG images in a given folder
async function convertSVGtoPNGimages(imagePath) {
	const svgFilenames = getSVGfilenames(imagePath);
	log(svgFilenames.length.toString() + ' new svg file(s) to convert')

	const browser = await puppeteer.launch({
		// scale up the images to get higher resolution
		defaultViewport: { width: 800, height: 600, deviceScaleFactor: 2 },

		// Run chrome without a sandbox for this application. For more information, see
		// https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	const page = await browser.newPage();

	for (svg of svgFilenames) {
		svgfn = path.join(imagePath, svg);
		await SVGtoPNG(svgfn, page)
	};

	await browser.close();
};

function getSVGfilenames(imagePath) {
	// get a list of SVG filenames to convert to PNG: All .svg files for which a .png
	// file doesn't exist or is older than the .svg	
	return fs.readdirSync(imagePath).filter((basename) => {
		// .svg files
		return basename.match(/^.*\.svg$/i);
	}).filter((basename) => {
		svgfn = path.join(imagePath, basename);
		pngfn = svgfn.replace(/\.svg$/i, '.png');

		// true if the png doesn't exist
		if (!fs.existsSync(pngfn)) return true;

		// true if the png is older than the svg
		svgstat = fs.statSync(svgfn);
		pngstat = fs.statSync(pngfn);
		return pngstat.mtimeMs < svgstat.mtimeMs;
	});
}

// convert the given SVG to a PNG
async function SVGtoPNG(svgfn, page) {
	// create a temporary svg file that is adjusted as needed
	svgdata = makeTempSVG(svgfn);

	if (!svgdata) return;

	await page.setViewport({
		width: svgdata.width * SCALE_FACTOR,
		height: svgdata.height * SCALE_FACTOR,
		deviceScaleFactor: SCALE_FACTOR
	})
	await page.goto('file://' + svgdata.tempfn);

	pngfn = svgfn.replace(/\.svg$/, '.png');

	result = await writePNG(page, pngfn);
	if (!result) log('WARN: PNG write not verified: ' + path.basename(pngfn))

	// delete the temporary svg file
	fs.unlinkSync(svgdata.tempfn);
}

function makeTempSVG(svgfn) {
	// create a temporary SVG file with adjustments. return data about that file:
	// { tempfn, width, height }

	// load the svg data from the svg file
	svg = fs.readFileSync(svgfn, { encoding: 'UTF-8' })

	// skip 0-width and 0-height images
	if (svg.match(/<svg[^>]+width="0"/) || svg.match(/<svg[^>]+height="0"/)) return;

	// convert the width and height from ex to px 
	// -- RES px/in / 12 ex/in = px/ex
	width = parseInt(parseInt(svg.match(/width="([^"]+)ex"/)[1]) * RES / 12);
	height = parseInt(parseInt(svg.match(/height="([^"]+)ex"/)[1]) * RES / 12);

	// put the width and height in the style attribute
	svg = svg.replace(/(<svg[^>]+) width="[^"]+"/, '$1');
	svg = svg.replace(/(<svg[^>]+) height="[^"]+"/, '$1');
	svg = svg.replace(/(<svg[^>]+) style="[^"]+"/,
		'$1 style="width:' + width + 'px;height:' + height + 'px;"');

	// write the svg tempfn with adjustments 
	tempfn = svgfn.replace(/\.svg$/, '.temp.svg');
	fs.writeFileSync(tempfn, svg, { encoding: 'UTF-8' })

	return { tempfn: tempfn, width: width, height: height }
}

async function writePNG(page, pngfn) {
	// write the png 
	// DISABLED: and verify the file data with at least 2 writes, but no more than 3
	imageData = [];
	result = true;
	// while (imageData.length < 4) {
	await page.screenshot({
		path: pngfn,
		omitBackground: true // transparent background, will be adjusted to 25% opacity
	}).catch((error) => log(pngfn + ' - ' + error));

	// 	png = fs.readFileSync(svgfn);
	// 	if (imageData.includes(png)) {
	// 		result = true;
	// 		break;
	// 	} else {
	// 		imageData.push(png);
	// 	}
	// }
	return result;
}

function timestamp(date) {
	// return a timestamp string for the given Date (or now)
	date = date || new Date();
	return date.toISOString().replace(/T/, ' ');
}

function log(msg) {
	// log the given message
	console.log(timestamp() + ': svg2png.js: ' + msg);
}

Array.prototype.includes = function (obj) {
	// test whether the given Array includes a particular object
	for (var i = 0; i < this.length; i++) {
		if (this[i] === obj) return true;
	}
	return false;
}

const imagePath = process.argv[2];
log(imagePath);

convertSVGtoPNGimages(imagePath).catch((e) => log(e));
