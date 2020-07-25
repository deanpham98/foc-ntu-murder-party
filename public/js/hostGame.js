var socket = io();
var params = jQuery.deparam(window.location.search); //Gets the id from url
var timer;
var time = 20;
var challengeData = {id: 0};
var killingFloorPlayers;
var allPlayers;
var wait;
var questionNum = 1;

//When host connects to server
socket.on('connect', function () {

    //Tell server that it is host connection from game view
    socket.emit('host-join-game', params);
});

socket.on("allPlayers", function(players) {
    allPlayers = players;
    document.getElementById("playersNameValue").innerHTML = allPlayers.map(function(name) {
        return `<li><div id=${name}Game style="text-align: center;">${name}</div><div id="${name}GameValue" style="text-align: center;">0</div></li>`;
    }).join("");
});

socket.on('noGameFound', function () {
    window.location.href = '../../';//Redirect user to 'join game' page
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
    updateTimer();
});

socket.on('updatePlayersAnswered', function (data) {
    document.getElementById('playersAnswered').innerHTML = `Players Answered ${data.playersAnswered} / ${data.playersInGame}`;
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

    document.getElementById(`${isNextQuestion ? "nextQButton" : "killingFButton"}`).style.display = "block";
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

function updateTimer() {
    time = 20;
    timer = setInterval(function () {
        time -= 1;
        document.getElementById('num').textContent = " " + time;
        if (time == 0) {
            clearInterval(timer);
            socket.emit('timeUp');
        }
    }, 1000);
}

function killingUpdateTimer(time) {
    time++;
    timer = setInterval(function () {
        time--;
        document.getElementById('killingNum').textContent = " " + time;
        if (time == 0) {
            clearInterval(timer);
            document.getElementById("challengeContext").style.display = "none";
            socket.emit('killingTimeUp');
            document.getElementById("nextQButton").style.display = "block";
        }
    }, 1000);
}

socket.on('nextKillingFloor', function (data, players) {
    challengeData = data;
    killingFloorPlayers = players;
    if (!([3, 4, 7, 8].includes(challengeData.id))) {
        document.getElementById("startKillingButton").style.display = "block";
    } else if (challengeData.id == 3) {
        let nonKillingFloorPlayers = []
        for (let p of allPlayers) {
            if (!(killingFloorPlayers.includes(p))) {
                nonKillingFloorPlayers.push(p);
            }
        }
        wait = nonKillingFloorPlayers.length;
        document.getElementById("killingFloorWait").innerHTML = nonKillingFloorPlayers.join("\n");
        document.getElementById("waitList").style.display = "block";
    } else {
        wait = killingFloorPlayers.length;
        document.getElementById("killingFloorWait").innerHTML = killingFloorPlayers.join("\n");
        document.getElementById("waitList").style.display = "block";
    }
    document.getElementById("killingTimerText").style.display = "none";
    document.getElementById('questionContext').style.display = "none";
    document.getElementById("questionData").style.display = "none";

    document.getElementById('challengeName').innerText = `${data.name}`;
    document.getElementById('killingNum').textContent = "20";
    document.getElementById("challengeContext").style.display = "block";
    document.getElementById("challengeNameValue").innerHTML = killingFloorPlayers.map(function(name) {
        return `<li><div id="${name}Challenge" style="text-align: center;">${name}</div><div id="${name}ChallengeValue" style="text-align: center;">Alive</div></li>`;
    }).join("");

    document.getElementById("killingFloor").style.display = "block";
    document.getElementById("killingFloorPlayers").style.display = "block";
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
        document.getElementById("startKillingButton").style.display = "block";
    }
});

function handleStartKillingClick() {
    document.getElementById("startKillingButton").style.display = "none";
    socket.emit("startKilling");
    document.getElementById("killingTimerText").style.display = "block";
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
    }

    killingUpdateTimer(20);
}

socket.on("updateChallengeValues", function(data) {
    for (let { name, value } of data) {
        document.getElementById(`${name}ChallengeValue`).innerText = value;
    }
});

socket.on("challengeOverHost", function(challengeDeadPlayers) {
    clearInterval(timer);
    for (let player of allPlayers) {
        if (challengeDeadPlayers.includes(player)) {
            document.getElementById(`${player}Game`).innerText += " 💀"
        }
    }
    document.getElementById("challengeContext").style.display = "none";
    document.getElementById("nextQButton").style.display = "block";
});

socket.on("challengeThreeShowPoisons", function(poisons) {
    let skulls = document.getElementById("skull-wrapper").children;
    for (let i = 0; i < 8; i++) {
        if (poisons[i]) {
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
});

socket.on("challengeFourPassword", function(password) {
    document.getElementById("password").innerText = `${password[0]} ${password[1]} ${password[2]} ${password[3]}`
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