'use strict';

const
    library = require('../lib'),
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
    return library.https_request(options, stringified_alarm, context);
}


module.exports.SendToCam = SendToCam;