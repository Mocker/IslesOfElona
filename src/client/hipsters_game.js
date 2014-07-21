/***
Hipsters_Game main game loop
***/

CreateGame = function(canvas_id, opts) {
	this._canvasID = canvas_id;
	this._canvasE = document.getElementById(canvas_id);
	this._socket = false;
	this._connected = false;
	this._authenticated = false;

	if(!this._canvasE) {
		alert("Missing canvas!"); return false;
	}
	this._canvasW = $(this._canvasE).width();
	this._canvasH = $(this._canvasE).height();

	this.init = function(){
		this._p = new Phaser.Game(this._canvasW, this._canvasH, Phaser.CANVAS, this._canvasID,{ preload: this.preload, create: this.create, update: this.update} );
		this._socket = io(cnf.ws_server);
		var self = this;
		$('#info_server').html('Connecting..');
		this._socket.on('connect', function(){
			$('#info_server').html('Connected');
			self._connected = true;
			//TODO:: launch login modal
		});
		this._socket.on('connect_error',function(){
			$('#info_server').html('Connect Failed');
			self._socket.disconnect();
		});
		this._socket.on('disconnect',function(){
			$('#info_server').html('Disconnected');
		});
		this._socket.on('alert',function(data){
			console.log("alert",data);
			$('#alert_modal div.msg').html(data);
			$('#alert_modal').modal('show');
		});
	};

	this.preload = function() {
		console.log("Preloading .. ");
	};

	this.create = function() {
		console.log("Game created .. ");
	};

	this.update = function() {
	};

	return this;
};



console.log("hipsters_game.js loaded - yay");
