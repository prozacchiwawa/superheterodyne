var express = require('express');
var cors = require('cors');
var elm = require('./server.js');
var q = require('q');
var qio = require('q-io/fs');
var mustache = require('mustache');
var feedparser = require('feedparser');
var request = require('request');
var moment = require('moment');
var streamifyString = require('streamify-string');

console.log(elm);

var qfun = function(self,f) {
    var args = [].slice.call(arguments, 2);
    var df = q.defer();
    var reply = function() {
        var args = [].slice.call(arguments);
        df.resolve.apply(df, args);
    };
    var argsc = [].concat([].concat.apply([], [args,[reply]]));
    if (self) {
        f = self[f];
    }
    f.apply(self, argsc);
    return df.promise;
}

function template(s) {
    return qio.read('template/index.tmpl','r').
        then(function(t) { return [s,t]; });
}

var feedFile = '/tmp/medium-feed';
var feedUrl = 'https://medium.com/feed/@prozacchiwawa';
function requestFeed() {
    var df = q.defer();
    var req = request(
        { url: feedUrl,
          encoding: 'utf8'
        }, 
        function(error, response, body) {
            if (error) { return df.reject(error); }
            if (!response) { return df.reject('null response'); }
            if (response.statusCode != 200) { return df.reject('response ' + response.statusCode); }
            qio.write(feedFile, body);
            return df.resolve(body);
        });
    return df.promise;
}

function getMediumFeed() {
    return qio.stat(feedFile).
        then(function(stat) {
            var now = moment();
            var modified = monent(stat.lastModified());
            var hoursAgo = modified.diff(now, 'hours');
            console.log('modified ' + hoursAgo + ' hours ago');
            if (hoursAgo != 0) {
                return requestFeed();
            } else {
                return qio.read(feedFile,'r');
            }
        }).catch(function (err) {
            return requestFeed();
        }).then(function(body) {
            var df = q.defer();
            var fp = new feedparser({ 
                normalize: true,
                feedurl: feedUrl
            });
            fp.on('error', df.reject);
            var result = { entries: [] };
            fp.on('readable', function() {
                var post;
                while (post = this.read()) {
                    post.published = '' + post.date;
                    result.entries.push(post);
                }
            });
            fp.on('end', function() {
                df.resolve(result);
            });
            streamifyString(body).pipe(fp);
            return df.promise;
        }).catch(function(err) {
            return {entries: []};
        });
};

function handleIndex(request, response) {
    function output(st,f) {
        var s = "<div id='child'>" + st[0] + "</div>";
        var t = st[1];
        var m = mustache.render(t, {div: s, feed: JSON.stringify(f.entries)});
        response.set({ 'content-type': 'text/html; charset=utf-8' });
        response.end(m);
    }
    getMediumFeed().then(function(f) {
        var runner = elm.Server.worker(f.entries);
        return qfun(runner.ports.htmlResult, "subscribe").
            then(template).
            then(function(st) { return output(st,f); });
    }).done();
}

function handleMedium(request, response) {
    return getMediumFeed().then(function(f) {
        response.set({ 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(f));
    }).done();
}

const PORT = 8001;
var app = express();

app.use(cors());
app.options('*', cors());
app.get('/', handleIndex);
app.get('/index.html', handleIndex);
app.get('/medium-feed', handleMedium);
app.get('/keybase.txt', express.static('.'));
app.get(/google.*\.html/, express.static('.'));
app.use('/js', express.static('js'));
app.use('/css', express.static('css'));
app.use('/img', express.static('img'));
app.use('/files', express.static('files'));
app.use("/GitHub-Mark", express.static('GitHub-Mark'));
app.listen(PORT);
