function handle( elem, evtName, func ) {

	elem.addEventListener( evtName, func, false );

}

var win = window,

	LogConfigJson = false,
	LogActiveConfig = true;


handle( win, 'load', function() {

	var MillisIdleBeforeSave = 500,

		doc = win.document,
		myOrigin = new URL( doc.location ).origin,

		matrixController = new angler.MatrixController,
		activeConfig = {},

		saveTime = null,

		noAnaglyph = 0,

		ReIsXYZ = /^XYZ/,

		sendConfig = function() {

			var d = display.getRecord(),
				g = glasses.getRecord(),
				m = method.getRecord(),
				i = input.getRecord(),
				w = weighting.getRecord(),

				reverseStereo = i.reverseStereo | 0,

				filters = g.colorFilters.split( '-' ),
				lFilterName = filters[ 0 ],
				rFilterName = filters[ 1 ];

			matrixController.spectrumDisplay = angler.Displays[ d.spectrum ];
			matrixController.spectrumFilterL = angler.Filters3D[ lFilterName ];
			matrixController.spectrumFilterR = angler.Filters3D[ rFilterName ];

			matrixController.filterBalance = g.filterBalance;
			matrixController.filterOpacity = g.filterOpacity;

			var colorSpaceName = m.colorSpace;
			matrixController.colorSpace = angler.ColorSpaces[ colorSpaceName ],
			matrixController.colorSpaceIsXYZ = ReIsXYZ.test( colorSpaceName );

			matrixController.duboisNormalization = m.duboisNormalization;

			matrixController.hueImportance 	= w.hueImportance;
			matrixController.colorization	= w.colorization;
			matrixController.hueOverdrive   = w.hueOverdrive;
			matrixController.colorFusion 	= w.colorFusion;
			matrixController.separationL 	= w.separationL;
			matrixController.separationR 	= w.separationR;

			matrixController.update();

			activeConfig.colorLeft = ! reverseStereo ?
					matrixController.encoderL : matrixController.encoderR;

			activeConfig.colorRight = ! reverseStereo ?
					matrixController.encoderR : matrixController.encoderL;

			activeConfig.aspectCorrection = i.aspectNumerator / i.aspectDenominator;
			activeConfig.noAnaglyph = noAnaglyph;
			activeConfig.disparity = i.disparity;
			activeConfig.perEyeClamping = m.perEyeClamping;
			activeConfig.ignoreGamma = m.ignoreGamma;

			win.parent.postMessage( {

				name: 'activeConfiguration',

				conf: activeConfig,
				id: inputId

			}, myOrigin );

			activeConfigChanged = false;

		},

		timer = function() {

			if ( activeConfigChanged ) sendConfig();

			if ( saveTime !== null ) {

				if ( Date.now() > saveTime ) {

					saveTime = null;

					console.log( "CONF sending full configuration" );

					var fullConfig = {

						version: 1,

						input: input.getState(),
						display: display.getState(),
						glasses: glasses.getState(),
						method: method.getState(),
						weighting: weighting.getState()

					};

					win.parent.postMessage( {

						name: 'completeConfiguration',
						data: fullConfig

					}, myOrigin );

					console.log( "CONF full configuration sent" );

					if ( LogConfigJson )
						console.log( JSON.stringify( fullConfig ) );

					if ( LogActiveConfig )
						console.log( JSON.stringify( activeConfig ) );

				} else {

					win.requestAnimationFrame( timer );

				}

			}

		},

		fileIdSelected,
		fileIdDeleted;

		configure = function( data ) {

			input.setState( data.input );
			display.setState( data.display );
			glasses.setState( data.glasses );
			method.setState( data.method );
			weighting.setState( data.weighting );

			fileIdSelected( data.input.selected );

		},

		requestSaveConfig = function() {

			var pending = saveTime !== null;
			saveTime = Date.now() + MillisIdleBeforeSave;
			if ( ! pending ) win.requestAnimationFrame( timer );

		},

		onUpdate = function() {

			activeConfigChanged = true;
			requestSaveConfig();

		};


	// Messaging incoming

	handle( win, 'message', function( ev ) {

		var origin = ev.origin || ev.originalEvent.origin;
		if ( origin !== myOrigin ) return;

		var msg = ev.data;

		switch ( msg.name ) {

			case 'configure':

				console.log( "CONF received configure" );
				configure( msg.data );

				break;

			case 'fileIdSelected':

				console.log( "CONF received fileIdSelected", msg.id );
				fileIdSelected( msg.id );

				sendConfig();
				requestSaveConfig();

				break;

			case 'fileIdDeleted':

				console.log( "CONF received fileIdDeleted", msg.id );
				fileIdDeleted( msg.id );
				requestSaveConfig();

				break;

		}

	} );

	// UI setup

	var forms = doc.forms,

		inputForm = forms[ 'Input' ],
		inputFormElems = inputForm.elements,
		chkFileWeights = inputFormElems[ 'fileWeights' ],
		chkNoAnaglyph = inputFormElems[ 'noAnaglyph' ],
		input = new InstanceForm( inputForm,
				{ allowNull: true, reserved: [ chkNoAnaglyph ] } ),

		displayForm = forms[ 'Display' ],
		selDplSpectrum = displayForm.elements[ 'spectrum' ],
		display = new InstanceForm( displayForm );

		glassesForm = forms[ 'Glasses' ],
		glasses = new InstanceForm( glassesForm ),

		methodForm = forms[ 'Method' ],
		selColorSpace = methodForm.elements[ 'colorSpace' ],
		method = new InstanceForm( methodForm ),

		weightingForm = forms[ 'Weighting' ],
		weightingFormElems = weightingForm.elements,
		chkSaveChanges = weightingFormElems[ 'saveChanges' ],
		btnSaveChanges = weightingFormElems[ 'saveNow' ],
		chkPauseUpdate = weightingFormElems[ 'pauseUpdate' ],
		btnLoadUiState = weightingFormElems[ 'loadNow' ],
		weighting = new InstanceForm( weightingForm, { allowNull: true,
				reserved: [ chkSaveChanges, chkPauseUpdate ] } ),

		populateSelect = function( elem, map ) {

			var names = Object.keys( map );
			names.sort();

			for ( var i = 0, n = names.length; i !== n; ++ i ) {

				var name = names[ i ],
					option = document.createElement( 'option' );
				option.innerHTML = name;
				option.value = name;
				elem.appendChild( option );

			}

		},

		weightingUnsaved = false,

		getLabels = function( elem ) {

			var result = elem.labels; // not all browsers implement it

			if ( ! result ) {

				var formLabels = elem.form.getElementsByTagName( 'label' );
				result = [];

				for ( var i = 0, n = formLabels.length; i !== n; ++ i ) {

					var label = formLabels[ i ];
					if ( label.control === elem ) result.push( label );

				}

			}

			return result;

		}

		setElemDisabled = function( elem, disabled ) {

			if ( elem.disabled !== disabled ) {

				elem.disabled = disabled;

				var labels = getLabels( elem ),
					ReClass = /(?:^|\s)noedit(?:\s|$)/;

				for ( var i = 0, n = labels.length; i !== n; ++ i ) {

					var label = labels[ i ],
						lcn = label.className;

					if ( disabled ) {

						if ( ! ReClass.test( lcn ) )
							label.className = ( 'noedit ' + lcn ).trim();

					} else label.className = lcn.replace( ReClass, ' ' ).trim();

				}

			}

		},

		uiDeps = function() {

			if ( noAnaglyph ) return;

			var saveChanges = chkSaveChanges.checked;

			setElemDisabled( chkPauseUpdate, saveChanges );
			if ( saveChanges ) chkPauseUpdate.checked = false;

			var pauseUpdate = chkPauseUpdate.checked;

			setElemDisabled( btnSaveChanges,
					saveChanges || ! weightingUnsaved );

			setElemDisabled( btnLoadUiState,
					! pauseUpdate || ! weightingUnsaved );

			setElemDisabled( weightingFormElems[ 'hueOverdrive' ],
					weighting.getRecord().colorization === 0 );

		};

	populateSelect( selDplSpectrum, angler.Displays );// Anaglyph.Displays );
	display.updateSelected();

	populateSelect( selColorSpace, angler.ColorSpaces );//Anaglyph.ColorSpaces );
	method.updateSelected();

	// Entity management & custom logic

	var inputId = null,
		weightingId = null,

		selectOrCreateWeighting = function() {

			var perFileWeights = chkFileWeights.checked,
				saveChanges = chkSaveChanges.checked;

			if ( ! weighting.select( weightingId ) ) {

				load_defaults: {

					if ( perFileWeights ) {

						var shortId = weightingId.slice(
								0, weightingId.lastIndexOf( ':' ) );

						if ( weightingId === shortId ||
								weighting.select( shortId ) )

							break load_defaults;

					}

					weightingForm.reset();
					chkSaveChanges.checked = saveChanges;

				}

				weighting.selectNew( weightingId );

			}

			if ( ! saveChanges ) weighting.select( null );

			weightingUnsaved = false;
			uiDeps();

		},

		weightingIdChanged = function() {

			var parts = [ display.getSelectedId(),
					glasses.getSelectedId(), method.getSelectedId() ];

			if ( inputId !== null &&
					chkFileWeights.checked ) parts.push( inputId );

			var id = parts.join( ':' );

			if ( weightingId !== id ) {

				weightingId = id;
				if ( ! chkPauseUpdate.checked ) {

					selectOrCreateWeighting();

				} else {

					weightingUnsaved = true;
					uiDeps();

				}

			}

		},

		deleteDependentWeights = function( i, key ) {

			var ids = weighting.getAllIds();

			for ( var j = 0, n = ids.length; j !== n; ++ j ) {

				var id = ids[ j ],
					splitId = id.split( ':' );

				if ( splitId.length > i && splitId[ i ] === key )
					weighting.delete( id );

			}

		};

	handle( chkFileWeights, 'change', function() {

		if ( ! this.checked ) {

			deleteDependentWeights( 3, inputId );

		}

		weightingIdChanged();

	} );

	handle( chkSaveChanges, 'change', function() {

		if ( this.checked ) selectOrCreateWeighting();
		else {
			weighting.select( null );
			weightingUnsaved = false;
			uiDeps();
		}

	} );

	handle( chkPauseUpdate, 'change', function() {

		if ( ! this.checked ) selectOrCreateWeighting();
		else uiDeps();

	} );

	handle( btnSaveChanges, 'click', function( ev ) {

		ev.preventDefault();
		weighting.update( weightingId );
		weightingUnsaved = false;
		uiDeps();

	} );

	handle( btnLoadUiState, 'click', function( ev ) {

		ev.preventDefault();
		selectOrCreateWeighting();	// to load the state
		weighting.select( null ); 	// keep editing dummy record

	} );


	var updateWithUiDeps = function() { uiDeps(); onUpdate(); };

	handle( chkNoAnaglyph, 'change', function( ev ) {

		noAnaglyph = this.checked;

		var labels = doc.getElementsByTagName( 'label' ),

			unaffected = [ this,
				inputFormElems[ 'aspectNumerator' ],
				inputFormElems[ 'aspectDenominator' ]
			];

		for ( var i = 0, n = labels.length; i !== n; ++ i ) {

			var label = labels[ i ],
				input = label.control;

			if ( unaffected.indexOf( input ) === -1 ) {

				input.disabled = noAnaglyph;
				if ( noAnaglyph )
					label.className = 'noedit ' + label.className;
				else
					label.className = label.className.slice( 7 );

			}

		}

		updateWithUiDeps();

	} );

	input.onUpdate = onUpdate;

	display.onUpdate = onUpdate;
	glasses.onUpdate = onUpdate;

	method.onUpdate = updateWithUiDeps;

	weighting.onUpdate = function( id, record ) {

		if ( id === null && ! chkSaveChanges.checked ) weightingUnsaved = true;
		updateWithUiDeps();

	};

	weighting.onSelect = onUpdate;

	display.onSelect = weightingIdChanged;
	glasses.onSelect = weightingIdChanged;
	method.onSelect = weightingIdChanged;

	display.onDelete = deleteDependentWeights.bind( null, 0 );
	glasses.onDelete = deleteDependentWeights.bind( null, 1 );
	method.onDelete = deleteDependentWeights.bind( null, 2 );


	fileIdSelected = function( id ) {

		inputId = id;

		if ( ! input.select( id ) ) {

			var keep = chkNoAnaglyph.checked;
			inputForm.reset();
			chkNoAnaglyph.checked = keep;
			input.selectNew( id );

		}

		weightingIdChanged();

	};

	fileIdDeleted = function( id ) {

		if ( inputId === id ) inputId = null;
		input.delete( id );
		deleteDependentWeights( 3, id );

	};


	console.log( "CONF ready" );

} );

