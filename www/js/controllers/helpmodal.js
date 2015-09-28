angular.module("CourseCalculator.controllers")

.controller("HelpModalCtrl", function($scope,
                                      HelpModal
                                      ) {

  // Returns the template URL for the current topic
  $scope.getTemplateUrl = function() {
    return "templates/help/" + $scope.topic + ".html";
  };

  // Returns the title for the current topic
  $scope.getTitle = function() {
    return HelpModal.topics[$scope.topic].title;
  };

})

// Shows the help modal
// topic: The help topic to be displayed
.service("HelpModal", function($q, $rootScope, $window,
                               $ionicModal
                               ) {

  // The list of available help topics
  this.topics = {
    "options-fleet": {title: "Fleet options"},
    "options-course": {title: "Course options"},
    "info": {title: "Information"}
  };

  // Shows the help modal
  this.show = function(topic) {
    var q = $q.defer();

    var $scope = $rootScope.$new();

    // Re-broadcast the modal events
    $scope.$on("modal.shown", function(event) {
      $rootScope.$emit("modal.shown", event);
    });

    // Use the location information provided
    $scope.topic = topic;

    $ionicModal.fromTemplateUrl("templates/modal-help.html", {
      scope: $scope,
      animation: "slide-in-up"
    })
    .then(function(modal) {
      $scope.modal = modal;
      modal.show();
    });

    $scope.$on("$destroy", function() {
      if ($scope.modal)
        $scope.modal.remove();
    });

    // Called when the modal is to be closed
    // Pass optional parameters
    $scope.doClose = function(result) {
      $scope.modal.hide();

      $scope.modal.remove();
      $scope.modal = null;

      q.resolve(result);
    };

    return q.promise;
  };

});
