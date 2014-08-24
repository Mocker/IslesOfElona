/*******
*	World.js
*	encapsulate a single 'world'
*	leaves out server specific or Phaser specific code to Map and server
******/

if(typeof(module)!=="undefined") var cnf = require('./cnf');
if(typeof(module)!=="undefined") var SimplexNoise = require('./SimplexNoise');
if(typeof(module)!=="undefined") var NPC = require('./NPC');
if(typeof(module)!=="undefined") var Item = require('./Item');



function World( width, height ) {
	this._model = false;
	this._name = "Test World";
	this._seed = "Test World";
	this._size = width;
	this._width = width;
	this._height = height;
	this._id_player = null;
	this._is_primary = false;
	this._npcs = [];
	this._mapData = [];
	this._mapObjects = []; //tile objects that go above terrain
	this._items = []; //interactable items
	this._current_players = 1;
	this._player_list = {}; //server keep sockets of players connected to this world for messaging
	this._map = null;
	this._spawnPoint = [0,0];
	this._biome = cnf.BIOME_GRASS;
	this._portals = [];
	if(typeof(module) ==="undefined") this._map = new Map(); //only trigger on frontend

}


//random world gen
World.prototype.generate = function(world_name, player, opts, cb){
	this._name = (world_name)?world_name: player._name+"'s World";
	this._seed = this._name; //name can change later seed stays the same
	console.log("Generating world "+this._name+" ["+this._biome+"] size "+this._size+" for "+player._username+" : "+typeof(cb));
	//TODO:: actual algorithms and shit
	if(this._biome===-1) { //pick a random biome
		this._biome = cnf.BIOMES[ Math.floor( Math.random()*cnf.BIOMES.length) ];
	}
	console.log("Generating biome: "+this._biome);

	var Simplex = new SimplexNoise();
	var simplex_jitter = 6; //1-very smooth tiling, higher than 5 or 6 means more erratic

	//make a list of usable tiles based on world biome
	var fill_tiles = [3,4,5];
	var flavor_tiles = [0,1,2,6];
	var tree_tiles = [0,1,2];
	var water_tiles = [7];
	var road_tiles = [8];
	var dirt_tiles = [6];
	if(this._biome==cnf.BIOME_SNOW){
		fill_tiles = [9,10,11];
		tree_tiles = [12];
	} else if(this._biome==cnf.BIOME_DESERT) {
		
	} else if(this._biome==cnf.BIOME_CITY) {

	}

	this.occupiedTiles = {}; //string keys for which tiles are blocked or occupied
	var player_positioned = false;
	for(var x=0;x<this._width;x++) {
		this._mapData[x] = [];
		for(var y=0; y<this._height;y++) {
			var tile_type = 0;
			var rand = (Simplex.noise( (x/this._width)*simplex_jitter/2 , (y/this._height)*simplex_jitter/2 )+1)/2;
			//determine for any special tiles based on biome
			var use_special = 0;
			switch( this._biome ) {
				case cnf.BIOME_GRASS :
					if(rand > 0.9) {
						tile_type = water_tiles[0];
						use_special = 1;
					} else if(rand > 0.65 ) {
						tile_type = Math.floor( ( (rand-0.65)/0.35) *tree_tiles.length );
						tile_type = tree_tiles[tile_type];
						use_special = 1;
					} else if(rand < 0.05) {
						tile_type = dirt_tiles[0];
						use_special = 1;
					}
					break;
				case cnf.BIOME_DESERT :
					
					break;
				case cnf.BIOME_SNOW :
					if(rand > 0.9 ) {
						tile_type = tree_tiles[0];
						use_special = 1;
					} else if (rand > 0.52 && rand < 0.6) {
						tile_type = 13;
						use_special = 1;
					} else if(rand >= 0.6 && rand <= 0.67 ) {
						tile_type = 14;
						use_special = 1;
					}
					break;
				case cnf.BIOME_FOREST :
					break;
				case cnf.BIOME_CITY :
					break;
			}

			if(!use_special) {
				rand = (Simplex.noise( (x/this._width)*simplex_jitter , (y/this._height)*simplex_jitter )+1)/2;
				tile_type = Math.floor( rand*fill_tiles.length );
				tile_type = fill_tiles[tile_type];
			}
			
			if(!cnf.tiles[tile_type]) tile_type = 0;
			this._mapData[x][y] = tile_type;
			if( x > 3 && y > 3 && cnf.tiles[tile_type].passable && player && !player_positioned) {
				player_positioned = true;
				player._pos = [x,y];
			} else if( cnf.tiles[tile_type].passable ) {
				//decide whether to put object on it
				rand = Math.random();
				if(rand > 0.92 ) {
					//rand = (Simplex.noise( (x/this._width)*simplex_jitter , (y/this._height)*simplex_jitter )+1)/2;
					rand = Math.random();
					var block = 0;
					if(rand > 0.8 ) {
						block = 2;
					} else if(rand > 0.6){
						block = 4;
					} else  {
						block = 5;
					}
					this._mapObjects.push({x:x,y:y, i:block,tile_i: cnf.blocks[block].tile_i });
					if(!cnf.blocks[block].passable) this.occupiedTiles[x+','+y] = ['block',this._mapObjects.length-1];
				}
			} else {
				this.occupiedTiles[x+','+y] = ['tile',tile_type];
			}
		}
	}
	console.log("map generated, populating with npcs");

	//TODO:: number and type of npcs should be based on biome and leve. Ie more friendlies in city
	var numNPCS = Math.random()*25+10;
	var foundTile = false; var nX=0; var nY=0; var attempts = 0;
	for(var i=0; i<numNPCS; i++) {
		var nType = Math.floor(Math.random()*cnf.NPC_TYPE_LIST.length);
		foundTile = false;
		attempts = 0;
		while(attempts < 20 && !foundTile) {
			nX = Math.floor(Math.random()*this._width);
			nY = Math.floor(Math.random()*this._height);
			if(!this.occupiedTiles[nX+","+nY] ) {
				foundTile = [nX,nY];
				break;
			} else {
				attempts++;
			}
		}
		if(!foundTile) continue;
		var npc = new NPC( cnf.NPC_TYPE_LIST[nType], foundTile[0], foundTile[1] );
		this._npcs.push(npc);
		this.occupiedTiles[foundTile[0]+','+foundTile[1]] = ['npc', this._npcs.length-1];
	}

	var numPortals = Math.random()*25+12;
	for(i=0;i<numPortals;i++){
		foundTile = false;
		attempts = 0;
		while(attempts < 20 && !foundTile) {
			nX = Math.floor(Math.random()*this._width);
			nY = Math.floor(Math.random()*this._height);
			if(!this.occupiedTiles[nX+","+nY] ) {
				foundTile = [nX,nY];
				break;
			} else {
				attempts++;
			}
		}
		if(!foundTile) continue;
		var portal = new Item('portal', foundTile[0],foundTile[1] );
		if(opts.link_portal && !opts.link_portal.linked) {
			portal._name = 'Portal to '+opts.link_portal.world_name;
			portal._properties.is_explored = true;
			portal._properties.id_world = opts.link_portal.id_world;
			portal._properties.remote_id = opts.link_portal.id_portal;
			opts.link_portal.linked = true;
			this.linked_portal = this._portals.length;
		} else {
			portal._name = 'Mysterious Portal';
			portal._properties.is_explored = false;	
		}
		portal.i = this._portals.length;
		this._portals.push(portal);
		this.occupiedTiles[foundTile[0]+','+foundTile[1]] = ['portal', this._portals.length-1];
	
	}



	if(cb) cb();
};


if(typeof(module)!=="undefined") module.exports = World;