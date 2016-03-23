
/** @define{boolean} */
export let ANGLER_EXPORT_API = false;

import Properties from './Properties';

if ( ! ANGLER_EXPORT_API ) {

	/** @interface @extends{Properties} */
	class IAnglerProperties { };

}

import MatrixController from './MatrixController';

import * as curve from '../math/curve';
import * as sensors from '../color/spectra/sensors';
import * as displays from '../color/spectra/displays';
import * as filters3d from '../color/spectra/filters3d';


if ( ANGLER_EXPORT_API ) {

	window[ 'angler' ] = {

		'ColorSpaces': {
			'XYZ_CIE31': curve.createFunction( sensors.XYZ_Wyman13 ),
			'RGB_Marguier06_A': curve.createFunction( sensors.RGB_Marguier06_A ),
			'RGB_Marguier06_B': curve.createFunction( sensors.RGB_Marguier06_B )
		},

		'Displays': {
			'LCD': curve.createFunctionArray( displays.LCD )
		},

		'Filters3D': {
			'Red': curve.createFunction( filters3d.Red ),
			'Cyan': curve.createFunction( filters3d.Cyan ),
			'Magenta': curve.createFunction( filters3d.Magenta ),
			'Green': curve.createFunction( filters3d.Green ),
			'Blue': curve.createFunction( filters3d.Blue ),
			'Yellow': curve.createFunction( filters3d.Yellow )
		},

		'MatrixController': MatrixController

	};

	var $ = MatrixController.prototype;
	$[ 'update' ] = $.update;

}
