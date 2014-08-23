/******
*	NPC.js
*	a single npc entity
*****/

function NPC(type,x,y) {
	this._type = type;
	this._x = x;
	this._y = y;
	this._name = "Test "+type+" NPC";
	this._sprite = null;

	if( typeof(module) === "undefined" ){
		//do phaser things for sprite/spritesheet
	}
}



if(typeof(module)!=="undefined") module.exports = NPC;