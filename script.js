const createElement = (tagName, className) => {
    const element = document.createElement(tagName);
    element.className = className;
    return element;
};

const createModal = (overlayClass, modalClass, titleClass, titleText, titleId) => {
    const overlay = createElement("div", `modal-overlay ${overlayClass}`);
    const dialog = createElement("section", `modal-dialog ${modalClass}`);
    const title = createElement("h1", titleClass);

    title.textContent = titleText;
    title.id = titleId;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.append(title);
    overlay.append(dialog);

    return { overlay, dialog };
};

const openModal = (overlay, focusTarget) => {
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    focusTarget.focus();
};

const closeModal = (overlay, focusTarget) => {
    const wasOpen = !overlay.hidden;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");

    if (wasOpen && focusTarget) {
        focusTarget.focus();
    }
};

const animals = [
    { name: "Кот в шапке лягушки", image: "assets/me6.jpeg" },
    { name: "Лис", image: "assets/fox.jpg" },
    { name: "Белка", image: "assets/me.png" },
    { name: "Единорог", image: "assets/me4.jpeg" },
    { name: "Утёнок", image: "assets/me3.jpeg" },
    { name: "Баран", image: "assets/baran.jpg" },
    { name: "Глупый кот", image: "assets/cat.png" },
    { name: "Корова", image: "assets/me2.png" },
];

const app = createElement("main", "game");
const header = createElement("header", "game-header");
const gameTitle = createElement("h1", "game-title");
const stats = createElement("div", "game-stats");
const movesCounter = createElement("span", "game-stat");
const pairsCounter = createElement("span", "game-stat");
const headerActions = createElement("div", "header-actions");
const newGameButton = createElement("button", "header-button");
const leaderboardButton = createElement("button", "header-button");
const board = createElement("section", "board");

const victory = createModal("victory-overlay", "victory-modal", "victory-title", "Победа!", "victory-title");
const victoryOverlay = victory.overlay;
const victoryModal = victory.dialog;
const victoryMessage = createElement("p", "victory-message");
const victoryMoves = createElement("p", "victory-moves");
const victoryActions = createElement("div", "victory-actions");
const victoryNewGameButton = createElement("button", "header-button");
const victoryCloseButton = createElement("button", "header-button");

const leaderboard = createModal("leaderboard-overlay", "leaderboard-modal", "leaderboard-title", "Таблица лидеров", "leaderboard-title");
const leaderboardOverlay = leaderboard.overlay;
const leaderboardModal = leaderboard.dialog;
const leaderboardContent = createElement("div", "leaderboard-content");
const leaderboardCloseButton = createElement("button", "header-button");
const storageErrorMessage = createElement("p", "storage-error");

let firstCard = null;
let isLocked = false;
let mismatchTimeout = null;
let moves = 0;
let foundPairs = 0;
let isGameFinished = false;
const leaderboardStorageKey = "memory-game-leaderboard";

movesCounter.setAttribute("aria-live", "polite");
pairsCounter.setAttribute("aria-live", "polite");
gameTitle.textContent = "Мемо";
newGameButton.type = "button";
newGameButton.textContent = "Новая игра";
leaderboardButton.type = "button";
leaderboardButton.textContent = "Таблица лидеров";
leaderboardButton.setAttribute("aria-label", "Таблица лидеров");

victoryMessage.textContent = "Ты нашёл все 8 пар!";
victoryNewGameButton.type = "button";
victoryNewGameButton.textContent = "Новая игра";
victoryCloseButton.type = "button";
victoryCloseButton.textContent = "Закрыть";

leaderboardCloseButton.type = "button";
leaderboardCloseButton.textContent = "Закрыть";
storageErrorMessage.setAttribute("role", "status");

const createCard = (animal, position) => {
    const card = createElement("button", "card");
    const inner = createElement("span", "card-inner");
    const back = createElement("span", "card-back");
    const face = createElement("span", "card-face");
    const image = createElement("img", "card-image");

    card.type = "button";
    card.dataset.pair = animal.id;
    card.setAttribute("aria-label", `Карточка ${position + 1}, закрыта`);
    card.setAttribute("aria-pressed", "false");
    back.setAttribute("aria-hidden", "true");
    face.setAttribute("aria-hidden", "true");

    image.src = animal.image;
    image.alt = "";
    image.draggable = false;

    face.append(image);
    inner.append(back, face);
    card.append(inner);
    return card;
};

const shuffle = (cards) => {
    for (let index = cards.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
    }

    return cards;
};

const getLeaderboard = () => {
    let storedResults;

    try {
        storedResults = localStorage.getItem(leaderboardStorageKey);
    } catch (error) {
        console.error("Не удалось прочитать таблицу лидеров из localStorage.", error);
        return null;
    }

    if (storedResults === null) {
        return [];
    }

    try {
        const results = JSON.parse(storedResults);

        if (!Array.isArray(results) || !results.every((result) => (
            Number.isInteger(result.moves)
            && result.moves > 0
            && Number.isFinite(result.completedAt)
        ))) {
            console.error("В localStorage сохранён некорректный формат таблицы лидеров.");
            return [];
        }

        return results
            .sort((first, second) => first.moves - second.moves || first.completedAt - second.completedAt)
            .slice(0, 10);
    } catch (error) {
        console.error("Не удалось обработать данные таблицы лидеров.", error);
        return [];
    }
};

const saveLeaderboardResult = () => {
    const results = getLeaderboard();

    if (results === null) {
        storageErrorMessage.textContent = "Не удалось сохранить результат в таблице лидеров.";
        return false;
    }

    results.push({ moves, completedAt: Date.now() });
    results.sort((first, second) => first.moves - second.moves || first.completedAt - second.completedAt);

    try {
        localStorage.setItem(leaderboardStorageKey, JSON.stringify(results.slice(0, 10)));
        storageErrorMessage.textContent = "";
        return true;
    } catch (error) {
        console.error("Не удалось сохранить результат в таблице лидеров.", error);
        storageErrorMessage.textContent = "Не удалось сохранить результат в таблице лидеров.";
        return false;
    }
};

const formatResultDate = (timestamp) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString();

    return `${day}.${month}.${year}`;
};

const renderLeaderboard = () => {
    leaderboardContent.replaceChildren();
    const results = getLeaderboard();

    if (results === null) {
        const error = createElement("p", "leaderboard-empty");
        error.textContent = "Не удалось загрузить результаты из браузера.";
        leaderboardContent.append(error);
        return;
    }

    if (results.length === 0) {
        const emptyMessage = createElement("p", "leaderboard-empty");
        emptyMessage.textContent = "Пока нет результатов";
        leaderboardContent.append(emptyMessage);
        return;
    }

    const table = createElement("table", "leaderboard-table");
    const head = createElement("thead", "");
    const headerRow = createElement("tr", "");

    for (const label of ["Место", "Ходы", "Дата"]) {
        const heading = createElement("th", "");
        heading.scope = "col";
        heading.textContent = label;
        headerRow.append(heading);
    }

    head.append(headerRow);
    const body = createElement("tbody", "");

    results.forEach((result, index) => {
        const row = createElement("tr", "");

        for (const value of [(index + 1).toString(), result.moves.toString(), formatResultDate(result.completedAt)]) {
            const cell = createElement("td", "");
            cell.textContent = value;
            row.append(cell);
        }

        body.append(row);
    });

    table.append(head, body);
    leaderboardContent.append(table);
};

const openLeaderboard = () => {
    renderLeaderboard();
    openModal(leaderboardOverlay, leaderboardCloseButton);
};

const closeLeaderboard = () => {
    closeModal(leaderboardOverlay, leaderboardButton);
};

board.setAttribute("aria-label", "Игровое поле из 16 карточек");

const startNewGame = () => {
    if (mismatchTimeout !== null) {
        window.clearTimeout(mismatchTimeout);
        mismatchTimeout = null;
    }

    firstCard = null;
    isLocked = false;
    moves = 0;
    foundPairs = 0;
    isGameFinished = false;
    closeModal(victoryOverlay, newGameButton);
    movesCounter.textContent = `Ходы: ${moves}`;
    pairsCounter.textContent = `Пары: ${foundPairs} / ${animals.length}`;
    const cards = shuffle(animals.flatMap((animal, id) => [
        { ...animal, id },
        { ...animal, id },
    ]));
    board.replaceChildren(...cards.map(createCard));
};

stats.append(movesCounter, pairsCounter);
headerActions.append(newGameButton, leaderboardButton);
header.append(gameTitle, stats, headerActions);
victoryModal.append(victoryMessage, victoryMoves, victoryActions);
victoryActions.append(victoryNewGameButton, victoryCloseButton);
victoryOverlay.append(victoryModal);
leaderboardModal.append(leaderboardContent, leaderboardCloseButton);
leaderboardOverlay.append(leaderboardModal);
app.append(header, board);
document.body.append(app, victoryOverlay, leaderboardOverlay);

board.addEventListener("click", (event) => {
    const card = event.target.closest(".card");

    if (!card || !board.contains(card) || isLocked || isGameFinished || card.classList.contains("is-open") || card.classList.contains("is-matched")) {
        return;
    }

    card.classList.add("is-open");
    card.setAttribute("aria-pressed", "true");
    const animal = animals[Number(card.dataset.pair)];
    card.setAttribute("aria-label", animal.name);

    if (!firstCard) {
        firstCard = card;
        return;
    }

    moves += 1;
    movesCounter.textContent = `Ходы: ${moves}`;

    if (firstCard.dataset.pair === card.dataset.pair) {
        firstCard.classList.add("is-matched");
        card.classList.add("is-matched");
        foundPairs += 1;
        pairsCounter.textContent = `Пары: ${foundPairs} / ${animals.length}`;
        firstCard = null;

        if (foundPairs === animals.length) {
            isGameFinished = true;
            victoryMoves.textContent = `Число ходов: ${moves}`;
            saveLeaderboardResult();
            victoryModal.insertBefore(storageErrorMessage, victoryActions);
            openModal(victoryOverlay, victoryNewGameButton);
        }

        return;
    }

    isLocked = true;
    const previousCard = firstCard;
    firstCard = null;

    mismatchTimeout = window.setTimeout(() => {
        for (const openCard of [previousCard, card]) {
            openCard.classList.remove("is-open");
            openCard.setAttribute("aria-pressed", "false");
            openCard.setAttribute("aria-label", "Закрытая карточка");
        }

        isLocked = false;
        mismatchTimeout = null;
    }, 900);
});

newGameButton.addEventListener("click", startNewGame);
victoryNewGameButton.addEventListener("click", startNewGame);
leaderboardButton.addEventListener("click", openLeaderboard);
leaderboardCloseButton.addEventListener("click", closeLeaderboard);
victoryCloseButton.addEventListener("click", () => {
    closeModal(victoryOverlay, newGameButton);
});

startNewGame();
