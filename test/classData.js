let assert = require('assert');
let fs = require("fs");
let path = require("path");

let bukkitData = fs.readFileSync(path.join(__dirname, "../data/bukkitClasses.json"), "utf-8");
bukkitData = JSON.parse(bukkitData);

describe("ClassData", function () {
    describe("bukkitData", function () {
        it("should have a 'classes' property", function () {
            assert.equal(bukkitData.hasOwnProperty("classes"), true);
        });

        describe(".classes", function () {
            it("should not be null", function () {
                assert.notEqual(bukkitData.classes, null);
                assert.notEqual(bukkitData.classes, undefined);
            });
            it("should be an array", function () {
                assert.equal(Array.isArray(bukkitData.classes), true);
            });
            it("should not be empty", function () {
                assert.equal(bukkitData.classes.length > 0, true);
            });

            describe("[class]", function () {
                it("should have a 'name' property", function () {
                    for (let i = 0; i < bukkitData.classes.length; i++) {
                        let clazz = bukkitData.classes[i];
                        assert.equal(clazz.hasOwnProperty("name"), true);
                    }
                });
                it("should have a 'superclass' property", function () {
                    for (let i = 0; i < bukkitData.classes.length; i++) {
                        let clazz = bukkitData.classes[i];
                        assert.equal(clazz.hasOwnProperty("superclass"), true);
                    }
                });

                it("should have a 'methods' property", function () {
                    for (let i = 0; i < bukkitData.classes.length; i++) {
                        let clazz = bukkitData.classes[i];
                        assert.equal(clazz.hasOwnProperty("methods"), true);
                    }
                });


                for (let i = 0; i < bukkitData.classes.length; i++) {
                    let clazz = bukkitData.classes[i];

                    if (clazz.name === "org.bukkit.scheduler.BukkitScheduler") {
                        describe("org.bukkit.scheduler.BukkitScheduler",function () {
                            it("should be an interface",function () {
                                assert.equal(clazz.isInterface, true);
                            });
                            it("should be abstract",function () {
                                assert.equal(clazz.isAbstract, true);
                            });
                            it("should not be an enum",function () {
                                assert.notEqual(clazz.isEnum, true);
                            })
                            it("should not have any constructors",function () {
                                assert.notEqual(clazz.constructors.length > 0, true);
                            })

                            for(let j=0;j<clazz.methods.length;j++){
                                let method = clazz.methods[j];

                                if (method.name === "runTaskTimer") {
                                    describe("#runTaskTimer",function () {
                                        it("should be abstract",function () {
                                            assert.equal(method.isAbstract, true);
                                        })
                                        console.log(method);
                                    })
                                }
                            }
                        })
                    }
                    if (clazz.name === "org.bukkit.entity.Player") {
                        describe("org.bukkit.entity.Player",function () {
                            it("should be an interface",function () {
                                assert.equal(clazz.isInterface, true);
                            });
                            it("should be abstract",function () {
                                assert.equal(clazz.isAbstract, true);
                            });
                            it("should not be an enum",function () {
                                assert.notEqual(clazz.isEnum, true);
                            })
                            it("should not have any constructors",function () {
                                assert.notEqual(clazz.constructors.length > 0, true);
                            })
                        })
                    }
                }
            })
        })
    });
})

