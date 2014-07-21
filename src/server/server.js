/*** 
	Hipster Game server
***/
//var app = require('express')();
//var http = require('http').Server(app);
var sio = require('socket.io');

var cnf = {
	MAX_PLAYERS: 15,
	MAX_CONNECTIONS: 30,
	PORT: 8001	
};

var io = module.exports = sio(cnf.PORT);

var world = {};
var players = [];






io.on('connection', function(socket){
	socket.emit('alert','socket connected to server');

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});