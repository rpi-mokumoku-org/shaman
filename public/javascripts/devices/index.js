$(function(){
  
  // 疎通テストチェックボックス
  $('#test').iCheck({
    checkboxClass: 'icheckbox_square',
    radioClass: 'iradio_square',
    increaseArea: '20%' // optional
  });
  
  // ip mask初期化
  $('[data-mask]').inputmask();

  // 削除modalボタン
  $("#modal_delete_button").click(function(){
    $('#modal_delete_list li:not(.dummy)').remove();
    $('.check_delete:checked').each(function (i) {
      var id = $(this).val();
      var device = get_device(id);

      var $li = $('#modal_delete_list li.dummy').clone();
      $li.removeClass('dummy');
      $li.text(device.code);
      $('#modal_delete_list').append($li);
    });
  });
  
  // 削除ボタン
  $("#delete_button").click(function(){
    var delete_ids = [];
    $('.check_delete:checked').each(function (i) {
      var id = $(this).val();
      delete_ids.push(id);
    });
    
    $.ajax({
      type: "POST", 
      url: '/devices/delete', 
      data: {ids: delete_ids}, 
      success: function (result) {

        $('#modal-delete').modal('hide');
        reload_devices();
      }
    })
  });
  
  // 疎通テストボタン
  $("#test_btn").click(function(){
    con_status_connecting();
    setTimeout(function () {
      $.ajax({
        type: "POST", 
        url: '/prerequests', 
        data: {ip: $("[name=ip]").val(), port: $("[name=port]").val(), request_id: 2}, 
        success: function (result) {

          if (result.result == "0") {
            con_status_success();
            $('#test').iCheck('enable');
            $('#test').iCheck('check');
            $('#test').iCheck('disable');
          } else {
            con_status_failure();
            $('#con_msg').text(result.err_message);
          }
        }
      })
    }, 1000); // 通信してる感を出すために1秒Sleep
  });
 
  // 追加modalボタン
  $("#modal_add_button").click(function(){
    init_modal_device('Add New Devices', '/devices/register');
  });

  // 登録ボタン
  $("#register_button").click(function(){
    ajax_form("#device_form", function () {
      $('#modal-device').modal('hide');
      reload_devices();
    });
  });

  // 検索ボタン
  $("#search_button").click(function(){
    $('#main_box').hide();
    ajax_form("#search", function (result) {
        $('#devices_table tbody').hide();
        $('#devices_table tbody tr').remove();
        $('#devices_table tbody').append(result);
        init();
        $('#devices_table tbody').show();
        $('#main_box').fadeIn("700");
    });
  });
  
  // 初期処理
  init();
  
  // 一覧取得
  reload_devices();
});

// 初期処理 一覧のリロード時にコールできるように関数化
function init() {
  $('.check_delete').iCheck({
    checkboxClass: 'icheckbox_flat-grey',
    radioClass: 'iradio_square',
    increaseArea: '20%' // optional
  });

  $('.check_delete').on('ifChecked', function(event) {
    if ($('.check_delete:checked').length > 0) {
      $('#modal_delete_button').prop('disabled', false);
    } else {
      $('#modal_delete_button').prop('disabled', true);
    }
  });
  
  $('.check_delete').on('ifUnchecked', function(event) {
    if ($('.check_delete:checked').length > 0) {
      $('#modal_delete_button').prop('disabled', false);
    } else {
      $('#modal_delete_button').prop('disabled', true);
    }
  });
  
  // 変更modalボタン
  $(".modal_modify_button").click(function(){
    init_modal_device('Modify Devices', '/devices/update');
    var device = get_device($(this).val());
    $('#modal-device input[name=id]').val(device.id);
    $('#modal-device input[name=code]').val(device.code);
    $('#modal-device input[name=name]').val(device.name);
    $('#modal-device input[name=ip]').val(device.ip_address);
    $('#modal-device input[name=port]').val(device.port);
    $('#modal-device [name=description]').val(device.description);
    $('#modal-device input[name=ip]').blur();
  });
  
}

// デバイス情報取得
function get_device(id) {
  return JSON.parse($('#device_' + id).val());
}


// 疎通結果表示 クリア
function con_status_clear() {
  $('#con_status').removeClass("btn-success btn-danger");
  $('#con_status i').removeClass("fa-ellipsis-h fa-spin fa-circle-o-notch fa-check fa-warning");
  $('#con_msg').text("");
}
// 疎通結果表示 接続中
function con_status_connecting() {
  con_status_clear();
  $('#con_status i').addClass("fa-spin fa-circle-o-notch");
  $('#con_status span').text(" CONNECTING...");
}
// 疎通結果表示 成功
function con_status_success() {
  con_status_clear();
  $('#con_status').addClass("btn-success");
  $('#con_status i').addClass("fa-check");
  $('#con_status span').text(" CONNECTED");
}
// 疎通結果表示 失敗
function con_status_failure() {
  con_status_clear();
  $('#con_status').addClass("btn-danger");
  $('#con_status i').addClass("fa-warning");
  $('#con_status span').text(" REFUSED");
}

// formをajax送信する
function ajax_form(form_id, callback){
  var $form = $(form_id);
  var $button = $(this);
  $.ajax({
    type : $form.attr('method'), 
    url  : $form.attr('action'), 
    data : $form.serialize(),
    timeout: 10000,
    beforeSend: function(xhr, settings) {
      // ボタンを無効化し、二重送信を防止
      $button.attr('disabled', true);
    },
    complete: function(xhr, textStatus) {
      // ボタンを有効化し、再送信を許可
      $button.attr('disabled', false);
    },      
    success: function (result) {
      callback(result);
    }
  })
}

// 一覧再取得　データの登録変更削除後に呼ぶこと
function reload_devices(){
  $('#main_box').hide();
  $.ajax({
    type : 'GET', 
    url  : '/devices/_trs', 
    timeout: 10000,
    success: function (result) {

      $('#devices_table tbody').hide();
      $('#devices_table tbody tr').remove();
      $('#devices_table tbody').append(result);
      init();
      $('#devices_table tbody').show();
      $('#main_box').fadeIn("700");
    }
  })
}

function init_modal_device(title, action) {
  $("#modal_device_title").text(title);
  $("#device_form").attr('action', action);
  $('#modal-device input[name=id]').val('');
  $('#modal-device input[name=code]').val('');
  $('#modal-device input[name=name]').val('');
  $('#modal-device input[name=ip]').val('');
  $('#modal-device input[name=port]').val('');
  $('#modal-device [name=description]').val('');
  $('#modal-device input[name=ip]').blur();
}
