
// Database Connect
var mysql = require('mysql');
var inet = require('inet');
var querystring = require("querystring");
var https = require("https");
var http = require("http");
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');

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
exports.request = function(req, res) {
  var now = new Date();
  
  connection.query('select * from m_devices where id = ?', [req.body.device_id], function (error, results, fields) {
    if (error) throw error;
    var device = results[0];
    
    connection.query('select * from m_requests where id = ?', [req.body.request_id], function (error, results, fields) {
      if (error) throw error;
      var m_request = results[0];
      
      connection.query(
        'insert into t_request_logs set ?',
        {
          device_code: device.code,
          request_id: m_request.id,
          req_host_name: inet.ntoa(device.ip_address),
          req_http_method: m_request.http_method,
          req_request_url: m_request.url,
          req_time: now,
          created: now,
          created_by: "jibun",
          updated: now,
          updated_by: "jibun"},
      function (error, results, fields) {
        if (error) throw error;
        var request_logs_id = results.insertId;
      
        connection.query('select * from m_request_params where request_id = ?', [m_request.id], function (error, results, fields) {
          if (error) throw error;
          
          var json_data = {};
          results.forEach(param => json_data[param.key] = param.value);

          //var json_data = {};
          //var text_data = JSON.stringify(json_data);
          var postData = querystring.stringify(json_data);
          
          var port = device.port;
          if (!port) port = 80; 

          var options = {
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
          var request = http.request(options, function(response) {
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
            response.on('end', function(){
              var now_responsed = new Date();
              // Query String -> JSON形式へ変換
              var rcv_text = querystring.parse(decoder.write(res_body))
              var rcv_json_text = JSON.stringify(rcv_text);
              var rcv_json = JSON.parse(rcv_json_text);
              console.log("json text = ", rcv_json.message);
              console.log("json number = ", rcv_json.sound);
              console.log("json boolean = ", rcv_json.reply);

              connection.query({
                sql: 
                  'update m_devices set ? where id = ?;',
                values: [{
                  status     : '1',
                  updated    : now,
                  updated_by :"jibun"},
                  req.body.device_id],
              }, function (error, results, fields) {
                if (error) throw error;
              })
              connection.query(
                'update t_request_logs set ? where id = ?',
                [{
                  res_http_status: response.statusCode,
                  res_body: res_body,
                  res_time: now_responsed,
                  updated: now_responsed,
                  updated_by: "jibun"},
                  request_logs_id
                ],
              function (error, results, fields) {
                if (error) throw error;
                res.header('Content-Type', 'application/json; charset=utf-8')
                res.send({result: '0', data: res_body});
            
              });
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
              var err_message = "Timeout occurs";
              console.log(err_message);
            } else {
              var err_message = e.message;
              console.log( "エラー発生: ", e.message);
            }
  
            connection.query({
              sql: 
                'update m_devices set ? where id = ?;',
              values: [{
                status     : '0',
                updated    : now,
                updated_by :"jibun"},
                req.body.device_id],
            }, function (error, results, fields) {
              if (error) throw error;
              res.header('Content-Type', 'application/json; charset=utf-8')
              res.send({result: '9', err_message: err_message});
            })

          });
          
          // データ送信(POST)
          request.write(postData);
          request.end();
    
        });
      });
    })
  })
};

exports.prerequest = function(req, res) {
  var now = new Date();
  
  console.log(req.body);
    
  connection.query('select * from m_requests where id = ?', [req.body.request_id], function (error, results, fields) {
    if (error) throw error;
    var m_request = results[0];
    
    connection.query(
      'insert into t_request_logs set ?',
      {
        request_id: m_request.id,
        req_host_name: inet.ntoa(req.body.ip_address),
        req_http_method: m_request.http_method,
        req_request_url: m_request.url,
        req_time: now,
        created: now,
        created_by: "jibun",
        updated: now,
        updated_by: "jibun"},
    function (error, results, fields) {
      if (error) throw error;
      var request_logs_id = results.insertId;
    
      connection.query('select * from m_request_params where request_id = ?', [m_request.id], function (error, results, fields) {
        if (error) throw error;
        
        console.log(results);
        var json_data = {};
        results.forEach(param => json_data[param.key] = param.value);

        //var json_data = {};
        //var text_data = JSON.stringify(json_data);
        var postData = querystring.stringify(json_data);
        
        var port = req.body.port;
        if (!port) port = 80; 

        var options = {
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
        var request = http.request(options, function(response) {
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
          response.on('end', function(){
            var now_responsed = new Date();
            // Query String -> JSON形式へ変換
            var rcv_text = querystring.parse(decoder.write(res_body))
            var rcv_json_text = JSON.stringify(rcv_text);
            var rcv_json = JSON.parse(rcv_json_text);
            console.log("json text = ", rcv_json.message);
            console.log("json number = ", rcv_json.sound);
            console.log("json boolean = ", rcv_json.reply);

            connection.query(
              'update t_request_logs set ? where id = ?',
              [{
                res_http_status: response.statusCode,
                res_body: res_body,
                res_time: now_responsed,
                updated: now_responsed,
                updated_by: "jibun"},
                request_logs_id
              ],
            function (error, results, fields) {
              if (error) throw error;
              res.header('Content-Type', 'application/json; charset=utf-8')
              res.send({result: '0', data: res_body});
          
            });
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
            var err_message = "Timeout occurs";
            console.log(err_message);
          } else {
            var err_message = e.message;
            console.log( "エラー発生: ", e.message);
          }
          res.header('Content-Type', 'application/json; charset=utf-8')
          res.send({result: '9', err_message: err_message});
        });
        
        // データ送信(POST)
        request.write(postData);
        request.end();
  
      });
    });
  })
};

