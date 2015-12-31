(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("leaflet"));
	else if(typeof define === 'function' && define.amd)
		define(["leaflet"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("leaflet")) : factory(root["leaflet"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var DataLayer = __webpack_require__(2);
	module.exports = L.DataLayer = DataLayer;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var Utils = __webpack_require__(3);

	/**
	 * This layer draws data on canvas tiles.
	 */
	var ParentLayer = L.GridLayer;
	var DataLayer = ParentLayer.extend({

	    /** Default options of this class. */
	    options : {

	        // Default size of a minimal clickable zone is 4x4 screen
	        // pixels.
	        resolution : 4,

	        // Show pointer cursor for zones associated with data
	        pointerCursor : true,

	    },

	    _drawSandboxImage : function(canvas, tilePoint) {
	        var ctx = canvas.getContext("2d");
	        ctx.strokeStyle = "#FF0000";
	        ctx.beginPath();
	        var d = 0;
	        ctx.arc(canvas.width / 2 - d, canvas.height / 2 - d, canvas.width / 2,
	                0, 2 * Math.PI);
	        ctx.stroke();

	        var textHeight = 15;
	        ctx.font = textHeight + "px Arial";
	        ctx.fillStyle = 'red';
	        var text = [ tilePoint.x, tilePoint.y, tilePoint.z ].join(':');
	        var textWidth = ctx.measureText(text).width;
	        var textX = (canvas.width - textWidth) / 2;
	        var textY = (canvas.height) / 2;
	        ctx.fillText(text, textX, textY);
	    },

	    createTile : function(tilePoint, done) {
	        var canvas = document.createElement('canvas');
	        var size = this.getTileSize();
	        canvas.width = size.x;
	        canvas.height = size.y;
	        this._drawSandboxImage(canvas, tilePoint);
	        // * get the tile bounding box
	        // * expand the bounding box
	        // * load all data for this bbox
	        // * iterate over all loaded entities and draw them
	        // - get the geometry type of the entity
	        // - points - draw a marker
	        // - lines - draw lines
	        // - poly lines - iterates over lines and draw them
	        // - polygon - draw lines, fill the area, get centroid and draw
	        // marker
	        // - multipolygon - iterate over polygons and draws them
	        // - collection - iterate over features and draws them
	        // * for each feature - translate coordinates geo -> pixels
	        // * for lines, polygons: simplify lines
	        // * to get polygon and line styles - call an external config
	        // - getStrokeStyle(resource, index) where index is a geometry
	        // position for multi- geometries
	        // - getFillStyle(resource, index)
	        // - getMarkerStyle(resource, index)
	        // *

	        // * use the code from the GeometryRenderer to visualize data
	        // GeometryRenderer translate geometry coordinates to pixels on
	        // canvas
	        // - "canvas" / "context" fields to change canvas parameters
	        // -
	        // - contains method drawLine, drawPolygon, drawMarker methods
	        // - GeometryXxx translates geographic coordinates to canvas
	        // coordinates
	        // - GeometryXxx loads styles for each resource from
	        // RendererConfig
	        // -

	        // this._drawSandboxImage(canvas, tilePoint);
	        setTimeout(done, 0);
	        // done(null, canvas);
	        return canvas;
	    },

	});

	module.exports = DataLayer;


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = {
	    extend : function extend(to) {
	        var len = arguments.length;
	        for (var i = 1; i < len; i++) {
	            var from = arguments[i];
	            for ( var key in from) {
	                if (from.hasOwnProperty(key)) {
	                    to[key] = from[key];
	                }
	            }
	        }
	    }
	};

/***/ }
/******/ ])
});
;