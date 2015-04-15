/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'jQuery'], function ($directiveProvider, $) {
    $directiveProvider.register('$AltImage', {
        link: function (name, el, scope, args) {
            var $el = $(el);
            var expr = args[0];

            var callback = function (event) {
                var img = new Image();
                img.src = expr;
                img.onload = (function () {
                    $(this).attr('src', expr);
                }).bind(this);
            };

            $el.on('error', callback);

            return el;
        }
    });
});