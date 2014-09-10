angular.module('app')
.service('ControllersSvc', function($rootScope, _) {
  'use strict';

  this.list = function(params) {
    return $rootScope.client.replicationControllers.list(params)
      .then(function(result) {
        return result.data.items;
      });
  };

  this.get = function(params) {
    return $rootScope.client.replicationControllers.get(params)
      .then(function(result) {
        return result.data;
      });
  };

  this.find = function(list, id) {
    return _.findWhere(list, { id: id });
  };

});