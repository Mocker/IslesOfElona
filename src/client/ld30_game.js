/***
Hipsters_Game main game loop
***/

CreateGame = function(canvas_id, opts) {
	this._canvasID = canvas_id;
	this._canvasE = document.getElementById(canvas_id);
	this._socket = false;
	this._connected = false;
	this._authenticated = false;
	this._zone = false;
	this._world = false;
	this._player = false;

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
			hideSpinner();
			self._connected = true;
			//TODO:: launch login modal
			$('#login_modal').modal('show');
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
			showAlert(data);
		});

		this._socket.on('login', function(resp){
			console.log("login response",resp);
			processingLogin = false;
			if(resp.status){
				$('#info_server').html('Logged In');
				$('#login_modal').modal('hide');
				//logged in with user.. create player object and load zone
				self._player = new Player(self._login_params.user, self._login_params.pwd);
				self._player.setProfile(resp.profile);
				self._player.updateDisplay();
				$('div.right').slideDown();
				self._player.updateDisplay();
				showSpinner("Loading "+self._player._zone);
			} else {
				showAlert(resp.err);
				hideSpinner();
			}
		});
		this._socket.on('ping',function(){
			//console.log("ping!");
			self._socket.emit('ping');
		});
		this._socket.on('info',function(data){
			//console.log("info!",data);
			if( typeof(data.latency)!="undefined"){
				$("#info_latency").html(data.latency+"ms");
			}
			if( typeof(data.position)!="undefined"){
				$("#info_position").html("x:"+data.position[0]+" y:"+data.position[1]);
				//todo:: update position of player on world map
			}
			if( typeof(data.zone) != "undefined" ){
				$('#info_zone').html(data.zone);
				//todo:: change zones for map
			}
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


	this.doLogin = function(params) {
		if(!self._connected){
			console.log("Cant login not connected"); return;
		}
		showSpinner("Logging In..");
		self._login_params = params;
		self._socket.emit('login',params);
	};


	return this;
};



console.log("hipsters_game.js loaded - yay");


function showAlert(msg) {
	$('#alert_modal div.msg').html(msg);
	$('#alert_modal').modal('show');
}