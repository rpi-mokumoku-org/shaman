global.__base = __dirname + '/';

const express = require('express');
const session = require('express-session');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
// TODO: あとで消す
const mysql = require('mysql');
const db = require(__base + 'utils/db');
const moment = require('moment')
const passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

const index = require('./routes/index');
const voices = require('./routes/voices');
require('date-utils');

const app = express();

// import config by envirenment
require('dotenv').config({
  path: 'config/.env.' + app.get('env')
});

// app
app.locals.moment = moment

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
// app.use(passport.session());

// TODO:後で消す
const connection = db.connect();
// Connect to database （ここでしか呼ばないようにする）
// db.connect();

// bind router
app.use('/', index);
app.use('/voices', voices);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  console.log("error handler");
  console.log(err.message);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

if (app.get('env') === 'development') {
  process.on('unhandledRejection', (err, p) => {
    console.error('Unhandled rejection...orz');
    console.error('  Error : ', err);
    console.error('  Promise : ', p);
    next(err);
  });
}

process.on('uncaughtException', (err) => {
  console.error(err);
  process.abort(); // uncaughtException の時は落ちる
});

module.exports = app;
