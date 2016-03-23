'use strict';

function handle( elem, evName, func ) {
		elem.addEventListener( evName, func, false ); }

var win = window,
	doc = null,
	bodyTags = null,
	canvas = null,

	myOrigin;

handle( win, 'load', function() {

	doc = win.document;
	bodyTags = doc.body.children;
	canvas = bodyTags[ 0 ]; // canvas is first element in the body

} );

function sendStatus( opt_customStatus ) {
	// must be called when a file has been loaded
	// a custom status must be given to report an error

	win.parent.postMessage( { name: 'viewerStatus',
			status: opt_customStatus || 'ok' }, myOrigin );

}

function setup( viewer, load ) {
	// 'viewer' must provide
	// 		.render() - to render immediately
	// 		.update() - to get informed that the config changed
	// 		.<config-prop>s interested in
	// 'load' must be a callback function that takes a Blob

	myOrigin = new win.URL( doc.location ).origin;

	bodyTags = doc.body.children;
	canvas = bodyTags[ 0 ];

	handle( win, 'message', function( ev ) {

		var origin = ev.origin || ev.originalEvent.origin;
		if ( origin !== myOrigin ) return;

		var data = ev.data,
			conf = data.conf,
			blob = data.blob;

		for ( var k in conf )
			if ( k in viewer )
				viewer[ k ] = conf[ k ];

		if ( blob ) {

			console.log( "VIEWER received file blob" );
			load( blob );

		} else viewer.update();

	} );

	var resize = function() {

			canvas.width = this.innerWidth;
			canvas.height = this.innerHeight - canvas.offsetTop;

			viewer.render();
		};

	handle( win, 'resize', resize );
	resize.call( win );

	handle( canvas, 'dblclick', function() {

		var d = doc, m;

		if ( d.fullscreenElement ||
				d.msFullscreenElement ||
				d.mozFullScreenElement ||
				d.webkitFullscreenElement ) {

			m = d.exitFullscreen ||
				d.msExitFullscreen ||
				d.mozCancelFullScreen ||
				d.webkitExitFullscreen;

			m.call( d );

		} else {

			var e = canvas;

			m = e.requestFullscreen ||
				e.msRequestFullscreen ||
				e.mozRequestFullScreen ||
				e.webkitRequestFullscreen;

			if ( m ) m.call( e );

		}


	} );

	console.log( "VIEWER is ready" );
	sendStatus( 'ready' );

}
