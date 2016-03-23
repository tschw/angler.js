/** @typedef {!Float32Array} */
export let Type;

/** @param {!Type} m @return {!Type} same as 'm'
 * @throws {Error} on singularity */
export function invert( m ) {

	let n11 = m[ 0 ], n21 = m[ 1 ], n31 = m[ 2 ],
		n12 = m[ 3 ], n22 = m[ 4 ], n32 = m[ 5 ],
		n13 = m[ 6 ], n23 = m[ 7 ], n33 = m[ 8 ],

		t11 = n33 * n22 - n32 * n23,
		t12 = n32 * n13 - n33 * n12,
		t13 = n23 * n12 - n22 * n13,

		det = n11 * t11 + n21 * t12 + n31 * t13;

	if ( det === 0 )
		throw new Error( "can't invert singular matrix" );

	let rcpDet = 1 / det;

	m[ 0 ] = rcpDet * t11;
	m[ 1 ] = rcpDet * ( n31 * n23 - n33 * n21 );
	m[ 2 ] = rcpDet * ( n32 * n21 - n31 * n22 );

	m[ 3 ] = rcpDet * t12;
	m[ 4 ] = rcpDet * ( n33 * n11 - n31 * n13 );
	m[ 5 ] = rcpDet * ( n31 * n12 - n32 * n11 );

	m[ 6 ] = rcpDet * t13;
	m[ 7 ] = rcpDet * ( n21 * n13 - n23 * n11 );
	m[ 8 ] = rcpDet * ( n22 * n11 - n21 * n12 );

	return m;

}

/** @param {number=} s @return {!Float32Array} */
export function create( s ) {

	let m = new Float32Array( 9 );
	if ( s ) m[ 0 ] = m[ 4 ] = m[ 8 ] = s;
	return m;

}

// Bulding blocks to approach a 6x3 system with linear least squares:

/** @param {!Type} dst @param {!Type} a @param {!Type} b
 * @return {!Type} same as 'dst' */
export function aTb( dst, a, b ) {

	for ( let i = 0; i !== 3; ++ i ) {

		const aOffs = i * 3;
		for ( let j = 0; j !== 9; j += 3 )

			dst[ j + i ] =
					a[   aOffs   ] * b[   j   ] +
					a[ aOffs + 1 ] * b[ j + 1 ] +
					a[ aOffs + 2 ] * b[ j + 2 ];

	}

	return dst;

}

/** @param {!Type} dst @param {!Type} aUpper @param {!Type} bUpper
 * @param {!Type} aLower @param {!Type} bLower
 * @return {!Type} same as 'dst' */
export function aTb_6x3_T( dst, aUpper, bUpper, aLower, bLower ) {

	for ( let i = 0; i !== 3; ++ i ) {

		const bOffs = i * 3;

		for ( let j = 0; j !== 9; j += 3 ) {

			let elem = 0;
			for ( let k = 0; k !== 3; ++ k ) {

				const aIndex = j + k, bIndex = bOffs + k;
				elem += aUpper[ aIndex ] * bUpper[ bIndex ] +
						aLower[ aIndex ] * bLower[ bIndex ];

			}
			dst[ j + i ] = elem;

		}

	}

	return dst;

}

