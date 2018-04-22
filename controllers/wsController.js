module.exports = function(socket) {

  console.log("connection!!!!!!!");

  // event when recieving messages
  socket.on('message', function(data) {
    console.log("message");
    io.sockets.emit('message', data);
  });

  // event that clients disconnect
  socket.on('disconnect', function(){
    console.log("disconnect");
  });

};
