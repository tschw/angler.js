
/**
 * Integrates power spectra to a matrix of color values at arbitrary scale.
 *
 * The colors that correspond to the given spectra are the columns of the output
 * matrix which is represented by a flat array in column-mahor order.
 *
 * @param {!Array<function(!number):!number>} pdfs power distribution functions
 * @param {!function(!number):Array<!number>} sensors color matching functions
 * @param {Float32Array=} opt_dst
 * @return {!Float32Array}
 */
export default function integrateSpectra( pdfs, sensors, opt_dst ) {

	const
		n = 3,
		m = pdfs.length,
		nMatrixElements = n * m,
		dst = opt_dst || new Float32Array( nMatrixElements ),
		step = 2.5;

	for ( var i = 0; i !== nMatrixElements; ++ i ) dst[ i ] = 0;

	for ( var lambda = 400 + 0.5 * step; lambda < 700; lambda += step ) {

		var s = sensors( lambda );

		for ( let j = 0; j !== m; ++ j ) {

			var o = j * n,
				v = pdfs[ j ]( lambda );

			for ( let i = 0; i !== n; ++ i )
				dst[ o + i ] += v * s[ i ];

		}

	}

	return dst;

}

