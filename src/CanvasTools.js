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

        // Simplify lines
        polygons = this._simplify(polygons);
        holes = holes || [];
        for (var i = 0; i < holes.length; i++) {
            holes[i] = this._simplify(holes[i]);
        }

        var drawn = false;
        drawn |= this._drawPolygons(g, polygons, holes, fillStyles);
        // Draw lines around the polygon (external lines + lines
        // around holes)
        drawn |= this._drawLines(g, polygons, strokeStyles);
        for (var i = 0; i < holes.length; i++) {
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
        // Calculate clipped holes
        var clippedHoles = [];
        var len = holes ? holes.length : 0;
        for (var i = 0; i < len; i++) {
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
        for (var i = 0; i < clippedHoles.length; i++) {
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
        if (this._isEmptyValue(styles.lineWidth)
                || this._isEmptyValue(styles.globalAlpha))
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
        }
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
        for (j in clipPolygon) {
            var cp2 = clipPolygon[j];
            var inputList = outputList;
            outputList = [];
            s = inputList[inputList.length - 1]; // last on
            // the input
            // list
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
                var t = ((p[0] - x) * dx + (p[1] - y) * dy)
                        / (dx * dx + dy * dy);

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