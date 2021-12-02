var socket = io();
var currentStateNum = null;
var stateNames = {};
var country = new Country(usaDataset);
var countries = {'USA': country};
var map = L.map('map', {
    center: [40.713, -74.006],
    zoom: 6,
    minZoom: 3,
    zoomDelta: 0.25,
    wheelPxPerZoomLevel: 22,
    zoomSnap: 0
});
map.setMaxBounds(L.latLngBounds([220, 0], [-60, -220]));

map.createPane('background');
map.createPane('labels');

map.getPane('background').style.zIndex = 0;
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';



socket.on('dataset', dataSet => {
    switch(dataSet.type) {
        case 'country':
            if(!countries[dataSet.Country]) {
                states[dataSet.Name] = new Country(dataSet);
            }
            else if((countries[dataSet.Country].level != dataSet.Level)) {
                countries[dataSet.Country].dataSet = dataSet;
            }
        case 'state':
            var states = countries[dataSet.Country].states;
            if(!states[dataSet.State]) {
                states[dataSet.State] = new State(dataSet);
            } else if((states[dataSet.State].dataSet.Level != dataSet.Level)) {
                states[dataSet.State].dataSet = dataSet;
            }
        case 'county':
        case 'city':
            var cities = countries[dataSet.Country].states[dataSet.State].cities;
            if(!cities[dataSet.Name]) {
                cities[dataSet.Name] = new City(dataSet);
            } else if((cities[dataSet.Name].dataSet.Level != dataSet.Level)) {
                cities[dataSet.Name].dataSet = dataSet;
            }
        case 'college':
        case 'center':
        default:
            break;
    }


});

getLocation();
var baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
    tileSize: 512,
    zoomOffset: -1,
    edgeBufferTiles: 2,
    pane: 'background'
});

var searchMap = L.esri.Geocoding.arcgisOnlineProvider({
    countries: ['US', 'USA'], 
    position: 'topRight'
});

L.esri.Geocoding.geosearch({
    collapseAfterResult: true,
    useMapBounds: true,
    providers: [
        searchMap,
        L.esri.Geocoding.mapServiceProvider({
            label: 'States and Counties',
            url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer',
            layers: [2, 3],
            searchFields: ['NAME', 'STATE_NAME']
        })
    ]
}).addTo(map);

shiftAlaska();
var countiesGeoJson = L.geoJson(getCounties('48'), {style: countyStyle, onEachFeature: countyEvents});
var statesBordersGeoJson = L.geoJson(statesData, {style: stateBorderStyle, onEachFeature: stateEvents});
var statesGeoJson = L.geoJson(statesData, {style: stateStyle, onEachFeature: stateEvents});

var labelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	tileSize: 512,
    zoomOffset: -1,
    pane: 'labels'
});
baseLayer.setZIndex(1);
countiesGeoJson.setZIndex(1);
statesBordersGeoJson.setZIndex(1);
statesGeoJson.setZIndex(1);
labelsLayer.setZIndex(3);
baseLayer.addTo(map);
statesBordersGeoJson.addTo(map);
countiesGeoJson.addTo(map);
labelsLayer.addTo(map);

var customPopup = '<canvas id="nycChart" width="600" height="400"></canvas>';




// specify popup options 
var customOptions =
    {
    'maxWidth': '80%',
    'className' : 'custom'
    }

var nyc = L.circleMarker([40.713, -74.006], {
    radius: 8,
    pane: "markerPane",
});
nyc.bindPopup(customPopup,customOptions).addTo(map).on('click', makeNycChart);
map.getPane('markerPane').style.zIndex = 651;

function randomDots(x) {
    for(var i = 0; i < x; i++) {
        nyc = L.circleMarker([Math.random() * 360 - 180, Math.random() * 360 - 180], {
            radius: 8,
            pane: "markerPane",
        });
        nyc.bindPopup(customPopup,customOptions).addTo(map);
    }
}

var heatCoords = [];

var heat = L.heatLayer(heatCoords, {radius: 10, blur: 15});
heat.addTo(map);


window.addEventListener('DOMContentLoaded', (event) => {
    initializeCountry();
    
});
var chart;
function makeNycChart() {
    var ctx = document.getElementById('nycChart').getContext('2d');
    chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'line',

        // The data for our dataset
        data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [{
                label: 'My First dataset',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgb(255, 99, 132)',
                data: [0, 10, 5, 2, 20, 30, 45]
            }]
        },

        // Configuration options go here
        options: {}
    });
}

function getCity() {
    socket.emit('getDataset', {'type': 'city'});
}
function initializeCountry() {
    statesData.features.forEach((state) => {
        //TODO
    });
    countiesData.features.forEach((county) => {

    });
}
function centerMap(position) {
    map.setView([position.coords.latitude, position.coords.longitude]);
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(centerMap);
        return true;
    } else {
        return false;
    }
}

function getColor(d) {
    return d > 750 ? 'red' :
           d > 500  ? 'orange' :
           d > 250  ? 'yellow' :
                      'green';
}
function countyStyle(feature) {
    var col = getColor(feature.properties.CENSUSAREA);
    return {
        fillColor: col,
        opacity: 0.3,
        fillOpacity: 0.1,
        weight: 0.5,
        color: col,
        zIndex: 1
    };
}
function highlightFeature(e) {
    if(map.getZoom() < 10) {
        var layer = e.target;

        layer.setStyle({
            weight: 5,
            dashArray: ''
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
}
function resetHighlight(e) {
    countiesGeoJson.resetStyle(e.target);
}
function countyEvents(feature, layer) {
    var countyPopup = feature.properties.NAME + ", " + stateNames[parseInt(feature.properties.STATE) - 1];

    var countyPopupOptions =
    {
    'maxWidth': '500',
    'className' : 'custom'
    }
    layer.bindPopup(countyPopup,countyPopupOptions);
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
        
    });
}
function stateEvents(feature, layer) {
    layer.on({
        click: setState
        
    });
}

function stateStyle(feature) {
    var col = getColor(Math.random() * 800);
    return {
        fillColor: col,
        opacity: 1,
        fillOpacity: 0.5,
        weight: 0.8,
        color: 'gray',
        zIndex: 1
    };
}
function stateBorderStyle(feature) {
    return {
        opacity: 1,
        fillOpacity: 0,
        weight: 0.8,
        color: 'gray'
    };
}
function getCounties(s) {
    var counties = {type: "FeatureCollection", features: []};
    for(var i = 0; i < countiesData.features.length; i++) {
        var county = countiesData.features[i];
        if(county.properties.STATE == s) {
            counties.features.push(county)
        }
    }
    return counties;
}
function shiftAlaska() {
    // Alaska has parts that wrap around into Russia, so we shift its outer islands
    statesData.features.forEach((state) => {
        // Number 02 for Alaska
        if(state.properties.STATE == '02') {
            var longitude, latitude;
            state.geometry.coordinates.forEach(coordsList => {
                coordsList.forEach((coords) => {
                    coords.forEach((longlat) => {
                        longitude = longlat[0];
                        latitude = longlat[1];
                        if(longitude > 0) {
                            longlat[0] -= 360;
                        }
                    });
                });
            });
        }
    });
    countiesData.features.forEach((state) => {
        // Number 02 for Alaska
        if(state.properties.STATE == '02') {
            var longitude, latitude;
            state.geometry.coordinates.forEach(coordsList => {
                coordsList.forEach((coords) => {
                    coords.forEach((longlat) => {
                        longitude = longlat[0];
                        latitude = longlat[1];
                        if(longitude > 0) {
                            longlat[0] -= 360;
                        }
                    });
                });
            });
        }
    });
}
function setState(e) {
    clean_map();
    // Geographical bounds of a given state based on it's geometry
    featureBounds = e.sourceTarget._bounds;
    currentStateNum = e.sourceTarget.feature.properties.STATE;
    if(currentStateNum == '02') {
        map.fitBounds(featureBounds, {padding: [20, 20]});
    } else {
        map.fitBounds(featureBounds, {padding: [60, 60]});
    }
    countiesGeoJson = L.geoJson(getCounties(currentStateNum), {style: countyStyle, onEachFeature: countyEvents});
    statesBordersGeoJson.addTo(map);
    countiesGeoJson.addTo(map);
    //socket.emit('getDataset', {'type': 'state', 'state': e.sourceTarget.feature.properties.NAME});
}

map.on('zoomend', function (e) {
    zoomChange();
});

// Remove each layer
function clean_map() {
    map.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });
}

// Show / hide counties and states as the client zoom closer and further
function zoomChange() {
    var currentZoom = map.getZoom();
    var alaskaShift = 0;
    // Due to Alaska's immense size, increase the threshold for showing counties & states
    if(currentStateNum == '02') {
        alaskaShift = 2;
    }
    clean_map();
    if(currentZoom <= 6 - alaskaShift) {
        statesGeoJson.addTo(map);
    }
    else if(currentZoom >= 8 - alaskaShift) {
        statesBordersGeoJson.addTo(map);
        countiesGeoJson.addTo(map);
    }
    else {
        statesBordersGeoJson.addTo(map);
        countiesGeoJson.addTo(map);
    }
    labelsLayer.bringToFront();
    
}