module.exports = GeoJsonRenderer;

function GeoJsonRenderer() {
}

GeoJsonRenderer.prototype = {

    build : function(resource) {
        return GeoJsonRenderer.build(this, resource);
    },

    /**
     * Creates and returns a group corresponding to the specified resource and
     * containing all given features.
     */
    buildGroup : function(resource, features) {
        return;
    },

    /**
     * Creates and returns a marker object corresponding to the specified
     * resource with the given coordinates.
     */
    buildMarker : function(resource, coords) {
        return;
    },

    /** Draws a line corresponding to the specified sequence of points */
    buildLine : function(resource, coords) {
        return;
    },

    /**
     * Creates and returns a polygon with holes corresponding to the specified
     * resource.
     */
    buildPolygon : function(resource, coords, holes) {
        return;
    },

    /** Returns points corresponding to the given coordinates. */
    getProjectedPoints : function(coords) {
        return coords;
    },

};

/**
 * Builds a layer object corresponding to the specified resource.
 * 
 * @param factory
 *            creating new layers
 * @param resource
 *            the resource to render
 */
GeoJsonRenderer.build = function(factory, resource) {
    var that = this;
    var geometry = resource.geometry;
    if (!geometry) return;
    return buildGeometryLayer(geometry);

    /** Returns a valid layer corresponding to the specified features. */
    function getFeature(list) {
        if (list.length === 0) {
            return;
        } else if (list.length == 1) {
            return list[0];
        } else {
            return factory.buildGroup(resource, list);
        }
    }

    /** Draws a polygon corresponding to the specified coordinates. */
    function drawPolygon(coords) {
        var polygons = factory.getProjectedPoints(coords[0]);
        var holes = [];
        for (var i = 1; i < coords.length; i++) {
            var hole = factory.getProjectedPoints(coords[i]);
            if (hole && hole.length) {
                holes.push(hole);
            }
        }
        return factory.buildPolygon(resource, polygons, holes);
    }

    function buildGeometryLayer(geometry) {
        var result;
        var coords = geometry.coordinates;
        switch (geometry.type) {
            case 'Point':
                (function() {
                    var points = factory.getProjectedPoints([ coords ]);
                    if (points && points.length) {
                        result = factory.buildMarker(resource, points[0]);
                    }
                })();
                break;
            case 'MultiPoint':
                (function() {
                    var points = factory.getProjectedPoints(coords);
                    var markers = [];
                    for (var i = 0; i < points.length; i++) {
                        var point = points[i];
                        var marker = factory.buildMarker(resource, point);
                        markers.push(marker);
                    }
                    result = getFeature(markers);
                })();
                break;
            case 'LineString':
                (function() {
                    var points = factory.getProjectedPoints(coords);
                    result = factory.buildLine(resource, points);
                })();
                break;
            case 'MultiLineString':
                (function() {
                    var lines = [];
                    for (var i = 0; i < coords.length; i++) {
                        var points = factory.getProjectedPoints(coords[i]);
                        var line = factory.buildLine(resource, points);
                        lines.push(line);
                    }
                    result = getFeature(lines);
                })();
                break;
            case 'Polygon':
                (function() {
                    result = drawPolygon(coords);
                })();
                break;
            case 'MultiPolygon':
                (function() {
                    var polygons = [];
                    for (var i = 0; i < coords.length; i++) {
                        var polygon = drawPolygon(coords[i]);
                        if (polygon) {
                            polygons.push(polygon);
                        }
                    }
                    result = getFeature(polygons);
                })();
                break;
            case 'GeometryCollection':
                (function() {
                    var list = [];
                    var geoms = geometry.geometries;
                    for (var i = 0, len = geoms.length; i < len; i++) {
                        var layer = buildGeometryLayer(geoms[i]);
                        if (layer) {
                            list.push(layer);
                        }
                    }
                    result = getFeature(list);
                })();
                break;
        }
        return result;
    }
};
