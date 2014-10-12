var L = require('leaflet');
var DataRenderer = require('./DataRenderer');
var P = require('./P');

var PATTERN = new Image();
PATTERN.src = "./img_lamp.jpg";

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
        var size = this._layer._getTileSize() / 4;
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
     * Draws the specified resource on the given canvas context. This method
     * should be overloaded in subclasses.
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
            for (var i = 0; i < points.length; i++) {
                var anchor = points[i];
                var cacheKey = that._getMarkerCacheKey(resource, context);
                var marker;
                if (cacheKey) {
                    marker = that._markerCache[cacheKey];
                }
                if (!marker) {
                    marker = that._newResourceMarker(resource, context);
                    if (marker && marker.image && cacheKey) {
                        that._markerCache[cacheKey] = marker;
                        // Allow to re-use image mask to avoid cost
                        // re-building
                        context.setImageKey(marker.image);
                    }
                }
                if (marker && marker.image) {
                    var anchor = [ anchor[0], anchor[1] ];
                    if (marker.anchor) {
                        if (marker.anchor.x !== undefined) {
                            anchor[0] -= marker.anchor.x;
                            anchor[1] -= marker.anchor.y;
                        } else {
                            anchor[0] -= marker.anchor[0];
                            anchor[1] -= marker.anchor[1];
                        }
                    }
                    context.drawImage(marker.image, anchor, {
                        data : resource
                    });
                }
            }
        }

        function drawLine(points) {
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
        }

        function drawGeometry(geometry) {
            var coords = geometry.coordinates;
            switch (geometry.type) {
            case 'Point':
                var point = that._getProjectedPoint(context, coords);
                drawPoints([ point ]);
                break;
            case 'MultiPoint':
                var points = that._getProjectedPoints(context, coords);
                drawPoints(points);
                break;
            case 'LineString':
                var points = that._getProjectedPoints(context, coords);
                drawLine(points);
                break;
            case 'MultiLineString':
                var points = [];
                for (var i = 0; i < coords.length; i++) {
                    var p = that._getProjectedPoints(context, coords[i]);
                    points = points.concat(p);
                }
                drawLine(points);
                break;
            case 'Polygon':
                drawPolygon(coords);
                break;
            case 'MultiPolygon':
                for (var i = 0; i < coords.length; i++) {
                    drawPolygon(coords[i]);
                }
                break;
            case 'GeometryCollection':
                var geoms = geometry.geometries;
                for (var i = 0, len = geoms.length; i < len; i++) {
                    drawGeometry(geoms[i]);
                }
                break;
            }
        }
    },

    _getPolygonOptions : function(context, resource) {
        return {
            fillOpacity : 0.3,
            fillColor : 'green',
            lineColor : 'white',
            lineOpacity : 1,
            lineWidth : 1,
            // fillImage : PATTERN,
            data : resource
        }
    },

    // ------------------------------------------------------------------

    /** Draws a line corresponding to the specified sequence of points. */
    _drawLine : function(context, points, resource) {
    },

    // ------------------------------------------------------------------

    /**
     * Draws a polygon corresponding to the specified filled areas and holes
     */
    _drawPolygon : function(context, polygons, holes, resource) {
        if (!polygons.length)
            return;
        function draw(g, coords) {
            if (!coords)
                return;
            g.beginPath();
            g.moveTo(coords[0][0], coords[0][1]);
            for (var i = 1; i < coords.length; i++) {
                g.lineTo(coords[i][0], coords[i][1]);
            }
            g.closePath();
        }
        var canvas = this._newCanvas();
        var size = context.getCanvasSize();
        canvas.width = size[0];
        canvas.height = size[1];
        var g = canvas.getContext('2d');

        g.fillStyle = 'green';
        g.globalAlpha = 0.5;
        g.globalCompositeOperation = 'source-over';
        draw(g, polygons);
        g.fill();

        g.globalCompositeOperation = 'source-out';
        g.globalAlpha = 1;
        for (var i = 0; i < holes.length; i++) {
            draw(g, holes[i]);
            g.fill();
        }

        context.draw(canvas, 0, 0, resource);
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
        var canvas = this._newCanvas();
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

    /** Creates and returns a new canvas object. */
    _newCanvas : function() {
        return document.createElement('canvas');
    }

});

module.exports = GeometryRenderer;