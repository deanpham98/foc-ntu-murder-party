const socket = io();

let name = document.getElementById("name");
let pin = document.getElementById("pin");
socket.on("connect", function() {
    socket.emit("checkHostExist");
});

document.getElementById("name").oninvalid = () => {
    alert("Please enter your nickname from 2-6 letters, including only alphabetic characters and numbers");
};

// socket.on("showHost", function() {
//     document.getElementById("host").style.display = "block";
// });

function validateName() {
    socket.emit("validateName", name.value, pin.value);
}

socket.on("submitAction", function(isNameExist, isRoomExist) {
    if (isRoomExist) {
        alert("Room does not exist");
    } else if (isNameExist) {
        alert("Player name already exists");
    } else {
        window.location = `/player?name=${name.value}&pin=${pin.value}`;
    }
});