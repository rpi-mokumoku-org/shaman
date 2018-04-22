var express = require('express');
var router = express.Router();

// Require our controllers.
var manageController = require('../controllers/manageController'); 

// GET manage home page.
router.get('/', manageController.index);

//router.get('/:jibakurei_code', manageController.detail);
router.get('/logs/:jibakurei_code/:count', manageController.get_logs);


module.exports = router; 
