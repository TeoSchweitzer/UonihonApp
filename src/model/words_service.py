import datetime
import math
import random

from helpers import util
from helpers.util import get_valid_new_id, modify_file, get_file_content_as_arrays


def choose_word(word_array, usage_array, dictionary_array, focus="no-focus"):

    if focus == "no-focus" or len(word_array) == 0:
        return random.choice(dictionary_array)[0]

    r = (focus == 'reading')
    simplified_list = map(lambda v: [v[0], v[2 if r else 3], v[4 if r else 5], v[6 if r else 7]], usage_array)

    # Calculate scores for all words
    current_time = datetime.datetime.now()
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


def parse_word_usage_for_given_focus(word_id, usage_list_splitted, focus):
    word = next(filter(lambda v: v[0] == word_id, usage_list_splitted), [])
    if len(word) < 2:
        return {}
    # id|use_reading|reading_familiarity|writing_familiarity|amount_read|amount_write|last_read|last_write
    match focus:
        case "reading":
            familiarity = word[2].strip()
            test_amount = word[4].strip()
            last_test_date = word[6].strip()
        case "writing":
            familiarity = word[3].strip()
            test_amount = word[5].strip()
            last_test_date = word[7].strip()
        case _:
            familiarity = str(int((int(word[2].strip()) + int(word[3].strip())) / 2))
            test_amount = str(int(word[4].strip()) + int(word[5].strip()))
            last_test_date = datetime.datetime.isoformat(
                max(datetime.datetime.fromisoformat(word[6].strip()), datetime.datetime.fromisoformat(word[7].strip())))
    return {
        "useReading": word[1].strip(),
        "familiarity": familiarity,
        "testAmount": test_amount,
        "lastTestDate": last_test_date
    }


def save_word_content(word):
    new_line_as_array = [
        word.get("id"),
        word["word"],
        word.get("reading") or "",
        word.get("meaning") or "",
        word.get("alternative") or "",
        word.get("explainer") or "",
    ]

    def update_file(old_file, new_file):
        existing_ids = []
        word_was_found = False
        for line in old_file:
            splitted = list(map(lambda v: v.strip(), line.split('|')))
            if splitted[0].strip() == word.get("id"):
                word_was_found = True
                new_file.write(' | '.join(new_line_as_array) + '\n')
            else:
                existing_ids.append(splitted[0].strip())
                new_file.write(line)
        if not word_was_found:
            new_line_as_array[0] = get_valid_new_id(existing_ids)
            new_file.write(' | '.join(new_line_as_array) + '\n')

    modify_file(util.WORDS_PATH, (lambda x,y:x), update_file)

    return new_line_as_array[0]


def save_word_usage(word, focus):
    now = datetime.datetime.now().isoformat()
    #id|use_reading|reading_familiarity|writing_familiarity|amount_read|amount_write|last_read|last_write
    def update_line(line, new_file):
        splitted = list(map(lambda v: v.strip(), line.split('|')))
        if splitted[0].strip() == word.get("id"):
            new_line_as_array = [word["id"], word["useReading"]]
            if focus == "reading":
                new_line_as_array.extend([
                    word["familiarity"],
                    splitted[3],
                    word["testAmount"],
                    splitted[5],
                    now,
                    splitted[7]
                ])
            if focus == "writing":
                new_line_as_array.extend([
                    splitted[2],
                    word["familiarity"],
                    splitted[4],
                    word["testAmount"],
                    splitted[6],
                    now
                ])
            new_file.write(' | '.join(new_line_as_array) + '\n')
        else:
            new_file.write(line)

    modify_file(util.USAGE_PATH, update_line)

    return word.get("id")


def usage_file_upkeep(custom_words_lines, usage_lines):
    if len(custom_words_lines) == 0:
        with open(util.USAGE_PATH, 'w') as usage_file:
            usage_file.write("")
        return
    ids_in_custom_words = list(map(lambda v: v[0], custom_words_lines))
    ids_in_usage = list(map(lambda v: v[0], usage_lines))
    ids_in_usage_not_in_custom_words = [x for x in ids_in_usage if x not in ids_in_custom_words]
    ids_in_custom_words_not_in_usage = [x for x in ids_in_custom_words if x not in ids_in_usage]
    if len(ids_in_custom_words_not_in_usage) != 0:
        date_for_new_words = datetime.datetime(2000, 1, 1).isoformat()
        with open(util.USAGE_PATH, "a") as usage_file:
            for word_id in ids_in_custom_words_not_in_usage:
                usage_file.write(f'{word_id} | 0 | 0 | 0 | 0 | 0 | {date_for_new_words} |  {date_for_new_words}\n')
    if len(ids_in_usage_not_in_custom_words) != 0:
        def only_keep_words_that_are_in_custom_words(line, new_file) :
            old_file_splitted_line = list(map(lambda v: v.strip(), line.split('|')))
            if old_file_splitted_line[0].strip() in ids_in_custom_words:
                new_file.write(line)
        modify_file(util.USAGE_PATH, only_keep_words_that_are_in_custom_words)


def create_custom_word(word_to_save):
    new_id = save_word_content(word_to_save)
    usage_file_upkeep(get_file_content_as_arrays(util.WORDS_PATH), get_file_content_as_arrays(util.USAGE_PATH))
    return new_id


def update_custom_word(word_id, word_to_save, focus="no_focus"):
    if int(word_id) < 100000:
        return str(-1)

    save_word_content(word_to_save)

    if focus is not "no_focus":
        save_word_usage(word_to_save, focus)

    return word_id