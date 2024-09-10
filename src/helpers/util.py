import os


def resource(givenPath):
    return os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + '/../resource/' + givenPath)


WORDS_PATH = resource('data/words/words.txt')
SENTENCES_PATH = resource('data/words/sentences.txt')
USAGE_PATH = resource('data/words/usage.txt')
