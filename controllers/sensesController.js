
var inet = require('inet');

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
 
