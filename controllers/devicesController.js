
var mysql = require('mysql');
var inet = require('inet');
var moment = require('moment')
var co = require('co');

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

// controller
exports.index = function(req, res) {
  if (req.params.action === 'register') {
    res.render('main', { title: 'SHAMAN', content: 'devices/register' });
    return;
  }
  
  res.render('main', { title: 'SHAMAN', content: 'devices/index' ,inet: inet, word: req.body.word });
};

exports.get_trs = function(req, res) {
  co(function*() {
    if (Object.keys(req.body).length) {
      var sql = `
        select 
          t1.*, 
          t2.sense_data 
        from 
          m_devices t1 
          left join t_device_last_senses t2 
            on  t1.code = t2.device_code 
            and t2.sense_type = \'door\' 
        where 
            t1.delete_flg <> 1 
        and ( 
              t1.code like ? 
           or t1.name like ? 
           or inet_ntoa(t1.ip_address) like ? 
           or t1.description like ?) 
        order by code`;
      var word = "%" + req.body.word + "%";
      var params = [word, word, word, word];
    } else {
      var sql = `
        select 
          t1.*, 
          t2.sense_data 
        from 
          m_devices t1 
          left join t_device_last_senses t2 
             on t1.code = t2.device_code 
            and t2.sense_type = \'door\' 
        where 
          t1.delete_flg <> 1 order by code`;
      var params = [];
    }
    connection.query(sql, params, function (error, results, fields) {
      if (error) res.render('error');
      
      for (device of results) {
        if (device.status != "1") {
          device.door_status = undefined;
          continue;
        }
        if (device.sense_data) {
          var door_sense_data = JSON.parse(device.sense_data);
          device.door_status = door_sense_data.status;
        }
      }

      res.render('devices/_index_trs', { data: results, inet: inet });
    })
  
  }).then(function(result) {
    console.log(JSON.stringify(result));
  }, function (error) {
    console.log('error: ', error.message);
  });
};

exports.register = function(req, res) {
  var now = new Date();

  connection.query(
    'insert into m_devices set ?',
    {
      code: req.body.code,
      name: req.body.name,
      ip_address: inet.aton(req.body.ip),
      port: req.body.port,
      description: req.body.description,
      status    : '1',
      delete_flg: 0,
      created: now,
      created_by: "jibun",
      updated: now,
      updated_by: "jibun"},
  function (error, results, fields) {
    if (error) throw error;
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send({result: 0});
  })
};
  
  
exports.update = function(req, res) {
  var now = new Date();
  now = now.toFormat("YYYY-MM-DD HH24:MI:SS");
console.log(req.body);
  connection.query({
    sql: 
      'update m_devices set ? where id = ?;',
    values: [{
      code       : req.body.code,
      name       : req.body.name,
      ip_address : inet.aton(req.body.ip),
      port       : req.body.port,
      description: req.body.description,
      updated    : now,
      updated_by :"jibun"},
      req.body.id],
  }, function (error, results, fields) {
    if (error) throw error;
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send({result: 0});
  })
};

exports.delete = function(req, res) {
    var now = new Date();
    now = now.toFormat("YYYY-MM-DD HH24:MI:SS");
    
    console.log(req.body.ids);
    for (id of req.body.ids) {
      connection.query({
        sql: 
          'update m_devices set delete_flg = ?, updated = ?, updated_by = ? where id = ?;',
        values: [
          "1",
          now,
          "jibun",
          id],
      }, function (error, results, fields) {
        if (error) throw error;
      })
    }
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send({result: 0});
};


exports.detail = function(req, res) {
  var data = {};
  console.log(req.params);
  connection.query(
    'select t1.*, t2.sense_data from m_devices t1 left join t_device_last_senses t2 on t1.code = t2.device_code and t2.sense_type = \'door\' where t1.id = ?', 
    [req.params.id], 
  function (error, results, fields) {
    if (error) throw error;
    var device = results[0];
    
    if (device.status != "1") {
      device.door_status = undefined;
    } else {
      if (device.sense_data) {
        var door_sense_data = JSON.parse(device.sense_data);
        device.door_status = door_sense_data.status;
      }
    }
    data.device = results[0];

    connection.query(
      'select * from t_sense_logs where device_code = ? order by id desc', 
      [results[0].code], 
    function (error, results, fields) {
      if (error) throw error;
      data.logs = results;
      data.last_disp_id = 0; // results[0].id

      connection.query(
        'select * from m_requests where delete_flag = 0 order by id', 
        [], 
      function (error, results, fields) {
        if (error) res.render('error');
        data.requests = results;

        res.locals = data;
        res.render('main', { 
          title: 'SHAMAN', 
          content: 'devices/detail',
          inet: inet});
      });
    });
  });

};


exports.get_status = function(req, res) {
  
  connection.query('select * from m_devices where id = ?', [req.params.id], function (error, results, fields) {
    if (error) res.render('error');
    
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(results[0]);
  })

};

exports.get_logs = function(req, res) {
    console.log(req.params);
    console.log(req.body);
  
  connection.query('select * from t_sense_logs where device_code = ? and id > ? order by id desc', [req.params.device_code, req.body.last_disp_id], function (error, logs, log_fields) {
    if (error) {
      console.log(error);
      res.render('error');
    }
    var results = {};
    results.logs = logs;
    if (logs.length > 0) {
      //results.last_disp_id = logs[0].id;
      results.last_disp_id = 0;
    }
    console.log(results);
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(results);
  });

};

exports.get_last_senses = function(req, res) {
  
  connection.query({
    sql:
      'select * from t_device_last_senses where device_code = ? order by sense_type', 
    values: [
      req.body.code]}, 
  function (error, results, log_fields) {
    if (error) throw error;
    
    var respose = {};
    respose.data = results;
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(respose);
  });
};

exports.get_logs_by_type = function(req, res) {
  var now = new Date();
  
  if (!req.body.limit) {
    req.body.limit = 100;
  }
  // now = new Date('2018-03-11 23:22:24');
  var from_time = moment(now).subtract(60, 'minutes').startOf('minute');

  connection.query(
    'select * from t_sense_logs where device_code = ? and sense_type = ? and status = 1 and sense_time >= ? order by id', 
    [ req.params.device_code, 
      req.params.sense_type,
      from_time.format('YYYY-MM-DD HH:mm:ss')
    ], function (error, results, fields) {
    if (error) throw error;

    var response = {};
    res.header('Content-Type', 'application/json; charset=utf-8')
    if (error) res.send(response.logs = []);
    if (results.length > 0) {
      response.min_disp_id = results[0].id;
    }
    
    var labels = [];
    var temps = [];
    var humis = [];
    for (log of results) {
      var data = JSON.parse(log.sense_data);
      //labels.push(moment(log.sense_time).format("M/D HH:mm"));
      labels.push(log.sense_time);
      temps.push(data.temperature);
      humis.push(data.humidity);
    }
    response.labels = labels;
    response.temps = temps;
    response.humis = humis;

    res.send(response);
  });

};

exports.get_door_history = function(req, res) {
  var now = new Date();
  
  if (!req.body.limit) {
    req.body.limit = 100;
  }
  // now = new Date('2018-03-11 23:22:24');
  var from_time = moment(now).subtract(20, 'minutes').startOf('minute');
  var sql = `
    select t.*
    from (
      select t0.*
      from t_sense_logs t0
      where
          t0.device_code = ?
      and t0.sense_type = 'door'
      and t0.sense_time < ?
      and not exists (
        select 'x'
        from t_sense_logs e
        where
            e.device_code = ?
        and e.sense_type = 'door'
        and e.sense_time < ?
        and e.device_code = t0.device_code
        and e.sense_type = t0.sense_type
        and (e.sense_time > t0.sense_time or e.id > t0.id)
      )
      union all
      select t1.*
      from
        (
          select *
          from t_sense_logs
          where 
              device_code = ? 
          and sense_type = 'door' 
          and sense_time between ? and ?
        ) t1
        left outer join (
          select *
          from t_sense_logs
          where 
              device_code = ? 
          and sense_type = 'door' 
          and sense_time between ? and ?
        ) t2
          on  t1.device_code = t2.device_code
          and t1.sense_type = t2.sense_type
          and DATE_FORMAT(t1.sense_time, '%Y-%m-%d %H:%i') = DATE_FORMAT(t2.sense_time, '%Y-%m-%d %H:%i')
          and (t1.sense_time < t2.sense_time or t1.id < t2.id)
      where 
        t2.id is null
    ) t
    order by t.sense_time
  `;
  connection.query(
    sql, 
    [ 
      req.body.code, 
      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
      req.body.code, 
      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
      req.body.code, 
      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
      moment(now).format('YYYY-MM-DD HH:mm:ss'),
      req.body.code, 
      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
      moment(now).format('YYYY-MM-DD HH:mm:ss'),
    ], function (error, results, fields) {
    if (error) throw error;

    var response = {};
    if (error) res.send(response.logs = []);
    if (results.length > 0) {
      response.min_disp_id = results[0].id;
    }
    
    var labels = [];
    var door = [];

    var m_label_time = moment(from_time);
    var m_now = moment(now);
    var log = results[0];
    results.shift();
    while (m_now.diff(m_label_time, 'minutes') > 0) {
      if (log && moment(log.sense_time).diff(m_label_time, 'minutes') < 1) {
        var data = JSON.parse(log.sense_data);
        door.push(data.status);
        log = results[0];
        results.shift();
      } else {
        if (door.length < 1) {
          door.push(0);
        } else {
          door.push(door[door.length - 1]);
        }
      }
      labels.push(m_label_time);
      m_label_time = moment(m_label_time.add(1, 'minutes'));
    }
    response.labels = labels;
    response.door = door;
    
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(response);
  });

};
//exports.get_door_history = function(req, res) {
//  var now = new Date();
//  
//  if (!req.body.limit) {
//    req.body.limit = 100;
//  }
//  // now = new Date('2018-03-11 23:22:24');
//  var from_time = moment(now).subtract(60, 'minutes').startOf('minute');
//  var sql = `
//    select t.*
//    from (
//      select t0.*
//      from t_sense_logs t0
//      where
//          t0.device_code = ?
//      and t0.sense_type = 'door'
//      and t0.sense_time < ?
//      and not exists (
//        select 'x'
//        from t_sense_logs e
//        where
//            e.device_code = ?
//        and e.sense_type = 'door'
//        and e.sense_time < ?
//        and e.device_code = t0.device_code
//        and e.sense_type = t0.sense_type
//        and (e.sense_time > t0.sense_time or e.id > t0.id)
//      )
//      union all
//      select *
//      from t_sense_logs
//      where 
//          device_code = ? 
//      and sense_type = 'door' 
//      and sense_time >= ?
//    ) t
//    order by t.sense_time
//  `;
//  connection.query(
//    sql, 
//    [ 
//      req.body.code, 
//      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
//      req.body.code, 
//      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
//      req.body.code, 
//      moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
//    ], function (error, results, fields) {
//    if (error) throw error;
//
//    var response = {};
//    if (error) res.send(response.logs = []);
//    
//    var labels = [];
//    var door = [];
//
//    for (result of results) {
//      console.log(result.sense_time);
//      var data = JSON.parse(result.sense_data);
//      door.push(data.status);
//      labels.push(result.sense_time);
//    }
//    response.labels = labels;
//    response.door = door;
//    
//    res.header('Content-Type', 'application/json; charset=utf-8')
//    res.send(response);
//  });
//
//};
