/****
*	Player.JS
*   representation of a single player
****/
var playerCount = 0;



function Player( username, password) {
	this._username = username;
	this._password = password;
	this._created = new Date().getTime();
	this._socket = false;
	this._zone = 'login';
	this._world = 'login';
	this._pos = [0,0];
	this._health = 100;
	this._vel = [0,0];
	this._anim = "standing";
	this._bag = [];
	this._equip = {};
	this._model = false; //use on server to store db reference

	playerCount++;
	var self = this;

}

Player.prototype.playerCount = function(){
	return playerCount;
};

Player.prototype.login = function(password) {
		if(password != this._password) return false;
		return true;
	};

Player.prototype.setSocket = function(sock) {
	this._socket = sock;
};


Player.prototype.getProfile = function() {
	return {
		username: this._username,
		health: this._health,
		vel: this._vel,
		bag: this._bag,
		equip: this._equip,
		zone: this._zone,
		//world: this._world,
		pos: this._pos,
		created: this._created
	};
};
Player.prototype.setProfile = function (p) {
	this._username = p.username;
	this._health = p.health;
	this._vel = p.vel;
	this._equip = p.equip;
	this._zone = p.zone;
	this._pos = p.pos;
	this._created = p.created;
	this._world = p.world;
};

//update client player display
Player.prototype.updateDisplay = function() {
	console.log("display for ",this);
	$('#info_username').html(this._username);
	$('#info_zone').html(this._zone + " ["+this._pos[0]+","+this._pos[1]+"]");
	$('#info_health').html(this._health);
};


Player.prototype.sendPing = function() {
	this._startPing = new Date().getTime();
	//console.log("startPing: "+this._startPing);
	this._socket.emit('ping',{});
};
Player.prototype.receivePing = function() {
	this._endPing = new Date().getTime();
	this._latency = this._endPing - this._startPing;
	//console.log("endPing:"+this._endPing);
	//console.log("User "+this._username+" latency: "+this._latency+"\n");
	if(this._socket) this._socket.emit('info',{latency: this._latency});
};

if(typeof(module)!=="undefined") module.exports = Player;