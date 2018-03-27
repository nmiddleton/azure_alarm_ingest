'use strict';

var
    http = require('http'),
    https = require('https'),
    _= require('./lodash'),
    q = require('./q.js');

module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    var failed_body = validAlarm(req.body, context);

    if (req.body && failed_body.length === 0) {
        SendToAWSCam(req.body, req.headers, context)
            .then(function (aws_response) {
                var azure_res_body = {
                    ingested: false
                };
                if (aws_response.statusCode === 200) {
                    azure_res_body.ingested = true;
                }
                context.res = {
                    status: aws_response.statusCode,
                    body: azure_res_body
                };
                context.done();
            })
            .catch(function (error) {
                context.res = {
                    status: 400,
                    body: 'Ingestion error: ' + error
                };
                context.done();
            });
    }
    else {
        context.res = {
            status: 400,
            body: 'Alarm failed validation. Missing or malformed properties: ' + failed_body
        };
        context.done();
    }

};
function validAlarm (body){
    var failed_args = [],
        required_strings = ['reporter', 'end_point_id', 'alarm_type', 'status', 'category', 'message', 'informer', 'occurred_at'];
    _.forEach(required_strings, function (required) {
        if (! _.has(body, required)){
            failed_args.push(required);
        }
    });
    return failed_args;
}

function SendToAWSCam(cam_message, alarm_headers, context) {
    context.log('SendToAWSCam', alarm_headers['x-api-key']);
    var options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'zOHtS8xIOE8In1uP7ghbP8jmUdVMvoMB4finmmPU',
            'x-api-application-key': alarm_headers['ocim'] || null
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
            deferred.resolve({response: response, headers: res.headers, statusCode: res.statusCode, context: context});
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