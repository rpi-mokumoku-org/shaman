$(function(){

  $('#test').iCheck({
    checkboxClass: 'icheckbox_square',
    radioClass: 'iradio_square',
    increaseArea: '20%' // optional
  });

  $('input').on('ifClicked', function(event){
    return;
  });

  // ip mask初期化
  $('[data-mask]').inputmask();

  $("#modal_button").click(function(){
    $("#modal_code").text($("[name=code]").val());
    $("#modal_name").text($("[name=name]").val());
    $("#modal_ip").text($("[name=ip]").val());
    $("#modal_port").text($("[name=port]").val());
  
  });

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
    }, 1000);
  });
  
  function con_status_clear() {
    $('#con_status').removeClass("btn-success btn-danger");
    $('#con_status i').removeClass("fa-ellipsis-h fa-spin fa-circle-o-notch fa-check fa-warning");
    $('#con_msg').text("");
  }
  function con_status_success() {
    con_status_clear();
    $('#con_status').addClass("btn-success");
    $('#con_status i').addClass("fa-check");
    $('#con_status span').text(" CONNECTED");
  }
  function con_status_failure() {
    con_status_clear();
    $('#con_status').addClass("btn-danger");
    $('#con_status i').addClass("fa-warning");
    $('#con_status span').text(" REFUSED");
  }
  function con_status_connecting() {
    con_status_clear();
    $('#con_status i').addClass("fa-spin fa-circle-o-notch");
    $('#con_status span').text(" CONNECTING...");
  }

  $("#confirm").click(function(){
    $("#device").submit();
  });
});
