
function InstanceForm( formElem, opt_options ) {

	var data = [],
		nullRecord = {};

	this._table = data;
	this._selectedId = null;
	this._nullRecord = nullRecord;
	this._selectedRecord = nullRecord;

	this._state = { tableData: data, selected: null };

	var options = opt_options || {};

	this.onSelect = options.onSelect || null;
	this.onUpdate = options.onUpdate || null;
	this.onDelete = options.onDelete || null;
	this.onInsert = options.onInsert || null;

	var optSelId = options.selId,
		optInpName = options.inpName,
		optBtnNew = options.btnNew,
		optBtnDel = options.btnDel,

		formElems = formElem.elements;

	if ( optSelId === undefined ) optSelId = formElems[ 'id' ];
	if ( optInpName === undefined ) optInpName = formElems[ 'name' ];
	if ( optBtnNew === undefined ) optBtnNew = formElems[ 'new' ];
	if ( optBtnDel === undefined ) optBtnDel = formElems[ 'del' ];

	var iuidField = optSelId && optSelId.name || 'id',
		nameField = optInpName && optInpName.name || iuidField;

	this._index = {};
	this._nameIndex = nameField !== iuidField ? {} : null;

	this._iuidField = iuidField;
	this._nameField = nameField !== iuidField ? nameField : null;

	var elems = [];

	this._formElem = formElem;
	this._inputElems = elems;
	this._selId = optSelId || null;
	this._inpName = optInpName || null;

	this._neverNull = ! ( options.allowNull || false );
	this._iuidCounter = 0;

	var optReserved = options.reserved,

		handle = function( elem, evName, func ) {
			elem.addEventListener( evName, func );
		},

		thiz = this,
		inpHandler = function( ev ) { thiz.updateSelected(); };

	if ( optSelId ) {

		var selHandler = function( ev ) {
				var id = this.value;
				thiz.select( id !== '' ? id : null );
			};

		handle( optSelId, 'change', selHandler );
		handle( optSelId, 'keyup', selHandler );

	}

	if ( optInpName ) {

		var rollBackVal = null;

		handle( optInpName, 'focus', function( ev ) {

			if ( rollBackVal === null ) rollBackVal = this.value;

		} );

		handle( optInpName, 'blur', function( ev ) {

			try {

				thiz.updateSelected();
				rollBackVal = null;

				var style = this.style;
				style.borderColor = '';
				if ( optSelId ) {
					var selStyle = optSelId.style;
					if ( selStyle.display === 'none' ) {
						selStyle.display = '';
						style.display = 'none';
					}
				}

			} catch ( e ) {

				this.style.borderColor = 'red';

				optInpName.focus();
				window.setTimeout( function() { optInpName.focus() }, 20 );

			}

		} );

		optInpName.autocomplete = 'off';

		handle( optInpName, 'keydown', function( ev ) {

			switch ( ev.keyCode ) {
				case 27: // ESC
					this.value = rollBackVal;
				case 13: // Enter
					this.blur();
					ev.preventDefault();
					break;
			}

		} );

		if ( optSelId && optInpName.style.display === 'none' ) {

			handle( optSelId, 'mousedown', function( ev ) {

				if ( ev.buttons === 1 && ev.target === this
						&& ev.offsetX < this.offsetWidth - 22 ) {

					this.style.display = 'none';
					rollBackVal = optInpName.value;
					optInpName.style.display = '';
					optInpName.focus();
					optInpName.select();
					ev.preventDefault();
					ev.stopImmediatePropagation();

				}

			} );

		}

	}

	if ( optBtnNew ) handle( optBtnNew, 'click',
			function( ev ) { ev.preventDefault(); thiz.selectNew(); } );

	if ( optBtnDel ) handle( optBtnDel, 'click',
			function( ev ) { ev.preventDefault(); thiz.deleteSelected(); } );

	for ( var i = 0, n = formElems.length; i !== n; ++ i ) {

		var elem = formElems[ i ];
		if ( ! elem.name || elem === optSelId ||
				optReserved && optReserved.indexOf( elem ) !== -1 ) continue;

		var evName = 'input',
			prop = 'value',
			num = false;

		switch ( elem.type ) {

			case 'submit':
			case 'button':

				continue;

			case 'select-one':

				evName = 'change';
				handle( elem, 'keyup', inpHandler );
				break;

			case 'checkbox':

				evName = 'change';
				prop = 'checked';
				// ---V--V--V--- 0 or 1 instead of lengthy false and true

			case 'number':
			case 'range':

				num = true;

		}

		if ( elem !== optInpName ) handle( elem, evName, inpHandler );
		elems.push( { elem: elem, prop: prop, num: num } );

	}

	if ( this._neverNull ) this.selectNew();

}


InstanceForm.prototype = {

	constructor: InstanceForm,

	selectNew: function( opt_id ) {

		var id = opt_id;

		if ( id == null ) {

			var nameIndex = this._nameIndex,
				index = nameIndex || this._index,
				prefix = this._formElem.getAttribute( 'name' ) || '',
				ord = 0,
				name;

			if ( prefix.length !== 0 ) prefix += ' ';

			do {
				name = prefix + ( ++ ord < 10 ? '0' + ord : ord );
			} while ( name in index );

			var inpName = this._inpName;
			if ( inpName !== null ) inpName.value = name;

			id = nameIndex ? ++ this._iuidCounter + '' : name;

		}

		this.insert( id );
		this.select( id );

	},

	deleteSelected: function() {

		var id = this._selectedId;
		if ( id !== null ) this.delete( id );

	},

	insert: function( id ) {

		var index = this._index;

		if ( id === '' || id == null || id in index )
			throw new Error( "id empty or not unique" );

		var table = this._table,
			recIdx = table.length,
			record = {};

		this._checkInsertName( record, recIdx );
		this._getRecordState( record );

		record[ this._iuidField ] = id;

		index[ id ] = recIdx;
		table.push( record );

		this._updateOptions();

		this._notifyListeners( this.onInsert, id, record );

	},

	delete: function( id ) {

		var table = this._table,
			index = this._index,
			i = index[ id ];

		if ( i === undefined ) throw new Error( "no such record" );

		var l = table.length - 1,
			record = table[ i ],
			relocd = table[ l ];

		table[ i ] = relocd;
		table.pop();

		var nameIndex = this._nameIndex;
		if ( nameIndex !== null ) {

			var nameField = this._nameField;

			nameIndex[ relocd[ nameField ] ] = i;
			delete nameIndex[ record[ nameField ] ];

		}

		index[ relocd[ this._iuidField ] ] = i;
		delete index[ id ];

		this._notifyListeners( this.onDelete, id, record );

		var select = this._selId,
			selected = this._selectedId;

		if ( this._neverNull && l === 0 ) {

			this._formElem.reset();
			this.selectNew();

		} else if ( select !== null ) {

			this._updateOptions();

			this.select( id !== selected ?
					selected : ( select.value || null ) );

		} else if ( id === selected ) {

			this.select( null );

		}

	},

	select: function( id, requireRecord ) {

		var record = this.getRecord( id, requireRecord, true );
		if ( record === undefined ) return false;

		var prevId = this._selectedId;

		if ( id !== prevId ) {

			this._selectedId = id;
			this._selectedRecord = record;

			var select = this._selId;

			if ( id !== null ) {

				if ( select !== null ) select.value = id;

				this._updateElems( record );

			} else {

				if ( select !== null ) select.value = '';

				this._doUpdate( id, record );

			}

			this._notifyListeners( this.onSelect, id, this._selectedRecord );

		}

		return true;

	},

	updateSelected: function() {

		this._doUpdate( this._selectedId, this._selectedRecord );

	},

	update: function( id ) {

		this._doUpdate( id, this.getRecord( id, true, true ) );

	},

	_doUpdate: function( id, record ) {

		var renamed = id !== null &&
				this._checkInsertName( record, this._index[ id ] );

		this._getRecordState( record );

		if ( renamed ) {

			this._updateOptions();

			var select = this._selId;
			if ( select !== null ) select.value = id;

		}

		this._notifyListeners( this.onUpdate, id, record );

	},

	getSelectedId: function() {

		return this._selectedId;

	},

	getRecord: function( id, requireRecord, requireId ) {

		if ( id === undefined ) {

			if ( requireId ) throw new Error( "missing id" );
			return this._selectedRecord;

		}

		if ( id === null ) return this._nullRecord;

		var i = this._index[ id ];

		if ( i === undefined ) {

			if ( requireRecord ) throw new Error( "no such record" );
			return undefined;

		}

		return this._table[ i ];

	},

	getAllIds: function() {

		return Object.keys( this._index );

	},

	getState: function() {

		var state = this._state;
		state.selected = this._selectedId;
		return state;

	},

	setState: function( state ) {

		var iuidField = this._iuidField,
			nameField = this._nameField,

			tableData = state.tableData,
			selected = state.selected,

			index = {},
			nameIndex = nameField !== null ? {} : null;

			iuidValue = 0;

		for ( var i = 0, n = tableData.length; i !== n; ++ i ) {

			var record = tableData[ i ];

			if ( iuidField !== null ) {

				var id = record[ iuidField ],
					numId = + id;

				if ( numId > iuidValue ) iuidValue = numId;

				if ( id === '' || id == null || id in index )
					throw new Error( "record #" + i + "." +
							iuidField + " empty, missing or not unique" );

				index[ id ] = i;

			}

			if ( nameField !== null ) {

				var name = record[ nameField ];

				if ( name === '' || name == null || name in nameIndex )
					throw new Error( "record #" + i + "." +
							nameField + " empty, missing or not unique" );

				nameIndex[ name ] = i;

			}

		}

		var selectId = state.selected;

		if ( selectId !== null && ! selected in index )
			throw new Error( "selected record is missing" );

		this._table = tableData;
		this._state.tableData = tableData;

		this._index = index;
		this._nameIndex = nameIndex;
		this._iuidCounter = iuidValue;

		this._updateOptions();

		this._selectedId = null;
		this.select( selected );

	},

	_checkInsertName: function( record, recIdx ) {

		var nameField = this._nameField;

		if ( nameField !== null ) {

			var oldName = record[ nameField ],
				newName = this._inpName.value,
				nameIndex = this._nameIndex;

			if ( oldName !== newName ) {

				if ( ! newName.trim() || newName in nameIndex )
					throw new Error( "name empty or not unique" );

				delete nameIndex[ oldName ];
				nameIndex[ newName ] = recIdx;

				return true;

			}

		}

		return false;

	},

	_getRecordState: function( record ) {
		// state of form elements -> record

		var elems = this._inputElems;

		for ( var i = 0, n = elems.length; i !== n; ++ i ) {

			var elemSpec = elems[ i ];

			var elem = elemSpec.elem,
				value = elem[ elemSpec.prop ];

			record[ elem.name ] = elemSpec.num ? + value : value;

		}

	},

	_updateElems: function( record ) {
		// state record -> form elements

		var elems = this._inputElems;

		for ( var i = 0, n = elems.length; i !== n; ++ i ) {

			var elemSpec = elems[ i ],
				elem = elemSpec.elem;

			elem[ elemSpec.prop ] = record[ elem.name ];

		}

	},

	_updateOptions: function() {
		// set of ids -> options of select field, if any

		var select = this._selId;

		if ( ! select ) return;

		var index = this._nameIndex || this._index,
			table = this._table,
			idField = this._iuidField,
			names = Object.keys( index ),
			options = select.children;

		names.sort();

		var i = 0, n;

		for ( n = names.length; i !== n; ++ i ) {

			var name = names[ i ],
				record = table[ index[ name ] ],
				id = record[ idField ],
				option = options[ i ];

			if ( ! option ) {

				option = document.createElement( 'option' );
				select.appendChild( option );

			}

			option.text = name;
			option.value = id;

		}

		for ( n = options.length; i < n; ++ i )
			select.removeChild( options[ i ] );

	},

	_notifyListeners: function( opt, id, record ) {

		if ( opt ) {

			if ( Array.isArray( opt ) )
				for ( var i = 0, n = opt.length; i !== n; ++ i )
					opt[ i ].call( this, id, record );

			else opt.call( this, id, record );

		}

	}

};
