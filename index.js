var L = require('leaflet');
var DataLayer = require('./src/DataLayer');
var IDataProvider = require('./src/IDataProvider');
var SimpleDataProvider = require('./src/SimpleDataProvider');
var IDataRenderer = require('./src/IDataRenderer');
var MarkersRenderer = require('./src/MarkersRenderer');
var P = require('./src/P');
var IndexedCanvas = require('./src/IndexedCanvas');

DataLayer.IDataProvider = IDataProvider;
DataLayer.IDataRenderer = IDataRenderer;
DataLayer.SimpleDataProvider = SimpleDataProvider;
DataLayer.MarkersRenderer = MarkersRenderer;
DataLayer.IndexedCanvas = IndexedCanvas;
DataLayer.P = DataLayer.Promise = L.Promise = P;

module.exports = L.DataLayer = DataLayer;
