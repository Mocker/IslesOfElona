
//Global config values for client cause i'm lazy like that

var cnf = {
	title : 'Ludum Dare 30',
	ws_server: 'http://10.0.33.34:8001',


	TILES_MAX 		: 4,
	TILE_TREE 		: 0,
	TILE_GRASS 		: 1,
	TILE_WATER 		: 2,
	TILE_ROAD 		: 3,

	tiles : [
	    {
	    	i : 0,
	    	name : 'tree',
	    	passable: false,
	    	tile_i: 7
	    },
		{
			i : 1,
			name : 'grass',
			passable : true,
			tile_i : 0
		},
		{
			i	: 2,
			name : 'water',
			passable : false,
			tile_i: 10
		},
		{
			i : 3,
			name : 'road',
			passable : true,
			tile_i: 20
		}
	]

};


if(typeof(module)!=="undefined") module.exports = cnf;