from bottle import *

@route('/kanjis', method = ['POST'])
def kanjisPost():
    print(request.json)
    with open('test_result.txt', 'w', encoding="utf-8") as outputFile:
        outputFile.write(request.json['message'])
    return 'written ok'
