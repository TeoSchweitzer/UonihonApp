import {
    addNewSentence,
    addWord,
    copyDicoWordToCustom, edit,
    getWord,
    obfuscateOrEdit,
    saveCurrentWord, simpleOrDoubleClickHandler,
    switchNoKanjiMode,
    deleteCurrentWord
} from "./logic.js";
import {startSearchingInWordList} from "./word-list.js";
import {setVisibleMainTab, showDeletionConfirmation, switchTabsVisibility} from "./display_management.js";
import {currentWord} from "./state.js";

window.onload = async function() {
    await getWord()
}

document.addEventListener('visibilitychange', () => {
    if (currentWord.isDico === "0") {
        saveCurrentWord()
    }
});

export function addListener(elementId, listener, type) {
    document.getElementById(elementId).addEventListener(type??'click', listener)
}

addListener('word-obfuscation-card', (event) => obfuscateOrEdit(event, 'word'));
addListener('reading-obfuscation-card', (event) => obfuscateOrEdit(event, 'reading'));
addListener('meaning-obfuscation-card', (event) => obfuscateOrEdit(event, 'meaning'));
addListener('alternative-obfuscation-card', (event) => obfuscateOrEdit(event, 'alternative'));
addListener('explainer-obfuscation-card', (event) => obfuscateOrEdit(event, 'explainer'));

addListener('sentences-adder-button', addNewSentence);

addListener('pronunciation-mode-button', switchNoKanjiMode);
addListener('familiarity-choice-button', (event) =>
    simpleOrDoubleClickHandler(event, null, () => edit('familiarity'))
);
addListener('deletion-menu-button', showDeletionConfirmation);
addListener('cancel-deletion-button', showDeletionConfirmation);
addListener('confirm-deletion-button', deleteCurrentWord);

addListener('unlocked-choice-button', copyDicoWordToCustom);

addListener('search-bar-input', ()=>switchTabsVisibility(false), "focusin");
addListener('search-bar-input', ()=>switchTabsVisibility(true), "focusout");
addListener('add-word-button', addWord);

addListener('reading-test-button', ()=>getWord(null, 'reading'));
addListener('search-words-button', startSearchingInWordList);
addListener('writing-test-button', ()=>getWord(null, 'writing'));

addListener('vocabulary-app-button', ()=>setVisibleMainTab('vocabularyTab'));
addListener('kanji-app-button', ()=>setVisibleMainTab('kanjiTab'));
addListener('kana-app-button', ()=>setVisibleMainTab('kanaTab'));
