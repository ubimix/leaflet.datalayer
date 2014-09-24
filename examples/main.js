/** Demo by Ubimix (http://www.ubimix.com). */
main('map');

function main(id) {
    var mapContainer = document.getElementById(id);
    function getData(key) {
        var value = mapContainer.getAttribute('data-' + key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        } catch (err) {
            return value;
        }
    }

    // Create a map
    var map = L.map(mapContainer);

    // Add a background layer for the map.
    // We load the address for the map layer tiles from the map container
    // element ('data-tiles-url' attribute).
    var tilesUrl = getData('tiles-url');
    var maxZoom = getData('max-zoom');
    var attribution = getData('attribution');
    var tilesLayer = L.tileLayer(tilesUrl, {
        attribution : attribution,
        maxZoom : maxZoom
    });
    map.addLayer(tilesLayer);

    // Load data and transform them into markers with basic interactivity
    // DATA object is defined in the './data.js' script.
    var data = DATA.features;

    /**
     * Custom data renderer. This class draws small circles for low zoom levels
     * and colored markers for higher zooms.
     */
    var MyMarkerRenderer = LeafletDataLayer.MarkersRenderer.extend({
        statics : {
            thresholdSize : 8
        },

        /**
         * Returns a type for the specified resource. This value is used to
         * associate specific icons for each resource type.
         */
        _getResourceType : function(resource) {
            var props = resource.properties || {};
            switch (props.category) {
            case "Peinture":
                return 'painting';
            case "Objets d'art":
            case "Art contemporain":
                return 'art';
            case "Sciences":
                return 'science';
            case "Archéologie":
                return 'archeology';
            case "Autre":
            default:
                return 'other';
            }
        },
        /** Returns a color specific for each resource type. */
        _getColor : function(type) {
            switch (type) {
            case 'painting':
                return 'red';
            case 'art':
                return 'blue';
            case 'science':
                return 'orange';
            case 'archeology':
                return 'green';
            case 'other':
            default:
                return 'purple';
            }
        },
        /**
         * Drawing icons. This method draws circles for small zoom levels and
         * markers when user zooms in. It is called only once for each type of
         * resources for each zoom level.
         */
        _drawIcon : function(type) {
            var radius = this._getRadius();
            var lineWidth = radius < MyMarkerRenderer.thresholdSize ? 1 : 2;
            var color = this._getColor(type);
            var stroke = 'white';
            var canvas = document.createElement('canvas');
            var width = radius * 2;
            var height = radius * 2;
            canvas.height = height;
            canvas.width = width;
            radius -= lineWidth;

            var g = canvas.getContext('2d');
            g.globalAlpha = 0.85;
            if (radius < MyMarkerRenderer.thresholdSize) {
                g.beginPath();
                g.arc(width / 2, height / 2, radius, 0, 2 * Math.PI, false);
                g.fillStyle = color;
                g.fill();
                g.lineWidth = lineWidth;
                g.strokeStyle = stroke;
                g.stroke();
                return {
                    image : canvas,
                    anchor : L.point(width / 2, height / 2)
                };
            } else {
                g.fillStyle = color;
                g.strokeStyle = stroke;
                g.lineWidth = lineWidth;
                g.lineCap = 'round';
                // This method is defined in the parent class.
                this._drawMarker(g, lineWidth, lineWidth,
                        width - lineWidth * 2, height - lineWidth * 2,
                        radius * 0.6);
                g.fill();
                g.stroke();
                return {
                    image : canvas,
                    anchor : L.point(width / 2, height - lineWidth * 2)
                };
            }
        },
        /**
         * Overload the getRadius method to make it depending on the current
         * zoom level.
         */
        _getRadius : function() {
            var zoom = this._map.getZoom();
            // Zoom level where the marker has its full size
            var fullZoom = 15;
            var fullRadius = 32;
            var minRadius = 4;
            var radius = fullRadius * Math.pow(2, zoom - fullZoom);
            radius = Math.max(minRadius, Math.min(fullRadius, radius));
            return radius;
        },
        /** A custom method returning popup offset for the current zoom level. */
        getPopupOffset : function() {
            var radius = this._getRadius();
            var shift = +6;
            if (radius < MyMarkerRenderer.thresholdSize) {
                return L.point(0, -radius + shift);
            } else {
                return L.point(0, -radius * 2 + shift);
            }
        }
    });
    var dataRenderer = new MyMarkerRenderer();

    // Optional instantiation of a data provider.
    var dataProvider = new LeafletDataLayer.SimpleDataProvider({});
    dataProvider.setData(data);
    // Data layer instantiation
    var dataLayer = new LeafletDataLayer({
        dataRenderer : dataRenderer,
        dataProvider : dataProvider
    });
    // Bind an event listener for this layer
    dataLayer.on('click', function(ev) {
        var coords = ev.data.geometry.coordinates;
        var latlng = L.latLng(coords[1], coords[0]);
        var props = ev.data.properties;
        var content = '' + //
        '<div>' + //
        '<h3>' + props.name + '</h3>' + //
        '<div><em>' + props.category + '</em></div>' + //
        '<p>' + props.description + '</p>' + //
        '</div>';
        var offset = dataRenderer.getPopupOffset();
        L.popup({
            offset : offset,
            maxHeight : 250
        }).setLatLng(latlng).setContent(content).openOn(map);
    });
    map.addLayer(dataLayer);

    // Visualize the map.
    // We get the map center and zoom from the container element.
    // ('data-center' and 'map-zoom' element attributes)
    var mapCenter = getData('center');
    var mapZoom = getData('zoom');
    var latlng = L.latLng(mapCenter[1], mapCenter[0]);
    map.setView(latlng, mapZoom);
}
