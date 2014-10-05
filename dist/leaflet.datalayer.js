/*!
 * leaflet.datalayer v0.0.3 | License: MIT 
 * 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("leaflet"));
	else if(typeof define === 'function' && define.amd)
		define(["leaflet"], factory);
	else if(typeof exports === 'object')
		exports["leaflet.datalayer"] = factory(require("leaflet"));
	else
		root["leaflet.datalayer"] = factory(root["leaflet"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var DataLayer = __webpack_require__(2);

	DataLayer.IDataProvider = __webpack_require__(3);
	DataLayer.IDataRenderer = __webpack_require__(4);
	DataLayer.SimpleDataProvider = __webpack_require__(5);
	DataLayer.MarkersRenderer = __webpack_require__(6);
	DataLayer.IIndexedCanvas = __webpack_require__(7);
	DataLayer.MaskIndexedCanvas = __webpack_require__(8);
	DataLayer.P = DataLayer.Promise = L.Promise = __webpack_require__(9);
	DataLayer.DataUtils = __webpack_require__(10);

	module.exports = L.DataLayer = DataLayer;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var SimpleDataProvider = __webpack_require__(5);
	var MarkersRenderer = __webpack_require__(6);
	var P = __webpack_require__(9);

	/**
	 * This layer draws data on canvas tiles. This class uses the following
	 * parameters from the constructor: 1) 'dataProvider' is a IDataProvider
	 * instance allowing asynchronously load data for each tile; by default a
	 * SimpleDataProvider is used 2) 'dataRenderer' is a IDataRenderer instance
	 * responsible for data visualization on canvas tiles; by default a
	 * MarkersRenderer instance is used
	 */
	var DataLayer = L.TileLayer.Canvas.extend({

	    /** Default options of this class. */
	    options : {

	        // Default size of a minimal clickable zone is 4x4 screen pixels.
	        resolution : 4,

	        // Show pointer cursor for zones associated with data
	        pointerCursor : true,

	        // Asynchronous tiles drawing
	        async : false,

	        // Don't reuse canvas tiles
	        reuseTiles : false,

	        // Use a global (per layer) index of masks.
	        // Should be set to false if all data have individual
	        // reprensentations on the map.
	        reuseMasks : true
	    },

	    /**
	     * Initializes this layer
	     */
	    initialize : function(options) {
	        options.fillOpacity = options.opacity;
	        delete options.opacity;
	        var url = null;
	        L.TileLayer.Canvas.prototype.initialize.apply(this, url, options);
	        L.setOptions(this, options);
	        if (this.options.data) {
	            this.setData(this.options.data);
	        }
	    },

	    // --------------------------------------------------------------------
	    // Leaflet.ILayer/L.TileLayer.Canvas methods

	    /**
	     * This method is called when this layer is added to the map.
	     */
	    onAdd : function(map) {
	        this._map = map;
	        var dataRenderer = this._getDataRenderer();
	        dataRenderer.onAdd(this);
	        L.TileLayer.Canvas.prototype.onAdd.apply(this, arguments);
	        this.on('tileunload', this._onTileUnload, this);
	        this._initEvents('on');
	        this.redraw();
	    },

	    /**
	     * This method is called when this layer is removed from the map.
	     */
	    onRemove : function(map) {
	        this.off('tileunload', this._onTileUnload, this);
	        this._initEvents('off');
	        this._removeMouseCursorStyle();
	        L.TileLayer.Canvas.prototype.onRemove.apply(this, arguments);
	        var dataRenderer = this._getDataRenderer();
	        dataRenderer.onRemove(this);
	    },

	    /**
	     * Initializes container for tiles.
	     */
	    _initContainer : function() {
	        var initContainer = L.TileLayer.Canvas.prototype._initContainer;
	        initContainer.apply(this, arguments);
	        var pane = this._getDataLayersPane();
	        pane.appendChild(this._container);
	    },

	    /** Returns a pane containing all instances of this class. */
	    _getDataLayersPane : function() {
	        return this._map._panes.markerPane;
	    },

	    // --------------------------------------------------------------------
	    // Event management

	    /** Activates/deactivates event management for this layer. */
	    _initEvents : function(onoff) {
	        var events = 'click mouseover mouseout mousemove';
	        this._map.on(events, function(e) {
	            if (e.type === 'click') {
	                this._click(e);
	            } else {
	                this._move(e);
	            }
	        }, this);
	    },

	    /** Map click handler */
	    _click : function(e) {
	        var handled = false;
	        if (this.hasEventListeners('click')) {
	            var on = this._objectForEvent(e);
	            if (on.data) {
	                this.fire('click', on);
	                handled = true;
	            }
	        }
	        return handled;
	    },

	    /** Map move handler */
	    _move : function(e) {
	        // if (!this.hasEventListeners('mouseout')
	        // && !this.hasEventListeners('mouseover')
	        // && !this.hasEventListeners('mousemove'))
	        // return;
	        var handled = false;
	        var on = this._objectForEvent(e);
	        if (on.data !== this._mouseOn) {
	            if (this._mouseOn) {
	                if (this.hasEventListeners('mouseout')) {
	                    var data = on.data;
	                    on.data = this._mouseOn;
	                    this.fire('mouseout', on);
	                    on.data = data;
	                    handled = true;
	                }
	                this._removeMouseCursorStyle();
	            }
	            if (on.data) {
	                if (this.hasEventListeners('mouseover')) {
	                    this.fire('mouseover', on);
	                    handled = true;
	                }
	                this._setMouseCursorStyle();
	            }
	            this._mouseOn = on.data;
	        } else if (on.data) {
	            if (this.hasEventListeners('mousemove')) {
	                this.fire('mousemove', on);
	                handled = true;
	            }
	        }
	        return handled;
	    },

	    // --------------------------------------------------------------------

	    // Cursor style management

	    /**
	     * Checks if the cursor style of the container should be changed to pointer
	     * cursor
	     */
	    _setMouseCursorStyle : function() {
	        if (!this.options.pointerCursor)
	            return;
	        var container = this._getMapContainer();
	        if (!container._pointerCursorCount) {
	            container._pointerCursorCount = 1;
	            container.style.cursor = 'pointer';
	        } else {
	            container._pointerCursorCount++;
	        }
	    },

	    /** Removes cursor style from the map container */
	    _removeMouseCursorStyle : function() {
	        if (!this.options.pointerCursor)
	            return;
	        var container = this._getMapContainer();
	        if (container._pointerCursorCount) {
	            container._pointerCursorCount--;
	            if (container._pointerCursorCount === 0) {
	                container.style.cursor = '';
	                delete container._pointerCursorCount;
	            }
	        }
	    },

	    /** Returns a map container. */
	    _getMapContainer : function() {
	        return this._map._container;
	    },

	    // --------------------------------------------------------------------
	    // Data management

	    /**
	     * Returns the underlying data provider object (a IDataProvider instance).
	     */
	    _getDataProvider : function() {
	        if (!this.options.dataProvider) {
	            this.options.dataProvider = new SimpleDataProvider();
	        }
	        return this.options.dataProvider;
	    },

	    /** Sets the specified data and re-draws the layer. */
	    setData : function(data) {
	        var dataProvider = this._getDataProvider();
	        if (dataProvider.setData) {
	            dataProvider.setData(data);
	            if (this._map) {
	                this.redraw();
	            }
	        }
	    },

	    /**
	     * This method is called when a tile is removed from the map. It cleans up
	     * data associated with this tile.
	     */
	    _onTileUnload : function(evt) {
	        var canvas = evt.tile;
	        if (canvas._index) {
	            canvas._index.reset();
	            delete canvas._index;
	        }
	    },

	    /**
	     * This method is used to draw on canvas tiles. It is invoked by the parent
	     * L.TileLayer.Canvas class.
	     */
	    _redrawTile : function(canvas) {
	        var that = this;
	        var tilePoint = canvas._tilePoint;
	        var bbox = this._getTileBoundingBox(tilePoint);
	        var dataProvider = this._getDataProvider();
	        var dataRenderer = that._getDataRenderer();
	        return P.then(function() {
	            return dataProvider.loadData({
	                tilePoint : tilePoint,
	                bbox : bbox,
	            });
	        }).then(function(data) {
	            var tileSize = that._getTileSize();
	            var zoom = that._map.getZoom();
	            return dataRenderer.renderData({
	                tilePoint : tilePoint,
	                tileSize : tileSize,
	                zoom : zoom,
	                canvas : canvas,
	                data : data,
	                map : that._map
	            });
	        }).then(function(context) {
	            canvas._index = context;
	            that.tileDrawn(canvas);
	        }, function(err) {
	            try {
	                that._handleRenderError(canvas, tilePoint, err);
	            } finally {
	                that.tileDrawn(canvas);
	            }
	        });
	    },

	    /**
	     * Reports a rendering error
	     */
	    _handleRenderError : function(canvas, tilePoint, err) {
	        // TODO: visualize the error on the canvas
	        console.log('ERROR', err);
	    },

	    /**
	     * Returns a bounding box around a tile with the specified coordinates. This
	     * bounding box is used to load data to show on the tile. The returned
	     * bounding box is bigger than tile - it includes a buffer zone used to
	     * avoid clipping of rendered data. The size of the additional buffering
	     * zone is defined by the "IDataRenderer.getBufferZoneSize" method.
	     */
	    _getTileBoundingBox : function(tilePoint) {
	        var that = this;
	        var tileSize = that._getTileSize();
	        var nwPoint = tilePoint.multiplyBy(tileSize);
	        var sePoint = nwPoint.add(new L.Point(tileSize, tileSize));
	        var dataRenderer = this._getDataRenderer();
	        var bufferSize = dataRenderer.getBufferZoneSize();
	        bufferSize = L.point(bufferSize);
	        nwPoint = nwPoint.subtract(bufferSize);
	        sePoint = sePoint.add(bufferSize);
	        var nw = that._map.unproject(nwPoint);
	        var se = that._map.unproject(sePoint);
	        var bbox = new L.LatLngBounds(se, nw);
	        return bbox;
	    },

	    /**
	     * Returns a IDataRenderer renderer instance responsible for data
	     * visualization.
	     */
	    _getDataRenderer : function() {
	        if (!this.options.dataRenderer) {
	            this.options.dataRenderer = new MarkersRenderer({
	                map : this._map,
	                layer : this
	            });
	        }
	        return this.options.dataRenderer;
	    },

	    /**
	     * Returns an object from the internal index corresponding to the
	     * coordinates of the mouse event.
	     */
	    _objectForEvent : function(e) {
	        var latlng = e.latlng;
	        var map = this._map;
	        var point = map.latLngToLayerPoint(latlng);
	        point = point.add(map.getPixelOrigin());
	        var tileSize = this._getTileSize();
	        var tilePoint = point.divideBy(tileSize).floor();
	        var key = tilePoint.x + ':' + tilePoint.y;
	        var canvas = this._tiles[key];
	        var data;
	        if (canvas) {
	            var index = canvas._index;
	            if (index) {
	                var canvasX = point.x % tileSize;
	                var canvasY = point.y % tileSize;
	                data = index.getData(canvasX, canvasY);
	            }
	        }
	        e.data = data;
	        return e;
	    },

	});

	module.exports = DataLayer;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var P = __webpack_require__(9);
	var Utils = __webpack_require__(10);

	/**
	 * A common interface providing data for individual tiles. Used to
	 * synchronously/asynchronously load data to render on tiles.
	 */
	var IDataProvider = L.Class.extend({

	    /**
	     * This method loads and returns an array of objects to show on tile
	     * corresponding to the specified bounding box. This is a "do-nothing"
	     * method and it should be overload in subclasses.
	     * 
	     * @param options.bbox
	     *            bounding box for the tile; this bounding box includes a buffer
	     *            zone around the tile so it is (by default) bigger than area
	     *            corresponding to the tile
	     * @param options.tilePoint
	     *            an object with 'x' and 'y' fields defining position of the
	     *            tile
	     */
	    loadData : function(options) {
	        return P.resolve([]);
	    },

	});

	module.exports = IDataProvider;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var P = __webpack_require__(9);
	var MaskIndexedCanvas = __webpack_require__(8);
	var DataUtils = __webpack_require__(10);

	/**
	 * Instances of this class used to visualizing data on canvas.
	 */
	var DataRenderer = L.Class.extend({

	    /** Constructor of this class; initializes internal fields. */
	    initialize : function(options) {
	        L.setOptions(this, options);
	    },

	    // -----------------------------------------------------------------------
	    // Public methods used by the DataLayer class

	    /**
	     * Renders data specified in the options and returns a promise with the
	     * canvas context (an IIndexedCanvas instance).
	     * 
	     * @param options.data
	     *            an array of objects to render on a canvas
	     * @param options.canvas
	     *            the canvas where the data should be rendered
	     * @param options.tilePoint
	     *            an array with x/y position of the tile
	     * @param options.zoom
	     *            the current map zoom
	     * @param options.tileSize
	     *            the size of each tile
	     */
	    renderData : function(options) {
	        var that = this;
	        var context = that._newCanvasContext(options);
	        return P.then(function() {
	            return that._prepareContext(context);
	        }).then(function() {
	            var data = options.data || [];
	            DataUtils.forEach(data, function(d, i) {
	                that._drawFeature(d, context);
	            });
	        }).then(function() {
	            return context;
	        });
	    },

	    // -----------------------------------------------------------------------
	    // The following methods should be overloaded in subclasses

	    /**
	     * Returns an array with width and height in pixels of a buffer zone around
	     * each tile. This buffer zone is used to avoid clipping of elements (eg
	     * markers).
	     */
	    getBufferZoneSize : function() {
	        return [ 0, 0 ];
	    },

	    /**
	     * Prepares the specified context. This method could be overload to
	     * asynchronously load resources required to render data.
	     */
	    _prepareContext : function(context) {
	        return P.resolve();
	    },

	    /**
	     * Draws the specified resource on the given canvas context. This method
	     * should be overloaded in subclasses.
	     * 
	     * @param resource
	     *            the resource to render
	     * @param context
	     *            a canvas context
	     */
	    _drawFeature : function(resource, context) {
	    },

	    // -----------------------------------------------------------------------
	    // Internal methods

	    /** Creates and returns a canvas index (an IIndexedCanvas instance). */
	    _newCanvasContext : function(options) {
	        options = DataUtils.extend({}, options, {
	            maskIndex : this._getMaskIndex()
	        });
	        var index = new MaskIndexedCanvas(options);
	        return index;
	    },

	    /**
	     * This method returns an index keeping images and their corresponding
	     * masks.
	     */
	    _getMaskIndex : function() {
	        return this.options.maskIndex;
	    },

	    // --------------------------------------------------------------------
	    // Lifecycle methods used to initialize internal fields

	    /**
	     * This method is called when the parent layer is added to the map.
	     */
	    onAdd : function(layer) {
	        this._layer = layer;
	        this._map = layer._map;
	    },

	    /**
	     * This method is called when the paren layer is removed from the map.
	     */
	    onRemove : function(layer) {
	        delete this._layer;
	        delete this._map;
	    },

	});
	module.exports = DataRenderer;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var rbush = __webpack_require__(11);
	var IDataProvider = __webpack_require__(3);
	var DataUtils = __webpack_require__(10);
	var P = __webpack_require__(9);

	/**
	 * A simple data provider synchronously indexing the given data using an RTree
	 * index.
	 */
	var SimpleDataProvider = IDataProvider.extend({

	    /** Initializes this object and indexes the initial data set. */
	    initialize : function(options) {
	        this.options = options || {};
	        this.setData(this.options.data);
	    },

	    /** Sets and indexes the given data */
	    setData : function(data) {
	        this._indexData(data);
	    },

	    /**
	     * Loads and returns indexed data contained in the specified bounding box.
	     */
	    loadData : function(options) {
	        var that = this;
	        var data = that._searchInBbox(options.bbox);
	        return P.resolve(data);
	    },

	    /** Indexes the specified data array using a RTree index. */
	    _indexData : function(data) {
	        // Data indexing
	        this._rtree = rbush(9);
	        data = data || [];
	        var array = [];
	        var that = this;
	        DataUtils.forEach(data, function(d, i) {
	            var bbox = that._getBoundingBox(d);
	            if (bbox) {
	                var coords = that._toIndexKey(bbox);
	                coords.data = d;
	                array.push(coords);
	            }
	        });
	        this._rtree.load(array);
	    },

	    /** Searches resources in the specified bounding box. */
	    _searchInBbox : function(bbox, point) {
	        var coords = this._toIndexKey(bbox);
	        var array = this._rtree.search(coords);
	        array = this._sortByDistance(array, bbox);

	        var result = [];
	        DataUtils.forEach(array, function(arr, i) {
	            result.push(arr.data);
	        });
	        return result;
	    },

	    /**
	     * Sorts the given data array by Manhattan distance to the origin point
	     */
	    _sortByDistance : function(array, bbox, point) {
	        var lat = bbox.getNorth();
	        var lng = bbox.getEast();
	        var p = point ? [ point.lat, point.lng ] : [ lat, lng ];
	        array.sort(function(a, b) {
	            var d1 = Math.abs(a[0] - p[0]) + Math.abs(a[1] - p[1]);
	            var d2 = Math.abs(b[0] - p[0]) + Math.abs(b[1] - p[1]);
	            return d1 - d2;
	        });
	        return array;
	    },

	    /**
	     * This method transforms a bounding box into a key for RTree index.
	     */
	    _toIndexKey : function(bbox) {
	        var sw = bbox.getSouthWest();
	        var ne = bbox.getNorthEast();
	        var coords = [ sw.lat, sw.lng, ne.lat, ne.lng ];
	        return coords;
	    },

	    /**
	     * Returns an object defining a bounding box ([[south, west], [north,
	     * east]]) for the specified resource.
	     */
	    _getBoundingBox : DataUtils.getGeoJsonBoundingBox,

	});

	module.exports = SimpleDataProvider;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var DataRenderer = __webpack_require__(4);
	var DataUtils = __webpack_require__(10);
	var P = __webpack_require__(9);

	/**
	 * A common interface visualizing data on canvas.
	 */
	var MarkersRenderer = DataRenderer.extend({

	    /** Initializes fields of this object. */
	    initialize : function() {
	        DataRenderer.prototype.initialize.apply(this, arguments);
	        this._markerCache = {};
	    },

	    /**
	     * Returns a buffer zone size (in pixels) around each tile.
	     */
	    getBufferZoneSize : function() {
	        var r = this._getRadius() * 2.5;
	        return [ r, r ];
	    },

	    /**
	     * Returns position (in pixels) of the specified geographic point on the
	     * canvas tile.
	     */
	    _getPositionOnTile : function(latlng, context) {
	        var map = this._map;
	        var layer = this._layer;
	        var tileSize = context.options.tileSize;
	        var tilePoint = context.options.tilePoint;
	        var p = map.project(latlng);
	        var s = tilePoint.multiplyBy(tileSize);
	        var x = Math.round(p.x - s.x);
	        var y = Math.round(p.y - s.y);
	        var result = L.point(x, y);
	        return result;
	    },

	    /**
	     * Draws the specified resource and returns an image with x/y position of
	     * this image on the tile. If this method returns nothing (or a
	     * <code>null</code> value) then nothing is drawn for the specified
	     * resource.
	     * 
	     * @return an object containing the following fields: a) 'image' - an Image
	     *         or Canvas instance with the drawn result b) 'anchor' a L.Point
	     *         object defining position on the returned image on the tile;
	     */
	    _drawFeature : function(resource, context) {
	        var geometry = resource.geometry;
	        if (!geometry)
	            return;
	        console.log(this._getResourceType(resource), ' => ',
	                resource.geometry.type);
	        this._drawResourceMarker(resource, context);
	    },

	    /** Draws the specified resource as a marker */
	    _drawResourceMarker : function(resource, context) {
	        var tilePoint = context.options.tilePoint;
	        var latlng = this._getCoordinates(resource);
	        if (!latlng) {
	            return;
	        }

	        var anchor = this._getPositionOnTile(latlng, context);
	        if (!anchor)
	            return;

	        var cacheKey = this._getMarkerCacheKey(resource, context);
	        var marker;
	        if (cacheKey) {
	            marker = this._markerCache[cacheKey];
	        }
	        if (!marker) {
	            marker = this._newResourceMarker(resource, context);
	            if (marker && marker.image && cacheKey) {
	                this._markerCache[cacheKey] = marker;
	            }
	        }
	        if (marker && marker.image) {
	            var markerAnchor = L.point(marker.anchor);
	            var pos = anchor.subtract(markerAnchor);
	            context.draw(marker.image, pos.x, pos.y, resource);
	        }
	    },

	    // -----------------------------------------------------------------
	    // All other methods are specific for resources corresponding to points
	    // on maps and used only by the _getBoundingBox and/or by _drawFeature
	    // methods.

	    /**
	     * Returns point a L.LatLng object with coordinates for the specified
	     * resource.
	     */
	    _getCoordinates : function(d) {
	        var bbox = DataUtils.getGeoJsonBoundingBox(d);
	        if (!bbox)
	            return null;
	        return bbox.getCenter();
	    },

	    /** Get the radius of markers. */
	    _getRadius : function(defaultValue) {
	        return this.options.radius || 16;
	    },

	    // --------------------------------------------------------------------
	    // Resource-specific methods

	    /**
	     * Returns a cache key specific for the given resource type and the current
	     * zoom level. This key is used to cache resource-specific icons for each
	     * zoom level.
	     */
	    _getMarkerCacheKey : function(resource, context) {
	        var zoom = context.options.zoom;
	        var type = this._getResourceType(resource);
	        var indexKey = zoom + ':' + type;
	        return indexKey;
	    },

	    /** Returns the type (as a string) of the specified resource. */
	    _getResourceType : function(resource) {
	        return 'resource';
	    },

	    /**
	     * Draws an icon and returns information about it as an object with the
	     * following fields: a) 'image' - an Image or a Canvas instance b) 'anchor'
	     * a L.Point instance defining the position on the icon corresponding to the
	     * resource coordinates
	     */
	    _newResourceMarker : function(resource, context) {
	        var radius = this._getRadius();
	        var canvas = document.createElement('canvas');
	        var options = this._getRenderingOptions(resource, context);
	        var lineWidth = options.lineWidth || 0;
	        var width = radius * 2;
	        var height = radius * 2;
	        canvas.height = height;
	        canvas.width = width;
	        radius -= lineWidth;
	        var g = canvas.getContext('2d');
	        g.fillStyle = options.fillColor || 'white';
	        g.globalAlpha = options.fillOpacity || 1;
	        g.strokeStyle = options.lineColor || 'gray';
	        g.lineWidth = lineWidth;
	        g.lineCap = 'round';
	        this._drawMarker(g, lineWidth, lineWidth, //
	        width - lineWidth * 2, height - lineWidth * 2, radius * 0.6);
	        g.fill();
	        g.stroke();
	        return {
	            image : canvas,
	            anchor : [ width / 2, height ]
	        };
	    },

	    /** Draws a simple marker */
	    _drawMarker : function(g, x, y, width, height, radius) {
	        g.beginPath();
	        // a
	        g.moveTo(x + width / 2, y);
	        // b
	        g.bezierCurveTo(//
	        x + width / 2 + radius / 2, y, //
	        x + width / 2 + radius, y + radius / 2, //
	        x + width / 2 + radius, y + radius);
	        // c
	        g.bezierCurveTo( //
	        x + width / 2 + radius, y + radius * 2, //
	        x + width / 2, y + height / 2 + radius / 3, //
	        x + width / 2, y + height);
	        // d
	        g.bezierCurveTo(//
	        x + width / 2, y + height / 2 + radius / 3, //
	        x + width / 2 - radius, y + radius * 2, //
	        x + width / 2 - radius, y + radius);
	        // e (a)
	        g.bezierCurveTo(//
	        x + width / 2 - radius, y + radius / 2, //
	        x + width / 2 - radius / 2, y + 0, //
	        x + width / 2, y + 0);
	        g.closePath();
	    },

	    /** Returns rendering options specific for the given resource. */
	    _getRenderingOptions : function(resource, context) {
	        return {};
	    },

	    /**
	     * This method returns an index keeping images and their corresponding
	     * masks.
	     */
	    _getMaskIndex : function() {
	        return this.options.maskIndex || {};
	    },
	});

	module.exports = MarkersRenderer;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);

	/**
	 * This utility class allows to associate data with non-transparent pixels of
	 * images drawn on canvas.
	 */
	var IIndexedCanvas = L.Class.extend({

	    /**
	     * Initializes internal fields of this class.
	     * 
	     * @param options.canvas
	     *            mandatory canvas object used to draw images
	     */
	    initialize : function(options) {
	        L.setOptions(this, options);
	        this._canvas = this.options.canvas;
	    },

	    /**
	     * Draws the specified image in the given position on the underlying canvas.
	     */
	    draw : function(image, x, y, data) {
	        // Draw the image on the canvas
	        var g = this._canvas.getContext('2d');
	        g.drawImage(image, x, y);
	    },

	    /**
	     * Returns data associated with the specified position on the canvas. This
	     * method should be overloaded in subclasses to return real values.
	     */
	    getData : function(x, y) {
	        var result = null;
	        return result;
	    },

	    /**
	     * Removes all data from internal indexes and cleans up underlying canvas.
	     */
	    reset : function() {
	        var g = this._canvas.getContext('2d');
	        g.clearRect(0, 0, this._canvas.width, this._canvas.height);
	    },
	});

	module.exports = IIndexedCanvas;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var IIndexedCanvas = __webpack_require__(7);

	/**
	 * This utility class allows to associate data with non-transparent pixels of
	 * images drawn on canvas.
	 */
	var MaskIndexedCanvas = IIndexedCanvas.extend({

	    /**
	     * Initializes internal fields of this class.
	     * 
	     * @param options.canvas
	     *            mandatory canvas object used to draw images
	     * @param options.resolution
	     *            optional resolution field defining precision of image areas
	     *            associated with data; by default it is 4x4 pixel areas
	     *            (resolution = 4)
	     */
	    initialize : function(options) {
	        IIndexedCanvas.prototype.initialize.apply(this, arguments);
	        var resolution = this.options.resolution || 4;
	        this.options.resolutionX = this.options.resolutionX || resolution;
	        this.options.resolutionY = this.options.resolutionY || //
	        this.options.resolutionX || resolution;
	        this._maskWidth = this._getMaskX(this._canvas.width);
	        this._maskHeight = this._getMaskY(this._canvas.height);
	        this._dataIndex = {};
	    },

	    /**
	     * Draws the specified image in the given position on the underlying canvas.
	     */
	    draw : function(image, x, y, data) {
	        IIndexedCanvas.prototype.draw.apply(this, arguments);
	        // Associate non-transparent pixels of the image with data
	        this._addToCanvasMask(image, x, y, data);
	    },

	    /**
	     * Returns data associated with the specified position on the canvas.
	     */
	    getData : function(x, y) {
	        var maskX = this._getMaskX(x);
	        var maskY = this._getMaskY(y);
	        var pos = maskY * this._maskWidth + maskX;
	        var result = this._dataIndex[pos];
	        return result;
	    },

	    /**
	     * Removes all data from internal indexes and cleans up underlying canvas.
	     */
	    reset : function() {
	        IIndexedCanvas.prototype.reset.apply(this, arguments);
	        this._dataIndex = {};
	    },

	    // ------------------------------------------------------------------
	    // Private methods

	    /**
	     * Adds all pixels occupied by the specified image to a data mask associated
	     * with canvas.
	     */
	    _addToCanvasMask : function(image, shiftX, shiftY, data) {
	        var mask = this._getImageMask(image);
	        var imageMaskWidth = this._getMaskX(image.width);
	        var maskShiftX = this._getMaskX(shiftX);
	        var maskShiftY = this._getMaskY(shiftY);
	        for (var i = 0; i < mask.length; i++) {
	            if (!mask[i])
	                continue;
	            var x = maskShiftX + (i % imageMaskWidth);
	            var y = maskShiftY + Math.floor(i / imageMaskWidth);
	            if (x >= 0 && x < this._maskWidth && y >= 0 && //
	            y < this._maskHeight) {
	                this._dataIndex[y * this._maskWidth + x] = data;
	            }
	        }
	    },

	    /**
	     * Returns a mask corresponding to the specified image.
	     */
	    _getImageMask : function(image) {
	        var maskIndex = this._getImageMaskIndex();
	        if (!maskIndex) {
	            return this._buildImageMask(image);
	        }
	        var imageId = this._getImageKey(image);
	        var mask = maskIndex[imageId];
	        if (!mask) {
	            mask = this._buildImageMask(image);
	            maskIndex[imageId] = mask;
	        }
	        return mask;
	    },

	    /**
	     * Returns a unique key of the specified image.
	     */
	    _getImageKey : function(image) {
	        return L.stamp(image);
	    },

	    /**
	     * This method maintain an index of image masks associated with the provided
	     * canvas. This method could be overloaded to implement a global index of
	     * image masks.
	     */
	    _getImageMaskIndex : function() {
	        return this.options.maskIndex;
	    },

	    /** Creates and returns an image mask. */
	    _buildImageMask : function(image) {
	        var canvas = this._newCanvas();
	        var g = canvas.getContext('2d');
	        canvas.width = image.width;
	        canvas.height = image.height;
	        g.drawImage(image, 0, 0);
	        var data = g.getImageData(0, 0, image.width, image.height).data;
	        var maskWidth = this._getMaskX(image.width);
	        var maskHeight = this._getMaskY(image.height);
	        var mask = new Array(image.width * image.height);
	        for (var y = 0; y < image.height; y++) {
	            for (var x = 0; x < image.width; x++) {
	                var idx = (y * image.width + x) * 4 + 3; // Alpha
	                // channel
	                var maskX = this._getMaskX(x);
	                var maskY = this._getMaskY(y);
	                mask[maskY * maskWidth + maskX] = data[idx] ? 1 : 0;
	            }
	        }
	        return mask;
	    },

	    /**
	     * Creates and returns a new canvas instance. Could be overloaded in
	     * subclasses.
	     */
	    _newCanvas : function() {
	        return document.createElement('canvas');
	    },

	    /**
	     * Transforms a X coordinate on canvas to X coordinate in the mask.
	     */
	    _getMaskX : function(x) {
	        var resolutionX = this.options.resolutionX;
	        return Math.round(x / resolutionX);
	    },

	    /**
	     * Transforms Y coordinate on canvas to Y coordinate in the mask.
	     */
	    _getMaskY : function(y) {
	        var resolutionY = this.options.resolutionY;
	        return Math.round(y / resolutionY);
	    }
	});

	module.exports = MaskIndexedCanvas;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	// A promise wrapper providing a switchable interface for promise implementations.
	// MIT license. (c) Ubimix (c) Mikhail Kotelnikov
	module.exports = P;
	function P(value) {
	    return P.resolve(value);
	}
	P.defer = function() {
	    var pinkyswear = __webpack_require__(12);
	    P.defer = function() {
	        var p = pinkyswear();
	        return {
	            promise : p,
	            resolve : function(value) {
	                p(true, [ value ]);
	            },
	            reject : function(reason) {
	                p(false, [ reason ]);
	            }
	        };
	    };
	    return P.defer();
	};
	P.then = function(onResolve, onReject) {
	    var deferred = P.defer();
	    deferred.resolve();
	    return deferred.promise.then(onResolve, onReject);
	};
	P.reject = function(value) {
	    var deferred = P.defer();
	    deferred.reject(value);
	    return deferred.promise;
	};
	P.resolve = function(value) {
	    var deferred = P.defer();
	    deferred.resolve(value);
	    return deferred.promise;
	};
	P.isPromise = function(result) {
	    return result && typeof result.then === 'function';
	};
	P._isArray = function(obj) {
	    P._isArray = (Array.isArray || function(obj) {
	        return Object.prototype.toString.call(obj) === '[object Array]';
	    });
	    return P._isArray(obj);
	};
	P.all = function(list) {
	    var deferred = P.defer();
	    list = P._isArray(list) ? list : arguments;
	    var len = list ? list.length : 0;
	    var results = [];
	    function end(error, result) {
	        results.push(result);
	        if (error) {
	            deferred.reject(error);
	        } else {
	            if (results.length === len) {
	                deferred.resolve(results);
	            }
	        }
	    }
	    function onResolve(result) {
	        end(null, result);
	    }
	    function onReject(err) {
	        end(err, null);
	    }
	    for (var i = 0; i < len; i++) {
	        list[i].then(onResolve, onReject);
	    }
	    if (len === 0) {
	        deferred.resolve(results);
	    }
	    return deferred.promise;
	};
	P.nresolver = function(deferred) {
	    return function(error, value) {
	        if (error) {
	            deferred.reject(error);
	        } else {
	            deferred.resolve(value);
	        }
	    };
	};
	P.ninvoke = function(object, name /* ...args */) {
	    var args = [];
	    for (var i = 2; i < arguments.length; i++) {
	        args.push(arguments[i]);
	    }
	    var deferred = P.defer();
	    args.push(P.nresolver(deferred));
	    try {
	        var f = (typeof name) == 'function' ? name : object[name];
	        f.apply(object, args);
	    } catch (e) {
	        deferred.reject(e);
	    }
	    return deferred.promise;
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);

	/** Static utility methods */
	module.exports = {

	    /** Iterates over all elements of an array and call the specified method. */
	    forEach : function(array, callback) {
	        if (array.forEach) {
	            array.forEach(callback);
	        } else {
	            var len = array ? array.length : 0;
	            for (var i = 0; i < len; i++) {
	                callback(array[i], i);
	            }
	        }
	    },

	    /** Extends the first object using all others defined as parameters. */
	    extend : function(obj) {
	        var result = arguments[0];
	        if (result) {
	            for (var i = 1; i < arguments.length; i++) {
	                var item = arguments[i];
	                if (!item)
	                    continue;
	                for ( var key in item) {
	                    if (item.hasOwnProperty(key)) {
	                        result[key] = item[key];
	                    }
	                }
	            }
	        }
	        return result;
	    },

	    /** Returns a bounding box for a GeoJson object. */
	    getGeoJsonBoundingBox : function(d) {
	        if (!d)
	            return null;
	        var geom = d.geometry;
	        if (!geom || !geom.coordinates)
	            return null;
	        var bbox;
	        if (geom.type == 'Point') {
	            var coords = geom.coordinates;
	            var point = L.latLng(coords[1], coords[0]);
	            bbox = L.latLngBounds(point, point);
	        } else {
	            var layer = L.GeoJSON.geometryToLayer(geom);
	            bbox = layer.getBounds();
	        }
	        return bbox;
	        // return [ [ bbox.getSouth(), bbox.getWest() ],
	        // [ bbox.getNorth(), bbox.getEast() ] ];
	    },

	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*
	 (c) 2013, Vladimir Agafonkin
	 RBush, a JavaScript library for high-performance 2D spatial indexing of points and rectangles.
	 https://github.com/mourner/rbush
	*/

	(function () { 'use strict';

	function rbush(maxEntries, format) {

	    // jshint newcap: false, validthis: true
	    if (!(this instanceof rbush)) return new rbush(maxEntries, format);

	    // max entries in a node is 9 by default; min node fill is 40% for best performance
	    this._maxEntries = Math.max(4, maxEntries || 9);
	    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));

	    if (format) {
	        this._initFormat(format);
	    }

	    this.clear();
	}

	rbush.prototype = {

	    all: function () {
	        return this._all(this.data, []);
	    },

	    search: function (bbox) {

	        var node = this.data,
	            result = [],
	            toBBox = this.toBBox;

	        if (!intersects(bbox, node.bbox)) return result;

	        var nodesToSearch = [],
	            i, len, child, childBBox;

	        while (node) {
	            for (i = 0, len = node.children.length; i < len; i++) {

	                child = node.children[i];
	                childBBox = node.leaf ? toBBox(child) : child.bbox;

	                if (intersects(bbox, childBBox)) {
	                    if (node.leaf) result.push(child);
	                    else if (contains(bbox, childBBox)) this._all(child, result);
	                    else nodesToSearch.push(child);
	                }
	            }
	            node = nodesToSearch.pop();
	        }

	        return result;
	    },

	    load: function (data) {
	        if (!(data && data.length)) return this;

	        if (data.length < this._minEntries) {
	            for (var i = 0, len = data.length; i < len; i++) {
	                this.insert(data[i]);
	            }
	            return this;
	        }

	        // recursively build the tree with the given data from stratch using OMT algorithm
	        var node = this._build(data.slice(), 0, data.length - 1, 0);

	        if (!this.data.children.length) {
	            // save as is if tree is empty
	            this.data = node;

	        } else if (this.data.height === node.height) {
	            // split root if trees have the same height
	            this._splitRoot(this.data, node);

	        } else {
	            if (this.data.height < node.height) {
	                // swap trees if inserted one is bigger
	                var tmpNode = this.data;
	                this.data = node;
	                node = tmpNode;
	            }

	            // insert the small tree into the large tree at appropriate level
	            this._insert(node, this.data.height - node.height - 1, true);
	        }

	        return this;
	    },

	    insert: function (item) {
	        if (item) this._insert(item, this.data.height - 1);
	        return this;
	    },

	    clear: function () {
	        this.data = {
	            children: [],
	            height: 1,
	            bbox: empty(),
	            leaf: true
	        };
	        return this;
	    },

	    remove: function (item) {
	        if (!item) return this;

	        var node = this.data,
	            bbox = this.toBBox(item),
	            path = [],
	            indexes = [],
	            i, parent, index, goingUp;

	        // depth-first iterative tree traversal
	        while (node || path.length) {

	            if (!node) { // go up
	                node = path.pop();
	                parent = path[path.length - 1];
	                i = indexes.pop();
	                goingUp = true;
	            }

	            if (node.leaf) { // check current node
	                index = node.children.indexOf(item);

	                if (index !== -1) {
	                    // item found, remove the item and condense tree upwards
	                    node.children.splice(index, 1);
	                    path.push(node);
	                    this._condense(path);
	                    return this;
	                }
	            }

	            if (!goingUp && !node.leaf && contains(node.bbox, bbox)) { // go down
	                path.push(node);
	                indexes.push(i);
	                i = 0;
	                parent = node;
	                node = node.children[0];

	            } else if (parent) { // go right
	                i++;
	                node = parent.children[i];
	                goingUp = false;

	            } else node = null; // nothing found
	        }

	        return this;
	    },

	    toBBox: function (item) { return item; },

	    compareMinX: function (a, b) { return a[0] - b[0]; },
	    compareMinY: function (a, b) { return a[1] - b[1]; },

	    toJSON: function () { return this.data; },

	    fromJSON: function (data) {
	        this.data = data;
	        return this;
	    },

	    _all: function (node, result) {
	        var nodesToSearch = [];
	        while (node) {
	            if (node.leaf) result.push.apply(result, node.children);
	            else nodesToSearch.push.apply(nodesToSearch, node.children);

	            node = nodesToSearch.pop();
	        }
	        return result;
	    },

	    _build: function (items, left, right, height) {

	        var N = right - left + 1,
	            M = this._maxEntries,
	            node;

	        if (N <= M) {
	            // reached leaf level; return leaf
	            node = {
	                children: items.slice(left, right + 1),
	                height: 1,
	                bbox: null,
	                leaf: true
	            };
	            calcBBox(node, this.toBBox);
	            return node;
	        }

	        if (!height) {
	            // target height of the bulk-loaded tree
	            height = Math.ceil(Math.log(N) / Math.log(M));

	            // target number of root entries to maximize storage utilization
	            M = Math.ceil(N / Math.pow(M, height - 1));
	        }

	        // TODO eliminate recursion?

	        node = {
	            children: [],
	            height: height,
	            bbox: null
	        };

	        // split the items into M mostly square tiles

	        var N2 = Math.ceil(N / M),
	            N1 = N2 * Math.ceil(Math.sqrt(M)),
	            i, j, right2, right3;

	        multiSelect(items, left, right, N1, this.compareMinX);

	        for (i = left; i <= right; i += N1) {

	            right2 = Math.min(i + N1 - 1, right);

	            multiSelect(items, i, right2, N2, this.compareMinY);

	            for (j = i; j <= right2; j += N2) {

	                right3 = Math.min(j + N2 - 1, right2);

	                // pack each entry recursively
	                node.children.push(this._build(items, j, right3, height - 1));
	            }
	        }

	        calcBBox(node, this.toBBox);

	        return node;
	    },

	    _chooseSubtree: function (bbox, node, level, path) {

	        var i, len, child, targetNode, area, enlargement, minArea, minEnlargement;

	        while (true) {
	            path.push(node);

	            if (node.leaf || path.length - 1 === level) break;

	            minArea = minEnlargement = Infinity;

	            for (i = 0, len = node.children.length; i < len; i++) {
	                child = node.children[i];
	                area = bboxArea(child.bbox);
	                enlargement = enlargedArea(bbox, child.bbox) - area;

	                // choose entry with the least area enlargement
	                if (enlargement < minEnlargement) {
	                    minEnlargement = enlargement;
	                    minArea = area < minArea ? area : minArea;
	                    targetNode = child;

	                } else if (enlargement === minEnlargement) {
	                    // otherwise choose one with the smallest area
	                    if (area < minArea) {
	                        minArea = area;
	                        targetNode = child;
	                    }
	                }
	            }

	            node = targetNode;
	        }

	        return node;
	    },

	    _insert: function (item, level, isNode) {

	        var toBBox = this.toBBox,
	            bbox = isNode ? item.bbox : toBBox(item),
	            insertPath = [];

	        // find the best node for accommodating the item, saving all nodes along the path too
	        var node = this._chooseSubtree(bbox, this.data, level, insertPath);

	        // put the item into the node
	        node.children.push(item);
	        extend(node.bbox, bbox);

	        // split on node overflow; propagate upwards if necessary
	        while (level >= 0) {
	            if (insertPath[level].children.length > this._maxEntries) {
	                this._split(insertPath, level);
	                level--;
	            } else break;
	        }

	        // adjust bboxes along the insertion path
	        this._adjustParentBBoxes(bbox, insertPath, level);
	    },

	    // split overflowed node into two
	    _split: function (insertPath, level) {

	        var node = insertPath[level],
	            M = node.children.length,
	            m = this._minEntries;

	        this._chooseSplitAxis(node, m, M);

	        var newNode = {
	            children: node.children.splice(this._chooseSplitIndex(node, m, M)),
	            height: node.height
	        };

	        if (node.leaf) newNode.leaf = true;

	        calcBBox(node, this.toBBox);
	        calcBBox(newNode, this.toBBox);

	        if (level) insertPath[level - 1].children.push(newNode);
	        else this._splitRoot(node, newNode);
	    },

	    _splitRoot: function (node, newNode) {
	        // split root node
	        this.data = {
	            children: [node, newNode],
	            height: node.height + 1
	        };
	        calcBBox(this.data, this.toBBox);
	    },

	    _chooseSplitIndex: function (node, m, M) {

	        var i, bbox1, bbox2, overlap, area, minOverlap, minArea, index;

	        minOverlap = minArea = Infinity;

	        for (i = m; i <= M - m; i++) {
	            bbox1 = distBBox(node, 0, i, this.toBBox);
	            bbox2 = distBBox(node, i, M, this.toBBox);

	            overlap = intersectionArea(bbox1, bbox2);
	            area = bboxArea(bbox1) + bboxArea(bbox2);

	            // choose distribution with minimum overlap
	            if (overlap < minOverlap) {
	                minOverlap = overlap;
	                index = i;

	                minArea = area < minArea ? area : minArea;

	            } else if (overlap === minOverlap) {
	                // otherwise choose distribution with minimum area
	                if (area < minArea) {
	                    minArea = area;
	                    index = i;
	                }
	            }
	        }

	        return index;
	    },

	    // sorts node children by the best axis for split
	    _chooseSplitAxis: function (node, m, M) {

	        var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX,
	            compareMinY = node.leaf ? this.compareMinY : compareNodeMinY,
	            xMargin = this._allDistMargin(node, m, M, compareMinX),
	            yMargin = this._allDistMargin(node, m, M, compareMinY);

	        // if total distributions margin value is minimal for x, sort by minX,
	        // otherwise it's already sorted by minY
	        if (xMargin < yMargin) node.children.sort(compareMinX);
	    },

	    // total margin of all possible split distributions where each node is at least m full
	    _allDistMargin: function (node, m, M, compare) {

	        node.children.sort(compare);

	        var toBBox = this.toBBox,
	            leftBBox = distBBox(node, 0, m, toBBox),
	            rightBBox = distBBox(node, M - m, M, toBBox),
	            margin = bboxMargin(leftBBox) + bboxMargin(rightBBox),
	            i, child;

	        for (i = m; i < M - m; i++) {
	            child = node.children[i];
	            extend(leftBBox, node.leaf ? toBBox(child) : child.bbox);
	            margin += bboxMargin(leftBBox);
	        }

	        for (i = M - m - 1; i >= m; i--) {
	            child = node.children[i];
	            extend(rightBBox, node.leaf ? toBBox(child) : child.bbox);
	            margin += bboxMargin(rightBBox);
	        }

	        return margin;
	    },

	    _adjustParentBBoxes: function (bbox, path, level) {
	        // adjust bboxes along the given tree path
	        for (var i = level; i >= 0; i--) {
	            extend(path[i].bbox, bbox);
	        }
	    },

	    _condense: function (path) {
	        // go through the path, removing empty nodes and updating bboxes
	        for (var i = path.length - 1, siblings; i >= 0; i--) {
	            if (path[i].children.length === 0) {
	                if (i > 0) {
	                    siblings = path[i - 1].children;
	                    siblings.splice(siblings.indexOf(path[i]), 1);

	                } else this.clear();

	            } else calcBBox(path[i], this.toBBox);
	        }
	    },

	    _initFormat: function (format) {
	        // data format (minX, minY, maxX, maxY accessors)

	        // uses eval-type function compilation instead of just accepting a toBBox function
	        // because the algorithms are very sensitive to sorting functions performance,
	        // so they should be dead simple and without inner calls

	        // jshint evil: true

	        var compareArr = ['return a', ' - b', ';'];

	        this.compareMinX = new Function('a', 'b', compareArr.join(format[0]));
	        this.compareMinY = new Function('a', 'b', compareArr.join(format[1]));

	        this.toBBox = new Function('a', 'return [a' + format.join(', a') + '];');
	    }
	};


	// calculate node's bbox from bboxes of its children
	function calcBBox(node, toBBox) {
	    node.bbox = distBBox(node, 0, node.children.length, toBBox);
	}

	// min bounding rectangle of node children from k to p-1
	function distBBox(node, k, p, toBBox) {
	    var bbox = empty();

	    for (var i = k, child; i < p; i++) {
	        child = node.children[i];
	        extend(bbox, node.leaf ? toBBox(child) : child.bbox);
	    }

	    return bbox;
	}

	function empty() { return [Infinity, Infinity, -Infinity, -Infinity]; }

	function extend(a, b) {
	    a[0] = Math.min(a[0], b[0]);
	    a[1] = Math.min(a[1], b[1]);
	    a[2] = Math.max(a[2], b[2]);
	    a[3] = Math.max(a[3], b[3]);
	    return a;
	}

	function compareNodeMinX(a, b) { return a.bbox[0] - b.bbox[0]; }
	function compareNodeMinY(a, b) { return a.bbox[1] - b.bbox[1]; }

	function bboxArea(a)   { return (a[2] - a[0]) * (a[3] - a[1]); }
	function bboxMargin(a) { return (a[2] - a[0]) + (a[3] - a[1]); }

	function enlargedArea(a, b) {
	    return (Math.max(b[2], a[2]) - Math.min(b[0], a[0])) *
	           (Math.max(b[3], a[3]) - Math.min(b[1], a[1]));
	}

	function intersectionArea (a, b) {
	    var minX = Math.max(a[0], b[0]),
	        minY = Math.max(a[1], b[1]),
	        maxX = Math.min(a[2], b[2]),
	        maxY = Math.min(a[3], b[3]);

	    return Math.max(0, maxX - minX) *
	           Math.max(0, maxY - minY);
	}

	function contains(a, b) {
	    return a[0] <= b[0] &&
	           a[1] <= b[1] &&
	           b[2] <= a[2] &&
	           b[3] <= a[3];
	}

	function intersects (a, b) {
	    return b[0] <= a[2] &&
	           b[1] <= a[3] &&
	           b[2] >= a[0] &&
	           b[3] >= a[1];
	}

	// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
	// combines selection algorithm with binary divide & conquer approach

	function multiSelect(arr, left, right, n, compare) {
	    var stack = [left, right],
	        mid;

	    while (stack.length) {
	        right = stack.pop();
	        left = stack.pop();

	        if (right - left <= n) continue;

	        mid = left + Math.ceil((right - left) / n / 2) * n;
	        select(arr, left, right, mid, compare);

	        stack.push(left, mid, mid, right);
	    }
	}

	// sort array between left and right (inclusive) so that the smallest k elements come first (unordered)
	function select(arr, left, right, k, compare) {
	    var n, i, z, s, sd, newLeft, newRight, t, j;

	    while (right > left) {
	        if (right - left > 600) {
	            n = right - left + 1;
	            i = k - left + 1;
	            z = Math.log(n);
	            s = 0.5 * Math.exp(2 * z / 3);
	            sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (i - n / 2 < 0 ? -1 : 1);
	            newLeft = Math.max(left, Math.floor(k - i * s / n + sd));
	            newRight = Math.min(right, Math.floor(k + (n - i) * s / n + sd));
	            select(arr, newLeft, newRight, k, compare);
	        }

	        t = arr[k];
	        i = left;
	        j = right;

	        swap(arr, left, k);
	        if (compare(arr[right], t) > 0) swap(arr, left, right);

	        while (i < j) {
	            swap(arr, i, j);
	            i++;
	            j--;
	            while (compare(arr[i], t) < 0) i++;
	            while (compare(arr[j], t) > 0) j--;
	        }

	        if (compare(arr[left], t) === 0) swap(arr, left, j);
	        else {
	            j++;
	            swap(arr, j, right);
	        }

	        if (j <= k) left = j + 1;
	        if (k <= j) right = j - 1;
	    }
	}

	function swap(arr, i, j) {
	    var tmp = arr[i];
	    arr[i] = arr[j];
	    arr[j] = tmp;
	}


	// export as AMD/CommonJS module or global variable
	if (true) !(__WEBPACK_AMD_DEFINE_RESULT__ = function() { return rbush; }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	else if (typeof module !== 'undefined') module.exports = rbush;
	else if (typeof self !== 'undefined') self.rbush = rbush;
	else window.rbush = rbush;

	})();


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module, process) {/*
	 * PinkySwear.js 2.2.2 - Minimalistic implementation of the Promises/A+ spec
	 * 
	 * Public Domain. Use, modify and distribute it any way you like. No attribution required.
	 *
	 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
	 *
	 * PinkySwear is a very small implementation of the Promises/A+ specification. After compilation with the
	 * Google Closure Compiler and gzipping it weighs less than 500 bytes. It is based on the implementation for 
	 * Minified.js and should be perfect for embedding. 
	 *
	 *
	 * PinkySwear has just three functions.
	 *
	 * To create a new promise in pending state, call pinkySwear():
	 *         var promise = pinkySwear();
	 *
	 * The returned object has a Promises/A+ compatible then() implementation:
	 *          promise.then(function(value) { alert("Success!"); }, function(value) { alert("Failure!"); });
	 *
	 *
	 * The promise returned by pinkySwear() is a function. To fulfill the promise, call the function with true as first argument and
	 * an optional array of values to pass to the then() handler. By putting more than one value in the array, you can pass more than one
	 * value to the then() handlers. Here an example to fulfill a promsise, this time with only one argument: 
	 *         promise(true, [42]);
	 *
	 * When the promise has been rejected, call it with false. Again, there may be more than one argument for the then() handler:
	 *         promise(true, [6, 6, 6]);
	 *         
	 * You can obtain the promise's current state by calling the function without arguments. It will be true if fulfilled,
	 * false if rejected, and otherwise undefined.
	 * 		   var state = promise(); 
	 * 
	 * https://github.com/timjansen/PinkySwear.js
	 */
	(function(target) {
		var undef;

		function isFunction(f) {
			return typeof f == 'function';
		}
		function isObject(f) {
			return typeof f == 'object';
		}
		function defer(callback) {
			if (typeof setImmediate != 'undefined')
				setImmediate(callback);
			else if (typeof process != 'undefined' && process['nextTick'])
				process['nextTick'](callback);
			else
				setTimeout(callback, 0);
		}

		target[0][target[1]] = function pinkySwear(extend) {
			var state;           // undefined/null = pending, true = fulfilled, false = rejected
			var values = [];     // an array of values as arguments for the then() handlers
			var deferred = [];   // functions to call when set() is invoked

			var set = function(newState, newValues) {
				if (state == null && newState != null) {
					state = newState;
					values = newValues;
					if (deferred.length)
						defer(function() {
							for (var i = 0; i < deferred.length; i++)
								deferred[i]();
						});
				}
				return state;
			};

			set['then'] = function (onFulfilled, onRejected) {
				var promise2 = pinkySwear(extend);
				var callCallbacks = function() {
		    		try {
		    			var f = (state ? onFulfilled : onRejected);
		    			if (isFunction(f)) {
			   				function resolve(x) {
							    var then, cbCalled = 0;
			   					try {
					   				if (x && (isObject(x) || isFunction(x)) && isFunction(then = x['then'])) {
											if (x === promise2)
												throw new TypeError();
											then['call'](x,
												function() { if (!cbCalled++) resolve.apply(undef,arguments); } ,
												function(value){ if (!cbCalled++) promise2(false,[value]);});
					   				}
					   				else
					   					promise2(true, arguments);
			   					}
			   					catch(e) {
			   						if (!cbCalled++)
			   							promise2(false, [e]);
			   					}
			   				}
			   				resolve(f.apply(undef, values || []));
			   			}
			   			else
			   				promise2(state, values);
					}
					catch (e) {
						promise2(false, [e]);
					}
				};
				if (state != null)
					defer(callCallbacks);
				else
					deferred.push(callCallbacks);
				return promise2;
			};
	        if(extend){
	            set = extend(set);
	        }
			return set;
		};
	})(false ? [window, 'pinkySwear'] : [module, 'exports']);

	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(14)(module), __webpack_require__(13)))

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    if (canPost) {
	        var queue = [];
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	}

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }
/******/ ])
});
