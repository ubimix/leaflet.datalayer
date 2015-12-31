var L = require('leaflet');
var Utils = require('./utils');

/**
 * This layer draws data on canvas tiles.
 */
var ParentLayer = L.GridLayer;
var DataLayer = ParentLayer.extend({

    /** Default options of this class. */
    options : {

        // Default size of a minimal clickable zone is 4x4 screen
        // pixels.
        resolution : 4,

        // Show pointer cursor for zones associated with data
        pointerCursor : true,

    },

    _drawSandboxImage : function(canvas, tilePoint) {
        var ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#FF0000";
        ctx.beginPath();
        var d = 0;
        ctx.arc(canvas.width / 2 - d, canvas.height / 2 - d, canvas.width / 2,
                0, 2 * Math.PI);
        ctx.stroke();

        var textHeight = 15;
        ctx.font = textHeight + "px Arial";
        ctx.fillStyle = 'red';
        var text = [ tilePoint.x, tilePoint.y, tilePoint.z ].join(':');
        var textWidth = ctx.measureText(text).width;
        var textX = (canvas.width - textWidth) / 2;
        var textY = (canvas.height) / 2;
        ctx.fillText(text, textX, textY);
    },

    createTile : function(tilePoint, done) {
        var canvas = document.createElement('canvas');
        var size = this.getTileSize();
        canvas.width = size.x;
        canvas.height = size.y;
        this._drawSandboxImage(canvas, tilePoint);
        // * get the tile bounding box
        // * expand the bounding box
        // * load all data for this bbox
        // * iterate over all loaded entities and draw them
        // - get the geometry type of the entity
        // - points - draw a marker
        // - lines - draw lines
        // - poly lines - iterates over lines and draw them
        // - polygon - draw lines, fill the area, get centroid and draw
        // marker
        // - multipolygon - iterate over polygons and draws them
        // - collection - iterate over features and draws them
        // * for each feature - translate coordinates geo -> pixels
        // * for lines, polygons: simplify lines
        // * to get polygon and line styles - call an external config
        // - getStrokeStyle(resource, index) where index is a geometry
        // position for multi- geometries
        // - getFillStyle(resource, index)
        // - getMarkerStyle(resource, index)
        // *

        // * use the code from the GeometryRenderer to visualize data
        // GeometryRenderer translate geometry coordinates to pixels on
        // canvas
        // - "canvas" / "context" fields to change canvas parameters
        // -
        // - contains method drawLine, drawPolygon, drawMarker methods
        // - GeometryXxx translates geographic coordinates to canvas
        // coordinates
        // - GeometryXxx loads styles for each resource from
        // RendererConfig
        // -

        // this._drawSandboxImage(canvas, tilePoint);
        setTimeout(done, 0);
        // done(null, canvas);
        return canvas;
    },

});

module.exports = DataLayer;
