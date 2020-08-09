//Import dependencies
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

//Import classes
const {LiveGames} = require('./utils/liveGames');
const {Players} = require('./utils/players');
const { kill, ppid } = require('process');

const publicPath = path.join(__dirname, '../public');
let app = express();
let server = http.createServer(app);
let io = socketIO(server);
let games = new LiveGames();
let players = new Players();

//Mongodb game.setup
dotenv.config();
let MongoClient = require('mongodb').MongoClient;
let url = process.env.MONGODB_URI;
app.use(express.static(publicPath));

//Starting server on port 3000
server.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port 3000");
});

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

let colors = ["blue", "brown", "#7FFF00", "#A9A9A9", "#8B008B", "#006400", "#FF1493", "black", "#FFD700", "#808000", "#00FFFF", "#FF00FF"]
//When a connection to server is made from client

function reconnect(name, data) {
    
}

io.on('connection', (socket) => {

    //When host connects for the first time
    socket.on('host-join', (data) =>{
        let gamePin = Math.floor(Math.random() * 90000) + 10000; //new pin for game

        games.addGame(gamePin, socket.id, false, {playersAnswered: 0, questionLive: false, gameid: data.id, question: 1}); //Creates a game with pin and host id

        let game = games.getGame(socket.id); //Gets the game data
        game.uniqueNames = new Set();
        socket.join(game.pin);//The host is joining a room based on the pin

        console.log('Game Created with pin:', game.pin); 

        //Sending game pin to host so they can display it for players to join
        socket.emit('showGamePin', {
            pin: game.pin
        });
    });

    //When the host connects from the game view
    socket.on('host-join-game', (data) => {
        let oldHostId = data.id;
        let game = games.getGame(oldHostId);//Gets game with old host id
        game.counter = game.uniqueNames.size;
        if (game) {
            game.hostId = socket.id;//Changes the game host id to new host id
            socket.join(game.pin);
            
            for (let i = 0; i < Object.keys(players.players).length; i++){
                if (players.players[i].hostId == oldHostId) {
                    players.players[i].hostId = socket.id;
                }
            }
            socket.emit("allPlayers", players.getPlayers(socket.id).map(player => player.name));

            game.details = [
                "Let the party begins!!!",
                "But if you got it wrong, you will be BEGGING me for your life",
                "If you answer correctly, you will get 100 points",
                "You will be answering Multiple Choice Questions within 20 seconds",
                "The first stage is called the Interrogation Floor",
                "You will go through 3 stages full of PAIN and TEARS",
                "But this is not Escape Room, so you will not be having fun and solving puzzles",
                "You must escape from this house to survive",
                "All of you were captured to this house by DARKNESS",
                "Welcome to NTU Murder Party!!!"
            ];
            game.screenshots = [
                [],
                ["../../media/screenshot_incorrect.png"],
                ["../../media/screenshot_correct.png"],
                ["../../media/screenshot_interrogation.png", "../../media/screenshot_mcq.png"],
                [],
                [],
                ["../../media/escape_room.jpg"],
                ["../../media/blackcat.jpg"],
                ["../../media/blackcat.jpg"],
                []
            ];
            socket.emit("showInstruction", game.details.pop(), game.screenshots.pop());
        } else {
            socket.emit('noGameFound');//No game was found, redirect user
        }
    });
    
    socket.on("firstInterrogationQuestion", function() {
        let game = games.getGame(socket.id);
        let playerData = players.getPlayers(socket.id);//Gets player in game
        MongoClient.connect(url, function(err, db){
            if (err) throw err;

            let dbo = db.db('murderDB');
            dbo.collection("interrogation").find().toArray(function(err, res) {
                if (err) throw err;
                game.questionData = res;
                game.questionData.sort(() => Math.random() - 0.5);
                let question = game.questionData[0].question;
                let answer1 = game.questionData[0].answers[0];
                let answer2 = game.questionData[0].answers[1];
                let answer3 = game.questionData[0].answers[2];
                let answer4 = game.questionData[0].answers[3];
                let correctAnswer = game.questionData[0].correctAnswer;
                
                socket.emit('gameQuestions', {
                    q1: question,
                    a1: answer1,
                    a2: answer2,
                    a3: answer3,
                    a4: answer4,
                    correct: correctAnswer,
                    playersInGame: playerData.length
                });
                io.to(game.pin).emit('gameStartedPlayer');
                db.close();
                game.gameData.questionLive = true;
            }); 
        });
    });

    socket.on("breakoutInstruction", function() {
        let game = games.getGame(socket.id);
        game.details = [
            "Let the race begin!!!",
            "If you get consumed by Darkness, it is Game Over for you.",
            "After 2 questions, Darkness will start chasing you. For each subsequent question, Darkness will move 3 steps.",
            "If any dead player is able to catch up with the leader. They will swap life with each other.",
            "The leader of the race has a disadvantage, he or she only has TWO answers to choose from and can only move at most TWO steps.",
            "If you choose these answers, you will move 3 steps",
            "If you choose these answers, you will move 2 steps",
            "If you choose these answers, you will move 1 step",
            "To move as closer to the Exit door as possible, you must choose the correct answers and must NOT choose the incorrect answers",
            "There can be no correct answer or more than one correct answers",
            "In this Breakout Floor, a question and three answers will be given within 10 seconds.",
            "If nobody survive when we reach the Breakout Floor, the player with highest score will have that advantage.",
            "Everybody else position is dependent of their total score",
            "Your starting position is the closest to the Exit door",
            "The only player who survive through those vicious Killing Floors will have a huge advantage",
            "There will be at most ONE survivor, and the only way to escape is through the Exit door to the right",
            "This is where you will run for your life.",
            "Welcome to the Breakout Floor!!!"
        ];

        game.screenshots = [
            [],
            ["../../media/screenshot_darkness_chase.png"],
            ["../../media/screenshot_darkness_chase.png"],
            ["../../media/screenshot_before_swaplife.png", "../../media/screenshot_after_swaplife.png"],
            ["../../media/screenshot_leader_select.png"],
            ["../../media/screenshot_three_correct.png"],
            ["../../media/screenshot_two_correct.png"],
            ["../../media/screenshot_one_correct.png"],
            ["../../media/screenshot_many_correct.png"],
            ["../../media/screenshot_no_correct.png", "../../media/screenshot_many_correct.png"],
            ["../../media/screenshot_breakout_questions.png"],
            [],
            ["../../media/screenshot_others_start.png"],
            ["../../media/screenshot_leader_start.png"],
            [],
            ["../../media/screenshot_exit_door.jpg"],
            [],
            []
        ];

        socket.emit("showInstruction", game.details.pop(), game.screenshots.pop());
    });

    socket.on("nextInstruction", function() {
        let game = games.getGame(socket.id);
        if (game.details.length > 0)
            socket.emit("showInstruction", game.details.pop(), game.screenshots.pop());
        else {
            let game = games.getGame(socket.id);
            socket.emit("closeInstruction", game.isFirstQues, game.floor);
            if (game.floor.startsWith("challenge"))
                io.to(game.pin).emit("closeInstructionPlayer");
            game.isFirstQues = false;
        }
    });

    socket.on("validateName", function(name, pin) {
        let game = games.games.filter(g => g.pin == pin)[0];
        socket.emit("submitAction", game != null && game.uniqueNames.has(name), game == null);
    });

    //When player connects for the first time
    socket.on('player-join', (params) => {
        let gameFound = false; //If a game is found with pin provided by player
        
        //For each game in the Games class
        for (let i = 0; i < games.games.length; i++){
            //If the pin is equal to one of the game's pin
            if (params.pin == games.games[i].pin) {
                if (games.games[i].floor != "breakout") {
                    console.log('Player connected to game');
                    let game = games.games[i];
                    let hostId = game.hostId;
                    game.uniqueNames.add(params.name);
                    socket.join(params.pin);
                    if (players.getPlayers(hostId).filter(p => p.name == params.name).length == 0) {
                        players.addPlayer(hostId, socket.id, params.name, {score: 0, answer: 0}); //add player to game
                        let playersInGame = players.getPlayers(hostId); //Getting all players in game
                        io.to(params.pin).emit('updatePlayerLobby', playersInGame);//Sending host player data to display
                        gameFound = true; //Game has been found
                    } else {
                        player = players.getPlayers(hostId).filter(p => p.name == params.name)[0];
                        player.playerId = socket.id;
                        socket.emit("gameStartedPlayer");
                    }
                }
                    //Player is joining room based on pin
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
            if (player.name in game.disconnectData) {
                reconnect(player.name, game.disconnectData[player.name]);
                socket.emit("reconnectPlayer", game.disconnectData[player.name]);
                io.to(player.hostId).emit("reconnectPlayerToHost", player.name, game.disconnectData[player.name]);
                delete game.disconnectData[player.name];
                game.challengeData[3].guessCounter = game.uniqueNames.size + 1;
                game.challengeData[6].guessCounter = game.uniqueNames.size + 1;
            }
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
                    game.uniqueNames.delete(player.name);
                    socket.leave(pin); //Player is leaving the room
                } else if (game.counter == 0) {
                    game.uniqueNames.delete(player.name);
                    
                    game.disconnectData[player.name] = {
                        floor: game.floor,
                        isAlive: game.floor == "breakout" ? game.breakoutPlayers.filter(p => p.name == player.name)[0].isAlive : game.deadPlayers.includes(player.name),
                        score: game.floor == "breakout" ? game.breakoutPlayers.filter(p => p.name == player.name)[0].score : player.gameData.score,
                    };
                    io.to(pin).emit("playerDisconnect", player.name);
                    socket.leave(pin);
                    game.challengeData[3].guessCounter = game.uniqueNames.size - 1;
                    game.challengeData[6].guessCounter = game.uniqueNames.size - 1;
                } else {
                    game.counter--;
                }
            }
        }
        
    });

    socket.on("hostKillDisconnectedPlayers", function() {
        let game = games.getGame(socket.id);
        for (let p in game.disconnectData) {
            p.isAlive = false;
        }

        game.deadPlayers = game.deadPlayers.filter(p => !(p in game.disconnectData));
        socket.emit("removePlayersNotFromBreakout", Object.keys(game.disconnectData));
        if (game.floor == "breakout") {
            game.breakoutPlayers = game.breakoutPlayers.filter(p => !(p.name in game.disconnectData));
            socket.emit("removePlayersFromBreakout", Object.keys(game.disconnectData));
        } else if (game.floor.startsWith("challenge")) {
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                socket.emit("breakoutReached");
            }
            socket.emit("challengeOverHostDisconnect", Object.keys(game.disconnectData));
            io.to(game.pin).emit("playerContinueKillingFloor");
        } else {
            game.killingFloorPlayers = game.killingFloorPlayers.filter(p => !(p in game.disconnectData));
            game.incorrectPlayer = game.killingFloorPlayers.length;
            if (game.gameData.questionLive == true)
                socket.emit("continueInterrogation");
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                socket.emit("breakoutReached");
            }
            if (game.incorrectPlayer == 0 && game.gameData.questionLive == false) {
                socket.emit("interrogationChangeButton");
            }
        }
        io.to(game.pin).emit("removePlayersModal");
    });

    //game.Sets data in player class to answer from player
    socket.on('playerAnswer', function(num){
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.allPlayersAnswered.push(player.name);

        if (game.gameData.questionLive == true) {//if the question is still live
            player.gameData.answer = num;
            game.gameData.playersAnswered += 1;
            
            let gameQuestion = game.gameData.question;
            let correctAnswer = game.questionData[gameQuestion - 1].correctAnswer;
            //Checks player answer with correct answer
            socket.emit('answerResult', num == correctAnswer);
            if (num == correctAnswer) {
                player.gameData.score += 100;
            } else if (!game.deadPlayers.includes(player.name)) {
                game.killingFloorPlayers.push(player.name);
                game.incorrectPlayer++;
            }

            //Checks if all players answered
            if (game.gameData.playersAnswered == game.uniqueNames.size) {
                game.gameData.questionLive = false; //Question has been ended bc players all answered under time
                io.to(game.pin).emit('questionOverPlayer'); //Tell everyone that question is over
                io.to(game.hostId).emit("questionOverHost", correctAnswer, game.incorrectPlayer == 0);
                if (game.gameData.question == 1) {
                    game.details = [
                        "After that, we will enter the Final Stage",
                        "The Interrogation Floor and the Killing Floor will alternate until at most 1 person survive",
                        "Anyone who DIE in the Killing Floor still can participate in the next Interrogation Floors and Killing Floors.",
                        "But of course, there will be a disadvantage.",
                        "If you DIE in the Killing Floor, you can still revive and win this game in the Final Round.",
                        "If you answer incorrectly, you are not dead yet but you will enter the Killing Floor.",
                        "Each of you can see your own Life Status on your screen",
                        "To be very clear, this game is for me to have fun and for you to DIE.",
                        "That was the first round of Interrogation Floor."
                    ];

                    game.screenshots = [
                        [],
                        ["../../media/screenshot_alternate.png"],
                        ["../../media/game_not_over.png"],
                        ["../../media/game_not_over.png"],
                        ["../../media/game_not_over.png"],
                        ["../../media/screenshot_incorrect.png"],
                        ["../../media/screenshot_alive.png", "../../media/screenshot_dead.png"],
                        ["../../media/screenshot_die.png"],
                        []
                    ];

                    io.to(game.hostId).emit("showInstruction", game.details.pop(), game.screenshots.pop());
                }
            } else {
                //update host screen of num players answered
                io.to(game.hostId).emit('updatePlayersAnswered', {
                    playersInGame: game.uniqueNames.size,
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
        for (let name of game.uniqueNames) {
            if (!(game.deadPlayers.includes(name) || game.allPlayersAnswered.includes(name))) {
                game.incorrectPlayer++;
                game.killingFloorPlayers.push(name);
            }
        }
        let correctAnswer = game.questionData[gameQuestion - 1].correctAnswer;
        io.to(game.pin).emit("questionOverPlayer");
        io.to(game.hostId).emit('questionOverHost', correctAnswer, game.incorrectPlayer == 0);
    });
    
    socket.on("killMe", function() {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.killingFloorPlayers.push(player.name);
    });

    socket.on('killingTimeUp', function(){
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("challengeOverPlayer", game.challengeId, timeUpValue[game.challengeId]);
    });

    socket.on('nextQuestion', function(){
        let game = games.getGame(socket.id);
        if (game.challengeId > 0 && (game.challengeId - 1) in game.challengeData) {
            delete game.challengeData[game.challengeId - 1];
        }
        game.incorrectPlayer = 0;
        game.killingFloorPlayers = [];
        game.allPlayersAnswered = [];
        let playerData = players.getPlayers(socket.id);
        //Regame.set players current answer to 0
        for (let i = 0; i < Object.keys(players.players).length; i++) {
            if (players.players[i].hostId == socket.id) {
                players.players[i].gameData.answer = 0;
            }
        }
        
        game.gameData.playersAnswered = 0;
        game.gameData.questionLive = true;
        game.gameData.question += 1;
        if (game.questionData.length >= game.gameData.question && game.deadPlayers.length + 1 < game.uniqueNames.size) {
            game.floor = "interrogation";
            let questionNum = game.gameData.question;
            questionNum = questionNum - 1;
            let question = game.questionData[questionNum].question;
            let answer1 = game.questionData[questionNum].answers[0];
            let answer2 = game.questionData[questionNum].answers[1];
            let answer3 = game.questionData[questionNum].answers[2];
            let answer4 = game.questionData[questionNum].answers[3];

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
            game.breakoutQuesNum = 0;
            game.questionData = null;
            game.breakoutPlayers = players.getPlayers(socket.id).filter(p => (!(p.name in game.disconnectData))).map(player => {
                return {
                    name: player.name,
                    score: player.gameData.score,
                    isAlive: game.deadPlayers.includes(player.name) != true,
                    playerId: player.playerId
                };
            });
            let p;
            for (let i = 0; i < game.breakoutPlayers.length; i++) {
                if (game.breakoutPlayers[i].isAlive) {
                    p = game.breakoutPlayers.splice(i, 1)[0];
                }
            }
            game.breakoutPlayers.sort((a, b) => a.score < b.score ? 1 : -1);
            if (p != null) {
                game.breakoutPlayers = [p, ...game.breakoutPlayers];
            } else {
                game.breakoutPlayers[0].isAlive = true;
            }
            for (let i = 1; i < game.breakoutPlayers.length; i++) {
                game.breakoutPlayers[i].isAlive = false;
            }
            game.floor = "breakout";
            socket.emit("breakoutFloorHost", game.breakoutPlayers);
            io.to(game.pin).emit("breakoutFloorPlayer", game.breakoutPlayers[0].playerId);
        }
    });

    socket.on("swapLife", function(newIsAlive, oldIsAlive) {
        let oldPlayer = players.getPlayer(oldIsAlive);
        let newPlayer = players.getPlayer(newIsAlive);
        let game = games.getGame(socket.id);
        game.breakoutPlayers.forEach(player => {
            if (player.name == oldPlayer.name) {
                player.isAlive = false;
            } else if (player.name == newPlayer.name) {
                player.isAlive = true;
            }
        });
        io.to(newIsAlive).emit("swapLifePlayer");
        io.to(oldIsAlive).emit("swapLifePlayer");
    });

    socket.on("reverseLife", function(newIsAlive) {
        io.to(newIsAlive).emit("swapLifePlayer");
    });

    socket.on("breakoutTimeup", function() {
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("breakoutTimeupPlayer");
    });

    socket.on('nextBreakoutQuestion', () => {
        let game = games.getGame(socket.id);
        game.breakoutAllPlayersAnswers = {};
        console.log(game.questionData);
        if (game.questionData == null) {
            MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                let dbo = db.db('murderDB');
                dbo.collection("breakout").find().toArray(function(err, res) {
                    if (err) throw err;
                    game.questionData = res;
                    game.questionData.sort(() => Math.random() - 0.5);
                    let question = game.questionData[game.breakoutQuesNum].question;
                    let answers = game.questionData[game.breakoutQuesNum].answers;
                    let corrects = game.questionData[game.breakoutQuesNum].corrects;

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
            let question = game.questionData[game.breakoutQuesNum].question;
            let answers = game.questionData[game.breakoutQuesNum].answers;
            let corrects = game.questionData[game.breakoutQuesNum].corrects;

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
            playerCorrects.push(game.questionData[game.breakoutQuesNum].corrects.includes(i) ^ (!playerAnswers.includes(i)));
        }

        game.breakoutAllPlayersAnswers[player.name] = playerCorrects;
        game.breakoutPlayers.filter(p => p.name == player.name)[0].score += 100 * playerCorrects.filter(x => x).length;

        if (Object.keys(game.breakoutAllPlayersAnswers).length == game.breakoutPlayers.length) {
            io.to(player.hostId).emit("breakoutMoveHost", game.breakoutAllPlayersAnswers, game.breakoutQuesNum);
            game.breakoutQuesNum++;
        }
    });

    socket.on('killingFloor', function() {
        let game = games.getGame(socket.id);
        var ret;
        io.to(game.pin).emit("clearInterrogation");

        MongoClient.connect(url, function(err, db){
            if (err) throw err;
            let query = {
                minKillingFloor: { $lte: game.incorrectPlayer },
                maxKillingFloor: { $gte: game.incorrectPlayer },
                minNonKillingFloor: { $lte: game.uniqueNames.size - game.incorrectPlayer },
                maxNonKillingFloor: { $gte: game.uniqueNames.size - game.incorrectPlayer }
            };
            let dbo = db.db('murderDB');
            dbo.collection("killing").find(query).toArray(function(err, res) {
                if (err) throw err;
                if (res.length > 0) {
                    res.sort(() => Math.random() - 0.5);
                    for (let i = 0; i < res.length; i++) {
                        if (!game.set.has(res[i].id)) {
                            ret = res[i];
                            game.set.add(ret.id);
                            game.challengeId = ret.id;
                            game.floor = `challenge${game.challengeId}`;
                            
                            io.to(game.pin).emit("nextKillingFloorPlayer", {...ret, killingFloorPlayers: game.killingFloorPlayers});
                            socket.emit("nextKillingFloor", ret, game.killingFloorPlayers);
                            game.details = ret.details;
                            game.screenshots = ret.screenshots;
                            socket.emit("showInstruction", game.details.pop(), game.screenshots.pop());
                            io.to(game.pin).emit("showInstructionPlayer");
                            break;
                        }
                    }
                } else {
                    console.log({
                        minKillingFloor: { $lte: game.incorrectPlayer },
                        maxKillingFloor: { $gte: game.incorrectPlayer },
                        minNonKillingFloor: { $lte: game.uniqueNames.size - game.incorrectPlayer },
                        maxNonKillingFloor: { $gte: game.uniqueNames.size - game.incorrectPlayer }
                    });
                }
                
                db.close();
            });
        });
        
    });

    socket.on("startKilling", function() {
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("startKillingPlayer");
        if (game.challengeId == 8) {
            let i = 4;
            for (let { playerId, name } of players.getPlayers(game.hostId)) {
                if (!game.killingFloorPlayers.includes(name)) {
                    i--;
                    io.to(playerId).emit("challengeEightSkew");
                }

                if (i == 0) {
                    break;
                }
            }
        } else if (game.challengeId == 4) {
            io.to(socket.id).emit("challengeFourHint", game.challengeData[3].password, game.challengeData[3].hint);
        } else if (game.challengeId == 11) {
            game.challengeData[10].guessCounter = game.uniqueNames.size - game.killingFloorPlayers.length;
        }
    });

    //When the host starts the game
    socket.on('startGame', () => {
        let game = games.getGame(socket.id);//Get the game based on socket.id
        game.gameLive = true;
        socket.emit('gameStarted', game.hostId);//Tell player and host that game has started
        game.incorrectPlayer = 0;
        game.set = new Set();
        game.disconnectData = {};
        game.floor = "";
        game.details = [];
        game.screenshots = [];
        game.isFirstQues = true;
        game.challengeId = 0;
        game.challengeData = {
            0: {
                numbers: {},
                min: 1000,
                max: 0
            },
            1: {
                min: {},
                deadPlayers: []
            },
            2: {
                poisons: [false, false, false, false, false, false, false, false],
                updateData: [],
                deadPlayers: []
            },
            3: {
                password: "",
                hint: 1,
                flag: false,
                guessCounter: game.uniqueNames.size - 1
            },
            4: {
                takeMoney: {}
            },
            5: {
                spells: {},
            },
            6: {
                guessCounter: game.uniqueNames.size - 1,
                avenger: 1,
                guess: new Set(),
                flag: false
            },
            7: {
                hide: {},
                skew: [[false, false, false, false, false],
                    [false, false, false, false, false],
                    [false, false, false, false, false],
                    [false, false, false, false, false]],
                hole: [],
                done: false
            },
            8: {
                options: {},
            },
            9: null,
            10: {
                guessCounter: 0,
                impress: [],
            },
            11: {
                colors: {}
            }
        }
        game.killingFloorPlayers = [];
        game.deadPlayers = [];
        game.allPlayersAnswered = [];
        colors.sort(() => Math.random() > 0.5);
    });

    socket.on("challenge1Submit", function(num) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.incorrectPlayer--;
        if (num in game.challengeData[0].numbers) {
            game.challengeData[0].numbers[num].push(socket.id);
        } else {
            game.challengeData[0].numbers[num] = [socket.id];
        }
        game.challengeData[0].min = Math.min(num, game.challengeData[0].min);
        game.challengeData[0].max = Math.max(num, game.challengeData[0].max);
        if (game.incorrectPlayer == 0) {
            
            let challengeOneDeadPlayers = [
                ...game.challengeData[0].numbers[game.challengeData[0].min],
                ...game.challengeData[0].numbers[game.challengeData[0].max]
            ];
            game.deadPlayers.push(...(challengeOneDeadPlayers.map(playerId => players.getPlayer(playerId).name)));
            io.to(game.pin).emit("playerDisplayLifeStatus", challengeOneDeadPlayers);
            io.to(game.hostId).emit("challengeOverHost", challengeOneDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            let updateData = [];
            for (let num in game.challengeData[0].numbers) {
                for (let playerId of game.challengeData[0].numbers[num]) {
                    updateData.push({
                        name: players.getPlayer(playerId).name,
                        value: `${num} ${num == game.challengeData[0].min || num == game.challengeData[0].max ? "(Ghost)" : ""}`
                    });
                }
            }

            io.to(game.hostId).emit("updateChallengeValues", updateData);
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("updateChallengeValues",  function(value) {
        let player = players.getPlayer(socket.id);
        io.to(player.hostId).emit("updateChallengeValues", [{name: player.name, value: value}]);
    });

    socket.on("challenge2Submit", function(num) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        if (num == -1000) {
            if (!(socket.id in game.challengeData[1].min)) {
                game.challengeData[1].min[socket.id] = 0;
            }
            game.incorrectPlayer--;
            if (game.incorrectPlayer == 0) {
                let minVal = 1000;
                for (let playerId in game.challengeData[1].min) {
                    if (game.challengeData[1].min[playerId] < minVal) {
                        minVal = game.challengeData[1].min[playerId];
                        game.challengeData[1].deadPlayers = [playerId];
                    } else if (game.challengeData[1].min[playerId] == minVal) {
                        game.challengeData[1].deadPlayers.push(playerId);
                    }
                }
                io.to(player.hostId).emit("challengeOverHost", game.challengeData[1].deadPlayers.map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("updateChallengeValues", game.challengeData[1].deadPlayers.map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: "Ghost"
                    }
                }));
                io.in(game.pin).emit("playerDisplayLifeStatus", game.challengeData[1].deadPlayers);
                game.deadPlayers.push(...(game.challengeData[1].deadPlayers.map(playerId => players.getPlayer(playerId).name)));
                
                if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                    io.to(game.hostId).emit("breakoutReached");
                }
                io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
            }
        } else if (num == -1) {
            game.deadPlayers.push(player.name);
            io.to(player.hostId).emit("challengeOverHost", [player.name]);
            io.to(player.hostId).emit("updateChallengeValues", [{ name: player.name, value: "WRONG"}]);
            io.to(game.pin).emit("challengeOverPlayer", 2, -1000);
            io.in(game.pin).emit("playerDisplayLifeStatus", [socket.id]);
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
        } else {
            if (socket.id in game.challengeData[1].min)
                game.challengeData[1].min[socket.id]++;
            else
                game.challengeData[1].min[socket.id] = 1;
        }
    });

    socket.on("challenge3Poison", function(num) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.challengeData[2].poisons[num - 1] = true;
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge3Submit", function(num) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.incorrectPlayer--;

        if (num == -1) {
            game.challengeData[2].deadPlayers.push(socket.id);
            game.challengeData[2].updateData.push({
                name: player.name,
                value: "Ghost"
            })
        } else if (game.challengeData[2].poisons[num - 1]) {
            game.challengeData[2].deadPlayers.push(socket.id);
            game.challengeData[2].updateData.push({
                name: player.name,
                value: `${num} (Ghost)`
            });
        } else {
            game.challengeData[2].updateData.push({
                name: player.name,
                value: num
            });
        }
        if (game.incorrectPlayer == 0) {
            io.to(player.hostId).emit("challengeOverHost", game.challengeData[2].deadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("updateChallengeValues", game.challengeData[2].updateData);
            io.to(player.hostId).emit("challengeThreeShowPoisons", game.challengeData[2].poisons);
            io.to(game.pin).emit("playerDisplayLifeStatus", game.challengeData[2].deadPlayers);
            game.deadPlayers.push(...(game.challengeData[2].deadPlayers.map(playerId => players.getPlayer(playerId).name)));
            game.challengeData[2].deadPlayers = [];
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("challenge4CreatePassword", function(password, hint) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.challengeData[3].password = password;
        game.challengeData[3].hint = hint;
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on('drawing', function(data) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player != null ? player.hostId : socket.id);
        
        io.to(game.pin).emit('drawing', data);
    });

    socket.on("challenge4Submit", function(guess) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.challengeData[3].guessCounter--;
        
        if (guess == game.challengeData[3].password) {
            game.challengeData[3].flag = true;
            io.to(player.hostId).emit("challengeOverHost", game.killingFloorPlayers);
            io.to(player.hostId).emit("updateChallengeValues", [{
                name: game.killingFloorPlayers[0],
                value: "Ghost"
            }]);
            io.to(player.hostId).emit("challengeFourPassword", game.challengeData[3].password);
            let playerIds = [];
            if (guess == game.challengeData[3].password) {
                io.to(game.pin).emit("challengeSinglePlayerOver");
                game.deadPlayers.push(game.killingFloorPlayers[0]);
                for (let p of players.getPlayers(player.hostId)) {
                    if (p.name == game.killingFloorPlayers[0]) {
                        playerIds.push(p.playerId);
                        break;
                    }
                }
            }
            
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
            io.to(game.pin).emit("playerDisplayLifeStatus", playerIds);
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
        }

        if (guess != "") {
            io.to(player.hostId).emit("updateGuess", guess, player.name, guess == game.challengeData[3].password);
        }

        if (game.challengeData[3].guessCounter == 0 && game.challengeData[3].flag == false) {
            io.to(player.hostId).emit("challengeOverHost", []);
            io.to(player.hostId).emit("updateChallengeValues", [{
                name: game.killingFloorPlayers[0],
                value: "Alive"
            }]);
            io.to(player.hostId).emit("challengeFourPssword", game.challengeData[3].password);
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
            io.to(game.pin).emit("playerDisplayLifeStatus", []);
        }
    });

    socket.on("challenge5Submit", function(isTakeMoney) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.incorrectPlayer--;
        
        if (isTakeMoney in game.challengeData[4].takeMoney) {
            game.challengeData[4].takeMoney[isTakeMoney].push(socket.id);
        } else {
            game.challengeData[4].takeMoney[isTakeMoney] = [socket.id];
        }
        if (game.incorrectPlayer == 0) {
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
            if (!(false in game.challengeData[4].takeMoney)) {
                game.deadPlayers.push(...(game.challengeData[4].takeMoney[true].map(playerId => players.getPlayer(playerId).name)));
                io.to(player.hostId).emit("challengeOverHost", game.challengeData[4].takeMoney[true].map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("updateChallengeValues", game.challengeData[4].takeMoney[true].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Money (Ghost)`
                    }
                }));
                io.to(game.pin).emit("playerDisplayLifeStatus", game.challengeData[4].takeMoney[true]);
                if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                    io.to(game.hostId).emit("breakoutReached");
                }
            } else if (!(true in game.challengeData[4].takeMoney)) {
                io.to(player.hostId).emit("challengeOverHost", []);
                io.to(player.hostId).emit("updateChallengeValues", game.challengeData[4].takeMoney[false].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Nothing (Alive)`
                    }
                }));
                io.to(game.pin).emit("playerDisplayLifeStatus", []);
            } else {
                let updateData = game.challengeData[4].takeMoney[true].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Money (Alive)`
                    }
                });
                updateData.push(...(game.challengeData[4].takeMoney[false].map(playerId => {
                    return {
                        name: players.getPlayer(playerId).name,
                        value: `Nothing (Ghost)`
                    }
                })));
                io.to(player.hostId).emit("challengeOverHost", game.challengeData[4].takeMoney[false].map(playerId => players.getPlayer(playerId).name));
                io.to(player.hostId).emit("updateChallengeValues", updateData);
                io.to(game.pin).emit("playerDisplayLifeStatus", game.challengeData[4].takeMoney[false]);
                game.deadPlayers.push(...(game.challengeData[4].takeMoney[false].map(playerId => players.getPlayer(playerId).name)));
                if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                    io.to(game.hostId).emit("breakoutReached");
                }
            }
        }
    });

    socket.on("challenge6Submit", function(spell) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.incorrectPlayer--;
        
        game.challengeData[5].spells[socket.id] = spell;

        if (game.incorrectPlayer == 0) {
            
            let minLen = 1000;
            let minSpells = [];
            for (let playerId in game.challengeData[5].spells) {
                if (game.challengeData[5].spells[playerId].length < minLen) {
                    minLen = game.challengeData[5].spells[playerId].length;
                    minSpells = [playerId];
                } else if (game.challengeData[5].spells[playerId].length == minLen) {
                    minSpells.push(playerId);
                }
            }

            let updateData = [];
            for (let playerId in game.challengeData[5].spells) {
                updateData.push({
                    name: players.getPlayer(playerId).name,
                    value: game.challengeData[5].spells[playerId] == "" ? `"" (Ghost)` : (`"${game.challengeData[5].spells[playerId]}"${game.challengeData[5].spells[playerId].length == minLen ? " (Ghost)" : ""}`)
                });
            }
            io.to(player.hostId).emit("challengeOverHost", minSpells.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("updateChallengeValues", updateData);
            io.to(game.pin).emit("playerDisplayLifeStatus", minSpells);
            game.deadPlayers.push(...(minSpells.map(playerId => players.getPlayer(playerId).name)));
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("challenge7Avenger", function(data) {
        data = data.replace(" ", "").toLowerCase();
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.challengeData[6].avenger = data;
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge7Submit", function(guess) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        if (guess != null) {
            guess = guess.replace(" ", "").toLowerCase();
            game.challengeData[6].guess.add(guess);
        }
        game.challengeData[6].guessCounter--;
        
        if (guess == game.challengeData[6].avenger) {
            game.challengeData[6].flag = true;
            io.to(player.hostId).emit("challengeSevenShowAvenger", game.challengeData[6].avenger, Array.from(game.challengeData[6].guess));
            io.to(player.hostId).emit("challengeOverHost", game.killingFloorPlayers);
            io.to(player.hostId).emit("updateChallengeValues", [{
                name: game.killingFloorPlayers[0],
                value: "Ghost"
            }]);
            let playerIds = [];
            game.deadPlayers.push(game.killingFloorPlayers[0]);
            for (let p of players.getPlayers(player.hostId)) {
                if (p.name == game.killingFloorPlayers[0]) {
                    playerIds.push(p.playerId);
                    break;
                }
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
            io.to(game.pin).emit("challengeSinglePlayerOver", game.challengeId);
            io.to(game.pin).emit("playerDisplayLifeStatus", playerIds);
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
        }
        if (game.challengeData[6].guessCounter == 0 && game.challengeData[6].flag == false) {
            io.to(player.hostId).emit("challengeSevenShowAvenger", game.challengeData[6].avenger, Array.from(game.challengeData[6].guess));
            io.to(player.hostId).emit("challengeOverHost", []);
            io.to(game.pin).emit("playerDisplayLifeStatus", []);
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("challenge8Hide", function(row, col) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.challengeData[7].hide[socket.id] = { row, col };
        io.to(game.pin).emit("addUniquePos", (row - 1) * 5 + col);
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge8Submit", function(hole) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);

        if (hole != 1000) {
            game.challengeData[7].hole.push(hole);
        } 
        if (hole <= 4) {
            game.challengeData[7].skew[hole - 1][0] = true;
            game.challengeData[7].skew[hole - 1][1] = true;
            game.challengeData[7].skew[hole - 1][2] = true;
        } else if (hole <= 9) {
            game.challengeData[7].skew[0][hole - 5] = true;
            game.challengeData[7].skew[1][hole - 5] = true;
            game.challengeData[7].skew[2][hole - 5] = true;
        } else if (hole <= 13) {
            game.challengeData[7].skew[hole -  10][2] = true;
            game.challengeData[7].skew[hole -  10][3] = true;
            game.challengeData[7].skew[hole -  10][4] = true;
        }

        if ((game.challengeData[7].hole.length == 4 || hole == 1000) && !game.challengeData[7].done) {
            game.challengeData[7].done = true;
            let updateData = [];
            let challengeEightDeadPlayers = [];
            let displayData = [];
            for (let playerId in game.challengeData[7].hide) {
                let { row, col } = game.challengeData[7].hide[playerId];
                displayData.push({
                    name: players.getPlayer(playerId).name,
                    row: row,
                    col: col
                });
                updateData.push({
                    name: players.getPlayer(playerId).name,
                    value: (game.challengeData[7].skew[row - 1][col - 1]) ? "Ghost" : "Alive"
                });
                if (game.challengeData[7].skew[row - 1][col - 1]) {
                    challengeEightDeadPlayers.push(playerId);
                    game.deadPlayers.push(players.getPlayer(playerId).name);
                }
            }
            io.to(player.hostId).emit("challengeOverHost", challengeEightDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("challengeEightShowHide", displayData);
            setTimeout(() => {
                io.to(player.hostId).emit("challengeEightShowSkew", game.challengeData[7].hole);
                io.to(player.hostId).emit("updateChallengeValues", updateData);
                io.to(game.pin).emit("playerDisplayLifeStatus", challengeEightDeadPlayers);
            }, 2000);
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("challenge9Submit", function(opt, target) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.incorrectPlayer--;
        
        game.challengeData[8].options[players.getPlayer(socket.id).name] = {
            opt,
            target,
            playerId: socket.id
        };

        if (game.incorrectPlayer == 0) {
            let playerResults = {};
            let displayData = [];
            let challengeNineDeadPlayers = [];
            for (let name in game.challengeData[8].options) {
                let { opt, target } = game.challengeData[8].options[name];
                if (!(name in playerResults)) {
                    playerResults[name] = "Alive";
                }
                if (opt == "corona") {
                    displayData.push({
                        player: name,
                        target: target,
                        targetOpt: game.challengeData[8].options[target].opt
                    });
                    if (game.challengeData[8].options[target].opt == "mask") {
                        playerResults[target] = "Alive";
                    } else {
                        playerResults[target] = "Ghost";
                        challengeNineDeadPlayers.push(game.challengeData[8].options[game.challengeData[8].options[name].target].playerId);
                        game.deadPlayers.push(game.challengeData[8].options[name].target);
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
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("challenge11Impress", function(whiteCard){
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        game.challengeData[10].impress.push({
            name: player.name,
            impress: whiteCard,
            votes: 0,
            playerId: socket.id
        })
        io.to(player.hostId).emit("beforeStartKillingSubmit", player.name);
    });

    socket.on("challenge11DisplayImpress", function() {
        let game = games.getGame(socket.id);
        game.challengeData[10].impress.sort(() => Math.random() - 0.5);
        io.to(game.pin).emit("challengeElevenCreateVotes", game.challengeData[10].impress.length);
        socket.emit("challengeElevenDisplayImpress", game.challengeData[10].impress.map(({impress}) => impress));
    });

    socket.on("challenge11Submit", function(vote) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        if (vote != -1000) {
            game.challengeData[10].impress[vote - 1].votes++;
        }
        
        game.challengeData[10].guessCounter--;
        if (game.challengeData[10].guessCounter == 0) {
            let minVotes = 1000;
            let challengeElevenDeadPlayers = [];
            for (let player of game.challengeData[10].impress) {
                if (player.votes < minVotes) {
                    minVotes = player.votes;
                    challengeElevenDeadPlayers = [player.playerId];
                } else if (player.votes == minVotes) {
                    challengeElevenDeadPlayers.push(player.playerId);
                }
            }
            
            io.to(player.hostId).emit("challengeOverHost", challengeElevenDeadPlayers.map(playerId => players.getPlayer(playerId).name));
            io.to(player.hostId).emit("challengeElevenShowResults", game.challengeData[10].impress);
            io.to(player.hostId).emit("updateChallengeValues", challengeElevenDeadPlayers.map(playerId => {
                return {
                    name: players.getPlayer(playerId).name,
                    value: "Ghost"
                }
            }));
            io.to(game.pin).emit("playerDisplayLifeStatus", challengeElevenDeadPlayers);
            game.deadPlayers.push(...(challengeElevenDeadPlayers.map(playerId => players.getPlayer(playerId).name)));
            if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
                io.to(game.hostId).emit("breakoutReached");
            }
            io.to(game.pin).emit("challengeOverPlayer", game.challengeId);
        }
    });

    socket.on("challenge12Start", function() {
        let game = games.getGame(socket.id);
        game.challengeData[11].colors[socket.id] = colors[0];
        players.getPlayers(socket.id).forEach((player, i) => {
            game.challengeData[11].colors[player.playerId] = colors[i + 1];
        });
        io.to(game.pin).emit("challengeTwelveStart", game.challengeData[11].colors);
        socket.emit("setColor", game.challengeData[11].colors[socket.id]);
    });

    socket.on("challenge12Submit", function(c) {
        let player = players.getPlayer(socket.id);
        let game = games.getGame(player.hostId);
        io.to(player.hostId).emit("updateChallengeValues", [{
            name: player.name,
            value: c == game.challengeData[11].colors[player.hostId] ? `You spot the murderer <span style="background-color: ${c}; color: ${c}">lalala</span> (Alive)` : `You chose <span style="background-color: ${c}; color: ${c}">lalala</span> while the murderer was <span style="background-color: ${game.challengeData[11].colors[player.hostId]}; color: ${game.challengeData[11].colors[player.hostId]}">lalala</span> (Ghost)`
        }]);
        io.to(game.pin).emit("playerDisplayLifeStatus", c == game.challengeData[11].colors[player.hostId] ? [] : [socket.id]);
        game.deadPlayers.push(...(c == game.challengeData[11].colors[player.hostId] ? [] : [player.name]));
        if (game.deadPlayers.length + 1 >= game.uniqueNames.size) {
            io.to(game.hostId).emit("breakoutReached");
        }
        io.to(player.hostId).emit("challengeOverHost", c == game.challengeData[11].colors[player.hostId] ? [] : [player.name]);
    });

    socket.on("gameOver", function(playerId) {
        let game = games.getGame(socket.id);
        io.to(game.pin).emit("gameOverPlayer");
        if (playerId != null) {
            io.to(playerId).emit("youWinPlayer");
            game.breakoutPlayers.filter(p => p.playerId == playerId)[0].isAlive = true;
        }
        
        let p;
        for (let i = 0; i < game.breakoutPlayers.length; i++) {
            if (game.breakoutPlayers[i].isAlive) {
                p = game.breakoutPlayers.splice(i, 1)[0];
            }
        }
        game.breakoutPlayers.sort((a, b) => a.score < b.score ? 1 : -1);
        if (p != null) {
            game.breakoutPlayers = [p, ...game.breakoutPlayers];
        }

        socket.emit("gameOverData", game.breakoutPlayers);
    })

    socket.on("breakoutKillPlayer", function(playerId) {
        let game = games.getGame(socket.id);
        for (let i = 0; i < game.breakoutPlayers.length; i++) {
            if (game.breakoutPlayers[i].playerId == playerId) {
                game.breakoutPlayers[i].isAlive = false;
                break;
            }
        }
        io.to(playerId).emit("breakoutKillPlayer");
    });
});
