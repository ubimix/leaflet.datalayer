var L = require('leaflet');
var DataRenderer = require('./DataRenderer');
var P = require('./P');

function GeometryUtils(context) {
    this.context = context;
}

GeometryUtils.prototype = {

    drawPoints : function(points, draw) {
        var info = draw(points);
        this._drawImage(info);
    },
    drawLine : function(points, draw) {
        var bbox = this.getBoundingBox();
        var clipped = [];
        var prev = points[0];
        for (var i = 1; i < points.length; i++) {
            var next = points[i];
            var line = GeometryUtils.clipLine([ prev, next ], bbox);
            if (line) {
                clipped.push(line);
            }
        }
        var info = draw(clipped);
        this._drawImage(info);
    },
    drawPolygon : function(polygons, holes, options) {
        var bbox = this.getBoundingPolygon([ 10, 10 ]);

        var clippedPolygons = GeometryUtils.clipPolygon(polygons, bbox);
        var clippedHoles = [];
        for (var i = 0; i < holes.length; i++) {
            var hole = GeometryUtils.clipPolygon(holes[i], bbox);
            if (hole.length) {
                clippedHoles.push(hole);
            }
        }
        if (!clippedPolygons.length)
            return;

        bbox = this.getBoundingBox([ 50, 50 ]);
        var allLines = GeometryUtils.clipLines(polygons, bbox) || [];
        for (var i = 0; i < holes.length; i++) {
            var lines = GeometryUtils.clipLines(holes[i], bbox);
            if (lines && lines.length) {
                allLines = allLines.concat(lines);
            }
        }
        var canvas = this.context.newCanvas();
        var size = this.context.getCanvasSize();
        canvas.width = size[0];
        canvas.height = size[1];
        var g = canvas.getContext('2d');

        g.fillStyle = options.fillColor || options.color;
        g.globalAlpha = options.fillOpacity || options.opacity || 1;
        g.globalCompositeOperation = 'source-over';
        this._drawPolygon(g, clippedPolygons);
        g.fill();

        g.globalCompositeOperation = 'destination-out';
        g.globalAlpha = 1;
        for (var i = 0; i < clippedHoles.length; i++) {
            if (clippedHoles[i].length) {
                this._drawPolygon(g, clippedHoles[i]);
                g.fill();
            }
        }

        if (allLines.length) {
            g = canvas.getContext('2d');
            g.strokeStyle = options.lineColor || options.color;
            g.globalAlpha = options.lineOpacity || options.opacity || 1;
            g.lineWidth = options.lineWidth || options.width || 1;
            g.globalCompositeOperation = 'source-over';
            g.beginPath();
            for (var i = 0; i < allLines.length; i++) {
                this._drawLines(g, allLines[i]);
                g.stroke();
            }
        }

        this._drawImage({
            image : canvas,
            anchor : [ 0, 0 ],
            data : options.data
        });
    },

    /** Returns bounding box for the underlying canvas. */
    getBoundingPolygon : function(buffer) {
        buffer = buffer || [ 0, 0 ];
        var size = this.context.getCanvasSize();
        return [ [ -buffer[0], -buffer[1] ],
                [ size[0] + buffer[0], -buffer[1] ],
                [ size[0] + buffer[0], size[1] + buffer[1] ],
                [ -buffer[0], size[1] + buffer[1] ] ];
    },

    getBoundingBox : function(buffer) {
        buffer = buffer || [ 0, 0 ];
        var size = this.context.getCanvasSize();
        return [ [ -buffer[0], -buffer[1] ],
                [ size[0] + buffer[0], size[1] + buffer[1] ] ];
    },

    _drawPolygon : function(g, coords) {
        if (!coords)
            return;
        g.beginPath();
        g.moveTo(coords[0][0], coords[0][1]);
        for (var i = 1; i < coords.length; i++) {
            g.lineTo(coords[i][0], coords[i][1]);
        }
        g.closePath();
    },

    _drawLines : function(g, line) {
        g.beginPath();
        g.moveTo(line[0][0], line[0][1]);
        for (var i = 1; i < line.length; i++) {
            g.lineTo(line[i][0], line[i][1]);
        }
    },

    _drawImage : function(info) {
        if (info && info.image) {
            var x = 0;
            var y = 0;
            if (info.anchor) {
                x = info.anchor[0];
                y = info.anchor[1];
            }
            this.context.draw(info.image, x, y, info.data);
        }

    },
}

GeometryUtils._computeOutcode = function(x, y, xmin, ymin, xmax, ymax) {
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
};

GeometryUtils.clipLines = function(lines, bounds) {
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
};

// Cohen-Sutherland line-clipping algorithm
GeometryUtils.clipLine = function(line, bbox) {
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

    var outcode1 = this._computeOutcode(x1, y1, xmin, ymin, xmax, ymax);
    var outcode2 = this._computeOutcode(x2, y2, xmin, ymin, xmax, ymax);
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
                outcode1 = this._computeOutcode(x1, y1, xmin, ymin, xmax, ymax);
            } else {
                x2 = x;
                y2 = y;
                outcode2 = this._computeOutcode(x2, y2, xmin, ymin, xmax, ymax);
            }
        }
    } while (!done);
    var result = [ [ x1, y1 ], [ x2, y2 ] ];
    return accept ? result : null;
};

// Sutherland Hodgman polygon clipping algorithm
// http://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping
GeometryUtils.clipPolygon = function(subjectPolygon, clipPolygon) {
    var cp1, cp2, s, e;
    var inside = function(p) {
        return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1])
                * (p[0] - cp1[0]);
    };
    var intersection = function() {
        var dc = [ cp1[0] - cp2[0], cp1[1] - cp2[1] ], dp = [ s[0] - e[0],
                s[1] - e[1] ], n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0], n2 = s[0]
                * e[1] - s[1] * e[0], n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
        return [ Math.round((n1 * dp[0] - n2 * dc[0]) * n3),
                Math.round((n1 * dp[1] - n2 * dc[1]) * n3) ];
    };
    var outputList = subjectPolygon;
    cp1 = clipPolygon[clipPolygon.length - 1];
    for (j in clipPolygon) {
        var cp2 = clipPolygon[j];
        var inputList = outputList;
        outputList = [];
        s = inputList[inputList.length - 1]; // last on the input list
        for (i in inputList) {
            var e = inputList[i];
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
};

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
        var utils = new GeometryUtils(context);
        drawGeometry(utils, geometry);
        return;

        function drawPoints(points) {
            utils.drawPoints(points, function(points) {
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
                    var info = {
                        data : resource
                    };
                    if (marker && marker.image) {
                        info.image = marker.image;
                        info.anchor = [ anchor[0], anchor[1] ];
                        if (marker.anchor) {
                            if (marker.anchor.x !== undefined) {
                                info.anchor[0] -= marker.anchor.x;
                                info.anchor[1] -= marker.anchor.y;
                            } else {
                                info.anchor[0] -= marker.anchor[0];
                                info.anchor[1] -= marker.anchor[1];
                            }
                        }
                    }
                    return info;
                }
            });
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
            utils.drawPolygon(polygons, holes, options);
        }

        function drawGeometry(utils, geometry) {
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
            fillOpacity : 0.5,
            fillColor : 'blue',
            lineColor : 'navy',
            lineOpacity : 1,
            lineWidth : 2,
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