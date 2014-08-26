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
var worlds = {};
var players = {};

var world_ticker = setInterval(function(){
  for(var id_world in worlds ) {
    if( worlds[id_world]._current_players < 1) {
      console.log("World "+id_world+" is empty.. purging.. ");
      delete( worlds[id_world]);
      continue;
    }
    update_world( worlds[id_world]);
  }
},1000);

db.on('error', console.error.bind(console,'db connection error'));
db.once('open', function callback(){
  console.log('db connected');
  db_connected = true;
  MODELS = new Models();

  //TODO:: remove when player/map gen is complete. Remove all players/maps on start to force new gen
  //MODELS.Player.find({}).remove().exec();
  //MODELS.World.find({}).remove().exec();

});


var io = module.exports = sio(cnf.PORT);

var world = {
	connected_players : 0,
	players : [],
	npcs : []
};




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
    if(pos[0]==socket.player._pos[0] && pos[1]==socket.player._pos[1]) return;
    //set facing
    if(pos[0] < socket.player._pos[0]) socket.player._facing = 'up';
    else if(pos[0] > socket.player._pos[0] ) socket.player._facing = 'down';
    else if(pos[1] > socket.player._pos[1] ) socket.player._facing = 'right';
    else socket.player._facing = 'left';
    socket.player._pos = pos;
    worlds[socket.player._world].occupiedTiles[pos[0]+','+pos[1]] = ['pc',socket.player._model._id];
    if(socket.player._world) {
        //console.log("Emitting move for "+socket.player._username+" to "+socket.player._world);
        //io.to( socket.player._world ).emit('pc',{name: socket.player._username, pos: pos} );
    }
  });

  socket.on('attack', function(npcI){
    if(socket.player._world && worlds[socket.player._world] && worlds[socket.player._world]._npcs[npcI] ){
      worlds[socket.player._world]._npcs[npcI]._health -= socket.player._attack;
      console.log("Player "+socket.player._username+" attacked npc "+npcI);
      if( worlds[socket.player._world]._npcs[npcI]._health <= 0 ) {
        //kill npc
        socket.player._kills++;
        io.to(socket.player._world).emit('npc',[npcI,'kill']);
        worlds[socket.player._world]._npcs[npcI] = null;
      }
    }
  });


  //try to load given world
  socket.on('warp',function(params){
    Warp(socket,params);
  });
  socket.on('warp home',function(params){
    params.id_world = socket.player._world;
    Warp(socket,params);
  });

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
      io.emit('player login',params.user);
      socket.player = players[params.user];
  		players[params.user].setSocket(socket);
  		socket.emit('login', {status:true, profile: socket.player.getProfile() } );
      console.log("Login sent");
      if(params.id_world) { //player is reconnecting don't need to send the world, just current position
        socket.emit('info',{position:socket.player._pos});
        socket.join(socket.player._world);
        var plist = getWorldPlayers( worlds[socket.player._world] );
        socket.emit('pc list', plist);
        return;
      }

      var p_list = worlds[socket.player._world]._player_list; //hide player list since it is sockets and client can't read those
      //worlds[socket.player._world]._player_list = {};
      var wString = JSON.stringify( worlds[socket.player._world] );
      console.log("Sending world string.. "+wString.length);
      socket.emit('world', wString, socket.player._pos); 
      worlds[socket.player._world]._player_list = p_list;
      p_list = getWorldPlayers( worlds[socket.player._world] );
      socket.emit('pc list', p_list);
      socket.join(socket.player._world);
      io.to(socket.player._world).emit('pc enter', { name: socket.player._username, pos: socket.player._pos } );
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
            players[ socket.player._username ] = socket.player;
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
                if( worlds[socket.player._world]){
                  //world is already active, add player to it and send it to them with player list
                  //socket.player._world = socket.player._model.id_world; // active_worlds[socket.player._model.id_world];
                  worlds[socket.player._world]._current_players++;
                  worlds[socket.player._world]._player_list[ socket.player._username] = socket.player._pos;
                  socket.join(socket.player._model.id_world);
                  var wString = JSON.stringify(w);
                  socket.emit('world', wString, socket.player._pos);
                  if( worlds[socket.player._model.id_world]._current_players > 1 ) {
                    var plist = getWorldPlayers( worlds[socket.player._model.id_world] );
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
                        socket.player._world = w._model._id;
                        var wString = JSON.stringify(w);
                        socket.emit('world', wString, socket.player._pos);
                        worlds[w._model._id] = w;
                      });
                    });
                }
              }
          } else {
            socket.emit('login',{status:false,err:'invalid password'});
          }
        } else {
          //create new player
          console.log("Create new user "+params.user);
          socket.player = new Player(params.user, params.pwd);
          socket.player._model = new MODELS.Player();
          MODELS.savePlayer(socket.player, function(pl){   });
          players[params.user] = socket.player ;
          socket.player.setSocket(socket);
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

                w._player_list = {};
                w._player_list[socket.player._username] = socket.player._pos;
                worlds[w._model._id] = w;
                socket.player._world = w._model._id;
                socket.player._zone = w._name;
                socket.player._model.id_world = w._model._id;
                socket.player._homeworld = w._model._id;
                socket.player._model.homeworld = w._model._id;
                socket.player._home_pos = socket.player._pos;
                socket.player._model.home_pos = [ socket.player._pos[0], socket.player._pos[1]];
                socket.player._model.save(function(err,w){});
                socket.emit('alert','Your New World is Waiting.. Loading');
                socket.emit('player update',{_homeworld: w._model._id });
                socket.join(w._model._id);

                var wString = JSON.stringify(w);
                socket.emit('world', w, socket.player._pos);
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

function Warp(socket, params){
    var id_world = null;
    var prev_world = socket.player._world;
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
                //TODO:: load world from db and send to player
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
                world_name : worlds[socket.player._world]._name,
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
                  w = newWorld;
                  worlds[socket.player._world]._current_players -= 1;
                  delete( worlds[socket.player._world]._player_list[socket.player._username] );
                  io.to(socket.player._world).emit('pc leave',{name:socket.player._username});
                  socket.leave(socket.player._world);
                  if(params.portal_i) {
                    //update portal on old world to have this id
                    worlds[socket.player._world]._portals[params.portal_i]._properties.is_explored = true;
                    worlds[socket.player._world]._portals[params.portal_i]._name = "Portal to "+w._name;
                    worlds[socket.player._world]._portals[params.portal_i]._properties.id_world = w._model._id;
                    worlds[socket.player._world]._portals[params.portal_i]._properties.remote_id = w.linked_portal;
                    MODELS.saveWorld( worlds[socket.player._world], function(err,r){ console.log("Previous world portal updated"); });
                  }

                  console.log("saveWorld returned");
                  w._player_list[socket.player._username] = socket.player._pos;
                  worlds[w._model._id] = w;
                  socket.player._world = w._model._id;
                  socket.player._zone = w._name;
                  socket.player._model.id_world = w._model._id;
                  socket.player._model.save(function(err,w){
                    if(err){
                      console.log("Couldn't update player model to new world! "+err.message);
                    } else { console.log("Player saved"); }
                  });
                  socket.emit('alert','World Finished.. loading');
                  socket.join(w._model._id);

                  var wString = JSON.stringify(w);
                  if(w.linked_portal) {
                    socket.player._pos = [w._portals[w.linked_portal]._x, w._portals[w.linked_portal]._y ];
                    console.log("setting player position to linked portal : "+socket.player._pos[0]+","+socket.player._pos[1]);
                  }
                  socket.emit('world', wString, socket.player._pos);
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
    if( worlds[id_world]) {
      var w = worlds[id_world];
      console.log("Found active world with "+worlds[id_world]._current_players+" in it");
      socket.leave(old_id);
      io.to( old_id ).emit('pc leave',{ name: socket.player._username, pos: socket.player._pos }); //notify other players
      worlds[old_id]._current_players-=1;
      delete( worlds[old_id]._player_list[socket.player._username]);
      socket.player._world = w._model._id;
      socket.player._model._id_world = w._model._id;
      socket.player._model.save(function(){});
      var wString = JSON.stringify(w);
      if(portal_dest && w._portals.length > portal_dest && w._portals[portal_dest] ) {
        //set player position in destination portal
        socket.player._pos = [ w._portals[portal_dest]._x, w._portals[portal_dest]._y  ];
      }
      socket.emit('world', wString, socket.player._pos);
      w._player_list[socket.player._username] = socket.player._pos;
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
        worlds[old_id]._current_players-=1;
        delete( worlds[old_id]._player_list[socket.player._username]);
        console.log("loaded World ("+wResult.name+").. sending to player");
        socket.player._world = w._model._id;
        socket.player._model.id_world = w._model._id;
        socket.player._model.save(function(){});
        var pList = w._player_list; w._player_list = {};
        var wString = JSON.stringify(w);
        socket.emit('world', wString, socket.player._pos);
        w._player_list = pList;
        w._player_list[socket.player._username] = socket.player._pos;
        w._current_players++;
        console.log("World "+w._name+" has "+w._current_players+" players");
        var plist = getWorldPlayers( w );
        socket.emit('pc list', plist);
        socket.join(id_world);
        io.to(id_world).emit('pc join',{ name: socket.player._username, pos: socket.player._pos } );
      });
    });
  }
//END WARP

//Create list of players in world to send back to one who just joined
function getWorldPlayers ( w ) {
  var plist = [];
  if(!w){
    console.log("getWorldPlayers called without world!");
    return plist;
  }
  for(var p in w._player_list ) {
    if(!players[p]){
      console.log("world player list has invalid player: "+p);
      for(var pname in players){
        console.log(pname+" is online");
      }
      continue;
    }
    plist.push({ //TODO:: sprite or other information needed for display player (facing?)
      name: players[p]._username,
      pos : players[p]._pos
    });
  }
  console.log("Fetched "+plist.length+" players in world "+w._name);
  return plist;
}


//TODO:: world updates
//process updates for world and broadcast changes to connected players
//every __ minutes, save world to db and file for recovery
function update_world ( w ) {
  var i =0;

  //npc actions 
  // TODO:: group all actions together and emit as one list?
  for(i=0;i<w._npcs.length;i++){
    if(!w._npcs[i]) continue; //dead npcs get nulled out to keep indexes correct instead of deleting
    if(!w._npcs[i]._meta){
      console.log("npc "+i+" has no meta.."); continue;
    }
    if( w._npcs[i]._meta.hostile ) {
      //check players in this world to decide who to chase
      var chase_distance = (w._npcs[i]._meta.chase_distance)?w._npcs[i]._meta.chase_distance:10;
      var chase_sq = chase_distance * chase_distance;
      var chase_player = false;
      for(var p in w._player_list ) {
        if( chase_sq < w._player_list[0]*w._npcs[i]._x + w._player_list[1]*w._npcs[i]._y  ) {
          continue;
        } else {
          chase_player = [p, w._player_list[p] ];
        }
      }
      if(chase_player&&0) {
        //try to move towards player
      } else {
        //random or stand still
        var has_moved = false;
        var attempts = 0;
        while(!has_moved && attempts < 4){
          var dirX = Math.floor(Math.random()*3)-1;
          var dirY = Math.floor(Math.random()*3)-1;
          if(dirY===0 && dirX===0){
            has_moved=true;
            break;
          }
          var tiles = getTiles(w, w._npcs[i]._x+dirX, w._npcs[i]._y+dirY);
          if(tiles===false){ attempts++; continue;}
          if(!cnf.tiles[ tiles[0] ].passable && !w._npcs[i]._meta.flying ){ attempts++; continue; }
          delete(w.occupiedTiles[w._npcs[i]._x+','+w._npcs[i]._y]);
          w._npcs[i]._x += dirX;
          w._npcs[i]._y += dirY;
          w.occupiedTiles[w._npcs[i]._x+','+w._npcs[i]._y] = ['npc', i];
          io.to(w._model._id).emit('npc', [i,'move', w._npcs[i]._x,w._npcs[i]._y] );
          has_moved = true;
        }

      }
    }
  }
}

function getTiles(w, x, y) { //return map tile, occupiedTile for x,y of world 
  if(x<0 || x >= w._width ) return false;
  if(y<0 || y >= w._height ) return false;
  var tiles = [];
  tiles[0] = w._mapData[x][y];
  if( w.occupiedTiles[x+','+y]) tiles[1] = w.occupiedTiles[x+','+y];
  return tiles;
}

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}