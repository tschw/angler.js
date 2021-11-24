import CurveSpec from '../../math/curve';

/**
 * @file
 *
 * Characteristic spectra of display primaries.
 *
 * Sources:
 *
 * Comparing levels of crosstalk with red/cyan, blue/yellow and green/magenta
 * anaglyph 3D glasses" (Woods et al 2010)
 *
 * {@link http://cmst.curtin.edu.au/local/docs/pubs/2010-11.pdf}
 *
 * Fundamentals of projection technology (Koebel 2014)
 *
 * Designing display primaries with currently available light sources for
 * UHDTV wide-gamut system colorimetry (Masaoka et al 2014)
 */

/** @type {!CurveSpec} */
export const LCD = [

	// Red Channel

	{
		sampleDomain: [
			// blue
			//400, 432, 433, 434, 435, 436, 437, 440,
			//460, 465, 477, 478, 480, 486, 500,
			// green
			//537, 540, 541, 542, 544, 544.5, 545, 546, 553,
			// red
			570, 572, 577, 581, 585, 587, 591, 594, 597, 602,
			604, 606, 607.5, 608.5, 613, 619, 626, 629, 631, 632,
			645, 649, 652, 658, 660, 662, 663, 665, 670, 677,
			682, 684, 688, 690, 695, 698, 700
		],

		sampleData: [
			// blue
			//0, 0, 0, 0.03, 0.045, 0.005, 0.003, 0.003, // peak of blue
			//0.003, 0, 0.001, 0.003, 0.002, 0.018, 0, // cyan
			// green
			//0.01, 0.01, 0.03, 0.04, 0.03, 0.04, 0.015, 0.01, 0, // peak of green
			// red
			0, 0, 0.02, 0.02, 0.13, 0.06, 0.08, 0.01, 0.04, 0.01, // orange
			0.02, 0.06, 0.15, 0.89, 0.18, 0.12, 0.04, 0.12, 0.03, 0.02, // peak
			0.01, 0.03, 0.01, 0.01, 0.017, 0.01, 0.01, 0.015, 0.01, 0.014, // infra
			0.008, 0.014, 0.006, 0.007, 0.020, 0.006, 0
		]

	},

	// Green Channel

	{
		sampleDomain: [
			// blue
			432, 433, 434, 434.5, 435, 435.5, 436,
			443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454,
			// green
			465, 468, 480, 486, 490, 497, 500,
			520, 529, 535, 536, 539, 540,  542, 542.5, 543, 543.2, 544,
			544.5, 545.5, 547, 548, 552, 552.8, 555, 559, 560,
			// red
			574, 574.5, 575, 576, 577, 578, 581, 583, 584, 586,
			590, 591, 595, 599, 600, 601, 602, 607,
			608, 610, 611, 613, 617, 620, 622, 624, 625,
			629, 630, 631, 635, 650, 700
		],

		sampleData: [
			// blue
			0, 0, 0.01, 0.025, 0.025, 0, 0, // peak of blue
			0, 0, 0.01, 0, 0, 0, 0, 0.01, 0.005, 0.015, 0, 0, // low noise
			// green
			0, 0, 0.035, 0.125, 0.122, 0.075, 0.04, // cyan
			0.008, 0.01, 0.028, 0.04, 0.18, 0.3, 0.83, 1.0, 0.8, 0.73, 0.73, // peak
			0.94, 0.94, 0.29, 0.22, 0.12, 0.09, 0.03, 0.005, 0.005,
			// red
			0.005, 0.005, 0.01, 0.06, 0.03, 0.09, 0.055, 0.09, 0.055, 0.09, // orange
			0.035, 0.04, 0.01, 0.015, 0.005, 0.01, 0.006, 0.004, // peak of red
			0.008, 0.085, 0.085, 0.028, 0.005, 0.007, 0.01, 0.005, 0.005,
			0.005, 0.008, 0.005, 0.005, 0.005, 0.006
		]

	},

	// Blue Channel

	{
		sampleDomain: [
			// blue
			400, 401, 405, 406, 408,
			415, 430, 432, 432.5, 433, 434, 435, 436, 436.5, 437, 440,
			450, 470, 478, 480, 486, 488, 490, 494, 496, 498,
			500, 501, 520, 535,
			// green
			537, 539, 540, 544, 545, 546, 553, 560,
			580, 583, 584, 585, 586,
			590, 592.5, 593.5, 594.5, 595.5,
			604, 609, 610, 611, 612,
			620
		],

		sampleData: [
			0, 0, 0.02, 0.01, 0.002, // indigo
			0.001, 0.055, 0.065, 0.08, 0.3, 0.62, 0.8, 0.5, 0.11, 0.09, 0.1, // peak
			0.13, 0.09, 0.06, 0.06, 0.15, 0.15, 0.12, 0.06, 0.05, 0.05, // cyan
			0.014, 0.014, 0.007, 0.01,
			0.01, 0.02, 0.07, 0.07, 0.04, 0.03, 0.002, 0, // peak of green
			0, 0, 0.003, 0, 0, // orange
			0, 0, 0.002, 0, 0,
			0, 0, 0.002, 0, 0, // peak of red
			0
		]

	}

]; // LCD

// Masaoka 2014
export const LED_Projector_A = [

	// Red Channel

	{
		sampleDomain: [
			420, 600, 620,
			638, 639, 640,
			658, 678, 858
		],

		sampleData: [
			0, 0, 0.1,
			0.98, 0.99, 0.98,
			0.1, 0, 0
		]
	},

	// Green Channel

	{
		sampleDomain: [
			316, 496, 516,
			534, 535, 536,
			554, 574, 698
		],

		sampleData: [
			0, 0, 0.1,
			0.74, 0.75, 0.74,
			0.1, 0, 0
		]
	},

	// Blue Channel

	{
		sampleDomain: [
			240, 423, 445,
			458, 459, 460,
			473, 497, 622
		],

		sampleData: [
			0, 0, 0.1,
			0.93, 0.94, 0.93,
			0.1, 0, 0
		]
	}

]; // LED_Projector_A

// Koebel 2014
export const LED_Projector_B = [

	// Red Channel

	{
		sampleDomain: [
			411, 580, 603,
			627, 630, 631,
			649, 669, 793
		],

		sampleData: [
			0, 0, 0.1,
			0.98, 0.99, 0.98,
			0.1, 0, 0
		]
	},

	// Green Channel

	{
		sampleDomain: [
			346, 470, 487,
			521, 525, 529,
			580, 605, 628
		],

		sampleData: [
			0, 0, 0.1,
			0.97, 0.98, 0.97,
			0.1, 0, 0
		]
	},

	// Blue Channel

	{
		sampleDomain: [
			240, 420, 432,
			457, 460, 463,
			490, 500, 622
		],

		sampleData: [
			0, 0, 0.1,
			0.97, 0.98, 0.97,
			0.1, 0, 0
		]
	}

]; // LED_Projector_B
