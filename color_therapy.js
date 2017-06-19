if (Meteor.isClient) {
  Session.setDefault('figure_shape', 'square');
  Session.setDefault('figure_rotation', 0);
  Session.setDefault('figure_color', '#556270');
  Session.setDefault('figure_text', '');
  Session.setDefault('figure_text_display_mode', 'continuous');

  Session.setDefault('polygon_sides', 6);
  Session.setDefault('star_points', 5);

  Session.setDefault('background_color', '#ADD8C7');

  Session.setDefault('animation_duration', 1000);
  Session.setDefault('animation_scale', 100);
  Session.setDefault('animation_rotation', 0);

  Session.set('last_frame_time', 0);

  var settings_options = [
    'figure_shape',
    'figure_rotation',
    'figure_color',
    'figure_text',
    'figure_text_display_mode',
    'polygon_sides',
    'star_points',
    'background_color',
    'animation_duration',
    'animation_scale',
    'animation_rotation',
  ];

  var canvas_ctx = null;

  UI.registerHelper('isActiveFigureShape', function(context, options) {
    if (context) {
      return Session.get('figure_shape') == context ? { selected: 'selected' } : null;
    }
  });

  UI.registerHelper('isActiveFigureTextDisplayMode', function(context, options) {
    if (context) {
      return Session.get('figure_text_display_mode') == context ? { selected: 'selected' } : null;
    }
  });

  Template.options_form.helpers({
    figure_shape: function() {
      return Session.get('figure_shape');
    },

    figure_rotation: function() {
      return Session.get('figure_rotation');
    },

    figure_color: function() {
      return Session.get('figure_color');
    },

    figure_text: function() {
      return Session.get('figure_text');
    },

    figure_text_display_mode: function() {
      return Session.get('figure_text_display_mode');
    },

    polygon_sides: function() {
      return Session.get('polygon_sides');
    },

    star_points: function() {
      return Session.get('star_points');
    },

    background_color: function() {
      return Session.get('background_color');
    },

    animation_duration: function() {
      return Session.get('animation_duration');
    },

    animation_scale: function() {
      return Session.get('animation_scale');
    },

    animation_rotation: function() {
      return Session.get('animation_rotation');
    },
  });

  Template.options_form.events({
    "change #options-form select, \
     blur #options-form input, \
     changeColor #options-form .colorpicker, \
     change #options-form .slider, \
     submit #options-form": function(event) {
      var form = $(event.target).closest('form')[0];

      for (var key in settings_options) {
        Session.set(settings_options[key], form[settings_options[key]].value);
      }

      if (event.target == form) {
        $(form).closest('.modal').modal('hide');
      }

      // Prevent default form submit
      return false;
    },
  });

  Template.options_form.onRendered(function() {
    $(this.findAll('.colorpicker')).colorpicker();

    $(this.findAll('.slider')).each(function(key, value) {
      var $this = $(value);

      $this.noUiSlider({
        start: $this.data('start') || 0,
        step: $this.data('step') || 1,
        range: {
          'min': $this.data('range-min') || 0,
          'max': $this.data('range-max') || 100,
        }
      });

      if ($this.data('linked-element') || false) {
        $this.on({
          change: function(e) {
            $($this.data('linked-element')).val($this.val());
          },
          slide: function(e) {
            $($this.data('linked-element')).val($this.val());
          }
        });
      }
    });
  });

  var drawCircle = function(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2, true);
    ctx.fill();
  };

  var drawRect = function(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
    ctx.fill();
  };

  var drawTriangle = function(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y - (h / 2));
    ctx.lineTo(x + (w / 2), y + (h / 2));
    ctx.lineTo(x - (w / 2), y + (h / 2));
    ctx.closePath();
    ctx.fill();
  };

  var drawPolygon = function(ctx, x, y, sides, size) {
    ctx.beginPath();
    ctx.moveTo(x + size * Math.cos(0), y + size *  Math.sin(0));

    for (var i = 1; i <= sides; i += 1) {
        ctx.lineTo(x + size * Math.cos(i * 2 * Math.PI / sides), y + size * Math.sin(i * 2 * Math.PI / sides));
    }

    ctx.closePath();
    ctx.fill();
  };

  var drawStar = function(ctx, x, y, points, size) {
    var rot = Math.PI / 2*3,
      step = Math.PI / points,
      size_outer = size,
      size_inner = size / 2;

    ctx.beginPath();
    ctx.moveTo(x, y - size_outer);

    for (var i = 0; i < points; i++) {
      ctx.lineTo(x + Math.cos(rot) * size_outer, y + Math.sin(rot) * size_outer);
      rot += step;

      ctx.lineTo(x + Math.cos(rot) * size_inner, y + Math.sin(rot) * size_inner);
      rot += step;
    }

    ctx.closePath();
    ctx.fill();
  };

  var drawText = function(ctx, x, y, text, color, size) {
    ctx.font= /*Math.round*/(size / text.length * 1.5) + 'px sans-serif';

    var style = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y, size);
    ctx.fillStyle = style;
  };

  var drawShape = function(time) {
    var elapsed = time - Session.get('last_frame_time');

    var animation_percentage = elapsed / Session.get('animation_duration');
    var animation_scale = Session.get('animation_scale') / 100;

    if (animation_percentage > 1) {
      if (animation_percentage > 2) {
        Session.set('last_frame_time', time);
        animation_percentage = animation_percentage - 2;
      } else {
        animation_percentage = 2 - animation_percentage;
      }
    }

    var bg_color = Session.get('background_color'),
      fill_color = Session.get('figure_color');

    var center_x = 0,
        center_y = 0;

    if (!canvas_ctx) {
      var canvas = document.getElementById('background');
      canvas_ctx = canvas.getContext('2d');
      canvas_ctx.textAlign = 'center';
      canvas_ctx.textBaseline = 'middle';
    }

    var ctx = canvas_ctx;
    var canvas_wh = (ctx.canvas.width > ctx.canvas.height ? ctx.canvas.height : ctx.canvas.width);

    // We need a bg
    ctx.fillStyle = bg_color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = fill_color;

    // Save the unrotated context of the canvas so we can restore it later
    // the alternative is to untranslate & unrotate after drawing
    ctx.save();

    // Move to the center of the canvas
    ctx.translate(ctx.canvas.width/2,ctx.canvas.height/2);

    // Determine how far we should rotate the figure at this point in time
    var rotation = ((Number(Session.get('animation_rotation')) * animation_percentage) + Number(Session.get('figure_rotation'))) * Math.PI / 180;
    ctx.rotate(rotation);

    switch (Session.get('figure_shape')) {
      case 'circle':
        var circle_radius = canvas_wh * (animation_percentage * animation_scale);

        drawCircle(ctx, center_x, center_y, circle_radius);

        break;

      case 'square':
        var square_side_length = canvas_wh * (animation_percentage * animation_scale);
        var half_square_side_length = square_side_length / 2;

        var square_x = center_x - half_square_side_length;
        var square_y = center_y - half_square_side_length;

        drawRect(ctx, square_x, square_y, square_side_length, square_side_length);

        break;

      case 'triangle':
        var triangle_size = canvas_wh * (animation_percentage * animation_scale);

        drawTriangle(ctx, center_x, center_y, triangle_size, triangle_size * 0.866025);

        break;

      case 'polygon':
        drawPolygon(ctx, center_x, center_y, Session.get('polygon_sides'), canvas_wh * (animation_percentage * animation_scale));

        break;

      case 'star':
        drawStar(ctx, center_x, center_y, Session.get('star_points'), canvas_wh * (animation_percentage * animation_scale));

        break;
    }

    if (Session.get('figure_text')) {
      if (Session.get('figure_text_display_mode') == 'continuous') {
        drawText(ctx, center_x, center_y, Session.get('figure_text'), Session.get('background_color'), canvas_wh * (animation_percentage * animation_scale) * 0.5);
      } else if (Session.get('figure_text_display_mode') == 'subliminal' && animation_percentage >= 0.995) {
        drawText(ctx, center_x, center_y, Session.get('figure_text'), Session.get('background_color'), canvas_wh * (animation_percentage * animation_scale) * 0.5);
      }
    }

    // Restore canvas context
    ctx.restore();

    window.requestAnimationFrame(drawShape);
  };

  var handleResize = function() {
    var canvas = document.getElementById('background');
    canvas.width = $(document).width();
    canvas.height = $(document).height();
  }

  Template.background.onRendered(function() {
    $(window).resize(handleResize);
    handleResize();

    window.requestAnimationFrame(drawShape);
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
