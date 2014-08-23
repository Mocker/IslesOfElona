/*****
* DB Schemas and Models
*
* probably should have each class define its own schema and model but.. eh. would screw up frontend compatibility
*/
var mongoose = require('mongoose');

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
		id_player 	: String, //optional if player owned world
		dt_create 	: {type: Date, default: Date.now },
		npcs 		: [ { json: String, type: String, x: Number, y: Number, name: String } ],
		last_activity : {type: Date, default: Date.now },
		current_players: Number,
		name : String
	});
	this.World = mongoose.model('World',this.worldSchema);
	
};

//update db reference with Player stats and save
Models.prototype.savePlayer = function( player ) {
	player._model.username = player.username;
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
	p.id_world = player._world;
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

};


Models.prototype.saveWorld = function( world ) {

};

if(typeof(module)!=="undefined") module.exports = Models;