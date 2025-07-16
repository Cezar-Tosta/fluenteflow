// Variáveis Globais
let highlightedWords = [];
let selectedText = '';
let quizWords = [];
let chunks = [];
let recognition;
let pronunciationWords = [];
let chave_api = 'CHAVE_AQUI'; // Insira sua chave de API do Google Cloud

// Desabilitar os botões inicialmente
document.getElementById('startDictation').disabled = true;
document.getElementById('startPronunciation').disabled = true;
document.getElementById('startWordExercise').disabled = true;

// Event listeners iniciais
document.getElementById("fileInputItalian").addEventListener("change", function () {
    readFile(this);
});

document.getElementById('generateFlashcards').addEventListener('click', function () {
    generateFlashcards();
});

document.getElementById('clearFlashcards').addEventListener('click', function () {
    clearFlashcards();
});

document.getElementById('startDictation').addEventListener('click', function () {
    generateQuiz();
});

document.getElementById('clearDictation').addEventListener('click', function () {
    clearDictation();
});

document.getElementById('newDictation').addEventListener('click', function () {
    generateQuiz();
});

document.getElementById('startPronunciation').addEventListener('click', generatePronunciationQuiz);
document.getElementById('clearPronunciation').addEventListener('click', clearPronunciationQuiz);
document.getElementById('newPronunciation').addEventListener('click', generatePronunciationQuiz);

// Event listeners para o novo exercício de palavras
document.getElementById('startWordExercise').addEventListener('click', generateWordExercise);
document.getElementById('clearWord').addEventListener('click', clearWordQuiz);
document.getElementById('newWord').addEventListener('click', generateWordExercise);

// Event listeners para os botões dos exercícios
const exerciseButtons = document.querySelectorAll('.exercise-btn');
exerciseButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Esconder todas as seções de exercícios
        const exerciseSections = document.querySelectorAll('.exercise-section');
        exerciseSections.forEach(section => {
            section.style.display = 'none';
        });

        // Remover classe 'active-exercise' de todos os botões
        exerciseButtons.forEach(btn => {
            btn.classList.remove('active-exercise');
        });

        // Mostrar a seção do exercício correspondente
        const exercise = button.getAttribute('data-exercise');
        const exerciseSection = document.getElementById(`${exercise}-section`);
        exerciseSection.style.display = 'block';

        // Adicionar classe 'active-exercise' ao botão clicado
        button.classList.add('active-exercise');
    });
});

// Função para carregar e dividir o texto em italiano
function readFile(input) {
    let file = input.files[0];
    let reader = new FileReader();

    reader.onload = function () {
        let text = reader.result;
        let words = text.split(/\s+/);
        let numWords = words.length;

        chunks = [];
        let currentChunk = [];
        let wordCount = 0;

        for (let i = 0; i < words.length; i++) {
            currentChunk.push(words[i]);
            wordCount++;

            if (wordCount >= Math.floor(numWords * 0.05) && /[.!?]$/.test(words[i])) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [];
                wordCount = 0;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }

        // Filtrar chunks vazios
        chunks = chunks.filter(chunk => chunk.trim().length > 0);

        displayTextInCells(chunks);
        translateChunks(chunks);
        makeChunksSelectable();
    };

    reader.readAsText(file);
}

// Função para exibir o texto em células (blocos)
function displayTextInCells(chunks) {
    const italianTextDiv = document.getElementById('italianText');
    const portugueseTextDiv = document.getElementById('portugueseText');
    italianTextDiv.innerHTML = '';
    portugueseTextDiv.innerHTML = '';

    chunks.forEach((chunk, index) => {
        let cell = document.createElement('div');
        cell.classList.add('text-cell');
        cell.style.textAlign = 'justify';

        // Incluindo o número do chunk com espaço no texto em italiano
        cell.innerHTML = `<p><strong>${index + 1}. </strong><span id="chunk-${index}">${processText(chunk, index)}</span></p><button class="play-btn" onclick="playAudioWithGoogleCloud(${index})">🔊</button>`;

        // Alternar a cor de fundo
        if (index % 2 === 0) {
            cell.classList.add('even');
        } else {
            cell.classList.add('odd');
        }

        italianTextDiv.appendChild(cell);

        let portugueseCell = document.createElement('div');
        portugueseCell.classList.add('text-cell');
        portugueseCell.style.textAlign = 'justify';

        // Incluindo o número do chunk na tradução com espaço garantido entre o número e a primeira palavra
        portugueseCell.setAttribute('id', `portuguese-chunk-${index}`);
        portugueseCell.innerHTML = `<p><strong>${index + 1}.&nbsp</strong></p>`;  // Espaço logo após o número

        // Alternar a cor de fundo
        if (index % 2 === 0) {
            portugueseCell.classList.add('even');
        } else {
            portugueseCell.classList.add('odd');
        }

        portugueseTextDiv.appendChild(portugueseCell);
    });
}

// Processa o texto para permitir seleção e destaque de palavras
function processText(text, chunkIndex) {
    let words = text.split(' ');
    let processedText = '';

    words.forEach((word, index) => {
        processedText += `<span class="word" id="chunk-${chunkIndex}-word-${index}" onmouseup="handleSelection(event, ${chunkIndex})">${word}</span> `;
    });

    return processedText;
}

// Função para lidar com a seleção de palavras
function handleSelection(event, chunkIndex) {
    const selection = window.getSelection();
    const selectedRange = selection.getRangeAt(0);

    if (selectedRange && selectedRange.toString().length > 0) {
        const selectedText = selection.toString();
        const trimmedText = selectedText.trim();

        // Verifica se já foi destacado, se sim, remove o destaque
        const isHighlighted = highlightedWords.some(item => item.word === trimmedText);
        if (isHighlighted) {
            removeHighlight(trimmedText);
        } else {
            const comment = prompt("Insira a tradução ou comentário para as palavras selecionadas:");
            if (comment) {
                const span = document.createElement('span');
                span.className = 'highlight';
                span.textContent = trimmedText;
                span.onclick = () => toggleHighlight(span, trimmedText);
                span.dataset.comment = comment;

                // Captura espaços em branco após a palavra selecionada
                const trailingSpacesMatch = selectedText.match(/\s+$/);
                const trailingSpaces = trailingSpacesMatch ? trailingSpacesMatch[0] : '';

                // Substitui o conteúdo selecionado pelo novo span e preserva os espaços
                selectedRange.deleteContents();
                const fragment = document.createDocumentFragment();
                fragment.appendChild(span);
                if (trailingSpaces) {
                    fragment.appendChild(document.createTextNode(trailingSpaces));
                }
                selectedRange.insertNode(fragment);

                highlightedWords.push({ word: trimmedText, chunkIndex, comment });
                updateFlashcardCount();
            }
        }
    }
}

// Função para remover o destaque e excluir do flashcards/ditado
function removeHighlight(word) {
    highlightedWords = highlightedWords.filter(item => item.word !== word);
    const spans = document.querySelectorAll('.highlight');
    spans.forEach(span => {
        if (span.textContent === word) {
            const textNode = document.createTextNode(span.textContent);
            const parent = span.parentElement;

            // Substitui o span pelo texto original
            parent.replaceChild(textNode, span);

            // Criar um novo span para reativar a função de seleção
            const newSpan = document.createElement('span');
            newSpan.className = 'word'; // Definir a classe de palavra
            newSpan.textContent = word;
            newSpan.onmouseup = function (event) {
                handleSelection(event, parent.getAttribute('id').split('-')[1]); // Passa o índice correto do chunk
            };

            // Substitui o texto pelo novo span
            parent.replaceChild(newSpan, textNode);
        }
    });
    updateFlashcardCount();
}


// Função para alternar destaque e remover do flashcards/ditado
function toggleHighlight(span, word) {
    removeHighlight(word);
}

// Atualiza a contagem dos flashcards e o contador de trechos selecionados
function updateFlashcardCount() {
    const flashcardTitle = document.querySelector("#flashcardTitle");
    flashcardTitle.innerText = `Flashcards (${highlightedWords.length})`;

    // Atualizar o máximo da quantidade para o ditado
    const dictationQuantityInput = document.getElementById("dictationQuantity");
    const dictationSlider = document.getElementById("dictationSlider");
    const dictationMaxDiv = document.getElementById("dictationMax");
    const startDictationButton = document.getElementById('startDictation');

    if (highlightedWords.length > 0) {
        dictationQuantityInput.max = highlightedWords.length;
        dictationSlider.max = highlightedWords.length;
        dictationQuantityInput.value = Math.min(dictationQuantityInput.value, highlightedWords.length);
        dictationSlider.value = dictationQuantityInput.value;
        dictationMaxDiv.innerText = `Máximo: ${highlightedWords.length}`;
        validateDictationQuantity();
    } else {
        dictationQuantityInput.max = 0;
        dictationSlider.max = 0;
        dictationQuantityInput.value = 0;
        dictationSlider.value = 0;
        dictationMaxDiv.innerText = `Máximo: 0`;
        startDictationButton.disabled = true;
    }

    // Atualizar o máximo da quantidade para o exercício de pronúncia
    const pronunciationQuantityInput = document.getElementById("pronunciationQuantity");
    const pronunciationSlider = document.getElementById("pronunciationSlider");
    const pronunciationMaxDiv = document.getElementById("pronunciationMax");
    const startPronunciationButton = document.getElementById('startPronunciation');

    if (highlightedWords.length > 0) {
        pronunciationQuantityInput.max = highlightedWords.length;
        pronunciationSlider.max = highlightedWords.length;
        pronunciationQuantityInput.value = Math.min(pronunciationQuantityInput.value, highlightedWords.length);
        pronunciationSlider.value = pronunciationQuantityInput.value;
        pronunciationMaxDiv.innerText = `Máximo: ${highlightedWords.length}`;
        validatePronunciationQuantity();
    } else {
        pronunciationQuantityInput.max = 0;
        pronunciationSlider.max = 0;
        pronunciationQuantityInput.value = 0;
        pronunciationSlider.value = 0;
        pronunciationMaxDiv.innerText = `Máximo: 0`;
        startPronunciationButton.disabled = true;
    }

    // Atualizar o máximo da quantidade para o novo exercício de palavras
    const wordQuantityInput = document.getElementById("wordQuantity");
    const wordSlider = document.getElementById("wordSlider");
    const wordMaxDiv = document.getElementById("wordMax");
    const startWordButton = document.getElementById('startWordExercise');

    if (highlightedWords.length > 0) {
        wordQuantityInput.max = highlightedWords.length;
        wordSlider.max = highlightedWords.length;
        wordQuantityInput.value = Math.min(wordQuantityInput.value, highlightedWords.length);
        wordSlider.value = wordQuantityInput.value;
        wordMaxDiv.innerText = `Máximo: ${highlightedWords.length}`;
        validateWordQuantity();
    } else {
        wordQuantityInput.max = 0;
        wordSlider.max = 0;
        wordQuantityInput.value = 0;
        wordSlider.value = 0;
        wordMaxDiv.innerText = `Máximo: 0`;
        startWordButton.disabled = true;
    }
}

// Função para tocar o áudio de palavras destacadas com a API Google Cloud Text-to-Speech
async function playAudioWithGoogleCloud(index) {
    const googleCloudApiKey = chave_api;
    const chunkText = document.getElementById(`chunk-${index}`).innerText;

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey}`;

    const requestBody = {
        input: { text: chunkText },
        voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
        audioConfig: { audioEncoding: "MP3" }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        const audioContent = data.audioContent;

        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        audio.play();
    } catch (error) {
        console.error('Erro ao gerar áudio:', error);
        alert('Erro ao gerar o áudio com a API do Google Cloud.');
    }
}

// Função para realizar a tradução via API do Google Translate
function translateChunks(chunks) {
    const googleTranslateApiKey = chave_api; 
    const targetLang = 'pt';

    chunks.forEach((chunk, index) => {
        let url = `https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`;
        let data = {
            q: chunk,
            target: targetLang,
            source: 'it'
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            let translatedText = result.data.translations[0].translatedText;
            let portugueseCell = document.getElementById(`portuguese-chunk-${index}`);
            portugueseCell.innerHTML += `<p>${translatedText}</p>`;
        })
        .catch(error => console.error('Erro ao traduzir:', error));
    });
}

// Função para gerar flashcards
function generateFlashcards() {
    const flashcardsContainer = document.getElementById('flashcards-container');
    flashcardsContainer.innerHTML = ''; // Limpa os flashcards anteriores

    highlightedWords.forEach(wordObj => {
        const card = document.createElement('div');
        card.classList.add('flashcard');

        const innerCard = document.createElement('div');
        innerCard.classList.add('flashcard-inner');

        const front = document.createElement('div');
        front.classList.add('flashcard-front');
        front.textContent = wordObj.word;

        const back = document.createElement('div');
        back.classList.add('flashcard-back');
        back.textContent = wordObj.comment;

        innerCard.appendChild(front);
        innerCard.appendChild(back);
        card.appendChild(innerCard);

        card.addEventListener('click', function () {
            card.classList.toggle('is-flipped');
        });

        flashcardsContainer.appendChild(card);
    });
}

// Função para limpar flashcards
function clearFlashcards() {
    document.getElementById('flashcards-container').innerHTML = ''; // Limpa os flashcards
}

// Função para gerar o quiz de ditado
function generateQuiz() {
    const dictationQuantityInput = document.getElementById("dictationQuantity");
    let quantity = parseInt(dictationQuantityInput.value, 10);

    // Validar o valor de quantidade
    if (!quantity || quantity <= 0 || quantity > highlightedWords.length) {
        alert("Quantidade inválida para o ditado.");
        return;
    }

    shuffleArray(highlightedWords); // Embaralha as palavras
    quizWords = highlightedWords.slice(0, quantity); // Seleciona a quantidade especificada
    const quizDiv = document.getElementById('quiz');
    quizDiv.innerHTML = ''; // Limpa o quiz anterior
    quizDiv.classList.add('quiz-container');

    quizWords.forEach((wordObj, index) => {
        const quizItem = document.createElement('div');
        quizItem.classList.add('quiz-item');
        quizItem.innerHTML = `
            <button onclick="playAudioWithGoogleCloudForDictation('${wordObj.word}')">🔊</button>
            <input type="text" id="answer-${index}" class="answer-input">
        `;
        quizDiv.appendChild(quizItem);
    });

    const scoreButton = document.createElement('button');
    scoreButton.textContent = "Resultado";
    scoreButton.id = 'checkScore';
    quizDiv.appendChild(scoreButton);

    document.getElementById('checkScore').addEventListener('click', checkScore);
}

// Função para embaralhar as palavras do ditado
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Função para gerar o áudio de cada palavra no ditado
async function playAudioWithGoogleCloudForDictation(word) {
    const googleCloudApiKey = chave_api;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey}`;

    const requestBody = {
        input: { text: word },
        voice: { languageCode: "it-IT", ssmlGender: "FEMALE" },
        audioConfig: { audioEncoding: "MP3" }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        const audioContent = data.audioContent;

        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        audio.play();
    } catch (error) {
        console.error('Erro ao gerar áudio para o ditado:', error);
    }
}

// Verificar a pontuação no ditado
function checkScore() {
    quizWords.forEach((wordObj, index) => {
        const answer = document.getElementById(`answer-${index}`).value.trim().toLowerCase();
        const correctWord = wordObj.word.toLowerCase();

        const quizItem = document.getElementById(`answer-${index}`).parentElement;
        if (answer === correctWord) {
            quizItem.className = 'correct-answer';
            quizItem.innerHTML = `
                <button onclick="playAudioWithGoogleCloudForDictation('${wordObj.word}')">🔊</button>
                <p>${wordObj.word}</p>
            `;
        } else {
            quizItem.className = 'wrong-answer';
            quizItem.innerHTML = `
                <button onclick="playAudioWithGoogleCloudForDictation('${wordObj.word}')">🔊</button>
                <p>${answer}</p> <span class="correct-word">${wordObj.word}</span>
            `;
        }
    });

    document.getElementById('clearDictation').style.display = 'inline';
    document.getElementById('newDictation').style.display = 'inline';
}

// Função para limpar o ditado
function clearDictation() {
    document.getElementById('quiz').innerHTML = ''; // Limpa o quiz
    document.getElementById('scoreResult').innerHTML = ''; // Limpa o resultado
    this.style.display = 'none'; // Esconde o botão de limpar
    document.getElementById('newDictation').style.display = 'none'; // Esconde o botão de novo ditado
}

// Função para validar a quantidade inserida e habilitar/desabilitar o botão de ditado
function validateDictationQuantity() {
    const dictationQuantityInput = document.getElementById("dictationQuantity");
    const dictationSlider = document.getElementById("dictationSlider");
    const startDictationButton = document.getElementById('startDictation');

    let quantity = parseInt(dictationQuantityInput.value, 10);
    let maxQuantity = parseInt(dictationQuantityInput.max, 10);

    if (quantity > 0 && quantity <= maxQuantity) {
        startDictationButton.disabled = false;
    } else {
        startDictationButton.disabled = true;
    }
}

// Event listeners para sincronizar os inputs e validar
document.getElementById("dictationQuantity").addEventListener("input", function() {
    const quantity = this.value;
    const dictationSlider = document.getElementById("dictationSlider");
    dictationSlider.value = quantity;
    validateDictationQuantity();
});

document.getElementById("dictationSlider").addEventListener("input", function() {
    const quantity = this.value;
    const dictationQuantityInput = document.getElementById("dictationQuantity");
    dictationQuantityInput.value = quantity;
    validateDictationQuantity();
});

// Funções para o Exercício de Palavras
function generateWordExercise() {
    const wordQuantityInput = document.getElementById("wordQuantity");
    let quantity = parseInt(wordQuantityInput.value, 10);

    // Validar a quantidade
    if (!quantity || quantity <= 0 || quantity > highlightedWords.length) {
        alert("Quantidade inválida para o exercício de palavras.");
        return;
    }

    shuffleArray(highlightedWords); // Embaralha as palavras
    let selectedWords = highlightedWords.slice(0, quantity);

    const wordQuizDiv = document.getElementById('wordQuiz');
    wordQuizDiv.innerHTML = '';
    wordQuizDiv.classList.add('word-quiz-container');

    selectedWords.forEach((wordObj, index) => {
        let letters = wordObj.word.split('');
        // Embaralhar as letras da palavra
        letters = shuffleLetters(letters);

        const quizItem = document.createElement('div');
        quizItem.classList.add('word-quiz-item');
        quizItem.innerHTML = `
            <p>Letras embaralhadas: ${letters.join(' ')}</p>
            <input type="text" id="word-answer-${index}" class="answer-input">
        `;
        wordQuizDiv.appendChild(quizItem);

        // Armazena a resposta correta
        quizItem.dataset.correctAnswer = wordObj.word;
    });

    // Adiciona botão para verificar as respostas
    const checkButton = document.createElement('button');
    checkButton.textContent = "Verificar Respostas";
    checkButton.addEventListener('click', checkWordExerciseAnswers);
    wordQuizDiv.appendChild(checkButton);

    // Exibe botões de limpar e novo exercício
    document.getElementById('clearWord').style.display = 'inline';
    document.getElementById('newWord').style.display = 'inline';
}

function checkWordExerciseAnswers() {
    const wordQuizItems = document.querySelectorAll('.word-quiz-item');
    wordQuizItems.forEach((item, index) => {
        const userAnswer = document.getElementById(`word-answer-${index}`).value.trim().toLowerCase();
        const correctAnswer = item.dataset.correctAnswer.toLowerCase();

        if (userAnswer === correctAnswer) {
            item.classList.add('correct-answer');
            item.innerHTML += `<p class="feedback">Correto!</p>`;
        } else {
            item.classList.add('wrong-answer');
            item.innerHTML += `<p class="feedback">Incorreto! A resposta correta é: <strong>${item.dataset.correctAnswer}</strong></p>`;
        }
    });
}

function clearWordQuiz() {
    document.getElementById('wordQuiz').innerHTML = '';
    this.style.display = 'none';
    document.getElementById('newWord').style.display = 'none';
}

// Validar quantidade e habilitar botão
function validateWordQuantity() {
    const wordQuantityInput = document.getElementById("wordQuantity");
    const wordSlider = document.getElementById("wordSlider");
    const startWordButton = document.getElementById('startWordExercise');

    let quantity = parseInt(wordQuantityInput.value, 10);
    let maxQuantity = parseInt(wordQuantityInput.max, 10);

    if (quantity > 0 && quantity <= maxQuantity) {
        startWordButton.disabled = false;
    } else {
        startWordButton.disabled = true;
    }
}

// Event listeners para sincronizar os inputs
document.getElementById("wordQuantity").addEventListener("input", function() {
    const quantity = this.value;
    const wordSlider = document.getElementById("wordSlider");
    wordSlider.value = quantity;
    validateWordQuantity();
});

document.getElementById("wordSlider").addEventListener("input", function() {
    const quantity = this.value;
    const wordQuantityInput = document.getElementById("wordQuantity");
    wordQuantityInput.value = quantity;
    validateWordQuantity();
});

// Função para tornar os chunks selecionáveis sem tocar o áudio
function makeChunksSelectable() {
    chunks.forEach((chunk, index) => {
        const chunkElement = document.getElementById(`chunk-${index}`);
        chunkElement.style.cursor = 'pointer';
        chunkElement.addEventListener('click', function(event) {
            // Verifica se há texto selecionado
            if (window.getSelection().toString().length === 0) {
                // Não faz nada ao clicar no chunk
            }
        });
    });
}

// Funções para a Prática de Pronúncia
function generatePronunciationQuiz() {
    const pronunciationQuantityInput = document.getElementById("pronunciationQuantity");
    let quantity = parseInt(pronunciationQuantityInput.value, 10);

    if (!quantity || quantity <= 0 || quantity > highlightedWords.length) {
        alert("Quantidade inválida para o exercício de pronúncia.");
        return;
    }

    shuffleArray(highlightedWords); // Embaralha as palavras
    pronunciationWords = highlightedWords.slice(0, quantity);

    const pronunciationQuizDiv = document.getElementById('pronunciationQuiz');
    pronunciationQuizDiv.innerHTML = ''; // Limpa o quiz anterior
    pronunciationQuizDiv.classList.add('quiz-container');

    pronunciationWords.forEach((wordObj, index) => {
        const quizItem = document.createElement('div');
        quizItem.classList.add('quiz-item');
        quizItem.innerHTML = `
            <p>${wordObj.word}</p>
            <button onclick="playAudioWithGoogleCloudForDictation('${wordObj.word}')">🔊</button>
            <button id="recordButton-${index}" onclick="startRecognition(${index})">Gravar</button>
            <div id="pronunciationFeedback-${index}"></div>
        `;
        pronunciationQuizDiv.appendChild(quizItem);
    });

    // Exibe botões de limpar e novo exercício
    document.getElementById('clearPronunciation').style.display = 'inline';
    document.getElementById('newPronunciation').style.display = 'inline';
}

function startRecognition(index) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Este navegador não suporta reconhecimento de voz. Por favor, use o Google Chrome.");
        return;
    }

    const wordObj = pronunciationWords[index];
    const expectedText = wordObj.word.toLowerCase();

    // Cria uma nova instância de reconhecimento de voz
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'it-IT'; // Define o idioma para italiano

    recognition.start();
    document.getElementById(`recordButton-${index}`).disabled = true;

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        recognition.stop();
        document.getElementById(`recordButton-${index}`).disabled = false;

        // Comparar o texto reconhecido com o esperado
        if (transcript === expectedText) {
            document.getElementById(`pronunciationFeedback-${index}`).innerHTML = `<p class="feedback correct-answer">Correto! Você disse: "${transcript}"</p>`;
        } else {
            document.getElementById(`pronunciationFeedback-${index}`).innerHTML = `<p class="feedback wrong-answer">Incorreto. Você disse: "${transcript}". O correto é: "${expectedText}"</p>`;
        }
    };

    recognition.onerror = function(event) {
        recognition.stop();
        document.getElementById(`recordButton-${index}`).disabled = false;
        alert('Erro no reconhecimento de voz: ' + event.error);
    };
}

function clearPronunciationQuiz() {
    document.getElementById('pronunciationQuiz').innerHTML = '';
    this.style.display = 'none';
    document.getElementById('newPronunciation').style.display = 'none';
}

// Validar quantidade e habilitar botão
function validatePronunciationQuantity() {
    const pronunciationQuantityInput = document.getElementById("pronunciationQuantity");
    const pronunciationSlider = document.getElementById("pronunciationSlider");
    const startPronunciationButton = document.getElementById('startPronunciation');

    let quantity = parseInt(pronunciationQuantityInput.value, 10);
    let maxQuantity = parseInt(pronunciationQuantityInput.max, 10);

    if (quantity > 0 && quantity <= maxQuantity) {
        startPronunciationButton.disabled = false;
    } else {
        startPronunciationButton.disabled = true;
    }
}

// Event listeners para sincronizar os inputs
document.getElementById("pronunciationQuantity").addEventListener("input", function() {
    const quantity = this.value;
    const pronunciationSlider = document.getElementById("pronunciationSlider");
    pronunciationSlider.value = quantity;
    validatePronunciationQuantity();
});

document.getElementById("pronunciationSlider").addEventListener("input", function() {
    const quantity = this.value;
    const pronunciationQuantityInput = document.getElementById("pronunciationQuantity");
    pronunciationQuantityInput.value = quantity;
    validatePronunciationQuantity();
});

// Função auxiliar para embaralhar as letras de uma palavra
function shuffleLetters(array) {
    for (let i = array.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

