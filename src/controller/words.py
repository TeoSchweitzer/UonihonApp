import random
from bottle import *
import json
import math
import datetime
from tempfile import mkstemp
from shutil import move, copymode
from os import fdopen, remove
from helpers import util


@route('/word', method=['GET'])
def word_get_next():
    return word_get()


@route('/word/<word_id>', method=['GET'])
def word_get(word_id="chooseBest"):
    focus = request.query.focus or 'no-focus'

    with open(util.WORDS_PATH, 'r', encoding="utf-8") as wordsFile:
        words_list = wordsFile.read().splitlines()
    with open(util.DICTIONARY_PATH, 'r', encoding="utf-8") as dictionaryFile:
        dictionary_list = dictionaryFile.read().splitlines()
    with open(util.SENTENCES_PATH, 'r', encoding="utf-8") as sentencesFile:
        sentences_list = sentencesFile.read().splitlines()
    with open(util.USAGE_PATH, 'r', encoding="utf-8") as usageFile:
        usage_list = usageFile.read().splitlines()

    current_time = datetime.datetime.now()

    if word_id == "chooseBest":
        chosen_word_id = choose_word(usage_list, current_time, focus)
    else:
        chosen_word_id = word_id.strip()
    chosen_word = next(filter(lambda v: v[0].strip() == chosen_word_id, map(lambda w: w.split("|"), words_list + dictionary_list)))

    word_usage = get_word_usage(chosen_word_id, usage_list, focus)

    chosen_sentences = [sentence for sentence in sentences_list if (chosen_word[1].strip() in sentence.split("|")[1])]

    sentences_array = []
    for sentence in chosen_sentences:
        sentence_object = {}
        splitted = sentence.split("|")
        sentence_object['id'] = splitted[0].strip()
        sentence_object['japanese'] = splitted[1].strip()
        sentence_object['translation'] = splitted[2].strip()
        sentences_array.append(sentence_object.copy())

    result = {'id': chosen_word[0].strip(),
              'word': chosen_word[1].strip(),
              'reading': chosen_word[2].strip(),
              'meaning': chosen_word[3].strip(),
              'alternative': chosen_word[4].strip(),
              'explainer': chosen_word[5].strip(),
              'sentences': sentences_array
              }
    result = result | word_usage
    json_response = json.dumps(result)

    return json_response


@route('/word/save', method=['POST'])
def save_word():
    update_values_for_word_and_focus(
        request.json,
        datetime.datetime.now().isoformat(),
        request.query.focus or "no-focus"
    )


@route('/word/words/all', method=['GET'])
def get_all_words():
    with open(util.WORDS_PATH, 'r', encoding="utf-8") as wordsFile:
        words_list = wordsFile.read().splitlines()
    with open(util.DICTIONARY_PATH, 'r', encoding="utf-8") as dictionaryFile:
        dictionary_list = dictionaryFile.read().splitlines()
    full_list = words_list + dictionary_list
    full_list = [('|'.join(word.split('|')[:-1])) for word in full_list]
    return '\n'.join(full_list)


@route('/word/sentences/all', method=['GET'])
def get_all_sentences():
    with open(util.SENTENCES_PATH, 'r', encoding="utf-8") as sentencesFile:
        sentences_list = sentencesFile.read()
    return sentences_list


@route('/word/usage/all', method=['GET'])
def get_all_usage():
    with open(util.USAGE_PATH, 'r', encoding="utf-8") as usageFile:
        usage_list = usageFile.read()
    return usage_list


def get_word_usage(word_id, usage_list, focus):
    word = next(filter(lambda v: v.split('|')[0].strip() == word_id, usage_list), "").split('|')
    if len(word) < 2:
        return {}
    # id|unlocked|use_reading|reading_familiarity|writing_familiarity|amount_read|amount_write|last_read|last_write
    match focus:
        case "reading":
            familiarity = word[3].strip()
            test_amount = word[5].strip()
            last_test_date = word[7].strip()
        case "writing":
            familiarity = word[4].strip()
            test_amount = word[6].strip()
            last_test_date = word[8].strip()
        case _:
            familiarity = str(int((int(word[3].strip()) + int(word[4].strip())) / 2))
            test_amount = str(int(word[5].strip()) + int(word[6].strip()))
            last_test_date = datetime.datetime.isoformat(
                max(datetime.datetime.fromisoformat(word[7].strip()), datetime.datetime.fromisoformat(word[8].strip())))
    return {
        "unlocked": word[1].strip(),
        "useReading": word[2].strip(),
        "familiarity": familiarity,
        "testAmount": test_amount,
        "lastTestDate": last_test_date
    }


def choose_word(usage_list, current_time, focus="no-focus"):
    usage_array = list(map(lambda u: list(map(lambda v: v.strip(), u.split('|'))), usage_list))

    if focus == "no-focus":
        only_locked = list(filter(lambda v: v[1] != "1", usage_array))
        return random.choice(only_locked if len(only_locked) > 0 else usage_array)[0]

    removed_locked = list(filter(lambda v: v[1] == "1", usage_array))

    if len(removed_locked) == 0:
        return random.choice(list(usage_array))[0]

    r = (focus == 'reading')
    simplified_list = map(lambda v: [v[0], v[3 if r else 4], v[5 if r else 6], v[7 if r else 8]], removed_locked)

    # Calculate scores for all words
    scored_words = [(word[0], calculate_score(word[1:], current_time)) for word in simplified_list]

    # Select the word with the highest score
    selected_word_id = max(scored_words, key=lambda v: v[1])[0]

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


def update_values_for_word_and_focus(word, now, focus="no-focus"):
    new_line_as_array = []
    # Create temp file
    fh, abs_path = mkstemp()
    with fdopen(fh, 'w') as new_file:
        with open(util.USAGE_PATH) as old_file:
            for line in old_file:
                splitted = list(map(lambda v: v.strip(), line.split('|')))
                if splitted[0].strip() == word["id"]:
                    new_line_as_array = [
                        word["id"],
                        word["unlocked"],
                        word["useReading"],
                        word["familiarity"] if focus == "reading" else splitted[3],
                        word["familiarity"] if focus == "writing" else splitted[4],
                        word["testAmount"] if focus == "reading" else splitted[5],
                        word["testAmount"] if focus == "writing" else splitted[6],
                        now if focus == "reading" else splitted[7],
                        now if focus == "writing" else splitted[8]
                    ]
                    new_file.write(' | '.join(new_line_as_array) + '\n')
                else:
                    new_file.write(line)
    # Copy the file permissions from the old file to the new file
    copymode(util.USAGE_PATH, abs_path)
    # Remove original file
    remove(util.USAGE_PATH)
    # Move new file
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
