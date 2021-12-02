// specify popup options 
var popupOptions =
    {
    'maxWidth': window.innerWidth * 0.9,
    'maxHeight':  window.innerHeight * 0.7,
    'className' : 'custom',
    'keepInView': false
    };

var clear = 'rgba(255, 255, 255, 0)';
var colors = ['#006BA6', '#0496FF', '#FFBC42', '#D81159', '#8F2D56', '#28a745'];
var timeSpan = 'Day';
var timeSpanNum = 30;
var per100k = false;
var currentPopupObj;

function getWeekStart(date) {
    var day = (date.getDay() - 6) || 7;  
    if( day !== 1 ) 
        date.setHours(-24 * (day - 1)); 
    return date;
}

//https://stackoverflow.com/questions/10599933/convert-long-number-into-abbreviated-string-in-javascript-with-a-special-shortn
function abbreviateNumber(value) {
    var newValue = value;
    if (value >= 1000) {
        var suffixes = ["", "k", "m", "b","t"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 2; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 2) { break; }
        }
        if (shortValue % 1 != 0)  shortValue = shortValue.toFixed(1);
        newValue = shortValue+suffixes[suffixNum];
    }
    return newValue;
}

function renderPercentage(percentage, goodNumbers, elemId) {
    var c;
    var elem = document.querySelector("#" + elemId);
    if(goodNumbers == 0) {
        c = colors[1];
    }
    else if((goodNumbers > 0 && percentage > 0) || (goodNumbers < 0 && percentage < 0)) {
        c = '#28a745';
    }
    else {
        c = colors[3];
    }
    elem.style.backgroundColor = c;
    elem.innerHTML = "";
    if(percentage < 10 && percentage > 0) {
        elem.innerHTML = '&nbsp;';
    }
    elem.innerHTML += Math.round(percentage) + "%";
    if(percentage > 0) {
        elem.innerHTML = '+' + elem.innerHTML;
    }
    return true;
}

function pointClick(e, obj) {
    if(obj.waitingOnDataset == false) {
        obj.renderPopup();
    }
    
}

function pointHover(e, obj) {
    obj.renderPreview();
}

function setTimeSpan(ts, tsn=0) {
    timeSpan = ts;
    timeSpanNum = tsn;
}

function timeSpanButtonClick(event) {
    var elem = event.target;
    setTimeSpan(elem.dataset.ts, elem.dataset.tsn);
    document.querySelectorAll(`.${elem.className.split(' ')[0]}`).forEach(function(e2) {
        e2.disabled = false;
    });
    elem.disabled = true;
    currentPopupObj.renderPopup(true);
}

function changePer100k(event) {
    per100k = !per100k;
    currentPopupObj.renderPopup(true);
    document.querySelector('.per100k').checked = per100k;
    return false;
}

var hn, hp;
const onMouseMove = (e) =>{
    hp.style.left = e.pageX + 'px';
    hp.style.top = e.pageY + 'px';
}
document.addEventListener('mousemove', onMouseMove);
// Base class for all datapoints (countries, states, counties, cities, etc.)
class dataObj {
    constructor(dataSet) {
        this.dataSet = dataSet;
        // Index in the heatmap latitude and longitude array
        this.heatIndex = -1;
        // If this is set to true, functions related to the dataObj will pause until a dataSet is recieved by the server;
        this.waitingOnDataset = false;
        // The popup or chart hasn't been rendered yet
        this.renderedDataOnce = false;
        this.initializePopup();
    }
    generateChartDataset(lbl="Cases", clr=1, dta=this.cases, hide=false) {
        return {
            label: lbl,
            backgroundColor: clear,
            pointHoverRadius: 4,
            pointHitRadius: 4,
            pointRadius: 0,
            pointBackgroundColor: colors[clr],
            borderColor: colors[clr],
            data: dta,
            hidden: hide,
        };
    }
    getOptions() {
        return {
            hover: {
                intersect: false,
            },
            tooltips: {
                enabled: true,
                intersect: false,
                mode: 'index',
                callbacks: {
                    title: function(tooltipItem) {
                        var t = tooltipItem[0].xLabel.split(' ');
                        if(timeSpan != 'Day') {
                            t[0] = timeSpan + " of " + t[0];
                        }
                        return t[0] + " " + t[1] + " " + t[2];
                    },
                    label: function(tooltipItem, data) {
                        var l = data.datasets[tooltipItem.datasetIndex].label.split(' ');
                        var _y = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y;
                        if(Math.abs(_y) > 9) {
                            return " " + _y.toFixed(0) + " " + l[l.length - 1]
                        }
                        if(Math.abs(_y) > 1) {
                            return " " + _y.toFixed(1) + " " + l[l.length - 1]
                        }
                        if(Math.abs(_y) > 0.5) {
                            return " " + _y.toFixed(2) + " " + l[l.length - 1]
                        }
                        if(Math.abs(_y) > 0.01) {
                            return " " + _y.toFixed(3) + " " + l[l.length - 1]
                        }
                        return " " + _y.toFixed(4) + " " + l[l.length - 1]
                    }
                }
            },
            title: {
                display: true,
                text: this.dataSet.Name,
            },
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                }
            },
            scales: {
                yAxes: [{
                    gridLines: {
                        display: false,
                    },
                }],
                xAxes: [{
                    gridLines: {
                        display: false,
                    },
                    type: 'time',
                    ticks: {
                        display: false,
                    }
                }]
            }
        }
    }
    renderPreview() {
        var ds = this.dataSet;

        var curElem = document.querySelector("#hover-deaths");
        var curElemParent = curElem.parentNode.parentNode;
        if('Deaths' in ds) {
            curElemParent.removeAttribute('style');
            curElem.innerHTML = abbreviateNumber(Math.round(ds.Deaths[timeSpan][0]));
            renderPercentage(ds.Deaths[timeSpan + 'PercentIncrease'], -1, 'hover-deaths-increase');
        } else {
            curElemParent.setAttribute('style', 'display: none !important;');
        }

        curElem = document.querySelector("#hover-population");
        curElemParent = curElem.parentNode.parentNode;
        if('Population' in ds) {
            curElemParent.removeAttribute('style');
            curElem.innerHTML = 'Population: ' + abbreviateNumber(Math.round(ds.Population));
        }
        else {
            curElemParent.setAttribute('style', 'display: none !important;');
        }

        curElem = document.querySelector("#hover-cases");
        curElemParent = curElem.parentNode.parentNode;
        if('PositiveCases' in ds) {
            curElemParent.removeAttribute('style');
            curElem.innerHTML = abbreviateNumber(Math.round(ds.PositiveCases)) + ' Total ';
            renderPercentage((ds.PositiveCases / ds.Population) * 100, -1, 'hover-cases-increase');
            curElem = document.querySelector("#hover-population");
            curElemParent = curElem.parentNode.parentNode;
            if('Population' in ds) {
                curElemParent.removeAttribute('style');
                curElem.innerHTML = abbreviateNumber(Math.round(ds.Population)) + ' Students';
            }
            else {
                curElemParent.setAttribute('style', 'display: none !important;');
            }
        }
        else if('Tests' in ds) {
            curElemParent.removeAttribute('style');
            if('Unique' in ds.Tests) {
                curElem.innerHTML = abbreviateNumber(Math.round(ds.Tests.Unique.Positive[timeSpan][0]));
                renderPercentage(ds.Tests.Unique.Positive[timeSpan + 'PercentIncrease'], -1, 'hover-cases-increase');
            } else {
                curElem.innerHTML = abbreviateNumber(Math.round(ds.Tests.Positive[timeSpan][0]));
                renderPercentage(ds.Tests.Positive[timeSpan + 'PercentIncrease'], -1, 'hover-cases-increase');
            }
        } else {
            console.log("ok")
            curElemParent.setAttribute('style', 'display: none !important;');
        }

        curElem = document.querySelector("#hover-recoveries");
        curElemParent = curElem.parentNode.parentNode;
        if('Recoveries' in ds) {
            curElemParent.removeAttribute('style');
            curElem.innerHTML = abbreviateNumber(Math.round(ds.Recoveries[timeSpan][0]));
            renderPercentage(ds.Recoveries[timeSpan + 'PercentIncrease'], -1, 'hover-recoveries-increase');
        }
        else {
            curElemParent.setAttribute('style', 'display: none !important;');
        }

        curElem = document.querySelector("#hover-tests");
        curElemParent = curElem.parentNode.parentNode;
        if('Tests' in ds) {
            curElemParent.removeAttribute('style');
            curElem.innerHTML = abbreviateNumber(Math.round(ds.Tests.Total[timeSpan][0]));
            renderPercentage(ds.Tests.Total[timeSpan + 'PercentIncrease'], -1, 'hover-tests-increase');
        } else {
            curElemParent.setAttribute('style', 'display: none !important;');
        }
        
        hp.style.display = 'block';
        hn.innerHTML = ds.Name;
    }
    initializeDataRender() {
        var thisId = this.getId();
        document.querySelectorAll('.per100k').forEach(function(elem) {
            elem.addEventListener('change', changePer100k);
            elem.checked = per100k;
        });
        document.querySelectorAll(`.ts${thisId}`).forEach(function(elem) {
            elem.addEventListener('click', timeSpanButtonClick);
            if(parseInt(elem.dataset.tsn) == timeSpanNum) {
                elem.disabled = true;
            }
        });
        this.renderedDataOnce = true;
    }
    removeDataRender() {
        var thisId = this.getId();
        document.querySelectorAll('.per100k').forEach(function(elem) {
            elem.removeEventListener('change', changePer100k, false);
        });
        document.querySelectorAll(`.ts${thisId}`).forEach(function(elem) {
            elem.removeEventListener('click', timeSpanButtonClick, false);
        });
        this.chart.destroy();
    }
    initializePopup() {
        if(this.dataSet.State) {
            this.popup = `<canvas id="popup1_${this.getId()}" width="520" height="360"></canvas>`;
        }
        else {
            this.popup = `<canvas id="popup1_${this.getId()}" width="520" height="360"></canvas>`;
        }
        this.popup += `
            <br>
            <div class='below-chart'>
            <div class="btn-group chart-time" role="group" aria-label="First group">
                <button type="button" class="ts${this.getId()} btn btn-light" data-ts="Day" data-tsn="10">10 Days</button>
                <button type="button" class="ts${this.getId()} btn btn-light" data-ts="Day" data-tsn="30">30 Days</button>
                <button type="button" class="ts${this.getId()} btn btn-light" data-ts="Day" data-tsn="90">90 Days</button>
                <button type="button" class="ts${this.getId()} btn btn-light" data-ts="Week" data-tsn="52">Max</button>
            </div>
            
            <br>
            <div class="form-check">
                <input class="per100k form-check-input" type="checkbox" value="">
                <label class="form-check-label" for="flexCheckChecked">
                    Display values per 100k people
                </label>
            </div>
            <button type="button" class="share-btn share${this.getId()} btn btn-primary" data-ts="Week" data-tsn="52">Share</button>
            <br>
            <small class="text-muted">
                Population: ${abbreviateNumber(this.dataSet.Population)}<br>Data Source: ${this.dataSet.DataSource} 
            </small
            </div>
            
        `;
    }
    getId() {
        var ds = this.dataSet;
        return `${ds.Type}_${ds.State}_${ds.Name}`.split(' ').join('-');
    }
    updateDataset(dataSet) {
        this.dataSet = dataSet;
        if(this.waitingOnDataset == true) {
            this.waitingOnDataset = false;
            document.getElementById(`popup1_${this.getId()}`).parentNode.innerHTML = this.popup;
            this.renderPopup();
        }
    }
    
    unrenderPreview() {
        hp.style.display = 'none';
    }
}
// For Cities, Colleges and Testing Centers which aren't geographical features
class pointObj extends dataObj {
    constructor(dataSet, country, state) {
        super(dataSet);
        this.country = country;
        this.state = state;
    }
    initializePoint(_radius=8, _pane="markerPane") {
        this.point = L.circleMarker([this.dataSet.Latitude, this.dataSet.Longitude], {
            radius: _radius,
            fillOpacity: 1,
            fillColor: this.color,
            color: 'white',
            weight: 1,
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
    renderPoint() {
        var obj = this;
        this.point.bindPopup(this.popup,popupOptions).addTo(map).on('click', function(e) {pointClick(e, obj)}).on('mouseover', function(e) {obj.renderPreview();}).on('mouseout', function(e) {obj.unrenderPreview();});
    }
}
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
/*

State:
{
Type: (country, state),
Level,
Name,
Longitude,
	Latitude,
	Country: “USA”,
	State,
DataSource,
	Tests: {
		Total: Period,
		Positive: Period,
		Negative: Period

		Unique: {
		Total: Period,
		Positive: Period,
		Negative: Period
	}
		},
Recoveries: Period,
	Deaths: Period,
	Hospitalized: Period,
inICU: Period,
Ventilators: Period,
Vaccinations: {
TotalDistributed,
TotalAdministrated
}
}

*/
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
    constructor(dataSet, country, state) {
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
    Recoveries: Period,
	}
*/
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
class Period {
    constructor(p, population) {
        this.period = true;
        this.Total = p.Total;
        this.MonthPercentIncrease = p.MonthPercentIncrease;
		this.WeekPercentIncrease = p.WeekPercentIncrease;
		this.DayPercentIncrease = p.DayPercentIncrease;

        this.Month = p.Month;
        this.Week = p.Week;
        this.Day = p.Day;
    }
    quantize() {
        if(timeSpan == 'Day') {
            return this.quantizeDays(timeSpanNum);
        }
        else if(timeSpan == 'Week') {
            return this.quantizeWeeks(timeSpanNum);
        }
    }
    quantizeDays(numDays) {
        if(numDays > this.Day.length || numDays < 2) {
            return false;
        }
        var data = this.Day;
        var today = new Date();
        today.setDate(today.getDate());
        today.setHours(0);
        var arr = [];
        for(var i = 0; i < numDays; i++) {
            arr.push({t: new Date().setDate(today.getDate() - i), y: data[i]});
            if(per100k) {
                arr[i].y = data[i] / (currentPopupObj.dataSet.Population / 100000);
            }
        }
        return arr;
    }
    quantizeWeeks(numWeeks) {
        if(numWeeks > this.Week.length || numWeeks < 2) {
            return false;
        }
        var data = this.Week;
        var today = new Date();
        today.setDate(today.getDate());
        today.setHours(0);
        var arr = [];
        for(var i = 0; i < numWeeks; i++) {
            arr.push({t: new Date().setDate(today.getDate() - i * 7), y: data[i]});
            if(per100k) {
                arr[i].y = data[i] / (currentPopupObj.dataSet.Population / 100000);
            }
        }
        return arr;
    }
}
 
class City extends pointObj {
    constructor(dataSet, country, state) {
        super(dataSet, country, state);
        this.color = colors[1];
        this.initializePoint(Math.max(this.dataSet.Population / 600000, 4), "cityPane");
    }
    renderPopup(initialized=false, factor=1) {
        var thisId = this.getId();
        if(this.dataSet.Level != 1) {
            socket.emit('getDataset', {'type': 'city', 'country': this.dataSet.Country, 'state': this.dataSet.State, 'name': this.dataSet.Name, 'level': 1});
            this.waitingOnDataset = true;
            document.getElementById(`popup1_${thisId}`).parentNode.innerHTML += '<div class="lds-ripple"><div></div><div></div></div>';
            return false;
        }
        this.initializePopup();
        var ds = this.dataSet;
        
        if(initialized) {
            this.removeDataRender();
            document.getElementById(`popup1_${this.getId()}`).parentNode.innerHTML = this.popup;
        }
        document.getElementById(`popup1_${this.getId()}`).parentNode.innerHTML = this.popup;

        this.initializeDataRender();
        currentPopupObj = this;
        
        this.chartElem = document.getElementById(`popup1_${this.getId()}`).getContext('2d');

        if(typeof ds.Deaths.period === 'undefined') {
            ds.Deaths.period = (new Period(ds.Deaths));
        }
        this.deaths = ds.Deaths.period.quantize();

        if(typeof ds.Recoveries.period === 'undefined') {
            ds.Recoveries.period = (new Period(ds.Recoveries));
        }
        this.recoveries = ds.Recoveries.period.quantize();

        if(typeof ds.Tests.Total.period === 'undefined') {
            ds.Tests.Total.period = (new Period(ds.Tests.Total));
        }
        this.tests = ds.Tests.Total.period.quantize();

        if(typeof ds.Tests.Positive.period === 'undefined') {
            ds.Tests.Positive.period = (new Period(ds.Tests.Positive));
        }
        this.cases = ds.Tests.Positive.period.quantize();

        var hidden = [false, false, false, false];

        this.chart = new Chart(this.chartElem, {
        // The type of chart we want to create
            type: 'line',

            // The data for our dataset
            data: {
                datasets: [this.generateChartDataset("Cases", 3, this.cases, hidden[0]),
                this.generateChartDataset("Deaths", 1, this.deaths, hidden[1]),
                this.generateChartDataset("Recoveries", 2, this.recoveries, hidden[2]),
                this.generateChartDataset("Tests", 5, this.tests, hidden[3])]
            },

            // Configuration options go here
            options: this.getOptions()
        });
        return true;
    }
}
/*
        Dataset 2 (colleges) {
            Type: (country, state, county, college, testing_center)
            Name,
            Population,
            Longitude,
                Latitude,
                Country,
                State,
            County,
            PositiveCases
        }
*/
    
class College extends pointObj {
    constructor(dataSet, country, state) {
        super(dataSet, country, state);
        this.color = colors[2];
        this.initializePoint(Math.max(this.dataSet.Population / 600000, 4), "collegePane");
    }
    initializePopup() {

        this.popup = `
            <br>
            <h6>${this.dataSet.Name}</h6>
            <label>${this.dataSet.City}, ${this.dataSet.State}</label>
            <p class='college-popup-data'>${this.dataSet.PositiveCases} Total Cases (All Time)</p>
            <div class='below-chart' style='margin-left: 0px;'>
            <br>
            <small class="text-muted">
                Population: ${abbreviateNumber(this.dataSet.Population)} Students<br>Data Source: ${this.dataSet.DataSource} 
            </small
            </div>
            
        `;
    }
    renderPopup(initialized=false, factor=1) {
        return false;
    }
}
class Center extends pointObj {
    constructor(dataSet, country, state) {
        super(dataSet, country, state);
        this.color = colors[3];
        this.initializePoint();
    }
}