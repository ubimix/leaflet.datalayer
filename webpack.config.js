var fs = require('fs');
var path = require('path');
var distDir = './dist';
module.exports = {
    entry : './index.js',
    output : {
        path : distDir,
        filename : 'leaflet.datalayer.js',
        library : 'leaflet.datalayer',
        libraryTarget : 'umd',
    },
    cache : true,
    watch : true,
    externals : [ {
        'leaflet' : 'leaflet'
    } ],
    resolve : {
        modulesDirectories : [ "node_modules" ],
    }
};
