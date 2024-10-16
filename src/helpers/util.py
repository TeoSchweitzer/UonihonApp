import os
from shutil import copymode, move
from tempfile import mkstemp


def resource(given_path):
    return os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + '/../resource/' + given_path)


def user_saved_data(given_path):
    return os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + '/../../user_data/' + given_path)


def get_valid_new_id(id_list, base_id=100001):
    id_to_use = base_id
    while str(id_to_use) in id_list:
        id_to_use += 1
    return str(id_to_use)


def modify_file(file_path, edition_function=(lambda x,y:x)):
    fh, abs_path = mkstemp()
    with os.fdopen(fh, 'w') as new_file:
        with open(file_path) as old_file:
            edition_function(old_file, new_file)
    # Copy the file permissions from the old file to the new file
    copymode(file_path, abs_path)
    # Remove original file
    os.remove(file_path)
    # Move new file
    move(abs_path, file_path)

def get_file_content_as_arrays(file_path):
    if not os.path.exists(file_path):
        with open(file_path, 'w') as _:
            return []
    with open(file_path, 'r', encoding="utf-8") as wordsFile:
        file_content = wordsFile.read().splitlines()
    return list(filter(lambda v: len(v)>0,
                       list(map(lambda u:
                                list(map(lambda v: v.strip(), u.split('|'))), file_content))))


DICTIONARY_PATH = resource('data/dictionary.txt')
DICTIONARY_SENTENCES_PATH = resource('data/sentences.txt')
WORDS_PATH = user_saved_data('words.txt')
SENTENCES_PATH = user_saved_data('sentences.txt')
USAGE_PATH = user_saved_data('usage.txt')
