const fs = require("fs");
const {LiteGraph} = require("../node_modules/litegraph.js/build/litegraph");
const Colors = require("./colors");
const ClassDataStore = require("./classDataStore");

const classStore = new ClassDataStore();

const classesByName = [];

const fields = [];
const eventListenerMethods = [];
const objectMethods = [];
const enumMethods = [];
const generatedMethods = [];
const methodCalls = [];
const nativeCalls = [];

const javaPluginMethods = [];
const onLoadMethods = [];
const onEnableMethods = [];
const onDisableMethods = [];
const onCommandMethods = [];
const onTabCompleteMethods = [];

function generateClassCode(graph, projectInfo) {
    classStore.init();

    console.log(graph)
    for (let i = 0; i < graph._nodes.length; i++) {
        if (graph._nodes[i].nodeType === "BukkitClassNode") {
            let classData = classStore.getClass(graph._nodes[i].className);
            if (graph._nodes[i].classType === "event") {
                generateCodeForEventClassNode(graph, i, graph._nodes[i], classData);
            }
            if (graph._nodes[i].classType === "object") {
                generateCodeForObjectClassNode(graph, i, graph._nodes[i], classData);
            }
            if (graph._nodes[i].classType === "enum") {
                generateCodeForEnumClassNode(graph, i, graph._nodes[i], classData);
            }
        } else if (graph._nodes[i].nodeType === "BukkitMethodNode") {
            let classData = classStore.getClass(graph._nodes[i].className);
            let methodData = classStore.getMethod(graph._nodes[i].className, graph._nodes[i].methodSignature)
            generateCodeForMethodNode(graph, i, graph._nodes[i], classData, methodData);
        } else {
            if (graph._nodes[i].classType === "native") {
                generateCodeForNativeNode(graph, i, graph._nodes[i]);
            }
        }
    }


    let classCode = "" +
        "package " + projectInfo.package + ";\n" +
        "\n" +
        "/******************************************************************/\n" +
        "/* Hi! Welcome to the generated source code of a PluginBlueprint! */\n" +
        "/*                                                                */\n" +
        "/* Just as a quick disclaimer:                                    */\n" +
        "/* If you're trying to get into *actual* programming, please      */\n" +
        "/* do NOT use this code as a starting point!                      */\n" +
        "/* This code was designed to be easily generated by more code     */\n" +
        "/* and goes against a whole lot of programming conventions in     */\n" +
        "/* terms of efficiency, readability & more.                       */\n" +
        "/*                                                                */\n" +
        "/* Anyway - have fun blueprinting and/or programming! :)          */\n" +
        "/* ~inventivetalent                                               */\n" +
        "/******************************************************************/\n" +
        "/****          Generated by PluginBlueprint                    ****/\n" +
        "/******************************************************************/\n" +
        "public class GeneratedPlugin extends org.bukkit.plugin.java.JavaPlugin implements org.bukkit.event.Listener {\n" +
        "\n" +
        fields.join("\n") +
        "\n\n" +
        "@java.lang.Override\n" +
        "public void onEnable() {\n" +
        "getServer().getPluginManager().registerEvents(this, this);\n" +
        "\n" +
        javaPluginMethods.join("\n") +
        onEnableMethods.join("\n") +
        "}\n" +
        "\n" +
        "@java.lang.Override\n" +
        "public void onDisable() {\n" +
        onDisableMethods.join("\n") +
        "}\n" +
        "\n" +
        eventListenerMethods.join("\n") +
        "\n\n" +
        objectMethods.join("\n") +
        "\n\n" +
        enumMethods.join("\n") +
        "\n\n" +
        generatedMethods.join("\n") +
        "\n\n" +
        methodCalls.join("\n") +
        "\n\n" +
        nativeCalls.join("\n") +
        "\n" +
        "}\n";

    console.log(classCode);

    // Reset
    fields.splice(0, fields.length);
    eventListenerMethods.splice(0, eventListenerMethods.length);
    onLoadMethods.splice(0, onLoadMethods.length);
    onEnableMethods.splice(0, onEnableMethods.length);
    onDisableMethods.splice(0, onDisableMethods.length);
    onCommandMethods.splice(0, onCommandMethods.length);
    onTabCompleteMethods.splice(0, onTabCompleteMethods.length);
    generatedMethods.splice(0, generatedMethods.length);
    objectMethods.splice(0, objectMethods.length);
    enumMethods.splice(0, objectMethods.length);
    methodCalls.splice(0, methodCalls.length);
    nativeCalls.splice(0, nativeCalls.length);

    return classCode;
}

function generateCodeForEventClassNode(graph, n, node,classData) {
    let code = "" +
        "@org.bukkit.event.EventHandler\n" +
        "public void on(" + node.type + " event) {\n";

    fields.push("private " + node.type + " " + nodeV(node.id) + ";");
    code += nodeV(node.id) + " = event;\n";

    // temporary variable so we can append the execution AFTER assigning variables
    let execCode = "";

    for (let o = 0; o < node.outputs.length; o++) {
        let output = node.outputs[o];
        console.log(output)
        if (!output) continue;
        if (!output.links) continue;
        if (output.links.length > 0) {

            for (let l = 0; l < output.links.length; l++) {
                let linkInfo = graph.links[output.links[l]];
                console.log(graph.links)
                console.log(linkInfo)
                if (!linkInfo) continue;

                if (output.type === "@EXEC") {
                    execCode += nodeExec(linkInfo.target_id) + ";\n";
                } else if (output.linkType !== "method") {
                    let methodData = classStore.getMethod(classData.name, output.methodSignature);
                    /* if (output.linkType === "method") {
                         generateMethod("event", output.methodData.name, node, output, targetNode, o, l);

                     } else*/
                    fields.push("private " + output.type + nodeOutput(node.id, o) + ";");
                    if (output.linkType === "object") {
                        code += nodeV(linkInfo.target_id) + " = event." + methodData.name + "();\n";//TODO: probably redundant
                        code += nodeOutput(node.id, o) + " = event." + methodData.name + "();\n";
                    } else if (output.linkType === "getter") {
                        code += nodeOutput(node.id, o) + " = event." + methodData.name + "();\n";
                    } else {
                        code += "  " + output.type + " output_" + o + "_" + l + " = event." + methodData.name + "();\n";
                    }
                }

                // if (targetInput.linkType === "trigger" || targetInput.linkType === "setter") {
                //     generateSetterMethodCall(targetInput.name, targetNode, targetInput, output.links[l].target_slot, "node_" + node.id, "node_" + node.id + "_output_" + o);
                // }

                // if (output.linkType === "this") {
                //     code += node.type + " output_" + o + "_" + l + " = event;\n";
                //
                // } else if (output.linkType === "method") {
                //     generateMethodCall("event", output.methodData.name, node, output, node.getOutputNodes(o)[l], o, l);
                //
                // } else if (output.linkType === "object") {
                //     code += "node_" + node.getOutputNodes(o)[l].id + " = event." + output.name + "();\n";
                // } else {
                //     code += output.type + " output_" + o + "_" + l + " = event." + output.name + "();\n";
                // }
            }
        }
    }

    for (let i = 0; i < node.inputs.length; i++) {
        let input = node.inputs[i];
        if (!input) continue;
        if (!input.link) continue;
        let linkInfo = graph.links[input.link];
        if (!linkInfo) continue;

        if (input.linkType === "trigger" || input.linkType === "setter") {
            let m = generateSetterMethodCall(input.name, node, input, i, nodeV(node.id), input.linkType === "setter" ? nodeOutput(linkInfo.origin_id, linkInfo.origin_slot) : "");
            code += "  " + m + "();\n";
        }
    }

    code += execCode;
    code += "}\n";

    eventListenerMethods.push(code);
}


// function generateMethod(refName, methodName, objectNode, output, methodNode, outputIndex, linkIndex) {
//     let code = "private " + methodNode.methodData.return_type + " node_" + methodNode.id + "_out_" + outputIndex + "() {\n" +
//         "" +
//         "}\n";
//     //TODO
// }

function generateSetterMethodCall(methodName, targetNode, targetInput, inputIndex, obj, param) {
    let code = "// SETTER for " + targetNode.title + "#" + methodName + "\n" +
        "private void node_" + targetNode.id + "_in_" + inputIndex + "() {\n" +
        "  " + obj + "." + methodName + "(" + param + ");\n" +
        "}\n"

    methodCalls.push(code);
    return "node_" + targetNode.id + "_in_" + inputIndex;
}

function generateCodeForObjectClassNode(graph, n, node,classData) {
    let field = "private " + node.type + nodeV(node.id) + ";";

    let code = "// CLASS EXECUTION for " + node.title + "\n" +
        "private void node_" + node.id + "_exec() {\n";
    let initCode = "";
    let execCode = "";
    let otherCode = "";
    let abstractMethods = 0;
    for (let o = 0; o < node.outputs.length; o++) {
        let output = node.outputs[o];
        if (!output) continue;
        if (!output.links) continue;
        if (output.links.length > 0) {
            if (output.linkType === "method") continue;

            if (output.type === "@EXEC" && output.linkType !== "abstractMethod") {
                for (let l = 0; l < output.links.length; l++) {
                    let linkInfo = graph.links[output.links[l]];
                    if (!linkInfo) continue;
                    execCode += nodeExec(linkInfo.target_id) + ";\n";
                }
            } else {
                if (output.linkType !== "abstractMethod")
                    fields.push("private " + output.type + nodeOutput(node.id, o) + ";");

                if (output.linkType === "this") {
                    otherCode += nodeOutput(node.id, o) + " = " + nodeV(node.id) + ";\n";
                } else if (output.linkType === "abstractMethod") {
                    abstractMethods++;
                } else {
                    otherCode += nodeOutput(node.id, o) + " = " + nodeV(node.id) + "." + output.methodName + "();\n";
                }
            }
        }
    }

    let hasRef = false;
    if (node.inputs) {
        for (let i = 0; i < node.inputs.length; i++) {
            let input = node.inputs[i];
            if (!input) continue;
            if (!input.link) continue;
            let linkInfo = graph.links[input.link];
            if (!linkInfo) continue;
            // let sourceNode = node.getInputNode(i);
            // if(!sourceNode)continue;
            // let sourceOutput = sourceNode.outputs[input.link];

            // let sourceNode = graph.getNodeById(input.link.origin_id);
            // let sourceOutput = sourceNode.outputs[input.link.origin_slot];

            if (input.linkType === "trigger" || input.linkType === "setter") {
                let m = generateSetterMethodCall(input.name, node, input, i, nodeV(node.id), input.linkType === "setter" ? nodeOutput(linkInfo.origin_id, linkInfo.origin_slot) : "");
                execCode += "  " + m + "();\n";
            } else if (input.linkType === "ref") {
                initCode += nodeV(node.id) + " = " + nodeOutput(linkInfo.origin_id, linkInfo.origin_slot) + ";\n";
                hasRef = true;
            }
        }
    }

    if (classData.name === "org.bukkit.plugin.java.JavaPlugin") {
        initCode += "  node_" + node.id + " = this;\n";
        hasRef = true;
    }

    if (!hasRef) {
        if (abstractMethods > 0) {
            initCode += nodeV(node.id) + " = new " + classData.name + "() {\n"
            for (let o = 0; o < node.outputs.length; o++) {
                let output = node.outputs[o];
                if (!output) continue;
                if (!output.links) continue;
                if (output.links.length > 0) {
                    if (output.linkType === "abstractMethod") {
                        let methodData = classStore.getMethod(classData.name, output.methodSignature);
                        let params = [];
                        for (let p = 0; p < methodData.parameters.length; p++) {
                            let pType = methodData.parameters[p].typeParameter ? "java.lang.Object" : methodData.parameters[p].type;
                            console.log(methodData.parameters[p]);
                            console.log(pType)
                            params.push(pType + " " + methodData.parameters[p].name);
                        }
                        initCode += "    public void " + methodData.name + "(" + params.join(",") + ") {\n";
                        for (let l = 0; l < output.links.length; l++) {
                            let linkInfo = graph.links[output.links[l]];
                            if (!linkInfo) continue;
                            for (let p = 0; p < methodData.parameters.length; p++) {
                                let pType = methodData.parameters[p].typeParameter ? "java.lang.Object" : methodData.parameters[p].type;
                                fields.push("private " + pType + nodeOutput(linkInfo.target_id, 1 + p) + ";");
                                initCode += nodeOutput(linkInfo.target_id, 1 + p) + " = " + methodData.parameters[p].name + ";\n"
                            }
                            initCode += nodeExec(linkInfo.target_id) + ";\n"
                        }
                        initCode += "  }\n"
                    }
                }
            }

            initCode += "};\n";
        } else {
            initCode += nodeV(node.id) + " = new " + classData.name + "(";

            let params = [];
            for (let i = 0; i < node.inputs.length; i++) {
                let input = node.inputs[i];
                if (!input) continue;
                if (input.type === "@EXEC") continue;
                let linkInfo = graph.links[input.link];
                if (!input.link || !linkInfo) {
                    // params.push("null");
                    continue;
                }


                if (input.linkType === "constructorParam") {
                    params.push(nodeOutput(linkInfo.origin_id, linkInfo.origin_slot));
                }
            }

            initCode += params.join(",");
            initCode += ");\n";
        }
    }

    code += initCode;
    code += otherCode;
    code += execCode;
    code += "}\n";

    objectMethods.push(code);

    if (classData.name === "org.bukkit.plugin.java.JavaPlugin") {
        javaPluginMethods.push(nodeExec(node.id) + ";\n");
    }

    fields.push(field);
    return field;
}

function generateCodeForEnumClassNode(graph, n, node,classData) {
    for (let o = 0; o < node.outputs.length; o++) {
        let output = node.outputs[o];
        if (!output) continue;
        if (!output.links) continue;
        if (output.links.length > 0) {
            if (output.linkType === "method") continue;

            fields.push("private " + output.type + nodeOutput(node.id, o) + " = " + classData.name + "." + output.enumName + ";");
        }
    }
}

function generateCodeForMethodNode(graph, n, node,classData,methodData) {
    let code = "// METHOD EXECUTION for "+classData.name+"#"+methodData.name+"\n" +
        "private void node_" + node.id + "_exec() {\n";

    let execCode = "";
    for (let o = 0; o < node.outputs.length; o++) {
        let output = node.outputs[o];
        if (!output) continue;
        if (!output.links) continue;
        if (output.links.length > 0) {
            if (output.name === "RETURN") {
                fields.push("private " + output.type + nodeOutput(node.id, o) + ";");
                code += nodeOutput(node.id, o) + " =";
                break;
            } else if (output.type === "@EXEC") {
                for (let l = 0; l < output.links.length; l++) {
                    let linkInfo = graph.links[output.links[l]];
                    if (!linkInfo) continue;
                    execCode += nodeExec(linkInfo.target_id) + ";\n";
                }
            }
        }
    }

    let params = [];
    for (let i = 0; i < node.inputs.length; i++) {
        let input = node.inputs[i];
        if (!input) continue;
        // if (!input.link) continue;
        let linkInfo = input.link ? graph.links[input.link] : null;
        if (!linkInfo) {
            if (i === 1) {// REF
                console.warn("Missing method reference for " + node.name);
                return;// can't continue -> no object to execute the method on
            }
        }
        let sourceNode = linkInfo ? graph.getNodeById(linkInfo.origin_id) : null;
        let sourceOutput = sourceNode ? sourceNode.outputs[linkInfo.origin_slot] : null;

        if (i === 0) continue;// EXEC
        if (i === 1) {// param opening bracket
            // code = code.replace("%obj", sourceNode.title).replace("%method", sourceOutput.methodData.name.split("(")[0]);
            if (sourceNode.classType === "enum" || methodData.isStatic) {
                code += " " + classData.name + "." + methodData.name.split("(")[0] + "(";
            } else if (!node.isAbstractMethod) {
                code += nodeV(linkInfo.origin_id) + "." + methodData.name.split("(")[0] + "(";
            }
            continue;
        }

        if (!linkInfo || !sourceNode) {
            params.push("null");
        } else {// append param
            params.push(nodeOutput(linkInfo.origin_id, linkInfo.origin_slot));
        }
    }

    if (!node.isAbstractMethod) {
        code += params.join(",");
        code += ");\n";
    } else if (classData.name === "org.bukkit.plugin.java.JavaPlugin") {
        if (methodData.name === "onLoad") {
            onLoadMethods.push(nodeExec(node.id) + ";\n")
        }
        if (methodData.name === "onEnable") {
            onEnableMethods.push(nodeExec(node.id) + ";\n");
        }
        if (methodData.name === "onDisable") {
            onDisableMethods.push(nodeExec(node.id) + ";\n")
        }
        if (methodData.name === "onCommand") {
            onCommandMethods.push(nodeExec(node.id) + ";\n")
        }
        if (methodData.name === "onTabComplete") {
            onTabCompleteMethods.push(nodeExec(node.id) + ";\n")
        }
    }

    code += execCode;

    code += "}\n";

    methodCalls.push(code);


}

function generateCodeForNativeNode(graph, n, node) {
    console.log(node)
    if (!node.getOutputCode) return;

    let inputVars = [];
    if (node.inputs) {
        for (let i = 0; i < node.inputs.length; i++) {
            let input = node.inputs[i];
            if (!input) continue;
            if (!input.link) continue;
            let linkInfo = graph.links[input.link];
            if (!linkInfo) continue;
            if (input.type === "@EXEC") continue;

            inputVars.push(nodeOutput(linkInfo.origin_id, linkInfo.origin_slot));
        }
    }

    let outputCode = node.getOutputCode(inputVars);

    let code = "";
    if ((!node.inputs || node.inputs.length === 0) && node.outputs && node.outputs.length > 0) {
        if (!node.getNativeType) return;

        let nativeType = node.getNativeType();
        let outputIndex = node.getOutputIndex();


        if (!Array.isArray(nativeType) && !Array.isArray(outputCode)) {
            if (!outputIndex) outputIndex = 0;
            fields.push("private " + nativeType + nodeOutput(node.id, outputIndex) + " = " + outputCode + ";");
        } else if (Array.isArray(nativeType) && Array.isArray(outputCode)) {
            if (nativeType.length !== outputCode.length) {
                console.error("Array length mismatch for native node " + node.name);
                return;
            }
            for (let i = 0; i < nativeType.length; i++) {
                fields.push("private " + nativeType[i] + nodeOutput(node.id, outputIndex[i] || 0) + " = " + outputCode[i] + ";");
            }
        } else {
            console.error("Either the type or the output of native node " + node.name + " is not an array while the other is");
        }
    } else if ((!node.outputs || node.outputs.length === 0) && node.inputs.length > 0) {
        code += ("private void node_" + node.id + "_exec() {\n" +
            outputCode + "\n" +
            "");
    } else if (node.outputs && node.outputs.length > 0 && node.inputs && node.inputs.length > 0) {
        if (!node.getNativeType) return;

        let nativeType = node.getNativeType();
        let outputIndex = node.getOutputIndex();
        console.log(outputIndex)

        if (!Array.isArray(nativeType) && !Array.isArray(outputCode)) {
            if (!outputIndex) outputIndex = 0;
            fields.push("private " + nativeType + nodeOutput(node.id, outputIndex) + ";");
            code += ("private void node_" + node.id + "_exec() {\n" +
                nodeOutput(node.id, outputIndex) + " = " + outputCode + "\n" +
                "");
        } else if (Array.isArray(nativeType) && Array.isArray(outputCode)) {
            if (nativeType.length !== outputCode.length) {
                console.error("Array length mismatch for native node " + node.name);
                return;
            }
            for (let i = 0; i < nativeType.length; i++) {
                fields.push("private " + nativeType[i] + nodeOutput(node.id, outputIndex || 0) + ";");
                code += ("private void node_" + node.id + "_exec() {\n" +
                    "node_" + nodeOutput(node.id, outputIndex[i] || 0) + " = " + outputCode[i] + "\n" +
                    "");
            }
        } else {
            console.error("Either the type or the output of native node " + node.name + " is not an array while the other is");
        }
    }

    if (code.length > 2) {
        if (node.outputs) {
            for (let o = 0; o < node.outputs.length; o++) {
                let output = node.outputs[o];
                if (!output) continue;
                if (!output.links) continue;
                if (output.links.length > 0) {
                    if (output.type === "@EXEC") {
                        for (let l = 0; l < output.links.length; l++) {
                            let linkInfo = graph.links[output.links[l]];
                            if (!linkInfo) continue;
                            code += nodeExec(linkInfo.target_id) + ";\n";
                        }
                    }
                }
            }
        }

        code += "}";
        nativeCalls.push(code);
    }
}


// Snippet generator

function nodeV(n) {
    return " node_" + n;
}

function nodeOutput(n, o) {
    return " node_" + n + "_output_" + o;
}


function nodeExec(nodeId) {
    return " node_" + nodeId + "_exec()"
}


module.exports = {
    generateClassCode: generateClassCode
}