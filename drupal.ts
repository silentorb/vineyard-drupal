/// <reference path="../vineyard/vineyard.d.ts"/>
/// <reference path="../vineyard-lawn/lawn.d.ts"/>

import Vineyard = require('vineyard')
var Request = require('request')

interface Trellis_Map {
  name?:string
  properties:any
}

interface Login {
  name:string
  pass:string
}

interface Config {
  endpoint:string
  trellises:{ [s: string]: Trellis_Map }
  login:Login
}

class Drupal extends Vineyard.Bulb {
  config:Config

  grow() {

    var ground = this.ground
    var trellises = this.config.trellises

    for (var name in trellises) {
      var map = trellises[name]
      var trellis = ground.trellises[name]
      this.listen(ground, name + '.created', (seed) => this.create_entity(trellis, seed, map))
      this.listen(ground, name + '.updated', (seed) => this.update_entity(trellis, seed, map))
    }
  }

  get_entity(trellis, seed, map):Promise {
    var trellis_name = map.name || trellis.name
    return send('GET', trellis_name + '/' + trellis.get_identity(seed) + '.json', null)
  }

  create_entity(trellis, seed, map):Promise {
    var package = this.prepare_seed(trellis, seed, map)
    var trellis_name = map.name || trellis.name
    return send('POST', trellis_name + '.json', package)
  }

  update_entity(trellis, seed, map):Promise {
    var package = this.prepare_seed(trellis, seed, map)
    var trellis_name = map.name || trellis.name
    return send('PUT', trellis_name + '/' + trellis.get_identity(seed) + '.json', package)
  }

  prepare_seed(trellis, seed, map) {
    var result = {}
    for (var key in map) {
      var info = map[key]
      var name = info.name || key
      result[name] = seed[key]
    }

    return result
  }

  send(method, path, body, autologin = true):Promise {
    var options = {
      url: endpoint + '/' + path,
      method: method,
      json: true,
      body: body
    }

    var def = when.defer()
    Request.post(options, (error, response, body)=> {
      if (response.statusCode == 401 && autologin) {
        return this.login()
        .then(()=> send(method, path, body, false))
        .then((body, response)=> {
            def.resolve(body, response)
          })
      }

      if (error) {
        console.error(error)
      }

      def.resolve(body, response)
    })

    return def.promise
  }

  login() {
    return send('POST', 'user/login.json', this.config.login, false)
  }
}

export = Drupal