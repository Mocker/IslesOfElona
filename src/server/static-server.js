var static = require('node-static');

//
// Create a node-static server instance to serve the './public' folder
//
var file = new static.Server('/home/hipster/src/public');

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        
        file.serve(request, response, function (e, res) {
            if (e && (e.status === 404)) { // If the file wasn't found
	            file.serveFile('/404.html', 404, {}, request, response);
            }
        });
    }).resume();
}).listen(80);