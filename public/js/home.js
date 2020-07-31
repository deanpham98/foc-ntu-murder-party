const socket = io();

let name = document.getElementById("name");
let pin = document.getElementById("pin");
socket.on("connect", function() {
    socket.emit("checkHostExist");
});

// socket.on("showHost", function() {
//     document.getElementById("host").style.display = "block";
// });

function validateName() {
    socket.emit("validateName", name.value);
}

socket.on("submitAction", function(isNameExist) {
    if (isNameExist) {
        alert("Player name already exists");
    } else {
        window.location = `/player?name=${name.value}&pin=${pin.value}`;
    }
});