handle( win, 'load', function() {

	var video = bodyTags[ 1 ],
		viewer = new AnaglyphVideoPlayer( video, canvas );

	var revokeVideoObjectUrl = function() {

			var url = video.src;
			if ( url ) {
				video.pause();
				delete video.src;
				win.URL.revokeObjectURL( url );
			}

		},

		load = function( blob ) {

			revokeVideoObjectUrl();
			video.src = win.URL.createObjectURL( blob );

		};

	handle( win, 'unload', revokeVideoObjectUrl );

	handle( video, 'loadeddata', function() { sendStatus(); } );
	handle( video, 'error', function() { sendStatus( 'error' ); } );

	handle( canvas, 'click', function() {
			if ( ! video.paused ) video.pause(); else video.play(); } );

	setup( viewer, load );

} );

