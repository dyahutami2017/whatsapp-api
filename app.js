var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const basicAuth = require("express-basic-auth");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var sendRouter = require('./routes/send');
var serverRouter = require('./routes/server');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public'))); //karena path folder jadi menggunakan basePath

const basePath = '/';

app.use(basePath, express.static(path.join(__dirname, 'public')));

/*app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/send', sendRouter);
app.use('/server', serverRouter);*/

// karena path folder jadi menggunakan basePath
app.use(basePath, indexRouter);
app.use(basePath + 'users', usersRouter);
app.use(basePath + 'send', sendRouter);
app.use(basePath + 'server', serverRouter);

// Swagger setup with basic auth in development mode
let lastAuthTime = null;

if (process.env.NODE_ENV == "development") {
  // Middleware kustom untuk sesi auth yang habis waktu
  function timedBasicAuth(req, res, next) {
    return basicAuth({
      users: { [process.env.SWAGGER_USERNAME]: process.env.SWAGGER_PASSWORD },
      challenge: true,
      authorizeAsync: true,
      authorizer: (username, password, cb) => {
        const valid = username === process.env.SWAGGER_USERNAME && password === process.env.SWAGGER_PASSWORD;
        if (valid) lastAuthTime = Date.now(); // simpan waktu login terakhir
        cb(null, valid);
      },
    })(req, res, next);


    // jika masih dalam durasi proteksi, lewati
    next();
  }

  app.use(basePath + "api-docs", timedBasicAuth, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
