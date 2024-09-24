import {addListener} from "./listeners.js";
import {getWord, saveCurrentWord} from "./logic.js";
import {wordsList, setWordsList, setFilteredWordsList, setCurrentFocus} from "./state.js";
import {HOST} from "./constants.js";
import {refreshObfuscation} from "./display_management.js";

export function getAllWords() {
    return fetch(HOST + "/word/all", {
        method: "GET", headers: { "Content-type": "application/json; charset=UTF-8" }
    }).then((response) => response.text()).then((response) => {
        setWordsList(response)
        setFilteredWordsList(response);
    }).catch(error => alert(error));
}

export function switchWordListVisibility(goToWordList) {
    let listNode = document.querySelector('.words-list-activity');
    let testNode = document.querySelector('.word-tester-activity');
    let searchBarNode = document.getElementById('search-bar');
    if ((goToWordList??true) && listNode.style.display === 'none') {
        listNode.style.display = 'block'
        testNode.style.display = 'none';
        searchBarNode.addEventListener('input', filterWords);
        getAllWords().then(() => setWordList(wordsList))
    } else {
        searchBarNode.removeEventListener('input', filterWords)
        listNode.style.display = 'none';
        testNode.style.display = 'grid';
    }
}

export function setWordList(wordList) {
    let listTableNode = document.querySelector('#word-list-table');
    let dictionaryTableNode = document.querySelector('#dictionary-list-table');
    listTableNode.replaceChildren();
    dictionaryTableNode.replaceChildren();
    wordList.split('\n').forEach(function (wordLine, i) {
        if (wordLine === "") return
        let splittedLine = wordLine.split('|')
        let htmlSentence = `
                <tr id="wordListIdx${i + 1}">
                    <td>${splittedLine[1]}</td>
                    <td>${splittedLine[2]}</td>
                    <td>${splittedLine[3]}</td>
                    <td>${splittedLine[4]}</td>
                </tr>`;
        ((parseInt(splittedLine[0]) > 100000) ? listTableNode : dictionaryTableNode).insertAdjacentHTML('beforeend', htmlSentence);
        addListener(`wordListIdx${i + 1}`, async ()=> await getWord(`${splittedLine[0].trim()}`));
    });
}

export async function startSearchingInWordList() {
    await saveCurrentWord();
    switchWordListVisibility(true)
    setCurrentFocus(undefined)
    refreshObfuscation();
    setFilteredWordsList(wordsList);
    let searchBarInputNode = document.getElementById('search-bar-input');
    searchBarInputNode.value = ""
    searchBarInputNode.focus();
}

export function filterWords(event) {
    setWordList(
        (wordsList
            .split('\n')
            .filter(w => w.toUpperCase().includes((event.target?.value?.toUpperCase()??"")))
        ).join('\n')
    )
}