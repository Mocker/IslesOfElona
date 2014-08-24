/*******
* UI.js
* Client specific UI functions
* don't use in server
*******/


function UI(game) {
	this.game = game;

	this.menu = false;

	var t = this;
}

UI.prototype.liClicked = function(li) {
	console.log("List clicked",li);
	var i = parseInt( $(li).attr('data-i') );
	if(i!==null && game.ui.menu && game.ui.menu[i]){
		console.log("option: ",game.ui.menu[i]);
		if(game.ui.menu[i].cb) game.ui.menu[i].cb();
		else game.ui.closeMenu();
	}
};

UI.prototype.keyPress = function(key) {
	if(!game.menuOpen) return;
	if(!game.ui.menu) return;
	if(key=='up'||key=='down'){
		var i = ($('li.menu_selected div').length>0)? parseInt($('li.menu_selected div').attr('data-i')) :0;
		$('li.menu_selected').removeClass('menu_selected');
		var nextI = i;
		if(key=='up' && i===0) nextI = game.ui.menu.length - 1;
		else if(key=='up') nextI = i-1;
		else if(key=='down' && i>=(game.ui.menu.length-1) ) nextI = 0;
		else if(key=='down') nextI = i+1;
		console.log("UI switch to menu option "+nextI);
		$('div[data-i="'+nextI+'"]').parent().addClass('menu_selected');
	} else if(key=='space') {
		if( $('li.menu_selected div').length < 1 ) return;
		$('li.menu_selected div').click();
	}
};

UI.prototype.closeMenu = function() {
	game.ui.menu = false;
	game.menu = false;
	game.menuOpen = false;
	$('#menu_modal div.close').click();
};

UI.prototype.showMenu = function(params){
	var h3 = (params.header)?params.header:'Menu';
	var msg = (params.msg)?params.msg:'';
	$('#menu_modal h3').html(h3);
	$('#menu_text').html(msg);
	$('#menu_list').children().remove();
	if(params.menu){
		game.ui.menu = params.menu;
		game.menu = params.menu;
		for(var i=0;i<params.menu.length; i++){
			var li = '<li class="menu_list '+((i===0?'menu_selected':''))+'"><div data-i="'+i+'" onClick="game.ui.liClicked(this);">'+params.menu[i].txt+'</div></li>';
			$('#menu_list').append(li);
		}
	}
	console.log("Menu shown!",params);
	$('#menu_modal').modal();
	game.menuOpen = true;
};

