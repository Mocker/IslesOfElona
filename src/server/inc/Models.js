/*****
* DB Schemas and Models
*
* probably should have each class define its own schema and model but.. eh. would screw up frontend compatibility
*/
var mongoose = require('mongoose');
var CONFIG = require('../../cnf/Config');
var fs = require('fs');

function Models() {
	
	this.equipSchema = new mongoose.Schema({
		type 		: String,
		slot 		: String,
		weight 		: Number,
		baseValue 	: Number,
		meta 		: {}
	});

	this.profileSchema = new mongoose.Schema({
		username 	: String,
		name 		: String,
		health		: Number,
		vel 		: { x:Number, y:Number },
		equip 		: [this.equipSchema],
		speed		: Number,
		modifiers 	: [],
		id_world 	: String,
		x 			: Number,
		y 			: Number
	});


	this.playerSchema = new mongoose.Schema({
		username	: String,
		pwdE 		: String,
		id_world 	: String, //current world
		x 			: Number,
		y 			: Number,
		dt_create 	: {type:Date, default: Date.now },
		last_login 	: {type:Date, default: Date.now },
		characer_json : String, //full character profile
		profile 	: [this.profileSchema], //Mixed js object
		character_name : String
	});
	this.Player = mongoose.model('Player',this.playerSchema);

	
	this.worldSchema = mongoose.Schema({
		is_primary   : Boolean, //if is the primary home world for given player
		id_player 	: String, //optional if player owned world
		dt_create 	: {type: Date, default: Date.now },
		npcs 		: [ { json: String, type: String, x: Number, y: Number, name: String } ],
		last_activity : {type: Date, default: Date.now },
		current_players: Number,
		width 		: Number,
		height 		: Number,
		map 		: String, //json blob of a Map object,
		mapData 	: String, //json of a 2d array for tile data
		name 		: String
	});
	this.World = mongoose.model('World',this.worldSchema);
	
};

//update db reference with Player stats and save
Models.prototype.savePlayer = function( player ) {
	player._model.username = player._username;
	player._model.pwdE = player._password;
	player._model.id_world = player._world;
	player._model.x = player._pos[0];
	player._model.y = player._pos[1];
	player._model.last_login = Date.now();
	var profile = player.getProfile();
	player._model.character_json = JSON.stringify(profile);
	player._model.character_name = player._username;
	var p = null;
	if(!player._model.profile || player._model.profile.length < 1 ) {
		console.log("Missing user profile"); console.log(player._model.profile);
		p = mongoose.model('Profile',this.profileSchema);
	} else {
		p = player._model.profile[0];
	}
	p.username = player._username;
	p.name = player._username;
	p.health = player._health;
	p.vel = { x: player._vel[0], y: player._vel[1] };
	p.equip = []; //TODO:: load equipment
	p.speed = 1; //TODO:: have speed set in Player
	p.modifiers = []; //TODO: load modifiers
	p.id_world = (typeof(player._world)=="string") ? player._world : player._world._model._id;
	p.x = player._pos[0];
	p.y = player._pos[1];

	player._model.profile = [p];
	player._model.save(function(err, pl){
		if(err) {
			console.log("Unable to save player: "+player._username+": "+err.message);
		} else {
			console.log("Player "+pl.username+" saved");
		}
		
	});

};
//update Player object with db values
Models.prototype.loadPlayer = function( player, pModel ) {
	player._username = pModel.username;
	player._pos = [ pModel.x, pModel.y ];
	var pro = pModel.profile[0];
	player._health = pro.health;
	player._vel = [0,0];
	player._zone = pModel.id_world;
	player._created = pModel.dt_create;
	player._world = null;
	player._model = pModel;
};


Models.prototype.saveWorld = function( world, cb ) {
	var npcs = [];
	for (var i in world._npcs ) {
		npcs.push({ 
			json 	: JSON.stringify(world._npcs[i]),
			type 	: world._npcs[i]._type,
			x		: world._npcs[i]._x,
			y 		: world._npcs[i]._y,
			name 	: world._npcs[i]._name
		 });
	}
	world._model.npcs = npcs;
	world._model.name = world._name;
	world._model.last_activity = Date.now();
	//world._model.mapData = JSON.stringify(world._mapData);
	world._model.width = world._width;
	world._model.height = world._height;
	world._model.mapData = "";
	world._model.map = "";
	world._model.current_players = world._current_players;
	world._model.save(function(err,w){
		if(err){
			console.log("Unable to save world model: "+err.message);
			if(cb) cb(err, w);
			return;
		}
		var world_id = world._model._id;
		var world_path = CONFIG.MAP_FILES+'/'+world_id+".map";
		fs.writeFile(world_path, JSON.stringify(world._mapData), function(err){
			if(err){
				console.log("Unable to write map file! "+err.message);
				if(cb) cb(err, world);
			} else {
				console.log("Wrote to map file");
				if(cb) cb(null, world);
			}
		});
	});
	
};

//load world data from file and return to send it to player
Models.prototype.loadWorld = function( player, wModel, world, cb) {
	console.log("Called loadWorld for "+wModel._id);
	world._model = wModel;
	world._name = wModel.name;
	world._id_player = wModel.id_player;
	world._height = wModel.height;
	world._width = wModel.width;
	world._is_primary = wModel.is_primary;
	world._npcs = []; //TODO:: load npcs
	world._current_players = 1;
	var world_path = CONFIG.MAP_FILES+'/'+wModel._id+".map";
	fs.readFile(world_path, {}, function(err, data){
		if(err){
			console.log("Problem reading map file "+world_path+": "+err.message);
			if(cb) cb(err, world);
			return;
		}
		world._mapData = JSON.parse(data);
		if(cb) cb(null, world);
	});
};

if(typeof(module)!=="undefined") module.exports = Models;