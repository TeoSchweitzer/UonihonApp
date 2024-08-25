from bottle import *
from controller import kanjis

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
    with open('resource\\client.html', 'rb') as theFile:
        theResource = theFile.read()
    return theResource

@route('/<resource:path>', method='GET') 
def getAsset(resource):
    theResource = None
    with open(".\\resource\\"+resource, 'rb') as theFile:
        theResource = theFile.read()
    return theResource

run(app=app, host='192.168.1.86', port=8080, debug=True)  