/*****
* Map.js
* phaser/frontend specific for handling map data and tiles
*****/


function Map( mapData ) {
	this._data = mapData;
}


if(typeof(module)!=="undefined") module.exports = Map;