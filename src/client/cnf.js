
//Global config values for client cause i'm lazy like that

var cnf = {
	title : 'Ludum Dare 30',
	ws_server: 'http://10.0.33.34:8001',

	WORLD_SIZE_PLAYER : 100,
	WORLD_SIZE_MAX : 140,
	WORLD_SIZE_MIN : 40,

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
	    	tile_i: 42
	    },
		{
			i	: 4,
			name : 'water',
			passable : false,
			tile_i: 170
		},
		{
			i : 5,
			name : 'road',
			passable : true,
			tile_i: 78
		}
	]

};

cnf.TILES_MAX = cnf.tiles.length;

if(typeof(module)!=="undefined") module.exports = cnf;