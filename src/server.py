from bottle import *
import controllers.kanjis

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

run(app=app, host='localhost', port=8080, debug=True)  