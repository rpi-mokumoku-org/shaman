var db = require(__base + 'utils/db');
var inet = require('inet');
var moment = require('moment')
var co = require('co');

// controller
exports.index = async function(req, res) {
  if (req.params.action === 'register') {
    res.render('main', { title: 'SHAMAN', content: 'devices/register' });
    return;
  }
  
  res.render('main', { title: 'SHAMAN', content: 'devices/index' ,inet: inet, word: req.body.word });
};

exports.get_trs = async function(req, res) {
  // try {
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

    const devices = await db.getLows(sql, params);

    for (device of devices) {
      if (device.status != "1") {
        device.door_status = undefined;
        continue;
      }
      if (device.sense_data) {
        var door_sense_data = JSON.parse(device.sense_data);
        device.door_status = door_sense_data.status;
      }
    }

    res.render('devices/_index_trs', { data: devices, inet: inet });
  // } catch (e) {
  //   console.log(12345);
  //   console.log(e);
  // }
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

exports.detail = async function(req, res) {
  const _GET = req.params;
  
  var data = {};
  const device = await db.getALow(
    'select t1.*, t2.sense_data from m_devices t1 left join t_device_last_senses t2 on t1.code = t2.device_code and t2.sense_type = \'door\' where t1.id = :id', 
    {id: _GET.id});
  
  if (device.status != "1") {
    device.door_status = undefined;
  } else {
    if (device.sense_data) {
      var door_sense_data = JSON.parse(device.sense_data);
      device.door_status = door_sense_data.status;
    }
  }
  data.device = device;

  const logs = await db.getLows(
    'select * from t_sense_logs where device_code = :device_code order by id desc', 
    {device_code: device.code});

  data.logs = logs;
  data.last_disp_id = 0; // results[0].id

  const requests = await db.getLows(
    'select * from m_requests where delete_flag = 0 order by id');
  data.requests = requests;

  res.locals = data;
  res.render('main', { 
    title: 'SHAMAN', 
    content: 'devices/detail',
    inet: inet});
};

/**
 * m_deviceをJSONでレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_status = async function(req, res) {
  const _GET = req.params;

  const device = await db.getALow('select * from m_devices where id = :id', {id: _GET.id});

  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send(device);
};

/**
 * センサーログの一覧をJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_logs = async function(req, res) {
  const _GET = req.params;

  var sql = `
    select * 
    from t_sense_logs 
    where 
        device_code = :device_code 
    and id > :id 
    order by id desc
  `;
  var params = {
    device_code: _GET.device_code,
    id: _GET.last_disp_id
  };

  const senseLogs = await db.getALow(sql, params);
  
  var results = {};
  results.logs = senseLogs;
  if (senseLogs.length > 0) {
    //results.last_disp_id = logs[0].id;
    results.last_disp_id = 0;
  }
  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send(results);
};

/**
 * 最新のセンサーログをJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_last_senses = async function(req, res) {
  const _POST = req.body;

  var sql = `
    select * 
    from t_device_last_senses 
    where 
        device_code = :device_code 
    order by sense_type
  `;
  var params = {
    device_code: _POST.code,
  };
  
  const deviceLastSenses = await db.getLows(sql, params);
  var respose = {};
  respose.data = deviceLastSenses;
  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send(respose);
};

/**
 * 最新のセンサーログをJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_logs_by_type = async function(req, res) {
  const _GET = req.body;
  var now = new Date();
  
  if (!_GET.limit) {
    req.body.limit = 100;
  }
  // now = new Date('2018-03-11 23:22:24');
  var from_time = moment(now).subtract(60, 'minutes').startOf('minute');

  var sql = `
    select * 
    from t_sense_logs 
    where 
        device_code = :device_code 
    and sense_type = :sense_type 
    and status = 1 
    and sense_time >= :sense_time 
    order by id
  `;
  var params = {
    device_code: _GET.device_code,
    sense_type: _GET.sense_type,
    sense_time: from_time.format('YYYY-MM-DD HH:mm:ss'),
  }
  const senseLogs = await db.getLows(sql, params);

  var response = {};
  res.header('Content-Type', 'application/json; charset=utf-8')
  if (senseLogs.length > 0) {
    response.min_disp_id = senseLogs[0].id;
  }
  
  var labels = [];
  var temps = [];
  var humis = [];
  for (log of senseLogs) {
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
};

/**
 * ドアセンサーのログをJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_door_history = async function(req, res) {
  const _POST = req.body;
  var now = new Date();
  
  if (!_POST.limit) {
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
          t0.device_code = :device_code
      and t0.sense_type = 'door'
      and t0.sense_time < :sense_time
      and not exists (
        select 'x'
        from t_sense_logs e
        where
            e.device_code = :device_code
        and e.sense_type = 'door'
        and e.sense_time < :sense_time
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
              device_code = :device_code 
          and sense_type = 'door' 
          and sense_time between :sense_time_from and :sense_time_to
        ) t1
        left outer join (
          select *
          from t_sense_logs
          where 
              device_code = :device_code 
          and sense_type = 'door' 
          and sense_time between :sense_time_from and :sense_time_to
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
  var params = {
    device_code: _POST.code,
    sense_time: moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
    sense_time_from: moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
    sense_time_to: moment(now).format('YYYY-MM-DD HH:mm:ss'),
  }
  const doorSenseLogs = await db.getLows(sql, params);

  var response = {};
  if (doorSenseLogs.length > 0) {
    response.min_disp_id = doorSenseLogs[0].id;
  }
  
  var labels = [];
  var door = [];
  console.log(doorSenseLogs);

  var m_label_time = moment(from_time);
  var m_now = moment(now);
  var log = doorSenseLogs[0];
  doorSenseLogs.shift();
  while (m_now.diff(m_label_time, 'minutes') > 0) {
    if (log && moment(log.sense_time).diff(m_label_time, 'minutes') < 1) {
      var data = JSON.parse(log.sense_data);
      door.push(data.status);
      log = doorSenseLogs[0];
      doorSenseLogs.shift();
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
};
