// specify popup options 
var popupOptions =
    {
    'maxWidth': '500',
    'className' : 'custom'
    };

class dataObj {
    constructor(dataSet) {
        this.dataSet = dataSet;
        // Index in the heatmap latitude and longitude array
        this.heatIndex = -1;
    }
    initializePopup() {
        if(this.dataSet.State) {
            this.popup = `<canvas id="popup_${this.getId()}" width="520" height="360"></canvas>`;
        }
        else {
            this.popup = `<canvas id="popup_${this.getId()}" width="520" height="360"></canvas>`;
        }
    }
    getId() {
        return `${this.dataSet.Type}_${this.dataSet.State}_${this.dataSet.Name}`;
    }
}
// For Cities, Colleges and Testing Centers which aren't geographical features
class pointObj extends dataObj {
    constructor(dataSet, state, country) {
        super(dataSet);
        this.country = country;
        this.state = state;
        this.initializePoint();
    }
    initializePoint(_radius=8, _pane="markerPane") {
        this.point = L.circleMarker([this.dataSet.Longitude, this.dataSet.Latitude], {
            radius: _radius,
            pane: _pane,
        });
    }

    removedFromHeatMap() {
        this.heatIndex = -1;
    }
    addToHeatMap(intensity) {
        if(this.heatIndex < 0) {
            this.heatIndex = heat._latlngs.length;
            heat._latlngs.push([this.dataSet.Latitude, this.dataSet.Longitude, intensity]);
            return true;
        }
        return false;
    }
    changeIntensity(intensity) {
        heat._latlngs[this.heatIndex][2] = intensity;
    }
    changeRadius(r) {

    }
    addPoint() {
        this.point.bindPopup(this.popup,popupOptions).addTo(map).on('click', this.renderPopup());
    }
}
/*
    Period {
		Total,
		Month: [] // All months
		Week: [], // All weeks
		Day: [] // 90 days
		MonthPercentIncrease:
		WeekPercentIncrease:
		DayPercentIncrease:
	}

*/
class Country extends dataObj {
    constructor(dataSet) {
        super(dataSet);
        this.states = {};
        this.counties = {};
        this.cities = {};
        this.colleges = {};
        this.centers = {};
    }
}
class State extends dataObj {
    constructor(dataSet, country) {
        super(dataSet);
        this.country = country;
        this.counties = {};
        this.cities = {};
        this.colleges = {};
        this.centers = {};
    }
}
class County extends dataObj {
    constructor(dataSet, state, country) {
        super(dataSet);
        this.country = country;
        this.state = state;
        this.dataSet = dataSet;
    }
}

/*
Dataset 3 (counties,city) {
    Type: (country, state, county, college, testing_center)
    Name,
    Longitude,
    Latitude,
	Country = “USA”,
	State = null,
	County, 
	Population,
    Tests: {
            Total: Period,
            Positive: Period,
            Negative: Period
    }
    Deaths: Period,
    Recovered: Period,
	}
*/
class City extends pointObj {
    constructor(dataSet, state, country) {
        super(dataSet, state, country);
    }
    renderPopup() {
        this.chartElem = document.getElementById(`popup_${this.getId()}`).getContext('2d');
        this.chart = new Chart(this.chartElem, {
        // The type of chart we want to create
        type: 'line',

            // The data for our dataset
            data: {
                labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                datasets: [{
                    label: 'Dataset',
                    backgroundColor: 'rgba(255, 99, 132, .5)',
                    borderColor: 'rgb(255, 99, 132)',
                    data: [0, 10, 5, 2, 20, 30, 45]
                }]
            },

            // Configuration options go here
            options: {}
        });
    }
}
class College extends pointObj {
    constructor(dataSet, state, country) {
        super(dataSet, state, country);
    }
}
class Center extends pointObj {
    constructor(dataSet, state, country) {
        super(dataSet, state, country);
    }
}