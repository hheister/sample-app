define(['viewmodel', 'jqueryUI', "jqxcore", "jqxsplitter","jqxdata", "jqxlistbox", "jqxbuttons", "jqxscrollbar", "jqxexpander", "jqxtree", "menu", "datatables"],
    function(vm, jqueryUI, jqxcore, jqxsplitter, jqxdata, jqxlistbox, jqxbuttons, jqxscrollbar, jqxexpander, jqxtree, menu, datatables) {

        var initialize = function() {
            // add startup code as needed
            $(document).ready(init);

            function init () {
                initSplitter();
                initMainTab();
                initNavigationPanel();
                initListBox();
                initSelectMenu();
                initSelectionTree();
                initStaticTree();
                initAjaxTree();
                initToolTip();
                initDataTable();
                initUsersDataTable();
                vm.loadUsers();
                vm.loadJobs();
            }

            function initUsersDataTable() {
                $('#users-data-table').dataTable( {
                    "ajax": "http://localhost:8080/sampleapp/usersdatatable",
                    "pagingType": "full_numbers",
                    "scrollY": "200px",
                    "scrollCollapse": true,
                    "lengthMenu": [[3, 10, 25, 50, -1], [3, 10, 25, 50, "All"]],
                    "jQueryUI":       true,
                    "columns": [
                        { "data": "name" },
                        { "data": "title" },
                        { "data": "job" },
                        { "data": "date" },
                        { "data": "description" },
                        { "data": "citizen" }
                    ],
                    "columnDefs": [
                        {
                            // The `data` parameter refers to the data for the cell (defined by the
                            // `data` option, which defaults to the column being worked with, in
                            // this case `data: 0`.
                            "render": function ( data, type, row ) {
                               // console.log('row=' + Object.keys(row));
                                return data +' ('+ row.date+')';
                            },
                            "targets": 0
                        }]
                } );
            }

            function initDataTable() {
                $('#data-table-1').dataTable( {
                    "ajax": "http://localhost:8080/json/objects.json",
                    "columns": [
                        { "data": "name" },
                        { "data": "position" },
                        { "data": "office" },
                        { "data": "extn" },
                        { "data": "start_date" },
                        { "data": "salary" }
                    ]
                } );
            }

            function initToolTip() {
                $( document ).tooltip();
            }

            function initAjaxTree() {
                var tree = $('#ajaxTree');
                if (tree == null || tree == undefined) {
                    alert('CANNOT FIND ajaxtree!!!');
                    return;
                }
                var source = null;
                $.ajax({
                    async: false,
                    url: "html/ajaxroot.htm",
                    success: function (data, status, xhr) {
                        source = jQuery.parseJSON(data);
                    }
                });
                tree.jqxTree({ source: source,  height: 300, width: 200 });
                tree.on('expand', function (event) {dddd
                    var label = tree.jqxTree('getItem', event.args.element).label;
                    var $element = $(event.args.element);
                    var loader = false;
                    var loaderItem = null;
                    var children = $element.find('ul:first').children();
                    $.each(children, function () {
                        var item = tree.jqxTree('getItem', this);
                        if (item && item.label == 'Loading...') {
                            loaderItem = item;
                            loader = true;
                            return false
                        };
                    });
                    if (loader) {
                        var url = 'html/' + loaderItem.value;
                        $.ajax({
                            url: url,
                            success: function (data, status, xhr) {
                                var items = jQuery.parseJSON(data);
                                tree.jqxTree('addTo', items, $element[0]);
                                tree.jqxTree('removeItem', loaderItem.element);
                            }
                        });
                    }
                });
            }

            function initStaticTree() {
                // Create jqxExpander
                $('#jqxExpander').jqxExpander({ showArrow: false, toggleMode: 'none', width: '300px', height: '370px'});
                // Create jqxTree
                var source = [
                {
                    icon: "images/mailIcon.png", label: "Mail", expanded: true, items: [
                      { icon: "images/calendarIcon.png", label: "Calendar" },
                      { icon: "images/contactsIcon.png", label: "Contacts", selected: true }
                    ]
                },
                {
                    icon: "images/folder.png", label: "Inbox", expanded: true, items: [
                     { icon: "images/folder.png", label: "Admin" },
                     { icon: "images/folder.png", label: "Corporate" },
                     { icon: "images/folder.png", label: "Finance" },
                     { icon: "images/folder.png", label: "Other" },
                    ]
                },
                { icon: "images/recycle.png", label: "Deleted Items" },
                { icon: "images/notesIcon.png", label: "Notes" },
                { iconsize: 14, icon: "images/settings.png", label: "Settings" },
                { icon: "images/favorites.png", label: "Favorites" }
                ];
                $('#jqxTree').jqxTree({ source: source, width: '100%', height: '100%'});
                $('#jqxTree').jqxTree('selectItem', null);
            }


            function initSelectionTree() {
                // Create jqxExpander
                //$('#jqxExpander').jqxExpander({ showArrow: false, toggleMode: 'none', width: '300px', height: '370px'});
                // Create jqxTree
                var source = [
                {
                    icon: "images/mailIcon.png", label: "App Pages", expanded: true, items: [
                      { icon: "images/calendarIcon.png", label: "Welcome Page", value:"welcome_page" },
                      { icon: "images/contactsIcon.png", label: "Main Tab", value:"tab_page" , selected: true }
                    ]
                },
                ];
                $('#selectionTree').jqxTree({ source: source, width: '100%', height: '100%'});
                $('#selectionTree').jqxTree('selectItem', null);
                $('#selectionTree').on('select', function (event) {
                    var args = event.args;
                    var item = $('#selectionTree').jqxTree('getItem', args.element);
                    var value = item.value;
                    if (value != null) {
                        vm.showPage(value);
                    }
                });
            }

            function initSelectMenu() {
                var opts = { 
                    width: 210,
                    select: function( event, ui ) {
                        vm.showPage(ui.item.value);
                    }
                };
                $("#pageSelector").selectmenu(opts);

                // The width of these will be defined in the horst.css
                $("#speed").selectmenu();
                $("#files").selectmenu();
            }

            function initListBox() {
                // prepare the data
                var source =  { datatype: "json",
                                datafields: [{ name: 'CompanyName' }, { name: 'ContactName' }],
                                id: 'id',
                                url:'http://localhost:8080/json/customers.json'
                 };
                 var dataAdapter = new $.jqx.dataAdapter(source);
                // Create a jqxListBox
                $("#jqxWidget").jqxListBox({ source: dataAdapter, displayMember: "ContactName", valueMember: "CompanyName", width: 200, height: 250, theme: '' });
                $("#jqxWidget").bind('select', function (event) {
                    if (event.args) {
                        var item = event.args.item;
                        if (item) {
                            var valueelement = $("<div></div>");
                            valueelement.html("Value: " + item.value);
                            var labelelement = $("<div></div>");
                            labelelement.html("Label: " + item.label);
                            $("#selectionlog").children().remove();
                            $("#selectionlog").append(labelelement);
                            $("#selectionlog").append(valueelement);
                        }
                    }
                });
            }

            function initNavigationPanel() {
                var opts = { heightStyle: "fill" };
                $("#myAccordion").accordion(opts);
            }

            function initSplitter() {
                 $('#splitter').jqxSplitter({ width: '100%', height: '100%', panels: [{ size: '20%', min: 250 }, { size: '80%'}] });
            }
        
            function initMainTab() {
                var img = $("<img/>", {
                    height: 100,
                    width: 100
                });
                var tabOpts = {
                    activate : function(event, ui) { 
                        var tabText = ui.newTab.text();
                        if (tabText.indexOf("Remote Images") != -1) {

                            $("#flickr").empty();

                            $.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?tags=nebula&format=json&jsoncallback=?", function(data) {
                                $.each(data.items, function(i,item){
                                    img.clone().attr("src", item.media.m).appendTo("#flickr");

                                    if (i == 5) {
                                        return false;
                                    }
                                });
                            });
                        }
                    },
                    fx: {
                        opacity: "toggle",
                        duration: "slow"                        
                    },
                    collapsible:false,
                    heightStyle: "fill"
                };

                $("#mainTab").tabs(tabOpts);
            }
        };
        return {
            initialize: initialize
        };
    }
);