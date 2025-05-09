Java.perform(function() {
    console.log("[*] Instagram ICCID Spoofing & Anti-Detection Script Started");
    
    // 1. ICCID Spoofing - Target all possible methods
    var TelephonyManager = Java.use("android.telephony.TelephonyManager");
    
    // Hook all SIM-related methods
    if (TelephonyManager.getSimSerialNumber) {
        TelephonyManager.getSimSerialNumber.implementation = function() {
            console.log("[+] Intercepted getSimSerialNumber call");
            return "89860123456789012345"; // Custom ICCID
        };
    }
    
    if (TelephonyManager.getSubscriberId) {
        TelephonyManager.getSubscriberId.implementation = function() {
            console.log("[+] Intercepted getSubscriberId call");
            return "310260123456789"; // Custom IMSI
        };
    }
    
    // Additional SIM Spoofing for newer Android versions
    try {
        var SubscriptionManager = Java.use("android.telephony.SubscriptionManager");
        var SubscriptionInfo = Java.use("android.telephony.SubscriptionInfo");

        // Note: Modifying SubscriptionInfo objects or lists can be complex.
        // Returning null or empty list from getActiveSubscriptionInfoList might be simpler if effective.
        if (SubscriptionManager.getActiveSubscriptionInfoList) {
            SubscriptionManager.getActiveSubscriptionInfoList.implementation = function() {
                console.log("[+] Intercepted SubscriptionManager.getActiveSubscriptionInfoList call");
                // var originalList = this.getActiveSubscriptionInfoList.call(this);
                // For now, returning null as an example. Modify as needed.
                return null; 
            };
        }

        if (SubscriptionInfo.getIccId) {
            SubscriptionInfo.getIccId.implementation = function() {
                var originalIccId = this.getIccId.call(this);
                console.log("[+] Intercepted SubscriptionInfo.getIccId call. Original: " + originalIccId);
                return "89860SPOOFEDICCID9012345"; // Spoofed ICCID
            };
        }
    } catch(e) {
        console.log("[-] Error hooking SubscriptionManager/Info: " + e);
    }

    // Hook NetworkInfo.getSubscriberId as an alternative way apps might get IMSI
    try {
        var NetworkInfo = Java.use("android.net.NetworkInfo");
        if (NetworkInfo.getSubscriberId) {
            NetworkInfo.getSubscriberId.implementation = function() {
                var originalSubscriberId = this.getSubscriberId.call(this);
                console.log("[+] Intercepted NetworkInfo.getSubscriberId call. Original: " + originalSubscriberId);
                return "310260123456789"; // Custom IMSI (same as TelephonyManager)
            };
        }
    } catch(e) {
        console.log("[-] Error hooking NetworkInfo.getSubscriberId: " + e);
    }

    // 2. Generic String Comparison Bypass - Target any comparison with Frida strings
    var targetStrings = [
        "showreel_bloks_frida_layout_component",
        "frida",
        "frida-server",
        "frida-gadget",
        "glados_tesla_1", // Companion security component
        "gum-js-loop"
    ];
    
    // Hook ALL string comparison methods in common utility classes
    var stringCompareClasses = [
        "java.lang.String",
        "android.text.TextUtils",
        "kotlin.jvm.internal.Intrinsics",
        "java.util.Objects"
    ];
    
    stringCompareClasses.forEach(function(className) {
        try {
            var StringClass = Java.use(className);
            
            // Hook equals method
            if (StringClass.equals) {
                StringClass.equals.implementation = function(obj) {
                    if (this && obj && typeof obj.toString === 'function') {
                        var strThis = this.toString();
                        var strObj = obj.toString();
                        
                        // Check for Frida detection strings
                        for (var i = 0; i < targetStrings.length; i++) {
                            if (strThis === targetStrings[i] || strObj === targetStrings[i]) {
                                console.log("[+] Blocking Frida string comparison: " + strThis + " =?= " + strObj);
                                return false;
                            }
                        }
                    }
                    return this.equals.call(this, obj);
                };
            }
            
            // Hook contains method (for String class)
            if (StringClass.contains) {
                StringClass.contains.implementation = function(seq) {
                    if (this && seq && typeof this.toString === 'function' && typeof seq.toString === 'function') {
                        var strThis = this.toString();
                        var strSeq = seq.toString();
                        
                        // Check for Frida detection strings
                        for (var i = 0; i < targetStrings.length; i++) {
                            if (strSeq === targetStrings[i] || strThis.indexOf(targetStrings[i]) >= 0) {
                                console.log("[+] Blocking Frida string detection in contains: " + strThis + " contains " + strSeq);
                                return false;
                            }
                        }
                    }
                    return this.contains.call(this, seq);
                };
            }
        } catch (e) {
            console.log("[-] Error hooking string class " + className + ": " + e);
        }
    });

    // Specifically hook Kotlin Intrinsics.areEqual for better Kotlin coverage
    try {
        var Intrinsics = Java.use("kotlin.jvm.internal.Intrinsics");
        if (Intrinsics.areEqual && Intrinsics.areEqual.overload('java.lang.Object', 'java.lang.Object')) {
            Intrinsics.areEqual.overload('java.lang.Object', 'java.lang.Object').implementation = function(a, b) {
                var originalResult = this.areEqual.call(this, a, b);
                if (a && b && typeof a.toString === 'function' && typeof b.toString === 'function') {
                    var strA = a.toString();
                    var strB = b.toString();
                    for (var i = 0; i < targetStrings.length; i++) {
                        if (strA === targetStrings[i] || strB === targetStrings[i]) {
                            console.log("[+] Blocking Frida string comparison via Intrinsics.areEqual: " + strA + " =?= " + strB);
                            return false; // Force non-equality
                        }
                    }
                }
                return originalResult;
            };
        }
    } catch (e) {
        console.log("[-] Error hooking kotlin.jvm.internal.Intrinsics.areEqual: " + e);
    }

    // 3. Generic Component Name Detection
    try {
        // Find all loaded classes that might be component-related
        Java.enumerateLoadedClasses({
            onMatch: function(className) {
                if (className.indexOf("Component") >= 0 || 
                    className.indexOf("Showreel") >= 0 || 
                    className.indexOf("Layout") >= 0) {
                    
                    try {
                        var ComponentClass = Java.use(className);
                        
                        // Look for getter methods that might return component names
                        var methods = ComponentClass.class.getDeclaredMethods();
                        for (var i = 0; i < methods.length; i++) {
                            var method = methods[i];
                            var methodName = method.getName();
                            var returnType = method.getReturnType().getName();
                            
                            // Only hook methods that return Strings and might be getting component names
                            if (returnType === "java.lang.String" && 
                                (methodName.indexOf("get") === 0 || 
                                methodName.indexOf("name") >= 0 || 
                                methodName.indexOf("type") >= 0 ||
                                methodName === "D76" || // From earlier discovery
                                methodName === "toString")) {
                                
                                // Create dynamic hook
                                try {
                                    if (ComponentClass[methodName]) {
                                        ComponentClass[methodName].implementation = function() {
                                            var result = this[methodName].call(this);
                                            
                                            // Check if result contains any target strings
                                            if (result) {
                                                for (var j = 0; j < targetStrings.length; j++) {
                                                    if (result.indexOf(targetStrings[j]) >= 0) {
                                                        console.log("[+] Intercepted component name with Frida reference: " + result);
                                                        return "standard_component_" + Math.floor(Math.random() * 1000);
                                                    }
                                                }
                                            }
                                            
                                            return result;
                                        };
                                    }
                                } catch (e) {
                                    // Method might not be hookable, continue
                                }
                            }
                        }
                    } catch (e) {
                        // Class couldn't be loaded or instrumented, continue
                    }
                }
            },
            onComplete: function() {
                console.log("[+] Finished enumerating component classes");
            }
        });
    } catch (e) {
        console.log("[-] Error in component enumeration: " + e);
    }
    
    // 4. Hide Frida artifacts
    try {
        // Hide Frida threads
        var Thread = Java.use('java.lang.Thread');
        Thread.getName.implementation = function() {
            var name = this.getName.call(this);
            if (name && (name.indexOf("frida") >= 0 || 
                         name.indexOf("gum") >= 0 || 
                         name.indexOf("gmain") >= 0)) {
                return "app_worker_" + Math.floor(Math.random() * 1000);
            }
            return name;
        };
        
        // Hide Frida in process maps
        var BufferedReader = Java.use("java.io.BufferedReader");
        BufferedReader.readLine.implementation = function() {
            var line = this.readLine.call(this);
            if (line) {
                for (var i = 0; i < targetStrings.length; i++) {
                    if (line.indexOf(targetStrings[i]) >= 0) {
                        console.log("[+] Hiding Frida reference in file: " + line);
                        return this.readLine.call(this); // Skip this line
                    }
                }
            }
            return line;
        };
        
        // Hide Frida-related files
        var File = Java.use("java.io.File");
        File.exists.implementation = function() {
            var path = this.getAbsolutePath();
            if (path) {
                for (var i = 0; i < targetStrings.length; i++) {
                    if (path.indexOf(targetStrings[i]) >= 0 || 
                        path.indexOf("/proc/self/maps") >= 0 ||
                        path.indexOf("/proc/self/task") >= 0 ||
                        path.indexOf("/proc/self/status") >= 0) {
                        console.log("[+] Hiding file check: " + path);
                        return false;
                    }
                }
            }
            return this.exists.call(this);
        };
    } catch (e) {
        console.log("[-] Error setting up artifact hiding: " + e);
    }
    
    // 5. Root detection bypass
    try {
        // Common root check paths
        var rootBinaries = ["su", "busybox", "supersu", "Superuser.apk", "magisk"];
        
        var Runtime = Java.use("java.lang.Runtime");
        
        // Hook exec method
        if (Runtime.exec.overload('java.lang.String')) {
            Runtime.exec.overload('java.lang.String').implementation = function(cmd) {
                for (var i = 0; i < rootBinaries.length; i++) {
                    if (cmd.indexOf(rootBinaries[i]) >= 0) {
                        console.log("[+] Blocking root check command: " + cmd);
                        throw Java.use("java.io.IOException").$new("Cannot run program \"" + cmd + "\": error=2, No such file or directory");
                    }
                }
                return this.exec.call(this, cmd);
            };
        }
        
        // Hook ProcessBuilder
        var ProcessBuilder = Java.use("java.lang.ProcessBuilder");
        ProcessBuilder.start.implementation = function() {
            var cmd = this.command.value.toString();
            for (var i = 0; i < rootBinaries.length; i++) {
                if (cmd.indexOf(rootBinaries[i]) >= 0) {
                    console.log("[+] Blocking root check via ProcessBuilder: " + cmd);
                    throw Java.use("java.io.IOException").$new("Cannot run program \"" + cmd.split(",")[0].replace("[","") + "\": error=2, No such file or directory");
                }
            }
            return this.start.call(this);
        };

        // Bypass Debugger Check
        var Debug = Java.use("android.os.Debug");
        if (Debug.isDebuggerConnected) {
            Debug.isDebuggerConnected.implementation = function() {
                console.log("[+] Intercepted Debug.isDebuggerConnected() call, returning false");
                return false;
            };
        }

    } catch (e) {
        console.log("[-] Error in root detection or debugger bypass: " + e);
    }
    
    console.log("[*] Instagram ICCID spoofing and anti-detection script installed successfully");
});
