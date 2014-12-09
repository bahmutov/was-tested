module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: [
        'index.js', 'src/**/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

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
  });

  var plugins = require('matchdep').filterDev('grunt-*');
  plugins.forEach(grunt.loadNpmTasks);

  grunt.registerTask('doc', ['help', 'readme']);
  grunt.registerTask('default', ['nice-package', 'deps-ok', 'jshint', 'doc']);
};
