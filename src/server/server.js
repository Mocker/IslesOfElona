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
var cnf = require('../client/cnf');
var Item = require('../client/Item');

cnf.MAX_PLAYERS = 15;
cnf.MAX_CONNECTIONS = 30;
cnf.PORT = 8001;

var db_connected = false;
mongoose.connect(CONFIG.MONGO_URL);
var db = mongoose.connection;
var MODELS = false;

var active_worlds = {};

var world_ticker = setInterval(function(){
  for(var id_world in active_worlds ) {
    if(active_worlds[id_world]._current_players < 1) {
      console.log("World "+id_world+" is empty.. purging.. ");
      delete(active_worlds[id_world]);
      continue;
    }
    update_world(active_worlds[id_world]);
  }
},200);

db.on('error', console.error.bind(console,'db connection error'));
db.once('open', function callback(){
  console.log('db connected');
  db_connected = true;
  MODELS = new Models();

  //TODO:: remove when player/map gen is complete. Remove all players/maps on start to force new gen
  MODELS.Player.find({}).remove().exec();
  MODELS.World.find({}).remove().exec();

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

  //client sends player move
  socket.on('move', function(pos){
    //TODO:: verify moves are ok
    socket.player._pos = pos;
    if(socket.player._world) {
        console.log("Emitting move for "+socket.player._username+" to "+socket.player._world._model._id);
        io.to( socket.player._world._model._id ).emit('pc',{name: socket.player._username, pos: pos} );
    }
  });

  //try to load given world
  socket.on('warp', function(params){
    var id_world = null;
    var prev_world = socket.player._model._id_world;
    var portal_used = null;
    var portal_dest = null; //destination portal to warp on
    if(typeof(params)=="string"){
      id_world = params;
    } else if(params.id_world) {
        id_world = params.id_world;
        if(params.portal_to) { portal_dest = params.portal_to; }
    } else {
        //TODO::
        //warp can be from a portal to a known destination
        //or it could be an unexplored portal whereby we need to select an existing worl or create a new one
        //before leaving previous world we need to update its portal as discovered and the new ones id
        //and in the new one we need to update an undiscovered portal or create a new one with an id back to the old
        var rand = Math.random();
        console.log("Generating portal endpoint");
        MODELS.World.count({},function(err,count){
          console.log("Currently "+count+" worlds in db");
          if( count > 24 && rand > 0.6 ) { //chance of linking to existing world or creating a new one
             rand = Math.floor(Math.random()*count);
             MODELS.World.find({},{},{skip:rand,limit:1},function(err,w){
                if(err){
                  console.log("Error fetching world!: "+err.message ); return;
                }
                console.log("Picked a random world to link to portal! "+typeof(w));
             });
          } else {
            console.log("Create new world and link to this portal!");
            //TODO:: world generation should really be it's own function
            rand = Math.floor( Math.random()*(cnf.WORLD_SIZE_MAX-cnf.WORLD_SIZE_MIN)+cnf.WORLD_SIZE_MIN);
            var newWorld = new World(rand, rand);
            newWorld._model = new MODELS.World();
            newWorld._model.is_primary = false;
            newWorld._is_primary = false;
            var name = makeid(8);
            seed(name, {global: true } );
            newWorld._biome = -1; //pick at random
            var opts = {
              link_portal : {
                id_world : prev_world,
                world_name : socket.player._world._name,
                id_portal : (params&&params.portal_i)?params.portal_i:0
              }
            };
            newWorld.generate( name , socket.player, opts, function(){
              MODELS.saveWorld(newWorld,function(err,w){
                if(err) {
                  console.log("Error generating world: "+err.message);
                  socket.emit('alert','Unable to generate world: '+err.message);
                } else {
                  //TODO : move removing player from world to another function 
                  socket.player._world._current_players -= 1;
                  delete(socket.player._world._player_list[socket.player._model._id]);
                  io.to(socket.player._world._model._id).emit('pc leave',{name:socket.player._username});
                  socket.leave(socket.player._world._model._id);
                  if(params.portal_i) {
                    //update portal on old world to have this id
                    socket.player._world._portals[params.portal_i]._properties.is_explored = true;
                    socket.player._world._portals[params.portal_i]._name = "Portal to "+w._name;
                    socket.player._world._portals[params.portal_i]._properties.id_world = w._model._id;
                    socket.player._world._portals[params.portal_i]._properties.remote_id = w.linked_portal;
                    MODELS.saveWorld( socket.player._world, function(err,r){ console.log("Previous world portal updated"); });
                  }

                  console.log("saveWorld returned");
                  w._player_list[socket.player._model._id] = socket.player;
                  active_worlds[w._model._id] = w;
                  socket.player._world = w;
                  socket.player._zone = w._name;
                  socket.player._model.id_world = w._model._id;
                  socket.player._model.save(function(err,w){
                    if(err){
                      console.log("Couldn't update player model to new world! "+err.message);
                    } else { console.log("Player saved"); }
                  });
                  socket.emit('alert','World Finished.. loading');
                  socket.join(w._model._id);

                  var pList = w._player_list;
                  w._player_list = {};
                  var wString = JSON.stringify(w);
                  if(w.linked_portal) socket.player._pos = [w._portals[w.linked_portal]._x, w._portals[w.linked_portal]._y ];
                  socket.emit('world', w, socket.player._pos);
                  w._player_list  = pList;
                  console.log("world sent");
                }
              });
          });
        }
      });//end model count
      return;
    }


    console.log("attempting warp to "+id_world);
    var old_id = socket.player._model.id_world;
    if(active_worlds[id_world]) {
      var w = active_worlds[id_world];
      console.log("Found active world with "+active_worlds[id_world]._current_players+" in it");
      socket.leave(old_id);
      io.to( old_id ).emit('pc leave',{ name: socket.player._username, pos: socket.player._pos }); //notify other players
      active_worlds[old_id]._current_players-=1;
      delete(active_worlds[old_id]._player_list[socket.player._model._id]);
      socket.player._world = w;
      socket.player._model._id_world = w._model._id;
      socket.player._model.save(function(){});
      var pList = w._player_list; w._player_list = {};
      var wString = JSON.stringify(w);
      socket.emit('world', wString, socket.player._pos);
      pList[socket.player._model._id] = socket.player;
      w._player_list = pList;
      w._current_players++;
      console.log("World "+w._name+" has "+w._current_players+" players");
      var plist = getWorldPlayers(w);
      socket.emit('pc list', plist);
      socket.join(id_world);
      io.to(id_world).emit('pc join',{ name: socket.player._username, pos: socket.player._pos } );
      return;
    }

    MODELS.World.findOne({ _id : id_world }).exec(function(err,wResult){
      if(err){
        console.log("Nope: "+err.message); return;
      }
      if(!wResult){
        console.log("No world found"); return;
      }
      
      io.to( socket.player._model.id_world ).emit('pc leave',{ name: socket.player._username, pos: socket.player._pos }); //notify other players
                  


      var oldWorld = new World(wResult.width, wResult.height);
      MODELS.loadWorld(socket.player, wResult, oldWorld, function(err, w){
        socket.leave(old_id);
        active_worlds[old_id]._current_players-=1;
        delete(active_worlds[old_id]._player_list[socket.player._model._id]);
        console.log("loaded World ("+wResult.name+").. sending to player");
        socket.player._world = w;
        socket.player._model.id_world = w._model._id;
        socket.player._model.save(function(){});
        var pList = w._player_list; w._player_list = {};
        var wString = JSON.stringify(w);
        socket.emit('world', wString, socket.player._pos);
        w._player_list = pList;
        w._player_list[socket.player._model._id] = socket.player;
        w._current_players++;
        console.log("World "+w._name+" has "+w._current_players+" players");
        var plist = getWorldPlayers( w );
        socket.emit('pc list', plist);
        socket.join(id_world);
        io.to(id_world).emit('pc join',{ name: socket.player._username, pos: socket.player._pos } );
      });
    });
  });
//END WARP

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
      io.emit('player login',socket.player._username);
  		socket.player = players[params.user];
  		players[params.user].setSocket(socket);
  		socket.emit('login', {status:true, profile: socket.player.getProfile() } );
      console.log("Login sent");
      if(params.id_world) { //player is reconnecting don't need to send the world, just current position
        socket.emit('info',{position:socket.player._pos});
        socket.join(socket.player._world._model._id);
        return;
      }

      var p_list = socket.player._world._player_list; //hide player list since it is sockets and client can't read those
      socket.player._world._player_list = {};
      var wString = JSON.stringify(socket.player._world);
      console.log("Sending world string.. "+wString.length);
      socket.emit('world', wString, socket.player._pos); 
      socket.player._world._player_list = p_list;
      p_list = getWorldPlayers(socket.player._world);
      socket.emit('pc list', p_list);
      socket.join(socket.player._world._model._id);
      io.to(socket.player._world._model._id).emit('pc enter', { name: socket.player._username, pos: socket.player._pos } );
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
                if(active_worlds[socket.player._model.id_world]){
                  //world is already active, add player to it and send it to them with player list
                  socket.player._world = active_worlds[socket.player._model.id_world];
                  active_worlds[socket.player._model.id_world]._current_players++;
                  socket.player._world._player_list[socket.player._model._id] = socket;
                  socket.join(socket.player._model.id_world);
                  var wplist = w._player_list;
                  w._player_list = [];
                  var wString = JSON.stringify(w);
                  socket.emit('world', wString, socket.player._pos);
                  w._player_list = wplist;
                  if( active_worlds[socket.player._model.id_world]._current_players > 1 ) {
                    var plist = getWorldPlayers( active_worlds[socket.player._model.id_world] );
                    socket.emit('pc list', plist);
                    io.to( socket.player._model.id_world ).emit('pc enter',{ name: socket.player._username, pos: socket.player._pos }); //notify other players
                  }
                } else {
                  console.log("checking db for world");
                    MODELS.World.findOne({ _id : socket.player._model.id_world }).exec(function(err,wResult){
                      if(err){
                        console.log("Couldn't load world "+socket.player._model.id_world+"!: "+err.message);
                        socket.emit('alert','Unable to load world');
                        return;
                      }
                      var oldWorld = new World(cnf.WORLD_SIZE_PLAYER, cnf.WORLD_SIZE_PLAYER);
                      MODELS.loadWorld(socket.player, wResult, oldWorld, function(err, w){
                        console.log("Finished loading world! send to player");
                        socket.player._world = w;
                        var wString = JSON.stringify(w);
                        socket.emit('world', wString, socket.player._pos);
                      });
                    });
                }
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
          var newWorld = new World(cnf.WORLD_SIZE_PLAYER, cnf.WORLD_SIZE_PLAYER);
          newWorld._model = new MODELS.World();
          newWorld._model.id_player = socket.player._model._id;
          newWorld._model.is_primary = true;
          newWorld._is_primary = true;
          newWorld._id_player = socket.player._model._id;
          seed(socket.player._username+"'s World", {global: true } );
          newWorld._biome = -1; //pick at random
          newWorld.generate( params.user+"'s World", socket.player, {}, function(){
            MODELS.saveWorld(newWorld,function(err,w){
              if(err) {
                console.log("Error generating world: "+err.message);
                socket.emit('alert','Unable to generate world: '+err.message);
              } else {
                console.log("saveWorld returned");
                w._player_list[socket.player._model._id] = socket.player;
                active_worlds[w._model._id] = w;
                socket.player._world = w;
                socket.player._zone = w._name;
                socket.player._model.id_world = w._model._id;
                socket.player._model.save(function(err,w){});
                socket.emit('alert','World Finished.. loading');
                socket.join(w._model._id);

                var pList = w._player_list;
                w._player_list = {};
                var wString = JSON.stringify(w);
                socket.emit('world', w, socket.player._pos);
                w._player_list  = pList;
                console.log("world sent");
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

//Create list of players in world to send back to one who just joined
function getWorldPlayers ( w ) {
  var plist = [];
  for(var p in w._player_list ) {
    plist.push({ //TODO:: sprite or other information needed for display player (facing?)
      name: w._player_list[p]._username,
      pos : w._player_list[p]._pos
    });
  }
  console.log("Fetched "+plist.length+" players in world "+w._name);
  return plist;
}


//TODO:: world updates
//process updates for world and broadcast changes to connected players
//every __ minutes, save world to db and file for recovery
function update_world ( w ) {

}

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}