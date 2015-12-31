var Utils = require('./Utils');
var CanvasContext = require('./CanvasContext');
var DataUtils = require('./DataUtils');

/**
 * Instances of this class used to visualizing data on canvas.
 */
function DataRenderer(){
    this.initialize.apply(this, arguments);
}
Utils.extend(DataRenderer.prototype, {

    /** Constructor of this class; initializes internal fields. */
    initialize : function(options) {
        this.options = options || {};
    },

    // -----------------------------------------------------------------------
    // Public methods used by the DataLayer class

    /**
     * Renders data specified in the options and returns a promise with the
     * canvas context (an CanvasContext instance).
     * 
     * @param options.data
     *            an array of objects to render on a canvas
     * @param options.canvas
     *            the canvas where the data should be rendered
     * @param options.bbox
     *            geographic bounding box corresponding to the canvas
     * @param options.zoom
     *            the current map zoom level
     */
    renderData : function(options, done) {
        var that = this;
        var context = that._newCanvasContext(options);
        that._prepareContext(context, function(err){
            if (err) return done(err);
            var data = options.data || [];
            var len = data.length;
            for (var i = 0; i < len; i++) {
                var d = data[i];
                that._drawFeature(d, context);
            }
            return done(null, context);
        });
        return context;
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
    _prepareContext : function(context, done) {
        done(null, context);
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

    /** Creates and returns a canvas index (a CanvasContext instance). */
    _newCanvasContext : function(options) {
        var contextOptions = {};
        options = options || {};
        for (var key in options) {
            if (options.hasOwnProperty(key)) {
                contextOptions[key] = options[key];
            }
        }
        contextOptions.maskIndex = this._getMaskIndex();
        var context = new CanvasContext(contextOptions);
        return context;
    },

    /**
     * This method returns an index keeping images and their corresponding
     * masks.
     */
    _getMaskIndex : function() {
        return this.options.maskIndex;
    },

    // --------------------------------------------------------------------
    // Utility methods used in subclasses

    /**
     * Returns projected position (in pixels) of the specified geographic point
     * relative to an origin point
     */
    _getProjectedPoint : function(context, coords) {
        var origin = this._getTopLeft(context.options.bbox);
        var o = this._projectPoint(origin);
        var p = this._projectPoint(coords);
        var x = Math.round(p.x - o.x);
        var y = Math.round(p.y - o.y);
        return [ x, y ];
    },

    /**
     * Returns an array of projected points.
     */
    _getProjectedPoints : function(context, coordinates) {
        var origin = this._getTopLeft(context.options.bbox);
        var o = this._projectPoint(origin);
        var result = [];
        for (var i = 0; i < coordinates.length; i++) {
            var point = coordinates[i];
            var p = this._projectPoint(point);
            var x = Math.round(p.x - o.x);
            var y = Math.round(p.y - o.y);
            result.push([ x, y ]);
        }
        return result;
    },

    // --------------------------------------------------------------------
    // FIXME: use GeoJSON coordinates for bounding boxes instead
    _getTopLeft : function(bbox) {
        var origin = bbox.getNorthWest();
        return [ origin.lng, origin.lat ];
    },
    
    _projectPoint : function(coords) {
        var result;
        if (this.options.project) {
            result = this.options.project(coords);
        } else {
            result = [ coords[1], coords[0] ];
        }
        return result;
    },

    /**
     * Returns point an array [lng, lat] with coordinates for the specified
     * resource.
     */
    _getCoordinates : function(d) {
        var bbox = DataUtils.getGeoJsonBoundingBox(d);
        if (!bbox)
            return null;
        var latlng = bbox.getCenter();
        return [ latlng.lng, latlng.lat ];
    },

});
module.exports = DataRenderer;