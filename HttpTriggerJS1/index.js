'use strict';

var
    http = require('http'),
    https = require('https'),
    _= require('./lodash'),
    q = require('./q.js');

module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.name || (req.body && req.body.reporter)) {
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: "Hello " + (req.query.reporter || req.body.reporter)
        };
        // SendToCam(req.body);
        context.log('Sending To CAM');
        SendToAWSCam(req.body, req.headers, context);
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
    context.done();
};

function SendToAWSCam(cam_message, alarm_headers, context) {
    context.log('SendToAWSCam', alarm_headers['x-api-key']);
    var options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'zOHtS8xIOE8In1uP7ghbP8jmUdVMvoMB4finmmPU',
            'x-api-application-key': alarm_headers['x-api-key'] || null
        }
    };
    _.set(cam_message, 'domain.provenance. AzureAlarmIngest', {
        informed_at: new Date().toISOString(),
        informer: 'azure_cam_function_app'
    });
    var stringified_alarm = JSON.stringify(cam_message);

    options.headers['Content-Length'] = stringified_alarm.length;
    context.log('sending it', stringified_alarm);
    return https_request(options, stringified_alarm, context);
};

function https_request(options, json_stringified_data, context) {
    'use strict';
    context.log('https_request');
    options.path = '/alarm-ingest';
    options.pathname = '/alarm-ingest';
    options.host= 'api.alarms.monitor.aws.compass.thomsonreuters.com';
    options.port = '443';
    context.log('OPTIONS', options);
    var deferred = q.defer();

    var req = https.request(options, function (res) {
        res.setEncoding('utf8');
        var response = '';

        res.on('data', function (data) {
            context.log('DATA', data);
            response += data;
        });
        res.on('end', function () {
            context.log('RESOLVED', res.statusCode, response);
            deferred.resolve({response: response, headers: res.headers, statusCode: res.statusCode});
        });
        res.on('error', function (error) {
            context.log('HTTPS error:', error);
            deferred.reject('HTTPS response error:', error);
        });
    });

    req.on('error', function(error)  {
        context.log('REJECTED', error);
        deferred.reject('HTTPS error:' + error);
    });

    context.log('json_stringified_data', json_stringified_data);
    if (json_stringified_data) {
        req.write(json_stringified_data);
    }
    req.end();

    return deferred.promise;
};