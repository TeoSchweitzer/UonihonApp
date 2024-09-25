import random

from bottle import *
import json
from helpers import util
from helpers.util import get_file_content_as_arrays
from model.words_service import choose_word, parse_word_usage_for_given_focus, \
    usage_file_upkeep, create_custom_word, update_custom_word, delete_custom_word, delete_sentence_from_id, \
    get_word_from_files


@route('/word/all', method='GET')
def get_list_of_custom_and_dico_words():
    full_list = get_file_content_as_arrays(util.WORDS_PATH) + get_file_content_as_arrays(util.DICTIONARY_PATH)
    full_list = ['|'.join(word[:-1]) for word in full_list]
    return '\n'.join(full_list)


@route('/word', method='GET')
@route('/word/<word_id>', method='GET')
def get_word_from_id_or_score(word_id="fromScore"):
    return json.dumps(get_word_from_files(word_id, request.query.focus or 'no-focus'))


@route('/word', method='POST')
def save_word():
    return json.dumps(create_custom_word(request.json))


@route('/word/<word_id>', method='PUT')
def update_word(word_id):
    return json.dumps(update_custom_word(word_id, request.json, request.query.focus or "no_focus"))


@route('/word/<word_id>', method='DELETE')
def delete_word(word_id):
    return delete_custom_word(word_id)


@route('/word/sentence/<sentence_id>', method='DELETE')
def delete_sentence(sentence_id):
    return delete_sentence_from_id(sentence_id)
