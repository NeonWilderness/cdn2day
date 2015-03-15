/**
 *  cdnConnect - connects a Twoday blog to the CDN @ cdn.twoday.net and generates the loader script upon user request
 */
var xds = function(url){
    this.dispatcherUrl = url;
    this.dispatcher = false;
    this.dispatcherInfo = false;
    this._id = 0;
    this.callbacks = [];
    this.queue = [];
    this.init();
};

xds.prototype = {

    constructor: xds,

    info: function(){
        var x = "101109097114102105", s = "";
        for(var i=6;i>0;i--){ s+=String.fromCharCode(x.substr((i-1)*3,3)); }
        return s;
    },

    init: function(){
        //this may be called multiple times, bail if things are already done
        if (this.dispatcher || this.dispatcherInfo){
            return;
        }

        //create the dispatcher frame as an invisible element
        this.dispatcherInfo = window.document.createElement(this.info());
        this.dispatcherInfo.style.display = "none";
        this.dispatcherInfo.id = "cdnConnect";

        //set up something to handle the "ready" message back from the dispatcher, and any responses therein
        var self = this;
        if (window.addEventListener){
            window.addEventListener('message', function(e){ self.onMessage(e); }, false);
        } else {
            window.attachEvent('onmessage', function(e){ self.onMessage(e); });
        }

        window.document.body.appendChild(this.dispatcherInfo);
        this.dispatcherInfo.src = this.dispatcherUrl;
    },

    onMessage: function(e){
        var response = JSON.parse(e.data);
        if (response.ready === true){
            this.dispatcher = this.dispatcherInfo.contentWindow;
            this.processQueue();
            return;
        } else if (response.type === "get"){
            if (typeof this.callbacks[response._xds] !== "undefined"){
                this.callbacks[response._xds](response.val, response);
            }
        } else if (response.type === "set"){
            if (typeof this.callbacks[response._xds] !== "undefined"){
                this.callbacks[response._xds](response);
            }
        } else if (response.type === "del"){
            if (typeof this.callbacks[response._xds] !== "undefined"){
                this.callbacks[response._xds](response);
            }
        }
    },

    processQueue: function(){
        //nothing to do
        if (!this.queue){
            return;
        }

        //no dispatcher yet, better set it up
        if (!this.dispatcher){
            this.init();
            return;
        }

        //post message
        while(this.queue.length > 0) {
            this.dispatcher.postMessage(JSON.stringify(this.queue.shift()),"*");
        }
    },

    post: function(request, callback){
        //increment the request id to keep track of callbacks
        this._id++;
        request._xds = this._id;

        //store the callback for later use
        if (typeof callback !== "undefined" && callback !== null && callback !== false){
            this.callbacks[this._id] = callback;
        }

        //if the dispatcher isn't ready yet queue it and run/rerun init
        if (this.dispatcher){
            //post the request to the dispatcher
            this.dispatcher.postMessage(JSON.stringify(request),"*");
        } else {
            this.queue.push(request);
            this.init();
        }
    },

    //create and send get request
    getItem: function(key,callback){
        this.post({'type': "get", 'key':key}, callback);
    },

    //create and send set request
    setItem: function(key, val, callback){
        this.post({'type': "set", 'key':key, 'val': val}, callback);
    },

    //create and send delete request
    removeItem: function(key, callback){
        this.post({'type': "del", 'key': key}, callback);
    },

    getObject: function(key, callback){
        this.getItem(key, function(value, response){
            //parse the response string back into the original object + null handling
            callback(value && JSON.parse(value), response);
        });
    },

    setObject: function(key, value, callback){
        //turn the object into a storable string
        this.setItem(key, JSON.stringify(value), callback);
    },

    removeObject: function(key, callback){
        this.removeItem(key, callback);
    }
};
/**
 *  cdnUser - user oriented functions
 */
var cdnUser = {
    //is user logged in? this is only a precautionary measure as login security is validated by the server software
    isUserLoggedIn : function(){
        return (document.cookie.search(/avLoggedIn=1;/)>=0);
    },
    //get the username
    getLoggedInUser : function(){
        if (!this.isUserLoggedIn()) { return ""; }
        var i = document.cookie.search(/avUsr=/)+6;
        return (i<6 ? "" : document.cookie.substr(i, document.cookie.indexOf(";",i)-i));
    },
    //get the users url of the main layout overview screen
    getLayoutMainUrl : function(){
        return (this.isUserLoggedIn() ? window.location.origin+"/layouts/main" : "");
    }
};
/**
 *  cdnStorage - process the user ticket to activate/update/deactivate the CDN loader script
 */
var cdnStorage = {
    //user ticket with data provided by xds from CDN's localStorage
    data : {
        date   : "",
        action : "",
        status : "",
        script : ""
    },

    newSettings: {},
    oldSettings: {},
    setStart: 0,
    setEnd: 0,

    lastCDNUpdate: 0,
    href: "",

    msgHeader: "CDN Twoday",
    msgTypes: { "I": "info", "S": "success", "W": "warning", "E": "error" },

    endOfHead: '</head>',
    modernizr: '<script id="cdnModernizr" src="http://static.twoday.net/cdn/files/modernizr-custom-min-js.js"></script>\n',

    beforeCDN: '<script id="cdnTwoday"',
    cmploader: '<% site.skin name="cdnSettings" %>\n',

    //is xds active?
    isDomainStorageActive : function(){
        return (typeof xds !== "undefined");
    },

    //is toastr.js (user messages) available?
    isToastrActive : function(){
        return (typeof toastr !== "undefined");
    },

    //outputs a script message either through toastr or a simple alert
    msg : function(type, text){
        if (this.isToastrActive()){
            toastr[ this.msgTypes[type] ](text, this.msgHeader);
        } else {
            window.alert(this.msgHeader+" - "+this.msgTypes[type]+"\n"+$("<div>"+text+"</div>").text());
        }
    },

    //message upon the CDN's successful activation/update/deactivation
    successMsg : function(type){
        this.msg("S", "Die CDN Nutzung wurde " + (this.data.action==="Remove" ? "auftragsgemäß beendet." : "erfolgreich "+type+".")+" <p style='font-size:80%;margin-top:12px'>Bitte Strg+F5 (Windows) bzw. cmd+R (Mac) zur Aktualisierung der Bloganzeige betätigen!</p>");
        return true;
    },

/**
 *  Parses the siteSettings string of the site.cdnSettings skin to extract the JSON object
 */
    parseSettings: function(code){
        var startSettings = "siteSettings = ",
            start = code.indexOf(startSettings),
            openBracket = 1,
            i;
        if (start<0){
            this.msg("E","Die Parameterwerte 'siteSettings' konnten nicht ermittelt werden!");
            return;
        }
        start += startSettings.length;
        i = start+1;
        while (openBracket>0 && i<code.length){
            switch (code.charAt(i)){
                case "{" : openBracket++; break;
                case "}" : openBracket--; break;
            }
            i++;
        }
        try {
            this.setStart = start;
            this.setEnd = i;
            return code.substr(start, i-start);
        } catch(e){
            return "{}";
        }
    },

/**
 *  Preserves parameter settings that were changed/overwritten by the user in the cdnSettings skin
 */
    preserveProtectedSettings: function(skinContent){
        //gather all component names that were flagged protected
        var self = this, protectedSettings = [];
        //get the current JSON settings parameter object
        eval("self.oldSettings=" + self.parseSettings(skinContent));
        //get the newly generated JSON settings parameter object
        eval("self.newSettings=" + self.parseSettings(self.data.script));
        //for each newly generated component with settings
        $.each( self.newSettings, function(key, value){
            //check if there is a corresponding setting in the current parameter object
            if (typeof self.oldSettings[key]==="undefined"){ return true; }
            //yes, then check if user has amended and protected these settings
            if (self.oldSettings[key].status==="protect"){
                //yes, then migrate the current protected settings into the newly generated set
                $.extend(true, self.newSettings[key], self.oldSettings[key]);
                //remember the component
                protectedSettings.push(key);
            }
        });
        //did we find any components to migrate?
        if (protectedSettings.length>0){
            //yes, then stringify and pimp the adapted settings
            var n = (protectedSettings.length>1 ? "n" : ""),
                s = JSON.stringify(self.newSettings).replace(/\}\},/gi, '}},\n').replace(/,\"/gi, ', \"');
            //then insert the adapted settings string into the skin content
            self.data.script = self.data.script.substr(0, self.setStart) + s + self.data.script.substr(self.setEnd);
            //and confirm to the user that protected settings have been successfully preserved
            self.msg("I", "Ihre geschützten Parameter für die CDN-Komponente"+n+" <b>" + protectedSettings.join(", ") + "</b> wurde"+n+" übernommen!");
        }
    },

/**
 *  Processes the user request that was generated and saved on cdn.twoday.net
 */
    processCDNJob : function(){
        //get username of a logged in Twoday user
        var key = cdnUser.getLoggedInUser();
        //exit if user is not logged in (e.g. guest) or browser does not support localStorage or user seems to not get the admin menu
        if (key.length===0 || !this.isDomainStorageActive() || $("#modToolbar-admin-menu").length===0){ return false; }
        var userid = key.toLowerCase(), self = this;
        //now read the /members/admins page of this user
        $.get("/members/admins", function(data){
        //to really check if the user is at least Admin or even Owner of this blog
            var isAdminOrOwner = false;
            $(data).find(".listItemLeft h4").each( function(index, item){
                isAdminOrOwner = isAdminOrOwner || (item.innerText.toLowerCase()===userid);
            });
            //exit if user has no sufficient access rights as script won't work without (double checked server-side)
            if (!isAdminOrOwner) { return false; }
            try {
                //establish connection to CDN localStorage
                var CDNData = new xds("//cdn.twoday.net/stories/cdnconnect"),
                    //get the datetimestamp of the last CDN change
                    lastAction = $("#cdnStatus").text().substr(12);
                //parse the date if found or initialize to zero if it's the first time CDN install
                self.lastCDNUpdate = (lastAction.length>0 ? Date.parse(lastAction) : 0);
                //read the stored CDN info (the user's individual component loader script)
                CDNData.getItem(key, function(data, response){
                    //remove the dispatcher
                    $("#cdnConnect").remove();
                    //exit if no data provided
                    if (data===null){ return false; }
                    //if some data was found
                    if (data.length>0){
                        //parse the JSON object
                        $.extend(self.data, JSON.parse(data));
                        //check if this CDN data is younger than the last update
                        if (Date.parse(self.data.date)>self.lastCDNUpdate){
                            //inform user of CDN process in action (but only if "toastr" is active)
                            if (self.isToastrActive()){ self.msg("I", "CDN Auftrag gefunden: Die Einstellungen werden jetzt angepasst..."); }
                            //get the user's main layout url
                            self.href = cdnUser.getLayoutMainUrl();
                            $.get(self.href, function(data){
                                //find all available layouts on the overview page
                                var layouts = $(data).find(".listItemLeft"), activeLayout;
                                //does user have more than one layout?
                                if (layouts.length>1){
                                    //yes, then pick the one which is marked "Active"
                                    activeLayout = layouts.find(".listFlag").parent().find("p>a");
                                } else {
                                    //no, then pick the first in list
                                    activeLayout = layouts.find("p>a");
                                }
                                //get url of the user's active Twoday layout and build the correct skin-edit url
                                self.href = activeLayout.attr("href") + "skins/edit?key=Site.";
                                //open the cdnSettings skin for edit
                                $.get(self.href+"cdnSettings", function(data){
                                    //find the form
                                    var $form = $(data).find("form"),
                                        $desc = $form.find("textarea[name=description]"),
                                        $content = $form.find("textarea[name=skin]"),
                                        script = $content.text();
                                    //fill the description and the skin textareas
                                    if ($desc.text().length===0){
                                        $desc.text("Meine ausgewählten CDN-Komponenten");
                                    }
                                    //are there any protected siteSettings out there?
                                    if (script.indexOf("protect")>=0){
                                        //yes, then preserve and migrate protected component parameters
                                        self.preserveProtectedSettings(script);
                                    }
                                    $content.text(self.data.status + self.data.script);
                                    //post skin changes with an ajax call
                                    $.ajax({
                                        type: $form.attr('method'),
                                        url:  $form.attr('action'),
                                        data: $form.serialize() + "&close=Speichern+und+Schlie%C3%9Fen",
                                        success: function(){
                                            //is this a first time (initial) CDN setup?
                                            if (self.lastCDNUpdate===0){
                                                //yes, then get the main page skin as well
                                                $.get(self.href+"page"+"&skinset=main&action=main&module=", function(data){
                                                    //find the form and content area, then get the html content as simple text
                                                    var $form = $(data).find("form"),
                                                        $content = $form.find("textarea[name=skin]"),
                                                        script = $content.text();
                                                    //insert modernizr script at the end of HEAD, if modernizr is not yet active
                                                    if (script.indexOf("modernizr-custom-min-js.js")<0){
                                                        script = script.replace(self.endOfHead, self.modernizr + self.endOfHead);
                                                    }
                                                    //insert the cdnSettings component loader script just before the CDN connect script
                                                    $content.text(script.replace(self.beforeCDN, self.cmploader + self.beforeCDN));
                                                    //click the save button
                                                    $form.find("input[name=close]").click();
                                                    //all done
                                                    return self.successMsg("aktiviert");
                                                });
                                            } else {
                                                return self.successMsg("aktualisiert");
                                            }
                                        }
                                    });
                                });
                            });
                        }
                    }
                });
            } catch(e){
                self.msg("E", "Fehler während der Verarbeitung des individuellen CDN-Übernahmeauftrags ("+e.message+")");
                return false;
            }
        }).fail( function(){
            return false;
        });
    }
};

$(document).ready(function(){ "use strict";
    cdnStorage.processCDNJob();
});