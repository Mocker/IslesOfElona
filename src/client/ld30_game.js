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
	this._primary_world = false;

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
		$('#frm_warp').on('submit', function(evt){
			var warp_id = $('#warp_id').val();
			if(!warp_id || warp_id.length < 10) return;
			self._socket.emit('warp', warp_id);
			showAlert('Requesting warp');
			return false;
		});
		this._socket.on('connect', function(){
			$('#info_server').html('Connected');
			hideSpinner();
			self._connected = true;
			if(!self._world ) $('#login_modal').modal('show');
			else {
				//TODO:: relogin automatically
				console.log("attempting to login automatically");
				self._login_params.id_world = self._world._model._id;
				self._socket.emit('login',self._login_params);
				showSpinner("Reconnecting..");
			}
			console.log('socket connect');
			//$('#login_modal').css('display','block');
		});
		this._socket.on('connect_error',function(){
			$('#info_server').html('Connect Failed');
			showSpinner("Server Disconnected");
			self.playable = false; 
			self._connected = false;
			self._socket.disconnect();
		});
		this._socket.on('disconnect',function(){
			$('#info_server').html('Disconnected');
			showSpinner("Server Disconnected");

		});
		this._socket.on('alert',function(data){
			console.log("alert",data);
			showAlert(data);
		});


		//Notifications about other pc activity
		this._socket.on('pc',function(data){ //pc stats changed
			if(data.name == self._player._username) return;
			console.log('pc',data);
			if( !self._world._player_list[data.name]  ) return;
			if(data.pos){
				self.movePlayerTo(pos[0],pos[1], self._world._player_list[data.name] );
			}
		});
		this._socket.on('pc list', function(plist){ //list of pcs in the same world
			console.log('pc list', plist);
			for(var i in plist) {
				if(plist[i].name==self._player._username) continue;
				var pStyle = {font:"12px Arial", fill:"#ff0044",align:"center"};
				var p = new Player(plist[i].name,'');
				p._pos = plist[i].pos;
				p.sprite = self._p.add.sprite(10,10,'chr1');
				p.sprite.animations.add('walk',[0,1,2,3]);
				p.sprite.animations.add('stand',[0]);
				p.sprite.animations.play('stand', 0);
				p.sprite.animations.add('walk_left',[4,5,6,7]);
				p.sprite.animations.add('walk_right',[8,9,10,11]);
				p.sprite.animations.add('walk_up',[12,13,14,15]);
				p.sprite.anchor.setTo(0.5, 0.5);
				p.sprite.z = 10;
				p.curTile = self.map.getTile(p._pos[0], p._pos[1], 'world');
				p.sprite.x = p.curTile.worldX + (p.sprite.width/2);
				p.sprite.y = p.curTile.worldY + (p.sprite.height/4);
				p.label = self._p.add.text(p.sprite.x,p.curTile.worldY-30,p._username, pStyle);
				p.sprite.bringToTop();
				p.label.bringToTop();
				self._world._player_list[plist[i].name] = p;
			}
		});
		this._socket.on('pc join', function(pl){ //player joined world
			if(pl.name==self._player._username) return;
			console.log('pc join', pl);
				var p = new Player(pl.name,'');
				p._pos = pl.pos;
				p.sprite = self._p.add.sprite(10,10,'chr1');
				p.sprite.animations.add('walk',[0,1,2,3]);
				p.sprite.animations.add('stand',[0]);
				p.sprite.animations.play('stand', 0);
				p.sprite.animations.add('walk_left',[4,5,6,7]);
				p.sprite.animations.add('walk_right',[8,9,10,11]);
				p.sprite.animations.add('walk_up',[12,13,14,15]);
				p.sprite.anchor.setTo(0.5, 0.5);
				p.sprite.z = 10;
				p.curTile = self.map.getTile(p._pos[0], p._pos[1], 'world');
				p.sprite.x = p.curTile.worldX + (p.sprite.width/2);
				p.sprite.y = p.curTile.worldY + (p.sprite.height/4);
				p.label = self._p.add.text(p.sprite.x,p.curTile.worldY-30,p._username, pStyle);
				p.sprite.bringToTop();
				p.label.bringToTop();
				self._world._player_list[pl.name] = p;
				console.log(self._world._player_list);
		});
		this._socket.on('pc leave', function(data){
			if(self._player._username==data.name) return;
			console.log('pc leave', data);
			if(!self._world._player_list[data.name] ) return;
			if( self._world._player_list[data.name].sprite ) self._world._player_list[data.name].sprite.destroy(true);
			delete( self._world._player_list[data.name] );
		});

		this._socket.on('login', function(resp){
			console.log("login response",resp);
			processingLogin = false;
			$('#login_modal').css('display','none');
			$('div.modal-backdrop').css('display','none');
			if(resp.status){
				$('#info_server').html('Logged In');
				
				//logged in with user.. create player object and load zone
				if(!self._player && !self._world) {
					self._player = new Player(self._login_params.user, self._login_params.pwd);
					self._player.setProfile(resp.profile);
					self._player.updateDisplay();
					$('div.right').slideDown();
					self._player.updateDisplay();
					showSpinner("Loading "+self._player._zone); 
				} else {
					hideSpinner();
					self.playable = true;
				}
			} else {
				showAlert(resp.err);
				hideSpinner();
			}
		});

		this._socket.on('world', function(data, newPos){
			if(typeof(data)=="string"){
				data = JSON.parse(data);
			}
			self.playable = false;
			showSpinner("Loading world: "+data._name);
			console.log("Received world data from server!",data, newPos);
			self._world = data;
			self._player._world = data;
			if(data._is_primary && ! self._primary_world) {
				self._primary_world ={ id: data._model._id, name: data._name, pos: newPos };
			}
			$('#info_zone').html(data._name);
			$('#info_zone_id').html(data._model._id);
			$('#login_modal').modal('hide');
			self.loadWorld(newPos);
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
				self.movePlayerTo(data.position[0],data.position[1]);
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
		//self._p.load.image('tileset_world','assets/elona/map0.png');
		self._p.load.image('tileset_map','assets/elona/map1tp.png');
		self._p.load.spritesheet('chr1', 'assets/elona/char1.png',32,48);
		self._p.load.atlasJSONHash('npcs', 'assets/elona/npcs.png', null, cnf.NPC_ATLAS);
		//self._p.load.tilemap('blank_map0','json/blank_map0.json', null, Phaser.Tilemap.TILED_JSON);
	};


	this.create = function() {
		console.log("Game created .. ");
		self.map = self._p.add.tilemap();
		self.map.addTilesetImage('tileset_map', 'tileset_map',48,48);
		self.layer = self.map.create('Intro', 20, 20, 48, 48);
		self.layer.resizeWorld();

		self.npcguy = self._p.add.sprite(200,200,'npcs','npcguy');

		self.sprite = self._p.add.sprite(10,10,'chr1');
		self.sprite.animations.add('walk',[0,1,2,3]);
		self.sprite.animations.add('stand',[0]);
		self.sprite.animations.play('stand', 0);
		self.sprite.animations.add('walk_left',[4,5,6,7]);
		self.sprite.animations.add('walk_right',[8,9,10,11]);
		self.sprite.animations.add('walk_up',[12,13,14,15]);
		self.sprite.anchor.setTo(0.5, 0.5);
		self.sprite.z = 10;
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
		/*
		var spots_max = Math.floor(Math.random()*40+20);
		for(var i=0;i<spots_max;i++){
			var ranX = Math.floor(Math.random()*20);
			var ranY = Math.floor(Math.random()*20);
			var ranT = Math.floor(Math.random()*cnf.TILES_MAX) ;
			var tile = self.map.putTile( cnf.tiles[ranT].tile_i , ranX, ranY, 0);
			tile.properties.i = ranT;
			tile.properties.passable = cnf.tiles[ranT].passable;
		}
		*/
		self._p.camera.follow(self.sprite);
		/* creating a world locally for testing
		self.test_world = new World(60,30);
		self.test_world._biome = cnf.BIOME_SNOW ;
		self.test_world.generate('Test World', self._player, function(err,w){
			console.log('test world generated');
			self._world = self.test_world;
			if(!self._player._pos) self._player._pos = [ 20, 20];
			self.loadWorld( self._player._pos );
		});
		*/
		
	};

	this.update = function() {

	};

	//movement keys
	//TODO:: speed /prevent key spamming. Check for movement modifiers (character is stuck etc)
	this.up = function() {
		if(!self.playable) return;
		var newTile = self.map.getTileAbove(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
		if(isMoved) self.sprite.animations.play('walk_up',3);
	};
	this.down = function() {
		if(!self.playable) return;
		var newTile = self.map.getTileBelow(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
		if(isMoved) self.sprite.animations.play('walk',3);
	};
	this.left = function() {
		console.log("left!");
		if(!self.playable) return;
		var newTile = self.map.getTileLeft(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
		if(isMoved) self.sprite.animations.play('walk_left',3);
	};
	this.right = function() {
		if(!self.playable) return;
		var newTile = self.map.getTileRight(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
		if(isMoved) self.sprite.animations.play('walk_right',3);
	};

	this.render = function() {
		self._p.debug.text("Current Layer: "+self.map.layers[self.map.currentLayer].name, 16, 550);
	};

	//loaded world data from server. Setup tilemaps and display and begin playing..
	this.loadWorld = function(newPos) {
		
		showAlert("World data received - creating display");
		console.log("world data recieived - creating display");
		$('#info_zone').html(self._world._name);
		var world_layer = self.map.getLayer('world');
		wl = self.map.create('world', self._world._mapData.length, self._world._mapData[0].length, 48, 48);
		self._worldlayer = wl;
		world_layer = self.map.getLayer('world');
		wl.resizeWorld();
		
		var tile = null;
		for(var x=0; x<self._world._mapData.length; x++) {
			for(var y=0; y<self._world._mapData[x].length;y++ ) {
				//console.log(self.map._mapData[x][y], cnf.tiles[self.map._mapData[x][y]].tile_i );
				tile = self.map.putTile( cnf.tiles[self._world._mapData[x][y]].tile_i, x, y , 'world' );
				tile.properties.i = self._world._mapData[x][y];
				tile.properties.passable = cnf.tiles[self._world._mapData[x][y]].passable;
			}
		}
		console.log("Creating "+self._world._mapObjects.length+" blocks");
		var block_layer = self.map.createBlankLayer('blocks',self._world._mapData.length, self._world._mapData[0].length,48,48);
		self._blocklayer = block_layer;
		for(var i=0;i<self._world._mapObjects.length;i++) {
			//console.log(self._world._mapObjects[i]);
			tile = self.map.putTile( self._world._mapObjects[i].tile_i, self._world._mapObjects[i].x, self._world._mapObjects[i].y, 'blocks'  );
			tile.properties.i = self._world._mapObjects[i].i;
			if( cnf.blocks[self._world._mapObjects[i].i ] ) {
				tile.properties.passable = cnf.blocks[self._world._mapObjects[i].i ].passable;
				tile.properties.interactable = cnf.blocks[self._world._mapObjects[i].i ].interactable;
			} else { console.log("invalid block", self._world._mapObjects[i]); }
		}


		//self.map.setLayer('world');
		console.log("map layer set");
		//TODO:: load npcs /objects
		for(i=0;i<self._world._npcs.length;i++) {
			var nTile = self.map.getTile(self._world._npcs[i]._x, self._world._npcs[i]._y,'world');
			self._world._npcs[i].curTile = nTile;
			self._world._npcs[i].sprite = self._p.add.sprite( nTile.worldX, nTile.worldY,'npcs', self._world._npcs[i]._type  );
			self._world._npcs[i].sprite.anchor.setTo(0.5,0.5);
			self._world._npcs[i].sprite.y += self._world._npcs[i].sprite.height/4;
			self._world._npcs[i].sprite.x += self._world._npcs[i].sprite.width/2;
		}

		var centerX = Math.floor(self._world._width/2); //TODO:: player pos sent from server
		if(newPos) self.movePlayerTo( newPos[0], newPos[1] );
		else self.movePlayerTo( centerX, Math.floor(self._world._height/2) );
		self.playable = true;
		self._p.camera.follow(self.sprite);
		self.sprite.bringToTop();
		hideSpinner();
		$('#login_modal').modal('hide');
		console.log("loadWorld Finished");
		setTimeout(function(){
			if(!self._player._pos) {
				self._player._pos = [10,10];
				self.curTile = self.map.getTile(10,10,'world');
				self.sprite.x = self.curTile.worldX + (self.sprite.width/2);
				self.sprite.y = self.curTile.worldY + (self.sprite.height/4);

			}
			self.sprite.bringToTop();
			//self.npcguy.bringToTop();
		},100);
	};

	this.movePlayerTo = function(tileX, tileY, pc) {
		var centerTile = self.map.getTile( tileX, tileY, 'world' );
		var blockTile = self.map.getTile( tileX, tileY, 'blocks');
		if(blockTile && !blockTile.properties.passable ) return false;
		console.log(centerTile);
		if( centerTile.properties.passable ===false ) return false;
		$('#info_position').html( tileX+' , '+tileY);
		//TODO:: send move request to server
		if(pc) { //move another player instead of you
			pc._pos = [tileX, tileY];
			pc.curTile = centerTile;
			if(pc.sprite) {
				pc.sprite.x = centerTile.worldX + (pc.sprite.width/2);
				pc.sprite.y = centerTile.worldY + (pc.sprite.height/4);
				pc.sprite.bringToTop();
			}
			if(pc.label){
				pc.label.x = centerTile.worldX + (pc.sprite.width/2);
				pc.label.y = centerTile.worldY-20;
			}
			return true;
		} 
		self._player._pos = [tileX, tileY];
		self.curTile = centerTile;
		self.sprite.x = centerTile.worldX + (self.sprite.width/2);
		self.sprite.y = centerTile.worldY + (self.sprite.height/4);
		self.sprite.bringToTop();

		self._socket.emit('move',[tileX,tileY]);
		return true;
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
