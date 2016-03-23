/** @interface */
export default class Properties {

	// Spectra

	/** function(!number):!Array<!number> */	colorSpace
	/** Array<function(!number):!number> */		spectrumDisplay
	/** function(!number):!number */			spectrumFilterL
	/** function(!number):!number */			spectrumFilterR

	// Glasses

	/** !number */ filterBalance
	/** !number */ filterOpacity

	// Weighting

	/** !number */ hueImportance

	/** !number */ separationL
	/** !number */ separationR

	// these require an RGB color space
	/** !number */ colorization
	/** !number */ hueOverdrive
	/** !number */ colorFusion

	// Algorithm

	/** !boolean */ colorSpaceIsXYZ
	/** !boolean */ duboisNormalization

	// Output matrices

	/** Float32Array */ encoderL
	/** Float32Array */ encoderR

}
