/*!
 * leaflet.datalayer v0.0.5 | License: MIT 
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
	DataLayer.GeometryRenderer = __webpack_require__(7);
	DataLayer.CanvasContext = __webpack_require__(8);
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
	        
	        reuseTiles : false,

	        // Show pointer cursor for zones associated with data
	        pointerCursor : true,

	        // Asynchronous tiles drawing
	        async : false,

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
	        var dataRenderer = this.getDataRenderer();
	        dataRenderer.onAdd(this);
	        L.TileLayer.Canvas.prototype.onAdd.apply(this, arguments);
	        this.on('tileunload', this._onTileUnload, this);
	        this._initEvents('on');
	        // this.redraw();
	    },

	    /**
	     * This method is called when this layer is removed from the map.
	     */
	    onRemove : function(map) {
	        this.off('tileunload', this._onTileUnload, this);
	        this._initEvents('off');
	        this._removeMouseCursorStyle();
	        L.TileLayer.Canvas.prototype.onRemove.apply(this, arguments);
	        var dataRenderer = this.getDataRenderer();
	        dataRenderer.onRemove(this);
	        delete this._map;
	    },

	    /**
	     * Initializes container for tiles.
	     */
	    _initContainer : function() {
	        var initContainer = L.TileLayer.Canvas.prototype._initContainer;
	        initContainer.apply(this, arguments);
	        var pane = this._getDataLayersPane();
	        pane.appendChild(this._container);
	        if (this.options.zIndex) {
	            this._container.style.zIndex = this.options.zIndex;
	        }
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
	        this._map[onoff](events, this._mouseHandler, this);
	    },

	    _mouseHandler : function(e) {
	        if (e.type === 'click') {
	            this._click(e);
	        } else {
	            this._move(e);
	        }
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
	    getDataProvider : function() {
	        if (!this.options.dataProvider) {
	            this.options.dataProvider = new SimpleDataProvider();
	        }
	        return this.options.dataProvider;
	    },

	    /** Sets the specified data and re-draws the layer. */
	    setData : function(data) {
	        var dataProvider = this.getDataProvider();
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
	        if (!that._map)
	            return;

	        var tilePoint = canvas._tilePoint;
	        var dataProvider = that.getDataProvider();
	        var dataRenderer = that.getDataRenderer();
	        return P.then(function() {
	            var bufferSize = dataRenderer.getBufferZoneSize();
	            var bbox = that._getTileBoundingBox(tilePoint, bufferSize);
	            return dataProvider.loadData({
	                tilePoint : tilePoint,
	                bbox : bbox,
	            });
	        }).then(function(data) {
	            var zoom = that._map.getZoom();
	            var tileBbox = that._getTileBoundingBox(tilePoint);
	            return dataRenderer.renderData({
	                tilePoint : tilePoint,
	                bbox : tileBbox,
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
	     * Returns a IDataRenderer renderer instance responsible for data
	     * visualization.
	     */
	    getDataRenderer : function() {
	        if (!this.options.dataRenderer) {
	            this.options.dataRenderer = new MarkersRenderer({
	                map : this._map,
	                layer : this
	            });
	        }
	        return this.options.dataRenderer;
	    },

	    /**
	     * Returns a bounding box around a tile with the specified coordinates. This
	     * bounding box is used to load data to show on the tile. The returned
	     * bounding box is bigger than tile - it includes a buffer zone used to
	     * avoid clipping of rendered data. The size of the additional buffering
	     * zone is defined by the "IDataRenderer.getBufferZoneSize" method.
	     */
	    _getTileBoundingBox : function(tilePoint, bufferSize) {
	        var that = this;
	        var tileSize = that._getTileSize();
	        var nwPoint = tilePoint.multiplyBy(tileSize);
	        var sePoint = nwPoint.add(new L.Point(tileSize, tileSize));
	        bufferSize = L.point(bufferSize || [ 0, 0 ]);
	        nwPoint = nwPoint.subtract(bufferSize);
	        sePoint = sePoint.add(bufferSize);
	        var nw = that._map.unproject(nwPoint);
	        var se = that._map.unproject(sePoint);
	        var bbox = new L.LatLngBounds(se, nw);
	        return bbox;
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
	var CanvasContext = __webpack_require__(8);
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
	     * canvas context (an CanvasContext instance).
	     * 
	     * @param options.data
	     *            an array of objects to render on a canvas
	     * @param options.canvas
	     *            the canvas where the data should be rendered
	     * @param options.bbox
	     *            geographic bounding box corresponding to the canvas
	     * @param options.zoom
	     *            the current map zoom level
	     */
	    renderData : function(options) {
	        var that = this;
	        var context = that._newCanvasContext(options);
	        return P.then(function() {
	            return that._prepareContext(context);
	        }).then(function() {
	            var data = options.data || [];
	            var len = data.length;
	            for (var i = 0; i < len; i++) {
	                var d = data[i];
	                that._drawFeature(d, context);
	            }
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

	    /** Creates and returns a canvas index (a CanvasContext instance). */
	    _newCanvasContext : function(options) {
	        options = DataUtils.extend({}, options, {
	            maskIndex : this._getMaskIndex()
	        });
	        var context = new CanvasContext(options);
	        return context;
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
	     * This method is called when the parent layer is removed from the map.
	     */
	    onRemove : function(layer) {
	        delete this._layer;
	        delete this._map;
	    },

	    // --------------------------------------------------------------------
	    // Utility methods used in subclasses

	    /**
	     * Returns projected position (in pixels) of the specified geographic point
	     * relative to an origin point
	     */
	    _getProjectedPoint : function(context, coords) {
	        var origin = this._getTopLeft(context.options.bbox);
	        var o = this._projectPoint(origin);
	        var p = this._projectPoint(coords);
	        var x = Math.round(p.x - o.x);
	        var y = Math.round(p.y - o.y);
	        return [ x, y ];
	    },

	    /**
	     * Returns an array of projected points.
	     */
	    _getProjectedPoints : function(context, coordinates) {
	        var origin = this._getTopLeft(context.options.bbox);
	        var o = this._projectPoint(origin);
	        var result = [];
	        for (var i = 0; i < coordinates.length; i++) {
	            var point = coordinates[i];
	            var p = this._projectPoint(point);
	            var x = Math.round(p.x - o.x);
	            var y = Math.round(p.y - o.y);
	            result.push([ x, y ]);
	        }
	        return result;
	    },

	    // --------------------------------------------------------------------
	    // FIXME: use GeoJSON coordinates for bounding boxes instead
	    _getTopLeft : function(bbox) {
	        var origin = bbox.getNorthWest();
	        return [ origin.lng, origin.lat ];
	    },
	    _projectPoint : function(coords) {
	        var map = this._map;
	        return map.project([ coords[1], coords[0] ]);
	    },

	    /**
	     * Returns point an array [lng, lat] with coordinates for the specified
	     * resource.
	     */
	    _getCoordinates : function(d) {
	        var bbox = DataUtils.getGeoJsonBoundingBox(d);
	        if (!bbox)
	            return null;
	        var latlng = bbox.getCenter();
	        return [ latlng.lng, latlng.lat ];
	    },

	});
	module.exports = DataRenderer;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var rbush = __webpack_require__(13);
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
	        for (var i = 0; i < data.length; i++) {
	            var d = data[i];
	            var bbox = that._getBoundingBox(d);
	            if (bbox) {
	                var coords = that._toIndexKey(bbox);
	                coords.data = d;
	                array.push(coords);
	            }
	        }
	        this._rtree.load(array);
	    },

	    /** Searches resources in the specified bounding box. */
	    _searchInBbox : function(bbox) {
	        var coords = this._toIndexKey(bbox);
	        var array = this._rtree.search(coords);
	        array = this._sortByDistance(array, bbox);
	        var result = [];
	        for (var i = 0; i < array.length; i++) {
	            var arr = array[i];
	            result.push(arr.data);
	        }
	        return result;
	    },

	    /**
	     * Sorts the given data array by Manhattan distance to the origin point
	     */
	    _sortByDistance : function(array, bbox) {
	        var lat = bbox.getNorth();
	        var lng = bbox.getEast();
	        var p = [ lat, lng ];
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
	        this._drawResourceMarker(resource, context);
	    },

	    /** Draws the specified resource as a marker */
	    _drawResourceMarker : function(resource, context) {
	        var coords = this._getCoordinates(resource);
	        if (!coords) {
	            return;
	        }
	        var anchor = this._getProjectedPoint(context, coords);
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
	                // Allow to re-use image mask to avoid cost re-building
	                context.setImageKey(marker.image);
	            }
	        }
	        if (marker && marker.image) {
	            var markerAnchor = L.point(marker.anchor);
	            var pos = L.point(anchor).subtract(markerAnchor);
	            context.drawImage(marker.image, [ pos.x, pos.y ], {
	                data : resource
	            });
	        }
	    },

	    // -----------------------------------------------------------------
	    // All other methods are specific for resources corresponding to points
	    // on maps and used only by the _getBoundingBox and/or by _drawFeature
	    // methods.

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
	var DataRenderer = __webpack_require__(4);
	var P = __webpack_require__(9);

	/**
	 * A common interface visualizing data on canvas.
	 */
	var GeometryRenderer = DataRenderer.extend({

	    /** Initializes fields of this object. */
	    initialize : function() {
	        DataRenderer.prototype.initialize.apply(this, arguments);
	        this._markerCache = {};
	    },

	    // -----------------------------------------------------------------------
	    // The following methods should be overloaded in subclasses

	    /**
	     * Returns a buffer zone size (in pixels) around each tile.
	     */
	    getBufferZoneSize : function() {
	        var size = 32;
	        if (this._layer && this._layer._map) {
	            size = this._layer._getTileSize() / 4;
	        } else {
	            size = 32;
	        }
	        return [ size, size ];
	    },

	    /**
	     * Prepares the specified context. This method could be overload to
	     * asynchronously load resources required to render data.
	     */
	    _prepareContext : function(context) {
	        return P.resolve(context);
	    },

	    /**
	     * Draws the specified resource on the given canvas context.
	     * 
	     * @param resource
	     *            the resource to render
	     * @param context
	     *            a canvas context
	     */
	    _drawFeature : function(resource, context) {
	        var that = this;
	        var geometry = resource.geometry;
	        if (!geometry)
	            return;
	        drawGeometry(geometry);
	        return;

	        function drawPoints(points) {
	            var options = that._getMarkerOptions(context, resource);
	            if (!options.image)
	                return;
	            if (options.reuseMask) {
	                // Allow to re-use image mask to avoid costly mask re-building
	                context.setImageKey(options.image);
	            }
	            for (var i = 0; i < points.length; i++) {
	                var point = points[i];
	                var anchor = [ point[0], point[1] ]; // Copy
	                if (options.anchor) {
	                    anchor[0] -= options.anchor[0];
	                    anchor[1] -= options.anchor[1];
	                }
	                context.drawImage(options.image, anchor, {
	                    data : resource
	                });
	            }
	        }

	        function drawLine(points) {
	            var line = that._getProjectedPoints(context, points);
	            var options = that._getLineOptions(context, resource);
	            context.drawLine(points, options);
	            context.drawImage(options.image, options.anchor, {
	                data : resource
	            });
	        }

	        function drawPolygon(coords) {
	            var polygons = that._getProjectedPoints(context, coords[0]);
	            var holes = [];
	            for (var i = 1; i < coords.length; i++) {
	                var hole = that._getProjectedPoints(context, coords[i]);
	                if (hole.length) {
	                    holes.push(hole);
	                }
	            }
	            var options = that._getPolygonOptions(context, resource);
	            context.drawPolygon(polygons, holes, options);
	            context.drawImage(options.image, options.anchor, {
	                data : resource
	            });
	        }

	        function drawGeometry(geometry) {
	            var coords = geometry.coordinates;
	            switch (geometry.type) {
	            case 'Point':
	                (function() {
	                    var point = that._getProjectedPoint(context, coords);
	                    drawPoints([ point ]);
	                })();
	                break;
	            case 'MultiPoint':
	                (function() {
	                    var points = that._getProjectedPoints(context, coords);
	                    drawPoints(points);
	                })();
	                break;
	            case 'LineString':
	                (function() {
	                    var points = that._getProjectedPoints(context, coords);
	                    drawLine(points);
	                })();
	                break;
	            case 'MultiLineString':
	                (function() {
	                    for (var i = 0; i < coords.length; i++) {
	                        var points = that._getProjectedPoints(context,
	                                coords[i]);
	                        drawLine(points);
	                    }
	                })();
	                break;
	            case 'Polygon':
	                (function() {
	                    drawPolygon(coords);
	                })();
	                break;
	            case 'MultiPolygon':
	                (function() {
	                    for (var i = 0; i < coords.length; i++) {
	                        drawPolygon(coords[i]);
	                    }
	                })();
	                break;
	            case 'GeometryCollection':
	                (function() {
	                    var geoms = geometry.geometries;
	                    for (var i = 0, len = geoms.length; i < len; i++) {
	                        drawGeometry(geoms[i]);
	                    }
	                })();
	                break;
	            }
	        }
	    },

	    // ------------------------------------------------------------------

	    _getLineOptions : function(context, resource) {
	        return {
	            lineColor : 'red',
	            lineOpacity : 1,
	            lineWidth : 0.8,
	            data : resource
	        };
	    },
	    _getPolygonOptions : function(context, resource) {
	        return {
	            fillOpacity : 0.3,
	            fillColor : 'green',
	            lineColor : 'white',
	            lineOpacity : 1,
	            lineWidth : 1,
	            data : resource
	        };
	    },

	    _getMarkerOptions : function(context, resource) {
	        var that = this;
	        var cacheKey = that._getMarkerCacheKey(resource, context);
	        var options;
	        if (cacheKey) {
	            options = that._markerCache[cacheKey];
	        }
	        if (!options) {
	            options = that._newResourceMarker(resource, context);
	            if (options && options.image && cacheKey) {
	                that._markerCache[cacheKey] = options;
	                options.reuseMask = true;
	            }
	            if (options.anchor && (options.anchor.x !== undefined)) {
	                options.anchor = [ options.anchor.x, options.anchor.y ];
	            }
	        }
	        return options;
	    },

	    // ------------------------------------------------------------------
	    // Markers visualization

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
	        var canvas = context.newCanvas();
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

	module.exports = GeometryRenderer;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var CanvasTools = __webpack_require__(11);

	/**
	 * This utility class allows to associate data with non-transparent pixels of
	 * images drawn on canvas.
	 */
	function CanvasContext() {
	    CanvasTools.apply(this, arguments);
	}
	CanvasTools.extend(CanvasContext, CanvasTools);
	CanvasContext.extend(CanvasContext.prototype, CanvasTools.prototype);
	CanvasContext.extend(CanvasContext.prototype, {

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
	        CanvasTools.prototype.initialize.apply(this, arguments);
	        this._canvas = this.options.canvas;
	        this._canvasContext = this._canvas.getContext('2d');
	        var resolution = this.options.resolution || 4;
	        this.options.resolutionX = this.options.resolutionX || resolution;
	        this.options.resolutionY = this.options.resolutionY || //
	        this.options.resolutionX || resolution;
	        this._maskWidth = this._getMaskX(this._canvas.width);
	        this._maskHeight = this._getMaskY(this._canvas.height);
	        this._dataIndex = {};
	    },

	    /** Returns an array with width and height of the canvas. */
	    getCanvasSize : function() {
	        return [ this._canvas.width, this._canvas.height ];
	    },

	    /**
	     * Draws the specified image in the given position on the underlying canvas.
	     */
	    drawImage : function(image, position, options) {
	        if (!image || !position)
	            return;
	        var x = position[0];
	        var y = position[1];
	        // Draw the image on the canvas
	        this._canvasContext.drawImage(image, x, y);
	        // Associate non-transparent pixels of the image with data
	        var data = options && options.data;
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
	        var g = this._canvasContext;
	        g.clearRect(0, 0, this._canvas.width, this._canvas.height);
	        this._dataIndex = {};
	    },

	    // ------------------------------------------------------------------
	    // Private methods

	    /**
	     * Adds all pixels occupied by the specified image to a data mask associated
	     * with canvas.
	     */
	    _addToCanvasMask : function(image, shiftX, shiftY, data) {
	        var result = false;
	        if (!data)
	            return result;
	        var mask = this._getImageMask(image);
	        var imageMaskWidth = this._getMaskX(image.width);
	        var maskShiftX = this._getMaskX(shiftX);
	        var maskShiftY = this._getMaskY(shiftY);
	        for (var i = 0; i < mask.length; i++) {
	            if (!mask[i])
	                continue;
	            var x = maskShiftX + (i % imageMaskWidth);
	            var y = maskShiftY + Math.floor(i / imageMaskWidth);
	            if (x >= 0 && x < this._maskWidth && //
	            y >= 0 && y < this._maskHeight) {
	                this._dataIndex[y * this._maskWidth + x] = data;
	                result = true;
	            }
	        }
	        return result;
	    },

	    /**
	     * Returns a mask corresponding to the specified image.
	     */
	    _getImageMask : function(image) {
	        var maskIndex = this._getImageMaskIndex();
	        var imageKey = this.getImageKey(image);
	        if (!maskIndex || !imageKey) {
	            return this._buildImageMask(image);
	        }
	        var mask = maskIndex[imageKey];
	        if (!mask) {
	            mask = this._buildImageMask(image);
	            maskIndex[imageKey] = mask;
	        }
	        return mask;
	    },

	    /**
	     * Returns a unique key of the specified image. If this method returns
	     * <code>null</code> then the image mask is not stored in the internal
	     * mask cache. To allow to store the image mask in cache the image should be
	     * 'stampted' with a new identifier using the setImageKey method..
	     */
	    getImageKey : function(image) {
	        var id = image['image-id'];
	        return id;
	    },

	    /**
	     * Sets a new image key used to associate an image mask with this image.
	     */
	    setImageKey : function(image, imageKey) {
	        var key = image['image-id'];
	        if (!key) {
	            if (!imageKey) {
	                var id = CanvasContext._imageIdCounter || 0;
	                CanvasContext._imageIdCounter = id + 1;
	                imageKey = 'key-' + id;
	            }
	            key = image['image-id'] = imageKey;
	        }
	        return key;
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
	        var canvas = this.newCanvas();
	        var g = canvas.getContext('2d');
	        var maskWidth = this._getMaskX(image.width);
	        var maskHeight = this._getMaskY(image.height);
	        canvas.width = maskWidth;
	        canvas.height = maskHeight;
	        g.drawImage(image, 0, 0, maskWidth, maskHeight);
	        var data = g.getImageData(0, 0, maskWidth, maskHeight).data;
	        var mask = new Array(maskWidth * maskHeight);
	        for (var y = 0; y < maskHeight; y++) {
	            for (var x = 0; x < maskWidth; x++) {
	                var idx = (y * maskWidth + x);
	                var filled = this._checkFilledPixel(data, idx);
	                mask[idx] = filled ? 1 : 0;
	            }
	        }
	        return mask;
	    },

	    /**
	     * Returns <code>true</code> if the specified pixel is associated with
	     * data
	     */
	    _checkFilledPixel : function(data, pos) {
	        // Check that the alpha channel is not 0 which means that this
	        // pixel is not transparent and it should not be associated with
	        // a data object.
	        // 4 bytes per pixel; RGBA - forth byte is an alpha channel.
	        var idx = pos * 4 + 3;
	        return !!data[idx];
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

	module.exports = CanvasContext;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	// A promise wrapper providing a switchable interface for promise implementations.
	// MIT license. (c) Ubimix (c) Mikhail Kotelnikov
	module.exports = P;
	function P(value) {
	    return P.resolve(value);
	}
	P.defer = P.deferred = function() {
	    var Deferred = __webpack_require__(12);
	    Deferred.SYNC = true;
	    P.defer = Deferred;
	    return P.defer();
	};
	P.then = function(onResolve, onReject) {
	    var deferred = P.defer();
	    deferred.resolve();
	    return deferred.promise.then(onResolve, onReject);
	};
	P.reject = P.rejected = function(value) {
	    var deferred = P.defer();
	    deferred.reject(value);
	    return deferred.promise;
	};
	P.resolve = P.resolved = function(value) {
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

	/**
	 * This class provides a set of utility methods simplifying data visualization
	 * on canvas.
	 */
	function CanvasTools() {
	    this.initialize.apply(this, arguments);
	}
	CanvasTools.extend = function extend(to) {
	    var len = arguments.length;
	    for (var i = 1; i < len; i++) {
	        var from = arguments[i];
	        for ( var key in from) {
	            to[key] = from[key];
	        }
	    }
	};
	CanvasTools.extend(CanvasTools.prototype, {

	    /** Initializes this object. */
	    initialize : function(options) {
	        this.options = options || {};
	        if (!this.options.width) {
	            this.options.width = 256;
	        }
	        if (!this.options.height) {
	            this.options.height = 256;
	        }
	    },

	    // -----------------------------------------------------------------------

	    /**
	     * Copies an image to the main canvas.
	     * 
	     * @param image
	     *            the image to copy; it could be an Image or Canvas
	     * @param position
	     *            position of the image on the main canvas
	     * @param options
	     *            options object containing "data" field to associate with the
	     *            image
	     */
	    drawImage : function(image, position, options) {
	        var context = this.options.context;
	        context.draw(image, position[0], position[1], options.data);
	    },

	    // -----------------------------------------------------------------------
	    // Public methods

	    /**
	     * Draws a line defined by the specified sequence of points.
	     */
	    drawLine : function(points, options) {
	        var strokeStyles = this._getStrokeStyles(options);
	        if (!strokeStyles)
	            return;
	        // Create new canvas where the polygon should be drawn
	        var canvas = this.newCanvas();
	        var g = canvas.getContext('2d');
	        // Simplify point sequence
	        points = this._simplify(points);
	        // Trace the line
	        var ok = this._drawLines(g, points, strokeStyles);
	        if (ok) {
	            this.drawImage(canvas, [ 0, 0 ], options);
	        }
	    },

	    /**
	     * Draws polygons with holes on the canvas.
	     */
	    drawPolygon : function(polygons, holes, options) {
	        // Get styles
	        var fillStyles = this._getFillStyles(options);
	        var strokeStyles = this._getStrokeStyles(options);
	        // Return if there is no styles defined for these
	        // polygons
	        if (!fillStyles && !strokeStyles)
	            return;
	        // Create new canvas where the polygon should be drawn
	        var canvas = this.newCanvas();
	        var g = canvas.getContext('2d');

	        var i;

	        // Simplify lines
	        polygons = this._simplify(polygons);
	        holes = holes || [];
	        for (i = 0; i < holes.length; i++) {
	            holes[i] = this._simplify(holes[i]);
	        }

	        var drawn = false;
	        drawn |= this._drawPolygons(g, polygons, holes, fillStyles);
	        // Draw lines around the polygon (external lines + lines
	        // around holes)
	        drawn |= this._drawLines(g, polygons, strokeStyles);
	        for (i = 0; i < holes.length; i++) {
	            drawn |= this._drawLines(g, holes[i], strokeStyles);
	        }
	        // Draw image on the main canvas
	        if (drawn) {
	            this.drawImage(canvas, [ 0, 0 ], options);
	        }
	    },

	    /** Returns the size of the underlying canvas. */
	    getCanvasSize : function() {
	        return [ this.options.width, this.options.height ];
	    },

	    /**
	     * Creates and returns a new canvas used to draw individual features.
	     */
	    newCanvas : function() {
	        var canvas;
	        if (this.options.newCanvas) {
	            canvas = this.options.newCanvas();
	        } else {
	            canvas = document.createElement('canvas');
	        }
	        var size = this.getCanvasSize();
	        canvas.width = size[0];
	        canvas.height = size[1];
	        return canvas;
	    },

	    // -----------------------------------------------------------------------
	    // Private methods

	    /**
	     * Returns bounding polygon for the underlying canvas. The returned polygon
	     * contains 4 points defining corners of the bounding box.
	     */
	    _getBoundingPolygon : function(buffer) {
	        var bbox = this._getBoundingBox(buffer);
	        var lt = bbox[0]; // left-top
	        var rb = bbox[1]; // right-bottom
	        return [ [ lt[0], lt[1] ], [ rb[0], lt[1] ], [ rb[0], rb[1] ],
	                [ lt[0], rb[1] ] ];
	    },

	    /** Returns bounding box for the underlying canvas. */
	    _getBoundingBox : function(buffer) {
	        buffer = buffer || [ 0, 0 ];
	        var size = this.getCanvasSize();
	        return [ [ -buffer[0], -buffer[1] ],
	                [ size[0] + buffer[0], size[1] + buffer[1] ] ];
	    },

	    /**
	     * Returns size of a buffer zone around the main canvas. This value is used
	     * to expand canvas zone when calculate trimming of lines and polygons.
	     */
	    _getBufferZone : function() {
	        return [ 10, 10 ];
	    },

	    /**
	     * Draws polygons with holes on the specified canvas context.
	     * 
	     * @param g
	     *            canvas context
	     * @param polygons
	     *            a sequence of coordinates defining the polygon to draw
	     * @param holes
	     *            an array of sequences with coordinates of holes in the polygon
	     * @param styles
	     *            polygon fill styles (transparency, color etc)
	     */
	    _drawPolygons : function(g, polygons, holes, styles) {
	        if (!styles)
	            return false;
	        // Buffer zone around the main canvas.
	        // It is used to avoid partially drawn features near the
	        // border
	        var bufferZone = this._getBufferZone();
	        // Calculate clipped polygons
	        var boundingPolygon = this._getBoundingPolygon(bufferZone);
	        var clippedPolygons = polygons ? CanvasTools.clipPolygon(polygons,
	                boundingPolygon) : [];

	        var i;
	        // Calculate clipped holes
	        var clippedHoles = [];
	        var len = holes ? holes.length : 0;
	        for (i = 0; i < len; i++) {
	            var hole = CanvasTools.clipPolygon(holes[i], boundingPolygon);
	            if (hole.length) {
	                clippedHoles.push(hole);
	            }
	        }

	        // Draw the polygon itself
	        g.globalCompositeOperation = 'source-over';
	        this._setCanvasStyles(g, styles);
	        if (styles._pattern) {
	            g.fillStyle = g.createPattern(styles._pattern, "repeat");
	        }
	        this._trace(g, clippedPolygons, true);
	        g.fill();

	        // Remove holes areas from the polygon
	        g.globalCompositeOperation = 'destination-out';
	        g.globalAlpha = 1;
	        for (i = 0; i < clippedHoles.length; i++) {
	            if (clippedHoles[i].length) {
	                this._trace(g, clippedHoles[i], true);
	                g.fill();
	            }
	        }
	        return true;
	    },

	    /**
	     * Draws lines with the specified coordinates and styles.
	     */
	    _drawLines : function(g, coords, styles) {
	        if (!styles)
	            return false;
	        // Clip lines
	        var bufferZone = this._getBufferZone();
	        var boundingBox = this._getBoundingBox(bufferZone);
	        var lines = CanvasTools.clipLines(coords, boundingBox) || [];
	        if (!lines.length)
	            return false;
	        g.globalCompositeOperation = 'source-over';
	        this._setCanvasStyles(g, styles);
	        g.beginPath();
	        for (var i = 0; i < lines.length; i++) {
	            this._trace(g, lines[i], false);
	            g.stroke();
	        }
	        return true;
	    },

	    /**
	     * Trace the specified path on the given canvas context.
	     * 
	     * @param g
	     *            canvas context
	     * @param coords
	     *            a sequence of coordinates to trace
	     * @param close
	     *            adds a closePath method call at the end of the sequence
	     */
	    _trace : function(g, coords, close) {
	        if (!coords || !coords.length)
	            return;
	        g.beginPath();
	        g.moveTo(coords[0][0], coords[0][1]);
	        for (var i = 1; i < coords.length; i++) {
	            g.lineTo(coords[i][0], coords[i][1]);
	        }
	        if (close) {
	            g.closePath();
	        }
	    },

	    /** Simplifies the given line. */
	    _simplify : function(coords) {
	        var tolerance = this.options.tolerance || 0.5;
	        var enableHighQuality = !!this.options.highQuality;
	        var points = CanvasTools.simplify(coords, // 
	        tolerance, enableHighQuality);
	        return points;
	    },

	    /**
	     * Copies fill styles from the specified options object to a separate style
	     * object. Returns <code>null</code> if the options do not contain
	     * required styles.
	     */
	    _getFillStyles : function(options) {
	        var styles = {};
	        styles.fillStyle = options.fillColor || options.color || 'blue';
	        styles.globalAlpha = options.fillOpacity || options.opacity || 0;
	        if (options.fillImage) {
	            styles._pattern = options.fillImage;
	        }
	        if (this._isEmptyValue(styles.globalAlpha) && !styles._pattern)
	            return null;
	        return styles;
	    },

	    /**
	     * Copies stroke styles from the specified options object to a separate
	     * style object. Returns <code>null</code> if options do not contain
	     * required styles.
	     */
	    _getStrokeStyles : function(options) {
	        var styles = {};
	        styles.strokeStyle = options.lineColor || options.color || 'blue';
	        styles.globalAlpha = options.lineOpacity || options.opacity || 0;
	        styles.lineWidth = options.lineWidth || options.width || 0;
	        styles.lineCap = options.lineCap || 'round'; // 'butt|round|square'
	        styles.lineJoin = options.lineJoin || 'round'; // 'miter|round|bevel'
	        if (this._isEmptyValue(styles.lineWidth) || //
	        this._isEmptyValue(styles.globalAlpha))
	            return null;
	        return styles;
	    },

	    /**
	     * Returns <code>true</code> if the specified value is 0 or undefined.
	     */
	    _isEmptyValue : function(val) {
	        return val === undefined || val === 0 || val === '';
	    },

	    /**
	     * Copies styles from the specified style object to the canvas context.
	     */
	    _setCanvasStyles : function(g, styles) {
	        for ( var key in styles) {
	            if (!key || key[0] === '_')
	                continue;
	            g[key] = styles[key];
	        }
	    },

	});
	CanvasTools.extend(CanvasTools, {

	    clipLines : function(lines, bounds) {
	        var result = [];
	        var prev = lines[0];
	        for (var i = 1; i < lines.length; i++) {
	            var next = lines[i];
	            var clipped = this.clipLine([ prev, next ], bounds);
	            if (clipped) {
	                result.push(clipped);
	            }
	            prev = next;
	        }
	        return result;
	    },

	    // Cohen-Sutherland line-clipping algorithm
	    clipLine : (function() {
	        function getCode(x, y, xmin, ymin, xmax, ymax) {
	            var oc = 0;
	            if (y > ymax)
	                oc |= 1 /* TOP */;
	            else if (y < ymin)
	                oc |= 2 /* BOTTOM */;
	            if (x > xmax)
	                oc |= 4 /* RIGHT */;
	            else if (x < xmin)
	                oc |= 8 /* LEFT */;
	            return oc;
	        }
	        return function(line, bbox) {
	            var x1 = line[0][0];
	            var y1 = line[0][1];
	            var x2 = line[1][0];
	            var y2 = line[1][1];
	            var xmin = Math.min(bbox[0][0], bbox[1][0]);
	            var ymin = Math.min(bbox[0][1], bbox[1][1]);
	            var xmax = Math.max(bbox[0][0], bbox[1][0]);
	            var ymax = Math.max(bbox[0][1], bbox[1][1]);
	            var accept = false;
	            var done = false;

	            var outcode1 = getCode(x1, y1, xmin, ymin, xmax, ymax);
	            var outcode2 = getCode(x2, y2, xmin, ymin, xmax, ymax);
	            do {
	                if (outcode1 === 0 && outcode2 === 0) {
	                    accept = true;
	                    done = true;
	                } else if (!!(outcode1 & outcode2)) {
	                    done = true;
	                } else {
	                    var x, y;
	                    var outcode_ex = outcode1 ? outcode1 : outcode2;
	                    if (outcode_ex & 1 /* TOP */) {
	                        x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
	                        y = ymax;
	                    } else if (outcode_ex & 2 /* BOTTOM */) {
	                        x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
	                        y = ymin;
	                    } else if (outcode_ex & 4 /* RIGHT */) {
	                        y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
	                        x = xmax;
	                    } else { // 8 /* LEFT */
	                        y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
	                        x = xmin;
	                    }
	                    if (outcode_ex === outcode1) {
	                        x1 = x;
	                        y1 = y;
	                        outcode1 = getCode(x1, y1, xmin, ymin, xmax, ymax);
	                    } else {
	                        x2 = x;
	                        y2 = y;
	                        outcode2 = getCode(x2, y2, xmin, ymin, xmax, ymax);
	                    }
	                }
	            } while (!done);
	            var result = [ [ x1, y1 ], [ x2, y2 ] ];
	            return accept ? result : null;
	        };
	    })(),

	    // Sutherland Hodgman polygon clipping algorithm
	    // http://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping
	    clipPolygon : function(subjectPolygon, clipPolygon) {
	        var cp1, cp2, s, e;
	        var inside = function(p) {
	            return (cp2[0] - cp1[0]) * //
	            (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * //
	            (p[0] - cp1[0]);
	        };
	        var intersection = function() {
	            var dc = [ cp1[0] - cp2[0], cp1[1] - cp2[1] ];
	            var dp = [ s[0] - e[0], s[1] - e[1] ];
	            var n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0];
	            var n2 = s[0] * e[1] - s[1] * e[0];
	            var n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
	            return [ Math.round((n1 * dp[0] - n2 * dc[0]) * n3),
	                    Math.round((n1 * dp[1] - n2 * dc[1]) * n3) ];
	        };
	        var outputList = subjectPolygon;
	        cp1 = clipPolygon[clipPolygon.length - 1];
	        for ( var j in clipPolygon) {
	            cp2 = clipPolygon[j];
	            var inputList = outputList;
	            outputList = [];
	            s = inputList[inputList.length - 1]; // last on
	            // the input
	            // list
	            for ( var i in inputList) {
	                e = inputList[i];
	                if (inside(e)) {
	                    if (!inside(s)) {
	                        outputList.push(intersection());
	                    }
	                    outputList.push(e);
	                } else if (inside(s)) {
	                    outputList.push(intersection());
	                }
	                s = e;
	            }
	            cp1 = cp2;
	        }
	        if (outputList && outputList.length) {
	            outputList.push(outputList[0]);
	        }
	        return outputList || [];
	    },

	    /**
	     * This method simplifies the specified line by reducing the number of
	     * points but it keeps the total "form" of the line.
	     * 
	     * @param line
	     *            a sequence of points to simplify
	     * @param tolerance
	     *            an optional parameter defining allowed divergence of points
	     * @param highestQuality
	     *            excludes distance-based preprocessing step which leads to
	     *            highest quality simplification but runs ~10-20 times slower.
	     */
	    simplify : (function() {
	        // Released under the terms of BSD license
	        /*
	         * (c) 2013, Vladimir Agafonkin Simplify.js, a high-performance JS
	         * polyline simplification library mourner.github.io/simplify-js
	         */

	        // to suit your point format, run search/replace for
	        // '.x' and '.y'; for
	        // 3D version, see 3d branch (configurability would draw
	        // significant
	        // performance overhead) square distance between 2
	        // points
	        function getSqDist(p1, p2) {
	            var dx = p1[0] - p2[0];
	            var dy = p1[1] - p2[1];
	            return dx * dx + dy * dy;
	        }

	        // square distance from a point to a segment
	        function getSqSegDist(p, p1, p2) {
	            var x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
	            if (dx !== 0 || dy !== 0) {
	                var t = ((p[0] - x) * dx + (p[1] - y) * dy) / //
	                (dx * dx + dy * dy);

	                if (t > 1) {
	                    x = p2[0];
	                    y = p2[1];

	                } else if (t > 0) {
	                    x += dx * t;
	                    y += dy * t;
	                }
	            }
	            dx = p[0] - x;
	            dy = p[1] - y;

	            return dx * dx + dy * dy;
	        }
	        // rest of the code doesn't care about point format

	        // basic distance-based simplification
	        function simplifyRadialDist(points, sqTolerance) {

	            var prevPoint = points[0];
	            var newPoints = [ prevPoint ];
	            var point;

	            for (var i = 1, len = points.length; i < len; i++) {
	                point = points[i];

	                if (getSqDist(point, prevPoint) > sqTolerance) {
	                    newPoints.push(point);
	                    prevPoint = point;
	                }
	            }

	            if (prevPoint !== point)
	                newPoints.push(point);

	            return newPoints;
	        }

	        // simplification using optimized Douglas-Peucker
	        // algorithm with recursion elimination
	        function simplifyDouglasPeucker(points, sqTolerance) {

	            var len = points.length;
	            var MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array
	                    : Array;
	            var markers = new MarkerArray(len);
	            var first = 0;
	            var last = len - 1;
	            var stack = [];
	            var newPoints = [];
	            var i;
	            var maxSqDist;
	            var sqDist;
	            var index;

	            markers[first] = markers[last] = 1;

	            while (last) {

	                maxSqDist = 0;

	                for (i = first + 1; i < last; i++) {
	                    sqDist = getSqSegDist(points[i], points[first],
	                            points[last]);

	                    if (sqDist > maxSqDist) {
	                        index = i;
	                        maxSqDist = sqDist;
	                    }
	                }

	                if (maxSqDist > sqTolerance) {
	                    markers[index] = 1;
	                    stack.push(first, index, index, last);
	                }

	                last = stack.pop();
	                first = stack.pop();
	            }

	            for (i = 0; i < len; i++) {
	                if (markers[i])
	                    newPoints.push(points[i]);
	            }

	            return newPoints;
	        }

	        // both algorithms combined for awesome performance
	        function simplify(points, tolerance, highestQuality) {

	            if (points.length <= 1)
	                return points;

	            var sqTolerance = tolerance !== undefined ? tolerance * tolerance
	                    : 1;

	            points = highestQuality ? points : simplifyRadialDist(points,
	                    sqTolerance);
	            points = simplifyDouglasPeucker(points, sqTolerance);

	            return points;
	        }

	        return simplify;
	    })()
	});

	module.exports = CanvasTools;

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	// A very simple (< 100 LOC) promise A implementation without external dependencies.
	// MIT license. (c) Ubimix (c) Mikhail Kotelnikov
	module.exports = Deferred;
	Deferred.SYNC = false;
	function Deferred() {
	    var slots = [];
	    var done;
	    var doResolve = function(result) {
	        finish(function(slot) {
	            if (isFunction(slot.onResolve)) {
	                return slot.onResolve.call(undefined, result);
	            } else {
	                return result;
	            }
	        });
	    };
	    var doReject = function(err) {
	        finish(function(slot) {
	            if (isFunction(slot.onReject)) {
	                return slot.onReject.call(undefined, err);
	            } else {
	                throw err;
	            }
	        });
	    };
	    return {
	        promise : {
	            then : function(onResolve, onReject) {
	                var next = Deferred();
	                slots.push({
	                    onResolve : onResolve,
	                    onReject : onReject,
	                    next : next
	                });
	                if (done) {
	                    done();
	                }
	                return next.promise;
	            }
	        },
	        resolve : function(result) {
	            doResolve(result);
	        },
	        reject : function(err) {
	            doReject(err);
	        }
	    };
	    function finish(action) {
	        doResolve = doReject = function() {
	            // throw new Error('This promise is already resolved.');
	        };
	        var scheduled = false;
	        done = function() {
	            if (scheduled) {
	                return;
	            }
	            scheduled = true;
	            Deferred.nextTick(function() {
	                scheduled = false;
	                var prevSlots = slots;
	                slots = [];
	                for (var i = 0; i < prevSlots.length; i++) {
	                    var slot = prevSlots[i];
	                    var next = slot.next;
	                    try {
	                        result = action(slot);
	                        if (result === next) {
	                            throw new TypeError('Can not resolve promise ' + //
	                            'with itself');
	                        }
	                        var then = result ? result.then : null;
	                        if (isFunction(then)) {
	                            then.call(result, next.resolve, next.reject);
	                        } else {
	                            next.resolve.call(null, result);
	                        }
	                    } catch (err) {
	                        next.reject.call(null, err);
	                    }
	                }
	            });
	        };
	        done();
	    }
	    function isFunction(obj) {
	        return typeof obj === 'function';
	    }
	}
	Deferred.runSync = function() {
	    return Deferred.SYNC;
	};
	Deferred.nextTick = function(action) {
	    if (Deferred.runSync()) {
	        action();
	    } else {
	        setTimeout(action, 0);
	    }
	};


/***/ },
/* 13 */
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


/***/ }
/******/ ])
});
