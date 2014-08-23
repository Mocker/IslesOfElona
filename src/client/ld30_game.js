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
	if(!this._canvasH) this._canvasH = 500;

	this.init = function(){
		this._p = new Phaser.Game(this._canvasW, this._canvasH, Phaser.CANVAS, this._canvasID,{ preload: this.preload, create: this.create, update: this.update, render: this.render} );
		this._socket = io(cnf.ws_server);
		var self = this;
		$('#info_server').html('Connecting..');
		$('#frm_msg').on('submit',function(evt){ 
			console.log("form submitted! ",self.send_msg);
			self.send_msg() ;
			return false;
		});
		this._socket.on('connect', function(){
			$('#info_server').html('Connected');
			hideSpinner();
			self._connected = true;
			$('#login_modal').modal('show');
		});
		this._socket.on('connect_error',function(){
			$('#info_server').html('Connect Failed');
			self._connected = false;
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

		this._socket.on('world', function(data){
			console.log("Received world data from server!",data);
			$('#login_modal').modal('hide');
			self._world = data;
			self._player._world = data;
			$('#info_zone').html(data._name);
			self.loadWorld();
		});

		this._socket.on('chat message',function(msg){
			self.received_msg(msg.user,msg.msg);
		});

		this._socket.on('player login', function(user){
			self.received_msg('System',user+' has logged in');
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

	this.received_msg = function(user, msg) {
		console.log("received chat", msg);
		var html = '<li style="float:left; width:100%;"><div style="float:left;max-width: 80px; font-weight: bold; margin-right: 5px; overflow-x:hidden;">';
		html += user + "</div><div style='float:left;max-width:120px;overflow-x:wrap;'>"+msg+"</div></li>";
		$('#chat_messages').append(html);
		$('#chat_div').scrollTop( $('#chat_messages').height() );
	};

	this.send_msg = function(){
		var txt = $('#msg').val();
		if(!txt || txt.length < 2) return;
		if(!self._socket || !self._connected) return;
		console.log("sending msg",txt);
		self._socket.emit('chat message', txt);
	};

	this.preload = function() {
		console.log("Preloading .. ");
		self._p.load.image('tileset_world','assets/elona/map0.png');
		self._p.load.image('tileset_map','assets/elona/map1.png');
		self._p.load.spritesheet('chr1', 'assets/elona/char1.png',32,48);
		//self._p.load.tilemap('blank_map0','json/blank_map0.json', null, Phaser.Tilemap.TILED_JSON);
	};

	this.create = function() {
		console.log("Game created .. ");
		self.map = self._p.add.tilemap();
		self.map.addTilesetImage('tileset_map', 'tileset_map',48,48);
		self.layer = self.map.create('Intro', 20, 20, 48, 48);
		self.layer.resizeWorld();

		self.sprite = self._p.add.sprite(10,10,'chr1');
		self.sprite.animations.add('walk',0,4);
		self.sprite.animations.add('stand',0);
		self.sprite.animations.play('stand', 1);
		
		//self.sprite.anchor.setTo(0.5, 0.5);
		//self._p.physics.enable(self.sprite);
		//self._p.camera.follow(self.sprite);
		console.log("sprite created", self.sprite);

		self.cursors = self._p.input.keyboard.createCursorKeys();
		//self._p.input.keyboard.addKeyCapture([ Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.DOWN, Phaser.Keyboard.UP]);
		self.cursors.left.onDown.add(self.left);
		self.cursors.up.onDown.add(self.up);
		self.cursors.down.onDown.add(self.down);
		self.cursors.right.onDown.add(self.right);
		self.playable = true;
		self.layer.debug = true;
		self.map.fill(0,0,0,20,20,self.map.currentLayer);
		var spots_max = Math.floor(Math.random()*40+20);
		for(var i=0;i<spots_max;i++){
			var ranX = Math.floor(Math.random()*20);
			var ranY = Math.floor(Math.random()*20);
			var ranT = Math.floor(Math.random()*cnf.TILES_MAX) ;
			var tile = self.map.putTile( cnf.tiles[ranT].tile_i , ranX, ranY, 0);
			tile.properties.i = ranT;
			tile.properties.passable = cnf.tiles[ranT].passable;
		}
		console.log("Intro tiles filled");
		self.movePlayerTo(10,10);
		self._p.camera.follow(self.sprite);
	};

	this.update = function() {

	};

	//movement keys
	//TODO:: speed /prevent key spamming. Check for movement modifiers (character is stuck etc)
	this.up = function() {
		if(!self.playable) return;
		var newTile = self.map.getTileAbove(self.map.currentLayer, self.curTile.x, self.curTile.y );
		if(newTile) self.movePlayerTo(newTile.x, newTile.y);
	};
	this.down = function() {
		if(!self.playable) return;
		var newTile = self.map.getTileBelow(self.map.currentLayer, self.curTile.x, self.curTile.y );
		if(newTile) self.movePlayerTo(newTile.x, newTile.y);
	};
	this.left = function() {
		console.log("left!");
		if(!self.playable) return;
		var newTile = self.map.getTileLeft(self.map.currentLayer, self.curTile.x, self.curTile.y );
		if(newTile) self.movePlayerTo(newTile.x, newTile.y);
	};
	this.right = function() {
		if(!self.playable) return;
		var newTile = self.map.getTileRight(self.map.currentLayer, self.curTile.x, self.curTile.y );
		if(newTile) self.movePlayerTo(newTile.x, newTile.y);
	};

	this.render = function() {
		self._p.debug.text("Current Layer: "+self.map.layers[self.map.currentLayer].name, 16, 550);
	};

	//loaded world data from server. Setup tilemaps and display and begin playing..
	this.loadWorld = function() {
		showAlert("World data received - creating display");
		$('#login_modal').modal('hide');
		var world_layer = self.map.getLayer('world');
		if(world_layer===null) {
			wl = self.map.create('world', self._world._size, self._world._size, 48, 48);
			world_layer = self.map.getLayer('world');
		}
		for(var x=0; x<self.map._mapData.length; x++) {
			for(var y=0; y<self.map._mapData[x].length;y++ ) {
				console.log(self.map._mapData[x][y], cnf.tiles[self.map._mapData[x][y]].tile_i );
				self.map.putTile( cnf.tiles[self.map._mapData[x][y]].tile_i, x, y , 'world' );
			}
		}
		self.map.setLayer('world');

		var centerX = Math.floor(self._world._size/2);
		self.movePlayerTo( centerX, centerY );
		self.playable = true;
	};

	this.movePlayerTo = function(tileX, tileY) {
		var centerTile = self.map.getTile( tileX, tileY, self.map.currentLayer );
		console.log(centerTile);
		if( centerTile.properties.passable ===false ) return false;
		//TODO:: send move request to server
		self.curTile = centerTile;
		self.sprite.x = centerTile.worldX + (self.sprite.width/2);
		self.sprite.y = centerTile.worldY + (self.sprite.height/2);
	};


	this.doLogin = function(params) {
		if(!self._connected){
			console.log("Cant login not connected"); return;
		}
		showSpinner("Logging In..");
		self._login_params = params;
		self._socket.emit('login',params);
	};


	return self;
};



console.log("ld30 game loaded - yay");


function showAlert(msg) {
	$('#alert_modal div.msg').html(msg);
	$('#alert_modal').modal('show');
}