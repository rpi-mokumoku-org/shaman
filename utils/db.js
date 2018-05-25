var db = Object();

var custom_format = function (query, values) {
  if (!values) return query;
    return query.replace(/\:(\w+)/g, function (txt, key) {
  if (values.hasOwnProperty(key)) {
    return this.escape(values[key]);
  }
    return txt;
  }.bind(this));
};

db.getLows = async function(sql, params = {}) {
  return new Promise((resolve, reject) => {
    connection.config.queryFormat = custom_format;
    connection.query({ sql: sql, values: params }, (error, results, fields) => {
      connection.config.queryFormat = undefined;
      if (error) reject(error);
      resolve ((!results || results.length == 0) ? [] : results);
    });
  });
}

db.getALow = async function(sql, params = {}) {
  console.log(connection.config.queryFormat);
  return new Promise(resolve => {
    connection.config.queryFormat = custom_format;
    connection.query({ sql: sql, values: params }, (error, results, fields) => {
      connection.config.queryFormat = undefined;
      if (error) reject(error);
      resolve ((!results || results.length == 0) ? undefined : results[0]);
    });
  });
}

db.insert = async function(table, params = {}) {
  console.log(connection.config.queryFormat);
  return new Promise(resolve => {
    connection.config.queryFormat = custom_format;
    connection.query({ sql: sql, values: params }, (error, results, fields) => {
      connection.config.queryFormat = undefined;
      if (error) reject(error);
      resolve ((!results || results.length == 0) ? undefined : results[0]);
    });
  });
}

module.exports = db;