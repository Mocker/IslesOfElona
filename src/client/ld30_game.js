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
	this._player_list = {}; //active players on the same map
	this._local = false;
	this._uisprites = {};

	if(!this._canvasE) {
		alert("Missing canvas!"); return false;
	}
	this._canvasW = $(this._canvasE).width();
	this._canvasH = $(this._canvasE).height();
	if(!this._canvasH) this._canvasH = 500;

	this.init = function(){
		this._p = new Phaser.Game(this._canvasW, this._canvasH, Phaser.CANVAS, this._canvasID,{ preload: this.preload, create: this.create, update: this.update, render: this.render} );
		this._socket = io(web_cnf.ws_server);
		this.ui = new UI(this);
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

		$('#btn_home').on('click',function(){
			if(!self.playable) return;
			//warp home
			self._socket.emit('warp','home');
			self.showSpinnner("Requesting warp home");
			self.playable = false;
			return false;
		});

		this._socket.on('connect', function(){
			$('#info_server').html('Connected');
			hideSpinner();
			self._connected = true;
			if(!self._local) {
				if(!self._world ) $('#login_modal').modal('show');
				else {
					//TODO:: relogin automatically
					console.log("attempting to login automatically");
					self._login_params.id_world = self._world._model._id;
					//self._socket.emit('login',self._login_params);
					showSpinner("Reconnecting..");
				} 
				console.log('socket connect');
			}
			//$('#login_modal').css('display','block');
		});
		this._socket.on('connect_error',function(){
			console.log("Connect Error!");
			$('#info_server').html('Connect Failed');
			showSpinner("Server Disconnected");
			self.playable = false; 
			self._connected = false;
			//self._socket.disconnect();
		});
		this._socket.on('disconnect',function(){
			console.log("Server Disconnected!");
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
			if( !self._player_list[data.name]  ) return;
			if(data.pos){
				console.log("calling movePlayerTo");
				self.movePlayerTo(data.pos[0], data.pos[1], data.name  );
			}
		});
		this._socket.on('pc list', function(plist){ //list of pcs in the same world
			console.log('pc list', plist);
			self.loadPlayers(plist);
			

		});
		this._socket.on('pc join', function(pl){ //player joined world
			if(pl.name==self._player._username||1 ) return;
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
				p.label = self._p.add.text(p.sprite.x,p.curTile.worldY-30,p._username, pStyle, self.spriteGroup);
				p.sprite.bringToTop();
				p.label.bringToTop();
				//self._player_list[pl.name] = p;
				console.log(self._player_list);
		});
		this._socket.on('pc leave', function(data){
			if(self._player._username==data.name) return;
			console.log('pc leave', data);
			if(!self._player_list[data.name] ) return;
			if( self._player_list[data.name].sprite ) self._player_list[data.name].sprite.destroy(true);
			delete( self._player_list[data.name] );
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
					console.log("player profile set",resp.profile);
					self._player.updateDisplay();
					$('div.right').slideDown();
					self._player.updateDisplay();
					showSpinner("Loading "+self._player._zone); 
				} else {
					console.log("Reconnected");
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

		//npc action
		this._socket.on('npc', function(data){
			//console.log("npc move!",data);
			if( !self._world._npcs[ data[0] ] ) return;

			if(data.length>1 && data[1]=='move') {
				
				var curTile = self.map.getTile(data[2],data[3],'world');
				//self._world._npcs[data[0]].tween = self._p.add.tween(self._world._npcs[data[0]] ).to({x: curTile.worldX+24, y: curTile.worldX+24}, 1000, Phaser.Easing.Quadratic);
				var oc = self._world.occupiedTiles[ self._world._npcs[data[0]]._x+','+self._world._npcs[data[0]]._y];
				delete(self._world.occupiedTiles[ self._world._npcs[data[0]]._x+','+self._world._npcs[data[0]]._y]);
				self._world._npcs[data[0]].sprite.x = curTile.worldX+10;
				self._world._npcs[data[0]].sprite.y = curTile.worldY+10;
				self._world._npcs[data[0]]._x = data[2];
				self._world._npcs[data[0]]._y = data[3];
				self._world._npcs[data[0]].curTile = curTile;
				self._world.occupiedTiles[ self._world._npcs[data[0]]._x+','+self._world._npcs[data[0]]._y] = oc;
			} else if(data.length>1 && data[1]=='kill') {
				//killed npc!
				console.log("npc killed!",data);
				var npcTile = self._world._npcs[data[0]].curTile;
				var em = self._p.add.emitter(npcTile.worldX+npcTile.width/2, npcTile.worldY+npcTile.height/2, 30);
				em.makeParticles('npcs',['bloodspurt'],50);
				em.maxParticleSpeed = 22.5;
				em.start(true,1000);
				self._player._kills++;
				self._world._npcs[data[0]].sprite.destroy();
				self._world._npcs[data[0]] = null;
				delete(self._world.occupiedTiles[npcTile.x+','+npcTile.y]);
				//self.uisprites.trophy_text.destroy();
				//self.uisprites.trophy_text = self._p.add.text(440,20,''+self._player._kills,{font:'20px Arial', fill:'#ff3333'});
				self.ui.updateGame(self._player);

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
				self.movePlayerTo(data.position[0],data.position[1]);
			}
			if( typeof(data.zone) != "undefined" ){
				$('#info_zone').html(data.zone);
				//todo:: change zones for map
			}
		});
		this._socket.on('player update',function(data){
			console.log("player update",data);
			for(var k in data){
				self._player[k] = data[k];
			}
			//UPDATE PLAYER DISPLAY
		});
	};

	this.updatePlayerUI = function() {
		//update player health, stats, kills display with current
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
		self._p.load.atlasJSONHash('items', 'assets/elona/items.png', null, cnf.ITEM_ATLAS);
		//self._p.load.tilemap('blank_map0','json/blank_map0.json', null, Phaser.Tilemap.TILED_JSON);
	};


	this.create = function() {
		console.log("Game created .. ");
		self.mapGroup = self._p.add.group(undefined,'map');
		self.spriteGroup = self._p.add.group(undefined,'sprites');
		self.map = self._p.add.tilemap();
		self.map.addTilesetImage('tileset_map', 'tileset_map',48,48);
		self._worldLayer = self.map.create('world', 60, 60, 48, 48);
		self._worldLayer.resizeWorld();
		//self._blockLayer = self.map.createBlankLayer('blocks', 60,60,48,48);

		self.npcguy = self._p.add.sprite(200,200,'npcs','npcguy');

		self.sprite = self._p.add.sprite(10,10,'chr1');
		//self.spriteGroup.add(self.sprite);
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
		self.cursors.space = self._p.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		self.cursors.enter = self._p.input.keyboard.addKey(Phaser.Keyboard.ENTER);
		//self._p.input.keyboard.addKeyCapture([ Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.DOWN, Phaser.Keyboard.UP]);
		self.cursors.left.onDown.add(self.left);
		self.cursors.up.onDown.add(self.up);
		self.cursors.down.onDown.add(self.down);
		self.cursors.right.onDown.add(self.right);
		self.cursors.enter.onDown.add(self.space);
		self.cursors.space.onDown.add(self.space);
		//self.playable = true;
		self.map.fill(0,0,0,60,60,self.map.currentLayer);
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
		/* creating a world locally for testing */
		if(self._local) {
			self.test_world = new World(60,30);
			self.test_world._biome = -1 ;
			self.test_world.generate('Test World', self._player, function(err,w){
				console.log('test world generated');
				self._world = self.test_world;
				if(!self._player._pos) self._player._pos = [ 20, 20];
				self.loadWorld( self._player._pos );
			});
		}

		self.ui.addGameUI();
		
		
		
	};

	this.update = function() {

	};

	//movement keys
	//TODO:: speed /prevent key spamming. Check for movement modifiers (character is stuck etc)
	this.up = function() {
		if(self.menuOpen) { self.ui.keyPress('up'); return;}
		if(!self.playable) return;
		self.sprite.animations.play('walk_up',3);
		self._player._facing = "up";
		var newTile = self.map.getTileAbove(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
		
	};
	this.down = function() {
		if(self.menuOpen) { self.ui.keyPress('down'); return;}
		if(!self.playable) return;
		self.sprite.animations.play('walk',3);
		self._player._facing = "down";
		var newTile = self.map.getTileBelow(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
		
	};
	this.left = function() {
		if(self.menuOpen) { self.ui.keyPress('left'); return;}
		if(!self.playable) return;
		self.sprite.animations.play('walk_left',3);
		self._player._facing = "left";
		var newTile = self.map.getTileLeft(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
	};
	this.right = function() {
		if(self.menuOpen) { self.ui.keyPress('right'); return;}
		if(!self.playable) return;
		self.sprite.animations.play('walk_right',3);
		self._player._facing = "right";
		var newTile = self.map.getTileRight(0, self.curTile.x, self.curTile.y );
		var isMoved = false;
		if(newTile) isMoved = self.movePlayerTo(newTile.x, newTile.y);
	};
	this.space = function(){
		if(self.menuOpen){ self.ui.keyPress('space'); return; }
		if(!self.playable) return;
		//Attack the darkness!
		var attackTile = false;
		if(self._player._facing=='up'){
			attackTile = self.getTiles(self._player._pos[0], self._player._pos[1]-1);
		} else if(self._player._facing=='down') {
			attackTile = self.getTiles(self._player._pos[0], self._player._pos[1]+1);
		} else if( self._player._facing=='left') {
			attackTile = self.getTiles(self._player._pos[0]-1, self._player._pos[1]);
		} else if( self._player._facing=='right') {
			attackTile = self.getTiles(self._player._pos[0]+1, self._player._pos[1]);
		}
		if(attackTile===false || attackTile.length < 2) return; //invalid tile or nothing there worth attacking
		//calculate attack and send to server!
		var oc = attackTile[1];
		if(attackTile[1][0]=='npc') {
			var em = self._p.add.emitter(attackTile[0].worldX+attackTile[0].width/2, attackTile[0].worldY+attackTile[0].height/2, 30);
			em.makeParticles('npcs',['bloodspurt']);
			em.maxParticleSpeed = 12.5;
			em.start(true,1000,3);
			var npc = self._world._npcs[oc[1]];
			npc._meta.hostile = true;
			if(npc && !npc.lbl) {
				npc.lbl = self._p.add.text(npc.sprite.x-10,npc.sprite.y-35,"Ouch!",{font:'16px Arial',fill:'#330000'},self.spriteGroup);
				setTimeout(function(){
					npc.lbl.destroy();
					npc.lbl = false;
				},1000);
			}
			npc._health -= self._player._attack;
			self._socket.emit('attack',oc[1]);
		}
	};

	this.render = function() {
		self._p.debug.text("Current Layer: "+self.map.layers[self.map.currentLayer].name, 16, 550);
	};

	//loaded world data from server. Setup tilemaps and display and begin playing..
	this.loadWorld = function(newPos) {
		
		showAlert("World data received - creating display");
		console.log("world data recieived - creating display",newPos);
		$('#info_zone').html(self._world._name);
		//var world_layer = self.map.getLayer('world');
		var wl = self.map.create('world', self._world._mapData.length, self._world._mapData[0].length, 48, 48);
		self._worldlayer = wl;
		//wl.data = [];
		//wl.width = self._world._mapData.
		//world_layer = self.map.getLayer('world');
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
		//var block_layer = self.map.getLayer('blocks');
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
		var nTile = null;
		for(i=0;i<self._world._npcs.length;i++) {
			if(!self._world._npcs[i]) continue; //null spot for killed npc
			nTile = self.map.getTile(self._world._npcs[i]._x, self._world._npcs[i]._y,'world');
			self._world._npcs[i].curTile = nTile;
			self._world._npcs[i].sprite = self._p.add.sprite( nTile.worldX, nTile.worldY,'npcs', self._world._npcs[i]._type );
			self._world._npcs[i].sprite.anchor.setTo(0.5,0.5);
			self._world._npcs[i].sprite.y += self._world._npcs[i].sprite.height/4;
			self._world._npcs[i].sprite.x += self._world._npcs[i].sprite.width/2;
			self._world.occupiedTiles[nTile.x+','+nTile.y]=['npc',i];
		}
		//build portal sprites
		for(i=0;i<self._world._portals.length;i++) {
			nTile = self.map.getTile(self._world._portals[i]._x, self._world._portals[i]._y,'world');
			self._world._portals[i].curTile = nTile;
			self._world._portals[i].sprite = self._p.add.sprite( nTile.worldX, nTile.worldY,'npcs' );
			self._world._portals[i].sprite.animations.add('bzz',['portal','portal2', 'portal3','portal2'],(Math.random()*8+2), true);
			self._world._portals[i].sprite.animations.play('bzz');
			self._world._portals[i].sprite.anchor.setTo(0.5,0.5);
			//self._world._portals[i].sprite.y += self._world._portals[i].sprite.height/4;
			self._world._portals[i].sprite.x += self._world._portals[i].sprite.width/2;
			self._world.occupiedTiles[nTile.x+','+nTile.y] = ['portal',i];
		}

		var centerX = Math.floor(self._world._width/2); //TODO:: player pos sent from server
		if(newPos) self.movePlayerTo( newPos[0], newPos[1], null, true );
		else self.movePlayerTo( centerX, Math.floor(self._world._height/2) );
		self.playable = true;
		self._p.camera.follow(self.sprite);
		//self.sprite.bringToTop();
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
			self.curTile = self.map.getTile(self._player._pos[0],self._player._pos[1],'world');
			self.movePlayerTo(self._player._pos[0], self._player._pos[1]);
			self.sprite.bringToTop();
			for(var c=0;c<self.spriteGroup.children.length;c++){
				self.spriteGroup.bringToTop(self.spriteGroup.children[c]);
			}
			self.ui.updateGame(self._player);
			//self.npcguy.bringToTop();
		},100);
	};

	this.movePlayerTo = function(tileX, tileY, pc, forceIt) {
		console.log("movePlayerTo",tileX, tileY, pc, forceIt);
		var centerTile = self.map.getTile( tileX, tileY, 'world' );
		var blockTile = self.map.getTile( tileX, tileY, 'blocks');
		if( !forceIt && blockTile && !blockTile.properties.passable ) return false;
		console.log("centerTile",centerTile);
		if( !forceIt && centerTile.properties.passable ===false ) return false;

		if(!pc && !forceIt && (!self.curTile || ( self._world.occupiedTiles[tileX+','+tileY] && self._world.occupiedTiles[tileX+','+tileY][0]!='pc') ) ){
			var oc = self._world.occupiedTiles[tileX+','+tileY];
			console.log("Tile occupied", oc);
			if(oc[0]=='npc'){ //silly blood effects
				if(self._world._npcs[oc[1]] && !self._world._npcs[oc[1]]._meta.hostile) {
					var oof = self._p.add.text( centerTile.worldX, centerTile.worldY-20, 'Oof!', {font:'16px Arial', fill:'#000000'});
					setTimeout(function(){
						oof.destroy();
					},1000);
				}
			} else if(oc[0]=='portal') {
				var portal = self._world._portals[oc[1]];
				var m = {
					header : portal._name,
					msg : 'This portal leads to another world which may be dangerous but also full of wonders. Step through at your own peril',
					menu : [
						{txt:'Step Away'},
						{txt:'Bravely Pass Through', cb: function(){
							self.activatePortal(oc[1]);	
						} }
					]
				};
				console.log("showing portal menu");
				self.ui.showMenu(m);
			}
			return false;
		} 

		
		//TODO:: send move request to server
		if(pc) { //move another player instead of you
			if(self._player_list[pc] ) {
				pc = self._player_list[pc];
			} else {
				var plist = [ {name:pc, pos:[tileX,tileY] } ];
				self.loadPlayers(plist);
				return;
			}
			pc._pos = [tileX, tileY];
			pc.curTile = centerTile;
			if(pc.sprite) {
				pc.sprite.x = centerTile.worldX + (pc.sprite.width/2);
				pc.sprite.y = centerTile.worldY + (pc.sprite.height/4);
				//pc.sprite.bringToTop();
			}
			if(pc.label){
				pc.label.x = centerTile.worldX + (pc.sprite.width/2);
				pc.label.y = centerTile.worldY-20;
			}
			return true;
		}
		$('#info_position').html( tileX+' , '+tileY);
		self._player._pos = [tileX, tileY];
		self.curTile = centerTile;
		self.sprite.x = centerTile.worldX + (self.sprite.width/2);
		self.sprite.y = centerTile.worldY + (self.sprite.height/4);
		//self.sprite.bringToTop();

		self._socket.emit('move',[tileX,tileY]);
		return true;
	};

	this.activatePortal = function( portal_i ) {
		if(!self._world._portals[portal_i]){
			showAlert("Unable to find portal "+portal_i+"!");
			self.ui.closeMenu();
		}
		console.log("load world! ",self._world._portals[portal_i]);
		showSpinner("Activating World Portal");
		self.ui.closeMenu();
		self.playable = false;
		var params = {portal_i:portal_i};
		if( self._world._portals[portal_i]._properties.is_explored ) {
			params.id_world = self._world._portals[portal_i]._properties.id_world;
			params.portal_to = self._world._portals[portal_i]._properties.remote_id;
		}
		self._socket.emit('warp',params);
	};


	this.doLogin = function(params) {
		if(!self._connected){
			console.log("Cant login not connected"); return;
		}
		showSpinner("Logging In..");
		self._login_params = params;
		self._socket.emit('login',params);
	};

	this.loadPlayers = function(plist) {
		self.clearPlayerSprites();
		console.log("loadPlayers sprites cleared");
		for(var i in plist) {
			console.log(plist[i].name);
			if(plist[i].name==self._player._username) continue;
			var pStyle = {font:"12px Arial", fill:"#ff0044",align:"center"};
			var p = new Player( plist[i].name,'');
			self._player_list[ plist[i].name ] = p;
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
			p.label = self._p.add.text(p.sprite.x, p.sprite.y-50,p._username, pStyle);
			//p.sprite.bringToTop();
			//p.label.bringToTop(); 
			console.log("added player",p);
		}
		console.log("loaded players",self._player_list);
	};

	this.getTiles = function(x,y) {
		if(x<0||x>self._world._width) return false;
		if(y<0||y>self._world._height) return false;
		var tiles = [];
		tiles[0] = self.map.getTile(x,y,'world');
		if( self._world.occupiedTiles[x+','+y] ) tiles[1] = self._world.occupiedTiles[x+','+y];
		return tiles;
	};

	this.clearPlayerSprites = function() {
		//delete sprites for other players and clear list
		for(var i in self._player_list) {
			self._player_list.sprite.destroy();
		}
		self._player_list = {};
	};

	this.closeMenu = function() {
		self.menuOpen = false;
		self.menu = false;
	};


	return self;
};



console.log("ld30 game loaded - yay");


function showAlert(msg) {
	$('#alert_modal div.msg').html(msg);
	$('#alert_modal').modal('show');
}

