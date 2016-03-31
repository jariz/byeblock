/**
 * Created by Jari on 30/03/16.
 */
console.log("--- ByeBlock! ---");
console.log("Injecting webpack hook...");

var realWebpack = window.webpackJsonp;
window.webpackJsonp = function (x, modules) {
    console.log("Registering", modules.length, "modules");

    if(typeof modules[69] === "function") {
        var realTrackModelConstructor = modules[69];
        modules[69] = function (module, b, require) {
            realTrackModelConstructor.apply(realTrackModelConstructor, arguments);
            
            var gritter = require(1).gritter;
            
            var get = module.exports.prototype.get;
            module.exports.prototype.get = function (name) {
                var value = get.apply(this, arguments);
                if(name === "policy") {
                    if(!this.get("realpolicy")) {
                        //well. we don't know the value yet :P
                        //lie and tell soundcloud it's allowed.
                        //get the proxied value & update the real value later.
                        
                        var realPolicy = value;
                        this.set("realpolicy", realPolicy);
                        this.set("policy", "ALLOW");
                        this.set("duration", this.get("full_duration"));
                        return "ALLOW";
                    }
                    
                    if(this.get("fakedpolicy") && this.get("realpolicy")) {
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
                            if(title.length > 16) {
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
        };
    }
    
    modules[258] = function (e) {
        e.exports = {
            getLongBlockMessage: function () {
                return "This track is not available in United States (through ByeBlock)";
            },
            getShortBlockMessage: function () {
                return "Not available in United States";
            }
        };
    }
    // }

    realWebpack.apply(window, [x, modules]);

};

