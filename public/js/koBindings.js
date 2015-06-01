ko.bindingHandlers.spinner = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        //initialize spinner with some optional options
        var options = allBindingsAccessor().spinnerOptions || {};
        $(element).spinner(options);

        //handle the field changing
        ko.utils.registerEventHandler(element, "spinchange", function () {
            var observable = valueAccessor();
            //console.log('spinchange value:' + $(element).spinner("value"));
            observable($(element).spinner("value"));
        });

        //handle disposal (if KO removes by the template binding)
        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            $(element).spinner("destroy");
        });

    },
    update: function(element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
            current = $(element).spinner("value");

        if (value !== current) {
            $(element).spinner("value", value);
        }
    }
};
