
//Global config values for client cause i'm lazy like that

var cnf = {
	title : 'Ludum Dare 30',
	ws_server: 'http://10.0.33.34:8001',

	WORLD_SIZE_PLAYER : 100,
	WORLD_SIZE_MAX : 140,
	WORLD_SIZE_MIN : 40,

	BIOME_GRASS 	: 0,
	BIOME_SNOW 		: 1,
	BIOME_DESERT 	: 2,
	BIOME_CITY 		: 3,
	BIOME_FOREST 	: 4,

	TILES_MAX 		: 4,
	TILE_TREE 		: 0,
	TILE_GRASS 		: 1,
	TILE_WATER 		: 2,
	TILE_ROAD 		: 3,

	tiles : [
	    {
	    	i : 0,
	    	name : 'tree',
	    	passable: true,
	    	tile_i: 7
	    },
	    {
	    	i : 0,
	    	name : 'tree1',
	    	passable: true,
	    	tile_i: 8
	    },
	    {
	    	i : 0,
	    	name : 'tree2',
	    	passable: true,
	    	tile_i: 9
	    },
		{
			i : 1,
			name : 'grass',
			passable : true,
			tile_i : 0
		},
		{
			i : 2,
			name : 'grass1',
			passable : true,
			tile_i : 1
		},
		{
			i : 3,
			name : 'grass2',
			passable : true,
			tile_i : 2
		},
		{
	    	i : 0,
	    	name : 'dirt',
	    	passable: true,
	    	tile_i: 38
	    },
		{
			i	: 4,
			name : 'water',
			passable : false,
			tile_i: 170
		},
		{ //8
			i : 5,
			name : 'road',
			passable : true,
			tile_i: 78
		},
		{
			name : 'snow',
			passable : true,
			tile_i : 45
		},
		{
			name : 'snow1',
			passable : true,
			tile_i : 46
		},
		{
			name : 'snow2',
			passable : true,
			tile_i : 47
		},
		{
			name : 'snow_tree',
			passable : false,
			tile_i : 49
		},
		{ //13
			name : 'snow_ice_hole',
			passable : true,
			tile_i : 55
		},
		{ //14
			name : 'snow_ice',
			passable : true,
			tile_i : 60
		}
	],
	blocks : [ //foreground tiles
		{
			name :'stairs',
			passable : true,
			interactable : true,
			destructable : false,
			tile_i : 230
		},
		{
			name :'stairs1',
			passable : true,
			interactable : true,
			destructable : false,
			tile_i : 232
		},
		{
			name :'trap_arrow',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 234
		},
		{
			name :'door_open',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 236
		},
		{ //5
			name :'campfire',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 238
		},
		{ //6
			name :'rock',
			passable : false,
			interactable : false,
			destructable : true,
			tile_i : 568
		}
	]

};


cnf.NPC_ATLAS = {
	frames : {
		npcguy : {
			frame: { x:48, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		npcguy2 : {
			frame: { x:96, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		npcguy3 : {
			frame: { x:144, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		npcgirl : {
			frame: { x:192, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		npcgirl2 : {
			frame: { x:48, y:48, w:48, h:48 },
			rotated: false,
			trimmed: false
		}
	}
};

cnf.NPC_TYPES = {};
cnf.NPC_TYPE_LIST = [];
for(var title in cnf.NPC_ATLAS.frames){
	cnf.NPC_TYPES[title] = cnf.NPC_ATLAS.frames[title];
	cnf.NPC_TYPE_LIST.push(title);
}

cnf.TILES_MAX = cnf.tiles.length;

if(typeof(module)!=="undefined") module.exports = cnf;