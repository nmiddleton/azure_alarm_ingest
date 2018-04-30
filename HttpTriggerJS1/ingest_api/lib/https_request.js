const
    q = require('q'),
    https = require('https');

module.exports = function https_request(options, json_stringified_data) {
    'use strict';

    let deferred = q.defer();

    let req = https.request(options, function (res) {
        res.setEncoding('utf8');
        let response = '';
        res.on('data', function (data) {
            response += data;
        });
        res.on('end', function () {
            deferred.resolve({response:response,headers:res.headers, statusCode: res.statusCode});
        });
        res.on('error', function (error) {
            deferred.reject('HTTPS response error:', error);
        });
    });

    req.on('error', function (error)  {
        deferred.reject('HTTPS error '+ error);
    });

    if (json_stringified_data) {
        req.write(json_stringified_data);
    }
    req.end();

    return deferred.promise;

};
