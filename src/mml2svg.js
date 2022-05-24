#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var JSON = require("JSON");
var mathjax = require("mathjax-node");

mathjax.config({
	MathJax: {
		SVG: { font: 'TeX' }
	}
});

// convert all the MML in the given json file to SVG, and save it to the provided files
function mml2svg(jsonFilename) {
	mathjax.start();
	var mathData;
	var n = 0;
	var i = 0;
	var mathData = JSON.parse(fs.readFileSync(jsonFilename, 'utf8'));
	console.log(mathData.length + " equations in " + jsonFilename);
	for (eq of mathData) {
		eq.filename = path.join(path.dirname(jsonFilename), eq.href);
		if (!fs.existsSync(eq.filename)) {
			n += 1;
			mathjax.typeset({
				math: eq.math,
				filename: eq.filename,
				format: "MathML",
				svg: true,
				speakText: false,
				linebreaks: false
			}, function (math, opt) {
				i += 1;
				if (math.errors) {
					console.log(Date() + ': ' + opt.filename + ': ' + math.errors);
				} else {
					// remove unsupported attributes
					math.svg = math.svg
						.replace(' role="img"', '')
						.replace(' focusable="false"', '')
						.replace(' indentalign="left"', '')
						.replace(' aria-hidden="true"', '')
						.replace(' aria-labelledby="MathJax-SVG-1-Title"', '')
						.replace('&nbsp;', '\u00a0');
					function writeSVG(svgFilename, svgData, tries) {
						tries = tries || 0;
						if (tries > 3) {
							console.log("FILESYSTEM: SVG not written correctly: " 
								+ svgFilename, log.error);
						} else {
							fs.writeFile(svgFilename, svgData, 'utf8', (err) => {
								tries++;
								if (err) {
									console.log(opt.filename);
									console.log(err);
								} else {
									// check the file data to make sure it wrote correctly
									fd = fs.readFileSync(opt.filename, 'utf8');
									if (fd != math.svg) {
										console.log('try ' + tries + ' failed on ' + svgFilename);
										writeSVG(svgFilename, svgData, tries);
									}
								}
							});
						}
					}
					writeSVG(opt.filename, math.svg);
				}
			});
		}
	}
	console.log(n + " MathML equations converted to SVG");
}

var jsonFilename = process.argv[2]
mml2svg(jsonFilename);
