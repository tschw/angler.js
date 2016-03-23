handle( win, 'load', function() {

	var viewer = new AnaglyphShadertoyPlayer( canvas ),
		reader = new FileReader();

	handle( reader, 'load', function() {

		var customStatus;

		try {
			viewer.setSource( reader.result );
		} catch ( e ) {
			console.error( e.message || e, e.stack || "" );
			customStatus = 'error';
		}

		sendStatus( customStatus );

	} );

	var load = function( blob ) {

			// Firefox don't like this:
			//if ( reader.readyState === 2 ) reader.abort();
			reader.readAsText( blob );

		};

	setup( viewer, load );

} );

