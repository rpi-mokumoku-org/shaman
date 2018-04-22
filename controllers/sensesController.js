
// Database Connect
var mysql = require('mysql');
var inet = require('inet');

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
exports.register = function(req, res) {
  var now = new Date();
  
  // ドアセンサー用ログを登録
  if (req.body.sense_type == "door") {
    var sense_data = JSON.parse(req.body.sense_data);
    connection.query(
      'insert into t_door_logs set ?',
      {
        device_code: req.body.device_code,
        status     : sense_data.status,
        sense_time : req.body.sense_time,
        created    : now,
        created_by : "voice",
        updated    : now,
        updated_by : "voice"},
    function (error, results, fields) {
      if (error) throw error;
    });
  }
  
  // センサーログを登録
  connection.query(
    'insert into t_sense_logs set ?',
    {
      device_code: req.body.device_code,
      sense_type : req.body.sense_type,
      status     : req.body.status,
      sense_time : req.body.sense_time,
      sense_data : req.body.sense_data,
      created    : now,
      created_by : "voice",
      updated    : now,
      updated_by : "voice"},
  function (error, results, fields) {
    if (error) throw error;
    
    //if (req.body.status != "1") {
    //  res.header('Content-Type', 'application/json; charset=utf-8')
    //  res.send(results);
    //}
  });

  // デバイスマスタのステータス、IPアドレスを更新
  connection.query({
    sql: 'update m_devices set ? where code = ?;',
    values: [{
      status    : 1, 
      ip_address: inet.aton(req.body.ip_address), 
      updated   : now, 
      updated_by: req.body.device_code}, 
      req.body.device_code],
  }, function (error, results, fields) {
    if (error) throw error;
  });
  
  // センサ毎のステータスを更新
  connection.query({
    sql: 'select * from t_device_last_senses where device_code = ? and sense_type = ?', 
    values: [
      req.body.device_code, 
      req.body.sense_type], 
  }, function (error, results, fields) {

    // 既に登録済みの場合は更新
    if (results.length) {
      connection.query({
        sql: 'update t_device_last_senses set ? where device_code = ? and sense_type = ?;',
        values: [{
          device_code: req.body.device_code,
          sense_type : req.body.sense_type,
          sense_data : req.body.sense_data,
          status     : req.body.status,
          sense_time : req.body.sense_time,
          created    : now,
          created_by : req.body.device_code,
          updated    : now,
          updated_by : req.body.device_code},
          req.body.device_code,
          req.body.sense_type]},
      function (error, results, fields) {
        if (error) throw error;
        res.header('Content-Type', 'application/json; charset=utf-8');
        res.send(results);
      })

    // 未登録（初回受信）の場合は登録
    } else {
      connection.query(
        'insert into t_device_last_senses set ?',
        {
          device_code: req.body.device_code,
          sense_type : req.body.sense_type,
          sense_data : req.body.sense_data,
          status     : req.body.status,
          sense_time : req.body.sense_time,
          created    : now,
          created_by : req.body.device_code,
          updated    : now,
          updated_by : req.body.device_code},
      function (error, results, fields) {
        if (error) throw error;
        res.header('Content-Type', 'application/json; charset=utf-8');
        res.send(results);
      })
    }

  })
};
 
