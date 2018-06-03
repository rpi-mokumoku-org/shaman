const inet = require('inet');

/**
 * デバイス管理画面初期表示
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.index = async function(req, res) {
  if (req.params.action === 'register') {
    res.render('main', { title: 'SHAMAN', content: 'devices/register' });
    return;
  }
  
  res.render('main', { title: 'SHAMAN', content: 'devices/index' ,inet: inet, word: req.body.word });
};

/**
 * デバイス管理画面初期表示
 * @param {Object} req Request
 * @param {Object} res Response
 */
exports.get_trs = async function(req, res) {
  const _POST = req.body;
  if (Object.keys(_POST).length) {
    let sql = `
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
            t1.code like :word 
          or t1.name like :word 
          or inet_ntoa(t1.ip_address) like :word 
          or t1.description like :word) 
      order by code
    `;
    let params = {
      word: `%${_POST.word}%`
    };
  } else {
    let sql = `
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
    let params = {};
  }

  const devices = await db.getRows({
    sql: sql,
    params: params}
  );

  for (device of devices) {
    if (device.status != "1") {
      device.door_status = undefined;
      continue;
    }
    if (device.sense_data) {
      let door_sense_data = JSON.parse(device.sense_data);
      device.door_status = door_sense_data.status;
    }
  }

  res.render('devices/_index_trs', { data: devices, inet: inet });
};

exports.register = async function(req, res) {
  const _POST = req.body;
  let now = new Date();

  const id = await db.insert({
    table: 'm_devices',
    row: {
      code: _POST.code,
      name: _POST.name,
      ip_address: inet.aton(_POST.ip),
      port: _POST.port,
      description: _POST.description,
      status: '1',
      delete_flg: 0,
      created: now,
      created_by: "jibun",
      updated: now,
      updated_by: "jibun",
    }
  });

  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send({result: 0});
};
  
  
exports.update = async function(req, res) {
  const _POST = req.body;

  let now = new Date();
  now = now.toFormat("YYYY-MM-DD HH24:MI:SS");
  await db.update({
    table: 'm_devices',
    sets : {
      code       : _POST.code,
      name       : _POST.name,
      ip_address : inet.aton(_POST.ip),
      port       : _POST.port,
      description: _POST.description,
      updated    : now,
      updated_by :"jibun"},
    conditions: {
      id: _POST.id
    }
  });
  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send({result: 0});
};

exports.delete = async function(req, res) {
    let now = new Date();
    now = now.toFormat("YYYY-MM-DD HH24:MI:SS");
    
    console.log(req.body.ids);
    for (id of req.body.ids) {
      await db.update({
        table: m_devices,
        sets: {
          delete_flg: "1",
          updated: now,
          updated_by: "jibun",
        },
        conditions: {
          id: id
        }
      });
      await db.update({
        table: "m_devices",
        sets: {
          delete_flg: "1",
          updated: now,
          updated_by: "jibun",
        },
        conditions: {
          id : id,
        }
      });
    }
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send({result: 0});
};

exports.detail = async function(req, res) {
  const _GET = req.params;
  
  let data = {};
  const device = await db.getARow({
    sql: `
      select 
        t1.*, 
        t2.sense_data 
      from 
        m_devices t1 
        left join t_device_last_senses t2 
          on t1.code = t2.device_code 
          and t2.sense_type = \'door\' 
      where 
        t1.id = :id`,
    params: {
      id: _GET.id
    }
  });
  
  if (device.status != "1") {
    device.door_status = undefined;
  } else {
    if (device.sense_data) {
      let door_sense_data = JSON.parse(device.sense_data);
      device.door_status = door_sense_data.status;
    }
  }
  data.device = device;

  const logs = await db.getRows({
    sql: `
      select * 
      from t_sense_logs 
      where device_code = :device_code 
      order by id desc`, 
    device_code: device.code
  });

  data.logs = logs;
  data.last_disp_id = 0; // results[0].id

  const requests = await db.getRows({
    sql: `
      select * 
      from m_requests 
      where delete_flag = 0 
      order by id`
  });
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

  const device = await db.getARow({
    sql: `
      select * 
      from m_devices 
      where id = :id`, 
    params: {
        id: _GET.id
    }
  });

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

  const senseLogs = await db.getARow({
    sql:`
      select * 
      from t_sense_logs 
      where 
          device_code = :device_code 
      and id > :id 
      order by id desc`, 
    params: {
      device_code: _GET.device_code,
      id: _GET.last_disp_id
    }
  });
  
  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send({
    logs: senseLogs,
    //results.last_disp_id = logs[0].id;
    last_disp_id: (senseLogs.length > 0) ? 0 : undefined,
  });
};

/**
 * 最新のセンサーログをJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_last_senses = async function(req, res) {
  const _POST = req.body;

  const deviceLastSenses = await db.getRows({
    sql:`
    select * 
    from t_device_last_senses 
    where 
        device_code = :device_code 
    order by sense_type`, 
    params: {
      device_code: _POST.code,
    }
  });
  let respose = {};
  respose.data = deviceLastSenses;
  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send(respose);
};

/**
 * 最新のセンサーログをJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 */
exports.get_logs_by_type = async function(req, res) {
  const _GET = req.body;
  let now = new Date();
  
  if (!_GET.limit) {
    req.body.limit = 100;
  }
  // now = new Date('2018-03-11 23:22:24');
  let from_time = moment(now).subtract(60, 'minutes').startOf('minute');

  const senseLogs = await db.getRows({
    sql: `
      select * 
      from t_sense_logs 
      where 
          device_code = :device_code 
      and sense_type = :sense_type 
      and status = 1 
      and sense_time >= :sense_time 
      order by id`,
    params: {
      device_code: _GET.device_code,
      sense_type: _GET.sense_type,
      sense_time: from_time.format('YYYY-MM-DD HH:mm:ss'),
    }
  });

  let labels = [];
  let temps = [];
  let humis = [];
  for (log of senseLogs) {
    let data = JSON.parse(log.sense_data);
    //labels.push(moment(log.sense_time).format("M/D HH:mm"));
    labels.push(log.sense_time);
    temps.push(data.temperature);
    humis.push(data.humidity);
  }

  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send({
    min_disp_id: (senseLogs.length > 0) ? senseLogs[0].id: undefined,
    labels:  labels,
    temps: temps,
    humis: humis,
  });
};

/**
 * ドアセンサーのログをJSONレスポンスするコントローラ
 * @param {Object} req リクエスト
 * @param {Object} res レスポンス
 */
exports.get_door_history = async function(req, res) {
  const _POST = req.body;
  let now = new Date();
  
  if (!_POST.limit) {
    req.body.limit = 100;
  }
  // now = new Date('2018-03-11 23:22:24');
  let from_time = moment(now).subtract(20, 'minutes').startOf('minute');
  const doorSenseLogs = await db.getRows({
    sql: `
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
      order by t.sense_time`,
    params: {
      device_code: _POST.code,
      sense_time: moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
      sense_time_from: moment(from_time).format('YYYY-MM-DD HH:mm:ss'),
      sense_time_to: moment(now).format('YYYY-MM-DD HH:mm:ss'),
    }
  });

  let labels = [];
  let door = [];
  console.log(doorSenseLogs);

  let m_label_time = moment(from_time);
  let m_now = moment(now);
  let log = doorSenseLogs[0];
  doorSenseLogs.shift();
  while (m_now.diff(m_label_time, 'minutes') > 0) {
    if (log && moment(log.sense_time).diff(m_label_time, 'minutes') < 1) {
      let data = JSON.parse(log.sense_data);
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
  
  res.header('Content-Type', 'application/json; charset=utf-8')
  res.send({
    min_disp_id: doorSenseLogs[0].id,
    labels: labels,
    door: door,
  });
};
