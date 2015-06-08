/// <reference path="../vineyard/vineyard.d.ts"/>
/// <reference path="../vineyard-lawn/lawn.d.ts"/>

import Vineyard = require('vineyard')
var Request = require('request')

interface Trellis_Map {
  name?:string
  properties:any
  trellis?:Ground.Trellis
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
    if (!this.config.endpoint || !this.config.login)
      return

    var ground = this.ground
    var trellises = this.config.trellises

    for (var name in trellises) {
      var map = trellises[name]
      map.trellis = ground.trellises[name]
      map.name = map.name || map.trellis.name

      this.listen(ground, name + '.created', (seed) => this.create_entity(seed, map))
      this.listen(ground, name + '.updated', (seed) => this.update_entity(seed, map))
      this.listen(ground, name + '.deleted', (seed) => this.delete_entity(seed, map))
    }
  }

  get_entity(seed, map):Promise {
    return this.send('GET', map.name + '/' + map.trellis.get_identity(seed) + '.json', null)
  }

  create_entity(seed, map):Promise {
    var package = this.prepare_seed(seed, map)
    return this.send('POST', map.name + '.json', package)
  }

  update_entity(seed, map):Promise {
    var package = this.prepare_seed(seed, map)
    return this.send('PUT', map.name + '/' + map.trellis.get_identity(seed) + '.json', package)
  }

  delete_entity(seed, map):Promise {
    return this.send('DELETE', map.name + '/' + map.trellis.get_identity(seed) + '.json', null)
  }

  prepare_seed(seed, map) {
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
      url: this.config.endpoint + '/' + path,
      method: method,
      json: true,
      body: body
    }

    var def = when.defer()
    Request.post(options, (error, response, body)=> {
      if (response.statusCode == 401 && autologin) {
        return this.login()
        .then(()=> this.send(method, path, body, false))
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
    return this.send('POST', 'user/login.json', this.config.login, false)
  }
}

export = Drupal