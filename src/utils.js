/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

ATF.factory('utils', [], function () {
    return {
        isExpr: function (value) {
            return value.match(/({{.*?}})/) ? true : false;
        },

        eval: function (__js) {
            return function (__data, __vars) {
                var __result, $self = __data;
                with (__vars||{}) {
                    with (__data) {
                        try {
                            __result = eval(__js);
                        } catch (e) {
                            console.warn(e.message);
                            console.warn(e.stack);
                        }
                    }
                }
                return __result;
            };
        },

        expr: function (__value) {
            return this.eval('"' + __value.replace(/{{(.*?)}}/g, '" + ($1) + "') + '"')
        },

        each: function (arr, callback, context) {
            if (typeof arr !== "object") return;

            if (arr.length !== undefined) {
                for (var i = 0; i <  arr.length; i++) {
                    if (callback.call(context, arr[i], i, arr)) break;
                }
            } else {
                for (var i in arr) {
                    if (arr.hasOwnProperty(i)) {
                        if (callback.call(context, arr[i], i, arr)) break;
                    }
                }
            }

            return context;
        },

        lens:function (path) {
            return function __lens__(obj, _path) {
                _path = _path || path;

                var dotIndex = _path.indexOf('.');

                if (!obj) {
                    return undefined;
                }

                return dotIndex === -1 ? obj[_path] : __lens__(obj[_path.substr(0, dotIndex)], _path.substr(dotIndex + 1));
            };
        },
        
        params: function (hash, keyDelim, itemDelim, encode) {
            keyDelim = typeof keyDelim === "string" ? keyDelim : '='; 
            itemDelim = typeof itemDelim === "string" ? itemDelim : '&'; 
            
            return this.each(hash, function (value, key) {
                this.push(key + keyDelim + (encode ? encodeURIComponent(value) : value));
            }, []).join(itemDelim);
        }
    }
});