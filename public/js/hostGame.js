var socket = io();
var params = jQuery.deparam(window.location.search); //Gets the id from url
var timer;
var time = 20;
var challengeData = {id: 0};
var killingFloorPlayers;
var allPlayers;
var wait;
var questionNum = 1;
let leftPos = {
    2: [4, 0],
    3: [6, 2, 0],
    4: [7, 3, 2, 0],
    5: [8, 3, 2, 1, 0],
    6: [9, 4, 3, 2, 1, 0],
    7: [9, 4, 3, 2, 1, 0, 0],
    8: [9, 4, 3, 2, 1, 1, 0, 0],
    9: [9, 4, 3, 2, 2, 1, 1, 0, 0],
    10: [9, 4, 3, 2, 2, 1, 1, 0, 0, 0]
}
const FULL_DASH_ARRAY = 283;
const TIME_LIMIT = 10;

let breakoutData;
let timePassed = -1;
let timeLeft = TIME_LIMIT;
let timerInterval = null;
let breakoutCorrects;
let aliveIdx;
let bestDeadIdx;
let maxStep;
var canvas = document.getElementById('whiteboard');
let context = canvas.getContext('2d');

let current = {
    color: 'black'
};
let drawing = false;
//When host connects to server
socket.on('connect', function () {

    //Tell server that it is host connection from game view
    socket.emit('host-join-game', params);
});

socket.on("removePlayersFromBreakout", function(names) {
    for (let name of names) {
        if (breakoutData[name].isAlive) {
            aliveIdx = bestDeadIdx;
            breakoutData[aliveIdx].isAlive = true;
            bestDeadIdx = -1;
            maxStep = 0;
            breakoutData.forEach((player, idx) => {
                if (!player.isAlive) {
                    breakoutData[idx].step += playersCorrects[player.name].filter(x => x).length;
                    if (breakoutData[idx].step > maxStep) {
                        bestDeadIdx = idx;
                        maxStep = breakoutData[idx].step;
                    }
                }
            });
        }
        delete breakoutData[name];
    }

    for (let name of names) {
        document.getElementById(`${name}Char`).remove();
    }

    if (timePassed != -1) {
        startTimer();
    }
});

socket.on("removePlayersNotFromBreakout", function(names) {
    document.getElementById("playersNameValue").innerHTML = [...document.getElementById("playersNameValue").children].filter(elem => !names.includes(elem.firstElementChild.innerText)).map(elem => elem.outerHTML).join("");
    allPlayers = allPlayers.filter(p => !(names.includes(p)));
});

socket.on("allPlayers", function(players) {
    allPlayers = players;
    document.getElementById("playersNameValue").innerHTML = allPlayers.map(function(name) {
        return `<li><div id=${name}Game style="text-align: center;">${name}</div><div id="${name}GameValue" style="text-align: center;">0</div></li>`;
    }).join("");
});

socket.on("playerDisconnect", function(name) {
    clearInterval(timer);
    clearInterval(timerInterval);
    let elem = document.getElementById("disconnectedPlayers");
    if (elem.innerText == "") {
        elem.innerText = name;
    } else {
        elem.innerText += `, ${name}`;
    }
    document.getElementById("id01").style.display = "grid";
});

function killDisconnectedPlayer() {
    document.getElementById("id01").style.display = "none";
    socket.emit("hostKillDisconnectedPlayers");
    document.getElementById("disconnectedPlayers").innerText = "";
}

socket.on("hostContinue", function() {
    document.getElementById()
});

socket.on('noGameFound', function () {
    window.location.href = '../../'; //Redirect user to 'join game' page
});

socket.on('gameQuestions', function (data) {
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`answer${i}`).style.opacity = 1;
    }
    document.getElementById('question').innerText = data.q1;
    document.getElementById('answer1').innerText = data.a1;
    document.getElementById('answer2').innerText = data.a2;
    document.getElementById('answer3').innerText = data.a3;
    document.getElementById('answer4').innerText = data.a4;
    document.getElementById("questionNum").innerText = `Question ${questionNum}`;
    document.getElementById('playersAnswered').innerText = "Players Answered 0 / " + data.playersInGame;
    updateTimer(20);
});

socket.on('updatePlayersAnswered', function (data) {
    document.getElementById('playersAnswered').innerHTML = `Players Answered ${data.playersAnswered} / ${data.playersInGame}`;
});

socket.on("interrogationChangeButton", function() {
    document.getElementById("killingFButton").style.display = "none";
    document.getElementById("nextQButton").style.display = "block";
});

socket.on('questionOverHost', function (correct, isNextQuestion) {
    clearInterval(timer);
    questionNum++;
    //Hide elements on page
    document.getElementById('playersAnswered').style.display = "none";
    document.getElementById('timerText').style.display = "none";

    //Shows user correct answer with effects on elements
    for (let i = 1; i <= 4; i++) {
        if (i != correct) {
            document.getElementById(`answer${i}`).style.opacity = 0.2;
        } else {
            document.getElementById(`answer${i}`).innerText = "✅ " + document.getElementById(`answer${i}`).innerText;
        }
    }

    if (questionNum == 16) {
        document.getElementById("nextQButton").innerText = "Breakout Floor";
    }

    document.getElementById(`${isNextQuestion || questionNum == 16 ? "nextQButton" : "killingFButton"}`).style.display = "block";
});

socket.on("newScoreHost", function(name, score) {
    document.getElementById(`${name}GameValue`).innerText = score;
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nextQuestion() {
    if (challengeData.id) {
        document.getElementById(`challenge${challengeData.id}`).style.display = "none";
        document.getElementById("killingFloor").style.display = "none";
    }
    document.getElementById("interrogationFloor").style.display = "block";
    document.getElementById("questionNum").innerText = `Question ${questionNum}`;
    document.getElementById("questionContext").style.display = "block";
    document.getElementById("killingFButton").style.display = "none";
    document.getElementById('nextQButton').style.display = "none";

    document.getElementById("questionData").style.display = "none";

    socket.emit('nextQuestion');
    document.getElementById('playersAnswered').style.display = "block";
    document.getElementById('timerText').style.display = "block";
    document.getElementById('num').innerHTML = " 20";
    document.getElementById("questionData").style.display = "block";
    //Tell server to start new question
}

function killingFloor() {
    document.getElementById("killingFButton").style.display = "none";

    document.getElementById("questionData").style.display = "none";
    document.getElementById("questionContext").style.display = "none";

    socket.emit('killingFloor'); //Tell server to start new question
}

function updateTimer(myTime) {
    time = myTime;
    timer = setInterval(function () {
        time -= 1;
        document.getElementById('num').textContent = " " + time;
        if (time == 0) {
            clearInterval(timer);
            socket.emit('timeUp');
        }
    }, 1000);
}

function killingUpdateTimer(myTime) {
    time = myTime;
    timer = setInterval(function () {
        time--;
        document.getElementById('killingNum').textContent = " " + time;
        if (time == 0) {
            clearInterval(timer);
            document.getElementById("challengeContext").style.display = "none";
            socket.emit('killingTimeUp');
            if (challengeData.id != 12) {
                alert("Time is up!!!");
                document.getElementById("nextQButton").style.display = "block";
            }
        }
    }, 1000);
}

socket.on("showInstruction", function(ins, src){
    document.getElementById("details").innerText = ins;
    document.getElementById("screenshot").src = src;
});

socket.on("displayInstruction", function() {
    document.getElementById("instruction").style.display = "block";
});

socket.on("closeInstruction", function() {
    document.getElementById("instruction").innerText = "";
    document.getElementById("screenshot").src = "";
    document.getElementById("instruction").style.display = "none";
});

socket.on('nextKillingFloor', function (data, players) {
    challengeData = data;
    killingFloorPlayers = players;
    document.getElementById("interrogationFloor").style.display = "none";
    if (!([3, 4, 7, 8, 10, 11].includes(challengeData.id))) {
        document.getElementById("startKillingButton").style.display = "block";
    } else if (challengeData.id == 3) {
        let nonKillingFloorPlayers = []
        for (let p of allPlayers) {
            if (!(killingFloorPlayers.includes(p))) {
                nonKillingFloorPlayers.push(p);
            }
        }
        wait = nonKillingFloorPlayers.length;
        document.getElementById("killingFloorWait").style.height = 30 * wait;
        document.getElementById("killingFloorWait").value = nonKillingFloorPlayers.join("\n");
        document.getElementById("waitList").style.display = "block";
    } else if ([4, 7, 8, 11].includes(challengeData.id)) {
        wait = killingFloorPlayers.length;
        document.getElementById("killingFloorWait").style.height = 30 * wait;
        document.getElementById("killingFloorWait").value = killingFloorPlayers.join("\n");
        document.getElementById("waitList").style.display = "block";
    }
    document.getElementById("killingTimerText").style.display = "none";
    document.getElementById('questionContext').style.display = "none";
    document.getElementById("questionData").style.display = "none";

    document.getElementById('challengeName').innerText = `${data.name}`;
    document.getElementById('killingNum').textContent = " 20";
    document.getElementById("challengeContext").style.display = "block";
    document.getElementById("challengeNameValue").innerHTML = killingFloorPlayers.map(function(name) {
        return `<li><div id="${name}Challenge" style="text-align: center;">${name}</div><div id="${name}ChallengeValue" style="text-align: center;">Alive</div></li>`;
    }).join("");

    document.getElementById("killingFloor").style.display = "block";
    if (challengeData.id != 10) {
        document.getElementById("killingFloorPlayers").style.display = "block";
    } else {
        document.getElementById("nextQButton").style.display = "block";
    }
    
    document.getElementById(`challenge${data.id}`).style.display = "block";
});

socket.on("beforeStartKillingSubmit", async function(name) {
    wait--;
    let waitList = document.getElementById("killingFloorWait").value.split("\n");
    for (let i = 0; i < waitList.length; i++) {
        if (waitList[i] == name) {
            waitList[i] = "✅ " + name;
            break;
        }
    }

    document.getElementById("killingFloorWait").value =  waitList.join("\n");
    if (wait == 0) {
        await(sleep(1000));
        document.getElementById("waitList").style.display = "none";
        document.getElementById("killingFloorWait").value = "";
        document.getElementById("startKillingButton").style.display = "block";
    }
});

function handleStartKillingClick() {
    document.getElementById("startKillingButton").style.display = "none";
    socket.emit("startKilling");

    if (challengeData.id == 6) {
        document.getElementById("spellExample").style.display = "none";
        document.getElementById("spellReal").style.display = "block";
    } else if (challengeData.id == 8) {
        document.getElementById("skewResult").style.display = "none";
        document.getElementById("skew").style.display = "block";
    } else if (challengeData.id == 2) {
        killingFloorPlayers.forEach(name => {
            document.getElementById(`${name}ChallengeValue`).innerText = "0";
        });
    } else if (challengeData.id == 4) {
        document.getElementById("challenge4").firstElementChild.style.display = "none";
        document.getElementById("pwd").style.display = "block";
    } else if (challengeData.id == 11) {
        socket.emit("challenge11DisplayImpress");
    } else if (challengeData.id == 12) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById("whiteboard").style.cursor = "none";
        socket.emit("challenge12Start");
    }

    document.getElementById("killingTimerText").style.display = "block";
    killingUpdateTimer(20);
}

socket.on("setColor", function(hostColor) {
    current.color = hostColor;
});

socket.on("updateChallengeValues", function(data) {
    for (let { name, value } of data) {
        document.getElementById(`${name}ChallengeValue`).innerHTML = (challengeData.id == 2 && value == "Ghost") ? document.getElementById(`${name}ChallengeValue`).innerText + ` (${value})` : value;
    }
});

socket.on("challengeOverHost", function(challengeDeadPlayers) {
    clearInterval(timer);
    if (challengeData.id == 12) {
        document.getElementById("whiteboard").style.cursor = "default";
    }
    for (let player of allPlayers) {
        if (challengeDeadPlayers.includes(player)) {
            document.getElementById(`${player}Game`).innerText += " 💀"
        }
    }
    document.getElementById("challengeContext").style.display = "none";
    document.getElementById("nextQButton").style.display = "block";
});

socket.on("challengeOverHostDisconnect", function(names) {
    clearInterval(timer);
    document.getElementById("challengeContext").style.display = "none";
    document.getElementById("killingFloorWait").value = "";
    document.getElementById("waitList").style.display = "none";
    document.getElementById("startKillingButton").style.display = "none";
    document.getElementById(`challenge${challengeData.id}`).style.display = "none";
    document.getElementById("challengeNameValue").innerHTML = [...document.getElementById("challengeNameValue").children].filter(elem => (!(names.includes(elem.firstElementChild.innerText)))).map(elem => elem.outerHTML).join("");
    document.getElementById("nextQButton").style.display = "block";
});

socket.on("continueInterrogation", function() {
    updateTimer(time);
});

socket.on("challengeThreeShowPoisons", function(poisons) {
    let skulls = document.getElementById("skull-wrapper").children;
    for (let i = 0; i < 8; i++) {
        if (poisons[i])  {
            skulls[i].style.visibility = "visible";
        }
    }
});

socket.on("challengeFourHint", function(password, hint) {
    let showHint = "";
    for (let i = 0; i < 4; i++) {
        if (hint == i + 1) {
            showHint += `${password[i]} `;
        } else {
            showHint += "_ ";
        }
    }
    document.getElementById("password").innerText = showHint;
    document.getElementById("guessList").style.display = "block";
});

socket.on("updateGuess", function(guess, name, isCorrect) {
    let guesses = document.getElementById("guesses");
    guesses.value = guesses.value + `\n${isCorrect ? "✅" : "❌" } ${guess} (${name})`;
});

socket.on("challengeFourPassword", function(password) {
    document.getElementById("password").innerText = `${password[0]} ${password[1]} ${password[2]} ${password[3]}`;
});

socket.on("challengeSevenShowAvenger", function(avenger, guess) {
    for (let child of document.getElementById("theAvengers").children) {
        if (child.lastElementChild.id != avenger)
            child.lastElementChild.style.opacity = 0.2;
        if (guess.includes(child.lastElementChild.id))
            child.firstElementChild.style.display = "block";
    }
});

socket.on("challengeEightShowHide", function(data) {
    document.getElementById("skew").style.display = "none";
    document.getElementById("skewResult").style.display="block";
    for (let { name, row, col } of data) {
        let elem = document.querySelector(`.hide.row-${row}.col-${col}`);
        elem.innerText = name;
        elem.style.left = `calc(${getComputedStyle(elem).left} + ${(6 - name.length) * 0.25}em)`;
    }
});

socket.on("challengeEightShowSkew", function(data) {
    for  (let sword of data) {
        let dir;
        let pos;
        if (sword <= 4) {
            dir = "left";
            pos = `row-${sword}`;
        } else if (sword <= 9) {
            dir = "top";
            pos = `col-${sword-4}`;
        } else if (sword <= 13) {
            dir = "right";
            pos = `row-${sword-9}`
        }
        document.querySelector(`.sword.sword-${dir}.sword-${pos}`).style.visibility = "visible";
        document.querySelector(`.sword.sword-${dir}.sword-${pos}`).classList.add(`sword-${dir}-move`);
    }
});

socket.on("challengeNineShowResults", async function(displayData, updateData) {
    document.getElementById("nextQButton").style.display = "none";
    document.getElementById("challengeNineExplain").style.display = "none";
    
    for (let { player, target, targetOpt } of displayData) {
        document.getElementById("challengeNinePlayer").innerText = player;
        document.getElementById("challengeNineTarget").innerText = target;
        document.getElementById("targetOption").lastElementChild.src = `../../media/challenge9_${targetOpt}.jpg`;
        document.getElementById("targetOption").firstElementChild.src = `../../media/challenge${targetOpt == "mask" ? "9_safe.jpg" : "3_skull.png"}`;
        document.getElementById("targetOption").firstElementChild.style.left = targetOpt == "mask" ? "-50px" : "0px";
        document.getElementById("targetOption").firstElementChild.style.width = targetOpt == "mask" ? "250px" : "150px";
        document.getElementById("challengeNineDisplay").style.display = "grid";
        await sleep(2000); 
        document.getElementById("targetOption").firstElementChild.classList.toggle("hidden");
        document.getElementById("targetOption").lastElementChild.classList.toggle("hidden");
        await sleep(2000);
        document.getElementById("challengeNineDisplay").style.display = "none";
        document.getElementById("targetOption").firstElementChild.classList.toggle("hidden");
        document.getElementById("targetOption").lastElementChild.classList.toggle("hidden");
        await sleep(500);
    }
    
    document.getElementById("challengeNineDisplay").style.display = "none";
    document.getElementById("nextQButton").style.display = "block";
    for (let { name, value } of updateData) {
        document.getElementById(`${name}ChallengeValue`).innerText = value;
    }
});

socket.on("challengeElevenDisplayImpress", function(impress){
    document.getElementById("whiteCards").innerHTML = impress.map(function(cur, idx) {
        return `<div><p>${idx + 1}. ${cur}</p><div class="name-vote"></div></div>`;
    }).join("");
});

socket.on("challengeElevenShowResults", function(data) {
    let i = 0;
    for (let child of document.getElementById("whiteCards").children) {
        let nameVote = child.lastElementChild;
        nameVote.innerText = `${data[i].name} | ${data[i].votes}`;
        nameVote.style.display = "block";
        i++;
    }
});

socket.on("breakoutFloorHost", function(data) {

    let totalPlayers = data.length;
    breakoutData = data;
    let topPos = [];

    for (let i = 0; i < totalPlayers; i++) {
        topPos.push(66 * i + (i + 1) * 15 + 0.5 * (860 - 66 * totalPlayers - 15 * totalPlayers - 15));
    }

    document.getElementById("charList").innerHTML = data.map(({ name, isAlive }, idx) => {
        if (isAlive) {
            aliveIdx = idx;
        }
        return `<div id="${name}Char" class="char" style="top: ${topPos[idx]}px">
                    <div class="char-name">${name}</div>
                    <img src="../../media/breakout_1.png" alt="Bear" class="char-bear" style="opacity: ${isAlive ? 1 : 0.3}; top: 20px">
                    <div class="right-wrong"></div>
                </div>`;
    }).join("");
    document.getElementById("interrogationFloor").style.display = "none";
    document.getElementById("killingFloor").style.display = "none";
    document.getElementById("breakoutFloor").style.display = "block";
    
});

function onTimesUp() {
    clearInterval(timerInterval);
    socket.emit("breakoutTimeup");
    for (let i = 1; i <= 3; i++) {
        if (breakoutCorrects.includes(i)) {
            document.getElementById(`breakoutAnswer${i}`).innerText += " ✅";
        } else {
            document.getElementById(`breakoutAnswer${i}`).style.opacity = 0.2;
        }
    }
    document.getElementById("breakoutTimer").style.display = "none";
}
  
function startTimer() {
    timeLeft = TIME_LIMIT;  
    timerInterval = setInterval(() => {
        timePassed = timePassed += 1;
        timeLeft = TIME_LIMIT - timePassed;
        document.getElementById("base-timer-label").innerHTML = timeLeft;
        setCircleDasharray();
    
        if (timeLeft === 0) {
            timePassed = -1;
            onTimesUp();
        }
    }, 1000);
}
  
function calculateTimeFraction() {
    const rawTimeFraction = timeLeft / TIME_LIMIT;
    return rawTimeFraction - (1 / TIME_LIMIT) * (1 - rawTimeFraction);
}
  
function setCircleDasharray() {
    const circleDasharray = `${(
        calculateTimeFraction() * FULL_DASH_ARRAY
    ).toFixed(0)} 283`;
    document
        .getElementById("base-timer-path-remaining")
        .setAttribute("stroke-dasharray", circleDasharray);
}

function nextBreakoutQuestion() {
    document.getElementById("nextBreakoutQButton").style.display = "none";
    socket.emit("nextBreakoutQuestion");
}

function nextBreakoutGuide(guide) {
    switch(guide) {
        case 1:
            breakoutData[0].step = leftPos[breakoutData.length][0];
            document.getElementById(`${breakoutData[0].name}Char`).style.transform = `translateX(${71 * leftPos[allPlayers.length][0] + 4}px)`;
            document.getElementById("nextBreakoutQButton").onclick = () => nextBreakoutGuide(2);
            break;
        case 2:
            for (let i = 1; i < allPlayers.length; i++) {
                breakoutData[i].step = leftPos[breakoutData.length][i];
                document.getElementById(`${breakoutData[i].name}Char`).style.transform = `translateX(${71 * leftPos[allPlayers.length][i] + 4}px)`;
                document.getElementById("nextBreakoutQButton").onclick = () => nextBreakoutQuestion();
            }
            break;
        default:
            break;
    }
}

socket.on("breakoutQuestionData", function(data) {
    document.getElementById("breakoutQuestion").innerText = data.question;
    document.getElementById("breakoutAnswer1").innerText = data.answers[0];
    document.getElementById("breakoutAnswer2").innerText = data.answers[1];
    document.getElementById("breakoutAnswer3").innerText = data.answers[2];
    breakoutCorrects = data.corrects;
    document.getElementById("breakoutAnswer1").style.opacity = 1;
    document.getElementById("breakoutAnswer2").style.opacity = 1;
    document.getElementById("breakoutAnswer3").style.opacity = 1;
    document.getElementById("breakoutTimer").style.display = "block";
    startTimer();
});

socket.on("breakoutMoveHost", async function(playersCorrects, breakoutQuesNum) {
    bestDeadIdx = -1;
    maxStep = 0;
    document.getElementById("breakoutQuestionData").style.display = "none";
    await(sleep(1500));
    console.log("remove breakoutquestiondata");
    for (let name in playersCorrects) {
        if (name == breakoutData[aliveIdx].name) {
            playersCorrects[name].pop();
        }
        document.getElementById(`${name}Char`).lastElementChild.innerText = playersCorrects[name].map(isTrue => isTrue ? "✅" : "❌").join(" ");
    }

    console.log("right wrong confirm");

    await(sleep(1500));
    for (let name in playersCorrects) {
        document.getElementById(`${name}Char`).lastElementChild.innerText = "";
    }
    
    if (playersCorrects[breakoutData[aliveIdx].name].filter(x => x).length > 0) {
        breakoutData[aliveIdx].step += playersCorrects[breakoutData[aliveIdx].name].filter(x => x).length;
        document.getElementById(`${breakoutData[aliveIdx].name}Char`).style.transform = `translateX(${71 * breakoutData[aliveIdx].step + 4}px)`;
        await(sleep(1500));
    }

    console.log("move first place player");
    
    if (breakoutData[aliveIdx].step >= 21) {
        document.getElementById(`${breakoutData[aliveIdx].name}Char`).style.display = "none";
        breakoutData.forEach((p, idx) => {
            if (idx != aliveIdx) {
                socket.emit("breakoutKillPlayer", breakoutData[idx].playerId, breakoutData[idx].score);
            }
        });
        for (let i = (breakoutQuesNum - 2) * 3; i < 21; i++) {
            document.getElementById("darkness").children[i].style.backgroundColor = "black";
            await(sleep(700));
        }
        socket.emit("gameOver", breakoutData[aliveIdx].playerId);
        document.getElementById("breakoutFloor").style.display = "none";
    } else {
        breakoutData.forEach((player, idx) => {
            if (!player.isAlive) {
                breakoutData[idx].step += playersCorrects[player.name].filter(x => x).length;
                if (breakoutData[idx].step > maxStep) {
                    bestDeadIdx = idx;
                    maxStep = breakoutData[idx].step;
                }
                document.getElementById(`${player.name}Char`).style.transform = `translateX(${71 * player.step + 4}px)`;
            }
        });
        await(sleep(1500));
        console.log("move the rest");
        if (breakoutData[bestDeadIdx].step >= breakoutData[aliveIdx].step) {
            breakoutData[aliveIdx].isAlive = false;
            document.getElementById(`${breakoutData[aliveIdx].name}Char`).children[1].style.opacity = 0.2;
            breakoutData[bestDeadIdx].isAlive = true;
            document.getElementById(`${breakoutData[bestDeadIdx].name}Char`).children[1].style.opacity = 1;
            for (let i = 0; i < breakoutData.length; i++) {
                if (i != bestDeadIdx && breakoutData[i].step == breakoutData[bestDeadIdx].step) {
                    breakoutData[i].step--;
                    document.getElementById(`${breakoutData[i].name}Char`).style.transform = `translateX(${71 * breakoutData[i].step + 4}px)`;
                }
            }
            socket.emit("swapLife", breakoutData[aliveIdx].playerId, breakoutData[bestDeadIdx].playerId)
            aliveIdx = bestDeadIdx;
            if (breakoutData[aliveIdx].step >= 21) {
                document.getElementById(`${breakoutData[aliveIdx].name}Char`).style.display = "none";
                breakoutData.forEach((p, idx) => {
                    if (idx != aliveIdx) {
                        socket.emit("breakoutKillPlayer", breakoutData[idx].playerId, breakoutData[idx].score);
                    }
                });
                for (let i = (breakoutQuesNum - 2) * 3; i < 21; i++) {
                    document.getElementById("darkness").children[i].style.backgroundColor = "black";
                    await(sleep(700));
                }
                socket.emit("gameOver", breakoutData[aliveIdx].playerId);
                document.getElementById("breakoutFloor").style.display = "none";
            }
        }
    
        await(sleep(1000));
        console.log("swap life if applicable");
        if (breakoutQuesNum >= 2) {
            document.getElementById("darkness").children[(breakoutQuesNum - 2) * 3].style.backgroundColor = "black";
            await(sleep(700));
            document.getElementById("darkness").children[(breakoutQuesNum - 2) * 3 + 1].style.backgroundColor = "black";
            await(sleep(700));
            document.getElementById("darkness").children[(breakoutQuesNum - 2) * 3 + 2].style.backgroundColor = "black";
        }
    
        for (let i = 0; i < breakoutData.length; i++) {
            if (2 + 3 * (breakoutQuesNum - 2) >= breakoutData[i].step) {
                breakoutData[i].isAlive = false;
                document.getElementById(`${breakoutData[i].name}Char`).style.display = "none";
                socket.emit("breakoutKillPlayer", breakoutData[i].playerId, breakoutData[i].score);
            }
        }
    }
    if (breakoutData.filter(p => p.isAlive == true).length == 0) {
        socket.emit("gameOver");
    } else {
        document.getElementById("nextBreakoutQButton").style.display = "block";
        document.getElementById("breakoutQuestionData").style.display = "block";
    }
});

socket.on("gameOverData", function(data) {
    breakoutData = data;
    document.body.style.backgroundColor = "#B0E0E6";
    document.getElementById("breakoutFloor").style.display = "none";
    document.getElementById("ranking").innerHTML = `<thead class="c-table__head"><tr class="c-table__head-row"><th class="c-table__head-cell u-text--center">Place</th><th class="c-table__head-cell">Player</th><th class="c-table__head-cell u-text--right">Score</th></tr></thead>` + breakoutData.map((p, idx) => {
        return `<tr class="c-table__row"><td class="c-table__cell c-table__cell--place u-text--center">${idx + 1}</td><td class="c-table__cell c-table__cell--name">${p.name} ${p.isAlive ? "😎" : "💀"}</td><td class="c-table__cell c-table__cell--score u-text--right">${p.score}</td></tr>`;
    }).join("");
    document.getElementById("gameOver").style.display = "block";
});

socket.on("breakoutReached", function() {
    document.getElementById("nextQButton").innerText = "Breakout Floor";
});

// Challenge 12 - Drawing
(function() { 
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
    
    //Touch support for mobile devices
    canvas.addEventListener('touchstart', onMouseDown, false);
    canvas.addEventListener('touchend', onMouseUp, false);
    canvas.addEventListener('touchcancel', onMouseUp, false);
    canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);
  
    socket.on('drawing', onDrawingEvent);
  
    window.addEventListener('resize', onResize, false);
    onResize();
    function drawLine(x0, y0, x1, y1, color, emit) {
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      context.closePath();
  
      if (!emit) { return; }
      var w = canvas.width;
      var h = canvas.height;
  
      socket.emit('drawing', {
        x0: x0 / w,
        y0: y0 / h,
        x1: x1 / w,
        y1: y1 / h,
        color: color
      });
    }
  
    function onMouseDown(e){
      drawing = true;
      current.x = e.clientX||e.touches[0].clientX;
      current.y = (e.clientY||e.touches[0].clientY);
    }
  
    function onMouseUp(e){
      if (!drawing) { return; }
      drawing = false;
      drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, (e.clientY||e.touches[0].clientY), current.color, true);
    }
  
    function onMouseMove(e){
      if (!drawing) { return; }
      drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, (e.clientY||e.touches[0].clientY), current.color, true);
      current.x = e.clientX||e.touches[0].clientX;
      current.y = (e.clientY||e.touches[0].clientY);
    }
  
    function onColorUpdate(e){
      current.color = e.target.className.split(' ')[1];
    }
  
    // limit the number of events per second
    function throttle(callback, delay) {
      var previousCall = new Date().getTime();
      return function() {
        var time = new Date().getTime();
  
        if ((time - previousCall) >= delay) {
          previousCall = time;
          callback.apply(null, arguments);
        }
      };
    }
  
    function onDrawingEvent(data){
      var w = canvas.width;
      var h = canvas.height;
      drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
    }
  
    // make the canvas fill its parent
    function onResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  
  })();