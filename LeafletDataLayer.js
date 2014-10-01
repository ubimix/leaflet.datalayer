/*
 * Leaflet layer visualizing data on canvas tiles.
 *  (c) 2014, Ubimix SAS
 *  (c) 2014, Mikhail Kotelnikov
 */
if (typeof define !== "function" || !define.amd) {
    var define = function(deps, definition) {
        if (typeof module === 'object' && typeof module.exports === 'object') {
            module.exports = definition([ require('L'), require('rbush') ]);
        } else {
            window.LeafletDataLayer = definition(window.L, window.rbush);
        }
    };
}
define([ 'leaflet', 'rbush' ], function(L, rbush) {

    // --------------------------------------------------------------------
    /**
     * This utility class allows to associate data with non-transparent pixels
     * of images drawn on canvas.
     */
    var IndexedCanvas = L.Class.extend({

        /**
         * Initializes internal fields of this class.
         * 
         * @param options.canvas
         *            mandatory canvas object used to draw images
         * @param options.resolution
         *            optional resolution field defining precision of image
         *            areas associated with data; by default it is 4x4 pixel
         *            areas (resolution = 4)
         */
        initialize : function(options) {
            L.setOptions(this, options);
            var resolution = this.options.resolution || 4;
            this.options.resolutionX = this.options.resolutionX || resolution;
            this.options.resolutionY = this.options.resolutionY || //
            this.options.resolutionX || resolution;
            this._canvas = this.options.canvas;
            this._maskWidth = this._getMaskX(this._canvas.width);
            this._maskHeight = this._getMaskY(this._canvas.height);
            this._dataIndex = {};
        },

        /**
         * Draws the specified image in the given position on the underlying
         * canvas.
         */
        draw : function(image, x, y, data) {
            // Draw the image on the canvas
            var g = this._canvas.getContext('2d');
            g.drawImage(image, x, y);
            // Associate non-transparent pixels of the image with data
            this._addToCanvasMask(image, x, y, data);
        },

        /** Returns data associated with the specified position on the canvas. */
        getData : function(x, y) {
            var maskX = this._getMaskX(x);
            var maskY = this._getMaskY(y);
            var pos = maskY * this._maskWidth + maskX;
            var result = this._dataIndex[pos];
            return result;
        },

        /**
         * Removes all data from internal indexes and cleans up underlying
         * canvas.
         */
        reset : function() {
            this._dataIndex = {};
            if (this._maskIndex) {
                this._maskIndex = {};
            }
            var g = this._canvas.getContext('2d');
            g.clearRect(0, 0, this._canvas.width, this._canvas.height);
        },

        // ------------------------------------------------------------------
        // Private methods

        /**
         * Adds all pixels occupied by the specified image to a data mask
         * associated with canvas.
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
            var imageId = this._getImageKey(image);
            var mask = maskIndex[imageId];
            if (!mask) {
                mask = this._buildImageMask(image);
                maskIndex[imageId] = mask;
            }
            return mask;
        },

        /** Returns a unique key of the specified image. */
        _getImageKey : function(image) {
            return L.Util.stamp(image);
        },

        /**
         * This method maintain an index of image masks associated with the
         * provided canvas. This method could be overloaded to implement a
         * global index of image masks.
         */
        _getImageMaskIndex : function() {
            if (this.options.maskIndex)
                return this.options.maskIndex;
            this._maskIndex = this._maskIndex || {};
            return this._maskIndex;
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
                    var idx = (y * image.width + x) * 4 + 3; // Alpha channel
                    var maskX = this._getMaskX(x);
                    var maskY = this._getMaskY(y);
                    mask[maskY * maskWidth + maskX] = data[idx] ? 1 : 0;
                }
            }
            return mask;
        },

        _newCanvas : function() {
            return document.createElement('canvas');
        },

        /** Transforms an X coordinate on canvas to X coordinate in the mask. */
        _getMaskX : function(x) {
            var resolutionX = this.options.resolutionX;
            return Math.round(x / resolutionX);
        },

        /** Transforms a Y coordinate on canvas to Y coordinate in the mask. */
        _getMaskY : function(y) {
            var resolutionY = this.options.resolutionY;
            return Math.round(y / resolutionY);
        }
    });

    // --------------------------------------------------------------------
    // Data providers

    /**
     * A common interface providing data for individual tiles. Used to
     * synchronously/asynchronously load data to render on tiles.
     */
    var IDataProvider = L.Class.extend({

        /**
         * This method loads returns an array of objects to show on tile
         * corresponding to the specified bounding box. This is a "do-nothing"
         * method and it should be overload in subclasses.
         * 
         * @param bbox
         *            bounding box for the tile; this bounding box includes a
         *            buffer zone around the tile so it is (by default) bigger
         *            than area corresponding to the tile
         * @param tilePoint
         *            a L.Point instance defining position of the tile
         * @param callback
         *            a callback function accepting the following parameters: 1)
         *            error 2) resulting array of objects to draw
         */
        loadData : function(bbox, tilePoint, callback) {
            callback([]);
        },

        /** Static utility methods */
        statics : {

            /** Returns a bounding box for a GeoJson object. */
            getGeoJsonBoundingBox : function(d) {
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
            },

        },

    });

    /**
     * A simple data provider synchronously indexing the given data using an
     * RTree index.
     */
    var SimpleDataProvider = IDataProvider.extend({

        /** Initializes this object and indexes the initial data set. */
        initialize : function(options) {
            L.setOptions(this, options);
            this.setData(this.options.data);
        },

        /** Sets and indexes the given data */
        setData : function(data) {
            this._indexData(data);
        },

        /**
         * Loads and returns indexed data contained in the specified bounding
         * box.
         */
        loadData : function(bbox, tilePoint, callback) {
            var that = this;
            var results = that._searchInBbox(bbox);
            callback(null, results);
        },

        /** Indexes the specified data array using a RTree index. */
        _indexData : function(data) {
            // Data indexing
            this._rtree = rbush(9);
            data = data || [];
            var array = [];
            L.Util.invokeEach(data, function(i, d) {
                var bbox = this._getBoundingBox(d);
                if (bbox) {
                    var coords = this._toIndexKey(bbox);
                    coords.data = d;
                    array.push(coords);
                }
            }, this);
            this._rtree.load(array);
        },

        /** Searches resources in the specified bounding box. */
        _searchInBbox : function(bbox, point) {
            var coords = this._toIndexKey(bbox);
            var p = point ? [ point.lat, point.lng ] : //
            [ coords[0], coords[1] ];
            var array = this._rtree.search(coords);
            // Sort points by Manhattan distance to the origin point
            array.sort(function(a, b) {
                var d1 = Math.abs(a[0] - p[0]) + Math.abs(a[1] - p[1]);
                var d2 = Math.abs(b[0] - p[0]) + Math.abs(b[1] - p[1]);
                return d1 - d2;
            });
            var result = [];
            L.Util.invokeEach(array, function(i, arr) {
                result.push(arr.data);
            });
            return result;
        },

        /**
         * This method transforms a L.LatLngBounds instance into a key for RTree
         * index.
         */
        _toIndexKey : function(bbox) {
            var sw = bbox.getSouthWest();
            var ne = bbox.getNorthEast();
            var coords = [ sw.lat, sw.lng, ne.lat, ne.lng ];
            return coords;
        },

        /**
         * Returns a L.LatLngBounds instance defining a bounding box ([south,
         * west, north, east]) for the specified object.
         */
        _getBoundingBox : IDataProvider.getGeoJsonBoundingBox,

    });

    // --------------------------------------------------------------------
    // Data visualization class

    /**
     * A common interface visualizing data on canvas.
     */
    var IDataRenderer = L.Class.extend({

        /** Set options for this class. */
        initialize : function(options) {
            L.setOptions(this, options || {});
        },

        /**
         * Returns a point (L.Point instance) defining a buffer zone size in
         * pixels around each tile.
         */
        getBufferZoneSize : function() {
            return L.point(0, 0);
        },

        /**
         * Draws the specified resource and returns an image with x/y position
         * of this image on the tile. If this method returns nothing (or a
         * <code>null</code> value) then nothing is drawn for the specified
         * resource.
         * 
         * @return an object containing the following fields: a) 'image' - an
         *         Image or Canvas instance with the drawn result b) 'anchor' a
         *         L.Point object defining position on the returned image on the
         *         tile;
         */
        drawFeature : function(tilePoint, bbox, resource, callback) {
            var error = null;
            var result = {
                image : null,
                anchor : L.point(0, 0)
            };
            callback(error, result);
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

    /** Initializes internal methods. */
    function AnimationProcessor(context) {
        var that = this || {};
        that._context = context || window;
        that.requestAnimationFrame = (function(context) {
            return (context.requestAnimationFrame || //
            context.mozRequestAnimationFrame || //
            context.webkitRequestAnimationFrame || //
            context.msRequestAnimationFrame || //
            function(callback) {
                return context.setTimeout(callback, 1000 / 60);
            });
        })(that._context);
        that.cancelAnimationFrame = (function(context) {
            return (context.cancelAnimationFrame || //
            context.mozCancelAnimationFrame || //
            context.webkitCancelAnimationFrame || //
            context.msCancelAnimationFrame || //
            function(id) {
                clearTimeout(id);
            });
        })(that._context);
        that.cancel = function(id) {
            this.cancelAnimationFrame.call(this._context, id);
        }
        that.render = function(action) {
            return this.requestAnimationFrame.call(this._context, action);
        }
        return that;
    }

    /**
     * A common interface visualizing data on canvas.
     */
    var MarkersRenderer = IDataRenderer.extend({

        /**
         * Returns a buffer zone size (in pixels) around each tile.
         */
        getBufferZoneSize : function() {
            var r = this._getRadius() * 2.5;
            return L.point(r, r);
        },

        /**
         * Draws the specified resource and returns an image with x/y position
         * of this image on the tile. If this method returns nothing (or a
         * <code>null</code> value) then nothing is drawn for the specified
         * resource.
         * 
         * @return an object containing the following fields: a) 'image' - an
         *         Image or Canvas instance with the drawn result b) 'anchor' a
         *         L.Point object defining position on the returned image on the
         *         tile;
         */
        drawFeature : function(tilePoint, bbox, resource, callback) {
            try {
                var coords = this._getCoordinates(resource);
                if (!coords) {
                    callback(null, null);
                    return;
                }
                var p = this._map.project(coords);
                var tileSize = this._layer._getTileSize();
                var s = tilePoint.multiplyBy(tileSize);
                var x = Math.round(p.x - s.x);
                var y = Math.round(p.y - s.y);
                var anchor = L.point(x, y);
                this._getIconInfo(resource, function(icon) {
                    var image, err;
                    try {
                        icon = icon || {};
                        if (icon.anchor) {
                            anchor._subtract(icon.anchor);
                        }
                        image = icon.image;
                    } catch (e) {
                        err = e;
                    } finally {
                        callback(err, {
                            image : image,
                            anchor : anchor
                        });
                    }
                });
            } catch (err) {
                callback(err);
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
            var bbox = IDataProvider.getGeoJsonBoundingBox(d);
            if (!bbox)
                return null;
            return bbox.getCenter();
        },

        /**
         * Loads and returns icon information corresponding to the specified
         * resource.
         */
        _getIconInfo : function(resource, callback) {
            var err, icon;
            try {
                var map = this._map;
                var zoom = map.getZoom();
                var indexKey = this._getResourceIconKey(resource, zoom);
                var iconIndex = this._iconIndex = this._iconIndex || {};
                icon = iconIndex[indexKey];
                if (icon) {
                    return icon;
                }
                var loading = this._loading = this._loading || {};
                var queue = loading[indexKey];
                if (!queue) {
                    queue = loading[indexKey] = [];
                    queue.done = function(icon) {
                        iconIndex[indexKey] = icon;
                        delete loading[indexKey];
                        for (var i = 0; i < queue.length; i++) {
                            queue[i](icon);
                        }
                    };
                    icon = this._drawResourceIcon(resource, queue.done);
                }
                queue.push(callback);
                if (icon) {
                    callback = queue.done;
                }
            } catch (e) {
                icon = {
                    error : e
                }
            } finally {
                if (icon !== undefined) {
                    callback(icon);
                }
            }
        },

        // --------------------------------------------------------------------

        /** Returns an option value */
        _getOptionValue : function(key) {
            var val = this.options[key];
            if (typeof val === 'function') {
                var args = _.toArray(arguments);
                args.splice(0, 1);
                val = val.apply(this.options, args);
            }
            return val;
        },

        /** Returns an option value */
        _getVal : function(key, defaultValue) {
            return this._getOptionValue(key, this._map.getZoom()) || //
            defaultValue;
        },

        /** Get the radius of markers. */
        _getRadius : function(defaultValue) {
            return this._getVal('radius', 16);
        },

        // --------------------------------------------------------------------
        // Resource-specific methods

        /**
         * Returns a cache key specific for the given resource type and the
         * current zoom level. This key is used to cache resource-specific icons
         * for each zoom level.
         */
        _getResourceIconKey : function(resource, zoom) {
            var type = this._getResourceType(resource);
            var indexKey = zoom + ':' + type;
            return indexKey;
        },

        /**
         * Draws an icon and returns information about it as an object with the
         * following fields: a) 'image' - an Image or a Canvas instance b)
         * 'anchor' a L.Point instance defining the position on the icon
         * corresponding to the resource coordinates. This method can return
         * values asyncrhonously using the specified callback method.
         */
        _drawResourceIcon : function(resource, callback) {
            var type = this._getResourceType(resource);
            return this._drawIcon(type, callback);
        },

        /** Returns the type (as a string) of the specified resource. */
        _getResourceType : function(resource) {
            return 'resource';
        },

        /**
         * Draws an icon and returns information about it as an object with the
         * following fields: a) 'image' - an Image or a Canvas instance b)
         * 'anchor' a L.Point instance defining the position on the icon
         * corresponding to the resource coordinates
         */
        _drawIcon : function(type, callback) {
            var radius = this._getRadius();
            var canvas = document.createElement('canvas');
            var lineWidth = this._getVal('lineWidth', 1);
            var width = radius * 2;
            var height = radius * 2;
            canvas.height = height;
            canvas.width = width;
            radius -= lineWidth;
            var g = canvas.getContext('2d');
            g.fillStyle = this._getVal('fillColor', 'white');
            g.globalAlpha = this._getVal('fillOpacity', 1);
            g.strokeStyle = this._getVal('lineColor', 'gray');
            g.lineWidth = lineWidth;
            g.lineCap = 'round';
            this._drawMarker(g, lineWidth, lineWidth, width - lineWidth * 2,
                    height - lineWidth * 2, radius * 0.6);
            g.fill();
            g.stroke();
            callback({
                image : canvas,
                anchor : L.point(width / 2, height)
            });
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
    });

    // --------------------------------------------------------------------
    // The main class

    /**
     * This layer draws data on canvas tiles. This class uses the following
     * parameters from the constructor: 1) 'dataProvider' is a IDataProvider
     * instance allowing asynchronously load data for each tile; by default a
     * SimpleDataProvider is used 2) 'dataRenderer' is a IDataRenderer instance
     * responsible for data visualization on canvas tiles; by default a
     * MarkersRenderer instance is used
     */
    var LeafletDataLayer = L.TileLayer.Canvas.extend({

        // References to classes
        statics : {
            IDataProvider : IDataProvider,
            SimpleDataProvider : SimpleDataProvider,
            IDataRenderer : IDataRenderer,
            MarkersRenderer : MarkersRenderer,
            IndexedCanvas : IndexedCanvas
        },

        /** Default options of this class. */
        options : {

            // Default size of a minimal clickable zone is 4x4 screen pixels.
            resolution : 4,

            // Show pointer cursor for zones associated with data
            pointerCursor : true,

            // Asynchronous tiles drawing
            async : true,

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
            // Not used anymore. Deprecated. To remove.
            this._canvasLayer = this;
            this._processor = new AnimationProcessor();
            options.fillOpacity = options.opacity;
            delete options.opacity;
            var url = null;
            L.TileLayer.Canvas.prototype.initialize.apply(this, url, options);
            L.setOptions(this, options);
            // Use a global index for image masks used by this layer.
            // This index accelerates mapping of individual rendered objects
            // but it is useful only if multiple objects have the same visual
            // representation on the map.
            if (this.options.reuseMasks) {
                this.options.maskIndex = this.options.maskIndex || {};
            }
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
            var pane = this._getDataLayersPane();
            L.DomEvent[onoff](pane, 'click', this._onMouseClick, this);
            var events = [ 'mouseover', 'mouseout', 'mousemove' ];
            for (var i = 0; i < events.length; i++) {
                L.DomEvent[onoff](pane, events[i], this._fireMouseEvent, this);
            }
        },

        /** Handles mouse click events */
        _onMouseClick : function(e) {
            if (this._map.dragging && this._map.dragging.moved()) {
                return;
            }
            this._fireMouseEvent(e);
        },

        /** Fires mouse events for this layer */
        _fireMouseEvent : function(e) {
            // if (!this.hasEventListeners(e.type)) {
            // return;
            // }
            var map = this._map;
            var containerPoint = map.mouseEventToContainerPoint(e);
            var layerPoint = map.containerPointToLayerPoint(containerPoint);
            var latlng = map.layerPointToLatLng(layerPoint);
            var event = {
                latlng : latlng,
                layerPoint : layerPoint.round(),
                containerPoint : containerPoint,
                originalEvent : e
            };
            var cancel = false;
            if (e.type === 'mouseover' || e.type === 'mouseout'
                    || e.type === 'mousemove') {
                cancel = this._move(event);
            } else if (e.type === 'click') {
                cancel = this._click(event);
            }
            if (cancel) {
                L.DomEvent.stopPropagation(e);
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
         * Checks if the cursor style of the container should be changed to
         * pointer cursor
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
         * Returns the underlying data provider object (a IDataProvider
         * instance).
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
         * This method is called when a tile is removed from the map. It cleans
         * up data associated with this tile.
         */
        _onTileUnload : function(evt) {
            var canvas = evt.tile;
            if (canvas._index) {
                canvas._index.reset();
                delete canvas._index;
            }
        },

        /**
         * This method is used to draw on canvas tiles. It is invoked by the
         * parent L.TileLayer.Canvas class.
         */
        _redrawTile : function(canvas) {
            var that = this;
            var tilePoint = canvas._tilePoint;
            var bbox = this._getTileBoundingBox(tilePoint);
            var dataProvider = this._getDataProvider();
            function renderData(data) {
                var inc = 0;
                var dec = 0;
                function guard(f) {
                    return function() {
                        inc++;
                        try {
                            return f.apply(this, arguments);
                        } catch (err) {
                            console.log('ERRR', err);
                        } finally {
                            dec++;
                            if (inc === dec) {
                                that.tileDrawn(canvas);
                            }
                        }
                    };
                }
                L.Util.invokeEach(data, guard(function(i, d) {
                    var dataRenderer = that._getDataRenderer();
                    dataRenderer.drawFeature(tilePoint, bbox, d, //
                    guard(function(error, ctx) {
                        if (error) {
                            that._handleRenderError(canvas, tilePoint, error);
                        } else if (ctx && ctx.image) {
                            var index = that._getCanvasIndex(canvas, true);
                            index.draw(ctx.image, //
                            ctx.anchor.x, ctx.anchor.y, d);
                        }
                    }));
                }));
            }
            dataProvider.loadData(bbox, tilePoint, function(error, data) {
                if (error) {
                    that._handleRenderError(canvas, tilePoint, error);
                    that.tileDrawn(canvas);
                    return;
                }
                if (!data || data.length === 0) {
                    that.tileDrawn(canvas);
                    return;
                }

                that._processor.render(function() {
                    try {
                        renderData(data);
                    } catch (error) {
                        that._handleRenderError(canvas, tilePoint, error);
                        that.tileDrawn(canvas);
                    }
                });
            });
        },

        /**
         * Reports a rendering error
         */
        _handleRenderError : function(canvas, tilePoint, error) {
            // TODO: visualize the error on the canvas
            console.log('ERROR', error);
        },

        /**
         * Returns a bounding box around a tile with the specified coordinates.
         * This bounding box is used to load data to show on the tile. The
         * returned bounding box is bigger than tile - it includes a buffer zone
         * used to avoid clipping of rendered data. The size of the additional
         * buffering zone is defined by the "IDataRenderer.getBufferZoneSize"
         * method.
         */
        _getTileBoundingBox : function(tilePoint) {
            var that = this;
            var tileSize = that._getTileSize();
            var nwPoint = tilePoint.multiplyBy(tileSize);
            var sePoint = nwPoint.add(new L.Point(tileSize, tileSize));
            var dataRenderer = this._getDataRenderer();
            var bufferSize = dataRenderer.getBufferZoneSize();
            nwPoint = nwPoint.subtract(bufferSize);
            sePoint = sePoint.add(bufferSize);
            var bbox = new L.LatLngBounds(that._map.unproject(sePoint),
                    that._map.unproject(nwPoint));
            return bbox;
        },

        /**
         * Returns a IDataRenderer renderer instance responsible for data
         * visualization.
         */
        _getDataRenderer : function() {
            if (!this.options.dataRenderer) {
                this.options.dataRenderer = new MarkersRenderer();
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
                var index = this._getCanvasIndex(canvas, false);
                if (index) {
                    var canvasX = point.x % tileSize;
                    var canvasY = point.y % tileSize;
                    data = index.getData(canvasX, canvasY);
                }
            }
            e.data = data;
            return e;
        },

        /**
         * Returns an IndexedCanvas instance associated with the specified
         * canvas.
         */
        _getCanvasIndex : function(canvas, create) {
            if (!canvas._index && create) {
                var maskIndex = this.options.maskIndex || {};
                canvas._index = new IndexedCanvas({
                    canvas : canvas,
                    maskIndex : maskIndex
                });
            }
            return canvas._index;
        },

    });

    return LeafletDataLayer;

});
