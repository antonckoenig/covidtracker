from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, send, emit
import random, time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

stateNames = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Palau','Pennsylvania','Puerto Rico','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virgin Island','Virginia','Washington','West Virginia','Wisconsin','Wyoming']


@app.route('/')
def hello():
    return render_template('index.html')

@app.route('/js/<path:path>/query')
@app.route('/js/<path:path>/')
@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('static/js/', path)

@socketio.on('getStates')
def emitStates():
    datasets = []
    for s in stateNames:
        datasets.append(generateDataset1('state', 0, 'USA', s, s))
    
    emit('datasets', datasets)

@socketio.on('getDataset')
def emitDataset(data):
    if('level' in data.keys() and data['level'] == 1):
        time.sleep(1)
        if(data['type'] == 'college'):
            emit('dataset', generateDataset2(data['type'], data['level'], data['country'], data['state'], data['name']))
        else:
            emit('dataset', generateDataset3(data['type'], data['level'], data['country'], data['state'], data['name']))
    else:
        if(data['type'] == 'college'):
            emit('dataset', generateDataset2(data['type']))
            for i in range(2):
                datasets = []
                for i in range(100):
                    datasets.append(generateDataset2(data['type']))
                emit('datasets', datasets)
        else:
            emit('dataset', generateDataset3(data['type']))
            for i in range(2):
                datasets = []
                for i in range(100):
                    datasets.append(generateDataset3(data['type']))
                emit('datasets', datasets)

def ri(a=0, b=100):
    return random.randint(a, b)

def ra(a=0, b=100, l=12):
    arr = [0] * l
    arr[l - 1] = ri(a, b)
    for i in range(l - 1):
        arr[l - i - 2] = max((ri(a, b) - 4*(b/9))/3 + arr[l - i - 1], 0)
    return arr

def rc(l=5):
    s = ''
    for i in range(0, l):
        s += chr(ri(65, 90))
    
    return s

def generatePeriod(level=1):
    period = {}
    if(level == 0):
        period = {
            'Total': ri(0, 150000),
            'Month': ra(0, 2000, 1),
            'Week': ra(0, 500, 1),
            'Day': ra(0, 100, 1),
            'MonthPercentIncrease': ri(-100, 100),
            'WeekPercentIncrease': ri(-100, 100),
            'DayPercentIncrease': ri(-100, 100)
        }
    else:
        period = {
            'Total': ri(0, 150000),
            'Month': ra(0, 2000, 12), # 12 months
            'Week': ra(0, 500, 52), # 52 weeks
            'Day': ra(0, 100, 90), # 90 days
            'MonthPercentIncrease': ri(-100, 100),
            'WeekPercentIncrease': ri(-100, 100),
            'DayPercentIncrease': ri(-100, 100)
        }
    return period


def generatDemographic():
    return {
                'essentialWorkers': ri(0, 1000)/10.0,
                'age': {
                    '0-18': ri(0, 1000)/10.0,
                    '18-25': ri(0, 1000)/10.0,
                    '25-40': ri(0, 1000)/10.0,
                    '40+': ri(0, 1000)/10.0
                },
                'race': {
                    'white': ri(0, 1000)/10.0,
                    'black': ri(0, 1000)/10.0,
                    'latino': ri(0, 1000)/10.0,
                    'asian': ri(0, 1000)/10.0
                },
                'gender': {
                    'male': ri(0, 1000)/10.0,
                    'female': ri(0, 1000)/10.0,
                    'unknown/other': ri(0, 1000)/10.0
                },
                'income': {
                    '0-25000': ri(0, 1000)/10.0,
                    '25000-50000': ri(0, 1000)/10.0,
                    '50000-100000': ri(0, 1000)/10.0,
                    '100000+': ri(0, 1000)/10.0
                }
            }

def generateDataset3(type, lvl=0, country='USA', state=0, name=0):
    if(state == 0):
        state = stateNames[ri(0, len(stateNames) - 1)]
    if(name == 0):
        name = rc(ri(3, 12))
    return {
        'Name': name,
        'Type': type,
        'Level': lvl,
        'Longitude': ri(-12600, -6600)/100.0,
        'Latitude': ri(2400, 5000)/100.0,
        'Country': country,
        'State': state,
        'County':  rc(12),
        'Population': ri(50000, ri(100000, 9000000)),
        'Demographic': generatDemographic(),
        'DataSource': 'https://www.' + rc(ri(3, 12)) + '.com/' + rc(ri(3, 12)),

        'Deaths': generatePeriod(lvl),
        'Recoveries': generatePeriod(lvl),
        'Tests': {  
                'Total': generatePeriod(lvl),
                'Positive': generatePeriod(lvl),
                'Negative': generatePeriod(lvl)
            }
        }

def generateDataset2(type='college', lvl=0, country='USA', state=0, name=0):
    if(state == 0):
        state = stateNames[ri(0, len(stateNames) - 1)]
    if(name == 0):
        name = rc(ri(3, 12))
    return {
            'Type': type,
            'Name': name,
            'Level': lvl,
            'Longitude': ri(-12600, -6600)/100.0,
            'Latitude': ri(2400, 5000)/100.0,
            'Country': country,
            'State': state,
            'City': rc(ri(3, 12)),
            'Population': ri(1000, ri(10000, 55000)),
            'PositiveCases': ri(0, 12000),
            'DataSource': 'https://www.' + rc(ri(3, 12)) + '.com/' + rc(ri(3, 12))
        }

def generateDataset1(type='state', lvl=0, country='USA', state=0, name=0):
    if(state == 0):
        state = stateNames[ri(0, len(stateNames) - 1)]
    if(name == 0):
        name = state
    return {
            'Type': type,
            'Name': name,
            'Level': lvl,
            'Longitude': ri(-12600, -6600)/100.0,
            'Latitude': ri(2400, 5000)/100.0,
            'Country': country,
            'State': state,
            'Population': ri(1000, ri(10000, 55000)),
            'DataSource': 'https://www.' + rc(ri(3, 12)) + '.com/' + rc(ri(3, 12)),
            'Demographic': generatDemographic(),
            'Tests': {
                'Total': generatePeriod(lvl),
                'Positive': generatePeriod(lvl),
                'Negative': generatePeriod(lvl),
                'Unique': {
                    'Total': generatePeriod(lvl),
                    'Positive': generatePeriod(lvl),
                    'Negative': generatePeriod(lvl)
                }
            },
            'Recoveries': generatePeriod(lvl),
            'Deaths': generatePeriod(lvl),
            'Hospitalized': generatePeriod(lvl),
            'inICU': generatePeriod(lvl),
            'Ventilators': generatePeriod(lvl),
            'Vaccinations': {
                'TotalDistributed': ri(0, 12000),
                'TotalAdministrated': ri(0, 12000)
            }
        }

if __name__ == '__main__':
    socketio.run(app)
    app.run(host='0.0.0.0')