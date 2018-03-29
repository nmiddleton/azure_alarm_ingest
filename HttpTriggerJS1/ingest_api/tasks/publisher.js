'use strict';

const
    moment = require('../../lib/moment.min.js'),
    q = require('../../lib/q.js'),
    _ = require('../../lib/lodash.js'),
    https = require('https');

function SendToCam(cam_message, context) {
    var options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'zOHtS8xIOE8In1uP7ghbP8jmUdVMvoMB4finmmPU'
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
}

function https_request(options, json_stringified_data, context) {
    'use strict';
    context.log('https_request');
    options.path = '/alarm-ingest';
    options.pathname = '/alarm-ingest';
    options.host = 'api.alarms.monitor.aws.compass.thomsonreuters.com';
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
            deferred.resolve({response: response, headers: res.headers, statusCode: res.statusCode, context: context});
        });
        res.on('error', function (error) {
            context.log('HTTPS error:', error);
            deferred.reject('HTTPS response error:', error);
        });
    });

    req.on('error', function (error) {
        context.log('REJECTED', error);
        deferred.reject('HTTPS error:' + error);
    });

    context.log('json_stringified_data', json_stringified_data);
    if (json_stringified_data) {
        req.write(json_stringified_data);
    }
    req.end();

    return deferred.promise;
}
module.exports.SendToCam = SendToCam;