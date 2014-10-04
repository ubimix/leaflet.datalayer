var P = require('./P');
var Utils = require('./DataUtils');

/**
 * A common interface providing data for individual tiles. Used to
 * synchronously/asynchronously load data to render on tiles.
 */
var IDataProvider = {

    /**
     * This method loads and returns an array of objects to show on tile
     * corresponding to the specified bounding box. This is a "do-nothing"
     * method and it should be overload in subclasses.
     * 
     * @param options.bbox
     *            bounding box for the tile; this bounding box includes a buffer
     *            zone around the tile so it is (by default) bigger than area
     *            corresponding to the tile
     * @param options.tilePoint
     *            an object with 'x' and 'y' fields defining position of the
     *            tile
     */
    loadData : function(options) {
        return P.resolve([]);
    },

};

module.exports = IDataProvider;