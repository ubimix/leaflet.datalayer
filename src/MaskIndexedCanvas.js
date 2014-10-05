var L = require('leaflet');
var IIndexedCanvas = require('./IIndexedCanvas');

/**
 * This utility class allows to associate data with non-transparent pixels of
 * images drawn on canvas.
 */
var MaskIndexedCanvas = IIndexedCanvas.extend({

    /**
     * Initializes internal fields of this class.
     * 
     * @param options.canvas
     *            mandatory canvas object used to draw images
     * @param options.resolution
     *            optional resolution field defining precision of image areas
     *            associated with data; by default it is 4x4 pixel areas
     *            (resolution = 4)
     */
    initialize : function(options) {
        IIndexedCanvas.prototype.initialize.apply(this, arguments);
        var resolution = this.options.resolution || 4;
        this.options.resolutionX = this.options.resolutionX || resolution;
        this.options.resolutionY = this.options.resolutionY || //
        this.options.resolutionX || resolution;
        this._maskWidth = this._getMaskX(this._canvas.width);
        this._maskHeight = this._getMaskY(this._canvas.height);
        this._dataIndex = {};
    },

    /**
     * Draws the specified image in the given position on the underlying canvas.
     */
    draw : function(image, x, y, data) {
        IIndexedCanvas.prototype.draw.apply(this, arguments);
        // Associate non-transparent pixels of the image with data
        this._addToCanvasMask(image, x, y, data);
    },

    /**
     * Returns data associated with the specified position on the canvas.
     */
    getData : function(x, y) {
        var maskX = this._getMaskX(x);
        var maskY = this._getMaskY(y);
        var pos = maskY * this._maskWidth + maskX;
        var result = this._dataIndex[pos];
        return result;
    },

    /**
     * Removes all data from internal indexes and cleans up underlying canvas.
     */
    reset : function() {
        IIndexedCanvas.prototype.reset.apply(this, arguments);
        this._dataIndex = {};
    },

    // ------------------------------------------------------------------
    // Private methods

    /**
     * Adds all pixels occupied by the specified image to a data mask associated
     * with canvas.
     */
    _addToCanvasMask : function(image, shiftX, shiftY, data) {
        var mask = this._getImageMask(image);
        var imageMaskWidth = this._getMaskX(image.width);
        var maskShiftX = this._getMaskX(shiftX);
        var maskShiftY = this._getMaskY(shiftY);
        for (var i = 0; i < mask.length; i++) {
            if (!mask[i])
                continue;
            var x = maskShiftX + (i % imageMaskWidth);
            var y = maskShiftY + Math.floor(i / imageMaskWidth);
            if (x >= 0 && x < this._maskWidth && y >= 0 && //
            y < this._maskHeight) {
                this._dataIndex[y * this._maskWidth + x] = data;
            }
        }
    },

    /**
     * Returns a mask corresponding to the specified image.
     */
    _getImageMask : function(image) {
        var maskIndex = this._getImageMaskIndex();
        if (!maskIndex) {
            return this._buildImageMask(image);
        }
        var imageId = this._getImageKey(image);
        var mask = maskIndex[imageId];
        if (!mask) {
            mask = this._buildImageMask(image);
            maskIndex[imageId] = mask;
        }
        return mask;
    },

    /**
     * Returns a unique key of the specified image.
     */
    _getImageKey : function(image) {
        return L.stamp(image);
    },

    /**
     * This method maintain an index of image masks associated with the provided
     * canvas. This method could be overloaded to implement a global index of
     * image masks.
     */
    _getImageMaskIndex : function() {
        return this.options.maskIndex;
    },

    /** Creates and returns an image mask. */
    _buildImageMask : function(image) {
        var canvas = this._newCanvas();
        var g = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        g.drawImage(image, 0, 0);
        var data = g.getImageData(0, 0, image.width, image.height).data;
        var maskWidth = this._getMaskX(image.width);
        var maskHeight = this._getMaskY(image.height);
        var mask = new Array(image.width * image.height);
        for (var y = 0; y < image.height; y++) {
            for (var x = 0; x < image.width; x++) {
                var idx = (y * image.width + x) * 4 + 3; // Alpha
                // channel
                var maskX = this._getMaskX(x);
                var maskY = this._getMaskY(y);
                mask[maskY * maskWidth + maskX] = data[idx] ? 1 : 0;
            }
        }
        return mask;
    },

    /**
     * Creates and returns a new canvas instance. Could be overloaded in
     * subclasses.
     */
    _newCanvas : function() {
        return document.createElement('canvas');
    },

    /**
     * Transforms a X coordinate on canvas to X coordinate in the mask.
     */
    _getMaskX : function(x) {
        var resolutionX = this.options.resolutionX;
        return Math.round(x / resolutionX);
    },

    /**
     * Transforms Y coordinate on canvas to Y coordinate in the mask.
     */
    _getMaskY : function(y) {
        var resolutionY = this.options.resolutionY;
        return Math.round(y / resolutionY);
    }
});

module.exports = MaskIndexedCanvas;