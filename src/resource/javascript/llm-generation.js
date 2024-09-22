import {
    availableKeys,
    currentWord,
    pickAvailablePick,
    pickWaitingRequest,
    setAvailableKeys,
    setCurrentWord,
    waitingArea
} from "./state.js";
import {MEDIUM_MODEL} from "./constants.js";
import {setDisplayedWordToCurrentWord} from "./display_management.js";

export function getTextFromLlm(prompt, model, strict, doWithResult) {
    if (availableKeys.length > 0) {
        let pickedKey = pickAvailablePick()
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
                setAvailableKeys([...availableKeys, pickedKey])
                if (waitingArea.length > 0) {
                    let next = pickWaitingRequest()
                    getTextFromLlm(next.prompt, next.model, next.strict, next.doWithResult)
                }
            })
    } else {
        waitingArea.push({prompt:prompt, model:model, strict:strict, doWithResult:doWithResult})
    }
}

export function recursiveSentenceMaker() {
    getTextFromLlm(sentencePrompt(currentWord.word, currentWord.sentences), MEDIUM_MODEL, false, (result) => {
        if ((currentWord?.sentences??[]).length === 0) {
            setCurrentWord({...currentWord, sentences:  []})
        }
        let parsed = undefined;
        try {
            parsed = JSON.parse(result);
        } catch(e) {
            return recursiveSentenceMaker();
        }
        if (!parsed.japanese || !parsed.translation || !parsed.japanese.includes(currentWord.word) || parsed.translation === "") {
            return recursiveSentenceMaker();
        }
        let currentSentences = currentWord.sentences
        for (let i = 0; i < currentSentences.length; i++) {
            if (currentSentences[i].japanese === "" && currentSentences[i].translation === "") {
                currentSentences[i] = parsed;
                setCurrentWord({...currentWord, sentences: currentSentences})
                setDisplayedWordToCurrentWord('sentences');
                break;
            }
        }
    });
}

export function explainerPrompt(word) {
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

export function sentencePrompt(word, sentences) {
    let examples;
    let usableSentences = sentences.filter(s => s.japanese.includes(word))
    if (usableSentences.length === 0) {
        examples = "";
    } else {
        let onlyOne = "Voici un exemple de phrase en japonais utilisant le mot " + word + " accompagnée de sa traduction, en format JSON :\n";
        let plural = "Voici un ensemble de phrases en japonais utilisant le mot " + word + " accompagnées de leurs traductions, en format JSON :\n";
        examples = usableSentences.length > 1 ? plural : onlyOne
        usableSentences.forEach(sentence => {
            examples += JSON.stringify({"japanese": sentence.japanese, "translation": sentence.translation}) + "\n";
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

export function meaningPrompt(word) {
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

export function readingPrompt(word) {
    return {
        systemPrompt:
            "あなたはふりがな生成器で、どんな日本語の単語でも入力として受け取り、その仮名形を返すことができます。"
            +"返答では、文章や説明、前置きを書かず、リクエストされた単語の仮名形のみを直接提供し、それ以外は何も書かないでください。"
            +"要求された単語に漢字が含まれていない場合、その単語は必ず元のまま返されなければならない。",
        userPrompt:
        word
    }
}