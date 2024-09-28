import random
import re

import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def parse_result(results, joiner=""):
    parsed = ""
    if not isinstance(results, list):
        return results.text.strip() if results is not None else ""
    if (results is not None) and (len(results) > 0):
        for result in results:
            if result.text.strip() != "None":
                if parsed != "": parsed += joiner
                parsed += result.text.strip()
    return parsed.replace("\n", "\\n").strip()

def parse_site(link):
    html = requests.get(link, verify=False).text
    soup = BeautifulSoup(html, "lxml")

    word = parse_result(soup.find("span", class_="page-header__icon page-header__icon--vocabulary"))

    reading = parse_result(soup.find("div", class_="reading-with-audio__reading"), "\\n")

    meaning = ""
    alternative = ""
    meaning_items = soup.find_all("div", class_="subject-section__meanings")
    for item in meaning_items:
        if item.find("h2", string="Primary") is not None:
            meaning = parse_result(item.find("p", class_="subject-section__meanings-items"), "\\n")
            meaning = meaning.replace(",", "\\n")
        if item.find("h2", string="Alternative") is not None or item.find("h2", string="Alternatives") is not None:
            alternative = parse_result(item.find("p", class_="subject-section__meanings-items"), "\\n")
            alternative = alternative.replace(",", "\\n")

    explainers = []
    sub_sections = soup.find_all("section", class_="subject-section__subsection")
    for section in sub_sections:
        if section.find("h3", string="Explanation") is not None:
            explainers.append(parse_result(section.find_all("p", class_="subject-section__text"), "\\n"))
    full_explainer = " \\n ".join(explainers)

    word_line = word + " | " + reading + " | " + meaning + " | " + alternative + " | " + full_explainer

    sentences_lines = []
    sentence_sections = soup.find_all("div", class_="subject-section__text subject-section__text--grouped")
    for sentence_section in sentence_sections:
        sentences_lines.append(
            parse_result(sentence_section.find("p", lang="ja")) + " | " +
            parse_result(sentence_section.find((lambda tag: not tag.has_attr("lang"))))
        )

    return {"word": word_line, "sentences": sentences_lines}


with open("links_words.txt") as links_file:
    links = links_file.read().splitlines()

with open('final_dico.txt', 'w', encoding="utf-8") as word_output_file:
    with open('final_sentences.txt', 'w', encoding="utf-8") as sentences_output_file:
        word_idx = 1
        sentence_idx = 1
        seen_sentences = []
        for link in links:
            print(link)
            result = parse_site(link.strip())
            word_output_file.write(str(word_idx) + " | " + result["word"] + "\n")
            print(str(word_idx) + " | " + result["word"])
            word_idx += 1
            for sentence in result["sentences"]:
                splitted = sentence.split(" | ")
                if splitted[0] in seen_sentences:
                    print(sentence + "already seen")
                else:
                    seen_sentences.append(splitted[0])
                    sentences_output_file.write(str(sentence_idx) + " | " + sentence + "\n")
                    print(str(sentence_idx) + " | " + sentence)
                    sentence_idx += 1


'''
id | word | meaning | alternative | reading | explanation

id | sentence | translation

id | unlocked | hide_reading | reading_familiarity | writing_familiarity | amount_read | amount_write | last_read | last_write 
'''