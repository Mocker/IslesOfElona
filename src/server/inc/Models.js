/*****
* DB Schemas and Models
*
* probably should have each class define its own schema and model but.. eh. would screw up frontend compatibility
*/

function Models() {
	
	this.playerSchema = mongoose.Schema({

	});
	this.Player = mongoose.model('Player',this.playerSchema);

	this.worldSchema = mongoose.Schema({

	});
	this.World = mongoose.model('World',this.worldSchema);

};

if(typeof(module)!=="undefined") module.exports = Models;