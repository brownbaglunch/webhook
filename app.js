var express = require('express');
var https = require('https');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var fs = require('fs');

// Parameters
var configurationFile = 'config.json';

var configuration = {
	"source": "https://raw.githubusercontent.com/brownbaglunch/bblfr_data/gh-pages/baggers.js",
	"target": "http://localhost:9200",
	"alias": "bblfr"
};

/*
Configuration file needs to set:
{
	"source": "https://raw.githubusercontent.com/brownbaglunch/bblfr_data/gh-pages/baggers.js",
	"target": "https://username:password@yourcluster.found.io:9243/",
	"alias": "bblfr"
}
*/

try {
	configuration = JSON.parse(fs.readFileSync(configurationFile));
} catch (e) {
  console.log("configuration file", configurationFile, 'not found. Using defaults.');
}

var esClient = new elasticsearch.Client({
    host: configuration.target
});

// First checks that elasticsearch is running. Fails otherwise
esClient.ping({
  	requestTimeout: 10000
	}, function (error) {
	  if (error) {
	    console.error('elasticsearch cluster is down!');
			throw new Error(error);
	  } else {
	    console.log('elasticsearch cluster is running!');
	  }
	});

function readDataFromGithub(url, callback) {
  var content = '';

	https.get(url, function(response) {
	  response.on('data', function(chunk) {
			content += chunk;
	  });
		response.on('end', function() {
			callback(content);
		});
	}).on('error', function(e) {
			console.error(err);
	});
}

function importData(index, data, name, callback, rewriter) {
	  console.log('Importing', data.length, name+'...');

    bulk = [];

		data.forEach( function(obj) { 
	  	if (typeof(rewriter) == "function") {
		  	parsedData = rewriter(obj);
	  	} else {
	  		parsedData = obj;
	  	}

	  	// The parsedData contains an object we need to index
			bulk.push({ index:  { _index: index, _type: name } }, parsedData);
		} );

  	esClient.bulk({
		  body: bulk
		}).then(function (response) {
				console.log(name, 'done', response.errors ? 'with' : 'without', 'errors and took', response.took, 'ms');
				callback();
		});
}

function printError(error) {
	console.error(error);
}

function processEvent(request, response) {
	var data;
	var aliases;
	var now = moment();
	var newIndexName = configuration.alias + now.format('YYYYMMDDHHmmss');

	console.log("starting");

	// We save the exisiting aliases
	esClient.indices.getAlias({name: configuration.alias, ignore: 404}).then(function(response) {
			console.log("get aliases", response);
			if (response.status == 404) {
				aliases = {}
			} else {
				aliases = response;
			}
			// We create the new index name
			esClient.indices.create({index: newIndexName}).then(function(response) {
					console.log("- index", newIndexName, ":", response);
					// We need to fetch data from source
					readDataFromGithub(configuration.source, function(script) {
						// Remove the "var data = " part and 
						script = script.replace("var data = ", "").replace(/;([^;]*)$/, '');
						bblfrData = JSON.parse(script);

						// Store cities as a map so we will be able to replace cities by coordinates
						var cities = {};
						bblfrData.cities.forEach(function(obj) { 
							cities[obj.name] = obj;
						} );

						importData(newIndexName, bblfrData.cities, "cities", function() {
							console.log("- done with cities");
							importData(newIndexName, bblfrData.baggers, "baggers", function() {
								console.log("- done with baggers");

								console.log("- adding alias", configuration.alias, "on", newIndexName);
								// We now remove old aliases and switch to the new one
								var actions = [
									{ add:    { index: newIndexName, alias: configuration.alias } }
								];

								for (indexname in aliases) {
									console.log("- removing alias", configuration.alias, "on", indexname);
									actions.push({ remove: { index: indexname, alias: configuration.alias } });
								}

								esClient.indices.updateAliases({
								  body: {
								    actions: actions
								  }
								}).then(function (response) {
									console.log("- alias", configuration.alias, ":", response);
									// We can remove old indices
									var indices = [];
									for (indexname in aliases) {
										indices.push(indexname);
									}

									console.log("removing indices", indices);
									if (indices.length > 0) {
										esClient.indices.delete({
											index: indices
										}).then(function (response) {
											console.log("old indices removed", response);
										}, printError);										
									}
								}, printError);
							}, function(obj) {
								// We just have to replace cities like: 
								// 		"cities": [ "Lille" ]
								// by
								//	"cities": [ {
					      //      "name": "Lille",
					      //      "ville_img": "img/villes/BBL_Lille.jpg",
					      //      "lat": 50.637222,
					      //      "lng": 3.063333
					      //  }]
					      newCities = [];

								obj.cities.forEach( function(city) { 
									newCities.push(cities[city]);
								} );

								obj.cities = newCities;

								return obj;
							});				
						});
					});
				}, printError);
			}, printError);


  response.send(data);
}

var app = express();

// Just for test purpose, we only use POST in production
app.get('/', function (request, response) {
	processEvent(request, response);
});

app.post('/', function (request, response) {
	processEvent(request, response);
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Brownbaglunch webhook app listening at http://%s:%s', host, port);
});
