import {KEY_1, KEY_2, KEY_3, KEY_4} from "./constants.js";
import {manageLoadingBar} from "./display_management.js";

export let currentWord;
export let setCurrentWord = (newValue) => currentWord = newValue;

export let currentFocus;
export let setCurrentFocus = (newValue) => currentFocus = newValue;

export let loadingCounter = 0;
export let startedLoading = () => {
    loadingCounter++;
    manageLoadingBar(loadingCounter > 0)
}
export let finishedLoading = () => {
    loadingCounter--;
    manageLoadingBar(loadingCounter > 0)
}

export let wordsList;
export let setWordsList = (newValue) => wordsList = newValue;

export let filteredWordsList;
export let setFilteredWordsList = (newValue) => filteredWordsList = newValue;


export let doubleClickTimer;
export let setDoubleClickTimer = (newValue) => doubleClickTimer = newValue;
export let clearDoubleClickTimer = () => clearTimeout(doubleClickTimer)


export let availableKeys = [KEY_1, KEY_2, KEY_3, KEY_4];
export let setAvailableKeys = (newValue) => availableKeys = newValue;
export let pickAvailablePick = () => availableKeys.shift()

export let waitingArea = [];
export let pickWaitingRequest = () => waitingArea.shift()