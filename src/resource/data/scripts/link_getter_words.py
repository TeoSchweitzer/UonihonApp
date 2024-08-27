import requests
from bs4 import BeautifulSoup

mainSite = "https://www.wanikani.com/vocabulary?difficulty="
pages = ["pleasant", "painful", "death", "hell", "paradise", "reality"]

def parseSite():
    allLinks = ""
    for page in pages:
        html = requests.get(mainSite+page, verify=False).text
        soup = BeautifulSoup(html, "lxml")
        subLinks = soup.find_all("a",  class_="subject-character--vocabulary")
        for subLink in subLinks :
            print(subLink.get("href"))
            allLinks += subLink.get("href") + "\n"
    return allLinks

with open('links_words.txt', 'w', encoding="utf-8") as outputFile:
    links = parseSite()
    outputFile.write(links)