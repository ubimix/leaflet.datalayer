var L = require('leaflet');
var DataLayer = require('./src/DataLayer');

DataLayer.IDataProvider = require('./src/IDataProvider');
DataLayer.IDataRenderer = require('./src/DataRenderer');
DataLayer.SimpleDataProvider = require('./src/SimpleDataProvider');
DataLayer.MarkersRenderer = require('./src/MarkersRenderer');
DataLayer.IndexedCanvas = require('./src/IndexedCanvas');
DataLayer.P = DataLayer.Promise = L.Promise = require('./src/P');
DataLayer.DataUtils = require('./src/DataUtils');

module.exports = L.DataLayer = DataLayer;
