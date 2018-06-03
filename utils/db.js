const mysql = require('mysql');
const db = Object();

const custom_format = function (query, values) {
  if (!values) return query;
    return query.replace(/\:(\w+)/g, function (txt, key) {
  if (values.hasOwnProperty(key)) {
    return this.escape(values[key]);
  }
    return txt;
  }.bind(this));
};

db.connect = function() {
  console.log('INFO.CONNECTION_DB: ');
  let connection = mysql.createConnection({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_DBNAME 
  });
  global.connection = connection;
  
  //connection取得
  connection.connect(function(err) {
    if (err) {
      console.log('ERROR.CONNECTION_DB: ', err);
      setTimeout(arguments.callee, 1000);
    }
  });
  
  //error('PROTOCOL_CONNECTION_LOST')時に再接続
  connection.on('error', function(err) {
    console.log('ERROR.DB: ', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('ERROR.CONNECTION_LOST: ', err);
      arguments.callee();
    } else {
      throw err;
    }
  });

  return connection;
}

/**
 * select rows
 * @param {String} sql クエリ（プリペアードステートメント）
 * @param {Object} [params={}] パラメータ {key:パラメータ名, value:値}
 * @return {Array} select結果
 */
db.getRows = async function({sql, params = {}}) {
  return new Promise((resolve, reject) => {
    connection.config.queryFormat = custom_format;
    connection.query({ sql: sql, values: params }, (error, results, fields) => {
      connection.config.queryFormat = undefined;
      if (error) reject(error);
      resolve ((!results || results.length == 0) ? [] : results);
    });
  });
}

/**
 * select row onlt first
 * @param {String} sql クエリ（プリペアードステートメント）
 * @param {Object} [params={}] パラメータ {key:パラメータ名, value:値}
 * @return {Object} select結果の１行目
 */
db.getARow = async function({sql, params = {}}) {
  console.log(connection.config.queryFormat);
  return new Promise((resolve, reject) => {
    connection.config.queryFormat = custom_format;
    connection.query({ sql: sql, values: params }, (error, results, fields) => {
      connection.config.queryFormat = undefined;
      if (error) reject(error);
      resolve ((!results || results.length == 0) ? undefined : results[0]);
    });
  });
}

/**
 * insert a row
 * @param {String} table テーブル名
 * @param {Object} row 追加行 {key:カラム名, value:値}
 * @returns {number} 登録により採番されたid
 */
db.insert = async function({table, row}) {
  return new Promise((resolve, reject) => {
    connection.query(`insert into ${table} set ?`, row, (error, results) => {
      if (error) reject(error);
      resolve (results.insertId);
    });
  });
}

/**
 * update table
 * @param {String} table テーブル名
 * @param {Object} sets 更新値 {key:カラム名, value:更新値}
 * @param {Object} [conditions=null] 更新条件 {key:カラム名, value:条件値}
 * @returns {number} 更新された行数
 */
db.update = async function({table, sets, conditions = null}) {
  return new Promise(resolve => {
    connection.query(`update ${table} set ? where 1 = 1 and ?`, [sets, conditions], (error, results, fields) => {
      if (error) reject(error);
      console.log(results);
      resolve (results.affectedRows);
    });
  });
}

module.exports = db;