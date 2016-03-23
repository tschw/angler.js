handle( win, 'load', function() {

	var image = new Image(),
		viewer = new AnaglyphImageViewer( image, canvas ),

		load = function( blob ) {

			image.src = win.URL.createObjectURL( blob );

		};

	handle( image, 'load', function() { sendStatus(); } );
	handle( image, 'error', function() { sendStatus( 'error' ); } );

	handle( image, 'loeadend', function() {

		win.URL.revokeObjectURL( this.src );

	} );

	setup( viewer, load );

} );
