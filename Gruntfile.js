'use strict'

module.exports = function (grunt) {
  'use strict'

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    help: {
      options: {
        destination: 'docs/help.md'
      },
      all: {}
    },

    readme: {
      options: {
        readme: './docs/README.tmpl.md',
        docs: '.',
        templates: './docs'
      }
    }
  })

  var plugins = require('matchdep').filterDev('grunt-*')
  plugins.forEach(grunt.loadNpmTasks)

  grunt.registerTask('doc', ['help', 'readme'])
  grunt.registerTask('default', ['nice-package', 'deps-ok', 'doc'])
}
