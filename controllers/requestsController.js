const inet = require('inet');
const querystring = require("querystring");
const https = require("https");
const http = require("http");
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

// controller
exports.request = async function(req, res) {
  const _POST = req.body;

  let now = new Date();

  const device = await db.getARow({
    sql: `
      select * 
      from m_devices 
      where id = :id`,
    params: {
      id: _POST.device_id,
    }
  });

  const m_request = await db.getARow({
    sql: `
      select * 
      from m_requests 
      where id = :id
    `,
    params: {
      id: _POST.request_id,
    }
  });

  const request_logs_id = await db.insert({
    table: t_request_logs,
    row: {
      device_code: device.code,
      request_id: m_request.id,
      req_host_name: inet.ntoa(device.ip_address),
      req_http_method: m_request.http_method,
      req_request_url: m_request.url,
      req_time: now,
      created: now,
      created_by: "jibun",
      updated: now,
      updated_by: "jibun",
    }
  });

  const m_request_params = await db.getRows({
    sql: `
      select * 
      from m_request_params 
      where request_id = :request_id
    `,
    params: {
      request_id: m_request.id
    }
  });

  let json_data = {};
  m_request_params.forEach(param => json_data[param.key] = param.value);

  //let json_data = {};
  //let text_data = JSON.stringify(json_data);
  let postData = querystring.stringify(json_data);
  
  let port = device.port;
  if (!port) port = 80; 

  let options = {
    hostname: inet.ntoa(device.ip_address),
    port: port,
    path: m_request.url,
    method: m_request.http_method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // リクエスト定義と応答処理設定
  let request = http.request(options, function(response) {
    console.log("STATUS: ", response.statusCode);
    console.log("HEADERS: ", JSON.stringify(response.headers));
    response.setEncoding('utf8');
    
    let res_body = '';
    
    // 応答受信処理
    response.on('data', function(chunk){
      console.log("BODY: ", chunk);
      res_body += chunk;
    });
    
    // 応答終了処理
    response.on('end', async function(){
      let now_responsed = new Date();
      // Query String -> JSON形式へ変換
      let rcv_text = querystring.parse(decoder.write(res_body))
      let rcv_json_text = JSON.stringify(rcv_text);
      let rcv_json = JSON.parse(rcv_json_text);
      console.log("json text = ", rcv_json.message);
      console.log("json number = ", rcv_json.sound);
      console.log("json boolean = ", rcv_json.reply);

      await db.update({
        table: "m_devices",
        sets: {
          status     : '1',
          updated    : now,
          updated_by :"jibun"
        },
        conditions: {
          id: _POST.device_id,
        },
      });
      await db.update({
        table: "t_request_logs",
        sets: {
          res_http_status: response.statusCode,
          res_body: res_body,
          res_time: now_responsed,
          updated: now_responsed,
          updated_by: "jibun"
        },
        conditions: {
          id: request_logs_id,
        },
      });
      res.header('Content-Type', 'application/json; charset=utf-8')
      res.send({result: '0', data: res_body});
    });
  });
  // タイムアウト
  request.on('socket', function (socket) {
    socket.setTimeout(3000);  
    socket.on('timeout', function() {
      request.abort();
    });
  });

  // 送信のエラー処理
  request.on('error', async function(e){
    if (e.code === "ECONNRESET") {
      let err_message = "Timeout occurs";
      console.log(err_message);
    } else {
      let err_message = e.message;
      console.log( "エラー発生: ", e.message);
    }

    await db.update({
      table: "m_devices",
      sets: {
        status    : '0',
        updated   : now,
        updated_by: "jibun"
      },
      conditions: {
        id: _POST.device_id,
      }
    });
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send({result: '9', err_message: err_message});
  });
  
  // データ送信(POST)
  request.write(postData);
  request.end();
};

exports.prerequest = async function(req, res) {
  let now = new Date();
  
  console.log(req.body);

  const m_request = await db.getARow({
    sql: `
      select * 
      from m_requests 
      where id = :id
    `,
    params: {
      id: _POST.request_id,
    }
  });
    
  const request_logs_id = await db.insert({
    table: t_request_logs,
    row: {
      request_id: m_request.id,
      req_host_name: inet.ntoa(req.body.ip_address),
      req_http_method: m_request.http_method,
      req_request_url: m_request.url,
      req_time: now,
      created: now,
      created_by: "jibun",
      updated: now,
      updated_by: "jibun",
    }
  });

  const m_request_params = await db.getRows({
    sql: `
      select * 
      from m_request_params 
      where request_id = :request_id
    `,
    params: {
      request_id: m_request.id
    }
  });
  
  let json_data = {};
  m_request_params.forEach(param => json_data[param.key] = param.value);

  //let json_data = {};
  //let text_data = JSON.stringify(json_data);
  let postData = querystring.stringify(json_data);
  
  let port = req.body.port;
  if (!port) port = 80; 

  let options = {
    hostname: req.body.ip,
    port: port,
    path: m_request.url,
    method: m_request.http_method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // リクエスト定義と応答処理設定
  let request = http.request(options, function(response) {
    console.log("STATUS: ", response.statusCode);
    console.log("HEADERS: ", JSON.stringify(response.headers));
    response.setEncoding('utf8');
    
    let res_body = '';
    
    // 応答受信処理
    response.on('data', function(chunk){
      console.log("BODY: ", chunk);
      res_body += chunk;
    });
    
    // 応答終了処理
    response.on('end', async function(){
      let now_responsed = new Date();
      // Query String -> JSON形式へ変換
      let rcv_text = querystring.parse(decoder.write(res_body))
      let rcv_json_text = JSON.stringify(rcv_text);
      let rcv_json = JSON.parse(rcv_json_text);
      console.log("json text = ", rcv_json.message);
      console.log("json number = ", rcv_json.sound);
      console.log("json boolean = ", rcv_json.reply);

      await db.update({
        table: "t_request_logs",
        sets: {
          res_http_status: response.statusCode,
          res_body: res_body,
          res_time: now_responsed,
          updated: now_responsed,
          updated_by: "jibun"
        },
        conditions: {
          id: _POST.request_logs_id,
        },
      });
      res.header('Content-Type', 'application/json; charset=utf-8')
      res.send({result: '0', data: res_body});
    });
  });
  // タイムアウト
  request.on('socket', function (socket) {
    socket.setTimeout(3000);  
    socket.on('timeout', function() {
      request.abort();
    });
  });

  // 送信のエラー処理
  request.on('error', function(e){
    if (e.code === "ECONNRESET") {
      let err_message = "Timeout occurs";
      console.log(err_message);
    } else {
      let err_message = e.message;
      console.log( "エラー発生: ", e.message);
    }
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send({result: '9', err_message: err_message});
  });
  
  // データ送信(POST)
  request.write(postData);
  request.end();
};

