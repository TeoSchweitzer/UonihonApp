import {currentFocus, currentWord, setCurrentWord} from "./state.js";
import {addListener} from "./listeners.js";
import {obfuscateOrEdit, switchNoKanjiMode} from "./logic.js";
import {DATE_FORMAT, MEDIUM_MODEL} from "./constants.js";
import {explainerPrompt, getTextFromLlm, meaningPrompt, readingPrompt, recursiveSentenceMaker} from "./llm-generation.js";

export function setDisplayedWordToCurrentWord(useLlmOnlyOn) {
    document.getElementById('word').innerText        = currentWord.word ?? "";
    document.getElementById('reading').innerText     = currentWord.reading ?? "";
    document.getElementById('meaning').innerText     = currentWord.meaning ?? "";
    document.getElementById('alternative').innerText = currentWord.alternative ?? "";
    document.getElementById('explainer').innerText   = (currentWord.explainer?.replace(/\\n/g, "\n")) ?? "";

    let editable = document.getElementsByClassName('editable')
    for (let i = 0; i < editable.length; i++) {
        if (currentWord.isDico === "1") { editable[i].classList.add("hidden") }
        else { editable[i].classList.remove("hidden") }
    }
    let dictionary = document.getElementsByClassName('dictionary')
    for (let i = 0; i < dictionary.length; i++) {
        if (currentWord.isDico === "1") { dictionary[i].classList.remove("hidden") }
        else { dictionary[i].classList.add("hidden") }
    }

    let sentencesNode = document.getElementById('sentences-container');
    sentencesNode.replaceChildren();
    (currentWord.sentences ?? [])?.forEach(function (sentence, i) {
        let htmlSentence = `
                    <div class="line"> </div>
                    <div id="sentence${i + 1}-obfuscation-card" class="obfuscation-container" style="margin: 12px 0" >
                    <div class="label">Phrase ${i + 1}</div>
                    <div id="sentence${i + 1}" class="card long">${heightLightWordIn(currentWord.word, sentence.japanese)}</div>
                    </div>
                    <div id="translation${i + 1}-obfuscation-card" class="obfuscation-container" >
                    <div class="label">Traduction ${i + 1}</div>
                    <div id="translation${i + 1}" class="card long">${sentence.translation}</div>
                    </div>
                `
        sentencesNode.insertAdjacentHTML('beforeend', htmlSentence)
        addListener(`sentence${i + 1}-obfuscation-card`, (event)=>obfuscateOrEdit(event, `sentence${i + 1}`));
        addListener(`translation${i + 1}-obfuscation-card`, (event)=>obfuscateOrEdit(event, `translation${i + 1}`));
    });

    if (currentWord.isDico === "1") {
        return
    }

    document.getElementById('familiarity').innerText = currentWord.familiarity ?? "";
    document.getElementById('amount-seen-value').innerText = currentWord.testAmount ?? "";
    document.getElementById('date-last-seen-value').innerText =
        ((currentWord.lastTestDate??"") === "") ? "" : DATE_FORMAT.format(Date.parse(currentWord.lastTestDate));

    switchNoKanjiMode(currentWord.useReading)

    if (currentFocus===undefined) {
        document.getElementById('familiarity-choice-button').style.backgroundColor = 'transparent'
        document.getElementById('familiarity-hint').style.display = 'block'
    }
    else {
        document.getElementById('familiarity-choice-button').style = undefined
        document.getElementById('familiarity-hint').style.display = 'none'
    }

    refreshObfuscation();

    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="reading") && (currentWord.reading??"") === "") {
        getTextFromLlm(readingPrompt(currentWord.word), MEDIUM_MODEL, true, (result) => {
            setCurrentWord({...currentWord, reading: result})
            document.getElementById('reading').innerText = result;
        })
    }
    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="meaning" || useLlmOnlyOn==="alternative") && (currentWord.meaning??"") === "" && (currentWord.alternative??"") === "") {
        getTextFromLlm(meaningPrompt(currentWord.word), MEDIUM_MODEL, true, async (result) => {
            while (!result || result === "" || result.includes(';') || (result.split(',')?.length??0) === 0 || result.split(',')[0] === "") {
                await getTextFromLlm(meaningPrompt(currentWord.word), MEDIUM_MODEL, true, (next) => { result = next });
            }
            let splitted = result.split(',')
            setCurrentWord({...currentWord, meaning:  splitted.shift()})
            setCurrentWord({...currentWord, alternative:  splitted.join(',')})
            document.getElementById('meaning').innerText = currentWord.meaning;
            document.getElementById('alternative').innerText = currentWord.alternative;
        });
    }
    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="explainer") && (currentWord.explainer??"") === "") {
        getTextFromLlm(explainerPrompt(currentWord.word), MEDIUM_MODEL, true, (result) => {
            setCurrentWord({...currentWord, explainer:  result})
            document.getElementById('explainer').innerText = result;
        });
    }
    if (((currentWord.sentences??[])?.length??0) === 0) {
        setCurrentWord({...currentWord, sentences:  [{japanese:"",translation:""}]})
    }
    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="sentences") && currentWord.sentences.some(s => s.japanese === "" && s.translation === "")) {
        recursiveSentenceMaker()
    }
}

export function heightLightWordIn(word, sentence) {
    return sentence.replaceAll(word, `<span class="highlight kanji-text">${word}</span>`)
}

export function switchTabsVisibility(visible) {
    let tabs = document.getElementsByClassName('tab')
    for (let i = 0; i < tabs.length; i++) {
        if (visible) {
            tabs[i].style = {}
        } else {
            tabs[i].style.display = 'none'
        }
    }
}

export function showDeletionConfirmation() {
    let element1 = document.getElementById("cancel-deletion-button")
    let element2 = document.getElementById("confirm-deletion-button")
    if (element1.style.visibility === "visible") {
        element1.style.visibility = "collapse"
        element2.style.visibility = "collapse"
    } else {
        element1.style.visibility = "visible"
        element2.style.visibility = "visible"
    }
}

export function setVisibleMainTab(tab) {
    alert("Pas implémenté !")
    let kanaTabNode = document.querySelector('.kanaTab');
    let kanjiTabNode = document.querySelector('.kanjiTab');
    let vocabularyTabNode = document.querySelector('.vocabularyTab');
    let toSetVisibleNode = document.querySelector('.' + tab);
    kanaTabNode.style.visibility = 'collapse';
    kanjiTabNode.style.visibility = 'collapse';
    vocabularyTabNode.style.visibility = 'collapse';
    toSetVisibleNode.style.visibility = 'visible';
    let color
    switch (tab) {
        case 'kanjiTab':
            color = "lighten(@secondary,10%)"
            break;
        case 'kanaTab':
            color = "lighten(@tertiary,10%)"
            break;
        default:
            color = "lighten(@primary,10%)"
    }
    less.modifyVars({
        '@current-tab-color': color,
    });
}

export function reveal(id) {
    document.getElementById(id).classList.remove("obfuscated");
}

export function refreshObfuscation() {
    let elements = document.getElementsByClassName("card")
    Array.from(elements).forEach(e => {
        if (e.classList.contains("obfuscated")) {
            e.classList.remove("obfuscated");
        }
    })
    if (currentFocus === undefined || currentWord.isDico === "1") { return }
    let toHide = []
    if (currentFocus==="writing") {
        toHide = ['word','reading','explainer']
    } else if (currentFocus==="reading") {
        toHide = ['meaning','reading','alternative','explainer']
    }
    toHide.forEach(id => {
        if (currentWord[id] !== "") {
            document.getElementById(id).classList.add("obfuscated")
        }
    })
    for (let i = 0; i < (currentWord.sentences??[]).length; i++) {
        if (currentFocus === "reading") {
            document.getElementById('translation'+(i+1)).classList.add("obfuscated")
        }
        if (currentFocus === "writing") {
            document.getElementById('sentence'+(i+1)).classList.add("obfuscated")
        }
    }
}
