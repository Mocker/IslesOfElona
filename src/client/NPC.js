/******
*	NPC.js
*	a single npc entity
*****/

function NPC(type,x,y) {
	this._type = type;
	this._x = x;
	this._y = y;
	this._name = "Test "+type+" NPC";
	this._health = 100;
	this._attack = 5;
	this._attack_range = 1;
	this._sprite = null;
	this._meta = null;

	if( typeof(module) === "undefined" ){
		//do phaser things for sprite/spritesheet
	}
}



if(typeof(module)!=="undefined") module.exports = NPC;