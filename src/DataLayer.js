var L = require('leaflet');
var Utils = require('./utils');

var CanvasContext = require('./canvas/CanvasContext');
var CanvasIndexingContext = require('./canvas/CanvasIndexingContext');
var GeometryRenderer = require('./geo/GeometryRenderer');

/**
 * This layer draws data on canvas tiles.
 */
var ParentLayer = L.GridLayer;
var DataLayer = ParentLayer.extend({

    onAdd : function(map) {
        ParentLayer.prototype.onAdd.apply(this, arguments);
        this._map.on('mousemove', function(ev) {
            var p = this._map.project(ev.latlng).floor();
            var tileSize = this.getTileSize();
            var coords = p.unscaleBy(tileSize).floor();
            coords.z = this._map.getZoom();
            var key = this._tileCoordsToKey(coords);
            var slot = this._tiles[key];
            if (!slot)
                return;
            var tile = slot.el;
            var tilePos = this._getTilePos(coords);
            var x = p.x % tileSize.x;
            var y = p.y % tileSize.y;
            var data = tile.context.getData(x, y);
            if (data) {
                var counter = this._counter = (this._counter || 0) + 1;
                console.log(' ' + counter + ')', data);
            }
        }, this);

        this.on('tileunload', function(ev) {
            var el = ev.tile;
            el.style.display = 'none';
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, this);
        this.on('tileload', function(ev) {
            var el = ev.tile;
            el.style.display = 'block';
        }, this);
    },

    onRemove : function() {
        ParentLayer.prototype.onRemove.apply(this, arguments);
    },

    createTile : function(tilePoint, done) {
        function newCanvas(w, h) {
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            return canvas;
        }
        var tileSize = this.getTileSize();
        var canvas = newCanvas(tileSize.x, tileSize.y);

        var bounds = this._tileCoordsToBounds(tilePoint);
        var bbox = [ bounds.getWest(), bounds.getSouth(), bounds.getEast(),
                bounds.getNorth() ];
        var origin = [ bbox[0], bbox[3] ];

        var padX = 0.2;
        var padY = 0.2;
        var deltaX = Math.abs(bbox[0] - bbox[2]) * padX;
        var deltaY = Math.abs(bbox[1] - bbox[3]) * padY;
        bbox = [ bbox[0] - deltaX, bbox[1] - deltaY, bbox[2] + deltaX,
                bbox[3] + deltaY ];

        var size = Math.min(tileSize.x, tileSize.y);
        var scale = GeometryRenderer.calculateScale(tilePoint.z, size);

        var maskIndex = this.maskIndex = this.maskIndex || {};
        var resolution = 4;
        var ContextType = CanvasIndexingContext;
        // var ContextType = CanvasContext;
        var context = new ContextType({
            canvas : canvas,
            newCanvas : newCanvas,
            resolution : resolution,
            imageMaskIndex : function(image, options) {
                return maskIndex;
            }
        });
        var map = this._map;
        var renderer = new GeometryRenderer({
            context : context,
            tileSize : tileSize,
            scale : scale,
            origin : origin,
            bbox : bbox,
            project : function(coordinates) {
                function project(point) {
                    var p = map.project(L.latLng(point[1], point[0]),
                            tilePoint.z);
                    return [ p.x, p.y ];
                }
                var origin = renderer.getOrigin();
                var o = project(origin);
                return coordinates.map(function(point) {
                    var r = project(point);
                    var delta = [ Math.round(r[0] - o[0]),
                            Math.round(r[1] - o[1]) ];
                    return delta;
                });
            }
        });

        canvas.context = context;
        canvas.renderer = renderer;

        var style = this.options.style;
        this.options.provider.loadData({
            bbox : bbox
        }, function(err, data) {
            for (var i = 0; i < data.length; i++) {
                renderer.drawFeature(data[i], style);
            }
            setTimeout(function() {
                done(null, canvas);
            }, 1);
        }.bind(this));

        return canvas;
    },

});

module.exports = DataLayer;
