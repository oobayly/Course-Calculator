angular.module("CourseCalculator.services")

.service("Classes", function($filter) {
  // The class definition
  function Class(params) {
    this.name = params.name;
    this.loa = params.loa || null;
    this.lwl = params.lwl || null;
    this.canEdit = params.canEdit || false;
  };

  Class.prototype.getHullSpeed = function() {
    if (this.lwl) {
      return 1.34 * Math.sqrt(this.lwl / .3048);
    } else {
      return null;
    }
  };

  this.__items = null;
  
  // Gets all the classes 
  this.getClasses = function(name) {
    if (!this.__items)
      this.__initClasses();
    
    if (name) {
      var found = $filter("filter")(this.__items, {name: name});
      return found.length ? found[0] : null;
    } else {
      return this.__items;
    }
  };
  
  // Initialises the list of classes available
  this.__initClasses = function() {
    this.__items = [
      new Class({name: " Custom", canEdit: true}),
      new Class({name: "420", loa: 4.2, lwl: 4.01}),
      new Class({name: "470", loa: 4.7, lwl: 4.44}),
      new Class({name: "Dragon", loa: 8.9, lwl: 5.66}),
      new Class({name: "Fireball", loa: 4.93, lwl: 4.04}),
      new Class({name: "J/24", loa: 7.32, lwl: 6.1}),
      new Class({name: "J/80", loa: 8, lwl: 6.71}),
      new Class({name: "Laser", loa: 4.19, lwl: 3.96}),
      new Class({name: "Laser 2", loa: 4.37, lwl: 4.22}),
      new Class({name: "Mirror", loa: 3.30, lwl: 2.95}),
      new Class({name: "Optimist", loa: 2.36, lwl: 2.16}),
      new Class({name: "SB20", loa: 6.15, lwl: 6.1}),
      new Class({name: "Shannon One Design", loa: 5.49, lwl: 5.13}),
      new Class({name: "Squib", loa: 5.79, lwl: 5.18})
    ];
  };
  
})
;
