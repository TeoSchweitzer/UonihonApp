from bottle import *
from controller import kanjis
from controller import words
from helpers import util

# This route capture all route for method OPTIONS
@route('/<:re:.*>', method='OPTIONS')
def cors():
    pass

headers = ['Origin', 'Accept', 'Content-Type',
           'X-Requested-With', 'X-CSRF-Token',
           'Authorization']
HEADERS = ', '.join((headers + [h.lower() for h in headers]))

# For all request I add cors headers
def apply_cors():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, PUT, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = HEADERS

app = default_app()
app.add_hook('after_request', apply_cors)

@route('/', method='GET') 
def getHome():
    theResource = None
    with open(util.ressource('client.html'), 'rb') as theFile:
        theResource = theFile.read()
    return theResource

@route('/<resource:path>', method='GET') 
def getAsset(resource):
    theResource = None
    with open(util.ressource(resource), 'rb') as theFile:
        theResource = theFile.read()
    return theResource

run(app=app, host='localhost', port=8080, debug=True)