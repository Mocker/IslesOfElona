/*******
*	World.js
*	encapsulate a single 'world'
*	leaves out server specific or Phaser specific code to Map and server
******/

if(typeof(module)!=="undefined") var cnf = require('./cnf');



function World( size ) {
	this._model = false;
	this._name = "Test World";
	this._seed = "Test World";
	this._size = size;
	this._id_player = null;
	this._npcs = [];
	this._mapData = [];
	this._current_players = 1;
	this._map = null;
	if(typeof(module) ==="undefined") this._map = new Map(); //only trigger on frontend

}

//random world gen
World.prototype.generate = function(world_name, player, cb){
	this._name = (world_name)?world_name: player._name+"'s World";
	this._seed = this._name; //name can change later seed stays the same
	console.log("Generating world "+this._name+" size "+this._size+" for "+player._username+" : "+typeof(cb));
	//TODO:: actual algorithms and shit
	var player_positioned = false;
	for(var x=0;x<this._size;x++) {
		this._mapData[x] = [];
		for(var y=0; y<this._size;y++) {
			var tile_type = Math.floor(Math.random()*cnf.TILES_MAX );
			this._mapData[x][y] = tile_type;
			if(cnf.tiles[tile_type].passable && player && !player_positioned) {
				player_positioned = true;
				player._pos = [x,y];
			}
		}
	}
	console.log("map generated, triggering cb");
	cb();

};


if(typeof(module)!=="undefined") module.exports = World;