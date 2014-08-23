/*** 
	Hipster Game server
***/
//var app = require('express')();
//var http = require('http').Server(app);
var sio = require('socket.io');
var mongoose = require('mongoose');
var Player = require('../client/Player');
var World = require('../client/World');
var NPC = require('../client/NPC');
var CONFIG = require('../cnf/Config');
var Models = require('./inc/Models');
var seed = require('seed-random');


var cnf = {
	MAX_PLAYERS: 15,
	MAX_CONNECTIONS: 30,
	PORT: 8001	
};

var db_connected = false;
mongoose.connect(CONFIG.MONGO_URL);
var db = mongoose.connection;
var MODELS = false;

db.on('error', console.error.bind(console,'db connection error'));
db.once('open', function callback(){
  console.log('db connected');
  db_connected = true;
  MODELS = new Models();

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
    io.emit('chat message', {
      user: (socket.player)?socket.player._username:'Disconnected',
      msg: msg
    });
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
  	if( players[params.user] ) {
      //player already exists - resume
  		if( !players[params.user].login( params.pwd ) ) {
  			socket.emit('login',{status:false,err:'invalid password'});
 			return;
  		}
  		socket.player = players[params.user];
  		players[params.user].setSocket(socket);
  		socket.emit('login', {status:true, profile: socket.player.getProfile() } );
      socket.emit('world', socket.player._world, socket.player._pos); 

  	} else {
      //check DB for player
      MODELS.Player.findOne({ username: params.user }).exec(function(err, pResult){
        if(err) {
          console.log("Unable to login! DB Error for username: "+params.user+" - "+err.message);
          socket.emit('login',{status:false,err:'Database Error'});
        } else if(pResult) {
          console.log("Found matching user");
          if(pResult.pwdE==params.pwd ) { //TODO:: encrypt pwd
            socket.player = new Player(params.user, params.pwd);
            MODELS.loadPlayer(socket.player, pResult);
            socket.player.setSocket(socket);
            players[params.user] = socket.player;
            socket.emit('login',{status:true, profile: socket.player.getProfile() } );
            io.emit('player login',socket.player._username);
            socket.ping_interval = setInterval(function(){
              socket.player.sendPing();
            },1000);
              console.log("Player connected. Current players: "+socket.player.playerCount()+"\n");
              //TODO:: load world for this player from the db and send to client
              if(socket.player._model.id_world == "login"){
                 console.log("This player is still in login and has no world created");
              } else {
                MODELS.World.findOne({ _id : socket.player._model.id_world }).exec(function(err,wResult){
                  if(err){
                    console.log("Couldn't load world "+socket.player._model.id_world+"!: "+err.message);
                    socket.emit('alert','Unable to load world');
                    return;
                  }
                  var oldWorld = new World(100);
                  MODELS.loadWorld(socket.player, wResult, oldWorld, function(err, w){
                    console.log("Finished loading world! send to player");
                    socket.player._world = w;
                    socket.emit('world', w, socket.player._pos);
                  });
                });
                
              }
          } else {
            socket.emit('login',{status:false,err:'invalid password'});
          }
        } else {
          //create new player
          socket.player = new Player(params.user, params.pwd);
          socket.player._model = new MODELS.Player();
          MODELS.savePlayer(socket.player);
          socket.player.setSocket(socket);
          players[params.user] = socket.player;
          socket.emit('login',{status:true, profile: socket.player.getProfile() } );
          socket.emit('alert', 'Generating Custom World');
          var newWorld = new World(100);
          newWorld._model = new MODELS.World();
          newWorld._model.id_player = socket.player._model._id;
          newWorld._id_player = socket.player._model._id;
          seed(socket.player._username+"'s World", {gloal: true } );//
          newWorld.generate( null, socket.player, function(){
            MODELS.saveWorld(newWorld,function(err,w){
              if(err) {
                console.log("Error generating world: "+err.message);
                socket.emit('alert','Unable to generate world: '+err.message);
              } else {
                socket.player._world = w;
                socket.player._zone = w._name;
                socket.player._model.id_world = w._model._id;
                socket.player._model.save(function(err,w){});
                socket.emit('alert','World Finished.. loading');
                socket.emit('world', w, socket.player._pos);
              }
            });
            
          });
          socket.ping_interval = setInterval(function(){
            socket.player.sendPing();
          },1000);
            console.log("Player connected. Current players: "+socket.player.playerCount()+"\n");
        }

      });

  		
  	}
  	
  });

  socket.on('ping',function(data){
  	if(socket.player) socket.player.receivePing();
  });

});
