import CurveSpec from '../../math/curve';

/**
 * @file
 *
 * Characteristic spectra of the filters found in typical color 3D glasses.
 *
 * Source:
 *
 * Comparing levels of crosstalk with red/cyan, blue/yellow and green/magenta
 * anaglyph 3D glasses" (Woods et al 2010)
 *
 * {@link http://cmst.curtin.edu.au/local/docs/pubs/2010-11.pdf}
 */

/** @type {!CurveSpec} */
export const Red = {

	sampleDomain: [
		560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 700
	],
	sampleData: [
		0, 0, 0.02, 0.075, 0.25, 0.46, 0.65,  0.73, 0.77, 0.80, 0.82, 0.84
	]
};

/** @type {!CurveSpec} */
export const Cyan = {

	sampleDomain: [
		400, 460, 500, 515, 520, 540, 550, 560, 570, 580, 590, 600,
		685, 690, 700
	],
	sampleData: [
		0.25, 0.67, 0.77, 0.70, 0.67, 0.45, 0.33, 0.18, 0.08, 0.03, 0, 0,
		0, 0, 0.02
	]

};

/** @type {!CurveSpec} */
export const Green = {

	sampleDomain: [
		470, 480, 490, 500, 520, 525, 532, 560, 570, 580, 590, 600
	],
	sampleData: [
		0, 0, 0.02, 0.12, 0.34, 0.35, 0.34, 0.11, 0.05, 0.02, 0, 0
	]

};

/** @type {!CurveSpec} */
export const Magenta = {

	sampleDomain: [
		400, 420, 440, 460, 470, 480, 490, 500,
		570, 580, 590, 600, 610, 620, 660, 700
	],
	sampleData: [
		0.43, 0.42, 0.38, 0.17, 0.08, 0.026, 0, 0,
		0, 0, 0.05, 0.28, 0.65, 0.77, 0.86, 0.87
	]

};

/** @type {!CurveSpec} */
export const Blue = {

	sampleDomain: [
		400, 443, 460, 470, 490, 530, 535,
		650, 660, 670, 685, 700
	],
	sampleData: [
		0.08, 0.41, 0.33, 0.22, 0.08, 0, 0,
		0, 0, 0.01, 0.03, 0.12
	]
};

/** @type {!CurveSpec} */
export const Yellow = {

	sampleDomain: [
		470, 480, 490, 535, 565, 590, 600, 620, 650, 680, 700
	],
	sampleData: [
		0, 0, 0.01, 0.046, 0.028, 0.1, 0.11, 0.10, 0.145, 0.094, 0.32
	]

};

