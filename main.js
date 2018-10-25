const {app, BrowserWindow, ipcMain, dialog, Notification, shell, crashReporter} = require('electron');
const {LiteGraph} = require("litegraph.js");
const NodeGenerator = require("./js/nodeGenerator");
const CodeGenerator = require("./js/codeGenerator");
const javaCompiler = require("./js/javaCompiler");
const serverStarter = require("./js/serverStarter");
const prompt = require("electron-prompt");
const path = require("path");
const fs = require("fs-extra");
const notifier = require("node-notifier");
const Sentry = require("@sentry/electron");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let logWin;

let debug = false;

let currentProject;
let currentProjectPath;

let recentProjects = [];

function createWindow() {
    console.log("Hai!");

    crashReporter.start({
        productName: "PluginBlueprint",
        companyName: "inventivetalent",
        submitURL: "https://submit.backtrace.io/inventivetalent/194573923afb55a5b91ad7cda2868bbefaf0df605ae377a7067af7bd44f88e27/minidump",
        uploadToServer: true
    });
    Sentry.init({dsn: 'https://6d56f92bc4f84e44b66950ed04e92704@sentry.io/1309246'});

    console.log(process.argv)
    process.argv.forEach((val, index) => {
        if (val === "--debug") {
            debug = true;
            console.log("Debugging enabled");
        }
    });

    // Create the browser window.
    win = new BrowserWindow({
        title: "PluginBlueprint Editor",
        width: 1200,
        height: 800,
        show: false,
        icon: path.join(__dirname, 'assets/images/favicon.ico'),
        backgroundColor: "#373737",
    })


    // and load the index.html of the app.
    win.loadFile('index.html');
    win.once('ready-to-show', () => {
        win.show()

        // Open the DevTools.
        if (debug) {
            win.webContents.openDevTools({
                mode: "detach"
            });
        }

        checkFileAssociation();
    })

    win.on("close", function (e) {
        let c = dialog.showMessageBox({
            message: "Are you sure you want to exit?",
            buttons: ["Yes", "No"],
            icon: path.join(__dirname, 'assets/images/logo-x64.png')
        })
        if (c === 1) {
            e.preventDefault();
        } else {
            serverStarter.killInstance();
            logWin = null;
        }
    })

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    })

    readRecentProjects();
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
});

process.on('uncaughtException', function (error) {
    console.error(error);
    process.crash();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function checkFileAssociation() {
    if (process.platform === 'win32' && process.argv.length >= 2) {
        let p = process.argv[1];
        if (p && p.length > 1) {
            openProject(path.dirname(p));
        }
    }
}

function readRecentProjects() {
    fs.readFile(path.join(app.getPath("userData"), "recentProjects.pbd"), function (err, data) {
        if (err) {
            console.warn(err);
            return;
        }

        recentProjects = JSON.parse(data) || [];
    })
}

function writeRecentProjects() {
    fs.writeFile(path.join(app.getPath("userData"), "recentProjects.pbd"), JSON.stringify(recentProjects), "utf-8", function (err) {
        if (err) {
            console.warn(err);
        }
    });
}

ipcMain.on("getRecentProjects", function (event, arg) {
    event.sender.send("recentProjects", recentProjects || []);
})

ipcMain.on("openGraph", function (event, arg) {
    if (win) {
        win.loadFile('pages/graph.html');
    }
});

ipcMain.on("showCreateNewProject", function (event, arg) {
    let projectPath = dialog.showOpenDialog({
        properties: ["openDirectory"]
    })
    console.log(projectPath);

    if (!projectPath || projectPath.length === 0) {
        return;
    }
    if (Array.isArray(projectPath)) {
        projectPath = projectPath[0];
        if (!projectPath || projectPath.length === 0) {
            return;
        }
    }
    let pathSplit = projectPath.split("\\");

    let name = pathSplit[pathSplit.length - 1];
    prompt({
        title: "Give your project a name",
        label: "Project Name",
        value: name,
        height: 150
    }).then((r) => {
        if (r) {
            name = r;
            console.log(name);

            dialog.showMessageBox({
                title: "Select spigot.jar location",
                message: "Please select the location of a valid spigot.jar executable",
                buttons: ["Select"],
                icon: path.join(__dirname, 'assets/images/logo-x64.png')
            }, () => {
                let libPath = dialog.showOpenDialog({
                    properties: ["openFile"],
                    filters: [
                        {name: 'Spigot JAR file', extensions: ['jar']}
                    ]
                });
                console.log(libPath);
                if (!libPath || libPath.length === 0) {
                    return;
                }
                if (Array.isArray(libPath)) {
                    libPath = libPath[0];
                    if (!libPath || libPath.length === 0) {
                        return;
                    }
                }

                createNewProject({
                    path: projectPath,
                    name: name
                }, libPath)
            });


        }
    })
});

function createNewProject(arg, lib) {
    let projectFilePath = path.join(arg.path, "project.pbp");
    if (fs.existsSync(projectFilePath)) {
        dialog.showErrorBox("Project exists", "There is already a PluginBlueprint project in that directory");
        return;
    }
    let projectInfo = {
        name: arg.name,
        creationTime: Date.now(),
        author: "inventivetalent",
        package: "my.awesome.plugin",
        version: "0.0.0",
        editorVersion: app.getVersion()
    };
    fs.writeFile(projectFilePath, JSON.stringify(projectInfo), "utf-8", (err) => {
        if (err) {
            console.error("Failed to create project file");
            console.error(err);
            dialog.showErrorBox("Error", "Failed to create PluginBlueprint project in that directory");
            return;
        }
        currentProjectPath = arg.path;
        currentProject = projectInfo;

        fs.mkdirSync(path.join(arg.path, "src"));
        fs.mkdirSync(path.join(arg.path, "classes"));
        fs.mkdirSync(path.join(arg.path, "output"));
        fs.mkdirSync(path.join(arg.path, "lib"));

        let rs = fs.createReadStream(lib);
        let ws = fs.createWriteStream(path.join(currentProjectPath, "lib", "spigot.jar"));
        ws.on("close", function () {
            fs.writeFile(path.join(arg.path, "graph.pbg"), JSON.stringify({}), "utf-8", (err) => {
                if (err) {
                    console.error("Failed to create graph file");
                    console.error(err);
                    return;
                }

                recentProjects.unshift(currentProjectPath);
                writeRecentProjects();

                if (win) {
                    win.loadFile('pages/graph.html');
                }
            })
        });
        rs.pipe(ws);

    });
}

ipcMain.on("createNewProject", function (event, arg) {
    createNewProject(arg);
});


ipcMain.on("showOpenProject", function (event, arg) {
    let p = dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
            {name: 'Plugin Blueprint Projects', extensions: ['pbp']}
        ]
    })
    console.log(p);

    if (!p || p.length === 0) {
        return;
    }
    if (Array.isArray(p)) {
        p = p[0];
        if (!p || p.length === 0) {
            return;
        }
    }
    p = path.dirname(p);

    openProject(p);
})

function openProject(arg) {
    console.log("openProject", arg);
    if (!arg || arg.length === 0) return;
    let projectFilePath = path.join(arg, "project.pbp");
    if (!fs.existsSync(projectFilePath)) {
        console.error("No project file found");
        dialog.showErrorBox("Not found", "Could not find a PluginBlueprint project in that directory");
        return;
    }
    fs.readFile(projectFilePath, "utf-8", function (err, data) {
        if (err) {
            console.error("Failed to read project file");
            console.error(err);
            return;
        }

        currentProjectPath = arg;
        currentProject = JSON.parse(data);

        let i = recentProjects.indexOf(currentProjectPath);
        if (i !== -1) {
            recentProjects.splice(i, 1);
        }
        recentProjects.unshift(currentProjectPath);
        writeRecentProjects();

        if (win) {
            win.loadFile('pages/graph.html');
        }
    })
}

ipcMain.on("openProject", function (event, arg) {
    openProject(arg);
})

ipcMain.on("getProjectInfo", function (event, arg) {
    event.sender.send("projectInfo", currentProject || {});
});

ipcMain.on("updateProjectInfo", function (event, arg) {
    if (!arg) return;
    currentProject = arg;

    fs.writeFile(path.join(currentProjectPath, "project.pbp"), JSON.stringify(currentProject), "utf-8", function (err) {
        if (err) {
            console.error("Failed to write project file");
            console.error(err);
            return;
        }
    })
});

ipcMain.on("getGraphData", function (event, arg) {
    if (!currentProject || !currentProjectPath) {
        return;
    }
    fs.readFile(path.join(currentProjectPath, "graph.pbg"), "utf-8", function (err, data) {
        if (err) {
            console.error("Failed to read graph file");
            console.error(err);
            return;
        }

        event.sender.send("graphData", JSON.parse(data));
    });
});

function saveGraphData(arg, cb) {
    if (!currentProject || !currentProjectPath) {
        return;
    }
    // backup
    let rs = fs.createReadStream(path.join(currentProjectPath, 'graph.pbg'));
    let ws = fs.createWriteStream(path.join(currentProjectPath, 'graph.pbg.old'));
    ws.on("close", function () {
        // write data
        fs.writeFile(path.join(currentProjectPath, "graph.pbg"), JSON.stringify(arg), "utf-8", function (err) {
            if (err) {
                console.error("Failed to save graph file");
                console.error(err);
                return;
            }

            if (cb) cb();
        })
    });
    rs.pipe(ws);
}

ipcMain.on("saveGraphData", function (event, arg) {
    console.log("saveGraphData");
    saveGraphData(arg, function () {
        event.sender.send("graphDataSaved")
    });
});


ipcMain.on("saveGraphDataAndClose", function (event, arg) {
    console.log("saveGraphData");
    saveGraphData(arg, function () {
        win.loadFile('index.html');
    });
});


function saveCodeToFile(code) {
    return new Promise((resolve, reject) => {
        console.log("saveCode: " + Date.now())
        if (!currentProject || !currentProjectPath) {
            return reject();
        }
        if (!code) return reject();

        fs.emptyDir(path.join(currentProjectPath, "src"), function (err) {
            fs.mkdirs(path.join(currentProjectPath, "src", currentProject.package.split(".").join("\\")), function (err) {
                if (err) {
                    console.error("Failed to save code file");
                    console.error(err);
                    return;
                }
                fs.writeFile(path.join(currentProjectPath, "src", currentProject.package.split(".").join("\\"), "GeneratedPlugin.java"), code, "utf-8", function (err) {
                    if (err) {
                        console.error("Failed to save code file");
                        console.error(err);
                        return;
                    }

                    console.log("savedCode: " + Date.now());

                    let manifest = "Generated-By: PluginBlueprint " + app.getVersion() + "\n";
                    fs.writeFile(path.join(currentProjectPath, "src", "manifest"), manifest, "utf-8", function (err) {
                        if (err) {
                            console.error("Failed to save manifest file");
                            console.error(err);
                            return;
                        }

                        resolve();
                    });
                });
            });
        })
    })

}

function makePluginYml() {
    return "name: " + currentProject.name +
        "\nversion: " + currentProject.version +
        "\nmain: " + currentProject.package + ".GeneratedPlugin" +
        "\nauthor: " + currentProject.author +
        "\napi-version: 1.13";
}

function compile() {
    return new Promise((resolve, reject) => {
        console.log("compile: " + Date.now())
        fs.emptyDir(path.join(currentProjectPath, "classes"), function (err) {
            javaCompiler.compile(currentProjectPath, currentProject).then((result) => {
                let pluginYml = makePluginYml();
                fs.writeFile(path.join(currentProjectPath, "classes", "plugin.yml"), pluginYml, function (err) {
                    console.log("compiled: " + Date.now());
                    resolve();
                })
            }).catch(reject);
        });
    })
}

function pack() {
    return new Promise((resolve, reject) => {
        console.log("package: " + Date.now());
        fs.emptyDir(path.join(currentProjectPath, "output"), function (err) {
            javaCompiler.package(currentProjectPath, currentProject).then(() => {
                console.log("packaged: " + Date.now());
                resolve();
            }).catch(reject);
        });
    })
}

ipcMain.on("codeGenerated", function (event, arg) {
    generateCompilePackage(arg).then(() => {
        console.log("Done!");
        showNotification("Done!");
        event.sender.send("generateDone");
    }).catch((err) => {
        event.sender.send("generateError", err);
        dialog.showErrorBox("Compilation Error", err.message);
    })
});

// async/await to preserve execution order
async function generateCompilePackage(arg) {
    if (arg.code) {
        await saveCodeToFile(arg.code);
    }
    if (arg.compile) {
        await compile();
    }
    if (arg.pack) {
        await pack();
    }
}

ipcMain.on("openOutputDir", function (event, arg) {
    shell.openItem(path.join(currentProjectPath, "output"));
});

ipcMain.on("openProjectInfoEditor", function (event, arg) {
    console.log("openProjectInfoEditor")
    let child = new BrowserWindow({
        parent: win,
        width: 600,
        height: 800,
        modal: true,
        show: false,
        resizable: false,
        backgroundColor: "#373737",
        icon: path.join(__dirname, 'assets/icons/favicon.ico')
    });
    child.loadFile('pages/infoEditor.html');
    child.show();
});

ipcMain.on("startServer", function (event, arg) {
    if (!currentProject || !currentProjectPath) {
        return;
    }
    if (logWin) logWin.destroy();
    logWin = null;
    serverStarter.killInstance();

    logWin = new BrowserWindow({
        parent: win,
        width: 800,
        height: 1000,
        modal: false,
        show: false,
        resizable: true,
        backgroundColor: "#373737",
        icon: path.join(__dirname, 'assets/images/favicon.ico')
    });
    logWin.setMenu(null);
    logWin.setTitle("PluginBlueprint Test Server")
    logWin.loadFile('pages/log.html');
    logWin.show();
    let port = "";
    serverStarter.copyPlugin(currentProjectPath, currentProject.name).then(() => {
        serverStarter.startServer(currentProjectPath,
            (out) => {
                if (logWin) {
                    if (out.indexOf("Starting Minecraft server on") !== -1) {
                        port = out.substr(24/* strip timestamp & start of string */).split(":")[1];
                    }
                    if (out.indexOf("Done (") !== -1 && out.indexOf("For help, type") !== -1) {
                        showNotification("Test Server running on port " + port);
                    }

                    logWin.webContents.send("log", {
                        type: "out",
                        content: out
                    });
                }
            },
            (err) => {
                if (logWin) {
                    logWin.webContents.send("log", {
                        type: "err",
                        content: err
                    })
                }
            });
    })
});

ipcMain.on("sendServerCommand", function (event, arg) {
    serverStarter.sendCommandToInstance(arg);
});

ipcMain.on("stopServer", function (event, arg) {
    if (logWin) logWin.destroy();
    logWin = null;
    serverStarter.killInstance();
});

function showNotification(body, title) {

    notifier.notify({
        appName: "org.inventivetalent.pluginblueprint",
        title: title || "PluginBlueprint",
        message: body || "-message-",
        icon: path.join(__dirname, "assets/images/PluginBlueprint-x512.png"),
        sound: false
    }, function (err, res) {
        console.log(err);
        console.log(res);
    })
    // }

    return {
        close: function () {
        }
    }
}
