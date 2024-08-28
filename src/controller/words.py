from bottle import *
import random
import json


@route('/word', method = ['GET'])
def wordGet():
  return wordGetFromId()

@route('/word/<id>', method = ['GET'])
def wordGetFromId(id="none"):
    wordsList = []
    sentencesList = []
    usageList = []

    with open('resource\\data\\words\\words.txt', 'r', encoding="utf-8") as wordsFile:
        wordsList = wordsFile.read().splitlines()
    with open('resource\\data\\words\\sentences.txt', 'r', encoding="utf-8") as sentencesFile:
        sentencesList = sentencesFile.read().splitlines()
    with open('resource\\data\\words\\usage.txt', 'r', encoding="utf-8") as usageFile:
        usageList = usageFile.read().splitlines()
    
    if (id=="none"):
        chosenWord = random.choice(wordsList).split("|")
    else:
        chosenWord = next(filter(lambda v: v[0].strip() == id.strip(), map(lambda w: w.split("|"), wordsList)))

    chosenSentences = [sentence for sentence in sentencesList if sentence.split("|")[0] == chosenWord[0]]
    print("sentencesList")
    print(sentencesList)
    sentencesArray = []
    for sentence in chosenSentences:
        sentenceObject = {}
        splitted = sentence.split("|")
        sentenceObject['japanese'] = splitted[1].strip()
        sentenceObject['translation'] = splitted[2].strip()
        sentencesArray.append(sentenceObject.copy())

    response = {}
    response['word'] = chosenWord[1].strip()
    response['reading'] = chosenWord[2].strip()
    response['meaning'] = chosenWord[3].strip()
    response['alternative'] = chosenWord[4].strip()
    response['explainer'] = chosenWord[5].strip()
    response['sentences'] = sentencesArray
    json_response = json.dumps(response)
    return json_response


@route('/word/words/all', method = ['GET'])
def getAllWords():
    with open('resource\\data\\words\\words.txt', 'r', encoding="utf-8") as wordsFile:
        wordsList = wordsFile.read().splitlines()
    return '\n'.join(map(lambda w: '|'.join(w.split('|')[:-1]), wordsList))


@route('/word/sentences/all', method = ['GET'])
def getAllWords():
    with open('resource\\data\\words\\sentences.txt', 'r', encoding="utf-8") as sentencesFile:
        sentencesList = sentencesFile.read()
    return sentencesList


@route('/word/usage/all', method = ['GET'])
def getAllWords():
    with open('resource\\data\\words\\usage.txt', 'r', encoding="utf-8") as usageFile:
        usageList = usageFile.read()
    return usageList