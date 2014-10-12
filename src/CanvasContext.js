var CanvasTools = require('./CanvasTools');

/**
 * This utility class allows to associate data with non-transparent pixels of
 * images drawn on canvas.
 */
function CanvasContext() {
    CanvasTools.apply(this, arguments);
}
CanvasTools.extend(CanvasContext, CanvasTools);
CanvasContext.extend(CanvasContext.prototype, CanvasTools.prototype);
CanvasContext.extend(CanvasContext.prototype, {

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
        CanvasTools.prototype.initialize.apply(this, arguments);
        this._canvas = this.options.canvas;
        this._canvasContext = this._canvas.getContext('2d');
        var resolution = this.options.resolution || 4;
        this.options.resolutionX = this.options.resolutionX || resolution;
        this.options.resolutionY = this.options.resolutionY || //
        this.options.resolutionX || resolution;
        this._maskWidth = this._getMaskX(this._canvas.width);
        this._maskHeight = this._getMaskY(this._canvas.height);
        this._dataIndex = {};
    },

    /** Returns an array with width and height of the canvas. */
    getCanvasSize : function() {
        return [ this._canvas.width, this._canvas.height ];
    },

    /**
     * Draws the specified image in the given position on the underlying canvas.
     */
    drawImage : function(image, position, options) {
        var x = position[0];
        var y = position[1];
        // Draw the image on the canvas
        this._canvasContext.drawImage(image, x, y);
        // Associate non-transparent pixels of the image with data
        this._addToCanvasMask(image, x, y, options.data);
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
        var g = this._canvasContext;
        g.clearRect(0, 0, this._canvas.width, this._canvas.height);
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
            if (x >= 0 && x < this._maskWidth && //
            y >= 0 && y < this._maskHeight) {
                this._dataIndex[y * this._maskWidth + x] = data;
            }
        }
    },

    /**
     * Returns a mask corresponding to the specified image.
     */
    _getImageMask : function(image) {
        var maskIndex = this._getImageMaskIndex();
        var imageKey = this.getImageKey(image);
        if (!maskIndex || !imageKey) {
            return this._buildImageMask(image);
        }
        var mask = maskIndex[imageKey];
        if (!mask) {
            mask = this._buildImageMask(image);
            maskIndex[imageKey] = mask;
        }
        return mask;
    },

    /**
     * Returns a unique key of the specified image. If this method returns
     * <code>null</code> then the image mask is not stored in the internal
     * mask cache. To allow to store the image mask in cache the image should be
     * 'stampted' with a new identifier using the setImageKey method..
     */
    getImageKey : function(image) {
        var id = image['image-id'];
        return id;
    },

    /**
     * Sets a new image key used to associate an image mask with this image.
     */
    setImageKey : function(image, imageKey) {
        var key = image['image-id'];
        if (!key) {
            if (!imageKey) {
                var id = CanvasContext._imageIdCounter || 0;
                CanvasContext._imageIdCounter = id + 1;
                imageKey = 'key-' + id;
            }
            key = image['image-id'] = imageKey;
        }
        return key;
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
        var canvas = this.newCanvas();
        var g = canvas.getContext('2d');
        var maskWidth = this._getMaskX(image.width);
        var maskHeight = this._getMaskY(image.height);
        canvas.width = maskWidth;
        canvas.height = maskHeight;
        g.drawImage(image, 0, 0, maskWidth, maskHeight);
        var data = g.getImageData(0, 0, maskWidth, maskHeight).data;
        var mask = new Array(maskWidth * maskHeight);
        for (var y = 0; y < maskHeight; y++) {
            for (var x = 0; x < maskWidth; x++) {
                var idx = (y * maskWidth + x);
                var filled = this._checkFilledPixel(data, idx);
                mask[idx] = filled ? 1 : 0;
            }
        }
        return mask;
    },

    /**
     * Returns <code>true</code> if the specified pixel is associated with
     * data
     */
    _checkFilledPixel : function(data, pos) {
        // Check that the alpha channel is not 0 which means that this
        // pixel is not transparent and it should not be associated with
        // a data object.
        // 4 bytes per pixel; RGBA - forth byte is an alpha channel.
        var idx = pos * 4 + 3;
        return !!data[idx];
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

module.exports = CanvasContext;