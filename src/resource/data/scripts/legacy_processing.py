
with open("legacy.txt") as file:
    legacy_lines = file.read().splitlines()
    input_lines = [[v.strip() for v in legacy_line.split(",")] for legacy_line in legacy_lines]
    # [ ["quelle sorte/genre", "どんな" , "", "Quel genre de personne est ta grande sœur ?", "おねさんはどんなひとですか"], ... ]

with open("final_dico.txt") as file:
    dico = file.read().splitlines()
    dico_lines = [[v.strip() for v in dico_line.split("|")] for dico_line in dico]
    # [ [3, "一人", "ひとり", "Alone", "One Person",  "When there's one person, what ... reading!"], ... ]

current_id = 100311
#with open('legacy_processed.txt', 'w', encoding="utf-8") as output_file:
found_lines = []
for dico_line in dico_lines:
    found = False
    for input_line in input_lines:
        for idx in range(len(input_line)):
            item = input_line[idx]
            if 0 < idx < 3 and item != "" and item in dico_line:
                #print(item)
                #print(dico_line)
                #print()
                #output_file.write(f'{str(current_id)} | {dico_line[1]} | {dico_line[2]} | {dico_line[3]} | {dico_line[4]} | {dico_line[5]}\n')
                found_lines.append(input_line)
                found = True
                break
        if found:
            break

with open('orphans.txt', 'w', encoding="utf-8") as output_file:
    for input_line in input_lines:
        if input_line not in found_lines:
            meaning = input_line[0]
            word = input_line[1]
            reading = input_line[1]
            if len(input_line) > 2 and input_line[2] != "":
                reading = input_line[2]
            output_file.write(f'{str(current_id)} | {word} | {reading} | {meaning} | | \n')
            current_id += 1
