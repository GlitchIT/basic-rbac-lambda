/* global config */
const jwt = require('jsonwebtoken')
const {debug} = require('./runtime')

class Auth {
  constructor(options, config) {
    this.config = config
    this.i = options.issuer || 'Flat CMS Engine'
    this.a = options.audience || this.config.domain || 'http://flatcms.dev'

    // SIGNING OPTIONS
    this.signOptions = {
      issuer: this.i,
      audience: this.a,
      expiresIn: "24h",
      algorithm: "RS256"
    }

    if (options.subject) {
      this.signOptions.subject = options.subject
    }
    if (debug){
      console.log('signing options: ', JSON.stringify(this.signOptions, null, 4))
    }
  }

  verify(token) {
    try {
      return jwt.verify(token, this.config.configKey, this.signOptions)
    } catch (e) {
      console.error(e)
      return false
    }
  }

  sign(data) {
    return jwt.sign({foo: 'bar'}, this.config.configKey, this.signOptions)
  }
}

module.exports = Auth
