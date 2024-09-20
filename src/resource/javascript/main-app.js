
const HOST = "http://" + window.location.host

let words = ""
let filtered = ""
let sentences = ""
let usage = ""
let noKanjiMode = false
let currentWord = undefined
let currentFocus = undefined

let MEDIUM_MODEL = "Mistral-Nemo-12B-Instruct-2407"
let SMALL_MODEL = "Meta-Llama-3.1-8B-Instruct"

let account1 = "keyholderforllmapi1@gmail.com"
let key1 = "2a4a6037-d7cd-4cfa-af34-4c2dc5b8f57b"
let account2 = "keyholderforllmapi2@gmail.com"
let key2 = "adc5b4bd-a6b1-456c-ab56-8e92cc68d913"
let account3 = "keyholderforllmapi3@gmail.com"
let key3 = "9235f1cd-0f1b-4758-84ae-b70a85b7591a"
let account4 = "keyholderforllmapi4@yahoo.com"
let key4 = "1c39afed-4ed9-4cd8-97fe-4f7e5a8e91cb"
let accountsPassword = "passwordforallaccountsthatholdanapikeyA1%"

let availableKeys = [key1, key2, key3, key4]
let waitingArea = []

let dateFormat = new Intl.DateTimeFormat('fr-FR', {timeStyle:"short", dateStyle:"short"})

let timer;

window.onload = async function() {
    await getWord()
}

document.addEventListener('visibilitychange', (event) => {
    if (currentWord?.id) {
        saveCurrentWord()
    }
});

function addListener(elementId, listener, type) {
    document.getElementById(elementId).addEventListener(type??'click', listener)
}

addListener('word-obfuscation-card', (event) => obfuscateOrEdit(event, 'word'));
addListener('reading-obfuscation-card', (event) => obfuscateOrEdit(event, 'reading'));
addListener('meaning-obfuscation-card', (event) => obfuscateOrEdit(event, 'meaning'));
addListener('alternative-obfuscation-card', (event) => obfuscateOrEdit(event, 'alternative'));
addListener('explainer-obfuscation-card', (event) => obfuscateOrEdit(event, 'explainer'));

addListener('sentences-adder-button', addNewSentence);
addListener('pronunciation-mode-button', switchNoKanjiMode);
addListener('deletion-menu-button', showDeletionConfirmation);
addListener('cancel-deletion-button', showDeletionConfirmation);
addListener('add-word-button', addWord);
addListener('confirm-deletion-button', null); //deleteCurrentWord);  //TODO
addListener('unlocked-choice-button', copyDicoWordToCustom);
addListener('familiarity-choice-button', (event) =>
    simpleOrDoubleClickHandler(event, null, () => edit('familiarity'))
);

addListener('search-bar-input', ()=>switchTabsVisibility(false), "focusin");
addListener('search-bar-input', ()=>switchTabsVisibility(true), "focusout");

addListener('reading-test-button', ()=>getWord(null, 'reading'));
addListener('search-words-button', startSearchingInWordList);
addListener('writing-test-button', ()=>getWord(null, 'writing'));

addListener('vocabulary-app-button', ()=>setVisibleMainTab('vocabularyTab'));
addListener('kanji-app-button', ()=>setVisibleMainTab('kanjiTab'));
addListener('kana-app-button', ()=>setVisibleMainTab('kanaTab'));

function copyDicoWordToCustom() {
    currentWord.id = 100000;
    setDisplayedWordToCurrentWord()
}

export async function getWord(wordId, focus) {

    if (currentWord) {
        await saveCurrentWord()
    }

    currentFocus = focus

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

            currentWord = {...json}

            setDisplayedWordToCurrentWord()
            switchWordListVisibility(false)
        });
}

function refreshObfuscation() {
    let elements = document.getElementsByClassName("card")
    Array.from(elements).forEach(e => {
        if (e.classList.contains("obfuscated")) {
            e.classList.remove("obfuscated");
        }
    })
    if (currentFocus === undefined) { return }
    let toHide = []
    if (currentFocus==="writing") {
        toHide = ['word','reading','explainer']
    } else if (currentFocus==="reading") {
        toHide = ['meaning','reading','alternative','explainer']
    }
    toHide.forEach(id => {
        if ((currentWord[id]??"") !== "") {
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

function getAllWords() {
    return fetch(HOST + "/word/words/all", {
        method: "GET", headers: { "Content-type": "application/json; charset=UTF-8" }
    }).then((response) => response.text()).then((response) => {
        words = response;
        filtered = words;
    }).catch(error => alert(error));
}

function saveCurrentWord() {
    if (currentWord.id === 100000) {
        return
    }
    if (currentFocus !== undefined) {
        currentWord.familiarity = (parseInt(currentWord.familiarity)+1) + ""
        currentWord.testAmount = (parseInt(currentWord.testAmount)+1) + ""
    }
    return fetch(HOST + "/word/save" + (currentFocus ? ("?" + new URLSearchParams({focus: currentFocus}).toString()) : ""), {
        method: "POST", keepalive: true,
        headers: { "Content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify(currentWord)
    }).catch(error => alert(error));
}

function explainerPrompt(word) {
    return {
        systemPrompt :
            "You are an assistant AI specialized in helping french students in their learning of the japanese language.",
        userPrompt :
            "Écrivez une petite explication qui contextualise l'usage du mot japonais \""+word+"\". "
            +"La petite explication doit rester courte, deux ou trois phrases, et ne doit ni donner d'exemple d'usage, ni donner de définition. "
            +"Elle doit simplement donner les contextes d'utilisation les plus courants. "
            +"Si les contextes d'utilisation de "+word+" sont très évident (par exemple si ce sont exactement les même qu'en français), "
            +"donnez simplement le sens du mot en une courte phrase, "
            +"en précisant que le mot s'utilise de la même façon qu'en français.",
    }
}

function sentencePrompt(word, sentences) {
    let examples;
    filtered = sentences.filter(s => s.japanese.includes(word))
    if ((filtered??[]).length === 0) {
        examples = "";
    } else {
        let onlyOne = "Voici un exemple de phrase en japonais utilisant le mot " + word + " accompagnée de sa traduction, en format JSON :\n";
        let plural = "Voici un ensemble de phrases en japonais utilisant le mot " + word + " accompagnées de leurs traductions, en format JSON :\n";
        examples = filtered.length > 1 ? plural : onlyOne
        filtered.forEach(sentence => {
            examples += `${JSON.stringify(sentence)}\n`;
        })
        examples += "La réponse doit respecter ce format JSON, mais proposer une phrase différente de ce qui a été montré en exemple, "
            +"si possible illustrant un usage différent du mot " + word + ". La traduction doit être en français."
            +"Ne pas fournir une liste d'objets JSON en réponse: un seul objet qui respecte le format est nécessaire.\n"
    }
    return {
        systemPrompt :
            "You are an assistant AI specialized in japanese teaching and japanese to french translations "
            +"that always directly returns valid JSON formatted answers of the requested format. "
            +"The responses must be parsable JSON objects, so the answers can't contain preambules, explanations, "
            +"or anything other then the JSON object.",
        userPrompt :
            "Écris une phrase en japonais qui illustre parfaitement un usage typique du mot japonais \""+word+"\", "
            +"ainsi que sa traduction en français. La phrase doit permettre de bien comprendre comment utiliser le mot \""+word+"\", "
            +"et la traduction française doit fidélement retranscrire le sens de la phrase. "
            +"Le format de la réponse DOIT être un objet JSON qui suit le schéma :\n"
            +"{ japanese: \"<phrase japonaise utilisant "+word+">\", translation: \"<traduction française>\" }\n"
            +examples
    }
}

function meaningPrompt(word) {
    return {
        systemPrompt :
            "You are a japanese to french translation system that has a singular function : taking a japanese word or idiom as input, "
            +"and returning the best translations possible for it, in french. You don't give explanations or prembules, "
            +"only the translations, separated by commas (\",\"), with the best and most common translation first. "
            +"Do NOT give suppmimentary translations if they are redundant: if a word has one perfect and direct translation, only return that.",
        userPrompt :
        word
    }
}

function readingPrompt(word) {
    return {
        systemPrompt:
            "あなたはふりがな生成器で、どんな日本語の単語でも入力として受け取り、その仮名形を返すことができます。"
            +"返答では、文章や説明、前置きを書かず、リクエストされた単語の仮名形のみを直接提供し、それ以外は何も書かないでください。"
            +"要求された単語に漢字が含まれていない場合、その単語は必ず元のまま返されなければならない。",
        userPrompt:
        word
    }
}

function getTextFromLlm(prompt, model, strict, doWithResult) {
    if (availableKeys.length > 0) {
        let pickedKey = availableKeys.shift()
        fetch("https://api.arliai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${pickedKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": model,
                "messages": [
                    { "role": "system",
                        "content": prompt.systemPrompt},
                    { "role": "user",
                        "content": prompt.userPrompt}
                ],
                "temperature": strict ? 0.1 : 0.7,
                "top_k": strict ? 3 : 40,
                "max_tokens": 150
            })
        })
            .then(response => response.json())
            .then(json => doWithResult(json.choices[0].message.content))
            .catch(error => alert(error))
            .finally(() => {
                availableKeys.push(pickedKey)
                if (waitingArea.length > 0) {
                    let next = waitingArea.shift()
                    getTextFromLlm(next.prompt, next.model, next.strict, next.doWithResult)
                }
            })
    } else {
        waitingArea.push({prompt:prompt, model:model, strict:strict, doWithResult:doWithResult})
    }
}

function setDisplayedWordToCurrentWord(useLlmOnlyOn) {
    document.getElementById('word').innerText        = currentWord.word ?? "";
    document.getElementById('reading').innerText     = currentWord.reading ?? "";
    document.getElementById('meaning').innerText     = currentWord.meaning ?? "";
    document.getElementById('alternative').innerText = currentWord.alternative ?? "";
    document.getElementById('explainer').innerText   = (currentWord.explainer?.replace(/\\n/g, "\n")) ?? "";

    let editable = document.getElementsByClassName('editable')
    for (let i = 0; i < editable.length; i++) {
        if (currentWord.id < 100000) { editable[i].classList.add("hidden") }
        else { editable[i].classList.remove("hidden") }
    }
    let dictionary = document.getElementsByClassName('dictionary')
    for (let i = 0; i < dictionary.length; i++) {
        if (currentWord.id < 100000) { dictionary[i].classList.remove("hidden") }
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

    if (currentWord.id < 100000) {
        return
    }

    document.getElementById('familiarity').innerText = currentWord.familiarity ?? "";
    document.getElementById('amount-seen-value').innerText = currentWord.testAmount ?? "";
    document.getElementById('date-last-seen-value').innerText =
        ((currentWord.lastTestDate??"") === "") ? "" : dateFormat.format(Date.parse(currentWord.lastTestDate));

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
            currentWord.reading = result;
            document.getElementById('reading').innerText = result;
        })
    }
    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="meaning" || useLlmOnlyOn==="alternative") && (currentWord.meaning??"") === "" && (currentWord.alternative??"") === "") {
        getTextFromLlm(meaningPrompt(currentWord.word), MEDIUM_MODEL, true, async (result) => {
            while (!result || result === "" || result.includes(';') || (result.split(',')?.length??0) === 0 || result.split(',')[0] === "") {
                await getTextFromLlm(meaningPrompt(currentWord.word), MEDIUM_MODEL, true, (next) => { result = next });
            }
            let splitted = result.split(',')
            currentWord.meaning = splitted.shift();
            currentWord.alternative = splitted.join(',');
            document.getElementById('meaning').innerText = currentWord.meaning;
            document.getElementById('alternative').innerText = currentWord.alternative;
        });
    }
    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="explainer") && (currentWord.explainer??"") === "") {
        getTextFromLlm(explainerPrompt(currentWord.word), MEDIUM_MODEL, true, (result) => {
            currentWord.explainer = result;
            document.getElementById('explainer').innerText = result;
        });
    }
    if (((currentWord.sentences??[])?.length??0) === 0) {
        currentWord.sentences = [{japanese:"",translation:""}]
    }
    if ((useLlmOnlyOn === undefined || useLlmOnlyOn==="sentences") && currentWord.sentences.some(s => s.japanese === "" && s.translation === "")) {
        recursiveSentenceMaker()
    }
}

function heightLightWordIn(word, sentence) {
    return sentence.replaceAll(word, `<span class="highlight kanji-text">${word}</span>`)
}

function obfuscateOrEdit(event, id) {
    simpleOrDoubleClickHandler(event, ()=>reveal(id), ()=>{reveal(id);edit(id)})
}

function simpleOrDoubleClickHandler(event, toCallIfSimpleClick, toCallIfDoubleClick) {
    if (event.detail === 1) {
        timer = setTimeout(() => {
            if (toCallIfSimpleClick) toCallIfSimpleClick()
        }, 200)
    } else if (event.detail === 2) {
        clearTimeout(timer)
        if (toCallIfDoubleClick) toCallIfDoubleClick()
    }
}

function edit(divId) {

    if ((divId==="familiarity" && currentFocus === undefined) || currentWord.id < 10000) {
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
        if (divId.includes("sentence") || divId.includes("translation")) {
            if (div.textContent === "") {
                currentWord.sentences.splice(parseInt(divId.match(/\d+/))-1, 1)
            } else {
                currentWord.sentences[parseInt(divId.match(/\d+/))-1][(divId.includes("sentence"))?"sentence":"translation"] = div.innerText
            }
        }
        else if (divId === "familiarity") {
            if (div.textContent !== "" && /^\d+$/.test(div.textContent)) {
                currentWord[divId] = div.innerText;
            }
        }
        else if (divId === "word") {
            if (div.textContent !== "") {
                currentWord[divId] = div.innerText;
            }
        }
        else {
            currentWord[divId] = div.innerText
        }
        setDisplayedWordToCurrentWord(divId);
    });
}

function doSomething(toWrite) {
    fetch(HOST + "kanjis", {
        method: "POST",
        body: JSON.stringify({
            message: toWrite
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => console.log(json))
        .catch(error => alert(error));
}

function setVisibleMainTab(tab) {
    alert("Pas implémenté !")
    var kanaTabNode = document.querySelector('.kanaTab');
    var kanjiTabNode = document.querySelector('.kanjiTab');
    var vocabularyTabNode = document.querySelector('.vocabularyTab');
    var toSetVisibleNode = document.querySelector('.' + tab);
    kanaTabNode.style.visibility = 'collapse';
    kanjiTabNode.style.visibility = 'collapse';
    vocabularyTabNode.style.visibility = 'collapse';
    toSetVisibleNode.style.visibility = 'visible';
    let color = ""
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

async function switchWordListVisibility(goToWordList) {
    let listNode = document.querySelector('.words-list-activity');
    let testNode = document.querySelector('.word-tester-activity');
    let searchBarNode = document.getElementById('search-bar');
    if ((goToWordList??true) && listNode.style.display === 'none') {
        listNode.style.display = 'block'
        testNode.style.display = 'none';
        searchBarNode.addEventListener('input', filterWords);
        await getAllWords()
        setWordList(words)
    } else {
        searchBarNode.removeEventListener('input', filterWords)
        listNode.style.display = 'none';
        testNode.style.display = 'grid';
    }
}

function setWordList(wordList) {
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

function startSearchingInWordList() {
    switchWordListVisibility(true)
    filtered = words
    let searchBarInputNode = document.getElementById('search-bar-input');
    searchBarInputNode.value = ""
    searchBarInputNode.focus();
}

function filterWords(event) {
    setWordList(
        (words
            .split('\n')
            .filter(w => w.toUpperCase().includes((event.target?.value?.toUpperCase()??"")))
        ).join('\n')
    )
}

function reveal(id) {
    document.getElementById(id).classList.remove("obfuscated");
}

function switchNoKanjiMode(value) {
    if (value==="0" || value==="1")
        currentWord.useReading = value;
    else
        currentWord.useReading = (currentWord.useReading === "0") ? "1" : "0";

    const isNoKanji = currentWord.useReading !== "0"
    document.getElementById("no-kanji-checkbox").checked = isNoKanji
    let wordNode = document.getElementById('word')
    wordNode.innerText = isNoKanji ? currentWord.reading : currentWord.word
    wordNode.classList.remove("kanji", "kana")
    wordNode.classList.add(isNoKanji ? "kana-text" : "kanji-text")
    document.getElementById("no-kanji-label").style.visibility = isNoKanji ? 'visible' : 'collapse'
}

function showDeletionConfirmation() {
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

function addNewSentence() {
    if ((currentWord?.sentences??[]).length === 0) {
        currentWord.sentences = [];
    }
    currentWord.sentences.push({id: undefined, japanese:"", translation:""});
    setDisplayedWordToCurrentWord('sentences');
}

function recursiveSentenceMaker() {
    getTextFromLlm(sentencePrompt(currentWord.word, currentWord.sentences), MEDIUM_MODEL, false, (result) => {
        if ((currentWord?.sentences??[]).length === 0) {
            currentWord.sentences = [];
        }
        let parsed = undefined;
        try {
            parsed = JSON.parse(result);
        } catch(e) {
            return recursiveSentenceMaker();
        }
        if (!parsed.japanese || !parsed.translation || !parsed.japanese.includes(currentWord.word) || parsed.translation == "") {
            return recursiveSentenceMaker();
        }
        for (let i = 0; i < currentWord.sentences.length; i++) {
            if (currentWord.sentences[i].japanese === "" && currentWord.sentences[i].translation === "") {
                currentWord.sentences[i] = parsed;
                setDisplayedWordToCurrentWord('sentences');
                break;
            }
        }
    });
}

async function addWord() {
    await saveCurrentWord();
    currentFocus = undefined;
    let wordToAdd = document.getElementById('search-bar-input').value
    currentWord = {
        id: 100000,
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
    }
    setDisplayedWordToCurrentWord();
    switchWordListVisibility(false);
}

function switchTabsVisibility(visible) {
    let tabs = document.getElementsByClassName('tab')
    for (let i = 0; i < tabs.length; i++) {
        if (visible) {
            tabs[i].style = {}
        } else {
            tabs[i].style.display = 'none'
        }
    }
}
