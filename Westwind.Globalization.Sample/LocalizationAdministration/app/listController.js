/// <reference path="localizationservice.js" />
/// <reference path="../bower_components/lodash/lodash.js" />
(function (undefined) {
    'use strict';
    
    var app = angular
        .module('app')
        .controller('listController', listController);

   listController.$inject = [ '$scope','$timeout','localizationService'];

   function listController( $scope,$timeout,localizationService) {
       console.log('list controller');

       var vm = this;
       vm.listVisible = true;
        vm.searchText = null;
        vm.resourceSet = null;
        vm.resourceSets = [];
        vm.resourceList = [];
        vm.resourceId = null;
        vm.activeResource = null;
        vm.localeIds = [];        
        vm.resourceItems = [];
        vm.resourceItemIndex = 0;
       vm.newResourceId = null;
       vm.editedResource = null,
           vm.error = {
               message: null,
               icon: "info-circle",
               cssClass: "info"
           };

       vm.newResource = function() {
           return {
               "ResourceId": null,
               "Value": null,
               "Comment": null,
               "Type": "",
               "LocaleId": "",
               "ResourceSet": "",
               "TextFile": null,
               "BinFile": null,
               "FileName": ""
           };
       };


       vm.collapseList = function () {           
           vm.listVisible = !vm.listVisible;
           console.log(vm.listVisible);
       };

        vm.getResourceSets = function getResourceSets() {
            localizationService.getResourceSets()
                .success(function(resourceSets) {
                    vm.resourceSets = resourceSets;
                    if (!vm.resourceSet && resourceSets.length > 0)
                        vm.resourceSet = vm.resourceSets[0];
                    vm.onResourceSetChange();
                })
                .error(handleErrorResult);
        };


       vm.updateResource = function(resource) {
           return localizationService.updateResource(resource)
                    .success(function () {
                        vm.getResourceItems();
                        showMessage("Resource saved.");
           })
           .error(handleErrorResult);
       };

        vm.updateResourceString = function (value, localeId) {            
            return localizationService.updateResourceString(value, vm.resourceId, vm.resourceSet, localeId)
                .success(function() {                               
                    vm.getResourceItems();
                    showMessage("Resource saved.");
                })
                .error(handleErrorResult);
        };

        

        vm.getResourceList = function getResourceList() {
            localizationService.getResourceList(vm.resourceSet)
                .success(function(resourceList) {
                    vm.resourceList = resourceList;
                    if (resourceList.length > 0) {
                        vm.resourceId = vm.resourceList[0].ResourceId;
                        setTimeout(function() { vm.onResourceIdChange(); }, 10);
                    }
                })
                .error(handleErrorResult);
        };

        vm.getResourceItems = function getResourceItems() {

            localizationService.getResourceItems(vm.resourceId, vm.resourceSet)
                .success(function(resourceItems) {
                    vm.resourceItems = resourceItems;
                    if (vm.resourceItems.length > 0)
                        vm.activeResource = vm.resourceItems[0];
                })
                .error(handleErrorResult);
        };

   

        /// *** Event handlers *** 

        vm.onResourceSetChange = function onResourceSetChange() {            
            vm.getResourceList();
        };
        vm.onResourceIdChange = function onResourceIdChange() {
            vm.getResourceItems();
        };
       
        vm.onLocaleIdChanged = function onLocaleIdChanged(resource) {
            if (resource !== undefined) {                
                vm.activeResource = resource;
            }
        };
        vm.onStringUpdate = function onStringUpdate(resource) {            
            vm.activeResource = resource;
            vm.editedResource = resource.Value;
            vm.updateResourceString(resource.Value, resource.LocaleId);
        };
        vm.onResourceKeyDown = function onResourceKeyDown(ev, resource, form) {
            // Ctrl-Enter - save and next field
            if (ev.ctrlKey && ev.keyCode === 13) {
                vm.onStringUpdate(resource);
                $timeout(function () {
                    // set focus to next field
                    var el = $(ev.target);
                    var id = el.prop("id").replace("value_", "") * 1;
                    var $el = $("#value_" + (id + 1));
                    if ($el.length < 1)
                        $el = $("#value_0"); // loop around
                    $el.focus();
                }, 100);
                $scope.resourceForm.$setPristine();

            }
        };
       vm.onTranslateClick = function(ev, resource) {           
           vm.editedResource = resource.Value;
           var id = $(ev.target).parent().find("textarea").prop("id");

           // notify Translate Dialog of active resource and source element id
           $scope.$emit("startTranslate", resource, id);
           $("#TranslateDialog").modal();
       };

       vm.onResourceIdBlur = function() {
           if (!vm.activeResource.Value)
               vm.activeResource.Value = vm.activeResource.ResourceId;

       }
       vm.onAddResourceClick = function() {
           
           var res = vm.newResource();           
           res.ResourceSet = vm.activeResource.ResourceSet;
           res.LocaleId = vm.activeResource.LocaleId;
           res.ResourceId = vm.activeResource.ResourceId;
           vm.activeResource = res;

           $("#AddResourceDialog").modal();
       };

       vm.onSaveResourceClick = function () {
           vm.updateResource(vm.activeResource)
               .success(function () {
                   var id = vm.activeResource.ResourceId;
                   var i = _.findIndex(vm.resourceList,function(res) {
                       return res.ResourceId === id;
                   });                   
                   if (i < 0)
                       vm.resourceList.unshift(vm.activeResource);

                   vm.resourceId = id;
                   vm.onResourceIdChange();

                   $("#AddResourceDialog").modal('hide');
               })
               .error(function() {
                   var err = ww.angular.parseHttpError(arguments);
                   alert(err.message);
               });
       };
       vm.onDeleteResourceClick = function() {
           var id = vm.activeResource.ResourceId;

           if (!confirm(
               id +
               "\n\nAre you sure you want to delete this resource?"))
               return;

           localizationService.deleteResource(id, vm.activeResource.ResourceSet)
               .success(function() {
                   var i = _.findIndex(vm.resourceList, function(res) {
                       return res.ResourceId === id;
                   });

                   vm.resourceList.splice(i, 1);

                   if (i > 0)
                       vm.resourceId = vm.resourceList[i - 1].ResourceId;
                   else
                       vm.resourceId = vm.resourceList[0].ResourceId;
                   vm.onResourceIdChange();

                   showMessage(id + " resource deleted.");
               })
               .error(function() {
                   showMessage(id + " was not deleted deleted.");

               });
       };
       vm.onRenameResourceClick = function () {
           vm.newResourceId = null;
           $("#RenameResourceDialog").modal();
           $timeout(function() {
               $("#NewResourceId").focus();
           },1000);
       };
       vm.onRenameResourceDialogClick = function () {
           localizationService.renameResource(vm.activeResource.ResourceId, vm.newResourceId, vm.activeResource.ResourceSet)
               .success(function () {                                      
                   for (var i = 0; i < vm.resourceList.length; i++) {
                       var res = vm.resourceList[i];                       
                       if (res.ResourceId == vm.activeResource.ResourceId) {                               
                           vm.resourceList[i].ResourceId = vm.newResourceId;
                           break;
                       }
                   }
                   vm.activeResource.ResourceId = vm.newResourceId;
                   showMessage("Resource was renamed to '"+ vm.newResourceId + "" +"'.");
                   $("#RenameResourceDialog").modal("hide");
               })
               .error(parseError);
       }

       function parseError() {               
           var err = ww.angular.parseHttpError(arguments);           
           showMessage(err.message,"warning","warning");
       }
        function showMessage(msg, icon, cssClass) {
            
            if (!vm.error)
                vm.error = {};
            if (msg)
                vm.error.message = msg;

            if (icon)
                vm.error.icon = icon;
            else
                vm.error.icon = "info-circle";

            if (cssClass)
                vm.error.cssClass = cssClass;
            else
                vm.error.cssClass = "info";            

            $timeout(function() {
                if (msg === vm.error.message)
                    vm.error.message = null;
            }, 5000);            
        }

        function handleErrorResult(msg) {
            msg = msg || vm.error.message;

            showMessage(msg, "warning", "warning");            
        };

       $(document.body).keydown(function(ev) {
           if (ev.keyCode == 76 && ev.altKey) {
               $("#ResourceIdList").focus();
           }
       });
       

        // initialize
        vm.getResourceSets();        
    }
})();

