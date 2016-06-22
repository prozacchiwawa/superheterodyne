var elmxParser = require('elmx');
var q = require('q');
var FS = require('q-io/fs');

FS.read(process.argv[2], 'r').
    then(elmxParser).
    then(function(t) { console.log(t); }).
    catch(function (e) { console.error(e); process.exit(1); }).
    done();
