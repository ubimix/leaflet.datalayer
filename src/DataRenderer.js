var L = require('leaflet');
var P = require('./P');
var MaskIndexedCanvas = require('./MaskIndexedCanvas');
var DataUtils = require('./DataUtils');

/**
 * Instances of this class used to visualizing data on canvas.
 */
var DataRenderer = L.Class.extend({

    /** Constructor of this class; initializes internal fields. */
    initialize : function(options) {
        L.setOptions(this, options);
    },

    // -----------------------------------------------------------------------
    // Public methods used by the DataLayer class

    /**
     * Renders data specified in the options and returns a promise with the
     * canvas context (an IIndexedCanvas instance).
     * 
     * @param options.data
     *            an array of objects to render on a canvas
     * @param options.canvas
     *            the canvas where the data should be rendered
     * @param options.tilePoint
     *            an array with x/y position of the tile
     * @param options.zoom
     *            the current map zoom
     * @param options.tileSize
     *            the size of each tile
     */
    renderData : function(options) {
        var that = this;
        var context = that._newCanvasContext(options);
        return P.then(function() {
            return that._prepareContext(context);
        }).then(function() {
            var data = options.data || [];
            DataUtils.forEach(data, function(d, i) {
                that._drawFeature(d, context);
            });
        }).then(function() {
            return context;
        });
    },

    // -----------------------------------------------------------------------
    // The following methods should be overloaded in subclasses

    /**
     * Returns an array with width and height in pixels of a buffer zone around
     * each tile. This buffer zone is used to avoid clipping of elements (eg
     * markers).
     */
    getBufferZoneSize : function() {
        return [ 0, 0 ];
    },

    /**
     * Prepares the specified context. This method could be overload to
     * asynchronously load resources required to render data.
     */
    _prepareContext : function(context) {
        return P.resolve();
    },

    /**
     * Draws the specified resource on the given canvas context. This method
     * should be overloaded in subclasses.
     * 
     * @param resource
     *            the resource to render
     * @param context
     *            a canvas context
     */
    _drawFeature : function(resource, context) {
    },

    // -----------------------------------------------------------------------
    // Internal methods

    /** Creates and returns a canvas index (an IIndexedCanvas instance). */
    _newCanvasContext : function(options) {
        options = DataUtils.extend({}, options, {
            maskIndex : this._getMaskIndex()
        });
        var index = new MaskIndexedCanvas(options);
        return index;
    },

    /**
     * This method returns an index keeping images and their corresponding
     * masks.
     */
    _getMaskIndex : function() {
        return this.options.maskIndex;
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
     * This method is called when the parent layer is removed from the map.
     */
    onRemove : function(layer) {
        delete this._layer;
        delete this._map;
    },

});
module.exports = DataRenderer;