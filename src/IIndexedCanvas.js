var L = require('leaflet');

/**
 * This utility class allows to associate data with non-transparent pixels of
 * images drawn on canvas.
 */
var IIndexedCanvas = L.Class.extend({

    /**
     * Initializes internal fields of this class.
     * 
     * @param options.canvas
     *            mandatory canvas object used to draw images
     */
    initialize : function(options) {
        L.setOptions(this, options);
        this._canvas = this.options.canvas;
    },

    /**
     * Draws the specified image in the given position on the underlying canvas.
     */
    draw : function(image, x, y, data) {
        // Draw the image on the canvas
        var g = this._canvas.getContext('2d');
        g.drawImage(image, x, y);
    },

    /**
     * Returns data associated with the specified position on the canvas. This
     * method should be overloaded in subclasses to return real values.
     */
    getData : function(x, y) {
        var result = null;
        return result;
    },

    /**
     * Removes all data from internal indexes and cleans up underlying canvas.
     */
    reset : function() {
        var g = this._canvas.getContext('2d');
        g.clearRect(0, 0, this._canvas.width, this._canvas.height);
    },
});

module.exports = IIndexedCanvas;