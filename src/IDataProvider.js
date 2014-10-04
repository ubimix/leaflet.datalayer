var L = require('leaflet');

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
     *            bounding box for the tile; this bounding box includes a buffer
     *            zone around the tile so it is (by default) bigger than area
     *            corresponding to the tile
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
        },

    },

});

module.exports = IDataProvider;