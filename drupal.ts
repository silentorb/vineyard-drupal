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
  cookie:string

  grow() {
    if (!this.config.endpoint || !this.config.login)
      return

    var ground = this.ground
    var trellises = this.config.trellises

    for (var name in trellises) {
      var map = trellises[name]
      map.trellis = ground.trellises[name]
      map.name = map.name || map.trellis.name

      this.listen(ground, map.name + '.created', (seed) => this.update_entity(seed, map))
      this.listen(ground, map.name + '.updated', (seed) => this.update_entity(seed, map))
      //this.listen(ground, name + '.deleted', (seed) => this.delete_entity(seed, map))
    }
  }

  get_entity(seed, map):Promise {
    return this.send('GET', map.name + '/' + map.trellis.get_identity(seed) + '.json', null)
  }

  create_entity(seed, map):Promise {
    console.log('created', map.name)
    var package = this.prepare_seed(seed, map)
    return this.send('POST', map.name + '.json', package)
  }

  update_entity(seed, map):Promise {
    if (map.name != 'user')
      return when.resolve()

    var user = {
      trellis: 'user',
      uid: seed.id,
      name: seed.username,
      mail: seed.email,
      pass: seed.password
    }
    var package = {
      objects: [user]
    }
    console.log('e', user)
    //return this.login()
    return this.send('POST', 'vineyard/update', package)

    //var package = this.prepare_seed(seed, map)
    //return this.send('PUT', map.name + '/' + map.trellis.get_identity(seed) + '.json', package)
  }

  delete_entity(seed, map):Promise {
    return this.send('DELETE', map.name + '/' + map.trellis.get_identity(seed) + '.json', null)
  }

  prepare_seed(seed, map) {
    var result = {}
    for (var key in map.properties) {
      var info = map.properties[key]
      var name = info.name || key
      result[name] = seed[key]
    }

    return result
  }

  send(method, path, body, autologin = true):Promise {
    var url = 'http://' + this.config.endpoint + '/' + path
    console.log('drupal-request', method, url, body)
    var options:any = {
      url: url,
      method: method,
      json: true
    }

    if (body) {
      options.body = body
    }

    //options.proxy = 'http://127.0.0.1:8888'

    if (this.cookie) {
      options.headers = {}
      options.headers['Cookie'] = this.cookie
    }

    var def = when.defer()
    Request(options, (error, response, content)=> {
      //console.log(arguments)
      if (error) {
        console.error(error)
        def.reject(error)
        return
      }

      if (autologin && (response.statusCode == 401 || response.statusCode == 403)) {
        return this.login()
          .then(()=> this.send(method, path, body, false))
          .then((body, response)=> {
            def.resolve(body, response)
          })
      }
      else if (response.statusCode != 200) {
        console.error('drupal-error', response.statusCode)
        def.reject(new Error(response.statusCode))
        return
      }

      def.resolve([content, response])
    })

    return def.promise
  }

  login() {
    console.log('Logging into Drupal')
    return this.send('POST', 'api/user/login.json', this.config.login, false)
    .then((result)=> {
        var res = result[1]
        var cookie = res.headers["set-cookie"]
        if (cookie) {
          this.cookie = (cookie + "").split(";").shift()
        }
        console.log('response', this.cookie)
      })
  }
}

export = Drupal