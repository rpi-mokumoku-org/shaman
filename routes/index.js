var express = require('express');
var router = express.Router();

// Require our controllers.
var devicesController = require('../controllers/devicesController'); 
var requestsController = require('../controllers/requestsController'); 
var loginsController = require('../controllers/loginsController'); 

// promise error catch
let wrap = fn => (...args) => fn(...args).catch(args[2]);

// Logins
router.get('/', loginsController.index);
router.get('/logins', loginsController.index);
router.post('/logins', loginsController.login);

// Devices
router.get('/devices', wrap(devicesController.index));
router.get('/devices/_trs', wrap(devicesController.get_trs));
router.post('/devices/_trs', wrap(devicesController.get_trs));
router.get('/devices/:action', wrap(devicesController.index));
router.get('/devices/detail/:id', wrap(devicesController.detail));
//TODO URLを考え直す↓デバイスマスタを取得するようにしたので
router.get('/devices/status/:id', wrap(devicesController.get_status));
router.post('/devices/logs/:device_code', wrap(devicesController.get_logs));
router.post('/devices/logs/:sense_type/:device_code', wrap(devicesController.get_logs_by_type));
router.post('/devices/last_senses', wrap(devicesController.get_last_senses));
router.post('/devices/door_history', wrap(devicesController.get_door_history));
router.post('/devices', wrap(devicesController.index));
router.post('/devices/register', devicesController.register);
router.post('/devices/delete', devicesController.delete);
router.post('/devices/update', devicesController.update);

// Requests
router.post('/requests', requestsController.request);
router.post('/prerequests', requestsController.prerequest);


router.get('/rpi', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.render('rpi')
});

module.exports = router;
