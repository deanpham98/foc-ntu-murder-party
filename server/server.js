//Import dependencies
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

//Import classes
const {LiveGames} = require('./utils/liveGames');
const {Players} = require('./utils/players');
const { kill } = require('process');

const publicPath = path.join(__dirname, '../public');
let app = express();
let server = http.createServer(app);
let io = socketIO(server);
let games = new LiveGames();
let players = new Players();
let isHostExist = false;

//Mongodb setup
dotenv.config();
let MongoClient = require('mongodb').MongoClient;
let url = process.env.MONGODB_URI;
app.use(express.static(publicPath));

//Starting server on port 3000
server.listen(3000, () => {
    console.log("Server started on port 3000");
});
var uniqueNames;
let breakoutQuesNum;
let breakoutPlayers;
let deadPlayers;
let incorrectPlayer;
let challengeId;
let set;
let challengeOne;
let challengeOneMin;
let challengeOneMax;
let killingFloorPlayers;
let challengeTwoMin;
let challengeTwoDeadPlayers;
let challengeThreePoisons;
let challengeThreeDeadPlayers;
let challengeThreeUpdateData;
let challengeFourPassword;
let challengeFourHint;
let challengeFourFlag;
let challengeFourGuessCounter;
let challengeFiveTakeMoney;
let challengeSixSpells;
let challengeSevenGuessCounter;
let challengeSevenAvenger;
let challengeSevenFlag;
let challengeSevenGuess;
let challengeEightHide;
let challengeEightSkew;
let challengeEightHole;
let challengeEightDone;
let challengeNineOptions;
let challengeElevenImpress;
let challengeElevenGuessCounter;
let questionData;
let allPlayersAnswered;
let breakoutAllPlayersAnswers;
let timeUpValue = {
    1: 0,
    2: -1000,
    3: -1,
    4: "",
    5: false,
    6: "",
    7: "Iron Man",
    8: 1000,
    9: "mask",
    11: -1000
}
//When a connection to server is made from client
io.on('connection', (socket) => {

    //When host connects for the first time
    socket.on('host-join', (data) =>{
        uniqueNames = new Set();
        if (!isHostExist) {
            isHostExist = true;
        }
        
        let gamePin = Math.floor(Math.random()*90000) + 10000; //new pin for game

        games.addGame(gamePin, socket.id, false, {playersAnswered: 0, questionLive: false, gameid: data.id, question: 1}); //Creates a game with pin and host id

        let game = games.getGame(socket.id); //Gets the game data

        socket.join(game.pin);//The host is joining a room based on the pin

        console.log('Game Created with pin:', game.pin); 

        //Sending game pin to host so they can display it for players to join
        socket.emit('showGamePin', {
            pin: game.pin
        });
    });
    
    socket.on("checkHostExist", function() {
        if (!isHostExist) {
            socket.emit("showHost");
        }
    });

    //When the host connects from the game view
    socket.on('host-join-game', (data) => {
        let oldHostId = data.id;
        let game = games.getGame(oldHostId);//Gets game with old host id
        if (game) {
            game.hostId = socket.id;//Changes the game host id to new host id
            socket.join(game.pin);
            let playerData = players.getPlayers(oldHostId);//Gets player in game
            for (let i = 0; i < Object.keys(players.players).length; i++){
                if (players.players[i].hostId == oldHostId) {
                    players.players[i].hostId = socket.id;
                }
            }

            socket.emit("allPlayers", players.getPlayers(socket.id).map(player => player.name));

            MongoClient.connect(url, function(err, db){
                if (err) throw err;
    
                let dbo = db.db('murderDB');
                dbo.collection("interrogation").find().toArray(function(err, res) {
                    if (err) throw err;
                    questionData = res;
                    questionData.sort(() => Math.random() - 0.5);
                    let question = questionData[0].question;
                    let answer1 = questionData[0].answers[0];
                    let answer2 = questionData[0].answers[1];
                    let answer3 = questionData[0].answers[2];
                    let answer4 = questionData[0].answers[3];
                    let correctAnswer = questionData[0].correctAnswer;
                    
                    socket.emit('gameQuestions', {
                        q1: question,
                        a1: answer1,
                        a2: answer2,
                        a3: answer3,
                        a4: answer4,
                        correct: correctAnswer,
                        playersInGame: playerData.length
                    });
                    db.close();
                    io.to(game.pin).emit('gameStartedPlayer');
                    game.gameData.questionLive = true;
                }); 
            });
        } else {
            socket.emit('noGameFound');//No game was found, redirect user
        }
    });
    
    socket.on("validateName", function(name) {
        socket.emit("submitAction", uniqueNames.has(name));
    });

    //When player connects for the first time
    socket.on('player-join', (params) => {
        let gameFound = false; //If a game is found with pin provided by player
        
        //For each game in the Games class
        for(let i = 0; i < games.games.length; i++){
            //If the pin is equal to one of the game's pin
            if (params.pin == games.games[i].pin){
                console.log('Player connected to game');
                uniqueNames.add(params.name);

                let hostId = games.games[i].hostId; //Get the id of host of game
                
                players.addPlayer(hostId, socket.id, params.name, {score: 0, answer: 0}); //add player to game
                
                socket.join(params.pin); //Player is joining room based on pin
                
                let playersInGame = players.getPlayers(hostId); //Getting all players in game
                
                io.to(params.pin).emit('updatePlayerLobby', playersInGame);//Sending host player data to display
                gameFound = true; //Game has been found
            }
        }
        
        //If the game has not been found
        if (gameFound == false) {
            socket.emit('noGameFound'); //Player is sent back to 'join' page because game was not found with pin
        }
        
    });
    
    //When the player connects from game view
    socket.on('player-join-game', (data) => {
        let player = players.getPlayer(data.id);
        if (player) {
            let game = games.getGame(player.hostId);
            socket.join(game.pin);
            player.playerId = socket.id;//Update player id with socket id
            let playerData = players.getPlayers(game.hostId);
            socket.emit('playerGameData', playerData);
        } else {
            socket.emit('noGameFound');//No player found
        }
        
    });
    
    //When a host or player leaves the site
    socket.on('disconnect', () => {

        let game = games.getGame(socket.id); //Finding game with socket.id
        //If a game hosted by that id is found, the socket disconnected is a host
        if (game) {
            //Checking to see if host was disconnected or was sent to game view
            if (game.gameLive == false) {
                isHostExist = false;
                games.removeGame(socket.id);//Remove the game from games class
                console.log('Game ended with pin:', game.pin);

                let playersToRemove = players.getPlayers(game.hostId); //Getting all players in the game

                //For each player in the game
                for (let i = 0; i < playersToRemove.length; i++) {
                    players.removePlayer(playersToRemove[i].playerId); //Removing each player from player class
                }

                io.to(game.pin).emit('hostDisconnect'); //Send player back to 'join' screen
                socket.leave(game.pin); //Socket is leaving room
            }
        } else {
            //No game has been found, so it is a player socket that has disconnected
            let player = players.getPlayer(socket.id); //Getting player with socket.id
            //If a player has been found with that id
            if (player) {
                let hostId = player.hostId;//Gets id of host of the game
                let game = games.getGame(hostId);//Gets game data with hostId
                let pin = game.pin;//Gets the pin of the game
                
                if (game.gameLive == false) {
                    players.removePlayer(socket.id);//Removes player from players class
                    let playersInGame = players.getPlayers(hostId);//Gets remaining players in game

                    io.to(pin).emit('updatePlayerLobby', playersInGame);//Sends data to host to update screen
                    socket.leave(pin); //Player is leaving the room
            
                }
            }
        }
        
    });
    
    //Sets data in player class to answer from player
    socket.on('playerAnswer', function(num){
        let player = players.getPlayer(socket.id);
        allPlayersAnswered.push(player.name);
        let hostId = player.hostId;
        let playerNum = players.getPlayers(hostId);
        let game = games.getGame(hostId);

        if (game.gameData.questionLive == true) {//if the question is still live
            player.gameData.answer = num;
            game.gameData.playersAnswered += 1;
            
            let gameQuestion = game.gameData.question;
            let correctAnswer = questionData[gameQuestion - 1].correctAnswer;
            //Checks player answer with correct answer
            socket.emit('answerResult', num == correctAnswer);
            if (num == correctAnswer) {
                player.gameData.score += 100;
            } else if (!deadPlayers.includes(player.name)) {
                killingFloorPlayers.push(player.name);
                incorrectPlayer++;
            }

            //Checks if all players answered
            if (game.gameData.playersAnswered == playerNum.length) {
                game.gameData.questionLive = false; //Question has been ended bc players all answered under time
                io.to(game.pin).emit('questionOverPlayer'); //Tell everyone that question is over
                io.to(game.hostId).emit("questionOverHost", correctAnswer, incorrectPlayer == 0);
            } else {
                //update host screen of num players answered
                io.to(hostId).emit('updatePlayersAnswered', {
                    playersInGame: playerNum.length,
                    playersAnswered: game.gameData.playersAnswered
                });
            }
        }
    });
    
    socket.on('getScore', function(){
        let player = players.getPlayer(socket.id);
        socket.emit('newScore', player.gameData.score);
        io.to(player.hostId).emit('newScoreHost', player.name, player.gameData.score);
    });
    
    socket.on('timeUp', function(){
        let game = games.getGame(socket.id);
        game.gameData.questionLive = false;
        
        let gameQuestion = game.gameData.question;
        for (let player of players.getPlayers(game.hostId)) {
            if (!(deadPlayers.includes(player.name) || allPlayersAnswered.includes(player.name))) {
                incorrectPlayer++;
                killingFloorPlayers.push(player.name);
            }
        }
        let correctAnswer = questionData[gameQuestion - 1].correctAnswer;
        io.to(game.pin).emit("questionOverPlayer");
        io.to(game.hostId).emit('questionOverHost', correctAnswer, incorrectPlayer == 0);
    });
    
    socket.on("killMe", function() {
        player = players.getPlayer(socket.id);
        killingFloorPlayers.push(player.name);
    });

    socket.on('killingTimeUp', function(){
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("challengeOverPlayer", challengeId, timeUpValue[challengeId]);
    });

    socket.on('nextQuestion', function(){
        incorrectPlayer = 0;
        killingFloorPlayers = [];
        allPlayersAnswered = [];
        let playerData = players.getPlayers(socket.id);
        //Reset players current answer to 0
        for (let i = 0; i < Object.keys(players.players).length; i++) {
            if (players.players[i].hostId == socket.id) {
                players.players[i].gameData.answer = 0;
            }
        }
        
        let game = games.getGame(socket.id);
        game.gameData.playersAnswered = 0;
        game.gameData.questionLive = true;
        game.gameData.question += 1;
        console.log(
            deadPlayers
        );
        if (questionData.length >= game.gameData.question && deadPlayers.length + 1 < uniqueNames.size) {
            let questionNum = game.gameData.question;
            questionNum = questionNum - 1;
            let question = questionData[questionNum].question;
            let answer1 = questionData[questionNum].answers[0];
            let answer2 = questionData[questionNum].answers[1];
            let answer3 = questionData[questionNum].answers[2];
            let answer4 = questionData[questionNum].answers[3];

            socket.emit('gameQuestions', {
                q1: question,
                a1: answer1,
                a2: answer2,
                a3: answer3,
                a4: answer4,
                playersInGame: playerData.length
            });

            io.to(game.pin).emit('nextQuestionPlayer');
        } else {
            breakoutQuesNum = 0;
            questionData = null;
            breakoutPlayers = players.getPlayers(socket.id).map(player => {
                return {
                    name: player.name,
                    score: player.gameData.score,
                    isAlive: deadPlayers.includes(player.name) != true,
                    playerId: player.id
                };
            });
            breakoutPlayers.sort((a, b) => (a.score < b.score || b.isAlive) ? 1 : -1);
            breakoutPlayers[0].isAlive = true;
            socket.emit("breakoutFloorHost", breakoutPlayers);
            io.to(game.pin).emit("breakoutFloorPlayer");
        }
    });
    
    socket.on("swapLife", function(newIsAlive, oldIsAlive) {
        io.to(newIsAlive).emit("swapLifePlayer");
        io.to(oldIsAlive).emit("swapLifePlayer");
    });

    socket.on("breakoutTimeup", function() {
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("breakoutTimeupPlayer")
    });

    socket.on('nextBreakoutQuestion', () => {
        let game = games.getGame(socket.id);
        breakoutAllPlayersAnswers = {};
        console.log(questionData);
        if (questionData == null) {
            MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                let dbo = db.db('murderDB');
                dbo.collection("breakout").find().toArray(function(err, res) {
                    if (err) throw err;
                    questionData = res;
                    questionData.sort(() => Math.random() - 0.5);
                    let question = questionData[breakoutQuesNum].question;
                    let answers = questionData[breakoutQuesNum].answers;
                    let corrects = questionData[breakoutQuesNum].corrects;

                    socket.emit('breakoutQuestionData', {
                        question,
                        answers,
                        corrects
                    });

                    io.to(game.pin).emit("nextBreakoutQuestionPlayer", answers);
                    db.close();
                });
            });
        } else {
            let question = questionData[breakoutQuesNum].question;
            let answers = questionData[breakoutQuesNum].answers;
            let corrects = questionData[breakoutQuesNum].corrects;

            socket.emit('breakoutQuestionData', {
                question,
                answers,
                corrects
            });

            io.to(game.pin).emit("nextBreakoutQuestionPlayer", answers);
        }
    });

    socket.on("breakoutPlayerAnswer", function(playerAnswers) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        let playerCorrects = [];

        for (let i = 1; i <= 3; i++) {
            playerCorrects.push(questionData[breakoutQuesNum].corrects.includes(i) ^ (!playerAnswers.includes(i)));
        }

        breakoutAllPlayersAnswers[player.name] = playerCorrects;

        if (Object.keys(breakoutAllPlayersAnswers).length == uniqueNames.size) {
            console.log("All players answer");
            io.to(player.hostId).emit("breakoutMoveHost", breakoutAllPlayersAnswers, breakoutQuesNum);
            io.to(game.pin).emit("breakoutMovePlayer");
            breakoutQuesNum++;
        }
    });

    socket.on('killingFloor', function() {
        let game = games.getGame(socket.id);
        let aliveNonKillingFloor = 0;
        var ret;
        io.to(game.pin).emit("clearInterrogation");
        for (let name of uniqueNames) {
            if (!deadPlayers.includes(name) && !killingFloorPlayers.includes(name)) {
                aliveNonKillingFloor++;
            }
        }

        MongoClient.connect(url, function(err, db){
            if (err) throw err;
            let query = {
                minKillingFloor: { $lte: incorrectPlayer },
                maxKillingFloor: { $gte: incorrectPlayer },
                // minAliveNonKillingFloor: { $lte: aliveNonKillingFloor },
                minNonKillingFloor: { $lte: uniqueNames.size - incorrectPlayer },
                maxNonKillingFloor: { $gte: uniqueNames.size - incorrectPlayer }
            };
            let dbo = db.db('murderDB');
            dbo.collection("killing").find(query).toArray(function(err, res) {
                if (err) throw err;
                if (res.length > 0) {
                    res.sort(() => Math.random() - 0.5);
                    for (let i = 0; i < res.length; i++) {
                        if (!set.has(res[i].id)) {
                            ret = res[i];
                            set.add(ret.id);
                            challengeId = ret.id;
                            io.to(game.pin).emit("nextKillingFloorPlayer", {...ret, killingFloorPlayers});
                            break;
                        }
                    }
                    
                    socket.emit("nextKillingFloor", ret, killingFloorPlayers);
                } else {
                    console.log({
                        minKillingFloor: { $lte: incorrectPlayer },
                        maxKillingFloor: { $gte: incorrectPlayer },
                        minAliveNonKillingFloor: { $lte: aliveNonKillingFloor },
                        minNonKillingFloor: { $lte: uniqueNames.size - incorrectPlayer },
                        maxNonKillingFloor: { $gte: uniqueNames.size - incorrectPlayer }
                    });
                }
                
                db.close();
            });
        });
        
    });

    socket.on("startKilling", function() {
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("startKillingPlayer");
        if (challengeId == 8) {
            let i = 4;
            for (let { playerId, name } of players.getPlayers(game.hostId)) {
                if (!killingFloorPlayers.includes(name)) {
                    i--;
                    io.to(playerId).emit("challengeEightSkew");
                }

                if (i == 0) {
                    break;
                }
            }
        } else if (challengeId == 4) {
            io.to(player.hostId).emit("challengeFourHint", challengeFourPassword, challengeFourHint);
        } else if (challengeId == 11) {
            challengeElevenGuessCounter = uniqueNames.size - killingFloorPlayers.length;
        }
    });

    //When the host starts the game
    socket.on('startGame', () => {
        let game = games.getGame(socket.id);//Get the game based on socket.id
        game.gameLive = true;
        socket.emit('gameStarted', game.hostId);//Tell player and host that game has started
        incorrectPlayer = 0;
        set = new Set();
        challengeId = 0;
        challengeOne = {};
        challengeOneMin = 1000;
        challengeOneMax = 0;
        challengeTwoMin = {};
        challengeTwoDeadPlayers = [];
        challengeThreePoisons = [false, false, false, false, false, false, false, false];
        challengeThreeUpdateData = [];
        challengeThreeDeadPlayers = [];
        challengeFourPassword = "";
        challengeFourHint = 1;
        challengeFourFlag = false;
        killingFloorPlayers = [];
        challengeFourGuessCounter = uniqueNames.size - 1;
        challengeFiveTakeMoney = {};
        challengeSixSpells = {};
        challengeSevenGuessCounter = uniqueNames.size - 1;
        challengeSevenAvenger = 1;
        challengeSevenGuess = new Set();
        challengeSevenFlag = false;
        challengeEightHide = {};
        challengeEightSkew = [[false, false, false, false, false],
                              [false, false, false, false, false],
                              [false, false, false, false, false],
                              [false, false, false, false, false]];
        challengeEightHole = [];
        challengeEightDone = false;
        challengeNineOptions = {};
        challengeElevenImpress = [];
        deadPlayers = [];
        allPlayersAnswered = [];
    });

    socket.on("challenge1Submit", function(num) {
        incorrectPlayer--;
        if (num in challengeOne) {
            challengeOne[num].push(socket.id);
        } else {
            challengeOne[num] = [socket.id];
        }
        challengeOneMin = Math.min(num, challengeOneMin);
        challengeOneMax = Math.max(num, challengeOneMax);
        if (incorrectPlayer == 0) {
            player = players.getPlayer(socket.id);
            game = games.getGame(player.hostId);
            let challengeOneDeadPlayers = [
                ...challengeOne[challengeOneMin],
                ...challengeOne[challengeOneMax]
            ];
            deadPlayers.push(...(challengeOneDeadPlayers.map(playerId => players.getPlayer(playerId).name)));
            io.to(game.pin).emit("playerDisplayLifeStatus", challengeOneDeadPlayers);
            io.to(game.hostId).emit("challengeOverHost", challengeOneDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            let updateData = [];
            for (let num in challengeOne) {
                for (let playerId of challengeOne[num]) {
                    updateData.push({
                        name: players.getPlayer(playerId).name,
                        value: `${num} ${num == challengeOneMin || num == challengeOneMax ? "(Ghost)" : ""}`
                    });
                }
            }

            io.to(game.hostId).emit("updateChallengeValues", updateData);
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
        }
    });

    socket.on("updateChallengeValues",  function(value) {
        let player = players.getPlayer(socket.id);
        io.to(player.hostId).emit("updateChallengeValues", [{name: player.name, value: value}]);
    });

    socket.on("challenge2Submit", function(num) {
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        if (num == -1000) {
            if (!(socket.id in challengeTwoMin)) {
                challengeTwoMin[socket.id] = 0;
            }
            incorrectPlayer--;
            if (incorrectPlayer == 0) {
                let minVal = 1000;
                for (let playerId in challengeTwoMin) {
                    if (challengeTwoMin[playerId] < minVal) {
                        minVal = challengeTwoMin[playerId];
                        challengeTwoDeadPlayers = [playerId];
                    } else if (challengeTwoMin[playerId] == minVal) {
                        challengeTwoDeadPlayers.push(playerId);
                    }
                }
                console.log("challengeTwoDeadPlayersNames: " + challengeTwoDeadPlayers.map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("challengeOverHost", challengeTwoDeadPlayers.map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("updateChallengeValues", challengeTwoDeadPlayers.map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: "Ghost"
                    }
                }));
                io.in(game.pin).emit("playerDisplayLifeStatus", challengeTwoDeadPlayers);
                deadPlayers.push(...(challengeTwoDeadPlayers.map(playerId => players.getPlayer(playerId).name)));
                challengeTwoDeadPlayers = [];
                if (deadPlayers.length + 1 == uniqueNames.size) {
                    io.to(game.hostId).emit("breakoutReached");
                }
                io.to(game.pin).emit("challengeOverPlayer", challengeId);
            }
        } else if (num == -1) {
            deadPlayers.push(player.name);
            io.to(player.hostId).emit("challengeOverHost", [player.name]);
            io.to(player.hostId).emit("updateChallengeValues", [{ name: player.name, value: "WRONG"}]);
            io.to(game.pin).emit("challengeOverPlayer", 2, -1000);
            io.in(game.pin).emit("playerDisplayLifeStatus", [socket.id]);
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
        } else {
            if (socket.id in challengeTwoMin)
                challengeTwoMin[socket.id]++;
            else
                challengeTwoMin[socket.id] = 1;
        }
    });

    socket.on("challenge3Poison", function(num) {
        player = players.getPlayer(socket.id);
        challengeThreePoisons[num - 1] = true;
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge3Submit", function(num) {
        incorrectPlayer--;
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);

        if (num == -1) {
            challengeThreeDeadPlayers.push(socket.id);
            challengeThreeUpdateData.push({
                name: player.name,
                value: "Ghost"
            })
        } else if (challengeThreePoisons[num - 1]) {
            challengeThreeDeadPlayers.push(socket.id);
            challengeThreeUpdateData.push({
                name: player.name,
                value: `${num} (Ghost)`
            });
        } else {
            challengeThreeUpdateData.push({
                name: player.name,
                value: num
            });
        }
        if (incorrectPlayer == 0) {
            io.to(player.hostId).emit("challengeOverHost", challengeThreeDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("updateChallengeValues", challengeThreeUpdateData);
            io.to(player.hostId).emit("challengeThreeShowPoisons", challengeThreePoisons);
            io.to(game.pin).emit("playerDisplayLifeStatus", challengeThreeDeadPlayers);
            deadPlayers.push(...(challengeThreeDeadPlayers.map(playerId => players.getPlayer(playerId).name)));
            challengeThreeDeadPlayers = [];
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
        }
    });

    socket.on("challenge4CreatePassword", function(password, hint) {
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        challengeFourPassword = password;
        challengeFourHint = hint;
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge4Submit", function(guess) {
        challengeFourGuessCounter--;
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);

        if (guess == challengeFourPassword) {
            challengeFourFlag = true;
            io.to(player.hostId).emit("challengeOverHost", killingFloorPlayers);
            io.to(player.hostId).emit("updateChallengeValues", [{
                name: killingFloorPlayers[0],
                value: "Ghost"
            }]);
            io.to(player.hostId).emit("challengeFourPassword", challengeFourPassword);
            let playerIds = [];
            if (guess == challengeFourPassword) {
                deadPlayers.push(killingFloorPlayers[0]);
                for (let p of players.getPlayers(player.hostId)) {
                    if (p.name == killingFloorPlayers[0]) {
                        playerIds.push(p.playerId);
                        break;
                    }
                }
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
            io.to(game.pin).emit("playerDisplayLifeStatus", playerIds);
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
        }

        if (guess != "") {
            io.to(player.hostId).emit("updateGuess", guess, player.name, guess == challengeFourPassword);
        }

        if (challengeFourGuessCounter == 0 && challengeFourFlag == false) {
            io.to(player.hostId).emit("challengeOverHost", []);
            io.to(player.hostId).emit("updateChallengeValues", [{
                name: killingFloorPlayers[0],
                value: "Alive"
            }]);
            io.to(player.hostId).emit("challengeFourPassword", challengeFourPassword);
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
            io.to(game.pin).emit("playerDisplayLifeStatus", []);
        }
    });

    socket.on("challenge5Submit", function(isTakeMoney) {
        incorrectPlayer--;
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        
        if (isTakeMoney in challengeFiveTakeMoney) {
            challengeFiveTakeMoney[isTakeMoney].push(socket.id);
        } else {
            challengeFiveTakeMoney[isTakeMoney] = [socket.id];
        }
        if (incorrectPlayer == 0) {
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
            if (!(false in challengeFiveTakeMoney)) {
                deadPlayers.push(...(challengeFiveTakeMoney[true].map(playerId => players.getPlayer(playerId).name)));
                io.to(player.hostId).emit("challengeOverHost", challengeFiveTakeMoney[true].map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("updateChallengeValues", challengeFiveTakeMoney[true].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Take Money (Ghost)`
                    }
                }));
                io.to(game.pin).emit("playerDisplayLifeStatus", challengeFiveTakeMoney[true]);
                if (deadPlayers.length + 1 == uniqueNames.size) {
                    io.to(game.hostId).emit("breakoutReached");
                }
            } else if (!(true in challengeFiveTakeMoney)) {
                io.to(player.hostId).emit("challengeOverHost", []);
                io.to(player.hostId).emit("updateChallengeValues", challengeFiveTakeMoney[false].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Take Nothing (Alive)`
                    }
                }));
                io.to(game.pin).emit("playerDisplayLifeStatus", []);
            } else {
                let updateData = challengeFiveTakeMoney[true].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Take Money (Alive)`
                    }
                });
                updateData.push(...(challengeFiveTakeMoney[false].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Take Nothing (Ghost)`
                    }
                })));
                io.to(player.hostId).emit("challengeOverHost", challengeFiveTakeMoney[false].map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("updateChallengeValues", updateData);
                io.to(game.pin).emit("playerDisplayLifeStatus", challengeFiveTakeMoney[false]);
                deadPlayers.push(...(challengeFiveTakeMoney[false].map(playerId => players.getPlayer(playerId).name)));
                if (deadPlayers.length + 1 == uniqueNames.size) {
                    io.to(game.hostId).emit("breakoutReached");
                }
            }
        }
    });

    socket.on("challenge6Submit", function(spell) {
        incorrectPlayer--;
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        
        challengeSixSpells[socket.id] = spell;

        if (incorrectPlayer == 0) {
            let minLen = 1000;
            let minSpells = [];
            for (let playerId in challengeSixSpells) {
                if (challengeSixSpells[playerId].length < minLen) {
                    minLen = challengeSixSpells[playerId].length;
                    minSpells = [playerId];
                } else if (challengeSixSpells[playerId].length == minLen) {
                    minSpells.push(playerId);
                }
            }

            let updateData = [];
            for (let playerId in challengeSixSpells) {
                updateData.push({
                    name: players.getPlayer(playerId).name,
                    value: challengeSixSpells[playerId] == "" ? "Ghost" : (`"${challengeSixSpells[playerId]}"${challengeSixSpells[playerId].length == minLen ? " (Ghost)" : ""}`)
                });
            }
            io.to(player.hostId).emit("challengeOverHost", minSpells.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("updateChallengeValues", updateData);
            io.to(game.pin).emit("playerDisplayLifeStatus", minSpells);
            deadPlayers.push(...(minSpells.map(playerId => players.getPlayer(playerId).name)));
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
        }
    });

    socket.on("challenge7Avenger", function(data) {
        data = data.replace(" ", "").toLowerCase();
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        challengeSevenAvenger = data;
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge7Submit", function(guess) {
        if (guess != null) {
            guess = guess.replace(" ", "").toLowerCase();
            challengeSevenGuess.add(guess);
        }
        challengeSevenGuessCounter--;
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        if (guess == challengeSevenAvenger) {
            challengeSevenFlag = true;
            io.to(player.hostId).emit("challengeSevenShowAvenger", challengeSevenAvenger, Array.from(challengeSevenGuess));
            io.to(player.hostId).emit("challengeOverHost", killingFloorPlayers);
            io.to(player.hostId).emit("updateChallengeValues", [{
                name: killingFloorPlayers[0],
                value: "Ghost"
            }]);
            let playerIds = [];
            deadPlayers.push(killingFloorPlayers[0]);
            for (let p of players.getPlayers(player.hostId)) {
                if (p.name == killingFloorPlayers[0]) {
                    playerIds.push(p.playerId);
                    break;
                }
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
            io.to(game.pin).emit("playerDisplayLifeStatus", playerIds);
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
        }
        if (challengeSevenGuessCounter == 0 && challengeSevenFlag == false) {
            io.to(player.hostId).emit("challengeSevenShowAvenger", challengeSevenAvenger, Array.from(challengeSevenGuess));
            io.to(player.hostId).emit("challengeOverHost", []);
            io.to(game.pin).emit("playerDisplayLifeStatus", []);
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
        }
    });

    socket.on("challenge8Hide", function(row, col) {
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        challengeEightHide[socket.id] = { row, col };
        io.to(game.pin).emit("addUniquePos", (row - 1) * 5 + col);
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge8Submit", function(hole) {
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);

        console.log({
            challengeEightSkew,
            hole
        });
        if (hole != 1000) {
            challengeEightHole.push(hole);
        } 
        if (hole <= 4) {
            challengeEightSkew[hole - 1][0] = true;
            challengeEightSkew[hole - 1][1] = true;
            challengeEightSkew[hole - 1][2] = true;
        } else if (hole <= 9) {
            challengeEightSkew[0][hole - 5] = true;
            challengeEightSkew[1][hole - 5] = true;
            challengeEightSkew[2][hole - 5] = true;
        } else if (hole <= 13) {
            challengeEightSkew[hole -  10][2] = true;
            challengeEightSkew[hole -  10][3] = true;
            challengeEightSkew[hole -  10][4] = true;
        }

        if ((challengeEightHole.length == 4 || hole == 1000) && !challengeEightDone) {
            challengeEightDone = true;
            let updateData = [];
            let challengeEightDeadPlayers = [];
            let displayData = [];
            for (let playerId in challengeEightHide) {
                let { row, col } = challengeEightHide[playerId];
                displayData.push({
                    name: players.getPlayer(playerId).name,
                    row: row,
                    col: col
                });
                updateData.push({
                    name: players.getPlayer(playerId).name,
                    value: (challengeEightSkew[row - 1][col - 1]) ? "Ghost" : "Alive"
                });
                if (challengeEightSkew[row - 1][col - 1]) {
                    challengeEightDeadPlayers.push(playerId);
                    deadPlayers.push(players.getPlayer(playerId).name);
                }
            }
            io.to(player.hostId).emit("challengeOverHost", challengeEightDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("challengeEightShowHide", displayData);
            setTimeout(() => {
                io.to(player.hostId).emit("challengeEightShowSkew", challengeEightHole);
                io.to(player.hostId).emit("updateChallengeValues", updateData);
                io.to(game.pin).emit("playerDisplayLifeStatus", challengeEightDeadPlayers);
            }, 2000);
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
        }
    });

    socket.on("challenge9Submit", function(opt, target) {
        incorrectPlayer--;
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        challengeNineOptions[players.getPlayer(socket.id).name] = {
            opt,
            target,
            playerId: socket.id
        };

        if (incorrectPlayer == 0) {
            let playerResults = {};
            let displayData = [];
            let challengeNineDeadPlayers = [];
            for (let name in challengeNineOptions) {
                let { opt, target } = challengeNineOptions[name];
                if (!(name in playerResults)) {
                    playerResults[name] = "Alive";
                }
                if (opt == "corona") {
                    displayData.push({
                        player: name,
                        target: target,
                        targetOpt: challengeNineOptions[target].opt
                    });
                    if (challengeNineOptions[target].opt == "mask") {
                        playerResults[target] = "Alive";
                    } else {
                        playerResults[target] = "Ghost";
                        challengeNineDeadPlayers.push(challengeNineOptions[challengeNineOptions[name].target].playerId);
                        deadPlayers.push(challengeNineOptions[name].target);
                    }
                } else if (opt == "money" && playerResults[name] != "Ghost") {
                    playerResults[name] = "$$$";
                }
            }

            let updateData = [];
            for (let name in playerResults) {
                updateData.push({
                    name: name,
                    value: playerResults[name]
                });
            }

            io.to(player.hostId).emit("challengeOverHost", challengeNineDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("challengeNineShowResults", displayData, updateData);
            io.to(game.pin).emit("playerDisplayLifeStatus", challengeNineDeadPlayers);
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
        }
    });

    socket.on("challenge11Impress", function(whiteCard){
        player = players.getPlayer(socket.id);
        challengeElevenImpress.push({
            name: player.name,
            impress: whiteCard,
            votes: 0,
            playerId: socket.id
        })
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge11DisplayImpress", function() {
        game = games.getGame(socket.id);
        challengeElevenImpress.sort(() => Math.random() - 0.5);
        io.to(game.pin).emit("challengeElevenCreateVotes", challengeElevenImpress.length);
        socket.emit("challengeElevenDisplayImpress", challengeElevenImpress.map(({impress}) => impress));
    });

    socket.on("challenge11Submit", function(vote) {
        player = players.getPlayer(socket.id);
        game = games.getGame(player.hostId);
        if (vote != -1000) {
            challengeElevenImpress[vote - 1].votes++;
        }
        
        challengeElevenGuessCounter--;
        if (challengeElevenGuessCounter == 0) {
            let minVotes = 1000;
            let challengeElevenDeadPlayers = [];
            for (let player of challengeElevenImpress) {
                if (player.votes < minVotes) {
                    minVotes = player.votes;
                    challengeElevenDeadPlayers = [player.playerId];
                } else if (player.votes == minVotes) {
                    challengeElevenDeadPlayers.push(player.playerId);
                }
            }
            
            io.to(player.hostId).emit("challengeOverHost", challengeElevenDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("challengeElevenShowResults", challengeElevenImpress);
            io.to(player.hostId).emit("updateChallengeValues", challengeElevenDeadPlayers.map(playerId => {
                return {
                    name: players.getPlayer(playerId).name,
                    value: "Ghost"
                }
            }));
            io.to(game.pin).emit("playerDisplayLifeStatus", challengeElevenDeadPlayers);
            deadPlayers.push(...(challengeElevenDeadPlayers.map(playerId => players.getPlayer(playerId).name)));
            if (deadPlayers.length + 1 == uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", challengeId);
            
        }
    });

    socket.on("challenge12Start", function(link) {
        game = games.getGame(socket.id);
        io.to(game.pin).emit("challengeTwelveStart", link);
    });

    socket.on("challenge12Stop", function(isKill) {
        game = games.getGame(socket.id);
        io.to(game.pin).emit("challengeTwelveStop", isKill);
    });

    socket.on("gameOver", function(playerId) {
        game = games.getGame(socket.id);
        io.to(game.pin).emit("gameOverPlayer");
        io.to(playerId).emit("youWinPlayer");
    })

    socket.on("breakoutKillPlayer", function(name, score) {
        for (let i = 0; i < breakoutPlayers.length; i++) {
            if (breakoutPlayers[i].name == name) {
                breakoutPlayers[i].score = score;
                breakoutPlayers[i].isAlive = false;
                break;
            }
        }
        player = players.getPlayers(socket.id).filter(p => p.name == name)[0]
        console.log({
            breakoutPlayers,
            player
        })
        io.to(player.id).emit("breakoutKillPlayer");
    });
});
