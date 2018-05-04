var inet = require('inet');
var moment = require('moment')


// controller
exports.index = function(req, res) {
  res.render('login');
};

exports.login = function(req, res) {
  res.redirect('/devices');
};
