function AnaglyphVideoPlayer( video, canvas ) {

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

	var noErrors = false,

		isWaiting = false,
		isPlaying = false,

		renderRequest = null,
		render, // forward-declaration, see below
		gl,

		reportErrors = function( message, ok ) {

			if ( ! ok ) throw new Error( message );
			else if ( message ) console.warn( message );

		},

		compileShader = function( type, source ) {

			var shader = gl.createShader( type );

			gl.shaderSource( shader, source );
			gl.compileShader( shader );

			reportErrors( gl.getShaderInfoLog( shader ),
					gl.getShaderParameter( shader, gl.COMPILE_STATUS ) );

			return shader;

		},

		vertexData = new Float32Array( [
			-1, -1, 		+1, -1, 		+1, +1,
			-1, -1, 		+1, +1, 		-1, +1
		] ),

		glslVertexShader = [

			"precision mediump float;",

			"attribute vec4 pos;",

			"uniform vec4 geometry;",

			"varying vec2 border;",
			"varying vec3 texCoords;",

			"void main() {",

			"\tfloat fullWidth = geometry.x;",
			"\tfloat aspect = geometry.y;",
			"\tfloat scale = geometry.z;",
			"\tfloat disparity = geometry.w;",

			"\tfloat rcpWidth = 1. / fullWidth;",
			"\tfloat imageWidth = fullWidth * .5;",
			"\tfloat inputWidth = max( imageWidth - abs( disparity ), 0. );",
			"\tfloat aspectAdj = inputWidth * 2. * rcpWidth;",
			"\tgl_Position = pos;",

			"\tvec2 xStart = vec2( - min( disparity, 0. ),",
			"\t\t\timageWidth + max( disparity, 0. ) );",

			"\tvec2 iPos = pos.xy;",
			"\tiPos.x *= aspect / aspectAdj;",
			"\tiPos *= scale;",
			"\tborder = iPos;",

			"\tvec2 uvPos = iPos * .5 + .5;",
			"\tvec2 xPos = mix( xStart, xStart + inputWidth, uvPos.x );",

			"\ttexCoords = vec3( uvPos.y, xPos * rcpWidth );",
			"}"

		].join( '\n' ),

		glslFragmentShader = [

			"precision mediump float;",

			"uniform sampler2D sampler;",
			"uniform mat3 colorL;",
			"uniform mat3 colorR;",
			"uniform bvec3 flags;",

			"varying vec2 border;",
			"varying vec3 texCoords;",

			"float srgbGammaCorrect( float c ) {",
			"\treturn c <= 0.0031308 ? c * 12.92 :",
			"\t\t\tpow( c, 0.41666 ) * 1.055 - 0.055;",
			"}",

			"float srgbLinearize( float c ) {",
			"\treturn c <= 0.04045 ? c * 0.0773993808 :",
			"\t\t\tpow( c * 0.9478672986 + 0.0521327014, 2.4 );",
			"}",

			"vec3 srgbLinearize( vec4 c ) {",
			"\tif ( ! flags.x ) return c.rgb;",
			"\treturn vec3( srgbLinearize( c.r ),",
			"\t\t\tsrgbLinearize( c.g ), srgbLinearize( c.b ) );",
			"}",

			"void main() {",

			"\tvec2 off = abs( border );",
			"\tif ( max( off.x, off.y ) > 1. ) {",
			"\t\tgl_FragColor = vec4( 0. );",
			"\t\treturn;",
			"\t}",

			"\tvec4 inLeft = texture2D( sampler, texCoords.yx );",
			"\tif ( flags.z ) {",
			"\t\tgl_FragColor = inLeft;",
			"\t\treturn;",
			"\t}",

			"\tvec3 pixL = srgbLinearize( inLeft );",
			"\tpixL = colorL * pixL;",

			"\tvec3 pixR = srgbLinearize( texture2D(sampler, texCoords.zx) );",
			"\tpixR = colorR * pixR;",

			"\tvec3 col;",

			"\tif ( ! flags.y ) {",
			"\t\tcol = clamp( pixL + pixR, 0., 1. );",
			"\t} else {",
			"\t\tpixL = clamp( pixL, 0., 1. );",
			"\t\tpixR = clamp( pixR, 0., 1. );",
			"\t\tcol = min( pixL + pixR, 1. );",
			"\t}",

			"\tgl_FragColor = vec4( ! flags.x ? col.rgb : vec3(",
			"\t\t\tsrgbGammaCorrect( col.r ),",
			"\t\t\tsrgbGammaCorrect( col.g ),",
			"\t\t\tsrgbGammaCorrect( col.b ) ), 1. );",

			"}"

		].join( '\n' ),

		uniforms,

		init = function() {

			noErrors = false;

			// WebGL setup

			gl = canvas.getContext( 'webgl', {
				alpha: false, depth: false, antialias: false
			} );

			var vertexShader = compileShader(
						gl.VERTEX_SHADER, glslVertexShader ),
				fragmentShader = compileShader(
						gl.FRAGMENT_SHADER, glslFragmentShader ),

				gpuProgram = gl.createProgram();

			gl.attachShader( gpuProgram, vertexShader );
			gl.attachShader( gpuProgram, fragmentShader );
			gl.linkProgram( gpuProgram );

			reportErrors( gl.getProgramInfoLog( gpuProgram ),
					gl.getProgramParameter( gpuProgram, gl.LINK_STATUS ) );

			gl.useProgram( gpuProgram );

			var tex = gl.createTexture();
			gl.activeTexture( gl.TEXTURE0 );
			gl.bindTexture( gl.TEXTURE_2D, tex );
  			gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

			var vertexBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW );

			var vertexAttrib = gl.getAttribLocation( gpuProgram, 'pos' );
			gl.enableVertexAttribArray( vertexAttrib );
			gl.vertexAttribPointer( vertexAttrib, 2, gl.FLOAT, false, 0, 0 );

			uniforms = {};
			var n = gl.getProgramParameter( gpuProgram, gl.ACTIVE_UNIFORMS );

			for ( var i = 0; i !== n; ++ i ) {

				var info = gl.getActiveUniform( gpuProgram, i );
					name = info.name;

				uniforms[ name ] = gl.getUniformLocation( gpuProgram, name );

			}

			console.assert( gl.getError() === gl.NO_ERROR, "GL error" );

			noErrors = true;

		};

	this.render = function() {

		if ( video.readyState < 2 ) {

			isPlaying = false;
			return;

		}

		var cw = canvas.width, ch = canvas.height,

			w = video.videoWidth,
			h = video.videoHeight,

			aspectSrc = this.aspectCorrection * w / h,
			aspectDst = cw / ch,
			aspect = aspectDst / aspectSrc,
			scale = aspect < 1 ? 1 / aspect : 1;

		gl.texImage2D( gl.TEXTURE_2D,
				0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video );

		gl.uniform4f( uniforms[ 'geometry' ],
				w, aspect, scale, this.disparity );

		gl.uniform1i( uniforms[ 'sampler' ], 0 );

		gl.uniformMatrix3fv( uniforms[ 'colorL' ], false, this.colorLeft );
		gl.uniformMatrix3fv( uniforms[ 'colorR' ], false, this.colorRight );

		gl.uniform3i( uniforms[ 'flags' ], ( ! this.ignoreGamma ) | 0,
				this.perEyeClamping | 0, this.noAnaglyph | 0 );

		gl.viewport( 0, 0, cw, ch );
		gl.drawArrays( gl.TRIANGLES, 0, 6 );
		gl.flush();

		//console.assert( gl.getError() === gl.NO_ERROR, "GL error" );

		if ( isPlaying ) this.update();

	};

	var thiz = this,
		onFrame = function() { renderRequest = null; thiz.render(); };

	this.update = function() {

		if ( renderRequest === null ) // ...not already pending
			renderRequest = window.requestAnimationFrame( onFrame );

	};
/*
	var handle = function( elem, evtName, func ) {

			elem.addEventListener( evtName, func, false );

		};
*/
	init();

	handle( video, 'playing', function() {

		isWaiting = false;

		if ( ! isPlaying ) {

			isPlaying = true;

			if ( noErrors ) thiz.update();

		}

	} );

	handle( video, 'waiting', function() { isWaiting = true; } );
	handle( video, 'pause', function() { isPlaying = false; } );

	this.update();

}
