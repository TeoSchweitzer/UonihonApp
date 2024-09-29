import {addListener} from "./listeners.js";
import {getWord, saveCurrentWord} from "./logic.js";
import {
    wordsList,
    setWordsList,
    setFilteredWordsList,
    setCurrentFocus,
    startedLoading,
    finishedLoading
} from "./state.js";
import {HOST} from "./constants.js";
import {refreshObfuscation} from "./display_management.js";

export async function getAllWords(searchTerm) {
    await startedLoading()
    return fetch(HOST + "/word/search" + (searchTerm ? "/"+searchTerm:  ""), {
        method: "GET", headers: {"Content-type": "application/json; charset=UTF-8"}
    }).then((response) => response.json()).then((response) => {
        setWordsList(response)
        setFilteredWordsList(response);
    })
        .catch(error => alert(error))
        .finally(() => finishedLoading());
}

export function switchWordListVisibility(goToWordList) {
    let listNode = document.querySelector('.words-list-activity');
    let testNode = document.querySelector('.word-tester-activity');
    let searchBarNode = document.getElementById('search-bar');
    if ((goToWordList??true) && listNode.style.display === 'none') {
        listNode.style.display = 'block'
        testNode.style.display = 'none';
        searchBarNode.addEventListener('keydown', filterWords);
        getAllWords().then(() => makeWordTables())
    } else {
        searchBarNode.removeEventListener('keydown', filterWords)
        listNode.style.display = 'none';
        testNode.style.display = 'grid';
    }
}

export function makeWordTables() {
    let listTableNode = document.querySelector('#word-list-table');
    let dictionaryTableNode = document.querySelector('#dictionary-list-table');
    listTableNode.replaceChildren();
    dictionaryTableNode.replaceChildren();
    wordsList.forEach(function (wordLine, i) {
        if (wordLine === "") return
        let splittedLine = wordLine.split('|')
        let htmlSentence = `
                <tr id="wordListIdx${i + 1}">
                    <td>${splittedLine[1]}</td>
                    <td>${splittedLine[2]}</td>
                    <td>${splittedLine[3]}</td>
                    <td>${splittedLine[4].split('\\n')[0]}</td>
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

export async function filterWords(event) {
    if (event.key !== "Enter") return
    let bar = document.getElementById("loading-bar")
    function filtering() {
        bar.removeEventListener('animationend', filtering)
        bar.classList.remove('animate');
        getAllWords(event.target?.value)
            .then(() => makeWordTables(event.target?.value))
            .finally(() => finishedLoading())
    }
    bar.addEventListener('animationend', filtering);
    startedLoading()
    bar.classList.add('animate');

}