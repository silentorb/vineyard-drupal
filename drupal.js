/// <reference path="../vineyard/vineyard.d.ts"/>
/// <reference path="../vineyard-lawn/lawn.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Vineyard = require('vineyard');
var Request = require('request');
var Drupal = (function (_super) {
    __extends(Drupal, _super);
    function Drupal() {
        _super.apply(this, arguments);
    }
    Drupal.prototype.grow = function () {
        var _this = this;
        if (!this.config.endpoint || !this.config.login)
            return;
        var ground = this.ground;
        var trellises = this.config.trellises;
        for (var name in trellises) {
            var map = trellises[name];
            map.trellis = ground.trellises[name];
            map.name = map.name || map.trellis.name;
            this.listen(ground, map.name + '.created', function (seed) { return _this.update_entity(seed, map); });
            this.listen(ground, map.name + '.updated', function (seed) { return _this.update_entity(seed, map); });
        }
    };
    Drupal.prototype.get_entity = function (seed, map) {
        return this.send('GET', map.name + '/' + map.trellis.get_identity(seed) + '.json', null);
    };
    Drupal.prototype.create_entity = function (seed, map) {
        console.log('created', map.name);
        var package = this.prepare_seed(seed, map);
        return this.send('POST', map.name + '.json', package);
    };
    Drupal.prototype.update_entity = function (seed, map) {
        if (map.name != 'user')
            return when.resolve();
        var user = {
            trellis: 'user',
            uid: seed.id,
            name: seed.username,
            mail: seed.email,
            pass: seed.password
        };
        var package = {
            objects: [user]
        };
        console.log('e', user);
        //return this.login()
        return this.send('POST', 'vineyard/update', package);
        //var package = this.prepare_seed(seed, map)
        //return this.send('PUT', map.name + '/' + map.trellis.get_identity(seed) + '.json', package)
    };
    Drupal.prototype.delete_entity = function (seed, map) {
        return this.send('DELETE', map.name + '/' + map.trellis.get_identity(seed) + '.json', null);
    };
    Drupal.prototype.prepare_seed = function (seed, map) {
        var result = {};
        for (var key in map.properties) {
            var info = map.properties[key];
            var name = info.name || key;
            result[name] = seed[key];
        }
        return result;
    };
    Drupal.prototype.send = function (method, path, body, autologin) {
        var _this = this;
        if (autologin === void 0) { autologin = true; }
        var url = 'http://' + this.config.endpoint + '/' + path;
        console.log('drupal-request', method, url, body);
        var options = {
            url: url,
            method: method,
            json: true
        };
        if (body) {
            options.body = body;
        }
        //options.proxy = 'http://127.0.0.1:8888'
        if (this.cookie) {
            options.headers = {};
            options.headers['Cookie'] = this.cookie;
        }
        var def = when.defer();
        Request(options, function (error, response, content) {
            //console.log(arguments)
            if (error) {
                console.error(error);
                def.reject(error);
                return;
            }
            if (autologin && (response.statusCode == 401 || response.statusCode == 403)) {
                return _this.login().then(function () { return _this.send(method, path, body, false); }).then(function (body, response) {
                    def.resolve(body, response);
                });
            }
            else if (response.statusCode != 200) {
                console.error('drupal-error', response.statusCode);
                def.reject(new Error(response.statusCode));
                return;
            }
            def.resolve([content, response]);
        });
        return def.promise;
    };
    Drupal.prototype.login = function () {
        var _this = this;
        console.log('Logging into Drupal');
        return this.send('POST', 'api/user/login.json', this.config.login, false).then(function (result) {
            var res = result[1];
            var cookie = res.headers["set-cookie"];
            if (cookie) {
                _this.cookie = (cookie + "").split(";").shift();
            }
            console.log('response', _this.cookie);
        });
    };
    return Drupal;
})(Vineyard.Bulb);
module.exports = Drupal;
//# sourceMappingURL=drupal.js.map