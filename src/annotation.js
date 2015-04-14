/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

ATF.service('$directiveProvider', [], function () {
    function DirectiveProvider () {
        this.directives = [];
    }

    DirectiveProvider.prototype = {
        register: function (name, obj) {
            this.directives.push({
                name: name,
                controller: obj
            });
        },
        all: function () {
            return this.directives;
        }
    };

    return new DirectiveProvider();
});