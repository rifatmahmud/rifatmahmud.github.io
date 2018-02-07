/**
 * Browserify/Node.js 'compatible' module emulation for browser
 *
 * use define() to wrap your modules
 * use require() inside define to require other modules
 *
 * @copyright  Copyright (c) 2014, Insidemaps, Inc
 * @author Original Author: Ib Green
 * @module  init-browser-environment
 */


(function () {
"use strict";

if ('undefined' === typeof window) {
	throw new Error ('Module browser-modules.js should only be called from a browser, not from node');
}

// Provide a dummy globals module so that modules can look for the insidemaps_ global in both Node and browser
window.global = window.global || {
	insidemaps_ : {},
	isNode : false,
	isBrowser : true,
};

if ( window.global.modules ) {
	throw new Error( 'Module browser-modules.js already included' );
}
window.global.modules = true;

//console.debug('INITIALIZING BROWSER MODULE EMULATION (REQUIRE)');


///////////////////////////////////////////////////////
// NODE PATH MODULE EMULATION
///////////////////////////////////////////////////////

var path = {

	sep : '/',

	delimiter : ':',

	join: function( path1, path2, path3, path4 ) {
		var newPath = path1;
		// Strip trailing slashes
		newPath.replace(/\/+$/, '');
		if (path2 !== undefined) {
			newPath += newPath.endsWith('/') ? path2 : '/' + path2;
		}
		if (path3 !== undefined) {
			newPath += newPath.endsWith('/') ? path3 : '/' + path3;
		}
		if ( path4 ) {
			throw new Error(' only 3 paths supported' );
		}
		return newPath;
	},

	normalize: function(origPath) {
		var parts = origPath.split('/');
		var finalParts = [];
		parts.forEach(function(part, i) {
			if (part === '.') return;
			if (part === '' && i > 0 && i < parts.length - 1) return;
			if (part === '..') return finalParts.pop();
			finalParts.push(part);
		});
		return finalParts.join('/');
	},

	basename: function( path, extension ) {
		path = path.split(/[\\/]/).pop();
		if ( path.endsWith( extension ) ) {
			path = path.slice(0, - extension.length );
		}
		return path;
	},

	// TODO - hacky implementation
	dirname: function (path) {
		var dirs = path.split(/[\\/]/);
		dirs.pop();
		var dirname = ''; // path[0] === '/' ? '/' : '';
		dirname += dirs.join('/');
		return dirname;
	},

	resolve : function( from, to, another ) {
		if ( another ) {
			throw new Error( 'path.resolve only supports two paths' );
		}

		var fromComponents = from.split( this.sep );
		var toComponents = to.split( this.sep );

		toComponents.forEach( function( dir ) {
			switch( dir ) {
				case '.' :
					// ignore
					break;
				case '..' :
					// Move one step up
					if ( fromComponents.length )
						fromComponents.pop();
					break;
				default :
					fromComponents.push( dir );
			}
		});

		return fromComponents.join('/');
	},

};



///////////////////////////////////////////////////////
// MODULE EMULATION module.exports, require (and provide)
///////////////////////////////////////////////////////


// Internal module map
var _moduleMap = {};
var _lastModule = '(no module provided yet)';


window.global.insidemaps_.provide = function( modulepath, definition, override ) {

	if (modulepath.indexOf('app/') === 0) {
		modulepath = modulepath.slice(4);
	}

	// index.js publishes as the containing directory, per Node.js conventions
	if ( path.basename( modulepath ) === 'index' ) {
		modulepath = path.dirname( modulepath );
	}

	if (_moduleMap[modulepath] === definition || _moduleMap[modulepath] === 'require-return-value-unused' ) {
		if ( ! override ) {
			console.warn ('Provide failed, called twice on "' + modulepath + '" with same definition');
		}
	}
	else if (_moduleMap[modulepath] !== undefined) {
		throw new Error ('Provide failed, module "' + modulepath + '" already registered with different definition');
	}
	_moduleMap[modulepath] = definition;

};


window.global.insidemaps_.require = function(modulepath) {

	switch ( path.basename( modulepath ) ) {
		case 'phpunserialize' :
			return undefined;
	}

	if (modulepath.indexOf('.') === 0) {
		modulepath = path.resolve( window.__dirname, modulepath );
	}

	if (modulepath.indexOf('app/') === 0) {
		modulepath = modulepath.slice(4);
	}

	if (_moduleMap[modulepath] === undefined) {
		throw new Error ('Require failed, module "' + modulepath + '" not defined');
	}

	return _moduleMap[modulepath];

};


// Browser definition of define
var define = function( modulePath, factory ) {
	var dirname = path.dirname( modulePath );
	window.__dirname = dirname;
	// if ( ( window.insidemaps || window.util ) && ! didWarn ) {
	// 	console.warn( 'Previous module ' + _lastModule + ' polluted global namespace. Detected in ' + dirname );
	// 	delete window.insidemaps;
	// 	delete window.util;
	// 	didWarn = true;
	// }

	var module = { exports : {} };
	factory( require, module.exports, module );
	provide( modulePath, module.exports );

};

global.insidemaps_.registerExternalLibraries = function() {
	console.warn( 'DEPRECATED, registering external libraries' );

	// 'Provide' the standard JavaScript library namespaces if previously included in the HTML file.
	if ('undefined' !== typeof Promise)  provide ('promise', Promise); // ES6 will not require 'require' on Promise
	if ('undefined' !== typeof $)        provide ('jquery', $);
	if ('undefined' !== typeof Parse)    provide ('parse', { Parse: Parse });
	if ('undefined' !== typeof angular)  provide ('angular', angular);
	if ('undefined' !== typeof TWEEN)    provide ('tween.js', TWEEN);
	if ('undefined' !== typeof dat)      provide ('dat.gui', dat);

	if ('undefined' !== typeof THREE)    provide ('three', THREE, true);
	if ('undefined' !== typeof ThreeBSP) provide ('ThreeCSG', ThreeBSP, true);
	// THREE examples and extensions
	if ('undefined' !== typeof THREE) {
		if ('undefined' !== typeof THREE.Projector) provide ('THREE.Projector', THREE.Projector);
		if ('undefined' !== typeof THREE.MTLLoader) provide ('THREE.MTLLoader', THREE.MTLLoader);
		if ('undefined' !== typeof THREE.StereoEffect) provide ('THREE.StereoEffect', THREE.StereoEffect);
		if ('undefined' !== typeof THREEx && 'undefined' !== typeof THREEx.RendererStats) provide ('threex.rendererstats', THREEx.RendererStats);
		if ('undefined' !== typeof Detector) provide ('THREE.Detector', Detector);
		if ('undefined' !== typeof Stats) provide ('stats.js', Stats);
	}

	// Browserify code needs to require modules even through they don't return useful values, if already included by scripts then just return empty object
	provide ('angular-route', {});
	provide ('angular-bootstrap', {});
	provide ('angular-dialog-service', {});
	provide ('angular-sanitize', {});
	provide ('ng-simplePagination', {});
	provide ('bootstrap', {});
	provide ('es6-shim', {});
};


global.insidemaps_.enableMockModules = function() {
	window.define = window.global.define = define;
	window.provide = window.global.insidemaps_.provide;
	window.require = window.global.insidemaps_.require;

	// Expose our nodejs path module replacement in the browser
	provide ( 'path', path );
};

/* Browserify doesn't work with this function, for now need to copy these statements into the apps
global.insidemaps_.initApplication = function( require ) {
	require( 'es6-shim' );
	window.Promise = require( 'when/es6-shim/Promise.browserify-es6' );
	window.$ = window.jQuery = require( 'jquery' );
};
*/

})();


// end of file
