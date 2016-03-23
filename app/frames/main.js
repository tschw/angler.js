var DatabaseName = 'brain_damager',

	DefaultConfig = '../default_config.json',

	DefaultFiles = [
		'../examples/Hand.png',
		'../examples/Color%20Test.png',
		'../examples/Re-Whitted.frag',
		'../examples/Truchet%20Tentacles%20(by%20WAHa_06x36).frag',
		'../examples/Apollonian%20(by%20Inigo%20Quilez).frag'
	],

	win = window,
	doc,

	handle = function( elem, evtName, func ) {

		elem.addEventListener( evtName, func, false );

	},

	haveWebGl;


// File list / interface to local database

var files = [],
	file = null,

	fakeDbIdCounter = 0,

	getFile = function( index, onDone ) {

		file = index;
		if ( onDone ) onDone();

	},

	addFile = function( blob, onDone ) {

		var i = files.length;
		if ( blob.id === undefined ) blob.id = ++ fakeDbIdCounter;
		files.push( blob );
		getFile( i, onDone );

	},

	delFile = function( index, onDone ) {

		files.splice( index, 1 );
		var n = files.length;
		getFile( index < n ? index : n ? n - 1 : null, onDone );

	},

	loadConfig = function( onDone ) {

		var req = new XMLHttpRequest();
		req.open( 'GET', DefaultConfig, true );
		req.responseType = 'json';
		req.onload = function() {

			var config = null;
			if ( req.status === 200 ) config = req.response;
			else console.warn( "MENU " + DefaultConfig + " not found" );
			onDone( config );

		};
		req.send();

	},

	saveConfig = function( state ) {
		// no-op unless reset when DB turns out available
	};


function menuStart() {

	console.log( "MENU initializing" );

	// Elements

	var bodyTags = doc.body.children;
		divMenu = bodyTags[ 0 ],
		divCont = bodyTags[ 1 ],

		contTags = divCont.children,
		ifrConf = contTags[ 0 ],
		ifrMain = contTags[ 1 ],

		menuTags = divMenu.children,
		btnPrev = menuTags[ 0 ],
		btnNext = menuTags[ 1 ],
		barFile = menuTags[ 2 ],
		btnConf = menuTags[ 3 ],
		btnDel	= menuTags[ 4 ];

	// Utility functions

	var myOrigin = new URL( doc.location ).origin,

		msg = function( ifrDst, obj ) {

			ifrDst.contentWindow.postMessage( obj, myOrigin );

		};

	// Component interaction

	var currentConfig = {},
		currentPlayerType = '',
		viewerIsReady = false,
		pendingBlob = null,
		fileId = -1,
		fileIdConf = -1,
		busy = true,

		dragNotice = barFile.innerHTML,

		alertFileUnsupported = function( name ) {

			alert( "File '" + name +
					"' can not be viewed. File removed from list." );

		},

		fileChanged = function() {

			var fileSpec = null,
				htmlTitleRollBack = dragNotice;

			have_valid_file: if ( file !== null ) {

				fileSpec = files[ file ];
				var fileName = fileSpec.name,
					fileBlob = fileSpec.blob;

				htmlTitleRollBack = barFile.innerHTML;
				barFile.innerHTML = fileName.replace( '<', '&lt;' );

				var ext = fileName.replace( /^.*\./, '' ),
					type = ext === 'frag' || ext === 'glsl' ? 'shadertoy' :
							fileBlob.type.replace( /\/.*$/, '' );

				switch ( type ) {

					case 'video':
					case 'shadertoy':

						if ( ! haveWebGl ) {

							alert( "This browser does not support WebGL " +
									"to view this file. " );

							break have_valid_file;

						}

					case 'image':

						break;

					default:

						delFile( file, fileChanged );
						alertFileUnsupported( fileName );
						return;

				}

				fileId = fileSpec.id;
				pendingBlob = fileBlob;

				if ( type !== currentPlayerType ) {

					console.log( "MENU loads viewer for type", type );

					viewerIsReady = false;
					currentPlayerType = type;
					ifrMain.src = 'viewer_' + type + '.html';

				}

				msg( ifrConf, { name: 'fileIdSelected', id: fileSpec.id } );
				return;

			}

			barFile.innerHTML = htmlTitleRollBack;
			busy = false;

		};

	handle( win, 'message', function( ev ) {

		var origin = ev.origin || ev.originalEvent.origin;
		if ( origin !== myOrigin ) return;

		var m = ev.data;

		switch ( m.name ) {

			case 'viewerStatus':

				var status = m.status;

				console.log( "MENU received viewerStatus", status );

				if ( status !== 'ready' ) {

					if ( status === 'ok' ) busy = false;
					else {
						delFile( file, fileChanged );
						alertFileUnsupported( files[ file ].name );
					}

					break;

				} else {

					// The 'ready' status signals that the viewer is ready
					// to receive messages, so config can be delivered now

					viewerIsReady = true;

					// --V--V--V--

				}

			case 'activeConfiguration':

				var conf = m.conf;

				if ( conf != null ) {

					if ( fileIdConf !== fileId )
						console.log( "MENU received first config for id", m.id );

					fileIdConf = m.id;
					currentConfig = conf;

				}

				if ( fileIdConf === fileId && viewerIsReady ) {

					if ( pendingBlob ) console.log( "MENU sends blob & config" );

					msg( ifrMain, { conf: currentConfig, blob: pendingBlob } );
					pendingBlob = null;

				}

				break;


			case 'completeConfiguration':

				saveConfig( m.data );

		}

	} );

	// User interface setup

	var browseClick = function( d ) {

			return function( ev ) {

				if ( file !== null && ! busy ) {

					busy = true;

					var n = files.length;
					getFile( ( ( file || 0 ) + n + d ) % n, fileChanged );

				}

			};

		};

	handle( btnPrev, 'click', browseClick( -1 ) );
	handle( btnNext, 'click', browseClick(  1 ) );
	handle( btnDel , 'click', function() {

		if ( file !== null && ! busy ) {

			busy = true;

			msg( ifrConf, { name: 'fileIdDeleted', id: fileId } );
			delFile( file, fileChanged );

		}

	} );

	handle( btnConf, 'click', function() {

		if ( ! busy ) ifrConf.className = ! ifrConf.className ? 'invis' : '';

	} );

	handle( divMenu, 'drop', function( ev ) {

		ev.preventDefault();

		if ( ! busy ) {

			busy = true;

			this.style.backgroundColor = null;

			var dt = ev.dataTransfer,
				fl = dt.files,
				n = fl.length;

			if ( ! n ) return;

			for ( var i = 0; i !== n; ++ i ) {

				var fileBlob = fl[ i ];
				addFile( { name: fileBlob.name, blob: fileBlob }, fileChanged );

			}

		}

	} );

	handle( divMenu, 'dragover', function( ev ) {
		ev.preventDefault();
	} );
	handle( divMenu, 'dragenter', function( ev ) {
		if ( ! busy ) this.style.backgroundColor = '#0F0';
	} );
	handle( divMenu, 'dragexit', function( ev ) {
		this.style.backgroundColor = null;
	} );

	loadConfig( function( data ) {

		if ( data !== null ) {

			file = null;
			var fileId = data.input.selected;

			for ( var i = 0, n = files.length; i !== n; ++ i )
			if ( files[ i ].id == fileId ) {
				file = i;
				break;
			}

			console.log( "MENU sends configure" );
			msg( ifrConf, { name: 'configure', data: data } );

		}

		if ( file === null && files.length !== 0 ) file = 0;

		if ( file !== null ) getFile( file, fileChanged );
		else busy = false;

	} );

}

// HTTP loader for default content

function loadDefaults() {

	var counter = DefaultFiles.length,
		loadedFiles = [];

	if ( ! counter ) {

		menuStart();

	} else {

		var fileAdded = function() {

				if ( ! -- counter ) menuStart();

			},

			addFiles = function() {

				counter = loadedFiles.length;

				for ( var i = 0, n = counter; i !== n; ++ i ) {

					var file = loadedFiles[ i ];

					if ( file ) {

						addFile( loadedFiles[ i ], fileAdded );

					} else {

						fileAdded();

					}

				}

			},

			loadFile = function( i, url ) {

				var req = new XMLHttpRequest();
				req.open( 'GET', url, true );
				req.responseType = 'blob';
				req.onload = function() {

					if ( req.status === 200 ) {

						console.log( "LOADER got", i, url );

						loadedFiles[ i ] = {
							blob: req.response,
							name: win.decodeURI( url.replace(/^.*\//, '' ) )
						};

					} else {

						console.warn( "LOADER http code", req.status, url );

					}

					if ( ! -- counter ) addFiles();

				};
				console.log( "LOADER requesting", i, url );
				req.send();

			};

		for ( var i = 0, n = counter; i !== n; ++ i )
			loadFile( i, DefaultFiles[ i ] );

	}

}


handle( win, 'load', function() {

	doc = win.document;

	// WebGL feature check

	var NoWebGlMessage = "This browser lacks WebGL support required for " +
			"video and animation features.",

		body = doc.body,
		testCanvas = doc.createElement( 'canvas' );

	body.appendChild( testCanvas );
	haveWebGl = !! testCanvas.getContext( 'webgl' );
	body.removeChild( testCanvas );
	testCanvas = null;

	if ( ! haveWebGl ) alert( NoWebGlMessage );

	// Database handling

	var NoDbMessage = "This browser lacks sufficient IndexedDB support to " +
				"remember the file list. IndexedDB may also be disabled by " +
				"certain privacy settings, such as turning off the browsing " +
				"history.",
		idb = win.indexedDB,
		db;

	if ( idb ) {

		var BlobStoreName = 'fileBlobs',
			ConfigStoreName = 'config',

			initDbInterface = function() {

				var doAddFile = addFile,
					doDelFile = delFile,
					doGetFile = getFile,
					doSaveConfig = saveConfig,
					doLoadConfig = loadConfig,

					getStore = function( opt_name ) {

						var name = opt_name || BlobStoreName,
							tx = db.transaction( name, 'readwrite' );
						return tx.objectStore( name );

					},

					disableDb = function() {

						addFile = doAddFile;
						delFile = doDelFile;
						getFile = doGetFile;
						saveConfig = doSaveConfig;
						loadConfig = doLoadConfig;

						alert( NoDbMessage );

					};

				addFile = function( blob, onDone ) {

					try {

						var req = getStore().add( blob ).onsuccess = function( ev ) {

							var id = ev.target.result;
							console.log( "DB file added", id );

							blob.id = id;
							doAddFile( blob, onDone );

						};

					} catch( e ) {

						disableDb();
						doAddFile( blob, onDone );

					}

				};

				delFile = function( index, onDone ) {

					var id = files[ index ].id;

					getStore().delete( id ).onsuccess = function( ev ) {

						console.log( "DB file removed", id );
						doDelFile( index, onDone );

					};

				};

				getFile = function( index, onDone ) {

					if ( index === null ) return doGetFile( index, onDone );

					var entry = files[ index ];
					if ( entry.blob ) {

						doGetFile( index, onDone );

					} else getStore().get( entry.id ).onsuccess = function( ev ) {

						files[ index ] = ev.target.result;
						doGetFile( index, onDone );

					};

				};

				saveConfig = function( state ) {

					getStore( ConfigStoreName ).
							put( state, 1 ).onsuccess = function() {

						console.log( "DB stored configuration" );

					};

				};

				loadConfig = function( onDone ) {

					var config = null;

					getStore( ConfigStoreName ).
							openCursor().onsuccess = function( ev ) {
						var cursor = ev.target.result;

						if ( cursor ) {

							config = cursor.value;
							cursor.continue();

						} else if ( config !== null ) {

							onDone( config );

						} else {

							doLoadConfig( onDone ); // loads the defaults

						}

					};

				};

				getStore().openCursor().onsuccess = function( ev ) {
					var cursor = ev.target.result;

					if ( cursor ) {

						var id = cursor.key;
						console.log( "DB read file key", files.length, id );
						files.push( { id: id } );

						cursor.continue();

					} else {
						// all keys read

						if ( files.length === 0 ) {
							// database is empty -> populate it with defaults

							loadDefaults();

						} else {

							menuStart();

						}

					}

				};

			},


			req = idb.open( DatabaseName, 1 );

		req.onsuccess = function( ev ) {

			console.log( "DB opened" );
			db = ev.target.result;

			initDbInterface();

		};

		req.onupgradeneeded = function( ev ) {

			console.log( "DB upgrade" );
			db = ev.currentTarget.result;

			db.createObjectStore( BlobStoreName,
						{ keyPath: 'id', autoIncrement: true } );

			db.createObjectStore( ConfigStoreName );

		};

		req.onerror = function() {

			idb = null;

			loadDefaults();
			alert( NoDbMessage );


		};

	} else {

		loadDefaults();
		alert( NoDbMessage );

	}

} );
