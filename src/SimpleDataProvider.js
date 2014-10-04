var L = require('leaflet');
var rbush = require('rbush');
var IDataProvider = require('./IDataProvider');
var DataUtils = require('./DataUtils');
var P = require('./P');

/**
 * A simple data provider synchronously indexing the given data using an RTree
 * index.
 */
var SimpleDataProvider = IDataProvider.extend({

    /** Initializes this object and indexes the initial data set. */
    initialize : function(options) {
        L.setOptions(this, options);
        this.setData(this.options.data);
    },

    /** Sets and indexes the given data */
    setData : function(data) {
        this._indexData(data);
    },

    /**
     * Loads and returns indexed data contained in the specified bounding box.
     */
    loadData : function(bbox, tilePoint) {
        var that = this;
        var data = that._searchInBbox(bbox);
        return P.resolve(data);
    },

    /** Indexes the specified data array using a RTree index. */
    _indexData : function(data) {
        // Data indexing
        this._rtree = rbush(9);
        data = data || [];
        var array = [];
        L.Util.invokeEach(data, function(i, d) {
            var bbox = this._getBoundingBox(d);
            if (bbox) {
                var coords = this._toIndexKey(bbox);
                coords.data = d;
                array.push(coords);
            }
        }, this);
        this._rtree.load(array);
    },

    /** Searches resources in the specified bounding box. */
    _searchInBbox : function(bbox, point) {
        var coords = this._toIndexKey(bbox);
        var p = point ? [ point.lat, point.lng ] : //
        [ coords[0], coords[1] ];
        var array = this._rtree.search(coords);
        // Sort points by Manhattan distance to the origin point
        array.sort(function(a, b) {
            var d1 = Math.abs(a[0] - p[0]) + Math.abs(a[1] - p[1]);
            var d2 = Math.abs(b[0] - p[0]) + Math.abs(b[1] - p[1]);
            return d1 - d2;
        });
        var result = [];
        L.Util.invokeEach(array, function(i, arr) {
            result.push(arr.data);
        });
        return result;
    },

    /**
     * This method transforms a L.LatLngBounds instance into a key for RTree
     * index.
     */
    _toIndexKey : function(bbox) {
        var sw = bbox.getSouthWest();
        var ne = bbox.getNorthEast();
        var coords = [ sw.lat, sw.lng, ne.lat, ne.lng ];
        return coords;
    },

    /**
     * Returns a L.LatLngBounds instance defining a bounding box ([south, west,
     * north, east]) for the specified object.
     */
    _getBoundingBox : DataUtils.getGeoJsonBoundingBox,

});

module.exports = SimpleDataProvider;