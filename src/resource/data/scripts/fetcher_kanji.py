import requests
from bs4 import BeautifulSoup

def parseResult(results, joiner=""):
    parsed = ""
    if (not isinstance(results, list)):
        return results.text.strip() if results is not None else ""
    if (results is not None) and (len(results) > 0):
        for result in results:
            if result.text.strip() != "None":
                if parsed != "": parsed += joiner
                parsed += result.text.strip()
    return parsed.replace("\n").strip()

def parseSite(link):
    html = requests.get(link, verify=False).text
    soup = BeautifulSoup(html, "lxml")
    car =          parseResult(soup.find("span", class_="page-header__icon page-header__icon--kanji"))
    combi =        parseResult(soup.find("section", class_="subject-section--components").find_all("span", class_="subject-character__meaning"), " + ")
    sens =         parseResult(soup.find("section", class_="subject-section--meaning")   .find_all("p",    class_="subject-section__meanings-items"), ", ")
    mnemo =        parseResult(soup.find("section", class_="subject-section--meaning")   .find_all("p",    class_="subject-section__text"), " ")
    mnemoHint =    parseResult(soup.find("section", class_="subject-section--meaning")   .find_all("p",    class_="subject-hint__text"), " ")  
    mnemoLec =     parseResult(soup.find("section", class_="subject-section--reading")   .find_all("p",    class_="subject-section__text"), " ")
    mnemoLecHint = parseResult(soup.find("section", class_="subject-section--reading")   .find_all("p",    class_="subject-hint__text"), " ")

    lecMain =      parseResult(soup.find("div", class_="subject-readings__reading--primary").find("p", class_="subject-readings__reading-items"))
    soup.find("div", class_="subject-readings__reading--primary").decompose()
    lec =          parseResult(soup.find_all("p",     class_="subject-readings__reading-items"), "; ")
    lec = " ; " + lec if lec != "" else ""

    line = car + " | " + combi + " | " + lecMain + lec + " | " + sens + " | " + mnemo + " " + mnemoHint + " " + mnemoLec + " " + mnemoLecHint + "\n"
    print(line)
    return line

#parseSite("https://www.wanikani.com/kanji/%E5%8F%A4")

with open('kanjis.txt', 'w', encoding="utf-8") as outputFile:
    with open("links_kanji.txt") as inputFile:
        for line in inputFile:
            outputFile.write(parseSite(line.strip()))
            
