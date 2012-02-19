// TODO: automatically grab all models from models directory
//var	controllers = {
//		'meta' : require('./controllers/MetaController'),
//		'node' : require('./controllers/NodeController'),
//		'page' : require('./controllers/PageController')
//	};

// automatically grab all models from models directory
var controllerFiles = require('require-all')({
	dirname: __dirname + '/controllers',
	filter: /(.+Controller)\.js$/
});

// now map to provided domain class names
// (if no 'name' attribute was provided, take a guess)
// NOT CASE SENSITIVE
var controllers = {};
_.each(controllerFiles,function (controller, filename) {
	var className = controller.name || filename.replace(/Controller/, "");
	className = className.toLowerCase();
	controllers[className] = controller;
});

var userMappings = {
	'/nodes': controllers.node.index
	, '/sitemap': controllers.page.index
}

var defaultMappings = {
	'/': controllers.meta.home
	, '/500': controllers.meta.error
	, '/404': controllers.meta.notfound
	, '/:entity/:action?/:id?': handleWildcardRequest
}

// Combine default mappings with user mappings
var mappings = _.extend(userMappings,defaultMappings);

// Set up routing table
exports.mapUrls = function mapUrls (app) {
	for (var r in mappings) {
		app.all(r, mappings[r]);
	}
}

/**
 * Try to match up an arbitrary request with a controller and action
 */
function handleWildcardRequest (req,res,next) {
	var entity = req.param('entity'),
		action = req.param('action'),
		method = req.method;

	if (entity && 
		entity != "stylesheets" && 
		entity != "lib" && 
		entity != "sources" && 
		entity != "images") {

		// Try to map to an entity (use backbone conventions)
		if (_.contains(_.keys(controllers),entity)) {
			var controller = controllers[entity];

			// For undefined actions, resolve to:
			// if GET: fetch
			// if POST: create
			action = action || (
				(method=="GET") ? "fetch" :
				(method=="POST") ? "create" :
				action
			);

			// Try to map to a method
			if (! controller[action]) {
				// Resolve to an appropriate, conventional synonym
				action = 
					(action == "delete") ? "remove" :
					(action == "destroy") ? "remove" : 

					(action == "edit") ? "update" : 
					(action == "modify") ? "update" : 

					(action == "view") ? "read" : 
					(action == "show") ? "read" : 
					(action == "detail") ? "read" : 

					(action == "add") ? "create" : 
					(action == "new") ? "create" : 
					action;					
				
				// Attempt to parse id from action to follow backbone conventions
				if (!_.isNaN(+action)) {
					req.params.id = +action;
					
					// if PUT: update
					// if DELETE: remove
					action = (
						(method == "PUT") ? "update" :
						(method == "DELETE") ? "remove" :
						action);
				}
				
				// Pass corrected action down
				req.params.action = action;
			}

			if (controller[action]) {
				var method = controller[action];
				return method(req,res,next);
			}
		}

		// If that fails, just display the 404 page
		return controllers.meta.notfound(req,res,next);
	}
	else {
		next();
	}
}