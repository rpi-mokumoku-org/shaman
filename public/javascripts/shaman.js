(function($){
  $.fn.vtoggle = function(config){
    var $this = $(this);


    switch ($this.css("visibility")){
      case "visible":
        $this.removeClass("vis_visible");
        $this.addClass("vis_hidden");
        break;
      case "hidden":
        $this.removeClass("vis_hidden");
        $this.addClass("vis_visible");
        break;
      default:
        //
      break;
    }
    return $this;
  };
})(jQuery);
