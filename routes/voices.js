var express = require('express');
var router = express.Router();

// Require our controllers.
var sensesController = require('../controllers/sensesController'); 

// GET manage home page.
//router.get('/', manageController.index);

router.post('/senses', sensesController.register);
//router.get('/logs/:jibakurei_code/:count', manageController.get_logs);


module.exports = router; 
