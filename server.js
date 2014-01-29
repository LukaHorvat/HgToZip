var express = require("express");
var app = express();
var stylus = require("stylus");
var exec = require('child_process').exec;
var os = require("os");

function compile(str, path) {
  return stylus(str)
    .set('filename', path);
}

app.configure(function () {
	app.use(express.bodyParser());
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(stylus.middleware({ 
	src: __dirname + '/public', 
	compile: compile
}));

app.use(express.static(__dirname + '/public'))

app.get("/", function (req, res) {
	res.render("index");
});

function executeCommands(list, callback) {
	if (list.length === 0) {
		callback(null);
		return;
	}
	exec(list[0], { cwd: __dirname + "/repos/" }, function (err, out, errout) {
		console.log(list[0] + " out: " + out);
		if (err === null) {
			executeCommands(list.slice(1), callback);
		} else {
			console.log(list[0] + " error: " + err);
			console.log(errout);
			callback(err);
		}
	});
}

app.post("/prepare/", function (req, res) {
	var repo = req.body.repo;
	var split = repo.split("/");
	for (var i = 0; i < split.length; ++i) {
		if (split[i] === "") {
			split.splice(i, 1);
			i--;
		}
	}
	var name = split[split.length - 1];
	if (name.indexOf("*") !== -1 ||
		name.indexOf("..") !== -1 ||
		name.indexOf(" ") !== -1 ||
		name.indexOf(";") !== -1) {
		res.end("error input");
		return;
	}
	name = "./" + name;
	executeCommands([
		"hg clone " + repo,
		"zip -r " + name + ".zip " + name,
		"rm -rf " + name
	], function (err) {
		if (err !== null) {
			res.end("error exec");
			return;
		}
		res.end("getzip/" + name);
	});
});

app.get("/getzip/:name", function (req, res) {
	if (req.params.name.indexOf("/") !== -1 ||
		req.params.name.indexOf("*") !== -1 ||
		req.params.name.indexOf("..") !== -1 ||
		req.params.name.indexOf(" ") !== -1 ||
		req.params.name.indexOf(";") !== -1) {
		res.end("error");
		return;
	}
	var file = req.params.name + ".zip";
	res.download("repos/" + file, file, function (err) {
		executeCommands([
			"cd " + __dirname + "/projects/HgToZip/repos/",
			"rm ./" + file
		], function (err) {
		});
	});
});

console.log(__dirname);
if (os.hostname() != "myfirefly.me") {
	app.listen(1000);
}
module.exports = app;