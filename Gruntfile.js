module.exports = function(grunt) {
  'use strict';

  var sourceFiles = [
    'index.js', 'src/**/*.js'
  ];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: sourceFiles,
      options: {
        jshintrc: '.jshintrc'
      }
    },

    eslint: {
      target: [sourceFiles, '!src/send-coverage.js'],
      options: {
        config: 'eslint.json',
        rulesdir: ['./node_modules/eslint-rules']
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
  grunt.registerTask('lint', ['jshint', 'eslint']);
  grunt.registerTask('default', ['nice-package', 'deps-ok', 'lint', 'doc']);
};
