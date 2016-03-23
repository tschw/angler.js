import * as mat3x3 from '../math/mat3x3';

export default class DuboisProjection {

	constructor() {

		// Input matrices

		/** @const @type {!mat3x3.Type} */
		this.C = mat3x3.create( 1 );
		/** @const @type {!mat3x3.Type} */
		this.Al = mat3x3.create( 1 );
		/** @const @type {!mat3x3.Type} */
		this.Ar = mat3x3.create( 1 );
		/** @const @type {!mat3x3.Type} */
		this.Wl = mat3x3.create( 1 );
		/** @const @type {!mat3x3.Type} */
		this.Wr = mat3x3.create( 1 );
		/** @const @type {!mat3x3.Type} */
		this.Wr2l = mat3x3.create();
		/** @const @type {!mat3x3.Type} */
		this.Wl2r = mat3x3.create();

		this.normalize = true;

		// Output matrices

		/** @const @type {!mat3x3.Type} */
		this.Ml = mat3x3.create( 1 );
		/** @const @type {!mat3x3.Type} */
		this.Mr = mat3x3.create( 1 );

		// Temporary matrices

		/** @private @const @type {!mat3x3.Type} */
		this.tmp0_ = mat3x3.create();

		/** @private @const @type {!mat3x3.Type} */
		this.tmp1_ = mat3x3.create();

	}

	update() {

		const
			display = this.C,

			lEye = this.Al,
			rEye = this.Ar,

			lOut = this.Ml,
			rOut = this.Mr,

			lrTw_T = lOut,
			rrTw_T = rOut,

			Phi_MinusT = mat3x3.invert(
				mat3x3.aTb_6x3_T( this.tmp0_,
					mat3x3.aTb_6x3_T( lrTw_T,
										lEye, this.Wl,
										rEye, this.Wl2r ),		lEye,

					mat3x3.aTb_6x3_T( rrTw_T,
										lEye, this.Wr2l,
										rEye, this.Wr ), 		rEye ) );

		mat3x3.aTb( lOut,
				Phi_MinusT, mat3x3.aTb( this.tmp1_, lrTw_T, display ) );

		mat3x3.aTb( rOut,
				Phi_MinusT, mat3x3.aTb( this.tmp1_, rrTw_T, display ) );

		if ( this.normalize ) {

			let r = 0, g = 0, b = 0;

			for ( let j = 0; j !== 9; j += 3 ) {

				r += lOut[   j   ] + rOut[   j   ];
				g += lOut[ j + 1 ] + rOut[ j + 1 ];
				b += lOut[ j + 2 ] + rOut[ j + 2 ];

			}

			for ( let j = 0; j !== 9; j += 3 ) {

				lOut[   j   ] /= r; rOut[   j   ] /= r;
				lOut[ j + 1 ] /= g; rOut[ j + 1 ] /= g;
				lOut[ j + 2 ] /= b; rOut[ j + 2 ] /= b;

			}

		}

	}

};
