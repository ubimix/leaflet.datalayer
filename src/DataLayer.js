var L = require('leaflet');
var SimpleDataProvider = require('./SimpleDataProvider');
var MarkersRenderer = require('./MarkersRenderer');
var P = require('./P');

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

        var dataProvider = that._getDataProvider();
        var dataRenderer = that._getDataRenderer();
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