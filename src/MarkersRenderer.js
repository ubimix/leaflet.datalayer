var L = require('leaflet');
var DataRenderer = require('./DataRenderer');
var DataUtils = require('./DataUtils');
var P = require('./P');

/**
 * A common interface visualizing data on canvas.
 */
function MarkersRenderer(options) {
    this.initialize(options);
}
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
        var tilePoint = context.options.tilePoint;
        var anchor = this._getPositionOnTile(resource, context);
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

    /**
     * Returns position (in pixels) of the specified geographic point on the
     * canvas tile.
     */
    _getPositionOnTile : function(resource, context) {
        var latlng = this._getCoordinates(resource);
        if (!latlng) {
            return;
        }
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
    }
});

module.exports = MarkersRenderer;