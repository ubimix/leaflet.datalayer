var L = require('leaflet');
var DataRenderer = require('./DataRenderer');
var P = require('./P');

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