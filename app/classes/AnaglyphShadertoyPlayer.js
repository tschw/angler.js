function AnaglyphShadertoyPlayer( canvas ) {

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

	var renderRequest = null,
		ready = false,
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

		linkAndUseProgram = function( vs, fs ) {

			var program = gl.createProgram();
			gl.attachShader( program, vs );
			gl.attachShader( program, fs );
			gl.linkProgram( program );

			reportErrors( gl.getProgramInfoLog( program ),
					gl.getProgramParameter( program, gl.LINK_STATUS ) );

			gl.useProgram( program );
			gl.deleteProgram( program );
			return program;

		},

		vertexData = new Float32Array( [
			-1, -1, 		+1, -1, 		+1, +1,
			-1, -1, 		+1, +1, 		-1, +1
		] ),

		glslVertexShader = [

			"precision mediump float;",

			"attribute vec4 pos;",

			"uniform vec3 iResolution;",

			"uniform vec4 _fov;",
			"uniform vec3 _camFrom;",
			"uniform vec4 _camHead;",

			"varying vec3 _lOri;",
			"varying vec3 _lDir;",

			"varying vec3 _rOri;",
			"varying vec3 _rDir;",

			"vec3 transform( in vec3 v ) {",
			"\tvec3 t = cross( _camHead.xyz, v );",
			"\treturn v + t * ( 2. * _camHead.w ) +",
			"\t\t\t2. * cross( _camHead.xyz, t );",
			"}",

			"void main() {",

			"\tgl_Position = pos;",

			"\tvec2 rcpRes = 1. / iResolution.xy;",
			"\tvec2 aspect = min( iResolution.xy * rcpRes.yx, 1. );",
			"\tvec2 acUnit = pos.xy * aspect;",

			"\tacUnit *= 1. / aspect.x;",

			"\tfloat tanHalfFovX = _fov.x;",
			"\tfloat convergence = _fov.y;",
			"\tfloat eyeDisplace = _fov.z;",
			"\tfloat dispaAdjust = _fov.w;",

			"\tfloat extraDistance = eyeDisplace / tanHalfFovX;",
			"\tfloat fullDistance = extraDistance + convergence;",
			"\tfloat halfWidth = convergence * tanHalfFovX;",

			"\tfloat shift = eyeDisplace + dispaAdjust * halfWidth;",

			"\tvec3 dir = vec3( acUnit * halfWidth, - fullDistance );",
			"\tvec3 lDir = vec3( dir.x + shift, dir.yz );",
			"\tvec3 rDir = vec3( dir.x - shift, dir.yz );",

			"\tvec3 lOri = vec3( - eyeDisplace, 0., extraDistance );",
			"\tvec3 rOri = vec3( + eyeDisplace, 0., extraDistance );",

			"\t_lDir = transform( lDir );",
			"\t_lOri = transform( lOri ) + _camFrom;",
			"\t_rDir = transform( rDir );",
			"\t_rOri = transform( rOri ) + _camFrom;",

			"}"

		].join( '\n' ),

		glslFragmentShaderPrefix = [

			"precision mediump float;",

			"uniform vec3 iResolution;",

			"uniform float iGlobalTime;",
			"uniform float iTimeDelta;",
			"uniform int iFrame;",

			"uniform vec4 iMouse;",

			"const float iSampleRate = 44100.;",

			"uniform mat3 _colorL;",
			"uniform mat3 _colorR;",
			"uniform bvec3 _flags;",

			"varying vec3 _lOri;",
			"varying vec3 _lDir;",

			"varying vec3 _rOri;",
			"varying vec3 _rDir;",

			"void mainVR( out vec4 fragColor, in vec2 fragCoord,",
			"\t\tin vec3 fragRayOri, in vec3 fragRayDir );",

			"float _srgbGammaCorrect( float c ) {",
			"\treturn c <= 0.0031308 ? c * 12.92 :",
			"\t\t\tpow( c, 0.41666 ) * 1.055 - 0.055;",
			"}",

			"float _srgbLinearize( float c ) {",
			"\treturn c <= 0.04045 ? c * 0.0773993808 :",
			"\t\t\tpow( c * 0.9478672986 + 0.0521327014, 2.4 );",
			"}",

			"vec3 _srgbLinearize( vec4 c ) {",
			"\tif ( ! _flags.x ) return c.rgb;",
			"\treturn vec3( _srgbLinearize( c.r ),",
			"\t\t\t_srgbLinearize( c.g ), _srgbLinearize( c.b ) );",
			"}",

			"void main() {",

			"\tvec4 inLeft;",
			"\tmainVR( inLeft, gl_FragCoord.xy, _lOri, normalize( _lDir ) );",

			"\tif ( _flags.z ) {",
			"\t\tgl_FragColor = inLeft;",
			"\t\treturn;",
			"\t}",

			"\tvec3 pixL = _srgbLinearize( inLeft );",
			"\tpixL = _colorL * pixL;",

			"\tvec4 inRight;",
			"\tmainVR( inRight, gl_FragCoord.xy, _rOri, normalize( _rDir ) );",

			"\tvec3 pixR = _srgbLinearize( inRight );",
			"\tpixR = _colorR * pixR;",

			"\tvec3 col;",

			"\tif ( ! _flags.y ) {",
			"\t\tcol = clamp( pixL + pixR, 0., 1. );",
			"\t} else {",
			"\t\tpixL = clamp( pixL, 0., 1. );",
			"\t\tpixR = clamp( pixR, 0., 1. );",
			"\t\tcol = min( pixL + pixR, 1. );",
			"\t}",

			"\tgl_FragColor = vec4( ! _flags.x ? col.rgb : vec3(",
			"\t\t\t_srgbGammaCorrect( col.r ),",
			"\t\t\t_srgbGammaCorrect( col.g ),",
			"\t\t\t_srgbGammaCorrect( col.b ) ), 1. );",

			"}\n// ---\n"

		].join( '\n' ),

		uniforms,
		vertexShader,

		init = function() {

			// WebGL setup

			gl = canvas.getContext( 'webgl', {
				alpha: false, depth: false, antialias: false
			} );

			vertexShader = compileShader(
					gl.VERTEX_SHADER, glslVertexShader );

			var vertexBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW );

			console.assert( gl.getError() === gl.NO_ERROR, "GL error" );

			return gl;

		},

		iMouse = [ 0, 0, 0, 0 ],

		timeStart,
		timePrev,
		timeFrame,

		timeReset = function() {
			timeFrame = 0;
			timePrev = timeStart = Date.now();
		},

		al = function( n ) { return new Float32Array( n ); },
		sfc = function( d, var_args ) {
			for ( var i = 0, n = arguments.length - 1; i !== n; ++ i )
				d[ i ] = arguments[ i + 1 ];
		},

		CamFrictT = 0.6,
		CamFrictG = 0.3,

		camMode = false,

		camGlobalAxis = [ false, false, false ],

		camVelT = al( 3 ),
		camVelG = al( 3 ),
		camAccT = al( 3 ),
		camAccG = al( 3 ),

		camFrom = al( 3 ),
		camHead = al( 4 ),

		camFovD,
		camConv,
		camEyes,

		camReset = function() {

			sfc( camVelT, 0, 0, 0 );
			sfc( camVelG, 0, 0, 0 );
			sfc( camAccT, 0, 0, 0 );
			sfc( camAccG, 0, 0, 0 );
			sfc( camFrom, 0, 0, 0 );
			sfc( camHead, 0, 0, 0, 1 );

			camFovD = 90;
			camConv = 1.6;
			camEyes = 0.02;

		},

		camUpdate;

	init();

	this.setSource = function( source ) {

		fragmentShader = compileShader(
				gl.FRAGMENT_SHADER, glslFragmentShaderPrefix + source );

		var gpuProgram = linkAndUseProgram( vertexShader, fragmentShader );
		gl.deleteShader( fragmentShader );

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

		ready = true;
		this.update();

		camReset();
		timeReset();

	};


	this.render = function() {

		if ( ! gl || ! ready ) return;

		var cw = canvas.width, ch = canvas.height;
		gl.uniform3f( uniforms[ 'iResolution' ], cw, ch, 1. );

		gl.uniform3fv( uniforms[ '_camFrom' ], camFrom );
		gl.uniform4fv( uniforms[ '_camHead' ], camHead );

		var cd = Math.sqrt( cw * cw + ch * ch ),
			tanHalfFovX = Math.tan( camFovD * Math.PI / 360 ) * cw / cd;

		gl.uniform4f( uniforms[ '_fov' ], tanHalfFovX, camConv,
				camEyes * tanHalfFovX, this.disparity / cw );

		gl.uniformMatrix3fv( uniforms[ '_colorL' ], false, this.colorLeft );
		gl.uniformMatrix3fv( uniforms[ '_colorR' ], false, this.colorRight );

		gl.uniform3i( uniforms[ '_flags' ], ( ! this.ignoreGamma ) | 0,
				this.perEyeClamping | 0, this.noAnaglyph | 0 );

		var date = new Date(),
			time = + date,
			t = ( time - timeStart ) / 1000,
			dt = ( time - timePrev ) / 1000;
		timePrev = time;

		gl.uniform1f( uniforms[ 'iGlobalTime' ], t );
		gl.uniform1f( uniforms[ 'iTimeDelta' ], dt );
		gl.uniform1i( uniforms[ 'iFrame' ], timeFrame );
		gl.uniform4f( uniforms[ 'iDate' ], date.getYear() + 1900,
				date.getMonth(), date.getDay(), date.getSeconds() );

		gl.uniform4fv( uniforms[ 'iMouse' ], iMouse );

		gl.viewport( 0, 0, cw, ch );
		gl.drawArrays( gl.TRIANGLES, 0, 6 );
		gl.flush();

		//console.assert( gl.getError() === gl.NO_ERROR, "GL error" );

		camUpdate( dt );
		this.update();

	};

	var thiz = this,
		onFrame = function() {
			renderRequest = null;
			thiz.render();
			++ timeFrame;
		};

	this.update = function() {

		if ( ready && renderRequest === null )
			renderRequest = window.requestAnimationFrame( onFrame );

	};

	var unhandle = function( elem, evName, func ) {
			elem.removeEventListener( evName, func, false );
		},

		lmbDownMove = function( ev ) {
			iMouse[ 2 ] = iMouse[ 0 ] = ev.clientX;
			iMouse[ 3 ] = iMouse[ 1 ] = ev.clientY;
		},

		lmbReleased = function( ev ) {
			unhandle( canvas, 'mouseup', lmbReleased );
			unhandle( canvas, 'mousemove', lmbDownMove );
			iMouse[ 2 ] = 0;
			iMouse[ 3 ] = 0;
		},

		camMouseMove = function( ev ) {
			var dx = ev.movementX || ev.mozMovementX || 0,
				dy = ev.movementY || ev.mozMovementY || 0,

				s = 3 / win.screen.width;

			camVelG[ 0 ] -= s * dy;
			camVelG[ 1 ] -= s * dx;

		},

		camKeyDown = function( ev ) {

			switch ( ev.code ) {
				case 'KeyW': camAccT[ 2 ] = -1; break;
				case 'KeyS': camAccT[ 2 ] = +1; break;
				case 'KeyD': camAccG[ 1 ] = -1; break;
				case 'KeyA': camAccG[ 1 ] = +1; break;
				case 'KeyZ': camAccT[ 0 ] = -1; break;
				case 'KeyC': camAccT[ 0 ] = +1; break;
				case 'KeyQ': camAccG[ 2 ] = +1; break;
				case 'KeyE': camAccG[ 2 ] = -1; break;
				case 'ArrowLeft':
					camFovD = Math.min( camFovD + 1, 160 );
					break;
				case 'ArrowRight':
					camFovD = Math.max( camFovD - 1, 20 );
					break;
				case 'ArrowUp':
					camConv += 0.05; break;
				case 'ArrowDown':
					camConv = Math.max( camConv - 0.05, 0.05 );
					break;
				case 'NumpadAdd':
					camEyes = Math.min( camEyes + 0.001, 0.125 );
					break;
				case 'NumpadSubtract':
					camEyes = Math.max( camEyes - 0.001, 0.001 );
					break;
				case 'KeyY':
					camGlobalAxis[ 1 ] = ! camGlobalAxis[ 1 ];
					break;
			}

		},

		camKeyUp = function( ev ) {

			switch ( ev.code ) {
				case 'KeyS': case 'KeyW': camAccT[ 2 ] = 0; break;
				case 'KeyA': case 'KeyD': camAccG[ 1 ] = 0; break;
				case 'KeyZ': case 'KeyC': camAccT[ 0 ] = 0; break;
				case 'KeyQ': case 'KeyE': camAccG[ 2 ] = 0; break;
			}

		},

		leaveCamMode = function() {

			camMode = false;

			unhandle( canvas, 'mousemove', camMouseMove );
			unhandle( doc, 'keydown', camKeyDown );
			unhandle( doc, 'keyup', camKeyUp );

		},

		havePointerLock = false,

		pointerLockChange = function() {

			if ( havePointerLock ) leaveCamMode(); // unlocked

			havePointerLock = canvas === (
					doc.pointerLockElement || doc.mozPointerLockElement );

		};

	handle( doc, 'pointerlockchange', pointerLockChange );
	handle( doc, 'mozpointerlockchange', pointerLockChange );

	canvas.oncontextmenu = function() { return false; };

	handle( canvas, 'mousedown', function( ev ) {

		switch ( ev.buttons ) {

			case 1:

				if ( ! camMode ) {

					handle( canvas, 'mouseup', lmbReleased );
					handle( canvas, 'mousemove', lmbDownMove );

					iMouse[ 2 ] = iMouse[ 0 ];
					iMouse[ 3 ] = iMouse[ 1 ];

				}

				break;

			case 2:

				var d = doc,
					e = canvas;

				if ( ! camMode ) {

					camMode = true;

					handle( e, 'mousemove', camMouseMove );
					handle( doc, 'keydown', camKeyDown );
					handle( doc, 'keyup', camKeyUp );

					( e.requestPointerLock || e.mozRequestPointerLock ).call( e );

				} else if ( havePointerLock ) {

					( d.exitPointerLock || d.mozExitPointerLock ).call( d );

				} else leaveCamMode();

				break;

		}

	} );

	// Math for camera controller

	var a0 = al( 4 ), a1 = al( 4 ), a2 = al( 4 ),

		// cross product
		xpd = function( d, a, b ) {
			var t0 = a[ 1 ] * b[ 2 ] - a[ 2 ] * b[ 1 ],
				t1 = a[ 2 ] * b[ 0 ] - a[ 0 ] * b[ 2 ];
			d[ 2 ] = a[ 0 ] * b[ 1 ] - a[ 1 ] * b[ 0 ];
			d[ 0 ] = t0;
			d[ 1 ] = t1;
		},

		// dot product
		dot = function( a, b ) {
			return a[ 0 ] * b[ 0 ] + a[ 1 ] * b[ 1 ] + a[ 2 ] * b[ 2 ];
		},

		// add scaled vector
		asv = function( d, v, s ) {
			d[ 0 ] += v[ 0 ] * s; d[ 1 ] += v[ 1 ] * s; d[ 2 ] += v[ 2 ] * s;
		},

		// vector from vector
		vfv = function( d, v ) {
			sfc( d, v[ 0 ], v[ 1 ], v[ 2 ] );
		},

		// vector transform by quaternion
		vtq = function( v, q ) {
			xpd( a0, q, v );
			xpd( a1, q, a0 );
			asv( v, a0, 2 * q[ 3 ] );
			asv( v, a1, 2 );
		},

		// quaternion multiplication
		qxq = function( d, l, r ) {
			var lw = l[ 3 ], rw = r[ 3 ];
			d[ 3 ] = lw * rw - dot( l, r );
			xpd( d, l, r );
			asv( d, l, rw );
			asv( d, r, lw );
		},

		// quaternion from rotation
		qfr = function( d, n, a ) {
			a *= 0.5;
			sfc( d, 0, 0, 0 );
			if ( a ) asv( d, n, Math.sin( a ) );
			d[ 3 ] = Math.cos( a );
		},

		Axis = [
			[ 1, 0, 0 ],
			[ 0, 1, 0 ],
			[ 0, 0, 1 ]
		],

		// normalization
		nrm = function( v, n ) {

			var i, s = 0, l;
			for ( i = 0; i !== n; ++ i ) {
				var t = v[ i ];
				s += t * t;
			}
			l = Math.sqrt( s );
			s = 1 / l;
			for ( i = 0; i !== n; ++ i ) v[ i ] *= s;
			return l;

		};

	// Camera controller

	var camFrict = function( v, i, dtf ) {

			var c = v[ i ], s = Math.sign( c );
			v[ i ] -= s * Math.min( c * s, dtf );

		},

		camRotate = function( d, q, dt, global ) {

			for ( var i = 0; i !== 3; ++ i ) {

				var a = camGlobalAxis[ i ] == global ? camVelG[ i ] * dt : 0;
				qfr( a2, Axis[ i ], a );
				qxq( i !== 1 ? d : q, i !== 1 ? q : d, a2 );

			}

		};


	camUpdate = function( dt ) {

		// Apply acceleration to velocity
		asv( camVelT, camAccT, dt );
		asv( camVelG, camAccG, dt );

		// Apply friction to velocity
		for ( var i = 0; i !== 3; ++ i ) {
			camFrict( camVelG, i, CamFrictG * dt );
			camFrict( camVelT, i, CamFrictT * dt );
		}

		// Apply gyratory velocity to orientation
		sfc( a0, 0, 0, 0, 1 );
		camRotate( a1, a0, dt, true );
		qxq( a0, a1, camHead );
		camRotate( camHead, a0, dt, false );
		nrm( camHead, 4 );

		// Apply translatory velocity to position
		vfv( a2, camVelT );
		vtq( a2, camHead );
		asv( camFrom, a2, dt );

	};

}


