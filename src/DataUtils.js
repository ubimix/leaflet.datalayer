var L = require('leaflet');

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