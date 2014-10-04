var L = require('leaflet');
var IDataRenderer = require('./IDataRenderer');
var IDataProvider = require('./IDataProvider');

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
     * Draws the specified resource and returns an image with x/y position of
     * this image on the tile. If this method returns nothing (or a
     * <code>null</code> value) then nothing is drawn for the specified
     * resource.
     * 
     * @return an object containing the following fields: a) 'image' - an Image
     *         or Canvas instance with the drawn result b) 'anchor' a L.Point
     *         object defining position on the returned image on the tile;
     */
    drawFeature : function(tilePoint, bbox, resource, callback) {
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
        return this._loadIconInfo(resource, function(err, icon) {
            if (err) {
                return callback(err);
            }
            icon = icon || {};
            var anchor = L.point(x, y);
            if (icon.anchor) {
                anchor._subtract(icon.anchor);
            }
            callback(null, {
                image : icon.image,
                anchor : anchor
            });
        });
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
     * Loads an icon corresponding to the specified resource and returns this
     * icon using the specified callback method.
     */
    _loadIconInfo : function(resource, callback) {
        try {
            var type = this._getResourceType(resource);
            var map = this._map;
            var zoom = map.getZoom();
            var indexKey = this._getResourceIconKey(resource, zoom);
            var iconIndex = this._iconIndex = this._iconIndex || {};
            var icon = iconIndex[indexKey];
            if (icon) {
                return callback(null, icon);
            } else {
                return this._drawResourceIcon(resource, function(err, icon) {
                    iconIndex[indexKey] = icon;
                    return callback(err, icon);
                });
            }
        } catch (err) {
            return callback(err);
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
     * Returns a cache key specific for the given resource type and the current
     * zoom level. This key is used to cache resource-specific icons for each
     * zoom level.
     */
    _getResourceIconKey : function(resource, zoom) {
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
    _drawResourceIcon : function(resource, callback) {
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
        this._drawMarker(g, lineWidth, lineWidth, //
        width - lineWidth * 2, height - lineWidth * 2, radius * 0.6);
        g.fill();
        g.stroke();
        return callback(null, {
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

module.exports = MarkersRenderer;