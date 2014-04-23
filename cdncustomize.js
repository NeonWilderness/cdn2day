/*------------------------------------------------------------------------------------------------
   cdnCoreInfo - core CDN fields used in CDN script/s; this needs to go into the modToolbar skin
--------------------------------------------------------------------------------------------------*/
/*var cdnCoreInfo = {
//  header for all CDN messages
    cdnHeader: "CDN Twoday",
//  user name of a looged in Twoday user, e.g. "NeonWilderness", otherwise empty (i.e. unknown site visitor)
    userName: "<% username %>",
//  main blog of a logged in Twoday user, e.g. "http://neonwilderness.twoday.net/", otherwise empty
    userUrl: "<% username as='url' %>",
//  alias of the CDN: "cdn"
    siteAlias: "<% site.alias %>",
//  href of the CDN: "http://cdn.twoday.net/"
    siteHref: "<% site.href %>",
//  href of Twoday's static url: "http://static.twoday.net/"
    staticUrl: "<% staticURL %>"
};*/
/*------------------------------------------------------------------------------------------------
    cdnCheck - CDN installation check for a logged-in Twoday user
--------------------------------------------------------------------------------------------------*/
var cdnCheck = {
    header : "<i class='fa fa-cloud'></i> CDN Installationsprüfung",
    home : "",
    blog : "",
    html : "<form><fieldset><legend><i class='fa fa-tag'>&nbsp;</i><span>Bitte geben Sie den Namen des zu prüfenden Blogs ein</span></legend><p>http://<input id='txtBlogname' type='text' />.twoday.net/<button class='btn' id='btnCheckThisBlog'>Jetzt prüfen!</button></p></fieldset></form>",
    yep  : "&nbsp;&hellip;&nbsp;<i class='fa fa-check'></i>",
    nope : "&nbsp;&hellip;&nbsp;<i class='fa fa-frown-o'></i>",
    status : "",
    result : 0,
    query : "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22http%3A%2F%2F:blog:.twoday.net%2F%22%20and%20xpath%3D%22%2F%2Fscript%5Bcontains(%40src%2C'static.twoday.net')%5D%22&format=json",
    setBlog : function(home){
        if (home.length===0){
            home = "Bitte melden Sie sich zuerst bei Twoday an!";
        } else if (home.indexOf(".twoday.net")<0){
            this.home = "http://" + home + ".twoday.net/";
            this.blog = home;
            home = this.home;
        } else {
            this.home = home;
            this.blog = home.match(/http:\/\/(.*).twoday.net/)[1];
        }
        var $btnCheckCDN = $("#btnCheckCDN");
        $btnCheckCDN.html($btnCheckCDN.html().replace(":blog:", home));
    },
    isUserLoggedIn : function(){
        if (this.blog.length===0){
            toastr.info("Bitte melden Sie sich bei Twoday an, um diese Funktion zu nutzen!", this.header);
            return false;
        } else { return true; }
    },
    queryBlogname : function(){
        if (!this.isUserLoggedIn()) { return; }
        var $cdnCheckArea = $("#cdnCheckArea");
        $cdnCheckArea.html(this.html).find("input").val(this.blog);
        $("#btnCheckThisBlog").on( "click", function(e){
            e.preventDefault();
            cdnCheck.checkThisBlog();
        });
    },
    checkThisBlog : function(){
        var blogname = $("#txtBlogname").val();
        if (blogname!==encodeURIComponent(blogname)){
            toastr.error("Es dürfen keine Sonderzeichen im Blognamen vorkommen! Bitte korrigieren Sie Ihre Eingabe!", this.header);
            return false;
        } else {
            this.blog = blogname;
            this.home = "http://"+blogname+".twoday.net/";
            this.displayStatus();
        }
    },
    displayStatus : function(){
        if (!this.isUserLoggedIn()) { return; }
        var self = this; self.result = 0;
        toastr.info("Der CDN Installationsstatus wird jetzt überprüft...", self.header);
        $.getJSON(self.query.replace(":blog:", self.blog), function(data){
            var cntScripts = data.query.count;
            if (cntScripts===0){
                toastr.error("Das Blog ist nicht existent, nicht öffentlich oder derzeit nicht erreichbar!", self.header);
            } else {
                var arr = data.query.results.script, module = "";
                for (var i=0;i<cntScripts;i++){
                    module = arr[i].src;
                    if      (module.indexOf("jquery.min.js")>0)    { self.result = self.result|1; }
                    else if (module.indexOf("cdnconnect-min-js")>0){ self.result = self.result|2; }
                    else if (module.indexOf("yepnope154-min-js")>0){ self.result = self.result|4; }
                }
                self.status = ((self.result&1)==1) ? "jQuery ist aktiviert"+self.yep : "jQuery nicht gefunden"+self.nope;
                self.status += "<br />";
                self.status += ((self.result&2)==2) ? "CDN-Connect ist vorhanden"+self.yep : "CDN-Connect nicht gefunden"+self.nope;
                if ((self.result&3)==3){ toastr.success(self.status, self.header); } else { toastr.warning(self.status, self.header); }
                if ((self.result&7)==7){
                    toastr.success("Sie haben bereits Komponenten ausgewählt und erfolgreich aktiviert! Sie können diese jederzeit nutzen.", self.header);
                } else if ((self.result&3)==3) {
                    toastr.info("Das CDN wurde erfolgreich eingerichtet. Bitte wählen Sie nun Ihre Wunschkomponenten aus (Schritt 2) und aktivieren Sie diese durch den Aufruf Ihres Blogs (Schritt 3).", self.header);
                } else {
                    toastr.error("Das CDN ist für das Blog "+self.home+" noch nicht vollständig eingerichtet. Bitte überprüfen Sie die erforderlichen Anpassungen aus Schritt 1.", self.header);
                }
            }
        });
    }
};
/*------------------------------------------------------------------------------------------------
   cdnFiles - directory of CDN offerings, sorted by name
--------------------------------------------------------------------------------------------------*/
// JSON-Object holding all Twoday-CDN offerings/components and their individual descriptions
var cdnOfferings = {
    components: [
        { name: "accordiontabs", cached: false, selected: false, settings: false, root: "", class: 9, prio: 9, queries:
            [ { key: "Accordion", type: "selector", item: ".accComponent:first" },
              { key: "Tabs", type: "selector", item: "ul.tabs:first" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/accordiontabs-min-css.css', '#cdnTwoday/accordiontabs-min-js.js'",
          complete: ""
        },
        { name: "articletotop", cached: false, selected: false, settings: false, root: "", class: 1, prio: 5, queries:
            [ { key: "ArticleToTop", type: "selector", item: "#articleToTop" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/articletotop-min-js.js'",
          complete: ""
        },
        { name: "audio2day", cached: true, selected: false, settings: true, root: "", class: 3, prio: 9, queries:
            [ { key: "AudioPlayer", type: "selector", item: ".audio" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/audio2day-min-css.css', '#cdnTwoday/audio2day-min-js.js'",
          init: "{strPlay: 'Wiedergabe', strPause: 'Pause', strVolume: 'Lautstärke'}",
          complete: "if (siteNeeds.audio2day){ siteCached.$AudioPlayer.audioPlayer( #settings ); }"
        },
        { name: "awesomeeditor", cached: true, selected: false, settings: true, root: "", class: 3, prio: 4, queries:
            [ { key: "AwesomeEditor", type: "selector", item: "#content .formText" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/awesomeeditor-min-css.css', '#cdnTwoday/awesomeeditor-min-js.js'",
          init: "{awesomeEditorWidth: '586', awesomeEditorTopOffset: -48}",
          complete: "if (siteNeeds.awesomeeditor) { siteCached.$AwesomeEditor.markItUp( #settings ); }"
        },
        { name: "awesomeeditorcore", cached: false, selected: true, settings: false, root: "", class: 3, prio: 3, queries: [], requiredBy: [],
          load: "'#cdnTwoday/awesomeeditorcore-min-css.css'",
          complete: ""
        },
        { name: "backstretch", cached: false, selected: false, settings: true, root: "", class: 1, prio: 2, queries:
            [ { key: "Backstretch", type: "selector", item: ".usesBackstretch:first" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/backstretch204-min-js.js'",
          init: "$.backstretch('https://googledrive.com/host/0B87rILW4RVIJNlN3eUJxVWN5ZWM/bg/atSunset@majownik.jpg', {centeredX: true, centeredY: true, duration: 5000, fade: 0} );",
          complete: "if (siteNeeds.backstretch) { #settings }"
        },
        { name: "chosen", cached: true, selected: false, settings: true, root: "", class: 3, prio: 9, queries:
            [ { key: "ChosenSelect", type: "selector", item: ".chosen-select" }
            ],
          requiredBy: [],
          load: "'#cdnCflare/chosen/1.1.0/chosen.min.css', '#cdnCflare/chosen/1.1.0/chosen.jquery.min.js'",
          init: "{disable_search_threshold: 10, width: '70%', no_results_text: 'Oops, keine Ergebnisse!', placeholder_text_multiple: 'Bitte Optionen wählen...', placeholder_text_single: 'Bitte eine Option auswählen...'}",
          complete: "if (siteNeeds.chosen) { siteCached.$ChosenSelect.chosen( #settings ); }"
        },
        { name: "commentform", cached: false, selected: false, settings: false, root: "", class: 9, prio: 9, queries:
            [ { key: "CommentForm", type: "selector", item: "form[name=editForm]:first" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/commentform-min-js.js'",
          complete: ""
        },
        { name: "fontawesome", cached: false, selected: false, settings: false, root: "", class: 1, prio: 0, queries:
            [ { key: "FontAwesome", type: "selector", item: ".fa:first" },
              { key: "Foundt5Used", type: "code", item: "this.foundation || false" },
              { key: "AccTabsUsed", type: "code", item: "this.accordiontabs || false" },
              { key: "AEditorUsed", type: "code", item: "this.awesomeeditor || false" },
              { key: "SharingUsed", type: "code", item: "siteCached.$StoryShare.length>0 || false" }
            ],
          requiredBy: ["accordiontabs", "awesomeeditor", "foundation", "storyshare" ],
          load: "'#cdnTwoday/fontawesome403-min-css.css'",
          complete: ""
        },
        { name: "foundation", cached: false, selected: false, settings: true, root: "", class: 2, prio: 0, queries: [], requiredBy: [],
          load: "'<% site.skin name='googleDrive' %>css/foundation/foundation2day522.min.css', '<% site.skin name='googleDrive' %>js/foundation/foundation2day522.min.js'",
          init: "{validateDataAttribs: true, initFoundation5: { topbar: {is_hover: !Modernizr.touch, mobile_show_parent_link: false}, orbit:  {animation: 'slide', timer_speed: 6000, resume_on_mouseout: false, animation_speed: 500, slide_number: true, bullets: false, next_on_click: true}}}",
          complete: "if (siteNeeds.foundation) { $('[title^=data-]').foundation2day().init( #settings ); $('#preloadAnimation').fadeOut(); $('#preloadWrapper').delay(350).fadeOut('slow'); }"
        },
        { name: "googledrive", cached: true, selected: false, settings: true, root: "", class: 1, prio: 6, queries:
            [ { key: "GoogleDrive", type: "selector", item: ".googledrive" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/gdimages-min-js.js'",
          init: "{gdRootFolder: '/host/0B87rILW4RVIJNlN3eUJxVWN5ZWM', gdSubFolder: '', addClass: 'neonimg th', titleContent: 'keep'}",
          complete: "if (siteNeeds.googledrive) { siteCached.$GoogleDrive.gdImages().init( #settings ); }"
        },
        { name: "inlinestyles", cached: true, selected: true, settings: false, root: "", class: 3, prio: 2, queries:
            [ { key: "InlineStyles", type: "selector", item: "style" }
            ],
          requiredBy: ["storyscript"],
          load: "",
          complete: "if (siteNeeds.inlinestyles) { siteCached.$InlineStyles.each(function(){ var me=$(this); me.text(me.text().replace(/<br \\/>/gi,'')); }) }"
        },
        { name: "isotope", cached: true, selected: false, settings: true, root: "", class: 9, prio: 9, queries:
            [ { key: "Isotope", type: "selector", item: "#isotope" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/isotope1525-min-js.js'",
          init: "{containerClass: 'content', itemSelector: '.story', layoutMode: 'masonry'}",
          complete: "if (siteNeeds.isotope) { siteCached.$Isotope.isotope( #settings ); }"
        },
        { name: "jquery", cached: false, selected: true, settings: false, root: "", class: 1, prio: 1, queries:
            [ { key: "jQuery", type: "function",
                item: "if(typeof jQuery !== 'undefined'){ x=$.fn.jquery.split('.');y=parseInt(x[0])*100+parseInt(x[1]) } else { y=0 }; return(y<109);"
              }
            ],
          requiredBy: [],
          load: "'//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js'",
          complete: ""
        },
        { name: "sidebartotop", cached: false, selected: false, settings: false, root: "", class: 1, prio: 4, queries:
            [ { key: "SidebarToTop", type: "selector", item: ".sidebarToTop:first" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/sidebartotop-min-js.js'",
          complete: ""
        },
        { name: "snippet", cached: true, selected: false, settings: false, root: "", class: 3, prio: 9, queries:
            [ { key: "PreHtml", type: "selector", item: "pre.html" },
              { key: "PreCss", type: "selector", item: "pre.css" },
              { key: "PreJs", type: "selector", item: "pre.js" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/snippet-min-css.css', '#cdnTwoday/snippet-min-js.js'",
          complete: "var param={style:'golden',showNum:false,clipboard:'#cdnTwoday/ZeroClipboard.swf'}; if (siteCached.$PreHtml.length>0){ siteCached.$PreHtml.snippet('html',param); } if (siteCached.$PreCss.length>0){ siteCached.$PreCss.snippet('css',param); } if (siteCached.$PreJs.length>0){ siteCached.$PreJs.snippet('javascript',param); }"
        },
        { name: "storyscript", cached: true, selected: false, settings: false, root: "", class: 3, prio: 1, queries:
            [ { key: "StoryScript", type: "selector", item: ".storyScript" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/storyscript-min-js.js'",
          complete: "if (siteNeeds.storyscript) { siteCached.$StoryScript.storyScript().init(); }"
        },
        { name: "storyshare", cached: true, selected: false, settings: true, root: "", class: 3, prio: 9, queries:
            [ { key: "StoryShare", type: "selector", item: ".storyShare" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/storyshare-min-css.css', '#cdnTwoday/storyshare-min-js.js'",
          init: "{storyUrl: '<% site.url %>', storyTitle: '<% site.title %>', imgUrl: '<% staticURL %><% site.alias %>/images/pinterest.jpg'}",
          complete: "if (siteNeeds.storyshare) { siteCached.$StoryShare.storyShare().init( #settings ); }"
        },
        { name: "swipebox", cached: true, selected: false, settings: true, root: "", class: 9, prio: 9, queries:
            [ { key: "Swipebox", type: "selector", item: ".swipebox" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/ios-orientationchange-fix-js.js', '#cdnTwoday/swipebox-min-css.css', '#cdnTwoday/swipebox-min-js.js'",
          init: "{hideBarsOnMobile: true, hideBarsDelay: 3000}",
          complete: "if (siteNeeds.swipebox) { siteCached.$Swipebox.swipebox( #settings ); }"
        },
        { name: "timeago", cached: true, selected: false, settings: true, root: "", class: 9, prio: 9, queries:
            [ { key: "TimeAgo", type: "selector", item: ".timeago" }
            ],
          requiredBy: [],
          load: "'#cdnCflare/jquery-timeago/1.4.0/jquery.timeago.min.js'",
          init: "{allowPast: true, allowFuture: false, localeTitle: false, cutoff: 0, strings: {prefixAgo: 'vor', prefixFromNow: 'in', suffixAgo: '', suffixFromNow: '', inPast: 'gerade eben', seconds: 'wenigen Sekunden', minute: 'etwa einer Minute', minutes: '%d Minuten', hour: 'etwa einer Stunde', hours: '%d Stunden', day: 'etwa einem Tag', days: '%d Tagen', month: 'etwa einem Monat', months: '%d Monaten', year: 'etwa einem Jahr', years: '%d Jahren', wordSeparator: ' ', numbers: [] } }",
          complete: "if (siteNeeds.timeago) { siteCached.$TimeAgo.timeago( #settings ); }"
        },
        { name: "tipsy", cached: true, selected: false, settings: true, root: "", class: 9, prio: 9, queries:
            [ { key: "Tipsy", type: "selector", item: "[rel=tipsy]" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/tipsy-min-css.css', '#cdnTwoday/tipsy-min-js.js'",
          init: "{fade: true, gravity: 's'}",
          complete: "if (siteNeeds.tipsy) { siteCached.$Tipsy.tipsy( #settings ); }"
        },
        { name: "toastr", cached: false, selected: true, settings: true, root: "", class: 1, prio: 3, queries: [], requiredBy: [],
          load: "'#cdnTwoday/toastr201-min-css.css', '#cdnTwoday/toastr201-min-js.js'",
          init: "{closeButton: true}",
          complete: "toastr.options = #settings;"
        },
        { name: "unslider", cached: true, selected: false, settings: true, root: "", class: 3, prio: 9, queries:
            [ { key: "Unslider", type: "selector", item: ".banner" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/event-move-swipe-min-js.js', '#cdnTwoday/unslider-min-css.css', '#cdnTwoday/unslider-min-js.js'",
          init: "{speed: 800, delay: 4000, keys: true, dots: true}",
          complete: "if (siteNeeds.unslider) { siteCached.$Unslider.unslider( #settings ); }"
        },
        { name: "videoplayer", cached: true, selected: false, settings: false, root: "", class: 3, prio: 5, queries:
            [ { key: "VideoPlayer", type: "selector", item: ".html5video" }
            ],
          requiredBy: [],
          load: "",
          complete: ""
        },
        { name: "videojs", cached: false, selected: false, settings: false, root: "videoplayer", class: 3, prio: 6, queries:
            [ { key: "VideoJS", type: "code", item: "siteCached.$VideoPlayer.hasClass('other') || false" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/video43-min-css.css', '#cdnTwoday/video43-min-js.js'",
          complete: ""
        },
        { name: "video2day", cached: false, selected: false, settings: true, root: "videoplayer", class: 3, prio: 6, queries:
            [ { key: "Video2Day", type: "code", item: "siteCached.$VideoPlayer.length>0 || false" }
            ],
          requiredBy: [],
          load: "'#cdnTwoday/video2day-min-js.js'",
          init: "{addFlexVideoClass: true}",
          complete: "if (siteNeeds.video2day) { siteCached.$Video2Day.init( #settings ); }"
        }
    ],
//  holds all preselected or user-selected CDN components by key of "nnnName" where nnn=class*100+prio and Name=component.name
    selectedComponents: [],
//  holds the names of all amended (i.e. added by dependency rule) components, which were not selected by the user in the first place
    amendedComponents: [],
//  #cdn variables, e.g. #cdnTwoday as a string in the load-element will be replaced by cdns[twoday]
    cdns: { twoday: "<% staticURL %>cdn/files", cflare: "http://cdnjs.cloudflare.com/ajax/libs" },
//  assembles the init-settings for all selected components having settings=true
    settings: [],
//  assembles the jquery cache commands for all selected components with a cached=true element
    cached: [],
//  assembles the selector commands for all selected components with one or more queries or a complete-function-code
    needs: [],
//  assembles the JSON object for the script/css-loader yepnope (also available through modernizr)
    yepnopes: [],
//  select a component and calculate its priority
    selectComponent: function(component, flag){
        if (component.selected){
//          push calculated load priority and name to selectedComponents-array
            this.selectedComponents.push((component.class*100+component.prio).toString()+component.name);
//          additonally push component name to amendedComponents if they were added due to a dependency rule
            if (flag || "" === "amend"){
                this.amendedComponents.push(component.name);
            }
        }
    },
//  sets selected to true if the user has marked the component or its root/parent component
    markItemsAsSelected: function(items){
        var self = this, dependingComponent;
//      empty the result array
        self.selectedComponents.length = 0;
//      loops through all components
        $.each( self.components, function(index, component){
//          if component is not pre-selected already
            if (!component.selected){
//              check if user did select this one
                component.selected = ($.inArray((component.root.length>0 ? component.root : component.name), items)>=0);
            }
//          set loadAlways flag if a selected component has no queries
            component.loadAlways = (component.selected && component.queries.length===0);
//          now save the component if it was marked for inclusion
            self.selectComponent(component);
        });
//      check for dependencies among components
        $.each( self.components, function(index, component){
//          only check components which are not selected by now
            if (!component.selected){
//              then check their requiredBy components
                $.each( component.requiredBy, function(index, name){
//                  and lookup the component definition
                    dependingComponent = self.components.filter(function(item){ return (item.name === name); })[0];
                    if (dependingComponent.loadAlways || false){
//                      select and always load this component, too
                        component.selected = component.loadAlways = true;
//                      quit the each-loop
                        return false;
                    } else {
//                      activate current component if the other component has been selected
                        component.selected = component.selected || (dependingComponent.selected || false);
                    }
                });
//              now save the component if it was additionally marked for inclusion
                self.selectComponent(component, "amend");
            }
        });
//      sort all selected components according to their load priority
        self.selectedComponents.sort();
    },
//  assembles the settings JSON string: push a JSON component info string
    assembleSettings: function(item){
        this.settings.push("{'" + item.name + "': { 'status': 'initial', 'settings': '" + item.init || "" + "'}}");
    },
//  assembles the cached-commandset
    assembleCached: function(item){
        var self = this;
        $.each( item.queries, function(index, query){
            if (query.type==="selector"){
                self.cached.push("$" + query.key + ": $('" + query.item + "')");
            }
        });
    },
//  assembles the needs-commandset
    assembleNeeds: function(item){
        var self = this, q = [], qLen, s;
        $.each( item.queries, function(index, query){
            switch(query.type){
                case "selector": s = (item.cached ? "(siteCached.$"+query.key+".length>0)" : "($('"+query.item+"').length>0)"); q.push(s); break;
                case "code":     q.push("(" + query.item + ")"); break;
                case "function": q.push("(function(){" + query.item + "})"); break;
            }
        });
        s = item.name+': ';
        qLen = (item.loadAlways ? 0 : q.length);
        switch(qLen){
            case 0:  s += 'true'; break;
            case 1:  s += q[0]; break;
            default: s += 'function(){ return ' + q.join(' || ') + '};';
        }
        self.needs.push(s);
    },
//  assembles the yepnope JSON string
    assembleYepnopes: function(item){
        var self = this, hasLoads = (item.load.length>0), s = "{ ";
        s += (hasLoads ? 'test: siteNeeds.' + item.name + ',\n  yep: [ ' + item.load + ' ]' : '');
        if (item.complete.length>0){
            s += (hasLoads ? ',\n  ' : '') + 'complete: function(){ ' + item.complete.replace(/#Settings/gi,'siteSettings.'+item.name+'.settings') + ' }';
        }
        s += '\n}';
        self.yepnopes.push(s);
    },
//- loops through selected components and assembles the settings/cached/needs/yepnope commands
    generateParams : function(){
        var self = this, component, name;
        self.settings.length = 0; self.cached.length = 0; self.needs.length = 0; self.yepnopes.length = 0;
        $.each( self.selectedComponents, function(index, strComponent){
            name = strComponent.substr(3, strComponent.length-3);
            component = self.components.filter(function(item){ return (item.name === name); })[0];
            if (component.settings){
                self.assembleSettings(component);
            }
            if (component.cached) {
                self.assembleCached(component);
            }
            if (component.load.length>0 || component.complete.length>0) {
                self.assembleNeeds(component);
                self.assembleYepnopes(component);
            }
        });
        if (self.amendedComponents.length>0){
            toastr.info("Auf der Basis Ihrer Auswahl wurden folgende CDN-Komponenten automatisch ergänzt: <b>"+self.amendedComponents.join(", ")+"</b>", cdnCoreInfo.cdnHeader);
        }
    },
//- replaces the placeholder #-variables in the script source template
    insertParams : function(code){
        return code.replace(/#Settings/i,   this.settings.join(",\n"))
                   .replace(/#Cached/i,     this.cached.join(", "))
                   .replace(/#Needs/i,      this.needs.join(",\n"))
                   .replace(/#Yepnopes/i,   this.yepnopes.join(",\n"))
                   .replace(/#cdnTwoday/gi, this.cdns.twoday)
                   .replace(/#cdnCflare/gi, this.cdns.cflare)
                   .replace(/&lt;/gi, "\<")
                   .replace(/&gt;/gi, "\>");
    }
};
/*------------------------------------------------------------------------------------------------
    cdnStorage - processes localStorage read/write activities
--------------------------------------------------------------------------------------------------*/
var cdnStorage = {
    data : {
        date   : "",
        action : "",
        status : "",
        script : ""
    },

    isLocalStorageSupported : function(){
        if (localStorage){
            return true;
        } else {
            toastr.error("Sorry, Ihr Browser ist veraltet und unterstützt die notwendigen CDN-Funktionen nicht! Bitte aktualisieren Sie Ihre Software und verwenden Sie einen modernen Browser (z.B. Chrome oder Firefox)!", cdnCoreInfo.cdnHeader);
            return false;
        }
    },

    writeLocalStorage : function(){
        var key = cdnCoreInfo.userName;
        if (key.length===0){
            toastr.info("Bitte melden Sie sich bei Twoday an, um diese Funktion zu nutzen!", cdnCoreInfo.cdnHeader);
            return false;
        }
        if (!this.isLocalStorageSupported){ return false; }
        try {
            localStorage.setItem(key, JSON.stringify(this.data));
            return true;
        } catch(e) {
            toastr.error("Fehler beim Speichern der cdnTwoday-Daten ("+e.message+")", cdnCoreInfo.cdnHeader);
            return false;
        }
    },

    saveCDN : function(action, script){
        var self = this.data,
            timeStamp = new Date();
        self.date = timeStamp.toGMTString();
        self.action = action;
        self.status = "<div id='cdnStatus' style='display:none'>CDN " + (action==="Remove" ? "removed " : "updated ") + self.date + "</div>\n";
        self.script = script;
        return this.writeLocalStorage();
    }
};
/*------------------------------------------------------------------------------------------------
    cdnYepnope - generates the yepnope script from user selections
--------------------------------------------------------------------------------------------------*/
var cdnYepnope = {
//  returns the script template; variables "#xxxxxx" will be replaced with appropriate content
    getInitialScript : function(){
        return "&lt;script type='text/javascript' src='http://static.twoday.net/cdn/files/yepnope154-min-js.js'&gt;&lt;/script&gt;\n&lt;script type='text/javascript'&gt;\n$(document).ready(function(){\nvar\nsiteSettings = #Settings,\n\nsiteCached = {#Cached},\n\nsiteNeeds = {#Needs};\n\nyepnope([\n#Yepnopes ]);\n});\n&lt;/script&gt;";
    },
//  saves selected components and marks related CDN offerings
    markSelected : function(){
        var checkedItems = [];
        $("input[type=checkbox]:checked").each( function(index,item){
            checkedItems.push(item.value);
        });
        if (checkedItems.length>0) {
            cdnOfferings.markItemsAsSelected(checkedItems);
        }
        return checkedItems.length;
    },
//  generates the final loader script and saves install ticket into localStorage (will be read and processed by cdnConnect)
    generateScript : function(){
        if (this.markSelected()===0){
            toastr.warning("Sie haben keine Komponenten ausgewählt - Ihr Blog bleibt unverändert.", cdnCoreInfo.cdnHeader);
        } else {
            cdnOfferings.generateParams();
            var script = cdnOfferings.insertParams(this.getInitialScript());
            if (cdnStorage.saveCDN("CreateOrUpdate", script)){
                toastr.success("Der Auftrag zur Aktivierung der gewählten CDN-Elemente in Ihrem Blog wurde erfolgreich gespeichert!", cdnCoreInfo.cdnHeader);
            }
        }
    },
//  generates and save removal order to localStorage (will be read and processed by cdnConnect)
    removeScript : function(){
        if (cdnStorage.saveCDN("Remove", "")){
            toastr.success("Der Auftrag zur Entfernung des CDN aus Ihrem Blog wurde erfolgreich gespeichert!", cdnCoreInfo.cdnHeader);
        }
    }
};
/*------------------------------------------------------------------------------------------------
  CDN button processing/routines
--------------------------------------------------------------------------------------------------*/
$(document).ready(function(){ "use strict";
//  inserts the main blog url of a logged-in user into the cdnCheck-button text
    cdnCheck.setBlog(cdnCoreInfo.userUrl);

//  handle clickbutton event to verify CDN setup status
    $("#btnCheckCDN").click( function(e){
        e.preventDefault();
        cdnCheck.displayStatus();
    });

//  handle clickbutton event to check non-standard (other) blog
    $("#btnOtherBlog").click( function(e){
        e.preventDefault();
        cdnCheck.queryBlogname();
    });

//  handle clickbutton event to select all available CDN components
    $("#btnMarkAll").click( function(e){
        e.preventDefault();
        $("input[type=checkbox]").prop("checked", true);
    });

//  handle clickbutton event to deselect all components
    $("#btnMarkNone").click( function(e){
        e.preventDefault();
        $("input[type=checkbox]").prop("checked", false);
    });

//  handle clickbutton event to select the most wanted components
    $("#btnMostWanted").click( function(e){
        e.preventDefault();
        $("input[type=checkbox]").prop("checked", false);
        $("label.mostWanted input[type=checkbox]").prop("checked", true);
    });

//  handle clickbutton event to generate the final loader script based on the list of selected components
    $("#btnActivateCDN").click( function(e){
        e.preventDefault();
        cdnYepnope.generateScript();
    });

//  handle clickbutton event to terminate the CDN function
    $("#btnRemoveCDN").click( function(e){
        e.preventDefault();
        cdnYepnope.removeScript();
    });
});