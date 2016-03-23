/**
 * @typedef{{
 * 		sampleData: !Array<!number>,
 * 		sampleSize: (number|undefined),
 * 		sampleDomain: (!Array<!number>|!{start: !number, step: !number})
 * }}
 */
let CurveSpecBodyCubic;

/** @typedef {!Array<!{a:!number, b:!number, c:!number, d:!number}>} */
let GaussiansSpec;

/** @typedef {{gaussians: !GaussiansSpec}} */
let CurveSpecBodyGaussians;

/** @typedef {!CurveSpecBodyCubic|!CurveSpecBodyGaussians} */
let CurveSpecBody;

/** @typedef{!CurveSpecBody|!Array<!CurveSpecBody>} */
export let CurveSpec;


/**
 * @typedef{!{
 * 		sampleData: !Array<!number>,
 * 		sampleSize: (number|undefined),
 *		sampleDomain: !Array<!number>
 * }}
 */
let CurveSpecBodyCubicNormalized;

/** @typedef{!CurveSpecBodyGaussians|!CurveSpecBodyCubicNormalized} */
let ParsedCurveSpecBody;

/** @typedef {!Array<!ParsedCurveSpecBody>} */
let ParsedCurveSpec;

/**
 * @param {!CurveSpecBody} spec
 * @param {!ParsedCurveSpec} dst
 */
function parseSpecBody( spec, dst ) {

	let domain = spec.sampleDomain;

	if ( domain !== undefined ) {

		let sampleData = spec.sampleData,
			sampleSize = spec.sampleSize || 1,

			nSamples = sampleData.length / sampleSize;

		if ( nSamples % 1 !== 0 ) throw new Error(
				"sampleData.length is not a multiple of sampleSize" );

		if ( ! Array.isArray( domain ) ) {

			let domainSpec = domain,

				x0 = domainSpec.start,
				dx = domainSpec.step;

			domain = new Array( nSamples );

			for ( let i = 0; i !== nSamples; ++ i ) domain[ i ] = x0 + i * dx;

			dst.push( {
				sampleData: spec.sampleData,
				sampleSize: spec.sampleSize,
				sampleDomain: domain
			} );

			return;

		}

		if ( domain.length !== nSamples ) throw new Error(
				"sampleDomain.length does not match the number of samples" );

	}

	dst.push( /** @type{!ParsedCurveSpecBody} */( spec ) );

}

/** @param {!CurveSpec} spec  @return {!ParsedCurveSpec} */
function parseSpec( spec ) {

	let result = [];

	if ( Array.isArray( spec ) ) {

		for ( let i = 0, n = spec.length; i !== n; ++ i ) {

			parseSpecBody( spec[ i ], result );

		}

	} else 	parseSpecBody( spec, result );

	return result;

}

/** @param {!ParsedCurveSpec} parsedSpec @return {!ParsedCurveSpec} */
function splitSpec( parsedSpec ) {

	let result = [];

	for ( let i = 0, n = parsedSpec.length; i !== n; ++ i ) {

		let body = parsedSpec[ i ],
			sampleSize = body.sampleSize || 1;

		if ( sampleSize > 1 ) {

			let sampleData = body.sampleData,
				splitData = new Array( sampleSize ),
				nSamples = sampleData.length / sampleSize;

			for ( let j = 0; j !== sampleSize; ++ j )
				splitData[ j ] = new Float32Array( nSamples );

			for ( let k = 0; k !== nSamples; ++ k )
			for ( let j = 0; j !== sampleSize; ++ j )
				splitData[ j ][ k ] = sampleData[ k * sampleSize + j ];

			for ( let j = 0; j !== sampleSize; ++ j ) {

				result.push( {
					sampleDomain: body.sampleDomain,
					sampleData: splitData[ j ],
					sampleSize: 1
				} );

			}

		} else {

			result.push( body );

		}

	}

	return result;

}

/**
 * @param {!GaussiansSpec} spec
 * @param {!Float32Array} buffer
 * @param {!number} offset
 * @return {!function(!number):!number}
 */
function gaussiansInterpolant( spec, buffer, offset ) {

	return function( x ) {

		let value = 0;

		for ( let i = 0, n = spec.length; i !== n; ++ i ) {

			let gaussian = spec[ i ],
				t = ( x - gaussian.b ) * ( ( x < gaussian.b ) ?
						gaussian.c : gaussian.d );

			value += gaussian.a * Math.exp( -0.5 * t * t );

		}

		return ( buffer[ offset ] = value );

	};

}

/**
 * @param {!CurveSpecBodyCubicNormalized} spec
 * @param {!Float32Array} buffer
 * @param {!number} offset
 * @return {!function(!number):(!number|!Float32Array)}
 */
function cubicInterpolant( spec, buffer, offset ) {

	let domain = spec.sampleDomain,
		stride = spec.sampleSize || 1,
		values = spec.sampleData,

		cachedIndex = 0,

		copySample = function( index ) {

			let srcOffset = index * stride;

			for ( let i = 0; i !== stride; ++ i )
				buffer[ i + offset ] = values[ srcOffset + i ];

			return stride !== 1 ? buffer : buffer[ 0 ];

		},

		wP = -0, wN = -0, oP = 0, oN = 0;

	return function( t ) {

		let i1 = cachedIndex,

			t1 = domain[   i1   ],
			t0 = domain[ i1 - 1 ];

		validate_interval: {

			seek: {

				let right;

				linear_scan: {
//- 				forward_scan: if ( t >= t1 || t1 === undefined ) {
					forward_scan: if ( ! ( t < t1 ) ) {

						for ( let giveUpAt = i1 + 2; ;) {

							if ( t1 === undefined ) {

								if ( t < t0 ) break forward_scan;

								// after end

								i1 = domain.length;
								cachedIndex = i1;
								return copySample( i1 - 1 );

							}

							if ( i1 === giveUpAt ) break; // this loop

							t0 = t1;
							t1 = domain[ ++ i1 ];

							if ( t < t1 ) {

								// we have arrived at the sought interval
								break seek;

							}

						}

						// prepare binary search on the right side of the index
						right = domain.length;
						break linear_scan;

					}

//-					if ( t < t0 || t0 === undefined ) {
					if ( ! ( t >= t0 ) ) {

						// looping?

						let t1global = domain[ 1 ];

						if ( t < t1global ) {

							i1 = 2; // + 1, using the scan for the details
							t0 = t1global;

						}

						// linear reverse scan

						for ( let giveUpAt = i1 - 2; ;) {

							if ( t0 === undefined ) {

								// before start
								cachedIndex = 0;
								return copySample( 0 );

							}

							if ( i1 === giveUpAt ) break; // this loop

							t1 = t0;
							t0 = domain[ -- i1 - 1 ];

							if ( t >= t0 ) {

								// we have arrived at the sought interval
								break seek;

							}

						}

						// prepare binary search on the left side of the index
						right = i1;
						i1 = 0;
						break linear_scan;

					}

					// the interval is valid

					break validate_interval;

				} // linear scan

				// binary search

				while ( i1 < right ) {

					let mid = ( i1 + right ) >>> 1;

					if ( t < domain[ mid ] )
						right = mid;
					else
						i1 = mid + 1;

				}

				t1 = domain[   i1   ];
				t0 = domain[ i1 - 1 ];

				// check boundary cases, again

				if ( t0 === undefined ) {

					cachedIndex = 0;
					return copySample( 0 );

				}

				if ( t1 === undefined ) {

					i1 = domain.length;
					cachedIndex = i1;
					return copySample( i1 - 1 );

				}

			} // seek

			cachedIndex = i1;

			// interval changed
			let iPrev = i1 - 2,
				iNext = i1 + 1,

				tPrev = domain[ iPrev ],
				tNext = domain[ iNext ];

			if ( tPrev === undefined ) {

				// f'(t0) = 0
				iPrev = i1;
				tPrev = 2 * t0 - t1;

			}

			if ( tNext === undefined ) {

				// f'(tN) = 0
				iNext = i1;
				tNext = 2 * t1 - t0;

			}

			let halfDt = ( t1 - t0 ) * 0.5;

			wP = halfDt / ( t0 - tPrev );
			wN = halfDt / ( tNext - t1 );
			oP = iPrev * stride;
			oN = iNext * stride;

		} // validate_interval

		let o1 = i1 * stride,	o0 = o1 - stride,

			p = ( t - t0 ) / ( t1 - t0 ),
			pp = p * p,
			ppp = pp * p;

		// evaluate polynomials

		let sP =     - wP   * ppp   +         2 * wP    * pp    -          wP   * p,
			s0 = ( 1 + wP ) * ppp   + (-1.5 - 2 * wP )  * pp    + ( -0.5 + wP ) * p     + 1,
			s1 = (-1 - wN ) * ppp   + ( 1.5 +   wN   )  * pp    +    0.5        * p,
			sN =       wN   * ppp   -           wN      * pp;

		// combine data linearly

		for ( let i = 0; i !== stride; ++ i ) {

			buffer[ i ] =
					sP * values[ oP + i ] +
					s0 * values[ o0 + i ] +
					s1 * values[ o1 + i ] +
					sN * values[ oN + i ];

		}

		return stride !== 1 ? buffer : buffer[ 0 ];

	};

}


/**
 * @param {!ParsedCurveSpec} parsedSpec
 * @param {Float32Array=} opt_buffer
 */
function createInterpolants( parsedSpec, opt_buffer ) {

	let n = parsedSpec.length,
		result = new Array( n ),
		vecOffset = 0;

	for ( let i = 0; i !== n; ++ i ) {

		let body = parsedSpec[ i ],
			sampleSize = body.sampleSize !== undefined ? body.sampleSize : 1,

			buffer = opt_buffer || new Float32Array( sampleSize ),
			offset = 0;

		if ( opt_buffer !== undefined ) {

			offset = vecOffset;
			vecOffset += sampleSize;

		}

		let gaussians = body.gaussians;

		if ( gaussians !== undefined )
			result[ i ] = gaussiansInterpolant( gaussians, buffer, offset );

		else
			result[ i ] = cubicInterpolant(
					/** @type {!CurveSpecBodyCubicNormalized} */( body ),
					buffer, offset );

	}

	return result;

}

/**
 * @param {!CurveSpec} spec
 * @return {!function(!number):(!number|!Float32Array)}
 */
export function createFunction( spec ) {

	let parsedSpec = parseSpec( spec ),

		sampleSize = 0;
	for ( let i = 0, n = parsedSpec.length; i !== n; ++ i )
		sampleSize += /** @type {!number} */( parsedSpec[ i ].sampleSize || 1 );

	let buffer = new Float32Array( sampleSize ),
		interpolants = createInterpolants( parsedSpec, buffer );

	if ( interpolants.length === 1 ) return interpolants[ 0 ];

	return function( x ) {

		for ( let i = 0, n = interpolants.length; i !== n; ++ i )
			interpolants[ i ]( x );

		return buffer.length !== 1 ? buffer : buffer[ 0 ];

	};

}

/**
 * @param {!CurveSpec} spec
 * @return {Array<!function(!number):!number>}
 */
export function createFunctionArray( spec ) {

	return createInterpolants( splitSpec( parseSpec( spec ) ) );

}

