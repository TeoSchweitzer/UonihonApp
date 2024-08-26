with open('kanjis_moved.txt', 'w', encoding="utf-8") as outputFile:
    with open("kanjis.txt", encoding="utf-8") as inputFile:
        for line in inputFile:
            array = line.split("|")
            array[2], array[4] = array[4], array[2]
            newline = "|".join(array)
            outputFile.write(newline)