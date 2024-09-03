import random
from bottle import *
import json
import math
import datetime
from tempfile import mkstemp
from shutil import move, copymode
from os import fdopen, remove
from helpers import util

@route('/word', method = ['GET'])
def wordGetNext():
  return wordGet()

@route('/word/<id>', method = ['GET'])
def wordGet(id="chooseBest"):
    wordsList = []
    sentencesList = []
    usageList = []
    focus = request.query.focus or 'no-focus'

    with open(util.WORDS_PATH, 'r', encoding="utf-8") as wordsFile:
        wordsList = wordsFile.read().splitlines()
    with open(util.SENTENCES_PATH, 'r', encoding="utf-8") as sentencesFile:
        sentencesList = sentencesFile.read().splitlines()
    with open(util.USAGE_PATH, 'r', encoding="utf-8") as usageFile:
        usageList = usageFile.read().splitlines()
    
    current_time = datetime.datetime.now()

    if (id=="chooseBest"):
        chosenWordId = chooseWord(usageList, current_time, focus)
    else:
        chosenWordId = id.strip()
    chosenWord = next(filter(lambda v: v[0].strip() == chosenWordId, map(lambda w: w.split("|"), wordsList)))

    wordUsage = getWordUsage(chosenWordId, usageList, focus)

    chosenSentences = [sentence for sentence in sentencesList if sentence.split("|")[0] == chosenWord[0]]

    sentencesArray = []
    for sentence in chosenSentences:
        sentenceObject = {}
        splitted = sentence.split("|")
        sentenceObject['japanese'] = splitted[1].strip()
        sentenceObject['translation'] = splitted[2].strip()
        sentencesArray.append(sentenceObject.copy())

    response = {}
    response['id'] = chosenWord[0].strip()
    response['word'] = chosenWord[1].strip()
    response['reading'] = chosenWord[2].strip()
    response['meaning'] = chosenWord[3].strip()
    response['alternative'] = chosenWord[4].strip()
    response['explainer'] = chosenWord[5].strip()
    response['unlocked'] = wordUsage["unlocked"]
    response['useReading'] = wordUsage["useReading"]
    response['familiarity'] = wordUsage["familiarity"]
    response['testAmount'] = wordUsage["testAmount"]
    response['lastTestDate'] = datetime.datetime.fromisoformat(wordUsage["lastTestDate"]).strftime("%d/%m/%Y %Hh%M")
    response['sentences'] = sentencesArray
    json_response = json.dumps(response)

    return json_response


@route('/word/save', method = ['POST'])
def saveWord():
    updateValuesForWordAndFocus(request.json, datetime.datetime.now().isoformat(), request.query.focus or "no-focus")

@route('/word/words/all', method = ['GET'])
def getAllWords():
    with open(util.WORDS_PATH, 'r', encoding="utf-8") as wordsFile:
        wordsList = wordsFile.read().splitlines()
    return '\n'.join(map(lambda w: '|'.join(w.split('|')[:-1]), wordsList))


@route('/word/sentences/all', method = ['GET'])
def getAllWords():
    with open(util.SENTENCES_PATH, 'r', encoding="utf-8") as sentencesFile:
        sentencesList = sentencesFile.read()
    return sentencesList


@route('/word/usage/all', method = ['GET'])
def getAllWords():
    with open(util.USAGE_PATH, 'r', encoding="utf-8") as usageFile:
        usageList = usageFile.read()
    return usageList

def getWordUsage(wordId,  usageList, focus):
    word = next(filter(lambda v : v.split('|')[0].strip() == wordId, usageList)).split('|')
    #id | unlocked | use_reading | reading_familiarity | writing_familiarity | amount_read | amount_write | last_read | last_write
    match focus:
        case "reading":
            familiarity = word[3].strip()
            testAmount = word[5].strip()
            lastTestDate = word[7].strip()
        case "writing":
            familiarity = word[4].strip()
            testAmount = word[6].strip()
            lastTestDate = word[8].strip()
        case _:
            familiarity = str(int(word[3].strip()) + int(word[4].strip()))
            testAmount = str(int(word[5].strip()) + int(word[6].strip()))
            lastTestDate = datetime.datetime.isoformat(max(datetime.datetime.fromisoformat(word[7].strip()), datetime.datetime.fromisoformat(word[8].strip())))
    return {
        "unlocked" : word[1].strip(),
        "useReading":word[2].strip(), 
        "familiarity": familiarity,
        "testAmount": testAmount,
        "lastTestDate": lastTestDate
    }

def chooseWord(usageList, current_time, focus="no-focus"):
    usageArray = list(map(lambda u: list(map(lambda x: x.strip(), u.split('|'))), usageList))

    if (focus=="no-focus"):
        onlyLocked = list(filter(lambda v: v[1]!="1", usageArray))
        return random.choice(onlyLocked if len(onlyLocked) > 0 else usageArray)[0]
    
    removedLocked = list(filter(lambda v: v[1]=="1", usageArray))

    if len(removedLocked) == 0:
        return random.choice(list(usageArray))[0]
    
    r = (focus == 'reading')
    simplified_list = map(lambda v : [v[0], v[3 if r else 4], v[5 if r else 6], v[7 if r else 8]] , removedLocked)
    
    # Calculate scores for all words
    scored_words = [(word[0], calculate_score(word[1:], current_time)) for word in simplified_list]
    
    # Select the word with the highest score
    selected_word_id = max(scored_words, key=lambda x: x[1])[0]
    
    return selected_word_id

def calculate_score(word_data, current_time):
    familiarity, times_tested, last_test_str = word_data
    familiarity = int(familiarity)
    times_tested = int(times_tested)
    last_test = datetime.datetime.fromisoformat(last_test_str)
    
    # Time factor: more points for words not tested recently
    time_diff = (current_time - last_test).total_seconds() / 3600  # hours
    time_factor = math.log(time_diff + 1)  # log scale to prevent extreme values
    
    # Familiarity factor: more points for less familiar words
    familiarity_factor = 1 / (familiarity + 1)  # +1 to avoid division by zero
    
    # Test frequency factor: slightly more points for less tested words
    frequency_factor = 1 / math.sqrt(times_tested + 1)  # square root to reduce impact
    
    # Combine factors. You can adjust weights here.
    score = (time_factor * 0.5) + (familiarity_factor * 0.3) + (frequency_factor * 0.2)
    
    return score

def updateValuesForWordAndFocus(word, now, focus="no-focus"):
    new_line_as_array = []
    #Create temp file
    fh, abs_path = mkstemp()
    with fdopen(fh,'w') as new_file:
         with open(util.USAGE_PATH) as old_file:
            for line in old_file:
                splitted = list(map(lambda v: v.strip(), line.split('|')))
                if splitted[0].strip() == word["id"]:
                    new_line_as_array = [
                        word["id"], 
                        word["unlocked"],
                        word["useReading"],
                        word["familiarity"]  if focus=="reading" else splitted[3], 
                        word["familiarity"]  if focus=="writing" else splitted[4], 
                        word["testAmount"]   if focus=="reading" else splitted[5], 
                        word["testAmount"]   if focus=="writing" else splitted[6], 
                        now                  if focus=="reading" else splitted[7], 
                        now                  if focus=="writing" else splitted[8]
                    ]
                    new_file.write(' | '.join(new_line_as_array) + '\n')
                else:
                    new_file.write(line)
    #Copy the file permissions from the old file to the new file
    copymode(util.USAGE_PATH, abs_path)
    #Remove original file
    remove(util.USAGE_PATH)
    #Move new file
    move(abs_path, util.USAGE_PATH)
    return new_line_as_array

'''
id | familiarity | amount | last_seen 
1  | 28          | 0      | 2024-08-27T23:35:55.654608
2  | 42212       | 0      | 2024-08-27T23:35:55.654608
3  | 21          | 55     | 2024-08-27T23:35:55.654608
4  | 0           | 52752  | 2024-08-27T23:35:55.654608

id | unlocked | use_reading | reading_familiarity | writing_familiarity | amount_read | amount_write | last_read                  | last_write 
1  | 1        | 0            | 10                  | 4                   | 28          | 0            | 2024-08-27T23:35:55.654608 | 2024-08-27T23:35:55.654608
2  | 1        | 1            | 20                  | 3                   | 42212       | 0            | 2024-08-27T23:35:55.654608 | 2024-08-27T23:35:55.654608
3  | 0        | 0            | 30                  | 2                   | 21          | 55           | 2024-08-27T23:35:55.654608 | 2024-08-27T23:35:55.654608
4  | 1        | 1            | 40                  | 1                   | 0           | 52752        | 2024-08-27T23:35:55.654608 | 2024-08-27T23:35:55.654608
'''