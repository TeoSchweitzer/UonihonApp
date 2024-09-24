import random

from bottle import *
import json
from helpers import util
from helpers.util import get_file_content_as_arrays
from model.words_service import choose_word, parse_word_usage_for_given_focus, \
    usage_file_upkeep, create_custom_word, update_custom_word, delete_custom_word, delete_sentence_from_id


@route('/word/all', method='GET')
def get_list_of_custom_and_dico_words():
    full_list = get_file_content_as_arrays(util.WORDS_PATH) + get_file_content_as_arrays(util.DICTIONARY_PATH)
    full_list = ['|'.join(word[:-1]) for word in full_list]
    return '\n'.join(full_list)


@route('/word', method='GET')
@route('/word/<word_id>', method='GET')
def get_word_from_id_or_score(word_id="fromScore"):
    focus = request.query.focus or 'no-focus'

    custom_words_list_splitted = get_file_content_as_arrays(util.WORDS_PATH)
    dictionary_list_splitted = get_file_content_as_arrays(util.DICTIONARY_PATH)
    usage_list_splitted = get_file_content_as_arrays(util.USAGE_PATH)
    sentences_list_splitted = get_file_content_as_arrays(util.SENTENCES_PATH)

    usage_file_upkeep(custom_words_list_splitted, usage_list_splitted)

    if word_id == "fromScore":
        chosen_word_id = choose_word(custom_words_list_splitted, usage_list_splitted, dictionary_list_splitted, focus)
    else:
        chosen_word_id = word_id.strip()
        
    chosen_word = next(filter(lambda v: v[0] == chosen_word_id, custom_words_list_splitted + dictionary_list_splitted), None)
    if chosen_word is None:
        return "Word with id" + chosen_word_id + " not found"

    chosen_sentences = [sentence for sentence in sentences_list_splitted if (chosen_word[1] in sentence[1])]
    if len(chosen_sentences) > 5:
        chosen_sentences = random.sample(chosen_sentences, 5)

    result = {
        'id': chosen_word[0],
        'isDico' : "1" if int(chosen_word[0]) < 100000 else "0",
        'word': chosen_word[1],
        'reading': chosen_word[2],
        'meaning': chosen_word[3],
        'alternative': chosen_word[4],
        'explainer': chosen_word[5],
        'sentences': [{
            'id': sentence[0],
            'japanese': sentence[1],
            'translation': sentence[2]
        } for sentence in chosen_sentences]
    }

    word_usage = parse_word_usage_for_given_focus(chosen_word_id, usage_list_splitted, focus)
    final_result = result | word_usage

    return json.dumps(final_result)


@route('/word', method='POST')
def save_word():
    return create_custom_word(request.json)


@route('/word/<word_id>', method='PUT')
def update_word(word_id):
    return update_custom_word(word_id, request.json, request.query.focus or "no_focus")


@route('/word/<word_id>', method='DELETE')
def delete_word(word_id):
    return delete_custom_word(word_id)


@route('/word/sentence/<sentence_id>', method='DELETE')
def delete_sentence(sentence_id):
    return delete_sentence_from_id(sentence_id)
