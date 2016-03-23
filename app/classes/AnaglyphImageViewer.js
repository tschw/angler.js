function AnaglyphImageViewer( image, canvas ) {

	// Color matrix for the left input image
	this.colorLeft = [
		0.456100, -0.0400822, -0.0152161,
		0.500484, -0.0378246, -0.0205971,
		0.176381, -0.0157589, -0.00546856
	];

	// Color matrix for the right input image
	this.colorRight = [
		-0.0434706, 0.378476, -0.0721527,
		-0.0879388, 0.73364, -0.112961,
		-0.00155529, -0.0184503, 1.2264
	];

	// To disable anaglyph encoding
	this.noAnaglyph = false;

	// Horizontal shift of the eyes' input images
	this.disparity = 0;

	// Encoded / actual width
	this.aspectCorrection = 1;

	// Clamp after applying each eye's color matrix
	this.perEyeClamping = false;

	// Linearize / re-gamma before and after the color transform
	this.ignoreGamma = false;

	var identity256 = new Array( 256 ),
		toLinear = new Array( 256 ),
		identity4096 = new Array( 4096 ),
		toSrgb = new Array( 4096 );

	for ( var i = 0; i !== 256; ++ i ) {

		var c = i / 255;

		identity256[ i ] = c;

		toLinear[ i ] = c <= 0.04045 ? c * 0.0773993808 :
				Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

	}

	for ( var i = 0; i !== 4096; ++ i ) {

		var c = i / 4095;

		identity4096[ i ] = 256 * c;

		toSrgb[ i ] = 255 * Math.min(Math.max( c <= 0.0031308 ?
				c * 12.92 : Math.pow( c, 0.41666 ) * 1.055 - 0.055, 0 ), 1 );

	}

	var imageCanvas = document.createElement( 'canvas' ),
		imageDataOut = null,
		leftImageData = null,
		leftImage,
		rightImage,

		encodeAnaglyph = function() {

			var w = imageCanvas.width,
				h = imageCanvas.height,

				disparity = Math.round( this.disparity ),
				absDisparity = Math.abs( disparity ),
				inputWidth = Math.max( 0, w - absDisparity ),
				modulo = absDisparity * 4,
				lOffs = disparity < 0 ? modulo : 0,
				rOffs = disparity < 0 ? 0 : modulo,
				dOffs = Math.round ( absDisparity * 0.5 ) * 4,

				mappingIn = this.ignoreGamma ? identity256 : toLinear,
				mappingOut = this.ignoreGamma ? identity4096 : toSrgb,

				lMatrix = this.colorLeft,
				rMatrix = this.colorRight,

				dst = imageDataOut.data,
				dstLength = dst.length,

				perEyeClamping = this.perEyeClamping;

			for ( var i = 0; i !== dOffs; ++ i ) dst[ i ] = 0;

			for ( ;; ) {
				// ...each row of input pixels

				for ( var x = 0; x !== inputWidth; ++ x ) {
					// ...each pixel in row

					var lVal = mappingIn[ leftImage[ lOffs ++ ] ],
						rVal = mappingIn[ rightImage[ rOffs ++ ] ],

						lr = lVal * lMatrix[ 0 ], rr = rVal * rMatrix[ 0 ];
						lg = lVal * lMatrix[ 1 ], rg = rVal * rMatrix[ 1 ];
						lb = lVal * lMatrix[ 2 ], rb = rVal * rMatrix[ 2 ];

					lVal = mappingIn[ leftImage[ lOffs ++ ] ];
					rVal = mappingIn[ rightImage[ rOffs ++ ] ];

					lr += lVal * lMatrix[ 3 ]; rr += rVal * rMatrix[ 3 ];
					lg += lVal * lMatrix[ 4 ]; rg += rVal * rMatrix[ 4 ];
					lb += lVal * lMatrix[ 5 ]; rb += rVal * rMatrix[ 5 ];

					lVal = mappingIn[ leftImage[ lOffs ++ ] ];
					rVal = mappingIn[ rightImage[ rOffs ++ ] ];

					lr += lVal * lMatrix[ 6 ]; rr += rVal * rMatrix[ 6 ];
					lg += lVal * lMatrix[ 7 ]; rg += rVal * rMatrix[ 7 ];
					lb += lVal * lMatrix[ 8 ]; rb += rVal * rMatrix[ 8 ];

					if ( perEyeClamping ) {

						if ( lr < 0 ) lr = 0; if ( rr < 0 ) rr = 0;
						if ( lg < 0 ) lg = 0; if ( rg < 0 ) rg = 0;
						if ( lb < 0 ) lb = 0; if ( rb < 0 ) rb = 0;

						if ( lr > 1 ) rr = 1; if ( rr > 1 ) rr = 1;
						if ( lg > 1 ) rg = 1; if ( rg > 1 ) rg = 1;
						if ( lb > 1 ) rb = 1; if ( rb > 1 ) rb = 1;

					}

					var r = lr + rr, g = lg + rg, b = lb + rb;

					if ( ! perEyeClamping ) {

						if ( r < 0 ) r = 0;
						if ( g < 0 ) g = 0;
						if ( b < 0 ) b = 0;

					}

					if ( r > 1 ) r = 1;
					if ( g > 1 ) g = 1;
					if ( b > 1 ) b = 1;

					dst[ dOffs ++ ] = mappingOut[ r * 4095 | 0 ];
					dst[ dOffs ++ ] = mappingOut[ g * 4095 | 0 ];
					dst[ dOffs ++ ] = mappingOut[ b * 4095 | 0 ];

					var lAlpha = leftImage[ lOffs ++ ],
						rAlpha = rightImage[ rOffs ++ ];

					dst[ dOffs ++ ] = 255; //lAlpha > rAlpha ? lAlpha : rAlpha;

				} // for each pixel in row

				var borderStart = dOffs,
					borderEnd = borderStart + modulo;

				if ( borderEnd < dstLength ) {

					for ( var i = borderStart; i !== borderEnd; ++ i ) dst[ i ] = 0;

				} else {

					borderEnd = dstLength;
					for ( var i = borderStart; i !== borderEnd; ++ i ) dst[ i ] = 0;

					break;

				}

				dOffs = borderEnd;

				lOffs += modulo;
				rOffs += modulo;

			} // for each line of input pixels

		},

		renderRequest = null;

	this.render = function() {

		var w = image.width >>> 1;
			h = image.height;

		if ( ! image.complete || ! w ) return;

		var c = imageCanvas.getContext( '2d' );

		if ( imageDataOut === null ||
				imageCanvas.width !== w || imageCanvas.height !== h ) {

			imageCanvas.width = w;
			imageCanvas.height = h;

			imageDataOut = c.createImageData( w, h );
			leftImageData = null;

		}

		if ( leftImageData === null ) {

			c.drawImage( image, 0, 0, w, h, 0, 0, w, h );
			leftImageData = c.getImageData( 0, 0, w, h );
			leftImage = leftImageData.data;

			c.drawImage( image, w, 0, w, h, 0, 0, w, h );
			rightImage = c.getImageData( 0, 0, w, h ).data;

		}

		var imageData = leftImageData;

		if ( ! this.noAnaglyph ) {

			encodeAnaglyph.call( this );
			imageData = imageDataOut;

		}

		c.putImageData( imageData, 0, 0 );

		// Scale to fit and clear border

		var c2 = canvas.getContext( '2d' ),

			cw = canvas.width,				ch = canvas.height,
//			maxX = cw - 1,					maxY = ch - 1,

			adjWidth = this.aspectCorrection * w,

			scale = Math.min( cw / adjWidth, ch / h ),

			realW = adjWidth * scale | 0,	realH = h * scale | 0,
			offsX = ( cw - realW ) >>> 1,	offsY = ( ch - realH ) >>> 1;

		c2.globalCompositeOperation = 'copy';
/*
		if ( offsX !== 0 ) {

			c2.clearRect( 0, 0, offsX, maxY );
			c2.clearRect( maxX - offsX, 0, maxX, maxY );

		} else if ( offsY !== 0 ) {

			c2.clearRect( 0, 0, maxX, offsY );
			c2.clearRect( 0, maxY - offsY, maxX, maxY );

		}
*/
		c2.drawImage( imageCanvas, offsX, offsY, realW, realH );

		if ( renderRequest !== null ) { // called manually?

			window.cancelAnimationFrame( renderRequest );
			renderRequest = null; // request already serviced

		}

	};

	var thiz = this,
		onFrame = function() { renderRequest = null; thiz.render(); };

	this.update = function() {

		if ( renderRequest === null ) // ...not already pending
			renderRequest = window.requestAnimationFrame( onFrame );

	};

	image.addEventListener( 'load', function() {
			leftImageData = null; thiz.update(); }, false );

	this.update();

}
