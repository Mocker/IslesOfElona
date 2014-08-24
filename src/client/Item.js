/******
*	Item.js
*	a single generic object - used to represent anything aside from npcs,pcs,or map tiles
*****/

function Item(type,x,y) {
	this._type = type;
	this._x = x;
	this._y = y;
	this._name = "Test "+type+" Object";
	this._sprite = null;
	this._properties = {};

	if( typeof(module) === "undefined" ){
		//do phaser things for sprite/spritesheet
	}
}



if(typeof(module)!=="undefined") module.exports = Item;