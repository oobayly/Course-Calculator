angular.module("CourseCalculator.services")

.service("Classes", function($window) {
  this.__items = null;
  
  // Gets all the classes 
  this.getClasses = function() {
    if (!this.__items)
      this.__initClasses();
    
    return angular.copy(this.__items);
  };
  
  // Initialises the list of classes available
  this.__initClasses = function() {
    this.__items = [
      {name: " Custom", loa: 6, editable: true},
      {name: "420", loa: 4.2},
      {name: "470", loa: 4.7},
      {name: "Fireball", loa: 4.93},
      {name: "Laser", loa: 4.19},
      {name: "Laser 2", loa: 4.37},
      {name: "Mirror", loa: 3.30},
      {name: "Optimist", loa: 2.36},
      {name: "Shannon One Design", loa: 5.49},
      {name: "Squib", loa: 5.79}
    ];
  };
  
})
;
