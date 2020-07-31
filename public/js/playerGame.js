let socket = io();
let playerAnswered = false;
let correct = false;
let name;
let score = 0;
let challengeDone = false;
let myWindow;
var isAlive = true;
var challengeData = {id: 0};
let uniquePos = new Set();
let dictionary;

axios.get("../../files/en_US.aff")
    .then(affData => {
        console.log(affData);
        axios.get("../../files/en_US.dic")
            .then(wordsData => {
                dictionary = new Typo("en_US", affData.data, wordsData.data);
            })        
    })

let params = jQuery.deparam(window.location.search); //Gets the id from url

socket.on('connect', function() {
    //Tell server that it is host connection from game view
    socket.emit('player-join-game', params);
    
    document.getElementById('answerButtons').style.display = "block";
});

socket.on('noGameFound', function(){
    window.location.href = '../../';//Redirect user to 'join game' page 
});

function answerSubmitted(num){
    if(playerAnswered == false){
        playerAnswered = true;
        
        socket.emit('playerAnswer', num);//Sends player answer to server
        
        //Hiding buttons from user
        document.getElementById("answerButtons").style.display = "none";
        document.getElementById('message').style.display = "block";
        document.getElementById('message').innerHTML = "Answer Submitted! Waiting on other players...";
        
    }
}

//Get results on last question
socket.on('answerResult', function(data){
    if (data === true) {
        correct = true;
    } else {
        correct = false;
    }
});

socket.on('questionOverPlayer', function(){
    document.getElementById("answerButtons").style.display = "none";

    document.getElementById("stats").style.display = "block";
    
    if (correct === true) {
        document.body.style.backgroundColor = "#4CAF50";
        document.getElementById('message').innerHTML = "Correct!";
        document.getElementById('message').style.display = "block";
    } else if (correct === false) {
        document.body.style.backgroundColor = "#f94a1e";
        document.getElementById('message').innerHTML = "Incorrect!";
        document.getElementById('message').style.display = "block";
    }
    
    socket.emit('getScore');
});

socket.on('newScore', function(data){
    document.getElementById('scoreText').innerHTML = "Score: " + data;
});

socket.on('nextQuestionPlayer', function(){
    correct = false;
    playerAnswered = false;
    document.getElementById('stats').style.display = "none";
    document.getElementById("lifeStatus").innerText = "";
    document.getElementById("killingFloor").style.display = "none";
    document.getElementById("message").style.display = "none";
    document.getElementById("answerButtons").style.display = "block";
    document.getElementById("interrogationFloor").style.display = "block";
    document.body.style.backgroundColor = "white";
    
});

socket.on("breakoutFloorPlayer", function() {
    document.getElementById("interrogationFloor").style.display = "none";
    document.getElementById("killingFloor").style.display = "none";
    document.body.style.backgroundColor = "white";
});

socket.on("nextBreakoutQuestionPlayer", function(answers) {
    for (let i = 0; i < 3; i++) {
        document.getElementById(`label_${i + 1}`).lastChild.nodeValue = answers[i];
        document.getElementById(`label_${i + 1}`).classList.remove("isSelected");
        document.getElementById(`label_${i + 1}`).firstElementChild.checked = false;
    }
    document.getElementById("label_3").style.display = isAlive ? "none" : "block";
    document.getElementById("breakoutFloor").style.display = "block";
});

socket.on("gameOverPlayer", function() {
    document.getElementById("breakoutFloor").style.display = "none";
    document.getElementById("gameOver").innerText = "You Lost!!!";
    document.getElementById("gameOver").style.display = "block";
});

socket.on("youWinPlayer", function() {
    document.getElementById("breakoutFloor").style.display = "none";
    document.getElementById("gameOver").innerText = "You Win!!!";
    document.getElementById("gameOver").style.display = "block";
});

socket.on("swapLifePlayer", function() {
    isAlive = !isAlive;
});

socket.on("breakoutTimeupPlayer", function() {
    document.getElementById("breakoutFloor").style.display = "none";
    let playerAnswers = [];
    for (let i = 1; i <= 3; i++) {
        if (document.getElementById(`label_${i}`).firstElementChild.checked) {
            playerAnswers.push(i);
        }
    }
    socket.emit("breakoutPlayerAnswer", playerAnswers);
});

socket.on("breakoutMovePlayer", function() {
    document.getElementById("breakoutFloor").style.display = "none";
});

socket.on("clearInterrogation", function() {
    document.getElementById("answerButtons").style.display = "none";
    document.getElementById('stats').style.display = "none";
    document.getElementById('message').style.display = "none";
    document.getElementById("killingFloor").style.display = "block";
    document.getElementById("lifeStatus").innerText = "";
    document.getElementById("interrogationFloor").style.display = "none";
});

socket.on('nextKillingFloorPlayer', function(data){
    challengeData = data;
    if (challengeData.id == 2) {
        challengeData.cur = 0;
        document.getElementById("mathQuestion").innerText = challengeData.questions[challengeData.cur].question;
    } else if (challengeData.id == 3) {
        document.getElementById(`challenge${challengeData.id}`).style.display = "block";
        if (!isAlive || correct) {
            displayPlayer(false, "block");
            displayPlayer(true, "none");
        }
    } else if ([4, 7, 8, 11].includes(challengeData.id)) {
        document.getElementById(`challenge${challengeData.id}`).style.display = "block";
        if (isAlive && !correct) {
            displayPlayer(true, "block");
            displayPlayer(false, "none");
        }
    } else if (challengeData.id == 9) {
        document.getElementById("whoToKill").innerHTML = challengeData.killingFloorPlayers.map(player => {
            return name == player ? "" : `<option value="${player}">${player}</option>`;
        }).join("");
    } else if (challengeData.id == 10) {
        if (isAlive && !correct) {
            let a = Math.floor((Math.random() * 4) + 1);
            let b = Math.floor((Math.random() * 4) + 1);
            while (b == a) {
                b = Math.floor((Math.random() * 4) + 1);
            }
            document.getElementById(`answer${a}`).onclick = () => answerSubmitted(b);
            document.getElementById(`answer${b}`).onclick = () => answerSubmitted(a);
        }
    }
});

socket.on("startKillingPlayer", function() {
    challengeDone = false;
    if (!correct && isAlive) {
        document.getElementById('killingFloor').style.display = "block";
        document.getElementById(`challenge${challengeData.id}`).style.display = "block";
        if (challengeData.id == 3) {
            displayPlayer(true, "block");
            displayPlayer(false, "none");
        } else if (challengeData.id == 5) {
            document.getElementById("takeMoney").style.display = "inline-block";
            document.getElementById("takeNothing").style.display = "inline-block";
        }
    } else if ([4, 7, 11].includes(challengeData.id)) {
        displayPlayer(false, "block");
        displayPlayer(true, "none");
    } else if (challengeData.id == 8) {
        displayPlayer(true, "none");
    }
});

socket.on("challengeEightSkew", function() {
    displayPlayer(false, "block");
});

socket.on("challengeElevenCreateVotes", function(votes) {
    for (let i = 1; i <= votes; i++) {
        document.getElementById("vote").innerHTML += `<option value="${i}">${i}</option>`;
    }
});

socket.on('hostDisconnect', function(){
    window.location.href = "../../";
});

socket.on('playerGameData', function(data){
   for(let i = 0; i < data.length; i++){
       if(data[i].playerId == socket.id){
           name = data[i].name;
           document.getElementById('nameText').innerHTML = "Name: " + data[i].name;
           document.getElementById('scoreText').innerHTML = "Score: " + data[i].gameData.score;
       }
   }
});

socket.on('GameOver', function(){
    document.body.style.backgroundColor = "#FFFFFF";
    document.getElementById("answerButtons").style.display = "none";
    document.getElementById('message').style.display = "block";
    document.getElementById('message').innerHTML = "GAME OVER";
});

function challengeOnePickNumber() {

    if (document.getElementById("challenge1Input").checkValidity()) {
        challengeDone = true;
        document.getElementById("pickNumber").style.display = "none";
        socket.emit("challenge1Submit", document.getElementById("challenge1Input").value);
    } else {
        alert("Please choose a number between 0 and 1000");
    }
}

function challengeTwoSubmit() {
    if (document.getElementById("mathAns").checkValidity()) {
        if (document.getElementById("mathAns").value == challengeData.questions[challengeData.cur].answer) {
            challengeData.cur++;
            socket.emit("updateChallengeValues", challengeData.cur);
            socket.emit("challenge2Submit", challengeData.cur);
            if (challengeData.cur == challengeData.questions.length) {
                challengeDone = true;
            } else {
                document.getElementById("mathQuestion").innerText = challengeData.questions[challengeData.cur].question;
                document.getElementById("mathAns").value = "";
            }
        } else {
            challengeDone = true;
            socket.emit("challenge2Submit", -1);
        }
    } else {
        alert("Please submit a number");
    }
}

function challengeThreePoison() {
    socket.emit("challenge3Poison", document.getElementById("poison").value);
    displayPlayer(false, "none");
}

function challengeThreeDrink() {
    challengeDone = true;
    socket.emit("challenge3Submit", document.getElementById("drink").value);
    displayPlayer(true, "none");
}

function challengeFourCreatePassword() {
    let password = document.getElementById("password");
    let hint = document.getElementById("hint");
    password.value = password.value.trim().toLowerCase();
    if (password.checkValidity() && dictionary.check(password.value)) {
        socket.emit("challenge4CreatePassword", password.value, hint.value);
        displayPlayer(true, "none");
    } else {
        alert("Password must be 4-letter English word");
    }
}

function challengeFourGuess() {
    let guess = document.getElementById("guess");
    guess.value = guess.value.trim().toLowerCase();
    if (guess.checkValidity()) {
        socket.emit("challenge4Submit", guess.value);
        challengeDone = true;
        displayPlayer(false, "none");
    } else {
        alert("Guess must be 4-letter English word");
    }
}

function takeMoney(isTrue) {
    challengeDone = true;
    document.getElementById("challenge5").style.display = "none";
    socket.emit("challenge5Submit", isTrue);
}

function challengeSixSpell() {
    let spell = document.getElementById("spell");
    spell.value = spell.value.trim().toLowerCase();
    if (spell.checkValidity()) {
        let cFreq = {};
        for (let i = 0; i < spell.value.length; i++) {
            if (spell.value.charAt(i) in cFreq) {
                cFreq[spell.value.charAt(i)]++;
            } else {
                cFreq[spell.value.charAt(i)] = 1;
            }
        }
        let cFreqFlag = true;
        for (let c in cFreq) {
            if (!(c in challengeData.charFreq) || cFreq[c] > challengeData.charFreq[c]) {
                cFreqFlag = false;
                break;
            }
        }

        if (cFreqFlag && dictionary.check(spell.value)) {
            socket.emit("challenge6Submit", spell.value);
            challengeDone = true;
            document.getElementById("challenge6").style.display = "none";
        } else {
            alert("Please enter a correct English word");
        }
    } else {
        alert("Please enter a correct English word");
    }
}

function challengeSevenAvenger() {
    socket.emit("challenge7Avenger", document.getElementById("avenger").value);
    displayPlayer(true, "none");
}

function challengeSevenGuess() {
    socket.emit("challenge7Submit", document.getElementById("guessAvenger").value);
    challengeDone = true;
    displayPlayer(false, "none");
}

function challengeEightHide() {
    if (!uniquePos.has((document.getElementById("row").value - 1) * 5 + document.getElementById("col").value)) {
        socket.emit("challenge8Hide", document.getElementById("row").value, document.getElementById("col").value);
        document.getElementById("hide").style.display = "none";
    } else {
        alert("Someone already hid here!!!");
    }
}

socket.on("addUniquePos", function(pos) {
    uniquePos.add(pos);
});

function challengeEightSkew() {
    socket.emit("challenge8Submit", document.getElementById("hole").value);
    document.getElementById("skew").style.display = "none";
    challengeDone = true;
}

function checkIfKill() {
    document.getElementById("whoToKill").disabled = document.getElementById("challenge9Option").value != "corona" ? true : false;
}

function challengeNineSubmit() {
    let option = document.getElementById("challenge9Option").value;
    if (option == "corona") {
        socket.emit("challenge9Submit", option, document.getElementById("whoToKill").value);
    } else {
        socket.emit("challenge9Submit", option);
    }
    
    document.getElementById("challenge9").style.display = "none";
    challengeDone = true;
}

function challengeElevenSubmit() {
    let whiteCard = document.getElementById("whiteCard");
    if (whiteCard.checkValidity()) {
        socket.emit("challenge11Impress", whiteCard.value);
        displayPlayer(true, "none");
    } else {
        alert("Please type something ^^");
    }
}

function challengeElevenVote() {
    let vote = document.getElementById("vote");
    socket.emit("challenge11Submit", vote.value);
    challengeDone = true;
    displayPlayer(false, "none");
}

function displayPlayer(isKillingFloor, disp) {
    elems = document.getElementsByClassName(isKillingFloor ? "killing-floor" : "non-killing-floor");
    Array.from(elems).forEach(elem => elem.style.display = disp);
}

socket.on("challengeOverPlayer", function(challengeId, value) {
    document.getElementById(`challenge${challengeId}`).style.display = "none";
    if ((isAlive && !correct) ^ (challengeId == 4 || challengeId == 7)) {
        if (!challengeDone && isAlive && value != null) {
            socket.emit(`challenge${challengeId}Submit`, value);
        }
    }
    challengeDone = true;
});

socket.on("playerDisplayLifeStatus", function(deadPlayers) {
    if (isAlive && !correct) {
        if (deadPlayers.includes(socket.id)) {
            isAlive = false;
            document.getElementById("lifeStatus").innerText = "You are now a Ghost 💀";
            document.getElementById("liveness").innerText = "Life Status: You are a Ghost 💀";
        } else {
            document.getElementById("lifeStatus").innerText = "You are lucky this time 😠";
            document.getElementById("liveness").innerText = "Life Status: You are alive 👌";
        }
    }
});

socket.on("challengeTwelveStart", function(link) {
    myWindow = window.open(link);
});

socket.on("challengeTwelveStop", function(isKill) {
    myWindow.close();
    if (isAlive && !correct) {
        if (isKill) {
            isAlive = false;
            document.getElementById("lifeStatus").innerText = "You are now a Ghost 💀";
            document.getElementById("liveness").innerText = "Life Status: You are a Ghost 💀";
        } else {
            document.getElementById("lifeStatus").innerText = "You are lucky this time 😠";
            document.getElementById("liveness").innerText = "Life Status: You are alive 👌";
        }
    }
});

function handleChecked(elem) {
    elem.parentElement.classList.toggle("isSelected");
}

socket.on("breakoutKillPlayer", function() {
    document.getElementById("breakoutFloor").style.display = "none";
    document.getElementById("gameOver").innerText = "You Lost!!!";
    document.getElementById("gameOver").style.display = "block";
});