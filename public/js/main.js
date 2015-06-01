// Workaround for Knockout not initializing the global "ko" variable when it detects Require.js
define('knockout.global', ['knockout'], function(kno) {
    window.ko = kno; // Initialize a global 'ko' variable
    return kno;
});

require.config({

    // Sets the js folder as the base directory for all future relative paths
    baseUrl: "./js",

    // 3rd party script alias names
    paths: {
        "jquery": "vendors/jquery.min",
        "jqueryUI": "vendors/jquery-ui/jquery-ui",
        "icheck": "vendors/icheck",
        "bootstrap": "vendors/bootstrap.min",
        "knockout": "vendors/knockout.debug",
        "koTemplateEngine":"vendors/koExternalTemplateEngine_all.min",
        "viewmodel": "viewmodel",
        "jqxcore": "vendors/jqwidgets/jqxcore",
        "jqxsplitter": "vendors/jqwidgets/jqxsplitter",
        "jqxdata": "vendors/jqwidgets/jqxdata",
        "jqxlistbox": "vendors/jqwidgets/jqxlistbox",
        "jqxscrollbar": "vendors/jqwidgets/jqxscrollbar",
        "jqxbuttons": "vendors/jqwidgets/jqxbuttons",
        "jqxpanel": "vendors/jqwidgets/jqxpanel",
        "jqxexpander": "vendors/jqwidgets/jqxexpander",
        "jqxtree": "vendors/jqwidgets/jqxtree",
        "oLoader": "vendors/oLoader/js/jquery.oLoader.min",
        "globalize": "vendors/globalize",
        "koBindings": "koBindings",
        "menu": "vendors/menu/menu",
        "datatables" : "//cdn.datatables.net/1.10.7/js/jquery.dataTables.min",
    },

    // Sets the configuration for your scripts that are not AMD compatible
    shim: {
        "bootstrap": ["jquery"],
        "bootstrap-modal": ["jquery"],
        "koTemplateEngine": ["knockout"],
        "menu": {
            export:"$" ,
            deps: ['jquery']
        },
        "jqueryUI": {
            export:"$" ,
            deps: ['jquery']
        },
        "jqxcore": {  
            export: "$", 
            deps: ['jquery'] 
        },
        "jqxsplitter": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxdata": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxlistbox": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxscrollbar": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxbuttons": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxpanel": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxexpander": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "jqxtree": {  
            export: "$", 
            deps: ['jquery', "jqxcore"] 
        },
        "oLoader": {
            export: "$",
            deps: ['jquery']
        },
        "datatables": {
            export: "$",
            deps: ['jquery']
        },
    },

    map: {
        '*': {'knockout': 'knockout.global'}, // All modules referencing 'knockout' will be loading 'knockout.global'
        'knockout.global': {'knockout': 'knockout'} // 'knockout.global' itself will be referencing the original 'knockout'
    }

});

require(['app'], function(app) {
       // require the app module to kick off the application
       app.initialize();
    }
);
