// Initialize socket.io
var socket = io();

// Current selected state
var currentState = null;
var stateNames = {};
var usa = new Country(usaDataset);
var countries = {'USA': usa};

var c = ['#FFFFFF', '#FFEED0', '#FFDEA1' ,'#FFCD71', '#FFBC42', '#F59148', '#EC674E', '#E23C53', '#D81159'];


// Initialize map
var map = L.map('map', {
    center: [40.713, -74.006], // NYC
    zoom: 6,
    minZoom: 3,
    zoomDelta: 0.25,
    wheelPxPerZoomLevel: 22,
    zoomSnap: 0
});
map.setMaxBounds(L.latLngBounds([220, 0], [-60, -220]));

map.createPane('background');
map.createPane('labels');

var paneNames = ['city', 'college', 'testingCenter', 'county'];
paneNames.forEach((paneName) => {
    paneName += "Pane";
    map.createPane(paneName);
    map.getPane(paneName).style.zIndex = 651;
});

map.getPane('background').style.zIndex = 0;

map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';

getStates();
getCities();
getColleges();
function processDataset(ds) {
    switch(ds.Type) {
        case 'country':
            if(!countries[ds.Country]) {
                states[ds.Name] = new Country(ds);
            }
            else if((countries[ds.Country].level < ds.Level)) {
                countries[ds.Country].dataSet = ds;
            }
            break
        case 'state':
            var states = countries[ds.Country].states;
            if(!states[ds.Name]) {
                states[ds.Name] = new State(ds);
            } else if((states[ds.Name].dataSet.Level < ds.Level)) {
                states[ds.Name].dataSet = ds;
            }
            break
        case 'county':
            break
        case 'city':
            var cities = countries[ds.Country].cities;
            if(!cities[ds.Name]) {
                cities[ds.Name] = new City(ds, countries['USA'], countries['USA'].states[ds.State]);
            } else if((cities[ds.Name].dataSet.Level < ds.Level)) {
                cities[ds.Name].updateDataset(ds);
            }
            cities[ds.Name].renderPoint();
            break
            //cities[ds.Name].addToHeatMap(ds.Deaths.Total[0]* 100);
        case 'college':
            var colleges = countries[ds.Country].colleges;
            //var stateColleges = countries[ds.Country].states[ds.State].colleges;
            if(!colleges[ds.Name]) {
                colleges[ds.Name] = new College(ds, countries['USA'], countries['USA'].states[ds.State]);
            } else if((colleges[ds.Name].dataSet.Level < ds.Level)) {
                colleges[ds.Name].updateDataset(ds);
            }
            colleges[ds.Name].renderPoint();
            break
        case 'center':
        default:
            break;
    }
}
socket.on('dataset', ds => {
    processDataset(ds)
});
socket.on('datasets', dsts => {
    for(key in dsts) {
        processDataset(dsts[key]);
    }
    if(!map.hasLayer(statesGeoJson)) {
        statesGeoJson.addTo(map);
    }
});

var links = '<a href="https://antonkoenig.com" target="_blank">Anton Koenig</a>, <a href="" target="_blank">Emenike Anigbogu</a>'

var baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
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

var testingIcons = {
    'Yes': {
        iconSize:     [38, 95],
       shadowSize:   [50, 64],
       iconAnchor:   [22, 94],
       shadowAnchor: [4, 62],
       popupAnchor:  [-3, -76]
    }
}


var vaccineCentersGeoJson = L.esri.featureLayer({
    url: "https://services.arcgis.com/8ZpVMShClf8U8dae/arcgis/rest/services/Covid19_Vaccination_Locations/FeatureServer/0/",
    simplifyFactor: 1,
    precision: 5,
    pointToLayer: function (geojson, latlng) {
        //TODO testing vaccine class
        return L.circleMarker(latlng, {
            radius: 5,
            weight: 1,
            fillOpacity: 1,
            color: 'white',
            fillColor: colors[5],
            pane: 'markerPane',
            tracksViewChanges: false
        }).bindPopup(geojson.properties.name);
    },
    style: centerStyle
});
vaccineCentersGeoJson.setWhere("State = '" + 'NY' + "'");
vaccineCentersGeoJson.addTo(map);

var testingCentersGeoJson = L.esri.featureLayer({
    url: "https://services.arcgis.com/8ZpVMShClf8U8dae/arcgis/rest/services/TestingLocations_public2/FeatureServer/0/",
    simplifyFactor: 1,
    precision: 5,
    where: 'none',
    pointToLayer: function (geojson, latlng) {
        //TODO testing center class
        return L.circleMarker(latlng, {
            radius: 5,
            weight: 1,
            fillOpacity: 1,
            color: 'white',
            fillColor: colors[3],
            pane: 'markerPane',
            tracksViewChanges: false
        }).bindPopup(geojson.properties.name);
    },
    style: centerStyle
});
testingCentersGeoJson.addTo(map);
var statesGeoJson = L.esri.featureLayer({
    url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized/FeatureServer/0/',
    simplifyFactor: 0.4,
    precision: 3,
    style: stateStyle,
    onEachFeature: stateEvents
});
var countiesGeoJson =  L.esri.featureLayer({
    url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Counties_Generalized/FeatureServer/0/",
    simplifyFactor: 0.5,
    precision: 3,
    where: 'none',
    style: countyStyle,
    onEachFeature: countyEvents
});

var labelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
    ext: 'png',
    pane: 'labels'
});
baseLayer.setZIndex(1);
labelsLayer.setZIndex(3);
baseLayer.addTo(map);
labelsLayer.addTo(map);

map.getPane('markerPane').style.zIndex = 651;

var heatCoords = [];

var heat = L.heatLayer(heatCoords, {radius: 10, blur: 15});
heat.addTo(map);


window.addEventListener('DOMContentLoaded', (event) => {
    initializeCountry();
    hn = document.getElementById('hover-name');
    hp = document.getElementById('hover-preview');
    document.querySelectorAll('.show-map').forEach((elem) => {
        elem.addEventListener('click', () => {
            document.body.scrollIntoView({behavior: "smooth", block: "start"});
        });
    });
    document.querySelectorAll('.show-container').forEach((elem) => {
        elem.addEventListener('click', () => {
            document.getElementById('container').scrollIntoView({behavior: "smooth", block: "start"});
        });
    });
});

function getColleges() {
    socket.emit('getDataset', {'type': 'college'});
}
function getCities() {
    socket.emit('getDataset', {'type': 'city'});
}
function getStates() {
    socket.emit('getStates');
}
function initializeCountry() {
    
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
    return d > 1000 ? c[8]:
           d > 900 ? c[7]:
           d > 800 ? c[6]:
           d > 700 ? c[5]:
           d > 600 ? c[4]:
           d > 500 ? c[3]:
           d > 400 ? c[2]:
           d > 300 ? c[1]:
                    c[0];
}
function countyStyle(feature) {
    //var col = getColor(countries['USA'].counties[feature.properties.STATE_NAME].counties[feature.properties.NAME].dataSet.Deaths.Total / 100);
    var col = getColor(feature.properties.POP_SQMI)
    return {
        fillColor: col,
        opacity: 1,
        fillOpacity: 0.1,
        weight: 0.5,
        color: 'gray',
        zIndex: 1
    };
}
function highlightFeature(e) {

    if(map.getZoom() < 10) {
        var layer = e.target;

        layer.setStyle({
            weight: 3,
            dashArray: ''
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
}
function resetHighlightStates(e) {
    statesGeoJson.resetStyle(e.target);
}
function resetHighlightCounties(e) {
    countiesGeoJson.resetStyle(e.target);
}
function countyEvents(feature, layer) {
    var countyPopup = feature.properties.N + ", " + stateNames[parseInt(feature.properties.S) - 1];

    var countyPopupOptions =
    {
    'maxWidth': '500',
    'className' : 'custom'
    }
    layer.bindPopup(countyPopup,countyPopupOptions);
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightCounties
        
    });
}
function stateEvents(feature, layer) {
    layer.on({
        click: setState,
        mouseover: highlightFeature,
        mouseout: resetHighlightStates
    });
}
function centerStyle(feature) {

}
function stateStyle(feature) {
    var col = getColor(countries['USA'].states[feature.properties.STATE_NAME].dataSet.Deaths.Total / 100);
    return {
        fillColor: col,
        opacity: 1,
        fillOpacity: 0.3,
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
        if(county.properties.S == s) {
            counties.features.push(county)
        }
    }
    return counties;
}
function reportState(name) {
    document.querySelector("#report-name").innerHTML = name;
}
function reportUSA() {
    document.querySelector("#report-name").innerHTML = 'United States';
}
function setState(e) {
    console.log(e.sourceTarget)
    // Geographical bounds of a given state based on it's geometry
    featureBounds = e.sourceTarget._bounds;
    currentState = e.sourceTarget.feature.properties.STATE_NAME;
    if(currentState == 'Alaska' || currentState == 'Texas') {
        map.fitBounds(featureBounds, {padding: [20, 20]});
    } else {
        map.fitBounds(featureBounds, {padding: [60, 60]});
    }
    console.log(e.sourceTarget.feature)
    reportState(currentState);
    testingCentersGeoJson.setWhere("State = '" + e.sourceTarget.feature.properties.STATE_ABBR + "'");
    vaccineCentersGeoJson.setWhere("State = '" + e.sourceTarget.feature.properties.STATE_ABBR + "'");
    countiesGeoJson.setWhere("STATE_NAME = '" + currentState + "'");
    countiesGeoJson.addTo(map);
    //socket.emit('getDataset', {'type': 'state', 'state': e.sourceTarget.feature.properties.N});
}

map.on('zoomend', function (e) {
    zoomChange();
});

// Remove each layer
function clearMap() {
    
    testingCentersGeoJson.removeFrom(map);
    statesGeoJson.removeFrom(map);
    countiesGeoJson.removeFrom(map);
}

// Show / hide counties and states as the client zoom closer and further
function zoomChange() {
    
    
}