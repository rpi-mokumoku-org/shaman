
var mysql = require('mysql');

var db_config = {
  host     : 'medamaoyaji',
  user     : 'shaman',
  password : 'shaman',
  database : 'medamaoyaji_db' 
};

var connection;
function handleDisconnect() {
  console.log('INFO.CONNECTION_DB: ');
  connection = mysql.createConnection(db_config);
  
  //connection取得
  connection.connect(function(err) {
    if (err) {
      console.log('ERROR.CONNECTION_DB: ', err);
      setTimeout(handleDisconnect, 1000);
    }
  });
  
  //error('PROTOCOL_CONNECTION_LOST')時に再接続
  connection.on('error', function(err) {
    console.log('ERROR.DB: ', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('ERROR.CONNECTION_LOST: ', err);
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

var custom_format = function (query, values) {
  if (!values) return query;
  return query.replace(/\:(\w+)/g, function (txt, key) {
    if (values.hasOwnProperty(key)) {
      return this.escape(values[key]);
    }
    return txt;
  }.bind(this));
};

// controller
exports.devices = function(req, res) {
  console.log(req.params);
  if (req.params.action === 'register') {
    res.render('starter', { title: 'SHAMAN', content: 'devices_register' });
    return;
  }

  var sql = 'select * from m_devices';
  connection.query(sql, function (error, results, fields) {
    if (error) {
      console.log(error);
      res.render('error');
    }
    res.render('starter', { title: 'SHAMAN', content: 'devices' ,data: results });
  })

};

exports.devices_register = function(req, res) {
    var now = new Date();

    connection.config.queryFormat = custom_format;
    connection.query(
      'insert into m_devices set code = :code, name = :name, ip_address = INET_ATON(:ip), description = :description, status = :status, created = :created, created_by = :created_by, updated = :updated, updated_by = :updated_by',
      {
        code: req.body.code,
        name: req.body.name,
        ip: req.body.ip,
        description: req.body.descripion,
        status: '0',
        created: now,
        created_by: "jibun",
        updated: now,
        updated_by: "jibun"},
    function (error, results, fields) {
      console.log("inserted!!");
      console.log(error);
      res.render('starter', { message:"Registerd.", content: 'devices' });
    })
};
  
  
exports.devices_update = function(req, res) {
    var now = new Date();
    now = now.toFormat("YYYY-MM-DD HH24:MI:SS");

    connection.query({
      sql: 
        'update m_devices set code = ?, name = ?, description = ?, updated = ?, updated_by = ? where id = ?;',
      values: [
        req.body.code,
        req.body.name,
        req.body.descripion,
        now,
        "jibun",
        req.body.id],
    }, function (error, results, fields) {
      res.render('starter', { message:"Updated.", content: 'devices' });
    })
};

exports.devices_delete = function(req, res) {
    var now = new Date();
    now = now.toFormat("YYYY-MM-DD HH24:MI:SS");

    connection.query({
      sql: 
        'update m_devices set delete_flg = ?, updated = ?, updated_by = ? where id = ?;',
      values: [
        "1",
        now,
        "jibun",
        req.body.id],
    }, function (error, results, fields) {
      res.render('starter', { message:"Deleted.", content: 'devices' });
    })
};

exports.index = function(req, res) {
  
  connection.query({
    sql: 'insert into m_devices (code, name, description, status, created, created_by, updated, updated_by) values (?, ?, ?, ?, ?, ?, ?, ?, ?);', 
    values: [
      req.params.code, 
      req.params.name, 
      req.params.descripion, 
      '0', 
      req.params.code, 
      req.params.code, 
      req.params.code, 
      req.params.code, 
      Number(req.params.count)], 
  }, function (error, results, fields) {
  connection.query(sql, function (error, results, fields) {
    console.log(results);
    res.render('index', { title: 'Shaman', data: results });
  })

  });
};

exports.detail = function(req, res) {
  
  connection.query({
    sql: 'select * from m_jibakureis where code = ?', 
    values: [req.params.jibakurei_code], 
  }, function (error, results, fields) {
  
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(results[0]);
  })

};

exports.get_logs = function(req, res) {

  connection.query({
    sql: 'select * from t_sense_logs where jibakurei_code = ? order by id desc limit ?', 
    values: [req.params.jibakurei_code, Number(req.params.count)], 
  }, function (error, results, fields) {
    
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(results);
  })

};

