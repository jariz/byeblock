/**
 * Created by Jari on 30/03/16.
 */
(function() {
    console.log("--- ByeBlock! ---");
    console.log("Injecting webpack hook...");

    var realWebpack = window.webpackJsonp;
    var customModules = {
        69: function (realModule) {
            return function (module, b, require) {
                realModule.apply(realModule, arguments);

                var gritter = require(1).gritter;
                
                module.exports.iAmCustom = true;

                var get = module.exports.prototype.get;
                module.exports.prototype.get = function (name) {
                    var value = get.apply(this, arguments);
                    if (name === "policy") {
                        if (!this.get("realpolicy")) {
                            //well. we don't know the value yet :P
                            //lie and tell soundcloud it's allowed.
                            //get the proxied value & update the real value later.

                            var realPolicy = value;
                            this.set("realpolicy", realPolicy);
                            this.set("policy", "ALLOW");
                            this.set("duration", this.get("full_duration"));
                            return "ALLOW";
                        }

                        if (this.get("fakedpolicy") && this.get("realpolicy")) {
                            //the policy was sucessfully faked, so return the actual value.
                            return value;
                        }

                        //fallback to always allowing
                        return "ALLOW";
                    }
                    return value;
                };
                var realSetup = module.exports.prototype.setup;
                module.exports.prototype.setup = function (data) {
                    //call real setup func
                    realSetup.apply(this, arguments);

                    var realPolicy = this.get("realpolicy");

                    if (typeof realPolicy === "string" && realPolicy !== "ALLOW") {
                        console.log(this.get("title") + "'s realPolicy is", realPolicy, ", reported back policy is", this.get("policy"))
                        var me = this;
                        fetch("https://geoblock.lol/policy/" + this.id)
                            .then(function (res) {
                                return res.json()
                            })
                            .then(function (res) {
                                me.set.call(me, "policy", res.policy);
                                me.set.call(me, "fakedpolicy", true);

                                //fix track length...
                                if (res.policy === "SNIP") {
                                    me.set.call(me, "duration", 30000);
                                } else {
                                    me.set.call(me, "duration", me.get.call(me, "full_duration"));
                                }

                                console.log("geoblock.lol reported that the proxied policy of", me.get.call(me, "title"), "is", res.policy);
                            })
                            .catch(function () {
                                console.error("geoblock.lol request failed, setting back real values.")

                                var title = me.get.call(me, "title");
                                if (title.length > 16) {
                                    title = title.substring(0, 16).trim() + "...";
                                }

                                gritter.add({
                                    title: "ByeBlock error",
                                    text: "Unable to unblock '" + title + "'",
                                    image: "https://i.imgur.com/pTaH9Lk.png"
                                });

                                if (realPolicy === "SNIP") {
                                    me.set.call(me, "duration", 30000);
                                }
                                me.set.call(me, "policy", realPolicy);
                            })
                    }
                }

                module.exports.prototype.streamsUrl = function () {
                    var url = this.getEndpointUrl("trackStreams", {id: this.id});
                    if (this.get("policy") !== this.get("realpolicy") && this.get("realpolicy") !== "ALLOW") {
                        //policy is different than normal, fall back to geoblock server.
                        url = "https://geoblock.lol/stream/" + this.id;
                    }
                    console.log(url);

                    return url;

                }
            }
            return realModule;
        },
        258: function (realModule) {
            realModule.exports = {
                getLongBlockMessage: function () {
                    return "This track is not available in United States (through ByeBlock)";
                },
                getShortBlockMessage: function () {
                    return "Not available in United States";
                }
            };
            return realModule;
        }
    };

    window.webpackJsonp = function (x, modules) {
        //hook our custom modules
        Object.keys(customModules).forEach(function(key) {
            if(typeof modules[key] !== "undefined") {
                var realModule = modules[key],
                    customModule = customModules[key](realModule)
                modules[key] = customModule;
                console.log("Registered custom module", key);
            }
        });
        
        //call real bootstrapper
        realWebpack.apply(window, [x, modules]);

        Object.keys(customModules).forEach(function(key) {
            console.log(key, window.webpackCache[key]);
        });
    };

}());