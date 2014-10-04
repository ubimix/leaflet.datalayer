var L = require('leaflet');
/** Static utility methods */
module.exports = {

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

};