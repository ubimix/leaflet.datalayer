var L = require('leaflet');
var P = require('./P');

/**
 * A common interface providing data for individual tiles. Used to
 * synchronously/asynchronously load data to render on tiles.
 */
var IDataProvider = L.Class.extend({

    /**
     * This method loads and returns an array of objects to show on tile
     * corresponding to the specified bounding box. This is a "do-nothing"
     * method and it should be overload in subclasses.
     * 
     * @param bbox
     *            bounding box for the tile; this bounding box includes a buffer
     *            zone around the tile so it is (by default) bigger than area
     *            corresponding to the tile
     * @param tilePoint
     *            a L.Point instance defining position of the tile
     */
    loadData : function(bbox, tilePoint) {
        return P.resolve([]);
    },

});

module.exports = IDataProvider;