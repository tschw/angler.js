
import * as curve from '../math/curve';
import * as mat3x3 from '../math/mat3x3';

import integrateSpectra from '../color/integrateSpectra';

import * as sensors from '../color/spectra/sensors';
import * as displays from '../color/spectra/displays';
import * as filters3d from '../color/spectra/filters3d';

import DuboisProjection from './DuboisProjection';


const
	Display = 0,
	EyeL	= 3,
	EyeR	= 6,
	FilterL = 9,
	FilterR = 10,
	XOver	= 11,

	SDisplay 	= Display 	* 3,
	SEyeL		= EyeL		* 3,
	SEyeR		= EyeR		* 3,
	SFilterL 	= FilterL 	* 3,
	SFilterR 	= FilterR 	* 3,
	SXOver		= XOver		* 3;


function equalEnergySpectrum() { return 1; }

function multiply( spectra, i, j ) {

	return function( nm ) {
		return spectra[ i ]( nm ) * spectra[ j ]( nm );
	};

}

/** @implements {IAnglerProperties} */
export default class MatrixController {

	constructor() {

		this.colorSpace = null;
		this.spectrumDisplay = null;
		this.spectrumFilterL = null;
		this.spectrumFilterR = null;

		/** @type {!DuboisProjection} */
		let dubois = new DuboisProjection();

		/** @const @private */
		this.dubois_ = dubois;

		this.encoderL = dubois.Ml;
		this.encoderR = dubois.Mr;

		this.filterBalance = 0;
		this.filterOpacity = 0;

		this.hueImportance = 1;

		this.separationL = 0;
		this.separationR = 0;

		this.colorization = 1;
		this.hueOverdrive = 0.2;
		this.colorFusion = 0.2;

		this.colorSpaceIsXYZ = false;
		this.equalizeCMFs = false;
		this.displayCAT = true;
		this.filtersCAT = false;
		this.duboisNormalization = false;

		/** @type {!Array<!function(!number):!number>} */
		var spectra = new Array( 12 );

		/** @const */ this.spectra_ = spectra;
		/** @const */ this.stimuli_ = new Float32Array( 12 * 3 );
		/** @const @type {!mat3x3.Type} */ this.invDisplay_ = mat3x3.create();

		for ( let i = 0; i !== 3; ++ i ) {

			spectra[ EyeL + i ] = multiply( spectra, Display + i, FilterL );
			spectra[ EyeR + i ] = multiply( spectra, Display + i, FilterR );

		}

		spectra[ XOver ] = multiply( spectra, FilterL, FilterR );

	}

	update() {

		// Setup spectra

		let spectra = this.spectra_,
			sDisplay = this.spectrumDisplay || this.defaultColorSpace_();

		for ( let i = 0; i !== 3; ++ i )
			spectra[ Display + i ] = sDisplay[ i ];

		spectra[ FilterL ] = this.spectrumFilterL || this.defaultFilterL_();
		spectra[ FilterR ] = this.spectrumFilterR || this.defaultFilterR_();

		// Integrate to stimuli

		let stimuli = this.stimuli_,
			colorSpace = this.colorSpace || this.defaultColorSpace_();

		integrateSpectra( spectra, colorSpace, stimuli );

		// Normalize matrices (uniform scale)

		let norm = stimuli[ SDisplay + 1 ]; //0;
//		for ( let j = 0; j !== 9; j += 3 )
//			norm += stimuli[ SDisplay + j + 1 ];
		norm = 1 / norm;

		for ( let o = 0; o !== SFilterL; ++ o )
			stimuli[ o ] *= norm;

		// Filter translucency balance

		let balance = this.filterBalance * 1.4,
			opacity = Math.pow( 0.33, this.filterOpacity - 1 ),
			transL = ( 2 + balance ) * opacity,
			transR = ( 2 - balance ) * opacity;

		// Intensities

		let xyz = this.colorSpaceIsXYZ,

			transSqrL = 0,
			transSqrR = 0,
			xOverSqr = 0;

		for ( var i = 0; i !== 3; ++ i ) {

			var filtL = stimuli[ SFilterL + i ],
				filtR = stimuli[ SFilterR + i ],
				xOver = stimuli[ SXOver + i ];

			transSqrL += filtL * filtL;
			transSqrR += filtR * filtR;
			xOverSqr += xOver * xOver;

		}

		let normL = 1. / Math.sqrt( transSqrL ),
			normR = 1. / Math.sqrt( transSqrR );

		// Separation

		let separationL = this.separationL,
			separationR = this.separationR,
			xOverNorm = 0.25 / xOverSqr;

		separationL *= Math.abs( separationL ) * xOverNorm;
		separationR *= Math.abs( separationR ) * xOverNorm;

		// Color regulation

		let hueImportance = this.hueImportance,
			colorization = this.colorization * 0.125 / ( opacity * opacity ),
			ease = this.colorFusion * 0.2,
			dist = this.hueOverdrive,
			undist = 1 - dist;

		if ( xyz ) {

			hueImportance = hueImportance * 0.99 + 0.01;
			hueImportance *= hueImportance;

		}


		// Write matrices

		let dubois = this.dubois_;

		for ( let j = 0; j !== 3; ++ j )
		for ( let i = 0; i !== 3; ++ i ) {

			let o = j * 3 + i;

			dubois.C[ o ] = stimuli[ SDisplay + o ];
			dubois.Al[ o ] = stimuli[ SEyeL + o ] * transL;
			dubois.Ar[ o ] = stimuli[ SEyeR + o ] * transR;

			let li = stimuli[ SFilterL + i ] * normL,
				lj = stimuli[ SFilterL + j ] * normL,
				ri = stimuli[ SFilterR + i ] * normR,
				rj = stimuli[ SFilterR + j ] * normR,

				weightL = ease,
				weightR = ease;

			if ( i == j ) {

				if ( xyz ) {

					weightL = weightR = i !== 1 ? hueImportance : 1;

				} else {

					weightL = lj * hueImportance + ( 1 - hueImportance ) * 0.7;
					weightR = rj * hueImportance + ( 1 - hueImportance ) * 0.7;

				}

			}

			li *= transL, lj *= transL, ri *= transR, rj *= transR;

			weightL -= colorization * ( undist * li + dist * ri ) * rj;
			weightR -= colorization * ( undist * ri + dist * li ) * lj;

			dubois.Wl[ o ] = weightL;
			dubois.Wr[ o ] = weightR;

			let xoxo = - stimuli[ SXOver + i ] * stimuli[ SXOver + j ];
			dubois.Wr2l[ o ] = separationL * xoxo;
			dubois.Wl2r[ o ] = separationR * xoxo;

		}


		// Perform projection

		dubois.normalize = this.duboisNormalization;
		dubois.update();

	}

	/** @private */
	defaultColorSpace_() {
		return curve.createFunction( sensors.RGB_Marguier06_A );
	}

	/** @private */
	defaultDisplay_() {
		return curve.createFunctionArray( displays.LCD );
	}

	/** @private */
	defaultFilterL_() {
		return curve.createFunction( filters3d.Red );
	}

	/** @private */
	defaultFilterR_() {
		return curve.createFunction( filters3d.Cyan );
	}

}

