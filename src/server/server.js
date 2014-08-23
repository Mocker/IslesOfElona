/*** 
	Hipster Game server
***/
//var app = require('express')();
//var http = require('http').Server(app);
var sio = require('socket.io');
var mongoose = require('mongoose');
var Player = require('../client/Player');
var CONFIG = require('../cnf/Config');


var cnf = {
	MAX_PLAYERS: 15,
	MAX_CONNECTIONS: 30,
	PORT: 8001	
};

var db_connected = false;
mongoose.connect(CONFIG.MONGO_URL);
var db = mongoose.connection;

db.on('error', console.error.bind(console,'db connection error'));
db.once('open', function callback(){
  console.log('db connected');
  db_connected = true;
});


var io = module.exports = sio(cnf.PORT);

var world = {
	connected_players : 0,
	players : [],
	npcs : []
};
var players = {};



io.on('connection', function(socket){
	//socket.emit('alert','socket connected to server');

  socket.player = false;

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });

  socket.ping_interval = false;

  socket.on('login', function(params){
  	if(!params.user || params.user.length < 1){
  		socket.emit('login',{status:false,err:'invalid username'});
 		return;
  	}
  	if(!params.pwd || params.pwd.length < 1){
  		socket.emit('login',{status:false,err:'missing password'});
 		return;
  	}

  	console.log('received login for ',params.user);
  	if( players[params.user]) {
  		if( !players[params.user].login( params.pwd ) ) {
  			socket.emit('login',{status:false,err:'invalid password'});
 			return;
  		}
  		socket.player = players[params.user];
  		players[params.user].setSocket(socket);
  		socket.emit('login', {status:true, profile: socket.player.getProfile() } ); 


  	} else {
  		//create new player
  		socket.player = new Player(params.user, params.pwd);
  		socket.player.setSocket(socket);
  		players[params.user] = socket.player;
  		socket.emit('login',{status:true, profile: socket.player.getProfile() } );
  	}
  	socket.ping_interval = setInterval(function(){
		socket.player.sendPing();
	},1000);
  	console.log("Player connected. Current players: "+socket.player.playerCount()+"\n");
  });

  socket.on('ping',function(data){
  	if(socket.player) socket.player.receivePing();
  });

});
