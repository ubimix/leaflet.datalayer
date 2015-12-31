var GridIndex = require('./GridIndex');
var Utils = require('../utils');

function ImageGridIndex() {
    GridIndex.apply(this, arguments);
}
Utils.extend(ImageGridIndex.prototype, GridIndex.prototype, {

    /**
     * Adds all pixels occupied by the specified image to a data mask associated
     * with canvas.
     */
    indexImage : function(image, x, y, data, replace) {
        var result = false;
        if (!data)
            return result;
        var mask = this._getImageMask(image);
        var imageMaskWidth = this._getMaskX(image.width);
        var maskShiftX = this._getMaskX(x);
        var maskShiftY = this._getMaskY(y);
        for (var i = 0; i < mask.length; i++) {
            if (!mask[i])
                continue;
            var maskX = maskShiftX + (i % imageMaskWidth);
            var maskY = maskShiftY + Math.floor(i / imageMaskWidth);
            var key = this._getIndexKey(maskX, maskY);
            this._addDataToIndex(key, data, !!replace);
            result = true;
        }
        return result;
    },

    // -------------------------------------------------------------------------

    /**
     * Returns a unique key of the specified image. If this method returns
     * <code>null</code> then the image mask is not stored in the internal
     * mask cache. To allow to store the image mask in cache the image should be
     * 'stampted' with a new identifier using the setImageKey method..
     */
    getImageKey : function(image, set) {
        var id = image['image-id'];
        if (!id && set) {
            id = this.setImageKey(image);
        }
        return id;
    },

    /**
     * Sets a new image key used to associate an image mask with this image.
     */
    setImageKey : function(image, imageKey) {
        var key = image['image-id'];
        if (!key) {
            if (!imageKey) {
                var id = IndexingCanvasContext._imageIdCounter || 0;
                IndexingCanvasContext._imageIdCounter = id + 1;
                imageKey = 'key-' + id;
            }
            key = image['image-id'] = imageKey;
        }
        return key;
    },

    // -------------------------------------------------------------------------

    /**
     * Returns a mask corresponding to the specified image.
     */
    _getImageMask : function(image) {
        var maskIndex = this._getImageMaskIndex();
        var imageKey = this.getImageKey(image, !!maskIndex);
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
     * This method maintain an index of image masks associated with the provided
     * canvas. This method could be overloaded to implement a global index of
     * image masks.
     */
    _getImageMaskIndex : function() {
        return this.options.maskIndex;
    },

    /** Creates and returns an image mask. */
    _buildImageMask : function(image) {
        var maskWidth = this._getMaskX(image.width);
        var maskHeight = this._getMaskY(image.height);
        var buf = this._getResizedImageBuffer(image, maskWidth, maskHeight);
        var mask = new Array(maskWidth * maskHeight);
        for (var y = 0; y < maskHeight; y++) {
            for (var x = 0; x < maskWidth; x++) {
                var idx = (y * maskWidth + x);
                var filled = this._checkFilledPixel(buf, idx);
                mask[idx] = filled ? 1 : 0;
            }
        }
        return mask;
    },

    /**
     * Returns <code>true</code> if the specified pixel is not transparent
     */
    _checkFilledPixel : function(buf, pos) {
        // Check that the alpha channel is not 0 which means that this
        // pixel is not transparent and it should not be associated with data.
        // 4 bytes per pixel; RGBA - forth byte is an alpha channel.
        var idx = pos * 4 + 3;
        return !!buf[idx];
    },

    /** Returns a raw data for the resized image. */
    _getResizedImageBuffer : function(image, width, height) {
        var g;
        if (image.tagName === 'CANVAS' && image.width === width
                && image.height === height) {
            g = image.getContext('2d');
        } else {
            var canvas = this._newCanvas(width, height);
            canvas.width = width;
            canvas.height = height;
            g = canvas.getContext('2d');
            g.drawImage(image, 0, 0, width, height);
        }
        var data = g.getImageData(0, 0, width, height).data;
        return data;
    },

    _newCanvas : function(width, height) {
        var canvas;
        if (this.options.newCanvas) {
            canvas = this.options.newCanvas(width, height);
        } else {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        }
        return canvas;
    }

});


module.exports = ImageGridIndex;

