$(function(){
  
  // To make Pace works on Ajax calls
  $(document).ajaxStart(function () {
    Pace.restart()
  })

  reload_all();
  
  $('.get_status').click(function () {
    reload_status();
  })

  $('#get_sensor_status_button').click(function () {
    reload_sensor_status();
  })
  
  $('.get_logs').click(function () {
    get_logs();
  })

  $('.get_temp').click(function () {
    get_temp_logs();
  })
  
  $('#get_history_button').click(function () {
    get_door_history();
  })
  
  $('#request').click(function () {
    $('#response').vtoggle();
    request_btn_connecting('request');
    request(function(result) {
      if (result.result == '9') {
        $('#response').text(result.err_message);
        $('#response').vtoggle();
        request_btn_clear('request');
        reload_status();
        return;
      }
      setTimeout(function () {
        $('#response').text(JSON.stringify(result.data));
        $('#response').vtoggle();
        request_btn_clear('request');
        reload_all();
      }, 1000); // 通信してる感を出すために1秒Sleep
    });
  })
});


// ログ取得
function get_logs() {
  $.ajax({
    type: "POST", 
    url: '/devices/logs/' + $("#code").val(), 
    data: {last_disp_id: $("#last_disp_id").val()}, 
    success: function (result) {
      if (!result.logs.length) {
        return;
      }
      $("#last_disp_id").val(result.last_disp_id);

      $dummy_tr = $(".log_table tr.dummy");
      for (log of result.logs) {
        $tr = $dummy_tr.clone();
        $tr.removeClass("dummy");
        $tr.children(".log_id").text(log.id);
        $tr.children(".log_device_code").text(log.device_code);
        $tr.children(".log_status").text(log.status);
        $tr.children(".log_sense_time").text(moment(log.sense_time).format("YYYY/MM/DD HH:mm:ss"));
        $dummy_tr.after($tr);
        $tr.fadeIn("slow");

      }
    }
  })
}

function reload_all() {
  reload_status();
  reload_sensor_status();
  
  get_temp_logs();
  get_door_history();

  reload_door();
  reload_temp();
  reload_rh();
}

function reload_status() {
  get_device($("#id").val(), function(data) {
              var con = {
                '0': {
                    color: "bg-red",
                    icon : "fa-ban",
                    msg  : "Offline"
                  },
                '1': {
                    color: "bg-green",
                    icon : "fa-wifi",
                    msg  : "Online"
                }}[data.status]; 
    var $dd = $('#status');
    var $span = $('#status span.badge');
    var $icon = $('#status span i');
    var $message = $('#status span#status_message');
    
    $dd.vtoggle();
    $span.removeClass('bg-red bg-green').addClass(con.color);
    $icon.removeClass('fa-ban fa-wifi').addClass(con.icon);
    $message.text(con.msg);
    $dd.vtoggle();
  })
}
  
function get_device(id, callback) {
  $.ajax({
    url: `/devices/status/${id}`, 
    success: function (result) {
      callback(result);
    }
  })
}
function get_sensor_status(callback) {
  $('#sensor_status_table tbody tr:not(.dummy)').remove();
  $.ajax({
    type: "POST", 
    url: '/devices/last_senses', 
    data: {code: $('#code').val()}, 
    success: function (result) {
      if (!result.data.length) {
        callback([]);
      }
      callback(result.data);
    }
  })
}
function reload_sensor_status() {
  get_sensor_status(function(datalist) {
    if (!datalist.length) {
      return;
    }
    $dummy_tr = $("#sensor_status_table tbody tr.dummy");
    var no = 1;
    for (data of datalist) {
      $tr = $dummy_tr.clone();
      $tr.removeClass("dummy");
      $tr.hide();
      $tr.children(".id").text(no++);
      $tr.children(".sense_type").text(data.sense_type);
      $tr.children(".status").text(data.status);
      $tr.children(".last_sense_time").text(moment(data.sense_time).format("YYYY/MM/DD HH:mm:ss"));
      $('#sensor_status_table tbody').append($tr);
      $tr.fadeIn("slow");
    }
  });
}

function reload_door() {
  get_sensor_status(function(datalist) {
    if (!datalist.length) {
      return;
    }
    var sense_data_door;
    for (data of datalist) {
      if (data.sense_type == 'door') {
        sense_data_door = data;
      }
    }
    if (!sense_data_door) {
      return;
    }
    var status = Number(JSON.parse(sense_data_door.sense_data).status);
    var label = {0: 'OPEN', 1: 'CLOSE' };
    $box = $('#box_door');
    $box.find('.data').vtoggle();
    $box.find('.sense_time').vtoggle();
    $box.find('.data').text(label[status]);
    $box.find('.sence_time').text(moment(sense_data_door.sense_time).format('HH:mm'));
    $box.find('.data').vtoggle();
    $box.find('.sense_time').vtoggle();
  });
}

function reload_temp() {
  get_sensor_status(function(datalist) {
    if (!datalist.length) {
      return;
    }
    var sense_data;
    for (data of datalist) {
      if (data.sense_type == 'temp_RH') {
        sense_data = data;
      }
    }
    if (!sense_data) {
      return;
    }
    var data = Number(JSON.parse(sense_data.sense_data).temperature);
    $box = $('#box_temp');
    $box.find('.data').vtoggle();
    $box.find('.sense_time').vtoggle();
    $box.find('.data').text(data + ' ℃');
    $box.find('.sence_time').text(moment(sense_data.sense_time).format('HH:mm'));
    $box.find('.data').vtoggle();
    $box.find('.sense_time').vtoggle();
  });
}

function reload_rh() {
  get_sensor_status(function(datalist) {
    if (!datalist.length) {
      return;
    }
    var sense_data;
    for (data of datalist) {
      if (data.sense_type == 'temp_RH') {
        sense_data = data;
      }
    }
    if (!sense_data) {
      return;
    }
    var data = Number(JSON.parse(sense_data.sense_data).humidity);
    $box = $('#box_rh');
    $box.find('.data').vtoggle();
    $box.find('.sense_time').vtoggle();
    $box.find('.data').text(data + ' %');
    $box.find('.sence_time').text(moment(sense_data.sense_time).format('HH:mm'));
    $box.find('.data').vtoggle();
    $box.find('.sense_time').vtoggle();
  });
}

// 温度センサーログ取得
function get_temp_logs() {
  $.ajax({
    type: "POST", 
    url: '/devices/logs/temp_RH/' + $("#code").val(), 
    data: {min_disp_id: $("#min_disp_id").val(), limit: 20}, 
    success: function (result) {
      var ctx = document.getElementById('tempsChart').getContext('2d');
      var tempsChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: result.labels,
          datasets: [{
              label: "temperature",
              data: result.temps,
              borderColor: "rgba(255,153,0,0.4)", 
              pointBackgroundColor: "rgba(255,153,0,0.4)", 
              backgroundColor: "rgba(255,153,0,0.4)", 
              fill: false,
              yAxisID: "y-temp"
            }, {
              label: "humidity",
              data: result.humis,
              //borderColor: "rgba(153,255,51,0.4)", 
              //pointBackgroundColor: "rgba(153,255,51,0.4)", 
              backgroundColor: "rgba(153,255,51,0.4)", 
              //fill: false,
              yAxisID: "y-humi"
          }]
        },
        options: {
          responsive: true,
          scales: {
            yAxes: [{
              id: "y-temp",
              type: "linear",
              position: "left",
              labelString: '℃',
              ticks: {
                max: 25,
                min: 5,
                stepSize: 5
              },
            }, {
              id: "y-humi",
              type: "linear",
              position: "right",
              labelString: '％',
              ticks: {
                max: 90,
                min: 10,
                stepSize: 10
              },
            }],
            xAxes: [{
              type: "time",
              time: {
                unit: 'minute',
                displayFormats: {
                  minute: 'H:mm'
                },
                tooltipFormat: 'YYYY/MM/DD HH:mm'
              },
              distribution: 'linear'
            }]
            //xAxes: [{
            //  type: "time",
            //  time: {
            //    unit: 'hour',
            //    displayFormats: {
            //      hour: 'M/D hA'
            //    },
            //    tooltipFormat: 'YYYY/MM/DD HH:mm'
            //  },
            //  distribution: 'linear',
            //}]
          }
        }
      });
    }
  })
}

// ドア履歴
function get_door_history() {
  $.ajax({
    type: "POST", 
    url: '/devices/door_history', 
    data: {code: $('#code').val(), min_disp_id: $("#min_disp_id").val(), limit: 20}, 
    success: function (result) {
      var ctx = document.getElementById('doorHistory').getContext('2d');
      var tempsChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: result.labels,
          datasets: [{
            label: "door ( 0:OPEN / 1:CLOSE )",
            steppedLine: true,
            data: result.door,
            borderColor: "rgba(0,115,183,1)", 
            pointBackgroundColor: "rgba(0,115,183,1)", 
            backgroundColor: "rgba(0,115,183,1)", 
            fill: false,
            yAxisID: "y-temp"
          }]
        },
        options: {
          responsive: true,
          scales: {
            yAxes: [{
              id: "y-temp",
              type: "linear",
              position: "left",
              ticks: {
                max: 2,
                min: 0,
                stepSize: 1
              }
            }],
            xAxes: [{
              type: "time",
              time: {
                unit: 'minute',
                displayFormats: {
                  minute: 'H:mm'
                 // minute: 'M/D h:mm A'
                },
                tooltipFormat: 'YYYY/MM/DD HH:mm'
              },
              distribution: 'linear'
            }]
          }
        }
      });
    }
  })
}

// デバイスリクエスト
function request(callback) {
  $.ajax({
    type: "POST", 
    url: '/requests', 
    data: {device_id: $('#device_id').val(), request_id: $('#request_id').val()}, 
    success: function (result) {
      callback(result);
    }
  });
}

// 疎通結果表示 クリア
function request_btn_clear(id) {
  $(`#${id}`).addClass("btn-danger");
  $(`#${id} i`).removeClass("fa fa-circle-o-notch");
  $(`#${id} span`).text("Send Request");
  $(`#${id}`).prop("disabled", false);
}
function request_btn_connecting(id) {
  $(`#${id}`).prop("disabled", true);
  $(`#${id}`).removeClass("btn-danger");
  $(`#${id} i`).addClass("fa fa-spin fa-circle-o-notch");
  $(`#${id} span`).text(" CONNECTING...");
}
