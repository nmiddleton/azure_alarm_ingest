'use strict';

const
    publisher = require('../tasks/publisher'),
    validator = require('../tasks/validator'),
    _         = require('../../lib/lodash.js'),
    Converter = require('../tasks/converter');

exports.ingest = function (req, context) {
    context.log('Ingest:', req.body);
    if (_.has(req.body, 'context.timestamp')){
        context.log('Has timestamp:', req.body.context);
        if (! _.isString(req.body.context.timestamp)){
            context.log('Timestamp needs quotes');
            req.body.context.timestamp = '\'' + req.body.context.timestamp + '\'';
            context.log('Quoted timestamp:', req.body.context);
            if (! _.isString(req.body.context.timestamp)){
                context.log('Timestamp needs replacing:');
                req.body.context.timestamp = moment.utc().toISOString();
                context.log('Replaced timestamp:', req.body.context);
            }
        }
    }
    let validation = validator(req.body),
        res = context.res;


    context.log('Valid:', validation);
    let converter = new Converter();

    if (!validation.valid) {
        console.log('Validation Error:' + JSON.stringify(validation));
        context.log('Validation Error:' + JSON.stringify(validation));
        res.status(400).json({
            ingested: false,
            message: "Alarm validation error",
            message_details: validation.errors,
            alarm_schema: validation.alarm_schema,
            alarm_schema_version: validation.alarm_schema_version
        });
    } else {
        converter.convertToCam(req.body,validation.alarm_schema,validation.alarm_schema_version, context)
            .then(function (converted) {
                context.log('Converted:', converted);
                return publisher.SendToCam(converted, context)
                    .then(function () {
                        res.status(200).json({
                            ingested: true,
                            message: "Alarm ingested and sent to CAM",
                            alarm_schema: validation.alarm_schema,
                            alarm_schema_version: validation.alarm_schema_version
                        });
                    })
            })
            .catch(function (error) {
                console.log('Error:' + error);
                res.status(400).json({
                    ingested: false,
                    message: "Alarm ingest error",
                    message_details: error
                });
            });

    }
};
