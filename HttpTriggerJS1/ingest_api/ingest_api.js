// 'use strict';
//
// module.exports = function () {
//     const
//         express = require('express'),
//         routes = require('./routes'),
//         info = require('./routes/info'),
//         alarmingest = require('./routes/alarm_ingest');
//
//     let app = express();
//
//     app.configure(function(){
//         app.set('port', process.env.PORT || 3000);
//         app.use(express.favicon());
//         app.use(express.logger('dev'));
//         app.use(express.bodyParser());
//         app.use(express.methodOverride());
//         app.use(app.router);
//     });
//
//     app.configure('development', function(){
//         app.use(express.errorHandler());
//     });
//
//     app.post('/alarm-ingest', alarmingest.ingest);
//     app.get('/', info.list);
//
//     app.getPort = function () {
//         return app.get('port');
//     };
//
//     return app;
// };