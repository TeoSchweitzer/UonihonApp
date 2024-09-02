import os

def ressource(givenPath):
    return os.path.abspath(os.path.dirname(os.path.realpath(__file__)) + '/../resource/' + givenPath)

WORDS_PATH = ressource('data/words/words.txt')
SENTENCES_PATH = ressource('data/words/sentences.txt')
USAGE_PATH = ressource('data/words/usage.txt')