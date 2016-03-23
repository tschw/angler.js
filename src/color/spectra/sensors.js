import CurveSpec from '../../math/curve';

/**
 * @file
 *
 * Color space sensors. Sources:
 *
 * Analytic Approximation of CIE31 (Wyman, Sloan and Shirley 2013)
 * {@link http://jcgt.org/published/0002/02/01/}
 *
 * Perceptually uniform RGB (Marguier and Suesstrunk 2006)
 * {@link http://infoscience.epfl.ch/record/97293}
 */

/** @type {!CurveSpec} */
export const XYZ_Wyman13 = [
	{
		gaussians: [
			{ a:  0.362, b: 442.0, c: 0.0624, d: 0.0374 },
			{ a:  1.056, b: 599.8, c: 0.0264, d: 0.0323 },
			{ a: -0.065, b: 501.1, c: 0.0490, d: 0.0382 }
		]
	}, {
		gaussians: [
			{ a:  0.821, b: 568.8, c: 0.0213, d: 0.0247 },
			{ a:  0.286, b: 530.9, c: 0.0613, d: 0.0322 }
		],
	}, {
		gaussians: [
			{ a:  1.217, b: 437.0, c: 0.0845, d: 0.0278 },
			{ a:  0.681, b: 459.0, c: 0.0385, d: 0.0725 }
		]
	}

];

/** @type {!CurveSpec} */
export const RGB_Marguier06_A = {

	sampleDomain: { start: 400, step: 25 },
	sampleSize: 3,
	sampleData: [
		0,		0,		0.03,
		0.36,	-0.02,	0.6,
		0.58,	-0.005,	1,
		0.3,	0.1,	0.6,
		0.1,	0.4,	0.4,
		0.2,	0.86,	0.64,
		0.47,	1,		0.78,
		0.82,	0.8,	0.76,
		1,		0.43,	0.6,
		0.72,	0.17,	0.3,
		0.28,	0.04,	0.1,
		0.07,	0.005,	0.01,
		0.01,	0,		0
	]

};

/** @type {!CurveSpec} */
export const RGB_Marguier06_B = {

	sampleDomain: { start: 400, step: 25 },
	sampleSize: 3,
	sampleData: [
		0, 		0, 		0,
		0.17,	0.05,	0.55,
		0.23,	0.13,	1,
		0.03,	0.22,	0.58,
		-0.15,	0.42,	0.22,
		-0.2,	0.89,	0.22,
		0.13,	0.98,	0.26,
		0.6,	0.67,	0.27,
		1,		0.2,	0.23,
		0.72,	-0.034,	0.12,
		0.28,	-0.03,	0.04,
		0.07,	-0.01,	0.01,
		0,		0,		0
	]

};
