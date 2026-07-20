"use strict";

const REVIEW_PASSWORD = 'reviewme';

const page = {
        startDiv:           document.getElementById('startSection'),
        questionDiv:        document.getElementById('testSection'),
        questionHeader:     document.getElementById('question_number'),
        questionText:       document.getElementById('question_text'),
        questionAnswers:    document.getElementById('possible_answers'), 
        answerA:            document.getElementById('answerA'),
        answerB:            document.getElementById('answerB'),
        answerC:            document.getElementById('answerC'),
        labelA:             document.getElementById('labelA'),
        labelB:             document.getElementById('labelB'),
        labelC:             document.getElementById('labelC'),
        endDiv:             document.getElementById('endSection'), 
        scoreResults:       document.getElementById('scoreResults'),
        feedback:           document.getElementById('feedback'),
        reviewBtn:          document.getElementById('reviewBtn'),
        reviewPasswordBox:  document.getElementById('reviewPasswordBox'),
        reviewPasswordInput: document.getElementById('reviewPassword'),
        reviewPasswordSubmit: document.getElementById('reviewPasswordSubmit'),
        reviewMessage:      document.getElementById('reviewMessage'),
        testSelect:         document.getElementById('testSelect')
};

let data = null;
let reviewUnlocked = false;

function getReviewUnlocked() {
    return localStorage.getItem('reviewUnlocked') === 'true';
}

function setReviewUnlocked(value) {
    reviewUnlocked = Boolean(value);
    localStorage.setItem('reviewUnlocked', reviewUnlocked ? 'true' : 'false');
}

async function loadJSON(testFilename) {
    // loads test data into an object
    try {
        const response = await fetch(`./Tests/${testFilename}`);
        if (!response.ok) throw new Error(`JSON Load Error: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading JSON: ', error);
    }
}

// Retrieve value from browser memory
function getLocal(v) {
    return localStorage.getItem(v);
}

function getFontSize() {
    return Number(localStorage.getItem('fontSize')) || 100;
}

function setFontSize(value) {
    const size = Math.min(140, Math.max(80, value));
    localStorage.setItem('fontSize', size);
    document.documentElement.style.fontSize = `${size}%`;
}

// Retrieve the user's answer to a question from memory
function getAnswer(v) {
    let a = JSON.parse(localStorage.getItem('userAnswers')) ?? [];
    if (!Array.isArray(a)) { a = []; }
    return a[v];
}

// Set a user's answer to memory
function setAnswer(k, v) {
    let a = JSON.parse(localStorage.getItem('userAnswers')) ?? [];
    if (!Array.isArray(a)) { a = [] }
    a[k] = v;
    localStorage.setItem('userAnswers', JSON.stringify(a));
}

// Resets all local storage and starts afresh
function resetLocal() {
    localStorage.clear();
    localStorage.setItem('userStatus', "start");
    localStorage.setItem('questionNum', 0);
    localStorage.setItem('userAnswers', null);
    localStorage.setItem('userScore', null);
    localStorage.setItem('scoredAnswers', null);
    localStorage.setItem('selectedTest', '');
    setReviewUnlocked(false);
    return "start";
}

// Show/Hide the section DIV's depending on where the user is currently
function renderSections() {
    const state = getLocal("userStatus") ?? resetLocal();

    page.startDiv.hidden = state !== 'start';
    page.questionDiv.hidden = !(state === 'testing' || state === 'reviewing');
    page.endDiv.hidden = state !== 'finished';
}

// attach listeners to various buttons 
function attachListeners() {    
    beginBtn.addEventListener('click', async () => {
        if (!page.testSelect.value) {
            alert('Please select a test before beginning.');
            return;
        }
        localStorage.setItem('selectedTest', page.testSelect.value);
        data = await loadJSON(page.testSelect.value);
        localStorage.setItem('userStatus', "testing");
        renderAll();
    });
    
    endBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Are you sure you want to finish your attempt and submit?');
        if (!confirmed) return;
        localStorage.setItem('userStatus', "finished");
        renderAll();
    });

    restartBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Are you sure you want to erase all test answers and retake the test?');
        if (!confirmed) return;
        resetLocal();
        renderAll();
    });

    page.reviewBtn.addEventListener('click', () => {
        localStorage.setItem('userStatus', "reviewing");
        localStorage.setItem('questionNum', 0);
        renderAll();
    });

    nextPage.addEventListener('click', () => {    
        if (!data) return; // Safety check
        let q = Number(getLocal("questionNum"));
        if (q < data.length - 1) {
            localStorage.setItem('questionNum', ++q);
            renderAll();
        }
    });

    prevPage.addEventListener('click', () => {
        if (!data) return; // Safety check
        let q = Number(getLocal("questionNum"));
        if (q > 0) {
            localStorage.setItem('questionNum', --q);
            renderAll();
        }
    });

    possible_answers.addEventListener('click', (e) => {
        if (!data) return; // Safety check
        const li = e.target.closest('li');
        if (!li) return;

        const radio = li.querySelector('input[type="radio"]');
        if (!radio.checked) return; // click didn't actually select it

        let q = Number(getLocal("questionNum"));
        const selectedAnswer = [...li.parentNode.children].indexOf(li);
        setAnswer(q, selectedAnswer);

        let correctAnswer = Number(data[q].correct_answer) - 1;
        displayFeedback(q, selectedAnswer, correctAnswer);
    });

    page.reviewPasswordSubmit.addEventListener('click', () => {
        const attempted = page.reviewPasswordInput.value.trim();
        if (attempted === REVIEW_PASSWORD) {
            setReviewUnlocked(true);
            page.reviewMessage.textContent = 'Password accepted. Review is enabled.';
            page.reviewBtn.hidden = false;
            page.reviewPasswordBox.hidden = true;
            page.reviewPasswordInput.value = '';
            renderAll();
        } else {
            page.reviewMessage.textContent = 'Incorrect password. Try again.';
        }
    });

    page.reviewPasswordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            page.reviewPasswordSubmit.click();
        }
    });
}

// Renders the current question on the screen
function renderQuestion() {
    if (!data) return; // Don't render if data hasn't been loaded yet
    
    const q = Number(getLocal('questionNum'));
    page.questionHeader.innerHTML = `Question ${q + 1} of ${data.length}`;
    page.questionText.innerHTML = data[q].question_text;

    let selectedAnswer = getAnswer(q);
    page.labelA.innerHTML = `A) ${data[q].possible_answers[0]}`;
    page.labelB.innerHTML = `B) ${data[q].possible_answers[1]}`;
    page.labelC.innerHTML = `C) ${data[q].possible_answers[2]}`;

    // Check the user's previous selection
    const radios = [page.answerA, page.answerB, page.answerC];
    radios.forEach((r, i) => {
        r.checked = (i === selectedAnswer);
    });
    // Store the correct answer in memory
    let correctAnswer = Number(data[q].correct_answer) - 1;
    displayFeedback(q, selectedAnswer, correctAnswer);
}

// Determines the answer result and displays on screen if in 
function displayFeedback(q, u, a) {
    let result = null;
    const status = getLocal('userStatus');

    if (u === undefined || u === null) {
        page.feedback.innerHTML = '';
    } else if (u === a) {
        if (status === 'reviewing') {
            page.feedback.innerHTML = "<span class=correct>Correct</span>";
        } else {
            page.feedback.innerHTML = '';
        }
        result = 1;
    } else {
        if (status === 'reviewing') {
            page.feedback.innerHTML = `<span class=incorrect>Incorrect</span><br><span class=answer>The answer is: ${String.fromCharCode(65 + a)})  ${data[q].possible_answers[a]}`;
        } else {
            page.feedback.innerHTML = '';
        }
        result = 0;
    }

    if (result !== null) {
        let scores = JSON.parse(localStorage.getItem('scoredAnswers')) ?? [];
        if (!Array.isArray(scores)) { scores = []; }
        scores[q] = result;
        localStorage.setItem('scoredAnswers', JSON.stringify(scores));
    }

    calcScore();
}

function calcScore() {
    const storedScores = JSON.parse(localStorage.getItem('scoredAnswers')) ?? [];
    const scores = Array.from({ length: data.length }, (_, i) => Number(storedScores[i] ?? 0));
    let scoreTotal = 0;
    for (const n of scores) {
        scoreTotal += n;
    }
    let scorePct = (scoreTotal / data.length) * 100;
    scorePct = scorePct.toFixed(2);
    localStorage.setItem('userScore', scorePct);
    return [scoreTotal, scorePct];
}

function updateReviewControls() {
    const isFinished = getLocal('userStatus') === 'finished';
    page.reviewPasswordBox.hidden = reviewUnlocked || !isFinished;
    page.reviewBtn.hidden = !reviewUnlocked || !isFinished;
}

function updateNavigationButtons() {
    if (!data) return; // Don't update if data hasn't been loaded yet
    
    const q = Number(getLocal('questionNum'));
    const isFirstQuestion = q === 0;
    const isLastQuestion = q === data.length - 1;
    
    document.getElementById('prevPage').disabled = isFirstQuestion;
    document.getElementById('nextPage').disabled = isLastQuestion;
}

function updateEndButtonLabel() {
    const status = getLocal('userStatus');
    const endBtn = document.getElementById('endBtn');
    
    if (status === 'reviewing') {
        endBtn.textContent = 'Return to Summary';
    } else if (status === 'testing') {
        endBtn.textContent = 'Finish and Submit Test';
    }
}

function renderResults() {  
    if (!data) return; // Don't render if data hasn't been loaded yet
    
    page.scoreResults.innerHTML = '';
    let [scoreTotal, scorePct] = calcScore();
    const storedScores = JSON.parse(getLocal('scoredAnswers')) ?? [];
    const scores = Array.from({ length: data.length }, (_, i) => Number(storedScores[i] ?? 0));

    page.scoreResults.innerHTML = `<div>
        You had ${scoreTotal} correct of ${data.length} questions.<br>
        You scored ${scorePct}%<br><br></div>
    `;

    if (!reviewUnlocked) {
        return;
    }

    page.scoreResults.innerHTML += "<br><br><p>Click on a question to review. Correct questions are marked teal with a ✓, incorrect are marked amber with a ✗.</p>";

    const table = document.createElement('table');
    const columns = 5;

    for (let i = 0; i < data.length; i += columns) {
        const row = document.createElement('tr');
        for (let j = i; j < i + columns; j++) {
            const cell = document.createElement('td');
            const isCorrect = scores[j] !== 0;
            cell.dataset.questionNum = j + 1;
            // Glyph is a non-color cue so correct/incorrect never relies on color alone.
            cell.textContent = `${isCorrect ? '✓' : '✗'} ${j + 1}`;
            cell.classList.add(isCorrect ? 'score-correct' : 'score-incorrect');
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    table.addEventListener('click', (e) => {
        const cell = e.target.closest('td');
        if (!cell) return;
        localStorage.setItem('questionNum', cell.dataset.questionNum - 1);
        localStorage.setItem('userStatus', 'reviewing');
        renderAll();
        //console.log('Clicked cell:', cell.textContent - 1);
    });

    page.scoreResults.appendChild(table);
}

function renderAll() {    
    renderSections();
    renderQuestion();
    updateNavigationButtons();
    updateEndButtonLabel();
    if (getLocal('userStatus') === 'finished') {
        renderResults();
        updateReviewControls();
        if (!reviewUnlocked) {
            page.reviewMessage.textContent = '';
        }
    } else {
        page.scoreResults.innerHTML = '';
        updateReviewControls();
        page.reviewMessage.textContent = '';
    }
}

function attachFontSizeControls() {
    const increaseFont = document.getElementById('increaseFont');
    const decreaseFont = document.getElementById('decreaseFont');

    if (!increaseFont || !decreaseFont) return;

    increaseFont.addEventListener('click', () => setFontSize(getFontSize() + 10));
    decreaseFont.addEventListener('click', () => setFontSize(getFontSize() - 10));
}

async function main() {
    const selectedTest = localStorage.getItem('selectedTest');
    if (selectedTest) {
        data = await loadJSON(selectedTest);
    }
    reviewUnlocked = getReviewUnlocked();
    setFontSize(getFontSize());
    renderAll();
    attachListeners();
    attachFontSizeControls();
}

main();