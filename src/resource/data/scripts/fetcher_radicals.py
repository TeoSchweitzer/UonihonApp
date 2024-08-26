import requests
from bs4 import BeautifulSoup

def parseSite(link):
    html = requests.get(link, verify=False).text
    soup = BeautifulSoup(html, "lxml")
    car = soup.find("span", class_="page-header__icon page-header__icon--radical")
    car = car.text if car is not None else ""
    img = soup.find("wk-character-image")
    img = img.get('src') if img is not None else ""
    word = soup.find("span", class_="page-header__title-text")
    word = word.text if word is not None else ""
    mnemo = soup.find("p", class_="subject-section__text")
    mnemo = mnemo.text if mnemo is not None else ""
    line = car + img + " | " + word + " | " + mnemo + "\n"
    print(line)
    return line

with open('mnemonic.txt', 'w', encoding="utf-8") as outputFile:
    with open("links.txt") as inputFile:
        for line in inputFile:
            outputFile.write(parseSite(line.strip()))
            
