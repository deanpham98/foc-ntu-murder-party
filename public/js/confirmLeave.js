window.addEventListener("beforeunload",  function (e) {
    e = e || window.event;

    if (e) {
        e.returnValue = 'Are you sure to leave this site?';
    }

    return 'Are you sure to leave this site?';
});