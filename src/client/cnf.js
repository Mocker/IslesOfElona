
//Global config values for client cause i'm lazy like that

var cnf = {
	title : 'Ludum Dare 30',
	ws_server: 'http://10.0.33.34:8001',

	WORLD_SIZE_PLAYER : 60,
	WORLD_SIZE_MAX : 100,
	WORLD_SIZE_MIN : 40,

	BIOME_GRASS 	: 0,
	BIOME_SNOW 		: 1,
	BIOME_DESERT 	: 2,
	BIOME_CITY 		: 3,
	BIOME_FOREST 	: 4,
	BIOME_LAVA		: 5,
	

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
	    { //2
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
		{ //5
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
		},
		{
			name : 'water_light',
			passable : false,
			tile_i : 166
		},
		{   name : 'shore_left1',
			passable : false,
			tile_i : 309
		},
		{ //17
			name : 'sand',
			passable : true,
			tile_i : 19
		},
		{ //18
			name : 'lava',
			passable : false,
			tile_i : 562
		},
		{
			name : 'lava2',
			passable : false,
			tile_i : 563
		},
		{ //20
			name : 'slate',
			passable : true,
			tile_i : 560
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
		{ //2
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
		{ //4
			name :'campfire',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 238
		},
		{ //5
			name :'rock',
			passable : false,
			interactable : false,
			destructable : true,
			tile_i : 568
		},
		{ //6
			name :'plant_tiny',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 248
		},
		{ //7
			name :'plant_med',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 249
		},
		{ //8
			name :'plant_large',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 250
		},
		{ //9
			name :'snow_log',
			passable : true,
			interactable : true,
			destructable : true,
			tile_i : 668
		},
		{ //10
			name :'snow_rock',
			passable : false,
			interactable : true,
			destructable : true,
			tile_i : 670
		}
	]

};



cnf.NPC_ATLAS = {
	frames : {
		portal : {
			frame: { x:768, y:1008, w:48, h:96 },
			rotated: false,
			trimmed: false,
			is_portal : true
		},
		portal2 : {
			frame: { x:816, y:1008, w:48, h:96 },
			rotated: false,
			trimmed: false,
			is_portal : true
		},
		portal3 : {
			frame: { x:864, y:1008, w:48, h:96 },
			rotated: false,
			trimmed: false,
			is_portal : true
		},
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
		},
		bloodspurt : {
			frame : { x:53, y:1160, w:38, h:40 },
			rotated: false,
			trimmed: false,
			not_npc: true
		},
		ghoul : {
			frame: {x:288,y:240, w:48, h:48},
			rotated : false,
			trimmed: false,
			hostile : true,
			base_health : 50,
			speed : 2,
			chase_distance : 10
		},
		blobbit : {
			frame : {x:144, y:240, w:48, h:48},
			rotated: false,
			trimmed: false,
			hostile : true,
			base_health : 10,
			speed : 4,
			chase_distance : 10
		},
		eye : {
			frame: {x:430, y:288, w:48, h:48 },
			rotated: false,
			trimmed: false,
			hostile: true,
			flying : true,
			speed : 4,
			base_health : 15,
			chase_distance : 15
		}

	}
};

cnf.BIOMES  = [ //list of possible biomes. repeated means more likely to get picked at random
		cnf.BIOME_GRASS, cnf.BIOME_GRASS,cnf.BIOME_GRASS,
		cnf.BIOME_SNOW,  cnf.BIOME_SNOW,
		cnf.BIOME_FOREST, cnf.BIOME_FOREST,
		cnf.BIOME_DESERT,
		cnf.BIOME_LAVA
	];

cnf.NPC_TYPES = {};
cnf.NPC_TYPE_LIST = [];
for(var title in cnf.NPC_ATLAS.frames){
	if(title=='portal'||title=='portal2'||title=='portal3') continue;
	if(cnf.NPC_ATLAS.frames[title].not_npc) continue;
	cnf.NPC_TYPES[title] = cnf.NPC_ATLAS.frames[title];
	cnf.NPC_TYPE_LIST.push(title);
}

cnf.ITEM_ATLAS = {
	frames : {
		longstick : {
			frame: { x:48, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		bullet : {
			frame: { x:96, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		waterwisp : {
			frame: { x:144, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		purplesplash : {
			frame: { x:192, y:0, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		dagger : {
			frame: {x:144, y:624, w:40, h:40 },
			rotated: false,
			trimmed: false
		},
		heartgem : {
			frame: {x:98, y:48, w:48, h:48 },
			rotated: false,
			trimmed: false
		},
		antlertrophy: {
			frame: {x:768, y:768, w:48, h:48},
			rotated: false,
			trimmed: false
		}
	}
};
cnf.ITEM_TYPES = {};
cnf.ITEM_TYPE_LIST = [];
for(var title in cnf.ITEM_ATLAS.frames){
	cnf.ITEM_TYPES[title] = cnf.ITEM_ATLAS.frames[title];
	cnf.ITEM_TYPE_LIST.push(title);
}


cnf.TILES_MAX = cnf.tiles.length;

if(typeof(module)!=="undefined") module.exports = cnf;