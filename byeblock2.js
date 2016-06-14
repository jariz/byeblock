/**
 * BYEBLOCK II: REBORN: WITH A VENGEANCE: ELECTRIC BOOGALOO
 */

/**
 * ByeBlock's custom modules
 */
var customModules = [{
    properties: ['ownerUrl', 'parse', 'baseUrl', 'destroyUrl', 'streamsUrl', 'getImageSaveUrl', 'extractSecretToken', 'play', 'pause', 'seek', 'seekRelative', 'getCurrentSound'],
    func: function (module, b, require) {
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
}];

/**
 * The hook that hijacks soundcloud modules and replaces them with byeblock modules
 */
var realWebpack = window.webpackJsonp;
window.webpackJsonp = function (x, modules) {
    var newModules = {}, backdoored = 0;
    Object.keys(modules).forEach(function(key) {
        //backdoor that ish
        var module = modules[key];
       
        if(typeof module === 'function') {
            backdoored++;
            var constructor = module;
            module = function(realModule) {
                var initArgs = arguments;
                constructor.apply(this, arguments);
                var exports = realModule.exports;
                if(typeof realModule.exports === "function") {
                    realModule.exports = new Proxy(exports, {
                        construct: function(target, argumentsList, newTarget) {
                            var instance = Reflect.construct(target, argumentsList, newTarget)

                            //check if the currently initialized module is a match for one our custom ones
                            customModules.forEach(function(customModule) {
                                if(customModule.properties.every(prop => typeof instance[prop] !== "undefined")) {
                                    //match!
                                    customModule.func.apply(instance, initArgs);
                                }
                            })

                            return instance;
                        }
                    });
                }
            }
        }
       
        newModules[key] = module;
    });

    console.log("hooked", backdoored, "modules");
    realWebpack.apply(window, [x, newModules]);  
};