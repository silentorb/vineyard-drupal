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
        var ground = this.ground;
        var trellises = this.config.trellises;
        for (var name in trellises) {
            var map = trellises[name];
            map.trellis = ground.trellises[name];
            map.name = map.name || map.trellis.name;
            this.listen(ground, name + '.created', function (seed) { return _this.create_entity(seed, map); });
            this.listen(ground, name + '.updated', function (seed) { return _this.update_entity(seed, map); });
            this.listen(ground, name + '.deleted', function (seed) { return _this.delete_entity(seed, map); });
        }
    };
    Drupal.prototype.get_entity = function (seed, map) {
        return this.send('GET', map.name + '/' + map.trellis.get_identity(seed) + '.json', null);
    };
    Drupal.prototype.create_entity = function (seed, map) {
        var package = this.prepare_seed(seed, map);
        return this.send('POST', map.name + '.json', package);
    };
    Drupal.prototype.update_entity = function (seed, map) {
        var package = this.prepare_seed(seed, map);
        return this.send('PUT', map.name + '/' + map.trellis.get_identity(seed) + '.json', package);
    };
    Drupal.prototype.delete_entity = function (seed, map) {
        return this.send('DELETE', map.name + '/' + map.trellis.get_identity(seed) + '.json', null);
    };
    Drupal.prototype.prepare_seed = function (seed, map) {
        var result = {};
        for (var key in map) {
            var info = map[key];
            var name = info.name || key;
            result[name] = seed[key];
        }
        return result;
    };
    Drupal.prototype.send = function (method, path, body, autologin) {
        var _this = this;
        if (autologin === void 0) { autologin = true; }
        var options = {
            url: this.config.endpoint + '/' + path,
            method: method,
            json: true,
            body: body
        };
        var def = when.defer();
        Request.post(options, function (error, response, body) {
            if (response.statusCode == 401 && autologin) {
                return _this.login().then(function () { return _this.send(method, path, body, false); }).then(function (body, response) {
                    def.resolve(body, response);
                });
            }
            if (error) {
                console.error(error);
            }
            def.resolve(body, response);
        });
        return def.promise;
    };
    Drupal.prototype.login = function () {
        return this.send('POST', 'user/login.json', this.config.login, false);
    };
    return Drupal;
})(Vineyard.Bulb);
module.exports = Drupal;
//# sourceMappingURL=drupal.js.map