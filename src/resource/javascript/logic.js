import {switchWordListVisibility} from "./word-list.js";
import {
    clearDoubleClickTimer,
    currentFocus,
    currentWord,
    setCurrentFocus,
    setCurrentWord,
    setDoubleClickTimer
} from "./state.js";
import {HOST} from "./constants.js";
import {reveal, setDisplayedWordToCurrentWord} from "./display_management.js";

export async function copyDicoWordToCustom() {
    setCurrentWord({...currentWord, id: undefined, isDico: "0"});
    setDisplayedWordToCurrentWord();
    await saveCurrentWord().then((response) => response.text())
        .then((newId) => setCurrentWord({...currentWord, id: newId}))
}

export async function getWord(wordId, focus, dontSaveCurrentWord) {

    if (dontSaveCurrentWord !== true){
        await saveCurrentWord()
    }

    setCurrentFocus(focus)

    const finalUrl = HOST
        + "/word"
        + (wordId ? `/${wordId}` : "")
        + (currentFocus ? ("?" + new URLSearchParams({focus: focus}).toString()) : "")

    return fetch(finalUrl, {
        method: "GET",
        headers: {
            "Content-type": "application/json; charset=UTF-8",
        }
    })
        .catch(error => alert(error))
        .then((response) => response.json())
        .then((json) => {


            setCurrentWord({...json})

            setDisplayedWordToCurrentWord()
            switchWordListVisibility(false)
        });
}

export function saveCurrentWord() {
    if (!currentWord || currentWord.isDico === "1") {
        return
    }
    if (currentFocus === "reading" || currentFocus === "writing") {
        setCurrentWord({
            ...currentWord,
            familiarity: (parseInt(currentWord.familiarity)+1) + "",
            testAmount: (parseInt(currentWord.testAmount)+1) + ""
        })
    }
    let isNewWord = currentWord.id === undefined
    let finalUrl = HOST + "/word"
             + (isNewWord ? "" : "/"+currentWord.id)
             + (currentFocus ? ("?" + new URLSearchParams({focus: currentFocus}).toString()) : "")
    let method = (isNewWord ? "POST" : "PUT")
    return fetch(
        finalUrl,
        {   method: method,
            keepalive: true,
            headers: { "Content-type": "application/json; charset=UTF-8" },
            body: JSON.stringify(currentWord)
        }).catch(error => alert(error));
}

export function obfuscateOrEdit(event, id) {
    simpleOrDoubleClickHandler(event, ()=>reveal(id), ()=>{reveal(id);edit(id)})
}

export function simpleOrDoubleClickHandler(event, toCallIfSimpleClick, toCallIfDoubleClick) {
    if (event.detail === 1) {
        setDoubleClickTimer(setTimeout(() => {
            if (toCallIfSimpleClick) toCallIfSimpleClick()
        }, 200))
    } else if (event.detail === 2) {
        clearDoubleClickTimer()
        if (toCallIfDoubleClick) toCallIfDoubleClick()
    }
}

export function edit(divId) {

    if ((divId==="familiarity" && currentFocus === undefined) || currentWord.isDico === "1") {
        return
    }

    const div = document.getElementById(divId);
    if (!div) return; // Exit if div not found

    // Make the div editable
    div.contentEditable = true;

    // Focus the div
    div.focus();

    // Select content
    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Add event listener to handle when editing is complete
    div.addEventListener('blur', function handleEndOfEditing() {
        div.removeEventListener('blur', handleEndOfEditing);
        div.contentEditable = false;
        let rawEdition = div.innerText;
        let trimmedEdition = rawEdition.trim();
        let inlinedEdition = trimmedEdition.replaceAll('\n', '')
        let editedCurrentWord = currentWord;

        if (divId.includes("sentence") || divId.includes("translation")) {
            if (div.textContent === "") {
                let removed = editedCurrentWord.sentences.splice(parseInt(divId.match(/\d+/))-1, 1)[0]
                deleteSentence(removed.id)
            } else {
                editedCurrentWord.sentences[parseInt(divId.match(/\d+/))-1][(divId.includes("sentence"))?"sentence":"translation"] = inlinedEdition
            }
        }
        else if (divId === "familiarity") {
            if (div.textContent !== "" && /^\d+$/.test(inlinedEdition)) {
                editedCurrentWord["familiarity"] = inlinedEdition;
            }
        }
        else if (divId === "word") {
            if (div.textContent !== "") {
                editedCurrentWord["word"] = inlinedEdition;
            }
        }
        else if (divId === "explainer") {
            editedCurrentWord["explainer"] = trimmedEdition;
        }
        else {
            editedCurrentWord[divId] = inlinedEdition
        }
        setCurrentWord(editedCurrentWord)
        setDisplayedWordToCurrentWord(divId);
    });
}


export function switchNoKanjiMode(value) {
    if (value==="0" || value==="1")
        setCurrentWord({...currentWord, useReading: value})
    else
        setCurrentWord({...currentWord, useReading: (currentWord.useReading === "0") ? "1" : "0"})

    const isNoKanji = currentWord.useReading !== "0"
    document.getElementById("no-kanji-checkbox").checked = isNoKanji
    let wordNode = document.getElementById('word')
    wordNode.innerText = isNoKanji ? currentWord.reading : currentWord.word
    wordNode.classList.remove("kanji", "kana")
    wordNode.classList.add(isNoKanji ? "kana-text" : "kanji-text")
    document.getElementById("no-kanji-label").style.visibility = isNoKanji ? 'visible' : 'collapse'
}

export function addNewSentence() {
    let newSentence = {japanese:"", translation:""}
    if ((currentWord?.sentences??[]).length === 0) {
        setCurrentWord({...currentWord, sentences: [newSentence]})
    } else {
        setCurrentWord({...currentWord, sentences: [...(currentWord.sentences), newSentence]})
    }
    setDisplayedWordToCurrentWord('sentences');
}

export async function addWord() {
    await saveCurrentWord();
    setCurrentFocus(undefined);
    let wordToAdd = document.getElementById('search-bar-input').value
    setCurrentWord({
        id: undefined,
        word: wordToAdd,
        reading: "",
        meaning: "",
        alternative: "",
        explainer: "",
        unlocked: "1",
        useReading: "0",
        familiarity: "0",
        testAmount: "0",
        lastTestDate: new Date().toISOString(),
        sentences: [{id: undefined, japanese:"",translation:""}],
    })
    setDisplayedWordToCurrentWord();
    switchWordListVisibility(false);
}

export async function deleteCurrentWord() {
    await fetch(
        HOST + "/word/" + currentWord.id,
        {   method: "DELETE",
            headers: { "Content-type": "application/json; charset=UTF-8" }
        }).catch(error => alert(error))
        .then(() => getWord(undefined, undefined, true));
}

export function deleteSentence(sentenceId) {
    fetch(
        HOST + "/word/sentence/" + sentenceId,
        {   method: "DELETE",
            headers: { "Content-type": "application/json; charset=UTF-8" }
        }).catch(error => alert(error))
}