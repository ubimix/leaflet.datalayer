var L = require('leaflet');

/**
 * A common interface visualizing data on canvas.
 */
var IDataRenderer = L.Class.extend({

    /** Set options for this class. */
    initialize : function(options) {
        L.setOptions(this, options || {});
    },

    /**
     * Returns a point (L.Point instance) defining a buffer zone size in pixels
     * around each tile.
     */
    getBufferZoneSize : function() {
        return L.point(0, 0);
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
        var error = null;
        var result = {
            image : null,
            anchor : L.point(0, 0)
        };
        callback(error, result);
    },

    // --------------------------------------------------------------------
    // Lifecycle methods used to initialize internal fields

    /**
     * This method is called when the parent layer is added to the map.
     */
    onAdd : function(layer) {
        this._layer = layer;
        this._map = layer._map;
    },

    /**
     * This method is called when the paren layer is removed from the map.
     */
    onRemove : function(layer) {
        delete this._layer;
        delete this._map;
    },

});
module.exports = IDataRenderer;